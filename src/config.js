// src/config.js
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

export default CONFIG;