export interface SubAccount {
  id: string;
  label?: string;          // 账号子标签/说明，如 "日服"、"港区"、"大号"、"工作"
  account: string;         // 账号，如邮箱、手机号或用户名
  password: string;        // 密码
}

export interface PasswordItem {
  id: string;
  title: string;           // 平台/分类标签名称，如 "Paypay", "任天堂"
  account: string;         // 默认主账号 (保持向下兼容)
  password: string;        // 默认主密码 (保持向下兼容)
  accounts?: SubAccount[]; // 同一标签下的多组账号列表
  url?: string;            // 网址 (可选)
  category?: string;       // 分类 (游戏、支付、社交、工作等)
  notes?: string;          // 备注
  icon?: string;           // 图标代号
  iconColor?: string;      // 图标背景色
  createdAt: number;
  updatedAt: number;
}

export interface VaultState {
  items: PasswordItem[];
  lastUpdated: number;
}

export interface UserSession {
  email: string;
  id: string;
}
