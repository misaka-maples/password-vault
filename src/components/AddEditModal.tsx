import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { PasswordItem } from '../types';
import { generatePassword } from '../services/crypto';

interface Props {
  visible: boolean;
  initialItem?: PasswordItem | null;
  onClose: () => void;
  onSave: (data: Omit<PasswordItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const AddEditModal: React.FC<Props> = ({ visible, initialItem, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialItem) {
      setTitle(initialItem.title);
      setAccount(initialItem.account);
      setPassword(initialItem.password);
      setNotes(initialItem.notes || '');
    } else {
      setTitle('');
      setAccount('');
      setPassword('');
      setNotes('');
    }
    setError('');
  }, [initialItem, visible]);

  const handleGeneratePassword = () => {
    const randomPwd = generatePassword(16);
    setPassword(randomPwd);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError('请输入平台名称');
      return;
    }
    if (!account.trim()) {
      setError('请输入账号');
      return;
    }
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    onSave({
      title: title.trim(),
      account: account.trim(),
      password: password.trim(),
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.dialogCard}>
          {/* 模态框顶部 */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Text style={styles.headerIconText}>{initialItem ? '✏️' : '📝'}</Text>
              </View>
              <Text style={styles.headerTitle}>
                {initialItem ? '修改密码记录' : '新增密码记录'}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* 平台名称 */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>平台名称</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* 账号 */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>账号</Text>
              <TextInput
                style={styles.input}
                value={account}
                onChangeText={setAccount}
                autoCapitalize="none"
              />
            </View>

            {/* 密码 */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>密码</Text>
                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={handleGeneratePassword}
                  activeOpacity={0.7}
                >
                  <Text style={styles.generateBtnText}>🎲 随机强密码</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
            </View>

            {/* 备注 */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>备注</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
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
              <Text style={styles.saveBtnText}>保存记录</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 22, 19, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#FFFDFB',
    borderRadius: 26,
    borderWidth: 2.2,
    borderColor: '#2F2321',
    padding: 22,
    maxHeight: '85%',
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
    marginBottom: 14,
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
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5E4F4A',
    marginBottom: 5,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  generateBtn: {
    backgroundColor: '#FFF1DE',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#E8B67C',
  },
  generateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A0631F',
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
  notesInput: {
    height: 64,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F4ECE8',
    borderColor: '#302220',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#655550',
  },
  saveBtn: {
    backgroundColor: '#F8B4A6',
    borderColor: '#302220',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2E201E',
  },
});
