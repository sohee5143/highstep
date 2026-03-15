import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ScheduleEntry } from '../types';
import { fetchScheduleForMonth } from '../utils/workoutSchedule';

const WorkoutCalendar: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchScheduleForMonth(year, month).then((data) => {
      if (!cancelled) { setSchedule(data); setIsLoading(false); }
    });
    return () => { cancelled = true; };
  }, [year, month]);

  const navigateMonth = (delta: number) => {
    setMonth((m) => {
      const next = m + delta;
      if (next < 1) { setYear((y) => y - 1); return 12; }
      if (next > 12) { setYear((y) => y + 1); return 1; }
      return next;
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      navigateMonth(dx < 0 ? 1 : -1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // 달력 셀 배열
  const calendarCells = useMemo(() => {
    const firstDow = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = [
      ...Array(firstDow).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [year, month]);

  // 날짜별 스케줄 맵
  const scheduleByDate = useMemo(() => {
    const map: Record<string, ScheduleEntry[]> = {};
    schedule.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [schedule]);

  const toDateStr = (day: number) =>
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <div style={{ margin: '0 0.5rem' }}>
      <style>{`
        .wc-container {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          padding: 0.75rem 0.75rem 1rem;
          box-shadow: 0 2px 12px rgba(0,0,0,0.18);
        }
        .wc-nav-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        .wc-nav-btn {
          background: #f0f0f0;
          border: none;
          color: #333;
          font-size: 1.1rem;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .wc-nav-btn:hover { background: #e0e0e0; }
        .wc-month-title {
          font-size: 1rem;
          font-weight: 600;
          color: #333;
          letter-spacing: -0.01em;
        }
        .wc-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 5px;
          table-layout: fixed;
        }
        .wc-th {
          text-align: center;
          font-size: 0.8rem;
          font-weight: 500;
          padding: 6px 0 4px;
          color: #333;
        }
        .wc-th-sun { color: #dc3545; }
        .wc-td {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 6px;
          height: 96px;
          vertical-align: top;
        }
        .wc-td-event {
          background: #fff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
        .wc-td-empty {
          background: transparent;
        }
        .wc-day {
          font-size: 0.85rem;
          margin-bottom: 4px;
          color: #333;
          font-weight: 500;
        }
        .wc-day-sun { color: #dc3545; }
        .wc-gym-icon {
          width: 32px;
          height: 32px;
          margin: 2px auto 0;
          border-radius: 6px;
          display: block;
          object-fit: cover;
        }
        .wc-gym-fallback {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: #E3B04B;
          color: #111;
          font-size: 0.8rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 2px auto 0;
        }
        .wc-gym-name {
          font-size: 0.6rem;
          font-weight: 600;
          color: #333;
          text-align: center;
          margin-top: 3px;
          line-height: 1.2;
          word-break: keep-all;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .wc-spinner {
          width: 24px; height: 24px;
          border-radius: 999px;
          border: 3px solid rgba(0,0,0,0.12);
          border-top-color: #E3B04B;
          animation: wcSpin 0.9s linear infinite;
          margin: 2rem auto;
        }
        @keyframes wcSpin { to { transform: rotate(360deg); } }
        @media (max-width: 600px) {
          .wc-td { height: 72px; padding: 4px; }
          .wc-gym-icon, .wc-gym-fallback { width: 24px; height: 24px; }
          .wc-gym-name { font-size: 0.52rem; }
        }
      `}</style>

      <div
        className="wc-container"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 월 네비게이션 */}
        <div className="wc-nav-row">
          <button className="wc-nav-btn" onClick={() => navigateMonth(-1)}>‹</button>
          <span className="wc-month-title">{year}년 {month}월</span>
          <button className="wc-nav-btn" onClick={() => navigateMonth(1)}>›</button>
        </div>

        {isLoading ? (
          <div className="wc-spinner" />
        ) : (
          <table className="wc-table">
            <thead>
              <tr>
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                  <th key={d} className={`wc-th${i === 0 ? ' wc-th-sun' : ''}`}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendarCells.map((week, wi) => (
                <tr key={wi}>
                  {week.map((day, di) => {
                    if (!day) return <td key={di} className="wc-td wc-td-empty" />;
                    const dateStr = toDateStr(day);
                    const entries = scheduleByDate[dateStr] || [];
                    const hasEvent = entries.length > 0;
                    return (
                      <td key={di} className={`wc-td${hasEvent ? ' wc-td-event' : ''}`}>
                        <div className={`wc-day${di === 0 ? ' wc-day-sun' : ''}`}>{day}</div>
                        {entries.map((entry) =>
                          entry.gyms?.icon_url ? (
                            <React.Fragment key={entry.id}>
                              <img
                                src={entry.gyms.icon_url}
                                alt={entry.gyms.name}
                                className="wc-gym-icon"
                              />
                              <div className="wc-gym-name">{entry.gyms.name}</div>
                            </React.Fragment>
                          ) : (
                            <React.Fragment key={entry.id}>
                              <div className="wc-gym-fallback">{entry.gyms?.name?.[0]}</div>
                              <div className="wc-gym-name">{entry.gyms?.name}</div>
                            </React.Fragment>
                          )
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default WorkoutCalendar;
