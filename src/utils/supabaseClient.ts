import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[client] REACT_APP_SUPABASE_URL 또는 REACT_APP_SUPABASE_ANON_KEY 가 ' +
      '설정되어 있지 않습니다.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
