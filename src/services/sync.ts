import { supabase } from '../config/supabase';
import { getLocalEncryptedBlob, setLocalEncryptedBlob, setLastSyncTime } from './storage';

export interface SyncResult {
  success: boolean;
  message: string;
  updatedAt?: string;
}

/**
 * 备份本地已加密密文到 Supabase 云端
 */
export async function backupToSupabase(masterKey: string | null): Promise<SyncResult> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { success: false, message: '请先在“我的”页面登录云端账号' };
  }

  let encryptedBlob: string | null = null;
  try {
    encryptedBlob = await getLocalEncryptedBlob(masterKey);
  } catch (err: any) {
    return { success: false, message: err.message || '获取加密数据失败' };
  }

  if (!encryptedBlob) {
    return { success: false, message: '本地暂无密码数据可备份' };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('vaults')
    .upsert({
      user_id: user.id,
      encrypted_data: encryptedBlob,
      vault_version: 1,
      updated_at: now,
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    return { success: false, message: `备份失败: ${error.message}` };
  }

  const formattedTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  await setLastSyncTime(formattedTime);

  return {
    success: true,
    message: '云端加密备份成功',
    updatedAt: formattedTime,
  };
}

/**
 * 从 Supabase 云端拉取最新加密密文
 */
export async function pullFromSupabase(): Promise<SyncResult> {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { success: false, message: '请先在“我的”页面登录云端账号' };
  }

  const { data, error } = await supabase
    .from('vaults')
    .select('encrypted_data, updated_at')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { success: false, message: '云端暂无备份数据' };
    }
    return { success: false, message: `拉取失败: ${error.message}` };
  }

  if (!data?.encrypted_data) {
    return { success: false, message: '云端备份数据为空' };
  }

  // 写入本地加密存储
  await setLocalEncryptedBlob(data.encrypted_data);

  const formattedTime = new Date(data.updated_at || Date.now()).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  await setLastSyncTime(formattedTime);

  return {
    success: true,
    message: '云端数据拉取成功！请输入主密码解密查看。',
    updatedAt: formattedTime,
  };
}
