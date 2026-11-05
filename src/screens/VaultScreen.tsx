import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { PasswordItem } from '../types';
import { PasswordCard } from '../components/PasswordCard';
import { AddEditModal } from '../components/AddEditModal';

interface Props {
  items: PasswordItem[];
  isLocked: boolean;
  hasMasterPassword: boolean;
  onLockPress: () => void;
  onRequireUnlock: (actionDesc?: string) => void;
  onOpenSetPassword: () => void;
  onSaveItem: (item: Omit<PasswordItem, 'id' | 'createdAt' | 'updatedAt'>, editId?: string) => void;
  onDeleteItem: (id: string, title: string) => void;
  onShowToast: (msg: string) => void;
}

export const VaultScreen: React.FC<Props> = ({
  items,
  isLocked,
  hasMasterPassword,
  onLockPress,
  onRequireUnlock,
  onOpenSetPassword,
  onSaveItem,
  onDeleteItem,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PasswordItem | null>(null);

  // 搜索过滤
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.account.toLowerCase().includes(q) ||
        (it.notes && it.notes.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const handleOpenAdd = () => {
    if (isLocked) {
      onShowToast('🔒 保险库已锁定，请先解锁以添加新记录');
      onRequireUnlock('添加新记录');
      return;
    }
    setEditingItem(null);
    setModalVisible(true);
  };

  const handleOpenEdit = (item: PasswordItem) => {
    if (isLocked) {
      onShowToast('🔒 保险库已锁定，请先解锁以修改记录');
      onRequireUnlock('修改记录');
      return;
    }
    setEditingItem(item);
    setModalVisible(true);
  };

  const handleSaveModal = (data: Omit<PasswordItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    onSaveItem(data, editingItem ? editingItem.id : undefined);
    onShowToast(editingItem ? `已更新 ${data.title}` : `已新增 ${data.title}`);
  };

  // 顶部状态药丸渲染
  const renderLockBadge = () => {
    if (!hasMasterPassword) {
      return (
        <TouchableOpacity
          style={[styles.lockBadge, styles.lockBadgeWarning]}
          onPress={onOpenSetPassword}
          activeOpacity={0.7}
        >
          <Text style={styles.lockBadgeText}>🛡️ 设置密码</Text>
        </TouchableOpacity>
      );
    }

    if (isLocked) {
      return (
        <TouchableOpacity
          style={[styles.lockBadge, styles.lockBadgeLocked]}
          onPress={onLockPress}
          activeOpacity={0.7}
        >
          <Text style={styles.lockBadgeText}>🔒 已锁定 (点击解锁)</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.lockBadge, styles.lockBadgeUnlocked]}
        onPress={onLockPress}
        activeOpacity={0.7}
      >
        <Text style={styles.lockBadgeText}>🔓 锁 定</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <Text style={styles.title}>密码</Text>
        {renderLockBadge()}
      </View>

      {/* 搜索框 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索平台名称"
          placeholderTextColor="#A4958E"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 锁定提示横幅 */}
      {isLocked && hasMasterPassword && (
        <TouchableOpacity
          style={styles.lockedBanner}
          onPress={onLockPress}
          activeOpacity={0.8}
        >
          <Text style={styles.lockedBannerText}>
            🔒 保险库处于锁定保护中 · 点击此处或卡片操作输入密码解锁
          </Text>
        </TouchableOpacity>
      )}

      {/* 密码卡片列表 */}
      <FlatList
        data={filteredItems}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <PasswordCard
            item={item}
            isLocked={isLocked}
            onRequireUnlock={onRequireUnlock}
            onEdit={handleOpenEdit}
            onDelete={onDeleteItem}
            onShowToast={onShowToast}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📂</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? '没有找到匹配的平台' : '暂无密码记录'}
            </Text>
            <Text style={styles.emptySubtitle}>点击右下角按钮添加第一个密码吧</Text>
          </View>
        }
      />

      {/* 悬浮新增按钮 (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenAdd}
        activeOpacity={0.85}
      >
        <Text style={styles.fabPlus}>＋</Text>
      </TouchableOpacity>

      {/* 新增/修改弹窗 */}
      <AddEditModal
        visible={modalVisible}
        initialItem={editingItem}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 14 : 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#2B201E',
    letterSpacing: -0.5,
  },
  lockBadge: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#302321',
    shadowColor: '#2F2321',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  lockBadgeLocked: {
    backgroundColor: '#FDE4C8',
  },
  lockBadgeUnlocked: {
    backgroundColor: '#EAE1DC',
  },
  lockBadgeWarning: {
    backgroundColor: '#FFE1CC',
  },
  lockBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#322320',
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2F2321',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2E2220',
    shadowColor: '#2F2321',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  clearBtn: {
    position: 'absolute',
    right: 14,
    top: 13,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0E5DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#5C4E49',
  },
  lockedBanner: {
    backgroundColor: '#FFF0EA',
    borderWidth: 1.5,
    borderColor: '#E8BDB1',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBannerText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#8A5341',
  },
  listContent: {
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#554440',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E7D77',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F6B4A6',
    borderWidth: 2.2,
    borderColor: '#2E201E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F2321',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabPlus: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2B1E1C',
    marginTop: -2,
  },
});
