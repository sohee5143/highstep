import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AttendanceRecord, PLACES, PLACE_DATES_FEB } from '../types';
import { getSummaryForName } from '../utils/localAttendance';

const COLORS = {
    primary: '#E3B04B',
    background: '#000000',
    cardBg: '#1A1A1A',
    textMain: '#FFFFFF',
    textSub: '#B3B3B3',
    success: '#22C55E',
    danger: '#EF4444',
};

const AttendanceTracker: React.FC = () => {
    const [inputName, setInputName] = useState('');
    const [record, setRecord] = useState<AttendanceRecord | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
    const [dbMemberNames, setDbMemberNames] = useState<string[]>([]);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await fetch('http://localhost:4000/api/attendance-summary');
                if (!res.ok) return;
                const data: AttendanceRecord[] = await res.json();

                setAllRecords(data);
                setDbMemberNames(data.map((r) => r.name));
            } catch {
                // 서버 문제 시 조용히 빈 상태 유지
            }
        };

        fetchSummary();
    }, []);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputName(value);

        const trimmed = value.trim();
        if (!trimmed) {
            setSuggestions([]);
            setRecord(null);
            return;
        }

        const lower = trimmed.toLowerCase();
        const matches = allRecords
            .filter((r) => r.name.toLowerCase().includes(lower))
            .slice(0, 8)
            .map((r) => r.name);

        setSuggestions(matches);
    };

    const handleSearch = () => {
        const found = allRecords.find((r) => r.name === inputName.trim());
        setRecord(found || null);
        setSuggestions([]);
    };

    const handleSelectSuggestion = (name: string) => {
        setInputName(name);
        const found = allRecords.find((r) => r.name === name);
        setRecord(found || null);
        setSuggestions([]);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const isDbBacked = record ? dbMemberNames.includes(record.name) : false;
    const extraSummary = record && !isDbBacked ? getSummaryForName(record.name) : null;
    const effectiveAttendanceCount = record
        ? record.attendanceCount + (extraSummary?.totalExtra ?? 0)
        : 0;
    const attendanceRate = record && record.requiredAttendance > 0
        ? Math.round((effectiveAttendanceCount / record.requiredAttendance) * 100)
        : 0;

        return (
            <div className="tracker-root">
                {/* 상단 로고 헤더 */}
                <header className="tracker-header">
                    <Link to="/" aria-label="메인 페이지로 이동">
                        <img
                            src="/assets/logo_169.jpg"
                            alt="HighStep Logo"
                            className="tracker-logo"
                            aria-label="동아리 로고"
                        />
                    </Link>
                </header>
                {/* 타이틀 */}
                <section className="tracker-status">
                    <h2 className="tracker-title">내 출석 현황</h2>
                    <p className="tracker-desc">2026년 상반기(2월, 3월, 4월) 출석현황</p>
                </section>
                {/* 이름 입력 카드 */}
                <main className="tracker-main">
                    <div className="tracker-card tracker-input-card">
                        <label htmlFor="name-input" className="tracker-label">이름 입력</label>
                        <div className="tracker-input-row">
                            <input
                                id="name-input"
                                type="text"
                                value={inputName}
                                onChange={handleNameChange}
                                onKeyPress={handleKeyPress}
                                placeholder="이름을 입력하세요"
                                aria-label="부원 이름 입력"
                                className="tracker-input"
                            />
                            <button
                                onClick={handleSearch}
                                aria-label="조회"
                                className="tracker-btn"
                            >조회</button>
                        </div>
                        {suggestions.length > 0 && (
                            <ul className="tracker-suggestions">
                                {suggestions.map((name) => (
                                    <li
                                        key={name}
                                        className="tracker-suggestion-item"
                                        onClick={() => handleSelectSuggestion(name)}
                                    >
                                        {name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {/* 결과 카드 */}
                    {record ? (
                        <div className="tracker-card tracker-result-card">
                            <div className="tracker-result-header">
                                <span className="tracker-name">{record.name}</span>
                                <span className="tracker-type">{record.type === '기존' ? '기존부원' : '신입'}</span>
                            </div>
                            <div className="tracker-result-stats">
                                <div className="tracker-stat">
                                    <span className="tracker-stat-label">필요 출석</span>
                                    <span className="tracker-stat-value">{record.requiredAttendance}</span>
                                </div>
                                <div className="tracker-stat">
                                    <span className="tracker-stat-label">현재 출석</span>
                                    <span className="tracker-stat-value tracker-success">{effectiveAttendanceCount}</span>
                                </div>
                            </div>
                            <div className="tracker-progress-bar">
                                <span className="tracker-progress-label">출석 진행률</span>
                                <span className="tracker-progress-value">{effectiveAttendanceCount} / {record.requiredAttendance}</span>
                                <div className="tracker-progress-bg">
                                    <div className="tracker-progress-fill" style={{ width: `${attendanceRate}%` }}></div>
                                </div>
                            </div>
                            <div className="tracker-attended-list">
                                <span className="tracker-attended-label">정기운동 출석 리스트</span>
                                <div className="tracker-attended-items">
                                    {PLACES.filter((place) => {
                                        const base = record.records[place];
                                        const extraCount = extraSummary?.perPlaceCount[place] || 0;
                                        return base || extraCount > 0;
                                    }).map((place) => {
                                        const base = record.records[place];
                                        const latestTs = extraSummary?.perPlaceLatest[place];
                                        let dateLabel: string | null = null;
                                        if (latestTs) {
                                            const d = new Date(latestTs);
                                            const month = d.getMonth() + 1;
                                            const day = d.getDate();
                                            dateLabel = `${month}/${day}`;
                                        } else if (PLACE_DATES_FEB[place]) {
                                            dateLabel = PLACE_DATES_FEB[place];
                                        }
                                        return (
                                            <div key={place} className="tracker-attended-item">
                                                <div className="tracker-attended-left">
                                                    <span className="tracker-attended-place">{place}</span>
                                                    {dateLabel && (
                                                        <span className="tracker-attended-date">{dateLabel}</span>
                                                    )}
                                                </div>
                                                <span className="tracker-attended-badge">
                                                    {base === '25분기 반영' ? '25분기' : '✓'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {!PLACES.some((place) => {
                                        const base = record.records[place];
                                        const extraCount = extraSummary?.perPlaceCount[place] || 0;
                                        return base || extraCount > 0;
                                    }) && (
                                        <span className="tracker-no-attendance">아직 출석 기록이 없습니다</span>
                                    )}
                                </div>
                            </div>

                        </div>
                    ) : inputName ? (
                        <div className="tracker-card tracker-error-card">
                            <span className="tracker-error-title">😕 해당 이름의 출석 기록이 없습니다</span>
                            <span className="tracker-error-desc">이름을 정확히 입력해주세요</span>
                        </div>
                    ) : null}
                </main>
                <div style={{ textAlign: 'center', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                    <a href="#/list" style={{ color: COLORS.textSub, fontSize: '0.9rem', textDecoration: 'underline' }}>
                        전체 정기운동 출석 현황 보기
                    </a>
                </div>
                {/* 스타일 */}
                <style>{`
                    .tracker-root {
                        min-height: 100vh;
                        background: ${COLORS.background};
                        display: flex;
                        flex-direction: column;
                        font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', sans-serif;
                    }
                    .tracker-header {
                        padding: 2rem 0 1rem 0;
                        background: transparent;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .tracker-logo {
                        width: 96px;
                        height: auto;
                        display: block;
                    }
                    .tracker-status {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 0.3rem;
                        color: ${COLORS.textMain};
                    }
                    .tracker-title {
                        font-size: 1.5rem;
                        font-weight: bold;
                        color: ${COLORS.primary};
                    }
                    .tracker-desc {
                        font-size: 1rem;
                        color: ${COLORS.textSub};
                    }
                    .tracker-main {
                        flex: 1;
                        padding: 1rem 0.5rem 5.5rem 0.5rem;
                        display: flex;
                        flex-direction: column;
                        gap: 1.5rem;
                        align-items: center;
                    }
                    .tracker-card {
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
                    .tracker-input-card {
                        gap: 0.7rem;
                    }
                    .tracker-label {
                        font-weight: 500;
                        color: ${COLORS.textMain};
                    }
                    .tracker-input-row {
                        display: flex;
                        gap: 0.5rem;
                    }
                    .tracker-input {
                        flex: 1;
                        padding: 0.8rem 1rem;
                        font-size: 1rem;
                        border: none;
                        border-radius: 12px;
                        background: #222;
                        color: ${COLORS.textMain};
                        outline: none;
                    }
                    .tracker-input:focus {
                        box-shadow: 0 0 0 2px ${COLORS.primary};
                    }
                    .tracker-btn {
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
                    .tracker-btn:active {
                        background: #C8922E;
                        transform: scale(0.98);
                    }
                    .tracker-result-card {
                        gap: 1.2rem;
                    }
                    .tracker-result-header {
                        display: flex;
                        flex-direction: column;
                        gap: 0.3rem;
                    }
                    .tracker-name {
                        font-size: 1.2rem;
                        font-weight: bold;
                        color: ${COLORS.primary};
                    }
                    .tracker-type {
                        font-size: 0.9rem;
                        color: ${COLORS.textSub};
                    }
                    .tracker-rate {
                        font-size: 1rem;
                        color: ${COLORS.success};
                        font-weight: bold;
                    }
                    .tracker-result-stats {
                        display: flex;
                        gap: 1rem;
                    }
                    .tracker-stat {
                        flex: 1;
                        background: #181818;
                        border-radius: 12px;
                        padding: 0.7rem 0.5rem;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 0.2rem;
                    }
                    .tracker-stat-label {
                        font-size: 0.9rem;
                        color: ${COLORS.textSub};
                    }
                    .tracker-stat-value {
                        font-size: 1.3rem;
                        font-weight: bold;
                        color: ${COLORS.primary};
                    }
                    .tracker-success {
                        color: ${COLORS.success};
                    }
                    .tracker-progress-bar {
                        display: flex;
                        flex-direction: column;
                        gap: 0.3rem;
                    }
                    .tracker-progress-label {
                        font-size: 0.9rem;
                        color: ${COLORS.textSub};
                    }
                    .tracker-progress-value {
                        font-size: 1rem;
                        color: ${COLORS.primary};
                        font-weight: bold;
                    }
                    .tracker-progress-bg {
                        width: 100%;
                        height: 8px;
                        background: #181818;
                        border-radius: 8px;
                        overflow: hidden;
                    }
                    .tracker-progress-fill {
                        height: 8px;
                        background: linear-gradient(90deg, #E3B04B, #C8922E);
                        border-radius: 8px;
                        transition: width 0.3s;
                    }
                    .tracker-attended-list {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                    .tracker-attended-label {
                        font-size: 1rem;
                        color: ${COLORS.textMain};
                        font-weight: bold;
                    }
                    .tracker-attended-items {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 0.5rem;
                    }
                    .tracker-attended-item {
                        background: #181818;
                        border-radius: 8px;
                        padding: 0.5rem 1rem;
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        justify-content: space-between;
                        gap: 0.5rem;
                        color: ${COLORS.success};
                        font-size: 0.95rem;
                    }
                    .tracker-attended-place {
                        font-weight: 500;
                        color: ${COLORS.textMain};
                    }
                    .tracker-attended-date {
                        font-size: 0.8rem;
                        color: ${COLORS.textSub};
                        margin-left: 0.4rem;
                    }
                    .tracker-attended-badge {
                        font-size: 0.9rem;
                        color: ${COLORS.primary};
                        font-weight: bold;
                    }
                    .tracker-no-attendance {
                        color: ${COLORS.textSub};
                        font-size: 0.95rem;
                    }
                    .tracker-status-card {
                        background: #181818;
                        border-radius: 8px;
                        padding: 0.7rem 1rem;
                        display: flex;
                        align-items: center;
                        gap: 0.7rem;
                        color: ${COLORS.textMain};
                    }
                    .tracker-status-label {
                        font-size: 1rem;
                        font-weight: bold;
                        color: ${COLORS.primary};
                    }
                    .tracker-status-value {
                        font-size: 1rem;
                        color: ${COLORS.success};
                        font-weight: bold;
                    }
                    .tracker-error-card {
                        background: #1A1A1A;
                        color: ${COLORS.danger};
                        border-radius: 16px;
                        padding: 1.2rem 1.2rem;
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                        align-items: center;
                    }
                    .tracker-error-title {
                        font-size: 1.1rem;
                        font-weight: bold;
                    }
                    .tracker-error-desc {
                        font-size: 0.95rem;
                    }
                    .tracker-suggestions {
                        margin-top: 0.4rem;
                        background: #181818;
                        border-radius: 12px;
                        max-height: 180px;
                        overflow-y: auto;
                        box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                    }
                    .tracker-suggestion-item {
                        padding: 0.5rem 0.75rem;
                        cursor: pointer;
                        color: ${COLORS.textMain};
                        font-size: 0.95rem;
                    }
                    .tracker-suggestion-item + .tracker-suggestion-item {
                        border-top: 1px solid #333;
                    }
                    .tracker-suggestion-item:hover {
                        background: #222;
                    }
                    @media (min-width: 600px) {
                        .tracker-root { align-items: center; }
                        .tracker-header, .tracker-main { max-width: 480px; width: 100%; }
                    }
                `}</style>
            </div>
        );
};

export default AttendanceTracker;