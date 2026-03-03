import React, { useEffect, useState } from 'react';

interface AdminGateProps {
  children: React.ReactNode;
}

const STORAGE_KEY = 'highstep_admin_unlocked_v1';

const AdminGate: React.FC<AdminGateProps> = ({ children }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  const envPin = process.env.REACT_APP_ADMIN_PIN;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') {
      setUnlocked(true);
    }
  }, []);

  if (!envPin) {
    return (
      <div style={{ padding: '2rem', color: '#fff', background: '#000', minHeight: '100vh' }}>
        <p>관리자 비밀번호가 설정되어 있지 않습니다.</p>
        <p>.env.local 파일에 REACT_APP_ADMIN_PIN 값을 설정한 후 다시 빌드/배포해주세요.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === envPin) {
      setUnlocked(true);
      setError('');
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, 'true');
        }
      } catch {
        // ignore
      }
    } else {
      setError('비밀번호가 올바르지 않습니다.');
    }
  };

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", sans-serif' }}>
      <form onSubmit={handleSubmit} style={{ background: '#1A1A1A', padding: '1.5rem 1.75rem', borderRadius: 16, width: '100%', maxWidth: 360, boxShadow: '0 4px 16px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem', color: '#E3B04B' }}>관리자 전용 페이지</h2>
        <p style={{ fontSize: '0.9rem', color: '#B3B3B3' }}>관리자 비밀번호를 입력해주세요.</p>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="4자리 비밀번호"
          style={{
            padding: '0.7rem 0.9rem',
            borderRadius: 12,
            border: 'none',
            outline: 'none',
            background: '#222',
            color: '#fff',
            fontSize: '1rem',
          }}
        />
        <button
          type="submit"
          style={{
            marginTop: '0.25rem',
            padding: '0.7rem 0.9rem',
            borderRadius: 12,
            border: 'none',
            background: '#E3B04B',
            color: '#111',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          입장하기
        </button>
        {error && (
          <p style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: '#EF4444' }}>{error}</p>
        )}
      </form>
    </div>
  );
};

export default AdminGate;
