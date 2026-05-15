-- 분기 시스템 마이그레이션
-- 기존 member_season_progress 테이블에 year, quarter 컬럼 추가
-- season 형식: '2026-1' → year: 2026, quarter: 1로 파싱

BEGIN;

-- 1. member_season_progress 테이블에 year, quarter 컬럼 추가
ALTER TABLE member_season_progress
ADD COLUMN IF NOT EXISTS year INT,
ADD COLUMN IF NOT EXISTS quarter INT;

-- 2. 기존 데이터에서 year, quarter 계산 및 업데이트
-- season 형식이 'YYYY-Q' (예: '2026-1') 라고 가정
UPDATE member_season_progress
SET 
  year = (regexp_split_to_array(season, '-'))[1]::INT,
  quarter = (regexp_split_to_array(season, '-'))[2]::INT
WHERE year IS NULL OR quarter IS NULL;

-- 3. NOT NULL 제약 추가
ALTER TABLE member_season_progress
ALTER COLUMN year SET NOT NULL,
ALTER COLUMN quarter SET NOT NULL;

-- 4. 새로운 인덱스 추가 (분기별 빠른 조회)
CREATE INDEX IF NOT EXISTS idx_member_season_progress_year_quarter 
  ON member_season_progress(year, quarter);

-- 5. 함수 생성: quarter_key 계산 (나중에 사용)
-- "2026_Q1" 형식으로 분기 키 생성
CREATE OR REPLACE FUNCTION get_quarter_key(p_year INT, p_quarter INT)
RETURNS TEXT AS $$
BEGIN
  RETURN FORMAT('%s_Q%s', p_year, p_quarter);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. 유니크 제약 변경 (season 대신 year+quarter 기반)
-- 기존 unique(member_id, season) 유지하되, 새로운 인덱스 추가
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_season_progress_member_year_quarter
  ON member_season_progress(member_id, year, quarter)
  WHERE deleted_at IS NULL;

-- 7. sessions 테이블에도 year, quarter 추가 (선택적)
-- season 컬럼이 있다면 동일하게 처리
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS year INT,
ADD COLUMN IF NOT EXISTS quarter INT;

-- season 값이 있는 경우 year, quarter 계산
UPDATE sessions
SET
  year = (CASE 
    WHEN season IS NOT NULL THEN (regexp_split_to_array(season, '-'))[1]::INT
    ELSE EXTRACT(YEAR FROM date)::INT
  END),
  quarter = (CASE 
    WHEN season IS NOT NULL THEN (regexp_split_to_array(season, '-'))[2]::INT
    ELSE CASE
      WHEN EXTRACT(MONTH FROM date) IN (2, 3, 4) THEN 1
      WHEN EXTRACT(MONTH FROM date) IN (5, 6, 7) THEN 2
      WHEN EXTRACT(MONTH FROM date) IN (8, 9, 10) THEN 3
      WHEN EXTRACT(MONTH FROM date) IN (11, 12) THEN 4
      WHEN EXTRACT(MONTH FROM date) = 1 THEN 4
    END
  END)
WHERE year IS NULL OR quarter IS NULL;

-- 8. sessions에도 year, quarter 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_sessions_year_quarter
  ON sessions(year, quarter);

-- 9. 뷰 생성: 최근 2개 분기 데이터 조회용
-- (나중에 출석 규칙 계산에 사용)
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

-- 10. 트리거 생성: 새 member_season_progress 삽입 시 year, quarter 자동 계산
CREATE OR REPLACE FUNCTION trg_set_member_season_progress_year_quarter()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.year IS NULL THEN
    NEW.year := (regexp_split_to_array(NEW.season, '-'))[1]::INT;
  END IF;
  IF NEW.quarter IS NULL THEN
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
-- SELECT * FROM member_season_progress 
-- WHERE year IS NOT NULL AND quarter IS NOT NULL 
-- LIMIT 10;
