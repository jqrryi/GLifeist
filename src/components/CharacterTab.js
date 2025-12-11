// src/components/CharacterTab.js
import React, { useState, useEffect, useRef } from 'react';
import CONFIG from '../config';
import SettingsModal from "./SettingsModal";

const CharacterTab = ({
  stats,
  credits,
  settings,
  properties,
  conversionRates,
  onUpdateCredits,
  onShowStatus,
  creditTypes,
  characterSettings,
  sellRates,
  expFormulas,
  levelToRealm,
  propertyToRealm,
  hideTopControls
}) => {
  const [editingCredit, setEditingCredit] = useState(null);
  const [editValues, setEditValues] = useState({ modify: '', add: '0' });
  const modalRef = useRef(null); // 用于处理ESC键退出
  const [sellingCredit, setSellingCredit] = useState(null);
  const [sellAmount, setSellAmount] = useState('0');
  const [editingCharacter, setEditingCharacter] = useState(false);
  const [characterInfo, setCharacterInfo] = useState({
    name: stats.name || '冒险者',
    avatar: stats.avatar || '🧙‍♂️'
  });
  const [showRealmModal, setShowRealmModal] = useState(false);
  const [realmModalData, setRealmModalData] = useState({ title: '', name: '', description: '' });

  // 在组件顶部添加预设emoji列表
  const PRESET_EMOJIS = [
    '🧙‍♂️', '🧙‍♀️', '👨‍💻', '👩‍💻', '👨‍🎨', '👩‍🎨', '👨‍🔬', '👩‍🔬',
    '👨‍🚀', '👩‍🚀', '🦸‍♂️', '🦸‍♀️', '🦹‍♂️', '🦹‍♀️', '👨‍⚕️', '👩‍⚕️',
    '👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳',
    '👨‍🔧', '👩‍🔧', '👨‍🏭', '👩‍🏭', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬',
    '👨‍🎤', '👩‍🎤', '👨‍🎨', '👩‍🎨', '👨‍✈️', '👩‍✈️', '👨‍🚀', '👩‍🚀'
  ];

  // 添加图标选择面板状态
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // 修改点击emoji处理函数
  const handleEmojiSelect = (emoji) => {
    setCharacterInfo({...characterInfo, avatar: emoji});
    setShowEmojiPicker(false);
  };
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 计算等级和经验
  const calculateLevelAndExp = () => {
    const exp = stats.exp || 0;

    // 获取公式参数 a 和 n，默认值为 100 和 2.5
    const a = expFormulas?.levelUpA || 100;
    const n = expFormulas?.levelUpN || 2.5;

    // 使用更平滑的等级计算公式
    const level = Math.floor(Math.pow(exp / a, 1/n)) + 1;
    const nextLevelExp = Math.pow(level, n) * a;
    const currentLevelExp = Math.pow(level - 1, n) * a;
    const expInCurrentLevel = exp - currentLevelExp;
    const expNeeded = nextLevelExp - exp;
    const expNeededNextLevel = nextLevelExp - currentLevelExp;

    return {
      level,
      exp,
      nextLevelExp,
      currentLevelExp,
      expInCurrentLevel,
      expNeeded,
      expNeededNextLevel
    };
  };
  // 在 calculateLevelAndExp 函数后添加新的属性等级计算函数
  const calculatePropertyLevel = (propertyValue, propertyType) => {
    // 获取属性升级公式参数 a 和 n
    const a = expFormulas?.propertyLevelA;
    const n = expFormulas?.propertyLevelN;

    // 使用公式计算属性等级
    const level = Math.floor(Math.pow(propertyValue / a, 1/n)) + 1;
    const nextLevelValue = Math.pow(level, n) * a;
    const currentLevelValue = Math.pow(level - 1, n) * a;
    const valueInCurrentLevel = propertyValue - currentLevelValue;
    const valueNeeded = nextLevelValue - propertyValue;
    const valueNeededNextLevel = nextLevelValue - currentLevelValue;

    return {
      level,
      value: propertyValue,
      nextLevelValue,
      currentLevelValue,
      valueInCurrentLevel,
      valueNeeded,
      valueNeededNextLevel
    };
  };

  // 在 CharacterTab 组件中找到 calculateLevelAndExp 函数后添加以下函数
  const getLevelRealm = (level) => {
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

  // 在 CharacterTab 组件中找到 calculatePropertyLevel 函数后添加以下函数
  const getPropertyRealm = (propertyValue, propertyType) => {
    if (!propertyToRealm || propertyToRealm.length === 0) return null;

    // 查找属性类别
    const propertyInfo = getPropertyCategoryInfo(propertyType);

    if (!propertyInfo) return null;

    const realm = propertyToRealm.find(item => {
      const start = parseInt(item['起始等级'], 10);
      const end = parseInt(item['结束等级'], 10);


      return propertyInfo.domain === item['领域'] &&
             propertyValue >= start && propertyValue <= end;
    });

    return realm ? {
      name: realm['境界'],
      description: realm['描述']
    } : null;
  };



  // 获取属性类别映射信息
  const getPropertyCategoryInfo = (creditType) => {
    if (characterSettings && characterSettings.characterSettings) {
      // 查找匹配的设置项
      const setting = characterSettings.characterSettings.find(
        item => item.creditType === creditType
      );

      if (setting && setting.propertyCategory) {
        return {
          name: setting.propertyCategory,
          icon: setting.icon || "🌟",
          color: setting.color || "#666666",
          domain: setting.domain,
        };
      }
    }
    return null;
  };
  // 获取积分类型对应的图标
  const getCreditIcon = (creditType) => {
    if (characterSettings && characterSettings.characterSettings) {
      // 查找匹配的设置项
      const setting = characterSettings.characterSettings.find(
        item => item.creditType === creditType
      );

      // 返回积分图标，如果没有设置则返回默认图标
      return setting?.creditIcon || "💎";
    }
    return "💎";
  };

  // 处理ESC键退出编辑弹窗
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        // 优先关闭emoji选择器
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
          event.stopPropagation(); // 阻止事件冒泡
          return;
        }
        if (editingCredit) {
          setEditingCredit(null);
        }
        if (editingCharacter) {
          setEditingCharacter(false);
        }
      }
    };

    if (showEmojiPicker || editingCredit || editingCharacter) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';      // 防止背景滚动
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showEmojiPicker, editingCredit,editingCharacter]);

  // 点击模态框外部关闭
  useEffect(() => {
    const handleClickOutside = (event) => {
      // 优先处理emoji面板关闭
      if (showEmojiPicker) {
        // 检查点击目标是否在emoji面板内
        const emojiPanel = document.querySelector('.emoji-picker-panel');
        if (emojiPanel && !emojiPanel.contains(event.target)) {
          setShowEmojiPicker(false);
          return;
        }
      }

      // 处理模态框外部点击（仅当emoji面板关闭时）
      if (!showEmojiPicker && modalRef.current && !modalRef.current.contains(event.target)) {
        if (editingCredit) {
          setEditingCredit(null);
        }
        if (sellingCredit) {
          setSellingCredit(null);
        }
        if (editingCharacter) {
          setEditingCharacter(false);
        }
      }
    };

    if (editingCredit || sellingCredit || editingCharacter || showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingCredit, sellingCredit, editingCharacter, showEmojiPicker]);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        if (showEmojiPicker) {
          setShowEmojiPicker(false);
          return;
        }
        if (sellingCredit) {
          setSellingCredit(null);
        }
        if (editingCharacter) {
          setEditingCharacter(false);
        }
      }
    };

    if (sellingCredit) {
      document.addEventListener('keydown', handleEscKey);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [sellingCredit]);

  // 在 useEffect 区域添加 ESC 键关闭弹窗的功能
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && showRealmModal) {
        setShowRealmModal(false);
      }
    };

    if (showRealmModal) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showRealmModal]);

  // 渲染角色面板（经验等级和角色属性）
  const renderCharacterPanel = () => {
    const {level, exp, nextLevelExp, currentLevelExp, expInCurrentLevel, expNeeded,expNeededNextLevel} = calculateLevelAndExp();
    const expBarWidth = (expInCurrentLevel / expNeededNextLevel) * 100;

    return (
      <div className="character-panel">
        <div style={{display:"flex", justifyContent: 'space-between'}}>
          <div className="character-header">
            <div
              className="character-avatar"
              onClick={() => {
                setCharacterInfo({
                  name: stats.name || '冒险者',
                  avatar: stats.avatar || '🧙‍♂️'
                });
                setEditingCharacter(true);
              }}
              style={{ cursor: 'pointer' }}
            >
              <span className="avatar-icon">{stats.avatar || '🧙‍♂️'}</span>
            </div>
            <div className="character-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2>{stats.name || '冒险者'}</h2>
                <button
                  onClick={onUpdateCredits}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="刷新数据"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" fill="currentColor"/>
                  </svg>
                </button>
              </div>
              <div className="level-info">
                <span className="level-badge">Lv.{level}</span>
                <span className="exp-text" title={`${exp.toFixed(0)} / ${nextLevelExp.toFixed(0)}`}>{expInCurrentLevel.toFixed(0)} / {expNeededNextLevel.toFixed(0)} </span>
              </div>
              <div className="exp-bar-container" style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  className="exp-bar-fill"
                  style={{
                    width: `${expBarWidth}%`,
                    backgroundColor: '#4285f4',
                  }}
                ></div>
                <label style={{ marginLeft: '10px', fontSize: '10px' }}>{expBarWidth.toFixed(2)}%</label>
              </div>
              {(() => {
                const realm = getLevelRealm(level);
                return realm ? (
                  <div
                    className="realm-info"
                    style={{
                      display: 'flex',
                      marginTop: '5px',
                      fontSize: '14px',
                      color: '#1c0234',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    title={`${realm.name}: ${realm.description}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      // 查找所有等级境界数据
                      if (levelToRealm && levelToRealm.length > 0) {
                        setRealmModalData({
                          title: '经验境界预览',
                          isList: true,
                          realms: levelToRealm
                        });
                      } else {
                        // 如果没有找到境界列表，则显示当前境界详情
                        setRealmModalData({
                          title: '经验境界详情',
                          isList: false,
                          name: realm.name,
                          description: realm.description
                        });
                      }
                      setShowRealmModal(true);
                    }}
                  >
                    {realm.name}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
          <div className="character-settings-modal">
            <button className="tasksys-settings-button" onClick={() => setIsSettingsModalOpen(!isSettingsModalOpen)}>
              ⚙️️
            </button>
            <SettingsModal
              isOpen={isSettingsModalOpen}
              title="面板设置"
              onClose={() => setIsSettingsModalOpen(false)}
              targetGroup={['general','character', 'formulas', 'realms', 'credit-sales',   ]}
              settings={settings}
              onUpdateSettings={onUpdateCredits}
            />
          </div>
        </div>

        {/* 显示角色属性 */}
        <div className="attributes-grid">
          {creditTypes.map(type => {
            // 获取属性类别信息
            const propertyInfo = getPropertyCategoryInfo(type);

            // 如果没有找到属性类别映射，则不显示在角色属性区域
            if (!propertyInfo) return null;

            let propertyValue = 0;
            if (properties) {
              propertyValue = properties[propertyInfo.name] || 0;
            }

            // 计算属性等级
            const propertyLevelData = calculatePropertyLevel(propertyValue, type);
            const propertyLevel = propertyLevelData.level;
            const propertyExpBarWidth = (propertyLevelData.valueInCurrentLevel / propertyLevelData.valueNeededNextLevel) * 100;

            return (
              <div
                key={type}
                className="attribute-card"
                style={{ borderColor: propertyInfo.color }}
              >
                <div className="attribute-icon" style={{ backgroundColor: `${propertyInfo.color}20` }}>
                  {propertyInfo.icon}
                </div>
                <div className="attribute-info">
                  <div style={{  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'  }}>
                    <h3 style={{
                      color: propertyInfo.color,
                      textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                      margin: '0',
                      fontSize: '16px'
                    }}>
                      {propertyInfo.name}
                    </h3>
                    <br></br>
                    <p className="attribute-value" style={{
                      color: '#333',
                      fontWeight: 'bold',
                      margin: '0',
                      fontSize: '18px',
                    }}>
                      {propertyValue}
                    </p>
                  </div>

                  {/* 显示属性等级 */}
                  <div className="property-level-info">
                    <span className="property-level-badge">Lv.{propertyLevel}</span>

                    <div className="property-exp-bar-container">
                      <div
                        className="property-exp-bar-fill"
                        style={{
                          width: `${propertyExpBarWidth}%`,
                          backgroundColor: propertyInfo.color,
                        }}
                      ></div>
                    </div>
                    <span className="property-exp-text" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      {propertyLevelData.valueInCurrentLevel.toFixed(0)} / {propertyLevelData.valueNeededNextLevel.toFixed(0)}
                      <p style={{fontSize: '12px', color: '#333'}}>{propertyInfo.domain}</p>
                      {(() => {
                        const propertyRealm = getPropertyRealm(propertyLevel, type);
                        const propertyInfo = getPropertyCategoryInfo(type);

                        return propertyRealm ? (
                          <span
                            className="property-realm-badge"
                            style={{
                              fontSize: '12px',
                              backgroundColor: '#a0add8',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              position: 'relative',
                            }}
                            title={`${propertyRealm.name}: ${propertyRealm.description}`}
                            onClick={(e) => {
                              e.stopPropagation();

                              // 查找当前属性类别对应的所有境界
                              const propertyRealms = propertyToRealm?.filter(item =>
                                propertyInfo && item['领域'] === propertyInfo.domain
                              ) || [];

                              if (propertyRealms.length > 0) {
                                setRealmModalData({
                                  title: `属性境界预览 - ${propertyInfo.name}`,
                                  isList: true,  // 修复：应该设置为 true 来显示列表
                                  realms: propertyRealms
                                });
                              } else {
                                // 如果没有找到境界列表，则显示当前境界详情
                                setRealmModalData({
                                  title: '属性境界详情',
                                  isList: false,  // 显示单个详情
                                  name: propertyRealm.name,
                                  description: propertyRealm.description
                                });
                              }
                              setShowRealmModal(true);
                            }}
                          >
                            {propertyRealm.name}
                          </span>
                        ) : null;
                      })()}


                    </span>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染所有积分类型
  const renderAllCredits = () => {
    if (creditTypes.length === 0) return null;

    // 将积分类型分为钱包和资源两部分
    // 最后两项放入钱包，其余放入资源
    const walletTypes = creditTypes.slice(-2); // 最后两项
    const resourceTypes = creditTypes.slice(0, -2); // 其余项

    return (
      <div className="all-credits-section">
        {/*// 在 renderAllCredits 函数中修改积分卡片样式*/}
        {resourceTypes.length > 0 && (
          <div className="resource-section">
            <div className="resource-section" style={{ textAlign: 'left' }}>
              <h3>资源</h3>
            </div>
            <div className="credits-grid">
              {resourceTypes.map(type => {
                const value = credits[type] !== undefined ? credits[type] : 0;
                const icon = getCreditIcon(type); // 获取积分图标
                return (
                  <div
                    key={type}
                    className="credit-card"
                    onClick={() => {
                      setSellingCredit(type);
                      setSellAmount('0');
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '15px 10px',
                      position: 'relative',
                      cursor: 'pointer'
                    }}>
                    {/* 使用新的编辑图标 */}
                    {characterSettings?.allowManualCreditEditing !== false && (
                      <button
                        className="edit-button-top-right"
                        onClick={() => {
                          setEditingCredit(type);
                          const currentAmount = credits[type] !== undefined ? credits[type] : 0;
                          setEditValues({ modify: currentAmount.toString(), add: '0' });
                        }}
                        title="编辑"
                        style={{
                          position: 'absolute',
                          top: '5px',
                          right: '5px',
                          background: 'none',
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          width: '20px',
                          height: '20px'
                        }}
                      >
                        <img
                          src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0zLjU0OCAyMC45MzhoMTYuOWEuNS41IDAgMCAwIDAtMWgtMTYuOWEuNS41IDAgMCAwIDAgMU05LjcxIDE3LjE4YTIuNiAyLjYgMCAwIDAgMS4xMi0uNjVsOS41NC05LjU0YTEuNzUgMS43NSAwIDAgMCAwLTIuNDdsLS45NC0uOTNhMS43OSAxLjc5IDAgMCAwLTIuNDcgMGwtOS41NCA5LjUzYTIuNSAyLjUgMCAwIDAtLjY0IDEuMTJMNi4wNCAxN2EuNzQuNzQgMCAwIDAgLjE5LjcyYS43Ny43NyAwIDAgMCAuNTMuMjJabS40MS0xLjM2YTEuNDcgMS40NyAwIDAgMS0uNjcuMzlsLS45Ny4yNmwtMS0xbC4yNi0uOTdhMS41IDEuNSAwIDAgMSAuMzktLjY3bC4zOC0uMzdsMS45OSAxLjk5Wm0xLjA5LTEuMDhsLTEuOTktMS45OWw2LjczLTYuNzNsMS45OSAxLjk5Wm04LjQ1LTguNDVMMTguNjUgNy4zbC0xLjk5LTEuOTlsMS4wMS0xLjAyYS43NS43NSAwIDAgMSAxLjA2IDBsLjkzLjk0YS43NTQuNzU0IDAgMCAxIDAgMS4wNiIvPjwvc3ZnPg=="
                          alt="编辑"
                          style={{ width: '16px', height: '16px' }}
                        />
                      </button>
                    )}

                    {/* 积分图标 */}
                    <div className="credit-icon" style={{
                      fontSize: '24px',
                      marginBottom: '8px'
                    }}>
                      {icon.startsWith('http') ? (
                        <img src={icon} alt={type} style={{ width: '24px', height: '24px' }} />
                      ) : (
                        <span>{icon}</span>
                      )}
                    </div>

                    {/* 积分类型名称 */}
                    <h4 style={{
                      margin: '0 0 5px 0',
                      fontSize: '14px',
                      textAlign: 'center',
                      fontWeight: 'normal'
                    }}>
                      {type}
                    </h4>

                    {/* 积分数值 */}
                    <p className="credit-value" style={{
                      margin: '0',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {walletTypes.length > 0 && (
          <div className="wallet-section">
            <div className="resource-section" style={{ textAlign: 'left' }}>
              <h3>钱包</h3>
            </div>
            <div className="credits-grid">
              {walletTypes.map(type => {
                const value = credits[type] !== undefined ? credits[type] : 0;
                const icon = getCreditIcon(type); // 获取积分图标
                return (
                  <div key={type} className="credit-card" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '15px 10px',
                    position: 'relative',
                  }}>
                    {/* 使用新的编辑图标 */}
                    {characterSettings?.allowManualCreditEditing !== false && (
                      <button
                        className="edit-button-top-right"
                        onClick={() => {
                          setEditingCredit(type);
                          const currentAmount = credits[type] !== undefined ? credits[type] : 0;
                          setEditValues({ modify: currentAmount.toString(), add: '0' });
                        }}
                        title="编辑"
                        style={{
                          position: 'absolute',
                          top: '5px',
                          right: '5px',
                          background: 'none',
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          width: '20px',
                          height: '20px'
                        }}
                      >
                        <img
                          src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0zLjU0OCAyMC45MzhoMTYuOWEuNS41IDAgMCAwIDAtMWgtMTYuOWEuNS41IDAgMCAwIDAgMU05LjcxIDE3LjE4YTIuNiAyLjYgMCAwIDAgMS4xMi0uNjVsOS41NC05LjU0YTEuNzUgMS43NSAwIDAgMCAwLTIuNDdsLS45NC0uOTNhMS43OSAxLjc5IDAgMCAwLTIuNDcgMGwtOS41NCA5LjUzYTIuNSAyLjUgMCAwIDAtLjY0IDEuMTJMNi4wNCAxN2EuNzQuNzQgMCAwIDAgLjE5LjcyYS43Ny43NyAwIDAgMCAuNTMuMjJabS40MS0xLjM2YTEuNDcgMS40NyAwIDAgMS0uNjcuMzlsLS45Ny4yNmwtMS0xbC4yNi0uOTdhMS41IDEuNSAwIDAgMSAuMzktLjY3bC4zOC0uMzdsMS45OSAxLjk5Wm0xLjA5LTEuMDhsLTEuOTktMS45OWw2LjczLTYuNzNsMS45OSAxLjk5Wm04LjQ1LTguNDVMMTguNjUgNy4zbC0xLjk5LTEuOTlsMS4wMS0xLjAyYS43NS43NSAwIDAgMSAxLjA2IDBsLjkzLjk0YS43NTQuNzU0IDAgMCAxIDAgMS4wNiIvPjwvc3ZnPg=="
                          alt="编辑"
                          style={{ width: '16px', height: '16px' }}
                        />
                      </button>
                    )}

                    {/* 积分图标 */}
                    <div className="credit-icon" style={{
                      fontSize: '24px',
                      marginBottom: '8px'
                    }}>
                      {icon.startsWith('http') ? (
                        <img src={icon} alt={type} style={{ width: '24px', height: '24px' }} />
                      ) : (
                        <span>{icon}</span>
                      )}
                    </div>

                    {/* 积分类型名称 */}
                    <h4 style={{
                      margin: '0 0 5px 0',
                      fontSize: '14px',
                      textAlign: 'center',
                      fontWeight: 'normal'
                    }}>
                      {type}
                    </h4>

                    {/* 积分数值 */}
                    <p className="credit-value" style={{
                      margin: '0',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                       {typeof value === 'number' ? value.toFixed(2) : value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 添加处理卖出的函数
  const handleSellCredit = async (creditType, targetCreditType, rate) => {
    try {
      const amount = parseFloat(sellAmount) || 0;
      if (amount <= 0) {
        alert('卖出数量必须大于0');
        return;
      }

      if (credits[creditType] < amount) {
        alert('数额不足');
        return;
      }

      // 计算可获得的目标积分数量
      // 根据显示逻辑，应该是 amount * rate 而不是 amount / rate
      const targetAmount = ((parseFloat(sellAmount) || 0) * rate).toFixed(2);

      // 扣除源积分
      const deductResponse = await fetch(`${CONFIG.API_BASE_URL}/api/credits/${encodeURIComponent(creditType)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: credits[creditType] - amount })
      });

      if (!deductResponse.ok) {
        throw new Error('扣除失败');
      }

      // 增加目标积分
      const addResponse = await fetch(`${CONFIG.API_BASE_URL}/api/credits/add/${encodeURIComponent(targetCreditType)}/${targetAmount}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!addResponse.ok) {
        throw new Error('增加失败');
      }

      onShowStatus(`成功将${amount}${creditType}兑换为${targetAmount}${targetCreditType}`);
      onUpdateCredits();
      setSellingCredit(null);
      setSellAmount('');
    } catch (error) {
      console.error('卖出时发生错误:', error);
      alert('卖出时发生错误: ' + error.message);
    }
  };

  const resourceTypes = creditTypes.slice(0, -2);
  const walletTypes = creditTypes.slice(-2);

  // 在组件的函数区域添加弹窗渲染函数
  const RealmModal = () => {
    const modalRef = useRef(null);

    // 点击模态框外部关闭
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
        <div className="edit-credit-modal" ref={modalRef}>
          <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>{realmModalData.title}</h4>
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
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                top: '10px',
                right: '10px'
              }}
            >
              <img
                src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSA2LjQxTDE3LjU5IDUgMTIgMTAuNTkgNi40MSA1IDUgNi40MSAxMC41OSAxMiA1IDE3LjU5IDYuNDEgMTkgMTIgMTMuNDEgMTcuNTkgMTkgMTkgMTcuNTkgMTMuNDEgMTJ6Ii8+PC9zdmc+"
                alt="关闭"
                style={{ width: '20px', height: '20px' }}
              />
            </button>
          </div>
          <div style={{
            marginTop: '20px',
            maxHeight: '70vh',  // 限制最大高度
            overflowY: 'auto'   // 添加垂直滚动条
          }}>
            {realmModalData.isList ? (
              // 显示所有境界列表
              <div>
                <table className="realm-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>等级范围</th>
                      <th>境界</th>
                      <th>描述</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '14px' }}>
                    {realmModalData.realms.map((item, index) => (
                      <tr key={index}>
                        <td>{item['起始等级']} - {item['结束等级']}</td>
                        <td>{item['境界']}</td>
                        <td>{item['描述']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // 显示单个境界详情
              <div>
                <h3 style={{ textAlign: 'center', margin: '10px 0' }}>{realmModalData.name}</h3>
                <p style={{ textAlign: 'center', whiteSpace: 'pre-wrap' }}>{realmModalData.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="credits-tab">
      {!hideTopControls && renderCharacterPanel()}
      {renderAllCredits()}

      <RealmModal />

      {sellingCredit && (
        <div className="edit-credit-modal-overlay">
          <div className="edit-credit-modal" ref={modalRef}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <h4>卖出{sellingCredit}资源</h4>
              <button
                className="modal-close-button"
                onClick={() => setSellingCredit(null)}
                style={{
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
                <img
                  src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSA2LjQxTDE3LjU5IDUgMTIgMTAuNTkgNi40MSA1IDUgNi40MSAxMC41OSAxMiA1IDE3LjU5IDYuNDEgMTkgMTIgMTMuNDEgMTcuNTkgMTkgMTkgMTcuNTkgMTMuNDEgMTJ6Ii8+PC9zdmc+"
                  alt="关闭"
                  style={{ width: '20px', height: '20px' }}
                />
              </button>
            </div>
            <p>当前{sellingCredit}资源：{credits[sellingCredit]}</p>

            <div className="credit-sell-controls" style={{ margin: '20px 0' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>卖出数量：</label>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.1px'
              }}>
                <button
                  onClick={() => setSellAmount(Math.max(1, sellAmount - 1))}
                  disabled={sellAmount <= 1}
                  style={{
                    width: '30px',
                    height: '30px',
                    background: 'transparent',
                    color: sellAmount <= 1 ? '#6c757d' : '#000000',
                    border: 'none',
                    borderRadius: '4px 0 0 4px',
                    cursor: sellAmount <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  -
                </button>

                <div className="credit-sell-quantity" style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  margin: '0 5px'
                }}>
                  <button
                    onClick={() => setSellAmount('0')}
                    title="填入最小卖出数量"
                    style={{
                      position: 'absolute',
                      left: '-5px',
                      top: '0',
                      bottom: '0',
                      background: 'none',
                      // border: 'none',
                      // borderRight: '1px solid #ddd',
                      // borderRadius: '4px 0 0 4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 8px',
                      // backgroundColor: '#f8f9fa',
                      zIndex: '1'
                    }}
                  >
                    <img
                      src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik05IDkuODZMNS45NjggMTJMOSAxNC4xNHptMS45MDkgNy40NjNhLjUuNSAwIDAgMS0uNjk3LjEybC03LjEzMy01LjAzNWEuNS41IDAgMCAxIDAtLjgxNmw3LjEzMy01LjAzNmEuNS41IDAgMCAxIC43ODguNDA5djEwLjA3YS41LjUgMCAwIDEtLjA5MS4yODhNMTggMTQuMTRWOS44NkwxNC45NjggMTJ6bS01LjkyMS0xLjczMmEuNS41IDAgMCAxIDAtLjgxNmw3LjEzMy01LjAzNmEuNS41IDAgMCAxIC43ODguNDA5djEwLjA3YS41LjUgMCAwIDEtLjc4OC40MDl6Ii8+PC9zdmc+"
                      alt="最小数量"
                      style={{ width: '16px', height: '16px' }}
                    />
                  </button>

                  <input
                    type="number"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    onFocus={(e) => {
                      if (e.target.value === '0') {
                        setSellAmount('');
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        setSellAmount('0');
                      }
                    }}
                    min="0"
                    max={credits[sellingCredit]}
                    style={{
                      width: '120px',
                      padding: '8px 35px',
                      textAlign: 'center',
                      boxSizing: 'border-box'
                    }}
                  />

                  <button
                    onClick={() => setSellAmount(credits[sellingCredit].toString())}
                    title="填入最大卖出数量"
                    style={{
                      position: 'absolute',
                      right: '-10px',
                      top: '0',
                      bottom: '0',
                      background: 'none',
                      // border: 'none',
                      // borderLeft: '1px solid #ddd',
                      // borderRadius: '0 4px 4px 0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 8px',
                      // backgroundColor: '#f8f9fa',
                      zIndex: '1'
                    }}
                  >
                    <img
                      src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik05LjAzMiAxMkw2IDkuODZ2NC4yOHptLTQuMjQ0IDUuNDQzQS41LjUgMCAwIDEgNCAxNy4wMzVWNi45NjVhLjUuNSAwIDAgMSAuNzg4LS40MDlsNy4xMzMgNS4wMzVhLjUuNSAwIDAgMSAwIC44MTd6TTE1IDE0LjE0TDE4LjAzMiAxMkwxNSA5Ljg2em0tMi03LjE3NWEuNS41IDAgMCAxIC43ODgtLjQwOWw3LjEzMyA1LjAzNWEuNS41IDAgMCAxIDAgLjgxN2wtNy4xMzMgNS4wMzVhLjUuNSAwIDAgMS0uNzg4LS40MDh6Ii8+PC9zdmc+"
                      alt="最大数量"
                      style={{ width: '16px', height: '16px' }}
                    />
                  </button>
                </div>

                <button
                  onClick={() => setSellAmount(Math.min(parseInt(sellAmount) + 1, credits[sellingCredit]))}
                  style={{
                    width: '30px',
                    height: '30px',
                    background: 'transparent',
                    color: sellAmount >= credits[sellingCredit] ? '#6c757d' : '#000000',
                    border: 'none',
                    borderRadius: '0 4px 4px 0',
                    cursor: sellAmount >= credits[sellingCredit] ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div className="modal-buttons">
              {walletTypes.map(walletType => {
                const rateSetting = sellRates?.[sellingCredit]?.[walletType] || 1;
                const targetAmount = ((parseFloat(sellAmount) || 0) * rateSetting).toFixed(2);

                return (
                  <button
                    key={walletType}
                    onClick={() => {
                      const parsedTargetAmount = parseFloat(targetAmount);

                      if (parsedTargetAmount === 0 || isNaN(parsedTargetAmount)) {
                        setSellingCredit(null);
                        setSellAmount('');
                      } else {
                        handleSellCredit(sellingCredit, walletType, rateSetting);
                      }
                    }}
                  >
                    卖{targetAmount}{walletType}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {editingCharacter && (
        <div className="edit-credit-modal-overlay">
          <div className="edit-credit-modal" ref={modalRef}>
            <h4>编辑角色信息</h4>

            <div>
              <label>角色名称：</label>
              <input
                type="text"
                value={characterInfo.name}
                onChange={(e) => setCharacterInfo({...characterInfo, name: e.target.value})}
                style={{
                  width: '100%',
                  height: '32px', // 统一高度
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
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
                    flex: 1,
                    width: '100%',
                    height: '32px', // 统一高度
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                />

              </div>

              <div className="character-icon-preview">
                预览: <span className="avatar-icon">{characterInfo.avatar}</span>
              </div>

              {/* 预设图标选择面板 */}
              {showEmojiPicker && (
                <div
                  className="emoji-picker-panel" // 添加类名
                  style={{
                    position: 'absolute',
                    top: '180px',
                    left: '150px',
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '10px',
                    zIndex: 1002, // 提高层级确保在模态框之上
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    maxWidth: '300px'
                  }}
                  // 添加点击事件阻止冒泡，避免触发模态框关闭
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
              <button onClick={async () => {
                try {
                  // 保存角色信息到服务器
                  const response = await fetch(`${CONFIG.API_BASE_URL}/api/character/info`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(characterInfo)
                  });

                  if (response.ok) {
                    onShowStatus('角色信息已更新');
                    onUpdateCredits(); // 刷新数据
                    setEditingCharacter(false);
                  } else {
                    alert('更新角色信息失败');
                  }
                } catch (error) {
                  console.error('保存角色信息时发生错误:', error);
                  alert('网络错误: ' + error.message);
                }
              }}>
                确认
              </button>
              <button onClick={() => setEditingCharacter(false)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 积分编辑模态框 */}
      {editingCredit && (
        <div className="edit-credit-modal-overlay">
          <div className="edit-credit-modal" ref={modalRef}>
            <h4>编辑{editingCredit}</h4>
            <p>当前{editingCredit}：{credits[editingCredit]}</p>

            {/* 积分编辑部分 */}
            <div>
              <label>余额：</label>
              <input
                type="number"
                value={editValues.modify}
                onChange={(e) => setEditValues({...editValues, modify: e.target.value})}
              />
            </div>

            <div>
              <label>新增数值：</label>
              <input
                type="number"
                value={editValues.add}
                onChange={(e) => setEditValues({...editValues, add: e.target.value})}
              />
            </div>

            <div className="modal-buttons">
              <button onClick={async () => {
                try {
                  const encodedCreditType = encodeURIComponent(editingCredit);
                  const originalAmount = credits[editingCredit] || 0;
                  const newAmount = parseFloat(editValues.modify) || 0;
                  const addAmount = parseFloat(editValues.add) || 0;

                  // 步骤1: 更新积分余额（如果有变化）
                  if (newAmount !== originalAmount) {
                    const updateResponse = await fetch(`${CONFIG.API_BASE_URL}/api/credits/${encodedCreditType}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ amount: newAmount })
                    });

                    if (!updateResponse.ok) {
                      const errorText = await updateResponse.text();
                      throw new Error(`更新余额失败: ${updateResponse.status}, ${errorText}`);
                    }

                    const updateResult = await updateResponse.json();
                    console.log('余额更新结果:', updateResult);
                  }

                  // 步骤2: 新增积分值（如果值不为0）
                  if (addAmount !== 0) {
                    const addResponse = await fetch(`${CONFIG.API_BASE_URL}/api/credits/add/${encodedCreditType}/${addAmount}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });

                    if (!addResponse.ok) {
                      const errorText = await addResponse.text();
                      throw new Error(`新增失败: ${addResponse.status}, ${errorText}`);
                    }

                    const addResult = await addResponse.json();
                    console.log('新增结果:', addResult);
                  }

                  // 显示成功消息并更新界面
                  onShowStatus(`${editingCredit}已更新`);
                  onUpdateCredits();
                  setEditingCredit(null);
                } catch (error) {
                  console.error('保存时发生错误:', error);
                  alert('保存时发生错误: ' + error.message);
                }
              }}>
                确认
              </button>
              {/*<button onClick={async () => {*/}
              {/*  try {*/}
              {/*    // 对积分类型名称进行URL编码*/}
              {/*    const encodedCreditType = encodeURIComponent(editingCredit);*/}

              {/*    // 保存积分数据*/}
              {/*    const response = await fetch(`${CONFIG.API_BASE_URL}/api/credits/${encodedCreditType}`, {*/}
              {/*      method: 'PUT',*/}
              {/*      headers: { 'Content-Type': 'application/json' },*/}
              {/*      body: JSON.stringify({*/}
              {/*        amount: parseFloat(editValues.modify),*/}
              {/*        add: parseFloat(editValues.add)*/}
              {/*      })*/}
              {/*    });*/}

              {/*    const result = await response.json();*/}

              {/*    if (response.ok) {*/}
              {/*      onShowStatus(result.message);*/}
              {/*      onUpdateCredits();*/}
              {/*      setEditingCredit(null);*/}
              {/*    } else {*/}
              {/*      alert(result.error);*/}
              {/*    }*/}
              {/*  } catch (error) {*/}
              {/*    console.error('保存积分时发生错误:', error);*/}
              {/*    alert('网络错误: ' + error.message);*/}
              {/*  }*/}
              {/*}}>*/}
              {/*  确认*/}
              {/*</button>*/}
              <button onClick={() => setEditingCredit(null)}>取消</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default CharacterTab;
