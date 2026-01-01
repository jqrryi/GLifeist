// src/components/BackpackTab.js
import React, {useState, useEffect, useMemo, useRef} from 'react'; // 添加 useMemo 引入
import CONFIG from '../config';
import {useLogs} from "../contexts/LogContext";

const BackpackTab = ({ backpack, items, onUseItem, onShowStatus, hideTopControls, parallelWorldsOptions, categories }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [useCount, setUseCount] = useState(1);
  const [gmCommand, setGmCommand] = useState('');
  const [filterCategory, setFilterCategory] = useState('全部'); // 类别筛选
  const [sortField, setSortField] = useState('name'); // 排序字段
  const [sortDirection, setSortDirection] = useState('asc'); // 排序方向
  const [showLogs, setShowLogs] = useState(false); // 控制日志显示状态
  const [currentPage, setCurrentPage] = useState(1); // 当前页码
  const [logsPerPage, setLogsPerPage] = useState(10); // 每页日志数
  const [inputPage, setInputPage] = useState(currentPage); // 用于页码输入框的状态
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  //使用日志
  const { logs, addLog } = useLogs();
  const backpackLogs = logs.filter(log => {
    const matchesComponent = log.component === '背包';
    return matchesComponent;
  });
  const filterButtonRef = useRef(null);

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = backpackLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(backpackLogs.length / logsPerPage);

  // 分页切换函数
  const paginate = (pageNumber) => {
    // 确保页码在有效范围内
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > totalPages) pageNumber = totalPages;
    setCurrentPage(pageNumber);
    setInputPage(pageNumber); // 同步更新输入框的值
  };

  // 添加判断是否为移动端的函数
  const isMobile = () => {
    return window.innerWidth <= 768;
  };

  // 添加清除搜索函数
  const clearSearch = () => {
    setSearchTerm('');
  };

  // 添加 ESC 键处理函数
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      clearSearch();
      e.target.blur();
    }
  };
  // 获取所有类别
  const allCategories = useMemo(() => {
    const cats = new Set(['全部', ...categories]);
    Object.entries(backpack)
      .filter(([name, count]) => count > 0)
      .forEach(([name]) => {
        const item = items[name];
        const category = item?.category || '未分类';
        cats.add(category);
      });
    return Array.from(cats);
  }, [backpack, items]);

  const [filterParallelWorld, setFilterParallelWorld] = useState('全部');
  // 获取所有游戏世界选项
  const allParallelWorlds = useMemo(() => {
    // 从 parallelWorldsOptions 中提取 worlds，并添加"全部"选项
    const worlds = ['全部', ...(parallelWorldsOptions?.worlds || [])];
    return worlds;
  }, [parallelWorldsOptions]);

  // 筛选和排序后的道具列表
  const filteredAndSortedItems = useMemo(() => {
    let result = Object.entries(backpack).filter(([name, count]) => count > 0);

    // 搜索过滤
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(([name]) => {
        const item = items[name];
        if (!item) return false;

        // 搜索道具名称
        if (name.toLowerCase().includes(lowerSearchTerm)) return true;

        // 搜索道具描述
        if (item.description && item.description.toLowerCase().includes(lowerSearchTerm)) return true;

        // // 搜索合成配方
        // if (item.recipes && item.recipes.some(recipe =>
        //   recipe.some(component =>
        //     component.itemName.toLowerCase().includes(lowerSearchTerm)
        //   )
        // )) return true;
        //
        // // 搜索宝箱效果
        // if (item.lootBoxes && item.lootBoxes.some(lootBox =>
        //   lootBox.some(component =>
        //     component.itemName.toLowerCase().includes(lowerSearchTerm)
        //   )
        // )) return true;

        return false;
      });
    }
    // 类别筛选
    if (filterCategory !== '全部') {
      result = result.filter(([name]) => {
        const item = items[name];
        const category = item?.category || '未分类';
        return category === filterCategory;
      });
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
      const [nameA, countA] = a;
      const [nameB, countB] = b;
      const itemA = items[nameA];
      const itemB = items[nameB];

      let valueA, valueB;

      switch (sortField) {
        case 'name':
          valueA = nameA;
          valueB = nameB;
          break;
        case 'category':
          valueA = itemA?.category || '未分类';
          valueB = itemB?.category || '未分类';
          break;
        case 'count':
          valueA = countA;
          valueB = countB;
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
  }, [backpack, items, filterCategory, filterParallelWorld, sortField, sortDirection, searchTerm]);

  // 添加ESC键退出使用弹窗的功能
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 检查是否按下了ESC键且使用弹窗处于打开状态
      if (e.key === 'Escape' && selectedItem) {
        // 关闭使用弹窗
        setSelectedItem(null);
        return;
      }

      // ESC键也可以关闭日志界面
      if (e.key === 'Escape' && showLogs) {
        setShowLogs(false);
        return;
      }

      // 检查是否按下了 F 键并且没有其他修饰键
      if (e.key === 'f' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
        // 防止在输入框中触发
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          // 聚焦到搜索框
          const searchInput = document.querySelector('.search-control input[type="text"]');
          if (searchInput) {
            searchInput.focus();
          }
        }
      }
    };

    // 添加键盘事件监听器
    document.addEventListener('keydown', handleKeyDown);

    // 清理函数：移除事件监听器
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItem, showLogs]);


  const handleUse = async () => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/backpack/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: selectedItem,
          count: parseInt(useCount)
        })
      });

      const result = await response.json();
      console.log('使用结果:', result)

      // 检查是否是开箱结果
      if (result.reward_items) {
        // 处理开箱结果
        // const rewardMessage = result.reward_items.map(item =>
        //   item.itemName === '__EMPTY__' ? ' ' : `${item.itemName}x${item.count}`
        // ).join(' ');

        onShowStatus(`${result.message}`);
        alert(`${result.message}`);
        addLog('背包', '使用道具', result.message);
        setGmCommand(''); // 开箱没有GM命令
        // 刷新背包数据
        onUseItem();
      } else if (result.description) {
        onShowStatus(`${result.message}`);
        alert(`${result.message}（${result.description}）`);
        addLog('背包', '使用道具', result.message);
        setGmCommand(''); // 没有GM命令
        onUseItem();

      } else if (result.gm_command) {
        // 处理普通道具使用结果
        setGmCommand(result.gm_command);
        onShowStatus(result.message);
        addLog('背包','使用道具',`${result.message} | ${result.gm_command}`);

        // 复制GM命令到剪贴板
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(result.gm_command);
            console.log('GM命令复制到剪贴板: 首选方案')
          } catch (err) {
            console.error('复制到剪贴板失败:', err);
          }
        } else {
          // 降级方案：使用传统的execCommand方法
          try {
            const textArea = document.createElement('textarea');
            textArea.value = result.gm_command;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            console.log('GM命令复制到剪贴板: 降级方案')
          } catch (err) {
            console.error('备用复制方法失败:', err);
          }
        }
        // alert(`${result.message}: \n${result.gm_command}`);
      } else {
        alert(result.error);
        addLog('背包','使用失败',`${result.error} (${selectedItem})`);
      }
    } catch (error) {
      alert('网络错误');
    }
  };

  // 清空日志功能
  // const handleClearLogs = async () => {
  //   try {
  //     const response = await fetch(`${CONFIG.API_BASE_URL}/api/logs/clear`, {
  //       method: 'POST'
  //     });
  //
  //     const result = await response.json();
  //
  //     if (response.ok) {
  //       onShowStatus(result.message);
  //       onUseItem(); // 刷新数据以更新日志
  //     } else {
  //       alert(result.error);
  //     }
  //   } catch (error) {
  //     alert('网络错误');
  //   }
  // };


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
    if (item && item.icon && item.icon.trim() !== '-') {
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
            // title={item.icon}
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
            {item.icon}
          </div>
        );
      }
    } else {
      // 没有图标时显示首字母
      return (
        <div className="item-icon-placeholder">
          {name.charAt(0).toUpperCase()}
        </div>
      );
    }
  };

  const renderFiltersAndSort = () => (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
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
          <option value="count">数量</option>
        </select>
        <button
          onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          title={`当前为${sortDirection === 'asc' ? '正序' : '逆序'}，点击切换`}
        >
          {sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="backpack-tab">


      {/* 筛选和排序控件 */}
      <div className="shop-controls" style={{ display: hideTopControls ? 'none' : 'flex', flexDirection:'row',justifyContent:'space-between' }}>
        <div style={{ display: 'flex',flexDirection:'row',justifyContent:'space-between'}}>
          <div className="search-control" style={{ position: 'relative', display: 'inline-block', marginRight: '10px' }}>
            <input
              type="text"
              placeholder="搜索道具名称、描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={{
                padding: '5px 25px 5px 5px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                width: isMobile() ? '120px' : '200px',
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

          {isMobile() ? (
            <>
              <button
                ref={filterButtonRef}
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  color: 'black',
                  background: 'none',
                  borderRadius: '4px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  marginRight: '5px'
                }}
                title="筛选和排序"
              >
                ☰
              </button>
              {showFilters && (
                <div
                  className="filters-sort-popup"
                  style={{
                    position: 'absolute',
                    top: filterButtonRef.current ?
                      filterButtonRef.current.offsetTop + filterButtonRef.current.offsetHeight : '50px',
                    left: '10px',
                    background: 'white',
                    padding: '1px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    zIndex: 100,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                  }}
                >
                  {renderFiltersAndSort()}
                </div>
              )}
            </>
          ) : (
            renderFiltersAndSort()
          )}
        </div>

        <div className='other-control'>
          <button onClick={() => setShowLogs(true)} title="使用记录">🧾</button>
          <button onClick={onUseItem} title="刷新">⟳</button>
        </div>

      </div>

      {/* 网格模式显示道具 */}
      <div className="item-grid">
        {filteredAndSortedItems
          .map(([name, count]) => {
            const item = items[name];
            const category = item?.category || '未分类';

            return (
              <div
                key={name}
                className="item-card"
                onClick={() => {
                  setSelectedItem(name);
                  setUseCount(1);
                }}
                title={item?.description || '暂无描述'}
              >
                <div className="item-icon">
                  {renderItemIcon(item, name)}
                </div>
                <div className="item-name">{name}</div>
                <div className="item-category">{category}</div>
                <div className="item-count">数量: {count}</div>
                <button className="use-button">使用</button>
              </div>
            );
          })}
      </div>

     {selectedItem && (
       <div className="use-modal">
         <h4>使用{selectedItem}</h4>
         {/*<p>道具名称: {selectedItem}</p>*/}
         {/*<div className="item-stock">*/}
         {/*  <label>可使用 {backpack[selectedItem]}</label>*/}
         {/*  /!*<label style={{marginLeft: '10px'}}>可使用(1-{backpack[selectedItem]})</label>*!/*/}
         {/*</div>*/}


         <div>
           <input
             type="number"
             min="1"
             max={backpack[selectedItem]}
             value={useCount}
             onChange={(e) => setUseCount(e.target.value)}
           />
           <label>/{backpack[selectedItem]}</label>
         </div>

         {!gmCommand ? (
           <>
             <button onClick={handleUse} style={{marginTop:'20px'}}>确认</button>
             <button onClick={() => {
               setSelectedItem(null);
               setGmCommand('');
               setUseCount(1);
             }}>取消</button>
           </>
         ) : (
           <div className="gm-command-result">
             <p style={{color: 'green'}}>GM命令已复制到剪贴板</p>
             <p>{gmCommand}</p>
             <button onClick={() => {
               setSelectedItem(null);
               setGmCommand('');
               setUseCount(1);
               onUseItem();
             }}>关闭</button>
           </div>
         )}
       </div>
     )}

     {/* 使用日志弹窗 */}
    {showLogs && (
      <div className="logs-modal">
        <div className="logs-modal-content">
          <div className="logs-modal-header">
            <h3>使用日志</h3>
            <button onClick={() => {setShowLogs(false); setCurrentPage(1);}} className="close-button">×</button>
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
              <option value="5">每页5条</option>
              <option value="10">每页10条</option>
              <option value="20">每页20条</option>
              <option value="50">每页50条</option>
            </select>
          </div>

        </div>
      </div>
    )}
    </div>
  );
};

export default BackpackTab;
