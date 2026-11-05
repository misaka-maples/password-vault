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
import { PasswordItem, SubAccount } from '../types';
import { generatePassword } from '../services/crypto';
import { useKeyboardOffset } from '../hooks/useKeyboardOffset';

interface Props {
  visible: boolean;
  initialItem?: PasswordItem | null;
  onClose: () => void;
  onSave: (data: Omit<PasswordItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

interface AccountDraft extends SubAccount {
  showPassword?: boolean;
}

const PRESET_CATEGORIES = ['游戏', '社交', '支付', '工作', '娱乐', '常用'];

export const AddEditModal: React.FC<Props> = ({ visible, initialItem, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [accounts, setAccounts] = useState<AccountDraft[]>([
    { id: 'acc_1', label: '', account: '', password: '', showPassword: false },
  ]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const scrollViewRef = useRef<any>(null);
  const { keyboardHeight, isKeyboardVisible, windowHeight, dismissKeyboard } = useKeyboardOffset();

  const scrollToInput = (yOffset: number) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 120);
  };

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title);
      setCategory(initialItem.category || '');
      setNotes(initialItem.notes || '');

      if (initialItem.accounts && initialItem.accounts.length > 0) {
        setAccounts(
          initialItem.accounts.map((a, idx) => ({
            id: a.id || `acc_${idx}_${Date.now()}`,
            label: a.label || '',
            account: a.account || '',
            password: a.password || '',
            showPassword: false,
          }))
        );
      } else {
        setAccounts([
          {
            id: 'acc_1',
            label: '',
            account: initialItem.account || '',
            password: initialItem.password || '',
            showPassword: false,
          },
        ]);
      }
    } else {
      setTitle('');
      setCategory('');
      setNotes('');
      setAccounts([
        { id: 'acc_1', label: '', account: '', password: '', showPassword: false },
      ]);
    }
    setError('');
  }, [initialItem, visible]);

  // 为指定索引的账号生成随机强密码
  const handleGeneratePasswordFor = (index: number) => {
    const randomPwd = generatePassword(16);
    setAccounts((prev) =>
      prev.map((acc, i) => (i === index ? { ...acc, password: randomPwd, showPassword: true } : acc))
    );
  };

  // 切换指定索引账号的密码明文显示
  const handleTogglePasswordFor = (index: number) => {
    setAccounts((prev) =>
      prev.map((acc, i) => (i === index ? { ...acc, showPassword: !acc.showPassword } : acc))
    );
  };

  // 修改指定索引账号的某个字段
  const handleUpdateAccount = (index: number, field: keyof SubAccount, value: string) => {
    setAccounts((prev) =>
      prev.map((acc, i) => (i === index ? { ...acc, [field]: value } : acc))
    );
  };

  // 新增一组账号
  const handleAddAccount = () => {
    const newId = `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setAccounts((prev) => [
      ...prev,
      { id: newId, label: '', account: '', password: '', showPassword: false },
    ]);
    // 平滑滚动至新加项
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  // 删除一组账号
  const handleRemoveAccount = (index: number) => {
    if (accounts.length <= 1) return;
    setAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError('请输入平台或标签名称');
      return;
    }

    // 校验每个账号组合
    for (let i = 0; i < accounts.length; i++) {
      const acc = accounts[i];
      const seqDesc = accounts.length > 1 ? `第 ${i + 1} 组` : '';
      if (!acc.account.trim()) {
        setError(`请填写${seqDesc}账号`);
        return;
      }
      if (!acc.password.trim()) {
        setError(`请填写${seqDesc}密码`);
        return;
      }
    }

    const cleanAccounts: SubAccount[] = accounts.map((a) => ({
      id: a.id,
      label: a.label?.trim() || undefined,
      account: a.account.trim(),
      password: a.password.trim(),
    }));

    onSave({
      title: title.trim(),
      account: cleanAccounts[0].account,
      password: cleanAccounts[0].password,
      accounts: cleanAccounts,
      category: category.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const maxCardHeight = isKeyboardVisible
    ? Math.max(320, windowHeight - keyboardHeight - 35)
    : Math.min(680, windowHeight * 0.88);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View
          style={[
            styles.overlay,
            isKeyboardVisible && {
              paddingBottom: Platform.OS === 'ios' ? keyboardHeight : Math.min(keyboardHeight, 260),
              justifyContent: 'center',
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <View style={[styles.dialogCard, { maxHeight: maxCardHeight }]}>
              {/* 模态框顶部 */}
              <View style={styles.modalHeader}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    <Text style={styles.headerIconText}>{initialItem ? '✏️' : '📝'}</Text>
                  </View>
                  <Text style={styles.headerTitle}>
                    {initialItem ? '修改记录' : '新增记录'}
                  </Text>
                </View>

                <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

              <ScrollView
                ref={scrollViewRef}
                style={styles.formScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.formScrollContent}
              >
                {/* 平台名称 */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    平台 / 应用名称 <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="如：任天堂、Google、Paypay、微信"
                    placeholderTextColor="#B0A19B"
                    value={title}
                    onChangeText={setTitle}
                    onFocus={() => scrollToInput(0)}
                  />
                </View>

                {/* 分类标签选择 */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>分类标签 (选填)</Text>
                  <View style={styles.categoryChipsRow}>
                    {PRESET_CATEGORIES.map((cat) => {
                      const isSelected = category === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                          onPress={() => setCategory(isSelected ? '' : cat)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              isSelected && styles.categoryChipTextSelected,
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 多组账号区域 */}
                <View style={styles.accountsSection}>
                  <View style={styles.accountsSectionHeader}>
                    <View style={styles.sectionHeaderTitleRow}>
                      <Text style={styles.accountsSectionTitle}>👥 账号与密码列表</Text>
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{accounts.length}组</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.addAccountSmallBtn}
                      onPress={handleAddAccount}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.addAccountSmallBtnText}>+ 添加账号</Text>
                    </TouchableOpacity>
                  </View>

                  {accounts.map((acc, index) => (
                    <View key={acc.id} style={styles.accountCard}>
                      {/* 单项组标题与删除按钮 */}
                      <View style={styles.accountCardHeader}>
                        <View style={styles.accountCardIndexPill}>
                          <Text style={styles.accountCardIndexText}>
                            #{index + 1} {acc.label ? `[${acc.label}]` : '账号'}
                          </Text>
                        </View>

                        {accounts.length > 1 && (
                          <TouchableOpacity
                            onPress={() => handleRemoveAccount(index)}
                            style={styles.deleteAccountBtn}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.deleteAccountBtnText}>🗑️ 删除这组</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* 账号子标签 (如 日服、大号、小号、工作) */}
                      <View style={styles.subInputGroup}>
                        <Text style={styles.subInputLabel}>账号子标签 (选填)</Text>
                        <TextInput
                          style={styles.subInput}
                          placeholder="如：日服 / 港区 / 大号 / 工作邮箱"
                          placeholderTextColor="#B8ABA5"
                          value={acc.label || ''}
                          onChangeText={(val) => handleUpdateAccount(index, 'label', val)}
                          onFocus={() => scrollToInput(120 + index * 220)}
                        />
                      </View>

                      {/* 账号 */}
                      <View style={styles.subInputGroup}>
                        <Text style={styles.subInputLabel}>
                          账号 <Text style={styles.requiredStar}>*</Text>
                        </Text>
                        <TextInput
                          style={styles.subInput}
                          placeholder="手机号、邮箱或用户名"
                          placeholderTextColor="#B8ABA5"
                          value={acc.account}
                          onChangeText={(val) => handleUpdateAccount(index, 'account', val)}
                          autoCapitalize="none"
                          onFocus={() => scrollToInput(170 + index * 220)}
                        />
                      </View>

                      {/* 密码 */}
                      <View style={styles.subInputGroup}>
                        <View style={styles.passwordLabelRow}>
                          <Text style={styles.subInputLabel}>
                            密码 <Text style={styles.requiredStar}>*</Text>
                          </Text>
                          <TouchableOpacity
                            style={styles.generateBtn}
                            onPress={() => handleGeneratePasswordFor(index)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.generateBtnText}>🎲 随机强密码</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.passwordInputWrap}>
                          <TextInput
                            style={[styles.subInput, styles.passwordInput]}
                            placeholder="请输入该账号密码"
                            placeholderTextColor="#B8ABA5"
                            value={acc.password}
                            onChangeText={(val) => handleUpdateAccount(index, 'password', val)}
                            secureTextEntry={!acc.showPassword}
                            autoCapitalize="none"
                            onFocus={() => scrollToInput(220 + index * 220)}
                          />
                          <TouchableOpacity
                            style={styles.eyeBtn}
                            onPress={() => handleTogglePasswordFor(index)}
                            activeOpacity={0.6}
                          >
                            <Text style={styles.eyeBtnText}>
                              {acc.showPassword ? '👁️' : '🙈'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* 底部新增账号按钮 */}
                  <TouchableOpacity
                    style={styles.addMoreBtn}
                    onPress={handleAddAccount}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.addMoreBtnText}>➕ 添加多一组账号密码</Text>
                  </TouchableOpacity>
                </View>

                {/* 备注 */}
                <View style={[styles.inputGroup, styles.notesGroup]}>
                  <Text style={styles.inputLabel}>备注信息 (选填)</Text>
                  <TextInput
                    style={[styles.input, styles.notesInput]}
                    placeholder="输入安全提示、密保问题或备用信息"
                    placeholderTextColor="#B0A19B"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    onFocus={() => scrollToInput(9999)}
                  />
                </View>
              </ScrollView>

              {/* 底部保存与取消 */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>取消</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.saveBtn]}
                  onPress={handleSave}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveBtnText}>
                    {initialItem ? '保存修改' : '确认添加'}
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
    backgroundColor: 'rgba(32, 22, 19, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 410,
    backgroundColor: '#FFFDFB',
    borderRadius: 26,
    borderWidth: 2.2,
    borderColor: '#2F2321',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    shadowColor: '#2F2321',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFE5DC',
    borderWidth: 1.5,
    borderColor: '#2F2321',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerIconText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#2B201E',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5ECE8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#2D201E',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4A3B37',
  },
  errorText: {
    color: '#D84949',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '700',
  },
  formScroll: {
    marginBottom: 10,
  },
  formScrollContent: {
    paddingBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#4C3D38',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#D84949',
    fontWeight: '900',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.8,
    borderColor: '#2F2321',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#2B201E',
    fontWeight: '600',
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  categoryChip: {
    backgroundColor: '#F7EFEA',
    borderWidth: 1.4,
    borderColor: '#D8C6BD',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  categoryChipSelected: {
    backgroundColor: '#FF6B57',
    borderColor: '#2F2321',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B5852',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  accountsSection: {
    marginTop: 6,
    marginBottom: 10,
  },
  accountsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountsSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#362825',
  },
  countBadge: {
    backgroundColor: '#FFE6DF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F2A799',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#C04533',
  },
  addAccountSmallBtn: {
    backgroundColor: '#FFEBE5',
    borderWidth: 1.4,
    borderColor: '#2F2321',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  addAccountSmallBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#342320',
  },
  accountCard: {
    backgroundColor: '#FAF5F2',
    borderWidth: 1.8,
    borderColor: '#2F2321',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  accountCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  accountCardIndexPill: {
    backgroundColor: '#FFE6DC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8A597',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  accountCardIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#84382B',
  },
  deleteAccountBtn: {
    backgroundColor: '#FFEAE8',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deleteAccountBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D84949',
  },
  subInputGroup: {
    marginBottom: 8,
  },
  subInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#63534D',
    marginBottom: 4,
  },
  subInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#4A3B37',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#2B201E',
    fontWeight: '600',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  generateBtn: {
    backgroundColor: '#FFF0DE',
    borderWidth: 1,
    borderColor: '#E8B67D',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  generateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BF7220',
  },
  passwordInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeBtn: {
    position: 'absolute',
    right: 8,
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeBtnText: {
    fontSize: 15,
  },
  addMoreBtn: {
    backgroundColor: '#FFF5F2',
    borderWidth: 1.6,
    borderColor: '#E5A599',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  addMoreBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B64E3E',
  },
  notesGroup: {
    marginTop: 4,
  },
  notesInput: {
    height: 64,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2F2321',
  },
  cancelBtn: {
    backgroundColor: '#F3E9E5',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5E4F4A',
  },
  saveBtn: {
    backgroundColor: '#FF6B57',
    shadowColor: '#2F2321',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
