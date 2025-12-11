// src/utils/taskUtils.js
import CONFIG from '../config';

export const createTaskDirectly = async (input, {
  onShowStatus,
  addLog,
  codeSettings,
  characterSettings,
  taskFieldMappings,
  stats,
  onAddTask,
  expFormulas // 添加经验值公式参数
}) => {
  try {
    // 解析输入字符串
    const parts = input.split('$');
    const taskName = parts[0] ? parts[0].trim() : '';

    // 构建任务数据
    const taskData = {
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
      exp_reward: 0,
      notes: '', // 添加备注字段
      tags: []   // 添加标签字段
    };

    // 提取并处理标签（支持在任务名称中和代码部分之后的标签）
    const tagRegex = /#(\S+?)(?=\s|$|#)/g;
    const tags = [];
    let match;

    // 从整个输入中提取标签
    while ((match = tagRegex.exec(input)) !== null) {
      // 处理可能包含连续#的情况，需要进一步拆分
      const tagContent = match[1];
      if (tagContent.includes('#')) {
        // 如果标签内容中还包含#，需要进一步分割
        const subTags = tagContent.split('#').filter(subTag => subTag.length > 0);
        subTags.forEach(subTag => {
          tags.push(`#${subTag}`);
        });
      } else {
        tags.push(`#${tagContent}`);
      }
    }

    // 将标签添加到 notes 和 tags 字段
    if (tags.length > 0) {
      taskData.notes = tags.join(' ');
      taskData.tags = [...tags]; // 创建副本以避免引用问题
    }

    // 清理任务名称，移除标签部分
    let cleanTaskName = taskName.replace(/#\S+/g, '').trim();
    taskData.name = cleanTaskName;

    // 解析各字段的代码
    if (parts.length > 1) {
      // 将所有分隔符统一替换为空格，然后分割
      const codesString = parts.slice(1).join(' ');
      // 从代码部分移除标签
      const codesWithoutTags = codesString.replace(/#\S+/g, '');
      // 支持多种分隔符：空格、逗号、中文逗号，但排除标签
      const codes = codesWithoutTags.split(/[\s,，]+/)
        .map(code => code.trim())
        .filter(code => code.length > 0 && !code.startsWith('#')); // 过滤掉标签

      // 应用代码映射
      codes.forEach(code => {
        applyFieldCode(taskData, code, codeSettings);
      });
    }

    // 计算积分奖励和经验值
    const rewards = calculateTaskRewards(taskData, {
      characterSettings,
      taskFieldMappings,
      stats,
      expFormulas // 传递经验值公式
    });
    taskData.credits_reward = rewards.credits_reward;
    taskData.exp_reward = rewards.exp_reward;

    // 发送 API 请求创建任务
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });

    if (response.ok) {
      const result = await response.json();
      if (onShowStatus) onShowStatus(result.message || '任务创建成功');
      if (addLog) addLog('任务', '任务创建', result.message || '任务创建成功');
      if (onAddTask) onAddTask(); // 刷新任务列表
      return { success: true, message: result.message || '任务创建成功' };
    } else {
      const result = await response.json();
      if (onShowStatus) onShowStatus(result.error || '任务创建失败');
      if (addLog) addLog('任务', '创建失败', result.error || '任务创建失败');
      return { success: false, error: result.error || '任务创建失败' };
    }
  } catch (error) {
    console.error('创建任务时发生错误:', error);
    const errorMessage = '网络错误，任务创建失败';
    if (onShowStatus) onShowStatus(errorMessage);
    return { success: false, error: errorMessage };
  }
};

// 应用字段代码的辅助函数（与TaskSystem.js中保持一致）
const applyFieldCode = (formData, code, codeSettings) => {
  // 使用传入的 codeSettings props
  const currentCodeSettings = codeSettings;

  // 确保 codeSettings 存在且有正确的结构
  if (!currentCodeSettings) {
    console.log('codeSettings 不存在');
    return;
  }

  // 特殊处理最大重复次数，现在只要是一个整数就处理为max_completions
  const num = parseInt(code);
  if (!isNaN(num) && num > 0) {
    formData.max_completions = num;
    console.log(`设置最大重复次数为 ${num}`);
    return;
  }

  // 检查所有字段映射是否为空
  const isEmptyMapping = Object.values(currentCodeSettings).every(mapping =>
    !mapping || Object.keys(mapping).length === 0
  );

  if (isEmptyMapping) {
    console.log('警告：所有字段代码映射均为空，请检查设置是否正确加载');
    return;
  }

  // 遍历所有字段类型
  for (const [field, mappings] of Object.entries(currentCodeSettings)) {
    // 确保 mappings 存在且不为空
    if (!mappings || Object.keys(mappings).length === 0) {
      console.log(`字段类型 ${field} 的映射为空`);
      continue;
    }

    try {
      // 遍历该字段类型的所有值和代码映射
      for (const [value, shortcutCode] of Object.entries(mappings)) {
        // 如果代码匹配
        if (shortcutCode === code) {
          // 根据字段类型设置相应的表单字段
          switch (field) {
            case 'categories':
              formData.category = value;
              console.log(`设置类别为 ${value}`);
              break;
            case 'domains':
              formData.domain = value;
              console.log(`设置领域为 ${value}`);
              break;
            case 'priorities':
              formData.priority = value;
              console.log(`设置优先级为 ${value}`);
              break;
            case 'cycleTypes':
              formData.task_type = value;
              console.log(`设置循环周期为 ${value}`);
              break;
            default:
              console.log(`未知字段类型: ${field}`);
          }
          return; // 找到匹配项后退出
        }
      }
    } catch (error) {
      console.error(`处理字段 ${field} 时出错:`, error);
    }
  }

  console.log(`未找到代码 "${code}" 的映射`);
};

