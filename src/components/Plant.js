// src/components/Plant.js
import React, { useState, useMemo, useEffect } from 'react';
import CONFIG from '../config';
import {useLogs} from "../contexts/LogContext";

const Plant = ({
  items,
  backpack,
  onCraftItem,
  onShowStatus,
  categories = ["经验类", "属性类", "消耗类", "装备类", "材料类", "任务类", "未分类"],
  // hideTopNav,
  hideTopControls,
  parallelWorldsOptions
}) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('全部');
  const [craftCount, setCraftCount] = useState(1);

  const { addLog } = useLogs();

  useEffect(() => {
    if (selectedItem) {
      const maxCount = calculateMaxCraftCount(items[selectedItem.itemName].recipes[selectedItem.recipeIndex]);
      // 如果当前数量超过了新的最大数量，则调整为最大数量
      if (craftCount > maxCount) {
        setCraftCount(maxCount > 0 ? maxCount : 1);
      }
    }
  }, [backpack, selectedItem, craftCount, items]);

  // 在组件内部添加键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 检查是否按下了ESC键并且有选中的道具
      if (e.key === 'Escape' && selectedItem) {
        setSelectedItem(null);
        setCraftCount(1); // 重置数量
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
  }, [selectedItem]); // 依赖 selectedItem 状态


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
  const [filterParallelWorld, setFilterParallelWorld] = useState('全部');

  // 获取所有游戏世界选项
  const allParallelWorlds = useMemo(() => {
    // 从 parallelWorldsOptions 中提取 worlds，并添加"全部"选项
    const worlds = ['全部', ...(parallelWorldsOptions?.worlds || [])];
    return worlds;
  }, [parallelWorldsOptions]);

  // 修改排序和筛选后的道具列表逻辑
  const filteredAndSortedItems = useMemo(() => {
    let result = [];

    // 展开每个道具的配方为单独的条目
    Object.entries(items).forEach(([name, item]) => {
      if (item.recipes && item.recipes.length > 0) {
        // 为每个配方创建一个条目
        item.recipes.forEach((recipe, recipeIndex) => {
          result.push({
            itemName: name,
            itemData: item,
            recipe: recipe,
            recipeIndex: recipeIndex
          });
        });
      }
    });

    // 类别筛选
    if (filterCategory !== '全部') {
      result = result.filter(({ itemData }) =>
        (itemData.category || '未分类') === filterCategory
      );
    }

    // 游戏世界筛选
    if (filterParallelWorld !== '全部') {
      result = result.filter(([name]) => {
        const item = items[name];
        const parallelWorld = item?.parallelWorld || '默认世界';
        return parallelWorld === filterParallelWorld;
      });
    }

    // 排序
    result.sort((a, b) => {
      const itemA = a.itemData;
      const itemB = b.itemData;
      const nameA = a.itemName;
      const nameB = b.itemName;

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

  // 修改检查材料函数，接受具体的配方而不是整个配方数组
  const checkPlayerHasMaterials = (recipe) => {
    // 检查单个配方的材料
    return true; // 暂时保持原逻辑
  };

  // 修改合成处理函数，传递配方索引
  const handleCraft = async (recipeIndex = 0, count = 1) => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/items/craft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: selectedItem.itemName,
          recipe_index: recipeIndex,
          count: count
        })
      });

      const result = await response.json();

      if (response.ok) {
        onShowStatus(result.message);
        onCraftItem(); // 这个函数应该触发重新获取背包数据
        setSelectedItem(null);
        setCraftCount(1);
        alert(result.message)
        addLog('工坊','合成道具', result.message);
      } else {
        alert(result.error);
        addLog('工坊','合成失败', result.error);
      }
    } catch (error) {
      alert('网络错误');
    }
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

  // 获取排序图标
  const getSortIcon = (field) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
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

  const calculateMaxCraftCount = (recipe) => {
    // 这里需要访问玩家背包数据来计算
    // 示例逻辑：
   if (!backpack || !recipe) return 0;

    let maxCount = Infinity;

    for (const item of recipe) {
      const requiredItem = item.itemName;
      const requiredPerCraft = item.count;
      const ownedCount = backpack[requiredItem] || 0;
      const possibleCrafts = Math.floor(ownedCount / requiredPerCraft);
      maxCount = Math.min(maxCount, possibleCrafts);
    }

    return maxCount === Infinity ? 0 : maxCount;
  };


  return (
    <div className="plant-tab">
      {/* 筛选和排序控件 */}
      <div className="plant-controls" style={{ display: hideTopControls ? 'none' : 'flex' , flexDirection: 'row', justifyContent: 'space-between'}}>
        <div style={{ display: 'flex', flexDirection: 'row'}}>
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
            </select>
            {/* 添加正逆序切换按钮 */}
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="sort-toggle-btn"
              title={`当前为${sortDirection === 'asc' ? '正序' : '逆序'}，点击切换`}
            >
              {sortDirection === 'asc' ? '↑ ' : '↓ '}
            </button>

          </div>
        </div>
        <div className="other-control">
          <button onClick={onCraftItem} title="刷新">⟳</button>
        </div>


      </div>

      {/* 网格模式显示道具 */}
      <div className="item-grid">
        {filteredAndSortedItems.map(({ itemName, itemData, recipe, recipeIndex }) => {
          const canCraft = checkPlayerHasMaterials(recipe);

          return (
            <div
              key={`${itemName}-${recipeIndex}`}
              className={`item-card ${!canCraft ? 'disabled' : ''}`}
              onClick={() => canCraft && setSelectedItem({itemName, recipeIndex})}
              title={itemData.description || '暂无描述'}
            >
              <div className="item-icon">
                {renderItemIcon(itemData, itemName)}
              </div>
              <div className="item-name">{itemName}</div>
              <div className="item-category">{itemData.category || '其它类'}</div>

              {/* 显示配方索引 */}
              <div className="recipe-index">
                配方 {recipeIndex + 1}
              </div>

              {/* 显示配方材料 */}
              <div className="item-recipes">
                <div className="recipe-group">
                  <div className="recipe-items">
                    {recipe.map((item, itemIndex) => (
                      <span key={itemIndex} className="recipe-item-tag">
                        {item.itemName}×{item.count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>


            </div>
          );
        })}
      </div>

      {selectedItem && (
        <div className="craft-modal">
          <h4>合成 {selectedItem.itemName}</h4>
          <p>道具名称: {selectedItem.itemName}</p>
          <p>配方编号: {selectedItem.recipeIndex + 1}</p>

          <div className="recipe-details">
            <h5>所需材料:</h5>
            <div className="recipe-group">
              <div className="recipe-items">
                {items[selectedItem.itemName].recipes[selectedItem.recipeIndex].map((item, itemIndex) => {
                  const ownedCount = backpack[item.itemName] || 0;
                  const requiredCount = item.count * craftCount;
                  const isSufficient = ownedCount >= requiredCount;

                  return (
                    <div key={itemIndex} className="recipe-item-with-inventory">
                      <span className="recipe-item-tag">
                        {item.itemName}×{requiredCount}
                      </span>
                      <span className={`inventory-count ${isSufficient ? 'sufficient' : 'insufficient'}`}>
                        (拥有: {ownedCount})
                      </span>
                    </div>
                  );
                })}
              </div>
              {/*<div className="recipe-items">*/}
              {/*  {items[selectedItem.itemName].recipes[selectedItem.recipeIndex].map((item, itemIndex) => (*/}
              {/*    <span key={itemIndex} className="recipe-item-tag">*/}
              {/*      {item.itemName}×{item.count}*/}
              {/*    </span>*/}
              {/*  ))}*/}
              {/*</div>*/}
            </div>
          </div>



          <div className="craft-quantity">
            <label>合成数量:</label>
            <div className="quantity-controls">
              <button
                onClick={() => setCraftCount(Math.max(1, craftCount - 1))}
                disabled={craftCount <= 1}
              >
                -
              </button>
              <div className="quantity-input-wrapper">
                <button
                  className="min-count-button"
                  onClick={() => {
                    const maxCount = calculateMaxCraftCount(items[selectedItem.itemName].recipes[selectedItem.recipeIndex]);
                    const minCount = maxCount >= 1 ? 1 : 0;
                    setCraftCount(minCount);
                  }}
                  title="填入最小合成数量"
                >
                  <img
                    src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik05IDkuODZMNS45NjggMTJMOSAxNC4xNHptMS45MDkgNy40NjNhLjUuNSAwIDAgMS0uNjk3LjEybC03LjEzMy01LjAzNWEuNS41IDAgMCAxIDAtLjgxNmw3LjEzMy01LjAzNmEuNS41IDAgMCAxIC43ODguNDA5djEwLjA3YS41LjUgMCAwIDEtLjA5MS4yODhNMTggMTQuMTRWOS44NkwxNC45NjggMTJ6bS01LjkyMS0xLjczMmEuNS41IDAgMCAxIDAtLjgxNmw3LjEzMy01LjAzNmEuNS41IDAgMCAxIC43ODguNDA5djEwLjA3YS41LjUgMCAwIDEtLjc4OC40MDl6Ii8+PC9zdmc+"
                    alt="最小数量"
                    className="min-count-icon"
                  />
                </button>

                <input
                  type="number"
                  min="1"
                  max={calculateMaxCraftCount(items[selectedItem.itemName].recipes[selectedItem.recipeIndex])}
                  value={craftCount}
                  onChange={(e) => setCraftCount(Math.max(1, parseInt(e.target.value) || 1))}
                />

                <button
                  className="max-count-button"
                  onClick={() => {
                    const maxCount = calculateMaxCraftCount(items[selectedItem.itemName].recipes[selectedItem.recipeIndex]);
                    setCraftCount(maxCount);
                  }}
                  title="填入最大合成数量"
                >
                  <img
                    src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik05LjAzMiAxMkw2IDkuODZ2NC4yOHptLTQuMjQ0IDUuNDQzQS41LjUgMCAwIDEgNCAxNy4wMzVWNi45NjVhLjUuNSAwIDAgMSAuNzg4LS40MDlsNy4xMzMgNS4wMzVhLjUuNSAwIDAgMSAwIC44MTd6TTE1IDE0LjE0TDE4LjAzMiAxMkwxNSA5Ljg2em0tMi03LjE3NWEuNS41IDAgMCAxIC43ODgtLjQwOWw3LjEzMyA1LjAzNWEuNS41IDAgMCAxIDAgLjgxN2wtNy4xMzMgNS4wMzVhLjUuNSAwIDAgMS0uNzg4LS40MDh6Ii8+PC9zdmc+"
                    alt="最大数量"
                    className="max-count-icon"
                  />
                </button>

              </div>
              <button
                onClick={() => setCraftCount(craftCount + 1)}
                disabled={craftCount >= calculateMaxCraftCount(items[selectedItem.itemName].recipes[selectedItem.recipeIndex])}
              >
                +
              </button>
            </div>
          </div>



          <div style={{ justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button onClick={() => handleCraft(selectedItem.recipeIndex, craftCount)}>确认合成</button>
            <button onClick={() => {
              setSelectedItem(null);
              setCraftCount(1); // 重置数量
            }}>取消</button>
          </div>
        </div>
      )}



    </div>
  );
};

export default Plant;
