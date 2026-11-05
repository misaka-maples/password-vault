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
  onConfirmReset: () => Promise<void>;
}

export const ResetConfirmModal: React.FC<Props> = ({
  visible,
  onClose,
  onConfirmReset,
}) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const CONFIRM_KEYWORD = '确认重置';
  const isMatched = inputText.trim() === CONFIRM_KEYWORD;

  const handleReset = async () => {
    if (!isMatched) return;

    setLoading(true);
    try {
      await onConfirmReset();
      setInputText('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setInputText('');
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
              <View style={styles.warningIconCircle}>
                <Text style={styles.warningIconText}>⚠️</Text>
              </View>

              <Text style={styles.title}>高风险操作：重置密码库</Text>

              <Text style={styles.warningDesc}>
                重置将<Text style={styles.boldRed}>彻底抹除</Text>本地当前未备份的所有密码记录与主密码，此操作<Text style={styles.boldRed}>无法撤回</Text>！
              </Text>

              <View style={styles.confirmBox}>
                <Text style={styles.confirmTip}>
                  为防止误触或未经授权的重置，请在下方输入框中完整输入：
                </Text>
                <Text style={styles.keywordHighlight}>确认重置</Text>

                <TextInput
                  style={[styles.input, isMatched && styles.inputMatched]}
                  placeholder="请输入“确认重置”四个字"
                  placeholderTextColor="#B0A09B"
                  value={inputText}
                  onChangeText={setInputText}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>取消放弃</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.btn,
                    styles.resetBtn,
                    !isMatched && styles.disabledBtn,
                  ]}
                  onPress={handleReset}
                  disabled={!isMatched || loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resetBtnText}>
                    {loading ? '正在重置...' : '确认清空重置'}
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
    backgroundColor: 'rgba(32, 20, 18, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
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
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  warningIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFEBEE',
    borderWidth: 2,
    borderColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  warningIconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#D32F2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  warningDesc: {
    fontSize: 13,
    color: '#6F5E59',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  boldRed: {
    color: '#D32F2F',
    fontWeight: '800',
  },
  confirmBox: {
    width: '100%',
    backgroundColor: '#FAF5F2',
    borderWidth: 1.5,
    borderColor: '#E6D3CC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  confirmTip: {
    fontSize: 12,
    color: '#7D6D67',
    textAlign: 'center',
    marginBottom: 6,
  },
  keywordHighlight: {
    fontSize: 18,
    fontWeight: '900',
    color: '#D32F2F',
    letterSpacing: 2,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#302220',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#2E2220',
    textAlign: 'center',
  },
  inputMatched: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF8F8',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
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
    backgroundColor: '#F5ECE8',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#655550',
  },
  resetBtn: {
    backgroundColor: '#FF6B6B',
    borderColor: '#9E2424',
  },
  resetBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  disabledBtn: {
    backgroundColor: '#E0D6D2',
    borderColor: '#B8A8A2',
    opacity: 0.5,
  },
});
