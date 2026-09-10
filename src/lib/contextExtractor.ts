import JSZip from 'jszip';

export interface ContextItem {
  id: string;
  fileName: string;
  fileType: 'presentation' | 'notes' | 'literature' | 'other';
  fileSize: number;
  extractedText: string;
  charCount: number;
}

function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export async function extractTextFromDocx(fileOrBuffer: File | ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(fileOrBuffer);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('Файл document.xml не найден в архиве DOCX');
  }
  const xmlContent = await docXmlFile.async('text');
  
  // Split by paragraphs
  const paragraphs = xmlContent.split(/<w:p[ >]/);
  const textBlocks: string[] = [];

  for (const p of paragraphs) {
    const matches = p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (matches && matches.length > 0) {
      const line = matches
        .map(m => m.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
        .join('');
      if (line.trim()) {
        textBlocks.push(unescapeXml(line));
      }
    }
  }

  return textBlocks.join('\n');
}

export async function extractTextFromPptx(fileOrBuffer: File | ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(fileOrBuffer);
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)![0], 10);
      const numB = parseInt(b.match(/\d+/)![0], 10);
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error('Слайды не найдены в презентации PPTX');
  }

  const slideTexts: string[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const slideName = slideFiles[i];
    const xml = await zip.file(slideName)!.async('text');
    const paragraphs = xml.split(/<a:p[ >]/);
    const pLines: string[] = [];

    for (const p of paragraphs) {
      const matches = p.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
      if (matches && matches.length > 0) {
        const line = matches
          .map(m => m.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, ''))
          .join('');
        if (line.trim()) {
          pLines.push(unescapeXml(line));
        }
      }
    }

    if (pLines.length > 0) {
      slideTexts.push(`[Слайд ${i + 1}]\n${pLines.join('\n')}`);
    }
  }

  return slideTexts.join('\n\n');
}

export async function extractTextFromPdf(fileOrBuffer: File | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;
  if (fileOrBuffer instanceof File) {
    buffer = await fileOrBuffer.arrayBuffer();
  } else {
    buffer = fileOrBuffer;
  }

  // Pure binary/text stream parsing for PDF text extraction without heavy native bindings
  const uint8 = new Uint8Array(buffer);
  let textContent = '';
  
  // Convert to latin1/ascii string for pattern matching
  let binaryStr = '';
  const chunkSize = 65536;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binaryStr += String.fromCharCode.apply(null, uint8.subarray(i, i + chunkSize) as any);
  }

  // Extract text from text blocks: BT ... ET
  const btRegex = /BT([\s\S]*?)ET/g;
  let match: RegExpExecArray | null;
  const lines: string[] = [];

  while ((match = btRegex.exec(binaryStr)) !== null) {
    const block = match[1];
    
    // Match (string) Tj or [(array)] TJ
    const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    let blockText = '';

    while ((tjMatch = tjRegex.exec(block)) !== null) {
      let raw = tjMatch[1];
      raw = raw.replace(/\\([()\\])/g, '$1')
               .replace(/\\n/g, '\n')
               .replace(/\\r/g, '')
               .replace(/\\t/g, ' ');
      blockText += raw + ' ';
    }

    // Match TJ arrays: [ (string1) -10 (string2) ] TJ
    const arrayTjRegex = /\[([^\]]*)\]\s*TJ/g;
    let arrMatch: RegExpExecArray | null;
    while ((arrMatch = arrayTjRegex.exec(block)) !== null) {
      const inner = arrMatch[1];
      const strParts = inner.match(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g);
      if (strParts) {
        for (const sp of strParts) {
          let clean = sp.slice(1, -1)
            .replace(/\\([()\\])/g, '$1')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\t/g, ' ');
          blockText += clean;
        }
        blockText += ' ';
      }
    }

    if (blockText.trim()) {
      lines.push(blockText.trim());
    }
  }

  textContent = lines.join('\n');

  // If simple text extraction produced little text (e.g. compressed streams), report clearly
  if (!textContent.trim() || textContent.length < 30) {
    textContent = '[PDF-документ загружен. Текстовый слой сжат или представлен в виде сканированных изображений]';
  }

  return textContent;
}

export function detectFileType(fileName: string): 'presentation' | 'notes' | 'literature' | 'other' {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pptx') || lower.endsWith('.ppt') || lower.includes('презентац') || lower.includes('слайд') || lower.includes('slide')) {
    return 'presentation';
  }
  if (lower.includes('конспект') || lower.includes('заметк') || lower.includes('лекци') || lower.endsWith('.md') || lower.includes('note')) {
    return 'notes';
  }
  if (lower.includes('учебник') || lower.includes('книг') || lower.includes('литератур') || lower.includes('методич') || lower.includes('пособи')) {
    return 'literature';
  }
  return 'other';
}

export async function processContextFile(file: File): Promise<ContextItem> {
  const lower = file.name.toLowerCase();
  let extractedText = '';

  if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.markdown')) {
    extractedText = await file.text();
  } else if (lower.endsWith('.docx')) {
    extractedText = await extractTextFromDocx(file);
  } else if (lower.endsWith('.pptx')) {
    extractedText = await extractTextFromPptx(file);
  } else if (lower.endsWith('.pdf')) {
    extractedText = await extractTextFromPdf(file);
  } else {
    // Attempt raw text read for unrecognized text-like files
    try {
      extractedText = await file.text();
    } catch {
      extractedText = `[Файл ${file.name} прикреплен как метаданные]`;
    }
  }

  const cleanText = extractedText.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');

  return {
    id: 'ctx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    fileName: file.name,
    fileType: detectFileType(file.name),
    fileSize: file.size,
    extractedText: cleanText,
    charCount: cleanText.length,
  };
}

export function formatContextForPrompt(items: ContextItem[]): string {
  if (items.length === 0) return '';

  const sections: string[] = [];

  for (const item of items) {
    const typeLabel = item.fileType === 'presentation'
      ? 'Слайды презентации'
      : item.fileType === 'notes'
      ? 'Конспект / заметки студента'
      : item.fileType === 'literature'
      ? 'Учебная литература / методичка'
      : 'Дополнительные материалы';

    sections.push(
      `=== МАТЕРИАЛ: ${item.fileName} (${typeLabel}) ===\n${item.extractedText}\n`
    );
  }

  return sections.join('\n\n');
}
