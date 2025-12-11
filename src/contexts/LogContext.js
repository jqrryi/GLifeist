// src/contexts/LogContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import logService from '../components/logService';

const LogContext = createContext();

export const useLogs = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogs must be used within a LogProvider');
  }
  return context;
};

export const LogProvider = ({ children }) => {
  const [logs, setLogs] = useState([]);

  // 加载日志
  useEffect(() => {
    const loadLogs = async () => {
      await logService.loadLogs();
      setLogs(logService.getLogs());
    };

    loadLogs();
  }, []);

  const addLog = async (component, action, details = '') => {
    const newLog = await logService.addLog(component, action, details);
    setLogs(logService.getLogs());
  };

  const clearLogs = async () => {
    await logService.clearLogs();
    setLogs([]);
  };

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
};
