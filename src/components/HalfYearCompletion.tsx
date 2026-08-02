import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttendanceRecord } from '../types';
import { fetchAttendanceSummaryByQuarter } from '../utils/attendanceSummary';
import { getCurrentQuarter } from '../utils/quarters';
import { calculateTwoQuarterStatus } from '../utils/attendanceRules';
import { COLORS } from '../constants/colors';

const halfOptions = [
  { key: 'first', label: '상반기', quarters: [1, 2] },
  { key: 'second', label: '하반기', quarters: [3, 4] },
];

interface HalfYearRecord {
  name: string;
  q1: {
    count: number;
    required: number;
    status: AttendanceRecord['status'];
  };
  q2: {
    count: number;
    required: number;
    status: AttendanceRecord['status'];
  };
  totalCount: number;
  totalRequired: number;
  combinedStatus: 'full' | 'minus_one' | 'X' | '부상';
  isComplete: boolean;
}

const HalfYearCompletion: React.FC = () => {
  const currentQuarter = getCurrentQuarter();
  const currentYear = currentQuarter.year;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedHalf, setSelectedHalf] = useState<'first' | 'second'>('first');
  const [records, setRecords] = useState<HalfYearRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const yearOptions = useMemo(() => {
    return [currentYear, currentYear - 1, currentYear - 2];
  }, [currentYear]);

  useEffect(() => {
    let cancelled = false;

    const loadHalfYear = async () => {
      setIsLoading(true);
      try {
        const selected = halfOptions.find((item) => item.key === selectedHalf)!;
        const [firstQuarter, secondQuarter] = selected.quarters;

        const [firstData, secondData] = await Promise.all([
          fetchAttendanceSummaryByQuarter(selectedYear, firstQuarter),
          fetchAttendanceSummaryByQuarter(selectedYear, secondQuarter),
        ]);

        if (cancelled) return;

        const memberNames = new Set<string>();
        firstData.forEach((r) => memberNames.add(r.name));
        secondData.forEach((r) => memberNames.add(r.name));

        const combined = Array.from(memberNames).map((name) => {
          const firstRecord = firstData.find((r) => r.name === name);
          const secondRecord = secondData.find((r) => r.name === name);

          const q1Count = firstRecord?.attendanceCount || 0;
          const q2Count = secondRecord?.attendanceCount || 0;
          const q1Required = firstRecord?.requiredAttendance || 0;
          const q2Required = secondRecord?.requiredAttendance || 0;
          const q1Status = firstRecord?.status || 'X';
          const q2Status = secondRecord?.status || 'X';

          const totalCount = q1Count + q2Count;
          const totalRequired = q1Required + q2Required;

          let combinedStatus: HalfYearRecord['combinedStatus'];
          if (q1Status === '부상' || q2Status === '부상') {
            combinedStatus = '부상';
          } else {
            combinedStatus = calculateTwoQuarterStatus(q1Count, q2Count, q1Required, q2Required);
          }

          return {
            name,
            q1: {
              count: q1Count,
              required: q1Required,
              status: q1Status,
            },
            q2: {
              count: q2Count,
              required: q2Required,
              status: q2Status,
            },
            totalCount,
            totalRequired,
            combinedStatus,
            isComplete: combinedStatus === 'full' || combinedStatus === 'minus_one',
          };
        });

        combined.sort((a, b) => {
          if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
          if (a.totalCount !== b.totalCount) return b.totalCount - a.totalCount;
          return a.name.localeCompare(b.name, 'ko-KR');
        });

        setRecords(combined);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadHalfYear();
    return () => {
      cancelled = true;
    };
  }, [selectedYear, selectedHalf]);

  const completeCount = records.filter((record) => record.isComplete).length;

  return (
    <div className="half-root">
      <header className="half-header">
        <Link to="/" aria-label="메인 페이지로 이동">
          <img src="/assets/logo_169.jpg" alt="HighStep Logo" className="half-logo" />
        </Link>
        <h2 className="half-title">반기 출석 완료자</h2>
        <p className="half-desc">{selectedYear}년 {selectedHalf === 'first' ? '상반기' : '하반기'} 출석 현황을 확인합니다.</p>
      </header>

      <main className="half-main">
        <div className="half-card half-control-card">
          <div className="half-control-row">
            <label htmlFor="year-select" className="half-control-label">연도</label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="half-select"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}년</option>
              ))}
            </select>
          </div>
          <div className="half-control-row">
            <label className="half-control-label">구간</label>
            <div className="half-segment-buttons">
              {halfOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={selectedHalf === option.key ? 'half-segment-button is-active' : 'half-segment-button'}
                  onClick={() => setSelectedHalf(option.key as 'first' | 'second')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="half-summary">
            <span>{selectedYear}년 {selectedHalf === 'first' ? '상반기' : '하반기'} 완료자</span>
            <strong>{completeCount}명</strong>
          </div>
        </div>

        <div className="half-card half-list-card">
          {isLoading ? (
            <div className="half-loading">
              <div className="half-spinner" />
            </div>
          ) : (
            <table className="half-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>{selectedHalf === 'first' ? '1분기' : '3분기'}</th>
                  <th>{selectedHalf === 'first' ? '2분기' : '4분기'}</th>
                  <th>합계</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.name} className={record.isComplete ? 'half-row-complete' : ''}>
                    <td>{record.name}</td>
                    <td>
                      {record.q1.count}/{record.q1.required}
                      <span className="half-status-tag">{record.q1.status === '부상' ? '부상' : record.q1.status === 'full' ? '✓' : record.q1.status === 'minus_one' ? '△' : 'X'}</span>
                    </td>
                    <td>
                      {record.q2.count}/{record.q2.required}
                      <span className="half-status-tag">{record.q2.status === '부상' ? '부상' : record.q2.status === 'full' ? '✓' : record.q2.status === 'minus_one' ? '△' : 'X'}</span>
                    </td>
                    <td>{record.totalCount}/{record.totalRequired}</td>
                    <td className={record.isComplete ? 'half-complete' : 'half-failed'}>
                      {record.combinedStatus === '부상'
                        ? '부상'
                        : record.combinedStatus === 'full' || record.combinedStatus === 'minus_one'
                          ? '완료'
                          : '미완'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <footer className="half-footer">
        <Link to="/" className="half-nav-btn">홈으로 돌아가기</Link>
      </footer>

      <style>{`
        .half-root {
          min-height: 100vh;
          background: ${COLORS.background};
          color: ${COLORS.textMain};
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif;
          letter-spacing: -0.01em;
          line-height: 1.45;
        }
        .half-header {
          padding: 2rem 1rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
          text-align: center;
        }
        .half-logo {
          width: 96px;
          height: auto;
          margin-bottom: 0.5rem;
        }
        .half-title {
          font-size: 1.3rem;
          font-weight: bold;
          color: ${COLORS.primary};
          margin: 0;
        }
        .half-desc {
          font-size: 0.9rem;
          color: ${COLORS.textSub};
        }
        .half-main {
          width: 100%;
          max-width: 1040px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          box-sizing: border-box;
        }
        .half-card {
          background: ${COLORS.cardBg};
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(227,176,75,0.07);
          padding: 0.95rem;
          width: 100%;
        }
        .half-control-card {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          align-items: center;
          justify-content: space-between;
        }
        .half-control-row {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          flex-wrap: wrap;
        }
        .half-control-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: ${COLORS.textSub};
        }
        .half-select {
          padding: 0.6rem 0.9rem;
          border-radius: 12px;
          border: 1px solid #333;
          background: #111;
          color: #fff;
          font-weight: 700;
          outline: none;
        }
        .half-segment-buttons {
          display: flex;
          gap: 0.5rem;
        }
        .half-segment-button {
          padding: 0.6rem 0.85rem;
          border-radius: 12px;
          border: 1px solid #333;
          background: #111;
          color: ${COLORS.textMain};
          cursor: pointer;
          font-weight: 700;
        }
        .half-segment-button.is-active {
          background: ${COLORS.primary};
          color: #111;
          border-color: ${COLORS.primary};
        }
        .half-summary {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          color: ${COLORS.textMain};
          font-size: 0.9rem;
        }
        .half-summary strong {
          font-size: 1.05rem;
          font-weight: 800;
          color: ${COLORS.primary};
        }
        .half-list-card {
          overflow-x: auto;
        }
        .half-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 640px;
        }
        .half-table th,
        .half-table td {
          padding: 0.7rem 0.7rem;
          border-bottom: 1px solid #333;
          text-align: left;
          vertical-align: middle;
          color: ${COLORS.textMain};
        }
        .half-table thead th {
          color: ${COLORS.textSub};
          font-weight: 700;
        }
        .half-status-tag {
          display: inline-block;
          margin-left: 0.4rem;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
          font-size: 0.75rem;
          color: #fff;
          background: rgba(255,255,255,0.08);
        }
        .half-complete {
          color: #22C55E;
          font-weight: 700;
        }
        .half-failed {
          color: #EF4444;
          font-weight: 700;
        }
        .half-row-complete {
          background: rgba(34,197,94,0.06);
        }
        .half-loading {
          min-height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .half-spinner {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 3px solid rgba(179,179,179,0.35);
          border-top-color: ${COLORS.primary};
          animation: halfSpin 0.9s linear infinite;
        }
        @keyframes halfSpin { to { transform: rotate(360deg); } }
        .half-footer {
          width: 100%;
          max-width: 1040px;
          padding: 0 1rem 1.25rem;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
        }
        .half-nav-btn {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          padding: 0.35rem 0.6rem;
          border-radius: 12px;
          border: 1px solid #333;
          background: #111;
          color: ${COLORS.textMain};
          text-decoration: none;
          font-weight: 500;
          font-size: 0.86rem;
        }
        .half-nav-btn:hover {
          background: #181818;
        }
        @media (max-width: 720px) {
          .half-control-card { flex-direction: column; align-items: stretch; }
          .half-table { min-width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default HalfYearCompletion;
