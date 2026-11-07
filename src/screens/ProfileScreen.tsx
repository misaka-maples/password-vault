import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cloudbaseAuth } from '../config/cloudbase';
import { backupToCloudBase, pullFromCloudBase } from '../services/sync';
import { getLastSyncTime } from '../services/storage';
import { ResetConfirmModal } from '../components/ResetConfirmModal';
import { RemovePasswordModal } from '../components/RemovePasswordModal';
import { UpdateModal } from '../components/UpdateModal';
import { useThemedDialog } from '../context/ThemedDialogContext';
import { APP_VERSION, APP_BUILD_NUMBER } from '../config/version';
import { checkForUpdates, AppReleaseInfo } from '../services/update';
import {
  checkBiometricSupport,
  enableBiometricUnlock,
  disableBiometricUnlock,
  BiometricStatus,
} from '../services/biometrics';

const CACHED_USER_EMAIL_KEY = '@vault_cached_user_email';

function formatFriendlyError(err: any, defaultMsg = '操作失败，请重试'): string {
  if (!err) return defaultMsg;
  const raw = (err.message || (typeof err === 'string' ? err : '')).toString();
  if (
    raw.includes('SocketException') ||
    raw.includes('Connection reset') ||
    raw.includes('ECONNRESET') ||
    raw.includes('Network request failed') ||
    raw.includes('Failed to fetch')
  ) {
    return '网络连接异常或被重置，请检查手机网络连接后重试。';
  }
  if (raw.includes('Invalid login credentials')) {
    return '邮箱或登录密码不正确，请重新核对。';
  }
  if (raw.includes('invalid_password') || raw.includes('not_found')) {
    return '邮箱或登录密码不正确，请重新核对。';
  }
  if (raw.includes('User already registered')) {
    return '该邮箱已被注册，请直接切换为登录模式。';
  }
  if (raw.includes('failed_precondition')) {
    return '该邮箱已被注册，请直接切换为登录模式。';
  }
  if (raw.includes('invalid_argument')) {
    return '验证码错误或已过期，请重新输入。';
  }
  if (raw.includes('resource_exhausted')) {
    return '验证码发送过于频繁，请稍后再试。';
  }
  if (raw.includes('login_type_disabled')) {
    return '云端邮箱登录方式尚未启用。';
  }
  if (raw.includes('timeout') || raw.includes('SocketTimeoutException') || raw.includes('超时')) {
    return '连接云端超时（超过 8 秒未响应），请检查网络环境或开启加速工具。';
  }
  return raw || defaultMsg;
}

interface Props {
  hasMasterPassword: boolean;
  masterKey: string | null;
  onRefreshVault: () => Promise<void>;
  onLockVault: () => void;
  onOpenSetPassword: () => void;
  onOpenChangePassword: () => void;
  onRemoveMasterPassword: (password: string) => Promise<boolean>;
  onResetVault: () => Promise<void>;
  onShowToast: (msg: string) => void;
}

