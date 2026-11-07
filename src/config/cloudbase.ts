import cloudbaseSDK from '@cloudbase/js-sdk';
import adapter from '@cloudbase/adapter-rn';

export const CLOUDBASE_ENV_ID =
  process.env.EXPO_PUBLIC_CLOUDBASE_ENV_ID || 'variable-earwig-d3f7gb01d9174fde';
export const CLOUDBASE_REGION =
  process.env.EXPO_PUBLIC_CLOUDBASE_REGION || 'ap-shanghai';
export const CLOUDBASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLOUDBASE_PUBLISHABLE_KEY || '';

cloudbaseSDK.useAdapters(adapter);

export const cloudbaseApp = cloudbaseSDK.init({
  env: CLOUDBASE_ENV_ID,
  region: CLOUDBASE_REGION,
  accessKey: CLOUDBASE_PUBLISHABLE_KEY,
  persistence: 'local',
  timeout: 8000,
});

export const cloudbaseAuth = cloudbaseApp.auth();
export const cloudbaseDb = cloudbaseApp.rdb();
