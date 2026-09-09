import { open } from '@tauri-apps/plugin-shell';

export async function openExternalUrl(url: string): Promise<void> {
  try {
    await open(url);
  } catch (err) {
    console.warn('Failed to open via tauri plugin-shell, falling back to window.open:', err);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
