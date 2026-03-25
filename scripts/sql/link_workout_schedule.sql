-- 정기운동 일정(workout_schedule)과 출석 세션(sessions)을 정식 연동하기 위한 마이그레이션
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