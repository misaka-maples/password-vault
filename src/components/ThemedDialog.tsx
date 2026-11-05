import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

export type DialogType = 'primary' | 'danger' | 'warning' | 'info' | 'success';

export interface ThemedDialogOptions {
  title: string;
  message: string;
  icon?: string;
  iconBg?: string;
  confirmText?: string;
  cancelText?: string;
  confirmType?: DialogType;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface Props {
  visible: boolean;
  options: ThemedDialogOptions | null;
  onClose: () => void;
}

export const ThemedDialog: React.FC<Props> = ({ visible, options, onClose }) => {
  const [loading, setLoading] = useState(false);

  if (!options) return null;

  const {
    title,
    message,
    icon,
    iconBg,
    confirmText = '确定',
    cancelText,
    confirmType = 'primary',
    onConfirm,
    onCancel,
  } = options;

  const isConfirmDialog = Boolean(cancelText);

  // 默认图标解析
  const getIcon = () => {
    if (icon) return icon;
    switch (confirmType) {
      case 'danger':
        return '⚠️';
      case 'warning':
        return '💡';
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      default:
        return '💬';
    }
  };

  // 默认图标背景解析
  const getIconBg = () => {
    if (iconBg) return iconBg;
    switch (confirmType) {
      case 'danger':
        return '#FFEBEA';
      case 'warning':
        return '#FFF8E1';
      case 'success':
        return '#E8F5E9';
      default:
        return '#FFF0E8';
    }
  };

  const handleConfirm = async () => {
    if (onConfirm) {
      setLoading(true);
      try {
        await onConfirm();
        onClose();
      } catch {
        // 外部处理异常
      } finally {
        setLoading(false);
      }
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (loading) return;
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 顶部卡通圆形图标徽章 */}
          <View style={[styles.iconCircle, { backgroundColor: getIconBg() }]}>
            <Text style={styles.iconText}>{getIcon()}</Text>
          </View>

          {/* 标题 */}
          <Text style={styles.title}>{title}</Text>

          {/* 内容说明 */}
          <Text style={styles.message}>{message}</Text>

          {/* 按钮行 */}
          <View style={styles.buttonRow}>
            {isConfirmDialog && (
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn]}
                onPress={handleCancel}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.btn,
                confirmType === 'danger' ? styles.dangerBtn : styles.primaryBtn,
                !isConfirmDialog && styles.singleBtn,
                loading && styles.disabledBtn,
              ]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
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
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.2,
    borderColor: '#2D3142',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconText: {
    fontSize: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#2D3142',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6F5E59',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 6,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 2.2,
    borderColor: '#2D3142',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleBtn: {
    flex: 1,
  },
  cancelBtn: {
    backgroundColor: '#F5ECE7',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#6F5E59',
  },
  primaryBtn: {
    backgroundColor: '#FF7A59',
  },
  dangerBtn: {
    backgroundColor: '#FF5C5C',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
