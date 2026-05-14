import {
  getQuarterInfo,
  getCurrentQuarter,
  getPreviousQuarter,
  parseQuarterKey,
  getRecentQuarters,
} from './quarters';
import {
  calculateSingleQuarterStatus,
  calculateTwoQuarterStatus,
  determineOverallStatus,
} from './attendanceRules';

/**
 * 분기 계산 유틸리티 테스트
 */
export function testQuarterCalculations() {
  console.log('=== 분기 계산 테스트 시작 ===\n');

  // Test 1: 각 월별 분기 매핑
  console.log('📍 Test 1: 월별 분기 매핑');
  const testMonths = [
    { year: 2026, month: 1, expected: 4, expectedYear: 2025 },  // 1월 → 2025년 4분기
    { year: 2026, month: 2, expected: 1, expectedYear: 2026 },  // 2월 → 2026년 1분기
    { year: 2026, month: 4, expected: 1, expectedYear: 2026 },  // 4월 → 2026년 1분기
    { year: 2026, month: 5, expected: 2, expectedYear: 2026 },  // 5월 → 2026년 2분기
    { year: 2026, month: 7, expected: 2, expectedYear: 2026 },  // 7월 → 2026년 2분기
    { year: 2026, month: 8, expected: 3, expectedYear: 2026 },  // 8월 → 2026년 3분기
    { year: 2026, month: 10, expected: 3, expectedYear: 2026 }, // 10월 → 2026년 3분기
    { year: 2026, month: 11, expected: 4, expectedYear: 2026 }, // 11월 → 2026년 4분기
    { year: 2026, month: 12, expected: 4, expectedYear: 2026 }, // 12월 → 2026년 4분기
  ];

  testMonths.forEach(({ year, month, expected, expectedYear }) => {
    const info = getQuarterInfo(year, month);
    const pass =
      info.quarter === expected && info.year === expectedYear
        ? '✅'
        : '❌';
    console.log(
      `${pass} ${year}년 ${month}월 → ${info.label} (기대: ${expectedYear}년 ${expected}분기)`
    );
  });

  // Test 2: 분기 key 파싱
  console.log('\n📍 Test 2: 분기 key 파싱');
  const testKeys = ['2026_Q1', '2026_Q2', '2026_Q3', '2026_Q4'];
  testKeys.forEach((key) => {
    try {
      const info = parseQuarterKey(key);
      console.log(`✅ ${key} → ${info.label}`);
    } catch (e) {
      console.log(`❌ ${key} → 파싱 실패`);
    }
  });

  // Test 3: 이전 분기 계산
  console.log('\n📍 Test 3: 이전 분기 계산');
  const q1_2026 = getQuarterInfo(2026, 2);
  const prevQ1 = getPreviousQuarter(q1_2026);
  console.log(`2026년 1분기의 이전: ${prevQ1.label} (기대: 2025년 4분기)`);

  const q1_2027 = getQuarterInfo(2027, 1);
  const prevQ1_2027 = getPreviousQuarter(q1_2027);
  console.log(`2027년 1분기의 이전: ${prevQ1_2027.label} (기대: 2026년 4분기)`);

  // Test 4: 최근 분기 목록
  console.log('\n📍 Test 4: 최근 분기 목록 (4개)');
  const recent = getRecentQuarters(4);
  recent.forEach((q, idx) => {
    console.log(`  ${idx + 1}. ${q.label}`);
  });

  console.log('\n=== 출석 규칙 테스트 시작 ===\n');

  // Test 5: 단일 분기 상태 계산
  console.log('📍 Test 5: 단일 분기 상태');
  const singleTests = [
    { count: 5, required: 5, expected: 'full' },
    { count: 4, required: 5, expected: 'minus_one' },
    { count: 3, required: 5, expected: 'X' },
  ];

  singleTests.forEach(({ count, required, expected }) => {
    const status = calculateSingleQuarterStatus(count, required);
    const pass = status === expected ? '✅' : '❌';
    console.log(`${pass} ${count}/${required} → ${status} (기대: ${expected})`);
  });

  // Test 6: 두 분기 종합 상태
  console.log('\n📍 Test 6: 두 분기 종합 상태 (5회 기준)');
  const twoQuarterTests = [
    { current: 5, previous: 5, expected: 'full' },
    { current: 4, previous: 5, expected: 'minus_one' },
    { current: 5, previous: 4, expected: 'minus_one' },
    { current: 4, previous: 4, expected: 'X' },
    { current: 3, previous: 5, expected: 'X' },
  ];

  twoQuarterTests.forEach(({ current, previous, expected }) => {
    const status = calculateTwoQuarterStatus(current, previous, 5, 5);
    const pass = status === expected ? '✅' : '❌';
    console.log(
      `${pass} (${current}, ${previous}) → ${status} (기대: ${expected})`
    );
  });

  // Test 7: 전체 상태 결정 로직
  console.log('\n📍 Test 7: 전체 상태 결정 로직');
  const overallTests = [
    { current: 5, previous: undefined, expected: 'full' },
    { current: 4, previous: undefined, expected: 'minus_one' },
    { current: 3, previous: undefined, expected: 'X' },
    { current: 4, previous: 5, expected: 'minus_one' },
    { current: 5, previous: 4, expected: 'minus_one' },
    { current: 4, previous: 4, expected: 'X' },
  ];

  overallTests.forEach(({ current, previous, expected }) => {
    const result = determineOverallStatus(current, previous, 5);
    const pass = result.status === expected ? '✅' : '❌';
    console.log(
      `${pass} (현재: ${current}, 이전: ${previous ?? 'N/A'}) → ${result.status} (기대: ${expected})`
    );
    console.log(`    → ${result.reasoning}`);
  });

  console.log('\n=== 모든 테스트 완료 ===\n');
}

// 테스트 실행 (개발 중에만 사용)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // testQuarterCalculations();
}
