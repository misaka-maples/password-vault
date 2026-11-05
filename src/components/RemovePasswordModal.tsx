import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
} from 'react-native';
import { useKeyboardOffset } from '../hooks/useKeyboardOffset';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirmRemove: (password: string) => Promise<boolean>;
}

export const RemovePasswordModal: React.FC<Props> = ({
  visible,
  onClose,
  onConfirmRemove,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setError('');
    if (!password.trim()) {
      setError('请输入当前主密码');
      return;
    }

    setLoading(true);
    try {
      const ok = await onConfirmRemove(password.trim());
      if (ok) {
        setPassword('');
        setError('');
        onClose();
      } else {
        setError('主密码错误，无法解除');
      }
    } catch (err: any) {
      setError(err.message || '解除失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    onClose();
  };

  const { keyboardHeight, isKeyboardVisible, windowHeight, dismissKeyboard } = useKeyboardOffset();

  const maxCardHeight = isKeyboardVisible
    ? Math.max(300, windowHeight - keyboardHeight - 40)
    : Math.min(650, windowHeight * 0.88);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleCancel}>
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
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>🔓</Text>
              </View>

              <Text style={styles.title}>解除主密码保护</Text>

              <Text style={styles.subtitle}>
                解除后将<Text style={styles.highlightText}>保留当前所有密码记录</Text>
                ，切换为免密查看模式。如需操作，请输入当前主密码进行身份验证：
              </Text>

              {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="请输入当前主密码"
                  placeholderTextColor="#A79791"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoFocus
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>取消</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.submitBtn, loading && styles.disabledBtn]}
                  onPress={handleConfirm}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.submitBtnText}>
                    {loading ? '正在验证...' : '解除主密码'}
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
    backgroundColor: 'rgba(38, 26, 23, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 2.2,
    borderColor: '#2D1F1C',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#2D1F1C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF0E5',
    borderWidth: 2,
    borderColor: '#E6A88A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 21,
    fontWeight: '900',
    color: '#2E201D',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13.5,
    color: '#766762',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  highlightText: {
    fontWeight: '800',
    color: '#388E3C',
  },
  errorText: {
    fontSize: 13,
    color: '#E05345',
    fontWeight: '700',
    marginBottom: 10,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 18,
  },
  input: {
    width: '100%',
    backgroundColor: '#FAF5F2',
    borderWidth: 2,
    borderColor: '#2F2220',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2F2220',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#2D1F1C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3EAE4',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6F5F58',
  },
  submitBtn: {
    backgroundColor: '#F6B4A6',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2B1E1C',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
