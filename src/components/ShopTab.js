// src/components/ShopTab.js
import React, { useState, useMemo, useEffect } from 'react';
import CONFIG from '../config';
import { Link } from 'react-router-dom';
// import ItemManageTab from './ItemManageTab';
import {useLogs} from "../contexts/LogContext";

const ShopTab = ({
   items,
   credits,
   backpack,
   onBuyItem,
   onShowStatus,
   creditTypes,
   categories = ["经验类", "属性类", "消耗类", "装备类", "材料类", "任务类", "未分类"],
   parallelWorldsOptions,
   hideTopControls
}) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [buyCount, setBuyCount] = useState(1);
  const [sortField, setSortField] = useState('name'); // 排序字段
  const [sortDirection, setSortDirection] = useState('asc'); // 排序方向
  const [filterCategory, setFilterCategory] = useState('全部'); // 类别筛选
  // 从 localStorage 获取上次访问的页面状态，如果没有则默认为商店页面
  const [showItemManagement, setShowItemManagement] = useState(() => {
    const savedPage = localStorage.getItem('lastVisitedShopPage');
    return savedPage === 'itemManagement';
  });
  const { addLog } = useLogs();
  const [filterParallelWorld, setFilterParallelWorld] = useState('全部');

  // 当页面状态改变时，保存到 localStorage
  useEffect(() => {
    if (showItemManagement) {
      localStorage.setItem('lastVisitedShopPage', 'itemManagement');
    } else {
      localStorage.setItem('lastVisitedShopPage', 'shop');
    }
  }, [showItemManagement]);
  // 在组件函数内部添加以下useEffect
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 检查是否按下了ESC键且购买弹窗处于打开状态
      if (e.key === 'Escape' && selectedItem) {
        // 关闭购买弹窗
        setSelectedItem(null);
      }
    };

    // 添加键盘事件监听器
    if (selectedItem) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // 清理函数：移除事件监听器
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItem]);

  const allParallelWorlds = useMemo(() => {
    const worlds = ['全部', ...(parallelWorldsOptions?.worlds || [])];
    return worlds;
  }, [parallelWorldsOptions]);


  // 获取所有类别
  const allCategories = useMemo(() => {
    const cats = new Set(['全部', ...categories]);
    Object.values(items).forEach(item => {
      if (item.category && !categories.includes(item.category)) {
        cats.add(item.category);
      }
    });
    return Array.from(cats);
  }, [items, categories]);

  // 排序和筛选后的道具列表
  const filteredAndSortedItems = useMemo(() => {
    let result = Object.entries(items);

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
        case 'price':
          // 按第一个价格排序
          const priceA = Object.values(itemA.price)[0] || 0;
          const priceB = Object.values(itemB.price)[0] || 0;
          valueA = priceA;
          valueB = priceB;
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
  }, [items, sortField, sortDirection, filterCategory,filterParallelWorld]);

  const handleBuy = async () => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/items/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: selectedItem,
          count: parseInt(buyCount)
        })
      });

      const result = await response.json();

      if (response.ok) {
        onShowStatus(result.message);
        onBuyItem();
        setSelectedItem(null);
        addLog('商城','购买道具', result.message)
      } else {
        alert(result.error);
        addLog('商城','购买失败', result.error)
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  const calculateMaxCount = (item) => {
    let maxCount = Infinity;
    for (const [ctype, price] of Object.entries(item.price)) {
      if (price > 0) {
        const currentMax = Math.floor(credits[ctype] / price);
        maxCount = Math.min(maxCount, currentMax);
      }
    }
    return maxCount === Infinity ? '∞' : maxCount;
  };

  // 处理排序字段变化
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };



  // 渲染道具图标
  const renderItemIcon = (item, name) => {
    if (item.icon) {
      if (item.icon.startsWith('http') || item.icon.startsWith('data:image')) {
        // 处理图片URL
        return (
          <img
            src={item.icon}
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        );
      } else {
        // 处理Iconify图标名称，显示首字母作为占位符
        return (
          <div
            className="icon-placeholder"
            title={item.icon}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              backgroundColor: '#f0f0f0',
              borderRadius: '50%',
              fontWeight: 'bold',
              color: '#666',
              fontSize: '24px'
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        );
      }
    } else {
      // 没有图标时显示首字母
      return (
        <div className="item-icon-placeholder">
          {name.charAt(0)}
        </div>
      );
    }
  };

  // 获取道具列表（用于道具管理）
  const fetchItems = async () => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/items`);
      const data = await response.json();
      if (response.ok) {
        // 这里可以根据需要更新父组件的状态
        onBuyItem(); // 触发刷新
      }
    } catch (error) {
      console.error('获取道具列表失败:', error);
    }
  };


  return (
    <div className="shop-tab">
      {/* 筛选和排序控件 */}
      <div className="shop-controls" style={{ display: hideTopControls ? 'none' : 'flex',flexDirection:'row',justifyContent:'space-between' }}>
        <div style={{display:'flex',flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <div className="filter-control">

            <select
              value={filterCategory}
              title="筛选类别"
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              {allCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={filterParallelWorld}
              title="筛选游戏世界"
              onChange={(e) => setFilterParallelWorld(e.target.value)}
            >
              {allParallelWorlds.map(world => (
                <option key={world} value={world}>{world}</option>
              ))}
            </select>
          </div>

          <div className="sort-control">
            <select
              value={sortField}
              title="排序字段"
              onChange={(e) => handleSort(e.target.value)}
            >
              <option value="name">名称</option>
              <option value="category">类别</option>
              <option value="price">价格</option>
            </select>
            {/* 添加正逆序切换按钮 */}
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="sort-toggle-btn"
              title={`当前为${sortDirection === 'asc' ? '正序' : '逆序'}，点击切换`}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        <div className="other-control">
          <button onClick={onBuyItem} title="刷新">⟳</button>
        </div>

      </div>

      {/* 网格模式显示道具 */}
      <div className="item-grid">
        {filteredAndSortedItems.map(([name, info]) => {
          const priceText = Object.entries(info.price)
            .map(([ctype, price]) => `${ctype}${price.toFixed(1)}`)
            .join(', ');

          return (
            <div
              key={name}
              className="item-card"
              onClick={() => setSelectedItem(name)}
              title={info.description || '暂无描述'} // 添加描述信息提示
            >
              <div className="item-icon">
                {renderItemIcon(info, name)}
              </div>
              <div className="item-name">{name}</div>
              <div className="item-category">{info.category || '其它类'}</div>
              <div className="item-price">{priceText}</div>
              <div className="item-stock">已拥有: {backpack[name] || '0'}</div>
              <button className="buy-button">购买</button>
            </div>
          );
        })}
      </div>

      {selectedItem && (
        <div className="buy-modal">
          <h4>购买{selectedItem}</h4>
          <p>道具名称: {selectedItem}</p>
          <p>兑换价格: {
            Object.entries(items[selectedItem].price)
              .map(([ctype, price]) => `${ctype}${price.toFixed(1)}`)
              .join(', ')
          }</p>

          <div>
            <label>数目(1-{calculateMaxCount(items[selectedItem])}):</label>
            <input
              type="number"
              min="1"
              max={calculateMaxCount(items[selectedItem])}
              value={buyCount}
              onChange={(e) => setBuyCount(e.target.value)}
            />
          </div>

          <button onClick={handleBuy}>确认</button>
          <button onClick={() => setSelectedItem(null)}>取消</button>
        </div>
      )}

    </div>
  );
};

export default ShopTab;
