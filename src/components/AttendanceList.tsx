import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttendanceRecord } from '../types';
import { loadAllChecks } from '../utils/localAttendance';
import { fetchAttendanceSummary } from '../utils/attendanceSummary';
import { fetchPlacesForCurrentSeason, PlaceInfo } from '../utils/places';

const COLORS = {
  primary: '#E3B04B',
  background: '#000000',
  cardBg: '#1A1A1A',
  textMain: '#FFFFFF',
  textSub: '#B3B3B3',
};

const AttendanceList: React.FC = () => {
  const checks = loadAllChecks();

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [dbMemberNames, setDbMemberNames] = useState<string[]>([]);
  const [places, setPlaces] = useState<PlaceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const extraByName: Record<string, number> = {};
  checks.forEach((c) => {
    extraByName[c.name] = (extraByName[c.name] || 0) + 1;
  });

  useEffect(() => {
    let cancelled = false;
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const data = await fetchAttendanceSummary();
        if (cancelled) return;
        setRecords(data);
        setDbMemberNames(data.map((r) => r.name));

        const placeInfos = await fetchPlacesForCurrentSeason();
        if (cancelled) return;
        setPlaces(placeInfos);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
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
          {isLoading ? (
            <div className="list-loading" aria-label="데이터 로딩 중">
              <div className="list-spinner" />
            </div>
          ) : (
            <>
              {/* 데스크톱용 테이블 뷰 */}
              <div className="list-table-wrapper list-desktop-only">
                <table className="list-table">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>출석횟수</th>
                      <th>필요출석</th>
                      <th>출석확인</th>
                      {places.map((p) => (
                        <th key={p.name}>
                          {p.name}
                          {p.dateLabel && (
                            <span className="list-date-header"> ({p.dateLabel})</span>
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
                          {places.map((p) => {
                            const place = p.name;
                            const value = record.records[place];
                            const display = value === 1 ? 'O' : value || '';
                            return (
                              <td key={place} className="list-cell-center">
                                {display}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 모바일용 카드 뷰 */}
              <div className="list-mobile-only list-card-list">
                {records.map((record) => {
                  const isDbBacked = dbMemberNames.includes(record.name);
                  const extra = isDbBacked ? 0 : (extraByName[record.name] || 0);
                  const effectiveCount = record.attendanceCount + extra;
                  const placesAttended = places.filter((p) => record.records[p.name]);

                  return (
                    <div key={record.name} className="list-person-card">
                      <div className="list-person-header">
                        <div className="list-person-name">{record.name}</div>
                        <div
                          className={
                            record.status === 'O' || record.status === '정상'
                              ? 'list-status-chip list-status-chip-ok'
                              : 'list-status-chip list-status-chip-bad'
                          }
                        >
                          {record.status}
                        </div>
                      </div>
                      <div className="list-person-meta">
                        <span>
                          출석 {effectiveCount} / {record.requiredAttendance}
                        </span>
                      </div>
                      {placesAttended.length > 0 && (
                        <div className="list-person-places">
                          {placesAttended.map((p) => {
                            const place = p.name;
                            const value = record.records[place];
                            const isQuarter = value === '25분기 반영';
                            return (
                              <div key={place} className="list-person-place-row">
                                <div className="list-person-place-left">
                                  <span className="list-person-place-name">{place}</span>
                                  {p.dateLabel && (
                                    <span className="list-person-place-date">{p.dateLabel}</span>
                                  )}
                                </div>
                                <span
                                  className={
                                    isQuarter
                                      ? 'list-place-badge list-place-badge-quarter'
                                      : 'list-place-badge list-place-badge-check'
                                  }
                                >
                                  {isQuarter ? '25분기' : '✓'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="list-footer" aria-label="페이지 하단">
        <Link to="/" className="list-nav-btn" aria-label="홈으로 돌아가기">
          홈으로 돌아가기
        </Link>
      </footer>
      <style>{`
        .list-root {
          min-height: 100vh;
          background: ${COLORS.background};
          color: ${COLORS.textMain};
          display: flex;
          flex-direction: column;
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif;
          align-items: center;
          letter-spacing: -0.01em;
          line-height: 1.45;
        }
        .list-header {
          padding: 2rem 1rem 1rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          text-align: center;
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
        .list-table-wrapper {
          width: 100%;
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

        /* 모바일 카드 레이아웃 */
        .list-card-list {
          display: none;
          margin-top: 0.5rem;
        }
        .list-person-card {
          border-radius: 12px;
          border: 1px solid #333;
          padding: 0.75rem 0.9rem;
          margin-bottom: 0.75rem;
          background: #111;
        }
        .list-person-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }
        .list-person-name {
          font-weight: 700;
          font-size: 1rem;
        }
        .list-status-chip {
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .list-status-chip-ok {
          background: rgba(34,197,94,0.12);
          color: #22C55E;
        }
        .list-status-chip-bad {
          background: rgba(239,68,68,0.12);
          color: #EF4444;
        }
        .list-person-meta {
          font-size: 0.8rem;
          color: ${COLORS.textSub};
          margin-bottom: 0.4rem;
        }
        .list-person-places {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          margin-top: 0.2rem;
        }
        .list-person-place-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .list-person-place-left {
          display: flex;
          align-items: baseline;
          gap: 0.35rem;
        }
        .list-person-place-name {
          font-size: 0.85rem;
        }
        .list-person-place-date {
          font-size: 0.75rem;
          color: ${COLORS.textSub};
        }
        .list-place-badge {
          min-width: 2.1rem;
          text-align: center;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
        }
        .list-place-badge-check {
          background: rgba(34,197,94,0.18);
          color: #4ADE80;
        }
        .list-place-badge-quarter {
          background: rgba(234,179,8,0.18);
          color: #FACC15;
        }

        .list-desktop-only {
          display: block;
        }
        .list-mobile-only {
          display: none;
        }
        .list-loading {
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .list-spinner {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 3px solid rgba(179,179,179,0.35);
          border-top-color: ${COLORS.primary};
          animation: listSpin 0.9s linear infinite;
        }
        @keyframes listSpin {
          to { transform: rotate(360deg); }
        }

        .list-footer {
          width: 100%;
          max-width: 960px;
          padding: 0 1rem 1.25rem 1rem;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
        }
        .list-nav-btn {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          padding: 0.4rem 0.65rem;
          border-radius: 12px;
          border: 1px solid #333;
          background: #111;
          color: ${COLORS.textMain};
          text-decoration: none;
          font-weight: 500;
          font-size: 0.86rem;
          white-space: nowrap;
          line-height: 1.2;
        }
        .list-nav-btn:hover {
          background: #181818;
        }

        @media (max-width: 600px) {
          .list-title {
            font-size: 1.1rem;
          }
          .list-desc {
            font-size: 0.85rem;
          }
          .list-card {
            padding: 0.75rem;
            overflow-x: visible;
          }
          .list-table-wrapper.list-desktop-only {
            display: none;
          }
          .list-mobile-only.list-card-list {
            display: block;
          }
        }
      `}</style>
    </div>
  );
};

export default AttendanceList;
