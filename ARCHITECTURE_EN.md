# Technical Architecture and Implementation of Nora Listener

[English](ARCHITECTURE_EN.md) | [Русский](ARCHITECTURE.md)

This document provides an in-depth engineering breakdown of the architectural decisions, algorithms, data processing pipelines, and technology stack powering Nora Listener (v1.0.1).

---

## 1. System Architecture and Platform Selection

### 1.1. Choosing Tauri v2 Over Electron
When designing a desktop utility for university and academic environments, several strict constraints guided the engineering choices:
- Minimal RAM consumption (must operate smoothly on student laptops with 4 to 8 GB of total memory);
- Instant application startup without spawning heavy Chromium helper processes;
- Compact distribution binary footprint;
- Low-latency, native operating system audio device access.

**Tauri v2** with **Rust** and the native Windows **WebView2** runtime was selected over Electron:
- **Binary Footprint**: 21.7 MB standalone executable / 72.8 MB NSIS installer with bundled runtime assets;
- **Idle Memory Footprint**: 45–65 MB of RAM (5 to 8 times lighter than comparable Electron applications);
- **Privilege Separation**: The UI runs in a sandboxed web view, while all resource-intensive computations (audio container decoding, DSP filtering, spectral diarization, hardware microphone streaming, document parsing, and network requests) run in native Rust worker threads via typed IPC invocations (`invoke`).

### 1.2. Architecture Block Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + TypeScript)                │
│  - Fluent UI v9 Component Library                                      │
│  - Zustand State Management (History, Preferences, Folders, Prompt)    │
│  - MathRenderer (KaTeX inline/block LaTeX parser with sanitization)    │
│  - Context Ingestion Engine (In-memory OpenXML & PDF text extraction)  │
│  - Dual-Pane Split Layout with persistent drag-and-drop column resizer │
│  - Full-row Drag-and-Drop Engine (Pointer Events + HTML5 DnD)          │
│  - Dynamic Selective Exporter (Markdown, DOCX, PDF)                    │
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
│  - Context-Aware Prompt Assembler (Multi-source academic prompt)       │
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
- **Channel normalization**: Multi-channel packets (stereo, 5.1 surround) are folded down to a mono 32-bit floating-point buffer (`Vec<f32>`) by averaging across active channels:
  $$\text{sample}_{\text{mono}} = \frac{1}{C} \sum_{c=1}^{C} \text{sample}_c$$

### 2.2. Low-Latency Microphone Capture (`native_audio.rs`)
Real-time audio streaming is implemented using the `cpal` crate interfacing with Windows **WASAPI**:
- **Multi-threaded buffering**: Driver callback samples stream into an asynchronous thread-safe buffer (`Arc<Mutex<Vec<f32>>>`).
- **Throttled spectral visualization**: Amplitude peak measurements dispatched to the UI visualizer are rate-limited to 40 ms intervals (~25 FPS) to eliminate IPC event queue saturation.
- **Lossless WAV packaging**: Upon stopping recording, the buffer is serialized via `hound` into a standard 16-bit PCM WAV stored securely in `app_data_dir/recordings/`.

### 2.3. Pre-Recognition Signal Conditioning (DSP)
Before passing audio to the acoustic models, two DSP stages are executed:
1. **High-Pass Filter (80 Hz)**:
   University lecture halls suffer from low-frequency ambient rumble: ventilation HVAC, projector fan hum, desk vibration, and 50/60 Hz AC electrical hum. Attenuating frequencies below 80 Hz cleans noise while preserving human speech formants (adult fundamental frequencies start around 85 Hz).
2. **Peak Amplitude Normalization**:
   The peak absolute sample value $A_{\max} = \max_{i} |x[i]|$ is computed. If $A_{\max} > 0$, samples are scaled by $k = \frac{0.95}{A_{\max}}$, ensuring optimal dynamic range for neural decoders without clipping.

---

## 3. Spectral Speaker Diarization Algorithms (`diarization.rs`)

Nora Listener features a lightweight, 100% offline speaker diarization pipeline capable of distinguishing lecturers from student questions without sending audio to external diarization services.

