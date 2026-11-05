# 密码保险库 (Password Vault) 🔐

<p align="center">
  <b>一款温馨可爱・插画拟物风（Neo-Brutalism）・端到端零知识加密的移动端密码管理器</b>
</p>

---

## ✨ 核心特性

- 🎨 **温暖桃粉拟物插画风**：打破传统密码管理器冷冰沉闷的界面，全套采用粗黑边（2.2px）、圆角奶白卡片、拟物彩色阴影与趣味 Emoji 徽章设计。
- 🔐 **端到端零知识加密**：所有数据均在手机客户端本地通过 **AES-256** 算法加密，主密码绝不以明文形式存储或上传，云端仅保存密文。
- 👆 **生物指纹 / 面容免密秒解**：深度集成 Android `BiometricPrompt` 原生硬件接口，支持安全 Keystore 密匙托管，快速通过指纹或人脸解锁。
- 🔄 **Supabase 多端数据漫游**：支持通过 Supabase 云端加密备份与跨设备同步，配合行级安全策略（RLS）严密保障个人数据归属。
- 🚀 **软件内在线自动检查更新**：
  - 自动语义化对比远端版本；
  - 软件内静默断点下载，实时渲染拟物风格下载进度条；
  - 下载完成后通过 Android `FileProvider` 自动拉起系统应用安装器完成一键无缝覆盖升级。
- 🛡️ **严密锁定与权限防泄漏**：
  - 保险库锁定期间，严格拦截新增、修改、删除、明文切换以及账号/密码剪贴板复制；
  - 支持解绑主密码转为免密查看模式，或多重防误触清空重置。

---

## 🛠️ 技术栈

- **框架**：React Native 0.88 + Expo SDK 58
- **语言**：TypeScript
- **本地安全与存储**：
  - `expo-secure-store`（Android Keystore 硬件级密匙隔离）
  - `expo-local-authentication`（指纹/面容生物特征调用）
  - `crypto-es` / `crypto-js`（AES-256-CBC / GCM 客户端加解密）
  - `@react-native-async-storage/async-storage`
- **云端服务**：Supabase（Auth 认证与 Postgres 云端备份）
- **自动更新**：`expo-file-system` + `expo-intent-launcher`（安装包下载与 Intent 安装唤起）

---

## 🚀 快速上手与运行

### 1. 克隆项目与安装依赖
```bash
git clone https://github.com/misaka-maples/password-vault.git
cd password-vault
npm install
```

### 2. 本地开发与实时预览
```bash
npx expo start
```
使用手机安装 **Expo Go** 扫码即可实时热重载预览。

### 3. 本地打包 Android APK
```bash
# 生成 Android 原生工程（如未生成）
npx expo prebuild

# 进入 android 目录使用 Gradle 编译 Release 安装包
cd android
./gradlew assembleRelease --no-daemon
```
编译产物位于：`android/app/build/outputs/apk/release/app-release.apk`。

---

## ☁️ Supabase 云端与更新服务配置

### 数据备份表（`vaults`）
```sql
create table if not exists public.vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  encrypted_data text not null,
  vault_version integer default 1,
  updated_at timestamptz default now()
);

alter table public.vaults enable row level security;

create policy "Users can only access own vault"
  on public.vaults
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### 软件内发版更新表（`app_releases`，可选）
```sql
create table if not exists public.app_releases (
  id serial primary key,
  version text not null,
  version_code integer not null,
  title text,
  release_notes text not null,
  download_url text not null,
  file_size text,
  force_update boolean default false,
  published_at timestamptz default now()
);

alter table public.app_releases enable row level security;
create policy "Allow public read releases" on public.app_releases for select using (true);
```

---

## 📄 License
MIT License
