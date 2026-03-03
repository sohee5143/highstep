import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttendanceRecord } from '../types';
import { loadAllChecks } from '../utils/localAttendance';
import { fetchAttendanceSummary } from '../utils/attendanceSummary';

const COLORS = {
  primary: '#E3B04B',
  background: '#000000',
  cardBg: '#1A1A1A',
  textMain: '#FFFFFF',
  textSub: '#B3B3B3',
};

type RankedRecord = AttendanceRecord & {
  effectiveAttendanceCount: number;
  rank: number;
};

function computeCompetitionRanking(records: AttendanceRecord[]): RankedRecord[] {
  const sorted = [...records]
    .map((r) => ({
      ...r,
      effectiveAttendanceCount: r.attendanceCount || 0,
      rank: 0,
    }))
    .sort((a, b) => {
      const countDiff = (b.effectiveAttendanceCount || 0) - (a.effectiveAttendanceCount || 0);
      if (countDiff !== 0) return countDiff;
      return a.name.localeCompare(b.name, 'ko-KR');
    });

  let lastCount: number | null = null;
  let lastRank = 0;
  sorted.forEach((r, idx) => {
    if (lastCount === null || r.effectiveAttendanceCount !== lastCount) {
      lastRank = idx + 1;
      lastCount = r.effectiveAttendanceCount;
    }
    r.rank = lastRank;
  });

  return sorted;
}

function groupByRank(ranked: RankedRecord[]): Record<number, RankedRecord[]> {
  const groups: Record<number, RankedRecord[]> = {};
  ranked.forEach((r) => {
    if (!groups[r.rank]) groups[r.rank] = [];
    groups[r.rank].push(r);
  });
  return groups;
}

