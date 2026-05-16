# 분기 시스템 마이그레이션 가이드

## 📋 개요
이 가이드는 단일 분기 시스템에서 다중 분기 시스템으로 마이그레이션하는 과정을 설명합니다.

## ⚠️ 마이그레이션 전 주의사항
- **백업**: Supabase 콘솔에서 데이터베이스 백업을 먼저 수행하세요.
- **시간**: 마이그레이션은 즉시 적용됩니다 (데이터양에 따라 수 초 소요).
- **다운타임**: 마이그레이션 중 서비스 중단 없음.

## 🚀 마이그레이션 단계

### 1단계: Supabase 콘솔 접속
1. [Supabase 콘솔](https://app.supabase.com)에 로그인
2. 해당 프로젝트 선택
3. 좌측 메뉴에서 "SQL Editor" 클릭

### 2단계: SQL 스크립트 실행
1. "SQL Editor"에서 "+" 버튼으로 새 쿼리 생성
2. [scripts/sql/migrate_to_quarter_system.sql](./scripts/sql/migrate_to_quarter_system.sql) 파일의 전체 내용 복사
3. Supabase SQL Editor에 붙여넣기
4. **"Run" 버튼 클릭**

### 3단계: 마이그레이션 완료 확인

마이그레이션 후 다음을 확인하세요:

```sql
-- 1. member_season_progress에 year, quarter 컬럼 확인
SELECT column_name FROM information_schema.columns 
WHERE table_name='member_season_progress' 
AND column_name IN ('year', 'quarter');

-- 2. 데이터가 올바르게 파싱되었는지 확인
SELECT id, season, year, quarter FROM member_season_progress LIMIT 5;

-- 3. sessions에 year, quarter 컬럼 확인
SELECT id, season, year, quarter FROM sessions LIMIT 5;

-- 4. 인덱스 확인
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('member_season_progress', 'sessions') 
AND indexname LIKE '%year_quarter%';
```

## ✅ 체크리스트

- [ ] Supabase 백업 확인
- [ ] SQL 스크립트 실행 완료
- [ ] 마이그레이션 완료 확인 쿼리 실행
- [ ] 프론트엔드 코드 배포 (선택사항 - 이미 완료됨)

## 📊 마이그레이션 내용

### 추가된 컬럼
- `member_season_progress.year` (INT): 연도
- `member_season_progress.quarter` (INT): 분기 (1-4)
- `sessions.year` (INT): 연도
- `sessions.quarter` (INT): 분기 (1-4)

### 추가된 인덱스
- `idx_member_season_progress_year_quarter`: 분기별 조회 성능
- `idx_sessions_year_quarter`: 세션 분기 조회 성능

### 생성된 함수
- `get_quarter_key(year, quarter)`: "2026_Q1" 형식으로 분기 키 생성

### 생성된 뷰
- `member_latest_two_quarters`: 최근 2개 분기 데이터 조회용

## 🔄 데이터 형식

### season → year + quarter 파싱
```
'2026-1' → year: 2026, quarter: 1
'2026-2' → year: 2026, quarter: 2
'2025-4' → year: 2025, quarter: 4
```

### 분기 정의
- **Q1**: 1월, 2월, 3월 (단, 1월은 이전 년도 Q4)
- **Q2**: 4월, 5월, 6월
- **Q3**: 7월, 8월, 9월
- **Q4**: 10월, 11월, 12월, 1월(다음해로 계산)

## ❓ 문제 발생 시

### 마이그레이션 실패
- 에러 메시지 확인
- 데이터 백업에서 복구
- 관리자에게 문의

### 데이터 손실
- 마이그레이션 전 백업으로 복구 가능

## 📞 지원
마이그레이션 중 문제가 발생하면 개발 팀에 문의하세요.
