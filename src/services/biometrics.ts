import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyMasterPassword } from './storage';

export const BIO_ENABLED_KEY = 'vault_biometric_enabled';
export const BIO_MASTER_KEY = 'vault_biometric_master_key';

export interface BiometricStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
  isEnabled: boolean;
  biometricType: 'fingerprint' | 'facial' | 'biometric';
}

/**
 * 检查当前设备的生物识别支持情况与用户开启状态
 */
export async function checkBiometricSupport(): Promise<BiometricStatus> {
  let hasHardware = Platform.OS === 'android' || Platform.OS === 'ios';
  let isEnrolled = true;
  let isEnabled = false;
  let biometricType: 'fingerprint' | 'facial' | 'biometric' = 'fingerprint';

  try {
    const hw = await LocalAuthentication.hasHardwareAsync();
    if (hw !== undefined) hasHardware = hw;
  } catch {}

  try {
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (enrolled !== undefined) isEnrolled = enrolled;
  } catch {}

  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types && types.length > 0) {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'facial';
      } else {
        biometricType = 'fingerprint';
      }
    }
  } catch {}

  try {
    const savedKey = await SecureStore.getItemAsync(BIO_MASTER_KEY);
    const enabledSetting = await AsyncStorage.getItem(BIO_ENABLED_KEY);
    isEnabled = enabledSetting === 'true' && !!savedKey;
  } catch {}

  return {
    hasHardware,
    isEnrolled,
    isEnabled,
    biometricType,
  };
}

/**
 * 绑定并开启生物识别快速解锁
 */
export async function enableBiometricUnlock(masterPassword: string): Promise<boolean> {
  const isValid = await verifyMasterPassword(masterPassword);
  if (!isValid) {
    throw new Error('主密码输入错误，无法绑定生物识别');
  }

  await SecureStore.setItemAsync(BIO_MASTER_KEY, masterPassword);
  await AsyncStorage.setItem(BIO_ENABLED_KEY, 'true');
  return true;
}

/**
 * 关闭生物识别
 */
export async function disableBiometricUnlock(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIO_MASTER_KEY);
  } catch {}
  await AsyncStorage.setItem(BIO_ENABLED_KEY, 'false');
}

/**
 * 更新生物识别中存储的主密码 (修改密码时联动)
 */
export async function updateBiometricPasswordIfEnabled(newPassword: string): Promise<void> {
  const enabledSetting = await AsyncStorage.getItem(BIO_ENABLED_KEY);
  if (enabledSetting === 'true') {
    await SecureStore.setItemAsync(BIO_MASTER_KEY, newPassword);
  }
}

/**
 * 尝试通过生物识别（指纹/面容）唤起并解密获取主密码
 */
export async function authenticateWithBiometrics(
  promptMessage = '验证指纹或面容以解锁密码库'
): Promise<{ success: boolean; password?: string; error?: string }> {
  try {
    const savedPassword = await SecureStore.getItemAsync(BIO_MASTER_KEY);
    if (!savedPassword) {
      return {
        success: false,
        error: '尚未绑定生物识别，请输入一次主密码解锁即可开启',
      };
    }

    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: '使用主密码',
      fallbackLabel: '使用主密码',
      disableDeviceFallback: false,
    });

    if (authResult.success) {
      return { success: true, password: savedPassword };
    } else {
      if (authResult.error === 'not_enrolled') {
        return { success: false, error: '设备未录入指纹或面容，请在手机设置中添加' };
      }
      if (authResult.error === 'not_available') {
        return { success: false, error: '系统生物识别服务不可用或无权限' };
      }
      return { success: false, error: '验证已取消或未通过' };
    }
  } catch (err: any) {
    return { success: false, error: err.message || '生物识别发生异常' };
  }
}
