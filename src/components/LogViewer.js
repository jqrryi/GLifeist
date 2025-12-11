// src/components/LogViewer.js
import React, { useState } from 'react';
import { useLogs } from '../contexts/LogContext';
import './LogViewer.css';

const isMobileDevice = () => {
  return window.innerWidth <= 768;
};

const LogViewer = (hideTopControls) => {
  const { logs, clearLogs } = useLogs();
  const [filter, setFilter] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  // 获取所有组件名称
  const components = [...new Set(logs.map(log => log.component))];
  const [currentPage, setCurrentPage] = useState(1); // 当前页码
  const [logsPerPage, setLogsPerPage] = useState(() => {
    const savedLogsPerPage = localStorage.getItem('logsPerPage');
    return savedLogsPerPage ? parseInt(savedLogsPerPage, 10) : 10;
  });  // 每页日志数
  const [inputPage, setInputPage] = useState(currentPage); // 用于页码输入框的状态
  const [expandedLogs, setExpandedLogs] = useState(new Set());

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    const matchesFilter = log.action.toLowerCase().includes(filter.toLowerCase()) ||
                          log.details.toLowerCase().includes(filter.toLowerCase());
    const matchesComponent = selectedComponent ? log.component === selectedComponent : true;
    return matchesFilter && matchesComponent;
  });

  // 分页计算
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const isMobile = isMobileDevice()

  // 分页切换函数
  const paginate = (pageNumber) => {
    // 确保页码在有效范围内
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > totalPages) pageNumber = totalPages;
    setCurrentPage(pageNumber);
    setInputPage(pageNumber); // 同步更新输入框的值
  };

  // 导出日志为CSV文件
  const exportLogsToCSV = () => {
    if (filteredLogs.length === 0) {
      alert('没有可导出的日志');
      return;
    }

    // 创建CSV内容
    const headers = ['时间戳', '组件', '操作', '详情'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        `"${new Date(log.timestamp).toLocaleString("sv-SE")}"`,
        `"${log.component || ''}"`,
        `"${log.action || ''}"`,
        `"${log.details || ''}"`
      ].join(','))
    ].join('\n');

    // 创建并下载文件
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `logs_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 添加切换日志展开状态的函数
  const toggleLogDetails = (logId) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  console.log('LogsTab hide: ', hideTopControls.hideTopControls)

  return (
    <div className="log-viewer">
      {!hideTopControls.hideTopControls && (
        <div className="log-header">
          <div className="log-controls">
            <input
              type="text"
              placeholder="搜索日志..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="log-search"
            />
            <select
              value={selectedComponent}
              onChange={(e) => setSelectedComponent(e.target.value)}
              className="log-filter"
            >
              <option value="">所有组件</option>
              {components.map(component => (
                <option key={component} value={component}>{component}</option>
              ))}
            </select>
            <button onClick={clearLogs} className="clear-button" title="删除所有日志">{isMobile ? '清空' : '清空日志'}</button>
            <button onClick={exportLogsToCSV} className="export-button" title="导出所有日志">{isMobile ? '导出' : '导出日志'}</button>
          </div>
        </div>
      )}


      <div className="log-list">


        {currentLogs.length === 0 ? (
          <p className="no-logs">暂无日志记录</p>
        ) : (
          currentLogs.map(log => (
            <div
              key={log.id}
              className={`log-item ${isMobile ? 'log-item-mobile' : ''}`}
              onClick={isMobile ? () => toggleLogDetails(log.id) : undefined}
            >
              <div className="log-timestamp">
                {new Date(log.timestamp).toLocaleString("sv-SE")}
              </div>
              <div className="log-component">
                [{log.component}]
              </div>
              <div className="log-action">
                {log.action}
              </div>

              {log.details && (
                <>
                  {isMobile ? (
                    <>
                      <div className="log-details-abstract">
                        {log.details.length > 20 ? `${log.details.slice(0, 20)}...` : log.details}
                      </div>
                      <div className={`log-details ${expandedLogs.has(log.id) ? 'mobile-expanded' : 'mobile-collapsed'}`}>
                        {log.details}
                      </div>
                    </>
                  ) : (
                    <div className="log-details">
                      {log.details}
                    </div>
                  )}
                </>
              )}


            </div>
          ))
        )}

        {/* 添加分页控件 */}
        <div className="pagination-controls">
          <button
            onClick={() => paginate( 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
            title="第一页"
          >
            {"<<"}
          </button>

          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-btn"
            title="上一页"
          >
            {"<"}
          </button>

          {/* 整合的页码输入框 */}
          <div className="page-input-container">
            <input
              type="number"
              min="1"
              max={totalPages}
              value={inputPage}
              onChange={(e) => {
                const page = parseInt(e.target.value) || '';
                setInputPage(page);
              }}
              onBlur={() => {
                // 失焦时如果输入有效页码则跳转
                if (inputPage >= 1 && inputPage <= totalPages && inputPage !== currentPage) {
                  paginate(inputPage);
                }
                // 如果输入无效页码，重置为当前页
                if (inputPage < 1 || inputPage > totalPages) {
                  setInputPage(currentPage);
                }
              }}
              onKeyDown={(e) => {
                // 按回车键时跳转
                if (e.key === 'Enter') {
                  if (inputPage >= 1 && inputPage <= totalPages && inputPage !== currentPage) {
                    paginate(inputPage);
                  }
                  // 如果输入无效页码，重置为当前页
                  if (inputPage < 1 || inputPage > totalPages) {
                    setInputPage(currentPage);
                  }
                }
              }}
              className="page-input"
            />
            <span className="page-total">/ {totalPages}</span>
          </div>

          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            title="下一页"
          >
            {">"}
          </button>

          <button
            onClick={() => paginate(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-btn"
            title="最后一页"
          >
            {">>"}
          </button>

          <select
            value={logsPerPage}
            onChange={(e) => {
              const newLogsPerPage = Number(e.target.value);
              setLogsPerPage(newLogsPerPage);
              localStorage.setItem('logsPerPage', newLogsPerPage.toString());
              setCurrentPage(1); // 重置到第一页
              setInputPage(1); // 同步更新输入框的值
            }}
            className="logs-per-page-select"
          >
            <option value="5">5/页</option>
            <option value="10">10/页</option>
            <option value="20">20/页</option>
            <option value="50">50/页</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default LogViewer;