### 3.1. Radix-2 Fast Fourier Transform (FFT)
Module `diarization.rs` includes a custom Cooley-Tukey decimation-in-time FFT for $N = 512$ point windows:
- **Bit-reversal permutation**: Reorders the input buffer in-place by reversing the binary representation of indices.
- **Cooley-Tukey butterflies**: Evaluates trigonometric twiddle factors:
  $$W_N^k = e^{-j \frac{2\pi k}{N}} = \cos\left(\frac{2\pi k}{N}\right) - j \sin\left(\frac{2\pi k}{N}\right)$$
- **Hann windowing**: Frames are multiplied by a Hann window prior to FFT transformation to prevent spectral leakage:
  $$w[n] = 0.5 \left(1 - \cos\left(\frac{2\pi n}{N - 1}\right)\right)$$

### 3.2. Spectral Centroid Calculation
To quantify voice brightness and timbre, the spectral centroid is computed per frame:
$$\text{Centroid} = \frac{\sum_{k=1}^{N/2} f_k \cdot |X[k]|^2}{\sum_{k=1}^{N/2} |X[k]|^2}$$
where $f_k = k \cdot \frac{F_s}{N}$ represents the physical frequency of bin $k$, and $|X[k]|^2$ is the spectral magnitude.

### 3.3. Fundamental Frequency Pitch Tracking (F0)
Voice pitch tracking utilizes Normalized Autocorrelation:
$$R(\tau) = \frac{\sum_{n=0}^{W-1} x[n] \cdot x[n + \tau]}{\sqrt{\sum_{n=0}^{W-1} x^2[n] \cdot \sum_{n=0}^{W-1} x^2[n + \tau]}}$$
- **Lag search boundary**: Constrained to physiological human vocal limits (75 Hz to 360 Hz):
  $$\tau_{\min} = \left\lfloor \frac{F_s}{360} \right\rfloor, \quad \tau_{\max} = \left\lceil \frac{F_s}{75} \right\rceil$$
- **Voicing decision**: When $\max_{\tau} R(\tau) > 0.42$, the segment is deemed voiced and assigned $F_0 = \frac{F_s}{\tau_{\text{best}}}$.

### 3.4. Speaker Clustering and Temporal Alignment
1. **Acoustic feature clustering**: Speech segments are clustered using Euclidean distance across the 2D feature space $(F_0, \text{Centroid})$. The predominant continuous speaker is designated as Speaker 1 (Lecturer), while outliers are classified as Speaker 2 (Audience / Student).
2. **Temporal alignment**: When Whisper returns transcribed chunks, `DiarizationResult` matches timestamp spans $[t_{\text{start}}, t_{\text{end}}]$ with acoustic speaker segments via `get_speaker_at(time_sec)` with a $\pm 150$ ms tolerance window.

---

## 4. Neural Speech Recognition Pipeline (`cloud_api.rs`)

### 4.1. Accelerated Cloud Execution (Groq Cloud LPU)
To achieve recognition speeds exceeding 200x real-time, Nora Listener leverages Groq Language Processing Units (LPU):
- **Model selection**:
  - `whisper-large-v3` (1.55B parameters) — Maximum academic accuracy for dense scientific formulas and technical terminology.
  - `whisper-large-v3-turbo` — Streamlined architecture for near-instant transcription.
- **In-memory chunk serialization**:
  Audio streams are divided into 10-minute chunks and encoded into WAV directly in RAM via `std::io::Cursor<Vec<u8>>` and `hound::WavWriter`, completely eliminating temporary disk I/O bottlenecks.
- **Contextual vocabulary biasing**:
  Requests are seeded with an academic prompt:
  > *"University lecture. Professor explaining course concepts to students. Higher mathematics, discrete mathematics, algorithms, programming, formulas, terminology..."*
  This primes Whisper's autoregressive decoder for proper punctuation, capitalization, and accurate scientific term recognition.

### 4.2. Heuristic Hallucination Suppression (`is_hallucination`)
During prolonged audio silence or background noise, Whisper models may emit repetitive artifacts inherited from YouTube training corpora. The `is_hallucination` function sanitizes incoming text against known artifact dictionaries before content enters the state tree.

