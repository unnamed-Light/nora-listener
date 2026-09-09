# Technical Architecture and Implementation of Nora Listener

[English](ARCHITECTURE_EN.md) | [Русский](ARCHITECTURE.md)

This document provides an in-depth engineering breakdown of the architectural decisions, algorithms, data processing pipelines, and technology stack powering Nora Listener.

---

## 1. System Architecture and Platform Selection

### 1.1. Choosing Tauri v2 Over Electron
When designing a desktop utility for university and academic environments, several strict constraints guided the engineering choices:
- Minimal RAM consumption (must operate smoothly on student laptops with 4 to 8 GB of total memory);
- Instant application startup without spawning heavy Chromium helper processes;
- Compact distribution binary footprint;
- Low-latency, native operating system audio device access.

**Tauri v2** with **Rust** and the native Windows **WebView2** runtime was selected over Electron:
- **Installer footprint**: ~22.7 MB (compared to 120–180 MB for typical Electron-based desktop apps);
- **Idle memory footprint**: 45–65 MB of RAM (5 to 8 times lighter than comparable Electron applications);
- **Privilege separation**: The UI runs in a sandboxed web view, while all resource-intensive computations (audio container decoding, DSP filtering, spectral diarization, hardware microphone streaming, and network requests) run in native Rust worker threads via typed IPC invocations (`invoke`).

### 1.2. Architecture Block Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + TypeScript)                │
│  - Fluent UI v9 Component Library                                      │
│  - Zustand State Management (History, Preferences, Folder Hierarchy)   │
│  - MathRenderer (KaTeX inline/block LaTeX parser)                      │
│  - Dual-Pane Split Layout with persistent drag-and-drop column resizer │
│  - Two-Layer Drag-and-Drop Engine (Pointer Events + HTML5 DnD)         │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ IPC (Tauri Commands & Events)
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          TAURI v2 CORE (Rust)                          │
│  - lib.rs / main.rs: Security capabilities, IPC router, Async runtime  │
│  - native_audio.rs: WASAPI audio capture via cpal                      │
│  - whisper_candle.rs: Audio container probing via symphonia            │
│  - diarization.rs: Real-time Cooley-Tukey FFT & F0 pitch tracking      │
│  - cloud_api.rs: In-memory WAV chunking, Groq LPU API, sanitization    │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │ HTTPS SSL / Ephemeral
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    CLOUD LPU ACCELERATION (Groq Cloud)                 │
│  - Whisper Large v3 / Whisper Large v3 Turbo (Speech-to-Text)          │
│  - Llama 3.3 70B Versatile (Semantic Synthesis & KaTeX Structuring)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Audio Ingestion and Digital Signal Processing (DSP) Pipeline

### 2.1. Media Container Probing and Decoding (`whisper_candle::pcm_decode`)
To support diverse recording formats produced by university voice recorders, smartphones, and video cameras, Nora Listener implements a container-agnostic decoding pipeline powered by `symphonia`:
- **Supported container formats**: WAV, MP3, AAC, M4A, MP4 (audio track), FLAC, OGG Vorbis, MKV, CAF.
- **Stream probing**: The file is wrapped in a `MediaSourceStream`, and format parameters are determined via heuristic probing (`get_probe()`).
- **Downmixing and normalization**: Audio frames are decoded into a linear `Vec<f32>` buffer, and multichannel inputs (stereo, 5.1 surround) are downmixed to single-channel mono by averaging sample amplitudes across channels:
  $$\text{sample}_{\text{mono}} = \frac{1}{C} \sum_{c=1}^{C} \text{sample}_c$$

### 2.2. Low-Latency Hardware Microphone Capture (`native_audio.rs`)
Direct microphone recording is implemented with `cpal` using the native Windows **WASAPI** driver subsystem:
- **Thread-safe sample accumulation**: Samples streamed from the driver audio callback are accumulated in a thread-safe buffer protected by an `Arc<Mutex<Vec<f32>>>`.
- **Spectrum visualizer event throttling**: To prevent IPC event queue saturation and maintain 60 FPS in the UI, audio peak amplitude updates for the frontend frequency bars are strictly throttled to 40 ms intervals (~25 FPS):
  ```rust
  let mut last_emit = Arc::new(Mutex::new(std::time::Instant::now()));
  ```
