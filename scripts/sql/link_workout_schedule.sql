create table member_season_progress (
  id bigint primary key generated always as identity,
  member_id bigint not null,
  season text not null,
  attendance_count int default 0,
  required_attendance int not null,
  debt_carry_forward int default 0,
  current_deficit int default 0,
  status text default 'X',
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(member_id, season),
  foreign key (member_id) references members(id) on delete cascade
);

create index idx_member_season_progress_member_id on member_season_progress(member_id);
create index idx_member_season_progress_season on member_season_progress(season);-- 정기운동 일정(workout_schedule)과 출석 세션(sessions)을 정식 연동하기 위한 마이그레이션
-- 실행 전 기존 데이터 백업을 권장합니다.

begin;

alter table public.workout_schedule
  add column if not exists season text;

update public.workout_schedule
set season = '2026-1'
where season is null;

alter table public.sessions
  add column if not exists workout_schedule_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sessions_workout_schedule_id_fkey'
  ) then
    alter table public.sessions
      add constraint sessions_workout_schedule_id_fkey
      foreign key (workout_schedule_id)
      references public.workout_schedule(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_sessions_workout_schedule_id
  on public.sessions(workout_schedule_id);

create unique index if not exists idx_sessions_unique_workout_schedule
  on public.sessions(workout_schedule_id)
  where workout_schedule_id is not null;

update public.sessions s
set workout_schedule_id = ws.id
from public.workout_schedule ws
join public.gyms g on g.id = ws.gym_id
where s.workout_schedule_id is null
  and s.date = ws.date
  and s.place = g.name;

commit;

-- 출석 현황을 status 컬럼으로 구분 (full / minus_one / X)
begin;

UPDATE public.member_season_progress
SET status = 
  CASE
    WHEN attendance_count >= required_attendance THEN 'full'
    WHEN attendance_count = required_attendance - 1 THEN 'minus_one'
    ELSE 'X'
  END,
  updated_at = now()
WHERE season = '2026-1';

commit;