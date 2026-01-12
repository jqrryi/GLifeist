import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import CONFIG from '../config';
import ReactMarkdown from 'react-markdown';
import MarkdownEditor from './MarkDownEditor';
import './TaskTab.css';
import {useLogs} from "../contexts/LogContext";
import TagIndexManager from '../utils/TagIndexManager';
import ProgressDialog from './ProgressDialog';
import SettingsModal from './SettingsModal';
import {applyFieldShortcut} from "../utils/taskUtils";
import userDataManager from "../utils/userDataManager";


const TaskTab = ({
  stats,
  tasks,
  allItems = [],
  items,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
  onShowStatus,
  fieldSettings = {
    category: true,
    domain: true,
    priority: true,
    progress: true,
    startTime: true,
    completeTime: true,
    archived: true,
    totalCompletionCount: true,
    description: true,
    cycleType: true
  },
  taskCategories = ['主线任务', '辅线任务', '支线任务', '特殊任务'], // 任务类别
  taskDomains = ['学习', '工作', '运动', '生活', '社交', '自修'], // 任务领域
  taskPriorities = ['重要且紧急', '重要不紧急', '不重要但紧急', '不重要不紧急'], // 任务优先级
  taskStatuses = ['未完成', '进行中', '重复中', '已完成'],
  creditTypes,
  taskCycleTypes = ['无循环', '日循环', '周循环', '月循环', '年循环'], // 添加循环周期配置
  settings,
  actionButtonSettings: propActionButtonSettings, // 接收 actionButtonSettings 作为 prop
  mainActionButtonSettings: propMainActionButtonSettings, // 接收 mainActionButtonSettings 作为 prop
  // 添加代码设置props
  borderSettings,
  calendarViewSettings,
  // codeSettings = {
  //   categories: {},
  //   domains: {},
  //   priorities: {},
  //   cycleTypes: {}
  // },
  // creditPointsFormula = "category + domain + priority",
  characterSettings,
  taskFieldMappings,
  expFormulas,
  quickAddTaskHint,
  externalEditingTask,        // 从 TaskSystem 传入的要编辑的任务对象
  setExternalEditingTask,     // TaskSystem 提供的状态更新函数
  hideTopControls,
  externalHideTopControls,
}) => {
  const isMobile = window.innerWidth <= 768;
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    task_type: '无循环',
    max_completions: 1,
    category: '支线任务',
    domain: '生活',
    priority: '不重要不紧急',
    credits_reward: {},
    items_reward: {},
    exp_reward: 0,
    start_time: '',
    complete_time: '',
    archived: false,
    status: '未完成',
    completed_count: 0,
    total_completion_count: 0,
    notes:'',
    tags: [],
  });
  const [filterDomain, setFilterDomain] = useState('全部');
  const [filterPriority, setFilterPriority] = useState('全部');
  const [filterTaskType, setFilterTaskType] = useState('全部');
  const [filterArchived, setFilterArchived] = useState('否');
  // 添加筛选和排序状态
  const [filterCategory, setFilterCategory] = useState('全部');
  const [filterStatus, setFilterStatus] = useState('全部');
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedTasks, setSelectedTasks] = useState([]);
  // 添加搜索状态
  const [itemSearch, setItemSearch] = useState('');
  // 添加下拉列表显示状态
  const [showDropdown, setShowDropdown] = useState(false);
  // 为每个道具奖励项添加独立的搜索状态
  const [itemSearchTerms, setItemSearchTerms] = useState({});
  const [viewMode, setViewMode] = useState(() => {
    // 优先使用本地存储保存的视图模式
    // const savedViewMode = localStorage.getItem('taskViewMode');
    const savedViewMode = userDataManager.getUserData('taskViewMode');
    if (savedViewMode && (savedViewMode === 'list' || savedViewMode === 'board' || savedViewMode === 'calendar')) {
      return savedViewMode;
    }
    // 否则使用默认值
    return 'list';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [dailyLogViewMode, setDailyLogViewMode] = useState('normal'); // 'normal', 'maximized', 'fullScreen'
  // 在 TaskTab.js 中添加一个新的状态来控制备注字段的初始预览模式
  const [initialNotePreviewMode, setInitialNotePreviewMode] = useState('split');
  const [initialNotePreviewModeInCard, setInitialNotePreviewModeInCard] = useState('split');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  // --- 新增：批量删除进度弹窗状态 ---
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);
  const [batchDeleteProgress, setBatchDeleteProgress] = useState(0);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);



  const [boardGroupBy, setBoardGroupBy] = useState(() => {
    // 优先使用本地存储保存的分组设置
    // const savedBoardGroupBy = localStorage.getItem('boardGroupBy');
    const savedBoardGroupBy = userDataManager.getUserData('boardGroupBy');
    if (savedBoardGroupBy && ['category', 'domain', 'priority', 'status'].includes(savedBoardGroupBy)) {
      return savedBoardGroupBy;
    }
    // 默认使用类别分组
    return 'category';
  });

  const { addLog } = useLogs();

  // 使用传入的设置参数
  const [currentFieldSettings, setFieldSettings] = useState(fieldSettings);
  const [currentTaskCategories] = useState(taskCategories);
  const [currentTaskDomains] = useState(taskDomains);
  const [currentTaskPriorities] = useState(taskPriorities);
  const [currentTaskStatuses] = useState(taskStatuses);
  // 添加全局状态管理收纳控件显示
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [actionButtonSettings, setActionButtonSettings] = useState({
    edit: 'visible',
    complete: 'visible',
    copy: 'hidden',
    delete: 'hidden',
    archive: 'hidden'
  });
  // 使用传入的 actionButtonSettings
  const [currentActionButtonSettings, setCurrentActionButtonSettings] = useState(
    settings.actionButtonSettings || {
      edit: 'visible',
      complete: 'visible',
      copy: 'hidden',
      delete: 'hidden',
      archive: 'hidden'
    }
  );
  // 添加本地状态来存储 codeSettings
  // const [localCodeSettings, setLocalCodeSettings] = useState(codeSettings);
  // 支持按钮收纳
  const [mainActionButtonSettings, setMainActionButtonSettings] = useState(
    settings.mainActionButtonSettings || {
    addTask: 'visible',
    batchDelete: 'visible',
    batchArchive: 'visible'
  });
  // 添加日历视图状态
  // const [calendarViewSettings, setCalendarViewSettings] = useState({
  //   dateField: 'start_time', // 基于哪个日期字段
  //   displayField: 'name',    // 显示字段 (name 或 description)
  //   maxChars: 50             // 描述字段最大字符数
  // });
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [showCalendarStats, setShowCalendarStats] = useState(false); // 控制统计列显示


  const [isViewModeInitialized, setIsViewModeInitialized] = useState(false);
  // const taskRewardFormula = "类别权重 * 领域权重 * 优先级权重 * (1 + 0.3 * level)";
  // // 添加快速任务输入状态
  // const [quickTaskInput, setQuickTaskInput] = useState('');
  // const [showQuickTaskInput, setShowQuickTaskInput] = useState(false);
  // 在组件中添加提示状态
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2; // 设置总页数
  const [dailyLogContent, setDailyLogContent] = useState('');
  const [loadingLog, setLoadingLog] = useState(false);
  const [groupChangeMenu, setGroupChangeMenu] = useState({
    isOpen: false,
    task: null,
    position: { x: 0, y: 0 }
  });
  const [calendarStatsCache, setCalendarStatsCache] = useState({});

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '';

    // 如果是日期对象，转换为字符串
    if (dateTimeString instanceof Date) {
      return dateTimeString.toLocaleString('sv-SE');
    }

    // 如果是 ISO 格式的字符串 (包含 T)
    if (typeof dateTimeString === 'string' && dateTimeString.includes('T')) {
      // 将 T 替换为空格
      return dateTimeString.replace('T', ' ').split('.')[0]; // 移除毫秒部分
    }

    return dateTimeString;
  };

  const [expandedDays, setExpandedDays] = useState(new Set());
  const [focusedColumn, setFocusedColumn] = useState(null); // null 表示不聚焦任何列
  const [dailyLogExistence, setDailyLogExistence] = useState({});
  const [shouldRefreshTaskList, setShouldRefreshTaskList] = useState(true);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  // 1. 首先修改 useState 初始化，不再依赖 calendarViewSettings prop
  const [calendarDateField, setCalendarDateField] = useState(() => {
    // 从 localStorage 获取默认值或使用 'complete_time'
    // const savedDateField = localStorage.getItem('calendarDateField');
    const savedDateField = userDataManager.getUserData('calendarDateField');
    return ['start_time', 'complete_time'].includes(savedDateField) ? savedDateField : 'complete_time';
  });
  // 在 TaskTab 组件中添加状态来跟踪编辑器全屏状态
  const [isNoteEditorFullscreen, setIsNoteEditorFullscreen] = useState(false);

  useEffect(() => {
    const handleOpenTaskEdit = (event) => {
      const task = event.detail.task;
      setEditingTask(task);
      setShowAddForm(true); // 假设 setShowAddForm 是控制编辑模态框的函数
    };

    window.addEventListener('openTaskEdit', handleOpenTaskEdit);

    return () => {
      window.removeEventListener('openTaskEdit', handleOpenTaskEdit);
    };
  }, []);

  useEffect(() => {
    if (externalEditingTask) {
      const previewMode = externalEditingTask.notes && externalEditingTask.notes.trim() !== '' ? 'preview' : 'split';
      setInitialNotePreviewModeInCard(previewMode);
      console.log('supposed_initialNotePreviewMode:', previewMode);
      console.log('actual_initialNotePreviewMode:', initialNotePreviewModeInCard);

      // 填充表单数据
      setFormData({
        id: externalEditingTask.id,
        name: externalEditingTask.name || '',
        description: externalEditingTask.description || '',
        task_type: externalEditingTask.task_type || '无循环',
        max_completions: externalEditingTask.max_completions || 1,
        category: externalEditingTask.category || '支线任务',
        domain: externalEditingTask.domain || '生活',
        priority: externalEditingTask.priority || '不重要不紧急',
        credits_reward: externalEditingTask.credits_reward || {},
        items_reward: externalEditingTask.items_reward || {},
        exp_reward: externalEditingTask.exp_reward || 0,
        start_time: externalEditingTask.start_time || new Date().toLocaleString('sv-SE'),
        complete_time: externalEditingTask.complete_time || '',
        archived: externalEditingTask.archived || false,
        status: externalEditingTask.status || '未完成',
        completed_count: externalEditingTask.completed_count || 0,
        total_completion_count: externalEditingTask.total_completion_count || 0,
        notes: externalEditingTask.notes || '',
        tags: externalEditingTask.tags || [],

      });

      console.log('externalEditingTask：', externalEditingTask)

      // 设置内部 editingTask 状态为任务的 ID
      setEditingTask(externalEditingTask.id);

      // 打开编辑表单
      setShowAddForm(true);

      // 清除外部传入的编辑任务状态，避免重复处理
      if (setExternalEditingTask) {
        setExternalEditingTask(null);
      }
    }
  }, [externalEditingTask, setExternalEditingTask]);


  useEffect(() => {
    // localStorage.setItem('taskBoardGroupBy', boardGroupBy);
    userDataManager.setUserData('taskBoardGroupBy', boardGroupBy);
  }, [boardGroupBy]);

  useEffect(() => {
    const handleViewSwitch = (event) => {
      const viewMode = event.detail;
      if (viewMode === 'list' || viewMode === 'board' || viewMode === 'calendar') {
        setViewMode(viewMode);
        // localStorage.setItem('taskViewMode', viewMode);
        userDataManager.setUserData('taskViewMode', viewMode);
      }
    };

    window.addEventListener('switchTaskView', handleViewSwitch);

    return () => {
      window.removeEventListener('switchTaskView', handleViewSwitch);
    };
  }, [setViewMode]);


  // // 在 useEffect 中添加对编辑任务时积分奖励的处理
  useEffect(() => {
    // 在新增和编辑任务时都可以计算积分值
    if (settings && settings.taskRewardFormula && showAddForm && !editingTask) {
      // 获取当前表单中的领域
      const currentDomain = formData.domain;

      let matchedSetting = null;

      // 首先尝试匹配领域
      if (characterSettings) {
        matchedSetting = characterSettings.find(
          item => item.domain === formData.domain
        );
      }
      // console.log('当前测试matchedSetting:', matchedSetting)

      if (matchedSetting && matchedSetting.creditType) {
        //console.log('当前测试matchedSetting:', matchedSetting)
        const calculatedPoints = calculateTaskRewardPoints(
          formData.category,
          formData.domain,
          formData.priority,
          1 // 传入系数
        );
        const finalPoints = Math.max(1, Math.round(calculatedPoints));
        //console.log('当前测试finalPoints:', finalPoints)

        setFormData(prev => ({
          ...prev,
          credits_reward: {
            ...prev.credits_reward,
            [matchedSetting.creditType]: finalPoints
          }
        }));

      }
    }
  }, [formData.domain, formData.category, formData.priority, editingTask, showAddForm, settings]);


  // // 添加 useEffect 来同步 prop 的变化
  // useEffect(() => {
  //   if (propMainActionButtonSettings && Object.keys(propMainActionButtonSettings).length > 0) {
  //     setMainActionButtonSettings(prev => ({
  //       ...prev,
  //       ...propMainActionButtonSettings
  //     }));
  //   }
  // }, [propMainActionButtonSettings]);

  // 在 useEffect 中添加视图模式变化的处理
  useEffect(() => {
    // 当切换到日历视图时，默认显示所有任务（归档与未归档）
    if (viewMode === 'calendar') {
      setFilterArchived('全部');
    } else {
      // 切换到其他视图时，恢复默认只显示未归档任务
      setFilterArchived('否');
    }
    // 保存当前视图模式到本地存储
    // localStorage.setItem('taskViewMode', viewMode);
    userDataManager.setUserData('taskViewMode', viewMode);
  }, [viewMode]);

  // 看板分组方式记忆功能（需要添加）
  useEffect(() => {
    // 保存看板分组方式到本地存储
    // localStorage.setItem('boardGroupBy', boardGroupBy);
    userDataManager.setUserData('boardGroupBy', boardGroupBy);
  }, [boardGroupBy]);

  // 初始化看板分组方式（需要添加）
  useEffect(() => {
    // const savedBoardGroupBy = localStorage.getItem('boardGroupBy');
    const savedBoardGroupBy = userDataManager.getUserData('boardGroupBy');
    if (savedBoardGroupBy && ['category', 'domain', 'priority', 'status'].includes(savedBoardGroupBy)) {
      setBoardGroupBy(savedBoardGroupBy);
    }
  }, []);


  // 简化视图模式初始化的 useEffect
  useEffect(() => {
    if (!isViewModeInitialized) {
      // 设置归档筛选状态基于当前视图模式
      if (viewMode === 'calendar') {
        setFilterArchived('全部');
      } else {
        setFilterArchived('否');
      }
      setIsViewModeInitialized(true);
    }
  }, [viewMode, isViewModeInitialized]);

  // 查找日志文件列表
  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchDailyLogList();
    }
  }, [viewMode, calendarYear, calendarMonth]);


  useEffect(() => {
    if (isViewModeInitialized) {
      // localStorage.setItem('taskViewMode', viewMode);
      userDataManager.setUserData('taskViewMode', viewMode);
    }
  }, [viewMode, isViewModeInitialized]);




  // 添加显示分组更改菜单的函数
  const showGroupChangeMenu = (task, event) => {
    // 阻止事件冒泡
    event.stopPropagation();

    // 获取按钮元素的准确位置（考虑页面滚动）
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();

    // 计算相对于视口的位置
    const position = {
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY
    };

    setGroupChangeMenu({
      isOpen: true,
      task: task,
      position: position
    });

    window.dispatchEvent(new CustomEvent('taskTabModalState', {
      detail: {
        hasOpenModal: true
      }
    }));

  };

 // 添加处理分组更改的函数
  const handleGroupChange = (task, newValue) => {
    // 根据当前分组方式更新任务属性
    switch (boardGroupBy) {
      case 'category':
        if (task.category !== newValue) {
          updateTaskField(task.id, 'category', newValue);
        }
        break;
      case 'domain':
        if (task.domain !== newValue) {
          updateTaskField(task.id, 'domain', newValue);
        }
        break;
      case 'priority':
        if (task.priority !== newValue) {
          updateTaskField(task.id, 'priority', newValue);
        }
        break;
      case 'status':
        if (task.status !== newValue) {
          updateTaskField(task.id, 'status', newValue);
        }
        break;
      default:
        break;
    }

    // 关闭菜单
    setGroupChangeMenu({ isOpen: false, task: null, position: { x: 0, y: 0 } });

    // 通知 TaskSystem 菜单已关闭
    window.dispatchEvent(new CustomEvent('taskTabModalState', {
      detail: {
        hasOpenModal: showAddForm || editingTask || showDailyLog
        // showQuickTaskInput
      }
    }));
  };



  //分页
  const [currentPage, setCurrentPage] = useState(1); // 当前页码
  const [tasksPerPage, setTasksPerPage] = useState(() => {
    // 从 localStorage 中获取保存的每页任务数，如果没有则默认为 10
    // const savedTasksPerPage = localStorage.getItem('tasksPerPage');
    const savedTasksPerPage = userDataManager.getUserData('tasksPerPage');
    return savedTasksPerPage ? parseInt(savedTasksPerPage, 10) : 10;
  }); // 每页任务数
  const [inputPage, setInputPage] = useState(currentPage); // 用于页码输入框的状态
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;

  const getTaskStatus = (task) => {
   // 优先使用存储的状态字段，如果没有则计算
   if (task.status) {
     return task.status;
   }
   // 否则基于 completed_count 计算
    if (task.max_completions > 0 && task.completed_count >= task.max_completions) {
      return '已完成';
    } else if (task.completed_count > 0 && task.completed_count < task.max_completions) {
      return '重复中';
    } else {
      return '未完成';
    }
  };

  // 筛选和排序后的任务列表
  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // 添加搜索过滤逻辑
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(task => {
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

    // 按类别筛选
    if (filterCategory !== '全部') {
      result = result.filter(task => (task.category || '支线任务') === filterCategory);
    }

    // 按领域筛选
    if (filterDomain !== '全部') {
      result = result.filter(task => (task.domain || '学习') === filterDomain);
    }

    // 按优先级筛选
    if (filterPriority !== '全部') {
      result = result.filter(task => (task.priority || '重要且紧急') === filterPriority);
    }

    // 按任务类型筛选
    if (filterTaskType !== '全部') {
      result = result.filter(task => (task.task_type || '无循环') === filterTaskType);
    }

    if (filterStatus !== '全部') {
      result = result.filter(task => {
        const taskStatus = task.status || getTaskStatus(task);
        return taskStatus === filterStatus;
      });
    }

    // 按归档状态筛选（日历视图默认显示全部）
    if (filterArchived !== '全部') {
      const isArchived = filterArchived === '是';
      result = result.filter(task => {
        // 明确处理各种可能的归档值情况
        const taskArchived = task.archived === true || task.archived === 1 || task.archived === 'true' || task.archived === '是';
        const filterResult = isArchived ? taskArchived : !taskArchived;
        return filterResult;
      });
    }

    // 排序逻辑保持不变
    result.sort((a, b) => {
      let valueA, valueB;

      switch (sortField) {
        case 'id':
          valueA = a.id;
          valueB = b.id;
          break;
        case 'name':
          valueA = a.name;
          valueB = b.name;
          break;
        case 'category':
          valueA = a.category || '支线任务';
          valueB = b.category || '支线任务';
          break;
        default:
          valueA = a.id;
          valueB = b.id;
      }

      if (typeof valueA === 'string') {
        const comparison = valueA.localeCompare(valueB);
        return sortDirection === 'asc' ? comparison : -comparison;
      } else {
        const comparison = valueA - valueB;
        return sortDirection === 'asc' ? comparison : -comparison;
      }
    });

    return result;
  }, [tasks, filterCategory, filterDomain, filterPriority, filterTaskType, filterStatus, filterArchived, sortField, sortDirection, searchTerm]);
  const currentTasks = filteredAndSortedTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(filteredAndSortedTasks.length / tasksPerPage);

  // 分页切换函数
  const paginate = (pageNumber) => {
    // 确保页码在有效范围内
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > totalPages) pageNumber = totalPages;
    setCurrentPage(pageNumber);
    setInputPage(pageNumber); // 同步更新输入框的值
  };




  // 添加点击外部关闭菜单的处理
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (groupChangeMenu.isOpen && !event.target.closest('.group-change-menu')) {
        setGroupChangeMenu({ isOpen: false, task: null, position: { x: 0, y: 0 } });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [groupChangeMenu.isOpen]);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && groupChangeMenu.isOpen) {
        event.preventDefault();
        event.stopPropagation(); // 阻止事件冒泡到TaskSystem
        setGroupChangeMenu({
          isOpen: false,
          task: null,
          position: { x: 0, y: 0 }
        });

        // 通知 TaskSystem 菜单已关闭
        window.dispatchEvent(new CustomEvent('taskTabModalState', {
          detail: {
            hasOpenModal: showAddForm || editingTask || showDailyLog
            //  showQuickTaskInput
          }
        }));
      }
    };

    const handleClickOutside = (event) => {
      if (groupChangeMenu.isOpen && !event.target.closest('.group-change-menu')) {
        setGroupChangeMenu({ isOpen: false, task: null, position: { x: 0, y: 0 } });

        // 通知 TaskSystem 菜单已关闭
        window.dispatchEvent(new CustomEvent('taskTabModalState', {
          detail: {
            hasOpenModal: showAddForm || editingTask || showDailyLog
            // showQuickTaskInput
          }
        }));
      }
    };

    // 添加键盘事件监听器
    document.addEventListener('keydown', handleEscKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [groupChangeMenu.isOpen, showAddForm, editingTask, showDailyLog]);
  // showQuickTaskInput

  // 1. 首先移除现有的多个键盘事件处理useEffect，替换为一个统一的处理函数

  // 2. 添加状态跟踪TaskTab内部模态框状态
  useEffect(() => {
    // 通知TaskSystem当前TaskTab是否有打开的模态框
    window.dispatchEvent(new CustomEvent('taskTabModalState', {
      detail: {
        hasOpenModal: showAddForm || editingTask ||
                     showGroupChangeMenu.isOpen || showDailyLog
      }
    }));
  }, [showAddForm, editingTask, showGroupChangeMenu.isOpen, showDailyLog]);
  //showQuickTaskInput

  // 3. 统一的键盘事件处理useEffect
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 检查是否在输入框中
      const isInputActive = document.activeElement.tagName === 'INPUT' ||
                           document.activeElement.tagName === 'TEXTAREA' ||
                           document.activeElement.tagName === 'SELECT';

      if (e.key === 'f' && !isInputActive) {
        e.preventDefault();
        const searchInput = document.querySelector('.task-search-input');
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

     // 添加分页导航快捷键（仅在列表视图中生效）
      if (viewMode === 'list' && !isInputActive) {
        // 阻止方向键的默认行为
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
        }

        switch (e.key) {
          case 'ArrowLeft': // Left arrow - 上一页
            if (currentPage > 1) {
              paginate(currentPage - 1);
            }
            break;
          case 'ArrowRight': // Right arrow - 下一页
            if (currentPage < totalPages) {
              paginate(currentPage + 1);
            }
            break;
          case 'ArrowDown': // Down arrow - 首页
            if (currentPage > 1) {
              paginate(1);
            }
            break;
          case 'ArrowUp': // Up arrow - 末页
            if (currentPage < totalPages) {
              paginate(totalPages);
            }
            break;
          default:
            break;
        }
      }

      // 添加看板视图切换分组功能
      if (viewMode === 'board' && !isInputActive) {
        if (e.key === 'g' || e.key === 'G') {
          e.preventDefault();
          switchBoardGroup();
        } else if (e.key === 'ArrowLeft'){
          e.preventDefault();
          scrollLeftBoard(-600);
        } else if (e.key === 'ArrowRight'){
          e.preventDefault();
          scrollLeftBoard(600);
        }
      }

      // // 按 Shift+N 或 N 键新增任务（不同于快速添加任务）
      // if ((e.key === 'n' || e.key === 'N') && !isInputActive) {
      //   e.preventDefault();
      //
      //   // 如果按了 Shift 键，执行标准新增任务（显示表单）
      //   if (e.shiftKey) {
      //     setShowAddForm(true);
      //     setEditingTask(null);
      //   } else {
      //     // 否则执行快速添加任务
      //     setShowQuickTaskInput(true);
      //     setQuickTaskInput('');
      //   }
      //   return;
      // }


      // ESC键处理 - 优先处理TaskTab内部模态框
      if (e.key === 'Escape') {
        // 检查当前焦点是否在筛选器元素上
        const filterElements = document.querySelectorAll(
          '.task-filters select, .task-filters input, .board-group-selector select, .board-group-controls select'
        );

        if (Array.from(filterElements).includes(document.activeElement)) {
          e.preventDefault();
          e.stopPropagation();
          // 移除焦点
          document.activeElement.blur();
          return;
        }

        // // ESC键关闭快速输入框
        // if (showQuickTaskInput) {
        //   e.preventDefault();
        //   e.stopPropagation(); // 阻止事件冒泡到TaskSystem
        //   setShowQuickTaskInput(false);
        //   setQuickTaskInput('');
        //   return;
        // }

        // ESC键关闭日志弹窗
        if (showDailyLog) {
          e.preventDefault();
          e.stopPropagation(); // 阻止事件冒泡到TaskSystem
          closeDailyLog();
          return;
        }

        // ESC键关闭分组菜单
        if (showGroupChangeMenu.isOpen) {
          e.preventDefault();
          e.stopPropagation(); // 阻止事件冒泡到TaskSystem
          setGroupChangeMenu({ isOpen: false, task: null, position: { x: 0, y: 0 } });
          return;
        }

        // ESC键关闭任务表单（新增/编辑）
        if (showAddForm || editingTask) {
          e.preventDefault();
          e.stopPropagation(); // 阻止事件冒泡到TaskSystem
          setShowAddForm(false);
          setEditingTask(null);
          setItemSearch('');
          return;
        }

        // 如果没有任何模态框打开，允许事件冒泡到TaskSystem处理模式切换
      }
    };

    // 添加键盘事件监听器
    document.addEventListener('keydown', handleKeyDown);

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    viewMode,
    currentPage,
    totalPages,
    boardGroupBy,
    fieldSettings,
    showAddForm,
    editingTask,
    showDailyLog,
    showGroupChangeMenu.isOpen,
  ]);
  // showQuickTaskInput, setQuickTaskInput

  // 4. 添加监听TaskSystem发送的关闭模态框事件
  useEffect(() => {
    const closeTaskTabModal = () => {
      // 按优先级关闭模态框
      if (showAddForm || editingTask) {
        setShowAddForm(false);
        setEditingTask(null);
        setItemSearch('');
      // } else if (showQuickTaskInput) {
      //   setShowQuickTaskInput(false);
      //   setQuickTaskInput('');
      } else if (showGroupChangeMenu.isOpen) {
        setGroupChangeMenu({ isOpen: false, task: null, position: { x: 0, y: 0 } });
      } else if (showDailyLog) {
        closeDailyLog();
      }
    };

    window.addEventListener('closeTaskTabModal', closeTaskTabModal);

    return () => {
      window.removeEventListener('closeTaskTabModal', closeTaskTabModal);
    };
  }, [showAddForm, editingTask, showGroupChangeMenu.isOpen, showDailyLog]);
  // showQuickTaskInput


  const switchBoardGroup = () => {
    const groupOptions = ['status', 'category', 'domain', 'priority'];
    const currentIndex = groupOptions.indexOf(boardGroupBy);
    const nextIndex = (currentIndex + 1) % groupOptions.length;
    const nextGroupBy = groupOptions[nextIndex];

    // 检查下一个分组选项是否在字段设置中启用
    const isFieldEnabled = (field) => {
    if (field === 'status') return true; // status 总是启用
    return fieldSettings[field] !== false; // 其他字段检查是否启用
    };

    // 如果下一个分组字段未启用，则跳过到下一个启用的
    let targetGroupBy = nextGroupBy;
    let attempts = 0;
    while (attempts < groupOptions.length) {
    if (targetGroupBy === 'status' || isFieldEnabled(targetGroupBy)) {
    break;
    }
    const idx = groupOptions.indexOf(targetGroupBy);
    targetGroupBy = groupOptions[(idx + 1) % groupOptions.length];
    attempts++;
    }

    setBoardGroupBy(targetGroupBy);
    // localStorage.setItem('taskBoardGroupBy', targetGroupBy);
    userDataManager.setUserData('taskBoardGroupBy', targetGroupBy);
  }

  // 添加一个 ref 用于任务名称输入框
  const taskNameInputRef = useRef(null);
  const searchInputRef = useRef(null);

  // 在组件顶部创建一个 ref 对象来存储所有表单字段的 refs
  useEffect(() => {
    if ((showAddForm || editingTask) && taskNameInputRef.current) {
      // 使用 requestAnimationFrame 确保 DOM 已经完全渲染
      const timeoutId = setTimeout(() => {
        if (taskNameInputRef.current) {
          taskNameInputRef.current.focus();
          taskNameInputRef.current.select(); // 选中所有文本
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [showAddForm, editingTask]);

  // 添加 useEffect 来定期清理缓存，避免内存泄漏
  useEffect(() => {
    // 每天清理一次缓存
    const interval = setInterval(() => {
      setCalendarStatsCache({});
    }, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);


  // 监听响应quickadd快速添加任务
  useEffect(() => {
    const handleOpenQuickTaskForm = () => {
      setShowAddForm(true);
      setEditingTask(null);
    };

    const handleSetQuickTaskFormData = (event) => {
      setFormData(event.detail);
    };

    const handleOpenStandardTaskForm = () => {
      setShowAddForm(true);
      setEditingTask(null);
      // 重置表单数据为默认值
      setFormData({
        name: '',
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
        total_completion_count: 0
      });
    };

    // 添加事件监听器
    window.addEventListener('openQuickTaskForm', handleOpenQuickTaskForm);
    window.addEventListener('setQuickTaskFormData', handleSetQuickTaskFormData);
    window.addEventListener('openStandardTaskForm', handleOpenStandardTaskForm);

    // 返回清理函数
    return () => {
      window.removeEventListener('openQuickTaskForm', handleOpenQuickTaskForm);
      window.removeEventListener('setQuickTaskFormData', handleSetQuickTaskFormData);
      window.removeEventListener('openStandardTaskForm', handleOpenStandardTaskForm);
    };
  }, []); // 空依赖数组确保只在组件挂载时注册一次

  useEffect(() => {
    const handleTagClick = (event) => {
      const { tag, field } = event.detail;
      setSearchTerm(tag);

      // 使用 requestAnimationFrame 确保 DOM 更新完成后再聚焦
      requestAnimationFrame(() => {
        setTimeout(() => {
          // 确保搜索框可见
          const searchInput = document.querySelector('.task-search-input');
          if (searchInput) {
            // 滚动到搜索框可见位置
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // 聚焦并选中文本
            searchInput.focus();
            searchInput.select();
          }
        }, 50);
      });
    };

    window.addEventListener('markdownTagClick', handleTagClick);

    return () => {
      window.removeEventListener('markdownTagClick', handleTagClick);
    };
  }, []);

  // useEffect(() => {
  //   const handleTagClick = (event) => {
  //     const { tag, field } = event.detail;
  //     setSearchTerm(tag);
  //     // 自动聚焦到搜索框
  //     setTimeout(() => {
  //       const taskSearchInput = document.querySelector('.task-search-input');
  //       if (taskSearchInput) {
  //         taskSearchInput.focus();
  //         taskSearchInput.select();
  //       }
  //     }, 100);
  //   };
  //
  //   window.addEventListener('markdownTagClick', handleTagClick);
  //
  //   return () => {
  //     window.removeEventListener('markdownTagClick', handleTagClick);
  //   };
  // }, []);

  // 添加 useEffect 监听 MarkdownEditor 的全屏状态变化
  useEffect(() => {
    const handleMarkdownEditorFullscreen = (event) => {
      const { isFullscreen, editorType } = event.detail;
      // 只处理任务备注编辑器的全屏状态
      if (editorType === 'task-notes-editor') {
        setIsNoteEditorFullscreen(isFullscreen);
      }
    };

    // 添加事件监听器
    window.addEventListener('markdownEditorFullscreenChange', handleMarkdownEditorFullscreen);

    // 清理函数
    return () => {
      window.removeEventListener('markdownEditorFullscreenChange', handleMarkdownEditorFullscreen);
    };
  }, []);

  useEffect(() => {
    const handleSetSearchTerm = (event) => {
      const { searchTerm } = event.detail;
      setSearchTerm(searchTerm);
    };

    window.addEventListener('setTaskSearchTerm', handleSetSearchTerm);

    return () => {
      window.removeEventListener('setTaskSearchTerm', handleSetSearchTerm);
    };
  }, []);


  const [tooltipState, setTooltipState] = useState({
    visible: false,
    task: null,
    element: null
  });
  // 在 TaskTab 组件中添加 useEffect 来处理全局 Shift 键监听
  useEffect(() => {
    // 只在看板视图且 tooltipTrigger 为 shift 时启用
    if (viewMode !== 'board' || settings.tooltipTrigger !== 'shift') return;

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
        // 隐藏所有由 Shift 触发的 tooltip
        if (tooltipState.visible) {
          closeTooltip();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [viewMode, settings.tooltipTrigger, tooltipState.element, tooltipState.visible]);

  // 添加关闭提示框的函数
  const closeTooltip = () => {
    setTooltipState({
      visible: false,
      task: null,
      element: null
    });
  };

  // 在 TaskTab.js 中添加文本截断函数
  const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // 添加横向滚动相关状态
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const calendarScrollRef = useRef(null);


  // 添加 useEffect 来加载保存的字段设置
  React.useEffect(() => {
    try {
      // const savedSettings = localStorage.getItem('taskFieldSettings');
      const savedSettings = userDataManager.getUserData('taskFieldSettings');
      if (savedSettings) {
        // const parsedSettings = JSON.parse(savedSettings);
        // setFieldSettings(parsedSettings);
        setFieldSettings(savedSettings);
      }
    } catch (e) {
      console.warn('无法从本地存储加载字段设置:', e);
    }
  }, []);

  // 在 TaskTab 组件中添加 useEffect 来加载保存的字段代码设置
  // React.useEffect(() => {
  //   try {
  //     const savedCodeSettings = localStorage.getItem('taskCodeSettings');
  //     if (savedCodeSettings) {
  //       const parsedCodeSettings = JSON.parse(savedCodeSettings);
  //       // 确保所有字段都存在，防止因字段更新导致的问题
  //       const mergedCodeSettings = {
  //         categories: {},
  //         domains: {},
  //         priorities: {},
  //         cycleTypes: {},
  //         ...parsedCodeSettings
  //       };
  //       // 如果通过 prop 传入了 codeSettings，则优先使用 prop 的值
  //       if (Object.keys(codeSettings).length > 0 &&
  //           Object.values(codeSettings).some(mapping => Object.keys(mapping).length > 0)) {
  //         // prop 中有有效数据，使用 prop 的值
  //       } else {
  //         // 否则使用本地存储的值
  //         setLocalCodeSettings(mergedCodeSettings);
  //       }
  //     }
  //   } catch (e) {
  //     console.warn('无法从本地存储加载字段代码设置:', e);
  //   }
  // }, []);


  const calcEmbeddedViewMode = (mode1, mode2) => {
    return mode1 === 'preview' || mode2 === 'preview' ? 'preview' : 'split';
  }

  // 添加手动更新积分奖励的函数
  const updateTaskReward = useCallback(() => {
    // if (!settings || !settings.taskRewardFormula) return;

    let matchedSetting = null;

    const getCreditTypeForDomain = (domain) => {
      // 从 characterSettings 中查找匹配的设置项
      if (characterSettings) {
        const matchedSetting = characterSettings.find(
          item => item.domain === domain
        );

        if (matchedSetting && matchedSetting.creditType) {
          return matchedSetting.creditType;
        }
      }

      // 默认映射关系
      const domainToCreditMap = {
        '学习': '水晶',
        '工作': '星钻',
        '运动': '魂玉',
        '生活': '骨贝',
        '社交': '源石',
        '自修': '灵石'
      };
      return domainToCreditMap[domain] || '骨贝';
    };

    const creditType = getCreditTypeForDomain(formData.domain)
    const calculatedPoints = calculateTaskRewardPoints(
              formData.category,
              formData.domain,
              formData.priority,
            );
    setFormData(prev => ({
      ...prev,
      credits_reward: {
        ...prev.credits_reward,
        [creditType]: calculatedPoints
      }
    }));

  }, [formData.domain, formData.category, formData.priority, settings]);

  const extractTagsFromNotes = (notes) => {
    if (!notes || typeof notes !== 'string') return [];

    // 匹配以 # 开头，后接不包含空格和 # 符号的字符串
    const tagRegex = /#([^\s#]+)/g;
    const matches = notes.match(tagRegex);

    if (!matches) return [];

    // 去重
    return [...new Set(matches)];
  };

  // 修改 TaskTab.js 中的 calculateTaskRewardPoints 函数
  // 修改 calculateTaskRewardPoints 函数确保正确处理系数
  const calculateTaskRewardPoints = (category, domain, priority) => {
    try {
      // 获取积分计算公式
      // const formulaSettings = settings.taskRewardFormula;
      // const formula = formulaSettings.pointCalculationFormula || "类别权重 + 领域权重 + 优先级权重";
      // const formula = "level^0.5 * (类别权重 + 领域权重 + 优先级权重)"

      const categoryWeight = category ? getFieldWeight('categories', category) : 1;
      const domainWeight = domain ? getFieldWeight('domains', domain) : 1;
      const priorityWeight = priority ? getFieldWeight('priorities', priority) : 1;
      const level = stats.level || 1;
      //
      // // 构建公式计算环境，替换所有变量
      // let formulaExpression = formula
      //   .replace(/类别权重/g, categoryWeight)
      //   .replace(/领域权重/g, domainWeight)
      //   .replace(/优先级权重/g, priorityWeight)
      const calculatedPoints = level ** 0.5 * (categoryWeight + domainWeight + priorityWeight);
      const finalPoints = Math.max(1, Math.round(calculatedPoints));
      return finalPoints;

      // 替换幂运算符号
      // formulaExpression = formulaExpression.replace(/\^/g, '**');

      // 评估表达式
      // const result = Function('"use strict"; return (' + formulaExpression + ')')();
      // return Math.max(1, Math.round(result * 100) / 100); // 至少为1，保留两位小数
    } catch (e) {
      console.error("公式计算错误:", e);
      return 1;
    }
  };


  // 在处理表单数据时使用此函数
  const handleDateChange = (fieldName, value) => {
    let formattedDateTime = '';

    if (!value) {
      // 如果输入为空，保持为空
      formattedDateTime = '';
    } else if (value instanceof Date) {
      // 如果已经是 Date 对象
      formattedDateTime = value.toLocaleString('sv-SE');
    } else if (typeof value === 'string') {
      // 处理字符串格式的日期时间
      let dateObj = null;

      // 尝试解析 sv-SE 格式 "yyyy-MM-dd hh:mm:ss"
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
        // 替换空格为 T 以符合 ISO 格式，然后解析
        const isoString = value.replace(' ', 'T');
        dateObj = new Date(isoString);
      }
      // 尝试解析带 T 的 ISO 格式 "yyyy-MM-ddThh:mm:ss" 或 "yyyy-MM-ddThh:mm"
      else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(value)) {
        dateObj = new Date(value);
      }
      // 尝试解析斜杠格式 "yyyy/MM/dd hh:mm:ss" 或 "yyyy/M/d H:m:s"
      else if (/^\d{4}\/\d{1,2}\/\d{1,2}( \d{1,2}:\d{1,2}(:\d{1,2})?)?$/.test(value)) {
        // Date 构造函数可以直接解析这种格式
        dateObj = new Date(value);
      }
      // 如果以上都不匹配，尝试用 Date 构造函数兜底（可能不准确）
      else {
        dateObj = new Date(value);
        // 检查是否是有效日期
        if (isNaN(dateObj.getTime())) {
          console.warn(`无法解析日期时间字符串: ${value}`);
          formattedDateTime = ''; // 或者保持原 value?
        }
      }

      // 如果解析成功且是有效日期，则格式化
      if (dateObj && !isNaN(dateObj.getTime())) {
        formattedDateTime = dateObj.toLocaleString('sv-SE'); // 转换为 sv-SE 格式
      }
    } else {
      // 其他类型，尝试转换为字符串再处理？
      console.warn(`收到意外类型的日期时间值:`, value);
      formattedDateTime = String(value);
    }

    setFormData(prev => ({
      ...prev,
      [fieldName]: formattedDateTime
    }));
  };


  // 在 TaskTab.js 中添加获取每周第一天的函数
  const getFirstDayOfWeek = () => {
    // 从设置中获取每周第一天，如果没有设置则默认为星期天(0)
    return calendarViewSettings?.firstDayOfWeek !== undefined ?
           calendarViewSettings.firstDayOfWeek : 0; // 0 = 星期天, 1 = 星期一
  };

  // 添加切换字段启用状态的函数，添加保存机制
  const toggleFieldSetting = (field) => {
    const newSettings = {
      ...currentFieldSettings,
      [field]: !currentFieldSettings[field]
    };
    setFieldSettings(newSettings);
    saveFieldSettings(newSettings);
  };

  // 在toggleFieldSetting函数后添加新的辅助函数
  const formatProgress = (task) => {
    const max = task.max_completions === 0 ? '∞' : task.max_completions;
    return `${task.completed_count}/${max}`;
  };

  const handleAddTask = async () => {
    try {
      // 过滤掉数量为0的道具奖励
      const filteredItemsReward = {};
      Object.entries(formData.items_reward).forEach(([itemName, count]) => {
        if (count > 0) {
          filteredItemsReward[itemName] = count;
        }
      });

      // 确保所有字段都被正确包含
      const taskData = {
        name: formData.name,
        description: formData.description,
        task_type: formData.task_type,
        max_completions: formData.max_completions,
        category: formData.category,
        domain: formData.domain,
        priority: formData.priority,
        credits_reward: formData.credits_reward,
        items_reward: filteredItemsReward,
        // 添加新增字段
        start_time: formatDateTime(formData.start_time) || null,
        complete_time: formatDateTime(formData.complete_time) || null,
        archived: formData.archived || false,
        status: formData.status || '未完成',
        completed_count: formData.completed_count || 0,
        total_completion_count: formData.total_completion_count || 0,
        exp_reward: formData.exp_reward || 0,
        notes: formData.notes || '',
        tags: extractTagsFromNotes(formData.notes) || [],
      };
      // console.log('发送到后端的任务数据:', taskData);
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks`, {
      // const response = await fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      const result = await response.json();

      if (response.ok) {
        onShowStatus(result.message);
        addLog('任务', '添加任务', result.message)
        if (shouldRefreshTaskList) {
          onAddTask();
        }
        setShowAddForm(false);
        // 修正表单重置，确保所有字段都被正确初始化
        setFormData({
          name: '',
          description: '',
          task_type: '无循环',
          max_completions: 1,
          category: '支线任务',
          domain: '生活',
          priority: '不重要不紧急',
          credits_reward: {},
          items_reward: {},
          start_time: '',
          complete_time: '',
          archived: false,
          status: '未完成',
          completed_count: 0,
          total_completion_count: 0,
          exp_reward: 0,
          notes: '',
          tags: [],
        });
      } else {
        alert(result.error);
        addLog('任务', '添加失败', result.error)
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      // 过滤掉数量为0的道具奖励
      const filteredItemsReward = {};

      Object.entries(formData.items_reward).forEach(([itemName, count]) => {
        if (count > 0) {
          filteredItemsReward[itemName] = count;
        }
      });
      // 确保所有字段都被正确包含
      const taskData = {
        name: formData.name,
        description: formData.description,
        task_type: formData.task_type,
        max_completions: formData.max_completions,
        category: formData.category,
        domain: formData.domain,
        priority: formData.priority,
        credits_reward: formData.credits_reward,
        items_reward: filteredItemsReward,
        // 确保新增字段被正确包含
        start_time: formatDateTime(formData.start_time) || null,
        complete_time: formatDateTime(formData.complete_time) || null,
        archived: formData.archived || false,
        status: formData.status,
        completed_count: formData.completed_count || 0,
        total_completion_count: formData.total_completion_count || 0,
        exp_reward: formData.exp_reward || 0,
        notes: formData.notes || '',
        tags: extractTagsFromNotes(formData.notes) || [],
      };
      // console.log('发送到后端的notes:', formData.notes);

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${editingTask}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      const result = await response.json();
      console.log('更新任务结果：', result);

      if (response.ok) {
        onShowStatus(result.message);
        onUpdateTask();
        addLog('任务', '更新任务', result.message)
        setEditingTask(null);
      } else {
        alert(result.error);
        addLog('任务', '更新失败', result.error)
      }
    } catch (error) {
      alert('网络错误');
    }
  };


  const handleDeleteTask = async (taskId) => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        onShowStatus(result.message);
        onDeleteTask();
        addLog('任务', '删除任务', result.message)
      } else {
        alert(result.error);
        addLog('任务', '删除失败', result.error)
      }
    } catch (error) {
      alert('网络错误');
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
          onShowStatus(result0.message || '任务已完成');
          onCompleteTask();
        }

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
      console.log('发送到后台的更新任务数据:', updatedTask);

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
        onShowStatus(result.message || '任务已完成');

        // 显示奖励信息
        if (result.reward) {
          alert(`任务已完成!\n\n获得以下奖励:\n${result.reward}`);
        }
        addLog('任务', '完成任务', `完成${task.name}: ${result.reward || '无奖励'}`);

        // 更新任务列表
        onCompleteTask();
      } else {
        alert(result.error || '完成任务失败');
        addLog('任务', '完成失败', `任务${task.name} 完成失败: ${result.error}`);
      }
    } catch (error) {
      console.error('完成任务时发生错误:', error);
      alert('网络错误');
    }
  };

  const handleCompleteTask_old = async (taskId) => {
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
        const response0 = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${taskId}/update_completed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedTask0)
        });


        const result0 = await response0.json();

        if (response0.ok) {
          onShowStatus(result0.message || '任务已完成');
          onCompleteTask();
        }

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
      console.log('发送到后台的更新任务数据:', updatedTask);

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
        onShowStatus(result.message || '任务已完成');

        // 显示奖励信息
        // const rewardText = formatReward(task);
        alert(`任务已完成!\n\n获得以下奖励:\n${result.reward}`);
        addLog('任务', '完成任务', `完成${task.name}: ${result.reward}`)

        // 新增：更新角色的经验值、积分和属性点
        await updateCharacterStats_old(task);
       // 更新道具奖励: 后台处理
        onCompleteTask();
      } else {
        alert(result.error || '完成任务失败');
        addLog('任务', '完成失败', `任务${task.name} 完成失败: ${result.error}`)
      }
    } catch (error) {
      console.error('完成任务时发生错误:', error);
      alert('网络错误');
    }
  };
  // 修改 updateCharacterStats 函数，添加更详细的错误处理
  const updateCharacterStats_old = async (task) => {
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

  const formatReward = (task) => {
    let rewardText = '';

    if (task.credits_reward) {
      const creditRewards = Object.entries(task.credits_reward)
        .map(([k, v]) => {
          // 获取属性类别
          const propertyCategory = getPropertyCategoryForCredit(k);
          if (propertyCategory) {
            return `${k}${v} (${propertyCategory}${v})`;
          }
          return `${k}${v}`;
        });
      rewardText += creditRewards.join(', ');
    }

    if (task.items_reward) {
      if (rewardText) rewardText += '; ';
      rewardText += Object.entries(task.items_reward)
        .map(([k, v]) => `${k}x${v}`)
        .join(', ');
    }
    return rewardText;
  };

  // 辅助函数：获取积分类型对应的属性类别
  const getPropertyCategoryForCredit = (creditType) => {
    if (settings && settings.propertyCategoryMapping) {
      const mapping = settings.propertyCategoryMapping.find(
        item => item.creditType === creditType
      );
      return mapping ? mapping.propertyCategory : null;
    }
    return null;
  };

  // 添加积分奖励字段
  const addCreditReward = (creditType) => {
    setFormData({
      ...formData,
      credits_reward: {
        ...formData.credits_reward,
        [creditType]: 1
      }
    });
  };

  // 更新积分奖励值
  const updateCreditReward = (creditType, value) => {
    setFormData({
      ...formData,
      credits_reward: {
        ...formData.credits_reward,
        [creditType]: parseInt(value) || 0
      }
    });
  };

  // 添加道具奖励字段
  const addItemReward = (itemName) => {
    setFormData({
      ...formData,
      items_reward: {
        ...formData.items_reward,
        [itemName]: 1
      }
    });
  };

  // 更新道具奖励值
  const updateItemReward = (itemName, value) => {
    setFormData({
      ...formData,
      items_reward: {
        ...formData.items_reward,
        [itemName]: parseInt(value) || 0
      }
    });
  };

  // 删除积分奖励字段
  const removeCreditReward = (creditType) => {
    const newRewards = { ...formData.credits_reward };
    delete newRewards[creditType];
    setFormData({
      ...formData,
      credits_reward: newRewards
    });
  };

  // 删除道具奖励字段
  const removeItemReward = (itemName) => {
    const newRewards = { ...formData.items_reward };
    delete newRewards[itemName];
    setFormData({
      ...formData,
      items_reward: newRewards
    });
  };

  // 过滤道具列表用于搜索
  const getFilteredItems = (searchTerm) => {
    if (!allItems || allItems.length === 0) return [];
    if (!searchTerm) return allItems;
    return allItems.filter(item =>
      item.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  //更新特定道具奖励项的搜索词
  const updateItemSearchTerm = (key, term) => {
    setItemSearchTerms(prev => ({
      ...prev,
      [key]: term
    }));
  };

  // 过滤道具列表用于搜索
  const filteredItems = useMemo(() => {
    if (!allItems || allItems.length === 0) return [];
    if (!itemSearch) return allItems; // 如果没有搜索词，显示所有道具
    return allItems.filter(item =>
      item.toLowerCase().includes(itemSearch.toLowerCase())
    );
  }, [allItems, itemSearch]);

  // 处理输入框聚焦事件
  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  // 处理输入框失焦事件
  const handleInputBlur = () => {
    // 延迟隐藏下拉列表，确保点击选项时不会立即隐藏
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  };

  // 处理输入框内容变化
  const handleInputChange = (e) => {
    setItemSearch(e.target.value);
    setShowDropdown(true); // 输入时显示下拉列表
  };


  // status：任务完成状态判断逻辑
  const calcCompleteStatus = (task) => {
    // task.max_completions赋值给新变量max_times,若task.max_completions为0则max_times赋值为99999
    const max_times = task.max_completions || 99999;
    if (max_times > 0 && task.completed_count >= max_times) {
      return '已完成';
    } else if (task.completed_count > 0 && task.completed_count < max_times) {
      return '重复中';
    } else {
      return '未完成';
    }

  };

  // 统一使用一个状态显示函数
  const getTaskStatus_deprecated = (task) => {
   // 优先使用存储的状态字段，如果没有则计算
   if (task.status) {
     return task.status;
   }
   // 否则基于 completed_count 计算
    if (task.max_completions > 0 && task.completed_count >= task.max_completions) {
      return '已完成';
    } else if (task.completed_count > 0 && task.completed_count < task.max_completions) {
      return '重复中';
    } else {
      return '未完成';
    }
   // if (task.task_type === 'single') {
   //   return task.completed_count > 0 ? '已完成' : '未完成';
   // } else {
   //   if (task.max_completions > 0 && task.completed_count >= task.max_completions) {
   //     return '已完成';
   //   } else if (task.completed_count > 0 && task.completed_count < task.max_completions) {
   //     return '重复中';
   //   } else if (task.completed_count > 0) {
   //     return '进行中';
   //   } else {
   //     return '未完成';
   //   }
   // }
  };

  // 添加搜索处理函数（在其他处理函数附近）
  const handleSearchChange = (e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);

    // 当搜索词改变时，重置到第一页
    setCurrentPage(1);
    setInputPage(1);
  };


  // 添加一个 useEffect 来监听 filteredAndSortedTasks 的变化，并确保当前页码不会超出范围
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredAndSortedTasks.length / tasksPerPage);

    // 如果当前页码超出了新的总页数，则重置到第一页
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(1);
      setInputPage(1);
    }

    // 如果总页数为0，也重置到第一页
    if (newTotalPages === 0) {
      setCurrentPage(1);
      setInputPage(1);
    }
  }, [filteredAndSortedTasks, tasksPerPage, currentPage]);


  // 处理任务选择
  const handleTaskSelect = (taskId) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  // 全选/取消全选
  // const handleSelectAll = () => {
  //   if (selectedTasks.length === filteredAndSortedTasks.length) {
  //     setSelectedTasks([]);
  //   } else {
  //     setSelectedTasks(filteredAndSortedTasks.map(task => task.id));
  //   }
  // };
  // 添加全选操作处理函数
  const handleSelectAllOperations = (operation) => {
    const currentPageTaskIds = currentTasks.map(task => task.id);

    switch (operation) {
      case 'selectAllPage':
        // 选中当前页所有任务
        const newSelectedPage = [...new Set([...selectedTasks, ...currentPageTaskIds])];
        setSelectedTasks(newSelectedPage);
        break;

      case 'selectAllAll':
        // 选中所有过滤后的任务
        setSelectedTasks(filteredAndSortedTasks.map(task => task.id));
        break;

      case 'deselectPage':
        // 取消选中当前页任务
        const deselectedPage = selectedTasks.filter(id => !currentPageTaskIds.includes(id));
        setSelectedTasks(deselectedPage);
        break;

      case 'deselectAll':
        // 取消选中所有任务
        setSelectedTasks([]);
        break;

      default:
        break;
    }
  };

  // 获取当前选中状态
  const getSelectionStatus = () => {
    const currentPageTaskIds = currentTasks.map(task => task.id);
    const currentPageSelectedCount = currentPageTaskIds.filter(id => selectedTasks.includes(id)).length;

    return {
      currentPageTotal: currentPageTaskIds.length,
      currentPageSelected: currentPageSelectedCount,
      totalFiltered: filteredAndSortedTasks.length,
      totalSelected: selectedTasks.length,
      isAllPageSelected: currentPageSelectedCount === currentPageTaskIds.length && currentPageTaskIds.length > 0,
      isAllFilteredSelected: selectedTasks.length === filteredAndSortedTasks.length && filteredAndSortedTasks.length > 0
    };
  };


  // 批量删除
  const handleBatchDelete_deprecated = async () => {
    if (selectedTasks.length === 0) {
      alert('请先选择要删除的任务');
      return;
    }

    if (!window.confirm(`确定要删除选中的${selectedTasks.length}个任务吗？`)) {
      return;
    }

    try {
      let successCount = 0;
      for (const taskId of selectedTasks) {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${taskId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          successCount++;
        }
      }

      onShowStatus(`成功删除${successCount}个任务`);
      addLog('任务','批量删除',`成功删除${successCount}个任务`)
      setSelectedTasks([]);
      onDeleteTask();
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedTasks.length === 0) {
      alert('请先选择要删除的任务');
      return;
    }

    if (!window.confirm(`确定要删除选中的${selectedTasks.length}个任务吗？`)) {
      return;
    }

    // --- 新增：在开始处理前打开进度弹窗并重置进度 ---
    setIsBatchDeleteDialogOpen(true);
    setBatchDeleteProgress(0);
    // ----------------------------------------------------

    try {
      let successCount = 0;
      const totalTasks = selectedTasks.length;

      for (let i = 0; i < selectedTasks.length; i++) {
        const taskId = selectedTasks[i];
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${taskId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          successCount++;
        }

        // --- 新增：更新进度条 ---
        const processedCount = i + 1;
        const currentProgress = (processedCount / totalTasks) * 100;
        // 设置进度为 90%，留出最后的 UI 更新时间
        setBatchDeleteProgress(Math.min(90, currentProgress));
        // ------------------------
      }

      const message = `成功删除${successCount}个任务`;
      onShowStatus(message);
      addLog('任务', '批量删除', message);
      setSelectedTasks([]);
      onUpdateTask(); // 假设删除成功后需要刷新任务列表

      // --- 新增：设置进度为 100% ---
      setBatchDeleteProgress(100);
      // ----------------------------

    } catch (error) {
      console.error("批量删除过程中出错:", error);
      alert('网络错误');
      // --- 新增：出错时关闭弹窗 ---
      setIsBatchDeleteDialogOpen(false);
      // ----------------------------
    }
    // 注意：不要在这里重置 selectedTasks，因为上面已经重置了
    // 如果需要在所有操作结束后清除 selection，可以在 onUpdateTask 回调中处理
  };


  // 创建增强的全选复选框组件
  const renderEnhancedSelectAll = () => {
    const status = getSelectionStatus();

    return (
      <div className="enhanced-select-all">
        <div className="select-all-main">
          <input
            type="checkbox"
            checked={status.isAllFilteredSelected}
            ref={el => {
              if (el) {
                // 设置部分选中状态
                el.indeterminate = !status.isAllFilteredSelected &&
                                 (status.totalSelected > 0 || status.currentPageSelected > 0);
              }
            }}
            onChange={(e) => {
              if (e.target.checked) {
                handleSelectAllOperations('selectAllAll');
              } else {
                handleSelectAllOperations('deselectAll');
              }
            }}
            title={status.isAllFilteredSelected ?
                  `已选中全部${status.totalSelected}个任务` :
                  `已选中${status.totalSelected}个任务，点击选中全部`}
          />
          {status.totalSelected > 0 && (
            <span className="selection-count">
              {status.totalSelected}
              {!status.isAllFilteredSelected && (
                <span className="total-count">/{status.totalFiltered}</span>
              )}
            </span>
          )}
        </div>

        {(status.totalSelected > 0 || status.totalFiltered > status.currentPageTotal) && (
          <div className="select-all-dropdown">
            <button className="dropdown-toggle" title="更多选择选项">▼</button>
            <div className="dropdown-menu">
              {!status.isAllPageSelected ? (
                <button onClick={() => handleSelectAllOperations('selectAllPage')}>
                  选中当前页 ({status.currentPageTotal})
                </button>
              ) : (
                <button onClick={() => handleSelectAllOperations('deselectPage')}>
                  取消当前页 ({status.currentPageSelected})
                </button>
              )}
              {!status.isAllFilteredSelected ? (
                <button onClick={() => handleSelectAllOperations('selectAllAll')}>
                  选中全部 ({status.totalFiltered})
                </button>
              ) : (
                <button onClick={() => handleSelectAllOperations('deselectAll')}>
                  取消全部
                </button>
              )}
              {status.totalSelected > 0 && (
                <button onClick={() => {
                  const currentPageTaskIds = currentTasks.map(task => task.id);
                  const invertedPageSelection = currentPageTaskIds.filter(id => !selectedTasks.includes(id));
                  const otherSelected = selectedTasks.filter(id => !currentPageTaskIds.includes(id));
                  setSelectedTasks([...otherSelected, ...invertedPageSelection]);
                }}>
                  反选当前页
                </button>
              )}
              {status.totalSelected > 0 && (
                <button onClick={() => {
                  setSelectedTasks(filteredAndSortedTasks
                    .map(task => task.id)
                    .filter(id => !selectedTasks.includes(id)));
                }}>
                  反选全部页
                </button>
              )}

              {status.totalSelected > 0 && (
                <button
                  onClick={handleBatchDelete}
                  title="批量删除"
                >
                  ❌批量删除 ({status.totalSelected})
                </button>
              )}
              {/*{status.totalSelected > 0 && (*/}
              {/*  <button onClick={handleBatchArchive}>批量归档</button>*/}
              {/*)}*/}

              {/*{status.totalSelected > 0 && (*/}
              {/*  <button onClick={refreshCycleTasks}>刷新循环</button>*/}
              {/*)}*/}

            </div>
          </div>
        )}
      </div>
    );
  };

  // 选择道具
  const selectItem = (itemName) => {
    // 如果道具已存在，不重复添加
    if (!formData.items_reward.hasOwnProperty(itemName)) {
      addItemReward(itemName);
    }
    setItemSearch(''); // 清空搜索
    setShowDropdown(false); // 隐藏下拉列表
  };


  // 在 TaskTab 组件中添加拖拽相关状态
  const [draggedTask, setDraggedTask] = useState(null);

  // 添加拖拽事件处理函数
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 在 handleDrop 函数中添加调试信息
  const handleDrop = (e, targetGroup, groupKey) => {
    e.preventDefault();
    if (!draggedTask) return;

    // 如果是状态分组且目标是重复中或"已完成"，则阻止拖拽操作
    if (boardGroupBy === 'status' && (targetGroup === '已完成'|| targetGroup === '重复中')) {
      // 不允许拖拽到重复中和已完成状态
      setDraggedTask(null);
      return;
    }
    console.log('拖拽任务:', draggedTask.id, '到目标分组:', targetGroup, '分组类型:', boardGroupBy);

    // 根据分组方式更新任务属性
    switch (boardGroupBy) {
      case 'category':
        if (draggedTask.category !== targetGroup) {
          updateTaskField(draggedTask.id, 'category', targetGroup);
        }
        break;
      case 'domain':
        if (draggedTask.domain !== targetGroup) {
          updateTaskField(draggedTask.id, 'domain', targetGroup);
        }
        break;
      case 'priority':
        if (draggedTask.priority !== targetGroup) {
          updateTaskField(draggedTask.id, 'priority', targetGroup);
        }
        break;
      case 'status':
        if (draggedTask.status !== targetGroup) {
          updateTaskField(draggedTask.id, 'status', targetGroup);
        }
        break;
      default:
        // 默认情况，可以按需处理
        break;
    }

    // 保持当前分组设置，避免页面刷新后回到默认状态
    // localStorage.setItem('taskBoardGroupBy', boardGroupBy);
    userDataManager.setUserData('taskBoardGroupBy', boardGroupBy);
    setDraggedTask(null);
  };

  // 修改 updateTaskStatusByDrag 函数，确保同时更新 status 和 completed_count
  const updateTaskStatusByDrag = async (taskId, targetStatus) => {
    try {
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) return;

      let updatedTask = { ...taskToUpdate };

      // 同时更新 status 字段和 completed_count 字段
      updatedTask.status = targetStatus;


      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });

      if (response.ok) {
        onUpdateTask();
      } else {
        alert('更新任务状态失败');
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 添加更新任务状态的函数
  const updateTaskStatus = async (taskId, targetStatus) => {
    try {
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) return;

      let updatedTask = { ...taskToUpdate };


      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });

      if (response.ok) {
        onUpdateTask();
      }
    } catch (error) {
      alert('更新任务状态失败');
    }
  };

  // 添加更新任务字段的函数
  const updateTaskField = async (taskId, field, value) => {
    try {
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) return;

      const updatedTask = {
        ...taskToUpdate,
        [field]: value
      };

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });

      if (response.ok) {
        onUpdateTask();
      }
    } catch (error) {
      alert(`更新任务${field}失败`);
    }
  };

  // 添加更新任务类别的函数
  const updateTaskCategory = async (taskId, newCategory) => {
    try {
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) return;

      const updatedTask = {
        ...taskToUpdate,
        category: newCategory
      };

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });

      if (response.ok) {
        onUpdateTask();
      }
    } catch (error) {
      alert('更新任务类别失败');
    }
  };

  const isMobileDevice = () => {
    return window.innerWidth <= 768;
  };

  const renderFieldManager = () => {
    if (viewMode !== 'list') {
      return null;
    }
    const isMobile = isMobileDevice()
    // 定义所有可用字段
    const pcFields = [
      { key: 'id', label: 'ID' },
      { key: 'category', label: '类别' },
      { key: 'description', label: '任务描述' },  // 添加任务描述字段
      { key: 'domain', label: '领域' },
      { key: 'priority', label: '优先级' },
      { key: 'progress', label: '完成进度' },
      { key: 'startTime', label: '开始时间' },
      { key: 'completeTime', label: '完成时间' },
      { key: 'archived', label: '归档' },
      { key: 'completedCount', label: '完成次数' },
      { key: 'totalCompletionCount', label: '总完成次数' },
      { key: 'cycleType', label: '循环周期' },  // 添加循环周期字段
      { key: 'items_reward', label: '奖励' },
      { key: 'exp_reward', label: '经验' },
      { key: 'status', label: '状态' },
      // { key: 'notes', label: '备注'},
      { key: 'tags', label: '标签'},
    ];
    const mobileFields = [
      { key: 'category', label: '类别' },
      { key: 'domain', label: '领域' },
      { key: 'priority', label: '优先级' },
      { key: 'progress', label: '完成进度' },
      { key: 'exp_reward', label: '经验' },
      { key: 'status', label: '状态' },
    ];
    // 若isMobile为真，则allFields只包含部分字段，否则显示所有字段
    const allFields = isMobile ? mobileFields : pcFields;

    return (
      <div className="field-manager">
        <select
          onChange={(e) => {
            const value = e.target.value;
            if (value) {
              if (value === 'all') {
                // 全部启用
                const allEnabled = Object.values(currentFieldSettings).every(Boolean);
                const newSettings = {};
                Object.keys(currentFieldSettings).forEach(key => {
                  newSettings[key] = !allEnabled;
                });
                setFieldSettings(newSettings);
              } else {
                toggleFieldSetting(value);
              }
            }
          }}
          value=""
        >
          <option value="">显示字段</option>
          <option value="all">
            {Object.values(currentFieldSettings).every(Boolean) ? "全部隐藏" : "全部显示"}
          </option>
          {allFields.map(({ key, label }) => (
            <option
              key={key}
              value={key}
              style={{
                fontStyle: currentFieldSettings[key] ? 'normal' : 'italic',
                fontWeight: currentFieldSettings[key] ? 'bold' : 'normal'
              }}
            >
              {currentFieldSettings[key] ? `✓ ${label}` : label}
            </option>
          ))}
        </select>

      </div>
    );
  };

  // 获取字段显示名称的辅助函数
  const getFieldDisplayName = (field) => {
    const names = {
      category: '类别',
      domain: '领域',
      priority: '优先级',
      progress: '完成进度',
      startTime: '开始时间',
      completeTime: '完成时间',
      archived: '归档',
      completedCount: '完成次数',
      totalCompletionCount: '总完成次数'
    };
    return names[field] || field;
  };


  // 看板模式任务卡片：更改分组按钮
  // 添加获取分组显示名称的函数
  const getGroupByDisplayName = (groupBy) => {
    const names = {
      category: '类别',
      domain: '领域',
      priority: '优先级',
      status: '状态'
    };
    return names[groupBy] || groupBy;
  };


  const customShowTaskDetails = (task) => {
    // 通过自定义事件显示任务详情
    window.dispatchEvent(new CustomEvent('showTaskDetails', {
      detail: {task}
    }));
    return;
  }

  // // 在 TaskTab 组件中添加以下函数
  // const cycleBoardGroup = (direction) => {
  //   if (viewMode !== 'board') return;
  //
  //   const groupOptions = ['status', 'category', 'domain', 'priority'];
  //   const currentIndex = groupOptions.indexOf(boardGroupBy);
  //
  //   let targetIndex;
  //   if (direction === 'prev') {
  //     targetIndex = (currentIndex - 1 + groupOptions.length) % groupOptions.length;
  //   } else {
  //     targetIndex = (currentIndex + 1) % groupOptions.length;
  //   }
  //
  //   // 检查目标分组选项是否在字段设置中启用
  //   const isFieldEnabled = (field) => {
  //     if (field === 'status') return true;
  //     return fieldSettings[field] !== false;
  //   };
  //
  //   // 查找下一个启用的分组选项
  //   let targetGroupBy = groupOptions[targetIndex];
  //   let attempts = 0;
  //   while (attempts < groupOptions.length) {
  //     if (targetGroupBy === 'status' || isFieldEnabled(targetGroupBy)) {
  //       break;
  //     }
  //
  //     // 根据方向继续查找
  //     if (direction === 'prev') {
  //       targetIndex = (targetIndex - 1 + groupOptions.length) % groupOptions.length;
  //     } else {
  //       targetIndex = (targetIndex + 1) % groupOptions.length;
  //     }
  //     targetGroupBy = groupOptions[targetIndex];
  //     attempts++;
  //   }
  //
  //   // 如果找到了有效的分组选项，则切换
  //   if (targetGroupBy === 'status' || isFieldEnabled(targetGroupBy)) {
  //     setBoardGroupBy(targetGroupBy);
  //     localStorage.setItem('boardGroupBy', targetGroupBy);
  //   }
  // };

  // 通过自定义事件暴露这个函数
  // useEffect(() => {
  //   const handleCycleBoardGroup = (event) => {
  //     cycleBoardGroup(event.detail.direction);
  //   };
  //
  //   window.addEventListener('cycleBoardGroup', handleCycleBoardGroup);
  //
  //   return () => {
  //     window.removeEventListener('cycleBoardGroup', handleCycleBoardGroup);
  //   };
  // }, [viewMode, boardGroupBy, fieldSettings]);

  // 看板视图渲染函数
  const renderBoardView = () => {

    // 根据分组方式确定分组键和分组选项

    let groupKey, groupOptions;
    switch (boardGroupBy) {
      case 'domain':
        groupKey = 'domain';
        groupOptions = fieldSettings.domain ? taskDomains : ['无'];
        break;
      case 'priority':
        groupKey = 'priority';
        groupOptions = fieldSettings.priority ? taskPriorities : ['不重要不紧急'];
        break;
      case 'status':
        groupKey = 'status';
        groupOptions = taskStatuses;
        break;
      default: // category
        groupKey = 'category';
        groupOptions = fieldSettings.category ? taskCategories : ['支线任务'];
    }

    // 按指定属性分组任务
    const groupedTasks = {};
    groupOptions.forEach(option => {
      groupedTasks[option] = [];
    });

    // 任务分组逻辑
    filteredAndSortedTasks.forEach(task => {
      let groupValue;
      if (boardGroupBy === 'status') {
        groupValue = getTaskStatus(task);
      } else {
        // 其他分组方式
        groupValue = task[groupKey] || groupOptions[0];
      }

      if (!groupedTasks[groupValue]) {
        groupedTasks[groupValue] = [];
      }
      groupedTasks[groupValue].push(task);
    });



    return (
      <div>
        {/* 看板分组切换器 - 根据字段设置显示可用分组选项 */}
        {/*<div className="board-group-controls">*/}
        {/*  <div className="board-group-toggle">*/}
        {/*    <button*/}
        {/*      className="toggle-button"*/}
        {/*      onClick={() => {*/}
        {/*        const groupOptions = ['status', 'category', 'domain', 'priority'];*/}
        {/*        const currentIndex = groupOptions.indexOf(boardGroupBy);*/}
        {/*        const nextIndex = (currentIndex + 1) % groupOptions.length;*/}
        {/*        const nextGroupBy = groupOptions[nextIndex];*/}

        {/*        // 检查下一个分组选项是否在字段设置中启用*/}
        {/*        const isFieldEnabled = (field) => {*/}
        {/*          if (field === 'status') return true; // status 总是启用*/}
        {/*          return fieldSettings[field] !== false; // 其他字段检查是否启用*/}
        {/*        };*/}

        {/*        // 如果下一个分组字段未启用，则跳过到下一个启用的*/}
        {/*        let targetGroupBy = nextGroupBy;*/}
        {/*        let attempts = 0;*/}
        {/*        while (attempts < groupOptions.length) {*/}
        {/*          if (targetGroupBy === 'status' || isFieldEnabled(targetGroupBy)) {*/}
        {/*            break;*/}
        {/*          }*/}
        {/*          const idx = groupOptions.indexOf(targetGroupBy);*/}
        {/*          targetGroupBy = groupOptions[(idx + 1) % groupOptions.length];*/}
        {/*          attempts++;*/}
        {/*        }*/}

        {/*        setBoardGroupBy(targetGroupBy);*/}
        {/*        localStorage.setItem('taskBoardGroupBy', targetGroupBy);*/}
        {/*      }}*/}
        {/*      title="切换分组"*/}
        {/*    >*/}
        {/*      ♻*/}
        {/*    </button>*/}
        {/*  </div>*/}

        {/*  <div className="board-group-selector">*/}
        {/*    <select*/}
        {/*      value={boardGroupBy}*/}
        {/*      onChange={(e) => {*/}
        {/*        const newGroupBy = e.target.value;*/}
        {/*        setBoardGroupBy(newGroupBy);*/}
        {/*        localStorage.setItem('taskBoardGroupBy', newGroupBy);*/}
        {/*      }}*/}
        {/*    >*/}
        {/*      {fieldSettings.category && <option value="category">类别</option>}*/}
        {/*      {fieldSettings.domain && <option value="domain">领域</option>}*/}
        {/*      {fieldSettings.priority && <option value="priority">优先级</option>}*/}
        {/*      <option value="status">状态</option>*/}
        {/*    </select>*/}
        {/*  </div>*/}
        {/*</div>*/}

        <div className="task-board">
          {Object.entries(groupedTasks).map(([group, groupTasks]) => (
            <div
              key={group}
              className="board-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, group, groupKey)}
            >
              <h3>{group} ({groupTasks.length})</h3>

              <div className="board-items">
                {groupTasks.map(task => (
                  <div
                    key={task.id}
                    className={`board-item priority-${task.priority || '不重要不紧急'}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    style={{...getTaskCardBorderStyle(task, 'board'), position: 'relative', maxWidth: `${settings.boardViewSettings?.maxCardWidth || 300}px` }}
                    onClick={(e) => {
                      // 阻止事件冒泡
                      e.stopPropagation();

                      // 如果点击的是按钮或其子元素，不处理卡片点击逻辑
                      if (e.target.closest('.board-item-button') || e.target.closest('.board-item-more-actions') ||
                          e.target.closest('.group-change-button')) {
                        return;
                      }

                      // Ctrl+单击处理（查看任务详情）
                      if (e.ctrlKey) {
                        // 通过自定义事件显示任务详情
                        window.dispatchEvent(new CustomEvent('showTaskDetails', {
                          detail: {task}
                        }));
                        return;
                      }

                      // Alt+单击处理（编辑任务）
                      if (e.altKey) {
                        const taskToEdit = tasks.find(t => t.id === task.id);
                        if (taskToEdit) {
                          setEditingTask(task.id);
                          setFormData({
                            name: taskToEdit.name,
                            description: taskToEdit.description,
                            task_type: taskToEdit.task_type,
                            max_completions: taskToEdit.max_completions,
                            category: taskToEdit.category || '支线任务',
                            domain: taskToEdit.domain || '无',
                            priority: taskToEdit.priority || '不重要不紧急',
                            credits_reward: {...taskToEdit.credits_reward},
                            items_reward: {...taskToEdit.items_reward},
                            start_time: formatDateTime(taskToEdit.start_time) || '',
                            complete_time: formatDateTime(taskToEdit.complete_time) || '',
                            archived: taskToEdit.archived || false,
                            status: taskToEdit.status || getTaskStatus(taskToEdit),
                            completed_count: taskToEdit.completed_count || 0,
                            total_completion_count: taskToEdit.total_completion_count || 0,
                            exp_reward: taskToEdit.exp_reward || 0,
                            notes: taskToEdit.notes || '',
                            tags: taskToEdit.tags || [],
                          });
                        }
                        return;
                      }
                    }}

                    // onMouseEnter={(e) => {
                    //   // 应用悬停逻辑
                    //   if (settings.tooltipTrigger === 'disabled') {
                    //     return;
                    //   }
                    //
                    //   // 对于 hover 模式，直接显示
                    //   if (settings.tooltipTrigger === 'hover') {
                    //     setTooltipState({
                    //       visible: true,
                    //       task: task,
                    //       element: e.currentTarget
                    //     });
                    //   }
                    //   // 对于 shift 模式，只有当 Shift 键被按下时才显示
                    //   else if (settings.tooltipTrigger === 'shift' && e.shiftKey) {
                    //     setTooltipState({
                    //       visible: true,
                    //       task: task,
                    //       element: e.currentTarget
                    //     });
                    //   }
                    //   // 对于 shift 模式但 Shift 键未按下时，只设置元素引用但不显示
                    //   else if (settings.tooltipTrigger === 'shift') {
                    //     setTooltipState({
                    //       visible: false,
                    //       task: task,
                    //       element: e.currentTarget
                    //     });
                    //   }
                    // }}
                    // onMouseLeave={() => {
                    //   // hover 模式下直接隐藏
                    //   if (settings.tooltipTrigger === 'hover') {
                    //     closeTooltip();
                    //   }
                    //   // shift 模式下，如果 tooltip 当前可见，则隐藏
                    //   else if (settings.tooltipTrigger === 'shift' && tooltipState.visible) {
                    //     closeTooltip();
                    //   }
                    // }}
                  >
                    <div className="board-item-header">
                      {/* 添加分组属性更改按钮 */}
                      <div className="board-item-group-actions">
                        <button
                          className="group-change-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            showGroupChangeMenu(task, e);
                          }}
                          title={`更改${getGroupByDisplayName(boardGroupBy)}`}
                        >
                          <img
                            src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSAzaC00Yy0uNTUgMC0xIC40NS0xIDF2M2MwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMVY0YzAtLjU1LS40NS0xLTEtMW0tNyA0Yy0xLjY2IDAtMy0xLjM0LTMtM1MyLjM0IDAgNCAwczMgMS4zNCAzIDMtMS4zNCAzLTMgM3ptNyA1aC00Yy0uNTUgMC0xIC40NS0xIDF2M2MwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMVYxMmMwLS41NS0uNDUtMS0xLTFtLTcgNGMtMS42NiAwLTMgMS4zNC0zIDNzMS4zNCAzIDMgMyAzLTEuMzQgMy0zLTEuMzQtMy0zLTN6bS03LTRIMGMtLjU1IDAtMSAuNDUtMSAxdjNjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF2LTNjMC0uNTUtLjQ1LTEtMS0xem03LTdoLTRjLS41NSAwLTEgLjQ1LTEgMXYzYzAgLjU1LjQ1IDEgMSAxaDNjLjU1IDAgMS0uNDUgMS0xVjRjMC0uNTUtLjQ1LTEtMS0xeiIvPjwvc3ZnPg=="
                            alt="更改分组"
                            style={{ width: '12px', height: '12px' }}
                          />
                        </button>
                      </div>
                      <h4 style={{
                        margin: '0 25px 0 20px',
                        flex: 1,
                        textAlign: 'center',
                        fontSize: '14px',
                        lineHeight: '1.4'
                      }}>
                        {task.name}
                      </h4>

                      <div className="board-item-actions">
                        <button className="board-item-button" onClick={() => handleCompleteTask(task.id)} title="完成">
                          <img
                            src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0yMC4xMyA1LjQxTDE4LjcyIDRsLTkuMTkgOS4xOWwtNC4yNS00LjI0bC0xLjQxIDEuNDFsNS42NiA1LjY2ek01IDE4aDE0djJINXoiLz48L3N2Zz4="
                            alt="完成"
                          />
                        </button>
                        {/* 添加操作按钮组 */}
                        <div className="board-item-more-actions">
                          <ActionButtonGroup
                            taskId={task.id}
                            task={task}
                            onEdit={(taskId) => {
                              const taskToEdit = tasks.find(t => t.id === taskId);
                              if (taskToEdit) {
                                setEditingTask(taskId);
                                setFormData({
                                  name: taskToEdit.name,
                                  description: taskToEdit.description,
                                  task_type: taskToEdit.task_type,
                                  max_completions: taskToEdit.max_completions,
                                  category: taskToEdit.category || '支线任务',
                                  domain: taskToEdit.domain || '无',
                                  priority: taskToEdit.priority || '不重要不紧急',
                                  credits_reward: {...taskToEdit.credits_reward},
                                  items_reward: {...taskToEdit.items_reward},
                                  start_time: formatDateTime(taskToEdit.start_time) || '',
                                  complete_time: formatDateTime(taskToEdit.complete_time) || '',
                                  archived: taskToEdit.archived || false,
                                  status: taskToEdit.status || getTaskStatus(taskToEdit),
                                  completed_count: taskToEdit.completed_count || 0,
                                  total_completion_count: taskToEdit.total_completion_count || 0,
                                  exp_reward: taskToEdit.exp_reward || 0,
                                  notes: taskToEdit.notes || '',
                                  tags: taskToEdit.tags || [],
                                });
                              }
                            }}
                            onDelete={handleDeleteTask}
                            onComplete={handleCompleteTask}
                            onArchive={handleArchiveTask}
                            onCopy={copyTask}
                            taskViewMode="boardView"
                            onClose={() => setOpenDropdownId(null)} // 添加关闭回调
                          />
                        </div>
                      </div>
                    </div>

                    <div className="board-item-body" style={{textAlign:"left"}}>
                      <p>{truncateText(task.description, settings.boardViewSettings?.maxDescriptionLength || 100)}</p>
                    </div>

                    <div className="task-tags-container" style={{textAlign: 'left'}}>
                      <span style={{fontSize: '11px'}}>⚔{task.exp_reward || 0}</span>
                      {task.credits_reward && Object.entries(task.credits_reward).map(([type, amount]) => {
                        const creditSetting = characterSettings?.find(item => item.creditType === type);
                        const icon = creditSetting?.creditIcon || type;

                        return (
                          <span key={type} style={{fontSize: '11px'}}>
                            {typeof icon === 'string' && icon.startsWith('http') ? (
                              <img src={icon} alt={type} className="credit-icon" />
                            ) : (
                              icon
                            )}
                             {amount}
                          </span>
                        );
                      })}
                      {task.tags && task.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="card-markdown-tag"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchTerm(tag);
                            // 自动聚焦到搜索框
                            setTimeout(() => {
                              const searchInput = document.querySelector('.task-search-input');
                              if (searchInput) {
                                searchInput.focus();
                                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

                    <div className="board-item-tags">
                      {fieldSettings.category && task.category && (
                        <span className="board-item-tag">
                          {currentFieldSettings.category && task.category && renderColoredTag('categories', task.category)}
                        </span>
                      )}
                      {fieldSettings.domain && task.domain && (
                        <span className="board-item-tag">
                          {currentFieldSettings.domain && task.domain && renderColoredTag('domains', task.domain)}
                        </span>
                      )}

                      {fieldSettings.priority && task.priority && (
                        <span className="board-item-tag">
                          {renderColoredTag('priorities', task.priority)}
                        </span>
                      )}

                      {task.completed_count && task.max_completions && (
                        <span>
                          {task.completed_count}/{task.max_completions}
                        </span>
                      )}

                      {/*{task.status && (*/}
                      {/*  <span className="board-item-tag">*/}
                      {/*    {renderColoredTag('statuses', task.status)}*/}
                      {/*  </span>*/}
                      {/*)}*/}

                      <span style={{
                        backgroundColor: '#9ca7b1',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginLeft: 'auto'
                      }}>
                        {getTaskStatus(task).substring(0, 3)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
        {/*{tooltipState.visible && tooltipState.task && (*/}
        {/*  <TaskTooltip*/}
        {/*    task={tooltipState.task}*/}
        {/*    parentRef={{ current: tooltipState.element }}*/}
        {/*    isVisible={tooltipState.visible}*/}
        {/*    onClose={closeTooltip}*/}
        {/*  />*/}
        {/*)}*/}
      </div>
    );
  };



  const getStatusFromTask = (task) => {
    // 如果任务对象中直接包含 status 字段，则直接返回
    if (task.status) {
      return task.status;
    }
    // 如果没有 status 字段，可以设置默认值或返回未知状态
    return '未知状态';
  };



  // 添加从表单更新任务状态的函数
  const updateTaskStatusFromForm = (newStatus) => {
    let updatedFormData = { ...formData };



    setFormData(updatedFormData);
  };

  // 归档任务函数
  const handleArchiveTask = async (taskId) => {
    try {
      const taskToUpdate = tasks.find(task => task.id === taskId);
      if (!taskToUpdate) {
        alert('任务不存在');
        return;
      }

      // 更新任务的归档状态
      const updatedTask = {
        ...taskToUpdate,
        archived: true
      };

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask)
      });

      const result = await response.json();

      if (response.ok) {
        onShowStatus(result.message || '任务已归档');
        onUpdateTask();
        addLog('任务','任务归档', result.message)
      } else {
        alert(result.error || '归档任务失败');
        addLog(('任务','归档失败', result.error))
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 添加复制任务的函数
  const copyTask = (task) => {
    const newTask = {
      ...task,
      id: undefined, // 移除ID，让后端生成新的ID
      name: `${task.name} (副本)`,
      completed_count: 0 // 重置完成状态
    };

    setFormData({
      name: newTask.name,
      description: newTask.description,
      task_type: newTask.task_type,
      max_completions: newTask.max_completions,
      category: newTask.category || '支线任务',
      domain: newTask.domain || '无',
      priority: newTask.priority || '不重要不紧急',
      credits_reward: {...newTask.credits_reward},
      items_reward: {...newTask.items_reward},
      start_time: formatDateTime(newTask.start_time) || '',
      complete_time: formatDateTime(newTask.complete_time) || '',
      archived: newTask.archived || false,
      completed_count: newTask.completed_count || 0,  // 添加此行
      total_completion_count: newTask.total_completion_count || 0,
      exp_reward: newTask.exp_reward || 0,
      notes: newTask.notes || '',
      tags: newTask.tags || [],
    });

    setShowAddForm(true);
    setEditingTask(null);
  };


  // 获取字段权重
  const getFieldWeight = (fieldType, fieldValue) => {
    const fieldMappingKey = {
      'category': 'categories',
      'domain': 'domains',
      'priority': 'priorities',
      'status': 'statuses'
    }[fieldType] || fieldType;

    if (fieldMappingKey && taskFieldMappings?.[fieldMappingKey]?.[fieldValue]?.weight) {
      return taskFieldMappings[fieldMappingKey][fieldValue].weight;
    }
    return 0;
  };

  // 获取字段简称
  const getFieldAbbreviation = (fieldType, fieldValue) => {
    const fieldMappingKey = {
      'category': 'categories',
      'domain': 'domains',
      'priority': 'priorities',
      'status': 'statuses'
    }[fieldType] || fieldType;

    if (fieldMappingKey && taskFieldMappings?.[fieldMappingKey]?.[fieldValue]?.abbreviation) {
      return taskFieldMappings[fieldMappingKey][fieldValue].abbreviation;
    }

    // 如果没有设置简称，使用字段值的前两个字符
    return fieldValue.length > 2 ? fieldValue.substring(0, 2) : fieldValue;
  };

  const getFieldColor = (fieldType, fieldValue, viewType = 'board') => {
    // 确保 fieldType 和 fieldValue 有效
    if (!fieldType || !fieldValue) {
      return ''; // 返回默认灰色
    }

    // 首先尝试从 taskFieldMappings 获取颜色
    if (taskFieldMappings &&
        taskFieldMappings[fieldType] &&
        taskFieldMappings[fieldType][fieldValue]) {
      const fieldMapping = taskFieldMappings[fieldType][fieldValue];
      if (fieldMapping.color) {
        return fieldMapping.color;
      }
    }
    // 如果没找到特定颜色，返回默认颜色
    return '#cccccc';
  };


  const renderTaskCard = (task) => {

    if (currentFieldSettings.priority && task.priority) {
      console.log('尝试渲染优先级标签');
      const priorityTag = renderColoredTag('priorities', task.priority);
      console.log('优先级标签元素:', priorityTag);
    }

    const taskStatus = getTaskStatus(task);

    return (
      <div className="task-card" key={task.id}>
        <div className="task-card-header">
          <h4>{task.name}</h4>
          {/* 应用状态标签颜色 */}
          {currentFieldSettings.status && renderColoredTag('statuses', taskStatus)}
        </div>

        <div className="task-card-content">
          {/* 应用类别标签颜色 */}
          {currentFieldSettings.category && task.category && renderColoredTag('categories', task.category)}

          {/* 应用领域标签颜色 */}
          {currentFieldSettings.domain && task.domain && renderColoredTag('domains', task.domain)}

          {/* 应用优先级标签颜色 */}
          {currentFieldSettings.priority && task.priority && (
            <div>
              优先级: {renderColoredTag('priorities', task.priority)}
            </div>
          )}

          {/* 其他字段内容 */}
          {currentFieldSettings.description && task.description && (
            <p>{task.description}</p>
          )}
        </div>

        <div className="task-card-footer">
          {/* 可以添加其他信息，如进度条等 */}
          {currentFieldSettings.progress && (
            <div className="progress-info">
              进度: {task.completed_count}/{task.max_completions}
            </div>
          )}
        </div>
      </div>
    );
  };


  const scrollLeftBoard = (distance) => {
    const container = document.querySelector('.task-board');
    if (container) {
      container.scrollBy({ left: distance, behavior: 'smooth' });
    }
  };

  // 创建一个用于渲染带颜色标签的函数，添加对简称的支持
  const renderColoredTag = (fieldType, fieldValue) => {
    if (!fieldValue) return null;

    // 获取字段简称
    const fieldAbbreviation = getFieldAbbreviation(fieldType, fieldValue);

    const backgroundColor = getFieldColor(fieldType, fieldValue);
    // const textColor = getContrastColor(backgroundColor);
    // console.log('获取字段类型与值:', fieldType, fieldValue)
    // console.log('获取字段颜色:', backgroundColor)

    if (backgroundColor) {
      return (
        <span
          style={{
            backgroundColor: backgroundColor,
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginRight: '5px',
            display: 'inline-block',
            marginBottom: '2px'
          }}
          title={fieldValue} // 鼠标悬停显示完整字段值
        >
          {fieldAbbreviation || fieldValue}
        </span>
      );
    } else {
      return (
        <span
          style={{
            display: 'inline-block',
            marginBottom: '2px'
          }}
          title={fieldValue} // 鼠标悬停显示完整字段值
        >
          {fieldAbbreviation}
        </span>
      );
    }
  };

  // 添加批量归档函数
  const handleBatchArchive = async () => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/batch-archive`, {
        method: 'POST'
      });

      const result = await response.json();

      if (response.ok) {
        onShowStatus(result.message);
        onUpdateTask();
        addLog('任务','批量归档',result.message)
      } else {
        alert(result.error);
        addLog('任务','归档失败',result.error)
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 添加字段设置的保存机制
  const saveFieldSettings = (settings) => {
    try {
      // localStorage.setItem('taskFieldSettings', JSON.stringify(settings));
      userDataManager.setUserData('taskFieldSettings', settings);
    } catch (e) {
      console.warn('无法保存字段设置到本地存储:', e);
    }
  };

  // 修改 MainActionButtonGroup 组件
  const MainActionButtonGroup = ({
    onAddTask,
    onBatchDelete,
    // onBatchArchive,
    // onRefreshCycles,
    selectedTaskCount,
    buttonSettings,
    onImportTasks,
    onExportTasks
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    // const toggleDropdown = () => {
    //   setIsOpen(!isOpen);
    // };


    const toggleDropdown = () => {
      const newOpenState = !isOpen;
      setIsOpen(newOpenState);
      // 通知 TaskSystem 有下拉菜单打开/关闭
      window.dispatchEvent(new CustomEvent('taskTabModalState', {
        detail: {
          hasOpenModal: newOpenState || (openDropdownId !== null) || showAddForm || editingTask || showGroupChangeMenu.isOpen || showDailyLog
          // showQuickTaskInput
        }
      }));
    };

    // 添加 ESC 键监听来关闭下拉菜单
    useEffect(() => {
      const handleEscKey = (event) => {
        if (event.key === 'Escape' && isOpen) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscKey);
      }

      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }, [isOpen]);

    // 点击其他地方关闭下拉菜单
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (isOpen && !event.target.closest('.main-action-button-group')) {
          setIsOpen(false);
        }
      };

      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, [isOpen]);

    // 触发快速任务添加功能，与按N键效果相同
    const handleQuickAddTask = () => {
      // 创建键盘事件模拟按N键
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'n',
        bubbles: true
      });
      document.dispatchEvent(keyboardEvent);
    };

    const allButtonsVisible = Object.values(buttonSettings).every(
      setting => setting === 'visible'
    );


    return (
      <div className="main-action-button-group">
        {/* 添加快速新增按钮，功能与按N键相同 */}
        {/*<button*/}
        {/*  onClick={handleQuickAddTask}*/}
        {/*  className="quick-add-button"*/}
        {/*  title="快速新增任务 (N键)"*/}
        {/*>*/}
        {/*  +*/}
        {/*</button>*/}
        {viewMode === 'board' && (
          <div className="board-group-toggle">
            <button
              className="toggle-button"
              onClick={() => {
                switchBoardGroup();
              }}
              title="切换分组(g)"
            >
              ♻
            </button>
          </div>
        )}

        {!isMobile && viewMode === 'board' && (
          <div className="board-group-toggle">
            <button
              className="toggle-button"
              onClick={() => scrollLeftBoard(-600)}
              title="向左滚屏"
              style={{
                color: 'black',
              }}
            >
              ⇐
            </button>
          </div>
        )}

        {!isMobile && viewMode === 'board' && (
          <div className="board-group-toggle">
            <button
              className="toggle-button"
              onClick={() => scrollLeftBoard(600)}
              title="向右滚屏"
              style={{
                color: 'black',
              }}

            >
              ⇒
            </button>
          </div>
        )}


        {/* 根据配置显示可见按钮 */}
        {buttonSettings.quickAddTask === 'visible' && (
          <button onClick={handleQuickAddTask} title="快速新增任务">⚡</button>
        )}
        {buttonSettings.addTask === 'visible' && (
          <button onClick={onAddTask} title="新增任务">✚</button>
        )}

        {buttonSettings.batchDelete === 'visible' && (
          <button
            onClick={onBatchDelete}
            disabled={selectedTaskCount === 0}
            title="删除"
          >
            ❌ ({selectedTaskCount})
          </button>
        )}
        {/*{buttonSettings.batchArchive === 'visible' && (*/}
        {/*  <button onClick={onBatchArchive}>批量归档</button>*/}
        {/*)}*/}

        {/*{buttonSettings.refreshCycles === 'visible' && (*/}
        {/*  <button onClick={onRefreshCycles}>刷新循环</button>*/}
        {/*)}*/}

        {buttonSettings.importTasks === 'visible' && (
          <button onClick={onImportTasks}  className="csv-import-button" title="导入任务(CSV)">📥</button>
        )}
        <input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleImportTasksCSV}
          style={{display: 'none'}}
        />

        {buttonSettings.exportTasks === 'visible' && (
          <button onClick={onExportTasks} title="导出任务(CSV)">📤</button>
        )}

        {/*<div>*/}
        {/*  <button className="tasksys-settings-button" onClick={() => setIsSettingsModalOpen(!isSettingsModalOpen)}>*/}
        {/*    ⚙️️*/}
        {/*  </button>*/}
        {/*  <SettingsModal*/}
        {/*    isOpen={isSettingsModalOpen}*/}
        {/*    title="任务系统设置"*/}
        {/*    onClose={() => setIsSettingsModalOpen(false)}*/}
        {/*    targetGroup={['general', 'action-buttons', 'board-view', 'calendar-view', 'task-field-mapping','border',  ]}*/}
        {/*    settings={settings}*/}
        {/*    onUpdateSettings={onUpdateTask}*/}
        {/*  />*/}
        {/*</div>*/}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          title="任务模块设置"
          onClose={() => setIsSettingsModalOpen(false)}
          targetGroup={['general', 'action-buttons', 'board-view', 'calendar-view', 'task-field-mapping','border',  ]}
          settings={settings}
          onUpdateSettings={onUpdateTask}
        />


        {!allButtonsVisible && (
          <div className="more-actions-container">
            <button onClick={toggleDropdown} className="more-actions-button">…</button>
            {isOpen && (
              <div className="more-actions-dropdown">
                {buttonSettings.quickAddTask === 'hidden' && (
                  <button onClick={handleQuickAddTask}>⚡ 快速新增</button>
                )}
                {buttonSettings.addTask === 'hidden' && (
                  <button onClick={onAddTask}>✚ 新增任务</button>
                )}
                {buttonSettings.batchDelete === 'hidden' && (
                  <button
                    onClick={onBatchDelete}
                    disabled={selectedTaskCount === 0}
                  >
                    ❌ 删除 ({selectedTaskCount})
                  </button>
                )}
                {/*{buttonSettings.batchArchive === 'hidden' && (*/}
                {/*  <button onClick={onBatchArchive}>批量归档</button>*/}
                {/*)}*/}
                {/*{buttonSettings.refreshCycles === 'hidden' && (*/}
                {/*  <button onClick={onRefreshCycles}>刷新循环任务</button>*/}
                {/*)}*/}
                {buttonSettings.importTasks === 'hidden' && (
                  <button onClick={onImportTasks}>📥导入(CSV)</button>
                )}
                {buttonSettings.exportTasks === 'hidden' && (
                  <button onClick={onExportTasks}>📤导出(CSV)</button>
                )}
                <div>
                  <button className="tasksys-settings-button" onClick={() => setIsSettingsModalOpen(!isSettingsModalOpen)}>
                    ⚙️️任务设置

                  </button>

                </div>

              </div>
            )}
          </div>
        )}
      </div>
    );
  };


  // 添加操作按钮组组件

  const ActionButtonGroup = ({
    taskId,
    task,
    onEdit,
    onDelete,
    onComplete,
    onArchive,
    onCopy,
    onClose,
    taskViewMode="" // 添加 boardView 参数，默认为 false
  }) => {
    const dropdownId = `dropdown-${taskId}`;
    const isOpen = openDropdownId === dropdownId;

    const toggleDropdown = () => {
      const newOpenState = !isOpen;
      setOpenDropdownId(newOpenState ? dropdownId : null);
      // 通知 TaskSystem 有下拉菜单打开/关闭
      window.dispatchEvent(new CustomEvent('taskTabModalState', {
        detail: {
          hasOpenModal: newOpenState || showAddForm || editingTask ||
                       showGroupChangeMenu.isOpen || showDailyLog
        }
      }));
    };

    const handleDelete = () => {
      if (onClose) onClose();
      if (window.confirm(`确定要删除任务"${task.name}"吗？此操作不可恢复！`)) {
        onDelete(taskId);
      }
    };

    const handleEdit = () => {
      if (onClose) onClose();
      onEdit(taskId);
    };
    const handleCopy = () => {
      if (onClose) onClose();
      onCopy(task);
    };

    // 添加查看任务详情的处理函数
    const handleViewDetails = () => {
      if (onClose) onClose();
      // 通过自定义事件显示任务详情，复用 TaskSystem 中的 renderTaskDetails 功能
      window.dispatchEvent(new CustomEvent('showTaskDetails', {
        detail: { task }
      }));
    };

    useEffect(() => {
      const handleEscKey = (event) => {
        if (event.key === 'Escape' && isOpen) {
          setOpenDropdownId(null);
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscKey);
      }

      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }, [isOpen]);

    // 点击其他地方关闭下拉菜单
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (isOpen && !event.target.closest(`#${dropdownId}`)) {
          setOpenDropdownId(null);
        }
      };

      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, [isOpen, dropdownId]);

    // 在看板视图中，所有按钮都收于"..."按钮组中
    if (taskViewMode == "boardView") {
      return (
        <div className="action-button-group" id={dropdownId}>
          <div className="more-actions-container">
            <button onClick={toggleDropdown} title="更多操作">...</button>
            {isOpen && (
              <div className="more-actions-dropdown">
                <button onClick={handleViewDetails}>📄 查看</button>
                <button onClick={handleEdit}>🖍 编辑</button>
                <button onClick={() => onComplete(taskId)}>✔ 完成</button>
                <button onClick={handleCopy}>🗐 复制</button>
                <button onClick={handleDelete}>❌ 删除</button>
                <button onClick={() => onArchive(taskId)}>🗃️ 归档</button>
              </div>
            )}
          </div>
        </div>
      );
    } else if (taskViewMode == "calendarView") {
      return (
        <div className="action-button-group" id={dropdownId}>
            <button onClick={handleViewDetails} title="查看">📄</button>
            <button onClick={handleEdit} title="编辑">🖍</button>
            <button onClick={() => onComplete(taskId)} title="完成">✔</button>
            <button onClick={handleCopy} title="复制">🗐</button>
            <button onClick={handleDelete} className="delete-button" title="删除">❌</button>
            <button onClick={() => onArchive(taskId)} title="归档">🗃️</button>
        </div>
      )
    }

    // 列表视图保持原有逻辑
    const allButtonsVisible = Object.values(currentActionButtonSettings).every(
      setting => setting === 'visible'
    );


    return (
      <div className="action-button-group" id={dropdownId}>
        {/* 根据配置显示可见按钮 */}
        {currentActionButtonSettings.view === 'visible' && (
          <button className="action-button-group-btn" onClick={handleViewDetails} title="查看">📄</button>
        )}
        {currentActionButtonSettings.edit === 'visible' && (
          <button className="action-button-group-btn" onClick={() => onEdit(taskId)} title="编辑">🖍</button>
        )}
        {currentActionButtonSettings.complete === 'visible' && (
          <button className="action-button-group-btn" onClick={() => onComplete(taskId)} title="完成">✔</button>
        )}
        {currentActionButtonSettings.copy === 'visible' && (
          <button className="action-button-group-btn" onClick={() => onCopy(task)} title="复制">🗐</button>
        )}
        {currentActionButtonSettings.delete === 'visible' && (
          <button className="action-button-group-btn" onClick={handleDelete} className="delete-button" title="删除">❌</button>
        )}
        {currentActionButtonSettings.archive === 'visible' && (
          <button className="action-button-group-btn" onClick={() => onArchive(taskId)} title="归档">🗃️</button>
        )}

        {!allButtonsVisible && (
          <div className="more-actions-container">
            <button className="more-actions-btn" onClick={toggleDropdown}>...</button>
            {isOpen && (
              <div className="more-actions-dropdown">
                {currentActionButtonSettings.view === 'hidden' && (
                  <button onClick={handleViewDetails}>📄 查看</button>
                )}
                {currentActionButtonSettings.edit === 'hidden' && (
                  <button onClick={() => onEdit(taskId)}>🖍 编辑</button>
                )}
                {currentActionButtonSettings.complete === 'hidden' && (
                  <button onClick={() => onComplete(taskId)}>✔ 完成</button>
                )}
                {currentActionButtonSettings.copy === 'hidden' && (
                  <button onClick={() => onCopy(task)}>🗐 复制</button>
                )}
                {currentActionButtonSettings.delete === 'hidden' && (
                  <button onClick={handleDelete}>❌ 删除</button>
                )}
                {currentActionButtonSettings.archive === 'hidden' && (
                  <button onClick={() => onArchive(taskId)}>🗃️ 归档</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };



  // 保存按钮配置的函数
  const saveActionButtonSettings = (settings) => {
    try {
      // localStorage.setItem('taskActionButtonSettings', JSON.stringify(settings));
      userDataManager.setUserData('taskActionButtonSettings', settings);
    } catch (e) {
      console.warn('无法保存按钮设置到本地存储:', e);
    }
  };

  // 切换按钮显示位置的函数
  const toggleButtonVisibility = (buttonName) => {
    const newSettings = {
      ...actionButtonSettings,
      [buttonName]: actionButtonSettings[buttonName] === 'visible' ? 'hidden' : 'visible'
    };
    setActionButtonSettings(newSettings);
    saveActionButtonSettings(newSettings);
  };


  useEffect(() => {
    try {
      // const savedSettings = localStorage.getItem('taskActionButtonSettings');
      const savedSettings = userDataManager.getUserData('taskActionButtonSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setActionButtonSettings(parsedSettings);
      }
    } catch (e) {
      console.warn('无法从本地存储加载按钮设置:', e);
    }
  }, []);



  // 添加useEffect来处理新增任务时的自动填入时间
  useEffect(() => {
    if (showAddForm && !editingTask) {
      // 只有在新增任务且表单显示时才自动填入当前时间
      const now = new Date();
      const formattedNow = now.toLocaleString('sv-SE');
      //const formattedNow = now.toISOString().slice(0, 19).replace('T',' '); // 格式化为 YYYY-MM-DDTHH:mm
      //const formattedNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setFormData(prev => ({
        ...prev,
        start_time: formattedNow
      }));
    }
  }, [showAddForm, editingTask]);

  // 在TaskTab组件的return语句之前添加以下useEffect来处理移动端适配
  useEffect(() => {
    const handleResize = () => {
      // 检测是否为移动设备
      const isMobile = window.innerWidth <= 768;
      // 可以根据需要添加其他适配逻辑
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);





  // 修改自动计算的 useEffect
  useEffect(() => {
    if (showAddForm || editingTask) {
      // 对于新增任务，始终自动计算
      if (showAddForm && !editingTask) {
        const expReward = calculateTaskExpReward(formData);
        setFormData(prev => ({
          ...prev,
          exp_reward: expReward
        }));
      }
      // 对于编辑任务，只有当当前经验值为0时才自动计算
      else if (editingTask && formData.exp_reward === 0) {
        const expReward = calculateTaskExpReward(formData);
        setFormData(prev => ({
          ...prev,
          exp_reward: expReward
        }));
      }
    }
  }, [formData.category, formData.domain, formData.priority, showAddForm, editingTask]);


  // 处理快速任务输入
  // const handleQuickTaskSubmit = (e) => {
  //   e.preventDefault();
  //
  //   if (!quickTaskInput.trim()) {
  //     setShowQuickTaskInput(false);
  //     return;
  //   }
  //
  //   // 解析输入的快速任务字符串
  //   parseQuickTaskInput(quickTaskInput);
  //
  //   // 清空输入并关闭输入框
  //   setQuickTaskInput('');
  //   setShowQuickTaskInput(false);
  // };

  // // 解析快速任务输入字符串
  // const parseQuickTaskInput = (input) => {
  //   // 显示新增任务表单
  //   setShowAddForm(true);
  //   setEditingTask(null);
  //
  //   // 解析输入字符串，支持格式如: "任务名称#c1#d1#p1#t1" 或 "任务名称#c1, d1，p1 t1"
  //   console.log('解析输入:', input)
  //   const parts = input.split('#');
  //   const taskName = parts[0] ? parts[0].trim() : '';
  //
  //   // 重置表单数据
  //   const newFormData = {
  //     name: taskName,
  //     description: '',
  //     task_type: '无循环',
  //     max_completions: 1,
  //     category: '支线任务',
  //     domain: '生活',
  //     priority: '不重要不紧急',
  //     credits_reward: {},
  //     items_reward: {},
  //     start_time: new Date().toLocaleString('sv-SE'),
  //     complete_time: '',
  //     archived: false,
  //     status: '未完成',
  //     completed_count: 0,
  //     total_completion_count: 0
  //   };
  //
  //   // 解析各字段的代码
  //   if (parts.length > 1) {
  //     // 将所有分隔符统一替换为空格，然后分割
  //     const codesString = parts.slice(1).join(' ');
  //     // 支持多种分隔符：空格、逗号、中文逗号
  //     const codes = codesString.split(/[\s,，]+/)
  //       .map(code => code.trim())
  //       .filter(code => code.length > 0);
  //     console.log('处理代码2:', codes);
  //
  //     codes.forEach(code => {
  //       applyFieldShortcut(newFormData, code);
  //     });
  //   }
  //
  //   setFormData(newFormData);
  // };

  // // 添加自定义事件监听：日志编辑框中添加快速任务
  // useEffect(() => {
  //   const handleAddQuickTask = (event) => {
  //     const command = event.detail.command;
  //     setShouldRefreshTaskList(false)
  //     if (command) {
  //       // 使用现有的 parseQuickTaskInput 函数处理命令
  //       // console.log('收到自定义事件:', command)
  //       parseQuickTaskInput(command);
  //
  //       // 显示添加任务模态框
  //       setShowAddForm(true);
  //     }
  //   };
  //
  //   // 监听自定义事件
  //   window.addEventListener('addQuickTask', handleAddQuickTask);
  //
  //   // 清理事件监听器
  //   return () => {
  //     window.removeEventListener('addQuickTask', handleAddQuickTask);
  //   };
  // }, [parseQuickTaskInput, setShowAddForm]);

  // 在编辑任务时初始化备注字段预览模式状态
  useEffect(() => {
    if (showAddForm) {
      // 新增任务时默认使用分屏模式
      setInitialNotePreviewMode('split');
    } else if (editingTask) {
      // 编辑任务时根据备注内容决定初始视图模式
      setInitialNotePreviewMode(formData.notes && formData.notes.trim() !== '' ? 'preview' : 'split');
    }

  }, [showAddForm, editingTask]); // 只依赖 showAddForm 和 editingTask，不依赖 formData.notes



  // // 修改 applyFieldShortcut 函数以正确处理字段代码映射，增强映射检查和处理，使用传入的 codeSettings props
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
  //         // console.log(`检查字段值: ${value}, 代码: ${shortcutCode}`);
  //         if (shortcutCode === code) {
  //           // console.log(`找到匹配代码: ${code} 对应字段值: ${value}`);
  //           // 根据字段类型设置对应的表单值
  //           switch (field) {
  //             case 'categories':
  //               console.log(`设置任务类别为 ${value}`);
  //               formData.category = value;
  //               break;
  //             case 'domains':
  //               console.log(`设置任务领域为 ${value}`);
  //               formData.domain = value;
  //               break;
  //             case 'priorities':
  //               console.log(`设置任务优先级为 ${value}`);
  //               formData.priority = value;
  //               break;
  //             case 'cycleTypes':
  //               console.log(`设置循环周期为 ${value}`);
  //               formData.task_type = value;
  //               break;
  //             default:
  //               console.log(`未知字段类型: ${field}`);
  //               break;
  //           }
  //           return; // 找到匹配项后立即返回
  //         }
  //       }
  //     } catch (error) {
  //       console.error(`处理字段类型 ${field} 时出错:`, error);
  //     }
  //   }
  //
  //   console.log(`未找到代码 ${code} 的匹配项`);
  // };


  // 添加一个通用的CSV字段转义函数
  const escapeCsvField = (field) => {
    if (typeof field !== 'string') {
      field = String(field);
    }

    // 如果字段包含逗号、换行符或双引号，则需要用双引号包围
    if (field.includes(',') || field.includes('\n') || field.includes('"')) {
      // 将双引号转义为两个双引号
      field = field.replace(/"/g, '""');
      // 用双引号包围整个字段
      field = `"${field}"`;
    }

    return field;
  };

  // 在 TaskTab.js 中添加导入导出功能相关代码
  const handleExportTasks = () => {
    let csvContent = '\uFEFF'; // 添加 BOM 以支持中文

    // 表头
    const headers = [
      'ID', '任务名称', '任务描述', '任务类型', '最大完成次数',
      '类别', '领域', '优先级', '积分奖励', '道具奖励', '经验奖励',
      '开始时间', '完成时间', '归档状态', '状态', '完成次数',
      '总完成次数', '标签', '备注'
    ];
    csvContent += headers.map(escapeCsvField).join(',') + '\n';

    // 数据行
    tasks.forEach(task => {
      const row = [
        task.id,
        task.name || '',
        task.description || '',
        task.task_type || '无循环',
        task.max_completions || 0,
        task.category || '支线任务',
        task.domain || '无',
        task.priority || '不重要不紧急',
        JSON.stringify(task.credits_reward || {}),
        JSON.stringify(task.items_reward || {}),
        task.exp_reward,
        task.start_time || '',
        task.complete_time || '',
        task.archived || false,
        task.status || '未完成',
        task.completed_count || 0,
        task.total_completion_count || 0,
        task.tags ? task.tags.join(', ') : '',
        task.notes || ''
      ];

      // 对每个字段进行转义处理
      csvContent += row.map(escapeCsvField).join(',') + '\n';
    });

    // 创建并下载CSV文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const timestamp = new Date().toLocaleString('sv-SE').slice(0, 19).replace(/:/g, '-');
    const filename = `tasks_${timestamp}.csv`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const showImportInstructions = () => {
    // 显示导入说明弹窗
    const message = `
    导入格式说明:
      
    请使用导出功能获取任务数据csv文件，以查看表头字段及内容格式。
    `;
    // alert(message);

    const userChoice = window.confirm(message);

    // 显示文件选择界面
    if (userChoice) {
      document.getElementById('csv-file').click();
    }
  };

  const handleImportTasksCSV_deprecated = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      onShowStatus("未选择文件");
      return;
    }
    // --- 新增：在开始处理前打开进度弹窗并重置进度 ---
    setIsImportDialogOpen(true);
    setImportProgress(0);

    const reader = new FileReader();

    reader.onload = async function(e) {
      const arrayBuffer = e.target.result;
      let decodedText = '';
      let detectedEncoding = 'utf-8'; // Default fallback

      try {
        // 1. 检测并尝试多种编码
        const potentialEncodings = ['utf-8', 'gbk', 'gb2312'];
        let bestGuessText = '';
        let bestGuessEncoding = 'utf-8';
        let bestConfidence = 0;

        for (const encoding of potentialEncodings) {
          try {
            const decoder = new TextDecoder(encoding, { fatal: true }); // fatal=true 会在解码失败时报错
            const text = decoder.decode(arrayBuffer);

            // 简单信心度评估：检查是否包含预期的表头关键词
            const headerLine = text.split(/\r?\n/)[0] || '';
            let confidence = 0;
            if (headerLine.includes('ID') || headerLine.includes('任务名称')) confidence += 50;
            if (headerLine.includes(',') || headerLine.includes('，')) confidence += 30; // 逗号是合理的

            console.log(`尝试编码 ${encoding}, 信心度: ${confidence}, 首行: ${headerLine}`);

            if (confidence > bestConfidence) {
              bestConfidence = confidence;
              bestGuessText = text;
              bestGuessEncoding = encoding;
            }
            // 如果信心度足够高，可以提前跳出循环
            if (confidence >= 80) {
                bestGuessText = text;
                bestGuessEncoding = encoding;
                break;
            }
          } catch (decodeError) {
            console.warn(`使用编码 ${encoding} 解码失败:`, decodeError.message);
            // Continue trying other encodings
          }
        }

        if (bestConfidence > 0) {
          decodedText = bestGuessText;
          detectedEncoding = bestGuessEncoding;
          console.log(`选择编码 ${detectedEncoding} 进行解析 (信心度: ${bestConfidence})`);
        } else {
          // All decoding attempts failed or produced low-confidence results
          // Fall back to default UTF-8 without fatal flag
          console.warn("所有编码尝试均失败或信心度低，回退到默认 UTF-8 解码");
          const fallbackDecoder = new TextDecoder('utf-8');
          decodedText = fallbackDecoder.decode(arrayBuffer);
        }

        // 2. 解析 CSV - 使用更健壮的方法处理引号和逗号
        const lines = decodedText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          throw new Error("CSV 文件内容过少，至少需要包含表头和一行数据");
        }

        const rawHeaderLine = lines[0];
        // 尝试解析表头行，兼容不同分隔符和引号
        const headers = parseCsvLineRobust(rawHeaderLine);
        console.log("解析后的表头:", headers);

        // 3. 验证关键表头
        const idHeaderIndex = headers.findIndex(h => h === 'ID');
        const nameHeaderIndex = headers.findIndex(h => h === '任务名称');

        if (idHeaderIndex === -1 || nameHeaderIndex === -1) {
          const errorMsg = `表头不匹配。期望包含 'ID' 和 '任务名称'。实际解析到的表头: [${headers.join(', ')}]。可能原因：文件编码错误、分隔符错误或文件损坏。`;
          console.error(errorMsg);
          onShowStatus(errorMsg);
          addLog('系统', '导入错误', errorMsg);
          event.target.value = ''; // Clear input
          return;
        }

        // 4. 解析数据行
        const importedTasks = [];
        let i = 1; // 从第二行开始（索引1）
        while (i < lines.length) {
          let currentLine = lines[i];
          // 检查当前行是否以未闭合的引号开始（这种情况理论上不应单独出现，
          // 但如果parseCsvLineRobust正确工作，它会处理跨行合并）
          // 我们在这里主要是确保 parseCsvLineRobust 能处理好跨行

          // 使用改进的解析器处理当前记录（可能涉及多行）
          const { values, nextLineIndex } = parseRecord(lines, i); // 新的记录解析函数
          i = nextLineIndex; // 更新主循环索引

          if (values.length === 0) continue;

          const obj = {};
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = j < values.length ? values[j] : '';
          }
          importedTasks.push(obj);
        }

        // 2. 验证和处理数据
        const successfullyImported = [];
        const failedImports = [];
        const totalTasks = importedTasks.length; // 获取总任务数

        // 获取当前已存在的任务 ID 列表，用于验证唯一性
        const existingTaskIds = new Set(tasks.map(t => t.id));
        const existingTaskIdsFromProps = new Set(tasks.map(t => t.id));
        const allKnownIds = new Set(existingTaskIdsFromProps);

        let newIdCounter = -1;
        const generateNewId = () => {
          // 简单实现：寻找一个不在 allKnownIds 中的负数 ID
          // 更健壮的方式是找到当前最大ID并加1，但这需要考虑ID类型（数字/字符串）
          // 这里假设ID是数字
          while (allKnownIds.has(newIdCounter)) {
            newIdCounter -= 1;
          }
          allKnownIds.add(newIdCounter); // 立即加入集合，防止下次生成重复
          return newIdCounter;
        };

        for (let index = 0; index < importedTasks.length; index++) {
          const taskData = importedTasks[index];

          // --- 新增：更新进度条 (基于已处理的任务数) ---
          const processedCount = index + 1;
          const currentProgress = (processedCount / totalTasks) * 100;
          // 例如，处理过程占总进度的 80%，剩下的 20% 留给最后的刷新提示
          setImportProgress(Math.min(80, currentProgress));
          // -----------------------------------------------
          try {
            // console.log(`正在处理任务ID: ${taskData['ID']} - ${taskData['notes']}`)
            const idStr = taskData['ID'];
            let id;

            // 验证必要字段 'ID' 和 '任务名称'
            if (!idStr || idStr.trim() === '') {
              // ID 为空，生成新的唯一 ID
              id = generateNewId();
              console.log(`任务 '${taskData['任务名称']}' ID 为空，已分配新 ID: ${id}`);
            } else {
              id = parseInt(idStr, 10);
              if (isNaN(id)) {
                failedImports.push({ task: taskData, reason: `ID '${idStr}' 无效` });
                continue;
              }
            }

            // --- 修改 5: 验证 ID 唯一性 (同时检查 props 和本次导入) ---
            // 检查 ID 是否已存在于系统中 (props)
            if (existingTaskIdsFromProps.has(id)) {
              failedImports.push({ task: taskData, reason: `ID '${id}' 已存在于系统中` });
              continue;
            }

            // 检查 ID 是否在本次导入中已经处理过 (本地 Set)
            // 注意：对于从 CSV 读取的有效 ID，也需要加入 allKnownIds 以供后续任务检查
            if (allKnownIds.has(id)) {
               // 如果 ID 是从 CSV 读取的，并且第一次遇到，它不会在 allKnownIds (初始状态) 中
               // 如果它在，说明是重复的（要么是之前生成的，要么是 CSV 中重复的）
               failedImports.push({ task: taskData, reason: `ID '${id}' 在导入文件中重复或与新生成的ID冲突` });
               continue;
            }

            // 如果 ID 有效且唯一，则将其添加到已知 ID 集合中
            allKnownIds.add(id);
            // -------------------------------------------------------

            // 验证必要字段 '任务名称'
            if (!taskData['任务名称']) {
              failedImports.push({ task: taskData, reason: "缺少必要字段 '任务名称'" });
              // 即使跳过，ID 也已被消耗/标记，这可能符合预期（避免后续使用相同ID）
              continue;
            }



            // 3. 构建最终任务对象
            // 使用 TaskTab 中 formData 的默认值作为基础
            const newTask = {
              id: id,
              name: taskData['任务名称'] || '',
              description: taskData['任务描述'] || '',
              task_type: taskData['任务类型'] || '无循环',
              max_completions: parseInt(taskData['最大完成次数'], 10) || 1,
              category: taskData['类别'] || '支线任务',
              domain: taskData['领域'] || '生活',
              priority: taskData['优先级'] || '不重要不紧急',
              credits_reward: {}, // 默认空对象，后续处理
              items_reward: {},   // 默认空对象，后续处理
              exp_reward: parseFloat(taskData['经验奖励']) || 0, // 默认0，后续处理
              // start_time: formatDateTime(taskData['开始时间']) || null,
              // complete_time: formatDateTime(taskData['完成时间']) || null,
              start_time: taskData['开始时间'] ? handleDateChangeForImport(taskData['开始时间']) : null,
              complete_time: taskData['完成时间'] ? handleDateChangeForImport(taskData['完成时间']) : null,
              // start_time: taskData['开始时间'] || null,
              // complete_time: taskData['完成时间'] || null,
              archived: (() => {
                const val = taskData['归档状态'];
                return val === 'true' || val === '1' || val === '是';
              })(),
              status: taskData['状态'] || '未完成',
              completed_count: parseInt(taskData['完成次数'], 10) || 0,
              total_completion_count: parseInt(taskData['总完成次数'], 10) || 0,
              notes: taskData['备注'] || '',
              tags: [], // 默认空数组，后续处理
            };

            // 处理 tags 字段
            const tagsField = taskData['标签'];
            if (typeof tagsField === 'string' && tagsField.trim() !== '') {
                newTask.tags = tagsField.split(',')
                                         .map(tag => tag.trim())
                                         .filter(tag => tag.startsWith('#') && tag.length > 1);
            } else if(newTask.notes) {
                newTask.tags = extractTagsFromNotes(newTask.notes);
            }

            // --- 强化 JSON 解析逻辑 ---
            const creditsRewardStr = taskData['积分奖励'];
            if (isJsonString(creditsRewardStr)) { // 使用辅助函数检查
              try {
                newTask.credits_reward = JSON.parse(creditsRewardStr);
              } catch (parseErr) {
                console.warn(`任务 ID ${id} 的积分奖励 JSON 解析失败 (尝试解析 '${creditsRewardStr}'):`, parseErr);
                newTask.credits_reward = {}; // 解析失败则置空
              }
            } // 如果不是有效的 JSON 字符串，则保持默认空对象 {}

            const itemsRewardStr = taskData['道具奖励'];
            if (isJsonString(itemsRewardStr)) { // 使用辅助函数检查
              try {
                newTask.items_reward = JSON.parse(itemsRewardStr);
              } catch (parseErr) {
                console.warn(`任务 ID ${id} 的道具奖励 JSON 解析失败 (尝试解析 '${itemsRewardStr}'):`, parseErr);
                newTask.items_reward = {}; // 解析失败则置空
              }
            } // 如果不是有效的 JSON 字符串，则保持默认空对象 {}

            // 4. 计算缺失的奖励 (核心逻辑)
            // 如果积分奖励和经验奖励都为空，则重新计算
            const hasExplicitCredits = isJsonString(taskData['积分奖励']) && Object.keys(newTask.credits_reward).length > 0;
            const hasExplicitExp = !isNaN(newTask.exp_reward) && newTask.exp_reward > 0;

            if (!hasExplicitCredits || !hasExplicitExp) {

              // 使用组件作用域内已定义的函数进行计算
              try {
                // 计算积分奖励
                if (!hasExplicitCredits) {
                  // 1. 确定积分类型 (信用类型)
                  let creditType = '骨贝'; // 默认值
                  if (characterSettings) {
                    const matchedSetting = characterSettings.find(
                      item => item.domain === newTask.domain
                    );
                    if (matchedSetting && matchedSetting.creditType) {
                      creditType = matchedSetting.creditType;
                    }
                  }

                  // 2. 调用现有的 calculateTaskRewardPoints 函数计算积分值
                  const calculatedPoints = calculateTaskRewardPoints(
                    newTask.category,
                    newTask.domain,
                    newTask.priority
                  );

                  // 3. 将计算结果赋值给 newTask
                  newTask.credits_reward[creditType] = calculatedPoints;
                  console.log(`任务 ID ${newTask.id} 积分奖励已计算: ${creditType} = ${calculatedPoints}`);
                }

                // 计算经验奖励
                if (!hasExplicitExp) {
                  const calculatedExp = calculateTaskExpReward(newTask);
                  newTask.exp_reward = calculatedExp;
                  console.log(`任务 ID ${newTask.id} 经验奖励已计算: ${calculatedExp}`);
                }
              } catch (calcError) {
                console.error(`任务 ID ${newTask.id} 奖励计算过程出错:`, calcError);
                // 即使计算出错，也继续尝试导入任务，避免中断整个流程
                // 可以选择在这里设置默认奖励，或者保持为 0/空
                if (!hasExplicitCredits) {
                    newTask.credits_reward = {"骨贝": 1}; // 设置极小的默认积分
                }
                if (!hasExplicitExp) {
                    newTask.exp_reward = 10; // 设置默认经验
                }
              }
            } else {
              console.log(`任务 ID ${newTask.id} 使用 CSV 中提供的奖励。`);
            }

            // 5. 调用 API 导入
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newTask)
            });

            const result = await response.json();

            if (response.ok) {
              successfullyImported.push(newTask);
              addLog('任务', '导入任务', `成功导入任务: ${newTask.name} (ID: ${newTask.id})`);
            } else {
              failedImports.push({ task: newTask, reason: result.error || 'API 返回错误' });
              addLog('任务', '导入失败', `导入任务失败 ${newTask.name} (ID: ${newTask.id}): ${result.error || '未知错误'}`);
            }

          } catch (err) {
            console.error("处理单个任务时出错:", err);
            failedImports.push({ task: taskData, reason: `处理任务时发生错误: ${err.message}` });
            addLog('任务', '导入异常', `处理任务时异常: ${err.message}`);
          }
        }

        // 6. 反馈结果
        onShowStatus(`导入完成。成功: ${successfullyImported.length} 个, 失败: ${failedImports.length} 个`);
        setImportProgress(100);
        if (successfullyImported.length > 0) {
          onUpdateTask(); // 刷新任务列表以显示新导入的任务
        }

        // 可选：打印失败详情到控制台或 UI
        if (failedImports.length > 0) {
          console.warn("以下任务导入失败:", failedImports);
          // 可以考虑用 alert 或 modal 显示详细信息
          // alert(`部分任务导入失败，详情请查看控制台。\n失败数量: ${failedImports.length}`);
        }

      } catch (err) {
        console.error("CSV 解析或导入过程中出错:", err);
        onShowStatus(`CSV 文件解析失败或导入过程出错: ${err.message}`);
        addLog('系统', '导入错误', `CSV 导入失败: ${err.message}`);
        setIsImportDialogOpen(false);
      } finally {
        event.target.value = '';
      }
    };

    reader.onerror = function() {
      onShowStatus("文件读取出错");
      addLog('系统', '文件错误', '读取 CSV 文件时出错');
      event.target.value = '';
      setIsImportDialogOpen(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const fetchLatestTasks = async () => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks`);
      if (!response.ok) {
        throw new Error(`获取任务列表失败: ${response.status} ${response.statusText}`);
      }
      const latestTasks = await response.json();
      return latestTasks;
    } catch (error) {
      console.error("获取最新任务数据时出错:", error);
      onShowStatus(`获取最新任务数据失败: ${error.message}`);
      // 如果获取失败，回退到使用当前 props 中的任务数据
      return tasks;
    }
  };

  const handleImportTasksCSV_deprecated2 = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      onShowStatus("未选择文件");
      return;
    }
    // --- 新增：在开始处理前打开进度弹窗并重置进度 ---
    setIsImportDialogOpen(true);
    setImportProgress(0);

    const reader = new FileReader();

    reader.onload = async function(e) {
      const arrayBuffer = e.target.result;
      let decodedText = '';
      let detectedEncoding = 'utf-8'; // Default fallback

      try {
        // 1. 检测并尝试多种编码
        const potentialEncodings = ['utf-8', 'gbk', 'gb2312'];
        let bestGuessText = '';
        let bestGuessEncoding = 'utf-8';
        let bestConfidence = 0;

        for (const encoding of potentialEncodings) {
          try {
            const decoder = new TextDecoder(encoding, { fatal: true }); // fatal=true 会在解码失败时报错
            const text = decoder.decode(arrayBuffer);

            // 简单信心度评估：检查是否包含预期的表头关键词
            const headerLine = text.split(/\r?\n/)[0] || '';
            let confidence = 0;
            if (headerLine.includes('ID') || headerLine.includes('任务名称')) confidence += 50;
            if (headerLine.includes(',') || headerLine.includes('，')) confidence += 30; // 逗号是合理的

            console.log(`尝试编码 ${encoding}, 信心度: ${confidence}, 首行: ${headerLine}`);

            if (confidence > bestConfidence) {
              bestConfidence = confidence;
              bestGuessText = text;
              bestGuessEncoding = encoding;
            }
            // 如果信心度足够高，可以提前跳出循环
            if (confidence >= 80) {
                bestGuessText = text;
                bestGuessEncoding = encoding;
                break;
            }
          } catch (decodeError) {
            console.warn(`使用编码 ${encoding} 解码失败:`, decodeError.message);
            // Continue trying other encodings
          }
        }

        if (bestConfidence > 0) {
          decodedText = bestGuessText;
          detectedEncoding = bestGuessEncoding;
          console.log(`选择编码 ${detectedEncoding} 进行解析 (信心度: ${bestConfidence})`);
        } else {
          // All decoding attempts failed or produced low-confidence results
          // Fall back to default UTF-8 without fatal flag
          console.warn("所有编码尝试均失败或信心度低，回退到默认 UTF-8 解码");
          const fallbackDecoder = new TextDecoder('utf-8');
          decodedText = fallbackDecoder.decode(arrayBuffer);
        }

        // 2. 解析 CSV - 使用更健壮的方法处理引号和逗号
        const lines = decodedText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          throw new Error("CSV 文件内容过少，至少需要包含表头和一行数据");
        }

        const rawHeaderLine = lines[0];
        // 尝试解析表头行，兼容不同分隔符和引号
        const headers = parseCsvLineRobust(rawHeaderLine);
        console.log("解析后的表头:", headers);

        // 3. 验证关键表头
        const idHeaderIndex = headers.findIndex(h => h === 'ID');
        const nameHeaderIndex = headers.findIndex(h => h === '任务名称');

        if (idHeaderIndex === -1 || nameHeaderIndex === -1) {
          const errorMsg = `表头不匹配。期望包含 'ID' 和 '任务名称'。实际解析到的表头: [${headers.join(', ')}]。可能原因：文件编码错误、分隔符错误或文件损坏。`;
          console.error(errorMsg);
          onShowStatus(errorMsg);
          addLog('系统', '导入错误', errorMsg);
          event.target.value = ''; // Clear input
          return;
        }

        // 4. 解析数据行
        const importedTasks = [];
        let i = 1; // 从第二行开始（索引1）
        while (i < lines.length) {
          let currentLine = lines[i];
          // 检查当前行是否以未闭合的引号开始（这种情况理论上不应单独出现，
          // 但如果parseCsvLineRobust正确工作，它会处理跨行合并）
          // 我们在这里主要是确保 parseCsvLineRobust 能处理好跨行

          // 使用改进的解析器处理当前记录（可能涉及多行）
          const { values, nextLineIndex } = parseRecord(lines, i); // 新的记录解析函数
          i = nextLineIndex; // 更新主循环索引

          if (values.length === 0) continue;

          const obj = {};
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = j < values.length ? values[j] : '';
          }
          importedTasks.push(obj);
        }

        // 2. 验证和处理数据
        const successfullyImported = [];
        const failedImports = [];
        const totalTasks = importedTasks.length; // 获取总任务数

        // --- 修改：只使用 props 中的任务 ID 来检查是否存在 ---
        // 获取当前已存在于系统中的任务 ID 列表 (来自 props)
        const existingTaskIdsInSystem = new Set(tasks.map(t => t.id));
        console.log("系统中已存在的任务 ID:", Array.from(existingTaskIdsInSystem));

        // --- 移除或注释掉原有的 allKnownIds 和 generateNewId 逻辑 ---
        // const existingTaskIdsFromProps = new Set(tasks.map(t => t.id));
        // const allKnownIds = new Set(existingTaskIdsFromProps);
        // let newIdCounter = -1;
        // const generateNewId = () => { ... };

        // --- 新增：用于生成新 ID 的逻辑 ---
        // 找到当前系统中最大的 ID，新 ID 在此基础上递增
        let maxExistingId = 0;
        if (tasks.length > 0) {
            maxExistingId = Math.max(...tasks.map(t => t.id), 0);
        }
        let nextAvailableId = maxExistingId + 1;
        console.log("当前系统最大 ID:", maxExistingId, "下一个可用 ID:", nextAvailableId);

        const generateNewUniqueId = () => {
          // 简单递增生成新 ID，确保不与系统中已有的 ID 冲突
          const newId = nextAvailableId++;
          console.log(`生成新唯一 ID: ${newId}`);
          return newId;
        };
        // --------------------------------------------------------

        for (let index = 0; index < importedTasks.length; index++) {
          const taskData = importedTasks[index];

          // --- 新增：更新进度条 (基于已处理的任务数) ---
          const processedCount = index + 1;
          const currentProgress = (processedCount / totalTasks) * 100;
          // 例如，处理过程占总进度的 80%，剩下的 20% 留给最后的刷新提示
          setImportProgress(Math.min(80, currentProgress));
          // -----------------------------------------------

          try {
            console.log(`开始处理任务数据:`, taskData);
            const idStr = taskData['ID'];
            let id;
            let idSource = ""; // 用于调试，标识 ID 来源

            // --- 修改：严格按照您的逻辑处理 ID ---
            if (!idStr || idStr.trim() === '') {
              // 情况 1: CSV 中 ID 为空 -> 分配新 ID
              id = generateNewUniqueId();
              idSource = "generated_new";
              console.log(`任务 '${taskData['任务名称']}' ID 为空，已分配新 ID: ${id}`);
            } else {
              // 情况 2: CSV 中 ID 不为空
              const parsedId = parseInt(idStr, 10);
              if (isNaN(parsedId)) {
                // ID 格式无效
                failedImports.push({ task: taskData, reason: `ID '${idStr}' 无效` });
                console.warn(`跳过任务: ID '${idStr}' 无效`, taskData);
                continue;
              }

              // ID 格式有效，检查是否存在于系统中
              if (existingTaskIdsInSystem.has(parsedId)) {
                // 情况 3: ID 存在于系统中 -> 跳过
                failedImports.push({ task: taskData, reason: `ID '${parsedId}' 已存在于系统中` });
                console.log(`跳过任务: ID '${parsedId}' 已存在于系统中`, taskData);
                continue;
              } else {
                // 情况 4: ID 不存在于系统中 -> 使用 CSV 中的原始 ID
                id = parsedId;
                idSource = "from_csv";
                console.log(`任务 '${taskData['任务名称']}' 使用 CSV 中的原始 ID: ${id}`);
              }
            }
            // --- 结束修改 ---

            // 验证必要字段 '任务名称'
            if (!taskData['任务名称']) {
              failedImports.push({ task: taskData, reason: "缺少必要字段 '任务名称'" });
              console.warn(`跳过任务: 缺少必要字段 '任务名称'`, taskData);
              continue; // 跳过该任务
            }

            // 3. 构建最终任务对象
            // 使用 TaskTab 中 formData 的默认值作为基础
            const newTask = {
              id: id, // 使用处理后的 ID
              name: taskData['任务名称'] || '',
              description: taskData['任务描述'] || '',
              task_type: taskData['任务类型'] || '无循环',
              max_completions: parseInt(taskData['最大完成次数'], 10) || 1,
              category: taskData['类别'] || '支线任务',
              domain: taskData['领域'] || '生活',
              priority: taskData['优先级'] || '不重要不紧急',
              credits_reward: {}, // 默认空对象，后续处理
              items_reward: {},   // 默认空对象，后续处理
              exp_reward: parseFloat(taskData['经验奖励']) || 0, // 默认0，后续处理
              start_time: taskData['开始时间'] ? handleDateChangeForImport(taskData['开始时间']) : null,
              complete_time: taskData['完成时间'] ? handleDateChangeForImport(taskData['完成时间']) : null,
              archived: (() => {
                const val = taskData['归档状态'];
                return val === 'true' || val === '1' || val === '是';
              })(),
              status: taskData['状态'] || '未完成',
              completed_count: parseInt(taskData['完成次数'], 10) || 0,
              total_completion_count: parseInt(taskData['总完成次数'], 10) || 0,
              notes: taskData['备注'] || '',
              tags: [], // 默认空数组，后续处理
            };

            // 处理 tags 字段
            const tagsField = taskData['标签'];
            if (typeof tagsField === 'string' && tagsField.trim() !== '') {
                newTask.tags = tagsField.split(',')
                                         .map(tag => tag.trim())
                                         .filter(tag => tag.startsWith('#') && tag.length > 1);
            } else if(newTask.notes) {
                newTask.tags = extractTagsFromNotes(newTask.notes);
            }

            // --- 强化 JSON 解析逻辑 ---
            const creditsRewardStr = taskData['积分奖励'];
            if (isJsonString(creditsRewardStr)) {
              try {
                newTask.credits_reward = JSON.parse(creditsRewardStr);
              } catch (parseErr) {
                console.warn(`任务 ID ${id} 的积分奖励 JSON 解析失败 (尝试解析 '${creditsRewardStr}'):`, parseErr);
                newTask.credits_reward = {};
              }
            }

            const itemsRewardStr = taskData['道具奖励'];
            if (isJsonString(itemsRewardStr)) {
              try {
                newTask.items_reward = JSON.parse(itemsRewardStr);
              } catch (parseErr) {
                console.warn(`任务 ID ${id} 的道具奖励 JSON 解析失败 (尝试解析 '${itemsRewardStr}'):`, parseErr);
                newTask.items_reward = {};
              }
            }

            // 4. 计算缺失的奖励 (核心逻辑)
            const hasExplicitCredits = isJsonString(taskData['积分奖励']) && Object.keys(newTask.credits_reward).length > 0;
            const hasExplicitExp = !isNaN(newTask.exp_reward) && newTask.exp_reward > 0;

            if (!hasExplicitCredits || !hasExplicitExp) {
              try {
                if (!hasExplicitCredits) {
                  let creditType = '骨贝';
                  if (characterSettings) {
                    const matchedSetting = characterSettings.find(
                      item => item.domain === newTask.domain
                    );
                    if (matchedSetting && matchedSetting.creditType) {
                      creditType = matchedSetting.creditType;
                    }
                  }
                  const calculatedPoints = calculateTaskRewardPoints(
                    newTask.category,
                    newTask.domain,
                    newTask.priority
                  );
                  newTask.credits_reward[creditType] = calculatedPoints;
                  console.log(`任务 ID ${newTask.id} 积分奖励已计算: ${creditType} = ${calculatedPoints}`);
                }

                if (!hasExplicitExp) {
                  const calculatedExp = calculateTaskExpReward(newTask); // 假设是这个函数
                  newTask.exp_reward = calculatedExp;
                  console.log(`任务 ID ${newTask.id} 经验奖励已计算: ${calculatedExp}`);
                }
              } catch (calcError) {
                console.error(`任务 ID ${newTask.id} 奖励计算过程出错:`, calcError);
                if (!hasExplicitCredits) {
                    newTask.credits_reward = {"骨贝": 1};
                }
                if (!hasExplicitExp) {
                    newTask.exp_reward = 10;
                }
              }
            } else {
              console.log(`任务 ID ${newTask.id} 使用 CSV 中提供的奖励。`);
            }

            // 5. 调用 API 导入
            console.log(`准备导入任务到服务器:`, newTask);
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newTask)
            });

            const result = await response.json();
            console.log(`服务器响应 for task ID ${newTask.id}:`, result);

            if (response.ok) {
              successfullyImported.push(newTask);
              addLog('任务', '导入任务', `成功导入任务: ${newTask.name} (ID: ${newTask.id}, 来源: ${idSource})`);
              console.log(`成功导入任务: ${newTask.name} (ID: ${newTask.id})`);
            } else {
              failedImports.push({ task: newTask, reason: result.error || 'API 返回错误' });
              addLog('任务', '导入失败', `导入任务失败 ${newTask.name} (ID: ${newTask.id}): ${result.error || '未知错误'}`);
              console.error(`导入任务失败 ${newTask.name} (ID: ${newTask.id}):`, result.error || '未知错误');
            }

          } catch (err) {
            console.error("处理单个任务时出错:", err);
            failedImports.push({ task: taskData, reason: `处理任务时发生错误: ${err.message}` });
            addLog('任务', '导入异常', `处理任务时异常: ${err.message}`);
          }
        }

        // 6. 反馈结果
        const msg = `导入完成。成功: ${successfullyImported.length} 个, 失败: ${failedImports.length} 个`;
        onShowStatus(msg);
        console.log(msg);
        setImportProgress(100); // 设置进度为 100%
        if (successfullyImported.length > 0) {
          onUpdateTask(); // 刷新任务列表以显示新导入的任务
        }

        if (failedImports.length > 0) {
          console.warn("以下任务导入失败:", failedImports);
        }

      } catch (err) {
        console.error("CSV 解析或导入过程中出错:", err);
        onShowStatus(`CSV 文件解析失败或导入过程出错: ${err.message}`);
        addLog('系统', '导入错误', `CSV 导入失败: ${err.message}`);
        setIsImportDialogOpen(false);
      } finally {
        event.target.value = '';
      }
    };

    reader.onerror = function() {
      onShowStatus("文件读取出错");
      addLog('系统', '文件错误', '读取 CSV 文件时出错');
      event.target.value = '';
      setIsImportDialogOpen(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImportTasksCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      onShowStatus("未选择文件");
      return;
    }

    // --- 新增：在开始处理前打开进度弹窗并重置进度 ---
    setIsImportDialogOpen(true);
    setImportProgress(0);

    const reader = new FileReader();

    reader.onload = async function(e) {
      const arrayBuffer = e.target.result;
      let decodedText = '';
      let detectedEncoding = 'utf-8'; // Default fallback

      try {
        // --- 修改：在解析CSV前获取最新任务数据 ---
        const latestTasks = await fetchLatestTasks();
        // console.log("获取到的最新任务数据用于ID检查:", latestTasks);
        // ------------------------------------------

        // 1. 检测并尝试多种编码
        const potentialEncodings = ['utf-8', 'gbk', 'gb2312'];
        let bestGuessText = '';
        let bestGuessEncoding = 'utf-8';
        let bestConfidence = 0;

        for (const encoding of potentialEncodings) {
          try {
            const decoder = new TextDecoder(encoding, { fatal: true }); // fatal=true 会在解码失败时报错
            const text = decoder.decode(arrayBuffer);

            // 简单信心度评估：检查是否包含预期的表头关键词
            const headerLine = text.split(/\r?\n/)[0] || '';
            let confidence = 0;
            if (headerLine.includes('ID') || headerLine.includes('任务名称')) confidence += 50;
            if (headerLine.includes(',') || headerLine.includes('，')) confidence += 30; // 逗号是合理的

            // console.log(`尝试编码 ${encoding}, 信心度: ${confidence}, 首行: ${headerLine}`);

            if (confidence > bestConfidence) {
              bestConfidence = confidence;
              bestGuessText = text;
              bestGuessEncoding = encoding;
            }
            // 如果信心度足够高，可以提前跳出循环
            if (confidence >= 80) {
                bestGuessText = text;
                bestGuessEncoding = encoding;
                break;
            }
          } catch (decodeError) {
            console.warn(`使用编码 ${encoding} 解码失败:`, decodeError.message);
            // Continue trying other encodings
          }
        }

        if (bestConfidence > 0) {
          decodedText = bestGuessText;
          detectedEncoding = bestGuessEncoding;
          // console.log(`选择编码 ${detectedEncoding} 进行解析 (信心度: ${bestConfidence})`);
        } else {
          // All decoding attempts failed or produced low-confidence results
          // Fall back to default UTF-8 without fatal flag
          console.warn("所有编码尝试均失败或信心度低，回退到默认 UTF-8 解码");
          const fallbackDecoder = new TextDecoder('utf-8');
          decodedText = fallbackDecoder.decode(arrayBuffer);
        }

        // 2. 解析 CSV - 使用更健壮的方法处理引号和逗号
        const lines = decodedText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          throw new Error("CSV 文件内容过少，至少需要包含表头和一行数据");
        }

        const rawHeaderLine = lines[0];
        // 尝试解析表头行，兼容不同分隔符和引号
        const headers = parseCsvLineRobust(rawHeaderLine);
        // console.log("解析后的表头:", headers);

        // 3. 验证关键表头
        const idHeaderIndex = headers.findIndex(h => h === 'ID');
        const nameHeaderIndex = headers.findIndex(h => h === '任务名称');

        if (idHeaderIndex === -1 || nameHeaderIndex === -1) {
          const errorMsg = `表头不匹配。期望包含 'ID' 和 '任务名称'。实际解析到的表头: [${headers.join(', ')}]。可能原因：文件编码错误、分隔符错误或文件损坏。`;
          console.error(errorMsg);
          onShowStatus(errorMsg);
          addLog('系统', '导入错误', errorMsg);
          event.target.value = ''; // Clear input
          return;
        }

        // 4. 解析数据行
        const importedTasks = [];
        let i = 1; // 从第二行开始（索引1）
        while (i < lines.length) {
          let currentLine = lines[i];
          // 检查当前行是否以未闭合的引号开始（这种情况理论上不应单独出现，
          // 但如果parseCsvLineRobust正确工作，它会处理跨行合并）
          // 我们在这里主要是确保 parseCsvLineRobust 能处理好跨行

          // 使用改进的解析器处理当前记录（可能涉及多行）
          const { values, nextLineIndex } = parseRecord(lines, i); // 新的记录解析函数
          i = nextLineIndex; // 更新主循环索引

          if (values.length === 0) continue;

          const obj = {};
          for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = j < values.length ? values[j] : '';
          }
          importedTasks.push(obj);
        }


        // 2. 验证和处理数据
        const successfullyImported = [];
        const failedImports = [];
        const totalTasks = importedTasks.length; // 获取总任务数

        // --- 修改：使用从后端获取的最新任务数据来检查ID唯一性 ---
        // 获取当前已存在于系统中的任务 ID 列表 (来自最新的后端数据)
        const existingTaskIdsInSystem = new Set(latestTasks.map(t => t.id));
        // console.log("系统中已存在的任务 ID (基于最新数据):", Array.from(existingTaskIdsInSystem));
        // -------------------------------------------------------------

        // --- 新增：用于生成新 ID 的逻辑 ---
        // 找到当前系统中最大的 ID，新 ID 在此基础上递增
        let maxExistingId = 0;
        if (latestTasks.length > 0) {
            // 确保比较的是数字ID
            maxExistingId = Math.max(...latestTasks.map(t => {
                const id = parseInt(t.id, 10);
                return isNaN(id) ? 0 : id;
            }), 0);
        }
        let nextAvailableId = maxExistingId + 1;
        // console.log("当前系统最大 ID:", maxExistingId, "下一个可用 ID:", nextAvailableId);

        const generateNewUniqueId = () => {
          // 简单递增生成新 ID，确保不与系统中已有的 ID 冲突
          const newId = nextAvailableId++;
          // console.log(`生成新唯一 ID: ${newId}`);
          return newId;
        };
        // -----------------------------------


        for (let index = 0; index < importedTasks.length; index++) {
          const taskData = importedTasks[index];

          // --- 新增：更新进度条 (基于已处理的任务数) ---
          const processedCount = index + 1;
          const currentProgress = (processedCount / totalTasks) * 100;
          // 例如，处理过程占总进度的 80%，剩下的 20% 留给最后的刷新提示
          setImportProgress(Math.min(80, currentProgress));
          // -----------------------------------------------

          try {
            // console.log(`开始处理任务数据:`, taskData);
            const idStr = taskData['ID'];
            let id;
            let idSource = ""; // 用于调试，标识 ID 来源

            // --- 修改：严格按照您的逻辑处理 ID ---
            if (!idStr || idStr.trim() === '') {
              // 情况 1: CSV 中 ID 为空 -> 分配新 ID
              // console.log(`任务 '${taskData['任务名称']}' ID (${taskData['id']})为空，将分配新 ID`);
              id = generateNewUniqueId();
              idSource = "generated_new";
              // console.log(`任务 '${taskData['任务名称']}' ID 为空，已分配新 ID: ${id}`);
            } else {
              // 情况 2: CSV 中 ID 不为空
              const parsedId = parseInt(idStr, 10);
              if (isNaN(parsedId)) {
                // ID 格式无效
                failedImports.push({ task: taskData, reason: `ID '${idStr}' 无效` });
                console.warn(`跳过任务: ID '${idStr}' 无效`, taskData);
                continue;
              }

              // ID 格式有效，检查是否存在于系统中 (使用最新数据)
              if (existingTaskIdsInSystem.has(parsedId)) {
                // 情况 3: ID 存在于系统中 -> 跳过
                failedImports.push({ task: taskData, reason: `ID '${parsedId}' 已存在于系统中` });
                // console.log(`跳过任务: ID '${parsedId}' 已存在于系统中`, taskData);
                continue;
              } else {
                // 情况 4: ID 不存在于系统中 -> 使用 CSV 中的原始 ID
                id = parsedId;
                idSource = "from_csv";
                // console.log(`任务 '${taskData['任务名称']}' ${parsedId}使用 CSV 中的原始 ID: ${id}`);
              }
            }
            // --- 结束修改 ---

            // 验证必要字段 '任务名称'
            if (!taskData['任务名称']) {
              failedImports.push({ task: taskData, reason: "缺少必要字段 '任务名称'" });
              console.warn(`跳过任务: 缺少必要字段 '任务名称'`, taskData);
              continue; // 跳过该任务
            }

            // ... (后续任务处理逻辑保持不变，使用上面确定的 `id` 变量) ...
            // 3. 构建最终任务对象
            // 使用 TaskTab 中 formData 的默认值作为基础
            const newTask = {
              id: id, // 使用处理后的 ID
              name: taskData['任务名称'] || '',
              description: taskData['任务描述'] || '',
              task_type: taskData['任务类型'] || '无循环',
              max_completions: parseInt(taskData['最大完成次数'], 10) || 1,
              category: taskData['类别'] || '支线任务',
              domain: taskData['领域'] || '生活',
              priority: taskData['优先级'] || '不重要不紧急',
              credits_reward: {}, // 默认空对象，后续处理
              items_reward: {},   // 默认空对象，后续处理
              exp_reward: parseFloat(taskData['经验奖励']) || 0, // 默认0，后续处理
              start_time: taskData['开始时间'] ? handleDateChangeForImport(taskData['开始时间']) : null,
              complete_time: taskData['完成时间'] ? handleDateChangeForImport(taskData['完成时间']) : null,
              archived: (() => {
                const val = taskData['归档状态'];
                return val === 'true' || val === '1' || val === '是';
              })(),
              status: taskData['状态'] || '未完成',
              completed_count: parseInt(taskData['完成次数'], 10) || 0,
              total_completion_count: parseInt(taskData['总完成次数'], 10) || 0,
              notes: taskData['备注'] || '',
              tags: [], // 默认空数组，后续处理
            };

            // 处理 tags 字段
            const tagsField = taskData['标签'];
            if (typeof tagsField === 'string' && tagsField.trim() !== '') {
                newTask.tags = tagsField.split(',')
                                         .map(tag => tag.trim())
                                         .filter(tag => tag.startsWith('#') && tag.length > 1);
            } else if(newTask.notes) {
                newTask.tags = extractTagsFromNotes(newTask.notes);
            }

            // --- 强化 JSON 解析逻辑 ---
            const creditsRewardStr = taskData['积分奖励'];
            if (isJsonString(creditsRewardStr)) {
              try {
                newTask.credits_reward = JSON.parse(creditsRewardStr);
              } catch (parseErr) {
                console.warn(`任务 ID ${id} 的积分奖励 JSON 解析失败 (尝试解析 '${creditsRewardStr}'):`, parseErr);
                newTask.credits_reward = {};
              }
            }

            const itemsRewardStr = taskData['道具奖励'];
            if (isJsonString(itemsRewardStr)) {
              try {
                newTask.items_reward = JSON.parse(itemsRewardStr);
              } catch (parseErr) {
                console.warn(`任务 ID ${id} 的道具奖励 JSON 解析失败 (尝试解析 '${itemsRewardStr}'):`, parseErr);
                newTask.items_reward = {};
              }
            }

            // 4. 计算缺失的奖励 (核心逻辑)
            const hasExplicitCredits = isJsonString(taskData['积分奖励']) && Object.keys(newTask.credits_reward).length > 0;
            const hasExplicitExp = !isNaN(newTask.exp_reward) && newTask.exp_reward > 0;

            if (!hasExplicitCredits || !hasExplicitExp) {
              try {
                if (!hasExplicitCredits) {
                  let creditType = '骨贝';
                  if (characterSettings) {
                    const matchedSetting = characterSettings.find(
                      item => item.domain === newTask.domain
                    );
                    if (matchedSetting && matchedSetting.creditType) {
                      creditType = matchedSetting.creditType;
                    }
                  }
                  const calculatedPoints = calculateTaskRewardPoints(
                    newTask.category,
                    newTask.domain,
                    newTask.priority
                  );
                  newTask.credits_reward[creditType] = calculatedPoints;
                  // console.log(`任务 ID ${newTask.id} 积分奖励已计算: ${creditType} = ${calculatedPoints}`);
                }

                if (!hasExplicitExp) {
                  // 注意：您提到使用 calculateTaskExpReward，但代码中是 calculateTaskPoints
                  // 请根据实际情况调整
                  const calculatedExp = calculateTaskExpReward(newTask); // 假设是这个函数
                  newTask.exp_reward = calculatedExp;
                  // console.log(`任务 ID ${newTask.id} 经验奖励已计算: ${calculatedExp}`);
                }
              } catch (calcError) {
                console.error(`任务 ID ${newTask.id} 奖励计算过程出错:`, calcError);
                if (!hasExplicitCredits) {
                    newTask.credits_reward = {"骨贝": 1};
                }
                if (!hasExplicitExp) {
                    newTask.exp_reward = 10;
                }
              }
            } else {
              console.log(`任务 ID ${newTask.id} 使用 CSV 中提供的奖励。`);
            }

            // 5. 调用 API 导入
            // console.log(`准备导入任务到服务器:`, newTask);
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newTask)
            });

            const result = await response.json();
            // console.log(`服务器响应 for task ID ${newTask.id}:`, result);

            if (response.ok) {
              successfullyImported.push(newTask);
              addLog('任务', '导入任务', `成功导入任务: ${newTask.name} (ID: ${newTask.id}, 来源: ${idSource})`);
              // console.log(`成功导入任务: ${newTask.name} (ID: ${newTask.id})`);
            } else {
              failedImports.push({ task: newTask, reason: result.error || 'API 返回错误' });
              addLog('任务', '导入失败', `导入任务失败 ${newTask.name} (ID: ${newTask.id}): ${result.error || '未知错误'}`);
              console.error(`导入任务失败 ${newTask.name} (ID: ${newTask.id}):`, result.error || '未知错误');
            }

          } catch (err) {
            console.error("处理单个任务时出错:", err);
            failedImports.push({ task: taskData, reason: `处理任务时发生错误: ${err.message}` });
            addLog('任务', '导入异常', `处理任务时异常: ${err.message}`);
          }
        }

        // 6. 反馈结果
        const msg = `导入完成。成功: ${successfullyImported.length} 个, 失败: ${failedImports.length} 个`;
        onShowStatus(msg);
        setImportProgress(100); // 设置进度为 100%
        if (successfullyImported.length > 0) {
          onUpdateTask(); // 刷新任务列表以显示新导入的任务
        }

        if (failedImports.length > 0) {
          console.warn("以下任务导入失败:", failedImports);
        }

      } catch (err) {
        console.error("CSV 解析或导入过程中出错:", err);
        onShowStatus(`CSV 文件解析失败或导入过程出错: ${err.message}`);
        addLog('系统', '导入错误', `CSV 导入失败: ${err.message}`);
        setIsImportDialogOpen(false);
      } finally {
        event.target.value = '';
      }
    };

    reader.onerror = function() {
      onShowStatus("文件读取出错");
      addLog('系统', '文件错误', '读取 CSV 文件时出错');
      event.target.value = '';
      setIsImportDialogOpen(false);
    };

    reader.readAsArrayBuffer(file);
  };


  /**
   * 改进的 CSV 行解析函数，能处理被引号包裹且包含逗号或换行符的字段。
   * @param {string} input - CSV 文件中的一行
   * @returns {string[]} 解析后的字段数组
   */
  function parseCsvLineRobust(input) {
    const result = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const nextChar = input[i + 1];

      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && nextChar === '"') {
        field += '"';
        i++;
      } else if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        result.push(field.trim());
        field = '';
      } else {
        field += char;
      }
    }
    result.push(field.trim());

    if (input.endsWith(',')) {
        result.push('');
    }

    return result;
  }

  /**
   * 解析一条完整的CSV记录（可能跨越多行）。
   * @param {string[]} lines - CSV文件的所有行
   * @param {number} startIndex - 开始解析的行索引
   * @returns {{values: string[], nextLineIndex: number}} 解析出的字段值数组和下一条记录应开始解析的行索引
   */
  function parseRecord(lines, startIndex) {
      const values = [];
      let field = '';
      let inQuotes = false;
      let i = startIndex; // 当前行索引

      // 循环直到找到记录的结束（即不在引号内且遇到行尾）
      while (i < lines.length) {
          const line = lines[i];
          for (let j = 0; j < line.length; j++) {
              const char = line[j];
              const nextChar = line[j + 1];

              if (char === '"' && !inQuotes) {
                  inQuotes = true;
              } else if (char === '"' && nextChar === '"') {
                  field += '"';
                  j++; // Skip next quote
              } else if (char === '"' && inQuotes) {
                  inQuotes = false;
              } else if (char === ',' && !inQuotes) {
                  values.push(field.trim());
                  field = '';
              } else {
                  field += char;
              }
          }

          // 检查当前字段是否在引号内
          if (inQuotes) {
              // 如果在引号内，当前行结束不代表记录结束，需要添加换行符并继续下一行
              field += '\n';
              i++;
          } else {
              // 如果不在引号内，且到达行尾，则记录结束
              // 添加最后一个字段
              values.push(field.trim());
              // 如果行以逗号结尾，需要添加一个空字段
              if (line.endsWith(',')) {
                  values.push('');
              }
              i++; // 移动到下一行开始
              break; // 退出循环
          }
      }

      return { values, nextLineIndex: i };
  }

  /**
   * 辅助函数：检查一个字符串是否看起来像一个有效的 JSON 对象或数组字符串
   * @param {any} str - 要检查的值
   * @returns {boolean} 如果是有效的 JSON 字符串则返回 true，否则 false
   */
  function isJsonString(str) {
    if (typeof str !== 'string') {
      return false;
    }
    const trimmedStr = str.trim();
    // 必须以 { 或 [ 开头，并以 } 或 ] 结尾
    if (!((trimmedStr.startsWith('{') && trimmedStr.endsWith('}')) ||
          (trimmedStr.startsWith('[') && trimmedStr.endsWith(']')))) {
      return false;
    }
    // 进行一次快速的 JSON.parse 测试
    try {
      JSON.parse(trimmedStr);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 辅助函数：为导入功能专门处理日期时间字符串
   * @param {string} dateTimeString - 从 CSV 读取的日期时间字符串
   * @returns {string|null} 格式化后的日期时间字符串 (sv-SE 格式) 或 null
   */
  function handleDateChangeForImport(dateTimeString) {
    if (!dateTimeString || typeof dateTimeString !== 'string') {
      return null;
    }

    let dateObj = null;
    const trimmedValue = dateTimeString.trim();

    // 尝试解析 sv-SE 格式 "yyyy-MM-dd hh:mm:ss"
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmedValue)) {
      const isoString = trimmedValue.replace(' ', 'T');
      dateObj = new Date(isoString);
    }
    // 尝试解析带 T 的 ISO 格式 "yyyy-MM-ddThh:mm:ss" 或 "yyyy-MM-ddThh:mm"
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(trimmedValue)) {
      dateObj = new Date(trimmedValue);
    }
    // 尝试解析斜杠格式 "yyyy/MM/dd hh:mm:ss" 或 "yyyy/M/d H:m:s"
    else if (/^\d{4}\/\d{1,2}\/\d{1,2}( \d{1,2}:\d{1,2}(:\d{1,2})?)?$/.test(trimmedValue)) {
      dateObj = new Date(trimmedValue);
    }

    // 如果解析成功且是有效日期，则格式化
    if (dateObj && !isNaN(dateObj.getTime())) {
      return dateObj.toLocaleString('sv-SE');
    } else {
      console.warn(`导入时无法解析日期时间字符串: '${dateTimeString}'`);
      return null; // 或者返回原始字符串？取决于需求
    }
  }


  // 日历-日志
  // 日历视图：在 TaskTab.js 中添加新的状态来管理日志弹窗
  // 添加日期格式化函数
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
  };
  const getFilteredTasksForCalendar = useCallback((date) => {
    // 获取指定日期的所有任务
    const dateStr = formatDate(date);
    const tasksForDate = tasks.filter(task =>
      task.complete_time && formatDate(new Date(task.complete_time)) === dateStr
    );

    // 应用搜索过滤
    if (!searchTerm) return tasksForDate;

    const term = searchTerm.toLowerCase();
    return tasksForDate.filter(task =>
      task.description?.toLowerCase().includes(term) ||
      task.category?.toLowerCase().includes(term) ||
      task.domain?.toLowerCase().includes(term) ||
      task.priority?.toLowerCase().includes(term) ||
      task.notes?.toLowerCase().includes(term)
    );
  }, [tasks, searchTerm]);


  // 在 TaskTab 组件的顶部添加状态
  const [isDailyLogMaximized, setIsDailyLogMaximized] = useState(false);


  // 切换最大化状态的函数也移到 TaskTab 组件中
  // const toggleDailyLogMaximize = () => {
  //   setIsDailyLogMaximized(!isDailyLogMaximized);
  // };
  const toggleDailyLogViewMode = () => {
    if (dailyLogViewMode === 'normal') {
      // 从普通状态切换到最大化
      setIsDailyLogMaximized(true);
      setDailyLogViewMode('maximized');
    } else if (dailyLogViewMode === 'maximized') {
      // 从最大化切换到全屏
      setIsDailyLogMaximized(true);
      // 通知 MarkdownEditor 进入全屏模式
      window.dispatchEvent(new CustomEvent('setMarkdownEditorFullscreen', {
        detail: { fullscreen: true }
      }));
      setDailyLogViewMode('fullScreen');
    } else {
      // 从全屏切换回普通状态
      setIsDailyLogMaximized(false);
      // 通知 MarkdownEditor 退出全屏模式
      window.dispatchEvent(new CustomEvent('setMarkdownEditorFullscreen', {
        detail: { fullscreen: false }
      }));
      setDailyLogViewMode('normal');
    }
  };


  // 添加切换日期格子展开状态的函数
  const toggleDayExpansion = (dateKey) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };


  const closeDailyLog = () => {
    setShowDailyLog(false);
    setSelectedDate(null);
    setIsDailyLogMaximized(false); // 关闭时重置最大化状态
  };

  const openDailyLog = async (dateInfo) => {
    setSelectedDate(dateInfo);
    setShowDailyLog(true);

    // 加载日志内容
    const content = await loadDailyLogContent(dateInfo);
    setDailyLogContent(content);
  };

  // 添加统一的日志文件名生成函数
  const generateLogFileName = (dateInfo) => {
    console.log(`生成日志文件名: ${dateInfo}`)
    if (dateInfo.isStatView) {
      if (dateInfo.statType === 'week') {
        const startDateStr = `${dateInfo.rangeStart.getFullYear()}-${String(dateInfo.rangeStart.getMonth() + 1).padStart(2, '0')}-${String(dateInfo.rangeStart.getDate()).padStart(2, '0')}`;
        const endDateStr = `${dateInfo.rangeEnd.getFullYear()}-${String(dateInfo.rangeEnd.getMonth() + 1).padStart(2, '0')}-${String(dateInfo.rangeEnd.getDate()).padStart(2, '0')}`;
        return `jnl_week_${startDateStr}_${endDateStr}`;
      } else if (dateInfo.statType === 'month') {
        const monthStr = `${dateInfo.rangeStart.getFullYear()}-${String(dateInfo.rangeStart.getMonth() + 1).padStart(2, '0')}`;
        return `jnl_month_${monthStr}`;
      }
    } else {
      return `jnl_${dateInfo.getFullYear()}-${String(dateInfo.getMonth() + 1).padStart(2, '0')}-${String(dateInfo.getDate()).padStart(2, '0')}`;
    }
    return null;
  };

  // 修改日志存在性检查，支持所有类型日志
  const checkLogExistence = async (dateInfo) => {
    try {
      const fileName = generateLogFileName(dateInfo);
      if (!fileName) return false;

      // 对于特殊统计日志，直接检查文件系统
      if (dateInfo.isStatView) {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/jnl/check/${fileName}`);
        const result = await response.json();
        return result.exists;
      } else {
        // 对于日常日志，使用现有的存在性状态
        const dateStr = `${dateInfo.date.getFullYear()}-${String(dateInfo.date.getMonth() + 1).padStart(2, '0')}-${String(dateInfo.date.getDate()).padStart(2, '0')}`;
        return dailyLogExistence[dateStr] || false;
      }
    } catch (error) {
      console.error('检查日志存在性时出错:', error);
      return false;
    }
  };

  // 添加加载日志内容的函数
  const loadDailyLogContent = async (dateInfo) => {
    setLoadingLog(true);
    try {
      let fileId;

      if (dateInfo.isStatView) {
        // 特殊日志类型处理
        if (dateInfo.statType === 'week') {
          const startDateStr = `${dateInfo.rangeStart.getFullYear()}-${String(dateInfo.rangeStart.getMonth() + 1).padStart(2, '0')}-${String(dateInfo.rangeStart.getDate()).padStart(2, '0')}`;
          const endDateStr = `${dateInfo.rangeEnd.getFullYear()}-${String(dateInfo.rangeEnd.getMonth() + 1).padStart(2, '0')}-${String(dateInfo.rangeEnd.getDate()).padStart(2, '0')}`;
          fileId = `jnl_week_${startDateStr}_${endDateStr}`;
        } else if (dateInfo.statType === 'month') {
          const monthStr = `${dateInfo.rangeStart.getFullYear()}-${String(dateInfo.rangeStart.getMonth() + 1).padStart(2, '0')}`;
          fileId = `jnl_month_${monthStr}`;
        }
      } else {
        // 普通日志处理
        const dateObj = dateInfo.date || dateInfo; // 兼容直接传递 Date 对象的情况
        const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        fileId = `jnl_${dateStr}`;
      }

      if (!fileId) {
        return '';
      }

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/load-markdown-file/${fileId}`);
      const result = await response.json();

      if (response.ok) {
        return result.content || '';
      }
      return ''; // 返回空内容作为默认值
    } catch (error) {
      console.error('加载日志内容时出错:', error);
      return ''; // 返回空内容作为默认值
    } finally {
      setLoadingLog(false);
    }
  };


  // 添加获取当天统计数据的函数
  const getDailyStatistics = (date) => {
    if (!date) return {};

    // 使用本地时区格式化日期
    const localDateString = date.toLocaleDateString('sv-SE'); // 格式为 YYYY-MM-DD

    // 筛选当天完成的任务
    const dayTasks = tasks.filter(task => {
      // if (task.status !== '已完成') return false;
      if (!task.complete_time) return false;

      // 将任务完成时间也格式化为 YYYY-MM-DD 格式进行比较
      const taskCompleteDate = new Date(task.complete_time);
      const taskCompleteDateString = taskCompleteDate.toLocaleDateString('sv-SE');

      // console.log(`任务完成日期: ${taskCompleteDateString}, 目标日期: ${localDateString}`);
      return taskCompleteDateString === localDateString;
    });

    // 按类别统计
    const byCategory = {};
    // 按领域统计
    const byDomain = {};
    // 按优先级统计
    const byPriority = {};

    let totalExp = 0;
    let totalCredits = {};

    dayTasks.forEach(task => {
      // 类别统计
      const category = task.category || '未分类';
      byCategory[category] = (byCategory[category] || 0) + 1;

      // 领域统计
      const domain = task.domain || '未指定';
      byDomain[domain] = (byDomain[domain] || 0) + 1;

      // 优先级统计
      const priority = task.priority || '未指定';
      byPriority[priority] = (byPriority[priority] || 0) + 1;

      // 经验值统计
      if (task.exp_reward) {
        totalExp += task.exp_reward;
      }

      // 积分奖励统计
      if (task.credits_reward) {
        Object.entries(task.credits_reward).forEach(([type, amount]) => {
          totalCredits[type] = (totalCredits[type] || 0) + amount;
        });
      }
    });

    return {
      totalTasks: dayTasks.length,
      byCategory,
      byDomain,
      byPriority,
      totalExp,
      totalCredits,
      tasks: dayTasks
    };
  };

  const fetchDailyLogList = async () => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/jnl/list`);
      const result = await response.json();

      if (response.ok) {
        // 将返回的日期列表转换为存在性映射
        const existenceMap = {};
        result.logs.forEach(dateStr => {
          existenceMap[dateStr] = true;
        });
        setDailyLogExistence(existenceMap);
        return existenceMap;
      }
      return {};
    } catch (error) {
      console.error('获取日志文件列表时出错:', error);
      return {};
    }
  };

  // 添加删除日志文件的函数
  const deleteDailyLog = async (dateInfo) => {
    try {
      let fileName;

      if (dateInfo.isStatView) {
        // 特殊日志类型处理
        if (dateInfo.statType === 'week') {
          const startDateStr = `${dateInfo.rangeStart.getFullYear()}-${String(dateInfo.rangeStart.getMonth() + 1).padStart(2, '0')}-${String(dateInfo.rangeStart.getDate()).padStart(2, '0')}`;
          const endDateStr = `${dateInfo.rangeEnd.getFullYear()}-${String(dateInfo.rangeEnd.getMonth() + 1).padStart(2, '0')}-${String(dateInfo.rangeEnd.getDate()).padStart(2, '0')}`;
          fileName = `jnl_week_${startDateStr}_${endDateStr}.md`;
        } else if (dateInfo.statType === 'month') {
          const monthStr = `${dateInfo.rangeStart.getFullYear()}-${String(dateInfo.rangeStart.getMonth() + 1).padStart(2, '0')}`;
          fileName = `jnl_month_${monthStr}.md`;
        }
      } else {
        // 普通日志处理
        const dateObj = dateInfo.date || dateInfo;
        const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        fileName = `jnl_${dateStr}.md`;
      }

      if (!fileName) {
        return false;
      }

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/jnl/delete/${fileName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (response.ok) {
        // 更新日志存在性状态（仅对日常日志）
        if (!dateInfo.isStatView) {
          const dateObj = dateInfo.date || dateInfo;
          const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          setDailyLogExistence(prev => {
            const newExistence = { ...prev };
            delete newExistence[dateStr];
            return newExistence;
          });
        }

        alert(result.message);
        return true;
      } else {
        alert(result.error || '删除日志文件失败');
        return false;
      }
    } catch (error) {
      console.error('删除日志文件时出错:', error);
      alert('删除日志文件时出错: ' + error.message);
      return false;
    }
  };


  // 添加调试日志的 getCalendarStats 函数
  // 修改 getCalendarStats 函数，添加完整的字段统计信息
  const getCalendarStats = (startDate, endDate, periodType = 'day') => {
    if (!startDate || !endDate) return {};

    let currentDate = new Date(startDate);
    const statItems = settings?.calendarViewSettings?.statItems || [];
    const firstDayOfWeek = settings?.calendarViewSettings?.firstDayOfWeek || 0;

    const result = {
      periods: [],
      statItems: {},
      allFieldStats: {
        categories: {},
        domains: {},
        priorities: {},
        credits: {}
      }
    };

    // 初始化 statItems 结构
    statItems.forEach(item => {
      const key = `${item.fieldType}:${item.fieldValue}`;
      result.statItems[key] = {
        fieldType: item.fieldType,
        fieldValue: item.fieldValue,
        data: []
      };
    });

    // 专门处理月统计
    if (periodType === 'month') {
      // 确保获取整个月的正确范围
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      // 获取整个月的统计数据
      const periodStats = getPeriodStatistics(monthStart, monthEnd);

      result.periods.push({
        startDate: monthStart,
        endDate: monthEnd,
        stats: periodStats,
        periodType: periodType
      });

      // 处理配置的统计项
      statItems.forEach(item => {
        const key = `${item.fieldType}:${item.fieldValue}`;
        let value = 0;

        switch (item.fieldType) {
          case 'category':
            value = periodStats.byCategory[item.fieldValue] || 0;
            break;
          case 'domain':
            value = periodStats.byDomain[item.fieldValue] || 0;
            break;
          case 'priority':
            value = periodStats.byPriority[item.fieldValue] || 0;
            break;
          case 'credit':
            value = periodStats.totalCredits[item.fieldValue] || 0;
            break;
          default:
            value = 0;
        }

        result.statItems[key].data.push({
          startDate: monthStart,
          endDate: monthEnd,
          value: value,
          periodType: periodType
        });
      });

      // 添加所有字段的完整统计数据
      result.allFieldStats = {
        categories: { ...periodStats.byCategory },
        domains: { ...periodStats.byDomain },
        priorities: { ...periodStats.byPriority },
        credits: { ...periodStats.totalCredits }
      };
    } else if (periodType === 'week') {
      // 专门处理周统计，确保包含完整一周的数据
      const weekStart = new Date(currentDate);
      const dayDiff = (currentDate.getDay() - firstDayOfWeek + 7) % 7;
      weekStart.setDate(currentDate.getDate() - dayDiff);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // 确保周结束日期不超过传入的结束日期
      if (weekEnd > endDate) {
        weekEnd.setTime(endDate.getTime());
      }

      const periodStats = getPeriodStatistics(weekStart, weekEnd);

      result.periods.push({
        startDate: new Date(weekStart),
        endDate: new Date(weekEnd),
        stats: periodStats,
        periodType: periodType
      });

      // 处理配置的统计项
      statItems.forEach(item => {
        const key = `${item.fieldType}:${item.fieldValue}`;
        let value = 0;

        switch (item.fieldType) {
          case 'category':
            value = periodStats.byCategory[item.fieldValue] || 0;
            break;
          case 'domain':
            value = periodStats.byDomain[item.fieldValue] || 0;
            break;
          case 'priority':
            value = periodStats.byPriority[item.fieldValue] || 0;
            break;
          case 'credit':
            value = periodStats.totalCredits[item.fieldValue] || 0;
            break;
          default:
            value = 0;
        }

        result.statItems[key].data.push({
          startDate: new Date(weekStart),
          endDate: new Date(weekEnd),
          value: value,
          periodType: periodType
        });
      });

      // 添加所有字段的完整统计数据
      result.allFieldStats = {
        categories: { ...periodStats.byCategory },
        domains: { ...periodStats.byDomain },
        priorities: { ...periodStats.byPriority },
        credits: { ...periodStats.totalCredits }
      };
    } else {
      // 保持原有的日统计逻辑
      let loopCount = 0;
      const maxLoops = 1000;

      while (currentDate <= endDate && loopCount < maxLoops) {
        loopCount++;

        let periodEnd;

        // 日统计
        periodEnd = new Date(currentDate);
        periodEnd.setHours(23, 59, 59, 999);
        if (periodEnd > endDate) periodEnd = new Date(endDate);

        const periodStats = getPeriodStatistics(currentDate, periodEnd);

        result.periods.push({
          startDate: new Date(currentDate),
          endDate: new Date(periodEnd),
          stats: periodStats,
          periodType: periodType
        });

        statItems.forEach(item => {
          const key = `${item.fieldType}:${item.fieldValue}`;
          let value = 0;

          switch (item.fieldType) {
            case 'category':
              value = periodStats.byCategory[item.fieldValue] || 0;
              break;
            case 'domain':
              value = periodStats.byDomain[item.fieldValue] || 0;
              break;
            case 'priority':
              value = periodStats.byPriority[item.fieldValue] || 0;
              break;
            case 'credit':
              value = periodStats.totalCredits[item.fieldValue] || 0;
              break;
            default:
              value = 0;
          }

          result.statItems[key].data.push({
            startDate: new Date(currentDate),
            endDate: new Date(periodEnd),
            value: value,
            periodType: periodType
          });
        });

        // 对于日统计，直接使用当天的统计数据
        if (periodType === 'day' && result.periods.length > 0) {
          const periodStats = result.periods[0].stats;
          result.allFieldStats = {
            categories: { ...periodStats.byCategory },
            domains: { ...periodStats.byDomain },
            priorities: { ...periodStats.byPriority },
            credits: { ...periodStats.totalCredits }
          };
        }

        currentDate.setDate(currentDate.getDate() + 1);

        if (currentDate <= new Date(startDate)) {
          currentDate = new Date(endDate);
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        }
      }

      if (loopCount >= maxLoops) {
        console.warn('getCalendarStats 达到最大循环次数限制');
      }
    }

    return result;
  };


  // 添加调试日志的 getCachedCalendarStats 函数
  const getCachedCalendarStats = useCallback((startDate, endDate, periodType = 'week') => {
    // 为月统计生成正确的缓存键
    let cacheKey;
    if (periodType === 'month') {
      // 对于月统计，使用月份作为键
      const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      cacheKey = `month-${monthKey}`;
    } else {
      // 对于周统计和日统计，保持原有逻辑
      cacheKey = `${startDate.toISOString()}-${endDate.toISOString()}-${periodType}`;
    }

    if (calendarStatsCache[cacheKey]) {
      // console.log('从缓存获取数据:', calendarStatsCache[cacheKey]);
      return calendarStatsCache[cacheKey];
    }

    // console.log('缓存中无数据，重新计算...');
    const stats = getCalendarStats(startDate, endDate, periodType);
    setCalendarStatsCache(prev => ({
      ...prev,
      [cacheKey]: stats
    }));
    // console.log('计算完成并缓存数据:', stats);

    return stats;
  }, [calendarStatsCache]);

  // 修改 getPeriodStatistics 函数，确保返回完整的统计信息
  const getPeriodStatistics = (startDate, endDate) => {
    // 标准化日期范围，确保包含完整的开始和结束时间
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 筛选时间段内完成的任务
    const periodTasks = tasks.filter(task => {
      if (!task.complete_time) return false;

      const taskCompleteDate = new Date(task.complete_time);
      // 确保比较时使用相同的日期格式
      return taskCompleteDate >= start && taskCompleteDate <= end;
    });

    // 初始化统计对象
    const byCategory = {};
    const byDomain = {};
    const byPriority = {};
    let totalExp = 0;
    let totalCredits = {};

    periodTasks.forEach(task => {
      // 类别统计
      const category = task.category || '未分类';
      byCategory[category] = (byCategory[category] || 0) + 1;

      // 领域统计
      const domain = task.domain || '未指定';
      byDomain[domain] = (byDomain[domain] || 0) + 1;

      // 优先级统计
      const priority = task.priority || '未指定';
      byPriority[priority] = (byPriority[priority] || 0) + 1;

      // 经验值统计
      if (task.exp_reward) {
        totalExp += task.exp_reward;
      }

      // 积分奖励统计
      if (task.credits_reward) {
        Object.entries(task.credits_reward).forEach(([type, amount]) => {
          totalCredits[type] = (totalCredits[type] || 0) + amount;
        });
      }
    });

    const result = {
      totalTasks: periodTasks.length,
      byCategory,
      byDomain,
      byPriority,
      totalExp,
      totalCredits,
      tasks: periodTasks
    };

    return result;
  };



  // 创建一个共享的位置计算函数
  const calculateTooltipPosition_deprecated1 = (elementRef, tooltipWidth = 300, tooltipHeight = 200) => {
    if (!elementRef.current) return { top: 0, left: 0 };

    const elementRect = elementRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 默认在元素下方显示
    let top = elementRect.bottom + 5;
    let left = elementRect.left;

    // 如果下方空间不足且上方空间足够，则显示在上方
    if (elementRect.bottom + tooltipHeight > viewportHeight && elementRect.top > tooltipHeight) {
      top = elementRect.top - tooltipHeight - 5;
    }

    // 确保提示框底边不会遮挡元素顶边
    if (top + tooltipHeight > elementRect.top) {
      top = elementRect.top - tooltipHeight - 5;
    }

    // 水平位置调整：如果提示框右侧超出屏幕，则向左调整
    if (left + tooltipWidth > viewportWidth) {
      left = Math.max(0, viewportWidth - tooltipWidth);
    }

    // 确保不会超出屏幕边界
    left = Math.max(0, Math.min(left, viewportWidth - tooltipWidth));

    return { top, left };
  };

  // 创建一个可复用的任务提示组件
  const TaskTooltip_deprecated = ({ task, parentRef, isVisible, onClose }) => {
    const tooltipRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (tooltipRef.current && !tooltipRef.current.contains(event.target) &&
            parentRef.current && !parentRef.current.contains(event.target)) {
          onClose();
        }
      };

      if (isVisible) {
        document.addEventListener('click', handleClickOutside);
      }

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, [isVisible, onClose, parentRef]);

    if (!isVisible) return null;

    const position = calculateTooltipPosition(parentRef);

    return ReactDOM.createPortal(
      <div
        ref={tooltipRef}
        className="task-tooltip"
        style={{
          ...position,
          position: 'fixed',
          zIndex: 1000
        }}
      >
        <div className="tooltip-header">
          <strong>{task.name}</strong>
        </div>
        {task.description && (
          <div className="tooltip-field">
            <span className="field-label">描述:</span>
            <span className="field-value">{task.description}</span>
          </div>
        )}
        {task.tags &&(
          <div className="tooltip-field">
            <span className="field-label">标签:</span>
            <span className="field-value">{task.tags || ''}</span>
          </div>
        )}
        <div className="tooltip-field">
          <span className="field-label">类别:</span>
          <span className="field-value">{task.category || '未分类'}</span>
        </div>
        <div className="tooltip-field">
          <span className="field-label">领域:</span>
          <span className="field-value">{task.domain || '无'}</span>
        </div>
        <div className="tooltip-field">
          <span className="field-label">优先级:</span>
          <span className="field-value">{task.priority || '不重要不紧急'}</span>
        </div>
        <div className="tooltip-field">
          <span className="field-label">状态:</span>
          <span className="field-value">{getTaskStatus(task)}</span>
        </div>
        <div className="tooltip-field">
          <span className="field-label">周期:</span>
          <span className="field-value">{task.task_type}</span>
        </div>
        {task.start_time && (
          <div className="tooltip-field">
            <span className="field-label">开始时间:</span>
            <span className="field-value">{task.start_time}</span>
          </div>
        )}

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

      </div>,
      document.body
    );
  };
  const TaskTooltip_deprecated1 = ({ task, parentRef, isVisible, onClose, position = 'bottom' }) => {
    const tooltipRef = useRef(null);

    useEffect(() => {
      if (!isVisible || !parentRef.current || !tooltipRef.current) return;

      const updatePosition = () => {
        const parentRect = parentRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top, left;

        switch (position) {
          case 'bottom':
            // 默认在元素下方显示
            top = parentRect.bottom + 5;
            left = parentRect.left;

            // 如果下方空间不足且上方空间足够，则显示在上方
            if (parentRect.bottom + tooltipRect.height > viewportHeight &&
                parentRect.top > tooltipRect.height) {
              top = parentRect.top - tooltipRect.height - 5;
            }

            // 水平位置调整：如果提示框右侧超出屏幕，则向左调整
            if (left + tooltipRect.width > viewportWidth) {
              left = Math.max(0, viewportWidth - tooltipRect.width);
            }
            break;

          case 'right':
            top = parentRect.top;
            left = parentRect.right + 5;

            // 如果右侧空间不足，则显示在左侧
            if (left + tooltipRect.width > viewportWidth) {
              left = parentRect.left - tooltipRect.width - 5;
            }

            // 垂直位置调整
            if (top + tooltipRect.height > viewportHeight) {
              top = viewportHeight - tooltipRect.height - 5;
            }
            break;

          default:
            top = parentRect.bottom + 5;
            left = parentRect.left;
        }

        // 确保不会超出屏幕边界
        top = Math.max(5, Math.min(top, viewportHeight - tooltipRect.height - 5));
        left = Math.max(5, Math.min(left, viewportWidth - tooltipRect.width - 5));

        tooltipRef.current.style.top = `${top}px`;
        tooltipRef.current.style.left = `${left}px`;
      };

      updatePosition();

      // 监听窗口大小变化
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }, [isVisible, position]);

    if (!isVisible) return null;

    return ReactDOM.createPortal(
      <div
        ref={tooltipRef}
        className="task-tooltip"
        style={{
          position: 'fixed',
          zIndex: 1000,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          minWidth: '200px',
          maxWidth: '300px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{task.name}</h4>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: '12px', color: '#666' }}>
          {task.description && (
            <p style={{ margin: '5px 0' }}>{task.description.substring(0, 100)}...</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span>状态: {task.status || '未完成'}</span>
            <span>进度: {task.completed_count || 0}/{task.max_completions || 1}</span>
          </div>

          {task.category && <div>类别: {task.category}</div>}
          {task.domain && <div>领域: {task.domain}</div>}
          {task.priority && <div>优先级: {task.priority}</div>}
        </div>
      </div>,
      document.body
    );
  };
  // 创建一个新的自定义 Hook 用于处理任务悬停逻辑
  const useTaskTooltip_deprecated = (settings, task) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef(null);

    // 悬停处理逻辑
    const handleMouseEnter = (e) => {
      if (settings.tooltipTrigger === 'disabled') {
        return;
      }

      if (settings.tooltipTrigger === 'hover' ||
          (settings.tooltipTrigger === 'shift' && e.shiftKey)) {
        setShowTooltip(true);
      }
    };

    const handleMouseLeave = () => {
      setShowTooltip(false);
    };

    // 监听键盘事件来控制提示显示 (shift模式)
    useEffect(() => {
      if (settings.tooltipTrigger !== 'shift') return;

      const handleKeyDown = (e) => {
        if (e.key === 'Shift') {
          if (cardRef.current && cardRef.current.matches(':hover')) {
            setShowTooltip(true);
          }
        }
      };

      const handleKeyUp = (e) => {
        if (e.key === 'Shift') {
          setShowTooltip(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
      };
    }, [settings.tooltipTrigger]);

    return {
      showTooltip,
      setShowTooltip,
      cardRef,
      handleMouseEnter,
      handleMouseLeave
    };
  };

  // 添加 useTaskTooltip Hook
  const useTaskTooltip = (settings, task) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const cardRef = useRef(null);

    // 悬停处理逻辑
    const handleMouseEnter = (e) => {
      if (settings.tooltipTrigger === 'disabled') {
        return;
      }

      if (settings.tooltipTrigger === 'hover' ||
          (settings.tooltipTrigger === 'shift' && e.shiftKey)) {
        setShowTooltip(true);
      }
    };

    const handleMouseLeave = () => {
      setShowTooltip(false);
    };

    // 监听键盘事件来控制提示显示 (shift模式)
    useEffect(() => {
      if (settings.tooltipTrigger !== 'shift') return;

      const handleKeyDown = (e) => {
        if (e.key === 'Shift') {
          if (cardRef.current && cardRef.current.matches(':hover')) {
            setShowTooltip(true);
          }
        }
      };

      const handleKeyUp = (e) => {
        if (e.key === 'Shift') {
          setShowTooltip(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
      };
    }, [settings.tooltipTrigger]);

    return {
      showTooltip,
      setShowTooltip,
      cardRef,
      handleMouseEnter,
      handleMouseLeave
    };
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



  // 添加 TaskTooltip 组件
  const TaskTooltip = ({ task, parentRef, isVisible, onClose, position = 'bottom' }) => {
    const tooltipRef = useRef(null);

    useEffect(() => {
      if (!isVisible || !parentRef || !parentRef.current || !tooltipRef.current) return;

      const updatePosition = () => {
        const parentRect = parentRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top, left;

        switch (position) {
          case 'bottom':
            // 默认在元素下方显示
            top = parentRect.bottom + 5;
            left = parentRect.left;

            // 如果下方空间不足且上方空间足够，则显示在上方
            if (parentRect.bottom + tooltipRect.height > viewportHeight &&
                parentRect.top > tooltipRect.height) {
              top = parentRect.top - tooltipRect.height - 5;
            }

            // 水平位置调整：如果提示框右侧超出屏幕，则向左调整
            if (left + tooltipRect.width > viewportWidth) {
              left = Math.max(0, viewportWidth - tooltipRect.width);
            }
            break;

          case 'right':
            top = parentRect.top;
            left = parentRect.right + 5;

            // 如果右侧空间不足，则显示在左侧
            if (left + tooltipRect.width > viewportWidth) {
              left = parentRect.left - tooltipRect.width - 5;
            }

            // 垂直位置调整
            if (top + tooltipRect.height > viewportHeight) {
              top = viewportHeight - tooltipRect.height - 5;
            }
            break;

          default:
            top = parentRect.bottom + 5;
            left = parentRect.left;
        }

        // 确保不会超出屏幕边界
        top = Math.max(5, Math.min(top, viewportHeight - tooltipRect.height - 5));
        left = Math.max(5, Math.min(left, viewportWidth - tooltipRect.width - 5));

        tooltipRef.current.style.top = `${top}px`;
        tooltipRef.current.style.left = `${left}px`;
      };

      updatePosition();

      // 监听窗口大小变化
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }, [isVisible, position]);

    if (!isVisible) return null;

    const categoryInfo = getFieldDisplayInfo('categories', task.category);
    const domainInfo = getFieldDisplayInfo('domains', task.domain);
    const priorityInfo = getFieldDisplayInfo('priorities', task.priority);


    return ReactDOM.createPortal(
      <div
        ref={tooltipRef}
        className="task-tooltip"
        style={{
          position: 'fixed',
          zIndex: 1000,
          backgroundColor: 'floralwhite',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          minWidth: '300px',
          maxWidth: '500px',
          minHeight: '150px',
          maxHeight: '250px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h4 style={{ color:'black', margin: '0 0 8px 0', fontSize: '16px' }}>{task.name}</h4>
        </div>

        <div style={{ fontSize: '14px', color: '#000000' }}>
          {task.description && (
            <p style={{ margin: '5px 0' }}>{task.description.substring(0, 100)}...</p>
          )}

          {/*<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>*/}
          {/*  <span> {task.status || '未完成'}</span>*/}
          {/*  <span>{task.completed_count || 0}/{task.max_completions || 1}</span>*/}
          {/*</div>*/}

          {/*{task.category && <div>类别: {task.category}</div>}*/}
          {/*{task.domain && <div>领域: {task.domain}</div>}*/}
          {/*{task.priority && <div>优先级: {task.priority}</div>}*/}

          <span>{task.status || '未完成'} ({task.completed_count || 0}/{task.max_completions || 1})</span>
          <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {task.category && <span style={{ background: categoryInfo.color, padding: '2px 5px', borderRadius: '3px' }}>{task.category}</span>}
            {task.domain && <span style={{ background: domainInfo.color, padding: '2px 5px', borderRadius: '3px' }}>{task.domain}</span>}
            {task.priority && <span style={{  background: priorityInfo.color, padding: '2px 5px', borderRadius: '3px' }}>{task.priority}</span>}
          </div>

          {task.tags && task.tags.map((tag, index) => (
            <span
              key={index}
              className="markdown-tag"
              style={{ cursor: 'pointer' }}
            >
              {tag}
            </span>
          ))}


          <div className="task-hover-rewards">
            <span className="reward-item" title="经验值">⚔{task.exp_reward || 0}</span>
            {task.credits_reward && Object.entries(task.credits_reward).map(([type, amount]) => {
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

        </div>
      </div>,
      document.body
    );
  };



  // 创建一个共享的位置计算函数
  const calculateTooltipPosition = (elementRef, tooltipWidth = 300, tooltipHeight = 200) => {
    if (!elementRef.current) return { top: 0, left: 0 };

    const elementRect = elementRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 默认在元素下方显示
    let top = elementRect.bottom + 5;
    let left = elementRect.left;

    // 如果下方空间不足且上方空间足够，则显示在上方
    if (elementRect.bottom + tooltipHeight > viewportHeight && elementRect.top > tooltipHeight) {
      top = elementRect.top - tooltipHeight - elementRect.bottom + elementRect.top -15;
    }

    // 水平位置调整：如果提示框右侧超出屏幕，则向左调整
    if (left + tooltipWidth > viewportWidth) {
      left = Math.max(0, viewportWidth - tooltipWidth);
    }

    // 确保不会超出屏幕边界
    left = Math.max(0, Math.min(left, viewportWidth - tooltipWidth));

    return { top, left };
  };





  // 在 CalendarTaskCard 组件外部添加这个变量来跟踪当前打开的菜单ID
  let currentlyOpenMenuId = null;
  let closeMenuCallback = null;

  // CalendarTaskCard 组件
  const CalendarTaskCard = ({ task, viewSettings, borderStyle }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const cardRef = useRef(null);
    const menuRef = useRef(null);
    const clickTimeout = useRef(null);

    // 当组件挂载和卸载时处理菜单状态
    useEffect(() => {
      // 如果当前菜单是打开的，注册为当前打开的菜单
      if (showMenu) {
        currentlyOpenMenuId = task.id;
        closeMenuCallback = () => setShowMenu(false);
      }

      return () => {
        // 组件卸载时，如果这是当前打开的菜单，则清除引用
        if (currentlyOpenMenuId === task.id) {
          currentlyOpenMenuId = null;
          closeMenuCallback = null;
        }
      };
    }, [showMenu, task.id]);

    // 单击处理（显示操作菜单）
    const handleSingleClick = () => {
      // 如果之前有其他菜单打开，先关闭它
      if (currentlyOpenMenuId !== null && currentlyOpenMenuId !== task.id && closeMenuCallback) {
        closeMenuCallback();
      }

      // 切换当前菜单状态
      const newShowMenu = !showMenu;
      setShowMenu(newShowMenu);

      // 更新当前打开的菜单引用
      if (newShowMenu) {
        currentlyOpenMenuId = task.id;
        closeMenuCallback = () => setShowMenu(false);
      } else {
        currentlyOpenMenuId = null;
        closeMenuCallback = null;
      }
    };

    // Alt+单击处理（编辑任务）
    const handleAltClick = () => {
      // 关闭任何打开的菜单
      if (currentlyOpenMenuId !== null && closeMenuCallback) {
        closeMenuCallback();
      }

      setEditingTask(task.id);
      setFormData({
        name: task.name,
        description: task.description,
        task_type: task.task_type,
        max_completions: task.max_completions,
        category: task.category || '未分类',
        domain: task.domain || '无',
        priority: task.priority || '不重要不紧急',
        credits_reward: {...task.credits_reward},
        items_reward: {...task.items_reward},
        start_time: formatDateTime(task.start_time) || '',
        complete_time: formatDateTime(task.complete_time) || '',
        archived: task.archived || false,
        status: task.status || getTaskStatus(task),
        completed_count: task.completed_count || 0,
        total_completion_count: task.total_completion_count || 0,
        exp_reward: task.exp_reward || 0,
        notes: task.notes || '',
        tags: task.tags || [],
      });
    };

    // Ctrl+单击处理（查看任务详情）
    const handleCtrlClick = () => {
      // 关闭任何打开的菜单
      if (currentlyOpenMenuId !== null && closeMenuCallback) {
        closeMenuCallback();
      }

      // 通过自定义事件显示任务详情
      window.dispatchEvent(new CustomEvent('showTaskDetails', {
        detail: { task }
      }));
    };

    // 点击任务卡片处理不同按键组合
    const handleCardClick = (e) => {
      e.stopPropagation();

      // 如果点击的是按钮组或其子元素，不处理卡片点击逻辑
      if (e.target.closest('.task-card-menu') || e.target.closest('.action-button-group')) {
        return;
      }

      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
        clickTimeout.current = null;
      }

      if (e.ctrlKey) {
        handleCtrlClick();
        return;
      }

      if (e.altKey) {
        handleAltClick();
        return;
      }

      handleSingleClick();
    };

    // 悬停处理逻辑
    const handleMouseEnter = (e) => {
      if (settings.tooltipTrigger === 'disabled') {
        return;
      }

      if (settings.tooltipTrigger === 'hover' ||
          (settings.tooltipTrigger === 'shift' && e.shiftKey)) {
        setShowTooltip(true);
      }
    };

    const handleMouseLeave = () => {
      setShowTooltip(false);
    };

    // 监听键盘事件来控制提示显示
    useEffect(() => {
      if (settings.tooltipTrigger !== 'shift') return;

      const handleKeyDown = (e) => {
        if (e.key === 'Shift') {
          if (cardRef.current && cardRef.current.matches(':hover')) {
            setShowTooltip(true);
          }
        }
      };

      const handleKeyUp = (e) => {
        if (e.key === 'Shift') {
          setShowTooltip(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
      };
    }, [settings.tooltipTrigger]);


    // ESC 键监听处理
    useEffect(() => {
      if (!showMenu) return;

      const handleEscKey = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          setShowMenu(false);

          // 清除当前打开的菜单引用
          if (currentlyOpenMenuId === task.id) {
            currentlyOpenMenuId = null;
            closeMenuCallback = null;
          }
        }
      };

      // 添加键盘事件监听器
      document.addEventListener('keydown', handleEscKey);

      // 清理函数
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }, [showMenu, task.id]);

    // 点击其他地方关闭菜单和提示
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (cardRef.current && !cardRef.current.contains(event.target)) {
          // 只有当点击的不是其他任务卡片时才关闭菜单
          if (!event.target.closest('.calendar-task-card')) {
            setShowMenu(false);
            setShowTooltip(false);

            // 清除当前打开的菜单引用
            if (currentlyOpenMenuId === task.id) {
              currentlyOpenMenuId = null;
              closeMenuCallback = null;
            }
          }
        }
      };

      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        if (clickTimeout.current) {
          clearTimeout(clickTimeout.current);
        }
      };
    }, [task.id]);

    // 处理按钮组的位置计算
    useEffect(() => {
      if (!showMenu || !menuRef.current || !cardRef.current) return;

      const menu = menuRef.current;
      const card = cardRef.current;

      // 获取相关元素的位置信息
      const cardRect = card.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // 获取卡片的父容器（日历日期单元格）
      const calendarGrid = card.closest('.calendar-day');
      // 获取日历网格容器及其边界
      const gridRect = calendarGrid ? calendarGrid.getBoundingClientRect() : null;


      // 计算有效的底部边界（优先使用日历网格底部，否则使用视窗底部）
      const effectiveBottomBoundary = gridRect ? gridRect.bottom : viewportHeight;

      // 默认在卡片下方显示
      let top = cardRect.bottom + 5;
      let left = cardRect.left;

      // 检查是否超出底部边界
      const menuBottom = top + menuRect.height;
      if (menuBottom > effectiveBottomBoundary) {
        // 如果超出，则显示在卡片上方
        top = cardRect.top - menuRect.height ;
      }

      // 确保不会超出视窗顶部边界
      if (top < 0) {
        top = 5;
      }

      // 应用位置
      menu.style.position = 'fixed';
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.style.zIndex = '1000';
    }, [showMenu]);

    return (
      <div
        ref={cardRef}
        className={`calendar-task-card ${showMenu ? 'menu-open' : ''}`}
        style={borderStyle}
        onClick={handleCardClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="task-name">
          {task.name && task.name.length > (viewSettings?.maxChars || 15)
            ? task.name.substring(0, viewSettings?.maxChars || 15) + '...'
            : task.name || ''}
        </div>

        <TaskTooltip
          task={task}
          parentRef={cardRef}
          isVisible={showTooltip}
          onClose={() => setShowTooltip(false)}
        />

        {showMenu && (
          <div
            ref={menuRef}
            className="task-card-menu calendar-view-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <ActionButtonGroup
              taskId={task.id}
              task={task}
              onEdit={(taskId) => {
                // 关闭菜单
                setShowMenu(false);
                if (currentlyOpenMenuId === task.id) {
                  currentlyOpenMenuId = null;
                  closeMenuCallback = null;
                }

                setEditingTask(taskId);
                setFormData({
                  name: task.name,
                  description: task.description,
                  task_type: task.task_type,
                  max_completions: task.max_completions,
                  category: task.category || '未分类',
                  domain: task.domain || '无',
                  priority: task.priority || '不重要不紧急',
                  credits_reward: {...task.credits_reward},
                  items_reward: {...task.items_reward},
                  start_time: formatDateTime(task.start_time) || '',
                  complete_time: formatDateTime(task.complete_time) || '',
                  archived: task.archived || false,
                  status: task.status || getTaskStatus(task),
                  completed_count: task.completed_count || 0,
                  total_completion_count: task.total_completion_count || 0,
                  exp_reward: task.exp_reward || 0,
                  notes: task.notes || '',
                  tags: task.tags || [],
                });
              }}
              onDelete={handleDeleteTask}
              onComplete={handleCompleteTask}
              onArchive={handleArchiveTask}
              onCopy={copyTask}
              taskViewMode="calendarView"
            />
          </div>
        )}
      </div>
    );
  };


  // 修改日历视图渲染函数
  const renderCalendarView = () => {
    // 生成年份选项（前后各10年）
    const yearOptions = [];
    const currentYearValue = new Date().getFullYear();
    for (let i = currentYearValue - 10; i <= currentYearValue + 10; i++) {
      yearOptions.push(i);
    }

    // 生成月份选项
    const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

    // 处理月份切换
    const handlePrevMonth = () => {
      if (calendarMonth === 1) {
        setCalendarMonth(12);
        setCalendarYear(calendarYear - 1);
      } else {
        setCalendarMonth(calendarMonth - 1);
      }
      setCurrentWeekIndex(0); // 重置周索引
    };

    const handleNextMonth = () => {
      if (calendarMonth === 12) {
        setCalendarMonth(1);
        setCalendarYear(calendarYear + 1);
      } else {
        setCalendarMonth(calendarMonth + 1);
      }
      setCurrentWeekIndex(0); // 重置周索引
    };

    // 生成日历网格
    const generateCalendarGrid = () => {
      const firstDay = new Date(calendarYear, calendarMonth - 1, 1);
      const lastDay = new Date(calendarYear, calendarMonth, 0);
      const firstDayOfWeek = getFirstDayOfWeek();

      // 计算需要显示的第一天
      let start = new Date(firstDay);
      const dayDiff = (firstDay.getDay() - firstDayOfWeek + 7) % 7;
      start.setDate(firstDay.getDate() - dayDiff);

      // 计算需要显示的最后一天
      let end = new Date(lastDay);
      const endDayDiff = (lastDay.getDay() - firstDayOfWeek + 7) % 7;
      end.setDate(lastDay.getDate() + (6 - endDayDiff));

      // 生成日历网格
      const grid = [];
      const current = new Date(start);

      while (current <= end) {
        const isCurrentMonth = current.getMonth() === firstDay.getMonth();

        // 使用 filteredAndSortedTasks 而不是原始 tasks，这样可以应用所有筛选条件包括搜索
        const dayTasks = filteredAndSortedTasks.filter(task => {
          // 使用 calendarDateField 状态确定基于哪个字段过滤
          if (!task[calendarDateField]) return false;
          const taskDate = new Date(task[calendarDateField]);
          return taskDate.toDateString() === current.toDateString();
        });

        grid.push({
          date: new Date(current),
          isCurrentMonth,
          tasks: dayTasks,
          taskCount: dayTasks.length
        });

        current.setDate(current.getDate() + 1);
      }

      return grid;
    };

    // 获取统计项配置
    const statItems = calendarViewSettings?.statItems || [];

    // 计算月度统计
    const calculateMonthStats = () => {
      const monthStart = new Date(calendarYear, calendarMonth - 1, 1);
      const monthEnd = new Date(calendarYear, calendarMonth, 0);
      monthEnd.setHours(23, 59, 59, 999);

      return getPeriodStatistics(monthStart, monthEnd);
    };

    const monthStats = calculateMonthStats();

    // 星期名称（根据设置调整顺序）
    const firstDayOfWeek = getFirstDayOfWeek();
    const weekdays = firstDayOfWeek === 1 ?
      ['一', '二', '三', '四', '五', '六', '日'] :
      ['日', '一', '二', '三', '四', '五', '六'];

    // 将日历网格按周分组
    const calendarGrid = generateCalendarGrid();
    const weeks = [];
    for (let i = 0; i < calendarGrid.length; i += 7) {
      weeks.push(calendarGrid.slice(i, i + 7));
    }

    // 修改统计信息列中的"查看日志"按钮为右上角图标按钮
    const renderCalendarStatsCell = (currentDate, isLastWeek = false, monthStats, statItems) => {
      if (!showCalendarStats) return null;

      // 计算本周开始和结束日期
      const firstDayOfWeek = getFirstDayOfWeek();
      const weekStart = new Date(currentDate);
      const dayDiff = (currentDate.getDay() - firstDayOfWeek + 7) % 7;
      weekStart.setDate(currentDate.getDate() - dayDiff);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // 关键修复：使用 calendarYear 和 calendarMonth 来确定当前显示的月份
      const calendarDisplayMonth = new Date(calendarYear, calendarMonth - 1, 1);
      const monthStart = new Date(calendarDisplayMonth.getFullYear(), calendarDisplayMonth.getMonth(), 1);
      const monthEnd = new Date(calendarDisplayMonth.getFullYear(), calendarDisplayMonth.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      // const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      // const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // 创建打开日志的处理函数
      const handleOpenLog = (isMonth) => {
        if (isMonth) {
          const monthDateInfo = {
            isStatView: true,
            statType: 'month',
            rangeStart: monthStart,
            rangeEnd: monthEnd
          };
          openDailyLog(monthDateInfo);
        } else {
          const weekDateInfo = {
            isStatView: true,
            statType: 'week',
            rangeStart: weekStart,
            rangeEnd: weekEnd
          };
          openDailyLog(weekDateInfo);
        }
      };

      return (
        <div
          className="calendar-day stats-cell"
          onClick={(e) => {
            // 防止点击按钮时触发整体点击事件
            if (e.target.tagName !== 'BUTTON') {
              handleOpenLog(isLastWeek);
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          {isLastWeek ? (
            <div className="month-stats">
              <div className="stats-header">
                <div className="stats-title">本月完成</div>
                <button
                  className="icon-button"
                  style={{
                    background: 'transparent',
                    color: '#333',
                    position: 'absolute',
                    top: '5px',
                    right: '5px'
                  }}
                  onClick={() => handleOpenLog(true)}
                  title="查看月度日志"
                >
                  📝
                </button>
              </div>
              <div className="stats-content">
                <div>总任务: {monthStats.totalTasks}</div>
                <div>总经验: {monthStats.totalExp}</div>
              </div>
              <div className="stats-items">
                {statItems.map((item, index) => {
                  const { fieldType, fieldValue } = item;
                  let displayValue = 0;
                  let fieldLabel = '';

                  try {
                    const stats = getCachedCalendarStats(monthStart, monthEnd, 'month');

                    const statKey = `${fieldType}:${fieldValue}`;
                    if (stats && stats.statItems && stats.statItems[statKey] &&
                        stats.statItems[statKey].data && stats.statItems[statKey].data.length > 0) {
                      displayValue = stats.statItems[statKey].data[0].value;
                    }
                  } catch (e) {
                    console.error(`获取月度统计项 ${fieldType}:${fieldValue} 失败:`, e);
                  }

                  switch (fieldType) {
                    case 'credit':
                      fieldLabel = '积分';
                      break;
                    case 'category':
                      fieldLabel = '类别';
                      break;
                    case 'domain':
                      fieldLabel = '领域';
                      break;
                    case 'priority':
                      fieldLabel = '优先级';
                      break;
                    default:
                      fieldLabel = fieldType;
                  }

                  return (
                    <div key={index} className="stat-item">
                      <span className="stat-label">
                        {fieldLabel}: {fieldValue}
                      </span>
                      <span className="stat-count">{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="week-stats">
              <div className="stats-header">
                <div className="stats-title">本周完成</div>
                  <button
                    className="icon-button"
                    style={{
                      background: 'transparent',
                      color: '#333',
                      position: 'absolute',
                      top: '5px',
                      right: '5px'
                    }}
                    onClick={() => handleOpenLog(false)}
                    title="查看周度日志"
                  >
                    📝
                  </button>
              </div>
              <div className="stats-items">
                <div className="stat-item">
                  <span className="stat-label">任务：</span>
                  <span className="stat-count">
                    {(() => {
                      try {
                        const stats = getCachedCalendarStats(weekStart, weekEnd, 'week');
                        return stats.periods[0]?.stats?.totalTasks || 0;
                      } catch (e) {
                        console.error("获取任务统计失败:", e);
                        return 0;
                      }
                    })()}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">经验：</span>
                  <span className="stat-count">
                    {(() => {
                      try {
                        const stats = getCachedCalendarStats(weekStart, weekEnd, 'week');
                        return stats.periods[0]?.stats?.totalExp || 0;
                      } catch (e) {
                        console.error("获取经验统计失败:", e);
                        return 0;
                      }
                    })()}
                  </span>
                </div>

                {statItems.map((item, index) => {
                  const { fieldType, fieldValue } = item;
                  let displayValue = 0;
                  let fieldLabel = '';

                  try {
                    const stats = getCachedCalendarStats(weekStart, weekEnd, 'week');

                    const statKey = `${fieldType}:${fieldValue}`;
                    if (stats.statItems[statKey] && stats.statItems[statKey].data.length > 0) {
                      displayValue = stats.statItems[statKey].data[0].value;
                    }
                  } catch (e) {
                    console.error(`获取统计项 ${fieldType}:${fieldValue} 失败:`, e);
                  }

                  switch (fieldType) {
                    case 'credit':
                      fieldLabel = '积分';
                      break;
                    case 'category':
                      fieldLabel = '类别';
                      break;
                    case 'domain':
                      fieldLabel = '领域';
                      break;
                    case 'priority':
                      fieldLabel = '优先级';
                      break;
                    default:
                      fieldLabel = fieldType;
                  }

                  return (
                    <div key={index} className="stat-item">
                      <span className="stat-label">
                        {fieldLabel}: {fieldValue}
                      </span>
                      <span className="stat-count">{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    };


    //   return (
    //     <div
    //       className="calendar-day stats-cell"
    //       onClick={(e) => {
    //         // 防止点击按钮时触发整体点击事件
    //         if (e.target.tagName !== 'BUTTON') {
    //           handleOpenLog(isLastWeek);
    //         }
    //       }}
    //       style={{ cursor: 'pointer' }}
    //     >
    //       {isLastWeek ? (
    //         <div className="month-stats">
    //           <div className="stats-header">
    //             <div className="stats-title">本月完成</div>
    //             <button
    //               className="icon-button"
    //               style={{
    //                 background: 'transparent',
    //                 color: '#333',
    //                 position: 'absolute',
    //                 top: '5px',
    //                 right: '5px'
    //               }}
    //               onClick={() => {
    //                 // 为月统计创建特殊标识的日期对象
    //                 const monthDateInfo = {
    //                   isStatView: true,
    //                   statType: 'month',
    //                   rangeStart: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
    //                   rangeEnd: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    //                 };
    //                 openDailyLog(monthDateInfo);
    //               }}
    //               title="查看月度日志"
    //             >
    //               📝
    //             </button>
    //           </div>
    //           <div className="stats-content">
    //             <div>总任务: {monthStats.totalTasks}</div>
    //             <div>总经验: {monthStats.totalExp}</div>
    //           </div>
    //           <div className="stats-items">
    //             {statItems.map((item, index) => {
    //               const { fieldType, fieldValue } = item;
    //               let displayValue = 0;
    //               let fieldLabel = '';
    //
    //               try {
    //                 const stats = getCachedCalendarStats(monthStart, monthEnd, 'month');
    //
    //                 const statKey = `${fieldType}:${fieldValue}`;
    //                 if (stats && stats.statItems && stats.statItems[statKey] &&
    //                     stats.statItems[statKey].data && stats.statItems[statKey].data.length > 0) {
    //                   displayValue = stats.statItems[statKey].data[0].value;
    //                 }
    //               } catch (e) {
    //                 console.error(`获取月度统计项 ${fieldType}:${fieldValue} 失败:`, e);
    //               }
    //
    //               switch (fieldType) {
    //                 case 'credit':
    //                   fieldLabel = '积分';
    //                   break;
    //                 case 'category':
    //                   fieldLabel = '类别';
    //                   break;
    //                 case 'domain':
    //                   fieldLabel = '领域';
    //                   break;
    //                 case 'priority':
    //                   fieldLabel = '优先级';
    //                   break;
    //                 default:
    //                   fieldLabel = fieldType;
    //               }
    //
    //               return (
    //                 <div key={index} className="stat-item">
    //                   <span className="stat-label">
    //                     {fieldLabel}: {fieldValue}
    //                   </span>
    //                   <span className="stat-count">{displayValue}</span>
    //                 </div>
    //               );
    //             })}
    //           </div>
    //         </div>
    //       ) : (
    //         <div className="week-stats">
    //           <div className="stats-header">
    //             <div className="stats-title">本周完成</div>
    //               <button
    //                 className="icon-button"
    //                 style={{
    //                   background: 'transparent',
    //                   color: '#333',
    //                   position: 'absolute',
    //                   top: '5px',
    //                   right: '5px'
    //                 }}
    //                 onClick={() => {
    //                   // 为周统计创建特殊标识的日期对象
    //                   const weekDateInfo = {
    //                     isStatView: true,
    //                     statType: 'week',
    //                     rangeStart: weekStart,
    //                     rangeEnd: weekEnd
    //                   };
    //                   openDailyLog(weekDateInfo);
    //                 }}
    //                 title="查看周度日志"
    //               >
    //                 📝
    //               </button>
    //           </div>
    //           <div className="stats-items">
    //             <div className="stat-item">
    //               <span className="stat-label">任务：</span>
    //               <span className="stat-count">
    //                 {(() => {
    //                   try {
    //                     const stats = getCachedCalendarStats(weekStart, weekEnd, 'week');
    //                     return stats.periods[0]?.stats?.totalTasks || 0;
    //                   } catch (e) {
    //                     console.error("获取任务统计失败:", e);
    //                     return 0;
    //                   }
    //                 })()}
    //               </span>
    //             </div>
    //             <div className="stat-item">
    //               <span className="stat-label">经验：</span>
    //               <span className="stat-count">
    //                 {(() => {
    //                   try {
    //                     const stats = getCachedCalendarStats(weekStart, weekEnd, 'week');
    //                     return stats.periods[0]?.stats?.totalExp || 0;
    //                   } catch (e) {
    //                     console.error("获取经验统计失败:", e);
    //                     return 0;
    //                   }
    //                 })()}
    //               </span>
    //             </div>
    //
    //             {statItems.map((item, index) => {
    //               const { fieldType, fieldValue } = item;
    //               let displayValue = 0;
    //               let fieldLabel = '';
    //
    //               try {
    //                 const stats = getCachedCalendarStats(weekStart, weekEnd, 'week');
    //
    //                 const statKey = `${fieldType}:${fieldValue}`;
    //                 if (stats.statItems[statKey] && stats.statItems[statKey].data.length > 0) {
    //                   displayValue = stats.statItems[statKey].data[0].value;
    //                 }
    //               } catch (e) {
    //                 console.error(`获取统计项 ${fieldType}:${fieldValue} 失败:`, e);
    //               }
    //
    //               switch (fieldType) {
    //                 case 'credit':
    //                   fieldLabel = '积分';
    //                   break;
    //                 case 'category':
    //                   fieldLabel = '类别';
    //                   break;
    //                 case 'domain':
    //                   fieldLabel = '领域';
    //                   break;
    //                 case 'priority':
    //                   fieldLabel = '优先级';
    //                   break;
    //                 default:
    //                   fieldLabel = fieldType;
    //               }
    //
    //               return (
    //                 <div key={index} className="stat-item">
    //                   <span className="stat-label">
    //                     {fieldLabel}: {fieldValue}
    //                   </span>
    //                   <span className="stat-count">{displayValue}</span>
    //                 </div>
    //               );
    //             })}
    //           </div>
    //         </div>
    //       )}
    //     </div>
    //   );
    // };


    // 在 TaskTab 组件中添加这个函数（在其他函数之后，return 语句之前）
    const renderCalendarFocusingView = () => {
      // 检查是否为移动设备
      const isMobile = window.innerWidth <= 768;

      // 辅助函数：计算最佳展开方向（仅用于移动端）
      const calculateBestExpansionDirection = (columnIndex, isStatsColumn = false) => {
        if (!isMobile) return null;

        // 获取日历网格容器
        const calendarGrid = document.querySelector('.calendar-grid');
        if (!calendarGrid) return 'right';

        // 计算列总数
        const totalColumns = showCalendarStats ? 8 : 7;

        // 获取容器和视窗信息
        const containerRect = calendarGrid.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const baseColumnWidth = containerWidth / totalColumns;

        // 计算当前列的左侧位置（相对于视窗）
        const columnLeftPosition = containerRect.left + (columnIndex * baseColumnWidth);

        // 计算展开后的右侧边界
        const expandedRightPosition = columnLeftPosition + (window.innerWidth * 0.5);

        // 如果展开后超出视窗右侧，则向左展开
        if (expandedRightPosition > window.innerWidth) {
          return 'left';
        }

        // 默认向右展开
        return 'right';
      };

      const handleDayCellClick = (date, e) => {
        // 如果点击的是任务卡片或其子元素，不触发日志打开
        if (e.target.closest('.calendar-task-card') || e.target.closest('.task-card-menu')) {
          return;
        }

        // 原有的日志打开逻辑
        setSelectedDate(date);
        setShowDailyLog(true);
      };


      if (isMobile) {
        // 移动端版本 - 包含智能展开方向判断
        return (
          <div className="calendar-scroll-wrapper">
            <div className={`calendar-grid ${showCalendarStats ? 'with-stats' : ''}`}>
              <div className="calendar-week-header">
                {weekdays.map((day, index) => {
                  const isFocused = focusedColumn === index;
                  const expandDirection = isFocused ? calculateBestExpansionDirection(index) : null;

                  return (
                    <div
                      key={index}
                      className={`calendar-day-header ${isFocused ? 'focused' : ''} ${expandDirection === 'left' ? 'left-expansion' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusedColumn(focusedColumn === index ? null : index);
                      }}
                      style={{
                        cursor: 'pointer',
                        position: 'relative',
                        ...(isFocused ? {
                          width: '50vw',
                          minWidth: '50vw',
                          ...(expandDirection === 'left' ? {
                            marginLeft: '-50vw',
                            transform: 'translateX(100%)'
                          } : {})
                        } : {})
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%'
                      }}>
                        <span>{day}</span>
                      </div>
                      {/* 聚焦状态指示器 */}
                      {isFocused && (
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          fontSize: '10px',
                          color: '#007bff',
                          fontWeight: 'bold'
                        }}>
                          🔍
                     </div>
                      )}
                    </div>
                  );
                })}

                {/* 统计列标题 */}
                {showCalendarStats && (() => {
                  const isFocused = focusedColumn === 7;
                  const expandDirection = isFocused ? calculateBestExpansionDirection(7, true) : null;

                  return (
                    <div
                      className={`calendar-day-header stats-header ${isFocused ? 'focused' : ''} ${expandDirection === 'left' ? 'left-expansion' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusedColumn(focusedColumn === 7 ? null : 7);
                      }}
                      style={{
                        cursor: 'pointer',
                        position: 'relative',
                        ...(isFocused ? {
                          width: '50vw',
                          minWidth: '50vw',
                          ...(expandDirection === 'left' ? {
                            marginLeft: '-50vw',
                            transform: 'translateX(100%)'
                          } : {})
                        } : {})
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%'
                      }}>
                        <span>统计</span>
                      </div>
                      {/* 聚焦状态指示器 */}
                      {isFocused && (
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          right: '2px',
                          fontSize: '10px',
                          color: '#007bff',
                          fontWeight: 'bold'
                        }}>
                          🔍
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 日历内容 - 确保每行都能响应聚焦状态 */}
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="calendar-week">
                  {/* 日期网格列 - 添加聚焦状态支持 */}
                  {week.map((dayInfo, dayIndex) => {
                    // 生成日期的唯一键值
                    const dateKey = `${dayInfo.date.getFullYear()}-${dayInfo.date.getMonth()}-${dayInfo.date.getDate()}`;
                    // 检查该日期是否展开
                    const isExpanded = expandedDays.has(dateKey);
                    // 确定要显示的任务数量
                    const maxTasksToShow = isExpanded ? dayInfo.tasks.length : (calendarViewSettings?.defaultTaskCards || 3);

                    const isFocused = focusedColumn === dayIndex;
                    const expandDirection = isFocused ? calculateBestExpansionDirection(dayIndex) : null;

                    return (
                      <div
                        key={dayIndex}
                        className={`calendar-day ${dayInfo.isCurrentMonth ? 'current-month' : 'other-month'} ${
                          dayInfo.date.toDateString() === new Date().toDateString() ? 'today' : ''
                        } ${focusedColumn !== null && focusedColumn !== dayIndex ? 'collapsed' : ''} ${
                          isFocused ? 'focused' : ''
                        } ${expandDirection === 'left' ? 'left-expansion' : ''}`}
                        onClick={(e) => handleDayCellClick(dayInfo.date, e)}
                        style={{
                          ...(isFocused ? {
                            width: '50vw',
                            minWidth: '50vw',
                            ...(expandDirection === 'left' ? {
                              marginLeft: '-50vw',
                              transform: 'translateX(100%)'
                            } : {})
                          } : {})
                        }}
                      >
                        <div className="day-number">
                          {dayInfo.date.getDate()}
                        </div>

                        {/* 使用 CalendarTaskCard 组件显示任务 */}
                        <div className="day-tasks">
                          {dayInfo.isCurrentMonth && dayInfo.tasks.slice(0, maxTasksToShow).map(task => (
                            <CalendarTaskCard
                              key={task.id}
                              task={task}
                              viewSettings={calendarViewSettings}
                              borderStyle={getTaskCardBorderStyle(task, 'calendar')}
                            />
                          ))}
                          {dayInfo.isCurrentMonth && dayInfo.tasks.length > (calendarViewSettings?.defaultTaskCards || 3) && (
                            <div
                              className="more-tasks"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDayExpansion(dateKey);
                              }}
                            >
                              {isExpanded
                                ? "收起"
                                : `+${dayInfo.tasks.length - (calendarViewSettings?.defaultTaskCards || 3)} 更多`}
                            </div>
                          )}
                        </div>

                        {/* 在右上角添加日志图标 */}
                        {dayInfo.isCurrentMonth && (
                          <div className="day-actions">
                            <button
                              className="log-icon-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                // 确保传递正确的对象结构
                                openDailyLog({ date: dayInfo.date });
                              }}
                              title="查看当日日志"
                            >
                              {dailyLogExistence[`${dayInfo.date.getFullYear()}-${String(dayInfo.date.getMonth()+1).padStart(2, '0')}-${String(dayInfo.date.getDate()).padStart(2, '0')}`] && (
                                <span className="log-file-icon" title="日志已存在">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                  </svg>
                                </span>
                              )}
                              {dayInfo.taskCount}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 统计信息列放在每行的最右侧 - 显示周统计 */}
                  {showCalendarStats && (() => {
                    const isFocused = focusedColumn === 7;
                    const expandDirection = isFocused ? calculateBestExpansionDirection(7, true) : null;

                    return (
                      <div
                        className={`calendar-day stats-cell ${focusedColumn !== null && focusedColumn !== 7 ? 'collapsed' : ''} ${
                          isFocused ? 'focused' : ''
                        } ${expandDirection === 'left' ? 'left-expansion' : ''}`}
                        style={{
                          ...(isFocused ? {
                            width: '50vw',
                            minWidth: '50vw',
                            ...(expandDirection === 'left' ? {
                              marginLeft: '-50vw',
                              transform: 'translateX(100%)'
                            } : {})
                          } : {})
                        }}
                      >
                        {renderCalendarStatsCell(
                          week[0].date,
                          false, // 不是月统计
                          monthStats,
                          statItems
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}

              {/* 月统计行 */}
              {showCalendarStats && (
                <div className="calendar-week month-stats-row">
                  {/* 月统计行的空日期单元格 */}
                  {Array.from({ length: 7 }).map((_, index) => {
                    const isFocused = focusedColumn === index;
                    const expandDirection = isFocused ? calculateBestExpansionDirection(index) : null;

                    return (
                      <div
                        key={index}
                        className={`calendar-day empty-day ${focusedColumn !== null && focusedColumn !== index ? 'collapsed' : ''} ${
                          isFocused ? 'focused' : ''
                        } ${expandDirection === 'left' ? 'left-expansion' : ''}`}
                        style={{
                          ...(isFocused ? {
                            width: '50vw',
                            minWidth: '50vw',
                            ...(expandDirection === 'left' ? {
                              marginLeft: '-50vw',
                              transform: 'translateX(100%)'
                            } : {})
                          } : {})
                        }}
                      >
                      </div>
                    );
                  })}

                  {/* 月统计信息列 */}
                  {(() => {
                    const isFocused = focusedColumn === 7;
                    const expandDirection = isFocused ? calculateBestExpansionDirection(7, true) : null;

                    return (
                      <div
                        className={`calendar-day stats-cell ${focusedColumn !== null && focusedColumn !== 7 ? 'collapsed' : ''} ${
                          isFocused ? 'focused' : ''
                        } ${expandDirection === 'left' ? 'left-expansion' : ''}`}
                        style={{
                          ...(isFocused ? {
                            width: '50vw',
                            minWidth: '50vw',
                            ...(expandDirection === 'left' ? {
                              marginLeft: '-50vw',
                              transform: 'translateX(100%)'
                            } : {})
                          } : {})
                        }}
                      >
                        {renderCalendarStatsCell(
                          weeks.length > 0 ? weeks[0][0].date : new Date(calendarYear, calendarMonth - 1, 1),
                          true, // 是月统计
                          monthStats,
                          statItems
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        );
      } else {
        // PC端版本 - 保持原有的简单实现
        return (
          <div className="calendar-scroll-wrapper">
            <div className={`calendar-grid ${showCalendarStats ? 'with-stats' : ''}`}>
              <div className="calendar-week-header">
                {weekdays.map((day, index) => (
                  <div
                    key={index}
                    className={`calendar-day-header ${focusedColumn === index ? 'focused' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // 点击整个格子切换聚焦状态
                      setFocusedColumn(focusedColumn === index ? null : index);
                    }}
                    style={{
                      cursor: 'pointer',
                      position: 'relative',
                      // 当该列被聚焦时，调整宽度
                      ...(focusedColumn === index ? {
                        width: '50vw',
                        minWidth: '50vw'
                      } : {})
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%'
                    }}>
                      <span>{day}</span>
                    </div>
                    {/* 聚焦状态指示器 */}
                    {focusedColumn === index && (
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        fontSize: '10px',
                        color: '#007bff',
                        fontWeight: 'bold'
                      }}>
                        🔍
                      </div>
                    )}
                  </div>
                ))}

                {/* 统计列标题 */}
                {showCalendarStats && (
                  <div
                    className={`calendar-day-header stats-header ${focusedColumn === 7 ? 'focused' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // 点击整个格子切换聚焦状态 (使用索引7表示统计列)
                      setFocusedColumn(focusedColumn === 7 ? null : 7);
                    }}
                    style={{
                      cursor: 'pointer',
                      position: 'relative',
                      // 当统计列被聚焦时，调整宽度
                      ...(focusedColumn === 7 ? {
                        width: '50vw',
                        minWidth: '50vw'
                      } : {})
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%'
                    }}>
                      <span>统计</span>
                    </div>
                    {/* 聚焦状态指示器 */}
                    {focusedColumn === 7 && (
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        fontSize: '10px',
                        color: '#007bff',
                        fontWeight: 'bold'
                      }}>
                        🔍
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 日历内容 - 确保每行都能响应聚焦状态 */}
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="calendar-week">
                  {/* 日期网格列 - 添加聚焦状态支持 */}
                  {week.map((dayInfo, dayIndex) => {
                    // 生成日期的唯一键值
                    const dateKey = `${dayInfo.date.getFullYear()}-${dayInfo.date.getMonth()}-${dayInfo.date.getDate()}`;
                    // 检查该日期是否展开
                    const isExpanded = expandedDays.has(dateKey);
                    // 确定要显示的任务数量
                    const maxTasksToShow = isExpanded ? dayInfo.tasks.length : (calendarViewSettings?.defaultTaskCards || 3);

                    return (
                      <div
                        key={dayIndex}
                        className={`calendar-day ${dayInfo.isCurrentMonth ? 'current-month' : 'other-month'} ${
                          dayInfo.date.toDateString() === new Date().toDateString() ? 'today' : ''
                        } ${focusedColumn !== null && focusedColumn !== dayIndex ? 'collapsed' : ''} ${
                          focusedColumn === dayIndex ? 'focused' : ''
                        }`}
                        onClick={(e) => handleDayCellClick(dayInfo.date, e)}
                        style={{
                          // 当该列被聚焦时，调整宽度
                          ...(focusedColumn === dayIndex ? {
                            width: '50vw',
                            minWidth: '50vw'
                          } : {})
                        }}
                      >
                        <div className="day-number">
                          {dayInfo.date.getDate()}
                        </div>

                        {/* 使用 CalendarTaskCard 组件显示任务 */}
                        <div className="day-tasks">
                          {dayInfo.isCurrentMonth && dayInfo.tasks.slice(0, maxTasksToShow).map(task => (
                            <CalendarTaskCard
                              key={task.id}
                              task={task}
                              viewSettings={calendarViewSettings}
                              borderStyle={getTaskCardBorderStyle(task, 'calendar')}
                            />
                          ))}
                          {dayInfo.isCurrentMonth && dayInfo.tasks.length > (calendarViewSettings?.defaultTaskCards || 3) && (
                            <div
                              className="more-tasks"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDayExpansion(dateKey);
                              }}
                            >
                              {isExpanded
                                ? "收起"
                                : `+${dayInfo.tasks.length - (calendarViewSettings?.defaultTaskCards || 3)} 更多`}
                            </div>
                          )}
                        </div>

                        {/* 在右上角添加日志图标 */}
                        {dayInfo.isCurrentMonth && (
                          <div className="day-actions">
                            <button
                              className="log-icon-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDailyLog(dayInfo.date);
                              }}
                              title="当日日志"
                            >
                              {dailyLogExistence[`${dayInfo.date.getFullYear()}-${String(dayInfo.date.getMonth()+1).padStart(2, '0')}-${String(dayInfo.date.getDate()).padStart(2, '0')}`] && (
                                <span className="log-file-icon" title="日志已存在">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                  </svg>
                                </span>
                              )}
                              {dayInfo.taskCount}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 统计信息列放在每行的最右侧 - 显示周统计 */}
                  {showCalendarStats && (
                    <div
                      className={`calendar-day stats-cell ${focusedColumn !== null && focusedColumn !== 7 ? 'collapsed' : ''} ${
                        focusedColumn === 7 ? 'focused' : ''
                      }`}
                      style={{
                        // 当统计列被聚焦时，调整宽度
                        ...(focusedColumn === 7 ? {
                          width: '50vw',
                          minWidth: '50vw'
                        } : {})
                      }}
                    >
                      {renderCalendarStatsCell(
                        week[0].date,
                        false, // 不是月统计
                        monthStats,
                        statItems
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* 月统计行 */}
              {showCalendarStats && (
                <div className="calendar-week month-stats-row">
                  {/* 月统计行的空日期单元格 */}
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div
                      key={index}
                      className={`calendar-day empty-day ${focusedColumn !== null && focusedColumn !== index ? 'collapsed' : ''} ${
                        focusedColumn === index ? 'focused' : ''
                      }`}
                      style={{
                        // 当该列被聚焦时，调整宽度
                        ...(focusedColumn === index ? {
                          width: '50vw',
                          minWidth: '50vw'
                        } : {})
                      }}
                    >
                    </div>
                  ))}

                  {/* 月统计信息列 */}
                  <div
                    className={`calendar-day stats-cell ${focusedColumn !== null && focusedColumn !== 7 ? 'collapsed' : ''} ${
                      focusedColumn === 7 ? 'focused' : ''
                    }`}
                    style={{
                      // 当统计列被聚焦时，调整宽度
                      ...(focusedColumn === 7 ? {
                        width: '50vw',
                        minWidth: '50vw'
                      } : {})
                    }}
                  >
                    {renderCalendarStatsCell(
                      weeks.length > 0 ? weeks[0][0].date : new Date(calendarYear, calendarMonth - 1, 1),
                      true, // 是月统计
                      monthStats,
                      statItems
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }
    };

  return (
    <div className="calendar-view">
      {/* 月份导航 */}
      <div className="calendar-header">
        {/* 添加日期字段选择器 */}
        <select
          value={calendarDateField}
          title="选择日期字段"
          style={{ fontSize: '12px'}}
          onChange={(e) => {
            const newValue = e.target.value;
            setCalendarDateField(newValue);
            // 直接保存到 localStorage
            // localStorage.setItem('calendarDateField', newValue);
            userDataManager.setUserData('calendarDateField', newValue);
          }}
        >
          <option value="start_time" style={{ fontSize: '12px' }}>开始时间</option>
          <option value="complete_time" style={{fontSize: '12px'}}>完成时间</option>
        </select>

        <div className="calendar-month-selector">
          <button onClick={handlePrevMonth}>&lt;</button>
          <select
            value={calendarYear}
            onChange={(e) => {
              setCalendarYear(parseInt(e.target.value));
              setCurrentWeekIndex(0);
            }}
          >
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={calendarMonth}
            onChange={(e) => {
              setCalendarMonth(parseInt(e.target.value));
              setCurrentWeekIndex(0);
            }}
          >
            {monthOptions.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <button onClick={handleNextMonth}>&gt;</button>
        </div>

        <button
          onClick={() => setShowCalendarStats(!showCalendarStats)}
          className={showCalendarStats ? 'active' : ''}
          title="显示/隐藏统计"
        >
          📊
        </button>



      </div>

      {/* 横向滚动容器 */}
      <div
        className="calendar-scroll-container"
        ref={calendarScrollRef}
      >
        {renderCalendarFocusingView()}

      </div>
    </div>
  );
  };




  const TaskListSection = ({ tasks }) => {
    const [isTaskListExpanded, setIsTaskListExpanded] = useState(false);

    return (
      <div className="log-section">
        <div className="section-header centered">
          <h3>完成的任务</h3>
        </div>
        <div className="toggle-button-container">
          <button
            className="toggle-button icon-button"
            style={{ background: 'transparent', color: '#333'}}
            onClick={() => setIsTaskListExpanded(!isTaskListExpanded)}
            aria-label={isTaskListExpanded ? '收起任务列表' : '展开任务列表'}
          >
            {isTaskListExpanded ? "▲": "▼"}
          </button>
        </div>

        {isTaskListExpanded && (
          <div className="completed-tasks-list">
            {tasks && tasks.length > 0 ? (
              <ul className="task-name-list">
                {tasks.map(task => (
                  <li key={task.id} className="task-name-item">
                    {task.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>当天没有完成的任务</p>
            )}
          </div>
        )}
      </div>
    );
  };



  // 添加更新标签索引的辅助函数
  const updateTagIndexForFile = (fileId, fileName, content, modifiedTime) => {
    try {
      const tagIndexManager = new TagIndexManager();
      tagIndexManager.updateFileIndex(fileId, fileName, content, modifiedTime);
    } catch (error) {
      console.error('更新标签索引失败:', error);
    }
  };

  const saveDailyLogContent = async (dateInfo, content) => {
    try {
      let fileId;

      if (dateInfo.isStatView) {
        // 特殊日志类型处理
        if (dateInfo.statType === 'week') {
          const startDateStr = `${dateInfo.rangeStart.getFullYear()}-${String(dateInfo.rangeStart.getMonth() + 1).padStart(2, '0')}-${String(dateInfo.rangeStart.getDate()).padStart(2, '0')}`;
          const endDateStr = `${dateInfo.rangeEnd.getFullYear()}-${String(dateInfo.rangeEnd.getMonth() + 1).padStart(2, '0')}-${String(dateInfo.rangeEnd.getDate()).padStart(2, '0')}`;
          fileId = `jnl_week_${startDateStr}_${endDateStr}`;
        } else if (dateInfo.statType === 'month') {
          const monthStr = `${dateInfo.rangeStart.getFullYear()}-${String(dateInfo.rangeStart.getMonth() + 1).padStart(2, '0')}`;
          fileId = `jnl_month_${monthStr}`;
        }
      } else {
        // 普通日志处理
        const dateObj = dateInfo.date || dateInfo;
        const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        fileId = `jnl_${dateStr}`;
      }

      if (!fileId) {
        return false;
      }

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/save-markdown-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: fileId,
          content: content
        })
      });

      const result = await response.json();

      if (response.ok) {
        // 更新日志存在性状态（仅对日常日志）
        if (!dateInfo.isStatView) {
          const dateObj = dateInfo.date || dateInfo;
          const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          setDailyLogExistence(prev => ({
            ...prev,
            [dateStr]: true
          }));
        }

        // 新增：更新标签索引
        updateTagIndexForFile(fileId, fileId, content, new Date().toISOString());

        return true;
      } else {
        console.error('保存日志失败:', result.error);
        return false;
      }
    } catch (error) {
      console.error('保存日志时出错:', error);
      return false;
    }
  };


  const renderDailyLog = () => {
    if (!showDailyLog || !selectedDate) return null;

    // 初始化统计数据
    let dayStats = {
      totalTasks: 0,
      totalExp: 0,
      byCategory: {},
      byDomain: {},
      byPriority: {},
      byCredits: {}
    };

    // 生成日期字符串和文件名
    let dateString = '';
    let fileName = '';
    let dateStr = ''; // 用于日志存在性检查

    // 检查是否是统计视图
    if (selectedDate.isStatView) {
      if (selectedDate.statType === 'month') {
        // 月统计视图
        dateString = `${selectedDate.rangeStart.getFullYear()}年${selectedDate.rangeStart.getMonth() + 1}月`;
        fileName = `jnl_month_${selectedDate.rangeStart.getFullYear()}-${String(selectedDate.rangeStart.getMonth() + 1).padStart(2, '0')}`;

        try {
          const stats = getCalendarStats(selectedDate.rangeStart, selectedDate.rangeEnd, 'month');
          if (stats.periods.length > 0) {
            dayStats = {
              totalTasks: stats.periods[0]?.stats?.totalTasks || 0,
              totalExp: stats.periods[0]?.stats?.totalExp || 0,
              byCategory: stats.allFieldStats?.categories || {},
              byDomain: stats.allFieldStats?.domains || {},
              byPriority: stats.allFieldStats?.priorities || {},
              byCredits: stats.allFieldStats?.credits || {}
            };
          }
        } catch (e) {
          console.error("获取月度统计数据失败:", e);
        }
      } else if (selectedDate.statType === 'week') {
        // 周统计视图
        const startMonth = selectedDate.rangeStart.getMonth() + 1;
        const startDay = selectedDate.rangeStart.getDate();
        const endMonth = selectedDate.rangeEnd.getMonth() + 1;
        const endDay = selectedDate.rangeEnd.getDate();
        const year = selectedDate.rangeStart.getFullYear();

        if (startMonth === endMonth) {
          dateString = `${year}年${startMonth}月${startDay}-${endDay}日`;
        } else {
          dateString = `${year}年${startMonth}月${startDay}日-${endMonth}月${endDay}日`;
        }

        fileName = `jnl_week_${selectedDate.rangeStart.getFullYear()}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}_${selectedDate.rangeEnd.getFullYear()}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

        try {
          const stats = getCalendarStats(selectedDate.rangeStart, selectedDate.rangeEnd, 'week');
          if (stats.periods.length > 0) {
            dayStats = {
              totalTasks: stats.periods[0]?.stats?.totalTasks || 0,
              totalExp: stats.periods[0]?.stats?.totalExp || 0,
              byCategory: stats.allFieldStats?.categories || {},
              byDomain: stats.allFieldStats?.domains || {},
              byPriority: stats.allFieldStats?.priorities || {},
              byCredits: stats.allFieldStats?.credits || {}
            };
          }
        } catch (e) {
          console.error("获取周统计数据失败:", e);
        }
      }
    } else {
      // 普通单日视图
      const year = selectedDate.date ? selectedDate.date.getFullYear() : selectedDate.getFullYear();
      const month = selectedDate.date ? selectedDate.date.getMonth() + 1 : selectedDate.getMonth() + 1;
      const day = selectedDate.date ? selectedDate.date.getDate() : selectedDate.getDate();
      const weekday = ['日', '一', '二', '三', '四', '五', '六'][selectedDate.date ? selectedDate.date.getDay() : selectedDate.getDay()];

      dateString = `${year}年${month}月${day}日 星期${weekday}`;
      fileName = `jnl_${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      try {
        const dateObj = selectedDate.date || selectedDate;
        const dayStart = new Date(dateObj);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dateObj);
        dayEnd.setHours(23, 59, 59, 999);

        const stats = getCalendarStats(dayStart, dayEnd, 'day');
        if (stats.periods.length > 0) {
          dayStats = {
            totalTasks: stats.periods[0]?.stats?.totalTasks || 0,
            totalExp: stats.periods[0]?.stats?.totalExp || 0,
            byCategory: stats.allFieldStats?.categories || {},
            byDomain: stats.allFieldStats?.domains || {},
            byPriority: stats.allFieldStats?.priorities || {},
            byCredits: stats.allFieldStats?.credits || {}
          };
        }
      } catch (e) {
        console.error("获取日统计数据失败:", e);
      }
    }

    return ReactDOM.createPortal(
      <div className="daily-log-modal">
        <div className={`daily-log-content ${isDailyLogMaximized ? 'maximized' : ''}`} ref={modalRef}>
          <div className="daily-log-header">
            <h3>{dateString} 日志</h3>
            <div className="daily-log-actions" style={{ display: 'flex', alignItems: 'center' }}>
              <button
                className="close-button"
                onClick={toggleDailyLogViewMode}
                title={dailyLogViewMode === 'normal' ? "最大化" : dailyLogViewMode === 'maximized' ? "全屏" : "还原"}
              >
                {dailyLogViewMode === 'normal' ? '⛶' : dailyLogViewMode === 'maximized' ? '⛶' : '⇲'}
              </button>
              <button
                onClick={async () => {
                  if (await deleteDailyLog(selectedDate)) {
                    // 刷新日志列表
                    fetchDailyLogList();
                    setShowDailyLog(false);
                    setSelectedDate(null);
                  }
                }}
                className="close-button"
                title="删除日志文件"
              >
                <img
                  src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xNC44ODUgMTcuNXYtMWgzdjF6bTAtOHYtMWg2djF6bTAgNHYtMWg1djF6TTQuMTE1IDhoLTFWN2gzLjczMXYtLjg4NWgyLjUzOFY3aDMuNzMydjFoLTF2MTBoLTh6bTEgMHY5aDZWOHptMCAwdjl6Ii8+PC9zdmc+"
                  alt="删除日志"
                  style={{ width: '30px', height: '30px' }}
                />

              </button>

              <button
                onClick={() => {
                  setShowDailyLog(false);
                  setSelectedDate(null);
                }}
                className="close-button"
              >
                ✕
              </button>

            </div>
          </div>

          {/* 添加统计数据展示 */}
          <div className="log-section">
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">总任务数:</span>
                <span className="stat-value">{dayStats.totalTasks || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">总经验值:</span>
                <span className="stat-value">{dayStats.totalExp || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">按类别:</span>
                <span className="stat-value">
                  {dayStats.byCategory && Object.keys(dayStats.byCategory).length > 0 ? (
                    Object.entries(dayStats.byCategory).map(([category, count]) => (
                      <span key={category} className="stat-sub-item">{category}: {count}</span>
                    ))
                  ) : (
                    <span>无数据</span>
                  )}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">按领域:</span>
                <span className="stat-value">
                  {dayStats.byDomain && Object.keys(dayStats.byDomain).length > 0 ? (
                    Object.entries(dayStats.byDomain).map(([domain, count]) => (
                      <span key={domain} className="stat-sub-item">{domain}: {count}</span>
                    ))
                  ) : (
                    <span>无数据</span>
                  )}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">按优先级:</span>
                <span className="stat-value">
                  {dayStats.byPriority && Object.keys(dayStats.byPriority).length > 0 ? (
                    Object.entries(dayStats.byPriority).map(([priority, count]) => (
                      <span key={priority} className="stat-sub-item">{priority}: {count}</span>
                    ))
                  ) : (
                    <span>无数据</span>
                  )}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">按积分:</span>
                <span className="stat-value">
                  {dayStats.byCredits && Object.keys(dayStats.byCredits).length > 0 ? (
                    Object.entries(dayStats.byCredits).map(([credit, amount]) => (
                      <span key={credit} className="stat-sub-item">{credit}: {amount}</span>
                    ))
                  ) : (
                    <span>无数据</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <MarkdownEditor
            initialValue={dailyLogContent}
            fileName={fileName}
            onSave={async (content) => {
              const success = await saveDailyLogContent(selectedDate, content);
              if (success) {
                // 保存成功后刷新日志列表
                fetchDailyLogList();
              }
              return success;
            }}
            onDelete={selectedDate.isStatView ? null : async () => {
              const success = await deleteDailyLog(selectedDate);
              if (success) {
                // 删除成功后刷新日志列表
                fetchDailyLogList();
                setShowDailyLog(false);
                setSelectedDate(null);
              }
              return success;
            }}
            onCancel={() => {
              setShowDailyLog(false);
              setSelectedDate(null);
            }}
            currentField="calendar-log"
            // codeSettings={codeSettings}
            stats={stats}
            characterSettings={characterSettings}
            taskFieldMappings={taskFieldMappings}
            expFormulas={expFormulas}
            quickAddTaskHint={quickAddTaskHint}
            customDomain={settings.customDomain || ''}
          />
        </div>
      </div>,
      document.body
    );
  };


  // 添加日历任务卡片组件


  // 添加显示更多任务的函数
  const showMoreTasks = (tasks, dateStr) => {
    // 创建一个模态框显示当天所有任务
    const modal = document.createElement('div');
    modal.className = 'more-tasks-modal';
    modal.innerHTML = `    <div class="modal-content">
        <div class="modal-header">
          <h3>${dateStr} 的任务</h3>
          <span class="close-button">&times;</span>
        </div>
        <div class="modal-body">
          ${tasks.map(task => `          <div class="modal-task-item" data-task-id="${task.id}">
              <div class="task-info">
                <div class="task-name">${task.name}</div>
                <div class="task-meta">
                  <span class="task-category">${task.category || '支线任务'}</span>
                  <span class="task-priority">${task.priority || '不重要不紧急'}</span>
                </div>
              </div>
            </div>
          `).join('')}      </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 添加关闭事件
    const closeBtn = modal.querySelector('.close-button');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    // 添加任务点击事件
    const taskItems = modal.querySelectorAll('.modal-task-item');
    taskItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const taskId = parseInt(item.getAttribute('data-task-id'));
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          setEditingTask(taskId);
          setFormData({
            name: task.name,
            description: task.description,
            task_type: task.task_type,
            max_completions: task.max_completions,
            category: task.category || '支线任务',
            domain: task.domain || '无',
            priority: task.priority || '不重要不紧急',
            credits_reward: {...task.credits_reward},
            items_reward: {...task.items_reward},
            start_time: formatDateTime(task.start_time) || '',
            complete_time: formatDateTime(task.complete_time) || '',
            archived: task.archived || false,
            status: task.status || getTaskStatus(task),
            completed_count: task.completed_count || 0,
            total_completion_count: task.total_completion_count || 0,
            exp_reward: task.exp_reward || 0,
            notes: task.notes || '',
            tags: task.tags || [],
          });
          document.body.removeChild(modal);
        }
      });
    });
  };


  // 添加获取任务卡片边框样式的函数
  const getTaskCardBorderStyle = (task, view) => {
    // 检查 borderSettings 是否存在
    if (!borderSettings) {
      return {};
    }

    // 检查是否在启用的视图中
    const isBoardEnabled = borderSettings.top?.enabled?.board ||
                           borderSettings.right?.enabled?.board ||
                           borderSettings.bottom?.enabled?.board ||
                           borderSettings.left?.enabled?.board;

    const isCalendarEnabled = borderSettings.top?.enabled?.calendar ||
                              borderSettings.right?.enabled?.calendar ||
                              borderSettings.bottom?.enabled?.calendar ||
                              borderSettings.left?.enabled?.calendar;

    // 如果视图未启用，返回空样式
    if ((view === 'board' && !isBoardEnabled) ||
        (view === 'calendar' && !isCalendarEnabled)) {
      return {};
    }

    const borderStyles = {};

    // 处理四个边框位置
    ['top', 'right', 'bottom', 'left'].forEach(position => {
      // 检查该位置是否在当前视图中启用
      const isEnabled = borderSettings[position]?.enabled?.[view];



      if (isEnabled) {
        const field = borderSettings[position]?.field;
        const fieldMappingKey = {
                'category': 'categories',
                'domain': 'domains',
                'priority': 'priorities',
                'status': 'statuses'
              }[field];
        // const colors = borderSettings[position]?.colors;
        const mappings = taskFieldMappings[fieldMappingKey];

        if (field && mappings) {
          const fieldValue = task[field];
          const color =mappings[fieldValue]?.color || '#cccccc'; // 默认颜色

          // 根据位置设置边框样式
          switch(position) {
            case 'top':
              borderStyles.borderTop = `4px solid ${color}`;
              break;
            case 'right':
              borderStyles.borderRight = `4px solid ${color}`;
              break;
            case 'bottom':
              borderStyles.borderBottom = `4px solid ${color}`;
              break;
            case 'left':
              borderStyles.borderLeft = `4px solid ${color}`;
              break;
            default:
              break;
          }
        }
      }
    });

    return borderStyles;
  };

  // 在 TaskTab.js 中添加计算任务奖励经验的函数
  const calculateTaskExpReward = (task) => {
    if (!settings || !settings.expFormulas) {
      return 10; // 默认经验奖励
    }

    try {
      const formulaSettings = settings.expFormulas;

      const categoryWeight = task.category ? getFieldWeight('categories', task.category) : 1;
      const domainWeight = task.domain ? getFieldWeight('domains', task.domain) : 1;
      const priorityWeight = task.priority ? getFieldWeight('priorities', task.priority) : 1;

      // 获取角色当前等级
      const level = stats.level || 1;

      // 获取经验倍率设置
      const expMultiplier = formulaSettings.taskExpMultiplier || 1;
      const expCoefficient = formulaSettings.taskExpCoefficient || 0.3;

      // 计算经验结果
      const expResult = expMultiplier * (expCoefficient * level**2 + categoryWeight * domainWeight * priorityWeight * level + 10)

      return Math.max(1, Math.round(expResult)); // 至少为1，保留两位小数
    } catch (e) {
      console.error("公式计算错误:", e);
      // 如果公式错误，返回默认值
      return 1;
    }
  };

  const toggleViewMode = (mode) => {
    setViewMode(mode);
    // 保存到本地存储
    // localStorage.setItem('taskViewMode', mode);
    userDataManager.setUserData('taskViewMode', mode);
  };


  // 处理单个任务选择
  const handleSelectTask = (taskId) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };
  // 处理排序
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 获取排序图标
  const getSortIcon = (field) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // 添加切换行展开状态的函数
  const toggleRowExpansion = (taskId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // 在 useEffect 中添加窗口大小变化监听
  useEffect(() => {
    const handleResize = () => {
      // 在窗口尺寸变化时，如果从移动端切换到桌面端，清除所有展开状态
      if (window.innerWidth > 768) {
        setExpandedRows(new Set());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 在 useEffect 中添加窗口大小变化监听
  useEffect(() => {
    const handleResize = () => {
      // 在窗口尺寸变化时，如果从移动端切换到桌面端，清除所有展开状态
      if (window.innerWidth > 768) {
        setExpandedRows(new Set());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 添加一个 ref 来引用弹窗元素
  const modalRef = useRef(null);

  // 处理点击外部区域关闭弹窗的函数
  const handleClickOutside = useCallback((event) => {
    // 检查点击的元素是否在弹窗外部
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      // 特别处理：检查是否点击了与任务表单相关的下拉菜单元素
      const isClickingTaskFormDropdown = event.target.closest('.item-search-autocomplete') ||
                                       event.target.closest('.autocomplete-dropdown') ||
                                       event.target.closest('.autocomplete-item');

      // 只有当点击的不是任务表单下拉菜单相关元素时，才关闭弹窗
      if (!isClickingTaskFormDropdown) {
        setShowAddForm(false);
        setEditingTask(null);
      }
    }
  }, [setShowAddForm, setEditingTask]);




  // 添加格式化经验值的辅助函数
  const formatExpValue = (exp) => {
    if (exp >= 1000000) {
      return (exp / 1000000).toFixed(1) + 'm';
    } else if (exp >= 10000) {
      return (exp / 10000).toFixed(1) + 'w';
    } else if (exp >= 1000) {
      return (exp / 1000).toFixed(1) + 'k';
    } else {
      return exp.toString();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      task_type: '无循环',
      max_completions: 1,
      category: '支线任务',
      domain: '生活',
      priority: '不重要不紧急',
      credits_reward: {},
      items_reward: {},
      start_time: '',
      complete_time: '',
      archived: false,
      status: '未完成',
      completed_count: 0,
      total_completion_count: 0,
      exp_reward: 0,
      notes: '',
      tags: [],
    });
    setCurrentStep(1); // 重置到第一页
  };

  const renderStepNavigation = () => {
    if (window.innerWidth > 768) return null;
    return (
      <div className="form-step-navigation">
        <button
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          上一步
        </button>

        <span className="step-indicator">
          {currentStep} / {totalSteps}
        </span>

        <button
          onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
          disabled={currentStep === totalSteps}
        >
          下一步
        </button>
      </div>
    );
  };



  // 渲染单个表单字段
  const renderFormField = (field) => {
    // 为需要聚焦的字段（如第一个字段）创建 ref
    const getFieldRef = (fieldName) => {
      if (fieldName === 'name') { // 假设任务名称是第一个字段
        return taskNameInputRef; // 使用已有的 taskNameInputRef
      }
      return null;
    };

    const commonProps = {
      ref: getFieldRef(field.name),
      // 其他通用属性
    };

    switch (field.type) {
      case 'input':
        return (
          <div key={field.name} className="form-field">
            <label>{field.label}：</label>
            <input
              type="text"
              value={formData[field.name] || ''}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  editingTask ? handleUpdateTask() : handleAddTask();
                }
              }}
              onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
              {...(getFieldRef(field.name) ? { ref: getFieldRef(field.name) } : {})}
            />
          </div>
        );
      case 'select':
        return (
          <div key={field.name} className="form-field">
            <label>{field.label}：</label>
            <select
              value={formData[field.name] || ''}
              onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
            >
              {field.options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );
      case 'number':
        return (
          <div key={field.name} className="form-field">
            <label>{field.label}：</label>
            <input
              type="number"
              value={formData[field.name] || 0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  editingTask ? handleUpdateTask() : handleAddTask();
                }
              }}
              onChange={(e) => setFormData({...formData, [field.name]: parseInt(e.target.value) || 0})}
            />
          </div>
        );
      case 'datetime':
        return (
          <div key={field.name} className="form-field">
            <label>{field.label}：</label>
            <input
              type="datetime-local"
              value={formatDateTime(formData[field.name]) || ''}
              onChange={(e) => handleDateChange(field.name, e.target.value)}// setFormData({...formData, [field.name]: e.target.value})}
            />
          </div>
        );
      case 'checkbox':
        return (
          <div key={field.name} className="form-field">
            <label>
              <input
                type="checkbox"
                checked={formData[field.name] || false}
                onChange={(e) => setFormData({...formData, [field.name]: e.target.checked})}
              />
              {field.label}
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  // 在组件中添加图标渲染函数
  const renderItemIcon = (icon, name, size = 20) => {
    if (!icon) return null;

    if (icon.startsWith('http') || icon.startsWith('data:image')) {
      // 处理图片URL
      return (
        <img
          src={icon}
          alt={name}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            objectFit: 'contain'
          }}
        />
      );
    } else {
      // 处理Iconify图标名称，显示首字母作为占位符
      return (
        <span
          className="icon-placeholder"
          title={icon}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: '#f0f0f0',
            borderRadius: '4px',
            fontWeight: 'bold',
            color: '#666',
            fontSize: `${size * 0.4}px`
          }}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      );
    }
  };

  // 渲染奖励部分
  const renderRewardsSection = () => {
    return (
      <>
        <div>
          {/*<h4>积分奖励</h4>*/}
          <div className="reward-item">
            <label>积分奖励：</label>
            <select onChange={(e) => {
              const ctype = e.target.value;
              if (ctype) {
                addCreditReward(ctype);
              }
            }}>
              <option value="">选择积分类型</option>
              {creditTypes
                .filter(type => !(type in formData.credits_reward))
                .map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
            </select>
          </div>
          <div className="reward-item">
            <label>道具奖励：</label>
            <div className="item-search-autocomplete">
              <input
                type="text"
                display="ruby"
                placeholder="搜索道具..."
                value={itemSearch}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              {showDropdown && (
                <div className="autocomplete-dropdown">
                  {filteredItems.length > 0 ? (
                    filteredItems.map(itemName => {
                      // 获取道具信息（包括图标）
                      const itemInfo = items[itemName];
                      const icon = itemInfo?.icon;

                      return (
                        <div
                          key={itemName}
                          className="autocomplete-item"
                          onMouseDown={() => selectItem(itemName)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          {icon && (
                            <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {renderItemIcon(icon, itemName, 20)}
                            </div>
                          )}
                          <span>{itemName}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="autocomplete-item no-results">
                      未找到匹配的道具
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {Object.entries(formData.credits_reward).map(([ctype, amount]) => (
            <div key={ctype} className="reward-item">
              <label>{ctype}{getCreditIcon(ctype)}：</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => updateCreditReward(ctype, e.target.value)}
              />
              <button type="button" onClick={() => removeCreditReward(ctype)}>-</button>
            </div>
          ))}

        </div>

        <div>
          {/*<h4>道具奖励</h4>*/}
          {Object.entries(formData.items_reward).map(([itemName, count]) => (
            <div key={itemName} className="reward-item">
              <label>{getItemIcon(itemName)}{itemName}：</label>
              <input
                type="number"
                value={count}
                onChange={(e) => updateItemReward(itemName, e.target.value)}
              />
              <button type="button" onClick={() => removeItemReward(itemName)}>-</button>
            </div>
          ))}


        </div>

        <div>
          {/*<h4>经验奖励</h4>*/}
          <div className="reward-item">
            <label>经验🎮：</label>
            <input
              type="number"
              value={formData.exp_reward || 0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  editingTask ? handleUpdateTask() : handleAddTask();
                }
              }}
              onChange={(e) => setFormData({...formData, exp_reward: parseInt(e.target.value) || 0})}
              min="0"
            />
          </div>
        </div>
      </>
    );
  };


  const modalStyles = isNoteEditorFullscreen ? {
    maxHeight: '100vh',
  } : {
    maxHeight: '100vh',
    overflowY: 'auto',
  };
  // 移动端任务编辑模态框渲染
  const renderTaskEditModalMobile = () => {
    if (!(showAddForm || editingTask)) {
      return null;
    }
    return (
      <div
          className="task-form-modal"
          ref={modalRef}
          style={{overflowY: 'auto'}}
      >
        <div className="task-form-container vertical-layout wide-layout">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'} }>
            <h4>{editingTask ? `编辑任务 - ${tasks.find(t => t.id === editingTask)?.name}` : '新增任务'}</h4>
            <button className="close-button" onClick={() => {
                setShowAddForm(false);
                setEditingTask(null);
                setItemSearch('');
                resetForm();
            }}>
              x
            </button>
          </div>


          {/* 改为垂直布局 */}
          <div className="task-form-content vertical-layout">
            {/* 基本信息区域 */}
            <div className="form-section">
              <div className="form-field">
                <label>任务名称：</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="form-field">
                <label>任务描述：</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              {fieldSettings.category && (
                <div className="form-field">
                  <label>任务类别：</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    {taskCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              )}

              {fieldSettings.domain && (
                <div className="form-field">
                  <label>任务领域：</label>
                  <select
                    value={formData.domain}
                    onChange={(e) => setFormData({...formData, domain: e.target.value})}
                  >
                    {taskDomains.map(domain => (
                      <option key={domain} value={domain}>{domain}</option>
                    ))}
                  </select>
                </div>
              )}

              {fieldSettings.priority && (
                <div className="form-field">
                  <label>任务优先级：</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  >
                    {taskPriorities.map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-field">
                <label>循环周期：</label>
                <select
                  value={formData.task_type}
                  onChange={(e) => setFormData({...formData, task_type: e.target.value})}
                >
                  {taskCycleTypes.map((cycleType, index) => {
                    // const cycleTypeValues = ['single', 'daily', 'weekly', 'monthly', 'yearly'];
                    const cycleTypeValues = ['无循环', '日循环', '周循环', '月循环', '年循环']
                    return (
                      <option key={cycleType} value={cycleTypeValues[index]}>{cycleType}</option>
                    );
                  })}
                </select>
              </div>

              <div className="form-field">
                <label>最大重复次数 (0=∞)：</label>
                <input
                  type="number"
                  value={formData.max_completions}
                  onChange={(e) => setFormData({...formData, max_completions: parseInt(e.target.value) || 1})}
                />
              </div>

              {(editingTask || showAddForm) && (
                <div className="form-field">
                  <label>开始时间：</label>
                  <input
                    type="datetime-local"
                    value={formatDateTime(formData.start_time) || ''}
                    onChange={(e) => handleDateChange('start_time', e.target.value)}
                  />
                </div>
              )}

              {editingTask && (
                <div className="form-field">
                  <label>完成时间：</label>
                  <input
                    type="datetime-local"
                    value={formatDateTime(formData.complete_time) || ''}
                    onChange={(e) => handleDateChange('complete_time', e.target.value)}//setFormData({...formData, complete_time: e.target.value})}
                  />
                </div>
              )}

              {editingTask && (
                <div className="form-field">
                  <label>完成次数：</label>
                  <input
                    type="number"
                    value={formData.completed_count || 0}
                    onChange={(e) => setFormData({...formData, completed_count: parseInt(e.target.value) || 0})}
                  />
                </div>
              )}

              {editingTask && (
                <div className="form-field">
                  <label>总完成次数：</label>
                  <input
                    type="number"
                    value={formData.total_completion_count || 0}
                    onChange={(e) => setFormData({...formData, total_completion_count: parseInt(e.target.value) || 0})}
                  />
                </div>
              )}
            </div>

            {/* 奖励和状态信息区域 */}
            <div className="form-section">
              {editingTask && (
                <div className="form-field">
                  <label>
                    归档：
                    <input
                      type="checkbox"
                      checked={formData.archived || false}
                      onChange={(e) => setFormData({...formData, archived: e.target.checked})}
                    />
                  </label>
                </div>
              )}

              {editingTask && (
                <div className="form-field">
                  <label>任务状态：</label>
                  <select
                    value={formData.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setFormData({
                        ...formData,
                        status: newStatus
                      });
                    }}
                  >
                    {taskStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-field" style={{display: 'flex', flexDirection: 'column'}}>
                <label style={{textAlign: 'left', alignSelf: 'flex-start'}}>备注：</label>
                <MarkdownEditor
                  initialValue={formData.notes || ''}
                  onSave={(content) => setFormData({...formData, notes: content})}
                  onCancel={null}
                  mdEditorClassNameSuffix="task-notes-editor"
                  embedded={true}
                  currentField="note-editor"
                  // codeSettings={codeSettings}
                  stats={stats}
                  characterSettings={characterSettings}
                  taskFieldMappings={taskFieldMappings}
                  expFormulas={expFormulas}
                  quickAddTaskHint={quickAddTaskHint}
                  defaultViewMode = {calcEmbeddedViewMode(initialNotePreviewMode,initialNotePreviewModeInCard)} // 使用初始预览模式状态
                  // defaultViewMode =  {formData.notes && formData.notes.trim() !== '' ? 'preview' : 'split'}
                  externalSplitDirection="horizontal" // 上下分屏
                  customDomain={settings.customDomain || ''}
                />
              </div>

              <div className="reward-section">
                <div className="form-field">
                  <label>添加积分类型：</label>
                  <select onChange={(e) => {
                    const ctype = e.target.value;
                    if (ctype) {
                      addCreditReward(ctype);
                    }
                  }}>
                    <option value="">选择积分类型</option>
                    {creditTypes
                      .filter(type => !(type in formData.credits_reward))
                      .map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                  </select>
                </div>
                {Object.entries(formData.credits_reward).map(([ctype, amount]) => (
                  <div key={ctype} className="reward-item">
                    <label>{ctype}{getCreditIcon(ctype)}：</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => updateCreditReward(ctype, e.target.value)}
                    />
                    <button type="button" onClick={() => removeCreditReward(ctype)}>-</button>
                  </div>
                ))}
              </div>

              <div className="reward-section">
                <div className="form-field">
                  <label>添加道具：</label>
                  <div className="item-search-autocomplete">
                    <input
                      type="text"
                      placeholder="搜索道具..."
                      value={itemSearch}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                    {showDropdown && (
                      <div className="autocomplete-dropdown">
                        {filteredItems.length > 0 ? (
                          filteredItems.map(itemName => (
                            <div
                              key={itemName}
                              className="autocomplete-item"
                              onMouseDown={() => selectItem(itemName)}
                            >
                              {itemName}
                            </div>
                          ))
                        ) : (
                          <div className="autocomplete-item no-results">
                            未找到匹配的道具
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {Object.entries(formData.items_reward).map(([itemName, count]) => (
                  <div key={itemName} className="reward-item">
                    <label>{getItemIcon(itemName)}{itemName}：</label>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => updateItemReward(itemName, e.target.value)}
                    />
                    <button type="button" onClick={() => removeItemReward(itemName)}>-</button>
                  </div>
                ))}
                <div className="reward-item">
                  <label>经验🎮：</label>
                  <input
                    type="number"
                    value={formData.exp_reward || 0}
                    onChange={(e) => setFormData({...formData, exp_reward: parseInt(e.target.value) || 0})}
                    min="0"
                  />
                </div>
              </div>

              {/*<div className="reward-section">*/}

              {/*</div>*/}
            </div>
          </div>

          <div className="form-actions">
            <button onClick={editingTask ? handleUpdateTask : handleAddTask}>
              确认
            </button>
            <button onClick={() => {
              setShowAddForm(false);
              setEditingTask(null);
              setItemSearch('');
              resetForm();
            }}>
              取消
            </button>


          </div>
        </div>
      </div>
    )
  };
  // 桌面端任务编辑模态框渲染
  const renderTaskEditModalDesktop = () => {
    // 定义表单字段配置
    const formFields = [
      { name: 'name', label: '任务名称', type: 'input', required: true },
      { name: 'description', label: '任务描述', type: 'input' },
      { name: 'category', label: '任务类别', type: 'select', options: taskCategories, visible: fieldSettings.category },
      { name: 'domain', label: '任务领域', type: 'select', options: taskDomains, visible: fieldSettings.domain },
      { name: 'priority', label: '任务优先级', type: 'select', options: taskPriorities, visible: fieldSettings.priority },
      { name: 'task_type', label: '循环周期', type: 'select', options: taskCycleTypes },
      { name: 'max_completions', label: '最大重复次数', type: 'number' },
      { name: 'start_time', label: '开始时间', type: 'datetime' },
      { name: 'complete_time', label: '完成时间', type: 'datetime', editOnly: true },
      { name: 'completed_count', label: '完成次数', type: 'number', editOnly: true },
      { name: 'total_completion_count', label: '总完成次数', type: 'number', editOnly: true },
      { name: 'status', label: '任务状态', type: 'select', options: taskStatuses, editOnly: true },
      { name: 'archived', label: '归档', type: 'checkbox', editOnly: true }
    ];

    // 根据字段可见性和编辑状态过滤字段
    const visibleFields = formFields.filter(field => {
      // 检查字段是否可见
      if (field.visible === false) return false;

      // 检查编辑状态
      if (field.editOnly && !editingTask) return false;

      return true;
    });

    // 将字段分为两栏
    // const midPoint = Math.ceil(visibleFields.length / 2);
    const midPoint = 13;
    const leftColumn = visibleFields.slice(0, midPoint);
    const rightColumn = visibleFields.slice(midPoint);

    if (!(showAddForm || editingTask)) {
      return null;
    }



    return (
      <div
        className="task-form-modal"
        ref={modalRef}
        style={modalStyles}
      >
        <h4>{editingTask ? `编辑任务 - ${tasks.find(t => t.id === editingTask)?.name}` : '新增任务'}</h4>
        <div className="task-form-container">

          <div className="form-column">
            {leftColumn.map(field => renderFormField(field))}
          </div>
          <div className="form-column">
            {rightColumn.map(field => renderFormField(field))}
            <div className="form-field" style={{display: 'flex', flexDirection: 'column'}}>
              <label style={{textAlign: 'left', alignSelf: 'flex-start'}}>备注：</label>
              <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                <MarkdownEditor
                  initialValue={formData.notes || ''}
                  onSave={(content) => setFormData({...formData, notes: content})}
                  onChange={(content) => setFormData({...formData, notes: content})} // 添加这行
                  onCancel={null}
                  mdEditorClassNameSuffix="task-notes-editor"
                  embedded={true}
                  currentField="note-editor"
                  // codeSettings={codeSettings}
                  stats={stats}
                  characterSettings={characterSettings}
                  taskFieldMappings={taskFieldMappings}
                  expFormulas={expFormulas}
                  quickAddTaskHint={quickAddTaskHint}
                  defaultViewMode = {calcEmbeddedViewMode(initialNotePreviewMode,initialNotePreviewModeInCard)} // 使用初始预览模式状态
                  // defaultViewMode =  {formData.notes && formData.notes.trim() !== '' ? 'preview' : 'split'}
                  externalSplitDirection = 'horizontal'
                  customDomain={settings.customDomain || ''}
                />
              </div>

            </div>
            {renderRewardsSection()}

          </div>
        </div>
        <div className="form-actions">
          <button onClick={editingTask ? handleUpdateTask : handleAddTask}>
            确认
          </button>
          <button onClick={() => {
            setShowAddForm(false);
            setEditingTask(null);
            setItemSearch('');
          }}>
            取消
          </button>
        </div>
      </div>
    );
  };

  // 任务编辑模态框渲染（桌面端-移动端自适应）
  const renderTaskEdit = () => {
    if (window.innerWidth <= 768) {
      return renderTaskEditModalMobile();
    } else {
      return renderTaskEditModalDesktop();
    }
  };

  // 获取creditIcon图标的方法
  const getCreditIcon = (creditType) => {
    // 从 characterSettings 中查找对应的图标设置
    if (characterSettings) {
      const setting = characterSettings.find(item => item.creditType === creditType);
      if (setting && setting.creditIcon) {
        // 如果有自定义图标，显示图标
        return setting.creditIcon
      }
    }
    // 如果没有找到图标，返回默认的积分图标
    return '$';
  };

  // 在 TaskTab.js 中添加获取道具图标的方法
  const getItemIcon = (itemName) => {
    // 从 items prop 中查找对应的道具信息
    if (items && items[itemName]) {
      const item = items[itemName];
      // 如果有图标，返回图标元素
      if (item.icon) {
        return (
          <img
            src={item.icon}
            alt={itemName}
            style={{
              width: '16px',
              height: '16px',
              marginRight: '5px',
              verticalAlign: 'middle'
            }}
          />
        );
      }
    }

    // 如果没有找到图标，返回默认图标或空
    return (
      <span style={{
        display: 'inline-block',
        width: '16px',
        height: '16px',
        marginRight: '5px',
        verticalAlign: 'middle',
        backgroundColor: '#cccccc',
        borderRadius: '50%',
        textAlign: 'center',
        lineHeight: '16px',
        fontSize: '10px',
        color: '#666666'
      }}>
        ?
      </span>
    );
  };

  const CalendarStatsGrid = ({
    weeks,
    calendarYear,
    calendarMonth,
    firstDayOfWeek,
    onOpenLog
  }) => {
    // 计算每周和每月的统计信息
    const calculateWeekStats = (week) => {
      const stats = {
        totalTasks: 0,
        totalExp: 0,
        mainTasks: 0
      };

      week.forEach(day => {
        if (day.isCurrentMonth) {
          // 获取当天的统计数据
          const dayStats = getDailyStatistics(day.date);
          stats.totalTasks += dayStats.totalTasks || 0;
          stats.totalExp += dayStats.totalExp || 0;

          // 计算主线任务数量
          if (dayStats.byCategory && dayStats.byCategory['主线任务']) {
            stats.mainTasks += dayStats.byCategory['主线任务'];
          }
        }
      });

      return stats;
    };

    // 计算每月统计信息
    const calculateMonthStats = () => {
      let totalTasks = 0;
      let totalExp = 0;
      let mainTasks = 0;

      weeks.forEach(week => {
        const weekStats = calculateWeekStats(week);
        totalTasks += weekStats.totalTasks;
        totalExp += weekStats.totalExp;
        mainTasks += weekStats.mainTasks;
      });

      return { totalTasks, totalExp, mainTasks };
    };

    const monthStats = calculateMonthStats();

    return (
      <div className="calendar-stats-column">
        <div className="calendar-stats-header">
          <h3>统计信息</h3>
          <button
            className="view-stats-toggle"
            onClick={() => {
              // 创建一个代表整个月份的日期对象
              const monthDate = new Date(calendarYear, calendarMonth - 1, 1);
              onOpenLog(monthDate, 'month');
            }}
          >
            查看日志
          </button>
        </div>

        <div className="calendar-stats-content">
          <div className="month-stats">
            <div className="stat-item">
              <span className="stat-label">任务总数:</span>
              <span className="stat-value">{monthStats.totalTasks}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">经验值:</span>
              <span className="stat-value">{monthStats.totalExp}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">主线任务:</span>
              <span className="stat-value">{monthStats.mainTasks}</span>
            </div>
          </div>

          <div className="weeks-stats">
            {weeks.map((week, weekIndex) => {
              const weekStats = calculateWeekStats(week);
              // 计算这一周的起始日期用于日志查看
              const weekStartDate = week.find(day => day.isCurrentMonth)?.date || week[0].date;

              return (
                <div key={weekIndex} className="week-stats">
                  <div className="week-stats-header">
                    <span>第{weekIndex + 1}周</span>
                    <button
                      className="view-log-button"
                      onClick={() => onOpenLog(weekStartDate, 'week')}
                    >
                      查看日志
                    </button>
                  </div>
                  <div className="week-stats-content">
                    <div className="stat-item">
                      <span className="stat-label">任务:</span>
                      <span className="stat-value">{weekStats.totalTasks}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">经验:</span>
                      <span className="stat-value">{weekStats.totalExp}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">主线:</span>
                      <span className="stat-value">{weekStats.mainTasks}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };


  // 添加 useEffect 来在 selectedDate 改变时加载日志内容
  useEffect(() => {
    if (selectedDate) {
      loadDailyLogContent(selectedDate).then(content => {
        setDailyLogContent(content);
      });
    }
  }, [selectedDate]);


  // 在 TaskTab 组件中添加手动刷新循环任务的函数
  const refreshCycleTasks = async () => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks/refresh-cycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 如果需要，可以指定特定任务进行刷新
          // taskIds: tasks.filter(t => t.task_type !== 'single').map(t => t.id)
        })
      });

      const result = await response.json();
      console.log('任务验证结果:',result)

      if (response.ok) {
        onShowStatus(`成功刷新${result.updated_count}个循环任务`);
        // 使用 onUpdateTask 回调而不是 setTasks
        onUpdateTask();
      } else {
        onShowStatus(result.error || '刷新失败');
        console.error('服务器错误详情:', result);
      }
    } catch (error) {
      console.error('刷新循环任务时出错:', error);
      onShowStatus('刷新失败: ' + error.message);
    }
  };


  const renderFiltersSection = () => {
    return (
      // 筛选器 - 根据字段设置显示相应筛选器
      <div className="task-filters">

        {/*/!* PC端显示字段管理器，移动端隐藏 *!/*/}
        {/*{window.innerWidth > 768 && renderFieldManager()}*/}

        {/* 移动端的筛选器换行处理 */}
        <div className="mobile-filters-wrapper">
          {renderFieldManager()}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="全部">类别</option>
            {currentTaskCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
          >
            <option value="全部">领域</option>
            {currentTaskDomains.map(domain => (
              <option key={domain} value={domain}>{domain}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="全部">优先级</option>
            {currentTaskPriorities.map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>

          <select
            value={filterTaskType}
            onChange={(e) => setFilterTaskType(e.target.value)}
          >
            <option value="全部">周期</option>
            {taskCycleTypes.map(cycleType => (
              <option key={cycleType} value={cycleType}>{cycleType}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="全部">状态</option>
            {currentTaskStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={filterArchived}
            onChange={(e) => setFilterArchived(e.target.value)}
          >
            <option value="全部">全部</option>
            <option value="是">已归档</option>
            <option value="否">未归档</option>
          </select>

          {viewMode === 'board' && (
            <select
              value={boardGroupBy}
              onChange={(e) => {
                const newGroupBy = e.target.value;
                setBoardGroupBy(newGroupBy);
                // localStorage.setItem('taskBoardGroupBy', newGroupBy);
                userDataManager.setUserData('taskBoardGroupBy', newGroupBy);
              }}
            >
              {fieldSettings.category && <option value="category">类别组</option>}
              {fieldSettings.domain && <option value="domain">领域组</option>}
              {fieldSettings.priority && <option value="priority">优先级组</option>}
              <option value="status">状态组</option>
            </select>
          )}

          {/* 添加重置筛选器按钮 */}
          <button
            className="reset-filters-btn"
            onClick={() => {
              setFilterCategory('全部');
              setFilterDomain('全部');
              setFilterPriority('全部');
              setFilterTaskType('全部');
              setFilterStatus('全部');
              setFilterArchived(viewMode === 'calendar' ? '全部' : '否');
              setSearchTerm('');
            }}
            title="重置所有筛选条件"
          >
            ⌫
          </button>


        </div>
      </div>
    );
  };
  const [showFilters, setShowFilters] = useState(false);



  return (
    <div className={`task-tab ${window.innerWidth <= 768 ? 'mobile-view' : ''}`}>
      {/*/!*增加一定空白*!/*/}
      <div style={{paddingBottom: '10px'}}></div>

      {/* 控制按钮和筛选器 */}
      <div className="task-controls" style={{ display: externalHideTopControls ? 'none' : 'flex' }}>
        <div style={{ display: 'flex', alignItems: 'left'}}>
          {/* 添加搜索框 */}
          <div className="task-search-container">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="搜索任务名称、标签、描述、备注..."
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation(); // 阻止事件冒泡
                  e.preventDefault();  // 阻止默认行为
                  e.target.blur();     // 失去焦点
                  setSearchTerm('');   // 可选：清空搜索内容
                }
              }}
              className="task-search-input"
            />
            {searchTerm && (
              <button
                className="clear-search-button"
                onClick={() => {
                  setSearchTerm('');
                  if (searchInputRef.current) {
                    searchInputRef.current.focus();
                  }
                }}
                title="清空搜索"
                style={{}}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                </svg>
              </button>
            )}
          </div>

          {/*筛选器 - 移动端添加显示隐藏按钮*/}
          {isMobile ? (
            <div>
              <button
                style={{
                  padding: '1px 2px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'black',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  // 定义 setShowFilters 并在适当的地方使用它来条件渲染筛选器
                  setShowFilters(prev => !prev); // 切换显示状态
                }}
                title="显示/隐藏筛选器"
              >
                ☰
              </button>
            </div>
          ):(
            renderFiltersSection()
          )}

        </div>
        <div className="task-actions">
          <MainActionButtonGroup
            onAddTask={() => setShowAddForm(true)}
            onBatchDelete={handleBatchDelete}
            // onBatchArchive={handleBatchArchive}
            // onRefreshCycles={refreshCycleTasks}
            onImportTasks={showImportInstructions}
            onExportTasks={handleExportTasks}
            selectedTaskCount={selectedTasks.length}
            buttonSettings={mainActionButtonSettings}
            // parseQuickTaskInput={parseQuickTaskInput}
          />
        </div>

        {isMobile && showFilters && renderFiltersSection()}

      </div>




      {/* 列表视图 - 根据字段设置显示相应列 */}
      {viewMode === 'list' && (
        <div className="task-container">
          <table>
            <thead>
              <tr>
                <th>
                  {renderEnhancedSelectAll()}
                </th>
                {window.innerWidth <= 768 ? (
                  <>
                    <th onClick={() => handleSort('name')} style={{cursor: 'pointer'}}>
                      任务名称 {getSortIcon('name')}
                    </th>
                    {currentFieldSettings.category && (
                      <th onClick={() => handleSort('category')} style={{cursor: 'pointer'}}>
                        类别 {getSortIcon('category')}
                      </th>
                    )}
                    {currentFieldSettings.domain && (
                      <th onClick={() => handleSort('domain')} style={{cursor: 'pointer'}}>
                        领域 {getSortIcon('domain')}
                      </th>
                    )}
                    {currentFieldSettings.priority && (
                      <th onClick={() => handleSort('priority')} style={{cursor: 'pointer'}}>
                        优先级 {getSortIcon('priority')}
                      </th>
                    )}
                    {currentFieldSettings.progress && (
                      <th>进度</th>
                    )}
                    {currentFieldSettings.exp_reward && (
                      <th>经验</th>
                    )}
                    {currentFieldSettings.status && (
                      <th>状态</th>
                    )}
                    {currentFieldSettings.tags && (
                      <th>标签</th>
                    )}
                    <th>操作</th>
                  </>
                ) : (
                  <>
                    {currentFieldSettings.id && (
                      <th onClick={() => handleSort('id')} style={{cursor: 'pointer'}}>
                        ID {getSortIcon('id')}
                      </th>
                    )}
                    <th onClick={() => handleSort('name')} style={{cursor: 'pointer'}}>
                      任务名称 {getSortIcon('name')}
                    </th>
                    {currentFieldSettings.description && (
                      <th>任务描述</th>
                    )}
                    {currentFieldSettings.tags && (
                      <th onClick={() => handleSort('tags')} style={{cursor: 'pointer'}}>
                        标签 {getSortIcon('tags')}
                      </th>
                    )}
                    {currentFieldSettings.category && (
                      <th onClick={() => handleSort('category')} style={{cursor: 'pointer'}}>
                        类别 {getSortIcon('category')}
                      </th>
                    )}
                    {currentFieldSettings.domain && (
                      <th onClick={() => handleSort('domain')} style={{cursor: 'pointer'}}>
                        领域 {getSortIcon('domain')}
                      </th>
                    )}
                    {currentFieldSettings.priority && (
                      <th onClick={() => handleSort('priority')} style={{cursor: 'pointer'}}>
                        优先级 {getSortIcon('priority')}
                      </th>
                    )}
                    {currentFieldSettings.progress && (
                      <th>完成进度</th>
                    )}
                    {currentFieldSettings.startTime && (
                      <th>开始时间</th>
                    )}
                    {currentFieldSettings.completeTime && (
                      <th>完成时间</th>
                    )}
                    {currentFieldSettings.completedCount && (
                      <th>完成次数</th>
                    )}
                    {currentFieldSettings.totalCompletionCount && (
                      <th>总完成次数</th>
                    )}
                    {currentFieldSettings.cycleType && (
                      <th>循环周期</th>
                    )}
                    {currentFieldSettings.items_reward && (
                      <th>奖励</th>
                    )}
                    {currentFieldSettings.exp_reward && (
                      <th>经验</th>
                    )}
                    {currentFieldSettings.status && (
                      <th>状态</th>
                    )}
                    {currentFieldSettings.archived && (
                      <th>归档</th>
                    )}
                    <th>操作</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {currentTasks.map((task) => {
                const isExpanded = expandedRows.has(task.id);

                // 格式化奖励显示
                const formatReward = () => {
                  let rewardText = '';
                  if (task.credits_reward) {
                    rewardText += Object.entries(task.credits_reward)
                      .map(([k, v]) => `${k}${v}`)
                      .join(', ');
                  }
                  if (task.items_reward) {
                    if (rewardText) rewardText += '; ';
                    rewardText += Object.entries(task.items_reward)
                      .map(([k, v]) => `${k}x${v}`)
                      .join(', ');
                  }
                  return rewardText || '-';
                };

                return (
                  <React.Fragment key={task.id}>
                    <tr
                      className={selectedTasks.includes(task.id) ? 'selected' : ''}
                      onClick={(e) => {
                        if (isMobile && !e.target.closest('button, input')) {
                          toggleRowExpansion(task.id);
                        }
                      }}
                      style={isMobile ? { cursor: 'pointer' } : {}}
                    >
                      <td onClick={(e) => {
                        e.stopPropagation();
                        e.target.querySelector('input[type="checkbox"]')?.click();
                      }} style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task.id)}
                          onChange={() => handleSelectTask(task.id)}
                        />
                      </td>

                      {isMobile ? (
                        <>
                          <td>{task.name}</td>
                          {currentFieldSettings.tags && (
                            <td>
                              <div className="task-tags-container">
                                {task.tags && Array.isArray(task.tags) && task.tags.length > 0 ? (
                                  task.tags.map((tag, index) => (
                                    <span
                                      key={index}
                                      className="markdown-tag"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchTerm(tag);
                                        // 聚焦到搜索框
                                        setTimeout(() => {
                                          const searchInput = document.querySelector('.task-search-input');
                                          if (searchInput) {
                                            searchInput.focus();
                                            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          }
                                        }, 50);
                                      }}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      {tag}
                                    </span>
                                  ))
                                ) : (
                                  // 当 tags 不存在或为空时，渲染一个空容器以保持表格结构
                                  <span className="no-tags-placeholder"></span>
                                )}
                              </div>
                            </td>
                          )}
                          {currentFieldSettings.category && (
                            <td>{renderColoredTag('categories', task.category)}</td>
                          )}
                          {currentFieldSettings.domain && (
                            <td>{renderColoredTag('domains', task.domain)}</td>
                          )}
                          {currentFieldSettings.priority && (
                            <td>{renderColoredTag('priorities', task.priority)}</td>
                          )}
                          {currentFieldSettings.progress && (
                            <td>{task.completed_count}/{task.max_completions}</td>
                          )}
                          {currentFieldSettings.exp_reward && (
                            <td>{formatExpValue(task.exp_reward)}</td>
                          )}
                          {currentFieldSettings.status && (
                              <td>{task.status}</td>
                          )}

                          <td>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(task.id);
                              }}
                              className="expand-button"
                            >
                              <span className="arrow-icon">{isExpanded ? '▼' : '▶'}</span>
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          {currentFieldSettings.id && (
                            <td>{task.id}</td>
                          )}
                          <td
                            onClick={(e) => {
                              e.stopPropagation();
                              customShowTaskDetails(task);
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {task.name}
                          </td>
                          {currentFieldSettings.description && (
                            <td>{task.description}</td>
                          )}
                          {currentFieldSettings.tags && (
                            <td>
                              <div className="task-tags-container">
                                {task.tags && Array.isArray(task.tags) && task.tags.length > 0 ? (
                                  task.tags.map((tag, index) => (
                                    <span
                                      key={index}
                                      className="markdown-tag"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSearchTerm(tag);
                                        // 聚焦到搜索框
                                        setTimeout(() => {
                                          const searchInput = document.querySelector('.task-search-input');
                                          if (searchInput) {
                                            searchInput.focus();
                                            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          }
                                        }, 50);
                                      }}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      {tag}
                                    </span>
                                  ))
                                ) : (
                                  // 当 tags 不存在或为空时，渲染一个空容器以保持表格结构
                                  <span className="no-tags-placeholder"></span>
                                )}
                              </div>
                            </td>
                          )}
                          {currentFieldSettings.category && (
                            <td>{renderColoredTag('categories', task.category)}</td>
                          )}
                          {currentFieldSettings.domain && (
                            <td>{renderColoredTag('domains', task.domain)}</td>
                          )}
                          {currentFieldSettings.priority && (
                            <td>{renderColoredTag('priorities', task.priority)}</td>
                          )}
                          {currentFieldSettings.progress && (
                            <td>{task.completed_count}/{task.max_completions}</td>
                          )}
                          {currentFieldSettings.startTime && (
                            <td>{task.start_time || '-'}</td>
                          )}
                          {currentFieldSettings.completeTime && (
                            <td>{task.complete_time || '-'}</td>
                          )}
                          {currentFieldSettings.completedCount && (
                            <td>{task.completed_count}</td>
                          )}
                          {currentFieldSettings.totalCompletionCount && (
                            <td>{task.total_completion_count}</td>
                          )}
                          {currentFieldSettings.cycleType && (
                            // <td>{formatCycleType(task)}</td>
                            <td>{task.task_type}</td>
                          )}
                          {currentFieldSettings.items_reward && (
                            <td>{formatReward(task)}</td>
                          )}

                          {currentFieldSettings.exp_reward && (
                            <td>{formatExpValue(task.exp_reward)}</td>
                          )}
                          {currentFieldSettings.status && (
                            <td>{task.status}</td>
                          )}

                          {currentFieldSettings.archived && (
                            <td>{task.archived ? '是' : '否'}</td>
                          )}

                          <td>
                            <ActionButtonGroup
                              taskId={task.id}
                              task={task}
                              onEdit={(taskId) => {
                                setEditingTask(taskId);
                                const taskToEdit = tasks.find(t => t.id === taskId);
                                setFormData({
                                  name: taskToEdit.name,
                                  description: taskToEdit.description,
                                  task_type: taskToEdit.task_type,
                                  max_completions: taskToEdit.max_completions,
                                  category: taskToEdit.category,
                                  domain: taskToEdit.domain,
                                  priority: taskToEdit.priority,
                                  credits_reward: {...taskToEdit.credits_reward},
                                  items_reward: {...taskToEdit.items_reward},
                                  start_time: formatDateTime(taskToEdit.start_time),
                                  complete_time: formatDateTime(taskToEdit.complete_time),
                                  archived: taskToEdit.archived,
                                  status: taskToEdit.status,
                                  completed_count: taskToEdit.completed_count,
                                  total_completion_count: taskToEdit.total_completion_count,
                                  exp_reward: taskToEdit.exp_reward || 0,
                                  notes: taskToEdit.notes,
                                  tags: taskToEdit.tags,
                                });
                              }}
                              onDelete={handleDeleteTask}
                              onComplete={handleCompleteTask}
                              onArchive={handleArchiveTask}
                              onCopy={copyTask}
                            />
                          </td>
                        </>
                      )}
                    </tr>

                    {/* 移动端展开详情行 */}
                    {isMobile && isExpanded && (
                      <tr>
                        <td colSpan="5">
                          <div className="mobile-details">
                            <div className="detail-row">
                              <span className="detail-label">描述:</span>
                              <span className="detail-value">{task.description || '-'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">类别:</span>
                              <span className="detail-value">{renderColoredTag('categories', task.category)}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">领域:</span>
                              <span className="detail-value">{renderColoredTag('domains', task.domain)}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">优先级:</span>
                              <span className="detail-value">{renderColoredTag('priorities', task.priority)}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">状态:</span>
                              <span className="detail-value">{task.status}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">进度:</span>
                              <span className="detail-value">{task.completed_count}/{task.max_completions}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">经验:</span>
                              <span className="detail-value">{formatExpValue(task.exp_reward)}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">奖励:</span>
                              <span className="detail-value">{formatReward()}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">开始时间:</span>
                              <span className="detail-value">{task.start_time || '-'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">完成时间:</span>
                              <span className="detail-value">{task.complete_time || '-'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">归档:</span>
                              <span className="detail-value">{task.archived ? '是' : '否'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">备注:</span>
                              <span className="detail-value">{task.notes || ''}</span>
                            </div>
                            <div className="action-buttons">
                              <ActionButtonGroup
                                taskId={task.id}
                                task={task}
                                onEdit={(taskId) => {
                                  setEditingTask(taskId);
                                  const taskToEdit = tasks.find(t => t.id === taskId);
                                  setFormData({
                                    name: taskToEdit.name,
                                    description: taskToEdit.description,
                                    task_type: taskToEdit.task_type,
                                    max_completions: taskToEdit.max_completions,
                                    category: taskToEdit.category,
                                    domain: taskToEdit.domain,
                                    priority: taskToEdit.priority,
                                    credits_reward: {...taskToEdit.credits_reward},
                                    items_reward: {...taskToEdit.items_reward},
                                    start_time: formatDateTime(taskToEdit.start_time),
                                    complete_time: formatDateTime(taskToEdit.complete_time),
                                    archived: taskToEdit.archived,
                                    status: taskToEdit.status,
                                    completed_count: taskToEdit.completed_count,
                                    total_completion_count: taskToEdit.total_completion_count,
                                    exp_reward: taskToEdit.exp_reward || 0,
                                    notes: taskToEdit.notes,
                                    tags: taskToEdit.tags,
                                  });
                                }}
                                onDelete={handleDeleteTask}
                                onComplete={handleCompleteTask}
                                onArchive={handleArchiveTask}
                                onCopy={copyTask}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>



          </table>
          {/* 添加分页控件 */}
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
              value={tasksPerPage}
              onChange={(e) => {
                const newTasksPerPage = Number(e.target.value);
                setTasksPerPage(newTasksPerPage);
                // localStorage.setItem('tasksPerPage', newTasksPerPage.toString());
                userDataManager.setUserData('tasksPerPage', newTasksPerPage.toString());
                setCurrentPage(1); // 重置到第一页
                setInputPage(1); // 同步更新输入框的值
              }}
              className="tasks-per-page-select"
            >
              <option value="5">5/页</option>
              <option value="10">10/页</option>
              <option value="20">20/页</option>
              <option value="50">50/页</option>
              <option value="100">100/页</option>
            </select>
          </div>
        </div>
      )}


      {/* 看板视图 */}
      {viewMode === 'board' && renderBoardView()}


      {viewMode === 'calendar' && renderCalendarView()}

      {renderTaskEdit()}
      {renderDailyLog()}

      {groupChangeMenu.isOpen && (
        <div
          className="group-change-menu"
          style={{
            position: 'absolute',
            top: groupChangeMenu.position.y,
            left: groupChangeMenu.position.x,
            zIndex: 1000,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            padding: '5px 0'
          }}
        >
          {boardGroupBy !== 'status' && (
            <>
              {boardGroupBy === 'category' && currentTaskCategories.map(category => (
                <div
                  key={category}
                  className="group-change-option"
                  onClick={() => handleGroupChange(groupChangeMenu.task, category)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <span style={{
                    backgroundColor: getFieldColor('categories', category),
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginRight: '8px',
                    color: 'white'
                  }}>
                    {getFieldAbbreviation('categories', category)}
                  </span>
                  {category}
                </div>
              ))}

              {boardGroupBy === 'domain' && currentTaskDomains.map(domain => (
                <div
                  key={domain}
                  className="group-change-option"
                  onClick={() => handleGroupChange(groupChangeMenu.task, domain)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <span style={{
                    backgroundColor: getFieldColor('domains', domain),
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginRight: '8px',
                    color: 'white'
                  }}>
                    {getFieldAbbreviation('domains', domain)}
                  </span>
                  {domain}
                </div>
              ))}

              {boardGroupBy === 'priority' && currentTaskPriorities.map(priority => (
                <div
                  key={priority}
                  className="group-change-option"
                  onClick={() => handleGroupChange(groupChangeMenu.task, priority)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <span style={{
                    backgroundColor: getFieldColor('priorities', priority),
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginRight: '8px',
                    color: 'white'
                  }}>
                    {getFieldAbbreviation('priorities', priority)}
                  </span>
                  {priority}
                </div>
              ))}
            </>
          )}

          {boardGroupBy === 'status' && currentTaskStatuses.map(status => (
            <div
              key={status}
              className="group-change-option"
              onClick={() => {
                // 阻止拖拽到"已完成"和"重复中"状态
                if (status === '已完成' || status === '重复中') {
                  return;
                }
                handleGroupChange(groupChangeMenu.task, status);
              }}
              style={{
                padding: '8px 12px',
                cursor: (status === '已完成' || status === '重复中') ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                opacity: (status === '已完成' || status === '重复中') ? 0.5 : 1
              }}
            >
              <span style={{
                backgroundColor: getFieldColor('statuses', status),
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                marginRight: '8px',
                color: 'white'
              }}>
                {getFieldAbbreviation('statuses', status)}
              </span>
              {status}
            </div>
          ))}
        </div>
      )}

      {/* --- 新增：渲染导出进度弹窗 --- */}
      <ProgressDialog
        isOpen={isImportDialogOpen}
        title="从csv文件导入任务"
        progress={importProgress}
        onClose={() => {
          setIsImportDialogOpen(false);
          // 点击“确定”后刷新页面
          window.location.reload();
        }}
      />

      <ProgressDialog
        isOpen={isBatchDeleteDialogOpen}
        title="批量删除任务"
        progress={batchDeleteProgress}
        onClose={() => {
          setIsBatchDeleteDialogOpen(false);
          // 可选：在用户点击“确定”后执行额外操作，例如刷新页面或重新获取数据
          // window.location.reload(); // 如果需要刷新页面
          // 或者调用父组件的刷新方法
          // onUpdateTask();
        }}
      />

    </div>

  );

};

export default TaskTab;