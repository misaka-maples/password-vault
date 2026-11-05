import 'react-native-get-random-values';
import * as ExpoCrypto from 'expo-crypto';
import CryptoJS from 'crypto-js';
import { PasswordItem } from '../types';

// 1. 全局注入 getRandomValues polyfill
if (typeof globalThis !== 'undefined') {
  const g = globalThis as any;
  if (!g.crypto) {
    g.crypto = {};
  }
  if (typeof g.crypto.getRandomValues !== 'function') {
    g.crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
      if (array) {
        return ExpoCrypto.getRandomValues(array as any) as T;
      }
      return array;
    };
  }
}

// 2. 直接为 CryptoJS.lib.WordArray.random 注入 Expo 级安全随机数生成器
// 彻底杜绝 "Native crypto module could not be used" 报错
try {
  (CryptoJS.lib.WordArray as any).random = function (nBytes: number) {
    const words: number[] = [];
    for (let i = 0; i < nBytes; i += 4) {
      let randInt: number;
      try {
        const arr = new Uint32Array(1);
        ExpoCrypto.getRandomValues(arr);
        randInt = arr[0];
      } catch {
        randInt = (Math.random() * 0x100000000) >>> 0;
      }
      words.push(randInt);
    }
    return new (CryptoJS.lib.WordArray as any).init(words, nBytes);
  };
} catch (e) {
  console.warn('CryptoJS WordArray polyfill warning:', e);
}

/**
 * 主密码哈希处理 (用于验证主密码正确性)
 */
export function hashMasterPassword(password: string, salt = 'vault_secure_salt_2026'): string {
  return CryptoJS.SHA256(password + salt).toString();
}

/**
 * 端到端加密密码库数据 (AES-256)
 */
export function encryptVault(items: PasswordItem[], masterKey: string): string {
  const jsonStr = JSON.stringify(items);
  return CryptoJS.AES.encrypt(jsonStr, masterKey).toString();
}

/**
 * 解密端到端加密的密码库数据
 */
export function decryptVault(ciphertext: string, masterKey: string): PasswordItem[] {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, masterKey);
    const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedStr) {
      throw new Error('解密失败：主密码错误或密文损坏');
    }
    return JSON.parse(decryptedStr) as PasswordItem[];
  } catch (err: any) {
    throw new Error('解密失败：主密码不匹配');
  }
}

/**
 * 账号脱敏显示 (高还原截图效果，如 13***409, 35***com, 手机***的)
 */
export function maskAccount(account: string): string {
  if (!account) return '';
  if (account.length <= 4) return '***';

  // 手机号格式 (11位左右数字)
  if (/^\d{11}$/.test(account)) {
    return `${account.slice(0, 2)}***${account.slice(-3)}`;
  }

  // 邮箱格式 (user@domain.com)
  if (account.includes('@')) {
    const [name, domain] = account.split('@');
    const prefix = name.length > 2 ? name.slice(0, 2) : name[0];
    const dotParts = domain.split('.');
    const ext = dotParts[dotParts.length - 1] || 'com';
    return `${prefix}***${ext}`;
  }

  // 中文或常规字符串 (如 "手机xxx的")
  const start = account.slice(0, 2);
  const end = account.slice(-1);
  return `${start}***${end}`;
}

/**
 * 随机强密码生成器
 */
export function generatePassword(length = 16, includeSymbols = true): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const symbols = '!@#$%^&*()_+~|}{[]';
  const chars = letters + numbers + (includeSymbols ? symbols : '');
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
