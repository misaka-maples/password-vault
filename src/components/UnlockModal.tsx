import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useKeyboardOffset } from '../hooks/useKeyboardOffset';
import {
  checkBiometricSupport,
  authenticateWithBiometrics,
  enableBiometricUnlock,
  BiometricStatus,
  BIO_MASTER_KEY,
} from '../services/biometrics';

interface Props {
  visible: boolean;
  hasPasswordSet: boolean;
  reason?: string;
  onUnlock: (password: string) => Promise<boolean>;
  onOpenSetPassword: () => void;
  onOpenResetConfirm: () => void;
  onClose?: () => void;
}

export const UnlockModal: React.FC<Props> = ({
  visible,
  hasPasswordSet,
  reason,
  onUnlock,
  onOpenSetPassword,
  onOpenResetConfirm,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioStatus, setBioStatus] = useState<BiometricStatus | null>(null);
  const [enableBioAfterUnlock, setEnableBioAfterUnlock] = useState(true);

  // 检查生物识别状态
  useEffect(() => {
    if (visible && hasPasswordSet) {
      loadBiometricStatus();
    }
  }, [visible, hasPasswordSet]);

  const loadBiometricStatus = async () => {
    const status = await checkBiometricSupport();
    setBioStatus(status);

    // 如果已开启生物识别，弹窗显示时自动触发一次识别
    if (status.isEnabled) {
      setTimeout(() => {
        triggerBiometricAuth();
      }, 350);
    }
  };

  const triggerBiometricAuth = async () => {
    setError('');
    const res = await authenticateWithBiometrics(
      reason ? `请验证身份以进行【${reason}】` : '验证指纹或面容以解锁保险库'
    );
    if (res.success && res.password) {
      setLoading(true);
      try {
        const ok = await onUnlock(res.password);
        if (ok) {
          setPassword('');
          setError('');
        }
      } finally {
        setLoading(false);
      }
    } else if (res.error && !res.error.includes('取消')) {
      setError(res.error);
    }
  };

  const handleManualBiometricPress = async () => {
    setError('');

    // 1. 检查是否已经绑定了主密码
    let savedPassword: string | null = null;
    try {
      savedPassword = await SecureStore.getItemAsync(BIO_MASTER_KEY);
    } catch {}

    if (savedPassword) {
      // 已经绑定：直接拉起系统生物识别认证并自动解锁！
      await triggerBiometricAuth();
      return;
    }

    // 2. 尚未绑定：先拉起原生指纹/面容进行硬件交互与权限测试
    try {
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: '验证指纹或面容以测试快速解锁',
        cancelLabel: '取消',
        fallbackLabel: '取消',
        disableDeviceFallback: false,
      });

      if (authResult.success) {
        setError('✅ 手机指纹识别成功！请输入一次主密码解锁以完成首次绑定。');
      } else if (authResult.error === 'not_enrolled') {
        setError('系统未检测到录入的指纹，请在手机系统设置中添加指纹');
      } else if (authResult.error === 'not_available') {
        setError('设备无指纹硬件或系统权限受限');
      } else if (authResult.error && !authResult.error.includes('cancel')) {
        setError(`指纹验证失败: ${authResult.error}`);
      }
    } catch (e: any) {
      setError(e.message || '拉起指纹识别失败');
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!password.trim()) {
      setError('请输入主密码');
      return;
    }

    setLoading(true);
    try {
      const cleanPwd = password.trim();
      const ok = await onUnlock(cleanPwd);
      if (ok) {
        // 如果勾选了同时开启生物识别，自动绑定保存到 SecureStore
        if (enableBioAfterUnlock) {
          try {
            await enableBiometricUnlock(cleanPwd);
          } catch {}
        }
        setPassword('');
        setError('');
      } else {
        setError('主密码错误，请重新输入');
      }
    } catch (err: any) {
      setError(err.message || '解锁验证失败');
    } finally {
      setLoading(false);
    }
  };

  const scrollViewRef = useRef<any>(null);
  const { keyboardHeight, isKeyboardVisible, windowHeight, dismissKeyboard } = useKeyboardOffset();

  const maxCardHeight = isKeyboardVisible
    ? Math.max(300, windowHeight - keyboardHeight - 40)
    : Math.min(650, windowHeight * 0.88);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View
          style={[
            styles.overlay,
            isKeyboardVisible && {
              paddingBottom: Platform.OS === 'ios' ? keyboardHeight : Math.min(keyboardHeight, 220),
              justifyContent: 'center',
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.card, { maxHeight: maxCardHeight }]}>
              <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.scrollContent}
              >
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>🔒</Text>
                </View>

          <Text style={styles.title}>
            {hasPasswordSet ? '保险库已锁定' : '尚未设置主密码'}
          </Text>

          <Text style={styles.subtitle}>
            {hasPasswordSet
              ? (reason ? `执行【${reason}】需要验证主密码` : '请输入你的保险库主密码进行本地解密')
              : '你当前还没有设置主密码，请先完成设置以启用安全加密保护。'}
          </Text>

          {error ? (
            <Text
              style={[
                styles.errorText,
                error.startsWith('✅') && styles.successHintText,
              ]}
            >
              {error.startsWith('✅') ? error : `⚠️ ${error}`}
            </Text>
          ) : null}

          {hasPasswordSet ? (
            <>
              {/* 生物识别一键解锁入口 */}
              <TouchableOpacity
                style={[
                  styles.biometricBtn,
                  bioStatus?.isEnabled ? styles.biometricBtnActive : styles.biometricBtnNormal,
                ]}
                onPress={handleManualBiometricPress}
                activeOpacity={0.75}
              >
                <Text style={styles.biometricIcon}>
                  {bioStatus?.biometricType === 'facial' ? '👤' : '👆'}
                </Text>
                <Text style={styles.biometricBtnText}>
                  {bioStatus?.isEnabled
                    ? (bioStatus?.biometricType === 'facial'
                        ? '面容识别快速解锁'
                        : '指纹识别快速解锁')
                    : (bioStatus?.biometricType === 'facial'
                        ? '尝试面容识别解锁'
                        : '尝试指纹识别解锁')}
                </Text>
                {bioStatus?.isEnabled && (
                  <View style={styles.biometricBadge}>
                    <Text style={styles.biometricBadgeText}>免输密码</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>或输入主密码</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="请输入主密码"
                  placeholderTextColor="#A79791"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoFocus={!bioStatus?.isEnabled}
                />
              </View>

              {/* 允许生物识别勾选 */}
              {bioStatus?.hasHardware && (
                <TouchableOpacity
                  style={styles.bioCheckboxRow}
                  onPress={() => setEnableBioAfterUnlock(!enableBioAfterUnlock)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.checkboxIcon, enableBioAfterUnlock && styles.checkboxIconActive]}>
                    {enableBioAfterUnlock ? '☑' : '☐'}
                  </Text>
                  <Text style={styles.bioCheckboxText}>
                    {bioStatus.biometricType === 'facial'
                      ? '开启面容识别快速解锁'
                      : '开启指纹识别快速解锁'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.buttonRow}>
                {onClose && (
                  <TouchableOpacity
                    style={[styles.btn, styles.cancelBtn]}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelBtnText}>取消</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.btn, styles.submitBtn, loading && styles.disabledBtn]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.submitBtnText}>
                    {loading ? '正在验证...' : '立即解锁'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 安全重置入口：打开需文字验证的确认弹窗 */}
              <TouchableOpacity
                style={styles.resetLinkBtn}
                onPress={onOpenResetConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.resetLinkText}>忘记主密码？点击安全重置密码库</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.buttonRow}>
              {onClose && (
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>稍后再说</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.btn, styles.submitBtn]}
                onPress={onOpenSetPassword}
                activeOpacity={0.7}
              >
                <Text style={styles.submitBtnText}>🛡️ 前往设置主密码</Text>
              </TouchableOpacity>
            </View>
          )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 22, 19, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFDFB',
    borderRadius: 28,
    borderWidth: 2.2,
    borderColor: '#2F2321',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#2F2321',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  scrollContent: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE5DC',
    borderWidth: 2,
    borderColor: '#2F2321',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 30,
  },
  title: {
    fontSize: 21,
    fontWeight: '900',
    color: '#2E2220',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#7C6C66',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  errorText: {
    color: '#D84949',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  successHintText: {
    color: '#2E7D32',
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 10,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 12,
  },
  biometricBtnActive: {
    backgroundColor: '#EAF7ED',
    borderColor: '#3DA257',
    shadowColor: '#2F8547',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  biometricBtnNormal: {
    backgroundColor: '#F7EFE9',
    borderColor: '#7F6C66',
  },
  biometricIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  biometricBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#281E1C',
  },
  biometricBadge: {
    marginLeft: 8,
    backgroundColor: '#3DA257',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  biometricBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5D6CF',
  },
  dividerText: {
    fontSize: 12,
    color: '#9C8C85',
    marginHorizontal: 10,
    fontWeight: '600',
  },
  bioCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 14,
    paddingVertical: 2,
  },
  checkboxIcon: {
    fontSize: 16,
    color: '#8A7A74',
    marginRight: 6,
  },
  checkboxIconActive: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  bioCheckboxText: {
    fontSize: 12.5,
    color: '#5C4C46',
    fontWeight: '600',
  },
  input: {
    width: '100%',
    backgroundColor: '#FAF4F0',
    borderWidth: 2,
    borderColor: '#2F2321',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2E2220',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#2F2321',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F5ECE8',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6F5F5A',
  },
  submitBtn: {
    backgroundColor: '#F7B4A6',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2B1E1C',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  resetLinkBtn: {
    marginTop: 14,
    paddingVertical: 4,
  },
  resetLinkText: {
    fontSize: 12,
    color: '#B06856',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
