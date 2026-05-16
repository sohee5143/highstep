-- 분기 시스템 마이그레이션 (테이블 생성 포함)
-- 기존 테이블이 없으면 생성하고, 있으면 year, quarter 컬럼 추가
-- season 형식: '2026-1' → year: 2026, quarter: 1로 파싱

BEGIN;

-- 1. 기본 테이블 생성 (없으면)

-- gyms 테이블
CREATE TABLE IF NOT EXISTS gyms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- members 테이블
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

-- workout_schedule 테이블
CREATE TABLE IF NOT EXISTS workout_schedule (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  gym_id INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL
);

-- sessions 테이블
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

-- member_season_progress 테이블
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

-- checkins 테이블
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

-- 2. member_season_progress 테이블에 year, quarter 컬럼 추가 (없으면)
ALTER TABLE member_season_progress
ADD COLUMN IF NOT EXISTS year INT,
ADD COLUMN IF NOT EXISTS quarter INT;

-- 3. sessions 테이블에 year, quarter 컬럼 추가 (없으면)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS year INT,
ADD COLUMN IF NOT EXISTS quarter INT;

-- 4. 기존 데이터에서 year, quarter 계산 및 업데이트 (member_season_progress)
UPDATE member_season_progress
SET 
  year = COALESCE(year, (regexp_split_to_array(season, '-'))[1]::INT),
  quarter = COALESCE(quarter, (regexp_split_to_array(season, '-'))[2]::INT)
WHERE year IS NULL OR quarter IS NULL;

-- 5. 기존 데이터에서 year, quarter 계산 및 업데이트 (sessions)
UPDATE sessions
SET
  year = COALESCE(year, CASE 
    WHEN season IS NOT NULL THEN (regexp_split_to_array(season, '-'))[1]::INT
    ELSE EXTRACT(YEAR FROM date)::INT
  END),
  quarter = COALESCE(quarter, CASE 
    WHEN season IS NOT NULL THEN (regexp_split_to_array(season, '-'))[2]::INT
    ELSE CASE
      WHEN EXTRACT(MONTH FROM date) IN (2, 3, 4) THEN 1
      WHEN EXTRACT(MONTH FROM date) IN (5, 6, 7) THEN 2
      WHEN EXTRACT(MONTH FROM date) IN (8, 9, 10) THEN 3
      WHEN EXTRACT(MONTH FROM date) IN (11, 12) THEN 4
      WHEN EXTRACT(MONTH FROM date) = 1 THEN 4
      ELSE NULL
    END
  END)
WHERE year IS NULL OR quarter IS NULL;

-- 6. NOT NULL 제약 추가 (테이블이 비어있지 않으면)
-- ALTER TABLE member_season_progress
-- ALTER COLUMN year SET NOT NULL,
-- ALTER COLUMN quarter SET NOT NULL;

-- 7. 새로운 인덱스 추가 (분기별 빠른 조회)
CREATE INDEX IF NOT EXISTS idx_member_season_progress_year_quarter 
  ON member_season_progress(year, quarter);

CREATE INDEX IF NOT EXISTS idx_sessions_year_quarter
  ON sessions(year, quarter);

-- 8. 함수 생성: quarter_key 계산
CREATE OR REPLACE FUNCTION get_quarter_key(p_year INT, p_quarter INT)
RETURNS TEXT AS $$
BEGIN
  RETURN FORMAT('%s_Q%s', p_year, p_quarter);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. 유니크 제약 추가
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_season_progress_member_year_quarter
  ON member_season_progress(member_id, year, quarter)
  WHERE deleted_at IS NULL;

-- 10. 뷰 생성: 최근 2개 분기 데이터 조회용
CREATE OR REPLACE VIEW member_latest_two_quarters AS
SELECT DISTINCT ON (m.id)
  m.id as member_id,
  m.name,
  msp.year,
  msp.quarter,
  msp.attendance_count,
  msp.required_attendance,
  msp.status,
  ROW_NUMBER() OVER (PARTITION BY m.id ORDER BY msp.year DESC, msp.quarter DESC) as quarter_rank
FROM members m
LEFT JOIN member_season_progress msp ON m.id = msp.member_id
WHERE msp.year IS NOT NULL AND msp.quarter IS NOT NULL;

-- 11. 트리거 생성: 새 member_season_progress 삽입 시 year, quarter 자동 계산
CREATE OR REPLACE FUNCTION trg_set_member_season_progress_year_quarter()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.year IS NULL AND NEW.season IS NOT NULL THEN
    NEW.year := (regexp_split_to_array(NEW.season, '-'))[1]::INT;
  END IF;
  IF NEW.quarter IS NULL AND NEW.season IS NOT NULL THEN
    NEW.quarter := (regexp_split_to_array(NEW.season, '-'))[2]::INT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_member_season_progress_year_quarter ON member_season_progress;

CREATE TRIGGER trg_set_member_season_progress_year_quarter
BEFORE INSERT ON member_season_progress
FOR EACH ROW
EXECUTE FUNCTION trg_set_member_season_progress_year_quarter();

COMMIT;

-- 마이그레이션 검증 쿼리
-- SELECT * FROM member_season_progress LIMIT 5;
-- SELECT * FROM sessions LIMIT 5;
