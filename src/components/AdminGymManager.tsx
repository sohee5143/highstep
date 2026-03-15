import React, { useState, useEffect, useRef } from 'react';
import { COLORS } from '../constants/colors';
import { Gym } from '../types';
import { fetchGyms, createGym, deleteGym, uploadGymIcon } from '../utils/gyms';

type IconMode = 'url' | 'file';

const AdminGymManager: React.FC = () => {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newIconUrl, setNewIconUrl] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconMode, setIconMode] = useState<IconMode>('url');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    const data = await fetchGyms();
    setGyms(data);
    setIsLoading(false);
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 2500);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    let iconUrl: string | null = null;

    if (iconMode === 'url' && newIconUrl.trim()) {
      iconUrl = newIconUrl.trim();
    } else if (iconMode === 'file' && iconFile) {
      iconUrl = await uploadGymIcon(iconFile);
      if (!iconUrl) {
        showMessage('이미지 업로드에 실패했습니다.', 'error');
        setIsSaving(false);
        return;
      }
    }

    const result = await createGym(newName.trim(), iconUrl);
    if (result) {
      setGyms((prev) => [...prev, result].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR')));
      setNewName('');
      setNewIconUrl('');
      setIconFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showMessage(`${result.name} 암장이 등록되었습니다.`, 'success');
    } else {
      showMessage('암장 등록에 실패했습니다. (이름 중복 여부 확인)', 'error');
    }
    setIsSaving(false);
  };

  const handleDelete = async (gym: Gym) => {
    if (!window.confirm(`'${gym.name}' 암장을 삭제할까요?\n연결된 스케줄도 함께 삭제됩니다.`)) return;
    await deleteGym(gym.id);
    setGyms((prev) => prev.filter((g) => g.id !== gym.id));
    showMessage(`${gym.name} 암장이 삭제되었습니다.`, 'success');
  };

  const isAddDisabled = !newName.trim() || isSaving;

  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <style>{`
        .gym-card {
          background: ${COLORS.cardBg};
          border-radius: 16px;
          box-shadow: 0 4px 16px rgba(227,176,75,0.07);
          padding: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          color: ${COLORS.textMain};
        }
        .gym-input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          border: none;
          border-radius: 12px;
          background: #222;
          color: ${COLORS.textMain};
          outline: none;
        }
        .gym-input:focus { box-shadow: 0 0 0 2px ${COLORS.primary}; }
        .gym-input::placeholder { color: ${COLORS.textSub}; }
        .gym-tab-row {
          display: flex;
          gap: 0.5rem;
        }
        .gym-tab {
          flex: 1;
          padding: 0.45rem;
          border-radius: 10px;
          border: none;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .gym-tab-active {
          background: ${COLORS.primary};
          color: #111;
        }
        .gym-tab-inactive {
          background: #222;
          color: ${COLORS.textSub};
        }
        .gym-add-btn {
          padding: 0.75rem;
          font-size: 0.95rem;
          font-weight: bold;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .gym-add-btn:not(:disabled) {
          background: ${COLORS.primary};
          color: #111;
        }
        .gym-add-btn:disabled {
          background: #181818;
          color: ${COLORS.textSub};
          cursor: not-allowed;
        }
        .gym-add-btn:not(:disabled):active { transform: scale(0.98); }
        .gym-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .gym-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #181818;
          border-radius: 12px;
          padding: 0.7rem 0.9rem;
        }
        .gym-icon-img {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .gym-icon-fallback {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: ${COLORS.primary};
          color: #111;
          font-weight: bold;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .gym-name-text {
          flex: 1;
          font-size: 0.95rem;
          font-weight: 500;
          color: ${COLORS.textMain};
        }
        .gym-delete-btn {
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          border: 1px solid ${COLORS.danger};
          background: transparent;
          color: ${COLORS.danger};
          font-size: 0.8rem;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
        }
        .gym-delete-btn:hover { background: rgba(239,68,68,0.15); }
        .gym-msg-success { color: ${COLORS.success}; font-size: 0.9rem; text-align: center; }
        .gym-msg-error { color: ${COLORS.danger}; font-size: 0.9rem; text-align: center; }
        .gym-spinner {
          width: 24px; height: 24px;
          border-radius: 999px;
          border: 3px solid rgba(179,179,179,0.3);
          border-top-color: ${COLORS.primary};
          animation: gymSpin 0.9s linear infinite;
          margin: 1.5rem auto;
        }
        @keyframes gymSpin { to { transform: rotate(360deg); } }
      `}</style>

      {/* 암장 추가 폼 */}
      <div className="gym-card">
        <span style={{ fontWeight: 700, color: COLORS.primary, fontSize: '1rem' }}>암장 추가</span>
        <input
          className="gym-input"
          placeholder="암장 이름"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <div>
          <div className="gym-tab-row" style={{ marginBottom: '0.6rem' }}>
            <button
              className={`gym-tab ${iconMode === 'url' ? 'gym-tab-active' : 'gym-tab-inactive'}`}
              onClick={() => setIconMode('url')}
            >
              URL 입력
            </button>
            <button
              className={`gym-tab ${iconMode === 'file' ? 'gym-tab-active' : 'gym-tab-inactive'}`}
              onClick={() => setIconMode('file')}
            >
              파일 업로드
            </button>
          </div>
          {iconMode === 'url' ? (
            <input
              className="gym-input"
              placeholder="아이콘 이미지 URL (선택)"
              value={newIconUrl}
              onChange={(e) => setNewIconUrl(e.target.value)}
            />
          ) : (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ color: COLORS.textSub, fontSize: '0.85rem' }}
              onChange={(e) => setIconFile(e.target.files?.[0] || null)}
            />
          )}
        </div>
        {message && (
          <span className={message.type === 'success' ? 'gym-msg-success' : 'gym-msg-error'}>
            {message.text}
          </span>
        )}
        <button className="gym-add-btn" onClick={handleAdd} disabled={isAddDisabled}>
          {isSaving ? '저장 중...' : '+ 암장 등록'}
        </button>
      </div>

      {/* 암장 목록 */}
      <div className="gym-card">
        <span style={{ fontWeight: 700, color: COLORS.primary, fontSize: '1rem' }}>
          등록된 암장 ({gyms.length})
        </span>
        {isLoading ? (
          <div className="gym-spinner" />
        ) : gyms.length === 0 ? (
          <span style={{ color: COLORS.textSub, fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
            등록된 암장이 없습니다.
          </span>
        ) : (
          <div className="gym-list">
            {gyms.map((gym) => (
              <div key={gym.id} className="gym-item">
                {gym.icon_url ? (
                  <img src={gym.icon_url} alt={gym.name} className="gym-icon-img" />
                ) : (
                  <div className="gym-icon-fallback">{gym.name[0]}</div>
                )}
                <span className="gym-name-text">{gym.name}</span>
                <button className="gym-delete-btn" onClick={() => handleDelete(gym)}>
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGymManager;
