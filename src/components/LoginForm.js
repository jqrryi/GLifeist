// src/components/LoginForm.js
import React, { useState } from 'react';
import AuthManager from '../utils/auth';
import CONFIG from '../config';

const LoginForm = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // 新增确认密码状态
  const [rememberMe, setRememberMe] = useState(false); // 添加记住我状态
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 注册时验证两次密码是否一致
    if (isRegistering && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegistering ? `${CONFIG.API_BASE_URL}/api/auth/register` : `${CONFIG.API_BASE_URL}/api/auth/login`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          remember_me: rememberMe // 添加记住我参数
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (!isRegistering) {
          // 保存令牌到localStorage
          AuthManager.setTokens(data.access_token, data.refresh_token);
          // 调用登录成功回调
          onLoginSuccess(username);
        } else {
          setIsRegistering(false);
          alert('Registration successful! Please login.');
        }
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2 style={{ textAlign: 'center' }}>{isRegistering ? '注册' : '登录'}</h2>
        {error && <div className="error-message">{error}</div>}

        <div className="login-form-group">
          <label>用户名:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength="3"
            maxLength="20"
          />
        </div>

        <div className="login-form-group">
          <label>密码:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="4"
          />
        </div>

        {/* 注册时显示确认密码输入框 */}
        {isRegistering && (
          <div className="login-form-group">
            <label>确认密码:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="4"
            />
          </div>
        )}


        <div>
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              textDecoration: 'underline',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              padding: '4px 0',
              fontSize: 'inherit'
            }}
          >
            {isRegistering ? '登录已有账户' : "注册新账户"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegistering( false)
              setUsername('demo');
              setPassword('demo');
            }}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              textDecoration: 'underline',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              padding: '4px 0',
              fontSize: 'inherit'
            }}
          >
            游客登录
          </button>
        </div>

        {/* 登录时显示记住我选项 */}
        {!isRegistering && (
          <div>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            <label htmlFor="rememberMe" style={{ margin: 0, cursor: 'pointer', alignItems: 'left', textAlign: 'left' }}>
              下次免登录
            </label>
          </div>
        )}

        <div className="form-footer">
          <button type="submit" disabled={loading}>
            {loading ? '处理中...' : (isRegistering ? '注册' : '登录')}
          </button>
          <button
            type="button"
            onClick={() => {
              setUsername('');
              setPassword('');
              setConfirmPassword(''); // 清空确认密码
              setRememberMe(false); // 清空记住我选项
              setError('');
            }}
          >
            清空
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
