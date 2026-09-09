import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import jsPDF from 'jspdf';

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

function buildDefaultPath(defaultDir: string | undefined, name: string, extension: string): string {
  const cleanName = sanitizeFileName(name) || 'Lecture';
  if (defaultDir && defaultDir.trim().length > 0) {
    const separator = defaultDir.endsWith('\\') || defaultDir.endsWith('/') ? '' : '\\';
    return `${defaultDir}${separator}${cleanName}.${extension}`;
  }
  return `${cleanName}.${extension}`;
}

export async function exportToMarkdown(
  text: string,
  title: string,
  defaultDir?: string
): Promise<string | null> {
  const defaultPath = buildDefaultPath(defaultDir, title, 'md');
  const filePath = await save({
    defaultPath,
    filters: [{ name: 'Markdown (*.md)', extensions: ['md'] }],
  });

  if (!filePath) {
    return null;
  }

  await invoke('write_text_file', { path: filePath, contents: text });
  return filePath;
}

export async function exportToDocx(
  text: string,
  title: string,
  defaultDir?: string
): Promise<string | null> {
  const defaultPath = buildDefaultPath(defaultDir, title, 'docx');
  const filePath = await save({
    defaultPath,
    filters: [{ name: 'Word Document (*.docx)', extensions: ['docx'] }],
  });

  if (!filePath) {
    return null;
  }

  const paragraphs: Paragraph[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const speakerMatch = line.match(/^(\[[^\]]+\]:?)\s*(.*)$/);
    if (speakerMatch) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: speakerMatch[1] + ' ',
              bold: true,
              color: '0F6CBD',
              size: 24,
            }),
            new TextRun({
              text: speakerMatch[2],
              size: 24,
            }),
          ],
          spacing: { before: 140, after: 60 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 24 })],
          spacing: { after: 60 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          ...paragraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = Array.from(new Uint8Array(arrayBuffer));

  await invoke('write_binary_file', { path: filePath, data: bytes });
  return filePath;
}

export async function exportToPdf(
  text: string,
  title: string,
  defaultDir?: string
): Promise<string | null> {
  const defaultPath = buildDefaultPath(defaultDir, title, 'pdf');
  const filePath = await save({
    defaultPath,
    filters: [{ name: 'PDF Document (*.pdf)', extensions: ['pdf'] }],
  });

  if (!filePath) {
    return null;
  }

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 10, 20);
  doc.setFontSize(12);
  const splitText = doc.splitTextToSize(text, 180);
  doc.text(splitText, 10, 30);

  const arrayBuffer = doc.output('arraybuffer');
  const bytes = Array.from(new Uint8Array(arrayBuffer));

  await invoke('write_binary_file', { path: filePath, data: bytes });
  return filePath;
}