### 4.3. Offline Local Engine Fallback (`whisper_candle.rs`)
As an offline alternative, Nora Listener bundles HuggingFace's pure Rust **Candle** framework:
- GGML/SafeTensors model weight loading directly into host memory;
- 80- and 128-channel mel-filterbank generation using bundled filter weights (`melfilters.bytes`);
- Pure Rust Transformer encoder and autoregressive decoder pass;
- Integrated multilingual tokenization (`multilingual.rs`) without external Python dependencies.

---

## 5. Intelligent Academic Note Synthesis

### 5.1. Model and Semantic Prompt Engineering
Note generation is triggered via the **Smart Notes** action and executed by `llama-3.3-70b-versatile` on Groq LPUs:
- **Structural transformation**: Unstructured raw speech is synthesized into a rigorous 5-section Markdown outline:
  - Lecture topic and thesis overview;
  - Core definitions and mathematical notation;
  - Detailed analytic derivations and proofs;
  - Lecturer tips, exam pitfalls, and subtleties;
  - Deep self-assessment study questions.
- **Lecturer Quotes Toggle**: When enabled, the model extracts authentic, verbatim quotations of critical statements made by the instructor.

### 5.2. KaTeX Mathematical Formatting and Sanitization (`test_sanitize_summary`)
To guarantee LaTeX mathematical equations render without syntax breakdown:
1. Normalizes damaged or raw tags `\[ ... \]`, `\( ... \)` into standard Markdown `$$...$$` (display math) and `$...$` (inline math).
2. Balances unbalanced `$` dollar signs to prevent parser crashes.
3. Escapes currency symbols outside equation blocks.

### 5.3. Context Ingestion and Multimodal Academic Synthesis
Starting with v1.0.1, Nora Listener incorporates an in-browser material ingestion pipeline (`ContextPanel.tsx` + `contextExtractor.ts`):
1. **Client-Side OpenXML and PDF Extraction**:
   - Presentations (`.pptx`) and notes (`.docx`) are unpacked in memory using `jszip` without requiring Microsoft Office or remote parsing microservices.
   - Slide text is parsed from `ppt/slides/slide*.xml` via `<a:t>` tags and labeled sequentially (`--- Slide N ---`).
   - Word documents extract paragraph elements `<w:p>` and text runs `<w:t>` from `word/document.xml`.
   - Text streams in PDF documents are extracted in memory.
2. **Semantic Categorization**:
   Materials are categorized as presentations (`presentation`), student notes (`notes`), literature (`literature`), or reference files (`other`).
3. **Dual-Source Academic Synthesis**:
   When invoking note synthesis, `formatContextForPrompt` injects structured document text alongside the spoken audio transcript. The LLM follows strict academic priorities:
   - **Chronological Grounding**: The audio lecture transcript remains the chronological foundation.
   - **Terminology and Formula Verification**: Distorted technical terms in speech are resolved against presentation slides and literature.
   - **Visual Ellipsis Reconstruction**: When a lecturer references visual material verbally without reading it (*"As you can see from the equation on the screen"*), the model retrieves the exact formula from the slide text in LaTeX syntax with the tag `[From lecture slides / materials]`.

### 5.4. Dynamic System Prompting and Nora Prompt Editor
The application settings dialog (`SettingsModal.tsx`) includes a dedicated Nora System Prompt editor:
- Users can customize the core pedagogical instructions followed by the AI (e.g. emphasizing coding examples for computer science or formal proofs for pure mathematics).
- Custom instructions persist in the Zustand store (`appStore.ts`) via `localStorage` with instant one-click restoration to the canonical prompt (`DEFAULT_NORA_PROMPT`).

---

## 6. Frontend Architecture and Client Performance (React 19 + TypeScript)

### 6.1. Folder Tree and Gesture Drag-and-Drop (`FolderTree.tsx`)
The session hierarchy features enhanced ergonomics:
- **Full-Row Drag Target**: Legacy arrow move icons have been eliminated; drag-and-drop triggers naturally across the entire row surface with `cursor: grab`.
- **Zero-Conflict Pointer Events**: Utilizes `onPointerDown`, `onPointerMove`, and `onPointerUp` paired with `document.elementFromPoint` to prevent browser text selection artifacts and Windows OLE drag drop interference.
- **Smart Auto-Expansion**: Hovering over a closed folder for 450 ms expands the nested subtree automatically.

