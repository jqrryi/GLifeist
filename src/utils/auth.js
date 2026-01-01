// src/utils/auth.js
class AuthManager {
  static getToken() {
    return localStorage.getItem('access_token');
  }

  static getRefreshToken() {
    return localStorage.getItem('refresh_token');
  }

  static setTokens(accessToken, refreshToken) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  static clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  static isAuthenticated() {
    return !!this.getToken();
  }

  static async refreshTokens() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      return data.access_token;
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }

  static async authenticatedFetch(url, options = {}) {
    let token = this.getToken();

    // 如果没有token，直接返回401状态，避免尝试刷新
    if (!token) {
      return {
        status: 401,
        ok: false,
        json: () => Promise.resolve({ error: 'No token available' }),
        text: () => Promise.resolve('No token available')
      };
    }
    // // 如果没有token，直接抛出错误或返回特定状态
    // if (!this.getToken()) {
    //   throw new Error('Authentication required');
    // }

    // 添加认证头
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    let response = await fetch(url, { ...options, headers });

    // 如果是令牌过期，尝试刷新令牌
    if (response.status === 401) {
      try {
        token = await this.refreshTokens();
        // 重新发起请求
        const retryHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
        response = await fetch(url, { ...options, headers: retryHeaders });
      } catch (error) {
        // 刷新失败，清除令牌并重定向到登录页
        this.clearTokens();
        // 只有在非登录页面才重定向，避免无限循环
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        throw error;
      }
    }

    return response;
  }

}

export default AuthManager;