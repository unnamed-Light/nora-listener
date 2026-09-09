/**
 * Model downloader script for Nora Listener.
 * Downloads the ggml-tiny.bin Whisper model if it is missing from src-tauri/bin/.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin';
const TARGET_DIR = path.resolve(__dirname, '../src-tauri/bin');
const TARGET_FILE = path.join(TARGET_DIR, 'ggml-tiny.bin');

if (fs.existsSync(TARGET_FILE)) {
  const stats = fs.statSync(TARGET_FILE);
  if (stats.size > 10000000) {
    console.log(`Model already exists at: ${TARGET_FILE} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
    process.exit(0);
  }
}

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

console.log(`Downloading Whisper GGML tiny model from ${MODEL_URL}...`);
const file = fs.createWriteStream(TARGET_FILE);

function downloadWithRedirect(url) {
  https.get(url, (response) => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      downloadWithRedirect(response.headers.location);
      return;
    }

    if (response.statusCode !== 200) {
      console.error(`Download failed with status code: ${response.statusCode}`);
      process.exit(1);
    }

    const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
    let downloadedBytes = 0;

    response.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      if (totalBytes > 0) {
        const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
        process.stdout.write(`Downloading: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(1)} MB)\r`);
      }
    });

    response.pipe(file);

    file.on('finish', () => {
      file.close(() => {
        console.log(`\nModel successfully downloaded to: ${TARGET_FILE}`);
      });
    });
  }).on('error', (err) => {
    fs.unlink(TARGET_FILE, () => {});
    console.error(`Error downloading model: ${err.message}`);
    process.exit(1);
  });
}

downloadWithRedirect(MODEL_URL);
