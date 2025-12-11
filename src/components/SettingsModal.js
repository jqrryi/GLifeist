// src/components/SettingsModal.js
import React, { useEffect } from 'react';
import SettingsTab from './SettingsTab';

const SettingsModal = ({ isOpen, title, onClose, targetGroup, settings, onUpdateSettings }) => {
  // 添加 ESC 键监听功能
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        // 检查是否有其他弹窗（通过z-index更高的元素）正在显示
        const infoPopups = document.querySelectorAll('[id^="info-popup-"]');
        if (infoPopups.length > 0) {
          // 如果有infoPopup存在，不处理ESC键
          return;
        }

        // 检查是否有EffectEditingModal存在
        const effectModals = document.querySelectorAll('[class*="effect-editing-modal"]');
        if (effectModals.length > 0) {
          // 如果有EffectEditingModal存在，不处理ESC键
          return;
        }

        event.stopPropagation(); // 阻止事件冒泡
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey, true);
    }

    // 清理事件监听器
    return () => {
      document.removeEventListener('keydown', handleEscKey, true);
    };
  }, [isOpen, onClose]);

  const showStatus = (message) => {
    console.log(message);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal-content" onClick={e => e.stopPropagation()}>
        <button className="settings-modal-close" onClick={onClose}>×</button>
        <h4>{title||"设置"}</h4>
        <SettingsTab
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          targetGroup={targetGroup}
          onShowStatus={showStatus}
        />
      </div>
    </div>
  );
};

export default SettingsModal;
