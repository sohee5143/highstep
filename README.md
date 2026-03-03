# highstep-app

하이스텝(HighStep) 클라이밍 동아리의 출석 현황을 조회하고, 관리자가 출석 체크를 기록할 수 있는 React 앱입니다.

## 기술 스택

- React 17 + TypeScript (CRA / react-scripts)
- Supabase (DB 조회/저장)

## 시작하기

### 1) 설치

```bash
npm install
```

### 2) 환경변수 설정 (프론트)

프로젝트 루트에 `.env.local`을 만들고 아래 값을 설정합니다.

```bash
# Supabase (프론트에서 사용: anon key)
REACT_APP_SUPABASE_URL=...
REACT_APP_SUPABASE_ANON_KEY=...

# 관리자 페이지(/#/admin) 진입 PIN
REACT_APP_ADMIN_PIN=1234
```

### 3) 실행

```bash
npm start
```

기본 접속: `http://localhost:3000/#/`

### 4) 빌드

```bash
npm run build
```

`build/`가 생성됩니다.

## 데이터 구성 (Supabase)

프론트 코드는 아래 테이블/컬럼을 사용합니다.

- `members`
   - `id`, `name`, `type`, `gender`, `required_attendance`, `base_attendance_count`, `status`
- `sessions`
   - `id`, `date`, `place`, `season`
- `checkins`
   - `id`(있다면), `member_id`, `session_id`, `kind`

현재 시즌 값은 [src/types/index.ts](src/types/index.ts)에 있는 `CURRENT_SEASON`(예: `2026-1`)과 `sessions.season`을 매칭해서 장소 목록을 구성합니다.

