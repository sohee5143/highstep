import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PLACES } from '../types';
import { addCheck, removeCheck } from '../utils/localAttendance';
import { supabase } from '../utils/supabaseClient';

const COLORS = {
  primary: '#E3B04B',
  background: '#000000',
  cardBg: '#1A1A1A',
  textMain: '#FFFFFF',
  textSub: '#B3B3B3',
  success: '#22C55E',
  danger: '#EF4444',
};

interface CheckedMember {
  name: string;
  place: string;
  timestamp: number;
}

interface Member {
  id: number;
  name: string;
  type?: string | null;
  gender?: string | null;
}

const AttendanceAdmin: React.FC = () => {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selectedPlace, setSelectedPlace] = useState('');
  const [checkedMembers, setCheckedMembers] = useState<CheckedMember[]>([]);
  const [lastChecked, setLastChecked] = useState<CheckedMember | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('id, name, type, gender')
          .order('name', { ascending: true });

        if (!error && data) {
          setMembers(data as Member[]);
        }
      } catch (err) {
        console.error('Supabase members load failed', err);
      }
    };

    fetchMembers();
    return () => clearInterval(timer);
  }, []);

  const toggleName = (name: string) => {
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handlePlaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPlace(e.target.value);
  };

  const handleCheckAttendance = async () => {
    if (selectedNames.length === 0 || !selectedPlace) return;

    const now = Date.now();
    const newCheckedList: CheckedMember[] = selectedNames.map((name) => ({
      name,
      place: selectedPlace,
      timestamp: now,
    }));

    setCheckedMembers([...checkedMembers, ...newCheckedList]);
    setLastChecked(newCheckedList[newCheckedList.length - 1]);

    // localStorage에도 저장하여 다른 화면에서도 반영되도록 함 (DB 이전 기록 호환)
    newCheckedList.forEach((c) => addCheck(c));

    // Supabase에 공식 출석 기록 저장
    try {
      const ts = new Date(now);
      const isoDate = ts.toISOString().slice(0, 10); // YYYY-MM-DD

      // 1) 선택된 이름들로 members 조회
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, name')
        .in('name', selectedNames);

      if (!members || membersError) {
        console.error('Supabase members lookup failed', membersError);
      } else {
        // 2) 오늘 날짜 + 장소에 해당하는 session 찾기 또는 생성
        let sessionId: number | null = null;
        const { data: existingSessions, error: sessionError } = await supabase
          .from('sessions')
          .select('id')
          .eq('date', isoDate)
          .eq('place', selectedPlace)
          .limit(1);

        if (!sessionError && existingSessions && existingSessions.length > 0) {
          sessionId = existingSessions[0].id as number;
        } else {
          const { data: newSession, error: newSessionError } = await supabase
            .from('sessions')
            .insert([
              {
                date: isoDate,
                place: selectedPlace,
                season: '2026-1',
              },
            ]);

          if (!newSession || newSessionError) {
            console.error('Supabase session insert failed', newSessionError);
          } else {
            sessionId = (newSession as any).id as number;
          }
        }

        if (sessionId) {
          // 3) 각 멤버에 대해 이미 동일 member/session 출석이 있는지 확인 후 없으면 insert
          for (const m of members as any[]) {
            const memberId = m.id as number;
            const { data: existingChecks, error: existingCheckError } = await supabase
              .from('checkins')
              .select('id')
              .eq('member_id', memberId)
              .eq('session_id', sessionId)
              .limit(1);

            if (existingCheckError) {
              console.error('Supabase checkins lookup failed', existingCheckError);
              continue;
            }

            if (!existingChecks || existingChecks.length === 0) {
              const { error: checkinError } = await supabase
                .from('checkins')
                .insert([
                  {
                    member_id: memberId,
                    session_id: sessionId,
                  },
                ]);

              if (checkinError) {
                console.error('Supabase checkin insert failed', checkinError);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Supabase checkin error', err);
    }

    // Reset selections
    setSelectedNames([]);
    setSelectedPlace('');

    // Auto-hide success feedback after 2 seconds
    setTimeout(() => setLastChecked(null), 2000);
  };

  const isFormValid = selectedNames.length > 0 && selectedPlace;
  const formattedTime = currentTime.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const formattedDate = currentTime.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
    });
  };

  return (
    <div className="admin-root">
      {/* 상단 로고 헤더 */}
      <header className="admin-header">
        <Link to="/" aria-label="메인 페이지로 이동">
          <img src="/assets/logo_169.jpg" alt="HighStep Logo" className="admin-logo" aria-label="동아리 로고" />
        </Link>
      </header>
      {/* 타이틀 및 시간 */}
      <section className="admin-status">
        <h2 className="admin-title">관리자 출석 관리</h2>
        <span className="admin-time">{formattedDate} {formattedTime}</span>
        <span className="admin-count">오늘 체크된 부원: {checkedMembers.length}명</span>
      </section>
      {/* 체크 성공 메시지 */}
      {lastChecked && (
        <div className="admin-card admin-success-card">
          <span className="admin-success-title">✓ {lastChecked.name}님이 {lastChecked.place}에 출석 체크되었습니다</span>
        </div>
      )}
      {/* 출석 폼 카드 */}
      <main className="admin-main">
        <div className="admin-card admin-form-card">
          <label className="admin-label">부원 선택</label>
          <div className="admin-member-list" aria-label="부원 선택 목록">
            {members.map((member) => {
              const checked = selectedNames.includes(member.name);
              return (
                <label
                  key={member.id}
                  className={
                    'admin-member-item' + (checked ? ' admin-member-item-selected' : '')
                  }
                >
                  <input
                    type="checkbox"
                    className="admin-member-checkbox"
                    checked={checked}
                    onChange={() => toggleName(member.name)}
                  />
                  <span className="admin-member-name">{member.name}</span>
                  <span className="admin-member-meta">
                    {member.gender === '남' ? '남' : '여'} · {member.type === '기존' ? '기존부원' : '신입'}
                  </span>
                </label>
              );
            })}
          </div>
          <label htmlFor="place-select" className="admin-label">운동 장소</label>
          <select
            id="place-select"
            value={selectedPlace}
            onChange={handlePlaceChange}
            aria-label="운동 장소 선택"
            className="admin-select"
          >
            <option value="">📍 운동 장소를 선택하세요</option>
            {PLACES.map((place) => (
              <option key={place} value={place}>
                {place}
              </option>
            ))}
          </select>
          <button
            onClick={handleCheckAttendance}
            disabled={!isFormValid}
            aria-label="출석 체크 완료"
            className={"admin-btn" + (!isFormValid ? " disabled" : "")}
          >
            {isFormValid ? '✓ 출석 체크' : '부원과 장소를 선택하세요'}
          </button>
        </div>
        {/* 최근 체크 리스트 카드 */}
        {checkedMembers.length > 0 && (
          <div className="admin-card admin-list-card">
            <span className="admin-list-title">오늘 체크된 부원 ({checkedMembers.length})</span>
            <div className="admin-list-items">
              {checkedMembers.slice().reverse().map((member, idx) => (
                <div key={idx} className="admin-list-item">
                  <div className="admin-list-left">
                    <span className="admin-list-name">{member.name}</span>
                    <span className="admin-list-place">{member.place}{formatDate(member.timestamp)}</span>
                  </div>
                  <button
                    type="button"
                    className="admin-list-cancel"
                    onClick={async () => {
                      // UI에서 제거
                      setCheckedMembers((prev) =>
                        prev.filter(
                          (m) =>
                            !(
                              m.name === member.name &&
                              m.place === member.place &&
                              m.timestamp === member.timestamp
                            )
                        )
                      );

                      // localStorage에서 제거 (JSON-only/과거 데이터용)
                      removeCheck(member);

                      // Supabase에서도 가능하면 삭제
                      try {
                        const ts = new Date(member.timestamp);
                        const isoDate = ts.toISOString().slice(0, 10);

                        const { data: dbMember, error: memberError } = await supabase
                          .from('members')
                          .select('id')
                          .eq('name', member.name)
                          .limit(1);

                        if (!memberError && dbMember && (dbMember as any[]).length > 0) {
                          const memberId = (dbMember as any[])[0].id as number;

                          const { data: sessions, error: sessionError } = await supabase
                            .from('sessions')
                            .select('id')
                            .eq('date', isoDate)
                            .eq('place', member.place)
                            .limit(1);

                          if (!sessionError && sessions && sessions.length > 0) {
                            const sessionId = sessions[0].id as number;
                            await supabase
                              .from('checkins')
                              .delete()
                              .eq('member_id', memberId)
                              .eq('session_id', sessionId);
                          }
                        }
                      } catch (err) {
                        console.error('Supabase checkin delete error', err);
                      }
                    }}
                  >
                    취소
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      {/* 스타일 */}
      <style>{`
        .admin-root {
          min-height: 100vh;
          background: ${COLORS.background};
          display: flex;
          flex-direction: column;
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif;
        }
        .admin-header {
          padding: 2rem 0 1rem 0;
          background: transparent;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .admin-logo {
          width: 96px;
          height: auto;
          display: block;
        }
        .admin-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          color: ${COLORS.textMain};
        }
        .admin-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: ${COLORS.primary};
        }
        .admin-time {
          font-size: 1rem;
          color: ${COLORS.textSub};
        }
        .admin-count {
          font-size: 1rem;
          color: ${COLORS.primary};
        }
        .admin-main {
          flex: 1;
          padding: 1rem 0.5rem 5.5rem 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          align-items: center;
        }
        .admin-card {
          background: ${COLORS.cardBg};
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(227,176,75,0.07);
          padding: 1.2rem 1.2rem;
          width: 100%;
          max-width: 480px;
          color: ${COLORS.textMain};
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .admin-form-card {
          gap: 0.7rem;
        }
        .admin-label {
          font-weight: 500;
          color: ${COLORS.textMain};
        }
        .admin-member-list {
          max-height: 260px;
          overflow-y: auto;
          background: #181818;
          border-radius: 12px;
          padding: 0.4rem 0.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .admin-member-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.6rem;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s, transform 0.05s;
        }
        .admin-member-item:hover {
          background: #222;
        }
        .admin-member-item-selected {
          background: #262015;
          box-shadow: 0 0 0 1px rgba(227,176,75,0.6);
        }
        .admin-member-checkbox {
          width: 16px;
          height: 16px;
          accent-color: ${COLORS.primary};
        }
        .admin-member-name {
          font-size: 0.95rem;
          font-weight: 500;
          color: ${COLORS.textMain};
        }
        .admin-member-meta {
          font-size: 0.8rem;
          color: ${COLORS.textSub};
        }
        .admin-select {
          width: 100%;
          padding: 0.8rem 1rem;
          font-size: 1rem;
          border: none;
          border-radius: 12px;
          background: #222;
          color: ${COLORS.textMain};
          outline: none;
        }
        .admin-select:focus {
          box-shadow: 0 0 0 2px ${COLORS.primary};
        }
        .admin-btn {
          padding: 0.8rem 1.2rem;
          font-size: 1rem;
          font-weight: bold;
          background: ${COLORS.primary};
          color: #111111;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .admin-btn:active {
          background: #C8922E;
          transform: scale(0.98);
        }
        .admin-btn.disabled {
          background: #181818;
          color: ${COLORS.textSub};
          cursor: not-allowed;
        }
        .admin-success-card {
          background: #181818;
          color: ${COLORS.success};
          border-radius: 16px;
          padding: 1.2rem 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: center;
        }
        .admin-success-title {
          font-size: 1.1rem;
          font-weight: bold;
        }
        .admin-list-card {
          gap: 0.7rem;
        }
        .admin-list-title {
          font-size: 1rem;
          color: ${COLORS.primary};
          font-weight: bold;
        }
        .admin-list-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .admin-list-item {
          background: #181818;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.7rem;
          color: ${COLORS.success};
          font-size: 0.95rem;
        }
        .admin-list-left {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .admin-list-name {
          font-weight: 500;
        }
        .admin-list-place {
          color: ${COLORS.textMain};
        }
        .admin-list-badge {
          font-size: 0.9rem;
          color: ${COLORS.primary};
          font-weight: bold;
        }
        .admin-list-cancel {
          margin-left: auto;
          padding: 0.25rem 0.7rem;
          border-radius: 999px;
          border: 1px solid ${COLORS.danger};
          background: transparent;
          color: ${COLORS.danger};
          font-size: 0.8rem;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, color 0.15s, transform 0.05s;
        }
        .admin-list-cancel:hover {
          background: rgba(239,68,68,0.18);
        }
        .admin-list-cancel:active {
          transform: scale(0.96);
        }
        @media (min-width: 600px) {
          .admin-root { align-items: center; }
          .admin-header, .admin-main { max-width: 480px; width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default AttendanceAdmin;
