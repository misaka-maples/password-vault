# 密码保险库 (Password Vault) 🔐

一款端到端零知识加密的 React Native / Expo 密码管理器。主密码和明文不会上传，CloudBase PostgreSQL 仅保存客户端生成的加密密文。

## 核心特性

- AES-256 本地加密，主密码不离开设备。
- 指纹 / 面容识别快速解锁。
- CloudBase 邮箱账号、PostgreSQL 加密备份与 RLS 用户隔离。
- 腾讯 COS 托管 `latest.json` 和 Android APK。
- App 内检查更新、断点续传和调起系统安装器。

## 技术栈

- React Native 0.88 + Expo SDK 58 + TypeScript
- `expo-secure-store` / `expo-local-authentication`
- `crypto-es` / `crypto-js`
- `@cloudbase/js-sdk` + `@cloudbase/adapter-rn`
- CloudBase Auth + PostgreSQL，腾讯 COS

## 本地运行

Expo SDK 58 需要 Node.js 22.13 或更高版本。CloudBase React Native 适配器使用原生 MMKV 持久化登录态，请使用 development/release build，不要只依赖 Expo Go。

```bash
npm install
npx expo run:android
```

## CloudBase 配置

`.env` 需包含：

```dotenv
EXPO_PUBLIC_CLOUDBASE_ENV_ID=your-env-id
EXPO_PUBLIC_CLOUDBASE_REGION=ap-shanghai
EXPO_PUBLIC_CLOUDBASE_PUBLISHABLE_KEY=your-publishable-key
EXPO_PUBLIC_UPDATE_MANIFEST_URL=https://password-vault-releases-1323710248.cos.ap-shanghai.myqcloud.com/releases/latest.json
```

Publishable Key 可安全地放入客户端，其访问能力受 GRANT + RLS 限制。不要把 CloudBase 服务端 API Key 或 COS SecretKey 打包到 App。

### `vaults` 表

```sql
create table if not exists public.vaults (
  user_id text primary key default (current_setting('request.jwt.claims', true)::json->>'sub'),
  encrypted_data text not null,
  vault_version integer not null default 1,
  checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;
grant select, insert, update, delete on public.vaults to authenticated;

create policy vaults_select_own on public.vaults for select to authenticated
  using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));
create policy vaults_insert_own on public.vaults for insert to authenticated
  with check (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));
create policy vaults_update_own on public.vaults for update to authenticated
  using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'))
  with check (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));
create policy vaults_delete_own on public.vaults for delete to authenticated
  using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));
```

## 腾讯 COS 发版

GitHub Actions 在推送 `v*` tag 时会自动上传 APK 和 `releases/latest.json`。仓库需配置以下 GitHub Secrets：

- `COS_SECRET_ID`：建议使用只允许写入 `releases/` 目录的 CAM 子账号。
- `COS_SECRET_KEY`
- `COS_BUCKET`：包含 APPID 的完整 Bucket 名。
- `COS_REGION`：例如 `ap-shanghai`。
- `COS_PUBLIC_BASE_URL`：Bucket 公网域名或 CDN 域名。

Bucket 只需对 `releases/` 开放公共读，写入仍由 CAM 密钥控制。版本清单格式见 [`release/latest.example.json`](release/latest.example.json)。

## 验证

```bash
npx tsc --noEmit
npx eslint .
```

## License

MIT License
