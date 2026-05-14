export interface AttendanceRecord {
    type: string; // 기존/신입
    gender: string; // 남/여
    name: string;
    requiredAttendance: number;
    attendanceCount: number;
    status: 'full' | 'minus_one' | 'X' | '부상'; // DB에서 읽는 상태값
    records: {
    [scheduleKey: string]: number | null | string;
    };
    // 분기 정보 (새로 추가)
    quarter?: number;      // 1-4
    year?: number;         // 연도
    quarterKey?: string;   // "2026_Q1" 형태
    previousQuarterData?: {
      attendanceCount: number;
      status: 'full' | 'minus_one' | 'X' | '부상';
    };
}

// 분기별 출석 현황 (새로 추가)
export interface QuarterAttendanceRecord extends AttendanceRecord {
  quarter: number;
  year: number;
  quarterKey: string;
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
