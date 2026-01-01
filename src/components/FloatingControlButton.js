// src/components/FloatingControlButton.js
import React, { useState, useEffect } from 'react';
import './FloatingControlButton.css';
import userDataManager from "../utils/userDataManager";

const FloatingControlButton = () => {
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hideState, setHideState] = useState(0); // 0: 不隐藏, 1: 隐藏导航栏, 2: 隐藏顶部控件和导航栏
  const [isClient, setIsClient] = useState(false);

  // 初始化客户端状态和位置
  useEffect(() => {
    setIsClient(true);

    // const savedPosition = localStorage.getItem('floatingButtonPosition');
    const savedPosition = userDataManager.getUserData('floatingButtonPosition');
    if (savedPosition) {
      // const parsed = JSON.parse(savedPosition);
      setPosition({
        x: Math.min(Math.max(savedPosition.x, 0), window.innerWidth - 60),
        y: Math.min(Math.max(savedPosition.y, 0), window.innerHeight - 60)
      });
    }

    // const savedState = localStorage.getItem('floatingButtonHideState');
    const savedState = userDataManager.getUserData('floatingButtonHideState');
    if (savedState !== null) {
      setHideState(parseInt(savedState));
    }
  }, []);

  // 保存位置到localStorage
  useEffect(() => {
    if (isClient) {
      // localStorage.setItem('floatingButtonPosition', JSON.stringify(position));
      userDataManager.setUserData('floatingButtonPosition', position);
    }
  }, [position, isClient]);

  // 保存隐藏状态到localStorage
  useEffect(() => {
    if (isClient) {
      // localStorage.setItem('floatingButtonHideState', hideState.toString());
      userDataManager.setUserData('floatingButtonHideState', hideState.toString());

      // 根据隐藏状态派发事件
      window.dispatchEvent(new CustomEvent('floatingButtonHideStateChange', {
        detail: { state: hideState }
      }));
    }
  }, [hideState, isClient]);

  useEffect(() => {
    const handleHideStateChange = (event) => {
      const newState = event.detail.state;
      setHideState(newState);
    };

    window.addEventListener('floatingButtonHideStateChange', handleHideStateChange);

    return () => {
      window.removeEventListener('floatingButtonHideStateChange', handleHideStateChange);
    };
  }, []);

  // 鼠标事件处理
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // 只处理左键
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  // 触摸事件处理
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
    e.preventDefault();
  };

  // 移动事件处理
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 60, newX)),
        y: Math.max(0, Math.min(window.innerHeight - 60, newY))
      });
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;

      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;

      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 60, newX)),
        y: Math.max(0, Math.min(window.innerHeight - 60, newY))
      });
      e.preventDefault();
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // 点击切换隐藏状态
  const handleClick = () => {
    if (!isDragging) {
      setHideState((prev) => (prev + 1) % 3);
    }
  };

  // 获取按钮图标
  const getIcon = () => {
    switch (hideState) {
      case 0: // 不隐藏
        return '🟢️';
      case 1: // 隐藏导航栏
        return '🚫';
      case 2: // 隐藏顶部控件和导航栏
        return '⛔';
      default:
        return '🟢';
    }
  };

  // 获取按钮标题
  const getTitle = () => {
    switch (hideState) {
      case 0:
        return '显示全部';
      case 1:
        return '隐藏导航栏';
      case 2:
        return '隐藏控件和导航栏';
      default:
        return '显示/隐藏';
    }
  };

  if (!isClient) return null;

  return (
    <div
      className={`floating-control-button ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      title={getTitle()}
    >
      <div className="button-content">
        {hideState === 0 && '🟢'}
        {hideState === 1 && '🚫'}
        {hideState === 2 && '⛔'}
      </div>
    </div>
  );
};

export default FloatingControlButton;
