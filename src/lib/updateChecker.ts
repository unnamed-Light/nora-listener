import { invoke } from '@tauri-apps/api/core';

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName: string;
  releaseNotes: string;
  releaseUrl: string;
  publishedAt: string;
}

export function isNewerVersion(latestTag: string, currentTag: string): boolean {
  const parse = (v: string) => {
    const clean = v.trim().replace(/^[vV]/, '');
    const parts = clean.split('.').map((p) => {
      const match = p.match(/^\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
    };
  };

  const l = parse(latestTag);
  const c = parse(currentTag);

  if (l.major !== c.major) return l.major > c.major;
  if (l.minor !== c.minor) return l.minor > c.minor;
  return l.patch > c.patch;
}

export async function checkForUpdates(currentVersion: string = '1.2.2'): Promise<UpdateInfo> {
  try {
    const result = await invoke<UpdateInfo>('check_for_updates');
    if (result && typeof result.hasUpdate === 'boolean') {
      return result;
    }
    throw new Error('Некорректный ответ от нативной команды check_for_updates');
  } catch (nativeErr) {
    console.warn('Tauri check_for_updates error, attempting web fallback:', nativeErr);

    const response = await fetch('https://api.github.com/repos/unnamed-Light/nora-listener/releases/latest', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API HTTP ${response.status}`);
    }

    const data = await response.json();
    const latestVersion = (data.tag_name || '').trim();
    const hasUpdate = isNewerVersion(latestVersion, currentVersion);

    return {
      currentVersion,
      latestVersion,
      hasUpdate,
      releaseName: data.name || latestVersion,
      releaseNotes: data.body || '',
      releaseUrl: data.html_url || `https://github.com/unnamed-Light/nora-listener/releases/tag/${latestVersion}`,
      publishedAt: data.published_at || '',
    };
  }
}
