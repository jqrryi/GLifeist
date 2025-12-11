// src/App.js
import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route,useNavigate,useLocation, Navigate} from 'react-router-dom';
import './App.css';
import { LogProvider } from './contexts/LogContext';

import CONFIG from './config';
import ShopTab from './components/ShopTab';
import BackpackTab from './components/BackpackTab';
import ItemManageTab from './components/ItemManageTab';
import TaskSystem from './components/TaskSystem';
import SettingsTab from './components/SettingsTab';
import Navbar from './components/Navbar';
import CharacterTab from './components/CharacterTab';
import Plant from './components/Plant';
import NoteTab from './components/NoteTab';
import SystemLogsTab from "./components/SystemLogsTab";
import FloatingControlButton from './components/FloatingControlButton';

// 创建一个内部组件来处理快捷键导航
const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 添加快捷键功能的 useEffect
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 检查是否在输入框中，如果是则不处理快捷键
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.contentEditable === 'true') {
        return;
      }

      // 防止在用户输入时触发快捷键（比如在表单中输入文字）
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // 如果当前在任务系统页面且处于热键模式，则不处理全局路由快捷键
      if (location.pathname === '/tasksys') {
        // 检查任务系统是否处于热键模式
        const taskSystemHotkeyMode = window.taskSystemHotkeyMode; // 需要在 TaskSystem 中设置这个全局变量
        if (taskSystemHotkeyMode) {
          return; // 让 TaskSystem 组件处理这些按键
        }
      }

      // 处理快捷键导航
      switch (e.key.toLowerCase()) {
        // case 't':
        //   navigate('/tasksys');
        //   break;
        case 'c':
          navigate('/character');
          break;
        case 'b':
          navigate('/backpack');
          break;
        case 'o':
          navigate('/options');
          break;
        case 's':
          navigate('/shop');
          break;
        case 'i':
          navigate('/items');
          break;
        case 'p':
          navigate('/plant');
          break;
        case 'j':
          navigate('/notes');
          break;
        case 'l':
          navigate('/logs');
          break;
        // 任务模块内的模式切换快捷键
        case 'q':
          // 列表模式 (list)
          if (location.pathname === '/tasksys') {
            window.dispatchEvent(new CustomEvent('switchTaskView', { detail: 'list' }));
          } else {
            navigate('/tasksys');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('switchTaskView', { detail: 'list' }));
            }, 100);
          }
          break;
        case 'w':
          // 看板模式 (board)
          if (location.pathname === '/tasksys') {
            window.dispatchEvent(new CustomEvent('switchTaskView', { detail: 'board' }));
          } else {
            navigate('/tasksys');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('switchTaskView', { detail: 'board' }));
            }, 100);
          }
          break;
        case 'e':
          // 日历模式 (calendar)
          if (location.pathname === '/tasksys') {
            window.dispatchEvent(new CustomEvent('switchTaskView', { detail: 'calendar' }));
          } else {
            navigate('/tasksys');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('switchTaskView', { detail: 'calendar' }));
            }, 100);
          }
          break;
        case 'r':
          // 卡片模式 (card)
          if (location.pathname === '/tasksys') {
            window.dispatchEvent(new CustomEvent('switchTaskView', { detail: 'card' }));
          } else {
            navigate('/tasksys');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('switchTaskView', { detail: 'card' }));
            }, 100);
          }
          break;
        // 新增：按 a 键进入任务系统卡片模式的"全部"状态分类
        // case 'a':
        //   if (location.pathname !== '/tasksys') {
        //     navigate('/tasksys');
        //     setTimeout(() => {
        //       // 先切换到卡片模式
        //       window.dispatchEvent(new CustomEvent('switchTaskView', { detail: 'card' }));
        //       // 设置字段为 status，值为 all
        //       setTimeout(() => {
        //         window.dispatchEvent(new CustomEvent('setTaskFieldAndValue', {
        //           detail: { field: 'status', value: 'all' }
        //         }));
        //       }, 50);
        //     }, 100);
        //   } else {
        //     // 已经在任务系统页面，直接切换到卡片模式并选择"全部"状态
        //     window.dispatchEvent(new CustomEvent('switchTaskView', { detail: 'card' }));
        //     setTimeout(() => {
        //       window.dispatchEvent(new CustomEvent('setTaskFieldAndValue', {
        //         detail: { field: 'status', value: 'all' }
        //       }));
        //     }, 50);
        //   }
        //   break;

        // 新增：按 h 键切换顶部控件显示/隐藏
        case 'h':
          // 获取当前的全局隐藏状态
          const currentGlobalHideState = parseInt(localStorage.getItem('floatingButtonHideState') || '0');
          // 切换到下一个状态 (0 -> 1 -> 2 -> 0)
          const nextGlobalHideState = (currentGlobalHideState + 1) % 3;

          // 更新本地存储
          localStorage.setItem('floatingButtonHideState', nextGlobalHideState.toString());

          // 派发事件通知相关组件更新状态
          window.dispatchEvent(new CustomEvent('floatingButtonHideStateChange', {
            detail: { state: nextGlobalHideState }
          }));

          // 同时更新旧的 hideTopControls 状态以保持兼容性
          const hideNav = nextGlobalHideState >= 1;
          localStorage.setItem('hideTopControls', hideNav.toString());
          break;


      }
    };

    // 添加键盘事件监听器
    document.addEventListener('keydown', handleKeyDown);

    // 清理函数：移除事件监听器
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, location.pathname]); // 将 navigate 和 location.pathname 添加到依赖数组中

  // 返回 null，因为我们只使用这个组件来处理快捷键，不需要渲染任何内容
  return null;
};


