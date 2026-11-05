import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { PasswordItem } from '../types';
import { maskAccount } from '../services/crypto';
import { useThemedDialog } from '../context/ThemedDialogContext';

interface Props {
  item: PasswordItem;
  isLocked: boolean;
  onRequireUnlock: (actionDesc?: string) => void;
  onEdit: (item: PasswordItem) => void;
  onDelete: (id: string, title: string) => void;
  onShowToast: (msg: string) => void;
}

export const PasswordCard: React.FC<Props> = ({
  item,
  isLocked,
  onRequireUnlock,
  onEdit,
  onDelete,
  onShowToast,
}) => {
  const { showDialog } = useThemedDialog();
  const [showPassword, setShowPassword] = useState(false);

  const handleCopyAccount = async () => {
    if (isLocked) {
      onShowToast('🔒 保险库已锁定，请先解锁以复制账号');
      onRequireUnlock('复制账号');
      return;
    }
    await Clipboard.setStringAsync(item.account);
    onShowToast(`已复制 ${item.title} 账号`);
  };

  const handleCopyPassword = async () => {
    if (isLocked) {
      onShowToast('🔒 保险库已锁定，请先解锁以复制密码');
      onRequireUnlock('复制密码');
      return;
    }
    await Clipboard.setStringAsync(item.password);
    onShowToast(`已复制 ${item.title} 密码`);
  };

  const handleTogglePassword = () => {
    if (isLocked) {
      onShowToast('🔒 保险库已锁定，请先解锁以查看密码');
      onRequireUnlock('查看密码');
      return;
    }
    setShowPassword(!showPassword);
  };

  const handleEditPress = () => {
    if (isLocked) {
      onShowToast('🔒 保险库已锁定，请先解锁以修改记录');
      onRequireUnlock('修改记录');
      return;
    }
    onEdit(item);
  };

  const handleDeletePress = () => {
    if (isLocked) {
      onShowToast('🔒 保险库已锁定，请先解锁以删除记录');
      onRequireUnlock('删除记录');
      return;
    }
    showDialog({
      title: '确认删除',
      message: `确定要删除平台 "${item.title}" 的密码记录吗？此操作不可逆。`,
      icon: '🗑️',
      iconBg: '#FFEBEA',
      cancelText: '取消',
      confirmText: '确认删除',
      confirmType: 'danger',
      onConfirm: () => onDelete(item.id, item.title),
    });
  };

  // 渲染图标：支持专属图标首字渲染或地球网格图标
  const renderIcon = () => {
    const isPayPay = item.title.toLowerCase().includes('pay');
    const isNintendo = item.title.includes('任天堂');
    const isWeb = !isPayPay && !isNintendo;

    const bgColor = item.iconColor || (isPayPay ? '#FF6B57' : isNintendo ? '#F35343' : '#F6A843');

    return (
      <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
        {isPayPay ? (
          <Text style={styles.iconLetter}>P</Text>
        ) : (
          <Text style={styles.iconEmoji}>{isNintendo ? '🎮' : '🌐'}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* 顶部标题与操作栏 */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          {renderIcon()}
          <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.btnPill, styles.btnEdit, isLocked && styles.btnPillLocked]}
            onPress={handleEditPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.btnEditText, isLocked && styles.btnLockedText]}>
              {isLocked ? '🔒 修改' : '修改'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnPill, styles.btnDelete, isLocked && styles.btnPillLocked]}
            onPress={handleDeletePress}
            activeOpacity={0.7}
          >
            <Text style={[styles.btnDeleteText, isLocked && styles.btnLockedText]}>
              {isLocked ? '🔒 删除' : '删除'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 账户行 */}
      <TouchableOpacity
        style={styles.fieldRow}
        onPress={handleCopyAccount}
        activeOpacity={0.6}
      >
        <Text style={styles.fieldLabel}>账户</Text>
        <View style={styles.fieldValueContainer}>
          <Text style={styles.accountText}>{maskAccount(item.account)}</Text>
          <Text style={[styles.hintTag, isLocked && styles.hintTagLocked]}>
            {isLocked ? '🔒 复制' : '复制'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* 密码行 */}
      <View style={[styles.fieldRow, styles.lastRow]}>
        <Text style={styles.fieldLabel}>密码</Text>
        <View style={styles.passwordContainer}>
          <TouchableOpacity
            onPress={handleTogglePassword}
            activeOpacity={0.6}
            style={styles.passwordTextWrap}
          >
            {!isLocked && showPassword ? (
              <Text style={styles.revealedPasswordText}>{item.password}</Text>
            ) : (
              <Text style={styles.maskedPasswordDots}>••••••••</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.copyPassBtn, isLocked && styles.copyPassBtnLocked]}
            onPress={handleCopyPassword}
            activeOpacity={0.6}
          >
            <Text style={[styles.copyPassText, isLocked && styles.copyPassTextLocked]}>
              {isLocked ? '🔒 复制' : '复制'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#2F2321',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    shadowColor: '#2F2321',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#2F2321',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconLetter: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  iconEmoji: {
    fontSize: 18,
  },
  titleText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#2B201E',
    flexShrink: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnPill: {
    paddingHorizontal: 14,
    paddingVertical: 4.5,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  btnEdit: {
    backgroundColor: '#F8F3F0',
    borderColor: '#8A7A74',
  },
  btnEditText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#705F59',
  },
  btnDelete: {
    backgroundColor: '#FDF0ED',
    borderColor: '#E8A3A0',
  },
  btnDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D26763',
  },
  btnPillLocked: {
    opacity: 0.75,
    backgroundColor: '#F3EBE6',
    borderColor: '#BBAAA2',
  },
  btnLockedText: {
    color: '#7C6C66',
    fontSize: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  lastRow: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C6E68',
  },
  fieldValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#342522',
    letterSpacing: 0.5,
  },
  hintTag: {
    fontSize: 11,
    color: '#A5928B',
    marginLeft: 8,
    backgroundColor: '#F6EFEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hintTagLocked: {
    backgroundColor: '#EDE4DF',
    color: '#8C7C76',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordTextWrap: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  maskedPasswordDots: {
    fontSize: 20,
    fontWeight: '900',
    color: '#50413E',
    letterSpacing: 2,
  },
  revealedPasswordText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E05A47',
    maxWidth: 180,
  },
  copyPassBtn: {
    backgroundColor: '#FFF4E8',
    borderColor: '#E8B67D',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  copyPassBtnLocked: {
    backgroundColor: '#F3ECE8',
    borderColor: '#C7B9B3',
  },
  copyPassText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BF7220',
  },
  copyPassTextLocked: {
    color: '#8C7C76',
  },
});
