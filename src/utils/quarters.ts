/**
 * 분기(Quarter) 관리 유틸리티
 * 
 * 분기 규칙:
 * - 1분기: 2, 3, 4월
 * - 2분기: 5, 6, 7월
 * - 3분기: 8, 9, 10월
 * - 4분기: 11, 12, 1월
 * 
 * 예외: 1월은 이전 연도의 4분기로 취급
 * - 2027년 1월 → 2026년 4분기
 */

export interface QuarterInfo {
  year: number;        // 분기의 연도 (1월이면 전년도)
  quarter: number;     // 1-4
  key: string;        // "2026_Q1" 형태
  label: string;      // "2026년 1분기" 형태
  months: number[];   // [2, 3, 4] 형태
  startMonth: number;
  endMonth: number;
}

/**
 * 주어진 월(month)과 연도(year)로부터 분기 정보 계산
 * @param year 4자리 연도 (e.g., 2026)
 * @param month 1-12 월
 */
export function getQuarterInfo(year: number, month: number): QuarterInfo {
  // 1월은 이전 연도의 4분기
  if (month === 1) {
    return {
      year: year - 1,
      quarter: 4,
      key: `${year - 1}_Q4`,
      label: `${year - 1}년 4분기`,
      months: [11, 12, 1],
      startMonth: 11,
      endMonth: 1,
    };
  }

  // 2월-4월: 1분기
  if (month >= 2 && month <= 4) {
    return {
      year,
      quarter: 1,
      key: `${year}_Q1`,
      label: `${year}년 1분기`,
      months: [2, 3, 4],
      startMonth: 2,
      endMonth: 4,
    };
  }

  // 5월-7월: 2분기
  if (month >= 5 && month <= 7) {
    return {
      year,
      quarter: 2,
      key: `${year}_Q2`,
      label: `${year}년 2분기`,
      months: [5, 6, 7],
      startMonth: 5,
      endMonth: 7,
    };
  }

  // 8월-10월: 3분기
  if (month >= 8 && month <= 10) {
    return {
      year,
      quarter: 3,
      key: `${year}_Q3`,
      label: `${year}년 3분기`,
      months: [8, 9, 10],
      startMonth: 8,
      endMonth: 10,
    };
  }

  // 11월-12월: 4분기
  return {
    year,
    quarter: 4,
    key: `${year}_Q4`,
    label: `${year}년 4분기`,
    months: [11, 12, 1],
    startMonth: 11,
    endMonth: 12,
  };
}

/**
 * 현재 월 기준으로 현재 분기 정보 반환
 */
export function getCurrentQuarter(): QuarterInfo {
  const now = new Date();
  return getQuarterInfo(now.getFullYear(), now.getMonth() + 1);
}

/**
 * 주어진 분기의 이전 분기 반환
 */
export function getPreviousQuarter(quarterInfo: QuarterInfo): QuarterInfo {
  if (quarterInfo.quarter === 1) {
    // 1분기의 이전은 전년도 4분기
    return getQuarterInfo(quarterInfo.year - 1, 11);
  }
  // 2분기 이상이면 같은 해의 이전 분기
  const prevMonth = quarterInfo.months[0] - 3;
  return getQuarterInfo(quarterInfo.year, prevMonth);
}

/**
 * 주어진 분기의 다음 분기 반환
 */
export function getNextQuarter(quarterInfo: QuarterInfo): QuarterInfo {
  if (quarterInfo.quarter === 4) {
    // 4분기의 다음은 다음 해의 1분기
    return getQuarterInfo(quarterInfo.year + 1, 2);
  }
  // 1분기-3분기면 같은 해의 다음 분기
  const nextMonth = quarterInfo.months[0] + 3;
  return getQuarterInfo(quarterInfo.year, nextMonth);
}

/**
 * 최근 N개 분기 목록 반환 (역순: 최신부터)
 * @param count 반환할 분기 개수 (기본값: 8)
 */
export function getRecentQuarters(count: number = 8): QuarterInfo[] {
  const quarters: QuarterInfo[] = [];
  let current = getCurrentQuarter();

  for (let i = 0; i < count; i++) {
    quarters.push(current);
    current = getPreviousQuarter(current);
  }

  return quarters;
}

/**
 * 분기 key를 파싱하여 QuarterInfo 반환
 * @param key "2026_Q1" 형태의 문자열
 */
export function parseQuarterKey(key: string): QuarterInfo {
  const match = key.match(/^(\d{4})_Q([1-4])$/);
  if (!match) {
    throw new Error(`Invalid quarter key format: ${key}`);
  }

  const year = parseInt(match[1], 10);
  const quarter = parseInt(match[2], 10);

  // 분기에 해당하는 월을 구하여 getQuarterInfo 호출
  const monthMap = {
    1: 2,  // 1분기 → 2월
    2: 5,  // 2분기 → 5월
    3: 8,  // 3분기 → 8월
    4: 11, // 4분기 → 11월
  };

  return getQuarterInfo(year, monthMap[quarter as keyof typeof monthMap]);
}

/**
 * 날짜를 기반으로 분기 key 생성
 */
export function getQuarterKeyFromDate(date: Date): string {
  const info = getQuarterInfo(date.getFullYear(), date.getMonth() + 1);
  return info.key;
}

/**
 * 분기 목록 비교: 연속된 두 분기인지 확인
 */
export function isConsecutiveQuarters(q1: QuarterInfo, q2: QuarterInfo): boolean {
  const next = getNextQuarter(q1);
  return next.key === q2.key;
}
