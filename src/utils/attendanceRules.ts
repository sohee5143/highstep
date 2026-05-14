/**
 * 분기별 출석 규칙 계산 로직
 * 
 * 핵심 규칙:
 * - 기본: 한 분기당 5회 출석 필요
 * - 연속된 두 분기 기준으로 최대 1회 부족까지 허용
 *   예: (4회, 5회) = 통과, (5회, 4회) = 통과, (4회, 4회) = 실패
 */

export type AttendanceStatus = 'full' | 'minus_one' | 'X' | '부상';

export interface QuarterAttendanceResult {
  currentQuarter: {
    count: number;
    required: number;
    status: AttendanceStatus;
  };
  previousQuarter?: {
    count: number;
    required: number;
    status: AttendanceStatus;
  };
  combined?: {
    currentCount: number;
    previousCount: number;
    totalCount: number;
    totalRequired: number;
    status: AttendanceStatus;
    reasoning: string;
  };
}

/**
 * 단일 분기 상태 계산
 * @param attendanceCount 출석 횟수
 * @param requiredCount 필요 출석 횟수
 */
export function calculateSingleQuarterStatus(
  attendanceCount: number,
  requiredCount: number = 5
): AttendanceStatus {
  if (attendanceCount >= requiredCount) {
    return 'full';
  }
  if (attendanceCount === requiredCount - 1) {
    return 'minus_one';
  }
  return 'X';
}

/**
 * 연속된 두 분기 기준 통합 상태 계산
 * 
 * 규칙:
 * - (5, 5): full
 * - (4, 5): minus_one (1회 부족)
 * - (5, 4): minus_one (1회 부족)
 * - (4, 4): X (2회 부족)
 * - 기타: X
 * 
 * @param currentCount 현재 분기 출석 횟수
 * @param previousCount 이전 분기 출석 횟수
 * @param currentRequired 현재 분기 필요 횟수 (기본값: 5)
 * @param previousRequired 이전 분기 필요 횟수 (기본값: 5)
 */
export function calculateTwoQuarterStatus(
  currentCount: number,
  previousCount: number,
  currentRequired: number = 5,
  previousRequired: number = 5
): AttendanceStatus {
  const totalRequired = currentRequired + previousRequired;
  const totalCount = currentCount + previousCount;
  const deficit = totalRequired - totalCount;

  if (deficit <= 0) {
    return 'full';
  }
  if (deficit === 1) {
    return 'minus_one';
  }
  return 'X';
}

/**
 * 두 분기 데이터를 종합하여 최종 상태 결정
 * 현재 분기가 부족하면 이전 분기와 함께 판단
 */
export function determineOverallStatus(
  currentQuarterCount: number,
  previousQuarterCount: number | undefined,
  requiredPerQuarter: number = 5
): {
  status: AttendanceStatus;
  reasoning: string;
} {
  const currentStatus = calculateSingleQuarterStatus(currentQuarterCount, requiredPerQuarter);

  // 현재 분기가 full이면 즉시 판단 완료
  if (currentStatus === 'full') {
    return {
      status: 'full',
      reasoning: `${currentQuarterCount}/${requiredPerQuarter} 충족`,
    };
  }

  // 이전 분기 데이터가 없으면 현재 분기 상태만 반영
  if (previousQuarterCount === undefined) {
    return {
      status: currentStatus,
      reasoning:
        currentStatus === 'minus_one'
          ? `${currentQuarterCount}/${requiredPerQuarter} (1회 부족)`
          : `${currentQuarterCount}/${requiredPerQuarter}`,
    };
  }

  // 두 분기 종합 판단
  const twoQuarterStatus = calculateTwoQuarterStatus(
    currentQuarterCount,
    previousQuarterCount,
    requiredPerQuarter,
    requiredPerQuarter
  );

  const totalNeeded = requiredPerQuarter * 2;
  const totalActual = currentQuarterCount + previousQuarterCount;

  return {
    status: twoQuarterStatus,
    reasoning: `현재 ${currentQuarterCount}회 + 이전 ${previousQuarterCount}회 = ${totalActual}/${totalNeeded}`,
  };
}

/**
 * 분기별 필요 출석 횟수 계산
 * (향후 계획: 분기별로 다른 규칙 적용 가능)
 */
export function getRequiredAttendanceForQuarter(
  year: number,
  quarter: number
): number {
  // 현재는 모든 분기 동일하게 5회
  return 5;
}
