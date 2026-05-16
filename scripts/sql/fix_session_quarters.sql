-- 1. 날짜를 기반으로 분기 정보를 자동으로 계산하는 함수 생성
CREATE OR REPLACE FUNCTION public.fn_fill_session_quarter()
RETURNS TRIGGER AS $$
BEGIN
    -- 1월은 이전 연도의 4분기로 처리 (동아리 규칙 반영)
    IF EXTRACT(MONTH FROM NEW.date) = 1 THEN
        NEW.year := EXTRACT(YEAR FROM NEW.date) - 1;
        NEW.quarter := 4;
    ELSIF EXTRACT(MONTH FROM NEW.date) BETWEEN 2 AND 4 THEN
        NEW.year := EXTRACT(YEAR FROM NEW.date);
        NEW.quarter := 1;
    ELSIF EXTRACT(MONTH FROM NEW.date) BETWEEN 5 AND 7 THEN
        NEW.year := EXTRACT(YEAR FROM NEW.date);
        NEW.quarter := 2;
    ELSIF EXTRACT(MONTH FROM NEW.date) BETWEEN 8 AND 10 THEN
        NEW.year := EXTRACT(YEAR FROM NEW.date);
        NEW.quarter := 3;
    ELSE
        NEW.year := EXTRACT(YEAR FROM NEW.date);
        NEW.quarter := 4;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. sessions 테이블에 트리거 적용 (데이터 추가/수정 시 자동 실행)
CREATE OR REPLACE TRIGGER trg_fill_session_quarter
BEFORE INSERT OR UPDATE OF date ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.fn_fill_session_quarter();