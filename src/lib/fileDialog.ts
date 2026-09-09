import { open } from '@tauri-apps/plugin-dialog';

export async function selectAudioFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{
      name: 'Audio/Video Files',
      extensions: ['mp3', 'wav', 'mp4', 'm4a', 'flac', 'ogg', 'aac', 'webm', 'mkv', 'avi']
    }]
  });
  
  if (selected === null) {
    return null;
  }
  
  if (typeof selected === 'string') {
    return selected;
  }
  
  if (Array.isArray(selected)) {
    return selected[0] || null;
  }
  
  // @ts-ignore: In case Tauri version returns an object with a path property
  if (selected && typeof selected === 'object' && 'path' in selected) {
    // @ts-ignore
    return selected.path;
  }
  
  return null;
}
