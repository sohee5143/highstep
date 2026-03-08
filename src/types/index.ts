export interface AttendanceRecord {
    type: string; // 기존/신입
    gender: string; // 남/여
    name: string;
    requiredAttendance: number;
    attendanceCount: number;
    status: string; // X, 부상 등
    records: {
        [place: string]: number | null | string;
    };
}
// 현재 시즌 식별자 (sessions.season 컬럼과 매칭)
export const CURRENT_SEASON = '2026-1';
