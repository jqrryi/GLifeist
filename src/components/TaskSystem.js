// src/components/TaskSystem.js
import React, { useState, useEffect, useRef } from 'react';
import CONFIG from '../config';
import './TaskTab.css';
import './TaskSystem.css';
import TaskTab from './TaskTab'; // 引入TaskTab组件
import './taskEffects.css';
import {useLogs} from "../contexts/LogContext";
import { createTaskDirectly, applyFieldShortcut } from '../utils/taskUtils';
import SettingsModal from './SettingsModal';
import {calculatePropertyLevel} from '../utils/characterUtils'; // 导入工具函数
import AuthManager from '../utils/auth';
import userDataManager from "../utils/userDataManager";

const TaskSystem = ({
  settings,
  defaultSettings,
  data,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
  onShowStatus,
  // characterSettings,
  allItems,
  items,
  stats,
  credits,
  taskCategories,
  taskDomains,
  taskPriorities,
  taskStatuses,
  taskCycleTypes,
  actionButtonSettings,
  mainActionButtonSettings,
  borderSettings,
  calendarViewSettings,
  // codeSettings,
  onCharacterUpdate,
  onCreditUpdate,
  onItemUpdate,
  onTaskUpdate,
  // taskFieldMappings,
  defaultViewMode,
  creditTypes,
  expFormulas,
  quickAddTaskHint,
  onHideTopNavChange,
  hideTopNav,
  externalHideTopControls,
}) => {
  const tasks = data.tasks || [];
  // console.log('loading settings', settings)
  // console.log('loading taskfieldmappings', settings?.taskFieldMappings)

  const taskFieldMappings = (settings?.taskFieldMappings && Object.keys(settings.taskFieldMappings).length > 0)
    ? settings.taskFieldMappings
    : ((defaultSettings?.taskFieldMappings && Object.keys(defaultSettings.taskFieldMappings).length > 0)
       ? defaultSettings.taskFieldMappings
       : {
           // 提供默认的字段映射配置
           categories: {},
           domains: {},
           priorities: {},
           cycleTypes: {},
           statuses: {}
         });

  // const taskFieldMappings = settings.taskFieldMappings?.length >0 ? settings.taskFieldMappings : defaultSettings.taskFieldMappings;


  const characterSettings = (settings?.characterSettings && settings.characterSettings.length > 0)
    ? settings.characterSettings
    : ((defaultSettings?.characterSettings && defaultSettings.characterSettings.length > 0)
       ? defaultSettings.characterSettings
       : []);

  // console.log('taskFieldMappings: ', taskFieldMappings)

  const [showTaskDetails, setShowTaskDetails] = useState(null);
  const [showTaskMenu, setShowTaskMenu] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(null);
  const [characterInfo, setCharacterInfo] = useState({
    level: 1,
    experience: 0,
    credits: {},
  });

  const [hoveredTask, setHoveredTask] = useState(null);
  const [selectedField, setSelectedField] = useState(() => {
    // const savedSelectedField = localStorage.getItem('selectedField');
    const savedSelectedField = userDataManager.getUserData('selectedField');
    return savedSelectedField || null;
  });

  const [selectedFieldValue, setSelectedFieldValue] = useState(() => {
    // const savedSelectedFieldValue = localStorage.getItem('selectedFieldValue');
    const savedSelectedFieldValue = userDataManager.getUserData('selectedFieldValue');
    // 如果保存的值是字符串 "null" 或不存在，则返回 null
    if (!savedSelectedFieldValue || savedSelectedFieldValue === 'null') {
      return null;
    }
    return savedSelectedFieldValue;
  });

  const [colorScheme, setColorScheme] = useState(() => {
    // const savedColorScheme = localStorage.getItem('colorScheme');
    const savedColorScheme = userDataManager.getUserData('colorScheme');
    return savedColorScheme || 'category';
  });

  const [layout, setLayout] = useState(() => {
    // const savedLayout = localStorage.getItem('layout');
    const savedLayout = userDataManager.getUserData('layout');
    return savedLayout || 'grid-2';
  });

  const [sortField, setSortField] = useState(() => {
    // const savedSortField = localStorage.getItem('sortField');
    const savedSortField = userDataManager.getUserData('sortField');
    return savedSortField || 'priority';
  });

  const [sortOrder, setSortOrder] = useState(() => {
    // const savedSortOrder = localStorage.getItem('sortOrder');
    const savedSortOrder = userDataManager.getUserData('sortOrder');
    return savedSortOrder || 'desc';
  });
  // 添加经典模式视图状态
  const [classicViewMode, setClassicViewMode] = useState(null);

  const [toolbarScale, setToolbarScale] = useState(() => {
    // const savedScale = localStorage.getItem('toolbarScale');
    const savedScale = userDataManager.getUserData('toolbarScale');
    return savedScale || '1';
  });

  const [showQuickTaskInput, setShowQuickTaskInput] = useState(false);
  const [quickTaskInput, setQuickTaskInput] = useState('');

  const [showLogs, setShowLogs] = useState(false); // 控制日志显示状态
  const [currentPage, setCurrentPage] = useState(1); // 当前页码
  const [logsPerPage, setLogsPerPage] = useState(10); // 每页日志数
  const [inputPage, setInputPage] = useState(currentPage); // 用于页码输入框的状态


  const [commandInput, setCommandInput] = useState(''); // 用于处理命令输入
  const [searchTerm, setSearchTerm] = useState('');
  // 快捷键
  const [hotkeyMode, setHotkeyMode] = useState(null); // null, 'select-field', 'select-value'
  const [hotkeyField, setHotkeyField] = useState(null);
  const [hotkeyHints, setHotkeyHints] = useState({});
  // 首先添加任务提示框的状态 (这部分应该已经在文件中)
  const [tooltipState, setTooltipState] = useState({
    visible: false,
    task: null,
    element: null
  });
  const [showCharacterStats, setShowCharacterStats] = useState(false);
  const [showCharacterStatsPopup, setShowCharacterStatsPopup] = useState(false);
  const [characterStatsPopupPosition, setCharacterStatsPopupPosition] = useState({ x: 0, y: 0 });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [targetSettingsGroup, setTargetSettingsGroup] = useState('');


  // 在 TaskSystem 组件中添加拖拽相关状态
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [toolbarSize, setToolbarSize] = useState({ width: 0, height: 0 });
  // 在 TaskSystem 组件中修改 toolbarPosition 状态初始化
  const [toolbarPosition, setToolbarPosition] = useState(() => {
    // const savedPosition = localStorage.getItem('toolbarPosition');
    const savedPosition = userDataManager.getUserData('toolbarPosition');
    // console.log('Initializing toolbarPosition from localStorage:', savedPosition);
    // 确保只使用支持的值
    const validPositions = ['top', 'vertical', 'horizontal'];
    if (savedPosition && validPositions.includes(savedPosition)) {
      return savedPosition;
    }
    return 'top'; // 默认值
  });
  // 添加 toolbar 自定义位置状态
  const [toolbarCustomPosition, setToolbarCustomPosition] = useState(() => {
    // const savedCustomPosition = localStorage.getItem('toolbarCustomPosition');
    const savedCustomPosition = userDataManager.getUserData('toolbarCustomPosition');
    if (savedCustomPosition) {
      try {
        const position = JSON.parse(savedCustomPosition);
        // console.log('Loaded toolbar position from localStorage:', position);
        if (typeof position === 'object' && position !== null &&
            (position.x !== null || position.y !== null)) {
          return {
            x: position.x !== null ? position.x : null,
            y: position.y !== null ? position.y : null
          };
        }
      } catch (e) {
        console.error('Failed to parse toolbar position from localStorage:', e);
      }
    }
    // 默认返回 null 值而不是 {x: 0, y: 0}
    return { x: null, y: null };
  });
  // 添加移动端触摸滚动状态
  const [isTouchScrolling, setIsTouchScrolling] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  // 在 TaskSystem 组件中添加按钮滚动相关状态
  const [buttonScrollPosition, setButtonScrollPosition] = useState(0);
  const maxVisibleButtons = 8; // 最大显示按钮数







  const { logs, addLog } = useLogs();

  const taskLogs = logs.filter(log => log.component === '任务');
  // 添加分页计算逻辑
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = taskLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(taskLogs.length / logsPerPage);
  // 添加分页切换函数
  const paginate = (pageNumber) => {
    // 确保页码在有效范围内
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > totalPages) pageNumber = totalPages;
    setCurrentPage(pageNumber);
    setInputPage(pageNumber); // 同步更新输入框的值
  };







  // 在 useEffect 中添加状态保存逻辑
  useEffect(() => {
    // localStorage.setItem('selectedField', selectedField);
    userDataManager.setUserData('selectedField', selectedField);
  }, [selectedField]);

  // useEffect(() => {
  //   localStorage.setItem('selectedFieldValue', selectedFieldValue);
  // }, [selectedFieldValue]);
  useEffect(() => {
    if (selectedFieldValue === null) {
      // localStorage.setItem('selectedFieldValue', 'null');
      userDataManager.setUserData('selectedFieldValue', 'null');
    } else {
      // localStorage.setItem('selectedFieldValue', selectedFieldValue);
      userDataManager.setUserData('selectedFieldValue', selectedFieldValue);
    }
  }, [selectedFieldValue]);
  useEffect(() => {
    // const savedSelectedField = localStorage.getItem('selectedField');
    // const savedSelectedFieldValue = localStorage.getItem('selectedFieldValue');
    const savedSelectedField = userDataManager.getUserData('selectedField');
    const savedSelectedFieldValue = userDataManager.getUserData('selectedFieldValue');

    // 如果有保存的字段选择，则恢复它
    if (savedSelectedField) {
      setSelectedField(savedSelectedField);
    }

    // 只有当 selectedField 存在且 savedSelectedFieldValue 不是 "null" 字符串时才设置
    if (savedSelectedField && savedSelectedFieldValue && savedSelectedFieldValue !== 'null') {
      setSelectedFieldValue(savedSelectedFieldValue);
    }
  }, []);

  useEffect(() => {
    // localStorage.setItem('colorScheme', colorScheme);
    userDataManager.setUserData('colorScheme', colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    // localStorage.setItem('layout', layout);
    userDataManager.setUserData('layout', layout);
  }, [layout]);

  useEffect(() => {
    // localStorage.setItem('sortField', sortField);
    userDataManager.setUserData('sortField', sortField);
  }, [sortField]);

  useEffect(() => {
    // localStorage.setItem('sortOrder', sortOrder);
    userDataManager.setUserData('sortOrder', sortOrder);
  }, [sortOrder]);

  useEffect(() => {
    // localStorage.setItem('classicViewMode', classicViewMode);
    userDataManager.setUserData('classicViewMode', classicViewMode);
  }, [classicViewMode]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // 检查点击的元素是否在任务菜单外部
      if (showTaskMenu && !event.target.closest('.task-menu-dropdown') && !event.target.closest('.task-menu-button')) {
        setShowTaskMenu(null);
      }
    };

    // 添加全局点击事件监听器
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      // 清理事件监听器
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTaskMenu]);

  // 通知其他视图：showTaskDetails
  useEffect(() => {
    const handleShowTaskDetails = (event) => {
      const { task } = event.detail;
      setShowTaskDetails(task);
    };

    window.addEventListener('showTaskDetails', handleShowTaskDetails);

    return () => {
      window.removeEventListener('showTaskDetails', handleShowTaskDetails);
    };
  }, []);

  // 添加全局点击监听器来关闭弹窗
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCharacterStatsPopup && !event.target.closest('.character-stats-popup')) {
        setShowCharacterStatsPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCharacterStatsPopup]);

  const tooltipRef = useRef(null);

  const formatNumber = (num) => {
    if (num === undefined  || num === null || isNaN(num)) {
      return '';
    }

    if (num >= 1000000000) { // 十亿
      return (num / 1000000000).toFixed(1) + 'b';
    } else if (num >= 10000000) { // 一千万
      return (num / 10000000).toFixed(1) + 'kw';
    } else if (num >= 1000000) { // 一百万
      return (num / 1000000).toFixed(1) + 'm';
    } else if (num >= 10000) { // 一万
      return (num / 10000).toFixed(1) + 'w';
    } else if (num >= 1000) { // 一千
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toFixed(0).toString();
  };

  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(() => {
    // const savedCollapsed = localStorage.getItem('toolbarCollapsed');
    const savedCollapsed = userDataManager.getUserData('toolbarCollapsed');
    return savedCollapsed === 'true';
  });

  // 新增状态：控制显示模式（卡片模式或经典模式）
  const [viewMode, setViewMode] = useState(() => {
    // const savedViewMode = localStorage.getItem('taskViewMode');
    const savedViewMode = userDataManager.getUserData('taskViewMode');
    // 如果保存的视图模式是具体的视图类型，则设置为 'classic'
    if (savedViewMode && (savedViewMode === 'list' || savedViewMode === 'board' || savedViewMode === 'calendar')) {
      return 'classic';
    }
    return savedViewMode || 'card';

  });

  // 新增状态：控制编辑任务
  const [editingTask, setEditingTask] = useState(null);
  // 添加 useEffect 监听 editingTask 变化
  useEffect(() => {
    if (editingTask && viewMode === 'classic') {
      // console.log('editingTask to dispatch: ', editingTask)
      // 可以通过自定义事件或其他方式通知 TaskTab 组件打开编辑模态框
      window.dispatchEvent(new CustomEvent('openTaskEdit', { detail: { task: editingTask } }));
    }
  }, [editingTask, viewMode]);

  // 从配置中获取字段映射
  const fieldLabels = {
    category: '类别',
    domain: '领域',
    priority: '优先级',
    task_type: '循环周期',
    status: '状态'
  };
  const fieldOptions = {
    category: Object.keys(taskFieldMappings.categories || {}),
    domain: Object.keys(taskFieldMappings.domains || {}),
    priority: Object.keys(taskFieldMappings.priorities || {}),
    task_type: Object.keys(taskFieldMappings.cycleTypes || {}),
    status: Object.keys(taskFieldMappings.statuses || {}).filter(status => status !== 'done')
  };
  const fieldOptionsMap = {
    category: 'categories',
    domain: 'domains',
    priority: 'priorities',
    task_type: 'cycleTypes',
    status: 'statuses'
  }


  // 1. 修复 getFieldOptions 函数，确保返回正确的字段选项
  const getFieldOptions = (fieldType) => {
    switch (fieldType) {
      case 'category':
        return fieldOptions.category || [];
      case 'domain':
        return fieldOptions.domain || [];
      case 'priority':
        return fieldOptions.priority || [];
      case 'task_type':
        return fieldOptions.task_type || [];
      case 'status':
        return fieldOptions.status || [];
      default:
        return [];
    }
  };

  // 在 TaskSystem 组件中添加 useEffect 来同步热键模式状态到全局
  useEffect(() => {
    // 设置全局变量供 App.js 检查
    window.taskSystemHotkeyMode = hotkeyMode !== null;

    // 清理函数
    return () => {
      window.taskSystemHotkeyMode = false;
    };
  }, [hotkeyMode]);

  // 2. 修复热键处理逻辑
  // 修改 useEffect 中的热键处理逻辑
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      // 忽略在输入框中的按键
      const isInputActive = document.activeElement.tagName === 'INPUT' ||
                           document.activeElement.tagName === 'TEXTAREA' ||
                           document.activeElement.contentEditable === 'true';

      if (isInputActive) return;

      // 处理热键模式
      if (hotkeyMode === null && event.key === 'g') {
        event.preventDefault();
        // console.log('进入热键模式: select-field');
        setHotkeyMode('select-field');
        // 为每个字段设置对应的按键提示
        setHotkeyHints({
          'category': 'a',
          'domain': 's',
          'priority': 'd',
          'task_type': 'f',
          'status': 'g'
        });
        return;
      }

      // 只在热键模式下处理后续按键，避免与全局热键冲突
      if (hotkeyMode === 'select-field') {
        event.preventDefault();
        const fieldMap = {
          'a': 'category',
          's': 'domain',
          'd': 'priority',
          'f': 'task_type',
          'g': 'status'
        };

        if (fieldMap[event.key]) {
          const selectedFieldKey = fieldMap[event.key];
          // console.log('选择字段:', selectedFieldKey);
          setHotkeyField(selectedFieldKey);
          setHotkeyMode('select-value');

          // 为字段值生成数字提示
          const hints = {};
          const fieldValues = getFieldOptions(selectedFieldKey);
          // console.log('字段选项:', fieldValues);
          fieldValues.forEach((value, index) => {
            hints[value] = (index + 1).toString();
          });

          // 为"全部"状态添加提示
          if (selectedFieldKey === 'status') {
            hints['all'] = 'g';
          }

          setHotkeyHints(hints);
          // console.log('设置值提示:', hints);
        } else {
          // 退出热键模式
          // console.log('退出热键模式: 无效字段键');
          setHotkeyMode(null);
          setHotkeyField(null);
          setHotkeyHints({});
        }
        return;
      }

      if (hotkeyMode === 'select-value') {
        event.preventDefault();

        // 处理"全部"状态
        if (hotkeyField === 'status' && event.key === 'g') {
          // console.log('选择状态: 全部');
          setSelectedField('status');
          setSelectedFieldValue('all');
          setHotkeyMode(null);
          setHotkeyField(null);
          setHotkeyHints({});
          return;
        }

        const valueMap = {};
        const fieldValues = getFieldOptions(hotkeyField);
        // console.log('当前字段选项:', hotkeyField, fieldValues);
        fieldValues.forEach((value, index) => {
          valueMap[(index + 1).toString()] = value;
        });

        if (valueMap[event.key]) {
          // console.log('选择字段值:', hotkeyField, valueMap[event.key]);
          setSelectedField(hotkeyField);
          setSelectedFieldValue(valueMap[event.key]);
          // 保存状态到 localStorage
          // localStorage.setItem('selectedField', hotkeyField);
          // localStorage.setItem('selectedFieldValue', valueMap[event.key]);
          userDataManager.setUserData('selectedField', hotkeyField);
          userDataManager.setUserData('selectedFieldValue', valueMap[event.key]);
          setHotkeyMode(null);
          setHotkeyField(null);
          setHotkeyHints({});
        } else {
          // 退出热键模式
          // console.log('退出热键模式: 无效值键');
          setHotkeyMode(null);
          setHotkeyField(null);
          setHotkeyHints({});
        }
        return;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [hotkeyMode, hotkeyField, selectedField, fieldOptions]);

  const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
      const media = window.matchMedia(query);
      if (media.matches !== matches) {
        setMatches(media.matches);
      }
      const listener = () => setMatches(media.matches);
      media.addListener(listener);
      return () => media.removeListener(listener);
    }, [matches, query]);

    return matches;
  };

  // 在组件内部添加以下代码，在 return 语句之前
  const isDesktop = useMediaQuery('(min-width: 769px)');
  const [hideButtons, setHideButtons] = useState(true);

  // 在 TaskSystem.js 中添加状态来跟踪 TaskTab 模态框状态
  const [taskTabHasOpenModal, setTaskTabHasOpenModal] = useState(false);
  // 添加 useEffect 监听 TaskTab 的模态框状态变化
  useEffect(() => {
    const handleTaskTabModalState = (event) => {
      setTaskTabHasOpenModal(event.detail.hasOpenModal);
    };

    window.addEventListener('taskTabModalState', handleTaskTabModalState);

    return () => {
      window.removeEventListener('taskTabModalState', handleTaskTabModalState);
    };
  }, []);

  const handleKeyDown = (event) => {
    // if (event.defaultPrevented) return;
    // 检查是否按下了ESC键且日志模态框处于打开状态
    if (event.key === 'Escape' && showLogs) {
      setShowLogs(false);
      setCurrentPage(1);
    }

    // 检查是否在输入框中
    const isInputActive = document.activeElement.tagName === 'INPUT' ||
                         document.activeElement.tagName === 'TEXTAREA';

    // 如果在搜索框中按 ESC，不清空搜索框但失去焦点
    const isSearchInputActive = document.activeElement.classList.contains('task-system-search-input');
    if (event.key === 'Escape' && isSearchInputActive) {
      document.activeElement.blur();
      return;
    }


    // 按 f 键聚焦搜索框
    if (event.key === 'f' && !isInputActive) {
      event.preventDefault();
      const searchInput = document.querySelector('.task-system-search-input');
      if (searchInput) {
        searchInput.focus();
      }
      return;
    }




    // 按 Shift+N 或 N 键新增任务（不同于快速添加任务）
    if ((event.key === 'n' || event.key === 'N') && !isInputActive) {
      event.preventDefault();

      // 如果按了 Shift 键，执行标准新增任务（显示表单）
      if (event.shiftKey) {
        // 切换到经典模式
        updateViewMode('classic');
        // 延迟触发事件，确保视图模式切换完成
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openStandardTaskForm'));
        }, 100);
      } else {
        // 否则执行快速添加任务
        setShowQuickTaskInput(true);
        setQuickTaskInput('');
      }
      return;
    }

    // Enter 键处理 - 当确认弹窗打开时，等同于点击确认按钮
    if (event.key === 'Enter' && showConfirmation) {
      event.preventDefault();
      handleCompleteTask(showConfirmation.id);
      return;
    }

    // ESC 键处理
    if (event.key === 'Escape') {
      // 检查当前是否有任何模态框或菜单打开（包括 TaskTab 的模态框）
      const hasOpenModals = showTaskDetails || showConfirmation || showTaskMenu || taskTabHasOpenModal || showLogs;

      if (hasOpenModals) {
        // 优先关闭模态框
        if (showTaskDetails) {
          setShowTaskDetails(null);
        } else if (showConfirmation) {
          setShowConfirmation(null);
        } else if (showTaskMenu) {
          setShowTaskMenu(null);
        } else if (taskTabHasOpenModal) {
          // 如果是 TaskTab 的模态框，发送关闭事件
          window.dispatchEvent(new CustomEvent('closeTaskTabModal'));
        } else if (showLogs) {
          // 关闭日志模态框
          setShowLogs(false);
          setCurrentPage(1);
        }
        return;
      }

      // 只有在没有打开任何模态框时才考虑模式切换
      // if (viewMode === 'classic') {
      //   updateViewMode('card');
      //   return;
      // }

      // 卡片模式下返回字段主页
      if (viewMode === 'card' && selectedFieldValue) {
        setSelectedFieldValue(null);
        return;
      }
    }
  };

  // 添加键盘事件监听的 useEffect（替换可能存在的旧版本）
  useEffect(() => {
    // 添加事件监听器
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showLogs, showTaskDetails, showConfirmation, showTaskMenu, taskTabHasOpenModal, viewMode, selectedFieldValue]);

  // 获取角色信息
  useEffect(() => {
    // 直接从传入的 data prop 中提取角色信息
    if (data && data.stats) {
      setCharacterInfo({
        level: data.stats.level || 1,
        experience: data.stats.exp || 0,
        credits: data.credits || {},
      });
    }
  }, [data]);


  //
  // useEffect(() => {
  //   const handleViewSwitch = (event) => {
  //     const detail = event.detail;
  //     const mode = detail.mode || detail; // 兼容旧格式
  //
  //     if (['list', 'board', 'calendar'].includes(mode)) {
  //       setClassicViewMode(mode);
  //     }
  //   };
  //
  //   // 初始化时检查当前视图模式
  //   const checkInitialViewMode = () => {
  //     // 从 localStorage 或 URL 中获取初始视图模式
  //     const savedViewMode = localStorage.getItem('taskViewMode');
  //     if (savedViewMode && ['list', 'board', 'calendar'].includes(savedViewMode)) {
  //       setClassicViewMode(savedViewMode);
  //     } else if (window.location.hash.includes('board')) {
  //       setClassicViewMode('board');
  //     } else if (window.location.hash.includes('calendar')) {
  //       setClassicViewMode('calendar');
  //     } else if (window.location.hash.includes('list')) {
  //       setClassicViewMode('list');
  //     }
  //   };
  //
  //   window.addEventListener('switchTaskView', handleViewSwitch);
  //   // 组件挂载时检查初始视图模式
  //   checkInitialViewMode();
  //
  //   return () => {
  //     window.removeEventListener('switchTaskView', handleViewSwitch);
  //   };
  // }, []);



  useEffect(() => {
    const handleSetTaskFieldAndValue = (event) => {
      const { field, value } = event.detail;

      // 设置选中的字段和值
      setSelectedField(field);
      setSelectedFieldValue(value);

      // 保存到 localStorage
      // localStorage.setItem('selectedField', field);
      // localStorage.setItem('selectedFieldValue', value);
      userDataManager.setUserData('selectedField', field);
      userDataManager.setUserData('selectedFieldValue', value);
    };

    window.addEventListener('setTaskFieldAndValue', handleSetTaskFieldAndValue);

    return () => {
      window.removeEventListener('setTaskFieldAndValue', handleSetTaskFieldAndValue);
    };
  }, []);

  // 监听设置字段和值的事件
  useEffect(() => {
    const handleSetTaskFieldAndValue = (event) => {
      const { field, value } = event.detail;

      // 设置选中的字段和值
      setSelectedField(field);
      setSelectedFieldValue(value);

      // 保存到 localStorage
      // localStorage.setItem('selectedField', field);
      // localStorage.setItem('selectedFieldValue', value);
      userDataManager.setUserData('selectedField', field);
      userDataManager.setUserData('selectedFieldValue', value);
    };

    window.addEventListener('setTaskFieldAndValue', handleSetTaskFieldAndValue);

    return () => {
      window.removeEventListener('setTaskFieldAndValue', handleSetTaskFieldAndValue);
    };
  }, []);

  // 添加工具栏位置更新函数
  const updateToolbarPosition_deprecated = (position) => {
    setToolbarPosition(position);
    // localStorage.setItem('toolbarPosition', position);
    userDataManager.setUserData('toolbarPosition', position);
  };

  const updateToolbarPosition = (position) => {
    // console.log('updateToolbarPosition called, new position:', position);
    const validPositions = ['top', 'vertical', 'horizontal'];
    if (!validPositions.includes(position)) {
      console.warn('Invalid toolbar position:', position);
      return;
    }

    setToolbarPosition(position);
    // localStorage.setItem('toolbarPosition', position);
    userDataManager.setUserData('toolbarPosition', position);

    // 重置自定义位置和按钮滚动位置
    if (position === 'top') {
      setToolbarCustomPosition({ x: null, y: null });
      // localStorage.removeItem('toolbarCustomPosition');
      userDataManager.clearUserData('toolbarCustomPosition');
    }

    resetButtonScroll();
  };

  // 修改位置切换逻辑中使用的值
  const switchToolbarPosition = () => {
    const positions = ['top', 'vertical', 'horizontal'];
    const currentIndex = positions.indexOf(toolbarPosition);
    const nextIndex = (currentIndex + 1) % positions.length;
    updateToolbarPosition(positions[nextIndex]);
  };


  const switchMode = (mode) => {
    window.dispatchEvent(new CustomEvent('switchTaskView', { detail: mode }));
  };
  // 添加经典模式内部视图切换函数
  const switchClassicViewMode1 = (mode) => {
    // 如果是卡片模式，则切换回卡片视图
    if (mode === 'card') {
      updateViewMode('card');
      // 同时需要重置classicViewMode状态
      // setClassicViewMode('list');
      return;
    }

    // // 确保切换到经典模式
    // updateViewMode('classic');

    // 如果当前处于卡片模式，先切换到经典模式，并指定要切换到的具体子模式
    if (viewMode === 'card') {
      updateViewMode('classic');
      // 直接更新classicViewMode状态
      if (['list', 'board', 'calendar'].includes(mode)) {
        setClassicViewMode(mode);
        // 使用setTimeout确保状态更新后再发送事件
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('switchTaskView', {
            detail: {  mode, fromSwitchClassicViewMode: true }
          }));
        }, 0);
      }
    } else {
      // 检查是否要切换的模式与当前经典模式不同才发送事件
      if (classicViewMode !== mode) {
        // 先更新状态再发送事件
        if (['list', 'board', 'calendar'].includes(mode)) {

          setClassicViewMode(mode);
        }

        // 使用setTimeout确保状态更新后再发送事件
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('switchTaskView', {
            detail: { mode: mode, fromSwitchClassicViewMode: true }
          }));
        }, 0);
      }
    }
  };

  const switchClassicViewMode = (mode) => {
    // 如果是卡片模式，则切换回卡片视图
    if (mode === 'card') {
      updateViewMode('card');
      return;
    }

    // 确保切换到经典模式
    updateViewMode('classic');

    // 更新 classicViewMode 状态
    if (['list', 'board', 'calendar'].includes(mode)) {
      setClassicViewMode(mode);

      // 使用 setTimeout 确保状态更新后再发送事件
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('switchTaskView', {
          detail: { mode, fromSwitchClassicViewMode: true }
        }));
      }, 0);
    }
  };

  const updateViewMode = (mode) => {
  if (['list', 'board', 'calendar'].includes(mode)) {
    setViewMode('classic');
    setClassicViewMode(mode);
  } else {
    // 否则直接设置 viewMode（'card' 或 'classic'）
    setViewMode(mode);
  }

    localStorage.setItem('taskViewMode', mode);
    userDataManager.setUserData('taskViewMode', mode);
  };

  useEffect(() => {
    const handleGlobalViewSwitch = (event) => {
      const detail = event.detail;
      // 如果事件来自 switchClassicViewMode，则不处理以避免递归
      if (detail.fromSwitchClassicViewMode) {
        return;
      }

      const mode = detail.mode || detail; // 兼容旧格式
      if (['list', 'board', 'calendar', 'card'].includes(mode)) {
        // 直接调用switchClassicViewMode而不是递归调用自己
        switchClassicViewMode(mode);
      }
    };

    window.addEventListener('switchTaskView', handleGlobalViewSwitch);

    return () => {
      window.removeEventListener('switchTaskView', handleGlobalViewSwitch);
    };
  }, [viewMode, classicViewMode]); // 确保依赖项正确

  // 渲染日志弹窗
  const renderLogsModal = () => {
    if (!showLogs) return null;

    // 处理点击模态框外部区域退出
    const handleOverlayClick = (e) => {
      if (e.target === e.currentTarget) {
        setShowLogs(false);
        setCurrentPage(1);
      }
    };



    return (
      <div className="logs-modal" onClick={handleOverlayClick}>
        <div className="logs-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="logs-modal-header">
            <h3>任务日志</h3>
            <button
              onClick={() => {
                setShowLogs(false);
                setCurrentPage(1);
              }}
              className="close-button"
            >
              ×
            </button>
          </div>

          <table className="logs-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>类别</th>
                <th>详情</th>
              </tr>
            </thead>
            <tbody>
              {currentLogs.map((log, index) => (
                <tr key={index}>
                  <td>{new Date(log.timestamp).toLocaleString("sv-SE")}</td>
                  <td>{log.action}</td>
                  <td>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 分页控件 */}
          <div className="pagination-controls">
            <button
              onClick={() => paginate(1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              {'<<'}
            </button>

            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              {'<'}
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
            >
              {'>'}
            </button>

            <button
              onClick={() => paginate(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              {'>>'}
            </button>

            <select
              value={logsPerPage}
              onChange={(e) => {
                setLogsPerPage(Number(e.target.value));
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








  // 添加状态管理工具栏设置
  const [toolbarSettings, setToolbarSettings] = useState(() => {
    // 优先从settings.json加载配置
    const savedSettings = settings?.toolbarSettings;
    if (savedSettings) {
      return savedSettings;
    }

    // 默认配置
    return {
      buttons: [
        { id: 'position', type: 'control', visible: true },
        { id: 'list', type: 'view', visible: true },
        { id: 'board', type: 'view', visible: true },
        { id: 'calendar', type: 'view', visible: true },
        { id: 'card', type: 'view', visible: true },
        { id: 'scale', type: 'control', visible: true },
        { id: 'hide', type: 'control', visible: true },
        { id: 'logs', type: 'control', visible: true },
        { id: 'quick', type: 'control', visible: true },
        { id: 'refresh', type: 'control', visible: true }
      ]
    };
  });

  // 添加编辑模态框状态
  const [showEditModal, setShowEditModal] = useState(false);

  // 获取所有应该显示的按钮（根据设置）
  const getAllToolbarButtons = () => {
    try {
      const buttons = toolbarSettings.buttons
        .filter(button => button.visible)
        .map(button => ({ id: button.id, type: button.type }));

      // 添加编辑按钮到末尾
      buttons.push({ id: 'edit', type: 'control' });

      if (classicViewMode === null) {
        checkInitialViewMode();
      }

      return buttons;
    } catch (error) {
      console.error('Error in getAllToolbarButtons:', error);
      return [];
    }
  };

  // 工具栏编辑模态框组件
  const ToolbarEditModal = () => {
    const [tempSettings, setTempSettings] = useState([...toolbarSettings.buttons]);
    const dragItem = useRef();
    const dragOverItem = useRef();
    const [touchDragState, setTouchDragState] = useState({
      isDragging: false,
      startIndex: null,
      currentIndex: null
    });
    const touchCoords = useRef({ startX: 0, startY: 0 });
    const listItemRefs = useRef([]);
    const scrollContainerRef = useRef(null);
    const longPressTimer = useRef(null);
    // 添加键盘事件处理函数
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowEditModal(false);
      }
    };
    // 添加键盘事件监听
    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, []);

    if (!showEditModal) return null;





    const handleDragStart = (e, index) => {
      dragItem.current = index;
      e.dataTransfer.effectAllowed = "move";
    };

    const handleDragEnter = (e, index) => {
      // 阻止默认行为以允许放置
      e.preventDefault();

      if (dragItem.current === null) return;

      dragOverItem.current = index;
      const newSettings = [...tempSettings];
      const draggedItem = newSettings[dragItem.current];

      // 移除拖拽项
      newSettings.splice(dragItem.current, 1);
      // 插入到新位置
      newSettings.splice(dragOverItem.current, 0, draggedItem);

      dragItem.current = dragOverItem.current;
      setTempSettings(newSettings);
    };

    const handleDragEnd = () => {
      dragItem.current = null;
      dragOverItem.current = null;
    };

    // 触摸开始事件 - 开始长按检测
    const handleTouchStart = (e, index) => {
      const touch = e.touches[0];
      touchCoords.current = {
        startX: touch.clientX,
        startY: touch.clientY
      };

      // 清除之前的定时器
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }

      // 设置长按定时器 (500ms)
      longPressTimer.current = setTimeout(() => {
        setTouchDragState({
          isDragging: true,
          startIndex: index,
          currentIndex: index
        });

        // 添加视觉反馈
        if (e.currentTarget) {
          e.currentTarget.classList.add('dragging');
          listItemRefs.current[index] = e.currentTarget;
        }
      }, 500); // 500ms长按触发拖拽
    };

    // 触摸移动事件 - 处理拖拽和取消长按
    const handleTouchMove = (e, index) => {
      if (!longPressTimer.current && !touchDragState.isDragging) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchCoords.current.startX);
      const deltaY = Math.abs(touch.clientY - touchCoords.current.startY);

      // 如果在长按触发前移动超过阈值，则取消长按
      if (longPressTimer.current && (deltaX > 10 || deltaY > 10)) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        return;
      }

      // 如果正在拖拽，处理重新排序和滚动
      if (touchDragState.isDragging) {
        e.preventDefault();
        e.stopPropagation();

        // 处理自动滚动
        if (scrollContainerRef.current) {
          const containerRect = scrollContainerRef.current.getBoundingClientRect();
          const touchY = touch.clientY;
          const scrollThreshold = 30; // 滚动触发阈值

          // 向上滚动
          if (touchY < containerRect.top + scrollThreshold) {
            scrollContainerRef.current.scrollTop -= 10;
          }
          // 向下滚动
          else if (touchY > containerRect.bottom - scrollThreshold) {
            scrollContainerRef.current.scrollTop += 10;
          }
        }

        // 查找目标位置
        const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
        if (targetElement) {
          const listItem = targetElement.closest('li');
          if (listItem && listItem.dataset.index !== undefined) {
            const targetIndex = parseInt(listItem.dataset.index);

            // 更新当前索引位置
            if (touchDragState.currentIndex !== targetIndex) {
              setTouchDragState(prev => ({
                ...prev,
                currentIndex: targetIndex
              }));

              // 实现项目重新排序
              const newSettings = [...tempSettings];
              const draggedItem = newSettings[touchDragState.startIndex];

              // 移除原始位置的项目
              newSettings.splice(touchDragState.startIndex, 1);
              // 插入到新位置
              newSettings.splice(targetIndex, 0, draggedItem);

              setTempSettings(newSettings);

              // 更新起始索引以反映新的排列
              setTouchDragState(prev => ({
                ...prev,
                startIndex: targetIndex
              }));
            }
          }
        }
      }
    };

    // 触摸结束事件 - 结束拖拽和取消长按
    const handleTouchEnd = (e) => {
      // 清除长按定时器
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }

      // 移除视觉反馈
      if (touchDragState.isDragging && listItemRefs.current[touchDragState.startIndex]) {
        listItemRefs.current[touchDragState.startIndex].classList.remove('dragging');
      }

      // 重置拖拽状态
      setTouchDragState({
        isDragging: false,
        startIndex: null,
        currentIndex: null
      });
    };

    const toggleVisibility = (index) => {
      // 防止在拖拽过程中触发点击事件
      if (touchDragState.isDragging) return;

      const newSettings = [...tempSettings];
      newSettings[index].visible = !newSettings[index].visible;
      setTempSettings(newSettings);
    };

    const resetToDefault = () => {
      // toolbar工具栏默认配置
      const defaultSettings = [
        { id: 'position', type: 'control', visible: true },
        { id: 'list', type: 'view', visible: true },
        { id: 'board', type: 'view', visible: true },
        { id: 'calendar', type: 'view', visible: true },
        { id: 'card', type: 'view', visible: true },
        { id: 'scale', type: 'control', visible: true },
        { id: 'hide', type: 'control', visible: true },
        { id: 'logs', type: 'control', visible: true },
        { id: 'quick', type: 'control', visible: true },
        { id: 'refresh', type: 'control', visible: true }
      ];
      setTempSettings(defaultSettings);
    };

    const saveSettings = async () => {
      try {
        const newSettings = { buttons: tempSettings };
        setToolbarSettings(newSettings);

        // 更新settings.json（需要通过API）
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/settings/toolbar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newSettings)
        });

        if (!response.ok) {
          throw new Error('Failed to save toolbar settings');
        }

        setShowEditModal(false);
      } catch (error) {
        console.error('Error saving toolbar settings:', error);
        alert('保存设置失败');
      }
    };

    const getButtonLabel = (id) => {
      const labels = {
        position: '切换工具栏位置',
        list: '列表模式',
        board: '看板模式',
        calendar: '日历模式',
        card: '卡片模式',
        scale: '缩放工具栏',
        hide: '隐藏控件&导航栏',
        logs: '任务日志',
        quick: '快速添加',
        refresh: '刷新'
      };
      return labels[id] || id;
    };

    return (
      <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
        <div className="toolbar-edit-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>工具栏设置</h3>
            <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
          </div>

          <div className="modal-body">
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center'}}>
              <p>拖拽按钮调整顺序，勾选按钮以显示在工具栏上</p>
              <button className="btn-reset" onClick={resetToDefault} title="恢复默认配置">↶</button>
            </div>

            <ul
              className="toolbar-buttons-list"
              ref={scrollContainerRef}
              style={{
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative'
              }}
            >
              {tempSettings.map((button, index) => (
                <li
                  key={button.id}
                  data-index={index}
                  className={`toolbar-button-item ${touchDragState.isDragging && touchDragState.startIndex === index ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  // 为整个列表项添加触摸拖拽支持
                  onTouchStart={(e) => handleTouchStart(e, index)}
                  onTouchMove={(e) => handleTouchMove(e, index)}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="drag-handle">⋮⋮</div>
                  <label className="button-toggle">
                    <input
                      type="checkbox"
                      checked={button.visible}
                      onChange={() => toggleVisibility(index)}
                      // 防止复选框干扰拖拽
                      onTouchStart={(e) => {
                        // 阻止事件冒泡，防止触发列表项的触摸开始事件
                        e.stopPropagation();
                      }}
                      onTouchMove={(e) => {
                        // 阻止事件冒泡，防止触发列表项的触摸移动事件
                        e.stopPropagation();
                      }}
                    />
                    <span>{getButtonLabel(button.id)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="modal-footer">
            <button className="btn-cancel" onClick={() => setShowEditModal(false)}>取消</button>
            <button className="btn-confirm" onClick={saveSettings}>确认</button>
          </div>
        </div>
      </div>
    );
  };


  // 优化后的工具栏相关代码
  const renderModeToolbar = () => {
    // console.log('renderModeToolbar called, toolbarPosition:', toolbarPosition,
    //             'isToolbarCollapsed:', isToolbarCollapsed,
    //             'toolbarCustomPosition:', toolbarCustomPosition);
    const handleTouchStartCollapsed = (e) => {
      const touch = e.touches[0];

      // 记录触摸起始位置
      setTouchStartX(touch.clientX);
      setTouchStartY(touch.clientY);

      // 设置拖拽状态
      setIsDragging(true);

      const toolbar = e.currentTarget;
      if (toolbar) {
        const rect = toolbar.getBoundingClientRect();
        // 为折叠状态设置正确的实际尺寸
        const collapsedToolbarSize = {
          width: rect.width,
          height: rect.height
        };
        setToolbarSize(collapsedToolbarSize);

        // 使用折叠状态的实际尺寸计算起始位置
        setDragStart({
          x: touch.clientX - (toolbarCustomPosition.x !== null ? toolbarCustomPosition.x : rect.left),
          y: touch.clientY - (toolbarCustomPosition.y !== null ? toolbarCustomPosition.y : rect.top)
        });
      }

      e.preventDefault();
    };
    // 处理折叠状态
    if (isToolbarCollapsed) {
      const handleTouchStartCollapsed = (e) => {
        // 直接设置拖拽状态，不需要检查特定元素
        setIsDragging(true);

        const toolbar = e.currentTarget; // 使用当前元素而不是closest查找
        if (toolbar) {
          const rect = toolbar.getBoundingClientRect();
          setToolbarSize({
            width: rect.width,
            height: rect.height
          });

          // 记录起始位置
          setDragStart({
            x: e.touches[0].clientX - (toolbarCustomPosition.x || rect.left),
            y: e.touches[0].clientY - (toolbarCustomPosition.y || rect.top)
          });
        }

        e.preventDefault();
      };

      return (
        <div
          className={`mode-toolbar mode-toolbar-${toolbarPosition} collapsed`}
          style={getToolbarStyle(true)}
          onMouseDown={handleDragStart}
          onTouchStart={handleTouchStartCollapsed}
        >
          <button
            className="toolbar-toggle-btn"
            onClick={() => {
              setIsToolbarCollapsed(false);
              localStorage.setItem('toolbarCollapsed', 'false');
              userDataManager.setUserData('toolbarCollapsed', 'false');
            }}
            title="展开工具栏"
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'grab',
              padding: '2px 3px',
              fontSize: '12px',
              transition: 'all 0.2s ease-in-out',
              width: '60%',
              height: '80%'
            }}
          >
            {toolbarPosition === 'top' ? '▼' : toolbarPosition === 'vertical' ? '▶' : '▼'}
          </button>
        </div>
      );
    }

    // 顶部位置的工具栏样式（内联显示）
    if (toolbarPosition === 'top') {
      return (
        <div
          className={`mode-toolbar mode-toolbar-${toolbarPosition}`}
          style={getToolbarStyle()}
          onMouseDown={handleDragStart}
        >
          <div
              className="toolbar-buttons"
              onTouchStart={handleTouchStartOnButtons}
              onTouchMove={handleTouchMoveOnButtons}
              onTouchEnd={handleTouchEndOnButtons}
              style={{ display: 'flex', gap: '2px' }}
          >
            {renderToolbarButtons()}
          </div>
        </div>
      );
    }

    // 垂直或水平位置的工具栏
    return (
      <div
        className={`mode-toolbar mode-toolbar-${toolbarPosition}`}
        style={getToolbarStyle()}
        onMouseDown={handleDragStart}
      >
        {/* 移动端拖拽手柄 */}
        {toolbarPosition !== 'top' && (
          <div
            className="mobile-drag-handle"
            onTouchStart={handleTouchStart}
            style={{
              // width: '100%',
              // height: '20px',
              width: toolbarPosition === 'horizontal' ? '20px' : '100%',
              height: toolbarPosition === 'horizontal' ? '32px' : '20px',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'grab',
              // borderRadius: '4px 4px 0 0',
              userSelect: 'none'
            }}
          >
            <span style={{ fontSize: '12px', color: '#6c757d' }}>⋮⋮</span>

          </div>
        )}

        <div className="toolbar-header">
          <button
            className="toolbar-collapse-btn"
            onTouchStart={handleTouchStart}
            onClick={() => {
              setIsToolbarCollapsed(true);
              // localStorage.setItem('toolbarCollapsed', 'true');
              userDataManager.setUserData('toolbarCollapsed', 'true');
            }}
            title="折叠工具栏"
            style={{
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {toolbarPosition === 'vertical' ? '◀' : '▲'}
          </button>
        </div>

        <div
          className="toolbar-buttons"
          onTouchStart={handleTouchStartOnButtons}
          onTouchMove={handleTouchMoveOnButtons}
          onTouchEnd={handleTouchEndOnButtons}
        >
          {renderToolbarButtons()}
        </div>
      </div>
    );
  };

  // 获取工具栏样式函数
  const getToolbarStyle = (isCollapsed = false) => {
    const baseStyle = {
      transform: `scale(${toolbarScale})`,
      transformOrigin: toolbarPosition === 'vertical' ? 'top center' : 'left center'
    };

    // 顶部位置样式
    if (toolbarPosition === 'top') {
      return {
        ...baseStyle,
        display: 'inline-flex',
        alignItems: 'center',
        background: 'transparent',
        // border: '1px solid #dee2e6',
        borderRadius: '4px',
        padding: '2px',
        marginLeft: '10px',
        minHeight: '20px'
      };
    }

    // 自定义位置样式（拖拽后的位置）
    if (toolbarCustomPosition.x !== null && toolbarCustomPosition.y !== null) {
      // console.log('Applying custom position:', toolbarCustomPosition);
      return {
        ...baseStyle,
        position: 'fixed',
        left: `${toolbarCustomPosition.x}px`,
        top: `${toolbarCustomPosition.y}px`,
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'grab'
      };
    }

    // 默认位置样式
    if (toolbarPosition === 'vertical') {
      return {
        ...baseStyle,
        position: 'fixed',
        left: '10px',
        top: '50%',
        transform: `translateY(-50%) scale(${toolbarScale})`,
        transformOrigin: 'top center',
        cursor: 'grab',
        zIndex: 1000
      };
    }

    if (toolbarPosition === 'horizontal') {
      return {
        ...baseStyle,
        position: 'fixed',
        top: '60px',
        left: '50%',
        transform: `translateX(-50%) scale(${toolbarScale})`,
        transformOrigin: 'left center',
        cursor: 'grab',
        zIndex: 1000
      };
    }

    return {
      ...baseStyle,
      position: 'fixed',
      zIndex: 1000,
      cursor: 'grab'
    };
  };

  const handleHideStateChange = (e) => {
    // 获取当前的全局隐藏状态
    // const currentGlobalHideState = parseInt(localStorage.getItem('floatingButtonHideState') || '0');
    const currentGlobalHideState = parseInt(userDataManager.getUserData('floatingButtonHideState') || '0');
    // 切换到下一个状态 (0 -> 1 -> 2 -> 0)
    const nextGlobalHideState = (currentGlobalHideState + 1) % 3;

    // 更新本地存储
    // localStorage.setItem('floatingButtonHideState', nextGlobalHideState.toString());
    userDataManager.setUserData('floatingButtonHideState', nextGlobalHideState.toString());

    // 派发事件通知 App.js 更新状态
    window.dispatchEvent(new CustomEvent('floatingButtonHideStateChange', {
      detail: { state: nextGlobalHideState }
    }));

    // 同时更新旧的 hideTopControls 状态以保持兼容性
    // localStorage.setItem('hideTopControls', (nextGlobalHideState >= 1).toString());
    userDataManager.setUserData('hideTopControls', (nextGlobalHideState >= 1).toString());
    window.dispatchEvent(new CustomEvent('toggleTopNavVisibility'));
  };

  // 渲染工具栏按钮函数
  const renderToolbarButtons = () => {
    try {
      const allButtons = getAllToolbarButtons();
      const visibleButtons = allButtons.slice(buttonScrollPosition, buttonScrollPosition + maxVisibleButtons);

      return visibleButtons.map((button) => {
        // 确保 button 对象存在
        if (!button || !button.id) {
          console.warn('Invalid button object:', button);
          return null;
        }

        switch (button.id) {
          case 'collapse':
            return (
              <button
                key="collapse"
                onTouchStart={handleTouchStart}
                className="toolbar-collapse-btn"
                onClick={() => {
                  setIsToolbarCollapsed(true);
                  // localStorage.setItem('toolbarCollapsed', 'true');
                  userDataManager.setUserData('toolbarCollapsed', 'true');
                }}
                title="折叠工具栏"
                style={getButtonStyle()}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              >
                🔼
              </button>
            );

          case 'position':
            return (
              <button
                key="position"
                className="toolbar-position-btn"
                onClick={switchToolbarPosition}
                title={`当前位置: ${toolbarPosition === 'top' ? '顶部' : toolbarPosition === 'vertical' ? '竖向' : '横向'} (点击切换)`}
                style={getButtonStyle()}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              >
                ↳↰
              </button>
            );

          case 'list':
            return (
              <button
                key="list"
                className={classicViewMode === 'list' ? 'active' : ''}
                onClick={() => switchMode('list')}
                title="列表模式"
                style={getButtonStyle(classicViewMode === 'list')}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              >
                📋
              </button>
            );

          case 'board':
            return (
              <button
                key="board"
                className={classicViewMode === 'board' ? 'active' : ''}
                onClick={() => switchMode('board')}
                title="看板模式"
                style={getButtonStyle(classicViewMode === 'board')}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              >
                K
              </button>
            );

          case 'calendar':
            return (
              <button
                key="calendar"
                className={classicViewMode === 'calendar' ? 'active' : ''}
                onClick={() => switchMode('calendar')}
                title="日历模式"
                style={getButtonStyle(classicViewMode === 'calendar')}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              >
                📅
              </button>
            );

          case 'card':
            return (
              <button
                key="card"
                className={viewMode === 'card' ? 'active' : ''}
                onClick={() => updateViewMode('card')}
                title="卡片模式"
                style={getButtonStyle(viewMode === 'card')}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              >
                🏷️
              </button>
            );

          case 'scale':
            return (
              <button
                key="scale"
                className="toolbar-scale-btn"
                onClick={() => {
                  setToolbarScale(toolbarScale === '1' ? '1.5' : '1');
                }}
                title={toolbarScale === '1' ? '放大工具栏' : '还原工具栏'}
                style={getButtonStyle()}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              >
                {toolbarScale === '1' ? '🔍+' : '🔍-'}
              </button>
            );

          case 'hide':
            return (
              <button
                key="hide"
                className="toolbar-hide-controls-btn"
                onClick={() => {handleHideStateChange()}}
                title={externalHideTopControls ? '隐藏导航栏和控件' : hideTopNav ? '隐藏控件' : '显示全部'}
                style={getButtonStyle()}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              >
                {externalHideTopControls ? '⛔' : hideTopNav ? '🚫' : '🟢'}
              </button>
            );

          case 'logs':
            return (
              <button
                key="logs"
                className="toolbar-logs-btn"
                onClick={() => {
                  setShowLogs(true);
                  setCurrentPage(1);
                }}
                title="任务日志"
                style={getButtonStyle()}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              >
                🧾
              </button>
            );

          case 'quick':
            return (
              <button
                key="quick"
                className="toolbar-quick-task-btn"
                onClick={() => {
                  setShowQuickTaskInput(true);
                  setQuickTaskInput('');
                }}
                title="快速添加任务"
                style={getButtonStyle()}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              >
                ⚡
              </button>
            );

          case 'refresh':
            return (
              <button
                key="refresh"
                className="toolbar-refresh-btn"
                onClick={() => {
                  onUpdateTask();
                }}
                title="刷新页面"
                style={getButtonStyle()}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              >
                ⟳
              </button>
            );

          case 'edit':
            return (
              <button
                key="edit"
                className="toolbar-edit-btn"
                onClick={() => setShowEditModal(true)}
                title="编辑工具栏"
                style={getButtonStyle()}
                onMouseEnter={handleButtonMouseEnter}
                onMouseLeave={handleButtonMouseLeave}
              >
                🔧
              </button>
            );

          default:
            return null;
        }
      });
    } catch (error) {
      console.error('Error in renderToolbarButtons:', error);
      return <div>Error rendering buttons</div>;
    }
  };

  // 按钮样式函数
  const getButtonStyle = (isActive = false) => {
    return {
      padding: '2px 4px',
      background: isActive ? '#007bff' : 'transparent',
      color: isActive ? 'white' : 'black',
      border: '1px solid #ccc',
      borderRadius: '2px',
      cursor: 'pointer',
      fontSize: '12px',
      margin: '1px',
      transition: 'all 0.2s ease-in-out'
    };
  };

  // 按钮鼠标悬停处理函数
  const handleButtonMouseEnter = (e) => {
    e.target.style.background = '#e9ecef';
    e.target.style.transform = 'scale(1.4)';
  };

  const handleButtonMouseLeave = (e) => {
    if (!e.target.className.includes('active')) {
      e.target.style.background = 'transparent';
    }
    e.target.style.transform = 'scale(1)';
  };

  // 处理拖拽开始
  const handleDragStart = (e) => {
    // 只有在非顶部位置时才允许拖拽
    if (toolbarPosition === 'top') return;

    e.preventDefault();

    setIsDragging(true);
    const toolbar = e.currentTarget.closest('.mode-toolbar');

    // 获取工具栏当前尺寸和位置
    if (toolbar) {
      const rect = toolbar.getBoundingClientRect();
      setToolbarSize({ width: rect.width, height: rect.height });

      // 记录起始位置
      setDragStart({
        x: e.clientX - (toolbarCustomPosition.x || rect.left),
        y: e.clientY - (toolbarCustomPosition.y || rect.top)
      });
    }
  };

  // 鼠标事件监听
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // 应用边界限制，防止工具栏被拖出屏幕范围
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // 限制 X 轴范围
        const limitedX = Math.max(0, Math.min(newX, windowWidth - toolbarSize.width));
        // 限制 Y 轴范围
        const limitedY = Math.max(0, Math.min(newY, windowHeight - toolbarSize.height));

        setToolbarCustomPosition({ x: limitedX, y: limitedY });
      }
    };

    const handleMouseUp = (e) => {
      if (isDragging) {
        setIsDragging(false);

        // 保存最终位置
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // 应用边界吸附逻辑
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const snapThreshold = 20;

        let newPosition = { x: newX, y: newY };

        // 吸附到左侧边界
        if (newX <= snapThreshold) {
          newPosition.x = 0;
        }
        // 吸附到右侧边界
        else if (newX + toolbarSize.width >= windowWidth - snapThreshold) {
          newPosition.x = windowWidth - toolbarSize.width;
        }

        // 吸附到顶部边界
        if (newY <= snapThreshold) {
          newPosition.y = 0;
        }
        // 吸附到底部边界
        else if (newY + toolbarSize.height >= windowHeight - snapThreshold) {
          newPosition.y = windowHeight - toolbarSize.height;
        }

        setToolbarCustomPosition(newPosition);
        // localStorage.setItem('toolbarCustomPosition', JSON.stringify(newPosition));
        userDataManager.setUserData('toolbarCustomPosition', JSON.stringify(newPosition));
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, toolbarSize]);


  // 初始化时检查当前视图模式
  const checkInitialViewMode = () => {
    // 从 localStorage 或 URL 中获取初始视图模式
    // const savedViewMode = localStorage.getItem('taskViewMode');
    const savedViewMode = userDataManager.getUserData('taskViewMode');
    if (savedViewMode && ['list', 'board', 'calendar'].includes(savedViewMode)) {
      setClassicViewMode(savedViewMode);
    } else if (window.location.hash.includes('board')) {
      setClassicViewMode('board');
    } else if (window.location.hash.includes('calendar')) {
      setClassicViewMode('calendar');
    } else if (window.location.hash.includes('list')) {
      setClassicViewMode('list');
    }
  };

  // 获取所有应该显示的按钮
  const getAllToolbarButtons_deprecated = () => {
    try {
      const buttons = [
        // { id: 'collapse', type: 'control' },
        { id: 'position', type: 'control' },
        { id: 'list', type: 'view' },
        { id: 'board', type: 'view' },
        { id: 'calendar', type: 'view' },
        { id: 'card', type: 'view' },
        { id: 'scale', type: 'control' },
        { id: 'hide', type: 'control' },
        { id: 'logs', type: 'control' },
        { id: 'quick', type: 'control' },
        { id: 'refresh', type: 'control' }
      ];
      if (classicViewMode === null) {
        checkInitialViewMode();
      }

      // 只有在看板视图下才添加分组按钮
      // console.log('viewmode & classicViewMode:', viewMode, classicViewMode)
      // // console.log('classicViewMode is board:', window.location.hash.includes('board'))
      // if (viewMode === 'classic' && classicViewMode === 'board') {
      //   buttons.push(
      //     { id: 'prev-group', type: 'group' },
      //     { id: 'next-group', type: 'group' }
      //   );
      // }



      return buttons;
    } catch (error) {
      console.error('Error in getAllToolbarButtons:', error);
      return []; // 返回空数组作为默认值
    }
  };


  // 重置按钮滚动位置
  const resetButtonScroll = () => {
    setButtonScrollPosition(0);
  };

  // 在 toolbarPosition 改变时重置滚动位置
  useEffect(() => {
    resetButtonScroll();
  }, [toolbarPosition, viewMode, classicViewMode]);

  // 触摸事件处理
  const handleTouchStart = (e) => {
    // 只有在非顶部位置时才允许操作
    const touch = e.touches[0];

    // 记录触摸起始位置
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);

    // 如果点击的是拖拽区域（工具栏头部或移动端拖拽手柄）
    if (e.target.closest('.toolbar-header') || e.target.closest('.mobile-drag-handle')) {
      setIsDragging(true);

      const toolbar = e.currentTarget.closest('.mode-toolbar');
      if (toolbar) {
        const rect = toolbar.getBoundingClientRect();
        setToolbarSize({ width: rect.width, height: rect.height });

        setDragStart({
          x: touch.clientX - (toolbarCustomPosition.x || rect.left),
          y: touch.clientY - (toolbarCustomPosition.y || rect.top)
        });
      }
    } else {
      // 如果点击的是按钮区域，准备滚动
      setIsTouchScrolling(true);
    }

    e.preventDefault();
  };

  // 触摸事件监听器
  useEffect(() => {
    if (isDragging || isTouchScrolling) {
      const handleTouchMove = (e) => {
        if (isDragging) {
          const touch = e.touches[0];
          const newX = touch.clientX - dragStart.x;
          const newY = touch.clientY - dragStart.y;

          // 应用边界限制，防止工具栏被拖出屏幕范围
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;

          // 限制 X 轴范围
          const limitedX = Math.max(0, Math.min(newX, windowWidth - toolbarSize.width));
          // 限制 Y 轴范围
          const limitedY = Math.max(0, Math.min(newY, windowHeight - toolbarSize.height));

          setToolbarCustomPosition({ x: limitedX, y: limitedY });
          e.preventDefault(); // 防止页面滚动
        }
      };

      const handleTouchEnd = (e) => {
        if (isDragging) {
          setIsDragging(false);

          // 保存最终位置并应用吸附逻辑
          const touch = e.changedTouches[0];
          const newX = touch.clientX - dragStart.x;
          const newY = touch.clientY - dragStart.y;

          // 应用边界吸附逻辑
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;
          const snapThreshold = 20;

          let newPosition = { x: newX, y: newY };

          // 吸附到左侧边界
          if (newX <= snapThreshold) {
            newPosition.x = 0;
          }
          // 吸附到右侧边界
          else if (newX + toolbarSize.width >= windowWidth - snapThreshold) {
            newPosition.x = windowWidth - toolbarSize.width;
          }
          // 吸附到顶部边界
          if (newY <= snapThreshold) {
            newPosition.y = 0;
          }
          // 吸附到底部边界
          else if (newY + toolbarSize.height >= windowHeight - snapThreshold) {
            newPosition.y = windowHeight - toolbarSize.height;
          }

          setToolbarCustomPosition(newPosition);
          // localStorage.setItem('toolbarCustomPosition', JSON.stringify(newPosition));
          userDataManager.setUserData('toolbarCustomPosition', JSON.stringify(newPosition));
        }
        if (isTouchScrolling) {
          setIsTouchScrolling(false);
        }
      };

      if (isDragging) {
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
      }

      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, isTouchScrolling, dragStart, toolbarSize]);

  // 处理触摸开始事件
  const handleTouchStartOnButtons = (e) => {
    const touch = e.touches[0];
    // 记录触摸起始位置（根据工具栏方向记录对应坐标）
    if (toolbarPosition === 'vertical') {
      setTouchStartY(touch.clientY);
    } else {
      setTouchStartX(touch.clientX);
    }
    setIsTouchScrolling(true);
    e.preventDefault();
    e.stopPropagation();
  };

  // 处理触摸移动事件
  const handleTouchMoveOnButtons = (e) => {
    if (!isTouchScrolling) return;

    const touch = e.touches[0];

    // 根据工具栏方向选择不同的滚动方式
    let delta;
    if (toolbarPosition === 'vertical') {
      // 竖向工具栏使用垂直方向滑动
      delta = touchStartY - touch.clientY;
    } else {
      // 横向工具栏使用水平方向滑动
      delta = touchStartX - touch.clientX;
    }

    // 如果滑动距离足够大，则触发滚动
    if (Math.abs(delta) > 10) { // 降低阈值以提高响应性
      const allButtons = getAllToolbarButtons();
      const maxScroll = Math.max(0, allButtons.length - maxVisibleButtons);

      if (maxScroll > 0) {
        // 根据滑动方向确定滚动方向
        const direction = delta > 0 ? 1 : -1;
        const newPosition = Math.max(0, Math.min(maxScroll, buttonScrollPosition + direction));
        setButtonScrollPosition(newPosition);

        // 更新触摸起始位置
        if (toolbarPosition === 'vertical') {
          setTouchStartY(touch.clientY);
        } else {
          setTouchStartX(touch.clientX);
        }
      }

      e.preventDefault();
      e.stopPropagation();
    }
  };

  // 处理触摸结束事件
  const handleTouchEndOnButtons = (e) => {
    setIsTouchScrolling(false);
    if (e) {
      e.stopPropagation();
    }
  };

  // 在 useEffect 中添加触摸事件监听器
  useEffect(() => {
    if (isTouchScrolling) {
      document.addEventListener('touchmove', handleTouchMoveOnButtons, { passive: false });
      document.addEventListener('touchend', handleTouchEndOnButtons);

      return () => {
        document.removeEventListener('touchmove', handleTouchMoveOnButtons);
        document.removeEventListener('touchend', handleTouchEndOnButtons);
      };
    }
  }, [isTouchScrolling, touchStartX, buttonScrollPosition]);

  // 工具栏滚轮事件监听
  useEffect(() => {
    // 延迟执行以确保DOM已更新
    const timer = setTimeout(() => {
      // 查找工具栏元素，考虑嵌入在 character-info-bar 中的情况
      let toolbar = document.querySelector(`.mode-toolbar-${toolbarPosition}`);

      // 如果在 character-info-bar 中没有找到，尝试查找嵌入式的工具栏
      // if (!toolbar && toolbarPosition === 'top') {
      //   toolbar = document.querySelector('.character-info-bar .mode-toolbar-top');
      // }

      if (!toolbar) return;

      const wheelHandler = (e) => {
        const allButtons = getAllToolbarButtons();
        const maxScroll = Math.max(0, allButtons.length - maxVisibleButtons);

        if (maxScroll <= 0) return;

        // 阻止事件传播
        e.preventDefault();
        e.stopPropagation();

        // 处理按钮滚动
        const delta = e.deltaY > 0 ? 1 : -1;
        const newPosition = Math.max(0, Math.min(maxScroll, buttonScrollPosition + delta));
        setButtonScrollPosition(newPosition);
      };

      // 使用 passive: false 确保可以 preventDefault
      toolbar.addEventListener('wheel', wheelHandler, { passive: false });

      // 清理函数
      return () => {
        toolbar.removeEventListener('wheel', wheelHandler);
      };
    }, 100); // 添加适当延迟确保DOM渲染完成

    return () => clearTimeout(timer);
  }, [toolbarPosition, buttonScrollPosition, isToolbarCollapsed]);


  // useEffect(() => {
  //   const toolbar = document.querySelector(`.mode-toolbar-${toolbarPosition}`);
  //   if (!toolbar) return;
  //
  //   const wheelHandler = (e) => {
  //     const allButtons = getAllToolbarButtons();
  //     const maxScroll = Math.max(0, allButtons.length - maxVisibleButtons);
  //
  //     if (maxScroll <= 0) return;
  //
  //     // 阻止事件传播
  //     e.preventDefault();
  //     e.stopPropagation();
  //
  //     // 处理按钮滚动
  //     const delta = e.deltaY > 0 ? 1 : -1;
  //     const newPosition = Math.max(0, Math.min(maxScroll, buttonScrollPosition + delta));
  //     setButtonScrollPosition(newPosition);
  //   };
  //
  //   // 使用 passive: false 确保可以 preventDefault
  //   toolbar.addEventListener('wheel', wheelHandler, { passive: false });
  //
  //   return () => {
  //     toolbar.removeEventListener('wheel', wheelHandler);
  //   };
  // }, [toolbarPosition, buttonScrollPosition]);

  // 工具栏位置调整
  useEffect(() => {
    const adjustToolbarPosition = () => {
      const toolbar = document.querySelector(`.mode-toolbar-${toolbarPosition}`);
      if (!toolbar || toolbarPosition === 'top') return;

      const rect = toolbar.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // 如果工具栏底部超出了窗口底部
      if (rect.bottom > windowHeight) {
        const overflow = rect.bottom - windowHeight;
        // 调整工具栏位置向上移动
        toolbar.style.top = `calc(50% - ${overflow}px)`;
      }
    };

    // 初始调整
    adjustToolbarPosition();

    // 监听窗口大小变化
    window.addEventListener('resize', adjustToolbarPosition);

    // 监听工具栏位置或缩放变化
    const observer = new MutationObserver(adjustToolbarPosition);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', adjustToolbarPosition);
      observer.disconnect();
    };
  }, [toolbarPosition, toolbarScale]);

  // 防止工具栏溢出
  const preventToolbarOverflow = () => {
    // 只对左侧和右侧工具栏进行处理
    if (toolbarPosition === 'top') return;

    const toolbar = document.querySelector(`.mode-toolbar-${toolbarPosition}`);
    if (!toolbar) return;

    const rect = toolbar.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // 如果工具栏底部超出了窗口底部
    if (rect.bottom > windowHeight) {
      const maxHeight = windowHeight * 0.9; // 最大高度为窗口高度的90%
      toolbar.style.maxHeight = `${maxHeight}px`;
      toolbar.style.overflowY = 'auto';
    } else {
      toolbar.style.maxHeight = '';
      toolbar.style.overflowY = '';
    }
  };

  // 监听工具栏变化
  useEffect(() => {
    // 延迟执行以确保DOM已更新
    const timer = setTimeout(preventToolbarOverflow, 100);
    return () => clearTimeout(timer);
  }, [toolbarPosition, toolbarScale]);













  // 过滤任务
  const getFilteredTasks = () => {
    // console.log('过滤任务 - selectedField:', selectedField, 'selectedFieldValue:', selectedFieldValue);

    // 当没有选择字段值时，返回空数组
    if (!selectedFieldValue) return [];

    let filtered = tasks.filter(task => {
      // 特殊处理"全部"状态选项
      if (selectedField === 'status' && selectedFieldValue === 'all') {
        // 不显示已完成的任务
        return task.status !== 'done' && task.status !== '已完成';
      }

      // 特殊处理状态字段为"已完成"的情况
      if (selectedField === 'status' && (selectedFieldValue === '已完成' || selectedFieldValue === 'done')) {
        return (task.status === '已完成' || task.status === 'done') && task.archived !== true;
      }

      // 不显示已完成的任务（除了在"已完成"选项下）
      if (task.status === 'done' || task.status === '已完成') return false;

      return task[selectedField] === selectedFieldValue;
    });

    // console.log('过滤后的任务数量:', filtered.length);

    // 添加搜索过滤逻辑
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(task => {
        // 搜索任务名称
        if (task.name && task.name.toLowerCase().includes(lowerSearchTerm)) {
          return true;
        }
        // 搜索标签
        if (task.tags && Array.isArray(task.tags)) {
          if (task.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))) {
            return true;
          }
        }
        // 搜索描述
        if (task.description && task.description.toLowerCase().includes(lowerSearchTerm)) {
          return true;
        }
        // 搜索备注
        if (task.notes && task.notes.toLowerCase().includes(lowerSearchTerm)) {
          return true;
        }
        return false;
      });
    }

    // 添加排序逻辑
    filtered.sort((a, b) => {
      // 获取字段映射信息用于排序
      const aInfo = getFieldDisplayInfo(fieldOptionsMap[sortField] || sortField, a[sortField]);
      const bInfo = getFieldDisplayInfo(fieldOptionsMap[sortField] || sortField, b[sortField]);

      // 对于 priority 字段，使用映射中的 sortOrder 值进行排序
      let aSortValue, bSortValue;

      if (sortField === 'priority') {
        aSortValue = aInfo.sortOrder !== undefined ? aInfo.sortOrder : a[sortField];
        bSortValue = bInfo.sortOrder !== undefined ? bInfo.sortOrder : b[sortField];
      } else {
        // 其他字段直接使用值进行排序
        aSortValue = a[sortField];
        bSortValue = b[sortField];
      }

      // 处理字符串比较
      if (typeof aSortValue === 'string' && typeof bSortValue === 'string') {
        const comparison = aSortValue.localeCompare(bSortValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      // 处理数字比较
      if (sortOrder === 'asc') {
        return aSortValue > bSortValue ? 1 : -1;
      } else {
        return aSortValue < bSortValue ? 1 : -1;
      }
    });

    return filtered;
  };


  // 获取字段值的显示信息
  const getFieldDisplayInfo = (field, value) => {
    // 确保 value 是字符串
    const stringValue = typeof value === 'string' ? value : String(value || '');

    return taskFieldMappings[field]?.[stringValue] || {
      color: '#CCCCCC',
      abbreviation: stringValue.substring(0, 1)
    };
  };

  // 处理任务完成
  const updateCharacterStats = async (task) => {
    try {
      // 1. 更新经验奖励
      if (task.exp_reward && task.exp_reward > 0) {
        // console.log('更新角色经验值中:', task.exp_reward);
        try {
          const response = await fetch(`${CONFIG.API_BASE_URL}/api/character/exp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount: task.exp_reward })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          // console.log('经验值更新结果:', result);
        } catch (expError) {
          console.error('更新经验值失败:', expError);
        }
      }
      // console.log('更新角色经验值成功');

      // 2. 更新积分奖励
      if (task.credits_reward) {
        for (const [creditType, amount] of Object.entries(task.credits_reward)) {
          // console.log(`更新角色${creditType}积分中:`, amount);
          if (amount > 0) {
            try {
              const creditResponse = await fetch(`${CONFIG.API_BASE_URL}/api/credits/add/${creditType}/${amount}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amount: amount })
              });

              if (!creditResponse.ok) {
                throw new Error(`HTTP error! status: ${creditResponse.status}`);
              }

              const creditResult = await creditResponse.json();
              // console.log(`积分${creditType}更新结果:`, creditResult);
            } catch (creditError) {
              console.error(`更新积分${creditType}失败:`, creditError);
              continue; // 继续处理其他积分类型
            }

            // 3. 根据积分类型到属性类别的映射关系更新属性点
            if (characterSettings) {
              // 查找匹配的设置项
              const matchedSetting = characterSettings.find(
                item => item.creditType === creditType
              );

              // 如果找到了匹配的设置项并且有属性类别
              if (matchedSetting && matchedSetting.propertyCategory) {
                try {
                  const propertyResponse = await fetch(`${CONFIG.API_BASE_URL}/api/character/properties/${encodeURIComponent(matchedSetting.propertyCategory)}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ amount: amount })
                  });

                  if (!propertyResponse.ok) {
                    throw new Error(`HTTP error! status: ${propertyResponse.status}`);
                  }

                  const propertyResult = await propertyResponse.json();
                  // console.log(`属性${matchedSetting.propertyCategory}更新结果:`, propertyResult);
                } catch (propertyError) {
                  console.error(`更新属性${matchedSetting.propertyCategory}失败:`, propertyError);
                }
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('更新角色统计数据时发生错误:', error);
      // 可以选择显示用户友好的错误消息
      // alert('更新角色数据时发生部分错误，请检查控制台了解详情');
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      // 状态为已完成则退出
      if (task.status === '已完成') return;

      let newCompletedCount = (task.completed_count || 0) + 1;
      let newTotalCompletionCount = (task.total_completion_count || 0) + 1;
      let newStatus = task.status;
      let max_completes = task.max_completions || 99999; // 若为0则使用默认最大完成次数99999

      // 计算完成状态
      if (max_completes > 0 && newCompletedCount >= max_completes) {
        newStatus = '已完成';
      } else if (newCompletedCount > 0 && newCompletedCount < max_completes) {
        newStatus = '重复中';
      }

      // 完成次数溢出的任务：只更新状态为已完成，不发奖励
      if (newCompletedCount > max_completes) {
        const updatedTask0 = {
          ...task,
          status: newStatus,
        };

        // 发送更新请求
        const response0 = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${taskId}/update_status_completed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedTask0)
        });

        const result0 = await response0.json();

        if (response0.ok) {
          {settings.enableEffectOnTaskCompletion && playTaskCompleteEffect(task);}
          onShowStatus(result0.message || '任务已完成');
          setShowConfirmation(null)
          onCompleteTask();
        }
        // console.log('#1：任务完成')

        return;
      }

      let completeTime = new Date().toLocaleString('sv-SE');

      // 为后台更新准备任务数据
      const updatedTask = {
        ...task,
        completed_count: newCompletedCount,
        total_completion_count: newTotalCompletionCount,
        status: newStatus,
        complete_time: completeTime,
        items_reward: task.items_reward,
      };
      // console.log('发送到后台的更新任务数据:', updatedTask);

      // 发送更新请求至后台
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTask)
      });

      const result = await response.json();

      if (response.ok) {
        {settings.enableEffectOnTaskCompletion && playTaskCompleteEffect(task);}
        onShowStatus(result.message || '任务已完成');
        setShowConfirmation(null)
        // console.log('#2：任务已完成')

        // 显示奖励信息
        // alert(`任务已完成!\n\n获得以下奖励:\n${result.reward}`);
        if (result.reward) {
          alert(`任务已完成!\n\n获得以下奖励:\n${result.reward}`);
        }
        addLog('任务','完成任务',`完成${task.name}: ${result.reward}`)

        // 新增：更新角色的经验值、积分和属性点
        // await updateCharacterStats(task);
       // 更新道具奖励: 后台处理

        onCompleteTask();
      } else {
        // alert(result.error || '完成任务失败');
        addLog('任务','完成失败',`任务${task.name} 完成失败: ${result.error}`)
      }
    } catch (error) {
      console.error('完成任务时发生错误:', error);
      alert('网络错误');
    }
  };

  // 处理任务删除
  const handleDeleteTask = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onDeleteTask();
        onShowStatus('任务已删除');
        addLog('任务','删除任务',`${task.name} 已删除`)
      } else {
        alert('删除任务失败');
        addLog('任务','删除失败',`${task.name} 删除失败`)
      }
    } catch (error) {
      alert('网络错误');
    }

    setShowTaskMenu(null);
  };

  // 在组件中添加一个计算任务统计数据的函数
  const getTaskStatsForFieldOption = (field, optionValue) => {
    const filteredTasks = tasks.filter(task => {
      // 对于状态字段且选项为"已完成"的情况，需要额外检查归档字段
      if (field === 'status' && optionValue === '已完成') {
        return task.status === '已完成' && task.archived !== true;
      }
      // 对于状态字段且选项为"done"的情况，需要额外检查归档字段
      if (field === 'status' && optionValue === 'done') {
        return task.status === 'done' && task.archived !== true;
      }
      // 不显示已完成的任务（除了在"已完成"选项下）
      if (task.status === 'done' || task.status === '已完成') return false;
      return task[field] === optionValue;
      // // 不显示已完成的任务
      // if (task.status === 'done' || task.status === '已完成') return false;
      // return task[field] === optionValue;
    });

    const taskCount = filteredTasks.length;
    const totalExp = filteredTasks.reduce((sum, task) => sum + (task.exp_reward || 0), 0);

    // 计算 credits 总和
    const totalCredits = {};
    filteredTasks.forEach(task => {
      if (task.credits_reward) {
        Object.entries(task.credits_reward).forEach(([creditType, amount]) => {
          if (!totalCredits[creditType]) {
            totalCredits[creditType] = 0;
          }
          totalCredits[creditType] += amount;
        });
      }
    });

    return { taskCount, totalExp, totalCredits };
  };


  // 渲染角色信息栏
  // 修改 renderCharacterInfo 函数中的角色积分显示部分
  // 修改 renderCharacterInfo 函数中的点击处理
  const renderCharacterInfo = () => {
    const unfinishedTasksCount = tasks.filter(task =>
      task.status !== 'done' && task.status !== '已完成'
    ).length;

    // 判断是否空间不足的条件：
    // 1. 屏幕宽度小于768px（窄屏设备）
    // 2. 工具栏位置为top（会占用character-info-bar空间）
    const isSpaceConstrained = window.innerWidth <= 768 && toolbarPosition === 'top';

    return (
      <div className={`character-info-bar ${hideTopNav ? 'navbar-hidden' : ''}`}>
        <div className="character-level" style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '5px',
          marginLeft: '10px',
          marginRight: '10px',
          flexWrap: 'wrap',
          width: '100%'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            flex: 1,
            minWidth: 0
          }}>
            <p title="角色等级">Lv.{characterInfo.level}</p>
            <p title="经验值">⚔{formatNumber(characterInfo.experience)}</p>
            <p title="任务数">📌{unfinishedTasksCount}</p>

            {/* 当工具栏位置为顶部时，显示在角色信息栏内部 */}
            {(toolbarPosition === 'top' && !isToolbarCollapsed) && (
              <div style={{
                marginLeft: '10px',
                display: 'flex',
                alignItems: 'center'
              }}
              className="character-toolbar-container"
              >
                {renderModeToolbar()}
              </div>
            )}

            {/* 顶部折叠状态下的工具栏按钮 */}
            {(toolbarPosition === 'top' && isToolbarCollapsed) && (
              <div style={{
                marginLeft: '10px',
                display: 'flex',
                alignItems: 'center'
              }}
              className="character-toolbar-container"
              >
                {renderModeToolbar()}
              </div>
            )}
          </div>

          {/* 角色统计信息 - 根据空间条件显示或隐藏 */}
          <div className="character-stats" style={{
            marginRight: '1px',
            display: isSpaceConstrained ? 'none' : 'flex',  // 空间不足时隐藏
            alignItems: 'center',
            gap: '1px',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            minWidth: 0,
            flex: '0 1 auto'
          }}>
            {characterSettings ? (
              characterSettings
                .filter(setting => characterInfo.credits.hasOwnProperty(setting.creditType))
                .map(setting => {
                  const creditType = setting.creditType;
                  const creditValue = characterInfo.credits[creditType];
                  const creditIcon = setting.creditIcon || creditType;
                  // const domain = setting?.domain;
                  const propertyCategory = setting?.propertyCategory;
                  const propertyValue = data.properties[propertyCategory]
                  const propertyLevel = calculatePropertyLevel(propertyValue, propertyCategory, settings.expFormulas);
                  const titleText = `${creditType}${setting?.creditIcon || ''}: ${creditValue} ${
                        [setting?.domain, setting?.propertyCategory].filter(Boolean).join('/') || setting?.icon
                          ? `${"\n"+
                              [setting?.domain, setting?.propertyCategory].filter(Boolean).join('/') +
                              (setting?.icon ? setting?.icon : "")+ ": " + propertyValue + " (Lv." + propertyLevel.level + ")"
                            }`
                          : ''
                      } `

                  return (
                    <span
                      key={creditType}
                      title={titleText}
                      onClick={(e) => {
                        e.stopPropagation();

                        // 移除已存在的tooltip
                        if (tooltipRef.current && tooltipRef.current.parentNode) {
                          tooltipRef.current.parentNode.removeChild(tooltipRef.current);
                        }

                        // 创建新的tooltip
                        const tooltip = document.createElement('div');
                        tooltip.textContent = titleText;
                        tooltip.style.cssText = `    position: fixed;
                          top: ${e.clientY + 10}px;
                          left: ${e.clientX - 20}px;
                          background: #333;
                          color: white;
                          padding: 8px;
                          border-radius: 4px;
                          z-index: 1000;
                          font-size: 12px;
                          white-space: pre-line;
                          max-width: 300px;
                        `;
                        document.body.appendChild(tooltip);

                        // 保存当前tooltip引用
                        tooltipRef.current = tooltip;

                        // 几秒后自动消失
                        setTimeout(() => {
                          if (tooltip.parentNode) {
                            tooltip.parentNode.removeChild(tooltip);
                            if (tooltipRef.current === tooltip) {
                              tooltipRef.current = null;
                            }
                          }
                        }, 2000);
                      }}

                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {typeof creditIcon === 'string' && creditIcon.startsWith('http') ? (
                        <img src={creditIcon} alt={creditType} className="credit-icon" style={{width: '16px', height: '16px', marginRight: '1px'}} />
                      ) : (
                        <span style={{marginRight: '1px'}}>{creditIcon}</span>
                      )}
                      {formatNumber(creditValue)}
                    </span>
                  );
                })
            ) : (
              Object.entries(characterInfo.credits || {}).map(([type, value]) => {
                const creditSetting = characterSettings?.find(item => item.creditType === type);
                const creditIcon = creditSetting?.creditIcon || type;
                const domain = creditSetting?.domain;

                return (
                  <span
                    key={type}
                    title={`${type} (${domain}): ${value}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {typeof creditIcon === 'string' && creditIcon.startsWith('http') ? (
                      <img src={creditIcon} alt={type} className="credit-icon" style={{width: '16px', height: '16px', marginRight: '1px'}} />
                    ) : (
                      <span style={{marginRight: '1px'}}>{creditIcon}</span>
                    )}
                    {value}
                  </span>
                );
              })
            )}
          </div>

          {/* 省略号按钮 - 空间不足时显示 */}
          <div style={{
            marginRight: '10px',
            display: isSpaceConstrained ? 'flex' : 'none', // 空间不足时显示
            alignItems: 'center'
          }}
          className="character-stats-toggle"
          >
            <button
              onClick={(e) => {
                const buttonRect = e.currentTarget.getBoundingClientRect();
                const popupWidth = 300;
                let xPosition = buttonRect.left;

                if (xPosition + popupWidth > window.innerWidth) {
                  xPosition = window.innerWidth - popupWidth - 10;
                }

                setCharacterStatsPopupPosition({
                  x: xPosition,
                  y: buttonRect.bottom + window.scrollY
                });
                setShowCharacterStatsPopup(!showCharacterStatsPopup);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'black',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '0 1px'
              }}
              title="显示角色统计信息"
            >
              »
            </button>
          </div>
        </div>
      </div>
    )
  }




  // 渲染按钮区
  const renderButtonArea = () => {
    const schemes = ['category', 'domain', 'priority'];
    const currentIndex = schemes.indexOf(colorScheme);
    const nextIndex = (currentIndex + 1) % schemes.length;

    const renderCardViewButtons = () => {
      return (
          <div className="card-view-buttons">
            {selectedFieldValue && (
                <button
                    className="color-scheme-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorScheme(schemes[nextIndex]);
                    }}
                    title={`当前按“${colorScheme === 'category' ? '类别' : colorScheme === 'domain' ? '领域' : '优先级'}”字段为卡片配色`}
                >
                  🌈
                </button>
            )}

            {selectedFieldValue && (
                <button
                    className="back-to-field-button"
                    onClick={() => setSelectedFieldValue(null)}
                    title="返回"
                >
                  🔙
                </button>
            )}

            {selectedFieldValue && (
              <button className="tasksys-settings-button" onClick={() => setIsSettingsModalOpen(!isSettingsModalOpen)}>
                ⚙️️
              </button>
            )}

            {/* 设置模态框 */}
            <SettingsModal
              isOpen={isSettingsModalOpen}
              title="任务模块设置"
              onClose={() => setIsSettingsModalOpen(false)}
              targetGroup={['general','action-buttons', 'board-view', 'calendar-view', 'task-field-mapping','border', 'effects' ]}
              settings={settings}
              onUpdateSettings={onUpdateTask}
            />

          </div>
      );
    };

    return (
        <div className="button-area" style={{display: externalHideTopControls ? 'none' : 'flex', flexDirection: isDesktop ? 'row' : 'column'}}>
          <div className="button-area-left">
            {/* 添加搜索框 */}
            {selectedFieldValue && (
                <div className="task-system-search-container">
                  <input
                      type="text"
                      placeholder="搜索任务..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setSearchTerm('');
                          e.target.blur();
                        }
                      }}
                      className="task-system-search-input"
                  />
                  {searchTerm && (
                      <button
                          className="clear-search-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchTerm('');
                            // 重新聚焦到搜索框
                            setTimeout(() => {
                              const searchInput = document.querySelector('.task-system-search-input');
                              if (searchInput) {
                                searchInput.focus();
                              }
                            }, 0);
                          }}
                          title="清空搜索"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path
                              d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                        </svg>
                      </button>
                  )}
                </div>
            )}

            {selectedFieldValue && (
                <div className="sort-dropdown-container" style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                  <select
                      value={sortField}
                      title="排序字段"
                      onChange={(e) => {
                        e.stopPropagation();
                        setSortField(e.target.value);
                      }}
                      className="sort-field-dropdown"
                      style={{
                        padding: '2px 4px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        background: 'white'
                      }}
                  >
                    <option value="id">ID</option>
                    <option value="name">任务名</option>
                    <option value="category">类别</option>
                    <option value="domain">领域</option>
                    <option value="priority">优先级</option>
                    <option value="status">状态</option>
                    <option value="start_time">开始时间</option>
                    <option value="exp_reward">经验</option>
                    <option value="tags">标签</option>
                  </select>
                  <button
                      className="sort-order-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      title={`排序方式: ${sortOrder === 'asc' ? '升序' : '降序'}`}
                      style={{
                        padding: '2px 4px',
                        border: '1px solid #ccc',
                        background: 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
            )}

            {!isDesktop && (renderCardViewButtons())}


          </div>

          <div className="button-area-center" style={{gap: '1px'}}>
            {selectedFieldValue && (
                <div className="selected-field-value">
                  <p  style={{fontWeight:"bold"}}>{selectedFieldValue === 'all' ? '全部' : selectedFieldValue} </p>
                  {!isDesktop && (
                    <p style={{fontSize:"10px"}}> ({`按“${colorScheme === 'category' ? '类别' : colorScheme === 'domain' ? '领域' : '优先级'}”字段配色`})</p>
                  )}
                </div>
            )}
          </div>

          <div className="button-area-right">
            {isDesktop && (renderCardViewButtons())}
          </div>
        </div>
    );
  };


  // 渲染底部菜单
  // const renderBottomMenu = () => (
  //   <div className="bottom-menu">
  //     {Object.keys(fieldLabels).map(field => (
  //       <button
  //         key={field}
  //         className={`menu-button ${selectedField === field ? 'active' : ''}`}
  //         onClick={() => {
  //           setSelectedField(field);
  //           setSelectedFieldValue(null);
  //         }}
  //       >
  //         {fieldLabels[field]}
  //       </button>
  //     ))}
  //   </div>
  // );
  const renderBottomMenu = () => {
    // 桌面端不显示底部菜单
    if (isDesktop) return null;

    return (
      <div className="bottom-menu">
        {Object.keys(fieldLabels).map(field => (
          <button
            key={field}
            className={`menu-button ${selectedField === field ? 'active' : ''}`}
            onClick={() => {
              setSelectedField(field);
              setSelectedFieldValue(null);
            }}
          >
            {fieldLabels[field]}
          </button>
        ))}
      </div>
    );
  };

  // 渲染字段选项卡片 显示热键提示
  const renderFieldOptionCards = () => {
    // 桌面端布局 - 始终显示所有字段选项
    if (isDesktop) {
      return (
        <div className="desktop-field-layout">
          {Object.keys(fieldLabels).map(field => (
            <div key={field} className="desktop-field-section">
              <div className="desktop-field-header">
                {fieldLabels[field]}
                {hotkeyHints[field] && (
                  <span className="hotkey-hint field-hint">{hotkeyHints[field]}</span>
                )}
              </div>
              <div className="desktop-field-option-cards">
                {fieldOptions[field] && fieldOptions[field].length > 0 ? (
                  fieldOptions[field].map((option, index) => {
                    const displayInfo = getFieldDisplayInfo(fieldOptionsMap[field], option);
                    // console.log('displayInfo:', displayInfo)
                    const { taskCount, totalExp, totalCredits } = getTaskStatsForFieldOption(field, option);

                    return (
                      <div
                        key={`${field}-${option}`}
                        className="desktop-field-option-card"
                        style={{ backgroundColor: displayInfo.color }}
                        onClick={() => {
                          setSelectedField(field);
                          setSelectedFieldValue(option);
                          // 保存状态到 localStorage
                          // localStorage.setItem('selectedField', field);
                          // localStorage.setItem('selectedFieldValue', option);
                          userDataManager.setUserData('selectedField', field);
                          userDataManager.setUserData('selectedFieldValue', option);
                        }}
                      >
                        <div className="desktop-option-name">{option}</div>
                        <div className="desktop-option-stats">
                          <span className="task-count">📌{taskCount} </span>
                          <span className="exp-total">⚔{Number.isFinite(totalExp) ? (totalExp % 1 === 0 ? totalExp : totalExp.toFixed(1)) : totalExp}</span>
                          {Object.entries(totalCredits).map(([creditType, totalAmount]) => {
                            const creditSetting = characterSettings?.find(item => item.creditType === creditType);
                            const icon = creditSetting?.creditIcon || creditType;

                            return (
                              <span key={creditType} className="credit-total">
                                {typeof icon === 'string' && icon.startsWith('http') ? (
                                  <img src={icon} alt={creditType} className="credit-icon" />
                                ) : (
                                  icon
                                )}
                                {totalAmount}
                              </span>
                            );
                          })}
                        </div>
                        {hotkeyHints[option] && (
                          <span className="hotkey-hint value-hint">{hotkeyHints[option]}</span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="no-options">暂无选项</div>
                )}
                {/* 仅为状态字段添加"全部"选项 */}
                {field === 'status' && (
                  <div
                    className="desktop-field-option-card"
                    style={{ backgroundColor: '#CCCCCC' }}
                    onClick={() => {
                      setSelectedField('status');
                      setSelectedFieldValue('all');
                      // localStorage.setItem('selectedField', 'status');
                      // localStorage.setItem('selectedFieldValue', 'all');
                      userDataManager.setUserData('selectedField', 'status');
                      userDataManager.setUserData('selectedFieldValue', 'all');
                    }}
                  >
                    <div className="desktop-option-name">全部</div>
                    <div className="desktop-option-stats">
                      <span className="task-count">📌{tasks.filter(t => t.status !== 'done' && t.status !== '已完成').length} </span>
                      <span className="exp-total">⚔{tasks.filter(t => t.status !== 'done' && t.status !== '已完成').reduce((sum, task) => sum + (task.exp_reward || 0), 0)}</span>
                    </div>
                    {hotkeyHints['all'] && (
                      <span className="hotkey-hint value-hint">{hotkeyHints['all']}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // 移动端原有布局
    // console.log('移动端布局 - selectedField:', selectedField, 'fieldOptions[selectedField]:', fieldOptions[selectedField]);
    if (!selectedField || !fieldOptions[selectedField]) return null;

    return (
      <div className="field-option-cards">
        {fieldOptions[selectedField].map((option, index) => {
          const displayInfo = getFieldDisplayInfo(fieldOptionsMap[selectedField], option);
          const { taskCount, totalExp, totalCredits } = getTaskStatsForFieldOption(selectedField, option);
          return (
            <div
              key={option}
              className="field-option-card"
              style={{ backgroundColor: displayInfo.color }}
              onClick={() => {
                setSelectedFieldValue(option);
                // 保存状态到 localStorage
                // localStorage.setItem('selectedFieldValue', option);
                userDataManager.setUserData('selectedFieldValue', option);
              }}
            >
              <br></br>
              <div className="option-abbreviation">{displayInfo.abbreviation}</div>
              {/*<div className="option-name">{option}</div>*/}
              <br></br>
              <div className="desktop-option-stats">
                <span className="task-count">📌{taskCount} </span>
                <span className="exp-total">⚔{Number.isFinite(totalExp) ? (totalExp % 1 === 0 ? totalExp : totalExp.toFixed(1)) : totalExp}</span>
                {Object.entries(totalCredits).map(([creditType, totalAmount]) => {
                  const creditSetting = characterSettings?.find(item => item.creditType === creditType);
                  const icon = creditSetting?.creditIcon || creditType;

                  return (
                    <span key={creditType} className="credit-total">
                      {typeof icon === 'string' && icon.startsWith('http') ? (
                        <img src={icon} alt={creditType} className="credit-icon" />
                      ) : (
                        icon
                      )}
                      {totalAmount}
                    </span>
                  );
                })}
              </div>

              {hotkeyHints[option] && (
                <span className="hotkey-hint value-hint">{hotkeyHints[option]}</span>
              )}
            </div>
          );
        })}
        {/* 仅为状态字段添加"全部"选项 */}
        {selectedField === 'status' && (
          <div
            className="field-option-card"
            style={{ backgroundColor: '#CCCCCC' }}
            onClick={() => {
              setSelectedFieldValue('all');
              // localStorage.setItem('selectedFieldValue', 'all');
              userDataManager.setUserData('selectedFieldValue', 'all');
            }}
          >
            <br></br>
            <div className="option-abbreviation">全部</div>
            <br></br>
            {/*<div className="option-name">全部</div>*/}
            <div className="desktop-option-stats">
              <span className="task-count">📌{tasks.filter(t => t.status !== 'done' && t.status !== '已完成').length} </span>
              <span className="exp-total">⚔{tasks.filter(t => t.status !== 'done' && t.status !== '已完成').reduce((sum, task) => sum + (task.exp_reward || 0), 0)}</span>
            </div>
            {hotkeyHints['all'] && (
              <span className="hotkey-hint value-hint">{hotkeyHints['all']}</span>
            )}
          </div>
        )}
      </div>
    );
  };


  // 渲染任务卡片
  const renderTaskCards = () => {
    const filteredTasks = getFilteredTasks();

    if (filteredTasks.length === 0) {
      return <div className="no-tasks">暂无符合条件的任务</div>;
    }

    // 桌面端使用自适应布局，移动端使用原有布局设置
    const gridClass = isDesktop
      ? 'task-cards'  // 桌面端使用自适应布局
      : `task-cards task-cards-grid-2`; // 移动端使用2列布局



    return (
      <div className={gridClass}>
        {filteredTasks.map(task => {
          const categoryInfo = getFieldDisplayInfo('categories', task.category);
          const domainInfo = getFieldDisplayInfo('domains', task.domain);
          const priorityInfo = getFieldDisplayInfo('priorities', task.priority);

          // 根据当前配色方案选择背景色
          let cardBackgroundColor = '#FFFFFF';
          if (colorScheme === 'category') {
            cardBackgroundColor = categoryInfo.color;
          } else if (colorScheme === 'domain') {
            cardBackgroundColor = domainInfo.color;
          } else if (colorScheme === 'priority') {
            cardBackgroundColor = priorityInfo.color;
          }

          return (
            <div
              key={task.id}
              className="task-card"
              style={{ backgroundColor: cardBackgroundColor }}
              onClick={(e) => {
                // 如果按住 Ctrl 键点击，显示任务详情
                if (e.ctrlKey) {
                  setShowTaskDetails(task);
                } else if (e.altKey){
                  e.stopPropagation();
                  setEditingTask(task);
                  setViewMode('classic'); // 切换到经典模式
                  setShowTaskMenu(null);
                } else {
                  setShowConfirmation(task);
                }
              }}
              onMouseEnter={(e) => handleTaskMouseEnter(task, e)}
              onMouseLeave={handleTaskMouseLeave}
              // onMouseEnter={(e) => {
              //   if (e.ctrlKey) {
              //     setHoveredTask(task);
              //     // setShowTaskDetails(task);
              //   }
              //   e.stopPropagation();
              // }}
              // onMouseLeave={(e) => {
              //   setHoveredTask(null);
              //   // 只有当悬浮详情显示的是当前任务时才隐藏
              //   // if (showTaskDetails && showTaskDetails.id === task.id) {
              //   //   setShowTaskDetails(null);
              //   // }
              // }}
            >
              <div className="task-card-header">
                <div className="task-tags">
                  <span className="tag" style={{ color: categoryInfo.color }}>
                    {categoryInfo.abbreviation}
                  </span>
                  <span className="tag" style={{ color: domainInfo.color }}>
                    {domainInfo.abbreviation}
                  </span>
                  <span className="tag" style={{ color: priorityInfo.color }}>
                    {priorityInfo.abbreviation}
                  </span>
                </div>

                <div style={{ position: 'relative' }}>
                  <button
                    className="task-menu-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTaskMenu(showTaskMenu === task.id ? null : task.id);
                    }}
                  >
                    ...
                  </button>

                  {showTaskMenu === task.id && (
                    <div
                      className="task-menu-dropdown"
                      style={{
                        position: 'absolute',
                        zIndex: 1000,
                        right: 0,
                        top: '100%',
                        // backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        padding: '5px 0',
                        minWidth: '100px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setShowTaskDetails(task);
                        setShowTaskMenu(null);
                      }} style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        // background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}>
                        📄 查看
                      </button>
                      {/* 添加编辑按钮 */}
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                        setViewMode('classic'); // 切换到经典模式
                        setShowTaskMenu(null);
                      }} style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        // background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}>
                        🖍 编辑
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        // 设置要复制的任务数据（不包括id）
                        const taskToCopy = { ...task };
                        delete taskToCopy.id;
                        setEditingTask(taskToCopy);
                        setViewMode('classic');
                        setShowTaskMenu(null);
                      }} style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        // background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}>
                        🗐 复制
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }} style={{
                        display: 'block',
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        // background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        boxSizing: 'border-box',

                      }}>
                        ❌ 删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="task-card-content">
                <h3 className="task-name">{task.name}</h3>

                <div className="task-tags-container">
                  {task.tags && task.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="card-markdown-tag"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchTerm(tag);
                        setShowTaskDetails(null); // 关闭模态框
                        // 自动聚焦到搜索框
                        setTimeout(() => {
                          const searchInput = document.querySelector('.task-system-search-input');
                          if (searchInput) {
                            searchInput.focus();
                          }
                        }, 0);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {tag}
                    </span>
                  ))}
                  {task.tags && task.tags.length > 3 && (
                    <span className="card-markdown-tag" style={{ cursor: 'default' }}>
                      ...
                    </span>
                  )}
                </div>

                <div className="task-card-footer">
                  <div className="task-rewards">
                    <span>⚔{task.exp_reward || 0}</span>
                    {task.credits_reward && Object.entries(task.credits_reward).map(([type, amount]) => {
                      const creditSetting = characterSettings?.find(item => item.creditType === type);
                      const icon = creditSetting?.creditIcon || type;

                      return (
                        <span key={type}>
                          {typeof icon === 'string' && icon.startsWith('http') ? (
                            <img src={icon} alt={type} className="credit-icon" />
                          ) : (
                            icon
                          )}
                           {amount}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };
  // 渲染配色方案切换按钮
  const renderColorSchemeButton = () => (
    <div className="color-scheme-button" onClick={(e) => {
      e.stopPropagation();
      const schemes = ['category', 'domain', 'priority'];
      const currentIndex = schemes.indexOf(colorScheme);
      const nextIndex = (currentIndex + 1) % schemes.length;
      setColorScheme(schemes[nextIndex]);
    }}>
      配色方案: {colorScheme === 'category' ? '类别' : colorScheme === 'domain' ? '领域' : '优先级'}
    </div>
  );

  // 渲染任务详情弹窗
  const renderTaskDetails = () => {
    if (!showTaskDetails) return null;

    const handleOverlayClick = (e) => {
      if (e.target === e.currentTarget) {
        setShowTaskDetails(null);
      }
    };

    const categoryInfo = getFieldDisplayInfo('categories', showTaskDetails.category);
    const domainInfo = getFieldDisplayInfo('domains', showTaskDetails.domain);
    const priorityInfo = getFieldDisplayInfo('priorities', showTaskDetails.priority);

    return (
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="modal-content" style={{ width: isDesktop ?'40%':'75%'}} onClick={(e) => e.stopPropagation()}>
          <h2>{showTaskDetails.name}</h2>
          {showTaskDetails.description && (
            <p>{showTaskDetails.description.substring(0, 100)}...</p>
          )}

          <div className="task-details-table">
            <table>
              <tbody>
                <tr>
                  <td>ID</td>
                  <td>{showTaskDetails.id}</td>
                </tr>

                <tr>
                  <td>类别</td>
                  <td className= 'tag' style={{ color: categoryInfo.color }}>&nbsp; {showTaskDetails.category}</td>
                </tr>
                <tr>
                  <td>领域</td>
                  <td className= 'tag' style={{ color: domainInfo.color }}>&nbsp; {showTaskDetails.domain}</td>
                </tr>
                <tr>
                  <td>优先级</td>
                  <td className= 'tag' style={{ color: priorityInfo.color }}>&nbsp; {showTaskDetails.priority}</td>
                </tr>
                <tr>
                  <td>循环周期</td>
                  <td>{showTaskDetails.task_type}</td>
                </tr>
                <tr>
                  <td>状态</td>
                  <td>{showTaskDetails.status}</td>
                </tr>
                <tr>
                  <td>进度</td>
                  <td>{showTaskDetails.completed_count}/{showTaskDetails.max_completions}</td>
                </tr>
                <tr>
                  <td>开始时间</td>
                  <td>{showTaskDetails.start_time}</td>
                </tr>
                {showTaskDetails.tags && showTaskDetails.tags.length > 0 && <tr>
                  <td>标签</td>
                  <td>
                    <div className="task-tags-container">
                      {showTaskDetails.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="markdown-tag"
                          onClick={() => {
                            setSearchTerm(tag);
                            // 使用全局事件来设置搜索词，这样可以兼容各种视图模式
                            window.dispatchEvent(new CustomEvent('setTaskSearchTerm', {
                              detail: { searchTerm: tag }
                            }));

                            // 关闭模态框
                            setShowTaskDetails(null);

                            // 延迟聚焦搜索框，确保DOM已更新
                            setTimeout(() => {
                              // 尝试不同的搜索框选择器以兼容不同视图
                              const selectors = [
                                '.task-system-search-input',
                                '.task-tab-search-input',
                                '[data-testid="task-search-input"]',
                                'input[type="text"][placeholder*="搜索"]'
                              ];

                              for (let selector of selectors) {
                                const searchInput = document.querySelector(selector);
                                if (searchInput) {
                                  searchInput.focus();
                                  break;
                                }
                              }
                            }, 100);
                          }}
                          //   setSearchTerm(tag);
                          //   setShowTaskDetails(null); // 关闭模态框
                          //   // 自动聚焦到搜索框
                          //   setTimeout(() => {
                          //     const searchInput = document.querySelector('.task-system-search-input');
                          //     if (searchInput) {
                          //       searchInput.focus();
                          //     }
                          //   }, 0);
                          // }}
                          style={{ cursor: 'pointer' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>}

                {/*{showTaskDetails.credits_reward && Object.keys(showTaskDetails.credits_reward).length > 0 && (*/}
                {/*  <tr>*/}
                {/*    <td>积分奖励</td>*/}
                {/*    <td>{Object.entries(showTaskDetails.credits_reward).map(([type, amount]) =>*/}
                {/*      `${type}: ${amount}`).join(', ')}</td>*/}
                {/*  </tr>*/}
                {/*)}*/}
                {showTaskDetails.items_reward && Object.keys(showTaskDetails.items_reward).length > 0 && (
                  <tr>
                    <td>道具奖励</td>
                    <td>{Object.entries(showTaskDetails.items_reward).map(([itemId, quantity]) =>
                      `${itemId}: ${quantity}`).join(', ')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="task-hover-rewards">
            <span className="reward-item" title="经验值">⚔{showTaskDetails.exp_reward || 0}</span>
            {showTaskDetails.credits_reward && Object.entries(showTaskDetails.credits_reward).map(([type, amount]) => {
              const creditSetting = characterSettings?.find(item => item.creditType === type);
              const icon = creditSetting?.creditIcon || type;

              return (
                <span key={type} className="reward-item" title={type}>
                  {typeof icon === 'string' && icon.startsWith('http') ? (
                    <img src={icon} alt={type} className="credit-icon" />
                  ) : (
                    icon
                  )}
                  {amount}
                </span>
              );
            })}

          </div>
          <button onClick={() => setShowTaskDetails(null)}>关闭</button>
        </div>
      </div>
    );
  };

  // 在组件中添加一个渲染悬浮详情的函数
  // const renderHoverTaskDetails = () => {
  //   if (!hoveredTask) return null;
  //
  //   return (
  //     <div className="task-hover-details">
  //       <h2>{hoveredTask.name}</h2>
  //       {hoveredTask.description && (
  //         <p className="task-description">{hoveredTask.description.substring(0, 100)}...</p>
  //       )}
  //       <div style={{ textAlign : 'left', lineHeight: '0.5em'}}>
  //           <p>类别: {hoveredTask.category}</p>
  //           <p>领域: {hoveredTask.domain}</p>
  //           <p>优先级: {hoveredTask.priority}</p>
  //           <p>循环周期: {hoveredTask.task_type}</p>
  //           <p>状态: {hoveredTask.status}</p>
  //           <p>开始时间: {hoveredTask.start_time}</p>
  //           <p>进度：{hoveredTask.completed_count}/{hoveredTask.max_completions}</p>
  //           {hoveredTask.credits_reward && Object.keys(hoveredTask.credits_reward).length > 0 && (
  //             <p>【积分奖励】{Object.entries(hoveredTask.credits_reward).map(([type, amount]) =>
  //               `${type}: ${amount}`).join(', ')}</p>
  //           )}
  //          {hoveredTask.items_reward && Object.keys(hoveredTask.items_reward).length > 0 && (
  //              <p>【道具奖励】{Object.entries(hoveredTask.items_reward)}</p>
  //          )}
  //       </div>
  //       <div className="task-hover-rewards">
  //         <span className="reward-item">⚔{hoveredTask.exp_reward || 0}</span>
  //         {hoveredTask.credits_reward && Object.entries(hoveredTask.credits_reward).map(([type, amount]) => {
  //           const creditSetting = settings?.characterSettings?.find(item => item.creditType === type);
  //           const icon = creditSetting?.creditIcon || type;
  //
  //           return (
  //             <span key={type} className="reward-item">
  //               {typeof icon === 'string' && icon.startsWith('http') ? (
  //                 <img src={icon} alt={type} className="credit-icon" />
  //               ) : (
  //                 icon
  //               )}
  //               {amount}
  //             </span>
  //           );
  //         })}
  //       </div>
  //     </div>
  //   );
  // };

  // 渲染确认弹窗
  const renderConfirmation = () => {
    if (!showConfirmation) return null;

    const handleOverlayClick = (e) => {
      if (e.target === e.currentTarget) {
        setShowConfirmation(null);
      }
    };

    return (
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="modal-content" style={{ width: isDesktop ?'20%':'35%'}} onClick={(e) => e.stopPropagation()}>
          <h2>确认完成任务</h2>
          <p>确定要完成任务 "{showConfirmation.name}" 吗？</p>
          <div className="confirmation-buttons">
            <button onClick={() => setShowConfirmation(null)}>取消</button>
            <button onClick={() => handleCompleteTask(showConfirmation.id)}>确认</button>
          </div>
        </div>
      </div>
    );
  };

  // const taskEffectConfig_deprecated =  {
  //   domains: {
  //     '工作': { sound: '01.mp3', animation: 'pulse-blue', particle: 'confetti-blue' },
  //     '学习': { sound: '02.mp3', animation: 'pulse-green', particle: 'sparkles-green' },
  //     '运动': { sound: '03.mp3', animation: 'pulse-red', particle: 'hearts-pink' },
  //     '社交': { sound: '04.mp3', animation: 'pulse-yellow', particle: 'stars-gold' },
  //     '自修': { sound: '05.mp3', animation: 'pulse-purple', particle: 'bubbles-lavender' },
  //     '生活': { sound: '06.mp3', animation: 'pulse-white', particle: 'simple-sparkle' },
  //     '默认': { sound: '07.mp3', animation: 'pulse-white', particle: 'simple-sparkle' }
  //   },
  //   categories: {
  //     '主线任务': { intensity: 5 },
  //     '辅线任务': { intensity: 3 },
  //     '支线任务': { intensity: 2 },
  //     '特殊任务': { intensity: 1 },
  //     '默认': { intensity: 1 }
  //   },
  //   priorities: {
  //     '不重要不紧急': { duration: 1000, size: 1 },
  //     '不重要但紧急': { duration: 2000, size: 1.5 },
  //     '重要不紧急': { duration: 3000, size: 2.0 },
  //     '重要且紧急': { duration: 4000, size: 2.5 },
  //     '默认': { duration: 1000, size: 1 }
  //   }
  // };
  // 特效 settings?.effectConfig ||
  const taskEffectConfig = settings?.effectConfig || {
    domains: {
      '工作': { sound: '01.mp3'},
      '学习': { sound: '02.mp3'},
      '运动': { sound: '03.mp3'},
      '社交': { sound: '04.mp3'},
      '自修': { sound: '05.mp3'},
      '生活': { sound: '06.mp3'},
      '默认': { sound: '07.mp3'},
    },
    categories: {
      '主线任务': { animation: 'pulse-red', particle: 'hearts-pink'},
      '辅线任务': { animation: 'pulse-yellow', particle: 'stars-gold' },
      '支线任务': { animation: 'pulse-blue', particle: 'confetti-blue' },
      '特殊任务': { animation: 'pulse-green', particle: 'sparkles-green' },
      '默认': { animation: 'pulse-white', particle: 'simple-sparkle' }
    },
    priorities: {
      '不重要不紧急': {intensity: 0.5, size: 1.5 },
      '不重要但紧急': {intensity: 1.2, size: 3.6 },
      '重要不紧急': {intensity: 1.9, size: 5.7 },
      '重要且紧急': {intensity: 2.7, size: 8.1 },
      '默认': {intensity: 1, size: 1 }
    }
  };

  // 在 TaskSystem 组件中添加特效播放函数
  const playTaskCompleteEffect = (task) => {
    // 获取任务的类别、领域和优先级特效配置
    // console.log('Playing effect for task:', task.name);
    const categoryEffect = taskEffectConfig.categories[task.category] || taskEffectConfig.categories['默认'];
    const domainEffect = taskEffectConfig.domains[task.domain] || taskEffectConfig.domains['默认'];
    const priorityEffect = taskEffectConfig.priorities[task.priority] || taskEffectConfig.priorities['默认'];

    // console.log('Category effect:', categoryEffect);
    // console.log('Domain effect:', domainEffect);
    // console.log('Priority effect:', priorityEffect);

    playSound(domainEffect.sound);
    // console.log('Playing sound effect:', domainEffect.sound);

    // 显示粒子特效
    showParticleEffect(categoryEffect.particle, priorityEffect.intensity, priorityEffect.size);
    // console.log('Playing particle effect:', categoryEffect.particle);

    // 应用卡片动画
    animateTaskCard(categoryEffect.animation);
    // console.log('Playing animation effect:', categoryEffect.animation);
  };

  // 播放音效函数
  const playSound = (soundFile) => {
    try {
      // 使用正确的路径，根据项目结构调整
      const audio = new Audio(`/sounds/${soundFile}`);
      audio.volume = 0.3;
      audio.play().catch(e => {
        console.log('Audio play failed:', e);
        // 提供一个静默的替代方案，避免完全失败
      });
    } catch (error) {
      console.error('Error creating audio:', error);
    }
  };

  // 粒子特效函数
  const showParticleEffect = (particleType, intensity = 1, size = 1) => {
    try {
      // 创建粒子容器
      const particleContainer = document.createElement('div');
      particleContainer.className = 'particle-effect-container';

      // 确保粒子容器有正确的样式
      particleContainer.style.position = 'fixed';
      particleContainer.style.top = '0';
      particleContainer.style.left = '0';
      particleContainer.style.width = '100%';
      particleContainer.style.height = '100%';
      particleContainer.style.pointerEvents = 'none';
      particleContainer.style.zIndex = '9999';

      document.body.appendChild(particleContainer);
      // console.log('Created particle container');

      // 根据粒子类型创建不同特效
      const particleCount = Math.floor(30 * intensity);
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = `particle ${particleType}`;

        // 确保粒子有正确的样式
        particle.style.position = 'absolute';
        particle.style.width = `${8 * size}px`;
        particle.style.height = `${8 * size}px`;
        particle.style.borderRadius = '50%';
        particle.style.animation = `float ${1 + Math.random() * 2}s ease-in-out forwards`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 0.5}s`;

        particleContainer.appendChild(particle);
      }
      // console.log('Created', particleCount, 'particles');

      // 3秒后移除粒子容器
      setTimeout(() => {
        if (document.body.contains(particleContainer)) {
          document.body.removeChild(particleContainer);
          // console.log('Removed particle container');
        }
      }, 2000);
    } catch (error) {
      console.error('Error showing particle effect:', error);
    }
  };

  // 卡片动画函数
  const animateTaskCard = (animationType, duration = 1500) => {
    try {
      // 使用更具体的选择器，确保能选中确认按钮
      let confirmButton = document.querySelector('.modal-content .confirmation-buttons button:last-child');

      if (!confirmButton) {
        // 如果找不到确认按钮，尝试其他可能的选择器
        const confirmButtons = document.querySelectorAll('.confirmation-buttons button');

        if (confirmButtons.length > 0) {
          confirmButton = confirmButtons[confirmButtons.length - 1]; // 选择最后一个按钮
        }
      }

      if (confirmButton && animationType) {
        // 添加动画类
        confirmButton.classList.add(animationType);
        // console.log('Applied animation class:', animationType);

        // 移除动画类
        setTimeout(() => {
          if (confirmButton.classList.contains(animationType)) {
            confirmButton.classList.remove(animationType);
            // console.log('Removed animation class:', animationType);
          }
        }, duration);
      } else {
        // console.log('Confirm button or animation type not found');
      }
    } catch (error) {
      console.error('Error animating task card:', error);
    }
  };

  // 解析快速任务输入
  const parseQuickTaskInput = (input) => {
    // console.log('解析输入:', input);

    // 分离任务名称和代码部分
    const parts = input.split('$');
    let taskName = parts[0] ? parts[0].trim() : '';

    // 重置表单数据
    const newFormData = {
      name: taskName,
      description: '',
      task_type: '无循环',
      max_completions: 1,
      category: '支线任务',
      domain: '生活',
      priority: '不重要不紧急',
      credits_reward: {},
      items_reward: {},
      start_time: new Date().toLocaleString('sv-SE'),
      complete_time: '',
      archived: false,
      status: '未完成',
      completed_count: 0,
      total_completion_count: 0,
      notes: '',
      tags: []
    };
    // 提取并处理标签（支持在任务名称中和代码部分之后的标签）
    const tagRegex = /#(\S+)/g;
    const tags = [];
    let match;

    // 从整个输入中提取标签
    while ((match = tagRegex.exec(input)) !== null) {
      tags.push(match[1]);
    }

    // 将标签添加到 notes 和 tags 字段
    if (tags.length > 0) {
      newFormData.notes = tags.map(tag => `#${tag}`).join(' ');
      newFormData.tags = tags.map(tag => `#${tag}`);
    }

    // 清理任务名称，移除标签部分
    taskName = taskName.replace(/#\S+/g, '').trim();
    newFormData.name = taskName;

    // 解析各字段的代码
    if (parts.length > 1) {
      // 将所有分隔符统一替换为空格，然后分割
      const codesString = parts.slice(1).join(' ');
      // 从代码部分移除标签
      const codesWithoutTags = codesString.replace(/#\S+/g, ' ');
      // 支持多种分隔符：空格、逗号、中文逗号，但排除标签
      const codes = codesWithoutTags.split(/[\s,，]+/)
        .map(code => code.trim())
        .filter(code => code.length > 0);
      // console.log('处理代码2:', codes);

      codes.forEach(code => {
        applyFieldShortcut(newFormData, code, taskFieldMappings);
      });
    }

    // console.log('处理快速任务1:', newFormData)
    return newFormData;
  };


  const applyFieldShortcut_new = (formData, code) => {
    // 确保 taskFieldMappings 存在且有正确的结构
    if (!taskFieldMappings) {
      // console.log('taskFieldMappings 不存在');
      return;
    }

    // 特殊处理最大重复次数，格式如 "n5" 表示最大重复次数为5
    const num = parseInt(code);
    if (!isNaN(num) && num > 0) {
      formData.max_completions = num;
      // console.log(`设置最大重复次数为 ${num}`);
      return;
    }

    // 检查所有字段映射是否为空
    const isEmptyMapping = Object.values(taskFieldMappings).every(mapping =>
      !mapping || Object.keys(mapping).length === 0
    );

    if (isEmptyMapping) {
      console.log('警告：所有字段代码映射均为空，请检查设置是否正确加载');
      return;
    }

    // 遍历所有字段类型
    for (const [field, mappings] of Object.entries(taskFieldMappings)) {
      // 确保 mappings 存在且不为空
      if (!mappings || Object.keys(mappings).length === 0) {
        // console.log(`字段类型 ${field} 的映射为空`);
        continue;
      }

      try {
        // 遍历该字段类型的所有值和代码映射
        for (const [value, config] of Object.entries(mappings)) {
          // 如果代码匹配 (注意这里访问的是 config.code)
          if (config.code === code) {
            // 根据字段类型设置相应的表单字段
            switch (field) {
              case 'categories':
                formData.category = value;
                // console.log(`设置类别为 ${value}`);
                break;
              case 'domains':
                formData.domain = value;
                // console.log(`设置领域为 ${value}`);
                break;
              case 'priorities':
                formData.priority = value;
                // console.log(`设置优先级为 ${value}`);
                break;
              case 'cycleTypes':
                formData.task_type = value;
                // console.log(`设置循环周期为 ${value}`);
                break;
              default:
                // console.log(`未知字段类型: ${field}`);
            }
            return; // 找到匹配项后退出
          }
        }
      } catch (error) {
        console.error(`处理字段 ${field} 时出错:`, error);
      }
    }

    // console.log(`未找到代码 "${code}" 的映射`);
  };
  // 应用字段快捷方式
  // const applyFieldShortcut_deprecated = (formData, code) => {
  //   // 使用传入的 codeSettings props
  //   const currentCodeSettings = codeSettings;
  //
  //   // 确保 codeSettings 存在且有正确的结构
  //   if (!currentCodeSettings) {
  //     console.log('codeSettings 不存在');
  //     return;
  //   }
  //
  //
  //   // 特殊处理最大重复次数，格式如 "n5" 表示最大重复次数为5
  //   const num = parseInt(code);
  //   if (!isNaN(num) && num > 0) {
  //     formData.max_completions = num;
  //     console.log(`设置最大重复次数为 ${num}`);
  //     return;
  //   }
  //
  //   // 检查所有字段映射是否为空
  //   const isEmptyMapping = Object.values(currentCodeSettings).every(mapping =>
  //     !mapping || Object.keys(mapping).length === 0
  //   );
  //
  //   if (isEmptyMapping) {
  //     console.log('警告：所有字段代码映射均为空，请检查设置是否正确加载');
  //     return;
  //   }
  //
  //   // 遍历所有字段类型
  //   for (const [field, mappings] of Object.entries(currentCodeSettings)) {
  //     // 确保 mappings 存在且不为空
  //     if (!mappings || Object.keys(mappings).length === 0) {
  //       console.log(`字段类型 ${field} 的映射为空`);
  //       continue;
  //     }
  //
  //     try {
  //       // 遍历该字段类型的所有值和代码映射
  //       for (const [value, shortcutCode] of Object.entries(mappings)) {
  //         // 如果代码匹配
  //         if (shortcutCode === code) {
  //           // 根据字段类型设置相应的表单字段
  //           switch (field) {
  //             case 'categories':
  //               formData.category = value;
  //               console.log(`设置类别为 ${value}`);
  //               break;
  //             case 'domains':
  //               formData.domain = value;
  //               console.log(`设置领域为 ${value}`);
  //               break;
  //             case 'priorities':
  //               formData.priority = value;
  //               console.log(`设置优先级为 ${value}`);
  //               break;
  //             case 'cycleTypes':
  //               formData.task_type = value;
  //               console.log(`设置循环周期为 ${value}`);
  //               break;
  //             default:
  //               console.log(`未知字段类型: ${field}`);
  //           }
  //           return; // 找到匹配项后退出
  //         }
  //       }
  //     } catch (error) {
  //       console.error(`处理字段 ${field} 时出错:`, error);
  //     }
  //   }
  //
  //   console.log(`未找到代码 "${code}" 的映射`);
  // };


  const handleCommand = (command) => {
    const trimmedCommand = command.trim().toLowerCase();
    if ((trimmedCommand === 'hide') || (trimmedCommand === 'h')) {
      handleHideStateChange();
    }
    // 可以在这里添加更多命令
  };

  // 处理快速任务提交
  const handleQuickTaskSubmit = (e) => {
    e.preventDefault();
    if (quickTaskInput.trim()) {
      // 检查是否是命令（以/开头）
      if (quickTaskInput.startsWith('/')) {
        // console.log('命令:', quickTaskInput);
        handleCommand(quickTaskInput.substring(1));
        setShowQuickTaskInput(false);
        setQuickTaskInput('');
        return;
      }

      const formData = parseQuickTaskInput(quickTaskInput);
      setShowQuickTaskInput(false);
      setQuickTaskInput('');
      updateViewMode('classic');
      // 显示添加任务模态框
      setTimeout(() => {
        // 先发送表单数据
        window.dispatchEvent(new CustomEvent('setQuickTaskFormData', {
          detail: formData
        }));
        window.dispatchEvent(new CustomEvent('openQuickTaskForm'));
      }, 100);
    }
  };


  // 添加自定义事件监听：日志编辑框中添加快速任务
  useEffect(() => {
    const handleAddQuickTask = (event) => {
      const command = event.detail.command;
      if (command) {
        // 使用现有的 parseQuickTaskInput 函数处理命令
        parseQuickTaskInput(command);
        // 显示添加任务模态框
        setShowQuickTaskInput(true);
      }
    };

    // 监听自定义事件
    window.addEventListener('addQuickTask', handleAddQuickTask);

    // 清理事件监听器
    return () => {
      window.removeEventListener('addQuickTask', handleAddQuickTask);
    };
  }, [parseQuickTaskInput, setShowQuickTaskInput]);




  // 渲染快速任务输入模态框
  const renderQuickTaskModal = () => {
    if (!showQuickTaskInput) return null;


    const handleOverlayClick = (e) => {
      if (e.target === e.currentTarget) {
        setShowQuickTaskInput(false);
        setQuickTaskInput('');
      }
    };

    // 处理快速新增任务
    const handleQuickAdd = async () => {
      if (quickTaskInput.trim()) {
        // 检查是否是命令（以/开头）
        if (quickTaskInput.startsWith('/')) {
          handleCommand(quickTaskInput.substring(1));
          setShowQuickTaskInput(false);
          setQuickTaskInput('');
          return;
        }

        // 使用共享函数直接创建任务
        await createTaskDirectly(quickTaskInput, {
          onShowStatus,
          addLog,
          // codeSettings,
          characterSettings,
          taskFieldMappings,
          stats,
          onAddTask,
          expFormulas
        });

        setShowQuickTaskInput(false);
        setQuickTaskInput('');
      }
    };

    // const handleKeyDown = (e) => {
    //   if (e.key === 'Escape') {
    //     setShowQuickTaskInput(false);
    //     setQuickTaskInput('');
    //   }
    // };

    return (
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div
          className="quick-task-modal"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          tabIndex={0} // 使模态框可获得焦点以捕获键盘事件
        >
          <div className="quick-task-input-container">
            <form
                onSubmit={handleQuickTaskSubmit}
                onKeyDown={(e) => {
                  // 支持 Ctrl+Enter 快速新增
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    handleQuickAdd();
                  }
                  // ESC 键关闭模态框
                  if (e.key === 'Escape') {
                    setShowQuickTaskInput(false);
                    setQuickTaskInput('');
                  }
                }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end',}}>
                <button
                    className="toggle-buttons-btn"
                    type="button"
                    onClick={() => {
                  setShowQuickTaskInput(false);
                  setQuickTaskInput('');
                }}
                >
                  X
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>

                <input
                  type="text"
                  value={quickTaskInput}
                  onChange={(e) => setQuickTaskInput(e.target.value)}
                  placeholder="输入任务名称和字段值代码，如：读书$a s h x 2 #tag1 #tag2 或输入命令如：/hide"
                  autoFocus
                  className="quick-task-input"
                />
                <button
                  type="button"
                  className="toggle-buttons-btn"
                  onClick={() => setHideButtons(!hideButtons)}
                  title={hideButtons ? "显示按钮" : "隐藏按钮"}
                >
                  ...
                </button>
              </div>

              <div className="quick-task-instructions">
                <p>{quickAddTaskHint}</p>
              </div>
              <div className="quick-task-actions">
                <div className={`quick-task-buttons ${hideButtons ? 'hidden' : ''}`}>
                  <button type="submit" title="新增任务（Enter）">
                    新增✚
                  </button>
                  <button type="button" onClick={handleQuickAdd} title="快速新增任务（Ctrl+Enter）">
                    快速⚡
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };


  // 1. 首先确保 TaskTooltip 组件正确实现
  const TaskTooltip = ({ task, isVisible, parentElement }) =>  {
    const tooltipRef = useRef(null);

    // 计算提示框位置
    useEffect(() => {
      if (!isVisible || !tooltipRef.current || !parentElement) return;

      const updatePosition = () => {
        const tooltip = tooltipRef.current;
        const parentRect = parentElement.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // 默认位置在元素右侧
        let top = parentRect.top + window.scrollY;
        let left = parentRect.right + 10;

        // 如果右侧空间不足且左侧空间足够，则显示在左侧
        if (left + tooltipRect.width > viewportWidth && parentRect.left > tooltipRect.width) {
          left = parentRect.left - tooltipRect.width - 10;
        }

        // 垂直方向调整，确保不会超出屏幕边界
        if (top + tooltipRect.height > viewportHeight + window.scrollY) {
          top = viewportHeight + window.scrollY - tooltipRect.height - 10;
        }

        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
      };

      updatePosition();

      // 监听窗口大小变化
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }, [isVisible, parentElement]);

    if (!isVisible || !task || !parentElement) return null;

    const categoryInfo = getFieldDisplayInfo('categories', task.category);
    const domainInfo = getFieldDisplayInfo('domains', task.domain);
    const priorityInfo = getFieldDisplayInfo('priorities', task.priority);

    return (
      <div
        ref={tooltipRef}
        className="task-tooltip"
        style={{
          position: 'absolute',
          zIndex: 1000,
          backgroundColor: 'floralwhite',
          color: 'black',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
          minWidth: '300px',
          maxWidth: '500px',
          minHeight: '150px',
          maxHeight: '250px',
          wordWrap: 'break-word',
          pointerEvents: 'none'
        }}
      >
        <div><strong>{task.name}</strong></div>
        {task.description && (
          <div style={{ marginTop: '5px', opacity: 0.9 }}>
            {task.description.length > 100
              ? task.description.substring(0, 100) + '...'
              : task.description}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px', color: '#000000' }}>
          <div style={{ display: 'flex', justifyContent: 'left', marginTop: '8px' }}>
            <span>{task.status || '未完成'} ({task.completed_count || 0}/{task.max_completions || 1})</span>
            {/*<span>状态: {task.status || '未完成'}</span>*/}
            {/*<span>进度: {task.completed_count || 0}/{task.max_completions || 1}</span>*/}
          </div>

          <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {task.category && <span style={{ background: categoryInfo.color, padding: '2px 5px', borderRadius: '3px' }}>{task.category}</span>}
            {task.domain && <span style={{ background: domainInfo.color, padding: '2px 5px', borderRadius: '3px' }}>{task.domain}</span>}
            {task.priority && <span style={{  background: priorityInfo.color, padding: '2px 5px', borderRadius: '3px' }}>{task.priority}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', fontSize: '12px', color: '#666', flexWrap: 'wrap' }}>
            {task.tags && task.tags.map((tag, index) => (
              <span
                key={index}
                className="markdown-tag"
                style={{ cursor: 'pointer' }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="task-hover-rewards">
            <span className="reward-item">⚔{task.exp_reward || 0}</span>
            {task.credits_reward && Object.entries(task.credits_reward).map(([type, amount]) => {
              const creditSetting = characterSettings?.find(item => item.creditType === type);
              const icon = creditSetting?.creditIcon || type;

              return (
                <span key={type} className="reward-item">
                  {typeof icon === 'string' && icon.startsWith('http') ? (
                    <img src={icon} alt={type} className="credit-icon" />
                  ) : (
                    icon
                  )}
                  {amount}
                </span>
              );
            })}

          </div>

        </div>
      </div>
    );
  };

  // 2. 确保在组件的 return 语句中添加 TaskTooltip 组件
  // 在 TaskSystem 组件的 return 语句中添加以下代码：
  /*
  return (
    <div className="task-system-container">
      // ... 其他组件内容

      // 添加任务提示框
      <TaskTooltip
        task={tooltipState.task}
        isVisible={tooltipState.visible}
        parentElement={tooltipState.element}
      />
    </div>
  );
  */

  // 3. 修复 handleTaskMouseEnter 函数，确保正确处理所有触发方式
  const handleTaskMouseEnter = (task, e) => {
    // 处理 hover 触发方式
    if (settings && settings.tooltipTrigger === 'hover') {
      setTooltipState({
        visible: true,
        task: task,
        element: e.currentTarget
      });
      return;
    }

    // 处理 shift 触发方式 - 但只在 Shift 键已被按下时显示
    if (settings && settings.tooltipTrigger === 'shift') {
      // 检查 Shift 键是否当前被按下
      if (e.shiftKey) {
        setTooltipState({
          visible: true,
          task: task,
          element: e.currentTarget
        });
      }
    }
  };

  // 4. 修复 handleTaskMouseLeave 函数
  const handleTaskMouseLeave = () => {
    // 对于 hover 触发方式，直接隐藏
    if (settings && settings.tooltipTrigger === 'hover') {
      setTooltipState({
        visible: false,
        task: null,
        element: null
      });
      return;
    }

    // 对于 shift 触发方式，只有在 Shift 键未被按下时才隐藏
    if (settings && settings.tooltipTrigger === 'shift') {
      // 注意：这里我们不主动隐藏，因为 shift 触发方式由键盘事件控制
      // 只有在 Shift 键释放时才隐藏（已在 useEffect 中处理）
    }
  };

  // 5. 修复 Shift 键事件处理，使其更加健壮
  useEffect(() => {
    // 只在 tooltipTrigger 为 shift 时启用
    if (!settings || settings.tooltipTrigger !== 'shift') return;

    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        // 检查是否有元素正处于鼠标悬停状态
        if (tooltipState.element && tooltipState.element.matches(':hover')) {
          setTooltipState(prev => ({
            ...prev,
            visible: true
          }));
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setTooltipState(prev => ({
          ...prev,
          visible: false
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [settings, tooltipState]);

  // 6. 确保在 renderTaskCards 函数中正确绑定鼠标事件
  // 在任务卡片的渲染中，确保使用正确的事件处理函数：
  /*
  <div
    key={task.id}
    className="task-card"
    style={{ backgroundColor: cardBackgroundColor }}
    onClick={(e) => {
      // ... 点击处理逻辑
    }}
    onMouseEnter={(e) => handleTaskMouseEnter(task, e)}
    onMouseLeave={handleTaskMouseLeave}
  >
    // ... 任务卡片内容
  </div>
  */


  // const MainActionButtonGroupForCardsView = ({
  //   onAddTask,
  //   onBatchDelete,
  //   selectedTaskCount,
  //   buttonSettings,
  //   onImportTasks,
  //   onExportTasks
  // }) => {
  //   const [isOpen, setIsOpen] = useState(false);
  //
  //
  //
  //   const toggleDropdown = () => {
  //     const newOpenState = !isOpen;
  //     setIsOpen(newOpenState);
  //     // 通知 TaskSystem 有下拉菜单打开/关闭
  //     window.dispatchEvent(new CustomEvent('taskTabModalState', {
  //       detail: {
  //         hasOpenModal: newOpenState || (openDropdownId !== null) || showAddForm || editingTask || showGroupChangeMenu.isOpen || showDailyLog
  //         // showQuickTaskInput
  //       }
  //     }));
  //   };
  //
  //   // 添加 ESC 键监听来关闭下拉菜单
  //   useEffect(() => {
  //     const handleEscKey = (event) => {
  //       if (event.key === 'Escape' && isOpen) {
  //         setIsOpen(false);
  //       }
  //     };
  //
  //     if (isOpen) {
  //       document.addEventListener('keydown', handleEscKey);
  //     }
  //
  //     return () => {
  //       document.removeEventListener('keydown', handleEscKey);
  //     };
  //   }, [isOpen]);
  //
  //   // 点击其他地方关闭下拉菜单
  //   useEffect(() => {
  //     const handleClickOutside = (event) => {
  //       if (isOpen && !event.target.closest('.main-action-button-group')) {
  //         setIsOpen(false);
  //       }
  //     };
  //
  //     document.addEventListener('click', handleClickOutside);
  //     return () => {
  //       document.removeEventListener('click', handleClickOutside);
  //     };
  //   }, [isOpen]);
  //
  //   // 触发快速任务添加功能，与按N键效果相同
  //   const handleQuickAddTask = () => {
  //     // 创建键盘事件模拟按N键
  //     const keyboardEvent = new KeyboardEvent('keydown', {
  //       key: 'n',
  //       bubbles: true
  //     });
  //     document.dispatchEvent(keyboardEvent);
  //   };
  //
  //   const allButtonsVisible = Object.values(buttonSettings).every(
  //     setting => setting === 'visible'
  //   );
  //
  //
  //   return (
  //     <div className="main-action-button-group">
  //
  //
  //
  //       {/* 根据配置显示可见按钮 */}
  //       {buttonSettings.quickAddTask === 'visible' && (
  //         <button onClick={handleQuickAddTask} title="快速新增任务">⚡</button>
  //       )}
  //       {buttonSettings.addTask === 'visible' && (
  //         <button onClick={onAddTask} title="新增任务">✚</button>
  //       )}
  //
  //       {buttonSettings.batchDelete === 'visible' && (
  //         <button
  //           onClick={onBatchDelete}
  //           disabled={selectedTaskCount === 0}
  //           title="批量删除"
  //         >
  //           ❌ ({selectedTaskCount})
  //         </button>
  //       )}
  //
  //
  //       {buttonSettings.importTasks === 'visible' && (
  //         <button onClick={onImportTasks}  className="csv-import-button" title="导入任务(CSV)">📥</button>
  //       )}
  //       <input
  //         id="csv-file"
  //         type="file"
  //         accept=".csv"
  //         onChange={handleImportTasksCSV}
  //         style={{display: 'none'}}
  //       />
  //
  //       {buttonSettings.exportTasks === 'visible' && (
  //         <button onClick={onExportTasks} title="导出任务(CSV)">📤</button>
  //       )}
  //
  //
  //
  //
  //       {!allButtonsVisible && (
  //         <div className="more-actions-container">
  //         <button onClick={toggleDropdown} className="more-actions-button">…</button>
  //         {isOpen && (
  //           <div className="more-actions-dropdown">
  //             {buttonSettings.quickAddTask === 'hidden' && (
  //               <button onClick={handleQuickAddTask}>快速新增</button>
  //             )}
  //             {buttonSettings.addTask === 'hidden' && (
  //               <button onClick={onAddTask}>新增任务</button>
  //             )}
  //             {buttonSettings.batchDelete === 'hidden' && (
  //               <button
  //                 onClick={onBatchDelete}
  //                 disabled={selectedTaskCount === 0}
  //               >
  //                 批量删除 ({selectedTaskCount})
  //               </button>
  //             )}
  //             {/*{buttonSettings.batchArchive === 'hidden' && (*/}
  //             {/*  <button onClick={onBatchArchive}>批量归档</button>*/}
  //             {/*)}*/}
  //             {/*{buttonSettings.refreshCycles === 'hidden' && (*/}
  //             {/*  <button onClick={onRefreshCycles}>刷新循环任务</button>*/}
  //             {/*)}*/}
  //             {buttonSettings.importTasks === 'hidden' && (
  //               <button onClick={onImportTasks}>导入(CSV)</button>
  //             )}
  //             {buttonSettings.exportTasks === 'hidden' && (
  //               <button onClick={onExportTasks}>导出(CSV)</button>
  //             )}
  //
  //
  //           </div>
  //         )}
  //       </div>
  //       )}
  //     </div>
  //   );
  // };



  return (
    <div className="task-system-container">
      {/* 移除这里原来的顶部工具栏渲染 */}

      {/*{console.log('Main render called, toolbarPosition:', toolbarPosition)}*/}
      {renderCharacterInfo()} {/* 始终显示角色信息栏 */}

      {
        showCharacterStatsPopup && (
          <div
            className="character-stats-popup"
            style={{
              position: 'absolute',
              left: `${characterStatsPopupPosition.x}px`,
              top: `${characterStatsPopupPosition.y+10}px`,
              zIndex: 1000,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              padding: '1px',
              minWidth: '100px',
              maxWidth: '250px'
            }}
            onClick={(e) => e.stopPropagation()} // 防止点击弹窗时关闭
          >
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              {characterSettings ? (
                characterSettings
                  .filter(setting => characterInfo.credits.hasOwnProperty(setting.creditType))
                  .map(setting => {
                    const type = setting.creditType;
                    const value = characterInfo.credits[type];
                    const icon = setting.creditIcon || type;

                    return (
                      <span
                        key={type}
                        title={`${type}: ${value}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {typeof icon === 'string' && icon.startsWith('http') ? (
                          <img src={icon} alt={type} className="credit-icon" style={{width: '16px', height: '16px', marginRight: '3px'}} />
                        ) : (
                          <span style={{marginRight: '3px'}}>{icon}</span>
                        )}
                        {formatNumber(value)}
                      </span>
                    );
                  })
              ) : (
                Object.entries(characterInfo.credits || {}).map(([type, value]) => {
                  const creditSetting = characterSettings?.find(item => item.creditType === type);
                  const icon = creditSetting?.creditIcon || type;

                  return (
                    <span
                      key={type}
                      title={`${type}: ${value}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {typeof icon === 'string' && icon.startsWith('http') ? (
                        <img src={icon} alt={type} className="credit-icon" style={{width: '16px', height: '16px', marginRight: '3px'}} />
                      ) : (
                        <span style={{marginRight: '3px'}}>{icon}</span>
                      )}
                      {value}
                    </span>
                  );
                })
              )}
            </div>
          </div>
        )
      }

      <div className="main-content-wrapper">
        {toolbarPosition !== 'top' && (
          <div>
            {/*{console.log('Rendering non-top toolbar')}*/}
            {renderModeToolbar()}
          </div>
        )}
        {/*{toolbarPosition === 'top' && renderModeToolbar()}*/}

        {viewMode === 'card' ? (
          <>
            <div style={{paddingBottom: '20px'}}>
            </div>
            {renderButtonArea()}
            <div className="task-card-mode">
              <div className="card-content">
                {!selectedFieldValue ? (
                  <>
                    {/* 桌面端直接显示所有字段选项 */}
                    {isDesktop ? (
                      renderFieldOptionCards()
                    ) : (
                      /* 移动端保持原有逻辑 */
                      <>
                        {selectedField ? renderFieldOptionCards() : (
                          <div className="initial-prompt">
                            <p>请选择一个分类来查看任务</p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div  className="task-card-mode">
                    <p></p>
                    {renderTaskCards()}
                    <p></p>
                    <div style={{paddingBottom: '50px'}}></div> {/* 添加空白空间 */}
                  </div>
                )}
              </div>
              {renderConfirmation()}
            </div>
            {renderBottomMenu()}
          </>
        ) : (

          // 经典模式(TaskTab)
          <TaskTab
            tasks={tasks}
            settings={settings}
            characterSettings={characterSettings}
            allItems={allItems}
            items={items}
            stats={stats}
            credits={credits}
            taskCategories={taskCategories}
            taskDomains={taskDomains}
            taskPriorities={taskPriorities}
            taskStatuses={taskStatuses}
            taskCycleTypes={taskCycleTypes}
            actionButtonSettings={actionButtonSettings}
            mainActionButtonSettings={mainActionButtonSettings}
            borderSettings={borderSettings}
            calendarViewSettings={calendarViewSettings}
            // codeSettings={codeSettings}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onCompleteTask={onCompleteTask}
            onShowStatus={onShowStatus}
            onCharacterUpdate={onCharacterUpdate}
            onCreditUpdate={onCreditUpdate}
            onItemUpdate={onItemUpdate}
            onTaskUpdate={onTaskUpdate}
            externalEditingTask={editingTask}              // 传递编辑任务对象
            setExternalEditingTask={setEditingTask}        // 传递状态更新函数
            defaultViewMode={defaultViewMode}
            creditTypes={creditTypes}
            expFormulas={expFormulas}
            taskFieldMappings={taskFieldMappings}
            quickAddTaskHint={quickAddTaskHint}
            // hideTopControls={hideTopControls}
            externalHideTopControls={externalHideTopControls}
            style={{ display: externalHideTopControls ? 'none' : 'block' }}
          />
        )}

        {/*{toolbarPosition === 'vertical' && renderModeToolbar()}*/}
      </div>
      {renderTaskDetails()}
      {renderLogsModal()}

      {renderQuickTaskModal()}

      {/*<TaskTooltip*/}
      {/*  task={tooltipState.task}*/}
      {/*  isVisible={tooltipState.visible}*/}
      {/*  parentElement={tooltipState.element}*/}
      {/*/>*/}
      <ToolbarEditModal />

    </div>
  );
};

export default TaskSystem;
