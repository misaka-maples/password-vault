import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { PasswordItem, SubAccount } from '../types';
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
  // 记录每个子账号的密码明文显示状态：{ [accountId]: boolean }
  const [revealedMap, setRevealedMap] = useState<Record<string, boolean>>({});

  // 规格化账号列表：兼容历史单账号与新多账号格式
  const accounts: SubAccount[] = useMemo(() => {
    if (item.accounts && item.accounts.length > 0) {
      return item.accounts;
    }
    return [
      {
        id: 'acc_legacy',
        label: '',
        account: item.account || '',
        password: item.password || '',
      },
    ];
  }, [item]);

  const handleCopyAccount = async (acc: SubAccount) => {
    if (isLocked) {
      onShowToast('🔒 保险库已锁定，请先解锁以复制账号');
      onRequireUnlock('复制账号');
      return;
    }
    await Clipboard.setStringAsync(acc.account);
    const tagDesc = acc.label ? `[${acc.label}] ` : '';
    onShowToast(`已复制 ${item.title} ${tagDesc}账号`);
  };

  const handleCopyPassword = async (acc: SubAccount) => {
    if (isLocked) {
      onShowToast('🔒 保险库已锁定，请先解锁以复制密码');
      onRequireUnlock('复制密码');
      return;
    }
    await Clipboard.setStringAsync(acc.password);
    const tagDesc = acc.label ? `[${acc.label}] ` : '';
    onShowToast(`已复制 ${item.title} ${tagDesc}密码`);
  };

  const handleTogglePassword = (accId: string) => {
    if (isLocked) {
      onShowToast('🔒 保险库已锁定，请先解锁以查看密码');
      onRequireUnlock('查看密码');
      return;
    }
    setRevealedMap((prev) => ({
      ...prev,
      [accId]: !prev[accId],
    }));
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
      message: `确定要删除 "${item.title}" 下的全部 (${accounts.length}组) 密码记录吗？此操作不可逆。`,
      icon: '🗑️',
      iconBg: '#FFEBEA',
      cancelText: '取消',
      confirmText: '确认删除',
      confirmType: 'danger',
      onConfirm: () => onDelete(item.id, item.title),
    });
  };

  // 渲染图标
  const renderIcon = () => {
    const isPayPay = item.title.toLowerCase().includes('pay');
    const isNintendo = item.title.includes('任天堂');
    const bgColor =
      item.iconColor || (isPayPay ? '#FF6B57' : isNintendo ? '#F35343' : '#F6A843');

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
          <View style={styles.titleTextContainer}>
            <View style={styles.titleWithBadge}>
              <Text style={styles.titleText} numberOfLines={1}>
                {item.title}
              </Text>
              {item.category ? (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category}</Text>
                </View>
              ) : null}
            </View>

            {accounts.length > 1 && (
              <View style={styles.multiAccountBadge}>
                <Text style={styles.multiAccountBadgeText}>
                  👥 共 {accounts.length} 组账号
                </Text>
              </View>
            )}
          </View>
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

      {/* 账号列表渲染（支持多组账号） */}
      {accounts.map((acc, index) => {
        const isRevealed = Boolean(revealedMap[acc.id]);
        const isMulti = accounts.length > 1;

        return (
          <View
            key={acc.id || `acc_${index}`}
            style={[styles.accountBlock, index > 0 && styles.accountBlockDivider]}
          >
            {/* 多账号时显示子标签头 */}
            {isMulti && (
              <View style={styles.subAccountHeader}>
                <View style={styles.subAccountTag}>
                  <Text style={styles.subAccountTagIcon}>🏷️</Text>
                  <Text style={styles.subAccountTagText}>
                    {acc.label?.trim() ? acc.label.trim() : `账号 ${index + 1}`}
                  </Text>
                </View>
                <Text style={styles.accountIndexHint}>#{index + 1}</Text>
              </View>
            )}

            {/* 账户行 */}
            <TouchableOpacity
              style={styles.fieldRow}
              onPress={() => handleCopyAccount(acc)}
              activeOpacity={0.6}
            >
              <Text style={styles.fieldLabel}>
                {isMulti && acc.label ? acc.label : '账户'}
              </Text>
              <View style={styles.fieldValueContainer}>
                <Text style={styles.accountText}>{maskAccount(acc.account)}</Text>
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
                  onPress={() => handleTogglePassword(acc.id)}
                  activeOpacity={0.6}
                  style={styles.passwordTextWrap}
                >
                  {!isLocked && isRevealed ? (
                    <Text style={styles.revealedPasswordText}>{acc.password}</Text>
                  ) : (
                    <Text style={styles.maskedPasswordDots}>••••••••</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.copyPassBtn, isLocked && styles.copyPassBtnLocked]}
                  onPress={() => handleCopyPassword(acc)}
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
      })}

      {/* 备注信息（若有） */}
      {item.notes ? (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>📝 备注：</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      ) : null}
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
    marginBottom: 10,
    paddingBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  titleTextContainer: {
    flex: 1,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  titleText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#2B201E',
  },
  categoryBadge: {
    backgroundColor: '#FFEFEA',
    borderWidth: 1,
    borderColor: '#F3B4A6',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#D45D4B',
  },
  multiAccountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF5F0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginTop: 3,
  },
  multiAccountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C76A58',
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
  accountBlock: {
    paddingVertical: 4,
  },
  accountBlockDivider: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1.2,
    borderTopColor: '#F3E8E3',
    borderStyle: 'dashed',
  },
  subAccountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  subAccountTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0EA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3BCB0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 3,
  },
  subAccountTagIcon: {
    fontSize: 11,
  },
  subAccountTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#84382B',
  },
  accountIndexHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BDB0AB',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  lastRow: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  fieldLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#7C6E68',
  },
  fieldValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountText: {
    fontSize: 15.5,
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
    fontSize: 19,
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
  notesContainer: {
    flexDirection: 'row',
    backgroundColor: '#FBF5F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE0D8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A766F',
  },
  notesText: {
    fontSize: 12,
    color: '#5C4E49',
    flex: 1,
  },
});
