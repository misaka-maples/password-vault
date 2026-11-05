export interface PasswordItem {
  id: string;
  title: string;          // 平台名称，如 "Paypay", "任天堂日服"
  account: string;        // 账号，如 "13800138409"
  password: string;       // 密码
  url?: string;           // 网址 (可选)
  category?: string;      // 分类 (游戏、支付、社交、工作等)
  notes?: string;         // 备注
  icon?: string;          // 图标代号
  iconColor?: string;     // 图标背景色
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
