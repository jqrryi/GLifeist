// src/utils/infoPopup.js

let popupCounter = 0;

export const showInfoPopup = (title, content, event) => {
  // 阻止事件冒泡
  event.stopPropagation();
  event.preventDefault();
  
  // 生成唯一标识符
  const popupId = `info-popup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 创建弹窗容器
  const popup = document.createElement('div');
  popup.id = popupId;
  popup.tabIndex = -1; // 使元素可聚焦
  popup.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10002; /* 提高z-index，确保在SettingsModal之上 */
    display: flex;
    justify-content: center;
    align-items: center;
  `;
  
  // 创建弹窗内容
  const popupContent = document.createElement('div');
  popupContent.style.cssText = `
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    position: relative;
  `;
  
  // 创建标题
  const popupTitle = document.createElement('h3');
  popupTitle.textContent = title;
  popupTitle.style.marginTop = '0';
  
  // 创建内容
  const popupBody = document.createElement('div');
  popupBody.innerHTML = content;
  
  // 创建关闭按钮
  const closeButton = document.createElement('button');
  closeButton.textContent = '关闭';
  closeButton.style.cssText = `
    margin-top: 15px;
    padding: 8px 16px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  
  // 添加关闭事件
  const closePopup = () => {
    if (popup.parentNode) {
      document.removeEventListener('keydown', handleKeyDown, true);
      popup.parentNode.removeChild(popup);
    }
  };
  
  closeButton.onclick = closePopup;
  
  // ESC键处理函数
  const handleKeyDown = (e) => {
    // 确保是当前弹窗且按下ESC键
    if (e.key === 'Escape' && document.getElementById(popupId)) {
      e.stopImmediatePropagation(); // 阻止同级事件监听器执行
      e.stopPropagation();
      e.preventDefault();
      closePopup();
      return false; // 阻止进一步处理
    }
  };
  
  // 在捕获阶段监听，优先级最高，并且阻止默认行为
  document.addEventListener('keydown', handleKeyDown, true);
  
  // 组装弹窗
  popupContent.appendChild(popupTitle);
  popupContent.appendChild(popupBody);
  popupContent.appendChild(closeButton);
  popup.appendChild(popupContent);
  
  // 点击背景关闭弹窗
  popup.onclick = (e) => {
    if (e.target.id === popupId) {
      closePopup();
    }
  };
  
  // 添加到页面并聚焦
  document.body.appendChild(popup);
  popup.focus(); // 确保弹窗获得焦点
  
  // 返回关闭函数，供外部调用
  return closePopup;
};

export const InfoTipButton = ({ title, content, children, style = {} }) => {
  const defaultStyle = {
    padding: '5px 10px',
    background: 'transparent',
    color: 'black',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    ...style
  };

  return (
    <button
      style={defaultStyle}
      onClick={(e) => showInfoPopup(title, content, e)}
      title={title}
    >
      {children || 'ⓘ'}
    </button>
  );
};

export default { showInfoPopup, InfoTipButton };
