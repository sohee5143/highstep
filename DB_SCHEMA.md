# DB 스키마 가이드

## 📊 필요한 테이블 구조

분기 시스템을 사용하기 위해 필요한 모든 테이블입니다.

## 1. gyms (체육관)
```sql
CREATE TABLE IF NOT EXISTS gyms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 2. members (부원)
```sql
CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  gender VARCHAR(20),
  type VARCHAR(50),
  required_attendance INT DEFAULT 5,
  base_attendance_count INT DEFAULT 0,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**컬럼 설명**:
- `name`: 부원 이름 (필수)
- `gender`: 성별
- `type`: 부원 유형 (예: '기존', '신입')
- `required_attendance`: 필요 출석 횟수 (기본: 5회)
- `base_attendance_count`: 기본 출석 횟수
- `status`: 상태 (예: '부상', '정상')

## 3. workout_schedule (운동 일정)
```sql
CREATE TABLE IF NOT EXISTS workout_schedule (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  gym_id INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL
);
```

**컬럼 설명**:
- `date`: 운동 날짜
- `gym_id`: 운동 장소 (gyms 테이블 참조)

## 4. sessions (세션)
```sql
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  place VARCHAR(255),
  date DATE,
  season VARCHAR(20),
  workout_schedule_id INT,
  year INT,
  quarter INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (workout_schedule_id) REFERENCES workout_schedule(id) ON DELETE SET NULL
);
```

**컬럼 설명**:
- `place`: 운동 장소명
- `date`: 세션 날짜
- `season`: 분기 (예: '2026-1')
- `workout_schedule_id`: 운동 일정 참조
- `year`: 연도 (분기 시스템)
- `quarter`: 분기 1-4 (분기 시스템)

## 5. member_season_progress (부원 분기별 진행 현황)
```sql
CREATE TABLE IF NOT EXISTS member_season_progress (
  id SERIAL PRIMARY KEY,
  member_id INT NOT NULL,
  season VARCHAR(20) NOT NULL,
  status VARCHAR(50),
  attendance_count INT DEFAULT 0,
  required_attendance INT DEFAULT 5,
  year INT,
  quarter INT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE(member_id, season) WHERE deleted_at IS NULL
);
```

**컬럼 설명**:
- `member_id`: 부원 (members 테이블 참조)
- `season`: 분기 (예: '2026-1')
- `status`: 출석 상태 ('full', 'minus_one', 'X', '부상')
- `attendance_count`: 해당 분기 출석 횟수
- `required_attendance`: 필요 출석 횟수
- `year`: 연도 (분기 시스템)
- `quarter`: 분기 1-4 (분기 시스템)
- `deleted_at`: 소프트 삭제 (NULL이면 유효)

## 6. checkins (출석 기록)
```sql
CREATE TABLE IF NOT EXISTS checkins (
  id SERIAL PRIMARY KEY,
  member_id INT NOT NULL,
  session_id INT NOT NULL,
  kind VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

**컬럼 설명**:
- `member_id`: 출석한 부원
- `session_id`: 세션
- `kind`: 출석 종류 (예: '정규', '25분기 반영')

## 🔑 데이터 관계도

```
gyms (체육관)
  ↓
workout_schedule (운동 일정)
  ↓
sessions (세션) ← checkins (출석 기록)
              ↓
          members (부원)
              ↓
          member_season_progress (분기별 진행 현황)
```

## 📌 분기(Season) 정의

### season 형식
```
'2026-1' = 2026년 1분기
'2026-2' = 2026년 2분기
'2026-3' = 2026년 3분기
'2026-4' = 2026년 4분기
```

### year + quarter 형식
```
year: 2026, quarter: 1 = 2026년 1분기
year: 2026, quarter: 2 = 2026년 2분기
```

### 분기 기간

| 분기 | 월 | 설명 |
|------|-----|------|
| Q1 | 2월, 3월, 4월 | 상반기 시작 |
| Q2 | 5월, 6월, 7월 | 상반기 후반 |
| Q3 | 8월, 9월, 10월 | 하반기 시작 |
| Q4 | 11월, 12월, 1월 | 연말 + 신년 |

⚠️ **주의**: 1월은 이전 연도의 Q4에 속합니다!
```
2025년 1월 → year: 2025, quarter: 4
2025년 2월 → year: 2025, quarter: 1
2026년 1월 → year: 2025, quarter: 4
```

## ✅ 마이그레이션 후 생성되는 추가 객체들

### 함수
- `get_quarter_key(year, quarter)`: "2026_Q1" 형식으로 분기 키 생성

### 뷰
- `member_latest_two_quarters`: 각 부원의 최근 2개 분기 데이터

### 인덱스
- `idx_member_season_progress_year_quarter`: 분기별 조회 최적화
- `idx_sessions_year_quarter`: 세션 분기 조회 최적화
- `idx_member_season_progress_member_year_quarter`: 부원-분기 복합 인덱스

### 트리거
- `trg_set_member_season_progress_year_quarter`: INSERT 시 year/quarter 자동 계산

## 🔍 스키마 검증 쿼리

모든 테이블이 제대로 생성되었는지 확인:

```sql
-- 1. 테이블 존재 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('gyms', 'members', 'workout_schedule', 'sessions', 'member_season_progress', 'checkins')
ORDER BY table_name;

-- 2. member_season_progress 구조 확인
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'member_season_progress'
ORDER BY ordinal_position;

-- 3. 데이터 샘플
SELECT * FROM member_season_progress LIMIT 5;
SELECT * FROM sessions LIMIT 5;
```