const PodiumColumn: React.FC<{
  rank: 1 | 2 | 3;
  items: RankedRecord[];
}> = ({ rank, items }) => {
  const [expanded, setExpanded] = useState(false);

  const slotClass =
    rank === 1
      ? 'rank-podium-slot is-first'
      : rank === 2
        ? 'rank-podium-slot is-second'
        : 'rank-podium-slot is-third';

  const standClass =
    rank === 1
      ? 'rank-podium-stand rank-podium-stand-first'
      : rank === 2
        ? 'rank-podium-stand rank-podium-stand-second'
        : 'rank-podium-stand rank-podium-stand-third';

  const countLabel = items.length > 0 ? items[0].effectiveAttendanceCount : null;
  const visible = items.slice(0, 3);
  const hidden = items.slice(3);
  const namesClass = expanded ? 'rank-podium-names is-expanded' : 'rank-podium-names';

  return (
    <div className={slotClass} aria-label={`${rank}위`}>
      <div className="rank-podium-person">
        <div className="rank-podium-badge" aria-hidden="true">{rank}</div>
          <div className={namesClass} aria-label={`${rank}위 명단`}>
          {items.length === 0 ? (
            <div className="rank-podium-empty">-</div>
          ) : (
            <>
              {visible.map((r) => (
                <div key={r.name} className="rank-podium-name">
                  {r.name}
                </div>
              ))}

              {hidden.length > 0 && !expanded && (
                <button
                  type="button"
                  className="rank-more-btn"
                  onClick={() => setExpanded(true)}
                  aria-label={`${rank}위 추가 인원 보기`}
                >
                  +{hidden.length}명
                </button>
              )}

              {hidden.length > 0 && expanded && (
                <>
                  {hidden.map((r) => (
                    <div key={r.name} className="rank-podium-name rank-podium-name-more">
                      {r.name}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="rank-more-btn"
                    onClick={() => setExpanded(false)}
                    aria-label={`${rank}위 명단 접기`}
                  >
                    접기
                  </button>
                </>
              )}
            </>
          )}
        </div>
        <div className="rank-podium-count">{countLabel !== null ? `출석 ${countLabel}회` : ''}</div>
      </div>
      <div className={standClass} />
    </div>
  );
};

const AttendanceRank: React.FC = () => {
  const checks = useMemo(() => loadAllChecks(), []);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [dbMemberNames, setDbMemberNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const extraByName = useMemo(() => {
    const map: Record<string, number> = {};
    checks.forEach((c) => {
      map[c.name] = (map[c.name] || 0) + 1;
    });
    return map;
  }, [checks]);

  useEffect(() => {
    let cancelled = false;
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const data = await fetchAttendanceSummary();
        if (cancelled) return;
        setRecords(data);
        setDbMemberNames(data.map((r) => r.name));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveRecords = useMemo(() => {
    return records.map((r) => {
      const isDbBacked = dbMemberNames.includes(r.name);
      const extra = isDbBacked ? 0 : (extraByName[r.name] || 0);
      if (!extra) return r;
      return { ...r, attendanceCount: r.attendanceCount + extra };
    });
  }, [records, dbMemberNames, extraByName]);

  const ranked = useMemo(() => computeCompetitionRanking(effectiveRecords), [effectiveRecords]);
  const grouped = useMemo(() => groupByRank(ranked), [ranked]);

  const top1 = grouped[1] || [];
  const top2 = grouped[2] || [];
  const top3 = grouped[3] || [];

  return (
    <div className="rank-root">
      <header className="rank-header">
        <Link to="/" aria-label="메인 페이지로 이동">
          <img
            src="/assets/logo_169.jpg"
            alt="HighStep Logo"
            className="rank-logo"
            aria-label="동아리 로고"
          />
        </Link>
        <h2 className="rank-title">출석 랭킹</h2>
        <p className="rank-desc">2026년 상반기(2월, 3월, 4월) 정기운동 출석왕</p>
      </header>

      <main className="rank-main">
        <div className="rank-card" aria-label="출석왕 시상대">
          {isLoading ? (
            <div className="rank-loading" aria-label="데이터 로딩 중">
              <div className="rank-spinner" />
            </div>
          ) : (
            <>
              <div className="rank-card-header">
                <div>
                  <div className="rank-card-title-row">
                    <div className="rank-card-title">출석왕 TOP 3</div>
                    <span
                      className="rank-info"
                      title="동률은 공동 순위로 표시됩니다 (예: 1, 1, 1, 4…)"
                      aria-label="동률 안내"
                    >
                      ⓘ
                    </span>
                  </div>
                </div>
                <Link to="/list" className="rank-link" aria-label="전체 출석현황 보기">
                  전체 출석현황
                </Link>
              </div>

              <div className="rank-podium" role="group" aria-label="출석왕 시상대">
                <PodiumColumn rank={2} items={top2} />
                <PodiumColumn rank={1} items={top1} />
                <PodiumColumn rank={3} items={top3} />
              </div>

              <div className="rank-list" aria-label="전체 순위">
                {ranked.length === 0 ? (
                  <div className="rank-empty">랭킹 데이터가 없습니다</div>
                ) : (
                  ranked.map((r) => (
                    <div key={r.name} className="rank-row">
                      <div className="rank-left">
                        <span className="rank-no">{r.rank}</span>
                        <span className="rank-name">{r.name}</span>
                      </div>
                      <div className="rank-right">{r.effectiveAttendanceCount}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <style>{`
        .rank-root {
          min-height: 100vh;
          background: ${COLORS.background};
          color: ${COLORS.textMain};
          display: flex;
          flex-direction: column;
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif;
          align-items: center;
        }
        .rank-header {
          padding: 2rem 1rem 1rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          text-align: center;
        }
        .rank-logo {
          width: 96px;
          height: auto;
          margin-bottom: 0.5rem;
        }
        .rank-title {
          font-size: 1.4rem;
          font-weight: bold;
          color: ${COLORS.primary};
          margin: 0;
        }
        .rank-desc {
          font-size: 0.95rem;
          color: ${COLORS.textSub};
          margin: 0;
        }
        .rank-main {
          width: 100%;
          max-width: 960px;
          padding: 1rem;
          box-sizing: border-box;
        }
        .rank-card {
          background: ${COLORS.cardBg};
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(227,176,75,0.07);
          padding: 1rem;
          overflow: hidden;
        }
        .rank-card-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.8rem;
        }
        .rank-card-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .rank-card-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: ${COLORS.primary};
        }
        .rank-info {
          font-size: 0.85rem;
          color: ${COLORS.textSub};
          cursor: help;
          user-select: none;
          line-height: 1;
        }
        .rank-link {
          font-size: 0.85rem;
          color: ${COLORS.textSub};
          text-decoration: underline;
          white-space: nowrap;
        }
        .rank-podium {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.6rem;
          align-items: end;
          margin-bottom: 0.9rem;
        }
        .rank-podium-slot {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 0.35rem;
          min-width: 0;
        }
        .rank-podium-slot.is-first {
          transform: translateY(-6px);
        }
        .rank-podium-person {
          border: 1px solid #333;
          background: #111;
          border-radius: 12px;
          padding: 0.6rem 0.6rem 0.55rem 0.6rem;
          text-align: center;
          display: flex;
          flex-direction: column;
        }
        .rank-podium-slot.is-first .rank-podium-person {
          min-height: 210px;
          padding: 0.85rem 0.7rem 0.7rem 0.7rem;
        }
        .rank-podium-slot.is-second .rank-podium-person,
        .rank-podium-slot.is-third .rank-podium-person {
          min-height: 180px;
        }
        .rank-podium-slot.is-first .rank-podium-person {
          border-color: rgba(227,176,75,0.6);
          box-shadow: 0 10px 26px rgba(227,176,75,0.10);
          background: linear-gradient(180deg, rgba(227,176,75,0.14), rgba(17,17,17,1) 55%);
        }
        .rank-podium-badge {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          margin: 0 auto 0.35rem auto;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          color: ${COLORS.background};
          background: ${COLORS.primary};
        }
        .rank-podium-slot.is-first .rank-podium-badge {
          width: 46px;
          height: 46px;
          font-size: 1.1rem;
          box-shadow: 0 10px 24px rgba(227,176,75,0.20);
        }
        .rank-podium-names {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-height: 1.1rem;
          padding: 3px 0;
        }
        .rank-podium-names.is-expanded {
          padding-bottom: 0.4rem;
        }
        .rank-podium-name {
          display: block;
          font-weight: 800;
          font-size: 0.95rem;
          line-height: 1.5;
          padding: 2px 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rank-podium-name-more {
          font-weight: 700;
        }
        .rank-more-btn {
          width: 100%;
          border: 1px solid #333;
          background: transparent;
          color: ${COLORS.textSub};
          border-radius: 10px;
          padding: 0.25rem 0.35rem;
          font-size: 0.85rem;
          font-weight: 800;
          cursor: pointer;
        }
        .rank-more-btn:hover {
          background: #181818;
        }
        .rank-podium-empty {
          color: ${COLORS.textSub};
          font-weight: 700;
        }
        .rank-podium-count {
          margin-top: auto;
          padding-top: 0.6rem;
          font-size: 0.82rem;
          color: ${COLORS.textSub};
        }
        .rank-podium-stand {
          border-radius: 12px;
          background: #181818;
          border: 1px solid #333;
        }
        .rank-podium-slot.is-first .rank-podium-stand {
          border-color: rgba(227,176,75,0.55);
          background: linear-gradient(180deg, rgba(227,176,75,0.16), rgba(24,24,24,1));
        }
        .rank-podium-stand-first {
          height: 110px;
        }
        .rank-podium-stand-second {
          height: 72px;
        }
        .rank-podium-stand-third {
          height: 60px;
        }
        .rank-list {
          border-top: 1px solid #333;
          padding-top: 0.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          max-height: 420px;
          overflow: auto;
        }
        .rank-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.45rem 0.5rem;
          border-radius: 10px;
        }
        .rank-row:nth-child(odd) {
          background: #181818;
        }
        .rank-left {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          min-width: 0;
        }
        .rank-no {
          width: 28px;
          text-align: center;
          font-weight: 900;
          color: ${COLORS.primary};
        }
        .rank-name {
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rank-right {
          font-variant-numeric: tabular-nums;
          font-weight: 800;
          color: ${COLORS.textMain};
        }
        .rank-empty {
          padding: 0.75rem 0.5rem;
          color: ${COLORS.textSub};
          text-align: center;
        }
        .rank-loading {
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rank-spinner {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 3px solid rgba(179,179,179,0.35);
          border-top-color: ${COLORS.primary};
          animation: rankSpin 0.9s linear infinite;
        }
        @keyframes rankSpin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 600px) {
          .rank-title {
            font-size: 1.1rem;
          }
          .rank-desc {
            font-size: 0.85rem;
          }
          .rank-card {
            padding: 0.75rem;
          }
          .rank-card-header {
            align-items: flex-start;
            flex-direction: column;
          }
          .rank-podium {
            gap: 0.45rem;
          }
          .rank-podium-slot.is-first .rank-podium-person {
            min-height: 196px;
          }
          .rank-podium-slot.is-second .rank-podium-person,
          .rank-podium-slot.is-third .rank-podium-person {
            min-height: 168px;
          }
          .rank-podium-stand-first {
            height: 92px;
          }
          .rank-podium-stand-second {
            height: 62px;
          }
          .rank-podium-stand-third {
            height: 54px;
          }
        }
      `}</style>
    </div>
  );
};

export default AttendanceRank;
