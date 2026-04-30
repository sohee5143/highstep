-- 현재 member_season_progress 데이터 확인
SELECT 
  msp.member_id,
  m.name,
  msp.attendance_count,
  msp.required_attendance,
  msp.status,
  msp.season
FROM public.member_season_progress msp
JOIN public.members m ON m.id = msp.member_id
WHERE msp.season = '2026-1'
ORDER BY m.name;