export const ProfileScreen: React.FC<Props> = ({
  hasMasterPassword,
  masterKey,
  onRefreshVault,
  onLockVault,
  onOpenSetPassword,
  onOpenChangePassword,
  onRemoveMasterPassword,
  onResetVault,
  onShowToast,
}) => {
  const { showDialog } = useThemedDialog();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isAwaitingOtp, setIsAwaitingOtp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [bioStatus, setBioStatus] = useState<BiometricStatus | null>(null);

  // 检查更新相关状态
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateRelease, setUpdateRelease] = useState<AppReleaseInfo | null>(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);

  const scrollViewRef = useRef<any>(null);
  const pendingOtpVerifierRef = useRef<
    ((params: { token: string | number }) => Promise<any>) | null
  >(null);

  useEffect(() => {
    checkUser();
    loadLastSync();
    loadBioStatus();
  }, [hasMasterPassword, masterKey]);

  const loadBioStatus = async () => {
    const status = await checkBiometricSupport();
    setBioStatus(status);
  };

  const checkUser = async () => {
    // 1. 优先秒级读取本地缓存，消除切屏闪烁
    try {
      const cached = await AsyncStorage.getItem(CACHED_USER_EMAIL_KEY);
      if (cached) {
        setUserEmail(cached);
        setIsVerifyingAuth(false);
      }
    } catch {}

    // 2. 异步在后台静默验证 session 有效性
    try {
      const { data: { user }, error } = await cloudbaseAuth.getUser();
      if (error) throw error;
      if (user?.email) {
        setUserEmail(user.email);
        await AsyncStorage.setItem(CACHED_USER_EMAIL_KEY, user.email);
      } else {
        setUserEmail(null);
        await AsyncStorage.removeItem(CACHED_USER_EMAIL_KEY);
      }
    } catch {
      // 离线网络时保留缓存状态
    } finally {
      setIsVerifyingAuth(false);
    }
  };

  const handleToggleBiometric = async () => {
    if (!bioStatus?.hasHardware || !bioStatus?.isEnrolled) {
      showDialog({
        title: '未检测到生物识别',
        message: '此设备未检测到已录入的指纹或面容识别，请先在手机系统设置中录入。',
        icon: '👆',
        iconBg: '#FFF9E6',
        confirmText: '我知道了',
      });
      return;
    }

    if (bioStatus.isEnabled) {
      showDialog({
        title: '关闭生物识别',
        message: '确定要关闭指纹/面容快速解锁吗？关闭后需每次手动输入主密码。',
        icon: '👆',
        iconBg: '#FFEBEA',
        cancelText: '取消',
        confirmText: '确定关闭',
        confirmType: 'danger',
        onConfirm: async () => {
          await disableBiometricUnlock();
          const updated = await checkBiometricSupport();
          setBioStatus(updated);
          onShowToast('已关闭生物识别快速解锁');
        },
      });
    } else {
      if (masterKey) {
        try {
          await enableBiometricUnlock(masterKey);
          const updated = await checkBiometricSupport();
          setBioStatus(updated);
          onShowToast('已成功开启指纹/面容快速解锁！');
        } catch (e: any) {
          showDialog({
            title: '开启失败',
            message: e.message || '系统生物识别服务绑定失败',
            icon: '⚠️',
            iconBg: '#FFEBEA',
            confirmType: 'danger',
            confirmText: '我知道了',
          });
        }
      } else {
        showDialog({
          title: '需要先解锁',
          message: '请先解锁保险库以验证身份并绑定指纹/面容识别。',
          icon: '🔒',
          iconBg: '#FFF0E8',
          cancelText: '取消',
          confirmText: '立即解锁',
          confirmType: 'primary',
          onConfirm: () => onLockVault(),
        });
      }
    }
  };

  const loadLastSync = async () => {
    const time = await getLastSyncTime();
    setLastSync(time);
  };

  const handleAuth = async () => {
    const cleanEmail = authEmail.trim();
    const cleanPassword = authPassword.trim();

    if (!cleanEmail || !cleanPassword) {
      showDialog({
        title: '提示',
        message: '请输入邮箱和密码',
        icon: '💡',
        iconBg: '#FFF9E6',
        confirmText: '我知道了',
      });
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      showDialog({
        title: '提示',
        message: '请输入合法的邮箱格式（如 user@gmail.com 或 user@qq.com）',
        icon: '💡',
        iconBg: '#FFF9E6',
        confirmText: '我知道了',
      });
      return;
    }

    if (cleanPassword.length < 6) {
      showDialog({
        title: '提示',
        message: '密码长度不能少于 6 位',
        icon: '💡',
        iconBg: '#FFF9E6',
        confirmText: '我知道了',
      });
      return;
    }

    setAuthLoading(true);
    try {
      if (isRegisterMode) {
        if (isAwaitingOtp) {
          const cleanOtp = authOtp.trim();
          if (!cleanOtp || !pendingOtpVerifierRef.current) {
            throw new Error('请输入邮箱中的验证码');
          }

          const { data, error } = await pendingOtpVerifierRef.current({ token: cleanOtp });
          if (error) throw error;

          const email = data.user?.email || cleanEmail;
          setUserEmail(email);
          await AsyncStorage.setItem(CACHED_USER_EMAIL_KEY, email);
          pendingOtpVerifierRef.current = null;
          setIsAwaitingOtp(false);
          setAuthOtp('');
          setAuthPassword('');
          onShowToast('验证成功，CloudBase 账号已创建');
        } else {
          const { data, error } = await cloudbaseAuth.signUp({
            email: cleanEmail,
            password: cleanPassword,
          });
          if (error) throw error;
          if (!data.verifyOtp) throw new Error('云端未返回验证码校验通道');

          pendingOtpVerifierRef.current = data.verifyOtp;
          setIsAwaitingOtp(true);
          showDialog({
            title: '验证码已发送',
            message: '请查收邮件，输入验证码后完成 CloudBase 账号注册。',
            icon: '📧',
            iconBg: '#E8F5E9',
            confirmText: '我知道了',
          });
        }
      } else {
        const { data, error } = await cloudbaseAuth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });
        if (error) throw error;

        const email = data.user?.email || cleanEmail;
        setUserEmail(email);
        await AsyncStorage.setItem(CACHED_USER_EMAIL_KEY, email);
        onShowToast('账号登录成功');
      }
    } catch (err: any) {
      showDialog({
        title: '操作失败',
        message: formatFriendlyError(err, '网络连接异常'),
        icon: '⚠️',
        iconBg: '#FFEBEA',
        confirmType: 'danger',
        confirmText: '我知道了',
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    showDialog({
      title: '退出登录',
      message: '确定要退出当前的云端账号吗？本地已保存的密码记录不受影响。',
      icon: '🚪',
      iconBg: '#FFF0E8',
      cancelText: '取消',
      confirmText: '退出登录',
      confirmType: 'danger',
      onConfirm: async () => {
        await cloudbaseAuth.signOut();
        await AsyncStorage.removeItem(CACHED_USER_EMAIL_KEY);
        setUserEmail(null);
        onShowToast('已退出登录');
      },
    });
  };

  const handleBackup = async () => {
    if (!userEmail) {
      showDialog({
        title: '提示',
        message: '请先在下方登录云端账号后再进行云端备份',
        icon: '☁️',
        iconBg: '#FFF0E8',
        confirmText: '我知道了',
      });
      return;
    }

    if (!hasMasterPassword) {
      showDialog({
        title: '安全提示',
        message: '为确保数据端到端加密安全，请先设置主密码再进行云端备份。',
        icon: '🛡️',
        iconBg: '#FFF9E6',
        cancelText: '取消',
        confirmText: '去设置',
        confirmType: 'primary',
        onConfirm: onOpenSetPassword,
      });
      return;
    }

    setSyncLoading(true);
    try {
      const res = await backupToCloudBase(masterKey);
      if (res.success) {
        setLastSync(res.updatedAt || '刚刚');
        onShowToast('云端备份成功！');
      } else {
        showDialog({
          title: '备份提示',
          message: res.message,
          icon: '☁️',
          confirmText: '我知道了',
        });
      }
    } catch (err: any) {
      showDialog({
        title: '备份错误',
        message: formatFriendlyError(err, '备份失败'),
        icon: '⚠️',
        confirmType: 'danger',
        confirmText: '我知道了',
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handlePull = async () => {
    if (!userEmail) {
      showDialog({
        title: '提示',
        message: '请先在下方登录云端账号后再拉取数据',
        icon: '☁️',
        iconBg: '#FFF0E8',
        confirmText: '我知道了',
      });
      return;
    }

    showDialog({
      title: '从云端拉取同步',
      message: '从云端下载最新加密数据并覆盖本地当前记录，确定继续吗？',
      icon: '☁️',
      iconBg: '#FFF0E8',
      cancelText: '取消',
      confirmText: '确定拉取',
      confirmType: 'primary',
      onConfirm: async () => {
        setSyncLoading(true);
        try {
          const res = await pullFromCloudBase();
          if (res.success) {
            setLastSync(res.updatedAt || '刚刚');
            await onRefreshVault();
            onShowToast(res.message);
          } else {
            showDialog({
              title: '同步提示',
              message: res.message,
              icon: '☁️',
              confirmText: '我知道了',
            });
          }
        } catch (err: any) {
          showDialog({
            title: '同步错误',
            message: formatFriendlyError(err, '网络连接异常'),
            icon: '⚠️',
            confirmType: 'danger',
            confirmText: '我知道了',
          });
        } finally {
          setSyncLoading(false);
        }
      },
    });
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await checkForUpdates();
      if (res.error) {
        showDialog({
          title: '检查更新失败',
          message: formatFriendlyError({ message: res.error }, '网络连接异常，请稍后重试'),
          icon: '⚠️',
          iconBg: '#FFEBEA',
          confirmType: 'danger',
          confirmText: '我知道了',
        });
        return;
      }
      if (res.hasUpdate && res.release) {
        setUpdateRelease(res.release);
        setUpdateModalVisible(true);
      } else {
        showDialog({
          title: '已是最新版本',
          message: `当前安装的已经是最新版本 (v${APP_VERSION})，暂无更新。`,
          icon: '✅',
          iconBg: '#E8F5E9',
          confirmText: '我知道了',
        });
      }
    } catch (err: any) {
      showDialog({
        title: '检查更新失败',
        message: formatFriendlyError(err, '网络连接异常，请稍后重试'),
        icon: '⚠️',
        iconBg: '#FFEBEA',
        confirmType: 'danger',
        confirmText: '我知道了',
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>我的</Text>

      {/* 1. 安全与主密码设置中心 */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>🔐</Text>
          <Text style={styles.sectionTitle}>主密码与安全中心</Text>
        </View>

        {hasMasterPassword ? (
          <>
            <View style={styles.statusBannerSuccess}>
              <Text style={styles.statusBannerText}>✅ 已设置主密码</Text>
            </View>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={onOpenChangePassword}
              activeOpacity={0.7}
            >
              <Text style={styles.settingItemTitle}>🔑 修改保险库主密码 (需原密码)</Text>
              <Text style={styles.settingItemArrow}>➔</Text>
            </TouchableOpacity>

            {/* 生物识别快捷设置 */}
            {bioStatus?.hasHardware && (
              <TouchableOpacity
                style={styles.settingItem}
                onPress={handleToggleBiometric}
                activeOpacity={0.7}
              >
                <View style={styles.settingItemLeft}>
                  <Text style={styles.settingItemTitle}>
                    {bioStatus.biometricType === 'facial'
                      ? '👤 面容识别快速解锁'
                      : '👆 指纹识别快速解锁'}
                  </Text>
                  <Text style={styles.settingItemSubtitle}>
                    {bioStatus.isEnabled
                      ? '已开启，解锁时可一键免密进入'
                      : '未开启，点击开启指纹/面容快速解锁'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.bioBadge,
                    bioStatus.isEnabled ? styles.bioBadgeOn : styles.bioBadgeOff,
                  ]}
                >
                  <Text
                    style={[
                      styles.bioBadgeText,
                      bioStatus.isEnabled ? styles.bioBadgeTextOn : styles.bioBadgeTextOff,
                    ]}
                  >
                    {bioStatus.isEnabled ? '已开启' : '点击开启'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setRemoveModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.settingItemTitle}>🔓 解除主密码 (保留全部数据)</Text>
              <Text style={styles.settingItemArrow}>➔</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={onLockVault}
              activeOpacity={0.7}
            >
              <Text style={styles.settingItemTitle}>🔒 立即锁定保险库</Text>
              <Text style={styles.settingItemArrow}>➔</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.statusBannerWarning}>
              <Text style={styles.statusBannerWarningText}>
                ⚠️ 当前尚未设置主密码，保险库未开启锁定加密
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={onOpenSetPassword}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryActionButtonText}>🛡️ 设置保险库主密码</Text>
            </TouchableOpacity>
          </>
        )}

        {/* 严格确认的重置入口 */}
        <TouchableOpacity
          style={[styles.settingItem, styles.dangerItem]}
          onPress={() => setResetModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.dangerItemText}>⚠️ 忘记主密码并清空重置 (格式化本地)</Text>
          <Text style={styles.dangerItemText}>➔</Text>
        </TouchableOpacity>
      </View>

      {/* 2. 云端备份与拉取操作区 */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>🔄</Text>
          <Text style={styles.sectionTitle}>数据备份与漫游</Text>
        </View>

        <View style={styles.syncStatusRow}>
          <Text style={styles.syncStatusLabel}>最近备份时间：</Text>
          <Text style={styles.syncStatusValue}>{lastSync ? lastSync : '尚未同步'}</Text>
        </View>

        <View style={styles.syncBtnRow}>
          <TouchableOpacity
            style={[styles.syncBtn, styles.backupBtn]}
            onPress={handleBackup}
            disabled={syncLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.syncBtnText}>⬆ 备份到云端</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.syncBtn, styles.pullBtn]}
            onPress={handlePull}
            disabled={syncLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.syncBtnText}>⬇ 从云端拉取</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. 账号卡片 */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>👤</Text>
          <Text style={styles.sectionTitle}>账号</Text>
        </View>

        {userEmail ? (
          <View style={styles.userContainer}>
            <View style={styles.userBadgeRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.userEmailText}>{userEmail}</Text>
            </View>
            <Text style={styles.userStatusSub}>端到端加密通道已建立</Text>

            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutText}>退出登录</Text>
            </TouchableOpacity>
          </View>
        ) : isVerifyingAuth ? (
          <View style={styles.authLoadingContainer}>
            <ActivityIndicator size="small" color="#F6B4A6" />
            <Text style={styles.authLoadingText}>验证账号状态中...</Text>
          </View>
        ) : (
          <View style={styles.authContainer}>
            <Text style={styles.authHint}>
              登录云端账号即可实现多设备密码无缝备份与漫游同步。
            </Text>

            <TextInput
              style={styles.input}
              placeholder="请输入邮箱 (如 user@gmail.com)"
              placeholderTextColor="#A89A94"
              value={authEmail}
              onChangeText={setAuthEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 120);
              }}
            />

            <TextInput
              style={styles.input}
              placeholder="请输入密码 (至少6位)"
              placeholderTextColor="#A89A94"
              value={authPassword}
              onChangeText={setAuthPassword}
              secureTextEntry
              autoCapitalize="none"
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 120);
              }}
            />

            {isRegisterMode && isAwaitingOtp && (
              <TextInput
                style={styles.input}
                placeholder="请输入邮箱验证码"
                placeholderTextColor="#A89A94"
                value={authOtp}
                onChangeText={setAuthOtp}
                keyboardType="number-pad"
                autoCapitalize="none"
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 120);
                }}
              />
            )}

            <TouchableOpacity
              style={styles.authPrimaryBtn}
              onPress={handleAuth}
              disabled={authLoading}
              activeOpacity={0.7}
            >
              {authLoading ? (
                <ActivityIndicator color="#2B1E1C" />
              ) : (
                <Text style={styles.authPrimaryBtnText}>
                  {isRegisterMode
                    ? isAwaitingOtp
                      ? '验证并完成注册'
                      : '发送验证码'
                    : '登录云端'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchAuthBtn}
              onPress={() => {
                setIsRegisterMode(!isRegisterMode);
                setIsAwaitingOtp(false);
                setAuthOtp('');
                pendingOtpVerifierRef.current = null;
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.switchAuthText}>
                {isRegisterMode ? '已有账号？点击切换为登录' : '没有账号？点击注册新账号'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 4. 软件更新与版本 */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>🚀</Text>
          <Text style={styles.sectionTitle}>软件更新与版本</Text>
        </View>

        <View style={styles.versionCardRow}>
          <View>
            <Text style={styles.versionLabel}>当前版本</Text>
            <Text style={styles.versionValue}>
              v{APP_VERSION} (Build {APP_BUILD_NUMBER})
            </Text>
          </View>
          <TouchableOpacity
            style={styles.checkUpdateBtn}
            onPress={handleCheckUpdate}
            disabled={isCheckingUpdate}
            activeOpacity={0.7}
          >
            {isCheckingUpdate ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.checkUpdateBtnText}>🔄 检查更新</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 新版本下载与安装弹窗 */}
      <UpdateModal
        visible={updateModalVisible}
        release={updateRelease}
        onClose={() => setUpdateModalVisible(false)}
        onShowToast={onShowToast}
      />

      {/* 高风险重置确认弹窗 */}
      {/* 解除主密码确认弹窗 (保留全部数据) */}
      <RemovePasswordModal
        visible={removeModalVisible}
        onClose={() => setRemoveModalVisible(false)}
        onConfirmRemove={async (pwd) => {
          const ok = await onRemoveMasterPassword(pwd);
          if (ok) {
            onShowToast('已解除主密码保护，现有密码完整保留');
          }
          return ok;
        }}
      />

      <ResetConfirmModal
        visible={resetModalVisible}
        onClose={() => setResetModalVisible(false)}
        onConfirmReset={async () => {
          await onResetVault();
          onShowToast('密码库已安全重置');
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 90,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#2B201E',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#2F2321',
    padding: 18,
    marginBottom: 16,
    shadowColor: '#2F2321',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C1F1D',
  },
  statusBannerSuccess: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#A5D6A7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
  },
  statusBannerWarning: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#FFCC80',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  statusBannerWarningText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65100',
  },
  primaryActionButton: {
    backgroundColor: '#F8B4A6',
    borderWidth: 2,
    borderColor: '#2F2321',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryActionButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2A1E1C',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3E8E3',
  },
  settingItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  settingItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#362725',
  },
  settingItemSubtitle: {
    fontSize: 12,
    color: '#8A7A74',
    marginTop: 2,
  },
  settingItemArrow: {
    fontSize: 16,
    color: '#9C8C87',
  },
  bioBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.2,
  },
  bioBadgeOn: {
    backgroundColor: '#E8F5E9',
    borderColor: '#81C784',
  },
  bioBadgeOff: {
    backgroundColor: '#F5ECE7',
    borderColor: '#C7B6AF',
  },
  bioBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bioBadgeTextOn: {
    color: '#2E7D32',
  },
  bioBadgeTextOff: {
    color: '#7D6D67',
  },
  dangerItem: {
    borderBottomWidth: 0,
    marginTop: 2,
  },
  dangerItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C62828',
  },
  userContainer: {
    alignItems: 'flex-start',
  },
  userBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  userEmailText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2E2220',
  },
  userStatusSub: {
    fontSize: 12,
    color: '#8A7A74',
    marginBottom: 12,
    marginLeft: 18,
  },
  signOutBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8A3A0',
    backgroundColor: '#FDF2F0',
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D26763',
  },
  authContainer: {
    marginTop: 2,
  },
  authLoadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  authLoadingText: {
    fontSize: 13,
    color: '#8C7C75',
    fontWeight: '600',
  },
  authHint: {
    fontSize: 13,
    color: '#7C6E68',
    marginBottom: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#FAF5F2',
    borderWidth: 1.8,
    borderColor: '#302220',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#2E2220',
    marginBottom: 10,
  },
  authPrimaryBtn: {
    backgroundColor: '#F7B4A6',
    borderWidth: 2,
    borderColor: '#302220',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  authPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2A1E1C',
  },
  switchAuthBtn: {
    alignItems: 'center',
    marginTop: 10,
  },
  switchAuthText: {
    fontSize: 13,
    color: '#936657',
    fontWeight: '600',
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  syncStatusLabel: {
    fontSize: 14,
    color: '#796A65',
  },
  syncStatusValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#342624',
  },
  syncBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  syncBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2F2321',
    alignItems: 'center',
  },
  backupBtn: {
    backgroundColor: '#FFE5D9',
  },
  pullBtn: {
    backgroundColor: '#E8F5E9',
  },
  syncBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2E201E',
  },
  versionCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF5F2',
    borderWidth: 1.5,
    borderColor: '#E6D3CC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  versionLabel: {
    fontSize: 12,
    color: '#8A7A74',
    marginBottom: 2,
    fontWeight: '600',
  },
  versionValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2D3142',
  },
  checkUpdateBtn: {
    backgroundColor: '#FF7A59',
    borderWidth: 1.8,
    borderColor: '#2D3142',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkUpdateBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
