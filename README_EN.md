# Nora Listener

[English](README_EN.md) | [Русский](README.md)

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Tauri](https://img.shields.io/badge/Tauri-v2.x-24C8D8.svg)
![React](https://img.shields.io/badge/React-19.x-61DAFB.svg)
![Rust](https://img.shields.io/badge/Rust-1.80+-DEA584.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D6.svg)

Personal academic AI assistant for students, educators, and researchers. The application delivers ultra-fast lecture transcription, local spectral speaker diarization (separating instructor and student voices), automated smart summary generation with KaTeX mathematical formulas, and a hierarchical study material library.

---

## Key Features

- **Ultra-Fast Speech Transcription**:
  Powered by Whisper Large v3 (1.55B parameters) and Whisper Large v3 Turbo via Groq Cloud LPU. A standard 90-minute university lecture is transcribed in just 15 to 30 seconds with high punctuation and terminology accuracy.

- **Native Local Audio DSP Preprocessing**:
  Built-in Rust audio engine performs 80 Hz high-pass filtering to remove low-frequency classroom rumble and applies peak amplitude normalization prior to inference.

- **Spectral Speaker Diarization by Pitch (F0)**:
  Real-time spectral analysis in Rust estimates fundamental voice pitch (F0) to distinguish teacher explanations from student questions without external cloud diarization services.

- **Intelligent Summaries with KaTeX Formulas**:
  The «Сделать умный конспект» action leverages Llama 3.3 70B Versatile to produce clean academic synopses: main ideas, structured key takeaways, definitions, and mathematical equations rendered natively via KaTeX. The «Показывать цитаты преподавателя» toggle allows linking summaries back to verbatim lecture statements.

- **Dual-Pane Split View**:
  Side-by-side display of the full verbatim transcript on the left and the structured summary on the right, featuring a draggable split-pane resizer.

- **Hierarchical Lecture Library with Drag-and-Drop**:
  Folder organization with smooth mouse drag-and-drop (into folders, between folders, and out to root), hover-to-expand folder navigation, 4 sorting modes (by date and title), and instant context search across all content (Ctrl+F).

- **Multi-Format Export**:
  Export transcripts and summaries with a single click to DOCX (Microsoft Word), PDF, TXT, and Markdown.

---

## Architecture and Data Pipeline

```text
[Audio / Video File] or [Microphone Input]
                     │
                     ▼
[Local Rust DSP Pipeline]
  • High-Pass Filter (80 Hz, rumble attenuation)
  • Peak Amplitude Normalization
                     │
                     ▼
[Groq Cloud Whisper LPU API]
  • Whisper Large v3 / Turbo
  • Terminology & punctuation recognition in 15-30s
                     │
                     ▼
[Local Rust Diarization]
  • Harmonic & Fundamental Frequency (F0) Analysis
  • Speaker Segmentation: Instructor / Students
                     │
                     ▼
[Smart Summary Synthesis (Groq LPU Llama 3.3 70B)]
  • Core concept and definition extraction
  • LaTeX formula formatting ($...$ and $$...$$)
                     │
                     ▼
[Fluent UI v9 Frontend]
  • Markdown Editor + KaTeX Math Rendering
  • Dual-Pane Split Layout
  • PDF / DOCX Exporter
```

---

## Security and Privacy

- **Your API Key Remains On Your Machine**: Your Groq API key is stored strictly within your device's local storage and is never sent to third-party tracking services or intermediate proxy servers.
- **Local Audio Processing**: Audio filtering, spectral diarization analysis, and library management operate 100% locally via the native Rust engine.

---

## Tech Stack

| Component | Technology |
|---|---|
| User Interface | React 19, TypeScript, Fluent UI v9 (@fluentui/react-components), Zustand |
| Equations & Markdown | KaTeX, Marked, HTML2Canvas, JSPDF, Docx |
| Desktop Runtime | Tauri v2 (Windows WebView2 integration) |
| System Core | Rust 2021, Symphonia, Hound, Rubato, Rodio |
| Neural Processing | Groq Cloud LPU (Whisper Large v3, Llama 3.3 70B), Candle ML |

---

## Getting Started

### Option 1: Pre-built Binary (For End Users)

1. Open the **Releases** section on GitHub.
2. Download `NoraListener_v1.0.0_Portable.zip` (standalone portable version, no installer needed) or the `.msi` / `setup.exe` installer.
3. Launch `Nora Listener.exe`.
4. Open the Settings dialog (gear icon in the top-right header) and paste your free Groq API key.

### Option 2: Build From Source (For Developers)

#### Prerequisites
- **Node.js**: version 20 LTS or later
- **Rust toolchain**: stable channel (`rustup default stable`)
- **C++ Build Tools**: Visual Studio C++ Build Tools (MSVC components on Windows)

#### Step-by-Step Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nora-listener.git
   cd nora-listener
   ```

2. Install JavaScript dependencies:
   ```bash
   npm install
   ```

3. Run the development build:
   ```bash
   npm run tauri:dev
   ```

4. Run Rust unit tests:
   ```bash
   npm run test:rs
   ```

5. Build an optimized production release:
   ```bash
   npm run tauri:build
   ```
   Built binaries and installation packages will be located in `src-tauri/target/release/`.

---

## Free Groq API Key Setup

1. Navigate to the official [Groq Console](https://console.groq.com/keys).
2. Sign in or register using your Google or GitHub account.
3. Click **Create API Key** and copy your key (starts with `gsk_...`).
4. In Nora Listener, click the Settings button in the upper-right corner and paste the key.

---

## Keyboard Shortcuts

- `Ctrl + F` — Jump to search input across all lectures and summaries.
- `Enter` — Confirm folder creation or item renaming.
- `Escape` — Close active modals and dialogs.

---

## Acknowledgments

Special thanks to **Southern Federal University (SFedU)** — for the author's admission, which created the direct practical necessity for this software, and for the resolute student determination never to pay for proprietary transcription subscriptions.

---

## License

This project is licensed under the terms of the MIT License. See the [LICENSE](LICENSE) file for details.
