class UserDataManager {
  constructor() {
    this.currentUser = this.getCurrentUser();
  }
  
  // 获取当前登录用户
  getCurrentUser() {
    return localStorage.getItem('current_user');
  }

  // 设置当前用户
  setCurrentUser(username) {
    localStorage.setItem('current_user', username);
    this.currentUser = username;
  }

  // 清除当前用户
  clearCurrentUser() {
    localStorage.removeItem('current_user');
    this.currentUser = null;
  }

  // 用户特定数据操作
  setUserData(key, value, switchJson = true) {
    if (!this.currentUser) return;
    const storageKey = `${this.currentUser}_${key}`;
    if (switchJson) {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } else {
      localStorage.setItem(storageKey, value);
    }
  }

  getUserData(key) {
    if (!this.currentUser) return null;
    const storageKey = `${this.currentUser}_${key}`;
    const data = localStorage.getItem(storageKey);
    // console.log('获取用户数据2:', storageKey, data)
    if (data === null) return null;

    try {
      // 返回解析后的对象
      return JSON.parse(data);
    } catch (error) {
      console.error(`解析用户数据失败 key=${storageKey}:`, error);
      // 如果解析失败，返回原始数据
      return data;
    }

  }

  clearUserData(key) {
    if (!this.currentUser) return;
    const storageKey = `${this.currentUser}_${key}`;
    localStorage.removeItem(storageKey);
  }

  // 批量操作当前用户数据
  getAllUserData() {
    if (!this.currentUser) return {};
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${this.currentUser}_`)) {
        const originalKey = key.substring(`${this.currentUser}_`.length);
        allData[originalKey] = this.getUserData(originalKey);
      }
    }
    return allData;
  }
}

export default new UserDataManager();