- **Lossless WAV export**: Upon stopping the recording, the PCM buffer is encoded into a standard 16-bit PCM WAV using `hound` and stored in the application data directory (`app_data_dir/recordings/`).

### 2.3. Audio Cleaning and Normalization (DSP)
Before passing audio data to feature extraction and neural models, two DSP stages are applied:
1. **80 Hz High-Pass Filter**:
   University classrooms and lecture halls suffer from continuous low-frequency background noise: ventilation hum, air conditioning units, projector fans, and 50/60 Hz electrical mains hum. An 80 Hz high-pass biquad filter removes these artifacts without attenuating human speech harmonics (fundamental human vocal frequencies typically start above 85 Hz).
2. **Peak Amplitude Normalization**:
   The maximum absolute sample value is computed:
   $$A_{\max} = \max_{i} |x[i]|$$
   When $A_{\max} > 0$, the buffer is scaled by $k = \frac{0.95}{A_{\max}}$, providing optimal dynamic range for neural acoustic encoders while avoiding digital clipping.

---

## 3. Spectral Speaker Diarization Algorithms (`diarization.rs`)

Nora Listener features a fully local spectral diarization engine written in pure Rust, eliminating the need to transmit raw audio to third-party diarization services.

### 3.1. Fast Fourier Transform (FFT)
The `diarization.rs` module contains an in-place Radix-2 Cooley-Tukey Fast Fourier Transform implementation for $N = 512$ point windows:
- **Bit-Reversal Permutation**:
  The input array is reordered in-place by swapping each index $i$ with its bit-reversed counterpart.
- **Cooley-Tukey Butterflies**:
  Cascaded butterfly calculations evaluate trigonometric twiddle factors:
  $$W_N^k = e^{-j \frac{2\pi k}{N}} = \cos\left(\frac{2\pi k}{N}\right) - j \sin\left(\frac{2\pi k}{N}\right)$$
- **Hann Window Weighting**:
  Each 512-sample frame is multiplied by a Hann window prior to transformation to attenuate spectral leakage:
  $$w[n] = 0.5 \left(1 - \cos\left(\frac{2\pi n}{N - 1}\right)\right)$$

### 3.2. Spectral Centroid Calculation
To assess the brightness and vocal timbre of speaker speech, the spectral centroid is computed:
$$\text{Centroid} = \frac{\sum_{k=1}^{N/2} f_k \cdot |X[k]|^2}{\sum_{k=1}^{N/2} |X[k]|^2}$$
where $f_k = k \cdot \frac{F_s}{N}$ represents the physical center frequency of bin $k$, and $|X[k]|^2$ is the spectral magnitude.

### 3.3. Fundamental Frequency (F0) Pitch Estimation
Pitch tracking uses Normalized Autocorrelation over the speech frames:
$$R(\tau) = \frac{\sum_{n=0}^{W-1} x[n] \cdot x[n + \tau]}{\sqrt{\sum_{n=0}^{W-1} x^2[n] \cdot \sum_{n=0}^{W-1} x^2[n + \tau]}}$$
- **Search range**: Constrained to typical human vocal pitch boundaries from 75 Hz to 360 Hz:
  $$\tau_{\min} = \left\lfloor \frac{F_s}{360} \right\rfloor, \quad \tau_{\max} = \left\lceil \frac{F_s}{75} \right\rceil$$
- **Voicing threshold**: Frames with $\max_{\tau} R(\tau) > 0.42$ are marked as voiced speech (periodic vocal chord oscillations). The pitch is calculated as:
  $$F_0 = \frac{F_s}{\tau_{\text{best}}}$$

### 3.4. Speaker Clustering and Time-Alignment
1. **Feature Space Clustering**:
   Speech segments are clustered using Euclidean distance in the 2D feature space $(F_0, \text{Centroid})$. In a lecture setting, the dominant, continuous voice is automatically designated as Speaker 1 (Instructor), while segments with distinct pitch and formant distributions are clustered as Speaker 2 (Audience / Students).
