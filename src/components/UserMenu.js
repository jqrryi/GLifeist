// src/components/UserMenu.js
import React, { useState, useEffect, useRef } from 'react';
import CONFIG from '../config';
import AuthManager from '../utils/auth';
import userDataManager from '../utils/userDataManager';

const UserMenu = ({
  currentUser,
  onLogout,
  position = 'bottom-right',
  trigger,
  stats,
  onUpdate,
  onShowStatus,
  disableLeftClick = false
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCharacterEdit, setShowCharacterEdit] = useState(false); // 新增角色编辑状态
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [characterInfo, setCharacterInfo] = useState({
    name: stats?.name || '冒险者',
    avatar: stats?.avatar || '🧙‍♂️'
  });
  const menuRef = useRef(null);
  // 添加用户管理相关状态
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', permissions: ['user'] });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserData, setEditUserData] = useState({ password: '' });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  // 添加新的状态变量
  const [showUserDataManagement, setShowUserDataManagement] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);

  // 在组件顶部添加预设emoji列表
  const PRESET_EMOJIS = [
    '🧙‍♂️', '🧙‍♀️', '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', '👨‍🔬', '👩‍🔬',
    '👨‍🚀', '👩‍🚀', '🦸‍♂️', '🦸‍♀️', '🦹‍♂️', '🦹‍♀️', '👨‍⚕️', '👩‍⚕️',
    '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳',
    '👨‍🔧', '👩‍🔧', '👨‍🏭', '👩‍🏭', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬',
    '👨‍🎤', '👩‍🎤', '👨‍🎨', '👩‍🎨', '👨‍✈️', '👩‍✈️', '👨‍🚀', '👩‍🚀'
  ];


  // 在 useState 声明区域添加以下状态变量
  const [currentPage, setCurrentPage] = useState(1);
  const [inputPage, setInputPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(5);
  // 在 useEffect 或其他合适位置添加计算总页数的逻辑
  const totalPages = Math.ceil(users.length / logsPerPage);

  const [currentUserDataPage, setCurrentUserDataPage] = useState(1);
  const [userDataInputPage, setUserDataInputPage] = useState(1);
  const [userDataLogsPerPage, setUserDataLogsPerPage] = useState(20);
  const totalUserDataPages = Math.ceil(users.length / userDataLogsPerPage);
  const [selectAllCurrentPage, setSelectAllCurrentPage] = useState(false);
  const [selectAllUsers, setSelectAllUsers] = useState(false);

  // 添加 paginate 函数
  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      setInputPage(pageNumber);
    }
  };
  const userDataPaginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalUserDataPages) {
      setCurrentUserDataPage(pageNumber);
      setUserDataInputPage(pageNumber);
    }
  };

  // 获取用户权限信息
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (currentUser) {
        try {
          const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/user/profile`);
          if (response.ok) {
            const data = await response.json();
            setUserPermissions(data.profile?.permissions || []);
            setProfile(data.profile);
          }
        } catch (error) {
          console.error('Error fetching user permissions:', error);
          // 如果获取权限失败，可能是token过期，需要清理登录状态
          AuthManager.clearTokens();
          if (onLogout) onLogout(null);
        }
      } else {
        // 当 currentUser 为 null 时，清空权限和用户信息
        setUserPermissions([]);
        setProfile(null);
      }
    };

    fetchUserPermissions();
  }, [currentUser]); // 添加 currentUser 作为依赖

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
        setShowLoginForm(false);
        setShowRegisterForm(false);
        setShowProfile(false);
        setShowCharacterEdit(false); // 关闭角色编辑弹窗
        setShowUserManagement(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 当登录模态框打开时，清空相关状态
  useEffect(() => {
    if (showLoginForm) {
      setUsername('');
      setPassword('');
      setError('');
    }
  }, [showLoginForm]);

  // 当注册模态框打开时，清空相关状态
  useEffect(() => {
    if (showRegisterForm) {
      setUsername('');
      setPassword('');
      setError('');
    }
  }, [showRegisterForm]);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        // 按优先级顺序处理 ESC 键退出
        if (showEmojiPicker) {
          // 角色图标选择面板优先级最高
          setShowEmojiPicker(false);
        } else if (showCharacterEdit) {
          // 角色信息编辑模态框
          setShowCharacterEdit(false);
        } else if (showUserManagement) {
          // 用户管理模态框
          setShowUserManagement(false);
        } else if (showProfile) {
          // 用户信息模态框
          setShowProfile(false);
        } else if (showChangePassword) {
          // 修改密码模态框
          setShowChangePassword(false);
        } else if (showCreateUserForm) {
          // 创建用户表单
          setShowCreateUserForm(false);
        } else if (editingUserId) {
          // 编辑用户表单
          setEditingUserId(null);
        } else if (showMenu) {
          // 主菜单
          setShowMenu(false);
        } else if (showLoginForm || showRegisterForm) {
          // 登录/注册表单
          setShowLoginForm(false);
          setShowRegisterForm(false);
        } else if (showUserDataManagement) {
          setShowUserDataManagement(false);
        }
      }
    };

    // 只有当有任何模态框打开时才添加事件监听器
    const hasOpenModal = showMenu || showLoginForm || showRegisterForm ||
                        showProfile || showCharacterEdit || showUserManagement ||
                        showEmojiPicker || showChangePassword || showCreateUserForm ||
                        editingUserId || showUserDataManagement;

    if (hasOpenModal) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [
    showMenu,
    showLoginForm,
    showRegisterForm,
    showProfile,
    showCharacterEdit,
    showUserManagement,
    showEmojiPicker,
    showChangePassword,
    showCreateUserForm,
    editingUserId,
    showUserDataManagement
  ]);

  // 修改现有的点击外部区域关闭菜单的 useEffect
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        // 检查是否点击在 emoji 面板内部
        const emojiPanel = document.querySelector('.emoji-picker-panel');
        if (showEmojiPicker && emojiPanel && emojiPanel.contains(event.target)) {
          return; // 点击在 emoji 面板内部，不关闭
        }

        // 按优先级关闭模态框
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
        } else {
          setShowMenu(false);
          setShowLoginForm(false);
          setShowRegisterForm(false);
          setShowProfile(false);
          setShowCharacterEdit(false);
          setShowUserManagement(false);
          setShowChangePassword(false);
          setShowCreateUserForm(false);
          setEditingUserId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]); // 添加 showEmojiPicker 依赖

  const onUpdateActions = () => {
    fetchUsers();
    fetchProfile();
    if (onUpdate) onUpdate();
  }
  // 添加处理emoji选择的函数
  const handleEmojiSelect = (emoji) => {
    setCharacterInfo({...characterInfo, avatar: emoji});
    setShowEmojiPicker(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log('Submitting form...', username, password, isRegistering);

    try {
      // 根据 isRegistering 状态选择正确的 endpoint
      const endpoint = isRegistering ? `${CONFIG.API_BASE_URL}/api/auth/register` : `${CONFIG.API_BASE_URL}/api/auth/login`;
      console.log('Using endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (response.ok) {
        if (!isRegistering) {
          // 登录逻辑
          // 保存令牌到localStorage
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          // 调用父组件的登录回调
          if (onLogout) {
            onLogout(data.username);
          }
          // 关闭表单
          setShowLoginForm(false);
          setShowMenu(false);
          onUpdateActions();
        } else {
          // 注册成功逻辑
          setIsRegistering(false);
          alert('Registration successful! Please login.');
          setShowRegisterForm(false);
          setShowLoginForm(true); // 切换到登录表单
          onUpdateActions();
        }
      } else {
        setError(data.error || 'Operation failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    AuthManager.clearTokens();
    if (onLogout) onLogout(null);
    setShowMenu(false);
    setShowProfile(false);
    setShowCharacterEdit(false);
  };

  const fetchProfile = async () => {
    try {
      const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/user/profile`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // 保存角色信息
  const saveCharacterInfo = async () => {
    try {
      const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/character/info`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(characterInfo)
      });

      if (response.ok) {
        if (onShowStatus) onShowStatus('角色信息已更新');
        onUpdateActions();
        setShowCharacterEdit(false);
      } else {
        alert('更新角色信息失败');
      }
    } catch (error) {
      console.error('保存角色信息时发生错误:', error);
      alert('网络错误: ' + error.message);
    }
  };

  // 计算菜单位置样式
  const getMenuPositionStyle = () => {
    const baseStyle = {
      position: 'absolute',
      zIndex: 90010,
      background: 'white',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      minWidth: '150px',
      overflow: 'hidden'
    };

    switch (position) {
      case 'bottom-right':
        return { ...baseStyle, top: '100%', right: 0 };
      case 'bottom-left':
        return { ...baseStyle, top: '100%', left: 0 };
      default:
        return { ...baseStyle, top: '100%', right: 0 };
    }
  };

  // 获取用户列表
  const fetchUsers = async () => {
    if (!currentUser) return;

    try {
      setLoadingUsers(true);
      const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // 删除用户
  const deleteUser = async (username) => {
    if (!window.confirm(`确定要删除用户 "${username}" 吗?`)) return;

    try {
      const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/users/${username}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUsers(users.filter(user => user.username !== username));
        if (onShowStatus) onShowStatus(`用户 ${username} 已删除`);
      } else {
        throw new Error('删除失败');
      }
    } catch (error) {
      console.error('删除用户失败:', error);
      if (onShowStatus) onShowStatus('删除用户失败: ' + error.message);
    }
  };

  // 创建新用户
  const createUser = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      if (onShowStatus) onShowStatus('用户名和密码不能为空');
      return;
    }

    try {
      // 准备发送到后端的数据
      const userData = {
        username: newUser.username,
        password: newUser.password,
        permissions: newUser.permissions || ['user'] // 默认权限为普通用户
      };

      const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const data = await response.json();
        setUsers([...users, data.user]);
        setNewUser({ username: '', password: '', permissions: ['user'] }); // 重置表单，包括权限
        if (onShowStatus) onShowStatus('用户创建成功');
        // 成功创建用户后隐藏表单
        setShowCreateUserForm(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建失败');
      }
    } catch (error) {
      console.error('创建用户失败:', error);
      if (onShowStatus) onShowStatus('创建用户失败: ' + error.message);
    }
  };

  const updateUser = async (username, newData) => {
    try {
      const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/users/${username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData) // 可以包含 password 和 permissions 字段
      });

      if (response.ok) {
        if (onShowStatus) onShowStatus(`用户 ${username} 信息已更新`);
        setEditingUserId(null);
        setEditUserData({ password: '', permissions: ['user'] });
        // 重新获取用户列表以反映更改
        fetchUsers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新失败');
      }
    } catch (error) {
      console.error('更新用户失败:', error);
      if (onShowStatus) onShowStatus('更新用户失败: ' + error.message);
    }
  };
  const updateUserPermissions = async (username, newPermissions) => {
    try {
      // 这里需要一个专门用于更新权限的API端点
      // 由于当前API只支持更新密码，我们需要修改后端或使用其他方式
      // 暂时只提示功能
      if (onShowStatus) onShowStatus(`用户 ${username} 权限更新功能待实现`);
    } catch (error) {
      console.error('更新用户权限失败:', error);
      if (onShowStatus) onShowStatus('更新用户权限失败: ' + error.message);
    }
  };
  // 添加修改密码函数
  const handleChangePassword = async (e) => {
    e.preventDefault();

    // 验证新密码和确认密码
    if (newPassword !== confirmPassword) {
      setPasswordError('新密码和确认密码不匹配');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError('新密码长度至少为4位');
      return;
    }

    try {
      // 调用后端API修改密码
      const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/user/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess('密码修改成功');
        setPasswordError('');
        // 清空表单
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // 3秒后自动隐藏成功消息
        setTimeout(() => {
          setPasswordSuccess('');
          setShowChangePassword(false);
        }, 800);
      } else {
        setPasswordError(data.error || '密码修改失败');
      }
    } catch (error) {
      setPasswordError('网络错误，请稍后重试');
    }
  };



  // 添加全选当前页功能
  const handleSelectAllCurrentPage = () => {
    const startIdx = (currentUserDataPage - 1) * userDataLogsPerPage;
    const endIdx = currentUserDataPage * userDataLogsPerPage;
    const currentPageUsers = users.slice(startIdx, endIdx);

    if (selectAllCurrentPage) {
      // 取消选择当前页用户
      setSelectedUsers(prev => prev.filter(user => !currentPageUsers.some(u => u.username === user)));
    } else {
      // 选择当前页所有用户（去重）
      const newSelected = [...new Set([...selectedUsers, ...currentPageUsers.map(u => u.username)])];
      setSelectedUsers(newSelected);

    }
    setSelectAllCurrentPage(!selectAllCurrentPage);
    const allUsersSelected = users.length > 0 && users.every(u => selectedUsers.includes(u.username));
    setSelectAllUsers(!allUsersSelected);
  };

  // 添加全选所有功能
  const handleSelectAllUsers = () => {
    if (selectAllUsers) {
      // 取消选择所有用户
      setSelectedUsers([]);
    } else {
      // 选择所有用户
      setSelectedUsers(users.map(user => user.username));
    }
    setSelectAllUsers(!selectAllUsers);
    setSelectAllCurrentPage(!selectAllUsers); // 同步全选当前页状态
  };

  // 更新用户选择处理函数
  // const handleUserSelect = (username) => {
  //   if (selectedUsers.includes(username)) {
  //     const newSelected = selectedUsers.filter(user => user !== username);
  //     setSelectedUsers(newSelected);
  //
  //     // 检查当前页是否全部被取消选择
  //     const startIdx = (currentUserDataPage - 1) * userDataLogsPerPage;
  //     const endIdx = currentUserDataPage * userDataLogsPerPage;
  //     const currentPageUsers = users.slice(startIdx, endIdx);
  //
  //     const allCurrentPageSelected = currentPageUsers.every(u => newSelected.includes(u.username));
  //     setSelectAllCurrentPage(allCurrentPageSelected);
  //   } else {
  //     const newSelected = [...selectedUsers, username];
  //     setSelectedUsers(newSelected);
  //   }
  //
  //   // 检查是否所有用户都被选择
  //   const allUsersSelected = users.length > 0 && users.every(u => selectedUsers.includes(u.username));
  //   setSelectAllUsers(allUsersSelected);
  // };

  const handleUserSelect = (username) => {
    let newSelected;
    if (selectedUsers.includes(username)) {
      // 取消选择该用户
      newSelected = selectedUsers.filter(user => user !== username);
      setSelectedUsers(newSelected);

      // 由于取消了一个选择，全选状态应该变为false
      setSelectAllUsers(false);
    } else {
      // 选择该用户
      newSelected = [...selectedUsers, username];
      setSelectedUsers(newSelected);

      // 检查是否所有用户都已被选择
      const allUsersSelected = users.length > 0 && users.every(u => newSelected.includes(u.username));
      setSelectAllUsers(allUsersSelected);
    }

    // 检查当前页的全选状态 - 使用更新后的 newSelected 状态
    const startIdx = (currentUserDataPage - 1) * userDataLogsPerPage;
    const endIdx = currentUserDataPage * userDataLogsPerPage;
    const currentPageUsers = users.slice(startIdx, endIdx);
    const allCurrentPageSelected = currentPageUsers.length > 0 &&
                                   currentPageUsers.every(u => newSelected.includes(u.username));
    setSelectAllCurrentPage(allCurrentPageSelected);
  };





  // 修改备份用户数据函数
  const handleBackup = async () => {
      if (!currentUser && selectedUsers.length === 0) {
          if (onShowStatus) onShowStatus('请选择要备份的用户');
          return;
      }

      const usersToBackup = selectedUsers.length > 0 ? selectedUsers : [currentUser];
      setBackupLoading(true);

      try {
          const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/user/backup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                users: usersToBackup,
                current_user: currentUser,
              })
          });

          if (response.ok) {
              // 创建 Blob URL 并触发下载
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);

              // 创建下载链接
              const a = document.createElement('a');
              a.href = url;

              // 使用当前日期和时间作为文件名的一部分
              const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
              const time = new Date().toTimeString().slice(0, 8).replace(/:/g, '');

              a.download = userPermissions.includes('admin') ? `backup_admin_${timestamp}_${time}.zip`:`backup_${currentUser}_${timestamp}_${time}.zip`;

              document.body.appendChild(a);
              a.click();

              // 清理
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);

              // 提示用户检查下载位置
              if (onShowStatus) onShowStatus('备份成功，文件已开始下载。请检查浏览器下载文件夹。');
          } else {
              const errorData = await response.json();
              throw new Error(errorData.error || '备份失败');
          }
      } catch (error) {
          console.error('备份失败:', error);
          if (onShowStatus) onShowStatus('备份失败: ' + error.message);
      } finally {
          setBackupLoading(false);
      }
  };

  // 修改还原用户数据函数
  const handleRestore = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      setRestoreLoading(true);
      setRestoreResult(null);

      const formData = new FormData();
      formData.append('backup', file);
      formData.append('current_user', currentUser);

      try {
          const response = await AuthManager.authenticatedFetch(`${CONFIG.API_BASE_URL}/api/user/restore`, {
              method: 'POST',
              body: formData
          });

          if (response.ok) {
              const result = await response.json();
              setRestoreResult(result);
              if (onShowStatus) onShowStatus('还原成功');
              // 刷新当前用户数据
              if (onUpdate) onUpdate();
          } else {
              const errorData = await response.json();
              throw new Error(errorData.error || '还原失败');
              alert(errorData.error || '还原失败');
              if (onUpdate) onUpdate();
          }
      } catch (error) {
          console.error('还原失败:', error);
          if (onShowStatus) onShowStatus('还原失败: ' + error.message);
          alert('还原失败: ' + error.message);
          if (onUpdate) onUpdate();
      } finally {
          setRestoreLoading(false);
      }
  };



  return (
    <div className="user-menu-container" ref={menuRef}>
      {/* 用户菜单按钮 */}
      {trigger ? (
        React.cloneElement(trigger, {
          // onClick: () => setShowMenu(!showMenu),
          onClick: () => {
            // 如果禁用了左键点击，则不执行任何操作
            if (!disableLeftClick) {
              setShowMenu(!showMenu);
            }
          },
          onContextMenu: (e) => {
            e.preventDefault();
            setShowMenu(!showMenu);
          }
        })
      ) : (
        <button
          className="user-menu-button"
          onClick= {() => {
            // 如果禁用了左键点击，则不执行任何操作
            if (!disableLeftClick) {
              setShowMenu(!showMenu);
            }
          }}
          // onClick={() => setShowMenu(!showMenu)}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowMenu(!showMenu);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </button>
      )}

      {/* 主菜单 */}
      {showMenu && (
        <div className="user-dropdown-menu" style={getMenuPositionStyle()}>
          {!currentUser ? (
            <>
              <button onClick={() => {
                setShowMenu(false);
                setShowLoginForm(true);
                setIsRegistering(false);
              }}>
                登录
              </button>
              <button onClick={() => {
                setShowMenu(false);
                setShowRegisterForm(true);
                setIsRegistering(true);
              }}>
                注册
              </button>
            </>
          ) : (
            <>
              <div className="user-info-dropdown">
                <span>欢迎, {currentUser}</span>
              </div>
              <button onClick={() => {
                setShowMenu(false);
                setShowProfile(true);
                fetchProfile();
              }}>
                用户信息
              </button>
              {/* 添加角色信息按钮 */}
              <button onClick={() => {
                setCharacterInfo({
                  name: stats?.name || '冒险者',
                  avatar: stats?.avatar || '🧙‍♂️'
                });
                setShowMenu(false);
                setShowCharacterEdit(true);
              }}>
                角色信息
              </button>
              {userPermissions.includes('admin') && (
                <button onClick={() => {
                  setShowMenu(false);
                  setShowUserManagement(true);
                  fetchUsers();
                }}>
                  用户管理
                </button>
              )}



              {/*// 在主菜单中添加用户数据管理项（修改版）*/}
              <button onClick={() => {
                setShowMenu(false);
                setShowUserDataManagement(true);
                // 普通用户不需要获取所有用户列表
                if (userPermissions.includes('admin')) {
                  fetchUsers(); // 管理员获取用户列表
                } else {
                  // 普通用户设置当前用户为唯一选择
                  setSelectedUsers([currentUser]);
                }
              }}>
                数据管理
              </button>




              <button onClick={handleLogout}>
                退出
              </button>
            </>
          )}
        </div>
      )}

      {/* 登录/注册表单模态框 */}
      {(showLoginForm || showRegisterForm) && (
        <div className="user-auth-modal">
          <div className="login-container">
            <form onSubmit={handleLoginSubmit} className="login-form">
              <h2>{showRegisterForm ? '注册' : '登录'}</h2>
              {error && <div className="error-message">{error}</div>}

              <div className="form-group">
                <label>用户名:</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength="3"
                  maxLength="20"
                />
              </div>

              <div className="form-group">
                <label>密码:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="4"
                />
              </div>



              <div className="form-footer">
                <button type="submit" disabled={loading}>
                  {loading ? '处理中...' : (showRegisterForm ? '注册' : '登录')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginForm(false);
                    setShowRegisterForm(false);
                    setIsRegistering(false);
                  }}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 用户信息模态框 */}
      {showProfile && profile && (
        <div className="user-profile-modal">
          <div className="user-profile-dropdown">
            <div className="profile-header">
              <h3>用户资料</h3>
              <p>用户名: {currentUser}</p>
            </div>

            <div className="profile-details">
              <p>注册时间: {new Date(profile.created_at).toLocaleDateString()}</p>
              <p>权限: {profile.permissions?.join(', ') || '普通用户'}</p>
            </div>

            {/* 修改密码表单 */}
            {showChangePassword ? (
              <div className="change-password-form" style={{ padding: '15px', borderTop: '1px solid #eee' }}>
                <h4>修改密码</h4>
                {passwordError && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{passwordError}</div>}
                {passwordSuccess && <div className="success-message" style={{ color: 'green', marginBottom: '10px' }}>{passwordSuccess}</div>}

                <form onSubmit={handleChangePassword}>
                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label>原密码:</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                      style={{ width: '100%', padding: '5px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label>新密码:</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength="4"
                      style={{ width: '100%', padding: '5px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '10px' }}>
                    <label>确认新密码:</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={{ width: '100%', padding: '5px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div className="form-actions" style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePassword(false);
                        setPasswordError('');
                        setPasswordSuccess('');
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        // if(onUpdate) {onUpdate();}
                      }}
                      style={{ marginRight: '10px' }}
                    >
                      取消
                    </button>
                    <button type="submit">确认修改</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="profile-actions">
                {/*<button onClick={handleLogout} className="logout-btn">*/}
                {/*  退出登录*/}
                {/*</button>*/}
                <button
                  onClick={() => setShowChangePassword(true)}
                  style={{ marginRight: '10px' }}
                >
                  修改密码
                </button>
                <button onClick={() => setShowProfile(false)}>
                  关闭
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 角色信息编辑模态框 */}
      {showCharacterEdit && (
        <div className="edit-character-modal-overlay">
          <div className="edit-credit-modal">
            <h4>角色信息</h4>

            <div style={{color:'black'}}>
              <label>角色名称：</label>
              <input
                type="text"
                value={characterInfo.name}
                onChange={(e) => setCharacterInfo({...characterInfo, name: e.target.value})}
                style={{
                  width: '100%',
                  height: '32px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{color:'black'}}>
              <label>角色图标：</label>
              <div style={{
                alignItems: 'center',
                gap: '10px',
              }}>
                <input
                  type="text"
                  value={characterInfo.avatar}
                  onChange={(e) => setCharacterInfo({...characterInfo, avatar: e.target.value})}
                  onClick={() => setShowEmojiPicker(true)} // 添加点击事件直接打开emoji面板
                  style={{
                    width: '100%',
                    height: '32px',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                />
              </div>

              <div className="character-icon-preview">
                 <span className="avatar-icon">{characterInfo.avatar}</span>
              </div>

              {/* 预设图标选择面板 */}
              {showEmojiPicker && (
                <div
                  className="emoji-picker-panel"
                  style={{
                    position: 'absolute',
                    top: '180px',
                    left: '150px',
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '10px',
                    zIndex: 1002,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    maxWidth: '300px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: '5px'
                  }}>
                    {PRESET_EMOJIS.map((emoji, index) => (
                      <div
                        key={index}
                        onClick={() => handleEmojiSelect(emoji)}
                        style={{
                          fontSize: '20px',
                          cursor: 'pointer',
                          padding: '5px',
                          textAlign: 'center',
                          borderRadius: '4px'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        {emoji}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-buttons">
              <button onClick={saveCharacterInfo}>
                确认
              </button>
              <button onClick={() => setShowCharacterEdit(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}





      {showUserManagement && (
        <div className="user-management-modal-overlay">
          <div className="user-management-modal">
            <div className="modal-header">
              <h3>用户管理</h3>
              <button
                className="modal-close-button"
                onClick={() => setShowUserManagement(false)}
                style={{
                  color: 'black',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  top: '10px',
                  right: '10px'
                }}
              >
                x
              </button>
            </div>

            <div className="user-management-content">
              {/* 用户列表 */}
              <div className="users-list">
                <h4>用户列表</h4>
                {loadingUsers ? (
                  <div>加载中...</div>
                ) : (
                 <>
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>用户名</th>
                        <th>权限</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.slice((currentPage - 1) * logsPerPage, currentPage * logsPerPage).map((user, index) => (
                        <React.Fragment key={user.username}>
                          <tr>
                            <td>{user.username}</td>
                            <td>{user.permissions?.join(', ') || 'user'}</td>
                            <td>
                              <button
                                onClick={() => {
                                  // 如果已经展开该用户的编辑表单，则收起；否则展开
                                  if (editingUserId === user.username) {
                                    setEditingUserId(null);
                                  } else {
                                    setEditingUserId(user.username);
                                    // 初始化编辑数据
                                    setEditUserData({
                                      password: '',
                                      permissions: user.permissions || ['user']
                                    });
                                    // 确保创建表单关闭
                                    setShowCreateUserForm(false);
                                  }
                                }}
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => deleteUser(user.username)}
                                disabled={user.username === currentUser}
                                style={{marginLeft: '1px'}}
                              >
                                删除
                              </button>

                            </td>
                          </tr>

                          {/* 在当前用户行下方显示编辑控件 */}
                          {editingUserId === user.username && (
                            <tr>
                              <td colSpan="3">
                                <div className="edit-user-form" style={{padding: '1px', backgroundColor: '#f5f5f5'}}>
                                  <h4>编辑用户 {user.username}</h4>
                                  <div className="form-group-row">
                                    <label>新密码:</label>
                                    <input
                                      type="password"
                                      value={editUserData.password}
                                      onChange={(e) => setEditUserData({...editUserData, password: e.target.value})}
                                      style={{marginLeft: '10px', marginRight: '10px'}}
                                    />
                                  </div>
                                  <div className="form-group-row">
                                    <label>权限:</label>
                                    <div className="radio-group" style={{marginLeft: '10px'}}>
                                      <label style={{minWidth: '80px'}}>
                                        <input
                                          type="radio"
                                          name={`permission-${user.username}`}
                                          value="user"
                                          checked={!editUserData.permissions || editUserData.permissions.includes('user')}
                                          onChange={(e) => setEditUserData({
                                            ...editUserData,
                                            permissions: e.target.checked ? ['user'] : []
                                          })}
                                        />
                                        普通用户
                                      </label>
                                      <label style={{minWidth: '80px'}}>
                                        <input
                                          type="radio"
                                          name={`permission-${user.username}`}
                                          value="admin"
                                          checked={editUserData.permissions && editUserData.permissions.includes('admin')}
                                          onChange={(e) => setEditUserData({
                                            ...editUserData,
                                            permissions: e.target.checked ? ['admin'] : []
                                          })}
                                        />
                                        管理员
                                      </label>
                                    </div>
                                  </div>
                                  <div style={{marginTop: '10px'}}>
                                    <button
                                      onClick={async () => {
                                        const updateData = {};

                                        // 如果有密码输入，则包含密码
                                        if (editUserData.password) {
                                          updateData.password = editUserData.password;
                                        }

                                        // 如果权限有变化，则包含权限
                                        if (JSON.stringify(editUserData.permissions) !== JSON.stringify(user.permissions || ['user'])) {
                                          updateData.permissions = editUserData.permissions;
                                        }

                                        // 只有当有数据需要更新时才发送请求
                                        if (Object.keys(updateData).length > 0) {
                                          console.log('updateData:', updateData)
                                          await updateUser(user.username, updateData);
                                        } else {
                                          setEditingUserId(null); // 没有更改则直接关闭
                                        }
                                      }}
                                    >
                                      确认
                                    </button>
                                    <button
                                      onClick={() => setEditingUserId(null)}
                                      style={{marginLeft: '5px'}}
                                    >
                                      取消
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}




                      {/* 在表格底部添加 "+" 按钮 */}
                      {users.length > 0 && (
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'left' }}>
                            <button
                              onClick={() => {
                                if (showCreateUserForm) {
                                  setShowCreateUserForm(false);
                                } else {
                                  setShowCreateUserForm(true);
                                  setEditingUserId(null);
                                }
                              }}
                              title="创建新用户"
                            >
                              + 新用户
                            </button>
                          </td>
                        </tr>
                      )}

                      {/* 如果用户列表为空，也显示 "+" 按钮 */}

                    </tbody>
                  </table>

                  <div className="pagination-controls">
                    <button
                      onClick={() => paginate(1)}
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
                      <span className="page-total">/ {totalPages || 1}</span>
                    </div>

                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="pagination-btn"
                      title="下一页"
                    >
                      {">"}
                    </button>

                    <button
                      onClick={() => paginate(totalPages)}
                      disabled={currentPage === totalPages || totalPages === 0}
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
                        // localStorage.setItem('logsPerPage', newLogsPerPage.toString());
                        userDataManager.setUserData('logsPerPage', newLogsPerPage.toString());
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
                 </>
                )}
              </div>





              {/* 新建用户表单 - 根据状态决定是否显示 */}
              {showCreateUserForm && (
                <div className="create-user-form">
                  <h4>创建新用户</h4>
                  <form onSubmit={createUser}>
                    <div className="form-group-row">
                      <label>用户名:</label>
                      <input
                        type="text"
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                        required
                        minLength="3"
                        maxLength="20"
                      />
                    </div>

                    <div className="form-group-row">
                      <label>密码:</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        required
                        minLength="4"
                      />
                    </div>

                    <div className="form-group-row">
                      <label>权限:</label>
                      <div className="radio-group">
                        <label style={{minWidth: '80px'}}>
                          <input
                            type="radio"
                            name="permission"
                            value="user"
                            checked={!newUser.permissions || newUser.permissions.includes('user')}
                            onChange={(e) => setNewUser({...newUser, permissions: e.target.checked ? ['user'] : []})}
                          />
                          普通用户
                        </label>
                        <label style={{minWidth: '80px'}}>
                          <input
                            type="radio"
                            name="permission"
                            value="admin"
                            checked={newUser.permissions && newUser.permissions.includes('admin')}
                            onChange={(e) => setNewUser({...newUser, permissions: e.target.checked ? ['admin'] : []})}
                          />
                          管理员
                        </label>
                      </div>
                    </div>

                    <div className="form-submit-actions" style={{textAlign: 'center'}}>
                      <button type="submit">提交</button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateUserForm(false);
                          setEditingUserId(null); // 隐藏所有编辑控件
                        }}
                        style={{marginLeft: '10px'}}
                      >
                        取消
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/*// 用户数据管理弹窗组件*/}
      {showUserDataManagement && (
        <div className="user-management-modal-overlay">
          <div className="user-management-modal">
            <div className="modal-header">
              <h3>用户数据管理</h3>
              <button
                className="modal-close-button"
                onClick={() => setShowUserDataManagement(false)}
                style={{
                  color: 'black',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  top: '10px',
                  right: '10px'
                }}
              >
                x
              </button>
            </div>

            <div className="user-management-content">
              {/* 管理员模式下显示用户选择 */}
              {userPermissions.includes('admin') && (
                <div className="user-selection-section" style={{ marginBottom: '20px', padding: '1px', border: '1px solid #ddd', borderRadius: '4px',color: '#333' }}>
                  <h4>选择用户</h4>
                  <div style={{ display:'flex', flexDirection:'column',fontSize: '12px', color: '#666',textAlign: 'start',  }}>
                    {selectedUsers.length > 0
                      ? `已选择 ${selectedUsers.length} 个用户`
                      : '请选择需要备份的用户'}
                    <div style={{ display:'flex', flexDirection:'row',marginBottom:'10px'}}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          id="select-all-current-page"
                          checked={selectAllCurrentPage}
                          onChange={handleSelectAllCurrentPage}
                          style={{ marginRight: '8px' }}
                        />
                        <label htmlFor="select-all-current-page">当前页</label>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          id="select-all-users"
                          checked={selectAllUsers}
                          onChange={handleSelectAllUsers}
                          style={{ marginRight: '8px' }}
                        />
                        <label htmlFor="select-all-users">全选</label>
                      </div>
                    </div>

                  </div>



                  <div style={{display: 'flex', flexDirection: 'row', maxHeight: '200px', overflowY: 'auto', marginBottom: '15px',  }}>
                    {users.slice((currentUserDataPage - 1) * userDataLogsPerPage, currentUserDataPage * userDataLogsPerPage).map((user, index) => (
                      <div key={user.username} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px',marginRight: '10px' }}>
                        <input
                          type="checkbox"
                          id={`user-${user.username}`}
                          checked={selectedUsers.includes(user.username)}
                          onChange={() => handleUserSelect(user.username)}
                          style={{ marginRight: '8px' }}
                        />
                        <label htmlFor={`user-${user.username}`}>{user.username}</label>
                      </div>
                    ))}
                  </div>


                  <div className="pagination-controls">
                    <button
                      onClick={() => userDataPaginate(1)}
                      disabled={currentUserDataPage === 1}
                      className="pagination-btn"
                      title="第一页"
                    >
                      {"<<"}
                    </button>

                    <button
                      onClick={() => userDataPaginate(currentUserDataPage - 1)}
                      disabled={currentUserDataPage === 1}
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
                        max={totalUserDataPages}
                        value={userDataInputPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value) || '';
                          setUserDataInputPage(page);
                        }}
                        onBlur={() => {
                          // 失焦时如果输入有效页码则跳转
                          if (userDataInputPage >= 1 && userDataInputPage <= totalUserDataPages && userDataInputPage !== currentUserDataPage) {
                            userDataPaginate(userDataInputPage);
                          }
                          // 如果输入无效页码，重置为当前页
                          if (userDataInputPage < 1 || userDataInputPage > totalUserDataPages) {
                            setUserDataInputPage(currentUserDataPage);
                          }
                        }}
                        onKeyDown={(e) => {
                          // 按回车键时跳转
                          if (e.key === 'Enter') {
                            if (userDataInputPage >= 1 && userDataInputPage <= totalUserDataPages && userDataInputPage !== currentUserDataPage) {
                              userDataPaginate(userDataInputPage);
                            }
                            // 如果输入无效页码，重置为当前页
                            if (userDataInputPage < 1 || userDataInputPage > totalUserDataPages) {
                              setUserDataInputPage(currentUserDataPage);
                            }
                          }
                        }}
                        className="page-input"
                      />
                      <span className="page-total">/ {totalUserDataPages || 1}</span>
                    </div>

                    <button
                      onClick={() => userDataPaginate(currentUserDataPage + 1)}
                      disabled={currentUserDataPage === totalUserDataPages || totalUserDataPages === 0}
                      className="pagination-btn"
                      title="下一页"
                    >
                      {">"}
                    </button>

                    <button
                      onClick={() => userDataPaginate(totalUserDataPages)}
                      disabled={currentUserDataPage === totalUserDataPages || totalUserDataPages === 0}
                      className="pagination-btn"
                      title="最后一页"
                    >
                      {">>"}
                    </button>

                    <select
                      value={userDataLogsPerPage}
                      onChange={(e) => {
                        const newUserDataLogsPerPage = Number(e.target.value);
                        setUserDataLogsPerPage(newUserDataLogsPerPage);
                        // localStorage.setItem('logsPerPage', newUserDataLogsPerPage.toString());
                        userDataManager.setUserData('userDataLogsPerPage', newUserDataLogsPerPage.toString());
                        setCurrentUserDataPage(1); // 重置到第一页
                        setUserDataInputPage(1); // 同步更新输入框的值
                      }}
                      className="logs-per-page-select"
                    >
                      <option value="10">10/页</option>
                      <option value="20">20/页</option>
                      <option value="50">50/页</option>
                      <option value="100">100/页</option>
                      <option value="200">200/页</option>
                    </select>
                  </div>


                </div>
              )}

              {/* 普通用户显示提示信息 */}
              {!userPermissions.includes('admin') && (
                <div className="user-selection-section" style={{ marginBottom: '20px', border: '1px solid #ddd', borderRadius: '4px',color: '#333' }}>
                  <h4>当前用户({currentUser})</h4>
                  <div style={{ marginBottom: '15px' }}>
                    <p>您只能备份和还原自己的数据 </p>
                  </div>
                </div>
              )}

              {/* 操作按钮区域 */}
              <div className="backup-restore-section" style={{  border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
                <h4>数据备份与还原</h4>

                {!userPermissions.includes('admin') && (
                  <div style={{ marginBottom: '15px' }}>
                    <p>支持.zip格式文件</p>
                  </div>
                )}
                {userPermissions.includes('admin') && (
                  <div style={{ marginBottom: '15px' }}>
                    <p>支持.zip格式文件</p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', justifyContent: 'center'}}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={handleBackup}
                            disabled={backupLoading}
                            style={{
                                padding: '10px 20px',
                                background: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                opacity: backupLoading ? 0.6 : 1
                            }}
                        >
                            {backupLoading ? '备份中...' : '备份数据'}
                        </button>

                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

                        <input
                            type="file"
                            id="restore-file"
                            accept=".zip"
                            onChange={handleRestore}
                            disabled={restoreLoading}
                            style={{ display: 'none' }}
                        />
                        <label
                            htmlFor="restore-file"
                            style={{
                                padding: '8px 14px',
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'inline-block',
                                opacity: restoreLoading ? 0.6 : 1
                            }}
                            title="选择备份文件(.zip)"
                        >
                            {restoreLoading ? '还原中...' : '还原数据'}
                        </label>

                    </div>
                </div>

                {restoreResult && (
                    <div style={{
                        padding: '10px',
                        backgroundColor: '#d4edda',
                        color: '#155724',
                        border: '1px solid #c3e6cb',
                        borderRadius: '4px',
                        marginTop: '10px'
                    }}>
                        <strong>还原结果:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                            {restoreResult.message && <li>{restoreResult.message}</li>}
                            {restoreResult.users && restoreResult.users.map((user, index) => (
                                <li key={index}>用户: {user}</li>
                            ))}
                        </ul>
                    </div>
                )}


              </div>
            </div>
          </div>
        </div>
      )}



    </div>
  );
};

export default UserMenu;
