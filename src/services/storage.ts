import AsyncStorage from '@react-native-async-storage/async-storage';
import { PasswordItem } from '../types';
import { encryptVault, decryptVault, hashMasterPassword } from './crypto';

const STORAGE_KEYS = {
  MASTER_HASH: '@vault_master_pwd_hash',
  ENCRYPTED_DATA: '@vault_encrypted_items',
  UNENCRYPTED_DATA: '@vault_unencrypted_items',
  LAST_SYNC: '@vault_last_sync_time',
};

// 初始数据：默认为空
export const INITIAL_DEMO_ITEMS: PasswordItem[] = [];

/**
 * 检查是否已设置主密码
 */
export async function hasMasterPassword(): Promise<boolean> {
  const hash = await AsyncStorage.getItem(STORAGE_KEYS.MASTER_HASH);
  return !!hash;
}

/**
 * 校验主密码是否正确
 */
export async function verifyMasterPassword(password: string): Promise<boolean> {
  const hash = await AsyncStorage.getItem(STORAGE_KEYS.MASTER_HASH);
  if (!hash) return false;
  return hashMasterPassword(password) === hash;
}

/**
 * 设置或修改主密码
 * @param newPassword 新主密码
 * @param currentItems 当前内存中的密码列表
 * @param oldPassword 如果已设置主密码，修改时需校验旧密码
 */
export async function setMasterPassword(
  newPassword: string,
  currentItems: PasswordItem[],
  oldPassword?: string
): Promise<boolean> {
  const existingHash = await AsyncStorage.getItem(STORAGE_KEYS.MASTER_HASH);

  if (existingHash) {
    if (!oldPassword || hashMasterPassword(oldPassword) !== existingHash) {
      throw new Error('原主密码输入有误，无法修改');
    }
  }

  // 用新主密码加密当前密码库
  const encrypted = encryptVault(currentItems, newPassword);
  await AsyncStorage.setItem(STORAGE_KEYS.ENCRYPTED_DATA, encrypted);
  await AsyncStorage.setItem(STORAGE_KEYS.MASTER_HASH, hashMasterPassword(newPassword));
  
  // 清理未加密缓存
  await AsyncStorage.removeItem(STORAGE_KEYS.UNENCRYPTED_DATA);
  return true;
}

/**
 * 解除主密码保护（保留全部密码数据，仅移除主密码）
 * @param currentPassword 当前主密码
 * @param currentItems 当前密码列表
 */
export async function removeMasterPassword(
  currentPassword: string,
  currentItems: PasswordItem[]
): Promise<boolean> {
  const existingHash = await AsyncStorage.getItem(STORAGE_KEYS.MASTER_HASH);
  if (!existingHash) return true;

  if (hashMasterPassword(currentPassword) !== existingHash) {
    throw new Error('原主密码输入有误，无法解除密码保护');
  }

  // 1. 将当前数据保存为未加密存储，保留全部数据！
  await AsyncStorage.setItem(STORAGE_KEYS.UNENCRYPTED_DATA, JSON.stringify(currentItems));
  // 2. 移除加密密文和主密码哈希
  await AsyncStorage.removeItem(STORAGE_KEYS.MASTER_HASH);
  await AsyncStorage.removeItem(STORAGE_KEYS.ENCRYPTED_DATA);
  return true;
}

/**
 * 加载本地密码列表
 */
export async function loadLocalVault(masterKey: string | null): Promise<PasswordItem[]> {
  const hasPwd = await hasMasterPassword();

  if (!hasPwd) {
    // 尚未设置主密码，读取未加密数据并清理示例数据
    const unencrypted = await AsyncStorage.getItem(STORAGE_KEYS.UNENCRYPTED_DATA);
    if (unencrypted !== null) {
      try {
        const parsed: PasswordItem[] = JSON.parse(unencrypted);
        // 彻底清除历史示例数据 (demo-1 到 demo-4)
        return parsed.filter((it) => !it.id.startsWith('demo-'));
      } catch {
        return [];
      }
    }
    await AsyncStorage.setItem(STORAGE_KEYS.UNENCRYPTED_DATA, JSON.stringify([]));
    return [];
  }

  // 已设置主密码，必须提供 masterKey 解密
  if (!masterKey) {
    throw new Error('保险库已锁定，请输入主密码');
  }

  const encrypted = await AsyncStorage.getItem(STORAGE_KEYS.ENCRYPTED_DATA);
  if (!encrypted) {
    return [];
  }

  const decrypted = decryptVault(encrypted, masterKey);
  // 同样过滤掉旧的示例数据
  return decrypted.filter((it) => !it.id.startsWith('demo-'));
}

/**
 * 保存密码列表到本地
 */
export async function saveLocalVault(
  items: PasswordItem[],
  masterKey: string | null
): Promise<void> {
  const hasPwd = await hasMasterPassword();

  if (hasPwd) {
    if (!masterKey) {
      throw new Error('保险库已锁定，缺少主密码，无法保存更改');
    }
    const encrypted = encryptVault(items, masterKey);
    await AsyncStorage.setItem(STORAGE_KEYS.ENCRYPTED_DATA, encrypted);
  } else {
    // 未设密码模式下直接存未加密项
    await AsyncStorage.setItem(STORAGE_KEYS.UNENCRYPTED_DATA, JSON.stringify(items));
  }
}

/**
 * 重置保险库（清空主密码锁与无法解密的数据）
 * 注意：重置后为空保险库，绝不恢复已被用户删除的旧演示数据！
 */
export async function resetLocalVault(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.MASTER_HASH);
  await AsyncStorage.removeItem(STORAGE_KEYS.ENCRYPTED_DATA);
  await AsyncStorage.setItem(STORAGE_KEYS.UNENCRYPTED_DATA, JSON.stringify([]));
  await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
}

/**
 * 获取本地加密密文 (用于直接备份到云端)
 */
export async function getLocalEncryptedBlob(masterKey: string | null): Promise<string | null> {
  const hasPwd = await hasMasterPassword();
  if (!hasPwd) {
    throw new Error('请先设置主密码以开启端到端加密备份');
  }
  return await AsyncStorage.getItem(STORAGE_KEYS.ENCRYPTED_DATA);
}

/**
 * 将云端下载的密文覆盖存入本地
 */
export async function setLocalEncryptedBlob(encryptedData: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.ENCRYPTED_DATA, encryptedData);
}

/**
 * 同步时间记录
 */
export async function getLastSyncTime(): Promise<string | null> {
  return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
}

export async function setLastSyncTime(timeStr: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timeStr);
}