2. **Phrase-Level Time-Alignment**:
   When Whisper returns transcribed text chunks with boundary timestamps $[t_{\text{start}}, t_{\text{end}}]$, `DiarizationResult::get_speaker_at(time_sec)` looks up the corresponding acoustic segment with a $\pm 150$ ms tolerance window, placing speaker labels without fracturing sentence flow.

---

## 4. Neural Speech Recognition Pipeline (`cloud_api.rs`)

### 4.1. Ultra-Fast Groq Cloud LPU Processing
To transcribe 90-minute lectures in seconds, Nora Listener uses Groq Language Processing Units (LPUs):
- **Models**:
  - `whisper-large-v3` (1.55B parameters) for dense academic terminology, mathematical definitions, and technical nomenclature.
  - `whisper-large-v3-turbo` for rapid transcription workloads.
- **In-Memory Chunk Streaming**:
  The audio buffer is sliced into 10-minute segments. Each chunk is encoded into WAV format in memory using `std::io::Cursor<Vec<u8>>` and `hound::WavWriter`. This bypasses temporary disk writes and reduces I/O latency.
- **Academic Context Conditioning**:
  Each inference request carries a specialized system prompt:
  > *"University academic lecture. Instructor explaining coursework to students. Higher mathematics, discrete math, algorithms, computer science, formulas, definitions, theorems..."*
  This primes the Whisper decoder for correct punctuation, capitalized terms, and accurate technical terminology.

### 4.2. Heuristic Whisper Hallucination Filter (`is_hallucination`)
When encountering sustained silence, background hum, or music intervals, Whisper models frequently output repetitive hallucinations inherited from YouTube training corpora (e.g., *"Subtitles by..."*, *"Thank you for watching"*, *"To be continued..."*).
The `is_hallucination` function executes a normalized substring and character pattern scanner, stripping matched repetitive phrases before they can enter the transcript stream.

### 4.3. Offline Local Engine (`whisper_candle.rs`)
For environments without internet connectivity, Nora Listener embeds a local inference engine built on HuggingFace **Candle** in pure Rust:
- Direct loading of SafeTensors and GGML weights into memory;
- On-device 80- and 128-channel Mel-spectrogram calculation using embedded filter weights (`melfilters.bytes`);
- Transformer encoder-decoder inference without Python or CUDA dependencies;
- Native multilingual tokenization (`multilingual.rs`).

---

## 5. Intelligent Academic Summary Synthesis

### 5.1. Prompt Engineering and Structuring
Triggered by the **«Сделать умный конспект»** button, the transcript is passed to `llama-3.3-70b-versatile` on the Groq LPU:
- **Semantic extraction**: Converts rambling oral speech into concise academic lecture notes:
  - Core lecture themes;
  - Specialized terminology and formal definitions;
  - Step-by-step thesis arguments and mathematical derivations;
  - Summary key points and examination focus questions.
- **«Показывать цитаты преподавателя» Mode**: When enabled, the model extracts verbatim quotes of critical statements and rules spoken by the instructor, contextualizing them within the notes.

### 5.2. LaTeX and KaTeX Sanitization (`test_sanitize_summary`)
LLMs often emit malformed or inconsistent LaTeX delimiters (`\[ ... \]`, `\( ... \)`). The Rust backend runs a post-processing pass (`sanitize_summary`):
1. Normalizes display math to `$$...$$` blocks and inline expressions to `$...$`.
2. Balances unclosed dollar delimiters to prevent client-side KaTeX parse aborts.
3. Escapes unintended currency symbols and Markdown markup outside formula tags.

---

## 6. Frontend Architecture and Client Optimizations (React 19 + TypeScript)

### 6.1. Two-Layer Drag-and-Drop Architecture (`FolderTree.tsx`)
Desktop web views on Windows encounter drop-cancellation bugs when Windows OLE drag hooks intercept mouse events. Nora Listener implements a robust dual-layer solution:
1. **Window-Level OLE Bypass**:
   Setting `"dragDropEnabled": false` in `tauri.conf.json` unhooks the Win32 `RegisterDragDrop` hook on the window handle, delegating drag handling to Chromium.
