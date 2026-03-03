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

export interface SpreadsheetData {
    range: string;
    majorDimension: 'ROWS' | 'COLUMNS';
    values: string[][];
}

export const PLACES = [
    "강동 알레",
    "신환회(종숲)",
    "강남 클팍",
    "성수 더클",
    "천호 온플릭",
    "수원킨디",
    "을지로 손상원",
    "이수 더클",
    "연남 더클"
];

export const PLACE_DATES_FEB: Record<string, string> = {
    '강동 알레': '2/2',
    '신환회(종숲)': '2/7',
    '강남 클팍': '2/10',
    '성수 더클': '2/13',
    '천호 온플릭': '2/15',
    '수원킨디': '2/18',
    '을지로 손상원': '2/23',
    '이수 더클': '2/26',
    '연남 더클': '2/28',
};
