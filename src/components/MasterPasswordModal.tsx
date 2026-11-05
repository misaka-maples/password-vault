import React, { useState, useRef } from 'react';
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
import { useKeyboardOffset } from '../hooks/useKeyboardOffset';

interface Props {
  visible: boolean;
  isChangeMode: boolean; // false: 首次设置, true: 修改密码
  onClose: () => void;
  onSubmit: (newPassword: string, oldPassword?: string) => Promise<boolean>;
}

export const MasterPasswordModal: React.FC<Props> = ({
  visible,
  isChangeMode,
  onClose,
  onSubmit,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (isChangeMode && !oldPassword.trim()) {
      setError('请输入原主密码');
      return;
    }

    if (!newPassword.trim()) {
      setError('请输入新主密码');
      return;
    }

    if (newPassword.length < 6) {
      setError('主密码长度不能少于 6 位');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新主密码不一致');
      return;
    }

    setLoading(true);
    try {
      const ok = await onSubmit(newPassword, isChangeMode ? oldPassword : undefined);
      if (ok) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const scrollViewRef = useRef<any>(null);
  const { keyboardHeight, isKeyboardVisible, windowHeight, dismissKeyboard } = useKeyboardOffset();

  const scrollToInput = (yOffset: number) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 120);
  };

  const maxCardHeight = isKeyboardVisible
    ? Math.max(300, windowHeight - keyboardHeight - 40)
    : Math.min(640, windowHeight * 0.85);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View
          style={[
            styles.overlay,
            isKeyboardVisible && {
              paddingBottom: Platform.OS === 'ios' ? keyboardHeight : Math.min(keyboardHeight, 240),
              justifyContent: 'center',
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.dialogCard, { maxHeight: maxCardHeight }]}>
              <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.scrollContent}
              >
                {/* 顶部图标与标题 */}
                <View style={styles.iconCircle}>
                  <Text style={styles.iconText}>🔐</Text>
                </View>

                <Text style={styles.title}>
                  {isChangeMode ? '修改保险库主密码' : '设置保险库主密码'}
                </Text>

                <Text style={styles.subtitle}>
                  {isChangeMode
                    ? '修改主密码将使用新密码对本地所有记录重新进行 AES-256 加密。'
                    : '主密码是本地 AES-256 端到端加密的唯一钥匙，不上传云端，请务必牢记！'}
                </Text>

                {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

                {/* 原密码 (修改模式专属) */}
                {isChangeMode && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>原主密码</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="请输入现在的旧主密码"
                      placeholderTextColor="#A99B95"
                      secureTextEntry
                      value={oldPassword}
                      onChangeText={setOldPassword}
                      onFocus={() => scrollToInput(60)}
                    />
                  </View>
                )}

                {/* 新主密码 */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {isChangeMode ? '新主密码' : '设置主密码 (至少6位)'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="请输入主密码"
                    placeholderTextColor="#A99B95"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                    onFocus={() => scrollToInput(isChangeMode ? 140 : 80)}
                  />
                </View>

                {/* 确认新主密码 */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>确认新主密码</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="请再次输入新主密码"
                    placeholderTextColor="#A99B95"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => scrollToInput(isChangeMode ? 220 : 160)}
                  />
                </View>
              </ScrollView>

              {/* 操作按钮 */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>取消</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.confirmBtn, loading && styles.disabledBtn]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmBtnText}>
                    {loading ? '处理中...' : isChangeMode ? '确认修改' : '确认设置'}
                  </Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(34, 23, 20, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFDFB',
    borderRadius: 26,
    borderWidth: 2.2,
    borderColor: '#2F2321',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
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
    paddingBottom: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE9E3',
    borderWidth: 2,
    borderColor: '#2F2321',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2B201E',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#7D6D67',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
    paddingHorizontal: 6,
  },
  errorText: {
    color: '#D84949',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    alignSelf: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#65544F',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#FAF4F0',
    borderWidth: 1.8,
    borderColor: '#302220',
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#2E2220',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2F2321',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F4ECE8',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6A5B56',
  },
  confirmBtn: {
    backgroundColor: '#F8B4A6',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2E201E',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
