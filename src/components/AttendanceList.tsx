/**
 * 환경 변수 에러 방지 (process is not defined)
 * 일부 라이브러리에서 브라우저 환경임에도 process를 참조할 때 발생하는 오류를 해결합니다.
 */
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttendanceRecord, PlaceInfo } from '../types';
import { loadAllChecks } from '../utils/localAttendance';
import { fetchAttendanceSummaryByQuarter } from '../utils/attendanceSummary';
import { fetchPlacesForCurrentSeason } from '../utils/places';
import { getCurrentQuarter, getRecentQuarters } from '../utils/quarters';
import { COLORS } from '../constants/colors';

/**
 * 환경 변수 에러 방지 (process is not defined)
 * 일부 라이브러리에서 브라우저 환경임에도 process를 참조할 때 발생하는 오류를 해결합니다.
 * 주의: 'fs', 'path', 'mkdirp'와 같은 Node.js 전용 라이브러리를 임포트하지 않았는지 확인하세요.
 */
if (typeof window !== 'undefined' && typeof (window as any).process === 'undefined') {
  (window as any).process = { env: { NODE_ENV: process.env.NODE_ENV || 'production' } };
}

const AttendanceList: React.FC = () => {
  const checks = loadAllChecks();
  const currentQuarter = getCurrentQuarter();

  const [selectedYear, setSelectedYear] = useState(currentQuarter.year);
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter.quarter);
  const [selectedQuarterInfo, setSelectedQuarterInfo] = useState(currentQuarter);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [dbMemberNames, setDbMemberNames] = useState<string[]>([]);
  const [places, setPlaces] = useState<PlaceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quarterOptions, setQuarterOptions] = useState<Array<{ year: number; quarter: number; label: string }>>([]);

  const extraByName: Record<string, number> = {};
  checks.forEach((c) => {
    extraByName[c.name] = (extraByName[c.name] || 0) + 1;
  });

  const getStatusDisplay = React.useCallback((record: AttendanceRecord, effectiveCount: number) => {
    if (record.status === '부상') {
      return {
        isInjured: true,
        label: '부상',
        isComplete: false,
      };
    }

    // 한 분기 4회는 현재 분기만으로는 완전 통과가 아니라
    // 반기(1-2분기 또는 3-4분기) 기준에서만 예외로 인정됩니다.
    if (effectiveCount >= record.requiredAttendance) {
      return {
        isInjured: false,
        label: '✓',
        isComplete: true,
      };
    }

    if (effectiveCount === record.requiredAttendance - 1) {
      return {
        isInjured: false,
        label: '△',
        isComplete: false,
      };
    }

    return {
      isInjured: false,
      label: 'X',
      isComplete: false,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    
    // 분기 옵션 생성
    const recentQuarters = getRecentQuarters(12); // 최근 12개 분기
    
    // 2026년 1분기 이전 데이터는 표시하지 않음 (필터링)
    const filteredQuarters = recentQuarters.filter(q => q.year >= 2026);

    const options = filteredQuarters.map((q) => ({
      year: q.year,
      quarter: q.quarter,
      label: `${q.label} (${q.months.join(', ')}월)`,
    }));
    
    if (cancelled) return;
    setQuarterOptions(options);
  }, []);

  useEffect(() => {
    // 선택된 분기에 대한 상세 정보 업데이트
    const info = getRecentQuarters(24).find(q => q.year === selectedYear && q.quarter === selectedQuarter);
    if (info) setSelectedQuarterInfo(info);
  }, [selectedYear, selectedQuarter]);

  useEffect(() => {
    let cancelled = false;
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const [data, placeInfos] = await Promise.all([
          fetchAttendanceSummaryByQuarter(selectedYear, selectedQuarter),
          fetchPlacesForCurrentSeason(),
        ]);
        if (cancelled) return;

        // 선택된 분기에 해당하는 월(months)의 장소들만 필터링하여 테이블 컬럼을 구성합니다.
        // 예: 2분기 선택 시 5, 6, 7월 데이터만 화면에 노출됩니다.
        const info = getRecentQuarters(24).find(q => q.year === selectedYear && q.quarter === selectedQuarter);
        const filteredPlaces = !info ? placeInfos : placeInfos.filter(p => {
          if (!p.dateLabel) return true;
          const month = parseInt(p.dateLabel.split('/')[0], 10);
          return info.months.includes(month);
        });

        setRecords(data);
        setDbMemberNames(data.map((r) => r.name));
        setPlaces(filteredPlaces);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [selectedYear, selectedQuarter]);

  const getMonthLabel = React.useCallback((p: PlaceInfo): string => {
    if (!p.dateLabel) return '기타';
    const monthPart = p.dateLabel.split('/')[0];
    const month = Number.parseInt(monthPart, 10);
    if (!Number.isFinite(month)) return '기타';
    return `${month}월`;
  }, []);

  const monthSegments = React.useMemo(() => {

    const segments: Array<{ label: string; count: number }> = [];
    for (const p of places) {
      const label = getMonthLabel(p);
      const last = segments[segments.length - 1];
      if (!last || last.label !== label) {
        segments.push({ label, count: 1 });
      } else {
        last.count += 1;
      }
    }
    return segments;
  }, [places, getMonthLabel]);

  const monthBoundaryByPlace = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    let prev: string | null = null;
    places.forEach((p, idx) => {
      const label = getMonthLabel(p);
      map[p.key] = idx === 0 || label !== prev;
      prev = label;
    });
    return map;
  }, [places, getMonthLabel]);

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
        <div className="list-quarter-selector">
          
          <select
            id="quarter-select"
            className="list-quarter-select"
            value={`${selectedYear}-${selectedQuarter}`}
            onChange={(e) => {
              const [year, quarter] = e.target.value.split('-');
              setSelectedYear(parseInt(year, 10));
              setSelectedQuarter(parseInt(quarter, 10));
            }}
          >
            {quarterOptions.map((opt, idx) => (
              <option key={idx} value={`${opt.year}-${opt.quarter}`}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <h2 className="list-title">{selectedQuarterInfo.label} 출석현황</h2>
        <p className="list-desc">{selectedQuarterInfo.months.join(', ')}월 정기운동 현황을 확인하세요</p>
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
                      <th rowSpan={2}>이름</th>
                      <th rowSpan={2}>출석횟수</th>
                      <th rowSpan={2}>필요출석</th>
                      <th rowSpan={2}>출석확인</th>
                      {monthSegments.map((seg) => (
                        <th key={seg.label} colSpan={seg.count} className="list-month-header">
                          {seg.label}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {places.map((p) => (
                        <th
                          key={p.key}
                          className={monthBoundaryByPlace[p.key] ? 'list-place-header is-boundary' : 'list-place-header'}
                        >
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
                      const statusDisplay = getStatusDisplay(record, effectiveCount);
                      return (
                        <tr key={record.name}>
                          <td className="list-name-cell">{record.name}</td>
                          <td>{effectiveCount}</td>
                          <td>{record.requiredAttendance}</td>
                          <td className={statusDisplay.isInjured ? 'list-status-injured' : (statusDisplay.isComplete ? 'list-status-ok' : 'list-status-bad')}>
                            {statusDisplay.label}
                          </td>
                          {places.map((p) => {
                            const placeKey = p.key;
                            const value = record.records[placeKey];
                                  let display = value === 1 ? '✓' : value || '';
                                  const isAttended = value === 1 || value === '25분기 반영';
                                  
                                  if (value === '25분기 반영') display = '25';

                            return (
                              <td
                                key={placeKey}
                                className={
                                  monthBoundaryByPlace[placeKey]
                                    ? 'list-cell-center is-boundary'
                                          : (isAttended ? 'list-cell-center list-cell-attended' : 'list-cell-center')
                                }
                              >
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
                  const statusDisplay = getStatusDisplay(record, effectiveCount);
                  const placesAttended = places.filter((p) => record.records[p.key]);

                  return (
                    <div key={record.name} className="list-person-card">
                      <div className="list-person-header">
                        <div className="list-person-name">{record.name}</div>
                        <div className="list-person-header-right">
                          <span
                            className={
                              statusDisplay.isInjured
                                ? 'list-count-badge list-count-badge-injured'
                                : (statusDisplay.isComplete
                                  ? 'list-count-badge list-count-badge-ok'
                                  : 'list-count-badge list-count-badge-bad')
                            }
                          >
                            출석 {effectiveCount} / {record.requiredAttendance}
                          </span>
                          <div
                            className={
                              statusDisplay.isInjured
                                ? 'list-status-chip list-status-chip-injured'
                                : (statusDisplay.isComplete
                                  ? 'list-status-chip list-status-chip-ok'
                                  : 'list-status-chip list-status-chip-bad')
                            }
                          >
                            {statusDisplay.label}
                          </div>
                        </div>
                      </div>
                      {placesAttended.length > 0 && (
                        <div className="list-person-places">
                          {placesAttended.map((p) => {
                            const placeKey = p.key;
                            const value = record.records[placeKey];
                            const isQuarter = value === '25분기 반영';
                            return (
                              <div key={placeKey} className="list-person-place-row">
                                <div className="list-person-place-left">
                                  <span className="list-person-place-name">{p.name}</span>
                                  {p.dateLabel && (
                                    <span className="list-person-place-date">{p.dateLabel}</span>
                                  )}
                                </div>
                                {isQuarter && (
                                  <span className="list-place-badge list-place-badge-quarter">
                                    25분기
                                  </span>
                                )}
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
        .list-quarter-selector {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1.2rem 0 0.2rem 0;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          padding: 0.6rem 1.2rem;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .list-quarter-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: ${COLORS.primary};
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .list-quarter-select {
          padding: 0.5rem 2.2rem 0.5rem 1rem;
          border: 1.5px solid #333;
          border-radius: 12px;
          background: #111111;
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          outline: none;
          color-scheme: dark;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23E3B04B' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.8rem center;
        }
        .list-quarter-select:hover {
          background-color: #1a1a1a;
          border-color: ${COLORS.primary};
        }
        .list-quarter-select:focus {
          border-color: ${COLORS.primary};
          box-shadow: 0 0 0 1px ${COLORS.primary}, 0 0 12px rgba(227, 176, 75, 0.1);
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
          margin: 0;
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
          overflow: visible;
        }
        .list-table-wrapper {
          width: 100%;
          overflow-x: auto;
          overflow-y: visible;
        }
        .list-table-wrapper {
          width: 100%;
        }
        .list-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
          --list-sticky-row1-height: 44px;
        }
        .list-table th,
        .list-table td {
          padding: 0.5rem 0.6rem;
          border-bottom: 1px solid #333;
          white-space: nowrap;
        }
        .list-table tbody tr:hover {
          background: #222;
        }
        .list-table th {
          text-align: left;
          font-weight: 600;
          color: ${COLORS.textSub};
          font-size: 0.85rem;
        }
        .list-table thead th {
          position: sticky;
          background: #111;
          z-index: 5;
        }
        .list-table thead tr:first-child th {
          top: 0;
          z-index: 7;
          height: var(--list-sticky-row1-height);
          vertical-align: middle;
        }
        .list-table thead tr:nth-child(2) th {
          top: var(--list-sticky-row1-height);
          z-index: 6;
        }
        .list-month-header {
          text-align: center;
          font-weight: 800;
          color: ${COLORS.primary};
          background: #111;
          vertical-align: middle;
          padding-top: 0.35rem;
          padding-bottom: 0.35rem;
        }
        .list-place-header.is-boundary,
        .list-cell-center.is-boundary {
          border-left: 2px solid #444;
        }
        .list-table tbody tr:nth-child(even) {
          background: #181818;
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
        .list-status-injured {
          color: #F59E0B;
          font-weight: 600;
        }
        .list-date-header {
          display: block;
          font-size: 0.72rem;
          color: ${COLORS.textSub};
          font-weight: 500;
          opacity: 0.95;
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
          gap: 0.75rem;
          margin-bottom: 0.5rem;
          padding-bottom: 0.45rem;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .list-person-name {
          font-weight: 700;
          font-size: 1rem;
        }
        .list-person-header-right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.45rem;
          flex-wrap: wrap;
        }
        .list-count-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 800;
          line-height: 1.2;
          white-space: nowrap;
        }
        .list-count-badge-ok {
          background: rgba(34,197,94,0.14);
          color: #4ADE80;
        }
        .list-count-badge-bad {
          background: rgba(239,68,68,0.14);
          color: #F87171;
        }
        .list-count-badge-injured {
          background: rgba(245,158,11,0.14);
          color: #FBBF24;
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
        .list-status-chip-injured {
          background: rgba(245,158,11,0.12);
          color: #F59E0B;
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
