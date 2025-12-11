// src/components/SettingsTab.js
import React, { useState, useEffect, useRef,useCallback } from 'react';
import CONFIG from '../config';
import { showInfoPopup } from '../utils/infoPopup';
import {useLocation} from 'react-router-dom';
import menuItems from '../utils/menuItems'; // 引入菜单项

const SettingsTab = ({ settings, onUpdateSettings, targetGroup, onShowStatus,onSettingsChange }) => {
  const location = useLocation();
  const [localSettings, setLocalSettings] = useState({
    ...settings,
    taskCycleTypes: settings.taskCycleTypes || ['单次', '日循环', '周循环', '月循环', '年循环'],
    // 确保其他设置项也有默认值
    creditTypes: settings.creditTypes || ["水晶", "星钻", "魂玉", "骨贝", "源石", "灵石", "金币", "元宝"],
    itemCategories: settings.itemCategories || ["经验类", "属性类", "消耗类", "装备类", "材料类", "任务类", "其它类"],
    taskCategories: settings.taskCategories || ['主线任务', '辅线任务', '支线任务', '特殊任务'],
    taskDomains: settings.taskDomains || ['学习', '工作', '运动', '生活', '社交', '自修'],
    taskPriorities: settings.taskPriorities || ['重要且紧急', '重要不紧急', '不重要但紧急', '不重要不紧急'],
    taskStatuses: settings.taskStatuses || ['未完成', '进行中', '重复中', '已完成'],
    propertyCategories: settings.propertyCategories || ['智力','力量', '体质', '活力', '敏捷', '灵力'], // 添加默认属性类别
    taskFieldMappings: settings.taskFieldMappings || {
      categories: {},
      domains: {},
      priorities: {},
      statuses: {},
      cycleTypes: {}
    },
    // taskFieldWeights: settings.taskFieldWeights || {
    //   categories: {},
    //   domains: {},
    //   priorities: {},
    //   statuses: {},
    //   cycleTypes: {},
    // },
    // 添加操作按钮设置的默认值
    actionButtonSettings: settings.actionButtonSettings || {
      view: 'visible',
      edit: 'visible',
      complete: 'visible',
      copy: 'hidden',
      delete: 'hidden',
      archive: 'hidden'
    },
    // 添加主操作按钮设置的默认值
    mainActionButtonSettings: settings.mainActionButtonSettings || {
      addTask: 'visible',
      batchDelete: 'visible',
      batchArchive: 'visible',
      refreshCycles: 'visible',
      importTasks: 'visible',  // 添加导入任务按钮配置
      exportTasks: 'visible'   // 添加导出任务按钮配置
    },

    // 添加边框设置
    borderSettings: settings.borderSettings ? {
      top: {
        enabled: {
          board: settings.borderSettings?.top?.enabled?.board !== undefined ?
                 settings.borderSettings.top.enabled.board : false,
          calendar: settings.borderSettings?.top?.enabled?.calendar !== undefined ?
                    settings.borderSettings.top.enabled.calendar : false
        },
        field: settings.borderSettings?.top?.field || 'priority',
      },
      right: {
        enabled: {
          board: settings.borderSettings?.right?.enabled?.board !== undefined ?
                 settings.borderSettings.right.enabled.board : false,
          calendar: settings.borderSettings?.right?.enabled?.calendar !== undefined ?
                    settings.borderSettings.right.enabled.calendar : false
        },
        field: settings.borderSettings?.right?.field || 'domain',
      },
      bottom: {
        enabled: {
          board: settings.borderSettings?.bottom?.enabled?.board !== undefined ?
                 settings.borderSettings.bottom.enabled.board : false,
          calendar: settings.borderSettings?.bottom?.enabled?.calendar !== undefined ?
                    settings.borderSettings.bottom.enabled.calendar : false
        },
        field: settings.borderSettings?.bottom?.field || 'status',
      },
      left: {
        enabled: {
          board: settings.borderSettings?.left?.enabled?.board !== undefined ?
                 settings.borderSettings.left.enabled.board : true,
          calendar: settings.borderSettings?.left?.enabled?.calendar !== undefined ?
                    settings.borderSettings.left.enabled.calendar : false
        },
        field: settings.borderSettings?.left?.field || 'category',
      }
    } : {
      // 如果 settings.borderSettings 不存在，使用默认配置
      top: {
        enabled: { board: false, calendar: false },
        field: 'priority',
      },
      right: {
        enabled: { board: false, calendar: false },
        field: 'domain',
      },
      bottom: {
        enabled: { board: false, calendar: false },
        field: 'status',
      },
      left: {
        enabled: { board: true, calendar: false },
        field: 'category',
      }
    },

    // 添加日历视图设置
    calendarViewSettings: settings.calendarViewSettings ? {
      dateField: settings.calendarViewSettings.dateField || 'start_time',
      displayField: settings.calendarViewSettings.displayField || 'name',
      maxChars: settings.calendarViewSettings.maxChars || 50
    } : {
      dateField: 'start_time',
      displayField: 'name',
      maxChars: 50
    },
    defaultParallelWorld: settings.defaultParallelWorld || "默认世界", // 添加默认游戏世界配置
    fieldAbbreviations: settings.fieldAbbreviations || {
      categories: settings.fieldAbbreviations?.categories || {},
      domains: settings.fieldAbbreviations?.domains || {},
      priorities: settings.fieldAbbreviations?.priorities || {},
      statuses: settings.fieldAbbreviations?.statuses || {},
      cycleTypes: settings.fieldAbbreviations?.cycleTypes || {},
    },
    levelToRealm: settings.levelToRealm || [],
    propertyToRealm: settings.propertyToRealm || [],
  });

  // 在现有的设置状态中添加新字段
  const [domainToCreditMapping, setDomainToCreditMapping] = useState(
    localSettings.domainToCreditMapping || {}
  );


  // 在 SettingsTab.js 的 useState 初始化中添加经验公式设置
  const [expFormulas, setExpFormulas] = useState({
    levelUpA: localSettings.expFormulas?.levelUpA || 100,
    levelUpN: localSettings.expFormulas?.levelUpN || 2.5,
    taskExpCoefficient: localSettings.expFormulas?.taskExpCoefficient || 0.1, // 添加系数设置
    taskExpMultiplier: localSettings.expFormulas?.taskExpMultiplier || 1.0, // 添加倍率设置
    propertyLevelA: localSettings.expFormulas?.propertyLevelA || 10,// 添加属性等级公式设置
    propertyLevelN: localSettings.expFormulas?.propertyLevelN || 2.0,
  });

  // 添加新的状态用于管理售出比率
  const [sellRates, setSellRates] = useState({});

  // 添加状态管理
  const [levelToRealm, setLevelToRealm] = useState(localSettings.levelToRealm || []);
  const [propertyToRealm, setPropertyToRealm] = useState(localSettings.propertyToRealm || []);
  const [showRealmModal, setShowRealmModal] = useState(false);
  const [realmModalData, setRealmModalData] = useState([]);
  const [realmModalTitle, setRealmModalTitle] = useState('');
  const [jsonHandlingMode, setJsonHandlingMode] = useState('immediate'); // 'immediate' 或 'delayed'


  // 1. 在文件顶部添加默认配置常量（避免重复定义）
  const DEFAULT_EFFECT_CONFIG =  {
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
  const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };







  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);

      // 同步其他独立状态
      if (settings.expFormulas) {
        setExpFormulas(settings.expFormulas);
      }

      // 初始化 sellRates
      if (settings.sellRates) {
        setSellRates(settings.sellRates);
      } else {
        // 初始化默认比率
        const defaultRates = {};
        if (settings.creditTypes && settings.creditTypes.length >= 2) {
          const resourceTypes = settings.creditTypes.slice(0, -2);
          const walletTypes = settings.creditTypes.slice(-2);

          resourceTypes.forEach(resource => {
            defaultRates[resource] = {};
            walletTypes.forEach(wallet => {
              defaultRates[resource][wallet] = 1;
            });
          });
        }
        setSellRates(defaultRates);
      }
    }
  }, [settings]); // 确保依赖项正确


  // 在 SettingsTab.js 中添加一个安全检查函数来确保 borderSettings 正确初始化
  const getSafeBorderSettings = (borderSettings) => {
    const defaultPositions = ['top', 'right', 'bottom', 'left'];
    const result = {};

    defaultPositions.forEach(position => {
      result[position] = {
        enabled: {
          board: borderSettings?.[position]?.enabled?.board !== undefined ?
                 borderSettings[position].enabled.board : getDefaultEnabledForPosition(position, 'board'),
          calendar: borderSettings?.[position]?.enabled?.calendar !== undefined ?
                    borderSettings[position].enabled.calendar : getDefaultEnabledForPosition(position, 'calendar')
        },
        field: borderSettings?.[position]?.field || getDefaultFieldForPosition(position),
        colors: borderSettings?.[position]?.colors || {}
      };
    });

    return result;
  };
  // 为不同位置提供默认启用状态的辅助函数
  const getDefaultEnabledForPosition = (position, viewType) => {
    // 默认只有左边框在看板视图启用
    if (position === 'left' && viewType === 'board') {
      return true;
    }
    return false;
  };

  // 为不同位置提供默认字段的辅助函数
  const getDefaultFieldForPosition = (position) => {
    const defaultFields = {
      top: 'priority',
      right: 'domain',
      bottom: 'status',
      left: 'category'
    };
    return defaultFields[position] || 'category';
  };


  const getSafeCalendarViewSettings = (calendarViewSettings) => {
    return {
      // dateField: calendarViewSettings?.dateField || 'start_time',
      // displayField: calendarViewSettings?.displayField || 'name', // 显示字段
      maxChars: calendarViewSettings?.maxChars || 15, // 最大字符数限制
      firstDayOfWeek: calendarViewSettings?.firstDayOfWeek !== undefined ?
                     calendarViewSettings.firstDayOfWeek : 0, // 默认星期天
      defaultTaskCards: calendarViewSettings?.defaultTaskCards || 3, // 添加默认显示任务卡片数配置
      statItems: calendarViewSettings?.statItems || []  // 统计卡片显示字段
    };
  };


  const handleSaveSettings = async () => {
    // 确保所有状态都被正确合并
    const newSettings = {
      ...localSettings,
      expFormulas: expFormulas,
      sellRates: sellRates,
      levelToRealm: levelToRealm,
      propertyToRealm: propertyToRealm,
    };

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      const result = await response.json();

      if (response.ok) {
        onUpdateSettings(); // 这会触发重新获取设置
        if (!targetGroup) {
          onShowStatus(result.message);
        }

        // 显示成功提示反馈
        const successMessage = document.createElement('div');
        successMessage.textContent = '设置保存成功！';
        successMessage.className = 'settings-save-success-feedback';
        successMessage.style.cssText = `        position: fixed;
          top: 70px;
          right: 660px;
          background-color: #4caf50;
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          z-index: 10000;
          font-weight: bold;
          animation: fadeInOut 3s ease-in-out;
        `;

        // 添加淡入淡出动画样式
        if (!document.getElementById('settings-save-feedback-style')) {
          const style = document.createElement('style');
          style.id = 'settings-save-feedback-style';
          style.textContent = `          @keyframes fadeInOut {
              0% { opacity: 0; transform: translateY(-20px); }
              10% { opacity: 1; transform: translateY(0); }
              90% { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(-20px); }
            }
          `;
          document.head.appendChild(style);
        }

        document.body.appendChild(successMessage);

        // 1.5秒后自动移除提示
        setTimeout(() => {
          if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage);
          }
        }, 1500);
      } else {
        if (!targetGroup) {
          onShowStatus('保存失败: ' + result.error);
        }
      }
    } catch (error) {
      console.error('保存设置时发生错误:', error);
      if (!targetGroup) {
        onShowStatus('网络错误');
      }
    }
  };

  const updateCreditTypes = (newTypes) => {
    const updatedSettings = {
      ...localSettings,
      creditTypes: newTypes
    };
    setLocalSettings(updatedSettings);
  };

  const updateItemCategories = (newCategories) => {
    setLocalSettings({
      ...localSettings,
      itemCategories: newCategories
    });
  };

  const updateTaskCategories = (newCategories) => {
    setLocalSettings(prev => ({
      ...prev,
      taskCategories: newCategories
    }));
  };

  const updateTaskDomains = (newDomains) => {
    setLocalSettings(prev => ({
      ...prev,
      taskDomains: newDomains
    }));
  };

  const updateTaskPriorities = (newPriorities) => {
    setLocalSettings({
      ...localSettings,
      taskPriorities: newPriorities
    });
  };

  const updateTaskStatuses = (newStatuses) => {
    setLocalSettings({
      ...localSettings,
      taskStatuses: newStatuses
    });
  };

  // 添加更新循环周期类型的函数
  const updateTaskCycleTypes = (newCycleTypes) => {
    setLocalSettings({
      ...localSettings,
      taskCycleTypes: newCycleTypes
    });
  };

  const addNewItem = (list, setList) => {
    const newItem = prompt('请输入新项目名称:');
    if (newItem && newItem.trim() && !list.includes(newItem.trim())) {
      setList([...list, newItem.trim()]);
    }
  };

  const removeItem = (list, setList, item) => {
    if (list.length > 1) {
      setList(list.filter(i => i !== item));
    } else {
      alert('至少需要保留一个项目');
    }
  };

  // 1. 首先在 useState 初始化中添加 effectConfig 状态
  const [effectConfig, setEffectConfig] = useState(localSettings.effectConfig || DEFAULT_EFFECT_CONFIG);
  // 2. 添加状态管理最大化弹窗
  const [isEffectConfigModalOpen, setIsEffectConfigModalOpen] = useState(false);

  // const updateEffectConfig = (newConfig) => {
  //   setEffectConfig(newConfig);
  //   setLocalSettings({
  //     ...localSettings,
  //     effectConfig: newConfig
  //   });
  // };
  const closeEffectConfigModal = () => {
    setIsEffectConfigModalOpen(false);
  };

  // 在 SettingsTab 组件中添加状态
  const [jsonInput, setJsonInput] = useState(JSON.stringify(effectConfig, null, 2));
  const [validationError, setValidationError] = useState('');
  const debouncedJsonInput = useDebounce(jsonInput, 500); // 500ms防抖

  // 监听防抖后的输入值进行验证
  useEffect(() => {
    try {
      JSON.parse(debouncedJsonInput);
      setValidationError('');
    } catch (error) {
      setValidationError(error.message);
    }
  }, [debouncedJsonInput]);


  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isEffectConfigModalOpen) {
        closeEffectConfigModal();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isEffectConfigModalOpen]);

  // 添加操作列按钮设置相关函数
  const updateActionButtonSettings = (newSettings) => {
    const updatedSettings = {
      ...localSettings,
      actionButtonSettings: newSettings
    };
    setLocalSettings(updatedSettings);
  };

  // 添加更新代码设置的函数
  const updateTaskCodeSettings = (newCodeSettings) => {
    setLocalSettings({
      ...localSettings,
      taskCodeSettings: newCodeSettings
    });
  };

  // const TaskCodeSettings = ({
  //   taskCategories,
  //   taskDomains,
  //   taskPriorities,
  //   taskCycleTypes,
  //   codeSettings,
  //   onCodeSettingsChange
  // }) => {
  //   // 初始化代码设置
  //   const [codes, setCodes] = useState(codeSettings || {
  //     categories: {},
  //     domains: {},
  //     priorities: {},
  //     cycleTypes: {}
  //   });
  //
  //   // 验证唯一性
  //   const isUniqueCode = (code, excludeField = null, excludeValue = null) => {
  //     for (const [field, mappings] of Object.entries(codes)) {
  //       if (excludeField === field) continue;
  //
  //       for (const [value, existingCode] of Object.entries(mappings)) {
  //         if (excludeValue === value) continue;
  //
  //         if (existingCode === code) {
  //           return false;
  //         }
  //       }
  //     }
  //
  //     // 检查同一字段内的唯一性
  //     if (excludeField) {
  //       for (const [value, existingCode] of Object.entries(codes[excludeField])) {
  //         if (excludeValue === value) continue;
  //
  //         if (existingCode === code) {
  //           return false;
  //         }
  //       }
  //     }
  //
  //     return true;
  //   };
  //
  //   // 更新代码
  //   const updateCode = (field, value, code) => {
  //     // 验证代码唯一性
  //     if (code && !isUniqueCode(code, field, value)) {
  //       alert('代码必须唯一，请使用其他代码');
  //       return;
  //     }
  //
  //     setCodes(prev => ({
  //       ...prev,
  //       [field]: {
  //         ...prev[field],
  //         [value]: code
  //       }
  //     }));
  //   };
  //
  //   // 保存设置
  //   const handleSave = () => {
  //     onCodeSettingsChange(codes);
  //   };
  //
  //   return (
  //     <div className="task-code-settings">
  //       <h3>任务字段代码设置</h3>
  //
  //       <div className="code-section">
  //         <h4>任务类别代码</h4>
  //         {taskCategories.map(category => (
  //           <div key={category} className="code-item">
  //             <label>{category}:</label>
  //             <input
  //               type="text"
  //               value={codes.categories[category] || ''}
  //               onChange={(e) => updateCode('categories', category, e.target.value)}
  //               placeholder="输入唯一代码"
  //               maxLength="10"
  //             />
  //           </div>
  //         ))}
  //       </div>
  //
  //       <div className="code-section">
  //         <h4>任务领域代码</h4>
  //         {taskDomains.map(domain => (
  //           <div key={domain} className="code-item">
  //             <label>{domain}:</label>
  //             <input
  //               type="text"
  //               value={codes.domains[domain] || ''}
  //               onChange={(e) => updateCode('domains', domain, e.target.value)}
  //               placeholder="输入唯一代码"
  //               maxLength="10"
  //             />
  //           </div>
  //         ))}
  //       </div>
  //
  //       <div className="code-section">
  //         <h4>任务优先级代码</h4>
  //         {taskPriorities.map(priority => (
  //           <div key={priority} className="code-item">
  //             <label>{priority}:</label>
  //             <input
  //               type="text"
  //               value={codes.priorities[priority] || ''}
  //               onChange={(e) => updateCode('priorities', priority, e.target.value)}
  //               placeholder="输入唯一代码"
  //               maxLength="10"
  //             />
  //           </div>
  //         ))}
  //       </div>
  //
  //       <div className="code-section">
  //         <h4>循环周期代码</h4>
  //         {taskCycleTypes.map((cycleType, index) => {
  //           const cycleValues = ['single', 'daily', 'weekly', 'monthly', 'yearly'];
  //           const cycleValue = cycleValues[index] || cycleType;
  //
  //           return (
  //             <div key={cycleType} className="code-item">
  //               <label>{cycleType}:</label>
  //               <input
  //                 type="text"
  //                 value={codes.cycleTypes[cycleValue] || ''}
  //                 onChange={(e) => updateCode('cycleTypes', cycleValue, e.target.value)}
  //                 placeholder="输入唯一代码"
  //                 maxLength="10"
  //               />
  //             </div>
  //           );
  //         })}
  //       </div>
  //
  //       <button onClick={handleSave}>保存代码设置</button>
  //     </div>
  //   );
  // };

  // 在 SettingsTab 组件中添加更新主按钮设置的函数
  const updateMainActionButtonSettings = (newSettings) => {
    console.log('=== 更新主按钮设置 ===');
    console.log('旧设置:', localSettings.mainActionButtonSettings);
    console.log('新设置:', newSettings);
    setLocalSettings({
      ...localSettings,
      mainActionButtonSettings: newSettings
    });
  };

  // 修改 renderBorderSettings 函数中的颜色示例部分
  const renderBorderSettings = () => {
    const safeBorderSettings = getSafeBorderSettings(localSettings.borderSettings);
    const taskFieldMappings = localSettings.taskFieldMappings || {};

    // 获取字段值对应的颜色
    const getFieldColor = (fieldType, fieldValue) => {
      const fieldMappingKey = {
        'category': 'categories',
        'domain': 'domains',
        'priority': 'priorities',
        'status': 'statuses'
      }[fieldType];

      if (fieldMappingKey && taskFieldMappings[fieldMappingKey]?.[fieldValue]?.color) {
        return taskFieldMappings[fieldMappingKey][fieldValue].color;
      }
      return '#cccccc';
    };

    // 获取字段值的简称
    const getFieldAbbreviation = (fieldType, fieldValue) => {
      const fieldMappingKey = {
        'category': 'categories',
        'domain': 'domains',
        'priority': 'priorities',
        'status': 'statuses'
      }[fieldType];

      if (fieldMappingKey && taskFieldMappings[fieldMappingKey]?.[fieldValue]?.abbreviation) {
        return taskFieldMappings[fieldMappingKey][fieldValue].abbreviation;
      }
      // 如果没有设置简称，使用字段值的前两个字符
      return fieldValue.length > 2 ? fieldValue.substring(0, 2) : fieldValue;
    };

    // 获取字段对应的值列表
    const getFieldValues = (fieldType) => {
      switch (fieldType) {
        case 'category':
          return localSettings.taskCategories || [];
        case 'domain':
          return localSettings.taskDomains || [];
        case 'priority':
          return localSettings.taskPriorities || [];
        case 'status':
          return localSettings.taskStatuses || [];
        default:
          return [];
      }
    };

    // 获取边框位置对应的CSS边框属性
    const getPositionBorderProperty = (position) => {
      const borderProperties = {
        'top': 'borderTop',
        'right': 'borderRight',
        'bottom': 'borderBottom',
        'left': 'borderLeft'
      };
      return borderProperties[position] || 'border';
    };

    return (
      <details className="settings-group">
        <summary className="settings-group-title">【任务】卡片边框设置</summary>
        <div className="settings-section">
          <table className="border-settings-table">
            <thead>
              <tr>
                <th>边框<br></br>位置</th>
                <th>启用<br></br>(看板)</th>
                <th>启用<br></br>(日历)</th>
                <th>映射字段</th>
                <th>颜色示例</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(safeBorderSettings).map(([position, config]) => {
                const fieldValues = getFieldValues(config.field);

                return (
                  <tr key={position}>
                    <td>{getPositionLabel(position)}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={config.enabled.board}
                        onChange={(e) => {
                          setLocalSettings({
                            ...localSettings,
                            borderSettings: {
                              ...safeBorderSettings,
                              [position]: {
                                ...config,
                                enabled: {
                                  ...config.enabled,
                                  board: e.target.checked
                                }
                              }
                            }
                          });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={config.enabled.calendar}
                        onChange={(e) => {
                          setLocalSettings({
                            ...localSettings,
                            borderSettings: {
                              ...safeBorderSettings,
                              [position]: {
                                ...config,
                                enabled: {
                                  ...config.enabled,
                                  calendar: e.target.checked
                                }
                              }
                            }
                          });
                        }}
                      />
                    </td>
                    <td>
                      <select
                        value={config.field}
                        onChange={(e) => {
                          setLocalSettings({
                            ...localSettings,
                            borderSettings: {
                              ...safeBorderSettings,
                              [position]: {
                                ...config,
                                field: e.target.value
                              }
                            }
                          });
                        }}
                      >
                        <option value="category">类别</option>
                        <option value="domain">领域</option>
                        <option value="priority">优先级</option>
                        <option value="status">状态</option>
                      </select>
                    </td>
                    <td>
                      <div className="color-preview-container">
                        {fieldValues.slice(0, 6).map((value, index) => {
                          const color = getFieldColor(config.field, value);
                          const abbreviation = getFieldAbbreviation(config.field, value);
                          const borderProperty = getPositionBorderProperty(position);

                          const borderStyle = {
                            width: '40px',
                            height: '25px',
                            display: 'inline-block',
                            marginRight: '3px',
                            verticalAlign: 'middle',
                            textAlign: 'center',
                            lineHeight: '30px',
                            fontSize: '10px',
                            borderRadius: '2px',
                            backgroundColor: '#f8f9fa'
                          };

                          // 仅设置对应位置的边框
                          borderStyle[borderProperty] = `3px solid ${color}`;

                          return (
                            <div
                              key={`${position}-${index}`}
                              className="border-position-preview"
                              style={borderStyle}
                              title={`${value}`}
                            >
                              {abbreviation}
                            </div>
                          );
                        })}
                        {fieldValues.length > 6 && (
                          <span style={{ marginLeft: '5px' }}>...</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    );
  };

  // 辅助函数：获取位置标签
  const getPositionLabel = (position) => {
    const labels = {
      top: '上',
      right: '右',
      bottom: '下',
      left: '左'
    };
    return labels[position] || position;
  };

  // 更新颜色映射渲染函数
  // 替代方案：使用文本输入框直接输入颜色值
  const renderPositionColorMapping = (position, config, safeBorderSettings) => {
    // 根据字段类型获取可能的值
    const possibleValues = getFieldValues(config.field);

    // 获取对应字段的颜色映射
    let fieldColors = {};
    switch (config.field) {
      case 'category':
        fieldColors = safeBorderSettings.left?.colors || {};
        break;
      case 'domain':
        fieldColors = safeBorderSettings.top?.colors || {};
        break;
      case 'priority':
        fieldColors = safeBorderSettings.right?.colors || {};
        break;
      case 'status':
        fieldColors = safeBorderSettings.bottom?.colors || {};
        break;
      default:
        fieldColors = {};
    }

    return (
      <div className="color-mapping">
        {possibleValues.map((value, valueIndex) => {
          // 获取当前值的颜色，优先使用当前边框设置中的颜色，否则使用任务字段映射设置中的颜色
          const currentColor = config.colors[value] || fieldColors[value] || '#cccccc';

          return (
            <div key={`${position}-${valueIndex}`} className="color-mapping-item">
              <span className="color-preview-label" style={{
                backgroundColor: currentColor,
                padding: '4px 8px',
                borderRadius: '4px',
                color: getContrastColor(currentColor),
                marginRight: '10px',
                display: 'inline-block'
              }}>
                {value}
              </span>
            </div>
          );
        })}
      </div>
    );
  };
  // 更新 renderColorMapping 函数以接受 safeBorderSettings 参数，添加颜色格式转换功能
  const renderColorMapping = (border, index, safeBorderSettings) => {
    // 根据字段类型获取可能的值
    let possibleValues = [];
    switch(border.field) {
      case 'category':
        possibleValues = localSettings.taskCategories;
        break;
      case 'domain':
        possibleValues = localSettings.taskDomains;
        break;
      case 'priority':
        possibleValues = localSettings.taskPriorities;
        break;
      case 'status':
        possibleValues = localSettings.taskStatuses;
        break;
      default:
        possibleValues = [];
    }

    // 颜色格式转换函数
    const convertColorToHex = (color) => {
      // 如果已经是hex格式，直接返回
      if (color && color.startsWith('#')) {
        return color;
      }

      // 如果是rgb格式
      if (color && color.startsWith('rgb')) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const r = parseInt(match[1]).toString(16).padStart(2, '0');
          const g = parseInt(match[2]).toString(16).padStart(2, '0');
          const b = parseInt(match[3]).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`;
        }
      }

      // 如果是hsl格式
      if (color && color.startsWith('hsl')) {
        // 简单处理，实际项目中可能需要更复杂的转换
        return '#cccccc'; // 默认返回灰色
      }

      // 默认返回传入的颜色或灰色
      return color || '#cccccc';
    };

    return (
      <div className="color-mapping">
        {possibleValues.map((value, valueIndex) => (
          <div key={valueIndex} className="color-mapping-item">
            <span>{value}:</span>
            <input
              type="color"
              value={border.colors[value] || '#cccccc'}
              onChange={(e) => {
                const newBorders = [...safeBorderSettings.borders];
                // 转换颜色为hex格式
                const hexColor = convertColorToHex(e.target.value);
                newBorders[index].colors[value] = hexColor;
                setLocalSettings({
                  ...localSettings,
                  borderSettings: {
                    ...safeBorderSettings,
                    borders: newBorders
                  }
                });
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  const addBorderSetting = (safeBorderSettings) => {
    setLocalSettings({
      ...localSettings,
      borderSettings: {
        ...safeBorderSettings,
        borders: [
          ...safeBorderSettings.borders,
          {
            position: 'left',
            field: 'category',
            colors: {}
          }
        ]
      }
    });
  };

  const removeBorderSetting = (index, safeBorderSettings) => {
    const newBorders = [...safeBorderSettings.borders];
    newBorders.splice(index, 1);
    setLocalSettings({
      ...localSettings,
      borderSettings: {
        ...safeBorderSettings,
        borders: newBorders
      }
    });
  };

  // 添加日历视图设置组件
  const renderCalendarStatsSettings = () => {
    // 确保 calendarViewSettings 包含所有必要的字段，包括 statItems
    const getCompleteCalendarViewSettings = (calendarViewSettings) => {
      const safeSettings = getSafeCalendarViewSettings(calendarViewSettings);
      return {
        ...safeSettings,
        statItems: calendarViewSettings?.statItems || []
      };
    };

    const completeCalendarViewSettings = getCompleteCalendarViewSettings(localSettings.calendarViewSettings);
    const statItems = completeCalendarViewSettings.statItems || [];

    // 定义字段类型选项
    const fieldTypeOptions = [
      { value: 'credit', label: '积分' },
      { value: 'category', label: '类别' },
      { value: 'domain', label: '领域' },
      { value: 'priority', label: '优先级' }
    ];

    // 根据字段类型获取对应的选项值
    const getFieldOptions = (fieldType) => {
      switch (fieldType) {
        case 'credit':
          return localSettings.creditTypes || [];
        case 'category':
          return localSettings.taskCategories || [];
        case 'domain':
          return localSettings.taskDomains || [];
        case 'priority':
          return localSettings.taskPriorities || [];
        default:
          return [];
      }
    };

    // 添加新的统计项
    const addStatItem = () => {
      const newStatItem = {
        id: Date.now(),
        fieldType: 'credit',
        fieldValue: getFieldOptions('credit')[0] || ''
      };

      setLocalSettings(prevSettings => {
        const currentCalendarSettings = prevSettings.calendarViewSettings || {};
        const currentStatItems = currentCalendarSettings.statItems || [];

        return {
          ...prevSettings,
          calendarViewSettings: {
            ...getSafeCalendarViewSettings(currentCalendarSettings),
            statItems: [...currentStatItems, newStatItem]
          }
        };
      });
    };

    // 更新统计项
    const updateStatItem = (id, field, value) => {
      setLocalSettings(prevSettings => {
        const currentCalendarSettings = prevSettings.calendarViewSettings || {};
        const currentStatItems = currentCalendarSettings.statItems || [];

        const newStatItems = currentStatItems.map(item => {
          if (item.id === id) {
            const updatedItem = { ...item, [field]: value };

            // 如果更改的是字段类型，同时更新字段值为该类型的第一项
            if (field === 'fieldType') {
              const fieldOptions = getFieldOptions(value);
              updatedItem.fieldValue = fieldOptions[0] || '';
            }

            return updatedItem;
          }
          return item;
        });

        return {
          ...prevSettings,
          calendarViewSettings: {
            ...getSafeCalendarViewSettings(currentCalendarSettings),
            statItems: newStatItems
          }
        };
      });
    };

    // 删除统计项
    const removeStatItem = (id) => {
      setLocalSettings(prevSettings => {
        const currentCalendarSettings = prevSettings.calendarViewSettings || {};
        const currentStatItems = currentCalendarSettings.statItems || [];

        const newStatItems = currentStatItems.filter(item => item.id !== id);

        return {
          ...prevSettings,
          calendarViewSettings: {
            ...getSafeCalendarViewSettings(currentCalendarSettings),
            statItems: newStatItems
          }
        };
      });
    };

    return (
      <div className="settings-section">
        <div className="setting-item">
          <label title="设置周统计或月统计网格中显示的统计项目">统计列显示项目：</label>
          <div className="stats-items-container">
            {statItems.map((item) => (
              <div key={item.id} className="stat-item-row">
                <select
                  value={item.fieldType}
                  onChange={(e) => updateStatItem(item.id, 'fieldType', e.target.value)}
                  className="stat-item-field-type"
                >
                  {fieldTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={item.fieldValue}
                  onChange={(e) => updateStatItem(item.id, 'fieldValue', e.target.value)}
                  className="stat-item-field-value"

                >
                  {getFieldOptions(item.fieldType).map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => removeStatItem(item.id)}
                  className="remove-stat-item-btn"
                  title="删除此项"
                >
                  -
                </button>
              </div>
            ))}

            <button
              onClick={addStatItem}
              className="add-stat-item-btn"
            >
              + 添加统计项
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCalendarSettings = () => {
    // 确保 calendarViewSettings 存在且有正确的结构
    const safeCalendarViewSettings = getSafeCalendarViewSettings(localSettings.calendarViewSettings);

    return (
      <details className="settings-group">
        <summary className="settings-group-title">【任务】日历视图设置</summary>
        <div className="settings-section">
          {/*<div className="setting-item inline-setting">*/}
          {/*  <label>日期字段：</label>*/}
          {/*  <select*/}
          {/*    value={safeCalendarViewSettings.dateField}*/}
          {/*    onChange={(e) => {*/}
          {/*      setLocalSettings({*/}
          {/*        ...localSettings,*/}
          {/*        calendarViewSettings: {*/}
          {/*          ...safeCalendarViewSettings,*/}
          {/*          dateField: e.target.value*/}
          {/*        }*/}
          {/*      });*/}
          {/*    }}*/}
          {/*  >*/}
          {/*    <option value="start_time">开始时间</option>*/}
          {/*    <option value="complete_time">完成时间</option>*/}
          {/*  </select>*/}
          {/*</div>*/}

          {/*<div className="setting-item inline-setting">*/}
          {/*  <label>显示字段：</label>*/}
          {/*  <select*/}
          {/*    value={safeCalendarViewSettings.displayField}*/}
          {/*    onChange={(e) => {*/}
          {/*      setLocalSettings({*/}
          {/*        ...localSettings,*/}
          {/*        calendarViewSettings: {*/}
          {/*          ...safeCalendarViewSettings,*/}
          {/*          displayField: e.target.value*/}
          {/*        }*/}
          {/*      });*/}
          {/*    }}*/}
          {/*  >*/}
          {/*    <option value="name">任务名称</option>*/}
          {/*    <option value="description">任务描述</option>*/}
          {/*  </select>*/}
          {/*</div>*/}


          <div className="setting-item inline-setting">
            <label title="任务卡片显示内容的最大字符数">任务卡片字符数：</label>
            <input
              type="number"
              value={safeCalendarViewSettings.maxChars}
              onChange={(e) => {
                setLocalSettings({
                  ...localSettings,
                  calendarViewSettings: {
                    ...safeCalendarViewSettings,
                    maxChars: parseInt(e.target.value) || 15
                  }
                });
              }}
              min="5"
              max="200"
            />
          </div>

          {/* 添加每周第一天设置 */}
          <div className="setting-item inline-setting">
            <label title="设置每周以哪天开始">每周第一天：</label>
            <select
              value={safeCalendarViewSettings.firstDayOfWeek !== undefined ?
                     safeCalendarViewSettings.firstDayOfWeek : 0}
              onChange={(e) => {
                setLocalSettings({
                  ...localSettings,
                  calendarViewSettings: {
                    ...safeCalendarViewSettings,
                    firstDayOfWeek: parseInt(e.target.value)
                  }
                });
              }}
            >
              <option value="0">星期日</option>
              <option value="1">星期一</option>
            </select>
          </div>
          <div className="setting-item inline-setting">
            <label title="单个日历网格默认显示的最大任务卡片数目">每个网格默认显示任务数：</label>
            <input
              type="number"
              value={safeCalendarViewSettings.defaultTaskCards || 3}
              onChange={(e) => {
                setLocalSettings({
                  ...localSettings,
                  calendarViewSettings: {
                    ...safeCalendarViewSettings,
                    defaultTaskCards: parseInt(e.target.value) || 3
                  }
                });
              }}
              min="1"
              max="10"
            />
          </div>

          <div className="setting-item inline-setting">
            <label title="设置鼠标悬停显示任务简要详情的方式">鼠标悬停方式：</label>
            <select
              value={localSettings.tooltipTrigger || 'shift'}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                tooltipTrigger: e.target.value
              })}
              style={{ width: '150px', marginLeft: '10px' }}
            >
              <option value="shift">Shift + 鼠标悬停</option>
              <option value="hover">鼠标悬停</option>
              <option value="disabled">禁用鼠标悬停</option>
            </select>
          </div>


          {renderCalendarStatsSettings()}
        </div>
      </details>
    );
  };

  // 在 SettingsTab.js 中添加看板视图设置
  const renderBoardViewSettings = () => {
    return (
      <details className="settings-group">
        <summary className="settings-group-title">【任务】看板视图设置</summary>
        <div className="settings-section">
          <div className="setting-item inline-setting">
            <label>任务卡片最大宽度 (像素)：</label>
            <input
              type="number"
              value={localSettings.boardViewSettings?.maxCardWidth || 300}
              onChange={(e) => {
                const newBoardViewSettings = {
                  ...localSettings.boardViewSettings,
                  maxCardWidth: parseInt(e.target.value) || 300
                };
                setLocalSettings({
                  ...localSettings,
                  boardViewSettings: newBoardViewSettings
                });
              }}
              min="150"
              max="800"
              style={{ width: '80px', marginLeft: '10px' }}
            />
          </div>

          <div className="setting-item inline-setting">
            <label>任务名称最大显示长度：</label>
            <input
              type="number"
              value={localSettings.boardViewSettings?.maxNameLength || 30}
              onChange={(e) => {
                const newBoardViewSettings = {
                  ...localSettings.boardViewSettings,
                  maxNameLength: parseInt(e.target.value) || 30
                };
                setLocalSettings({
                  ...localSettings,
                  boardViewSettings: newBoardViewSettings
                });
              }}
              min="5"
              max="100"
              style={{ width: '80px', marginLeft: '10px' }}
            />
          </div>

          <div className="setting-item inline-setting">
            <label>任务描述最大显示长度：</label>
            <input
              type="number"
              value={localSettings.boardViewSettings?.maxDescriptionLength || 100}
              onChange={(e) => {
                const newBoardViewSettings = {
                  ...localSettings.boardViewSettings,
                  maxDescriptionLength: parseInt(e.target.value) || 100
                };
                setLocalSettings({
                  ...localSettings,
                  boardViewSettings: newBoardViewSettings
                });
              }}
              min="10"
              max="500"
              style={{ width: '80px', marginLeft: '10px' }}
            />
          </div>

          <div className="setting-item inline-setting">
            <label>任务标签最大显示长度：</label>
            <input
              type="number"
              value={localSettings.boardViewSettings?.maxTagLength || 15}
              onChange={(e) => {
                const newBoardViewSettings = {
                  ...localSettings.boardViewSettings,
                  maxTagLength: parseInt(e.target.value) || 15
                };
                setLocalSettings({
                  ...localSettings,
                  boardViewSettings: newBoardViewSettings
                });
              }}
              min="5"
              max="50"
              style={{ width: '80px', marginLeft: '10px' }}
            />
          </div>
        </div>
      </details>
    );
  };


  const getSafeMainActionButtonSettings = (mainActionButtonSettings) => {
    return {
      addTask: mainActionButtonSettings?.addTask !== undefined ?
               mainActionButtonSettings.addTask : 'visible',
      batchDelete: mainActionButtonSettings?.batchDelete !== undefined ?
                   mainActionButtonSettings.batchDelete : 'visible',
      batchArchive: mainActionButtonSettings?.batchArchive !== undefined ?
                    mainActionButtonSettings.batchArchive : 'visible',
      refreshCycles: mainActionButtonSettings?.refreshCycles !== undefined ?
                    mainActionButtonSettings.refreshCycles : 'visible',
      importTasks: mainActionButtonSettings?.importTasks !== undefined ?
                   mainActionButtonSettings.importTasks : 'visible',
      exportTasks: mainActionButtonSettings?.exportTasks !== undefined ?
                   mainActionButtonSettings.exportTasks : 'visible'
    };
  };


  // 添加一个新的辅助函数来获取字段值列表
  const getFieldValues = (fieldType) => {
    switch (fieldType) {
      case 'category':
        return localSettings.taskCategories || [];
      case 'domain':
        return localSettings.taskDomains || [];
      case 'priority':
        return localSettings.taskPriorities || [];
      case 'status':
        return localSettings.taskStatuses || [];
      default:
        return [];
    }
  };
  // 添加一个辅助函数来计算对比色（黑白）
  const getContrastColor = (hexColor) => {
    // 移除 # 前缀
    const hex = hexColor.replace('#', '');

    // 计算RGB值
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // 计算亮度
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // 根据亮度返回黑色或白色
    return brightness > 128 ? '#000000' : '#ffffff';
  };
  const importColorsFromTaskFieldMapping = (fieldType, position, safeBorderSettings) => {
    // 获取当前边框设置中的颜色
    const currentColors = safeBorderSettings[position]?.colors || {};

    // 获取任务字段映射设置中的颜色
    let fieldMappingColors = {};
    switch (fieldType) {
      case 'category':
        fieldMappingColors = safeBorderSettings.left?.colors || {};
        break;
      case 'domain':
        fieldMappingColors = safeBorderSettings.top?.colors || {};
        break;
      case 'priority':
        fieldMappingColors = safeBorderSettings.right?.colors || {};
        break;
      case 'status':
        fieldMappingColors = safeBorderSettings.bottom?.colors || {};
        break;
      default:
        fieldMappingColors = {};
    }

    // 合并颜色配置，优先使用当前设置中的颜色，其次使用任务字段映射设置中的颜色
    const mergedColors = { ...fieldMappingColors, ...currentColors };

    return mergedColors;
  };
  // 在 SettingsTab.js 中修改 renderTaskFieldMapping 函数，补全颜色字段列
  // const renderTaskFieldMapping = () => {
  //   const taskFieldMappings = localSettings.taskFieldMappings || {};
  //
  //   // 修改获取字段值的方式
  //   const getCategoryMapping = (category) => {
  //     return taskFieldMappings.categories?.[category] || { weight: 0, abbreviation: '', color: '#cccccc' };
  //   };
  //
  //   // 修改更新函数
  //   const updateCategoryMapping = (category, field, value) => {
  //     setLocalSettings({
  //       ...localSettings,
  //       taskFieldMappings: {
  //         ...localSettings.taskFieldMappings,
  //         categories: {
  //           ...localSettings.taskFieldMappings?.categories,
  //           [category]: {
  //             ...getCategoryMapping(category),
  //             [field]: value
  //           }
  //         }
  //       }
  //     });
  //   };
  //
  //
  //
  //   // 确保 taskFieldWeights 存在且结构正确
  //   const safeTaskFieldWeights = {
  //     categories: localSettings.taskFieldWeights?.categories || {},
  //     domains: localSettings.taskFieldWeights?.domains || {},
  //     priorities: localSettings.taskFieldWeights?.priorities || {},
  //     statuses: localSettings.taskFieldWeights?.statuses || {},
  //     cycleTypes: localSettings.taskFieldWeights?.cycleTypes || {},
  //   };
  //
  //   // 获取各类别的值列表
  //   const categoryValues = localSettings.taskCategories || [];
  //   const domainValues = localSettings.taskDomains || [];
  //   const priorityValues = localSettings.taskPriorities || [];
  //   const statusValues = localSettings.taskStatuses || [];
  //   const cycleTypeValues = localSettings.taskCycleTypes || [];
  //
  //   // 获取安全的边框设置
  //   const safeBorderSettings = getSafeBorderSettings(localSettings.borderSettings);
  //
  //   // 辅助函数：获取字段颜色
  //   const getFieldColor = (fieldType, fieldValue) => {
  //     let colorConfig = {};
  //     switch (fieldType) {
  //       case 'category':
  //         colorConfig = safeBorderSettings.left?.colors || {};
  //         break;
  //       case 'domain':
  //         colorConfig = safeBorderSettings.top?.colors || {};
  //         break;
  //       case 'priority':
  //         colorConfig = safeBorderSettings.right?.colors || {};
  //         break;
  //       case 'status':
  //         colorConfig = safeBorderSettings.bottom?.colors || {};
  //         break;
  //       default:
  //         return '#cccccc';
  //     }
  //     return colorConfig[fieldValue] || '#cccccc';
  //   };
  //
  //   // 辅助函数：更新字段颜色
  //   const updateFieldColor = (fieldType, fieldValue, color) => {
  //     const positionMap = {
  //       'category': 'left',
  //       'domain': 'top',
  //       'priority': 'right',
  //       'status': 'bottom'
  //     };
  //
  //     const position = positionMap[fieldType];
  //     if (!position) return;
  //
  //     const newBorderSettings = { ...safeBorderSettings };
  //     if (!newBorderSettings[position]) {
  //       newBorderSettings[position] = { enabled: { board: false, calendar: false }, field: fieldType, colors: {} };
  //     }
  //     if (!newBorderSettings[position].colors) {
  //       newBorderSettings[position].colors = {};
  //     }
  //
  //     newBorderSettings[position].colors[fieldValue] = color;
  //
  //     setLocalSettings({
  //       ...localSettings,
  //       borderSettings: newBorderSettings
  //     });
  //   };
  //
  //   return (
  //     <details className="settings-group">
  //       <summary className="settings-group-title">【任务】字段映射设置</summary>
  //
  //       <div className="settings-section">
  //         <h4>任务字段权重与简称映射</h4>
  //         <p>为不同任务字段设置权重值和简称，用于任务积分计算和显示优化</p>
  //
  //         <table className="field-mapping-table">
  //           <thead>
  //             <tr>
  //               <th>字段类型</th>
  //               <th>字段值</th>
  //               <th>权重</th>
  //               <th>简称</th>
  //               <th>颜色</th>
  //             </tr>
  //           </thead>
  //           <tbody>
  //             {/* 类别映射 */}
  //             {categoryValues.map((category, index) => {
  //               const weight = safeTaskFieldWeights.categories[category] || 0;
  //               // 获取简称，如果不存在则使用默认值（前两个字符）
  //               const abbreviation = localSettings.fieldAbbreviations?.categories?.[category] ||
  //                                   (category.length > 2 ? category.substring(0, 2) : category);
  //               // 获取颜色
  //               const color = getFieldColor('category', category);
  //
  //               return (
  //                 <tr key={`category-${index}`}>
  //                   {index === 0 && (
  //                     <td rowSpan={categoryValues.length}>类别</td>
  //                   )}
  //                   <td>{category}</td>
  //                   <td>
  //                     <input
  //                       type="number"
  //                       value={weight}
  //                       onChange={(e) => {
  //                         const newWeights = {
  //                           ...localSettings.taskFieldWeights,
  //                           categories: {
  //                             ...localSettings.taskFieldWeights.categories,
  //                             [category]: parseFloat(e.target.value) || 0
  //                           }
  //                         };
  //                         setLocalSettings({
  //                           ...localSettings,
  //                           taskFieldWeights: newWeights
  //                         });
  //                       }}
  //                       step="0.1"
  //                     />
  //                   </td>
  //                   <td>
  //                     <input
  //                       type="text"
  //                       value={abbreviation}
  //                       onChange={(e) => {
  //                         const newAbbreviations = {
  //                           ...localSettings.fieldAbbreviations,
  //                           categories: {
  //                             ...localSettings.fieldAbbreviations?.categories,
  //                             [category]: e.target.value
  //                           }
  //                         };
  //                         setLocalSettings({
  //                           ...localSettings,
  //                           fieldAbbreviations: newAbbreviations
  //                         });
  //                       }}
  //                       maxLength="4"
  //                       placeholder="简称"
  //                     />
  //                   </td>
  //                   <td>
  //                     <div className="color-input-combo">
  //                       <input
  //                         type="color"
  //                         value={color}
  //                         onChange={(e) => updateFieldColor('category', category, e.target.value)}
  //                         className="color-picker"
  //                       />
  //                       <input
  //                         type="text"
  //                         value={color}
  //                         onChange={(e) => updateFieldColor('category', category, e.target.value)}
  //                         placeholder="#cccccc"
  //                         className="hex-input"
  //                       />
  //                     </div>
  //                   </td>
  //                 </tr>
  //               );
  //             })}
  //
  //             {/* 领域映射 */}
  //             {domainValues.map((domain, index) => {
  //               const weight = safeTaskFieldWeights.domains[domain] || 0;
  //               // 获取简称，如果不存在则使用默认值（前两个字符）
  //               const abbreviation = localSettings.fieldAbbreviations?.domains?.[domain] ||
  //                                   (domain.length > 2 ? domain.substring(0, 2) : domain);
  //               // 获取颜色
  //               const color = getFieldColor('domain', domain);
  //
  //               return (
  //                 <tr key={`domain-${index}`}>
  //                   {index === 0 && (
  //                     <td rowSpan={domainValues.length}>领域</td>
  //                   )}
  //                   <td>{domain}</td>
  //                   <td>
  //                     <input
  //                       type="number"
  //                       value={weight}
  //                       onChange={(e) => {
  //                         const newWeights = {
  //                           ...localSettings.taskFieldWeights,
  //                           domains: {
  //                             ...localSettings.taskFieldWeights.domains,
  //                             [domain]: parseFloat(e.target.value) || 0
  //                           }
  //                         };
  //                         setLocalSettings({
  //                           ...localSettings,
  //                           taskFieldWeights: newWeights
  //                         });
  //                       }}
  //                       step="0.1"
  //                     />
  //                   </td>
  //                   <td>
  //                     <input
  //                       type="text"
  //                       value={abbreviation}
  //                       onChange={(e) => {
  //                         const newAbbreviations = {
  //                           ...localSettings.fieldAbbreviations,
  //                           domains: {
  //                             ...localSettings.fieldAbbreviations?.domains,
  //                             [domain]: e.target.value
  //                           }
  //                         };
  //                         setLocalSettings({
  //                           ...localSettings,
  //                           fieldAbbreviations: newAbbreviations
  //                         });
  //                       }}
  //                       maxLength="4"
  //                       placeholder="简称"
  //                     />
  //                   </td>
  //                   <td>
  //                     <div className="color-input-combo">
  //                       <input
  //                         type="color"
  //                         value={color}
  //                         onChange={(e) => updateFieldColor('domain', domain, e.target.value)}
  //                         className="color-picker"
  //                       />
  //                       <input
  //                         type="text"
  //                         value={color}
  //                         onChange={(e) => updateFieldColor('domain', domain, e.target.value)}
  //                         placeholder="#cccccc"
  //                         className="hex-input"
  //                       />
  //                     </div>
  //                   </td>
  //                 </tr>
  //               );
  //             })}
  //
  //             {/* 优先级映射 */}
  //             {priorityValues.map((priority, index) => {
  //               const weight = safeTaskFieldWeights.priorities[priority] || 0;
  //               // 获取简称，如果不存在则使用默认值（前两个字符）
  //               const abbreviation = localSettings.fieldAbbreviations?.priorities?.[priority] ||
  //                                   (priority.length > 2 ? priority.substring(0, 2) : priority);
  //               // 获取颜色
  //               const color = getFieldColor('priority', priority);
  //
  //               return (
  //                 <tr key={`priority-${index}`}>
  //                   {index === 0 && (
  //                     <td rowSpan={priorityValues.length}>优先级</td>
  //                   )}
  //                   <td>{priority}</td>
  //                   <td>
  //                     <input
  //                       type="number"
  //                       value={weight}
  //                       onChange={(e) => {
  //                         const newWeights = {
  //                           ...localSettings.taskFieldWeights,
  //                           priorities: {
  //                             ...localSettings.taskFieldWeights.priorities,
  //                             [priority]: parseFloat(e.target.value) || 0
  //                           }
  //                         };
  //                         setLocalSettings({
  //                           ...localSettings,
  //                           taskFieldWeights: newWeights
  //                         });
  //                       }}
  //                       step="0.1"
  //                     />
  //                   </td>
  //                   <td>
  //                     <input
  //                       type="text"
  //                       value={abbreviation}
  //                       onChange={(e) => {
  //                         const newAbbreviations = {
  //                           ...localSettings.fieldAbbreviations,
  //                           priorities: {
  //                             ...localSettings.fieldAbbreviations?.priorities,
  //                             [priority]: e.target.value
  //                           }
  //                         };
  //                         setLocalSettings({
  //                           ...localSettings,
  //                           fieldAbbreviations: newAbbreviations
  //                         });
  //                       }}
  //                       maxLength="4"
  //                       placeholder="简称"
  //                     />
  //                   </td>
  //                   <td>
  //                     <div className="color-input-combo">
  //                       <input
  //                         type="color"
  //                         value={color}
  //                         onChange={(e) => updateFieldColor('priority', priority, e.target.value)}
  //                         className="color-picker"
  //                       />
  //                       <input
  //                         type="text"
  //                         value={color}
  //                         onChange={(e) => updateFieldColor('priority', priority, e.target.value)}
  //                         placeholder="#cccccc"
  //                         className="hex-input"
  //                       />
  //                     </div>
  //                   </td>
  //                 </tr>
  //               );
  //             })}
  //
  //             {/* 状态映射 */}
  //             {statusValues.map((status, index) => {
  //               const weight = safeTaskFieldWeights.statuses[status] || 0;
  //               // 获取简称，如果不存在则使用默认值（前两个字符）
  //               const abbreviation = localSettings.fieldAbbreviations?.statuses?.[status] ||
  //                                   (status.length > 2 ? status.substring(0, 2) : status);
  //               // 获取颜色
  //               const color = getFieldColor('status', status);
  //
  //               return (
  //                 <tr key={`status-${index}`}>
  //                   {index === 0 && (
  //                     <td rowSpan={statusValues.length}>状态</td>
  //                   )}
  //                   <td>{status}</td>
  //                   <td>
  //                     <input
  //                       type="number"
  //                       value={weight}
  //                       onChange={(e) => {
  //                         const newWeights = {
  //                           ...localSettings.taskFieldWeights,
  //                           statuses: {
  //                             ...localSettings.taskFieldWeights.statuses,
  //                             [status]: parseFloat(e.target.value) || 0
  //                           }
  //                         };
  //                         setLocalSettings({
  //                           ...localSettings,
  //                           taskFieldWeights: newWeights
  //                         });
  //                       }}
  //                       step="0.1"
  //                     />
  //                   </td>
  //                   <td>
  //                     <input
  //                       type="text"
  //                       value={abbreviation}
  //                       onChange={(e) => {
  //                         const newAbbreviations = {
  //                           ...localSettings.fieldAbbreviations,
  //                           statuses: {
  //                             ...localSettings.fieldAbbreviations?.statuses,
  //                             [status]: e.target.value
  //                           }
  //                         };
  //                         setLocalSettings({
  //                           ...localSettings,
  //                           fieldAbbreviations: newAbbreviations
  //                         });
  //                       }}
  //                       maxLength="4"
  //                       placeholder="简称"
  //                     />
  //                   </td>
  //                   <td>
  //                     <div className="color-input-combo">
  //                       <input
  //                         type="color"
  //                         value={color}
  //                         onChange={(e) => updateFieldColor('status', status, e.target.value)}
  //                         className="color-picker"
  //                       />
  //                       <input
  //                         type="text"
  //                         value={color}
  //                         onChange={(e) => updateFieldColor('status', status, e.target.value)}
  //                         placeholder="#cccccc"
  //                         className="hex-input"
  //                       />
  //                     </div>
  //                   </td>
  //                 </tr>
  //               );
  //             })}
  //
  //             {/* 循环周期映射 */}
  //             {cycleTypeValues.map((cycleType, index) => {
  //               const weight = safeTaskFieldWeights.cycleTypes[cycleType] || 0;
  //               // 获取简称，如果不存在则使用默认值（前两个字符）
  //               const abbreviation = localSettings.fieldAbbreviations?.cycleTypes?.[cycleType] ||
  //                                   (cycleType.length > 2 ? cycleType.substring(0, 2) : cycleType);
  //
  //               return (
  //                 <tr key={`cycleType-${index}`}>
  //                   {index === 0 && (
  //                     <td rowSpan={cycleTypeValues.length}>循环周期</td>
  //                   )}
  //                   <td>{cycleType}</td>
  //                   <td>
  //                     <input
  //                       type="number"
  //                       value={weight}
  //                       onChange={(e) => {
  //                         const newWeights = {
  //                           ...localSettings.taskFieldWeights,
  //                           cycleTypes: {
  //                             ...localSettings.taskFieldWeights.cycleTypes,
  //                             [cycleType]: parseFloat(e.target.value) || 0
  //                           }
  //                         };
  //                         setLocalSettings({
  //                           ...localSettings,
  //                           taskFieldWeights: newWeights
  //                         });
  //                       }}
  //                       step="0.1"
  //                     />
  //                   </td>
  //                   <td>
  //                     <input
  //                       type="text"
  //                       value={abbreviation}
  //                       onChange={(e) => {
  //                         const newAbbreviations = {
  //                           ...localSettings.fieldAbbreviations,
  //                           cycleTypes: {
  //                             ...localSettings.fieldAbbreviations?.cycleTypes,
  //                             [cycleType]: e.target.value
  //                           }
  //                         };
  //                         setLocalSettings({
  //                           ...localSettings,
  //                           fieldAbbreviations: newAbbreviations
  //                         });
  //                       }}
  //                       maxLength="4"
  //                       placeholder="简称"
  //                     />
  //                   </td>
  //                   <td>
  //                     <div className="color-input-combo">
  //                       <div className="color-picker-wrapper">
  //                         <input
  //                           type="color"
  //                           value="#cccccc"
  //                           className="color-picker"
  //                           disabled
  //                         />
  //                       </div>
  //                       <div className="hex-input-wrapper">
  //                         <input
  //                           type="text"
  //                           value="#cccccc"
  //                           placeholder="#cccccc"
  //                           className="hex-input"
  //                           disabled
  //                         />
  //                       </div>
  //                     </div>
  //                   </td>
  //                 </tr>
  //               );
  //             })}
  //           </tbody>
  //         </table>
  //       </div>
  //     </details>
  //   );
  // };
  // 在 SettingsTab.js 中修改 renderTaskFieldMapping 函数，整合所有字段类型的处理
  // 在 SettingsTab.js 中修改 renderTaskFieldMapping 函数

  // 在 SettingsTab.js 中修改 renderTaskFieldMapping 函数，添加代码字段
  const renderTaskFieldMapping = () => {
    const taskFieldMappings = localSettings.taskFieldMappings || {};

    // 通用函数：获取字段映射信息
    const getFieldMapping = (fieldType, fieldValue) => {
      return taskFieldMappings[fieldType]?.[fieldValue] || {
        weight: 0,
        abbreviation: fieldValue.length > 2 ? fieldValue.substring(0, 2) : fieldValue,
        color: '#cccccc',
        code: ''
      };
    };

    // 通用函数：更新字段映射信息
    const updateFieldMapping = (fieldType, fieldValue, field, value) => {
      setLocalSettings({
        ...localSettings,
        taskFieldMappings: {
          ...localSettings.taskFieldMappings,
          [fieldType]: {
            ...localSettings.taskFieldMappings?.[fieldType],
            [fieldValue]: {
              ...getFieldMapping(fieldType, fieldValue),
              [field]: value
            }
          }
        }
      });
    };

    // 获取各类别的值列表
    const categoryValues = localSettings.taskCategories || [];
    const domainValues = localSettings.taskDomains || [];
    const priorityValues = localSettings.taskPriorities || [];
    const statusValues = localSettings.taskStatuses || [];
    const cycleTypeValues = localSettings.taskCycleTypes || [];

    return (
      <details className="settings-group">
        <summary className="settings-group-title">【任务】字段映射设置</summary>

        <div className="settings-section">
          <h4>任务字段权重与简称映射</h4>
          <p>为不同任务字段设置权重值、简称、代码、高亮颜色，用于任务积分计算、高效显示、快速输入等</p>

          <table className="field-mapping-table">
            <thead>
              <tr>
                <th>字段类型</th>
                <th>字段值</th>
                <th>权重</th>
                <th>简称</th>
                <th>代码</th>
                <th>颜色</th>
              </tr>
            </thead>
            <tbody>
              {/* 类别映射 */}
              {categoryValues.map((category, index) => {
                const mapping = getFieldMapping('categories', category);

                return (
                  <tr key={`category-${index}`}>
                    {index === 0 && (
                      <td rowSpan={categoryValues.length}>类别</td>
                    )}
                    <td>{category}</td>
                    <td>
                      <input
                        type="number"
                        value={mapping.weight}
                        onChange={(e) => updateFieldMapping('categories', category, 'weight', parseFloat(e.target.value) || 0)}
                        step="0.1"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={mapping.abbreviation}
                        onChange={(e) => updateFieldMapping('categories', category, 'abbreviation', e.target.value)}
                        maxLength="4"
                        placeholder="简称"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={mapping.code}
                        onChange={(e) => updateFieldMapping('categories', category, 'code', e.target.value)}
                        maxLength="10"
                        placeholder="代码"
                      />
                    </td>
                    <td>
                      <div className="color-input-combo">
                        <input
                          type="color"
                          value={mapping.color}
                          onChange={(e) => updateFieldMapping('categories', category, 'color', e.target.value)}
                          className="color-picker"
                        />
                        <input
                          type="text"
                          value={mapping.color}
                          onChange={(e) => updateFieldMapping('categories', category, 'color', e.target.value)}
                          placeholder="#cccccc"
                          className="hex-input"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* 领域映射 */}
              {domainValues.map((domain, index) => {
                const mapping = getFieldMapping('domains', domain);

                return (
                  <tr key={`domain-${index}`}>
                    {index === 0 && (
                      <td rowSpan={domainValues.length}>领域</td>
                    )}
                    <td>{domain}</td>
                    <td>
                      <input
                        type="number"
                        value={mapping.weight}
                        onChange={(e) => updateFieldMapping('domains', domain, 'weight', parseFloat(e.target.value) || 0)}
                        step="0.1"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={mapping.abbreviation}
                        onChange={(e) => updateFieldMapping('domains', domain, 'abbreviation', e.target.value)}
                        maxLength="4"
                        placeholder="简称"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={mapping.code}
                        onChange={(e) => updateFieldMapping('domains', domain, 'code', e.target.value)}
                        maxLength="10"
                        placeholder="代码"
                      />
                    </td>
                    <td>
                      <div className="color-input-combo">
                        <input
                          type="color"
                          value={mapping.color}
                          onChange={(e) => updateFieldMapping('domains', domain, 'color', e.target.value)}
                          className="color-picker"
                        />
                        <input
                          type="text"
                          value={mapping.color}
                          onChange={(e) => updateFieldMapping('domains', domain, 'color', e.target.value)}
                          placeholder="#cccccc"
                          className="hex-input"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* 优先级映射 */}
              {priorityValues.map((priority, index) => {
                const mapping = getFieldMapping('priorities', priority);

                return (
                  <tr key={`priority-${index}`}>
                    {index === 0 && (
                      <td rowSpan={priorityValues.length}>优先级</td>
                    )}
                    <td>{priority}</td>
                    <td>
                      <input
                        type="number"
                        value={mapping.weight}
                        onChange={(e) => updateFieldMapping('priorities', priority, 'weight', parseFloat(e.target.value) || 0)}
                        step="0.1"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={mapping.abbreviation}
                        onChange={(e) => updateFieldMapping('priorities', priority, 'abbreviation', e.target.value)}
                        maxLength="4"
                        placeholder="简称"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={mapping.code}
                        onChange={(e) => updateFieldMapping('priorities', priority, 'code', e.target.value)}
                        maxLength="10"
                        placeholder="代码"
                      />
                    </td>
                    <td>
                      <div className="color-input-combo">
                        <input
                          type="color"
                          value={mapping.color}
                          onChange={(e) => updateFieldMapping('priorities', priority, 'color', e.target.value)}
                          className="color-picker"
                        />
                        <input
                          type="text"
                          value={mapping.color}
                          onChange={(e) => updateFieldMapping('priorities', priority, 'color', e.target.value)}
                          placeholder="#cccccc"
                          className="hex-input"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* 状态映射 */}
              {statusValues.map((status, index) => {
                const mapping = getFieldMapping('statuses', status);

                return (
                  <tr key={`status-${index}`}>
                    {index === 0 && (
                      <td rowSpan={statusValues.length}>状态</td>
                    )}
                    <td>{status}</td>
                    <td>
                      <input
                        type="number"
                        value={mapping.weight}
                        onChange={(e) => updateFieldMapping('statuses', status, 'weight', parseFloat(e.target.value) || 0)}
                        step="0.1"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={mapping.abbreviation}
                        onChange={(e) => updateFieldMapping('statuses', status, 'abbreviation', e.target.value)}
                        maxLength="4"
                        placeholder="简称"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={mapping.code}
                        onChange={(e) => updateFieldMapping('statuses', status, 'code', e.target.value)}
                        maxLength="10"
                        placeholder="代码"
                      />
                    </td>
                    <td>
                      <div className="color-input-combo">
                        <input
                          type="color"
                          value={mapping.color}
                          onChange={(e) => updateFieldMapping('statuses', status, 'color', e.target.value)}
                          className="color-picker"
                        />
                        <input
                          type="text"
                          value={mapping.color}
                          onChange={(e) => updateFieldMapping('statuses', status, 'color', e.target.value)}
                          placeholder="#cccccc"
                          className="hex-input"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* 循环周期映射 */}
              {cycleTypeValues.map((cycleType, index) => {
                const mapping = getFieldMapping('cycleTypes', cycleType);

                return (
                  <tr key={`cycleType-${index}`}>
                    {index === 0 && (
                      <td rowSpan={cycleTypeValues.length}>循环周期</td>
                    )}
                    <td>{cycleType}</td>
                    <td>
                      <input
                        type="number"
                        value={mapping.weight}
                        onChange={(e) => updateFieldMapping('cycleTypes', cycleType, 'weight', parseFloat(e.target.value) || 0)}
                        step="0.1"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={mapping.abbreviation}
                        onChange={(e) => updateFieldMapping('cycleTypes', cycleType, 'abbreviation', e.target.value)}
                        maxLength="4"
                        placeholder="简称"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={mapping.code}
                        onChange={(e) => updateFieldMapping('cycleTypes', cycleType, 'code', e.target.value)}
                        maxLength="10"
                        placeholder="代码"
                      />
                    </td>
                    <td>
                      <div className="color-input-combo">
                        <input
                          type="color"
                          value={mapping.color}
                          onChange={(e) => updateFieldMapping('cycleTypes', cycleType, 'color', e.target.value)}
                          className="color-picker"
                        />
                        <input
                          type="text"
                          value={mapping.color}
                          onChange={(e) => updateFieldMapping('cycleTypes', cycleType, 'color', e.target.value)}
                          placeholder="#cccccc"
                          className="hex-input"
                        />
                      </div>
                      {/*<div className="color-input-combo">*/}
                      {/*  <div className="color-picker-wrapper">*/}
                      {/*    <input*/}
                      {/*      type="color"*/}
                      {/*      value="#cccccc"*/}
                      {/*      className="color-picker"*/}
                      {/*    />*/}
                      {/*  </div>*/}
                      {/*  <div className="hex-input-wrapper">*/}
                      {/*    <input*/}
                      {/*      type="text"*/}
                      {/*      value="#cccccc"*/}
                      {/*      placeholder="#cccccc"*/}
                      {/*      className="hex-input"*/}
                      {/*    />*/}
                      {/*  </div>*/}
                      {/*</div>*/}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    );
  };



  const renderActionButtonSettings = () => {
    return (
      <details className="settings-group">
        <summary className="settings-group-title">【任务】操作按钮设置</summary>
        <div className="settings-section">
          <h4>操作按钮</h4>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.actionButtonSettings?.view === 'visible'}
                onChange={(e) => {
                  const newSettings = {
                    ...localSettings.actionButtonSettings,
                    view: e.target.checked ? 'visible' : 'hidden'
                  };
                  setLocalSettings({
                    ...localSettings,
                    actionButtonSettings: newSettings
                  });
                }}
              />
              显示查看按钮
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.actionButtonSettings?.edit === 'visible'}
                onChange={(e) => {
                  const newSettings = {
                    ...localSettings.actionButtonSettings,
                    edit: e.target.checked ? 'visible' : 'hidden'
                  };
                  setLocalSettings({
                    ...localSettings,
                    actionButtonSettings: newSettings
                  });
                }}
              />
              显示编辑按钮
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.actionButtonSettings?.complete === 'visible'}
                onChange={(e) => {
                  const newSettings = {
                    ...localSettings.actionButtonSettings,
                    complete: e.target.checked ? 'visible' : 'hidden'
                  };
                  setLocalSettings({
                    ...localSettings,
                    actionButtonSettings: newSettings
                  });
                }}
              />
              显示完成按钮
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.actionButtonSettings?.copy === 'visible'}
                onChange={(e) => {
                  const newSettings = {
                    ...localSettings.actionButtonSettings,
                    copy: e.target.checked ? 'visible' : 'hidden'
                  };
                  setLocalSettings({
                    ...localSettings,
                    actionButtonSettings: newSettings
                  });
                }}
              />
              显示复制按钮
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.actionButtonSettings?.delete === 'visible'}
                onChange={(e) => {
                  const newSettings = {
                    ...localSettings.actionButtonSettings,
                    delete: e.target.checked ? 'visible' : 'hidden'
                  };
                  setLocalSettings({
                    ...localSettings,
                    actionButtonSettings: newSettings
                  });
                }}
              />
              显示删除按钮
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.actionButtonSettings?.archive === 'visible'}
                onChange={(e) => {
                  const newSettings = {
                    ...localSettings.actionButtonSettings,
                    archive: e.target.checked ? 'visible' : 'hidden'
                  };
                  setLocalSettings({
                    ...localSettings,
                    actionButtonSettings: newSettings
                  });
                }}
              />
              显示归档按钮
            </label>
          </div>

          <h4>主操作按钮</h4>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.mainActionButtonSettings?.quickAddTask === 'visible'}
                onChange={(e) => {
                  const newSettings = {
                    ...localSettings.mainActionButtonSettings,
                    quickAddTask: e.target.checked ? 'visible' : 'hidden'
                  };
                  setLocalSettings({
                    ...localSettings,
                    mainActionButtonSettings: newSettings
                  });
                }}
              />
              显示快速新增任务按钮
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.mainActionButtonSettings?.addTask === 'visible'}
                onChange={(e) => {
                  const newSettings = {
                    ...localSettings.mainActionButtonSettings,
                    addTask: e.target.checked ? 'visible' : 'hidden'
                  };
                  setLocalSettings({
                    ...localSettings,
                    mainActionButtonSettings: newSettings
                  });
                }}
              />
              显示新增任务按钮
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.mainActionButtonSettings?.batchDelete === 'visible'}
                onChange={(e) => {
                  const newSettings = {
                    ...localSettings.mainActionButtonSettings,
                    batchDelete: e.target.checked ? 'visible' : 'hidden'
                  };
                  setLocalSettings({
                    ...localSettings,
                    mainActionButtonSettings: newSettings
                  });
                }}
              />
              显示批量删除按钮
            </label>
          </div>

          {/*<div className="setting-item">*/}
          {/*  <label>*/}
          {/*    <input*/}
          {/*      type="checkbox"*/}
          {/*      checked={localSettings.mainActionButtonSettings?.batchArchive === 'visible'}*/}
          {/*      onChange={(e) => {*/}
          {/*        const newSettings = {*/}
          {/*          ...localSettings.mainActionButtonSettings,*/}
          {/*          batchArchive: e.target.checked ? 'visible' : 'hidden'*/}
          {/*        };*/}
          {/*        setLocalSettings({*/}
          {/*          ...localSettings,*/}
          {/*          mainActionButtonSettings: newSettings*/}
          {/*        });*/}
          {/*      }}*/}
          {/*    />*/}
          {/*    显示批量归档按钮*/}
          {/*  </label>*/}
          {/*</div>*/}

          {/*<div className="setting-item">*/}
          {/*  <label>*/}
          {/*    <input*/}
          {/*      type="checkbox"*/}
          {/*      checked={localSettings.mainActionButtonSettings?.refreshCycles === 'visible'}*/}
          {/*      onChange={(e) => {*/}
          {/*        const newSettings = {*/}
          {/*          ...localSettings.mainActionButtonSettings,*/}
          {/*          refreshCycles: e.target.checked ? 'visible' : 'hidden'*/}
          {/*        };*/}
          {/*        setLocalSettings({*/}
          {/*          ...localSettings,*/}
          {/*          mainActionButtonSettings: newSettings*/}
          {/*        });*/}
          {/*      }}*/}
          {/*    />*/}
          {/*    显示刷新循环周期按钮*/}
          {/*  </label>*/}
          {/*</div>*/}

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.mainActionButtonSettings?.importTasks === 'visible'}
                onChange={(e) => {
                  const newSettings = {
                    ...localSettings.mainActionButtonSettings,
                    importTasks: e.target.checked ? 'visible' : 'hidden'
                  };
                  setLocalSettings({
                    ...localSettings,
                    mainActionButtonSettings: newSettings
                  });
                }}
              />
              显示导入任务按钮
            </label>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={localSettings.mainActionButtonSettings?.exportTasks === 'visible'}
                onChange={(e) => {
                  const newSettings = {
                    ...localSettings.mainActionButtonSettings,
                    exportTasks: e.target.checked ? 'visible' : 'hidden'
                  };
                  setLocalSettings({
                    ...localSettings,
                    mainActionButtonSettings: newSettings
                  });
                }}
              />
              显示导出任务按钮
            </label>
          </div>



          <div className="setting-item">
            <p>注：未勾选的按钮将被收纳至"更多"下拉菜单中</p>
          </div>
        </div>
      </details>
    );
  };

  // 在 SettingsTab.js 中替换原来的 renderCharacterSettings 函数
  // 替换 SettingsTab.js 中的 renderCharacterSettings 函数
  const renderCharacterSettings = () => {
    // 确保必要的字段存在
    const characterSettings = localSettings.characterSettings || [];

    // 获取已经被使用的值
    const usedCreditTypes = new Set();
    const usedDomains = new Set();
    const usedPropertyCategories = new Set();

    characterSettings.forEach(item => {
      if (item.creditType) usedCreditTypes.add(item.creditType);
      if (item.domain) usedDomains.add(item.domain);
      if (item.propertyCategory) usedPropertyCategories.add(item.propertyCategory);
    });

    return (
      <details className="settings-group">
        <summary className="settings-group-title">面板设置</summary>

        <div className="settings-subsection">
          <h4>积分类型、任务领域与属性类别映射</h4>
          <p>设置积分类型、任务领域与属性类别三者之间的对应关系</p>

          <table className="field-mapping-table compact">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>任务领域</th>
                <th style={{ width: '15%' }}>属性类别</th>
                <th style={{ width: '10%' }}>属性图标</th>
                <th style={{ width: '10%' }}>属性颜色</th>
                <th style={{ width: '15%' }}>积分类型</th>
                <th style={{ width: '15%' }}>积分图标</th>
                <th style={{ width: '10%' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {characterSettings.map((item, index) => {
                // 为当前行过滤掉已被其他行使用的选项，但保留当前行自己的值
                const availableCreditTypes = localSettings.creditTypes.filter(type =>
                  !usedCreditTypes.has(type) || type === item.creditType
                );

                const availableDomains = (localSettings.taskDomains || []).filter(domain =>
                  !usedDomains.has(domain) || domain === item.domain
                );

                const availablePropertyCategories = (localSettings.propertyCategories || []).filter(category =>
                  !usedPropertyCategories.has(category) || category === item.propertyCategory
                );

                return (
                  <tr key={index}>
                    <td>
                      <select
                        value={item.domain || ''}
                        onChange={(e) => {
                          const newSettings = [...characterSettings];
                          newSettings[index].domain = e.target.value;
                          setLocalSettings({
                            ...localSettings,
                            characterSettings: newSettings
                          });
                        }}
                        style={{ width: '100%' }}
                      >
                        <option value="">选择任务领域</option>
                        {availableDomains.map(domain => (
                          <option key={domain} value={domain}>{domain}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={item.propertyCategory || ''}
                        onChange={(e) => {
                          const newSettings = [...characterSettings];
                          newSettings[index].propertyCategory = e.target.value;
                          setLocalSettings({
                            ...localSettings,
                            characterSettings: newSettings
                          });
                        }}
                        style={{ width: '100%' }}
                      >
                        <option value="">选择属性类别</option>
                        {availablePropertyCategories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <input
                        type="text"
                        value={item.icon || ''}
                        onChange={(e) => {
                          const newSettings = [...characterSettings];
                          newSettings[index].icon = e.target.value;
                          setLocalSettings({
                            ...localSettings,
                            characterSettings: newSettings
                          });
                        }}
                        placeholder="图标"
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={item.color || '#666666'}
                          onChange={(e) => {
                            const newSettings = [...characterSettings];
                            newSettings[index].color = e.target.value;
                            setLocalSettings({
                              ...localSettings,
                              characterSettings: newSettings
                            });
                          }}
                          style={{ width: '65px', marginRight: '5px' }}
                        />
                        <input
                          type="color"
                          value={item.color || '#666666'}
                          onChange={(e) => {
                            const newSettings = [...characterSettings];
                            newSettings[index].color = e.target.value;
                            setLocalSettings({
                              ...localSettings,
                              characterSettings: newSettings
                            });
                          }}
                          style={{ width: '15px', height: '20px', padding: '0', border: 'none', cursor: 'pointer' }}
                          title="选择颜色"
                        />
                      </div>
                    </td>
                    <td>
                      <select
                        value={item.creditType || ''}
                        onChange={(e) => {
                          const newSettings = [...characterSettings];
                          newSettings[index].creditType = e.target.value;
                          setLocalSettings({
                            ...localSettings,
                            characterSettings: newSettings
                          });
                        }}
                        style={{ width: '100%' }}
                      >
                        <option value="">选择积分类型</option>
                        {availableCreditTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.creditIcon || ''}
                        onChange={(e) => {
                          const newSettings = [...characterSettings];
                          newSettings[index].creditIcon = e.target.value;
                          setLocalSettings({
                            ...localSettings,
                            characterSettings: newSettings
                          });
                        }}
                        placeholder="图标"
                        style={{ width: '100%' }}
                      />
                    </td>
                    <td>
                      <button onClick={() => {
                        const newSettings = [...characterSettings];
                        newSettings.splice(index, 1);
                        setLocalSettings({
                          ...localSettings,
                          characterSettings: newSettings
                        });
                      }} style={{ padding: '4px 8px'}}>
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan="7">
                  <button onClick={() => {
                    const newSettings = [...(localSettings.characterSettings || []),
                      { creditType: '', domain: '', propertyCategory: '', icon: '', color: '#666666', creditIcon: '' }];
                    setLocalSettings({
                      ...localSettings,
                      characterSettings: newSettings
                    });
                  }} style={{ padding: '5px 10px' }}>
                    添加映射关系
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    );
  };

  // 在 SettingsTab.js 中添加新的状态管理函数
  const updateGmCommands = (newGmCommands) => {
    setLocalSettings({
      ...localSettings,
      gmCommands: newGmCommands
    });
  };



  // 在 SettingsTab.js 中添加默认游戏世界设置的渲染函数
  const renderDefaultParallelWorldSetting = () => {
    const worldOptions = localSettings.parallelWorlds || ["默认世界", "幻想世界", "科幻世界", "古代世界"];

    return (
      <div className="setting-item inline-setting">
        <label>默认游戏世界：</label>
        <select
          value={localSettings.defaultParallelWorld || worldOptions[0]}
          onChange={(e) => setLocalSettings({
            ...localSettings,
            defaultParallelWorld: e.target.value
          })}
        >
          {worldOptions.map(world => (
            <option key={world} value={world}>{world}</option>
          ))}
        </select>
      </div>
    );
  };

  // 在 SettingsTab.js 中添加 GM 命令设置渲染函数
  // 替换 SettingsTab.js 中的 renderGmCommandSettings 函数中的相应部分
  const renderGmCommandSettings = () => {
    const gmCommands = localSettings.gmCommands || {};

    // 使用字段设置中的游戏世界选项
    const worldOptions = localSettings.parallelWorlds || ["默认世界", "幻想世界", "科幻世界", "古代世界"];

    // 获取已配置的命令列表
    const configuredCommands = Object.entries(gmCommands);

    return (
      <details className="settings-group">
        <summary className="settings-group-title">【道具】对接游戏世界</summary>
        <div className="settings-section">

          <h4>游戏世界GM命令模板配置</h4>
          <p>{'为不同游戏设置GM命令公式，{}内填入任意自定义变量，<>内填入保留变量如数目，第一条为默认模板'}</p>
          <div className="gm-command-settings">
            {configuredCommands.map(([id, commandData]) => (
              <div key={id} className="setting-item inline-setting">
                <select
                  value={commandData.gameWorld || ''}
                  onChange={(e) => {
                    const newGmCommands = {
                      ...gmCommands,
                      [id]: {
                        ...commandData,
                        gameWorld: e.target.value
                      }
                    };
                    updateGmCommands(newGmCommands);
                  }}
                  style={{ width: '150px', marginRight: '10px' }}
                >
                  <option value="">选择游戏世界</option>
                  {worldOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={commandData.gmCommand || ''}
                  onChange={(e) => {
                    const newGmCommands = {
                      ...gmCommands,
                      [id]: {
                        ...commandData,
                        gmCommand: e.target.value
                      }
                    };
                    updateGmCommands(newGmCommands);
                  }}
                  placeholder="例如: .additem {item} <count>"
                  style={{ flex: 1, marginRight: '10px' }}
                />
                <input
                  type="text"
                  value={commandData.description || ''}
                  onChange={(e) => {
                    const newGmCommands = {
                      ...gmCommands,
                      [id]: {
                        ...commandData,
                        description: e.target.value
                      }
                    };
                    updateGmCommands(newGmCommands);
                  }}
                  placeholder="用途说明"
                  style={{ flex: 1, marginRight: '10px' }}
                />
                <button
                  onClick={() => {
                    const newGmCommands = { ...gmCommands };
                    delete newGmCommands[id];
                    updateGmCommands(newGmCommands);
                  }}
                  style={{ padding: '5px 10px' }}
                >
                  -
                </button>
              </div>
            ))}

            <div className="setting-item">
              <button
                onClick={() => {
                  // 生成唯一ID（使用当前时间戳）
                  const newId = Date.now().toString();
                  const newGmCommands = {
                    ...gmCommands,
                    [newId]: {
                      gameWorld: localSettings.defaultParallelWorld || worldOptions[0] || "", // 使用默认游戏世界
                      gmCommand: "",
                      description: ""
                    }
                  };
                  updateGmCommands(newGmCommands);
                }}
                style={{ padding: '5px 10px', marginTop: '10px' }}
              >
                添加游戏世界配置
              </button>
            </div>
          </div>
        </div>
      </details>
    );
  };


  // 添加更新售出比率的函数
  const updateSellRate = (resourceType, walletType, rate) => {
    setSellRates(prevRates => {
      const newRates = {
        ...prevRates,
        [resourceType]: {
          ...prevRates[resourceType],
          [walletType]: rate
        }
      };
      return newRates;
    });
  };

  // 添加文件上传处理函数
  const handleFileUpload = (event, setter) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvData = e.target.result;
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');
        const data = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(',');
          const item = {};
          headers.forEach((header, index) => {
            item[header.trim()] = values[index]?.trim();
          });
          data.push(item);
        }

        // 根据数据类型设置不同的格式
        if (headers.includes('起始等级') && headers.includes('结束等级') && headers.includes('境界')) {
          setter(data);
        }
      } catch (error) {
        alert('文件解析失败，请检查CSV格式是否正确');
      }
    };
    reader.readAsText(file);
  };

  // 添加境界配置渲染函数
  const renderRealmSettings = () => {
    // 获取当前配置的境界数据
    const currentLevelToRealm = localSettings.levelToRealm || levelToRealm || [];

    return (
      <details className="settings-group">
        <summary className="settings-group-title">【面板】角色属性境界</summary>

        <div className="settings-section">
          <h4>经验境界配置</h4>
          <p>读取CSV文件以配置经验等级对应的境界数据<br></br>CSV文件抬头：起始等级、结束等级、境界、描述</p>

          <div className="setting-item" style={{ display: 'flex', alignItems: 'center'}}>
            <label>经验境界CSV文件：</label>
            <input
              type="file"
              accept=".csv"
              style={{flex:1}}
              onChange={(e) => handleFileUpload(e, setLevelToRealm)}
            />
          </div>

          {/* 显示当前境界配置的预览 */}
          {currentLevelToRealm.length > 0 && (
            <div className="setting-item">
              <h4>境界配置预览</h4>
              <div className="realm-preview">
                {renderRealmPreview(currentLevelToRealm)}
              </div>
            </div>
          )}
        </div>

        {renderPropertyRealmSettings()}

        {/* 添加收起按钮 */}
        <div className="setting-item" style={{ textAlign: 'center', }}>
          <button
            onClick={(e) => {
              // 获取当前details元素并关闭它
              const detailsElement = e.target.closest('details');
              if (detailsElement) {
                detailsElement.open = false;
              }
            }}
            style={{
              border: '1px solid #ccc',
              padding: '5px 15px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            收起
          </button>
        </div>
      </details>
    );
  };

  // 添加计算经验境界的函数
  const calculateExperienceRealm = (level) => {
    if (!levelToRealm || levelToRealm.length === 0) return null;

    const realm = levelToRealm.find(item => {
      const start = parseInt(item['起始等级'], 10);
      const end = parseInt(item['结束等级'], 10);
      return level >= start && level <= end;
    });

    return realm ? {
      name: realm['境界'],
      description: realm['描述']
    } : null;
  };

  // 添加计算属性境界的函数
  const calculatePropertyRealm = (domain, level) => {
    if (!propertyToRealm || propertyToRealm.length === 0) return null;

    const realm = propertyToRealm.find(item => {
      const start = parseInt(item['起始等级'], 10);
      const end = parseInt(item['结束等级'], 10);
      return item['领域'] === domain && level >= start && level <= end;
    });

    return realm ? {
      name: realm['境界'],
      description: realm['描述']
    } : null;
  };

  // 修改 renderRealmPreview 函数
  const renderRealmPreview = (realmData) => {
    if (!realmData || realmData.length === 0) return null;

    // 只显示前5条数据
    const firstFive = realmData.slice(0, 5);

    return (
      <div>
        <table className="realm-table">
          <thead>
            <tr>
              <th>起始等级</th>
              <th>境界</th>
              <th>描述</th>
            </tr>
          </thead>
          <tbody style={{fontSize: '14px'}}>
            {firstFive.map((item, index) => (
              <tr key={index}>
                <td>{item['起始等级']}</td>
                <td>{item['境界']}</td>
                <td>{item['描述']}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 如果数据超过5条，显示"更多"按钮 */}
        {realmData.length > 5 && (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <button
              onClick={() => {
                setRealmModalData(realmData);
                setRealmModalTitle('经验境界配置');
                setShowRealmModal(true);
              }}
              style={{
                fontSize: '14px',
                background: '#bab5b5',
                border: '1px solid #ccc',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              显示全部 {realmData.length} 个境界配置
            </button>
          </div>
        )}
      </div>
    );
  };

  // 在 renderRealmSettings 函数后添加属性境界配置渲染函数
  const renderPropertyRealmSettings = () => {
    const currentPropertyToRealm = localSettings.propertyToRealm || propertyToRealm || [];

    return (
      <div className="settings-section">
          <h4>属性境界配置</h4>
          <p>读取CSV文件以配置属性等级对应的境界数据 <br></br>CSV文件抬头：领域、起始等级、结束等级、境界、描述</p>

          <div className="setting-item" style={{ display: 'flex', alignItems: 'center'}}>
            <label>属性境界CSV文件：</label>
            <input
              type="file"
              accept=".csv"
              style={{ flex:1, marginLeft: '10px'}}
              onChange={(e) => handleFileUpload(e, setPropertyToRealm)}
            />
          </div>

          {/* 显示当前属性境界配置的预览 */}
          {currentPropertyToRealm.length > 0 && (
            <div className="setting-item">
              <h4>属性境界配置预览</h4>
              <div className="realm-preview">
                {renderPropertyRealmPreview(currentPropertyToRealm)}
              </div>
            </div>
          )}
        </div>
    );
  };

  // 属性境界预览渲染函数
  const renderPropertyRealmPreview = (realmData) => {
    if (!realmData || realmData.length === 0) return null;

    // 按属性类别分组
    const groupedData = {};
    realmData.forEach(item => {
      const category = item['领域'];
      if (!groupedData[category]) {
        groupedData[category] = [];
      }
      groupedData[category].push(item);
    });

    const categories = Object.keys(groupedData);

    return (
      <div>
        {categories.map(category => {
          const categoryData = groupedData[category];

          return (
            <div key={category} style={{ fontSize: '14px', marginBottom: '20px' }}>
              <h3>{category}</h3>
              {/* 只显示前5条数据 */}
              <table className="realm-table">
                <thead>
                  <tr>
                    <th>起始<br></br>等级</th>
                    <th>境界</th>
                    <th>描述</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.slice(0, 5).map((item, index) => (
                    <tr key={index}>
                      <td>{item['起始等级']}</td>
                      <td>{item['境界']}</td>
                      <td>{item['描述']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 如果数据超过5条，显示"更多"按钮 */}
              {categoryData.length > 5 && (
                <div style={{ textAlign: 'center', padding: '10px' }}>
                  <button
                    onClick={() => {
                      setRealmModalData(categoryData);
                      setRealmModalTitle(`属性境界配置 - ${category}`);
                      setShowRealmModal(true);
                    }}
                    style={{
                      background: '#bab5b5',
                      fontSize: '14px',
                      border: '1px solid #ccc',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    显示全部 {categoryData.length} 个境界配置
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // 在组件中添加境界详情弹窗渲染函数
  const RealmModal = () => {
    const modalRef = useRef(null);

    // ESC键退出功能
    useEffect(() => {
      const handleEscKey = (event) => {
        if (event.key === 'Escape') {
          setShowRealmModal(false);
        }
      };

      if (showRealmModal) {
        document.addEventListener('keydown', handleEscKey);
        document.body.style.overflow = 'hidden'; // 防止背景滚动
      }

      return () => {
        document.removeEventListener('keydown', handleEscKey);
        document.body.style.overflow = 'unset';
      };
    }, [showRealmModal]);

    // 点击窗口外退出功能
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (modalRef.current && !modalRef.current.contains(event.target)) {
          setShowRealmModal(false);
        }
      };

      if (showRealmModal) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showRealmModal]);

    if (!showRealmModal) return null;

    return (
      <div className="edit-credit-modal-overlay">
        <div
          ref={modalRef}
          className="edit-credit-modal"
          style={{ maxWidth: '800px', maxHeight: '80vh', overflow: 'auto' }}
        >
          <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>{realmModalTitle}</h4>
            <button
              className="modal-close-button"
              onClick={() => setShowRealmModal(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                fontSize: '14px',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <img
                src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSA2LjQxTDE3LjU5IDUgMTIgMTAuNTkgNi40MSA1IDUgNi40MSAxMC41OSAxMiA1IDE3LjU5IDYuNDEgMTkgMTIgMTMuNDEgMTcuNTkgMTkgMTkgMTcuNTkgMTMuNDEgMTJ6Ii8+PC9zdmc+"
                alt="关闭"
                style={{ width: '20px', height: '20px' }}
              />
            </button>
          </div>

          <div style={{ marginTop: '20px' }}>
            <table className="realm-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>起始<br></br>等级</th>
                  <th>境界</th>
                  <th>描述</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '14px' }}>
                {realmModalData.map((item, index) => (
                  <tr key={index}>
                    <td>{item['起始等级']}</td>
                    <td>{item['境界']}</td>
                    <td>{item['描述']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const handleJsonChange = (e) => {
    const newValue = e.target.value;

    if (jsonHandlingMode === 'immediate') {
      // 即时验证模式：只有JSON格式正确时才更新状态
      try {
        const parsed = JSON.parse(newValue);
        setEffectConfig(parsed);
        setJsonInput(newValue); // 只有在有效时才更新输入
        setValidationError('');
      } catch (error) {
        // 在即时模式下，如果JSON无效，不更新 jsonInput 状态
        // 这样 textarea 会保持之前的有效值，实际上阻止了无效修改
        setValidationError(error.message);
        // 可选：显示一个短暂的错误提示
        onShowStatus('JSON格式错误，请修正后再继续编辑', 'error');
      }
    } else {
      // 延迟验证模式：总是更新输入值
      setJsonInput(newValue);
      setValidationError(''); // 清除之前的错误信息
    }
  };

  useEffect(() => {
    if (jsonHandlingMode === 'delayed') {
      // 只在延迟模式下使用防抖验证
      try {
        const parsed = JSON.parse(debouncedJsonInput);
        setEffectConfig(parsed);
        setValidationError('');
      } catch (error) {
        setValidationError(error.message);
      }
    }
  }, [debouncedJsonInput, jsonHandlingMode]);

  const renderEffectSettings = () => {
    return (
      <details className="settings-group">
        <summary className="settings-group-title">【任务】特效配置</summary>
        <div className="setting-item-left-aligned">
          <label title='启用后在【任务】卡片模式中完成任务可显示特效'>
            <span>启用完成特效：</span>
            <input
              type="checkbox"
              checked={localSettings.enableEffectOnTaskCompletion || false}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                enableEffectOnTaskCompletion: e.target.checked
              })}
            />
          </label>

        </div>
        <div className="setting-item-left-aligned">
          <label title='启用后可在【设置】中编辑特效参数'>
            <span>允许编辑特效参数：</span>
            <input
              type="checkbox"
              checked={localSettings.enableEffectParamsEditing || false}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                enableEffectParamsEditing: e.target.checked
              })}
            />
          </label>

        </div>

        {localSettings.enableEffectParamsEditing && <div className="settings-section">
          {/*<h4>卡片模式任务完成特效配置</h4>*/}
          {/*<p>配置不同任务属性对应的完成特效参数，其中particle是粒子特效类别，intensity对应粒子数目，size对应单粒子大小</p>*/}

          <div className="setting-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label title="编辑JSON格式的配置信息">特效配置 (JSON格式):</label>
              <button
                onClick={(e) => showInfoPopup(
                  '特效配置说明',
                  '<p>配置不同任务属性对应的完成特效参数，其中particle是粒子特效类别，intensity对应粒子数目，size对应单粒子大小，animation对应完成按钮的特效样式，sound对应声音特效。注意domains、categories、priorities中的键值须与字段配置中的任务属性字段相同</p>',
                  e
                )}
                style={{ padding: '5px 10px',background:'transparent',color:'black' }}
                title="配置不同任务属性对应的完成特效参数，其中particle是粒子特效类别，intensity对应粒子数目，size对应单粒子大小，animation对应完成按钮的特效样式，sound对应声音特效。注意domains、categories、priorities中的键值须与字段配置中的任务属性字段相同"
              >
                ⓘ
              </button>
            </div>
            {/*// 在特效配置编辑区域添加模式切换控件*/}
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label title="即时验证模式：编辑时实时验证，不符合JSON格式则阻止修改">
                  <input
                    type="radio"
                    value="immediate"
                    checked={jsonHandlingMode === 'immediate'}
                    onChange={() => setJsonHandlingMode('immediate')}
                    title="即时验证模式：编辑时实时验证，不符合JSON格式则阻止修改"
                  />
                  即时验证模式
                </label>
                <label style={{ marginLeft: '15px' }} title="延迟验证模式：编辑时延迟验证，不符合JSON格式则仍可修改，仅提示错误">
                  <input
                    type="radio"
                    value="delayed"
                    checked={jsonHandlingMode === 'delayed'}
                    onChange={() => setJsonHandlingMode('delayed')}
                    title="延迟验证模式：编辑时延迟验证，不符合JSON格式则仍可修改，仅提示错误"
                  />
                  延迟验证模式
                </label>
              </div>
              <button
                onClick={() => setIsEffectConfigModalOpen(true)}
                style={{ padding: '5px 10px' }}
                title="最大化窗口"
              >
                ⛶
              </button>
            </div>
            <textarea
              value={jsonInput}
              onChange={handleJsonChange}
              // value={JSON.stringify(effectConfig, null, 2)}
              // onChange={(e) => {
              //   try {
              //     const parsed = JSON.parse(e.target.value);
              //     setEffectConfig(parsed);
              //   } catch (error) {
              //     onShowStatus('JSON格式错误: ' + error.message, 'error');
              //   }
              // }}
              rows={10}
              style={{
                width: '100%',
                height: '250px',
                fontFamily: 'monospace',
                fontSize: '12px',
                whiteSpace: 'pre',
                overflow: 'auto'
              }}
              placeholder="请输入有效的JSON格式配置"
            />
            {/*// 在 textarea 下方添加验证状态显示*/}
            {validationError && (
              <div style={{ color: 'red', marginTop: '5px', fontSize: '12px' }}>
                JSON格式错误: {validationError}
              </div>
            )}
          </div>

          <div className="setting-item">
            <button
              title="恢复默认配置"
              onClick={() => {
                setEffectConfig(DEFAULT_EFFECT_CONFIG);
                setJsonInput(JSON.stringify(DEFAULT_EFFECT_CONFIG, null, 2)); // 同步更新 jsonInput
                setValidationError(''); // 清除验证错误
                onShowStatus('已恢复默认配置');
              }}
            >
              默认
            </button>
            <button
              title="从系统配置重新加载"
              onClick={reloadEffectConfig}
            >
              重载
            </button>
            <button
              title="从剪切板粘贴导入完整配置"
              onClick={handlePasteFullConfig}
              // style={{ padding: '5px 10px', marginRight: '10px' }}
            >
              导入
            </button>
            <button
              onClick={saveEffectConfig}
              disabled={!!validationError}
              title="保存至缓存设置"
            >
              暂存
            </button>
          </div>
        </div>}

      </details>
    )
  }

  const renderEffectEditingModal = () => {
    return (
      <EffectEditingModal
        isOpen={isEffectConfigModalOpen}
        onClose={closeEffectConfigModal}
        effectConfig={effectConfig}
        setEffectConfig={setEffectConfig}
        onShowStatus={onShowStatus}
        reloadEffectConfig={reloadEffectConfig}
        handlePasteFullConfig={handlePasteFullConfig}
        saveEffectConfig={saveEffectConfig}
        validationError={validationError}
        setValidationError={setValidationError}
        DEFAULT_EFFECT_CONFIG={DEFAULT_EFFECT_CONFIG}
        jsonInput={jsonInput}
        setJsonInput={setJsonInput}
        jsonHandlingMode={jsonHandlingMode}
        setJsonHandlingMode={setJsonHandlingMode}
      />
    );
  };






  // 添加处理完整配置粘贴的函数
  const handlePasteFullConfig = () => {
    const fullConfig = prompt("请粘贴完整的特效配置JSON:");
    if (fullConfig) {
      try {
        const parsed = JSON.parse(fullConfig);
        setEffectConfig(parsed);
        setJsonInput(JSON.stringify(parsed, null, 2));
        setValidationError('');
        onShowStatus('配置粘贴成功');
      } catch (error) {
        onShowStatus('JSON格式错误: ' + error.message, 'error');
        alert('无法保存! JSON格式错误: ' + error.message);
      }
    }
  };

  const reloadEffectConfig = () => {
    const currentEffectConfig = settings.effectConfig || DEFAULT_EFFECT_CONFIG;
    setEffectConfig(currentEffectConfig);
    setJsonInput(JSON.stringify(currentEffectConfig, null, 2));
    setValidationError('');
    onShowStatus('已重新加载特效配置');
  };

  // 添加保存函数
  const saveEffectConfig = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setEffectConfig(parsed);
      setLocalSettings({
        ...localSettings,
        effectConfig: parsed
      });
      onShowStatus('特效配置已保存');
      closeEffectConfigModal();
    } catch (error) {
      onShowStatus('无法保存：JSON格式错误: ' + error.message, 'error');
      alert('无法保存! JSON格式错误: ' + error.message);
    }
  }

  const ModuleOrderSettings = () => {
    const [draggedIndex, setDraggedIndex] = useState(null);
    const modules = (localSettings.moduleOrder && localSettings.moduleOrder.length === menuItems.length)
      ? localSettings.moduleOrder
      : menuItems.map(item => item.title);

    const moveModule = (fromIndex, toIndex) => {
      const updatedModules = [...modules];
      const [movedModule] = updatedModules.splice(fromIndex, 1);
      updatedModules.splice(toIndex, 0, movedModule);
      setLocalSettings({
        ...localSettings,
        moduleOrder: updatedModules
      });
    };

    // 新增：向上移动模块
    const moveModuleUp = (index) => {
      if (index > 0) {
        moveModule(index, index - 1);
      }
    };

    // 新增：向下移动模块
    const moveModuleDown = (index) => {
      if (index < modules.length - 1) {
        moveModule(index, index + 1);
      }
    };

    return (
        <div className="settings-section">
          <p style={{display:'flex', alignItems: 'left'}}>拖动下方模块名称以调整它们在导航栏中的显示顺序</p>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {modules.map((moduleName, index) => (
              <li
                key={moduleName}
                style={{
                  padding: '10px 15px',
                  margin: '5px 0',
                  backgroundColor: draggedIndex === index ? '#d0d0d0' : '#f0f0f0',
                  cursor: 'move',
                  userSelect: 'none',
                  transform: draggedIndex === index ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.2s, background-color 0.2s',
                  touchAction: 'none', // 防止默认的滚动行为
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left' // 左对齐
                }}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("moduleIndex", index.toString());
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromIndex = parseInt(e.dataTransfer.getData("moduleIndex"));
                  moveModule(fromIndex, index);
                }}

                // 移动端触摸事件处理
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  const element = e.currentTarget;

                  // 记录触摸开始信息
                  element.dataset.touchStartTime = Date.now().toString();
                  element.dataset.startX = touch.clientX.toString();
                  element.dataset.startY = touch.clientY.toString();

                  // 设置短暂延迟后激活拖拽模式
                  setTimeout(() => {
                    const startTime = parseInt(element.dataset.touchStartTime);
                    // 确保触摸仍然有效
                    if (startTime && Date.now() - startTime < 1000) {
                      setDraggedIndex(index);
                    }
                  }, 500);
                }}

                onTouchMove={(e) => {
                  if (draggedIndex !== index) return;

                  e.preventDefault(); // 阻止页面滚动

                  // 可以在这里添加拖拽过程中的视觉反馈
                  const touch = e.touches[0];
                  const element = e.currentTarget;

                  // 跟随手指移动的效果（可选）
                  element.style.position = 'relative';
                  // 这里可以根据需要添加更多的拖拽视觉效果
                }}

                onTouchEnd={(e) => {
                  // 清理数据
                  const element = e.currentTarget;
                  delete element.dataset.touchStartTime;
                  delete element.dataset.startX;
                  delete element.dataset.startY;

                  // 结束拖拽状态
                  if (draggedIndex === index) {
                    setDraggedIndex(null);
                  }
                }}

                // 处理放置逻辑
                onDragOver={(e) => {
                  e.preventDefault();
                  // 如果正在移动端拖拽，处理放置逻辑
                  if (draggedIndex !== null && draggedIndex !== index) {
                    // 可以在这里添加放置目标的视觉提示
                  }
                }}

                onDrop={(e) => {
                  e.preventDefault();

                  // 处理桌面端拖放
                  if (e.dataTransfer && e.dataTransfer.getData) {
                    const fromIndex = parseInt(e.dataTransfer.getData("moduleIndex"));
                    moveModule(fromIndex, index);
                  }
                  // 处理移动端拖放
                  else if (draggedIndex !== null) {
                    moveModule(draggedIndex, index);
                    setDraggedIndex(null);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <span style={{ fontWeight: 'bold', marginRight: '10px' }}>{index + 1}.</span>
                  <span>{moduleName}</span>
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveModuleUp(index);
                    }}
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    title="向前移动"
                    disabled={index === 0}
                  >
                    -
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveModuleDown(index);
                    }}
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    title="向后移动"
                    disabled={index === modules.length - 1}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
    );
  };

  const [isModuleOrderExpanded, setIsModuleOrderExpanded] = useState(false);
  const renderGeneralSettings = () => {
    console.log('pathname: ',location.pathname)
    return (
      // {/* 使用折叠面板来组织默认显示设置 */}
      <details className="settings-group">
        <summary className="settings-group-title">常规</summary>
        <div className="settings-section">
          <div className="setting-item inline-setting">
            <label>默认首页：</label>
            <select
              value={localSettings.defaultHomePage}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                defaultHomePage: e.target.value
              })}
            >
              <option value="/character">面板</option>
              <option value="/tasksys">任务</option>
              <option value="/backpack">背包</option>
              <option value="/shop">商城</option>
              <option value="/items">道具</option>
              <option value="/plant">工坊</option>
              <option value="/notes">笔记</option>
              <option value="/logs">日志</option>
              <option value="/settings">设置</option>
            </select>
          </div>
          <div className="setting-item-left-aligned">
            <label title='启用后在所有页面显示一个悬浮按钮，可用于隐藏导航栏和顶部控件'>
              <span>是否启用悬浮按钮：</span>
              <input
                type="checkbox"
                checked={localSettings.enableFloatingControlButton || false}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  enableFloatingControlButton: e.target.checked
                })}
              />
            </label>

          </div>

          {/* 添加允许手动编辑积分值的配置项 */}

          {((location.pathname === '/character') || (location.pathname === '/options')) && (
            <div className="setting-item-left-aligned">
              <label title="开启后在【面板】页面中可点击积分卡片右上角编辑按钮以修改积分值">
                <span>是否开启积分值编辑：  </span>
                <input
                  type="checkbox"
                  checked={localSettings.allowManualCreditEditing ?? true}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    allowManualCreditEditing: e.target.checked
                  })}
                />
              </label>
            </div>
          )}

          {((location.pathname === '/items') || (location.pathname === '/options')) && (
            <div className="setting-item-left-aligned">
              {/*<label title='启用后在【道具】中"积分定价"字段可使用资源积分类型来定价' style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>*/}
              {/*  <span style={{ flex: 1 }}>是否启用资源积分定价：</span>*/}
              {/*  <input*/}
              {/*    type="checkbox"*/}
              {/*    checked={localSettings.enableAllCreditsPricing || false}*/}
              {/*    onChange={(e) => setLocalSettings({*/}
              {/*      ...localSettings,*/}
              {/*      enableAllCreditsPricing: e.target.checked*/}
              {/*    })}*/}
              {/*  />*/}
              {/*</label>              */}
              <label title='启用后在【道具】中“积分定价”字段可使用资源积分类型来定价'>
                <span>是否启用资源积分定价：</span>
                <input
                  type="checkbox"
                  checked={localSettings.enableAllCreditsPricing || false}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    enableAllCreditsPricing: e.target.checked
                  })}
                />
              </label>

            </div>
          )}


          {((location.pathname === '/items') || (location.pathname === '/options')) && (
            renderDefaultParallelWorldSetting()
          )}

          {/*<div className="setting-item inline-setting">*/}
          {/*  <label title="【任务】任务名称最大长度">任务名称最大长度：</label>*/}
          {/*  <input*/}
          {/*    type="number"*/}
          {/*    max="300"*/}
          {/*    value={localSettings.taskNameMaxLength || 250}*/}
          {/*    onChange={(e) => setLocalSettings({*/}
          {/*      ...localSettings,*/}
          {/*      taskNameMaxLength: parseInt(e.target.value) || 250*/}
          {/*    })}*/}
          {/*  />*/}
          {/*</div>*/}

          {/* 添加快速添加任务的提示文本配置项 */}
          {((location.pathname === '/tasksys') || (location.pathname === '/notes') || (location.pathname === '/options')) && (
            <div className="setting-item inline-setting">
              <label title="快速添加任务时参考的提示文本">快速添加任务提示文本：</label>
              <input
                type="text"
                value={localSettings.quickAddTaskHint || ''}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  quickAddTaskHint: e.target.value
                })}
                placeholder="请输入快速添加任务的提示文本"
                style={{ width: '300px', marginLeft: '10px' }}
              />
            </div>
          )}

          {((location.pathname === '/notes') || (location.pathname === '/options')) && (
            <div className="setting-item inline-setting">
              <label>笔记自动保存间隔（秒）：</label>
              <input
                type="number"
                min="5"
                max="300"
                value={localSettings.noteAutoSaveInterval || 30}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  noteAutoSaveInterval: parseInt(e.target.value) || 30
                })}
                style={{ width: '80px', marginLeft: '10px' }}
              />
              <span style={{ marginLeft: '10px', color: '#666' }}>范围：5-300秒</span>
            </div>
          )}

          {((location.pathname === '/notes') || (location.pathname === '/options')) && (
            <div className="setting-item inline-setting">
              <label title="用于补全图片文件的完整路径，避免因路径问题导致的图片加载失败">自定义图床域名：</label>
              <input
                type="text"
                value={localSettings.customDomain || ''}
                onChange={(e) => setLocalSettings({
                  ...localSettings,
                  customDomain: e.target.value
                })}
                placeholder="例如: http://localhost.com:5000"
                style={{ width: '300px', marginLeft: '10px' }}
              />
            </div>
          )}

          {(location.pathname === '/options') && (
            <div style={{ display: 'flex', alignItems: 'left', justifyContent: 'left' }}>
              <h>导航栏模块排序:</h>
              <button
                onClick={() => setIsModuleOrderExpanded(!isModuleOrderExpanded)}
                style={{ background: 'transparent', color:'black', marginLeft: '10px',flex:1,margin:0, }}
              >
                {isModuleOrderExpanded ? '△' : '▽'}
              </button>
            </div>
          )}

          {isModuleOrderExpanded && <ModuleOrderSettings />}


        </div>
      </details>
    )
  }
  const renderFieldsSettings = () => {
    return (
      <details className="settings-group">
        <summary className="settings-group-title">字段配置</summary>

        <div className="settings-section">
          <h4>【面板】积分类型</h4>
          <div className="compact-list-editor">
            {localSettings.creditTypes.map((type, index) => (
              <div key={index} className="compact-list-item">
                <input
                  type="text"
                  value={type}
                  onChange={(e) => {
                    const newTypes = [...localSettings.creditTypes];
                    newTypes[index] = e.target.value;
                    updateCreditTypes(newTypes);
                  }}
                />
                <button onClick={() => removeItem(localSettings.creditTypes, updateCreditTypes, type)}>-</button>
              </div>
            ))}
            <button onClick={() => addNewItem(localSettings.creditTypes, updateCreditTypes)}>+</button>
          </div>
        </div>

        <div className="settings-section">
          <h4>【面板】属性类别</h4>
          <div className="compact-list-editor">
            {localSettings.propertyCategories?.map((category, index) => (
              <div key={index} className="compact-list-item">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => {
                    const newCategories = [...(localSettings.propertyCategories || [])];
                    newCategories[index] = e.target.value;
                    setLocalSettings({
                      ...localSettings,
                      propertyCategories: newCategories
                    });
                  }}
                />
                <button onClick={() => {
                  if ((localSettings.propertyCategories?.length || 0) > 1) {
                    const newCategories = [...(localSettings.propertyCategories || [])];
                    newCategories.splice(index, 1);
                    setLocalSettings({
                      ...localSettings,
                      propertyCategories: newCategories
                    });
                  } else {
                    alert('至少需要保留一个属性类别');
                  }
                }}>-</button>
              </div>
            ))}
            <button onClick={() => {
              const newCategories = [...(localSettings.propertyCategories || []), ''];
              setLocalSettings({
                ...localSettings,
                propertyCategories: newCategories
              });
            }}>+</button>
          </div>
        </div>

        <div className="settings-section">
          <h4>【商店】道具类别</h4>
          <div className="compact-list-editor">
            {localSettings.itemCategories.map((category, index) => (
              <div key={index} className="compact-list-item">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => {
                    const newCategories = [...localSettings.itemCategories];
                    newCategories[index] = e.target.value;
                    updateItemCategories(newCategories);
                  }}
                />
                <button onClick={() => removeItem(localSettings.itemCategories, updateItemCategories, category)}>-</button>
              </div>
            ))}
            <button onClick={() => addNewItem(localSettings.itemCategories, updateItemCategories)}>+</button>
          </div>
        </div>

        <div className="settings-section">
          <h4>【商店】游戏世界</h4>
          <div className="compact-list-editor">
            {localSettings.parallelWorlds?.map((world, index) => (
              <div key={index} className="compact-list-item">
                <input
                  type="text"
                  value={world}
                  onChange={(e) => {
                    const newWorlds = [...(localSettings.parallelWorlds || [])];
                    newWorlds[index] = e.target.value;
                    setLocalSettings({
                      ...localSettings,
                      parallelWorlds: newWorlds
                    });
                  }}
                />
                <button onClick={() => {
                  if ((localSettings.parallelWorlds?.length || 0) > 1) {
                    const newWorlds = [...(localSettings.parallelWorlds || [])];
                    newWorlds.splice(index, 1);
                    setLocalSettings({
                      ...localSettings,
                      parallelWorlds: newWorlds
                    });
                  } else {
                    alert('至少需要保留一个游戏世界');
                  }
                }}>-</button>
              </div>
            ))}
            <button onClick={() => {
              const newWorld = `新世界${(localSettings.parallelWorlds?.length || 0) + 1}`;
              setLocalSettings({
                ...localSettings,
                parallelWorlds: [...(localSettings.parallelWorlds || []), newWorld]
              });
            }}>+</button>
          </div>
        </div>


        <div className="settings-section">
          <h4>【任务】类别</h4>
          <div className="compact-list-editor">
            {localSettings.taskCategories.map((category, index) => (
              <div key={index} className="compact-list-item">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => {
                    const newCategories = [...localSettings.taskCategories];
                    newCategories[index] = e.target.value;
                    updateTaskCategories(newCategories);
                  }}
                />
                <button onClick={() => removeItem(localSettings.taskCategories, updateTaskCategories, category)}>-</button>
              </div>
            ))}
            <button onClick={() => addNewItem(localSettings.taskCategories, updateTaskCategories)}>+</button>
          </div>
        </div>

        <div className="settings-section">
          <h4>【任务】领域</h4>
          <div className="compact-list-editor">
            {localSettings.taskDomains.map((domain, index) => (
              <div key={index} className="compact-list-item">
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => {
                    const newDomains = [...localSettings.taskDomains];
                    newDomains[index] = e.target.value;
                    updateTaskDomains(newDomains);
                  }}
                />
                <button onClick={() => removeItem(localSettings.taskDomains, updateTaskDomains, domain)}>-</button>
              </div>
            ))}
            <button onClick={() => addNewItem(localSettings.taskDomains, updateTaskDomains)}>+</button>
          </div>
        </div>

        <div className="settings-section">
          <h4>【任务】优先级</h4>
          <div className="compact-list-editor">
            {localSettings.taskPriorities.map((priority, index) => (
              <div key={index} className="compact-list-item">
                <input
                  type="text"
                  value={priority}
                  onChange={(e) => {
                    const newPriorities = [...localSettings.taskPriorities];
                    newPriorities[index] = e.target.value;
                    updateTaskPriorities(newPriorities);
                  }}
                  disabled
                />
                <button onClick={() => removeItem(localSettings.taskPriorities, updateTaskPriorities, priority)} disabled>-</button>
              </div>
            ))}
            <button onClick={() => addNewItem(localSettings.taskPriorities, updateTaskPriorities)} disabled>+</button>
          </div>
        </div>

        <div className="settings-section">
          <h4>【任务】循环周期</h4>
          <div className="compact-list-editor">
            {localSettings.taskCycleTypes && localSettings.taskCycleTypes.map((cycleType, index) => (
              <div key={index} className="compact-list-item">
                <input
                  type="text"
                  value={cycleType}
                  onChange={(e) => {
                    const newCycleTypes = [...localSettings.taskCycleTypes];
                    newCycleTypes[index] = e.target.value;
                    updateTaskCycleTypes(newCycleTypes);
                  }}
                  disabled
                />
                <button onClick={() => removeItem(localSettings.taskCycleTypes, updateTaskCycleTypes, cycleType)} disabled>-</button>
              </div>
            ))}
            <button onClick={() => addNewItem(localSettings.taskCycleTypes || [], updateTaskCycleTypes)} disabled>+</button>
          </div>
        </div>

        <div className="settings-section">
          <h4>【任务】状态</h4>
          <div className="compact-list-editor">
            {localSettings.taskStatuses.map((status, index) => (
              <div key={index} className="compact-list-item">
                <input
                  type="text"
                  value={status}
                  onChange={(e) => {
                    const newStatuses = [...localSettings.taskStatuses];
                    newStatuses[index] = e.target.value;
                    updateTaskStatuses(newStatuses);
                  }}
                  disabled
                />
                <button onClick={() => removeItem(localSettings.taskStatuses, updateTaskStatuses, status)} disabled>-</button>
              </div>
            ))}
            <button onClick={() => addNewItem(localSettings.taskStatuses, updateTaskStatuses)} disabled>+</button>
          </div>
        </div>
      </details>
    )
  }
  const renderFormulasSettings = () => {
    return (
      <details className="settings-group">
        <summary className="settings-group-title">【面板】经验等级公式</summary>
        <div className="setting-item-left-aligned">
          <label title='启用后【设置】中将显示“经验等级公式”用于编辑公式'>允许编辑经验公式：</label>
          <input
            type="checkbox"
            checked={localSettings.allowFormulasEditing || false}
            onChange={(e) => setLocalSettings({
              ...localSettings,
              allowFormulasEditing: e.target.checked
            })}
          />
        </div>

        {localSettings.allowFormulasEditing && <div>
          <div className="settings-subsection">
            <h4>角色等级经验公式</h4>
            <p title="角色等级所需经验值 = 系数 × 等级^指数">LevelExp = a * Level^n</p>
            <div className="formula-settings">
              <div>
                <label>系数(a)：</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={expFormulas.levelUpA || 100}
                  onChange={(e) => {
                    setExpFormulas({
                      ...expFormulas,
                      levelUpA: parseInt(e.target.value) || 100
                    });
                  }}
                  style={{ width: '80px', marginLeft: '10px' }}  // 确保样式一致
                />
              </div>

              <div>
                <label>指数(n)：</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={expFormulas.levelUpN || 3.0}
                  onChange={(e) => {
                    setExpFormulas({
                      ...expFormulas,
                      levelUpN: parseFloat(e.target.value) || 3.0
                    });
                  }}
                  style={{ width: '80px', marginLeft: '10px' }}  // 确保样式一致
                />
              </div>
            </div>
          </div>

          <div className="settings-subsection">
            <h4>属性等级经验公式</h4>
            <p title="属性等级所需经验值 = 系数(a) × 等级^n">PropExp = a * Level^n</p>
            <div className="formula-settings">
              <div>
                <label>系数(a)：</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={expFormulas.propertyLevelA || 10}
                  onChange={(e) => {
                    setExpFormulas({
                      ...expFormulas,
                      propertyLevelA: parseInt(e.target.value) || 10
                    });
                  }}
                  style={{ width: '80px', marginLeft: '10px' }}  // 确保样式一致
                />
              </div>

              <div>
                <label>指数(n)：</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={expFormulas.propertyLevelN || 2.0}
                  onChange={(e) => {
                    setExpFormulas({
                      ...expFormulas,
                      propertyLevelN: parseFloat(e.target.value) || 2.0
                    });
                  }}
                  style={{ width: '80px', marginLeft: '10px' }}  // 确保样式一致
                />
              </div>
            </div>
          </div>

          <div className="settings-subsection">
            <h4>任务奖励经验公式</h4>
            <p title="k: 倍率；a：系数；A*B*C：类别权重 × 领域权重 × 优先级权重">Exp = k * (a*Level^2 + A*B*C*Level + 10)</p>
            <div className="formula-settings">
              <div>
              </div>
              <div>
                <label>倍率(k)：</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={expFormulas.taskExpMultiplier || 1.0}
                  onChange={(e) => {
                    setExpFormulas({
                      ...expFormulas,
                      taskExpMultiplier: parseFloat(e.target.value) || 0.1
                    });
                  }}
                  className="exp-multiplier-input"
                  style={{ width: '100px', marginLeft: '10px' }}
                />
              </div>

              <div>
                <label>系数(a)：</label>
                <input
                  type="number"
                  step="0.1"
                  value={expFormulas.taskExpCoefficient || 0.5}
                  onChange={(e) => {
                    setExpFormulas({
                      ...expFormulas,
                      taskExpCoefficient: parseFloat(e.target.value) || 0.5
                    });
                  }}
                  className="exp-multiplier-input"
                  style={{ width: '100px', marginLeft: '10px' }}
                />
              </div>

            </div>
          </div>

          <div className="settings-subsection">
            <h4>任务奖励属性公式</h4>
            <p title="不可更改">Prop = (A+B+C) * Level^0.5</p>
          </div>
        </div>}

      </details>
    )
  }
  const renderCreditSalesSettings = () => {
    return (
      <details className="settings-group">
      <summary className="settings-group-title">【面板】资源售卖</summary>
      <div className="setting-section">
        <p>设置资源积分兑换货币积分的比率 (资源积分->钱包货币)</p>
        {localSettings.creditTypes.slice(0, -2).map(resourceType => (
          <div key={resourceType} className="sell-rate-section">
            {localSettings.creditTypes.slice(-2).map(walletType => (
              <div key={`${resourceType}-${walletType}`} className="rate-setting">
                <label>{resourceType} → {walletType}:</label>
                <input
                  type="number"
                  value={sellRates[resourceType]?.[walletType] || 1}
                  onChange={(e) => updateSellRate(resourceType, walletType, parseFloat(e.target.value) || 0.1)}
                  min="0.1"
                  step="0.1"
                  placeholder="0.1"
                />
              </div>
            ))}
          </div>
        ))}
        {/*{localSettings.creditTypes.slice(0, -2).map(resourceType => (*/}
        {/*  <div key={resourceType} className="sell-rate-section">*/}
        {/*    {localSettings.creditTypes.slice(-2).map(walletType => (*/}
        {/*      <div key={`${resourceType}-${walletType}`} className="rate-setting">*/}
        {/*        <label>{resourceType} → {walletType}:</label>*/}
        {/*        <input*/}
        {/*          type="number"*/}
        {/*          value={sellRates[resourceType]?.[walletType] || 1.0}*/}
        {/*          onChange={(e) => updateSellRate(resourceType, walletType, parseFloat(e.target.value) || 1.0)}*/}
        {/*          min="0。1"*/}
        {/*          step="0.1"*/}
        {/*          placeholder="1.0"*/}
        {/*        />*/}
        {/*      </div>*/}
        {/*    ))}*/}
        {/*  </div>*/}
        {/*))}*/}

      </div>
    </details>
    )
  }


  const getAllSettingsGroups = () => [
    { id: 'general', title: '常规', element: renderGeneralSettings() },
    // { id: 'module-order', title: '模块排序', element: ModuleOrderSettings() },
    { id: 'fields', title: '字段配置', element: renderFieldsSettings() },
    { id: 'character', title: '面板设置', element: renderCharacterSettings() },
    { id: 'formulas', title: '公式设置', element: renderFormulasSettings() },
    { id: 'realms', title: '境界设置', element: renderRealmSettings() },
    { id: 'credit-sales', title: '积分售出', element: renderCreditSalesSettings() },
    { id: 'task-field-mapping', title: '任务字段映射', element: renderTaskFieldMapping() },
    { id: 'action-buttons', title: '操作按钮', element: renderActionButtonSettings() },
    { id: 'board-view', title: '看板视图', element: renderBoardViewSettings() },
    { id: 'calendar-view', title: '日历视图', element: renderCalendarSettings() },
    { id: 'border', title: '边框设置', element: renderBorderSettings() },
    { id: 'effects', title: '特效配置', element: renderEffectSettings() },
    { id: 'gm-command', title: 'GM命令', element: renderGmCommandSettings() },
  ];
  // 渲染指定设置组或所有设置组
  const renderSettingsContent = () => {
    const allGroups = getAllSettingsGroups();
    const hiddenGroups = ['effects'];

    if (targetGroup) {
      // 支持渲染单个或多个设置组
      // 如果 targetGroup 是字符串，保持原有行为
      // 如果 targetGroup 是数组，渲染多个指定组
      if (Array.isArray(targetGroup)) {
        return (
          <>
            {targetGroup.map(groupId => {
              const group = allGroups.find(g => g.id === groupId);
              return group ? <React.Fragment key={group.id}>{group.element}</React.Fragment> : null;
            })}
          </>
        );
      } else {
        // 保持原有单组渲染逻辑
        const targetGroupObj = allGroups.find(group => group.id === targetGroup);
        return targetGroupObj ? targetGroupObj.element : null;
      }
    }


    if (targetGroup) {
      // 只渲染指定的设置组
      const targetGroupObj = allGroups.find(group => group.id === targetGroup);
      return targetGroupObj ? targetGroupObj.element : null;
    }

    const renderingGroups = allGroups.filter(group => !hiddenGroups.includes(group.id));

    // 渲染所有设置组（原有功能）
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ flex: 1, textAlign: 'center', margin: 0 }}>系统设置</h3>
          <button style={{color:'black',background: 'transparent', border: 'none', fontSize: '12px', cursor: 'pointer'}} onClick={() => {
            if (window.location && typeof window.location.reload === 'function') {
              window.location.reload();
            }
          }}>⟳</button>
        </div>
        {renderingGroups.map(group => (
          <React.Fragment key={group.id}>
            {group.element}
          </React.Fragment>
        ))}
      </>
    );
  };


  return (
    <div className="settings-tab">
      {/*{!targetGroup && <h3>系统设置</h3>}*/}
      {renderSettingsContent()}

      {/*{renderGeneralSettings()}*/}

      {/*{renderFieldsSettings()}*/}
      {/*{renderCharacterSettings()}*/}
      {/*{renderFormulasSettings()}*/}

      {/*{renderRealmSettings()}*/}


      {/*{renderCreditSalesSettings()}*/}

      {/*{renderActionButtonSettings()}*/}

      {/*{renderBoardViewSettings()}*/}
      {/*/!* 添加日历视图设置组件 *!/*/}
      {/*{renderCalendarSettings()}*/}

      {/*{renderTaskFieldMapping()}*/}

      {/*/!* 添加边框设置组件 *!/*/}
      {/*{renderBorderSettings()}*/}


      {/*{renderGmCommandSettings()}*/}

      {/*{renderEffectSettings()}*/}

      {RealmModal()}
      {localSettings.enableEffectParamsEditing && isEffectConfigModalOpen && (
          renderEffectEditingModal()
      )}

      <div className="settings-button-area">
        {!targetGroup && (<button onClick={onUpdateSettings} className="settings-recover-button" title="从系统配置重新加载并恢复">恢复</button>)}
        <button onClick={handleSaveSettings} className="settings-save-button">
          保存
        </button>
      </div>

    </div>
  );

};

const EffectEditingModal = ({
  isOpen,
  onClose,
  effectConfig,
  setEffectConfig,
  onShowStatus,
  reloadEffectConfig,
  handlePasteFullConfig,
  saveEffectConfig,
  validationError,
  setValidationError,
  DEFAULT_EFFECT_CONFIG,
  jsonInput,
  setJsonInput,
  jsonHandlingMode,
  setJsonHandlingMode
}) => {
  // ESC 键监听
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        event.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey, true);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey, true);
    };
  }, [isOpen, onClose]);

  // 文本变化处理函数
  const handleModalJsonChange = useCallback((e) => {
    const newValue = e.target.value;

    if (jsonHandlingMode === 'immediate') {
      try {
        const parsed = JSON.parse(newValue);
        setEffectConfig(parsed);
        setJsonInput(newValue);
        setValidationError('');
      } catch (error) {
        setValidationError(error.message);
        onShowStatus('JSON格式错误，请修正后再继续编辑', 'error');
      }
    } else {
      setJsonInput(newValue);
      setValidationError('');
    }
  }, [jsonHandlingMode, setEffectConfig, setJsonInput, setValidationError, onShowStatus]);

  if (!isOpen) return null;

  return (
    <div
      className='effect-editing-modal'
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      onClick={(e) => {
        if (e.target.style.backgroundColor === 'rgba(0, 0, 0, 0.5)') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '20px',
          width: '90%',
          height: '90%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '8px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <h3>特效配置编辑器</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{ padding: '5px 10px' }}
          >
            关闭 (ESC)
          </button>
        </div>
        <textarea
          value={jsonInput}
          onChange={handleModalJsonChange}
          style={{
            flex: 1,
            fontFamily: 'monospace',
            fontSize: '14px',
            whiteSpace: 'pre',
            overflow: 'auto',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '10px'
          }}
          placeholder="请输入有效的JSON格式配置"
        />
        {validationError && (
          <div style={{ color: 'red', marginTop: '5px', fontSize: '12px' }}>
            JSON格式错误: {validationError}
          </div>
        )}
        <div style={{
          marginTop: '10px',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            title="恢复初始默认配置"
            onClick={() => {
              setEffectConfig(DEFAULT_EFFECT_CONFIG);
              setJsonInput(JSON.stringify(DEFAULT_EFFECT_CONFIG, null, 2)); // 同步更新 jsonInput
              setValidationError(''); // 清除验证错误
              onShowStatus('已恢复默认配置');
            }}
          >
            默认
          </button>
          <button
            title="从系统配置重新加载"
            onClick={reloadEffectConfig}
            style={{ padding: '8px 16px' }}
          >
            重载
          </button>
          <button
            title="从剪切板粘贴导入完整配置"
            onClick={handlePasteFullConfig}
            style={{ padding: '8px 16px' }}
          >
            导入
          </button>
          <button
            onClick={saveEffectConfig}
            style={{ padding: '8px 16px' }}
            disabled={!!validationError}
            title="保存至缓存设置"
          >
            暂存
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