// 获取字段权重的辅助函数
const getFieldWeight = (fieldType, fieldValue, taskFieldMappings) => {
  const fieldMappingKey = {
    'category': 'categories',
    'domain': 'domains',
    'priority': 'priorities',
    'status': 'statuses'
  }[fieldType] || fieldType;
  console.log(`获取字段 ${fieldType} 的值为 ${fieldValue}`);
  console.log(`获取字段映射键: ${fieldMappingKey}`)
  console.log(`获取字段映射配置: ${taskFieldMappings}`);
  console.log(`获取权值结果: ${taskFieldMappings[fieldMappingKey][fieldValue].weight}`);

  if (fieldMappingKey && taskFieldMappings?.[fieldMappingKey]?.[fieldValue]?.weight) {
    // console.log(`获取字段 ${fieldType} 的权值为 ${taskFieldMappings[fieldMappingKey][fieldValue].weight}`);
    return taskFieldMappings[fieldMappingKey][fieldValue].weight;
  }
  return 1; // 默认权重为1
};


// 计算任务经验值奖励的辅助函数（与TaskTab中保持一致）
const calculateTaskExpReward = (task, { stats, expFormulas, taskFieldMappings }) => {
  if (!expFormulas) {
    return 10; // 默认经验奖励
  }

  try {
    const categoryWeight = task.category ? getFieldWeight('categories', task.category, taskFieldMappings) : 1;
    const domainWeight = task.domain ? getFieldWeight('domains', task.domain, taskFieldMappings) : 1;
    const priorityWeight = task.priority ? getFieldWeight('priorities', task.priority, taskFieldMappings) : 1;
    console.log(`字段权重: ${categoryWeight} * ${domainWeight} * ${priorityWeight}`)


    // 获取角色当前等级
    const level = stats?.level || 1;

    // 获取经验倍率设置
    const expMultiplier = expFormulas.taskExpMultiplier || 1;
    const expCoefficient = expFormulas.taskExpCoefficient || 0.3;

    // 计算经验结果
    const expResult = expMultiplier * (expCoefficient * level**2 + categoryWeight * domainWeight * priorityWeight * level + 10);
    console.log(`任务 ${task.name} 的经验奖励为 ${expResult}=${expMultiplier}*(${expCoefficient}*${level}**2+${categoryWeight}*${domainWeight}*${priorityWeight}*${level}+10)}`);

    return Math.max(1, Math.round(expResult)); // 至少为1
  } catch (e) {
    console.error("公式计算错误:", e);
    // 如果公式错误，返回默认值
    return 10;
  }
};


// 计算任务奖励的辅助函数
// 任务奖励属性值：(A+B+C) * Level^0.5
// 任务奖励经验值： k * (a*Level^2 + A*B*C*Level + 10)
const calculateTaskRewards = (taskData, { characterSettings, taskFieldMappings, stats, expFormulas }) => {
  const rewards = {
    credits_reward: {},
    exp_reward: 0
  };

  try {
    // 获取积分类型
    const getCreditTypeForDomain = (domain) => {
      if (characterSettings) {
        const matchedSetting = characterSettings.find(
          item => item.domain === domain
        );

        if (matchedSetting && matchedSetting.creditType) {
          return matchedSetting.creditType;
        }
      }

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

    const level = stats?.level || 1;

    // 计算积分奖励
    const categoryWeight = taskData.category ? getFieldWeight('categories', taskData.category, taskFieldMappings) : 1;
    const domainWeight = taskData.domain ? getFieldWeight('domains', taskData.domain,taskFieldMappings) : 1;
    const priorityWeight = taskData.priority ? getFieldWeight('priorities', taskData.priority,taskFieldMappings) : 1;

    const calculatedPoints = level ** 0.5 * (categoryWeight + domainWeight + priorityWeight);
    const finalPoints = Math.max(1, Math.round(calculatedPoints));

    const creditType = getCreditTypeForDomain(taskData.domain);
    rewards.credits_reward[creditType] = finalPoints;

    // 计算经验值奖励（使用与TaskTab一致的函数）
    rewards.exp_reward = calculateTaskExpReward(taskData, { stats, expFormulas,taskFieldMappings });

  } catch (e) {
    console.error("奖励计算错误:", e);
    rewards.credits_reward = {"骨贝": 1};
    rewards.exp_reward = 10;
  }

  return rewards;
};
