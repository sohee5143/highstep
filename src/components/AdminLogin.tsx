import React, { useState } from 'react';

const ADMIN_PASSWORD = 'thgml5143'; // 원하는 비밀번호로 변경 가능

interface AdminLoginProps {
  onSuccess: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleLogin = () => {
    if (input === ADMIN_PASSWORD) {
      setError('');
      onSuccess();
    } else {
      setError('비밀번호가 틀렸습니다.');
    }
  };

  return (
    <div>
      <h2>관리자 로그인</h2>
      <input
        type="password"
        value={input}
        onChange={handleChange}
        placeholder="비밀번호 입력"
      />
      <button onClick={handleLogin}>로그인</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default AdminLogin;
