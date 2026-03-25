export interface AttendanceRecord {
    type: string; // 기존/신입
    gender: string; // 남/여
    name: string;
    requiredAttendance: number;
    attendanceCount: number;
  status: string; // O 또는 X (표시용)
    records: {
    [scheduleKey: string]: number | null | string;
    };
}
// 현재 시즌 식별자 (sessions.season 컬럼과 매칭)
export const CURRENT_SEASON = '2026-1';

export interface Gym {
  id: number;
  name: string;
  icon_url: string | null;
  created_at: string;
}

export interface ScheduleEntry {
  id: number;
  date: string; // 'YYYY-MM-DD'
  gym_id: number;
  season?: string | null;
  gyms: Gym | null; // Supabase JOIN 결과
}

export interface PlaceInfo {
  key: string;
  name: string;
  dateLabel: string | null;
}
