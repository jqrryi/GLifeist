// src/services/logService.js
import CONFIG from '../config';
import AuthManager from '../utils/auth';
import userDataManager from "../utils/userDataManager";

class LogService {
  constructor() {
    this.logs = [];
    this.loadLogs();
  }

  // 加载日志
  async loadLogs() {
    try {
      const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/logs`);
      if (response.ok) {
        const data = await response.json();
        this.logs = data.logs || [];
      } else {
        // 如果API失败，尝试从localStorage加载
        // const localLogs = localStorage.getItem('appLogs');
        // if (localLogs) {
        //   this.logs = JSON.parse(localLogs) || [];
        // }
        this.logs=[];
      }
    } catch (error) {
      console.error('加载日志失败:', error);
      // 如果API失败，尝试从localStorage加载
      // const localLogs = localStorage.getItem('appLogs');
      const localLogs = userDataManager.getUserData('appLogs');
      if (localLogs) {
        this.logs = JSON.parse(localLogs) || [];
      }
    }
  }

  // 保存日志到服务器
  async saveLogs() {
    try {
      // 同时保存到localStorage作为备份
      // localStorage.setItem('appLogs', JSON.stringify(this.logs));
      userDataManager.setUserData('appLogs', this.logs);

      // 保存到服务器
      const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/logs/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: this.logs })
      });

      return response.ok;
    } catch (error) {
      console.error('保存日志到服务器失败:', error);
      return false;
    }
  }

  // 添加日志
  async addLog(component, action, details = '') {
    const newLog = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      component,
      action,
      details
    };

    this.logs = [newLog, ...this.logs].slice(0, 999); // 限制最多1000条日志
    await this.saveLogs();
    return newLog;
  }

  // 清空日志
  async clearLogs() {
    this.logs = [];
    // localStorage.removeItem('appLogs');
    userDataManager.clearUserData('appLogs');


    try {
      const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/logs/clear`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.error('清空服务器日志失败:', error);
      return false;
    }
  }

  // 获取日志
  getLogs() {
    return this.logs;
  }
}

// 创建单例实例
const logService = new LogService();
export default logService;
