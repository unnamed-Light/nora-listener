import { invoke } from '@tauri-apps/api/core';

export async function generateSummary(
  text: string,
  apiKey?: string,
  includeQuotes: boolean = false,
  customPrompt?: string,
  contextText?: string,
  clarifyingPrompt?: string
): Promise<string> {
  const cleanKey = apiKey?.trim();
  if (!cleanKey) {
    throw new Error('Для генерации умного конспекта укажите Groq API ключ (gsk_...) в Настройках приложения.');
  }

  return await invoke<string>('generate_summary', {
    text,
    apiKey: cleanKey,
    includeQuotes,
    customPrompt: customPrompt?.trim() || null,
    contextText: contextText?.trim() || null,
    clarifyingPrompt: clarifyingPrompt?.trim() || null,
  });
}
