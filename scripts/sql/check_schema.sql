-- 현재 DB 스키마 확인
-- 이 쿼리를 먼저 실행해서 어떤 테이블이 있는지 확인하세요

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
