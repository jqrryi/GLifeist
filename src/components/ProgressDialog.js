// src/components/ExportProgressDialog.js
import React from 'react';
import './ProgressDialog.css';

// 修改组件接收 title 属性
const ProgressDialog = ({ isOpen, title = "处理中", progress, onClose }) => {
  if (!isOpen) {
    return null;
  }

  const isComplete = progress >= 100;

  return (
    <div className="export-progress-dialog-overlay">
      <div className="export-progress-dialog">
        {/* 使用传入的 title */}
        <h3>{title}</h3>
        <div className="export-progress-bar-container">
          <div
            className="export-progress-bar-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="export-progress-text">{Math.round(progress)}%</div>
        {isComplete && (
          <button className="export-confirm-button" onClick={onClose}>
            确定
          </button>
        )}
      </div>
    </div>
  );
};

export default ProgressDialog;