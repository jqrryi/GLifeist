// src/components/ItemManageTab.js
import React, { useState, useMemo, useEffect } from 'react';
import CONFIG from '../config';
import './ItemManageTab.css';
import SettingsModal from "./SettingsModal";
import ProgressDialog from './ProgressDialog';
import userDataManager from '../utils/userDataManager';

const ItemManageTab = ({
  items,
  settings,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onShowStatus,
  categories = ["经验类", "属性类", "消耗类", "装备类", "材料类", "任务类", "未分类"],
  creditTypes = ["智", "武", "体", "活", "敏", "灵", "A", "B"],
  // autoConvertIcons,
  // 添加游戏世界参数
  // parallelWorlds = {
  //   worlds: ["默认世界", "幻想世界", "科幻世界", "古代世界"],
  //   gmCommands: {},
  //   defaultWorld: '默认世界'
  // },
  hideTopControls,
  enableAllCreditsPricing,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 使用 parallelWorlds.worlds 代替原来的 parallelWorlds
  const worlds = settings.parallelWorlds || ["默认世界", "幻想世界", "科幻世界", "古代世界"];
  const [formData, setFormData] = useState({
    name: '',
    id: '',
    description: '',
    category: '未分类',
    price: {},
    icon: '',
    // 添加新字段
    parallelWorld: settings.defaultParallelWorld || worlds[0] || '默认世界', // 使用默认游戏世界
    recipes: [], // 合成配方字段，每个配方包含多个道具
    gmCommand: '', // GM 命令字段
    lootBoxes: [],
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('全部');
  // 添加游戏世界筛选状态
  const [filterParallelWorld, setFilterParallelWorld] = useState('全部');
  // 添加配方模态框状态
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  // 修改配方表单数据结构
  const [recipeFormData, setRecipeFormData] = useState({
    items: [], // 多个道具
    currentItem: '',
    itemCount: 1
  });
  const [itemSearch, setItemSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  // 当前编辑的配方索引
  const [editingRecipeIndex, setEditingRecipeIndex] = useState(null);
  const [showGmCommandModal, setShowGmCommandModal] = useState(false);
  const [gmCommandTemplates, setGmCommandTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [gmVariables, setGmVariables] = useState({});
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showLootBoxModal, setShowLootBoxModal] = useState(false);
  const [lootBoxFormData, setLootBoxFormData] = useState({
    items: [],
    currentItem: '',
    itemCount: 1,
    dropRate: 0.01
  });
  const [editingLootBoxIndex, setEditingLootBoxIndex] = useState(null);
  const [lootBoxSearch, setLootBoxSearch] = useState('');
  const [showLootBoxDropdown, setShowLootBoxDropdown] = useState(false);
  const [fieldSettings, setFieldSettings] = useState(() => {
    // const savedSettings = localStorage.getItem('itemFieldSettings');
    const savedSettings = userDataManager.getUserData('itemFieldSettings');

    return savedSettings ? savedSettings : {
      icon: true,
      description: true,
      category: true,
      parallelWorld: true,
      id: true,
      gmCommand: false,
      price: true,
      recipes: false,
      lootBoxes: false
    };
  });
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // 当前页码
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    // 从 localStorage 中获取保存的每页道具数，如果没有则默认为 10
    // const savedItemsPerPage = localStorage.getItem('itemsPerPage');
    const savedItemsPerPage = userDataManager.getUserData('itemsPerPage');

    return savedItemsPerPage ? parseInt(savedItemsPerPage, 10) : 10;
  }); // 每页道具数

  const [inputPage, setInputPage] = useState(currentPage); // 用于页码输入框的状态

  const [importState, setImportState] = useState({
    isImporting: false,
    progress: 0,
    totalItems: 0,
    importedItems: 0,
    errors: []
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  // 添加导出状态管理
  const [exportState, setExportState] = useState({
    isExporting: false,
    progress: 0
  });
  // 添加导出选项状态
  const [exportOptions, setExportOptions] = useState({
    includeAllFields: true,
    selectedFields: [],
    exportFormat: 'csv', // csv, json
    exportFilteredOnly: false
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [showRecipeItemNames, setShowRecipeItemNames] = useState(false);
  const [showLootBoxItemNames, setShowLootBoxItemNames] = useState(false);


  // 添加 useEffect 来监听表单变化并自动更新 GM 命令
  useEffect(() => {
    if (formData.id && formData.parallelWorld) {
      const gmCommand = generateGmCommand(formData.parallelWorld, formData.id);
      setFormData(prev => ({
        ...prev,
        gmCommand: gmCommand
      }));
    }
  }, [formData.id, formData.parallelWorld]);

  // 使用传入的 categories
  const allCategories = useMemo(() => {
    return ['全部', ...categories];
  }, [categories]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // useEffect(() => {
  //   const handleEscKey = (event) => {
  //     if (event.key === 'Escape') {
  //       // 优先级：配方模态框 > GM命令模态框 > 主模态框
  //       if (showRecipeModal) {
  //         setShowRecipeModal(false);
  //         setRecipeFormData({
  //           items: [],
  //           currentItem: '',
  //           itemCount: 1
  //         });
  //         setEditingRecipeIndex(null);
  //         setItemSearch('');
  //       } else if (showGmCommandModal) {
  //         setShowGmCommandModal(false);
  //         setSelectedTemplate(null);
  //         setGmVariables({});
  //       } else if (showAddForm || editingItem) {
  //         setShowAddForm(false);
  //         setEditingItem(null);
  //       }
  //     }
  //   };
  //
  //   const handleClickOutside = (event) => {
  //     // 检查点击是否在模态框外部
  //     if (showRecipeModal && event.target.classList.contains('modal-overlay')) {
  //       setShowRecipeModal(false);
  //       setRecipeFormData({
  //         items: [],
  //         currentItem: '',
  //         itemCount: 1
  //       });
  //       setEditingRecipeIndex(null);
  //       setItemSearch('');
  //     } else if (showGmCommandModal && event.target.classList.contains('modal-overlay')) {
  //       setShowGmCommandModal(false);
  //       setSelectedTemplate(null);
  //       setGmVariables({});
  //     } else if ((showAddForm || editingItem) && event.target.classList.contains('item-form-modal')) {
  //       setShowAddForm(false);
  //       setEditingItem(null);
  //     } else if (showFieldSettings && !event.target.closest('.field-settings-menu') && !event.target.closest('.field-settings-button')) {
  //       setShowFieldSettings(false);
  //     }
  //   };
  //
  //   // 添加键盘和鼠标事件监听器
  //   document.addEventListener('keydown', handleEscKey);
  //   document.addEventListener('click', handleClickOutside);
  //
  //   // 清理函数
  //   return () => {
  //     document.removeEventListener('keydown', handleEscKey);
  //     document.removeEventListener('click', handleClickOutside);
  //   };
  // }, [showAddForm, editingItem, showRecipeModal, showGmCommandModal,showFieldSettings]);
  // useEffect(() => {
  //   const handleEscKey = (event) => {
  //     if (event.key === 'Escape') {
  //       // 优先级：配方模态框 > 宝箱模态框 > GM命令模态框 > 主模态框
  //       if (showRecipeModal) {
  //         setShowRecipeModal(false);
  //         setRecipeFormData({
  //           items: [],
  //           currentItem: '',
  //           itemCount: 1
  //         });
  //         setEditingRecipeIndex(null);
  //         setItemSearch('');
  //       } else if (showLootBoxModal) {
  //         setShowLootBoxModal(false);
  //         setLootBoxFormData({
  //           items: [],
  //           currentItem: '',
  //           itemCount: 1,
  //           dropRate: 0.00
  //         });
  //         setEditingLootBoxIndex(null);
  //         setLootBoxSearch('');
  //       } else if (showGmCommandModal) {
  //         setShowGmCommandModal(false);
  //         setSelectedTemplate(null);
  //         setGmVariables({});
  //       } else if (showAddForm || editingItem) {
  //         setShowAddForm(false);
  //         setEditingItem(null);
  //       }
  //     }
  //   };
  //
  //   const handleClickOutside = (event) => {
  //     // 检查点击是否在模态框外部
  //     if (showRecipeModal && event.target.classList.contains('modal-overlay')) {
  //       setShowRecipeModal(false);
  //       setRecipeFormData({
  //         items: [],
  //         currentItem: '',
  //         itemCount: 1
  //       });
  //       setEditingRecipeIndex(null);
  //       setItemSearch('');
  //     } else if (showLootBoxModal && event.target.classList.contains('modal-overlay')) {
  //       setShowLootBoxModal(false);
  //       setLootBoxFormData({
  //         items: [],
  //         currentItem: '',
  //         itemCount: 1,
  //         dropRate: 0.00
  //       });
  //       setEditingLootBoxIndex(null);
  //       setLootBoxSearch('');
  //     } else if (showGmCommandModal && event.target.classList.contains('modal-overlay')) {
  //       setShowGmCommandModal(false);
  //       setSelectedTemplate(null);
  //       setGmVariables({});
  //     } else if ((showAddForm || editingItem) && event.target.classList.contains('item-form-modal')) {
  //       setShowAddForm(false);
  //       setEditingItem(null);
  //     }
  //   };
  //
  //   // 添加键盘和鼠标事件监听器
  //   document.addEventListener('keydown', handleEscKey);
  //   document.addEventListener('click', handleClickOutside);
  //
  //   // 清理函数
  //   return () => {
  //     document.removeEventListener('keydown', handleEscKey);
  //     document.removeEventListener('click', handleClickOutside);
  //   };
  // }, [showAddForm, editingItem, showRecipeModal, showLootBoxModal, showGmCommandModal]);
  // 替换现有的两个 useEffect 处理 ESC 键和点击外部区域的逻辑
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        // 按照优先级顺序关闭模态框：宝箱效果模态框 > 配方模态框 > GM命令模态框 > 添加/编辑道具模态框
        if (showLootBoxModal) {
          setShowLootBoxModal(false);
          setLootBoxFormData({
            items: [],
            currentItem: '',
            itemCount: 1,
            dropRate: 0.01
          });
          setEditingLootBoxIndex(null);
          setLootBoxSearch('');
        } else if (showRecipeModal) {
          setShowRecipeModal(false);
          setRecipeFormData({
            items: [],
            currentItem: '',
            itemCount: 1
          });
          setEditingRecipeIndex(null);
          setItemSearch('');
        } else if (showGmCommandModal) {
          setShowGmCommandModal(false);
          setSelectedTemplate(null);
          setGmVariables({});
        } else if (showFieldSettings) {
          setShowFieldSettings(false);
        } else if (showAddForm || editingItem) {
          setShowAddForm(false);
          setEditingItem(null);
        }
      }
    };

    const handleClickOutside = (event) => {
      // 检查点击是否在模态框外部
      if (showLootBoxModal && event.target.classList.contains('modal-overlay')) {
        setShowLootBoxModal(false);
        setLootBoxFormData({
          items: [],
          currentItem: '',
          itemCount: 1,
          dropRate: 0.01
        });
        setEditingLootBoxIndex(null);
        setLootBoxSearch('');
      } else if (showRecipeModal && event.target.classList.contains('modal-overlay')) {
        setShowRecipeModal(false);
        setRecipeFormData({
          items: [],
          currentItem: '',
          itemCount: 1
        });
        setEditingRecipeIndex(null);
        setItemSearch('');
      } else if (showGmCommandModal && event.target.classList.contains('modal-overlay')) {
        setShowGmCommandModal(false);
        setSelectedTemplate(null);
        setGmVariables({});
      } else if ((showAddForm || editingItem) && event.target.classList.contains('item-form-modal')) {
        setShowAddForm(false);
        setEditingItem(null);
      } else if (showFieldSettings && !event.target.closest('.field-settings-menu') && !event.target.closest('.field-settings-button')) {
        setShowFieldSettings(false);
      }
    };

    // 添加键盘和鼠标事件监听器
    document.addEventListener('keydown', handleEscKey);
    document.addEventListener('click', handleClickOutside);

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showAddForm, editingItem, showRecipeModal, showLootBoxModal, showGmCommandModal, showFieldSettings]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // 检查是否按下了 F 键并且没有其他修饰键
      if (event.key === 'f' && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
        // 防止在输入框中触发
        if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          // 聚焦到搜索框
          const searchInput = document.querySelector('.item-controls input[type="text"]');
          if (searchInput) {
            searchInput.focus();
          }
        }
      }
    };

    // 添加键盘事件监听器
    document.addEventListener('keydown', handleKeyDown);

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  // 在组件中添加判断是否为移动端的函数
  const isMobileDevice = () => {
    return window.innerWidth <= 768;
  };

  // 在获取所有游戏世界选项时使用新的结构
  const allParallelWorlds = useMemo(() => {
    const worldsSet = new Set(['全部', ...worlds]);
    Object.values(items).forEach(item => {
      if (item.parallelWorld && !worlds.includes(item.parallelWorld)) {
        worldsSet.add(item.parallelWorld);
      }
    });
    return Array.from(worldsSet);
  }, [items, worlds]);

  // 排序和筛选后的道具列表
  const filteredAndSortedItems = useMemo(() => {
    let result = Object.entries(items);

    // 搜索过滤
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(([name, item]) => {
        // 搜索道具名称
        if (name.toLowerCase().includes(lowerSearchTerm)) return true;

        // 搜索道具描述
        if (item.description && item.description.toLowerCase().includes(lowerSearchTerm)) return true;

        // 搜索合成配方
        if (item.recipes && item.recipes.some(recipe =>
          recipe.some(component =>
            component.itemName.toLowerCase().includes(lowerSearchTerm)
          )
        )) return true;

        // 搜索宝箱效果
        if (item.lootBoxes && item.lootBoxes.some(lootBox =>
          lootBox.some(component =>
            component.itemName.toLowerCase().includes(lowerSearchTerm)
          )
        )) return true;

        return false;
      });
    }


    // 类别筛选
    if (filterCategory !== '全部') {
      result = result.filter(([name, item]) =>
        (item.category || '未分类') === filterCategory
      );
    }

    // 游戏世界筛选
    if (filterParallelWorld !== '全部') {
      result = result.filter(([name, item]) =>
        (item.parallelWorld || '默认世界') === filterParallelWorld
      );
    }

    // 排序
    result.sort((a, b) => {
      const [nameA, itemA] = a;
      const [nameB, itemB] = b;

      let valueA, valueB;

      switch (sortField) {
        case 'name':
          valueA = nameA;
          valueB = nameB;
          break;
        case 'category':
          valueA = itemA.category || '未分类';
          valueB = itemB.category || '未分类';
          break;
        case 'id':
          valueA = itemA.id;
          valueB = itemB.id;
          break;
        case 'parallelWorld':
          valueA = itemA.parallelWorld || '默认世界';
          valueB = itemB.parallelWorld || '默认世界';
          break;
        default:
          valueA = nameA;
          valueB = nameB;
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
  }, [items, sortField, sortDirection, filterCategory, filterParallelWorld,searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);

  // 分页切换函数
  const paginate = (pageNumber) => {
    // 确保页码在有效范围内
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > totalPages) pageNumber = totalPages;
    setCurrentPage(pageNumber);
    setInputPage(pageNumber); // 同步更新输入框的值
  };

  const toggleFieldSetting = (field) => {
    const newSettings = {
      ...fieldSettings,
      [field]: !fieldSettings[field]
    };
    setFieldSettings(newSettings);
    // localStorage.setItem('itemFieldSettings', JSON.stringify(newSettings));
    userDataManager.setUserData('itemFieldSettings', newSettings);
  };

  const getFieldDisplayName = (field) => {
    const names = {
      icon: '图标',
      description: '道具描述',
      category: '道具类别',
      parallelWorld: '游戏世界',
      id: '道具ID',
      gmCommand: 'GM命令',
      price: '兑换价格',
      recipes: '合成配方',
      lootBoxes: '宝箱效果'
    };
    return names[field] || field;
  };
  // 处理添加配方中的道具
  const handleAddRecipeItem = () => {
    if (!recipeFormData.currentItem) {
      onShowStatus('请选择道具');
      return;
    }

    const newItem = {
      itemName: recipeFormData.currentItem,
      count: parseInt(recipeFormData.itemCount) || 1
    };

    setRecipeFormData(prev => {
      // 检查该道具是否已存在于配方中
      const existingItemIndex = prev.items.findIndex(
        item => item.itemName === newItem.itemName
      );

      if (existingItemIndex !== -1) {
        // 如果已存在，增加数量
        const updatedItems = [...prev.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          count: updatedItems[existingItemIndex].count + newItem.count
        };
        return {
          ...prev,
          items: updatedItems,
          currentItem: '',
          itemCount: 1
        };
      } else {
        // 如果不存在，添加新项目
        return {
          ...prev,
          items: [...prev.items, newItem],
          currentItem: '',
          itemCount: 1
        };
      }
    });

    setItemSearch('');
    setShowDropdown(false);
  };

  // 删除配方中的某个道具
  const removeRecipeItem = (index) => {
    setRecipeFormData(prev => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  // 保存配方（添加到主表单）
  const handleSaveRecipe = () => {
    if (recipeFormData.items.length === 0) {
      onShowStatus('请至少添加一个道具');
      return;
    }

    const newRecipe = [...recipeFormData.items];

    setFormData(prev => {
      const newRecipes = [...prev.recipes];

      if (editingRecipeIndex !== null) {
        // 编辑现有配方
        newRecipes[editingRecipeIndex] = newRecipe;
      } else {
        // 添加新配方
        newRecipes.push(newRecipe);
      }

      return { ...prev, recipes: newRecipes };
    });

    // 重置表单和状态
    setRecipeFormData({
      items: [],
      currentItem: '',
      itemCount: 1
    });
    setShowRecipeModal(false);
    setEditingRecipeIndex(null);
    setItemSearch('');
  };

  // 编辑现有配方
  const editRecipe = (index) => {
    const recipe = formData.recipes[index];
    setRecipeFormData({
      items: [...recipe],
      currentItem: '',
      itemCount: 1
    });
    setEditingRecipeIndex(index);
    setShowRecipeModal(true);
  };

  // 删除配方
  const removeRecipe = (index) => {
    setFormData(prev => {
      const newRecipes = [...prev.recipes];
      newRecipes.splice(index, 1);
      return { ...prev, recipes: newRecipes };
    });
  };

  // 过滤道具列表用于搜索
  const filteredItems = useMemo(() => {
    if (!items || Object.keys(items).length === 0) return [];
    if (!itemSearch) return Object.keys(items);
    return Object.keys(items).filter(item =>
      item.toLowerCase().includes(itemSearch.toLowerCase())
    );
  }, [items, itemSearch]);

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

  // 选择道具
  const selectItem = (itemName) => {
    setRecipeFormData(prev => ({
      ...prev,
      currentItem: itemName
    }));
    setItemSearch('');
    setShowDropdown(false);
  };

  const handleAddItem = async () => {
    try {
      let finalFormData = { ...formData };
      // if (autoConvertIcons && formData.icon && formData.icon.startsWith('http') && formData.icon.toLowerCase().endsWith('.png')) {
      //   finalFormData.icon = await convertImageToBase64(formData.icon);
      // }

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalFormData)
      });

      const result = await response.json();

      if (response.ok) {
        onShowStatus(result.message);
        onAddItem();
        setShowAddForm(false);
        setFormData({
          name: '',
          id: '',
          description: '',
          category: '未分类',
          price: {},
          parallelWorld: '默认世界',
          recipes: [],
          lootBoxes: [],
        });
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      let finalFormData = { ...formData };
      // if (autoConvertIcons && formData.icon && formData.icon.startsWith('http') && formData.icon.toLowerCase().endsWith('.png')) {
      //   finalFormData.icon = await convertImageToBase64(formData.icon);
      // }

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/items/${editingItem}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalFormData)
      });

      const result = await response.json();

      if (response.ok) {
        onShowStatus(result.message);
        onUpdateItem();
        setEditingItem(null);
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleDeleteItem = async (itemName) => {
    if (!window.confirm(`确定要删除道具${itemName}吗？\n注意：该操作不可恢复！`)) {
      return;
    }

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/items/${itemName}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        onShowStatus(result.message);
        onDeleteItem();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const handleCopyItem = (itemName) => {
    const itemToCopy = items[itemName];
    if (!itemToCopy) {
      onShowStatus('无法找到要复制的道具');
      return;
    }

    // 设置表单数据为被复制项的数据
    setFormData({
      name: `${itemName}_副本`,
      id: itemToCopy.id,
      description: itemToCopy.description,
      category: itemToCopy.category || '未分类',
      price: { ...itemToCopy.price },
      icon: itemToCopy.icon || '',
      parallelWorld: itemToCopy.parallelWorld || '默认世界',
      recipes: itemToCopy.recipes ? JSON.parse(JSON.stringify(itemToCopy.recipes)) : [],
      gmCommand: itemToCopy.gmCommand || '',
      lootBoxes: itemToCopy.lootBoxes ? JSON.parse(JSON.stringify(itemToCopy.lootBoxes)) : [],
    });

    // 打开新增表单
    setShowAddForm(true);
    setEditingItem(null);

    onShowStatus(`已复制道具 "${itemName}"，请修改名称后保存`);
  };

  // 批量删除
  const handleBatchDelete_deprecated = async () => {
    if (selectedItems.length === 0) {
      alert('请先选择要删除的道具');
      return;
    }

    if (!window.confirm(`确定要删除选中的${selectedItems.length}个道具吗？\n注意：该操作不可恢复！`)) {
      return;
    }

    try {
      let successCount = 0;
      for (const itemName of selectedItems) {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/items/${itemName}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          successCount++;
        }
      }

      onShowStatus(`成功删除${successCount}个道具`);
      setSelectedItems([]);
      onDeleteItem();
    } catch (error) {
      alert('网络错误');
    }
  };

  // 处理CSV文件导入
  const handleCsvImport_deprecated = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/items/import`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        onShowStatus(result.message);
        onAddItem();
        // 清空文件输入
        event.target.value = '';
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 添加显示导入提示的函数
  const showImportHint_deprecated = () => {
    const hintMessage =
      "CSV文件格式要求：\n\n" +
      "必需字段：\n" +
      "- name: 道具名称\n" +
      "- id: 道具ID\n" +
      "- description: 道具描述\n" +
      "- category: 道具类别\n\n" +
      "可选字段：\n" +
      "- icon: 图标URL\n" +
      "- parallelWorld: 游戏世界\n" +
      "- recipes: 合成配方（JSON格式）\n" +
      "- 积分类型字段: 对应积分价格\n\n" +
      "注意：可以只包含部分字段，系统会忽略不符合要求的字段。";

    if (window.confirm(hintMessage + "\n\n点击确定后选择CSV文件进行导入。")) {
      // 触发文件选择
      document.getElementById('csv-file').click();
    }
  };

  // 导出为CSV功能
  const handleCsvExport_deprecated = () => {
    // 创建CSV内容，添加图标列
    let csvContent = "名称,道具ID,描述,类别,图标,游戏世界,GM命令,合成配方";

    // 获取所有积分类型
    const allCreditTypes = [...new Set(Object.values(items).flatMap(item => Object.keys(item.price)))];
    csvContent += "," + allCreditTypes.join(",") + "\n";

    // 添加道具数据
    Object.entries(items).forEach(([name, item]) => {
      const row = [
        `"${name}"`,
        `"${item.id || ''}"`,
        `"${item.description || ''}"`,
        `"${item.category || '未分类'}"`,
        `"${item.icon || ''}"`,
        `"${item.parallelWorld || '默认世界'}"`,
        `"${item.gmCommand || ''}"`,  // 添加GM命令字段
        `"${JSON.stringify(item.recipes || [])}"`,
        ...allCreditTypes.map(ctype => item.price[ctype] || 0)
      ];
      csvContent += row.join(",") + "\n";
    });

    // 创建Blob对象
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });

    // 生成默认文件名（带时间戳）
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const defaultFilename = `道具列表_${timestamp}.csv`;

    // 创建临时下载链接
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", defaultFilename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);

    // 触发下载
    link.click();
    document.body.removeChild(link);
  };




  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) {
      alert('请先选择要删除的道具');
      return;
    }

    if (!window.confirm(`确定要删除选中的${selectedItems.length}个道具吗？\n注意：该操作不可恢复！`)) {
      return;
    }

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/items/batch-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_names: selectedItems })
      });

      const result = await response.json();

      if (response.ok) {
        onShowStatus(result.message);
        setSelectedItems([]);
        onDeleteItem();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 增强的CSV导入处理函数
  const handleCsvImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // 检查文件类型
    if (!file.name.endsWith('.csv')) {
      onShowStatus('请选择CSV格式的文件');
      event.target.value = '';
      return;
    }

    // 检查文件大小（限制为5MB）
    if (file.size > 5 * 1024 * 1024) {
      onShowStatus('文件大小不能超过5MB');
      event.target.value = '';
      return;
    }

    // 显示进度对话框
    setShowImportDialog(true);
    setImportState({
      isImporting: true,
      progress: 0,
      totalItems: 0,
      importedItems: 0,
      errors: []
    });

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('开始上传CSV文件:', file.name);

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/items/import`, {
        method: 'POST',
        body: formData
      });

      console.log('后端响应状态:', response.status);

      const result = await response.json();
      console.log('后端响应数据:', result);

      if (response.ok) {
        // 显示详细导入结果
        let message = result.message;
        if (result.importedCount !== undefined && result.failedCount !== undefined) {
          message = `导入完成：成功${result.importedCount}个，失败${result.failedCount}个。增加${result.addedCount}个，更新${result.updatedCount}个。错误信息：${result.errors}`;

          if (result.errors && result.errors.length > 0) {
            message += `\n失败详情：\n${result.errors.slice(0, 5).join('\n')}`;
            if (result.errors.length > 5) {
              message += `\n...还有${result.errors.length - 5}个错误`;
            }
          }
        }

        onShowStatus(message);
        onAddItem();
        event.target.value = '';
      } else {
        onShowStatus(`导入失败：${result.error}`);
      }
    } catch (error) {
      console.error('导入过程中发生错误:', error);
      onShowStatus(`网络错误：${error.message}`);
    } finally {
      setImportState(prev => ({ ...prev, isImporting: false }));
      setShowImportDialog(false);
    }
  };


  // 添加下载导入模板功能
  const downloadImportTemplate = () => {
    const headers = [
      "name", "id", "description", "category", "icon",
      "parallelWorld", "gmCommand", "recipes", "lootBoxes",
      ...creditTypes
    ];

    const csvContent = headers.join(",") + "\n";
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "道具导入模板.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 改进导入提示函数
  const showImportHint = () => {
    const hintMessage =
      "导入格式说明：\n\n" +
      "请使用导出功能获取道具数据csv文件，以查看表头字段及内容格式。\n";

    const userChoice = window.confirm(hintMessage);

    if (userChoice) {
      document.getElementById('csv-file').click();
    }
    // else {
      // downloadImportTemplate();
    // }
  };



  // 增强的CSV导出功能
  const handleCsvExport = () => {
    setExportState({ isExporting: true, progress: 0 });

    try {
      // 确定要导出的数据源
      let exportData = Object.entries(items);
      if (exportOptions.exportFilteredOnly) {
        exportData = filteredAndSortedItems;
      }

      // 创建CSV内容
      let csvContent = "";

      // 根据选项确定字段
      let headers = [];
      if (exportOptions.includeAllFields) {
        headers = [
          "名称", "道具ID", "描述", "类别", "图标",
          "游戏世界", "GM命令", "合成配方", "宝箱效果"
        ];

        // 获取所有积分类型
        const allCreditTypes = [...new Set(exportData.flatMap(([name, item]) => Object.keys(item.price || {})))];
        headers = [...headers, ...allCreditTypes];
      } else {
        // 使用用户选择的字段
        headers = exportOptions.selectedFields;
      }

      csvContent += headers.join(",") + "\n";

      // 添加道具数据
      exportData.forEach(([name, item], index) => {
        const row = [];

        headers.forEach(header => {
          let value = '';
          switch (header) {
            case "名称":
              value = name;
              break;
            case "道具ID":
              value = item.id || '';
              break;
            case "描述":
              value = item.description || '';
              break;
            case "类别":
              value = item.category || '未分类';
              break;
            case "图标":
              value = item.icon || '';
              break;
            case "游戏世界":
              value = item.parallelWorld || '默认世界';
              break;
            case "GM命令":
              value = item.gmCommand || '';
              break;
            case "合成配方":
              value = JSON.stringify(item.recipes || []);
              break;
            case "宝箱效果":
              value = JSON.stringify(item.lootBoxes || []);
              break;
            default:
              // 积分类型字段
              value = (item.price && item.price[header]) || 0;
          }

          // CSV字段转义
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          row.push(value);
        });

        csvContent += row.join(",") + "\n";

        // 更新进度（每100个项目更新一次）
        if (index % 100 === 0) {
          setExportState({
            isExporting: true,
            progress: Math.round((index / exportData.length) * 100)
          });
        }
      });

      // 创建Blob对象
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });

      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const defaultFilename = `道具列表_${timestamp}.csv`;

      // 创建并触发下载
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", defaultFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowStatus(`成功导出${exportData.length}个道具`);
    } catch (error) {
      onShowStatus(`导出失败：${error.message}`);
    } finally {
      setExportState({ isExporting: false, progress: 100 });
      setTimeout(() => {
        setExportState({ isExporting: false, progress: 0 });
      }, 2000);
    }
  };

  // 添加JSON导出功能
  const handleJsonExport = () => {
    setExportState({ isExporting: true, progress: 0 });

    try {
      // 确定要导出的数据源
      let exportData = items;
      if (exportOptions.exportFilteredOnly) {
        const filteredNames = new Set(filteredAndSortedItems.map(([name]) => name));
        exportData = Object.fromEntries(
          Object.entries(items).filter(([name]) => filteredNames.has(name))
        );
      }

      // 根据字段选项过滤数据
      if (!exportOptions.includeAllFields && exportOptions.selectedFields.length > 0) {
        const fieldMap = {
          "名称": "name",
          "道具ID": "id",
          "描述": "description",
          "类别": "category",
          "图标": "icon",
          "游戏世界": "parallelWorld",
          "GM命令": "gmCommand",
          "合成配方": "recipes",
          "宝箱效果": "lootBoxes"
        };

        exportData = Object.fromEntries(
          Object.entries(exportData).map(([name, item]) => {
            const filteredItem = {};
            exportOptions.selectedFields.forEach(field => {
              const key = fieldMap[field] || field;
              if (key in item) {
                filteredItem[key] = item[key];
              } else if (item.price && key in item.price) {
                if (!filteredItem.price) filteredItem.price = {};
                filteredItem.price[key] = item.price[key];
              }
            });
            return [name, filteredItem];
          })
        );
      }

      // 创建JSON内容
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob(["\uFEFF" + jsonString], { type: 'application/json;charset=utf-8;' });

      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const defaultFilename = `道具列表_${timestamp}.json`;

      // 创建并触发下载
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", defaultFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowStatus(`成功导出${Object.keys(exportData).length}个道具`);
    } catch (error) {
      onShowStatus(`导出失败：${error.message}`);
    } finally {
      setExportState({ isExporting: false, progress: 100 });
      setTimeout(() => {
        setExportState({ isExporting: false, progress: 0 });
      }, 2000);
    }
  };

  // 统一导出处理函数
  const handleExport = () => {
    if (exportOptions.exportFormat === 'csv') {
      handleCsvExport();
    } else {
      handleJsonExport();
    }
  };

  // 添加导出选项模态框
  const ExportOptionsModal = () => {
    const [showModal, setShowModal] = useState(false);

    const allFields = [
      "名称", "道具ID", "描述", "类别", "图标",
      "游戏世界", "GM命令", "合成配方", "宝箱效果",
      ...creditTypes
    ];

    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          disabled={exportState.isExporting}
          title="导出选项"
        >
          {exportState.isExporting ? `导出中(${exportState.progress}%)` : "📤"}
        </button>

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ width: '500px' }}>
              <h4>导出选项</h4>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={exportOptions.exportFilteredOnly}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      exportFilteredOnly: e.target.checked
                    }))}
                  />
                  仅导出当前筛选结果 ({filteredAndSortedItems.length} 个项目)
                </label>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={exportOptions.exportFormat === 'csv'}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      exportFormat: e.target.value
                    }))}
                  />
                  CSV格式
                </label>
                <label>
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={exportOptions.exportFormat === 'json'}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      exportFormat: e.target.value
                    }))}
                  />
                  JSON格式
                </label>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeAllFields}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      includeAllFields: e.target.checked
                    }))}
                  />
                  导出所有字段
                </label>

                {!exportOptions.includeAllFields && (
                  <div style={{ marginTop: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                    {allFields.map(field => (
                      <div key={field}>
                        <label>
                          <input
                            type="checkbox"
                            checked={exportOptions.selectedFields.includes(field)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setExportOptions(prev => ({
                                  ...prev,
                                  selectedFields: [...prev.selectedFields, field]
                                }));
                              } else {
                                setExportOptions(prev => ({
                                  ...prev,
                                  selectedFields: prev.selectedFields.filter(f => f !== field)
                                }));
                              }
                            }}
                          />
                          {field}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  onClick={handleExport}
                  disabled={exportState.isExporting}
                  className="btn btn-success"
                >
                  {exportState.isExporting ? `导出中(${exportState.progress}%)` : "导出"}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // 添加默认CSV导出函数
  const handleDefaultCsvExport = () => {
    try {
      // 创建CSV内容，包含所有字段
      let csvContent = "名称,道具ID,描述,类别,图标,游戏世界,GM命令,合成配方,宝箱效果";

      // 获取所有积分类型
      const allCreditTypes = [...new Set(Object.values(items).flatMap(item => Object.keys(item.price || {})))];
      csvContent += "," + allCreditTypes.join(",") + "\n";

      // 添加所有道具数据
      Object.entries(items).forEach(([name, item]) => {
        const row = [
          `"${name}"`,
          `"${item.id || ''}"`,
          `"${item.description || ''}"`,
          `"${item.category || '未分类'}"`,
          `"${item.icon || ''}"`,
          `"${item.parallelWorld || '默认世界'}"`,
          `"${item.gmCommand || ''}"`,
          `"${JSON.stringify(item.recipes || []).replace(/"/g, '""')}"`,
          `"${JSON.stringify(item.lootBoxes || []).replace(/"/g, '""')}"`
        ];

        // 添加积分价格数据
        allCreditTypes.forEach(ctype => {
          const price = (item.price && item.price[ctype]) || 0;
          row.push(`"${price}"`);
        });

        csvContent += row.join(",") + "\n";
      });

      // 创建Blob对象
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });

      // 生成文件名（带时间戳）
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const defaultFilename = `道具列表_${timestamp}.csv`;

      // 创建并触发下载
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", defaultFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onShowStatus(`成功导出${Object.keys(items).length}个道具`);
    } catch (error) {
      onShowStatus(`导出失败：${error.message}`);
    }
  };








  const addPriceField = (creditType) => {
    setFormData({
      ...formData,
      price: {
        ...formData.price,
        [creditType]: 0.00
      }
    });
  };

  const updatePrice = (creditType, value) => {
    setFormData({
      ...formData,
      price: {
        ...formData.price,
        [creditType]: parseFloat(value) || 0
      }
    });
  };





  // 1. 添加获取选择状态的函数
  const getSelectionStatus = () => {
    const totalItems = Object.keys(items).length;
    const filteredItemsCount = filteredAndSortedItems.length;
    const currentPageItemsCount = currentItems.length;
    const currentPageItemNames = currentItems.map(([name]) => name);

    const currentPageSelected = currentPageItemNames.filter(name => selectedItems.includes(name)).length;
    const isAllFilteredSelected =
      filteredItemsCount > 0 &&
      selectedItems.length > 0 &&
      filteredAndSortedItems.every(([name]) => selectedItems.includes(name));
    const isAllPageSelected =
      currentPageItemsCount > 0 &&
      currentPageSelected === currentPageItemsCount;
    const isAnyFilteredSelected = filteredAndSortedItems.some(([name]) => selectedItems.includes(name));

    return {
      totalItems,
      filteredItemsCount,
      currentPageItemsCount,
      currentPageSelected,
      isAllFilteredSelected,
      isAllPageSelected,
      isAnyFilteredSelected,
      totalSelected: selectedItems.length
    };
  };

  // 2. 添加处理全选操作的函数
  const handleSelectAllOperations = (operation) => {
    switch (operation) {
      case 'selectAllPage':
        // 选中当前页所有道具
        const currentPageItemNames = currentItems.map(([name]) => name);
        setSelectedItems(prev => [
          ...new Set([
            ...prev,
            ...currentPageItemNames
          ])
        ]);
        break;

      case 'selectAllAll':
        // 选中所有过滤后的道具
        setSelectedItems(filteredAndSortedItems.map(([name]) => name));
        break;

      case 'deselectPage':
        // 取消选中当前页道具
        const currentPageItemNamesDeselect = currentItems.map(([name]) => name);
        setSelectedItems(prev => prev.filter(name => !currentPageItemNamesDeselect.includes(name)));
        break;

      case 'deselectAll':
        // 取消选中所有道具
        setSelectedItems([]);
        break;

      default:
        break;
    }
  };

  // 3. 创建增强的全选复选框组件
  const EnhancedSelectAll = () => {
    const status = getSelectionStatus();
    const [isOpen, setIsOpen] = useState(false);

    // 点击外部关闭下拉菜单
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (isOpen && !event.target.closest('.enhanced-select-all')) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    return (
      <div className="enhanced-select-all" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div className="select-all-main" style={{ display: 'flex', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={status.isAllFilteredSelected}
            ref={el => {
              if (el) {
                // 设置部分选中状态
                el.indeterminate = !status.isAllFilteredSelected && status.isAnyFilteredSelected;
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
                  `已选中全部${status.totalSelected}个道具` :
                  `已选中${status.totalSelected}个道具，点击选中全部`}
            style={{ cursor: 'pointer' }}
          />
          {status.totalSelected > 0 && (
            <span className="selection-count" style={{ marginLeft: '5px', fontSize: '12px' }}>
              {status.totalSelected}
              {!status.isAllFilteredSelected && (
                <span className="total-count">/{status.filteredItemsCount}</span>
              )}
            </span>
          )}
        </div>

        {(status.totalSelected > 0 || status.filteredItemsCount > status.currentPageItemsCount) && (
          <div className="select-all-dropdown" style={{ position: 'relative', marginLeft: '5px' }}>
            <button
              className="dropdown-toggle"
              title="更多选择选项"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '10px',
                padding: '2px 4px'
              }}
            >
              ▼
            </button>
            {isOpen && (
              <div
                className="dropdown-menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  minWidth: '120px',
                  padding: '5px 0'
                }}
              >
                {!status.isAllPageSelected ? (
                  <button
                    onClick={() => {
                      handleSelectAllOperations('selectAllPage');
                      setIsOpen(false);
                    }}
                  >
                    选中当前页 ({status.currentPageItemsCount})
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleSelectAllOperations('deselectPage');
                      setIsOpen(false);
                    }}
                  >
                    取消当前页 ({status.currentPageSelected})
                  </button>
                )}
                {!status.isAllFilteredSelected ? (
                  <button
                    onClick={() => {
                      handleSelectAllOperations('selectAllAll');
                      setIsOpen(false);
                    }}
                  >
                    选中全部 ({status.filteredItemsCount})
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleSelectAllOperations('deselectAll');
                      setIsOpen(false);
                    }}
                  >
                    取消全部
                  </button>
                )}
                {status.totalSelected > 0 && (
                  <button
                    onClick={() => {
                      const currentPageItemNames = currentItems.map(([name]) => name);
                      const invertedPageSelection = currentPageItemNames.filter(name => !selectedItems.includes(name));
                      const otherSelected = selectedItems.filter(name => !currentPageItemNames.includes(name));
                      setSelectedItems([...otherSelected, ...invertedPageSelection]);
                      setIsOpen(false);
                    }}
                  >
                    反选当前页
                  </button>
                )}
                {status.totalSelected > 0 && (
                  <button
                    onClick={() => {
                      setSelectedItems(filteredAndSortedItems
                        .map(([name]) => name)
                        .filter(name => !selectedItems.includes(name)));
                      setIsOpen(false);
                    }}
                  >
                    反选全部页
                  </button>
                )}
                {/* 添加批量删除按钮 */}
                {status.totalSelected > 0 && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setTimeout(() => {
                        if (window.confirm(`确定要删除选中的${selectedItems.length}个道具吗？\n注意：该操作不可恢复！`)) {
                          handleBatchDelete();
                        }
                      }, 100);
                    }}
                    style={{
                      color: '#dc3545'
                    }}
                  >
                    批量删除 ({selectedItems.length})
                  </button>
                )}
                {/* 添加批量转换图标按钮 */}
                {status.totalSelected > 0 && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setTimeout(() => {
                        handleBatchConvertIcons();
                      }, 100);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '5px 10px',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="批量下载png图片链接并转化为本地url"
                  >
                    批量转换图标/png2url ({selectedItems.length})
                  </button>
                )}
                {/*// 添加批量生成 GM 命令按钮*/}
                {status.totalSelected > 0 && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setTimeout(() => {
                        handleBatchGenerateGmCommands();
                      }, 100);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '5px 10px',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    批量生成GM命令 ({selectedItems.length})
                  </button>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    );
  };



  const getSelectionStatus_deprecated = () => {
    const totalItems = Object.keys(items).length;
    const filteredItemsCount = filteredAndSortedItems.length;
    const currentPageItems = currentItems.map(([name]) => name);

    const isAllFilteredSelected =
      filteredItemsCount > 0 &&
      selectedItems.length > 0 &&
      filteredAndSortedItems.every(([name]) => selectedItems.includes(name));

    const isAnyFilteredSelected = filteredAndSortedItems.some(([name]) => selectedItems.includes(name));
    const currentPageSelected = currentPageItems.filter(name => selectedItems.includes(name)).length;

    return {
      isAllFilteredSelected,
      isAnyFilteredSelected,
      totalItems,
      filteredItemsCount,
      currentPageItemsCount: currentPageItems.length,
      currentPageSelected,
      totalSelected: selectedItems.length
    };
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      handleSelectAllOperations('selectAllAll');
    } else {
      handleSelectAllOperations('deselectAll');
    }
  };

  // 处理全选/取消全选
  const handleSelectAll_deprecated = (e) => {
    if (e.target.checked) {
      setSelectedItems(filteredAndSortedItems.map(([name]) => name));
    } else {
      setSelectedItems([]);
    }
  };




  // 处理单个选择
  const handleSelectItem = (itemName) => {
    if (selectedItems.includes(itemName)) {
      setSelectedItems(selectedItems.filter(name => name !== itemName));
    } else {
      setSelectedItems([...selectedItems, itemName]);
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

  const renderIcon = (icon, name, size = 24) => {
    // if (!icon) return name;
    if (!icon || icon === "-") {
      // 如果 icon 为空或为 "-"，显示名称首字母
      return (
        <span
          className="icon-placeholder"
          title={name}
          style={{
            // display: 'flex',
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
          {name?.charAt(0).toUpperCase()}
        </span>
      );
    }
    // 检查是否为 emoji（Unicode 表情符号）
    // const isEmoji = /^[\uD83C-\uDBFF\uDC00-\uDFFF\u2702-\u27B0\u24C2-\uFDEF\u2600-\u26FF\u2300-\u23FF\u2190-\u21FF]{1,4}$/.test(icon);
    // if (isEmoji) {
    //   return (
    //     <span
    //       className="icon-emoji"
    //       title={name}
    //       style={{
    //         fontSize: `${size}px`,
    //         lineHeight: 1,
    //         display: 'inline-block',
    //         verticalAlign: 'middle'
    //       }}
    //     >
    //       {icon}
    //     </span>
    //   );
    // }

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
          {icon}
          {/*{icon || icon !=="-" ? icon : name.charAt(0).toUpperCase()}*/}
          {/*{name.charAt(0).toUpperCase()}*/}
        </span>
      );
    }
  };

  // 图片本地化功能
  const convertImageToBase64 = async (imageUrl) => {
    try {
      // 检查是否已经是base64格式
      if (imageUrl.startsWith('data:image')) {
        return imageUrl;
      }
      console.log('开始转换图片...')

      // 只处理http/https链接
      if (!imageUrl.startsWith('http')) {
        return imageUrl;
      }

      // 检查是否是PNG图片
      if (!imageUrl.toLowerCase().endsWith('.png')) {
        // 如果不是PNG，直接返回原链接
        return imageUrl;
      }

      // 通过后端代理获取图片
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/proxy/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('图片转换成功...')
        return data.base64;
      } else {
        // 代理失败时返回原链接
        return imageUrl;
      }
    } catch (error) {
      console.error('图片转换失败:', error);
      // 转换失败时返回原链接
      return imageUrl;
    }
  };

  // 手动转换当前表单中的图标
  const handleManualConvertIcon = async () => {
    if (!formData.icon || !formData.icon.startsWith('http') || !formData.icon.toLowerCase().endsWith('.png')) {
      onShowStatus('当前图标不是有效的在线PNG图片链接');
      return;
    }

    try {
      const base64Image = await convertImageToBase64(formData.icon);
      if (base64Image === formData.icon) {
        onShowStatus('图标转换失败，可能由于跨域限制，已保留原始链接');
      } else {
        setFormData({
          ...formData,
          icon: base64Image
        });
        onShowStatus('图标已转换为本地Base64格式');
      }
    } catch (error) {
      onShowStatus('图标转换失败: ' + (error.message || '未知错误'));
    }
  };

  // 批量转换所有道具的图标
  const handleBatchConvertIcons = async () => {
    // 只转换选中的道具
    const itemsToConvert = Object.entries(items)
      .filter(([name, item]) =>
        selectedItems.includes(name) &&  // 只处理选中的道具
        item.icon &&
        item.icon.startsWith('http') &&
        item.icon.toLowerCase().endsWith('.png')
      );

    if (itemsToConvert.length === 0) {
      onShowStatus('没有选中需要转换的在线图标');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const [name, item] of itemsToConvert) {
      try {
        const base64Image = await convertImageToBase64(item.icon);
        if (base64Image !== item.icon) {
          // 更新道具图标
          const response = await fetch(`${CONFIG.API_BASE_URL}/api/items/${name}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...item,
              icon: base64Image
            })
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        }
      } catch (error) {
        failCount++;
        console.error(`转换道具${name}的图标失败:`, error);
      }
    }

    onShowStatus(`批量转换完成: 成功${successCount}个，失败${failCount}个`);
    onUpdateItem(); // 刷新道具列表
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

  // 删除道具奖励字段
  const removeItemReward = (itemName) => {
    const newRewards = { ...formData.items_reward };
    delete newRewards[itemName];
    setFormData({
      ...formData,
      items_reward: newRewards
    });
  };

  // 在 ItemManageTab 组件中添加 GM 命令生成函数
  const generateGmCommand = (world, item) => {
    // 从 props 获取 GM 命令配置
    const gmCommands = settings.gmCommands || {};

    // 按orderNo排序获取该世界的命令列表
    const worldCommands = Object.entries(gmCommands)
      .filter(([id, command]) => command.gameWorld === world)
      .sort((a, b) => (a[1].orderNo || 0) - (b[1].orderNo || 0));

    // 获取该世界的第一个命令作为默认模板
    if (worldCommands.length > 0) {
      const defaultCommand = worldCommands[0][1];
      if (defaultCommand.gmCommand) {
        return defaultCommand.gmCommand.replace(/{item}/g, item || '');
      }
    }

    // 如果没有找到指定世界的命令，返回空字符串
    return '';
  };

  // 提取GM命令模板中的变量
  const extractVariables = (template) => {
    const variableRegex = /{([^}]+)}/g;
    const variables = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  };

  // 生成GM命令
  const generateCommandFromTemplate = (template, variables) => {
    let command = template;
    Object.keys(variables).forEach(key => {
      command = command.replace(new RegExp(`{${key}}`, 'g'), variables[key] || '');
    });
    return command;
  };
  // 批量生成并更新选中道具的 GM 命令
  const handleBatchGenerateGmCommands = async () => {
    // 只处理选中的道具
    const itemsToUpdate = Object.entries(items)
      .filter(([name, item]) => selectedItems.includes(name));

    if (itemsToUpdate.length === 0) {
      onShowStatus('没有选中任何道具');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const [name, item] of itemsToUpdate) {
      try {
        // 生成 GM 命令
        const gmCommand = generateGmCommand(item.parallelWorld || '默认世界', item.id);

        // 如果生成的命令为空或者与现有命令相同，则跳过更新
        if (!gmCommand || gmCommand === item.gmCommand) {
          continue;
        }

        // 更新道具的 GM 命令
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/items/${name}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...item,
            gmCommand: gmCommand
          })
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
        console.error(`更新道具${name}的GM命令失败:`, error);
      }
    }

    onShowStatus(`批量生成GM命令完成: 成功${successCount}个，失败${failCount}个`);
    onUpdateItem(); // 刷新道具列表
  };


  // 在其他函数后面添加
  const toggleRowExpansion = (itemName) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };




  const handleAddLootBoxItem = () => {
    if (!lootBoxFormData.currentItem) {
      onShowStatus('请选择道具');
      return;
    }

    // 如果爆率为0，则不添加
    const newRate = parseFloat(lootBoxFormData.dropRate) || 0;
    if (newRate === 0) {
      onShowStatus('爆率不能为0');
      return;
    }

    // 计算当前总爆率
    const currentTotalRate = lootBoxFormData.items.reduce((sum, item) => sum + parseFloat(item.dropRate || 0), 0);

    if (currentTotalRate + newRate > 1) {
      onShowStatus('爆率总和不能超过100%');
      return;
    }

    const newItem = {
      itemName: lootBoxFormData.currentItem,
      count: parseInt(lootBoxFormData.itemCount) || 1,
      dropRate: newRate
    };

    setLootBoxFormData(prev => {
      // 检查该道具是否已存在于宝箱效果中
      const existingItemIndex = prev.items.findIndex(
        item => item.itemName === newItem.itemName
      );

      if (existingItemIndex !== -1) {
        // 如果已存在，更新数量和爆率
        const updatedItems = [...prev.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          count: updatedItems[existingItemIndex].count + newItem.count,
          dropRate: updatedItems[existingItemIndex].dropRate + newItem.dropRate
        };
        return {
          ...prev,
          items: updatedItems,
          currentItem: '',
          itemCount: 1,
          dropRate: 0.01
        };
      } else {
        // 如果不存在，添加新项目
        return {
          ...prev,
          items: [...prev.items, newItem],
          currentItem: '',
          itemCount: 1,
          dropRate: 0.01
        };
      }
    });

    setLootBoxSearch('');
    setShowLootBoxDropdown(false);
  };

  // 删除宝箱中的某个道具
  const removeLootBoxItem = (index) => {
    setLootBoxFormData(prev => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const fillLootBoxFormWithItem = (item) => {
    setLootBoxFormData(prev => ({
      ...prev,
      currentItem: item.itemName,
      itemCount: item.count,
      dropRate: item.dropRate
    }));
    setLootBoxSearch(item.itemName);
  };
  const fillRecipeFormWithItem = (item) => {
    setRecipeFormData(prev => ({
      ...prev,
      currentItem: item.itemName,
      itemCount: item.count
    }));
    setItemSearch(item.itemName);
  };

  // 保存宝箱效果（添加到主表单）
  const handleSaveLootBox = () => {
    if (lootBoxFormData.items.length === 0) {
      onShowStatus('请至少添加一个道具');
      return;
    }

    // 验证总爆率
    const totalRate = lootBoxFormData.items.reduce((sum, item) => sum + parseFloat(item.dropRate || 0), 0);
    if (totalRate > 1) {
      onShowStatus('爆率总和不能超过100%');
      return;
    }

    const newLootBox = [...lootBoxFormData.items];

    setFormData(prev => {
      const newLootBoxes = [...prev.lootBoxes];

      if (editingLootBoxIndex !== null) {
        // 编辑现有宝箱效果
        newLootBoxes[editingLootBoxIndex] = newLootBox;
      } else {
        // 添加新宝箱效果
        newLootBoxes.push(newLootBox);
      }

      return { ...prev, lootBoxes: newLootBoxes };
    });

    // 重置表单和状态
    setLootBoxFormData({
      items: [],
      currentItem: '',
      itemCount: 1,
      dropRate: 0.01
    });
    setShowLootBoxModal(false);
    setEditingLootBoxIndex(null);
    setLootBoxSearch('');
  };

  // 编辑现有宝箱效果
  const editLootBox = (index) => {
    const lootBox = formData.lootBoxes[index];
    setLootBoxFormData({
      items: [...lootBox],
      currentItem: '',
      itemCount: 1,
      dropRate: 0.01
    });
    setEditingLootBoxIndex(index);
    setShowLootBoxModal(true);
  };

  // 删除宝箱效果
  const removeLootBox = (index) => {
    setFormData(prev => {
      const newLootBoxes = [...prev.lootBoxes];
      newLootBoxes.splice(index, 1);
      return { ...prev, lootBoxes: newLootBoxes };
    });
  };

  // 过滤道具列表用于宝箱搜索
  const filteredLootBoxItems = useMemo(() => {
    if (!items || Object.keys(items).length === 0) return [];
    if (!lootBoxSearch) return Object.keys(items);
    return Object.keys(items).filter(item =>
      item.toLowerCase().includes(lootBoxSearch.toLowerCase())
    );
  }, [items, lootBoxSearch]);

  // 处理宝箱输入框聚焦事件
  const handleLootBoxInputFocus = () => {
    setShowLootBoxDropdown(true);
  };

  // 处理宝箱输入框失焦事件
  const handleLootBoxInputBlur = () => {
    // 延迟隐藏下拉列表，确保点击选项时不会立即隐藏
    setTimeout(() => {
      setShowLootBoxDropdown(false);
    }, 200);
  };

  // 处理宝箱输入框内容变化
  const handleLootBoxInputChange = (e) => {
    setLootBoxSearch(e.target.value);
    setShowLootBoxDropdown(true); // 输入时显示下拉列表
  };

  // 选择宝箱道具
  const selectLootBoxItem = (itemName) => {
    setLootBoxFormData(prev => ({
      ...prev,
      currentItem: itemName
    }));
    setLootBoxSearch('');
    setShowLootBoxDropdown(false);
  };
  const resetRecipeForm = () => {
    setRecipeFormData(prev => ({
      ...prev,
      currentItem: '',
      itemCount: 1
    }));
    setItemSearch('');
  };
  const resetLootBoxForm = () => {
    setLootBoxFormData(prev => ({
      ...prev,
      currentItem: '',
      itemCount: 1,
      dropRate: 0.01
    }));
    setLootBoxSearch('');
  };

  const [showFilters, setShowFilters] = useState(false);
  const renderItemsFilters = () => (
    <div style={{ display: 'flex', gap: '1px'}}>
      <select
        value={filterCategory}
        onChange={(e) => setFilterCategory(e.target.value)}
        title="筛选类别"
      >
        {allCategories.map(category => (
          <option key={category} value={category}>{category}</option>
        ))}
      </select>
      <select
        value={filterParallelWorld}
        onChange={(e) => setFilterParallelWorld(e.target.value)}
        title="筛选游戏世界"
      >
        {allParallelWorlds.map(world => (
          <option key={world} value={world}>{world}</option>
        ))}
      </select>
    </div>
  );
  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      clearSearch();
      e.target.blur();
    }
  };

  return (
    <div className="item-manage-tab">

      {/* 筛选和排序控件 */}
      <div className="manage-controls" style={{ display: hideTopControls ? 'none' : 'flex', gap: '10px', flexDirection: 'column' }}>
        <div style={{ display: 'flex',  justifyContent:'space-between' }}>
          {/* 控制按钮 */}
          <div className="item-controls">

            <div style={{ position: 'relative', display: 'inline-block', marginRight: '10px' }}>
              <input
                type="text"
                placeholder="搜索道具名称、描述、配方、宝箱效果..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                style={{
                  padding: '5px 25px 5px 5px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  width: isMobile ? '100px' : '250px',
                  height: '25px',
                }}
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  style={{
                    position: 'absolute',
                    right: '5px',
                    top: '35%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '0',
                    width: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#999',
                  }}
                  title="清除搜索"
                >
                  ×
                </button>
              )}
            </div>

            {isMobile?(
                <button onClick={() => setShowFilters(!showFilters)}>
                  ☰
                </button>
            ):(
             renderItemsFilters()
            )}

          </div>

          <div className='item-controls'>
            <button onClick={() => {
              setShowAddForm(true);
              // 设置默认游戏世界
              setFormData(prev => ({
                ...prev,
                parallelWorld: settings.defaultParallelWorld || worlds[0] || '默认世界'
              }));
            }}
             title="新增道具"
            > ✙ </button>
            <div className="field-settings-container" style={{ position: 'relative', display: 'flex',flexDirection: 'row' }}>
              {!isMobile && (
                <button
                  className="field-settings-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFieldSettings(!showFieldSettings);
                  }}
                  title="显示字段设置"
                >
                  🔳
                </button>
              )}

              {showFieldSettings && (
                <div className="field-settings-menu" style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  minWidth: '150px',
                  padding: '5px 0'
                }}>
                  {Object.keys(fieldSettings).map(field => (
                    <div
                      key={field}
                      style={{
                        padding: '4px 6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFieldSetting(field);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={fieldSettings[field]}
                        onChange={() => toggleFieldSetting(field)}
                        style={{ marginRight: '8px' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>{getFieldDisplayName(field)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={showImportHint} className="csv-import-button" title="从CSV文件导入道具信息">
              📥
            </button>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              style={{display: 'none'}}
            />
            <button onClick={handleDefaultCsvExport} title="导出为CSV文件">📤</button>

            <button onClick={onAddItem} title="刷新">⟳</button>
            <button className="tasksys-settings-button" onClick={() => setIsSettingsModalOpen(!isSettingsModalOpen)}>
              ⚙️️
            </button>
            <SettingsModal
              isOpen={isSettingsModalOpen}
              title="道具设置"
              onClose={() => setIsSettingsModalOpen(false)}
              targetGroup={['general','gm-command']}
              settings={settings}
              onUpdateSettings={onUpdateItem}
            />
          </div>
        </div>

        {isMobile && showFilters && (renderItemsFilters())}

      </div>


      <table>
        <thead>
          <tr>
            <th>
              {EnhancedSelectAll()}
            </th>
            {/*<th>*/}
            {/*  <input*/}
            {/*    type="checkbox"*/}
            {/*    onChange={handleSelectAll}*/}
            {/*    checked={selectedItems.length > 0 && selectedItems.length === filteredAndSortedItems.length}*/}
            {/*  />*/}
            {/*</th>*/}
            {fieldSettings.icon && <th>图标</th>}
            <th onClick={() => handleSort('name')} style={{cursor: 'pointer'}}>
              道具名称 {getSortIcon('name')}
            </th>

            {isMobile ? (
              <>
                <th onClick={() => handleSort('category')} style={{cursor: 'pointer'}}>
                  道具类别 {getSortIcon('category')}
                </th>
                <th>操作</th>
              </>
            ) : (
              <>
                {fieldSettings.description && <th>道具描述</th>}
                {fieldSettings.category && <th onClick={() => handleSort('category')} style={{cursor: 'pointer'}}>
                  道具类别 {getSortIcon('category')}
                </th>}
                {fieldSettings.parallelWorld && <th onClick={() => handleSort('parallelWorld')} style={{cursor: 'pointer'}}>
                  游戏世界 {getSortIcon('parallelWorld')}
                </th>}
                {fieldSettings.id && <th onClick={() => handleSort('id')} style={{cursor: 'pointer'}}>
                  道具ID {getSortIcon('id')}
                </th>}
                {fieldSettings.gmCommand && <th>GM命令</th>}
                {fieldSettings.price && <th>兑换价格</th>}
                {fieldSettings.recipes && <th onClick={() => setShowRecipeItemNames(!showRecipeItemNames)} style={{cursor: 'pointer'}} title="合成道具项的材料配方">
                  合成配方
                </th>}
                {fieldSettings.lootBoxes && <th onClick={() => setShowLootBoxItemNames(!showLootBoxItemNames)} style={{cursor: 'pointer'}} title="打开宝箱类道具的掉落效果">
                  宝箱效果
                </th>}
                {/*{fieldSettings.recipes && <th>合成配方</th>}*/}
                {/*{fieldSettings.lootBoxes && <th>宝箱效果</th>}*/}
                <th>操作</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {currentItems.map(([name, info]) => {

            const priceText = (info.price && typeof info.price === 'object') ?
              Object.entries(info.price)
                .filter(([ctype, price]) => ctype && (typeof price === 'number' || !isNaN(parseFloat(price))))
                .map(([ctype, price]) => `${ctype}${parseFloat(price).toFixed(1)}`)
                .join(', ') :
              '';

            const isExpanded = expandedRows.has(name);
            const isMobile = window.innerWidth <= 768;

            return (
              <React.Fragment key={name}>
                <tr
                  className={selectedItems.includes(name) ? 'selected' : ''}
                  onClick={(e) => {
                    if (isMobile && !e.target.closest('button, input')) {
                      toggleRowExpansion(name);
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
                      checked={selectedItems.includes(name)}
                      onChange={() => handleSelectItem(name)}
                    />
                  </td>
                  
                  {fieldSettings.icon && <td>
                    {renderIcon(info.icon, name, 38)}
                    {/*{info.icon ? renderIcon(info.icon, name, 38) : '-'}*/}
                  </td>}

                  <td>{name}</td>

                  {isMobile ? (
                    <>
                      <td>{info.category || '未分类'}</td>
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpansion(name);
                          }}
                          className="expand-button"
                        >
                          <span className="arrow-icon">{isExpanded ? '▼' : '▶'}</span>
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      {fieldSettings.description && <td>{info.description}</td>}
                      {fieldSettings.category && <td>{info.category || '未分类'}</td>}
                      {fieldSettings.parallelWorld && <td>{info.parallelWorld || '默认世界'}</td>}
                      {fieldSettings.id && <td>{info.id}</td>}
                      {fieldSettings.gmCommand && <td>{info.gmCommand || '-'}</td>}
                      {fieldSettings.price && <td>{priceText}</td>}
                      {fieldSettings.recipes && <td>
                        {info.recipes && info.recipes.length > 0 ? (
                          <div className="recipe-display">
                            {info.recipes.map((recipe, recipeIndex) => (
                              <div key={recipeIndex} className="recipe-item-mini">
                                <span className="recipe-label">配方{recipeIndex + 1}:</span>
                                {recipe.map((item, itemIndex) => (
                                  <span key={itemIndex} className="recipe-component" style={{textAlign: 'center',alignItems: 'center',fontSize:'10px'}} title={ item.itemName + '×'+ item.count}>
                                    {renderIcon(items[item.itemName]?.icon,item.itemName)}
                                    {showRecipeItemNames && <br />}
                                    {showRecipeItemNames && item.itemName}×{item.count}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>}
                      {fieldSettings.lootBoxes && <td>
                        {info.lootBoxes && info.lootBoxes.length > 0 ? (
                          <div className="loot-box-display">
                            {info.lootBoxes.map((lootBox, lootBoxIndex) => (
                              <div key={lootBoxIndex} className="loot-box-item-mini">
                                <span className="loot-box-label">效果{lootBoxIndex + 1}:</span>
                                {lootBox.map((item, itemIndex) => (
                                  <span key={itemIndex} className="loot-box-component" title={ item.itemName + '×' + item.count + '('+ Math.round(parseFloat(item.dropRate) *10000)/100 + '%)'}>
                                    {renderIcon(items[item.itemName]?.icon, item.itemName)}
                                    {showLootBoxItemNames && <br />}
                                    {showLootBoxItemNames && item.itemName}
                                    <br />
                                    ×{item.count} ({Math.round(parseFloat(item.dropRate) *10000)/100}%)
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>}
                      <td className="items-operations">
                        <button onClick={() => {
                          setEditingItem(name);
                          setFormData({
                            name: name,
                            id: info.id,
                            description: info.description,
                            category: info.category || '未分类',
                            price: {...info.price},
                            icon: info.icon || '',
                            parallelWorld: info.parallelWorld || '默认世界',
                            recipes: info.recipes || [],
                            gmCommand: info.gmCommand || '',
                            lootBoxes: info.lootBoxes || [],
                          });
                        }} title="编辑">✎</button>
                        <button onClick={() => handleCopyItem(name)} title="复制">✂</button>
                        <button onClick={() => handleDeleteItem(name)} title="删除">❌</button>
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
                          <span className="detail-value">{info.description || '-'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">游戏世界:</span>
                          <span className="detail-value">{info.parallelWorld || '默认世界'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">道具ID:</span>
                          <span className="detail-value">{info.id || '-'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">GM命令:</span>
                          <span className="detail-value">{info.gmCommand || '-'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">兑换价格:</span>
                          <span className="detail-value">{priceText || '-'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">合成配方:</span>
                          <span className="detail-value">
                            {info.recipes && info.recipes.length > 0 ? (
                              <div className="recipe-display-mobile">
                                {info.recipes.map((recipe, recipeIndex) => (
                                  <div key={recipeIndex} className="recipe-item-mini">
                                    <span className="recipe-label">配方{recipeIndex + 1}:</span>
                                    {recipe.map((item, itemIndex) => (
                                      <span key={itemIndex} className="recipe-component">
                                        {item.itemName}×{item.count}
                                      </span>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span>-</span>
                            )}
                          </span>
                        </div>

                        <div className="detail-row">
                          <span className="detail-label">宝箱效果:</span>
                          <span className="detail-value">
                            {info.lootBoxes && info.lootBoxes.length > 0 ? (
                              <div className="loot-box-display-mobile">
                                {info.lootBoxes.map((lootBox, lootBoxIndex) => (
                                  <div key={lootBoxIndex} className="loot-box-item-mini">
                                    <span className="loot-box-label">效果{lootBoxIndex + 1}:</span>
                                    {lootBox.map((item, itemIndex) => (
                                      <span key={itemIndex} className="loot-box-component">
                                        {item.itemName}×{item.count}({(item.dropRate * 100).toFixed(3)}%)
                                      </span>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span>-</span>
                            )}
                          </span>
                        </div>


                        <div className="action-buttons">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(name);
                              setFormData({
                                name: name,
                                id: info.id,
                                description: info.description,
                                category: info.category || '未分类',
                                price: {...info.price},
                                icon: info.icon || '',
                                parallelWorld: info.parallelWorld || '默认世界',
                                recipes: info.recipes || [],
                                gmCommand: info.gmCommand || '',
                                lootBoxes: info.lootBoxes || [],
                              });
                            }}
                          >
                            编辑
                          </button>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(name);
                          }}
                          >
                            删除
                          </button>
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
          value={itemsPerPage}
          onChange={(e) => {
            const newItemsPerPage = Number(e.target.value);
            setItemsPerPage(newItemsPerPage);
            // 保存到 localStorage
            // localStorage.setItem('itemsPerPage', newItemsPerPage.toString());
            userDataManager.setUserData('itemsPerPage', newItemsPerPage.toString());

            setCurrentPage(1); // 重置到第一页
            setInputPage(1); // 同步更新输入框的值
          }}
          className="items-per-page-select"
        >
          <option value="5">5/页</option>
          <option value="10">10/页</option>
          <option value="20">20/页</option>
          <option value="50">50/页</option>
        </select>
      </div>

      {/*// 道具编辑弹窗*/}
      {(showAddForm || editingItem) && (
        <div className="item-form-modal">
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '20px'}}>
            <h4>{editingItem ? `编辑道具 - ${editingItem}` : '新增道具'}</h4>
          </div>

          <div className="form-layout-vertical">
            {!editingItem && (
              <div className="form-row">
                <label>道具名称：</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            )}

            <div className="form-row">
              <div className="icon-preview" style={{ margin: '10px 0', minHeight: '32px' }}>
                <label>图标:</label>
                {formData.icon && renderIcon(formData.icon, formData.name || 'Preview', 32)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({...formData, icon: e.target.value})}
                  placeholder="图片URL"
                  style={{ flex: 1,width: '330px' }}

                />
                <a
                  title="在线图标库"
                  href="https://icon-sets.iconify.design/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    color: '#007bff',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🌐
                </a>
              </div>
            </div>

            <div>
                {/* 手动转换图标按钮（仅在非自动转换模式下显示） */}
                {formData.icon && formData.icon.startsWith('http') && formData.icon.toLowerCase().endsWith('.png') && (
                  <div style={{ margin: '5px 0' }}>
                    <button
                      onClick={handleManualConvertIcon}
                      style={{ fontSize: '12px', padding: '2px 8px' }}
                      title="将png图片下载并转为本地Base64URL图标"
                    >
                      转Base64URL
                    </button>
                  </div>
                )}
            </div>


            <div className="form-row">
              <label>道具描述：</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="form-row">
              <label>道具类别：</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* 游戏世界字段 */}
            <div className="form-row">
              <label>游戏世界：</label>
              <select
                value={formData.parallelWorld}
                onChange={(e) => setFormData({...formData, parallelWorld: e.target.value})}
              >
                {worlds.map(world => (
                  <option key={world} value={world}>{world}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <label>道具ID：</label>
              <input
                type="number"
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
              />
            </div>

            <div className="form-row">
              <label>GM命令：</label>
              <div style={{ display: 'flex', }}>
                <input
                  type="text"
                  value={formData.gmCommand}
                  onChange={(e) => setFormData({...formData, gmCommand: e.target.value})}
                  placeholder="点击编辑按钮配置GM命令"
                  style={{ flex: 1,width:"350px" }}
                />
                <button
                  onClick={() => {
                    // 初始化模板数据 (根据新的数据结构)
                    const gmCommands = settings.gmCommands || {};
                    const templates = [];

                    // 将配置中的GM命令转换为模板数组 (新结构)
                    // 只显示当前道具对应游戏世界的命令模板
                    Object.entries(gmCommands).forEach(([id, commandData]) => {
                      if (commandData.gmCommand && commandData.gameWorld === formData.parallelWorld) {
                        templates.push({
                          world: commandData.gameWorld || '',
                          command: commandData.gmCommand,
                          description: commandData.description || ''
                        });
                      }
                    });

                    setGmCommandTemplates(templates);
                    setShowGmCommandModal(true);
                  }}
                  style={{ fontSize: '12px', padding: '2px 8px' }}
                >
                  编辑
                </button>
                <button
                  onClick={() => {
                    setFormData({...formData, gmCommand: ''});
                  }}
                  style={{ fontSize: '12px', padding: '2px 8px' }}
                >
                  清空
                </button>
              </div>
            </div>

            <div style={{ margin: '10px 0' }}>
              <div className="form-row">
                <label>积分定价：</label>
                <select onChange={(e) => addPriceField(e.target.value)}>
                  <option value="">选择兑换所需积分类型</option>
                  {(enableAllCreditsPricing
                    ? creditTypes
                    : creditTypes.slice(-2)
                  ).filter(type => !(type in formData.price))
                    .map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))
                  }

                </select>
              </div>
              {Object.entries(formData.price).map(([ctype, price]) => (
                <div key={ctype} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  <label style={{ minWidth: '100px' }}>{ctype}：</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => updatePrice(ctype, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => {
                      const newPrice = { ...formData.price };
                      delete newPrice[ctype];
                      setFormData({ ...formData, price: newPrice });
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      padding: '0',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    title="删除此积分类型"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* 合成配方设置 */}
            <div className="form-row-vertical">
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>合成配方</h4>
                <button
                  onClick={() => {
                    setRecipeFormData({
                      items: [],
                      currentItem: '',
                      itemCount: 1
                    });
                    setEditingRecipeIndex(null);
                    setShowRecipeModal(true);
                  }}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  新增配方
                </button>
              </div>

              {formData.recipes && formData.recipes.length > 0 ? (
                <div className="recipe-list">
                  {formData.recipes.map((recipe, recipeIndex) => (
                    <div key={recipeIndex} className="recipe-card">
                      <div className="recipe-header">
                        <strong>配方 {recipeIndex + 1}</strong>
                        <div>
                          <button
                            onClick={() => editRecipe(recipeIndex)}
                            className="recipe-edit-btn"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => removeRecipe(recipeIndex)}
                            className="recipe-delete-btn"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <div className="recipe-components">
                        {recipe.map((item, itemIndex) => (
                          <span key={itemIndex} className="recipe-component-tag" style={{fontSize: '10px', backgroundColor: 'transparent', color:'black'}}>
                            {renderIcon(items[item.itemName].icon, item.itemName, 36)}
                            <br />
                            {item.itemName} ×{item.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-recipes">暂无配方</p>
              )}
            </div>

            {formData.category === '宝箱类' && (
              <div className="form-row-vertical">
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>宝箱效果</h4>
                <button
                  onClick={() => {
                    setLootBoxFormData({
                      items: [],
                      currentItem: '',
                      itemCount: 1,
                      dropRate: 0.01
                    });
                    setEditingLootBoxIndex(null);
                    setShowLootBoxModal(true);
                  }}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  新增开箱效果
                </button>
              </div>

              {formData.lootBoxes && formData.lootBoxes.length > 0 ? (
                <div className="loot-box-list">
                  {formData.lootBoxes.map((lootBox, lootBoxIndex) => (
                    <div key={lootBoxIndex} className="loot-box-card">
                      <div className="loot-box-header">
                        <strong>开箱效果 {lootBoxIndex + 1}</strong>
                        <div>
                          <button
                            onClick={() => editLootBox(lootBoxIndex)}
                            className="loot-box-edit-btn"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => removeLootBox(lootBoxIndex)}
                            className="loot-box-delete-btn"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <div className="loot-box-components">
                        {lootBox.map((item, itemIndex) => (
                          <span key={itemIndex} className="loot-box-component-tag" style={{fontSize: '10px',backgroundColor: 'transparent', color:'black'}}>
                            {renderIcon(items[item.itemName].icon, item.itemName, 36)}
                            <br />
                            {item.itemName}
                            <br  />
                            ×{item.count} ({(item.dropRate * 100).toFixed(3)}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-loot-boxes">暂无开箱效果</p>
              )}
            </div>
            )}

          </div>
          <div className="form-layout">
            <div style={{ paddingBottom: '30px' }}>
              <button onClick={editingItem ? handleUpdateItem : handleAddItem}>
                确认
              </button>
              <button onClick={() => {
                setShowAddForm(false);
                setEditingItem(null);
              }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}


      {/* GM 命令编辑模态框 */}
      {showGmCommandModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '600px' }}>
            <h4>GM命令配置</h4>

            {gmCommandTemplates.length > 0 ? (
              <>
                <div className="form-group">
                  <label>选择命令模板：</label>
                  <select
                    value={selectedTemplate?.command || ''}
                    onChange={(e) => {
                      const template = gmCommandTemplates.find(t => t.command === e.target.value);
                      setSelectedTemplate(template);
                      if (template) {
                        // 提取变量
                        const variables = extractVariables(template.command);
                        const initialVariables = {};
                        variables.forEach(variable => {
                          // 设置默认值
                          if (variable === 'itemId' || variable === 'item') {
                            initialVariables[variable] = formData.id || '';
                          } else if (variable === 'count') {
                            initialVariables[variable] = '1';
                          } else {
                            initialVariables[variable] = '';
                          }
                        });
                        setGmVariables(initialVariables);
                      }
                    }}
                    className="form-control"
                  >
                    <option value="">请选择模板</option>
                    {gmCommandTemplates.map((template, index) => (
                      <option key={index} value={template.command}>
                        {template.description ? `${template.description.substring(0, 10)} - ` : ''}{template.command}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTemplate && Object.keys(gmVariables).length > 0 && (
                  <div className="form-group">
                    <h5>变量配置：</h5>
                    {Object.keys(gmVariables).map((variable) => (
                      <div key={variable} className="form-group" style={{ marginBottom: '10px' }}>
                        <label>{variable}:</label>
                        <input
                          type="text"
                          value={gmVariables[variable]}
                          onChange={(e) => {
                            setGmVariables(prev => ({
                              ...prev,
                              [variable]: e.target.value
                            }));
                          }}
                          className="form-control"
                          placeholder={`请输入${variable}的值`}
                        />
                      </div>
                    ))}

                    <div className="form-group">
                      <label>预览:</label>
                      <div className="preview-box" style={{
                        padding: '10px',
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        minHeight: '20px',
                        wordBreak: 'break-all'
                      }}>
                        {generateCommandFromTemplate(selectedTemplate.command, gmVariables)}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p>暂无可用的GM命令模板，请先在设置中配置GM命令</p>
            )}

            <div className="modal-actions" style={{ marginTop: '20px',gap: '10px' }}>
              <button
                onClick={() => {
                  if (selectedTemplate) {
                    const generatedCommand = generateCommandFromTemplate(selectedTemplate.command, gmVariables);
                    setFormData(prev => ({...prev, gmCommand: generatedCommand}));
                  }
                  setShowGmCommandModal(false);
                  setSelectedTemplate(null);
                  setGmVariables({});
                }}
                className="btn btn-success"
                disabled={!selectedTemplate}
              >
                确认添加
              </button>
              <button
                onClick={() => {
                  setShowGmCommandModal(false);
                  setSelectedTemplate(null);
                  setGmVariables({});
                }}
                className="btn btn-secondary"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 合成配方模态框 */}
      {showRecipeModal && (
        <div className="modal-overlay">
          <div className="modal-content recipe-modal" style={{ width: '75%' }}>
            <h4>{editingRecipeIndex !== null ? `编辑配方 ${editingRecipeIndex + 1}` : '添加合成配方'}</h4>

            <div className="form-group" style={{ display: 'flex', flextDirection: 'row'}}>
              <label style={{display:'flex', alignItems:'center', width: '10%'}}>道具：</label>
              <div className="item-search-wrapper" style={{ display: 'flex', flextDirection: 'row', width: '100%'}}>
                <div style={{ position: 'relative',display: 'flex', flextDirection: 'row', width: '100%'  }}>
                  <input
                    type="text"
                    value={recipeFormData.currentItem || itemSearch}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="搜索道具..."
                    className="form-control"
                  />
                  {showDropdown && (
                    <div
                        className="recipe-item-dropdown"
                        style={{
                          maxHeight: '200px',
                          overflowY: 'auto',
                          textAlign: 'left',
                        }}
                    >
                      {filteredItems.map(itemName => (
                        <div
                          key={itemName}
                          onClick={() => selectItem(itemName)}
                          className="dropdown-item"
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#f5f5f5';
                            e.target.style.color = '#333';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '';
                            e.target.style.color = '';
                          }}
                        >
                          {renderIcon(items[itemName].icon, itemName, 24)} {itemName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', flextDirection: 'row',width: '100%'}}>
                <label style={{display:'flex', alignItems:'center', width: '10%'}}>数量：</label>
                <div className="recipe-item-input" style={{ display: 'flex', flextDirection: 'row', width: '100%'}}>
                  <input
                    type="number"
                    min="1"
                    value={recipeFormData.itemCount}
                    onChange={(e) => setRecipeFormData({...recipeFormData, itemCount: e.target.value})}
                    className="form-control"

                  />
                </div>
              </div>

              <button
                onClick={handleAddRecipeItem}
                className="btn btn-primary"
              >
                添加
              </button>

              <button
                onClick={resetRecipeForm}
                className="btn btn-primary"
              >
                重置
              </button>
            </div>

            {/* 显示已添加的道具 */}
            <div className="form-group">
              <h5>配方中的道具:</h5>
              {recipeFormData.items.length > 0 ? (
                <div className="recipe-items-list">
                  {recipeFormData.items.map((item, index) => (
                    <div key={index} className="recipe-item-row">
                      <div style={{display: 'flex', flexDirection:'column', alignItems:'center'}}>
                        <div style={{display: 'flex', alignItems:'center', flex:1}}>
                          <span
                              title={`${item.itemName} × ${item.count}`}
                              style={{
                                height: '20%',
                                padding: '0 1px',
                                // backgroundColor: '#027cff',
                                // display: 'block',
                                // width: '100%',
                              }}
                          >
                            {renderIcon(items[item.itemName].icon, item.itemName, 36)}
                          </span>

                          <div>
                            <button
                              onClick={() => fillRecipeFormWithItem(item)}
                              className="btn btn-secondary btn-sm"
                              title="填充到表单"
                              style={{
                                height: '30%',
                                padding: '0 1px',
                                marginBottom: '1px',
                                // color: 'black',
                                backgroundColor: '#027cff',
                                display: 'block',
                                width: '100%',
                              }}
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeRecipeItem(index)}
                              className="btn btn-danger btn-sm"
                              style={{
                                height: '30%',
                                padding: '0 1px',
                                // color: 'black',
                                backgroundColor: '#dc3545',
                                display: 'block',
                                width: '100%',
                              }}
                            >
                              -
                            </button>
                          </div>
                        </div>

                        <div style={{ marginRight: '15px', marginBottom:'15px', fontSize: '10px'}}>
                          {`${item.itemName} ×${item.count}`}
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-items">暂无道具</p>
              )}
            </div>

            <div>
              <button onClick={handleSaveRecipe} className="btn btn-success">
                添加配方
              </button>
              <button
                onClick={() => {
                  setShowRecipeModal(false);
                  setRecipeFormData({
                    items: [],
                    currentItem: '',
                    itemCount: 1
                  });
                  setEditingRecipeIndex(null);
                  setItemSearch('');
                }}
                className="btn btn-secondary"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 宝箱效果模态框 */}
      {showLootBoxModal && (
        <div className="modal-overlay">
          <div className="modal-content loot-box-modal" style={{ width: '75%' }}>
            <h4>{editingLootBoxIndex !== null ? `编辑开箱效果 ${editingLootBoxIndex + 1}` : '添加开箱效果'}</h4>

            <div className="form-group" style={{ display: 'flex', flextDirection: 'row'}}>
              <label style={{display:'flex', alignItems:'center', width: '10%'}}>道具：</label>
              <div className="item-search-wrapper" style={{ display: 'flex', flextDirection: 'row', width: '90%'}}>
                <div style={{ position: 'relative',display: 'flex', flextDirection: 'row', width: '100%'  }}>
                  <input
                    type="text"
                    value={lootBoxFormData.currentItem || lootBoxSearch}
                    onChange={handleLootBoxInputChange}
                    onFocus={handleLootBoxInputFocus}
                    onBlur={handleLootBoxInputBlur}
                    placeholder="搜索道具..."
                    className="form-control"
                  />
                  {showLootBoxDropdown && (
                    <div
                      className="loot-box-item-dropdown"
                      style={{
                        textAlign: 'left',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        alignText: 'left',
                      }}
                    >
                      {filteredLootBoxItems.map(itemName => (
                        <div
                          key={itemName}
                          onClick={() => selectLootBoxItem(itemName)}
                          className="dropdown-item"
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#f5f5f5';
                            e.target.style.color = '#333';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '';
                            e.target.style.color = '';
                          }}
                        >
                          {renderIcon(items[itemName].icon, itemName, 36)} {itemName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', flextDirection: 'row'}}>
              <label style={{display:'flex', alignItems:'center', width: '10%'}}>数量：</label>
              <div className="loot-box-item-input" style={{ display: 'flex', flextDirection: 'row', width: '90%'}}>
                <input
                  type="number"
                  min="1"
                  value={lootBoxFormData.itemCount}
                  onChange={(e) => setLootBoxFormData({...lootBoxFormData, itemCount: e.target.value})}
                  className="form-control"
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', flextDirection: 'row'}}>
                <label title="取值0-1" style={{display:'flex', alignItems:'center', width: '10%'}}>爆率：</label>
                <div style={{ display: 'flex', flextDirection: 'row', width: '90%'}}>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={lootBoxFormData.dropRate}
                    onChange={(e) => setLootBoxFormData({...lootBoxFormData, dropRate: e.target.value})}
                    className="form-control"
                  />
                  <span style={{display:'flex', alignItems:'center'}}>({(lootBoxFormData.dropRate * 100).toFixed(3)}%)</span>
                </div>

              </div>

              <button
                onClick={handleAddLootBoxItem}
                className="btn btn-primary"
              >
                添加
              </button>
              <button
                onClick={resetLootBoxForm}
                className="btn btn-primary"
              >
                重置
              </button>

            </div>

            {/* 显示已添加的道具 */}
            <div className="form-group">
              <h5>开箱道具列表:</h5>
              {lootBoxFormData.items.length > 0 ? (
                <div>
                  <div className="loot-box-items-list">
                    {lootBoxFormData.items.map((item, index) => (
                      <div key={index} className="loot-box-item-row">
                        <div style={{display: 'flex', flexDirection:'column', alignItems:'center'}}>
                          <div style={{display: 'flex', alignItems:'center', flex:1}}>
                            <span
                                title={`${item.itemName} × ${item.count}`}
                                style={{
                                  height: '20%',
                                  padding: '0 1px',
                                  // backgroundColor: '#027cff',
                                  // display: 'block',
                                  // width: '100%',
                                }}
                            >
                              {renderIcon(items[item.itemName].icon, item.itemName, 36)}
                            </span>
                            <div>
                              <button
                                onClick={() => fillLootBoxFormWithItem(item)}
                                className="btn btn-secondary btn-sm"
                                title="填充到表单"
                                style={{
                                  height: '30%',
                                  padding: '0 1px',
                                  marginBottom: '1px',
                                  // color: 'black',
                                  backgroundColor: '#027cff',
                                  display: 'block',
                                  width: '100%',
                                }}
                              >
                                +
                              </button>
                              <button
                                onClick={() => removeLootBoxItem(index)}
                                className="btn btn-danger btn-sm"
                                style={{
                                  height: '30%',
                                  padding: '0 1px',
                                  // color: 'black',
                                  backgroundColor: '#dc3545',
                                  display: 'block',
                                  width: '100%',
                                }}
                              >
                                -
                              </button>
                            </div>




                          </div>

                          <div style={{marginRight:'15px', marginBottom:'15px',fontSize:'10px'}}>
                            {item.itemName}
                            <br />
                            ×{item.count} ({(item.dropRate * 100).toFixed(3)}%)
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="total-rate" style={{fontSize:'12px'}}>
                    总爆率: {(lootBoxFormData.items.reduce((sum, item) => sum + parseFloat(item.dropRate || 0), 0) * 100).toFixed(3)}%
                  </div>
                </div>
              ) : (
                <p className="no-items">暂无道具</p>
              )}
            </div>

            <div>
              <button onClick={handleSaveLootBox} className="btn btn-success">
                添加开箱效果
              </button>
              <button
                onClick={() => {
                  setShowLootBoxModal(false);
                  setLootBoxFormData({
                    items: [],
                    currentItem: '',
                    itemCount: 1,
                    dropRate: 0.01
                  });
                  setEditingLootBoxIndex(null);
                  setLootBoxSearch('');
                }}
                className="btn btn-secondary"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ItemManageTab;
