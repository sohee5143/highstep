// scripts/migrateMembersFromAttendance.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const filePath = path.join(__dirname, '../src/data/attendance.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const rows = JSON.parse(raw);

  for (const row of rows) {
    const {
      name,
      type,
      gender,
      requiredAttendance,
      attendanceCount,
      status,
    } = row;

    const payload = {
      name,
      type,
      gender,
      required_attendance: requiredAttendance ?? 0,
      base_attendance_count: attendanceCount ?? 0,
      status: status ?? 'X',
    };

    const { error } = await supabase
      .from('members')
      .insert(payload); // 단순 1회 삽입

    if (error) {
      console.error('❌ 오류:', name, error.message);
    } else {
      console.log('✅ 처리 완료:', name);
    }
  }

  console.log('모든 멤버 처리 완료');
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});