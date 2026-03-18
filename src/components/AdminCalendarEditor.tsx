import React, { useState, useEffect, useMemo, useRef } from 'react';
import { COLORS } from '../constants/colors';
import { Gym, ScheduleEntry } from '../types';
import { fetchGyms } from '../utils/gyms';
import { fetchScheduleForMonth, addSchedule, deleteSchedule } from '../utils/workoutSchedule';

const AdminCalendarEditor: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedGymId, setSelectedGymId] = useState<number | ''>('');
  const [gymSearch, setGymSearch] = useState('');
  const [gymDropdownOpen, setGymDropdownOpen] = useState(false);
  const gymSearchRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchGyms().then(setGyms);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setSelectedDate(null);
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

  // 달력 셀 배열 계산
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

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (gymSearchRef.current && !gymSearchRef.current.contains(e.target as Node)) {
        setGymDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCellClick = (day: number) => {
    const d = toDateStr(day);
    setSelectedDate((prev) => (prev === d ? null : d));
    setSelectedGymId('');
    setGymSearch('');
    setGymDropdownOpen(false);
  };

  const handleAdd = async () => {
    if (!selectedDate || selectedGymId === '') return;
    setIsSaving(true);
    await addSchedule(selectedDate, Number(selectedGymId));
    const updated = await fetchScheduleForMonth(year, month);
    setSchedule(updated);
    setSelectedGymId('');
    setGymSearch('');
    setGymDropdownOpen(false);
    setIsSaving(false);
  };

  const handleDelete = async (entry: ScheduleEntry) => {
    await deleteSchedule(entry.id);
    setSchedule((prev) => prev.filter((s) => s.id !== entry.id));
  };

  const selectedEntries = selectedDate ? (scheduleByDate[selectedDate] || []) : [];
  const alreadyAddedGymIds = new Set(selectedEntries.map((e) => e.gym_id));
  const availableGyms = gyms.filter((g) => !alreadyAddedGymIds.has(g.id));

  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style>{`
        .ace-card {
          background: ${COLORS.cardBg};
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(227,176,75,0.07);
          padding: 1rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          color: ${COLORS.textMain};
        }
        .ace-nav-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ace-nav-btn {
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
        }
        .ace-nav-btn:hover { background: #333; }
        .ace-month-title {
          font-size: 1rem;
          font-weight: 700;
          color: ${COLORS.textMain};
        }
        .ace-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 4px;
          table-layout: fixed;
        }
        .ace-th {
          text-align: center;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 0;
          color: ${COLORS.textSub};
        }
        .ace-th-sun { color: #dc3545; }
        .ace-td {
          height: 54px;
          border-radius: 8px;
          background: #181818;
          vertical-align: top;
          padding: 4px;
          cursor: pointer;
          transition: background 0.1s;
          position: relative;
        }
        .ace-td:hover { background: #242424; }
        .ace-td-empty { background: transparent; cursor: default; }
        .ace-td-has-event { box-shadow: 0 0 0 1px rgba(227,176,75,0.45); }
        .ace-td-selected { background: rgba(227,176,75,0.15) !important; box-shadow: 0 0 0 1.5px ${COLORS.primary}; }
        .ace-day {
          font-size: 0.75rem;
          font-weight: 600;
          color: ${COLORS.textSub};
        }
        .ace-day-sun { color: #dc3545; }
        .ace-gym-dot {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          object-fit: cover;
          margin-top: 2px;
        }
        .ace-gym-dot-fallback {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          background: ${COLORS.primary};
          color: #111;
          font-size: 0.65rem;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }
        .ace-spinner {
          width: 22px; height: 22px;
          border-radius: 999px;
          border: 3px solid rgba(179,179,179,0.3);
          border-top-color: ${COLORS.primary};
          animation: aceSpin 0.9s linear infinite;
          margin: 1rem auto;
        }
        @keyframes aceSpin { to { transform: rotate(360deg); } }
        .ace-detail-card {
          background: #181818;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .ace-search-box {
          position: relative;
          flex: 1;
        }
        .ace-search-input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.6rem 0.8rem;
          font-size: 0.9rem;
          border: none;
          border-radius: 10px;
          background: #222;
          color: ${COLORS.textMain};
          outline: none;
        }
        .ace-search-input:focus { box-shadow: 0 0 0 2px ${COLORS.primary}; }
        .ace-search-input::placeholder { color: ${COLORS.textSub}; }
        .ace-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #1e1e1e;
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
          max-height: 200px;
          overflow-y: auto;
          z-index: 100;
        }
        .ace-dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          font-size: 0.88rem;
          color: ${COLORS.textMain};
          transition: background 0.1s;
        }
        .ace-dropdown-item:hover { background: #2a2a2a; }
        .ace-dropdown-item-selected { background: rgba(227,176,75,0.15); }
        .ace-dropdown-icon {
          width: 22px; height: 22px;
          border-radius: 4px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .ace-dropdown-fallback {
          width: 22px; height: 22px;
          border-radius: 4px;
          background: ${COLORS.primary};
          color: #111;
          font-size: 0.65rem;
          font-weight: bold;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ace-dropdown-empty {
          padding: 0.6rem 0.75rem;
          font-size: 0.85rem;
          color: ${COLORS.textSub};
        }
        .ace-add-btn {
          padding: 0.55rem;
          font-size: 0.88rem;
          font-weight: bold;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .ace-add-btn:not(:disabled) { background: ${COLORS.primary}; color: #111; }
        .ace-add-btn:disabled { background: #333; color: ${COLORS.textSub}; cursor: not-allowed; }
        .ace-add-btn:not(:disabled):active { transform: scale(0.98); }
        .ace-entry-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: #222;
          border-radius: 8px;
          padding: 0.45rem 0.65rem;
        }
        .ace-entry-icon {
          width: 28px; height: 28px;
          border-radius: 6px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .ace-entry-fallback {
          width: 28px; height: 28px;
          border-radius: 6px;
          background: ${COLORS.primary};
          color: #111;
          font-size: 0.8rem;
          font-weight: bold;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ace-entry-name {
          flex: 1;
          font-size: 0.88rem;
          color: ${COLORS.textMain};
        }
        .ace-del-btn {
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          border: 1px solid ${COLORS.danger};
          background: transparent;
          color: ${COLORS.danger};
          font-size: 0.75rem;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
        }
        .ace-del-btn:hover { background: rgba(239,68,68,0.15); }
      `}</style>

      {/* 달력 카드 */}
      <div className="ace-card">
        <div className="ace-nav-row">
          <button className="ace-nav-btn" onClick={() => navigateMonth(-1)}>‹</button>
          <span className="ace-month-title">{year}년 {month}월</span>
          <button className="ace-nav-btn" onClick={() => navigateMonth(1)}>›</button>
        </div>
        {isLoading ? (
          <div className="ace-spinner" />
        ) : (
          <table className="ace-table">
            <thead>
              <tr>
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                  <th key={d} className={`ace-th${i === 0 ? ' ace-th-sun' : ''}`}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendarCells.map((week, wi) => (
                <tr key={wi}>
                  {week.map((day, di) => {
                    if (!day) return <td key={di} className="ace-td ace-td-empty" />;
                    const dateStr = toDateStr(day);
                    const entries = scheduleByDate[dateStr] || [];
                    const hasEvent = entries.length > 0;
                    const isSelected = selectedDate === dateStr;
                    return (
                      <td
                        key={di}
                        className={`ace-td${hasEvent ? ' ace-td-has-event' : ''}${isSelected ? ' ace-td-selected' : ''}`}
                        onClick={() => handleCellClick(day)}
                      >
                        <div className={`ace-day${di === 0 ? ' ace-day-sun' : ''}`}>{day}</div>
                        {entries.map((e) =>
                          e.gyms?.icon_url ? (
                            <img key={e.id} src={e.gyms.icon_url} alt={e.gyms.name} className="ace-gym-dot" />
                          ) : (
                            <div key={e.id} className="ace-gym-dot-fallback">{e.gyms?.name?.[0]}</div>
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

      {/* 선택 날짜 편집 패널 */}
      {selectedDate && (
        <div className="ace-card">
          <span style={{ fontWeight: 700, color: COLORS.primary, fontSize: '0.95rem' }}>
            {Number(selectedDate.split('-')[1])}월 {Number(selectedDate.split('-')[2])}일 스케줄
          </span>
          <div className="ace-detail-card">
            {/* 기존 배정 목록 */}
            {selectedEntries.length > 0 ? (
              selectedEntries.map((entry) => (
                <div key={entry.id} className="ace-entry-row">
                  {entry.gyms?.icon_url ? (
                    <img src={entry.gyms.icon_url} alt={entry.gyms.name} className="ace-entry-icon" />
                  ) : (
                    <div className="ace-entry-fallback">{entry.gyms?.name?.[0]}</div>
                  )}
                  <span className="ace-entry-name">{entry.gyms?.name}</span>
                  <button className="ace-del-btn" onClick={() => handleDelete(entry)}>삭제</button>
                </div>
              ))
            ) : (
              <span style={{ color: COLORS.textSub, fontSize: '0.85rem' }}>배정된 암장이 없습니다.</span>
            )}

            {/* 암장 추가 */}
            {availableGyms.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                <div className="ace-search-box" ref={gymSearchRef}>
                  <input
                    className="ace-search-input"
                    placeholder="암장 검색..."
                    value={gymSearch}
                    onChange={(e) => { setGymSearch(e.target.value); setGymDropdownOpen(true); setSelectedGymId(''); }}
                    onFocus={() => setGymDropdownOpen(true)}
                  />
                  {gymDropdownOpen && (
                    <div className="ace-dropdown">
                      {availableGyms.filter((g) => g.name.includes(gymSearch)).length === 0 ? (
                        <div className="ace-dropdown-empty">검색 결과 없음</div>
                      ) : (
                        availableGyms
                          .filter((g) => g.name.includes(gymSearch))
                          .map((g) => (
                            <div
                              key={g.id}
                              className={`ace-dropdown-item${selectedGymId === g.id ? ' ace-dropdown-item-selected' : ''}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSelectedGymId(g.id);
                                setGymSearch(g.name);
                                setGymDropdownOpen(false);
                              }}
                            >
                              {g.icon_url ? (
                                <img src={g.icon_url} alt={g.name} className="ace-dropdown-icon" />
                              ) : (
                                <div className="ace-dropdown-fallback">{g.name[0]}</div>
                              )}
                              {g.name}
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="ace-add-btn"
                  onClick={handleAdd}
                  disabled={selectedGymId === '' || isSaving}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isSaving ? '...' : '추가'}
                </button>
              </div>
            )}
            {availableGyms.length === 0 && gyms.length > 0 && (
              <span style={{ color: COLORS.textSub, fontSize: '0.8rem' }}>모든 암장이 배정되었습니다.</span>
            )}
            {gyms.length === 0 && (
              <span style={{ color: COLORS.textSub, fontSize: '0.8rem' }}>먼저 암장을 등록해주세요.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendarEditor;
