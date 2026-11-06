import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform, Linking } from 'react-native';
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
      .order('id', { ascending: false })
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

      const verDiff = compareVersions(release.version, APP_VERSION);
      // 只有当云端版本号严格高于本地 (如 1.0.2 > 1.0.1)，
      // 或主版本相同但内部构建号严格高于本地时才触发更新
      const hasNew =
        verDiff > 0 ||
        (verDiff === 0 && release.versionCode > APP_BUILD_NUMBER);

      return {
        hasUpdate: hasNew,
        release,
        currentVersion: APP_VERSION,
        message: hasNew ? '发现新版本' : `当前已是最新版本 (v${APP_VERSION})`,
      };
    }

    if (error) {
      return {
        hasUpdate: false,
        currentVersion: APP_VERSION,
        message: `检查更新失败: ${error.message || '网络连接异常'}`,
        error: error.message,
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
 * 获取可用的下载候选地址列表（自动为 GitHub 直链添加国内高速镜像兜底）
 */
export function getCandidateDownloadUrls(url: string): string[] {
  const trimmed = url.trim();
  let cleanGithubUrl = '';
  if (trimmed.includes('github.com/')) {
    const parts = trimmed.split('github.com/');
    cleanGithubUrl = `https://github.com/${parts[parts.length - 1]}`;
  }

  if (cleanGithubUrl) {
    return [
      `https://gh.con.sh/${cleanGithubUrl}`,
      `https://gh-proxy.com/${cleanGithubUrl}`,
      `https://ghproxy.net/${cleanGithubUrl}`,
      cleanGithubUrl,
    ];
  }
  return [trimmed];
}

/**
 * 通过系统默认浏览器打开下载链接（支持后台、锁屏下载与系统通知栏进度显示）
 */
export async function openDownloadInBrowser(downloadUrl: string): Promise<boolean> {
  const candidates = getCandidateDownloadUrls(downloadUrl);
  const targetUrl = candidates[0] || downloadUrl;
  try {
    const supported = await Linking.canOpenURL(targetUrl);
    if (supported) {
      await Linking.openURL(targetUrl);
      return true;
    }
  } catch {}
  return false;
}

/**
 * 下载并安装 APK（支持屏幕常亮、断点续传与网络中断自动重试）
 */
export async function downloadAndInstallApk(
  downloadUrl: string,
  onProgress?: (progress: number, writtenBytes: number, totalBytes: number) => void
): Promise<{ success: boolean; uri?: string; error?: string }> {
  if (Platform.OS !== 'android') {
    return { success: false, error: '仅支持在 Android 设备上进行软件内安装更新' };
  }

  // 保持屏幕常亮，防止手机锁屏导致系统强制断开网络 Socket
  try {
    await activateKeepAwakeAsync('apk_download_tag');
  } catch {}

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

  const candidates = getCandidateDownloadUrls(downloadUrl);
  let lastError = '下载失败';

  try {
    for (const url of candidates) {
      try {
        activeDownloadResumable = FileSystem.createDownloadResumable(
          url,
          targetFileUri,
          {},
          callback
        );

        let result = null;
        let retries = 0;
        // 支持断点续传重试（若遭遇网络暂时中断或短暂切屏，不从头开始重新下载）
        while (retries < 3) {
          try {
            if (retries === 0) {
              result = await activeDownloadResumable.downloadAsync();
            } else {
              result = await activeDownloadResumable.resumeAsync();
            }
            if (result?.uri) break;
          } catch (innerErr: any) {
            retries++;
            if (retries >= 3) {
              throw innerErr;
            }
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        if (result?.uri) {
          // 调用系统包安装器
          const installOk = await launchPackageInstaller(result.uri);
          return { success: installOk.success, uri: result.uri, error: installOk.error };
        }
      } catch (err: any) {
        lastError = err.message || '网络连接异常';
        // 尝试下一个镜像源前清理
        try {
          await FileSystem.deleteAsync(targetFileUri, { idempotent: true });
        } catch {}
        continue;
      } finally {
        activeDownloadResumable = null;
      }
    }

    return { success: false, error: lastError };
  } finally {
    try {
      await deactivateKeepAwake('apk_download_tag');
    } catch {}
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