function App() {
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // 添加 hideTopNav 状态
  const [hideTopNav, setHideTopNav] = useState(() => {
    const savedHide = localStorage.getItem('hideTopControls');
    return savedHide === 'true';
  });
    // 统一的状态管理 - 使用单一状态源
  const [globalHideState, setGlobalHideState] = useState(() => {
    return parseInt(localStorage.getItem('floatingButtonHideState') || '0');
  });


  // 监听 hideTopNav 状态变化并保存到 localStorage
  useEffect(() => {
    localStorage.setItem('hideTopControls', hideTopNav);
  }, [hideTopNav]);


  // 监听 hideTopNav 状态变化并保存到 localStorage
  useEffect(() => {
    localStorage.setItem('hideTopControls', hideTopNav);
  }, [hideTopNav]);

  // 添加全局事件监听器来切换导航栏显示状态
  useEffect(() => {
    const handleToggleTopNav = () => {
      setHideTopNav(prev => {
        const newValue = !prev;
        localStorage.setItem('hideTopControls', newValue);
        return newValue;
      });
    };

    window.addEventListener('toggleTopNavVisibility', handleToggleTopNav);

    return () => {
      window.removeEventListener('toggleTopNavVisibility', handleToggleTopNav);
    };
  }, []);

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);


  // 监听悬浮按钮状态变化
  useEffect(() => {
    const handleHideStateChange = (event) => {
      const newState = event.detail.state;
      setGlobalHideState(newState);
      localStorage.setItem('floatingButtonHideState', newState.toString());
    };

    window.addEventListener('floatingButtonHideStateChange', handleHideStateChange);
    return () => {
      window.removeEventListener('floatingButtonHideStateChange', handleHideStateChange);
    };
  }, []);

  // 计算兼容的隐藏标志
  const hideNav = globalHideState >= 1;  // 与现有 hideTopNav 功能相同
  const hideTopControls = globalHideState >= 2;  // 新增的顶部控件隐藏


  const fetchData = async () => {
    try {
      setLoading(true); // 开始加载时设置loading状态
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/data`);
      const result = await response.json();

      setData({
        stats: result.stats || {},
        credits: result.credits || {},
        items: result.items || {},
        backpack: result.backpack || {},
        use_logs: result.use_logs || [],
        properties: result.properties || [],  // 确保加载属性数据
        tasks: result.tasks || [],

      });

      // 加载设置
      const settingsResponse = await fetch(`${CONFIG.API_BASE_URL}/api/settings`);
      const settingsResult = await settingsResponse.json();
      setSettings(settingsResult);

      setLoading(false); // 数据加载完成后设置loading为false
    } catch (error) {
      console.error('获取数据失败:', error);
      setError(error.message); // 设置错误状态
      setLoading(false); // 即使出错也要结束加载状态
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/settings`);
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const result = await response.json();
      setSettings(result);
    } catch (err) {
      console.error('获取设置失败:', err);
      // 使用默认设置
      setSettings({
        defaultTaskViewMode: "list",
        defaultBoardGroupBy: "category",
        taskFieldSettings: {
          category: true,
          domain: true,
          priority: true
        },
        moduleOrder: ["面板", "任务", "背包", "商店", "道具", "工坊", "笔记", "日志","设置"],
        creditTypes: ["水晶", "星钻", "魂玉", "骨贝", "源石", "灵石", "金币", "元宝"],
        itemCategories: ["经验类", "属性类", "消耗类", "装备类", "材料类", "任务类", "宝箱类", "其它类"],
        taskCategories: ["主线任务", "辅线任务", "支线任务", "特殊任务"],
        taskDomains: ["学习", "工作", "运动", "生活", "社交", "自修"],
        taskPriorities: ["重要且紧急", "重要不紧急", "不重要但紧急", "不重要不紧急"],
        taskStatuses: ["未完成", "进行中", "重复中", "已完成"]
      });
    }
  };

  const showStatus = (message) => {
    console.log(message);
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error">错误: {error}</div>;
  if (!data) return <div className="error">无数据</div>;
  if (!settings) return <div className="loading">加载设置中...</div>;

  // 获取所有道具名称
  const itemNames = Object.keys(data.items || {});


  // 从taskFieldMappings提取配置并转为旧版的codeSettings
  const codeSettings = {};
  // 从 taskFieldMappings 中动态提取所有字段类型
  for (const fieldType of Object.keys(settings.taskFieldMappings)) {
    if (settings.taskFieldMappings[fieldType]) {
      codeSettings[fieldType] = {};
      for (const [key, config] of Object.entries(settings.taskFieldMappings[fieldType])) {
        // 检查 config 中是否存在 code 属性
        if (config && config.code !== undefined) {
          codeSettings[fieldType][key] = config.code;
        }
      }
    }
  }
  // console.log("imported codesettings: ",codeSettings)

  const handleModuleOrderChange = async (newOrder) => {
    // 更新本地状态
    setSettings({
      ...settings,
      moduleOrder: newOrder
    });

    // 发送到服务器保存
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...settings, moduleOrder: newOrder})
      });

      const result = await response.json();

      if (response.ok) {
        // 触发重新获取设置以确保同步
        await fetchSettings();

        // 显示成功提示反馈
        const successMessage = document.createElement('div');
        successMessage.textContent = '模块顺序保存成功！';
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
        console.error('保存模块顺序失败:', result.error);
        // 恢复之前的设置状态
        await fetchSettings();
      }
    } catch (error) {
      console.error('保存模块顺序时发生错误:', error);
      // 恢复之前的设置状态
      await fetchSettings();
    }
  };

  const parallelWorldsOptions = {
    worlds: settings?.parallelWorlds || ["默认世界", "幻想世界", "科幻世界", "古代世界"],
    gmCommands: settings?.gmCommands || {}, // 传递 GM 命令配置
    defaultWorld: settings?.defaultParallelWorld,
  }



  return (
    <Router>
      <AppContent /> {/* 添加快捷键处理组件 */}
      <LogProvider>
        <div className="App">
          {/*<Navbar moduleOrder={settings.moduleOrder} /> /!* 传递模块顺序给导航栏 *!/*/}
          <Navbar moduleOrder={settings.moduleOrder} hideTopNav={hideNav} onModuleOrderChange={handleModuleOrderChange}/>
          <div className={`container ${hideNav ? 'navbar-hidden' : ''}`}>
            <Routes>

              <Route path="/" element={
                settings?.defaultHomePage && settings.defaultHomePage !== '/'
                  ? <Navigate to={settings.defaultHomePage} replace />
                  : <CharacterTab
                    />
              } />
              <Route path="/character" element={
                <CharacterTab
                  credits={data.credits}
                  settings={settings}
                  conversionRates={data.conversion_rates || data.conversionRates || {}}
                  onUpdateCredits={fetchData}
                  onShowStatus={showStatus}
                  creditTypes={settings.creditTypes}
                  sellRates={settings.sellRates}
                  stats={data.stats}
                  properties={data.properties}
                  characterSettings={{
                    characterSettings: settings.characterSettings || [],
                    allowManualCreditEditing: settings.allowManualCreditEditing,
                  }}
                  expFormulas={settings.expFormulas}
                  levelToRealm={settings.levelToRealm}
                  propertyToRealm={settings.propertyToRealm}
                  hideTopControls={hideTopControls}
                />
              } />
              <Route path="/shop" element={
                <ShopTab
                  items={data.items}
                  credits={data.credits}
                  backpack={data.backpack}
                  onBuyItem={fetchData}
                  onShowStatus={showStatus}
                  categories={settings.itemCategories} // 传递自定义道具类别
                  creditTypes={settings.creditTypes}
                  parallelWorldsOptions={parallelWorldsOptions}
                  // hideTopNav={hideNav}
                  hideTopControls={hideTopControls}
                />
              } />
              <Route path="/backpack" element={
                <BackpackTab
                  backpack={data.backpack}
                  items={data.items}
                  // logs={data.use_logs}
                  onUseItem={fetchData}
                  onShowStatus={showStatus}
                  // hideTopNav={hideNav}
                  hideTopControls={hideTopControls}
                  parallelWorldsOptions={parallelWorldsOptions}
                  categories={settings.itemCategories}
                />
              } />

              <Route path="/notes" element={
                <NoteTab
                  autoSaveInterval={settings.noteAutoSaveInterval}
                  onShowStatus={showStatus}
                  codeSettings={codeSettings}
                  stats={data.stats}
                  characterSettings={settings.characterSettings}
                  taskFieldMappings={settings.taskFieldMappings}
                  expFormulas={settings.expFormulas}
                  quickAddTaskHint={settings.quickAddTaskHint}
                  customDomain={settings.customDomain}
                  settings={settings}
                  onUpdateSettings={fetchSettings}
                />
              } />
              <Route path="/items" element={
                <ItemManageTab
                  items={data.items}
                  settings={settings}
                  onAddItem={fetchData}
                  onUpdateItem={fetchData}
                  onDeleteItem={fetchData}
                  onShowStatus={showStatus}
                  categories={settings.itemCategories} // 传递自定义道具类别
                  creditTypes={settings.creditTypes}
                  // hideTopNav={hideNav}
                  hideTopControls={hideTopControls}
                  enableAllCreditsPricing={settings.enableAllCreditsPricing}
                  parallelWorlds={parallelWorldsOptions}
                />
              } />

              <Route path="/tasksys" element={
                <TaskSystem
                    settings={settings}
                    data={data}
                    onAddTask={fetchData}
                    onUpdateTask={fetchData}
                    onDeleteTask={fetchData}
                    onCompleteTask={fetchData}
                    onShowStatus={showStatus}
                    tasks={data.tasks}
                    stats={data.stats}
                    allItems={itemNames}
                    items = {data.items}
                    actionButtonSettings={settings.actionButtonSettings}
                    mainActionButtonSettings={settings.mainActionButtonSettings}
                    defaultViewMode={settings.defaultTaskViewMode}
                    defaultBoardGroupBy={settings.defaultBoardGroupBy}
                    fieldSettings={settings.taskFieldSettings}
                    taskCategories={settings.taskCategories}
                    taskDomains={settings.taskDomains}
                    taskPriorities={settings.taskPriorities}
                    taskStatuses={settings.taskStatuses}
                    creditTypes={settings.creditTypes}
                    codeSettings={codeSettings}
                    borderSettings={settings.borderSettings} // 添加边框设置传递
                    calendarViewSettings={settings.calendarViewSettings} // 添加日历视图设置传递
                    expFormulas={settings.expFormulas} // 添加这一行
                    characterSettings={settings.characterSettings}
                    taskFieldMappings={settings.taskFieldMappings}
                    quickAddTaskHint={settings.quickAddTaskHint}
                    onHideTopNavChange={setHideTopNav}
                    hideTopNav={hideNav}
                    externalHideTopControls={hideTopControls}

                />
              } />
              <Route path="/logs" element={
                <SystemLogsTab
                    // settings={settings}
                    hideTopControls={hideTopControls}
                />
              } />

              <Route path="/options" element={
                <SettingsTab
                    settings={settings}
                    onUpdateSettings={fetchSettings}
                    onShowStatus={showStatus}
                />
              } />

              <Route path="/plant" element={
                <Plant
                  items={data.items}
                  onAddItem={fetchData}
                  onUpdateItem={fetchData}
                  onDeleteItem={fetchData}
                  onShowStatus={showStatus}
                  backpack={data.backpack}
                  onCraftItem={fetchData}
                  taskCategories={settings.taskCategories}
                  // hideTopNav={hideNav}
                  hideTopControls={hideTopControls}
                  parallelWorldsOptions={parallelWorldsOptions}
                />
              } />

            </Routes>

            {settings.enableFloatingControlButton && <FloatingControlButton />}
          </div>
        </div>
      </LogProvider>
    </Router>
  );
}

export default App;