### 6.2. High-Performance Text Rendering (`FastTextarea.tsx`)
A 90-minute lecture contains 10,000 to 25,000 words (up to 150 KB of raw text). Standard controlled React text inputs incur noticeable typing lag with documents of this size.
- `FastTextarea` isolates controlled input within an internal DOM buffer via `useRef`, synchronizing to global Zustand state on `onBlur` or through a 300 ms debounce timer.

### 6.3. KaTeX Parser and Renderer (`mathRenderer.ts`)
Equations render through a dual-phase pipeline:
1. Regex pattern matching isolates display equations `(?:$$)([\s\S]*?)(?:$$)` and inline math `(?:$)(.*?)(?:$)`.
2. Mathematical expressions pass to `katex.renderToString` with `throwOnError: false`.
3. Surrounding prose is processed through `marked` and sanitized via DOMPurify to eliminate XSS vectors.

### 6.4. Adaptive Split-View Interface and Selective Export (`App.tsx`)
1. **Unified Recognition Controls**:
   - The accuracy selector ("Higher Accuracy" / "Higher Speed") sits directly beside the primary "Transcribe" button in `styles.controls`, ensuring intuitive model switching across all workspace views.
   - In Split View, secondary editor mode toggles ("Preview" / "Editor") are relocated exclusively to the right note pane header.
2. **Selective Split-View Export Dropdowns**:
   In Split View, export triggers ("Word", "PDF", "Save .md") open an interactive Fluent UI popover menu (`Menu`, `openOnHover`) with targeted options:
   - *Notes only*;
   - *Transcript only*;
   - *Combined document (Notes + Transcript)*.
3. **Adaptive Modal Geometry and Viewport Constraints**:
   Modal dialogs (`SettingsModal.tsx`) employ a strict flexbox architecture with `minHeight: 0`, `flexGrow: 1`, and `overflowY: auto`. This ensures fluid scrolling on compact laptop displays (768p/1080p) while pinning the footer ("Done" button) firmly inside the visible viewport.

---

## 7. Data Persistence and Export Subsystem

### 7.1. Relational Zustand Hierarchy (`historyStore.ts`)
Session data follows a relational structure saved to `localStorage` via Zustand's `persist` middleware:
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
  createdAt: string;       // ISO 8601 timestamp for deterministic sorting
  text: string;           // Full timestamped transcript text
  summary?: string;       // Synthesized markdown notes with KaTeX equations
  folderId: string | null;// Foreign key reference to parent folder (null = root)
}
```
- **Lecture Sorting**: The pure `sortLectures` utility supports 4 modes: creation timestamp (newest/oldest) and title alphabetical order (A–Z / Z–A) using locale-aware string comparison (`localeCompare`).

### 7.2. Client-Side Document Exporter (`exporter.ts`)
All document compilation occurs locally in the browser:
- **DOCX Generation**: Built using the `docx` library to compile a structured document tree (headings, lists, bold styling) into a binary Blob.
- **PDF Generation**: Synthesized notes with KaTeX formulas render to PDF via `html2canvas` and `jspdf`, rasterizing vector math equations at high DPI into multi-page A4 layouts.
- **Scoped Export Handlers**: Exporter functions accept `scope?: 'summary' | 'transcript' | 'both'` to dynamically produce targeted or concatenated files.
- **Native File Dialogs**: Save paths are negotiated via `@tauri-apps/plugin-dialog` and written directly to disk via Rust IPC (`write_binary_file`).

---

## 8. Summary and Architectural Conclusions

The architecture of **Nora Listener v1.0.1** delivers a performant balance between local processing and cloud-accelerated intelligence:
1. **Security and Privacy**: Audio capture, DSP noise reduction, spectral speaker diarization, and slide document ingestion (.docx, .pptx, .pdf) run 100% locally on the user's computer.
2. **Speed**: Delegating speech recognition and synthesis to Groq Cloud LPUs bypasses weak laptop GPUs, generating academic notes in seconds.
3. **Ergonomics and Polish**: Persistent folder organization, full-row drag-and-drop, split view, selective multi-format export, and dynamic prompt customization provide a unified environment for university learning.
