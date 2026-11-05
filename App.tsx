import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedDialogProvider, useThemedDialog } from './src/context/ThemedDialogContext';
import { PasswordItem } from './src/types';
import {
  hasMasterPassword,
  loadLocalVault,
  saveLocalVault,
  setMasterPassword,
  verifyMasterPassword,
  resetLocalVault,
  removeMasterPassword,
} from './src/services/storage';
import {
  disableBiometricUnlock,
  updateBiometricPasswordIfEnabled,
} from './src/services/biometrics';
import { VaultScreen } from './src/screens/VaultScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { UnlockModal } from './src/components/UnlockModal';
import { MasterPasswordModal } from './src/components/MasterPasswordModal';
import { ResetConfirmModal } from './src/components/ResetConfirmModal';
import { Toast } from './src/components/Toast';

function VaultAppContent() {
  const { showDialog } = useThemedDialog();
  const insets = useSafeAreaInsets();
  const bottomBarPaddingBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 18 : 14) + 10;

  const [activeTab, setActiveTab] = useState<'vault' | 'profile'>('vault');
  const [items, setItems] = useState<PasswordItem[]>([]);
  const [hasPwd, setHasPwd] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [masterKey, setMasterKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [unlockReason, setUnlockReason] = useState<string>('');

  // 弹窗状态控制
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [masterModalVisible, setMasterModalVisible] = useState(false);
  const [masterModalIsChange, setMasterModalIsChange] = useState(false);
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      const has = await hasMasterPassword();
      setHasPwd(has);

      if (has) {
        // 已有主密码：默认处于锁定状态，需输入密码解锁
        setIsLocked(true);
        setUnlockModalVisible(true);
      } else {
        // 尚未设置主密码：直接加载初始演示数据，不锁死用户
        setIsLocked(false);
        setUnlockModalVisible(false);
        const loaded = await loadLocalVault(null);
        setItems(loaded);
      }
    } catch (e) {
      console.error('初始化失败', e);
    }
  };

  // 解锁逻辑
  const handleUnlock = async (password: string): Promise<boolean> => {
    const ok = await verifyMasterPassword(password);
    if (ok) {
      setMasterKey(password);
      setIsLocked(false);
      setUnlockModalVisible(false);
      setUnlockReason('');
      const loaded = await loadLocalVault(password);
      setItems(loaded);
      setToastMessage('已成功解锁保险库');
      return true;
    }
    return false;
  };

  // 请求解锁拦截器
  const handleRequireUnlock = (reason: string = '') => {
    setUnlockReason(reason);
    setUnlockModalVisible(true);
  };

  // 锁定 / 解锁按钮点击处理
  const handleLockPress = () => {
    if (!hasPwd) {
      showDialog({
        title: '安全提示',
        message: '你当前尚未设置主密码。设置主密码后方可开启安全锁定与 AES-256 加密保护。',
        icon: '🛡️',
        iconBg: '#FFF9E6',
        cancelText: '取消',
        confirmText: '立即设置',
        confirmType: 'primary',
        onConfirm: () => handleOpenSetPassword(),
      });
      return;
    }

    if (isLocked) {
      // 当前已锁定，打开输入密码窗口
      setUnlockReason('');
      setUnlockModalVisible(true);
    } else {
      // 当前未锁定，执行锁定
      setIsLocked(true);
      setMasterKey(null);
      setToastMessage('已锁定保险库');
    }
  };

  // 打开设置新密码弹窗
  const handleOpenSetPassword = () => {
    setMasterModalIsChange(false);
    setMasterModalVisible(true);
  };

  // 打开修改密码弹窗
  const handleOpenChangePassword = () => {
    setMasterModalIsChange(true);
    setMasterModalVisible(true);
  };

  // 提交主密码 (新建或修改)
  const handleSubmitMasterPassword = async (
    newPassword: string,
    oldPassword?: string
  ): Promise<boolean> => {
    await setMasterPassword(newPassword, items, oldPassword);
    await updateBiometricPasswordIfEnabled(newPassword);
    setHasPwd(true);
    setMasterKey(newPassword);
    setIsLocked(false);
    setUnlockModalVisible(false);
    setToastMessage(masterModalIsChange ? '主密码修改成功' : '主密码设置成功，已启用加密！');
    return true;
  };

  // 重置保险库 (防锁死)
  const handleResetVault = async () => {
    await resetLocalVault();
    await disableBiometricUnlock();
    setHasPwd(false);
    setMasterKey(null);
    setIsLocked(false);
    setUnlockModalVisible(false);
    setItems([]);
    setToastMessage('保险库已重置');
  };

  // 解除主密码保护（保留全部数据）
  const handleRemoveMasterPassword = async (currentPassword: string): Promise<boolean> => {
    await removeMasterPassword(currentPassword, items);
    await disableBiometricUnlock();
    setHasPwd(false);
    setMasterKey(null);
    setIsLocked(false);
    return true;
  };

  // 新增 / 修改一条密码记录
  const handleSaveItem = async (
    data: Omit<PasswordItem, 'id' | 'createdAt' | 'updatedAt'>,
    editId?: string
  ) => {
    if (isLocked || (hasPwd && !masterKey)) {
      handleRequireUnlock('保存记录');
      setToastMessage('🔒 保险库已锁定，请先解锁');
      return;
    }

    let updatedList: PasswordItem[];
    if (editId) {
      updatedList = items.map((it) =>
        it.id === editId ? { ...it, ...data, updatedAt: Date.now() } : it
      );
    } else {
      const newItem: PasswordItem = {
        id: 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      updatedList = [newItem, ...items];
    }

    setItems(updatedList);
    await saveLocalVault(updatedList, masterKey);
  };

  // 删除一条密码记录
  const handleDeleteItem = async (id: string, title: string) => {
    if (isLocked || (hasPwd && !masterKey)) {
      handleRequireUnlock('删除记录');
      setToastMessage('🔒 保险库已锁定，请先解锁');
      return;
    }

    const updatedList = items.filter((it) => it.id !== id);
    setItems(updatedList);
    await saveLocalVault(updatedList, masterKey);
    setToastMessage(`已删除 ${title}`);
  };

  // 从云端同步后刷新列表
  const handleRefreshVault = async () => {
    try {
      const loaded = await loadLocalVault(masterKey);
      setItems(loaded);
    } catch {
      // 如果已锁定需要重新解锁加载
      setIsLocked(true);
      setUnlockModalVisible(true);
    }
  };

  return (
    <LinearGradient
      colors={['#FFF5EE', '#FEEBED', '#FFF0F3']}
      style={styles.gradientContainer}
    >
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        {/* 顶部悬浮 Toast 消息 */}
        <Toast message={toastMessage} onHide={() => setToastMessage(null)} />

        {/* 主内容区域 */}
        <View style={styles.contentContainer}>
          <View
            style={[
              styles.screenTabWrapper,
              activeTab !== 'vault' && styles.screenTabHidden,
            ]}
          >
            <VaultScreen
              items={items}
              isLocked={isLocked}
              hasMasterPassword={hasPwd}
              onLockPress={handleLockPress}
              onRequireUnlock={handleRequireUnlock}
              onOpenSetPassword={handleOpenSetPassword}
              onSaveItem={handleSaveItem}
              onDeleteItem={handleDeleteItem}
              onShowToast={(msg) => setToastMessage(msg)}
            />
          </View>

          <View
            style={[
              styles.screenTabWrapper,
              activeTab !== 'profile' && styles.screenTabHidden,
            ]}
          >
            <ProfileScreen
              hasMasterPassword={hasPwd}
              masterKey={masterKey}
              onRefreshVault={handleRefreshVault}
              onLockVault={handleLockPress}
              onOpenSetPassword={handleOpenSetPassword}
              onOpenChangePassword={handleOpenChangePassword}
              onRemoveMasterPassword={handleRemoveMasterPassword}
              onResetVault={handleResetVault}
              onShowToast={(msg) => setToastMessage(msg)}
            />
          </View>
        </View>

        {/* 底部导航栏 (高还原截图双标签导航，智能安全垫高) */}
        <View style={[styles.bottomTabBar, { paddingBottom: bottomBarPaddingBottom }]}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'vault' && styles.tabItemActivePill,
            ]}
            onPress={() => setActiveTab('vault')}
            activeOpacity={0.8}
          >
            <Text style={styles.tabIcon}>🔒</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'vault' && styles.tabLabelActive,
              ]}
            >
              密码
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'profile' && styles.tabItemActivePill,
            ]}
            onPress={() => setActiveTab('profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.tabIcon}>👤</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === 'profile' && styles.tabLabelActive,
              ]}
            >
              我的
            </Text>
          </TouchableOpacity>
        </View>

        {/* 主密码解锁弹窗 */}
        <UnlockModal
          visible={unlockModalVisible}
          hasPasswordSet={hasPwd}
          reason={unlockReason}
          onUnlock={handleUnlock}
          onOpenSetPassword={() => {
            setUnlockModalVisible(false);
            handleOpenSetPassword();
          }}
          onOpenResetConfirm={() => setResetConfirmVisible(true)}
          onClose={() => setUnlockModalVisible(false)}
        />

        {/* 高风险重置确认弹窗 (需手动输入文字验证) */}
        <ResetConfirmModal
          visible={resetConfirmVisible}
          onClose={() => setResetConfirmVisible(false)}
          onConfirmReset={handleResetVault}
        />

        {/* 设置 / 修改主密码弹窗 */}
        <MasterPasswordModal
          visible={masterModalVisible}
          isChangeMode={masterModalIsChange}
          onClose={() => setMasterModalVisible(false)}
          onSubmit={handleSubmitMasterPassword}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemedDialogProvider>
        <VaultAppContent />
      </ThemedDialogProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  contentContainer: {
    flex: 1,
  },
  screenTabWrapper: {
    flex: 1,
  },
  screenTabHidden: {
    display: 'none',
  },
  bottomTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFF6F2',
    borderTopWidth: 1.5,
    borderTopColor: '#F0DFD7',
    paddingTop: 10,
    paddingHorizontal: 20,
    elevation: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  tabItemActivePill: {
    backgroundColor: '#F7C4B8',
    borderWidth: 1.8,
    borderColor: '#302220',
  },
  tabIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8A7B76',
  },
  tabLabelActive: {
    color: '#2C1E1C',
    fontWeight: '800',
  },
});
