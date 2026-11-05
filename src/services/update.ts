import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { APP_VERSION, APP_BUILD_NUMBER } from '../config/version';

export interface AppReleaseInfo {
  version: string;
  versionCode: number;
  title?: string;
  releaseNotes: string;
  downloadUrl: string;
  fileSize?: string;
  forceUpdate?: boolean;
  publishedAt?: string;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  release?: AppReleaseInfo;
  currentVersion: string;
  message?: string;
  error?: string;
}

/**
 * 版本号对比: 返回 1 (v1 > v2), -1 (v1 < v2), 0 (相等)
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace(/^v/i, '').split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = v2.replace(/^v/i, '').split('.').map((p) => parseInt(p, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

/**
 * 检查应用版本更新（直接查询 Supabase 发版表）
 */
export async function checkForUpdates(): Promise<CheckUpdateResult> {
  try {
    const { data, error } = await supabase
      .from('app_releases')
      .select('*')
      .order('version_code', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const release: AppReleaseInfo = {
        version: data.version,
        versionCode: data.version_code || 1,
        title: data.title || `新版本 v${data.version}`,
        releaseNotes: data.release_notes || '优化体验与修复已知问题',
        downloadUrl: data.download_url,
        fileSize: data.file_size || '33 MB',
        forceUpdate: Boolean(data.force_update),
        publishedAt: data.published_at,
      };

      const hasNew =
        release.versionCode > APP_BUILD_NUMBER ||
        compareVersions(release.version, APP_VERSION) > 0;

      return {
        hasUpdate: hasNew,
        release,
        currentVersion: APP_VERSION,
        message: hasNew ? '发现新版本' : `当前已是最新版本 (v${APP_VERSION})`,
      };
    }

    // 默认已是最新版本
    return {
      hasUpdate: false,
      currentVersion: APP_VERSION,
      message: `当前已是最新版本 (v${APP_VERSION})`,
    };
  } catch (err: any) {
    return {
      hasUpdate: false,
      currentVersion: APP_VERSION,
      message: `检查更新失败: ${err.message || '网络连接异常'}`,
      error: err.message,
    };
  }
}

let activeDownloadResumable: FileSystem.DownloadResumable | null = null;
const UPDATE_APK_FILENAME = 'password_vault_update.apk';

/**
 * 获取本地下载安装包的路径
 */
export function getLocalApkUri(): string {
  return `${FileSystem.cacheDirectory}${UPDATE_APK_FILENAME}`;
}

/**
 * 下载并安装 APK
 */
export async function downloadAndInstallApk(
  downloadUrl: string,
  onProgress?: (progress: number, writtenBytes: number, totalBytes: number) => void
): Promise<{ success: boolean; uri?: string; error?: string }> {
  if (Platform.OS !== 'android') {
    return { success: false, error: '仅支持在 Android 设备上进行软件内安装更新' };
  }

  const targetFileUri = getLocalApkUri();

  // 清除旧缓存安装包
  try {
    const fileInfo = await FileSystem.getInfoAsync(targetFileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(targetFileUri, { idempotent: true });
    }
  } catch {}

  const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
    if (downloadProgress.totalBytesExpectedToWrite > 0) {
      const progress =
        downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
      onProgress?.(
        progress,
        downloadProgress.totalBytesWritten,
        downloadProgress.totalBytesExpectedToWrite
      );
    }
  };

  activeDownloadResumable = FileSystem.createDownloadResumable(
    downloadUrl,
    targetFileUri,
    {},
    callback
  );

  try {
    const result = await activeDownloadResumable.downloadAsync();
    if (!result?.uri) {
      return { success: false, error: '安装包下载失败，未取得文件' };
    }

    // 调用系统包安装器
    const installOk = await launchPackageInstaller(result.uri);
    return { success: installOk.success, uri: result.uri, error: installOk.error };
  } catch (err: any) {
    return { success: false, error: err.message || '下载或安装异常' };
  } finally {
    activeDownloadResumable = null;
  }
}

/**
 * 唤起 Android 系统原生应用安装器
 */
export async function launchPackageInstaller(
  fileUri: string
): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS !== 'android') {
    return { success: false, error: '仅支持 Android 设备' };
  }

  try {
    // 关键：将 file:// 本地路径转为 content:// 安全分享 URI
    const contentUri = await FileSystem.getContentUriAsync(fileUri);

    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: 'application/vnd.android.package-archive',
      flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
    });

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: `唤起安装器失败: ${err.message || '系统限制或未授权未知应用安装'}`,
    };
  }
}

/**
 * 取消当前下载
 */
export async function cancelDownload(): Promise<void> {
  if (activeDownloadResumable) {
    try {
      await activeDownloadResumable.cancelAsync();
    } catch {}
    activeDownloadResumable = null;
  }
}
