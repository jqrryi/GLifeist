// src/utils/levelUtils.js

/**
 * 计算角色等级和经验相关信息
 * @param {Object} stats - 角色统计数据
 * @param {Object} expFormulas - 经验公式配置
 * @returns {Object} 包含等级和经验信息的对象
 */
export const calculateLevelAndExp = (stats, expFormulas) => {
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

/**
 * 计算属性等级相关信息
 * @param {number} propertyValue - 属性值
 * @param {string} propertyType - 属性类型
 * @param {Object} expFormulas - 经验公式配置
 * @returns {Object} 包含属性等级信息的对象
 */
export const calculatePropertyLevel = (propertyValue, propertyType, expFormulas) => {
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

/**
 * 获取等级对应的境界信息
 * @param {number} level - 等级
 * @param {Array} levelToRealm - 等级境界映射数据
 * @returns {Object|null} 境界信息对象或null
 */
export const getLevelRealm = (level, levelToRealm) => {
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

/**
 * 获取属性值对应的境界信息
 * @param {number} propertyLevel - 属性值
 * @param {string} propertyType - 属性类型
 * @param {Array} propertyToRealm - 属性境界映射数据
 * @param {Function} getPropertyCategoryInfo - 获取属性分类信息的函数
 * @returns {Object|null} 境界信息对象或null
 */
export const getPropertyRealm = (propertyLevel, propertyType, propertyToRealm, getPropertyCategoryInfo) => {
  if (!propertyToRealm || propertyToRealm.length === 0) return null;

  // 查找属性类别
  const propertyInfo = getPropertyCategoryInfo(propertyType);

  if (!propertyInfo) return null;

  const realm = propertyToRealm.find(item => {
    const start = parseInt(item['起始等级'], 10);
    const end = parseInt(item['结束等级'], 10);

    return propertyInfo.domain === item['领域'] &&
           propertyLevel >= start && propertyLevel <= end;
  });

  return realm ? {
    name: realm['境界'],
    description: realm['描述']
  } : null;
};


// 获取属性类别映射信息
export const findInCharacterSettings = (characterSettings,searchValue,searchType="creditType") => {
  if (characterSettings) {
    // 查找匹配的设置项
    return characterSettings.find(
      item => item[searchType] === searchValue
    );

    // if (setting && setting.propertyCategory) {
    //   return {
    //     creditType: setting.creditType,
    //     propertyCategory: setting.propertyCategory,
    //     icon: setting.icon || "🔥",
    //     creditIcon: setting.creditIcon || "🌟",
    //     color: setting.color || "#666666",
    //     domain: setting.domain,
    //   };
    // }
  }
  return null;
};