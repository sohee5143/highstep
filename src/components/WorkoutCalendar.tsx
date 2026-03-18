import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ScheduleEntry } from '../types';
import { fetchScheduleForMonth } from '../utils/workoutSchedule';
import { COLORS } from '../constants/colors';

const WorkoutCalendar: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
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

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div style={{ padding: '0 0.5rem' }}>
      <style>{`
        .wc-wrap {
          background: ${COLORS.cardBg};
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(227,176,75,0.07);
          padding: 1rem;
          overflow: visible;
          position: relative;
        }
        .wc-nav-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.65rem;
        }
        .wc-nav-btn {
          background: #222;
          border: none;
          color: ${COLORS.textMain};
          font-size: 1.2rem;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .wc-nav-btn:hover { background: #333; }
        .wc-nav-btn:active { background: #2a2a2a; }
        .wc-month-title {
          font-size: 1rem;
          font-weight: 700;
          color: ${COLORS.textMain};
          letter-spacing: -0.01em;
        }
        .wc-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 3px;
          table-layout: fixed;
        }
        .wc-th {
          text-align: center;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 0 6px;
          color: ${COLORS.textSub};
        }
        .wc-th-sun { color: #dc3545; }
        .wc-th-sat { color: #5b9cf6; }
        .wc-td {
          background: #111;
          border-radius: 8px;
          padding: 5px 3px 4px;
          height: 58px;
          vertical-align: top;
          position: relative;
          cursor: default;
        }
        .wc-td-empty { background: transparent; cursor: default; }
        .wc-td-event { box-shadow: 0 0 0 1px rgba(227,176,75,0.35); }
        .wc-td-today {
          box-shadow: 0 0 0 1.5px ${COLORS.primary};
          background: rgba(227,176,75,0.08);
        }
        .wc-day {
          font-size: 0.72rem;
          font-weight: 600;
          color: ${COLORS.textSub};
          text-align: center;
          line-height: 1;
          margin-bottom: 3px;
        }
        .wc-day-sun { color: #dc3545; }
        .wc-day-sat { color: #5b9cf6; }
        .wc-day-today { color: ${COLORS.primary}; }
        .wc-icons {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .wc-gym-entry {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          width: 100%;
        }
        .wc-gym-icon {
          width: 26px;
          height: 26px;
          border-radius: 5px;
          object-fit: cover;
          display: block;
        }
        .wc-gym-fallback {
          width: 26px;
          height: 26px;
          border-radius: 5px;
          background: ${COLORS.primary};
          color: #111;
          font-size: 0.65rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wc-gym-name {
          font-size: 0.5rem;
          color: ${COLORS.textSub};
          text-align: center;
          line-height: 1.2;
          word-break: keep-all;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          width: 100%;
        }
        .wc-spinner {
          width: 24px; height: 24px;
          border-radius: 999px;
          border: 3px solid rgba(179,179,179,0.2);
          border-top-color: ${COLORS.primary};
          animation: wcSpin 0.9s linear infinite;
          margin: 2rem auto;
        }
        @keyframes wcSpin { to { transform: rotate(360deg); } }
        @media (max-width: 390px) {
          .wc-td { height: 62px; padding: 4px 2px 3px; }
          .wc-gym-icon, .wc-gym-fallback { width: 22px; height: 22px; }
          .wc-day { font-size: 0.67rem; }
          .wc-gym-name { font-size: 0.45rem; }
        }
      `}</style>

      <div
        className="wc-wrap"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="wc-nav-row">
          <button className="wc-nav-btn" onClick={() => navigateMonth(-1)}>‹</button>
          <span className="wc-month-title">{year}년 {month}월 정기운동</span>
          <button className="wc-nav-btn" onClick={() => navigateMonth(1)}>›</button>
        </div>

        {isLoading ? (
          <div className="wc-spinner" />
        ) : (
          <table className="wc-table">
            <thead>
              <tr>
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                  <th
                    key={d}
                    className={`wc-th${i === 0 ? ' wc-th-sun' : i === 6 ? ' wc-th-sat' : ''}`}
                  >
                    {d}
                  </th>
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
                    const isToday = dateStr === todayStr;
                    const tdClass = [
                      'wc-td',
                      hasEvent ? 'wc-td-event' : '',
                      isToday ? 'wc-td-today' : '',
                    ].filter(Boolean).join(' ');
                    const dayClass = [
                      'wc-day',
                      di === 0 ? 'wc-day-sun' : di === 6 ? 'wc-day-sat' : '',
                      isToday ? 'wc-day-today' : '',
                    ].filter(Boolean).join(' ');
                    return (
                      <td key={di} className={tdClass}>
                        <div className={dayClass}>{day}</div>
                        <div className="wc-icons">
                          {entries.map((entry) => (
                            <div key={entry.id} className="wc-gym-entry">
                              {entry.gyms?.icon_url ? (
                                <img
                                  src={entry.gyms.icon_url}
                                  alt={entry.gyms.name}
                                  className="wc-gym-icon"
                                />
                              ) : (
                                <div className="wc-gym-fallback">
                                  {entry.gyms?.name?.[0]}
                                </div>
                              )}
                              <span className="wc-gym-name">{entry.gyms?.name}</span>
                            </div>
                          ))}
                        </div>
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
