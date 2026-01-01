// src/components/Navbar.js
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import menuItems from '../utils/menuItems'; // 引入菜单项
import AuthManager from '../utils/auth';
// import UserProfile_old from './UserProfile';
import UserMenu from './UserMenu';
import userDataManager from '../utils/userDataManager';


const Navbar = ({ onSwipe,moduleOrder, hideTopNav, onModuleOrderChange, activeTab, setActiveTab, currentUser, stats, onLogout, onUpdate, onShowStatus }) => {
  const [showUserProfile, setShowUserProfile] = useState(false);
  // const [stats, setStats] = useState(null);


  const location = useLocation();
  const touchStartX = useRef(0);



  // // 检查登录状态
  // useEffect(() => {
  //    const checkLoginStatus = async () => {
  //      try {
  //        const token = AuthManager.getToken();
  //        if (token) {
  //          const response = await AuthManager.authenticatedFetch('/api/user/profile');
  //          if (response.ok) {
  //            const data = await response.json();
  //            // 只有当用户状态真正改变时才调用 onLogout
  //            if (onLogout && currentUser !== data.username) {
  //              onLogout(data.username);
  //            }
  //          }
  //        }
  //      } catch (error) {
  //        console.log('Not logged in');
  //      }
  //    };
  //
  //    checkLoginStatus();
  //  }, [currentUser]); // 添加依赖数组
  //
  // useEffect(() => {
  //   const fetchUserStats = async () => {
  //     if (currentUser) {
  //       try {
  //         const response = await AuthManager.authenticatedFetch('/api/character/stats');
  //         if (response.ok) {
  //           const data = await response.json();
  //           setStats(data);
  //         }
  //       } catch (error) {
  //         console.error('获取用户统计信息失败:', error);
  //       }
  //     }
  //   };
  //
  //   fetchUserStats();
  // }, [currentUser]);


  const handleUserClick = () => {
    if (currentUser) {
      setShowUserProfile(!showUserProfile);
    } else {
      // 跳转到登录页面或显示登录模态框
      window.location.href = '/login';
    }
  };


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

  // console.log("currentuser", currentUser)
  // console.log("stats", stats)

  const handleLogout = () => {
    AuthManager.clearTokens();
    if (onLogout) {
      onLogout(null);
    }
    // 添加页面跳转逻辑
    window.location.href = '/login';
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
          item.title === '面板' ? (
            <li
              key={item.path}
              className={isActive(item.path) ? 'active' : ''}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              <UserMenu
                disableLeftClick={true}
                currentUser={currentUser}
                onLogout={handleLogout}
                position="bottom-left"
                stats={stats}
                onUpdate={onUpdate}
                onShowStatus={onShowStatus}
                trigger={
                  <Link
                    to={item.path}
                    title={ currentUser ? item.title + ' (' + currentUser + ')' : item.title }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    {currentUser && stats?.avatar ? (
                        <div className="usermenu-avatar">{stats.avatar}</div>
                    ) : (
                      <img src={item.icon} alt={item.title} />
                    )}
                  </Link>
                }
              />
            </li>
          ) : (
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
          )
        ))}
      </ul>

      {
        showUserProfile && currentUser && (
          <div
            className="user-menu-overlay"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // if (e.target.classList.contains('user-menu-overlay')) {
              //   setShowUserProfile(false);
              // }
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1001,
              pointerEvents: 'none'
            }}
          >
            <UserMenu
              currentUser={currentUser}
              onLogout={handleLogout}
              position="bottom-left"
              stats={stats}
              onUpdate={onUpdate}
              onShowStatus={onShowStatus}
              onClose={() => setShowUserProfile(false)}
              disableLeftClick={true}
            />
          </div>
        )
      }


    </nav>
  );
};

export default Navbar;
