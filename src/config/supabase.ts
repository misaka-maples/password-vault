import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://xgalwvshlamuihtxjsfd.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_oNqwiQN2TADE4RCLTtEcyw_cGGLHzF5';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