2. **Hybrid Pointer Controller**:
   - **Pointer Events Layer**: On mouse press over a lecture item or its `ArrowMove20Regular` drag handle, movement tracking activates. A floating chip (`floatingGhost`) follows the cursor. Real-time target hit-testing is performed via `document.elementFromPoint(x, y)` on `data-folder-id`, `data-item-id`, and `data-drop-root` attributes.
   - **Hover Auto-Expansion**: Hovering over a collapsed folder for >450 ms triggers `autoExpandTimer`, opening the sub-tree automatically.
   - **HTML5 DnD Compatibility Layer**: Employs standard `text/plain` payloads with a module-level `activeDragNode` fallback, setting `e.dataTransfer.dropEffect = 'move'` on all `dragover` handlers.

### 6.2. High-Performance Text Rendering (`FastTextarea.tsx`)
A 90-minute lecture produces 10,000 to 25,000 words (>150 KB of raw text). Standard controlled React textareas experience input lag at this volume.
`FastTextarea` decouples direct keystroke handling by maintaining a local DOM buffer via `useRef`, debouncing state synchronization back to the Zustand store by 300 ms or flushing on blur.

### 6.3. KaTeX Parsing Engine (`mathRenderer.ts`)
Mathematical notes are rendered via a two-phase parser:
1. Regular expressions parse block math `(?:\$\$)([\s\S]*?)(?:\$\$)` and inline math `(?:\$)(.*?)(?:\$)`.
2. Math chunks are compiled to HTML via `katex.renderToString` with `throwOnError: false`.
3. Surrounding prose is parsed with `marked` with XSS sanitization.
4. Broken formulas render raw highlighted LaTeX without throwing UI runtime exceptions.

### 6.4. Persistent Split-Pane Layout (`App.tsx`)
In «Два окна (Сплит)» mode, the interface displays the verbatim transcript and the smart summary side-by-side:
- The divider supports smooth mouse dragging with percentage clamping between 20% and 80%;
- `user-select: none` is applied during drag gestures to prevent accidental text selection;
- Proportions are saved in `useAppStore` and restored on startup.

---

## 7. Data Persistence and Document Export

### 7.1. Relational Zustand Store (`historyStore.ts`)
Session history is modeled relationally and persisted to `localStorage` via Zustand middleware:
```typescript
interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

interface Transcription {
  id: string;
  title: string;
  date: string;
  createdAt: string;       // ISO 8601 timestamp for sorting
  text: string;           // Verbatim transcript with speaker tags
  summary?: string;       // Structured notes with KaTeX equations
  folderId: string | null;// Foreign key to parent folder (null = root)
}
```
- **Lecture Sorting**: Supports 4 sorting modes: creation date (ascending/descending) and title alphabet (A-Z / Z-A) with locale-sensitive string comparison.

### 7.2. Client-Side Document Exporter (`exporter.ts`)
Document export is performed entirely on the client without third-party web services:
- **DOCX**: Programmatically builds Word XML trees (headings, bullets, formatted text) using `docx` and outputs a binary `Blob`.
- **PDF**: Renders the DOM container with styled KaTeX formulas via `html2canvas` + `jspdf` at subpixel resolution, splitting content into A4 pages with margins.
- **Native File Write**: Save destinations are selected via `@tauri-apps/plugin-dialog`, and bytes are written through the native `write_binary_file` command.

---

## 8. Summary and Conclusions

The architecture of **Nora Listener** achieves a balanced hybrid design:
1. **Privacy and Local Control**: Sensitive DSP filtering, spectral diarization, and folder storage remain 100% on the local computer in native Rust.
2. **Peak AI Throughput**: Groq Cloud LPUs bypass the constraints of weak client GPUs, delivering academic transcripts and KaTeX summaries in seconds.
3. **Ergonomic Desktop UX**: The combination of Tauri v2, Fluent UI v9, drag-and-drop file organization, split views, and client-side document export provides a dependable desktop tool for students and university faculty.
