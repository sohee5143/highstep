import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttendanceRecord, PLACES } from '../types';
import { loadAllChecks } from '../utils/localAttendance';
import { supabase } from '../utils/supabaseClient';

const COLORS = {
  primary: '#E3B04B',
  background: '#000000',
  cardBg: '#1A1A1A',
  textMain: '#FFFFFF',
  textSub: '#B3B3B3',
};

const PLACE_DATES_FEB: Record<string, string> = {
  '강동 알레': '2/2',
  '신환회(종숲)': '2/7',
  '강남 클팍': '2/10',
  '성수 더클': '2/13',
  '천호 온플릭': '2/15',
  '수원킨디': '2/18',
  '을지로 손상원': '2/23',
  '이수 더클': '2/26',
  '연남 더클': '2/28',
};

const AttendanceList: React.FC = () => {
  const checks = loadAllChecks();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [dbMemberNames, setDbMemberNames] = useState<string[]>([]);

  const extraByName: Record<string, number> = {};
  checks.forEach((c) => {
    extraByName[c.name] = (extraByName[c.name] || 0) + 1;
  });

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data: members, error } = await supabase
          .from('members')
          .select('id, name, type, gender, required_attendance, base_attendance_count, status');

        if (error || !members || members.length === 0) return;

        const { data: checkins, error: checkinsError } = await supabase
          .from('checkins')
          .select('member_id, session_id');

        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id, place');

        const sessionPlaceById: Record<number, string> = {};
        if (!sessionsError && sessions) {
          (sessions as any[]).forEach((s) => {
            sessionPlaceById[s.id as number] = s.place as string;
          });
        }

        const extraByMemberId: Record<number, number> = {};
        const perMemberPlace: Record<number, Record<string, number>> = {};
        if (!checkinsError && checkins) {
          (checkins as any[]).forEach((c) => {
            const mid = c.member_id as number;
            extraByMemberId[mid] = (extraByMemberId[mid] || 0) + 1;
            const sid = c.session_id as number;
            const place = sessionPlaceById[sid];
            if (place) {
              if (!perMemberPlace[mid]) perMemberPlace[mid] = {};
              perMemberPlace[mid][place] = 1;
            }
          });
        }
        const merged: AttendanceRecord[] = (members as any[]).map((m) => {
          const mid = m.id as number;
          const baseAttendance = m.base_attendance_count ?? 0;
          const extraDb = extraByMemberId[mid] || 0;
          return {
            type: m.type ?? '',
            gender: m.gender ?? '',
            name: m.name,
            requiredAttendance: m.required_attendance ?? 0,
            attendanceCount: baseAttendance + extraDb,
            status: m.status ?? 'X',
            records: perMemberPlace[mid] ?? {},
          } as AttendanceRecord;
        });

        setRecords(merged);
        setDbMemberNames(members.map((m: any) => m.name as string));
      } catch {
        // DB 문제 시 조용히 빈 상태 유지
      }
    };

    fetchMembers();
  }, []);

  return (
    <div className="list-root">
      <header className="list-header">
        <Link to="/" aria-label="메인 페이지로 이동">
          <img
            src="/assets/logo_169.jpg"
            alt="HighStep Logo"
            className="list-logo"
            aria-label="동아리 로고"
          />
        </Link>
        <h2 className="list-title">2026년 상반기(2월, 3월, 4월) 출석현황</h2>
        <p className="list-desc">정기운동 출석을 한눈에 확인하세요</p>
      </header>
      <main className="list-main">
        <div className="list-card">
          <table className="list-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>출석횟수</th>
                <th>필요출석</th>
                <th>출석확인</th>
                {PLACES.map((place) => (
                  <th key={place}>
                    {place}
                    {PLACE_DATES_FEB[place] && (
                      <span className="list-date-header"> ({PLACE_DATES_FEB[place]})</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const isDbBacked = dbMemberNames.includes(record.name);
                const extra = isDbBacked ? 0 : (extraByName[record.name] || 0);
                const effectiveCount = record.attendanceCount + extra;
                return (
                  <tr key={record.name}>
                    <td className="list-name-cell">{record.name}</td>
                    <td>{effectiveCount}</td>
                    <td>{record.requiredAttendance}</td>
                    <td className={record.status === 'O' || record.status === '정상' ? 'list-status-ok' : 'list-status-bad'}>
                      {record.status}
                    </td>
                    {PLACES.map((place) => (
                      <td key={place} className="list-cell-center">
                        {record.records[place] ? record.records[place] : ''}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      <style>{`
        .list-root {
          min-height: 100vh;
          background: ${COLORS.background};
          color: ${COLORS.textMain};
          display: flex;
          flex-direction: column;
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif;
          align-items: center;
        }
        .list-header {
          padding: 2rem 1rem 1rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
        }
        .list-logo {
          width: 96px;
          height: auto;
          margin-bottom: 0.5rem;
        }
        .list-title {
          font-size: 1.4rem;
          font-weight: bold;
          color: ${COLORS.primary};
        }
        .list-desc {
          font-size: 0.95rem;
          color: ${COLORS.textSub};
        }
        .list-main {
          width: 100%;
          max-width: 960px;
          padding: 1rem;
          box-sizing: border-box;
        }
        .list-card {
          background: ${COLORS.cardBg};
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(227,176,75,0.07);
          padding: 1rem;
          overflow-x: auto;
        }
        .list-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .list-table th,
        .list-table td {
          padding: 0.5rem 0.6rem;
          border-bottom: 1px solid #333;
          white-space: nowrap;
        }
        .list-table th {
          text-align: left;
          font-weight: 600;
          color: ${COLORS.textSub};
          font-size: 0.85rem;
        }
        .list-table tbody tr:nth-child(even) {
          background: #181818;
        }
        .list-table tbody tr:hover {
          background: #222;
        }
        .list-cell-center {
          text-align: center;
        }
        .list-name-cell {
          font-weight: 700;
          color: ${COLORS.textMain};
        }
        .list-status-ok {
          color: #22C55E;
          font-weight: 600;
        }
        .list-status-bad {
          color: #EF4444;
          font-weight: 600;
        }
        .list-date-header {
          font-size: 0.75rem;
          color: ${COLORS.textSub};
        }
        @media (max-width: 600px) {
          .list-title {
            font-size: 1.1rem;
          }
          .list-desc {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AttendanceList;
