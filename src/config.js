// src/config.js
// src/config.js - 更新为支持用户认证
import AuthManager from './utils/auth';

class UserConfigManager {
  static async loadSettings() {
    try {
      const response = await AuthManager.authenticatedFetch('/api/settings');
      if (response.ok) {
        return await response.json();
      }
      return {};
    } catch (error) {
      console.error('Error loading settings:', error);
      return {};
    }
  }

  static async saveSettings(settings) {
    try {
      const response = await AuthManager.authenticatedFetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      return response.ok;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }
}


const getApiBaseUrl = () => {
  // 在生产环境中使用当前主机地址
  if (process.env.NODE_ENV === 'production') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  // 开发环境中使用当前主机地址而不是localhost
  return `http://${window.location.hostname}:5000`;
};

const CONFIG = {
  API_BASE_URL: getApiBaseUrl()
};


export { UserConfigManager };
export default CONFIG;
