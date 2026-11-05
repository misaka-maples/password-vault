import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import {
  AppReleaseInfo,
  downloadAndInstallApk,
  cancelDownload,
  launchPackageInstaller,
  getLocalApkUri,
  openDownloadInBrowser,
} from '../services/update';

interface Props {
  visible: boolean;
  release: AppReleaseInfo | null;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const UpdateModal: React.FC<Props> = ({
  visible,
  release,
  onClose,
  onShowToast,
}) => {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [writtenBytes, setWrittenBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setStatus('idle');
      setProgress(0);
      setWrittenBytes(0);
      setTotalBytes(0);
      setErrorMessage('');
    }
  }, [visible]);

  if (!release) return null;

  const formatSize = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 MB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleStartDownload = async () => {
    if (Platform.OS !== 'android') {
      onShowToast('软件内安装目前仅支持 Android 设备');
      return;
    }

    setStatus('downloading');
    setProgress(0);
    setErrorMessage('');

    const res = await downloadAndInstallApk(
      release.downloadUrl,
      (p, written, total) => {
        setProgress(p);
        setWrittenBytes(written);
        setTotalBytes(total);
      }
    );

    if (res.success) {
      setStatus('downloaded');
      onShowToast('安装包下载完成，已拉起系统安装');
    } else {
      setStatus('error');
      setErrorMessage(res.error || '下载或拉起安装失败');
    }
  };

  const handleOpenBrowser = async () => {
    if (!release) return;
    const ok = await openDownloadInBrowser(release.downloadUrl);
    if (ok) {
      onShowToast('已调起浏览器下载，支持锁屏与切后台');
      onClose();
    } else {
      onShowToast('未能拉起浏览器，请重试');
    }
  };

  const handleCancelDownload = async () => {
    await cancelDownload();
    setStatus('idle');
    onClose();
  };

  const handleReinstall = async () => {
    const res = await launchPackageInstaller(getLocalApkUri());
    if (res.success) {
      onShowToast('已重新拉起安装器');
    } else {
      onShowToast(res.error || '拉起失败');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 状态 1: 发现新版本，等待下载 */}
          {status === 'idle' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF0E8' }]}>
                <Text style={styles.iconText}>🚀</Text>
              </View>

              <Text style={styles.title}>{release.title || `发现新版本 v${release.version}`}</Text>

              <View style={styles.badgeRow}>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionBadgeText}>版本: v{release.version}</Text>
                </View>
                {release.fileSize && (
                  <View style={styles.sizeBadge}>
                    <Text style={styles.sizeBadgeText}>大小: {release.fileSize}</Text>
                  </View>
                )}
              </View>

              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>📋 更新内容</Text>
                <ScrollView style={styles.notesScroll} nestedScrollEnabled>
                  <Text style={styles.notesContent}>{release.releaseNotes}</Text>
                </ScrollView>
              </View>

              <View style={styles.buttonRow}>
                {!release.forceUpdate && (
                  <TouchableOpacity
                    style={[styles.btn, styles.cancelBtn]}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>稍后再说</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.btn, styles.primaryBtn, release.forceUpdate && styles.fullBtn]}
                  onPress={handleStartDownload}
                  activeOpacity={0.7}
                >
                  <Text style={styles.primaryBtnText}>立即下载更新</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.browserLinkBtn}
                onPress={handleOpenBrowser}
                activeOpacity={0.7}
              >
                <Text style={styles.browserLinkText}>🌐 改用系统浏览器下载 (支持锁屏与后台下载)</Text>
              </TouchableOpacity>
            </>
          )}

          {/* 状态 2: 正在下载中，显示进度条 */}
          {status === 'downloading' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF8E1' }]}>
                <Text style={styles.iconText}>⬇️</Text>
              </View>

              <Text style={styles.title}>正在下载新版本...</Text>
              <Text style={styles.subtitle}>下载完成后将自动拉起系统安装器</Text>

              {/* 卡通拟物进度条 */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBarWrapper}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, Math.max(2, Math.round(progress * 100)))}%` },
                    ]}
                  />
                </View>
                <View style={styles.progressTextRow}>
                  <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
                  <Text style={styles.progressBytes}>
                    {formatSize(writtenBytes)} / {totalBytes > 0 ? formatSize(totalBytes) : release.fileSize || '21 MB'}
                  </Text>
                </View>
              </View>

              <Text style={styles.keepAwakeHint}>
                💡 应用内下载已开启常亮与断点续传；如需锁屏离开，建议点击下方改用浏览器下载。
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={handleCancelDownload}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>取消下载</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.browserBtn]}
                  onPress={handleOpenBrowser}
                  activeOpacity={0.7}
                >
                  <Text style={styles.browserBtnText}>切到浏览器下载</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* 状态 3: 下载完毕，已拉起或支持重新拉起安装 */}
          {status === 'downloaded' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.iconText}>🎉</Text>
              </View>

              <Text style={styles.title}>安装包已就绪！</Text>
              <Text style={styles.subtitle}>
                系统安装器已为您调起。若由于系统权限阻挡未自动弹出，请点击下方按钮重新触发安装。
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>关闭</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.primaryBtn]}
                  onPress={handleReinstall}
                  activeOpacity={0.7}
                >
                  <Text style={styles.primaryBtnText}>重新拉起安装</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* 状态 4: 下载或拉起异常 */}
          {status === 'error' && (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#FFEBEA' }]}>
                <Text style={styles.iconText}>⚠️</Text>
              </View>

              <Text style={styles.title}>更新未能完成</Text>
              <Text style={styles.errorDesc}>{errorMessage || '网络连接超时或未知错误'}</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>取消</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.primaryBtn]}
                  onPress={handleStartDownload}
                  activeOpacity={0.7}
                >
                  <Text style={styles.primaryBtnText}>重试下载</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.browserLinkBtn}
                onPress={handleOpenBrowser}
                activeOpacity={0.7}
              >
                <Text style={styles.browserLinkText}>🌐 改用浏览器下载 (更稳定/支持锁屏后台)</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 20, 18, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFDFB',
    borderRadius: 26,
    borderWidth: 2.2,
    borderColor: '#2D3142',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#2D3142',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.2,
    borderColor: '#2D3142',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2D3142',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13.5,
    color: '#6F5E59',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  errorDesc: {
    fontSize: 13,
    color: '#E05345',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 8,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  versionBadge: {
    backgroundColor: '#FFF0ED',
    borderWidth: 1.5,
    borderColor: '#2D3142',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  versionBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B57',
  },
  sizeBadge: {
    backgroundColor: '#F5ECE7',
    borderWidth: 1.5,
    borderColor: '#2D3142',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sizeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6F5E59',
  },
  notesBox: {
    width: '100%',
    backgroundColor: '#FAF5F2',
    borderWidth: 1.5,
    borderColor: '#E6D3CC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    maxHeight: 160,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D3142',
    marginBottom: 6,
  },
  notesScroll: {
    maxHeight: 120,
  },
  notesContent: {
    fontSize: 13,
    color: '#6F5E59',
    lineHeight: 20,
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBarWrapper: {
    width: '100%',
    height: 18,
    backgroundColor: '#F3E9E4',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2D3142',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF7A59',
    borderRadius: 8,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FF7A59',
  },
  progressBytes: {
    fontSize: 12,
    color: '#8A7A74',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 2.2,
    borderColor: '#2D3142',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBtn: {
    width: '100%',
  },
  cancelBtn: {
    backgroundColor: '#F5ECE7',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6F5E59',
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: '#FF7A59',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  browserBtn: {
    backgroundColor: '#FFEFEA',
  },
  browserBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D45A39',
  },
  browserLinkBtn: {
    marginTop: 14,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browserLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  keepAwakeHint: {
    fontSize: 12,
    color: '#8A7A74',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: '#FAF4EF',
    padding: 8,
    borderRadius: 10,
  },
});
