// src/components/Navbar.js
import React, { useRef, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import menuItems from '../utils/menuItems'; // 引入菜单项

const Navbar = ({ onSwipe,moduleOrder, hideTopNav, onModuleOrderChange }) => {
  const location = useLocation();
  const touchStartX = useRef(0);

  // 使用传入的moduleOrder或者默认顺序
  const [orderedMenuItems, setOrderedMenuItems] = useState(() => {
    if (!moduleOrder || moduleOrder.length !== menuItems.length) return menuItems;

    // 根据moduleOrder对menuItems进行排序
    return menuItems.sort((a, b) => {
      const indexA = moduleOrder.indexOf(a.title);
      const indexB = moduleOrder.indexOf(b.title);
      return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
    });
  });

  // 定义路由与菜单的映射关系
  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') {
      return true;
    }
    if (path !== '/' && location.pathname.startsWith(path)) {
      return true;
    }
    return false;
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    // 设置最小滑动距离阈值
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        onSwipe && onSwipe('left');
      } else {
        onSwipe && onSwipe('right');
      }
    }
  };


  // 拖拽开始
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("dragIndex", index.toString());
  };

  // 拖拽放置
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("dragIndex"));
    if (dragIndex !== dropIndex) {
      const newItems = [...orderedMenuItems];
      const [movedItem] = newItems.splice(dragIndex, 1);
      newItems.splice(dropIndex, 0, movedItem);
      setOrderedMenuItems(newItems);

      if (onModuleOrderChange) {
        onModuleOrderChange(newItems.map(item => item.title));
      }
      // 可选：将新顺序发送给父组件或保存到设置中
      // 例如：onModuleOrderChange(newItems.map(item => item.title));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // 必须阻止默认行为才能触发drop事件
  };

  return (
    <nav
      className="navbar"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ display: hideTopNav ? 'none' : 'block'}}
    >
      <ul>
        {orderedMenuItems.map((item, index) => (
          <li
            key={item.path}
            className={isActive(item.path) ? 'active' : ''}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <Link to={item.path} title={item.title}>
              <img src={item.icon} alt={item.title} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
