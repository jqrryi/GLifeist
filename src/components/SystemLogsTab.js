// src/components/SystemLogsTab.js
import React from 'react';
import LogViewer from './LogViewer';

const SystemLogsTab = (hideTopControls) => {
  return (
    <div className="system-logs-tab">
      <h3>系统日志</h3>
      <LogViewer hideTopControls={hideTopControls.hideTopControls}/>
    </div>
  );
};

export default SystemLogsTab;