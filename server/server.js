const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// 환경변수에서 Supabase 설정을 읽습니다.
// 프론트에서는 REACT_APP_SUPABASE_* 만 사용하고,
// 서버에서는 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 사용하도록 분리합니다.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[server] SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.');
}

// 서비스 롤 키는 절대 클라이언트에 노출하지 않고, 오직 이 서버에서만 사용합니다.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// 헬스 체크용 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// 출석 요약 데이터: AttendanceRecord[] 형태로 반환
// 현재 AttendanceList / AttendanceTracker 에서 하던 집계 로직을 서버로 옮긴 버전입니다.
app.get('/api/attendance-summary', async (req, res) => {
  try {
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name, type, gender, required_attendance, base_attendance_count, status');

    if (membersError) {
      console.error('[server] members 조회 실패', membersError);
      return res.status(500).json({ error: 'Failed to load members' });
    }

    const { data: checkins, error: checkinsError } = await supabase
      .from('checkins')
      .select('member_id, session_id, kind');

    if (checkinsError) {
      console.error('[server] checkins 조회 실패', checkinsError);
      return res.status(500).json({ error: 'Failed to load checkins' });
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, place');

    if (sessionsError) {
      console.error('[server] sessions 조회 실패', sessionsError);
      return res.status(500).json({ error: 'Failed to load sessions' });
    }

    const sessionPlaceById = {};
    (sessions || []).forEach((s) => {
      sessionPlaceById[s.id] = s.place;
    });

    const extraByMemberId = {};
    const perMemberPlace = {};

    (checkins || []).forEach((c) => {
      const mid = c.member_id;
      const sid = c.session_id;
      const place = sessionPlaceById[sid];
      const kind = c.kind;

      if (!place) return;

      if (!perMemberPlace[mid]) perMemberPlace[mid] = {};

      if (kind === '25분기 반영') {
        // 25분기 반영은 출석 횟수에는 포함하지 않고 표시만 문자열로 남김
        perMemberPlace[mid][place] = '25분기 반영';
      } else {
        extraByMemberId[mid] = (extraByMemberId[mid] || 0) + 1;
        if (perMemberPlace[mid][place] !== '25분기 반영') {
          perMemberPlace[mid][place] = 1;
        }
      }
    });

    const records = (members || []).map((m) => {
      const mid = m.id;
      const baseAttendance = m.base_attendance_count || 0;
      const extraDb = extraByMemberId[mid] || 0;

      return {
        type: m.type || '',
        gender: m.gender || '',
        name: m.name,
        requiredAttendance: m.required_attendance || 0,
        attendanceCount: baseAttendance + extraDb,
        status: m.status || 'X',
        records: perMemberPlace[mid] || {},
      };
    });

    // 이름 가나다순 정렬 (프론트와 동일하게)
    records.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));

    res.json(records);
  } catch (err) {
    console.error('[server] /api/attendance-summary 오류', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 관리자 화면에서 사용하는 멤버 목록 조회
app.get('/api/members', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, type, gender')
      .order('name', { ascending: true });

    if (error) {
      console.error('[server] /api/members 오류', error);
      return res.status(500).json({ error: 'Failed to load members' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('[server] /api/members 예외', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 관리자 출석 체크용 엔드포인트
app.post('/api/admin/checkins', async (req, res) => {
  const { names, place, timestamp } = req.body || {};

  if (!Array.isArray(names) || !names.length || !place || !timestamp) {
    return res.status(400).json({ error: 'names, place, timestamp are required' });
  }

  try {
    const ts = new Date(timestamp);
    const isoDate = ts.toISOString().slice(0, 10); // YYYY-MM-DD

    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name')
      .in('name', names);

    if (membersError || !members) {
      console.error('[server] admin.checkins members 조회 실패', membersError);
      return res.status(500).json({ error: 'Failed to load members' });
    }

    // 세션 찾기 또는 생성
    let sessionId = null;
    const { data: existingSessions, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('date', isoDate)
      .eq('place', place)
      .limit(1);

    if (!sessionError && existingSessions && existingSessions.length > 0) {
      sessionId = existingSessions[0].id;
    } else {
      const { data: newSession, error: newSessionError } = await supabase
        .from('sessions')
        .insert([{ date: isoDate, place, season: '2026-1' }])
        .select('id')
        .single();

      if (newSessionError || !newSession) {
        console.error('[server] admin.checkins session 생성 실패', newSessionError);
        return res.status(500).json({ error: 'Failed to create session' });
      }

      sessionId = newSession.id;
    }

    // 각 멤버에 대해 기존 체크 여부 확인 후 없으면 insert
    for (const m of members) {
      const memberId = m.id;
      const { data: existingChecks, error: existingCheckError } = await supabase
        .from('checkins')
        .select('id')
        .eq('member_id', memberId)
        .eq('session_id', sessionId)
        .limit(1);

      if (existingCheckError) {
        console.error('[server] admin.checkins checkins 조회 실패', existingCheckError);
        continue;
      }

      if (!existingChecks || existingChecks.length === 0) {
        const { error: checkinError } = await supabase
          .from('checkins')
          .insert([{ member_id: memberId, session_id: sessionId }]);

        if (checkinError) {
          console.error('[server] admin.checkins insert 실패', checkinError);
        }
      }
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[server] /api/admin/checkins 예외', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 출석 취소용 엔드포인트
app.delete('/api/admin/checkins', async (req, res) => {
  const { name, place, timestamp } = req.body || {};

  if (!name || !place || !timestamp) {
    return res.status(400).json({ error: 'name, place, timestamp are required' });
  }

  try {
    const ts = new Date(timestamp);
    const isoDate = ts.toISOString().slice(0, 10);

    const { data: dbMember, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('name', name)
      .limit(1);

    if (memberError || !dbMember || !dbMember.length) {
      console.error('[server] admin.checkins delete members 조회 실패', memberError);
      return res.status(404).json({ error: 'Member not found' });
    }

    const memberId = dbMember[0].id;

    const { data: sessions, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('date', isoDate)
      .eq('place', place)
      .limit(1);

    if (sessionError || !sessions || !sessions.length) {
      console.error('[server] admin.checkins delete sessions 조회 실패', sessionError);
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionId = sessions[0].id;

    const { error: deleteError } = await supabase
      .from('checkins')
      .delete()
      .eq('member_id', memberId)
      .eq('session_id', sessionId);

    if (deleteError) {
      console.error('[server] admin.checkins delete 실패', deleteError);
      return res.status(500).json({ error: 'Failed to delete checkin' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[server] /api/admin/checkins DELETE 예외', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`);
});
