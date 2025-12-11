// src/components/MarkdownEditor.js
import React, { useState, useEffect, useRef, userCallback} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkToc from 'remark-toc';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './MarkDownEditor.css';
import rehypeRaw from 'rehype-raw';
import CONFIG from '../config';
import {useLogs} from "../contexts/LogContext";
import { createTaskDirectly } from '../utils/taskUtils';
import TagIndexManager from '../utils/TagIndexManager';
import SettingsModal from "./SettingsModal";

// 在组件顶部添加设备检测hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      setIsMobile(mobileRegex.test(userAgent));
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
};

// 自定义remark插件处理对齐容器
const remarkAlign = () => {
  const transform = (tree) => {
    const visit = (node, index, parent) => {
      if (node.type === 'text') {
        const alignRegex = /:::\s*(align-\w+)\n([\s\S]*?)\n:::/g;
        let match;
        let lastIndex = 0;
        const newChildren = [];

        while ((match = alignRegex.exec(node.value)) !== null) {
          // 添加匹配前的文本
          if (match.index > lastIndex) {
            const beforeText = node.value.substring(lastIndex, match.index);
            if (beforeText) {
              newChildren.push({
                type: 'text',
                value: beforeText
              });
            }
          }

          // 对内容进行HTML转义，防止解析错误
          const content = match[2];
          const escapedContent = content
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          // 添加对齐容器节点
          newChildren.push({
            type: 'html',
            value: `<div class="${match[1]}">${escapedContent}</div>`
          });

          lastIndex = match.index + match[0].length;
        }

        // 添加剩余文本
        if (lastIndex < node.value.length) {
          const afterText = node.value.substring(lastIndex);
          if (afterText) {
            newChildren.push({
              type: 'text',
              value: afterText
            });
          }
        }

        // 如果有替换内容，则替换原节点
        if (newChildren.length > 0) {
          parent.children.splice(index, 1, ...newChildren);
        }
      }

      if (node.children) {
        node.children.forEach((child, index) => {
          visit(child, index, node);
        });
      }
    };

    visit(tree);
    return tree;
  };

  return transform;
};

const MarkdownEditor = ({
  initialValue = '',
  onChange,
  onSave,
  onCancel,
  fileName = '未命名文件',
  onFileSave,
  currentField,
  mdEditorClassNameSuffix='',
  embedded=false,
  onShowStatus,
  autoSaveInterval=10000,
  codeSettings = {
    categories: {},
    domains: {},
    priorities: {},
    cycleTypes: {}
  },
  stats={},
  characterSettings= [],
  taskFieldMappings = {},
  expFormulas={},
  quickAddTaskHint,
  defaultViewMode = 'split', // 'split', 'split-vertical', 'split-horizontal', 'preview', 'edit'
  externalSplitDirection = 'vertical', // 'vertical' 或 'horizontal'
  customDomain='',
  settings,
  onUpdateSettings,
}) => {
  const [content, setContent] = useState(initialValue);
  const [history, setHistory] = useState([initialValue]); // 历史记录
  const [historyIndex, setHistoryIndex] = useState(0); // 当前历史索引
  const [isPreview, setIsPreview] = useState(embedded ? false : false);
  const [isSplitView, setIsSplitView] = useState(embedded ? false : true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef(null);
  const isMobile = useIsMobile();
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const overflowMenuRef = useRef(null);
  const overflowToggleRef = useRef(null);
  const lastFocusedFileRef = useRef(null); // 记录上次聚焦的文件ID
  const focusTimeoutRef = useRef(null); // 聚焦超时引用
  const lastSavedContentRef = useRef(initialValue); // 用于跟踪上次保存的内容
  // 如果需要从外部加载初始值
  // 在 MarkdownEditor 组件中添加状态来跟踪任务创建反馈

  const editorPaneRef = useRef(null);
  const previewPaneRef = useRef(null);
  const isSyncingScroll = useRef(false);

  const [taskCreationFeedback, setTaskCreationFeedback] = useState('');

  const [splitDirection, setSplitDirection] = useState(embedded ? 'horizontal' : externalSplitDirection);
  const { addLog } = useLogs();
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageAltText, setImageAltText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState(false);
  const imageCache = new Map();
  const [showTagList, setShowTagList] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const responsiveClassName = ((baseClassName, isMobile) =>
    isMobile ? `${baseClassName}-mobile` : `${baseClassName}-desktop`
  )(mdEditorClassNameSuffix, isMobile);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);



  // 添加 ESC 键事件处理
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key !== 'Escape') return;

      // 第一优先级：关闭模态框
      if (showLinkModal) {
        setShowLinkModal(false);
        setLinkText('');
        setLinkUrl('');
        e.preventDefault();
        return;
      }

      if (showImageModal) {
        setShowImageModal(false);
        setImageAltText('');
        setImageUrl('');
        e.preventDefault();
        return;
      }

      if (showTagList) {
        setShowTagList(false);
        e.preventDefault();
        return;
      }

      // 第二优先级：退出聚焦状态
      if (textareaRef.current && textareaRef.current === document.activeElement) {
        textareaRef.current.blur();
        e.preventDefault();
        return;
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showLinkModal, showImageModal, showTagList]);

  // 在 MarkdownEditor.js 中添加 Enter 键聚焦处理
  // 在 MarkdownEditor.js 中添加详细的 Enter 键聚焦处理
  useEffect(() => {
    const handleKeyDown = (e) => {


      // 检查是否按下了 Enter 键，并且没有其他修饰键
      if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {

        // 检查当前是否没有输入框聚焦
        const activeElement = document.activeElement;


        const isInputFocused = activeElement.tagName === 'INPUT' ||
                              activeElement.tagName === 'TEXTAREA' ||
                              activeElement.contentEditable === 'true';


        // 检查是否有模态框打开
        const modalElement = document.querySelector('.modal-overlay');
        const isModalOpen = modalElement !== null;


        // 只有在没有输入框聚焦且没有模态框打开时才处理
        if (!isModalOpen && !isInputFocused) {
          e.preventDefault();
          e.stopPropagation();

          // 聚焦到编辑器文本区域
          if (textareaRef.current) {
            textareaRef.current.focus();

            // 将光标移到内容末尾
            const contentLength = content.length;
            textareaRef.current.setSelectionRange(contentLength, contentLength);
          }
        }
      }
    };

    // 在组件挂载时添加事件监听器
    document.addEventListener('keydown', handleKeyDown, true);

    // 清理函数
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [content]); // 依赖 content 状态

  useEffect(() => {
    setContent(initialValue);
    // 更新最后保存的内容引用
    lastSavedContentRef.current = initialValue;
    // 重置历史记录当初始值改变时
    setHistory([initialValue]);
    setHistoryIndex(0);
  }, [initialValue]);

  // 在 MarkdownEditor 组件中添加 useEffect 来监听聚焦事件
  useEffect(() => {
    const focusEditor = (event) => {
      // 检查是否是针对当前文件的聚焦请求
      const fileId = event.detail?.fileId;

      // 如果有文件ID，检查是否与上次聚焦的文件相同
      if (fileId) {
        // 如果是同一个文件，不重复聚焦
        if (lastFocusedFileRef.current === fileId) {
          return;
        }
        // 更新最后聚焦的文件ID
        lastFocusedFileRef.current = fileId;
      }

      // 清除之前的聚焦超时
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }

      // 延迟聚焦以确保DOM已更新
      focusTimeoutRef.current = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // 将光标移到内容末尾
          const contentLength = content.length;
          textareaRef.current.setSelectionRange(contentLength, contentLength);
        }
      }, 100);
    };

    // 监听自定义的聚焦事件
    window.addEventListener('focusMarkdownEditor', focusEditor);

    // 组件卸载时移除事件监听
    return () => {
      window.removeEventListener('focusMarkdownEditor', focusEditor);
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [content]); // 依赖 content 以确保在内容更新后能正确聚焦


  // 处理点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOverflowMenuOpen &&
          overflowMenuRef.current &&
          overflowToggleRef.current &&
          !overflowMenuRef.current.contains(event.target) &&
          !overflowToggleRef.current.contains(event.target)) {
        setIsOverflowMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOverflowMenuOpen]);

  // 自动保存功能
  useEffect(() => {
    // 如果没有设置自动保存间隔或没有保存函数，则不启用自动保存
    if (!autoSaveInterval || autoSaveInterval <= 0 ||
        (!onFileSave && !onSave)) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        // 检查内容是否有变化
        if (content !== lastSavedContentRef.current) {
          // 优先使用 onFileSave（文件系统保存）
          if (onFileSave && typeof onFileSave === 'function') {
            await onFileSave(content, fileName);
            // 更新最后保存的内容
            lastSavedContentRef.current = content;
            console.log('文件已自动保存');
            return;
          }

          // 其次使用 onSave（通用保存回调）
          if (onSave && typeof onSave === 'function') {
            await onSave(content);
            // 更新最后保存的内容
            lastSavedContentRef.current = content;
            console.log('内容已自动保存');
            return;
          }
        }
      } catch (error) {
        console.error('自动保存失败:', error);
      }
    }, autoSaveInterval);

    // 清理函数
    return () => {
      clearInterval(intervalId);
    };
  }, [content, fileName, onFileSave, onSave, autoSaveInterval]); // 移除 initialValue 依赖


  // useEffect(() => {
  //   if (!content || !currentField) return;
  //
  //   const handleTagClick = (e) => {
  //     // 检查点击的元素是否有标签属性
  //     const tagElement = e.target.closest('[data-markdown-tag="true"]');
  //     if (tagElement && (currentField === 'calendar-log' || currentField === 'note-editor')) {
  //       e.stopPropagation();
  //       const tagValue = tagElement.getAttribute('data-tag-value');
  //       if (tagValue) {
  //         // 发送自定义事件到 TaskTab
  //         const event = new CustomEvent('markdownTagClick', {
  //           detail: {
  //             tag: tagValue,
  //             field: currentField
  //           }
  //         });
  //         window.dispatchEvent(event);
  //       }
  //     }
  //   };
  //
  //   // 只在预览区域添加事件监听器
  //   const previewPane = document.querySelector('.preview-pane') || document.querySelector('.preview');
  //   if (previewPane) {
  //     previewPane.addEventListener('click', handleTagClick);
  //
  //     // 清理函数
  //     return () => {
  //       previewPane.removeEventListener('click', handleTagClick);
  //     };
  //   }
  // }, [content, currentField]);
  //
  // useEffect(() => {
  //   if (!content || !currentField) return;
  //
  //   const handleTagClick = (e) => {
  //     // 检查点击的元素是否有标签属性
  //     const tagElement = e.target.closest('[data-markdown-tag="true"]');
  //     if (tagElement && (currentField === 'calendar-log' || currentField === 'note-editor')) {
  //       e.stopPropagation();
  //       const tagValue = tagElement.getAttribute('data-tag-value');
  //       if (tagValue) {
  //         // 发送自定义事件到 TaskTab
  //         const event = new CustomEvent('markdownTagClick', {
  //           detail: {
  //             tag: tagValue,
  //             field: currentField
  //           }
  //         });
  //         window.dispatchEvent(event);
  //       }
  //     }
  //   };
  //
  //   // 使用事件委托，在 document 上监听点击事件
  //   document.addEventListener('click', handleTagClick);
  //
  //   // 清理函数
  //   return () => {
  //     document.removeEventListener('click', handleTagClick);
  //   };
  // }, [content, currentField]);

  // // 标签点击处理
  // useEffect(() => {
  //   const handleTagClick = (event) => {
  //     // 检查点击的元素是否为标签
  //     if (event.target.classList.contains('markdown-tag')) {
  //       const tag = event.target.textContent;
  //       // 通知 FileExplorer 组件进行标签搜索
  //       window.dispatchEvent(new CustomEvent('tagSearchRequested', {
  //         detail: { tag }
  //       }));
  //     }
  //   };
  //
  //   // 使用事件委托监听标签点击
  //   document.addEventListener('click', handleTagClick);
  //
  //   return () => {
  //     document.removeEventListener('click', handleTagClick);
  //   };
  // }, []);


  useEffect(() => {
    const handleTagClick = (e) => {
      // 检查点击的元素是否为标签
      let tagValue = null;

      // 优先检查 data 属性标签（预览区域生成的标签）
      const dataTagElement = e.target.closest('[data-markdown-tag="true"]');
      if (dataTagElement) {
        tagValue = dataTagElement.getAttribute('data-tag-value');
      }
      // 检查编辑器中的标签（.markdown-tag 类）
      else if (e.target.classList.contains('markdown-tag')) {
        tagValue = e.target.textContent;
      }

      if (tagValue && (currentField === 'note-editor' || currentField === 'calendar-log')) {
        e.preventDefault();
        e.stopPropagation();

        // 通知 FileExplorer 组件进行标签搜索
        window.dispatchEvent(new CustomEvent('tagSearchRequested', {
          detail: { tag: tagValue }
        }));
      }
    };

    // 使用事件委托监听整个文档的点击事件
    document.addEventListener('click', handleTagClick, true);

    return () => {
      document.removeEventListener('click', handleTagClick, true);
    };
  }, [currentField]);



  useEffect(() => {
    if (embedded && !isFullscreen) {
      // 在嵌入模式且非全屏状态下根据 defaultViewMode 设置视图
      switch (defaultViewMode) {
        case 'preview':
          setIsPreview(true);
          setIsSplitView(false);
          break;
        case 'edit':
          setIsPreview(false);
          setIsSplitView(false);
          break;
        case 'split':
          setIsPreview(false);
          setIsSplitView(true);
          setSplitDirection(externalSplitDirection); // 使用外部传入的分屏方向
          break;
        default:
          // 默认行为保持不变
          setIsPreview(false);
          setIsSplitView(true);
          setSplitDirection('vertical');
      }
    }
  }, [embedded, isFullscreen, defaultViewMode, externalSplitDirection]);

  useEffect(() => {
    const handleSetFullscreen = (event) => {
      const { fullscreen } = event.detail;
      setIsFullscreen(fullscreen);
    };

    window.addEventListener('setMarkdownEditorFullscreen', handleSetFullscreen);

    return () => {
      window.removeEventListener('setMarkdownEditorFullscreen', handleSetFullscreen);
    };
  }, []);

  // 在 MarkdownEditor 组件中添加 useEffect 来监听全屏状态变化
  useEffect(() => {
    // 只有当 mdEditorClassNameSuffix 为 "task-notes-editor" 时才发送通知
    if (mdEditorClassNameSuffix === 'task-notes-editor') {
      // 发送自定义事件通知 TaskTab 组件全屏状态变化
      window.dispatchEvent(new CustomEvent('markdownEditorFullscreenChange', {
        detail: {
          isFullscreen,
          editorType: mdEditorClassNameSuffix
        }
      }));
    }
  }, [isFullscreen, mdEditorClassNameSuffix]);


  const syncScroll_old = (sourceElement, targetElement) => {
    if (isSyncingScroll.current) return;

    isSyncingScroll.current = true;

    const sourceScrollTop = sourceElement.scrollTop;
    const sourceScrollHeight = sourceElement.scrollHeight;
    const sourceClientHeight = sourceElement.clientHeight;

    const targetScrollHeight = targetElement.scrollHeight;
    const targetClientHeight = targetElement.clientHeight;

    // 计算内容的实际高度（不包括 padding/margin）
    const sourceContentHeight = sourceScrollHeight - sourceClientHeight;
    const targetContentHeight = targetScrollHeight - targetClientHeight;

    // 如果任一内容高度为0，无法计算比例
    if (sourceContentHeight <= 0 || targetContentHeight <= 0) {
      isSyncingScroll.current = false;
      return;
    }

    // 计算滚动比例并应用到目标元素
    const scrollRatio = sourceScrollTop / sourceContentHeight;
    const targetScrollTop = scrollRatio * targetContentHeight;

    targetElement.scrollTop = targetScrollTop;

    // 使用setTimeout确保状态重置
    setTimeout(() => {
      isSyncingScroll.current = false;
    }, 0);
  };


  const syncScroll = (sourceElement, targetElement, sourceType) => {
    if (isSyncingScroll.current) return;

    isSyncingScroll.current = true;

    try {
      let sourceScrollTop, sourceScrollHeight, sourceClientHeight;

      if (sourceType === 'editor') {
        // 对于编辑器，我们需要获取 textarea 的滚动信息
        const textarea = sourceElement.querySelector('.markdown-textarea');
        if (!textarea) {
          isSyncingScroll.current = false;
          return;
        }
        sourceScrollTop = textarea.scrollTop;
        sourceScrollHeight = textarea.scrollHeight;
        sourceClientHeight = textarea.clientHeight;
      } else {
        // 对于预览面板，直接获取滚动信息
        sourceScrollTop = sourceElement.scrollTop;
        sourceScrollHeight = sourceElement.scrollHeight;
        sourceClientHeight = sourceElement.clientHeight;
      }

      const targetScrollHeight = targetElement.scrollHeight;
      const targetClientHeight = targetElement.clientHeight;

      // 如果源元素内容未溢出，则目标元素也滚动到顶部
      if (sourceScrollHeight <= sourceClientHeight) {
        targetElement.scrollTop = 0;
        return;
      }

      // 计算滚动百分比
      const scrollPercentage = sourceScrollTop / (sourceScrollHeight - sourceClientHeight);

      // 应用到目标元素
      const targetScrollTop = scrollPercentage * (targetScrollHeight - targetClientHeight);

      // 设置目标元素滚动位置
      if (!isNaN(targetScrollTop) && isFinite(targetScrollTop)) {
        targetElement.scrollTop = Math.max(0, Math.min(targetScrollTop, targetScrollHeight - targetClientHeight));
      }
    } catch (error) {
      console.warn('滚动同步出错:', error);
    } finally {
      // 确保状态重置
      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  };


  // 修复垂直分屏滚动同步的 useEffect
  useEffect(() => {
    if (!isSplitView || splitDirection !== 'vertical') return;

    // 确保 DOM 元素存在
    const editorPane = editorPaneRef.current;
    const previewPane = previewPaneRef.current;

    if (!editorPane || !previewPane) {
      console.log('编辑器或预览面板未就绪');
      return;
    }

    // 获取 textarea 元素
    const textarea = editorPane.querySelector('.markdown-textarea');
    if (!textarea) {
      console.log('文本区域未找到');
      return;
    }

    let syncTimeout;

    const handleEditorScroll = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;

      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        try {
          const editorScrollTop = textarea.scrollTop;
          const editorScrollHeight = textarea.scrollHeight;
          const editorClientHeight = textarea.clientHeight;

          const previewScrollHeight = previewPane.scrollHeight;
          const previewClientHeight = previewPane.clientHeight;

          if (editorScrollHeight <= editorClientHeight) {
            previewPane.scrollTop = 0;
          } else {
            const scrollRatio = editorScrollTop / (editorScrollHeight - editorClientHeight);
            const previewScrollTop = scrollRatio * (previewScrollHeight - previewClientHeight);
            previewPane.scrollTop = Math.max(0, Math.min(previewScrollTop, previewScrollHeight - previewClientHeight));
          }
        } catch (error) {
          console.warn('编辑器滚动同步错误:', error);
        } finally {
          isSyncingScroll.current = false;
        }
      }, 10);
    };

    const handlePreviewScroll = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;

      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        try {
          const previewScrollTop = previewPane.scrollTop;
          const previewScrollHeight = previewPane.scrollHeight;
          const previewClientHeight = previewPane.clientHeight;

          const editorScrollHeight = textarea.scrollHeight;
          const editorClientHeight = textarea.clientHeight;

          if (previewScrollHeight <= previewClientHeight) {
            textarea.scrollTop = 0;
          } else {
            const scrollRatio = previewScrollTop / (previewScrollHeight - previewClientHeight);
            const editorScrollTop = scrollRatio * (editorScrollHeight - editorClientHeight);
            textarea.scrollTop = Math.max(0, Math.min(editorScrollTop, editorScrollHeight - editorClientHeight));
          }
        } catch (error) {
          console.warn('预览滚动同步错误:', error);
        } finally {
          isSyncingScroll.current = false;
        }
      }, 10);
    };

    // 绑定事件监听器
    textarea.addEventListener('scroll', handleEditorScroll);
    previewPane.addEventListener('scroll', handlePreviewScroll);

    // 清理函数
    return () => {
      clearTimeout(syncTimeout);
      textarea.removeEventListener('scroll', handleEditorScroll);
      previewPane.removeEventListener('scroll', handlePreviewScroll);
      isSyncingScroll.current = false; // 重置同步状态
    };
  }, [isSplitView, splitDirection, content, fileName, initialValue]); // 添加 fileName 和 initialValue 作为依赖项

  // 修复水平分屏滚动同步的 useEffect
  useEffect(() => {
    if (!isSplitView || splitDirection !== 'horizontal') return;

    // 确保 DOM 元素存在
    const editorPane = editorPaneRef.current;
    const previewPane = previewPaneRef.current;

    if (!editorPane || !previewPane) {
      console.log('编辑器或预览面板未就绪');
      return;
    }

    // 获取 textarea 元素
    const textarea = editorPane.querySelector('.markdown-textarea');
    if (!textarea) {
      console.log('文本区域未找到');
      return;
    }

    let syncTimeout;

    const handleEditorScroll = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;

      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        try {
          const editorScrollTop = textarea.scrollTop;
          const editorScrollHeight = textarea.scrollHeight;
          const editorClientHeight = textarea.clientHeight;

          const previewScrollHeight = previewPane.scrollHeight;
          const previewClientHeight = previewPane.clientHeight;

          if (editorScrollHeight <= editorClientHeight) {
            previewPane.scrollTop = 0;
          } else {
            const scrollRatio = editorScrollTop / (editorScrollHeight - editorClientHeight);
            const previewScrollTop = scrollRatio * (previewScrollHeight - previewClientHeight);
            previewPane.scrollTop = Math.max(0, Math.min(previewScrollTop, previewScrollHeight - previewClientHeight));
          }
        } catch (error) {
          console.warn('水平编辑器滚动同步错误:', error);
        } finally {
          isSyncingScroll.current = false;
        }
      }, 10);
    };

    const handlePreviewScroll = () => {
      if (isSyncingScroll.current) return;
      isSyncingScroll.current = true;

      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        try {
          const previewScrollTop = previewPane.scrollTop;
          const previewScrollHeight = previewPane.scrollHeight;
          const previewClientHeight = previewPane.clientHeight;

          const editorScrollHeight = textarea.scrollHeight;
          const editorClientHeight = textarea.clientHeight;

          if (previewScrollHeight <= previewClientHeight) {
            textarea.scrollTop = 0;
          } else {
            const scrollRatio = previewScrollTop / (previewScrollHeight - previewClientHeight);
            const editorScrollTop = scrollRatio * (editorScrollHeight - editorClientHeight);
            textarea.scrollTop = Math.max(0, Math.min(editorScrollTop, editorScrollHeight - editorClientHeight));
          }
        } catch (error) {
          console.warn('水平预览滚动同步错误:', error);
        } finally {
          isSyncingScroll.current = false;
        }
      }, 10);
    };

    // 绑定事件监听器
    textarea.addEventListener('scroll', handleEditorScroll);
    previewPane.addEventListener('scroll', handlePreviewScroll);

    // 清理函数
    return () => {
      clearTimeout(syncTimeout);
      textarea.removeEventListener('scroll', handleEditorScroll);
      previewPane.removeEventListener('scroll', handlePreviewScroll);
      isSyncingScroll.current = false; // 重置同步状态
    };
  }, [isSplitView, splitDirection, content, fileName, initialValue]); // 添加 fileName 和 initialValue 作为依赖项





  useEffect(() => {
    // 组件卸载时的清理函数
    return () => {
      // 清理图片缓存
      imageCache.clear();
      // console.log('MarkdownEditor 组件卸载，清理图片缓存');
    };
  }, []); // 空依赖数组确保只在组件挂载和卸载时执行
  //添加 useEffect 来监听滚动事件: 搜索相关


  // 添加新的事件监听器用于选中匹配行
  useEffect(() => {
    const selectMatch = (event) => {
      const { match } = event.detail;
      // 阻止其他焦点事件干扰
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }

      if (!match || !textareaRef.current) {
        console.log('selectMatch: 缺少必要参数或textarea未就绪');
        return;
      }

      const textarea = textareaRef.current;
      const content = textarea.value || '';

      if (typeof content !== 'string') {
        console.log('selectMatch: content 不是有效字符串');
        return;
      }

      try {
        // 找到匹配的段落
        const lines = content.split('\n');
        const targetLineIndex = Math.max(0, match.paragraphIndex || 0);

        // 确保目标行索引有效
        if (targetLineIndex >= lines.length) {
          console.log(`selectMatch: 目标行索引超出范围${targetLineIndex} - ${lines.length}`);
          return;
        }

        // 计算目标行在整个文本中的起始位置
        let position = 0;
        for (let i = 0; i < targetLineIndex; i++) {
          // 加强边界检查
          if (i < lines.length && lines[i] !== undefined) {
            position += lines[i].length + 1; // +1 是因为 \n 分隔符
          } else {
            position += 1; // 至少加上分隔符
          }
        }

        const targetLine = lines[targetLineIndex];
        if (targetLine === undefined) {
          console.log('selectMatch: 无法找到目标行');
          return;
        }

        // 在行中找到匹配词的位置
        const searchTerm = match.context ? match.context.trim() : '';
        let startPos = position;
        let endPos = position + (targetLine?.length || 0);

        if (searchTerm && targetLine && targetLine.includes(searchTerm)) {
          const termIndex = targetLine.indexOf(searchTerm);
          if (termIndex !== -1) {
            startPos = position + termIndex;
            endPos = startPos + searchTerm.length;
          }
        }

        // 使用防干扰的方式选中匹配的文本
        setTimeout(() => {
          if (textareaRef.current) {
            const currentTextarea = textareaRef.current;
            currentTextarea.focus();
            currentTextarea.setSelectionRange(startPos, endPos);

            // 滚动到选中文本位置
            const lineHeight = parseFloat(getComputedStyle(currentTextarea).lineHeight) || 20;
            const linesBefore = content.substring(0, startPos).split('\n').length;
            const scrollPosition = Math.max(0, linesBefore * lineHeight - currentTextarea.clientHeight / 2);
            currentTextarea.scrollTop = scrollPosition;
          }
        }, 50);

      } catch (error) {
        console.error('selectMatch: 处理过程中出错', error);
      }
    };

    window.addEventListener('selectSearchMatch', selectMatch);

    return () => {
      window.removeEventListener('selectSearchMatch', selectMatch);
    };
  }, []);

  // 在 MarkdownEditor 组件中添加 useEffect 来设置全局标签点击处理函数
  // useEffect(() => {
  //   // 设置全局标签点击处理函数
  //   window.handleMarkdownTagClick = (tagValue) => {
  //     // 只有在特定字段中才发送事件
  //     if (currentField === 'calendar-log' || currentField === 'note-editor') {
  //       const event = new CustomEvent('markdownTagClick', {
  //         detail: {
  //           tag: tagValue,
  //           field: currentField
  //         }
  //       });
  //       window.dispatchEvent(event);
  //     }
  //   };
  //
  //   // 清理函数
  //   return () => {
  //     // 移除全局函数
  //     if (window.handleMarkdownTagClick) {
  //       delete window.handleMarkdownTagClick;
  //     }
  //   };
  // }, [currentField]);

  useEffect(() => {
    const handleClick = (e) => {
      // 检查点击的元素是否为可点击的标签
      if (e.target.classList.contains('markdown-tag-clickable')) {
        e.preventDefault();
        e.stopPropagation();

        const tagValue = e.target.getAttribute('data-tag-value');
        if (tagValue && (currentField === 'calendar-log' || currentField === 'note-editor')) {
          // 通知 TaskTab 组件进行标签搜索
          const taskTabEvent = new CustomEvent('markdownTagClick', {
            detail: {
              tag: tagValue,
              field: currentField
            }
          });
          window.dispatchEvent(taskTabEvent);

          // 通知 FileExplorer 组件进行标签搜索
          const fileExplorerEvent = new CustomEvent('tagSearchRequested', {
            detail: { tag: tagValue }
          });
          window.dispatchEvent(fileExplorerEvent);
        }
      }
    };

    // 使用事件委托监听整个文档的点击事件
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [currentField]);




  const remarkNewlineToBreak = () => {
    return (tree) => {
      const transformText = (node) => {
        if (node.type === 'text') {
          // 将文本中的换行符转换为br元素
          const lines = node.value.split('\n');
          if (lines.length > 1) {
            const newChildren = [];
            lines.forEach((line, index) => {
              newChildren.push({ type: 'text', value: line });
              if (index < lines.length - 1) {
                newChildren.push({ type: 'element', tagName: 'br' });
              }
            });
            return newChildren;
          }
        }
        return [node];
      };

      const visit = (node) => {
        if (node.children) {
          const newChildren = [];
          node.children.forEach(child => {
            const transformed = transformText(child);
            newChildren.push(...transformed);
          });
          node.children = newChildren;
          node.children.forEach(visit);
        }
      };

      visit(tree);
      return tree;
    };
  };

  const handleTaskCommand = async (commandText) => {
    // 判断是否在 TaskTab 日历模式下的日志中
    // 可以通过 currentField 或其他方式判断上下文
    // if (currentField && currentField === 'calendar-log') {
    //   // 保持原有的自定义事件触发逻辑
    //   console.log('在 TaskTab 日历模式下的日志中，使用自定义事件触发逻辑')
    //   const event = new CustomEvent('addQuickTask', {
    //     detail: {
    //       command: commandText
    //     }
    //   });
    //   window.dispatchEvent(event);
    // } else {

    // console.log('在笔记组件中直接创建任务')
    // 在笔记组件中直接通过 API 创建任务
    setTaskCreationFeedback('正在创建任务...');

    const result = await createTaskDirectly(commandText, {
      onShowStatus,
      addLog,
      codeSettings,
      characterSettings,
      taskFieldMappings,
      stats,
      expFormulas
    });

    // 设置反馈信息并3秒后清除
    if (result.success) {
      setTaskCreationFeedback('✅ 任务创建成功');
    } else {
      setTaskCreationFeedback('❌ 任务创建失败: ' + result.error);
    }

    // 3秒后清除反馈信息
    setTimeout(() => {
      setTaskCreationFeedback('');
    }, 3000);
      // await createTaskDirectly(commandText, {
      //   onShowStatus,
      //   addLog,
      //   codeSettings,
      //   characterSettings,
      //   taskFieldMappings,
      //   stats,
      //   expFormulas
      // });

    // }
  };

  // 添加直接创建任务的函数
  const createTaskDirectly_old = async (input) => {
    try {
      // 解析输入字符串，支持格式如: "任务名称#c1#d1#p1#t1" 或 "任务名称#c1, d1，p1 t1"
      const parts = input.split('#');
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
        notes: ''
      };

      // 解析各字段的代码
      if (parts.length > 1) {
        // 将所有分隔符统一替换为空格，然后分割
        const codesString = parts.slice(1).join(' ');
        // 支持多种分隔符：空格、逗号、中文逗号
        const codes = codesString.split(/[\s,，]+/)
          .map(code => code.trim())
          .filter(code => code.length > 0);

        // 应用代码映射
        codes.forEach(code => {
          applyFieldCode_old(taskData, code);
        });
      }

      // 计算积分奖励和经验值
      const rewards = calculateTaskRewards_old(taskData);
      taskData.credits_reward = rewards.credits_reward;
      taskData.exp_reward = rewards.exp_reward;
      // console.log("需要更新的taskData: ",taskData)

      // 发送 API 请求创建任务
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('任务创建成功:', result.message);
        alert('任务创建成功');
        addLog('笔记','任务速建', result.message)
        // 显示通知
        if (onShowStatus) {
          onShowStatus(result.message || '任务创建成功');
        }
      } else {
        const result = await response.json();
        console.error('任务创建失败:', result.error);
        addLog('笔记','速建失败', result.error)
        if (onShowStatus) {
          onShowStatus(result.error || '任务创建失败');
        }
      }
    } catch (error) {
      console.error('创建任务时发生错误:', error);
      if (onShowStatus) {
        onShowStatus('网络错误，任务创建失败');
      }
    }
  };
  // 添加统一的奖励计算函数
  const calculateTaskRewards_old = (taskData) => {
    // 初始化返回值
    const rewards = {
      credits_reward: {},
      exp_reward: 0
    };

    try {
      // 获取字段权重
      const getFieldWeight = (fieldType, fieldValue) => {
        if (!taskFieldMappings || !taskFieldMappings[fieldType]) return 1;

        for (const [value, config] of Object.entries(taskFieldMappings[fieldType])) {
          if (value === fieldValue && config.weight) {
            return config.weight;
          }
        }
        return 1;
      };

      // 获取积分类型
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

      const level = stats.level || 1;

      // 计算积分奖励
      const categoryWeight = taskData.category ? getFieldWeight('categories', taskData.category) : 1;
      const domainWeight = taskData.domain ? getFieldWeight('domains', taskData.domain) : 1;
      const priorityWeight = taskData.priority ? getFieldWeight('priorities', taskData.priority) : 1;
      console.log("vals: ", categoryWeight, domainWeight, priorityWeight)

      // 计算积分值
      const calculatedPoints = level ** 0.5 * (categoryWeight + domainWeight + priorityWeight);
      const finalPoints = Math.max(1, Math.round(calculatedPoints));

      // 获取该领域对应的积分类型
      const creditType = getCreditTypeForDomain(taskData.domain);

      // 设置积分奖励
      rewards.credits_reward[creditType] = finalPoints;

      // 计算经验值
      // 使用默认公式计算经验值 k * (a*Level^2 + A*B*C*Level + 10)
      const formula = "倍率 * (系数 * 等级^2 + 类别权重 * 领域权重 * 优先级权重 * 等级 + 10)";
      let formulaExpression = formula
        .replace(/类别权重/g, categoryWeight)
        .replace(/领域权重/g, domainWeight)
        .replace(/优先级权重/g, priorityWeight)
        .replace(/倍率/g, expFormulas.taskExpMultiplier || 1)
        .replace(/等级/g, level)
        .replace(/系数/g, expFormulas.taskExpCoefficient || 0.1);
      console.log("计算任务奖励的公式:", formulaExpression)

      // 替换幂运算符号
      formulaExpression = formulaExpression.replace(/\^/g, '**');
      console.log("计算任务奖励的表达式:", formulaExpression)

      // 评估表达式
      const result = new Function('"use strict"; return (' + formulaExpression + ')')();
      // const result = new Function('return ' + formulaExpression)();
      console.log("计算任务奖励的结果:", result)
      rewards.exp_reward = Math.max(1, Math.round(result * 100) / 100); // 保留两位小数
      console.log("任务经验奖励:", rewards.exp_reward)

    } catch (e) {
      console.error("奖励计算错误:", e);
      // 出错时返回默认值
      rewards.credits_reward = {"骨贝": 1};
      rewards.exp_reward = 10;
    }

    return rewards;
  };
  const applyFieldCode_old = (formData, code) => {
      // 使用传入的 codeSettings props
      const currentCodeSettings = codeSettings;

      // 确保 codeSettings 存在且有正确的结构
      if (!currentCodeSettings) {
        console.log('codeSettings 不存在');
        return;
      }


      // 特殊处理最大重复次数，格式如 "n5" 表示最大重复次数为5
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
            // console.log(`检查字段值: ${value}, 代码: ${shortcutCode}`);
            if (shortcutCode === code) {
              // console.log(`找到匹配代码: ${code} 对应字段值: ${value}`);
              // 根据字段类型设置对应的表单值
              switch (field) {
                case 'categories':
                  console.log(`设置任务类别为 ${value}`);
                  formData.category = value;
                  break;
                case 'domains':
                  console.log(`设置任务领域为 ${value}`);
                  formData.domain = value;
                  break;
                case 'priorities':
                  console.log(`设置任务优先级为 ${value}`);
                  formData.priority = value;
                  break;
                case 'cycleTypes':
                  console.log(`设置循环周期为 ${value}`);
                  formData.task_type = value;
                  break;
                  // 特殊处理循环周期类型，需要映射到正确的内部值
                  // const cycleTypeMap = {
                  //   '无循环': 'single',
                  //   '日循环': 'daily',
                  //   '周循环': 'weekly',
                  //   '月循环': 'monthly',
                  //   '年循环': 'yearly'
                  // };
                  // // 如果是显示名称，转换为内部值
                  // const internalValue = cycleTypeMap[value] || value;
                  // formData.task_type = internalValue;
                  // console.log(`设置任务周期为 ${value} (内部值: ${internalValue})`);
                  // break;
                default:
                  console.log(`未知字段类型: ${field}`);
                  break;
              }
              return; // 找到匹配项后立即返回
            }
          }
        } catch (error) {
          console.error(`处理字段类型 ${field} 时出错:`, error);
        }
      }

      console.log(`未找到代码 ${code} 的匹配项`);
    };



  const cleanEmptyTaskItems = (content) => {
    return content
      .replace(/^(\s*)-\s\[\s*[xX]?\s*\]\s*$(\n)/gm, '') // 清理空任务列表项
      .replace(/^(\s*)-\s*$(\n)/gm, '') // 清理空无序列表项
      // 处理任务列表项或无序列表项后跟空行再跟列表项的情况，只清除中间的空行
      .replace(/^(\s*-\s(?:\[\s*[xX]?\s*\]\s)?[^-\s].*\n)\s*$(\n)(\s*-\s)/gm, '$1$3');
  };

  // const [settings, setSettings] = useState(null);
  // const fetchSettings = async () => {
  //   try {
  //     const response = await fetch(`${CONFIG.API_BASE_URL}/api/settings`);
  //     if (!response.ok) {
  //       throw new Error('Failed to fetch settings');
  //     }
  //     const result = await response.json();
  //     setSettings(result);
  //   } catch (err) {
  //     console.error('获取设置失败:', err);
  //   }
  // };
  // // useEffect(() => {
  // //   fetchSettings();
  // // }, []);


 // 修改 handleSave 函数
  const handleSave = async () => {
    try {
      // // 清理空的任务列表项
      // const cleanedContent = cleanEmptyTaskItems(content);
      //
      // // 如果内容有变化，更新状态
      // if (cleanedContent !== content) {
      //   setContent(cleanedContent);
      // }
      // 优先使用 onFileSave（文件系统保存）
      if (onFileSave && typeof onFileSave === 'function') {
        await onFileSave(content, fileName);
        return;
      }

      // 其次使用 onSave（通用保存回调）
      if (onSave && typeof onSave === 'function') {
        await onSave(content);
        return;
      }

      // 如果都没有提供保存函数，给出明确提示
      console.warn('MarkdownEditor: 未提供保存函数 (onFileSave 或 onSave)');
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  // 更新内容的函数，同时更新历史记录
  const updateContent = (newContent) => {
    // 保存当前光标位置
    let cursorPosition = 0;
    if (textareaRef.current) {
      cursorPosition = textareaRef.current.selectionStart;
    }

    const newHistory = [...history.slice(0, historyIndex + 1), newContent];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setContent(newContent);

    // 在下一个事件循环中恢复光标位置
    setTimeout(() => {
      if (textareaRef.current) {
        const maxLength = newContent.length;
        const newCursorPosition = Math.min(cursorPosition, maxLength);
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // 撤销操作
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
    }
  };

  // 重做操作
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
    }
  };

  // 在组件内部添加标题选择函数
  const insertHeading = (level) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const headingMarkers = '#'.repeat(level);
    const newText = `${headingMarkers} ${selectedText}`;
    const cursorPosition = start + headingMarkers.length + 1;

    const newContent = content.substring(0, start) + newText + content.substring(end);
    updateContent(newContent);

    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPosition, cursorPosition + selectedText.length);
    }, 0);
  };

  // 创建标题选择组件
  const HeadingSelector = () => {
    const [isOpen, setIsOpen] = useState(false);

    const handleHeadingSelect = (level) => {
      insertHeading(level);
      setIsOpen(false);
    };

    return (
      <div className="heading-selector">
        <button
          onClick={() => setIsOpen(!isOpen)}
          title="标题"
          className="heading-button"
        >
          H ▼
        </button>
        {isOpen && (
          <div className="heading-dropdown">
            {[1, 2, 3, 4, 5, 6].map(level => (
              <button
                key={level}
                onClick={() => handleHeadingSelect(level)}
                className="heading-option"
              >
                {'#'.repeat(level)} 标题 {level}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 处理内容变化时的即时渲染
  const handleContentChange = (e) => {
    let newContent = e.target.value;
    // newContent = cleanEmptyTaskItems(newContent);
    updateContent(newContent);

    // 如果提供了 onChange 回调，则调用它
    if (onChange && typeof onChange === 'function') {
      onChange(newContent);
    }
  };

  // 添加统一的空白列表行处理函数
  const handleEmptyListLine = (currentLine, cursorPosition) => {
    const lineStartPos = cursorPosition - currentLine.length;
    const beforeLine = content.substring(0, lineStartPos);
    const afterLine = content.substring(cursorPosition + 1); // +1 for \n

    // 检查是否为列表末尾行（afterLine 为空或以换行符开始）
    const isLastLine = afterLine === '' || afterLine.startsWith('\n') || content.length <= cursorPosition + 1;

    const newContent = beforeLine + afterLine;

    // 检查是否为有序列表项，如果是则需要重新排序
    const orderedListRegex = /^(\s*)(\d+)\.\s(.*)$/;
    if (orderedListRegex.test(currentLine)) {
      // 对于有序列表，需要更新后续编号
      const lines = newContent.split('\n');
      const currentLineIndex = lineStartPos > 0 ? beforeLine.split('\n').length - 1 : 0;

      // 更新编号
      const updatedLines = updateOrderedListNumbers(lines, currentLineIndex);
      const finalContent = updatedLines.join('\n');

      updateContent(finalContent);
    } else {
      updateContent(newContent);
    }

    // 光标定位逻辑
    setTimeout(() => {
      if (textareaRef.current) {
        let newCursorPosition;
        if (isLastLine) {
          // 如果是列表末尾行，光标保持在当前位置（删除后的行首）
          newCursorPosition = Math.max(0, lineStartPos);
        } else {
          // 如果不是末尾行，光标定位到上一行末尾
          newCursorPosition = Math.max(0, lineStartPos - 1);
        }
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // 添加统一的新列表项处理函数
  const handleNewListItem = (spaces, prefix, cursorPosition, isOrderedList = false) => {
    if (isOrderedList) {
      // 对于有序列表，需要更新后续编号
      const lines = content.split('\n');
      const textBeforeCursor = content.substring(0, cursorPosition);
      const currentLineIndex = textBeforeCursor.split('\n').length - 1;

      // 插入新行
      const newText = `\n${spaces}${prefix}. `;
      const newContent = content.substring(0, cursorPosition) + newText + content.substring(cursorPosition);

      // 更新编号
      const newLines = newContent.split('\n');
      const updatedLines = updateOrderedListNumbers(newLines, currentLineIndex);
      const finalContent = updatedLines.join('\n');

      updateContent(finalContent);

      // 调整光标位置
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPosition = cursorPosition + newText.length;
          textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    } else {
      // 原有逻辑处理无序列表和任务列表
      const newText = `\n${spaces}${prefix} `;
      const newContent = content.substring(0, cursorPosition) + newText + content.substring(cursorPosition);
      updateContent(newContent);

      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPosition = cursorPosition + newText.length;
          textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }, 0);
    }
  };

  // 添加统一的空列表项处理函数
  const handleEmptyListItem = (currentLine, cursorPosition) => {
    const lineStartPos = cursorPosition - currentLine.length;
    const lineEndPos = cursorPosition;
    const beforeLine = content.substring(0, lineStartPos);
    const afterLine = content.substring(lineEndPos);
    const newContent = beforeLine + '\n' + afterLine;
    updateContent(newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = lineStartPos + 1;
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // 添加处理有序列表编号更新的函数
  const updateOrderedListNumbers = (lines, startIndex) => {
    // 找到起始行的缩进
    const startLine = lines[startIndex];
    if (!startLine) return lines;

    const startMatch = startLine.match(/^(\s*)(\d+)\.\s/);
    if (!startMatch) return lines;

    const spaces = startMatch[1];

    // 向前查找，找到当前连续列表的真正起始位置和编号
    let listStartIndex = startIndex;
    let startNumber = 1;

    // 向前查找同缩进级别的有序列表项
    for (let i = startIndex - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line) continue;

      // 检查是否为空行或其他内容，如果是则停止
      if (line.trim() === '') {
        continue; // 空行继续向前查找
      }

      const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);
      if (match && match[1] === spaces) {
        // 找到前一个同级列表项
        listStartIndex = i;
        startNumber = parseInt(match[2]) + 1;
      } else if (match && match[1].length < spaces.length) {
        // 遇到更高层级的列表项
        break;
      } else if (!match) {
        // 遇到非列表内容，停止查找
        break;
      }
    }

    // 如果向前没找到同级列表项，则从1开始
    if (listStartIndex === startIndex) {
      startNumber = 1;
      // 向前查找确定起始编号
      for (let i = 0; i < startIndex; i++) {
        const line = lines[i];
        const match = line && line.match(/^(\s*)(\d+)\.\s(.*)$/);
        if (match && match[1] === spaces) {
          startNumber = parseInt(match[2]) + 1;
          listStartIndex = i + 1;
          break;
        }
      }
    }

    // 从找到的起始位置开始更新编号，直到遇到非连续列表项
    let currentNumber = 1;
    let isInSameList = false;

    // 先确定从哪里开始编号
    for (let i = 0; i <= startIndex; i++) {
      const line = lines[i];
      if (!line) continue;

      const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);
      if (match && match[1] === spaces) {
        currentNumber = parseInt(match[2]) + 1;
        isInSameList = true;
      } else if (match && match[1].length < spaces.length) {
        // 更高级别的列表项
        isInSameList = false;
      } else if (line.trim() !== '' && !match) {
        // 非列表内容
        isInSameList = false;
      }
    }

    if (!isInSameList) {
      currentNumber = 1;
    }

    // 更新从startIndex开始的连续列表项编号
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);

      if (match && match[1] === spaces) {
        // 更新编号
        lines[i] = `${match[1]}${currentNumber}. ${match[3]}`;
        currentNumber++;
      } else if (match && match[1].length < spaces.length) {
        // 遇到更高层级的列表项，停止更新
        break;
      } else if (line.trim() === '') {
        // 空行继续，但不重置编号
        continue;
      } else if (!match) {
        // 遇到非列表内容，停止更新
        break;
      }
    }

    return lines;
  };

  // 添加新的函数用于处理插入新行后的编号更新
  const updateOrderedListNumbersAfterInsert = (lines, insertIndex) => {
    // 获取插入行的信息
    const insertedLine = lines[insertIndex + 1]; // 新插入的行
    if (!insertedLine) return lines;

    const insertMatch = insertedLine.match(/^(\s*)(\d+)\.\s/);
    if (!insertMatch) return lines;

    const spaces = insertMatch[1];
    const insertedNumber = parseInt(insertMatch[2]);

    // 从插入位置之后开始更新编号
    let currentNumber = insertedNumber + 1;
    for (let i = insertIndex + 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);

      if (match && match[1] === spaces) {
        // 更新编号
        lines[i] = `${match[1]}${currentNumber}. ${match[3]}`;
        currentNumber++;
      } else if (match && match[1].length < spaces.length) {
        // 遇到更高层级的列表项，停止更新
        break;
      } else if (line.trim() === '') {
        // 空行继续
        continue;
      } else if (!match) {
        // 遇到非列表内容，停止更新
        break;
      }
    }

    return lines;
  };


  const insertMarkdown = (syntax) => {
    // 添加检查确保textareaRef.current存在
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    let newText = '';
    let cursorPosition = start;

    switch(syntax) {
      case 'bold':
        // 检查选中文本是否已被粗体标记包裹
        if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
          // 移除粗体标记
          newText = selectedText.substring(2, selectedText.length - 2);
          cursorPosition = start;
        } else {
          // 检查光标前后是否有粗体标记
          const beforeText = content.substring(Math.max(0, start - 2), start);
          const afterText = content.substring(end, Math.min(content.length, end + 2));

          if (beforeText === '**' && afterText === '**') {
            // 光标前后有粗体标记，移除它们
            const beforeStart = Math.max(0, start - 2);
            const afterEnd = Math.min(content.length, end + 2);
            const newContent = content.substring(0, beforeStart) + selectedText + content.substring(afterEnd);
            updateContent(newContent);

            // 设置光标位置
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(beforeStart, beforeStart + selectedText.length);
            }, 0);
            return;
          } else {
            // 添加粗体标记
            newText = `**${selectedText}**`;
            cursorPosition = start + 2;
          }
        }
        break;

      case 'italic':
        // 检查选中文本是否已被斜体标记包裹
        if (selectedText.startsWith('*') && selectedText.endsWith('*')) {
          // 移除斜体标记
          newText = selectedText.substring(1, selectedText.length - 1);
          cursorPosition = start;
        } else {
          // 检查光标前后是否有斜体标记
          const beforeText = content.substring(Math.max(0, start - 1), start);
          const afterText = content.substring(end, Math.min(content.length, end + 1));

          if (beforeText === '*' && afterText === '*') {
            // 光标前后有斜体标记，移除它们
            const beforeStart = Math.max(0, start - 1);
            const afterEnd = Math.min(content.length, end + 1);
            const newContent = content.substring(0, beforeStart) + selectedText + content.substring(afterEnd);
            updateContent(newContent);

            // 设置光标位置
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(beforeStart, beforeStart + selectedText.length);
            }, 0);
            return;
          } else {
            // 添加斜体标记
            newText = `*${selectedText}*`;
            cursorPosition = start + 1;
          }
        }
        break;

      case 'heading':
        newText = `# ${selectedText}`;
        cursorPosition = start + 2;
        break;
      case 'link':
        setShowLinkModal(true);
        // newText = `[${selectedText}](url)`;
        // cursorPosition = start + 1;
        break;
      case 'image':
        setShowImageModal(true);
        break;
        // newText = `![${selectedText}](image-url)`;
        // cursorPosition = start + 2 + selectedText.length + 3; // 定位到 image-url 位置
        // break;
      case 'code':
        newText = `\`${selectedText}\``;
        cursorPosition = start + 1;
        break;
      case 'codeblock':
        newText = `\`\`\`\n${selectedText}\n\`\`\``;
        cursorPosition = start + 3;
        break;
      case 'quote':
        newText = `> ${selectedText}`;
        cursorPosition = start + 2;
        break;
      case 'ul':
        newText = `- ${selectedText}`;
        cursorPosition = start + 2;
        break;
      case 'ol':
        newText = `1. ${selectedText}`;
        cursorPosition = start + 3;
        break;
      case 'underline':
        // 检查选中文本是否已被下划线标记包裹
        if (selectedText.startsWith('<u>') && selectedText.endsWith('</u>')) {
          // 移除下划线标记
          newText = selectedText.substring(3, selectedText.length - 4);
          cursorPosition = start;
        } else {
          // 检查光标前后是否有下划线标记
          const beforeText = content.substring(Math.max(0, start - 3), start);
          const afterText = content.substring(end, Math.min(content.length, end + 4));

          if (beforeText === '<u>' && afterText === '</u>') {
            // 光标前后有下划线标记，移除它们
            const beforeStart = Math.max(0, start - 3);
            const afterEnd = Math.min(content.length, end + 4);
            const newContent = content.substring(0, beforeStart) + selectedText + content.substring(afterEnd);
            updateContent(newContent);

            // 设置光标位置
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(beforeStart, beforeStart + selectedText.length);
            }, 0);
            return;
          } else {
            // 添加下划线标记
            newText = `<u>${selectedText}</u>`;
            cursorPosition = start + 3;
          }
        }
        break;
      case 'highlight':
        // 检查选中文本是否已被高亮标记包裹
        if (selectedText.startsWith('<mark>') && selectedText.endsWith('</mark>')) {
          // 移除高亮标记
          newText = selectedText.substring(6, selectedText.length - 7);
          cursorPosition = start;
        } else {
          // 检查光标前后是否有高亮标记
          const beforeText = content.substring(Math.max(0, start - 6), start);
          const afterText = content.substring(end, Math.min(content.length, end + 7));

          if (beforeText === '<mark>' && afterText === '</mark>') {
            // 光标前后有高亮标记，移除它们
            const beforeStart = Math.max(0, start - 6);
            const afterEnd = Math.min(content.length, end + 7);
            const newContent = content.substring(0, beforeStart) + selectedText + content.substring(afterEnd);
            updateContent(newContent);

            // 设置光标位置
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(beforeStart, beforeStart + selectedText.length);
            }, 0);
            return;
          } else {
            // 添加高亮标记
            newText = `<mark>${selectedText}</mark>`;
            cursorPosition = start + 6;
          }
        }
        break;
      case 'strike':
        // 检查选中文本是否已被删除线包裹
        if (selectedText.startsWith('~~') && selectedText.endsWith('~~')) {
          // 移除删除线
          newText = selectedText.substring(2, selectedText.length - 2);
          cursorPosition = start;
        } else {
          // 检查光标前后是否有删除线标记
          const beforeText = content.substring(Math.max(0, start - 2), start);
          const afterText = content.substring(end, Math.min(content.length, end + 2));

          if (beforeText === '~~' && afterText === '~~') {
            // 光标前后有删除线标记，移除它们
            const beforeStart = Math.max(0, start - 2);
            const afterEnd = Math.min(content.length, end + 2);
            const newContent = content.substring(0, beforeStart) + selectedText + content.substring(afterEnd);
            updateContent(newContent);

            // 设置光标位置
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(beforeStart, beforeStart + selectedText.length);
            }, 0);
            return;
          } else {
            // 添加删除线，去除首尾空格以确保正确渲染
            const trimmedText = selectedText.trim();
            newText = `~~${trimmedText}~~`;
            cursorPosition = start + 2;
          }
        }
        break;
      case 'align-left':
        newText = `::: align-left\n${selectedText}\n:::`;
        cursorPosition = start + 4;
        break;
      case 'align-center':
        newText = `::: align-center\n${selectedText}\n:::`;
        cursorPosition = start + 4;
        break;
      case 'align-right':
        newText = `::: align-right\n${selectedText}\n:::`;
        cursorPosition = start + 4;
        break;
      case 'hr':
        newText = `\n---\n`;
        cursorPosition = start + 5;
        break;
      case 'table':
        newText = `\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 文本1 | 文本2 | 文本3 |\n`;
        cursorPosition = start + 2;
        break;
      case 'tasklist':
        // 获取当前光标所在行的完整内容
        const textUpToCursor = content.substring(0, start);
        const textFromCursorToEnd = content.substring(start);
        const linesBefore = textUpToCursor.split('\n');
        const currentLineIndex = linesBefore.length - 1;
        const linesAfter = textFromCursorToEnd.split('\n');

        // 获取完整的当前行内容
        const currentLine = linesBefore[currentLineIndex] + (linesAfter[0] || '');

        // 计算当前行在整个文本中的起始和结束位置
        const lineStartPos = textUpToCursor.length - linesBefore[currentLineIndex].length;

        // 更准确地计算行结束位置，确保包含换行符
        let lineEndPos = lineStartPos + currentLine.length;
        // 检查下个字符是否是换行符
        if (lineEndPos < content.length && content[lineEndPos] === '\n') {
          lineEndPos += 1; // 包含换行符
        }

        let updatedLine = '';

        // 检查当前行的状态并进行切换
        if (currentLine.match(/^\s*-\s\[\s\]\s.*/)) {
          // 未完成任务 -> 已完成任务，添加删除线到整行文本（去除首尾空格确保正确渲染）
          updatedLine = currentLine.replace(/^(\s*-\s)\[\s\]\s(.*)/, (match, prefix, text) => {
            const trimmedText = text.trim();
            return `${prefix}[x] ~~${trimmedText}~~`;
          });
        } else if (currentLine.match(/^\s*-\s\[x\]\s.*/i)) {
          // 已完成任务 -> 未完成任务，移除整行的删除线
          updatedLine = currentLine.replace(/^(\s*-\s)\[x\]\s~~(.*)~~/, '$1[ ] $2');
          // 如果删除线格式不标准，也尝试移除
          updatedLine = updatedLine.replace(/^(\s*-\s)\[x\]\s(.*)/, '$1[ ] $2');
        } else {
          // 普通行 -> 添加未完成任务标记
          updatedLine = currentLine.replace(/^(\s*)(.*)/, (match, spaces, text) => {
            // 如果整行为空，只添加标记；否则添加标记和内容
            if (text === '') {
              return `${spaces}- [ ] `;
            } else {
              return `${spaces}- [ ] ${text}`;
            }
          });
        }

        // 保持换行符
        const hasNewline = lineEndPos > lineStartPos + currentLine.length;
        if (hasNewline) {
          updatedLine += '\n';
        }

        // 更新整个内容
        const beforeLine = content.substring(0, lineStartPos);
        const afterLine = content.substring(lineEndPos);
        const newContent = beforeLine + updatedLine + afterLine;

        updateContent(newContent);

        // 保持光标位置
        setTimeout(() => {
          textarea.focus();
          const newCursorPos = lineStartPos + updatedLine.length - (hasNewline ? 1 : 0);
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
        return;
      default:
        return;
    }
    const newContent = content.substring(0, start) + newText + content.substring(end);
    updateContent(newContent);

    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPosition, cursorPosition + selectedText.length);
    }, 0);
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) {
      setShowLinkModal(false);
      return;
    }

    const linkMarkdown = `[${linkText}](${linkUrl})`;
    insertTextAtCursor(linkMarkdown);
    setShowLinkModal(false);
    setLinkText('');
    setLinkUrl('');
  };

  const handleInsertImage = () => {
    if (!imageUrl.trim()) {
      setShowImageModal(false);
      return;
    }

    // 如果图片URL以 / 开头，则自动补全域名
    let fullImageUrl = imageUrl;
    if (imageUrl.startsWith('/')) {
      if (customDomain) {
        // 使用自定义域名补全路径
        const cleanDomain = customDomain.replace(/\/$/, ''); // 移除末尾的斜杠
        fullImageUrl = `${cleanDomain}${imageUrl}`;
      } else {
        // 如果没有自定义域名，使用默认的 API 基础 URL
        fullImageUrl = `${CONFIG.API_BASE_URL}${imageUrl}`;
      }
    }

    const imageMarkdown = `![${imageAltText}](${fullImageUrl})`;
    insertTextAtCursor(imageMarkdown);
    setShowImageModal(false);
    setImageAltText('');
    setImageUrl('');
  };

  // 辅助函数：在光标位置插入文本
  const insertTextAtCursor = (text) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const insertText = text.startsWith('#') ? text + ' ' : text;
    const newContent = content.substring(0, start) + insertText + content.substring(end);
    updateContent(newContent);

    // 设置光标位置到插入文本之后
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  const handleTaskCommandFromCurrentLine = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];

    // 检查当前行是否以 "- [ ] " 开头（未完成任务项）
    const taskItemRegex = /^(\s*)-\s\[\s\]\s*(.*)$/;
    if (taskItemRegex.test(currentLine)) {
      const matches = currentLine.match(taskItemRegex);
      const commandText = matches[2]; // 获取任务项后的文本作为命令
      console.log('Task command:', commandText)

      if (commandText.trim()) {
        // 触发添加快速任务事件
        handleTaskCommand(commandText);
      }
    }
  };
  // 添加快捷键支持
  const handleKeyDown = (e) => {
    // 快捷键处理
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'z':
        case 'Z':
          e.preventDefault();
          if (e.shiftKey) {
            redo(); // Ctrl+Shift+Z 重做
          } else {
            undo(); // Ctrl+Z 撤销
          }
          return;
        case 'y':
        case 'Y':
          e.preventDefault();
          redo(); // Ctrl+Y 重做
          return;
        case 's':
        case 'S':
          e.preventDefault();
          handleSave(); // Ctrl+S 保存
          return;
        case 'b':
        case 'B':
          e.preventDefault();
          insertMarkdown('bold');
          return;
        case 'i':
        case 'I':
          e.preventDefault();
          insertMarkdown('italic');
          return;
        case 'u':
        case 'U':
          e.preventDefault();
          insertMarkdown('underline');
          return;
        case 'l':
        case 'L':
          e.preventDefault();
          insertMarkdown('tasklist');
          return;
        case 'h':
        case 'H':
          e.preventDefault();
          insertMarkdown('highlight');
          return;
        default:
          break;
      }
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleTaskCommandFromCurrentLine();
      return;
    }
    // 回车键处理
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPosition = textarea.selectionStart;
      const isAtEnd = cursorPosition === content.length; // 检查光标是否在内容末尾
      const textBeforeCursor = content.substring(0, cursorPosition);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];

      const orderedListRegex = /^(\s*)(\d+)\.\s(.*)$/;
      const emptyOrderedListRegex = /^(\s*)(\d+)\.\s*$/; // 空白有序列表行
      const unorderedListRegex = /^(\s*)-\s(.*)$/;
      const taskListRegex = /^(\s*)-\s\[\s*[xX]?\s*\]\s*(.*)$/;
      const emptyTaskRegex = /^(\s*)-\s\[\s*[xX]?\s*\]\s*$/;
      const emptyUnorderedListRegex = /^(\s*)-\s*$/;

      // 检查当前行是否是空白有序列表项
      if (emptyOrderedListRegex.test(currentLine)) {
        e.preventDefault();
        handleEmptyListLine(currentLine, cursorPosition);
        return;
      }

      // 检查当前行是否是任务列表项
      if (taskListRegex.test(currentLine)) {
        // 检查是否是空的任务列表项
        if (emptyTaskRegex.test(currentLine)) {
          e.preventDefault();
          handleEmptyListLine(currentLine, cursorPosition);
          return;
        }
      }

      // 检查当前行是否是无序列表项
      if (unorderedListRegex.test(currentLine)) {
        // 检查是否是空的无序列表项
        if (emptyUnorderedListRegex.test(currentLine)) {
          e.preventDefault();
          handleEmptyListLine(currentLine, cursorPosition);
          return;
        }
      }

      // 检查下一行是否是空的任务列表项或空的无序列表项，如果是则删除它
      const textAfterCursor = content.substring(cursorPosition);
      const linesAfter = textAfterCursor.split('\n');
      const nextLine = linesAfter[0]; // 下一行内容

      if (nextLine) {
        if (emptyTaskRegex.test(nextLine) || emptyUnorderedListRegex.test(nextLine)) {
          e.preventDefault();

          // 删除下一行的空列表项
          const currentLineEndPos = cursorPosition + nextLine.length + 1; // +1 for \n
          const beforeLine = content.substring(0, cursorPosition);
          const afterLine = content.substring(currentLineEndPos);
          const newContent = beforeLine + afterLine;

          updateContent(newContent);

          // 保持光标在当前位置
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
            }
          }, 0);
          return;
        }
      }


      if (orderedListRegex.test(currentLine)) {
          e.preventDefault();
          const matches = currentLine.match(orderedListRegex);
          const spaces = matches[1];
          const number = parseInt(matches[2]);
          const contentPart = matches[3];

          if (contentPart.trim() !== '') {
            // 如果当前列表项有内容，则正常添加新列表项
            // 但需要正确计算新行的序号
            const lines = content.split('\n');
            const textBeforeCursor = content.substring(0, cursorPosition);
            const currentLineIndex = textBeforeCursor.split('\n').length - 1;

            // 查找后续同级列表项并更新编号
            const newText = `\n${spaces}${number + 1}. `;
            const newContent = content.substring(0, cursorPosition) + newText + content.substring(cursorPosition);

            // 更新后续列表项的编号
            const newLines = newContent.split('\n');
            const updatedLines = updateOrderedListNumbersAfterInsert(newLines, currentLineIndex);
            const finalContent = updatedLines.join('\n');

            updateContent(finalContent);

            // 调整光标位置
            setTimeout(() => {
              if (textareaRef.current) {
                const newCursorPosition = cursorPosition + newText.length;
                textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
              }
            }, 0);
          } else {
            // 如果当前列表项没有内容，则删除当前行并添加新行
            handleEmptyListItem(currentLine, cursorPosition);
          }
        }
      else if (taskListRegex.test(currentLine)) {
        e.preventDefault();
        const matches = currentLine.match(taskListRegex);
        const spaces = matches[1];
        const contentPart = matches[2];

        if (contentPart.trim() !== '') {
          // 如果当前任务项有内容，则正常添加新任务项
          handleNewListItem(spaces, '- [ ]', cursorPosition);
        } else {
          // 如果当前任务项没有内容，则删除当前行并添加新行
          handleEmptyListItem(currentLine, cursorPosition);
        }
      }
      else if (unorderedListRegex.test(currentLine)) {
        e.preventDefault();
        const matches = currentLine.match(unorderedListRegex);
        const spaces = matches[1];
        const contentPart = matches[2];

        if (contentPart.trim() !== '') {
          // 如果当前列表项有内容，则正常添加新列表项
          handleNewListItem(spaces, '-', cursorPosition);
        } else {
          // 如果当前列表项没有内容，则删除当前行并添加新行
          handleEmptyListItem(currentLine, cursorPosition);
        }
      }

      if (isAtEnd) {
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
          }

          // 如果是分屏模式，也同步预览框滚动
          if (isSplitView && previewPaneRef.current) {
            previewPaneRef.current.scrollTop = previewPaneRef.current.scrollHeight;
          }
        }, 0);
      }
    }

    if (e.key === 'Tab') {
    e.preventDefault();

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // 如果有选中文本，则进行批量缩进
    if (start !== end) {
      const selectedText = content.substring(start, end);
      const lines = selectedText.split('\n');

      // 如果按下 Shift+Tab，则减少缩进
      if (e.shiftKey) {
        const unindentedLines = lines.map(line => {
          // 优先移除制表符缩进
          if (line.startsWith('\t')) {
            return line.substring(1);
          }
          // 如果没有制表符，尝试移除空格缩进（最多4个空格）
          else if (line.startsWith('    ')) {
            return line.substring(4);
          }
          else if (line.startsWith('  ')) {
            return line.substring(2);
          }
          else if (line.startsWith(' ')) {
            return line.substring(1);
          }
          return line;
        });

        const newContent = content.substring(0, start) +
                          unindentedLines.join('\n') +
                          content.substring(end);
        updateContent(newContent);

        // 保持选中状态
        setTimeout(() => {
          textarea.setSelectionRange(start, start + unindentedLines.join('\n').length);
        }, 0);
      }
      // 否则增加缩进
      else {
        const indentedLines = lines.map(line => '\t' + line);
        const newContent = content.substring(0, start) +
                          indentedLines.join('\n') +
                          content.substring(end);
        updateContent(newContent);

        // 保持选中状态
        setTimeout(() => {
          textarea.setSelectionRange(start, start + indentedLines.join('\n').length);
        }, 0);
      }
    }
    // 如果没有选中文本，则插入制表符或调整当前行缩进
    else {
      // 获取当前行信息
      const textBeforeCursor = content.substring(0, start);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      const lineStartPos = start - currentLine.length;

      // 检查当前行是否为列表项
      const orderedListRegex = /^(\s*)(\d+)\.\s(.*)$/;
      const unorderedListRegex = /^(\s*)-\s(.*)$/;
      const taskListRegex = /^(\s*)-\s\[\s*[xX]?\s*\]\s*(.*)$/;

      // 如果当前行是列表项，则对整行进行缩进
      if (orderedListRegex.test(currentLine) ||
          unorderedListRegex.test(currentLine) ||
          taskListRegex.test(currentLine)) {

        // 如果按下 Shift+Tab，减少当前行缩进
        if (e.shiftKey) {
          let newLine = currentLine;
          let cursorAdjustment = 0;

          // 移除缩进
          if (currentLine.startsWith('\t')) {
            newLine = currentLine.substring(1);
            cursorAdjustment = 1;
          } else if (currentLine.startsWith('    ')) {
            newLine = currentLine.substring(4);
            cursorAdjustment = 4;
          } else if (currentLine.startsWith('  ')) {
            newLine = currentLine.substring(2);
            cursorAdjustment = 2;
          } else if (currentLine.startsWith(' ')) {
            newLine = currentLine.substring(1);
            cursorAdjustment = 1;
          }

          if (cursorAdjustment > 0) {
            const newContent = content.substring(0, lineStartPos) +
                              newLine +
                              content.substring(start);
            updateContent(newContent);

            // 调整光标位置
            setTimeout(() => {
              textarea.setSelectionRange(start - cursorAdjustment, start - cursorAdjustment);
            }, 0);
          }
        }
        // 否则增加当前行缩进
        else {
          const newLine = '\t' + currentLine;
          const newContent = content.substring(0, lineStartPos) +
                            newLine +
                            content.substring(start);
          updateContent(newContent);

          // 调整光标位置
          setTimeout(() => {
            textarea.setSelectionRange(start + 1, start + 1);
          }, 0);
        }
      }
      // 如果当前行不是列表项，使用原有逻辑
      else {
        // 如果按下 Shift+Tab，减少当前行缩进
        if (e.shiftKey) {
          let newLine = currentLine;
          let cursorAdjustment = 0;

          // 移除缩进
          if (currentLine.startsWith('\t')) {
            newLine = currentLine.substring(1);
            cursorAdjustment = 1;
          } else if (currentLine.startsWith('    ')) {
            newLine = currentLine.substring(4);
            cursorAdjustment = 4;
          } else if (currentLine.startsWith('  ')) {
            newLine = currentLine.substring(2);
            cursorAdjustment = 2;
          } else if (currentLine.startsWith(' ')) {
            newLine = currentLine.substring(1);
            cursorAdjustment = 1;
          }

          if (cursorAdjustment > 0) {
            const newContent = content.substring(0, lineStartPos) +
                              newLine +
                              content.substring(start);
            updateContent(newContent);

            // 调整光标位置
            setTimeout(() => {
              textarea.setSelectionRange(start - cursorAdjustment, start - cursorAdjustment);
            }, 0);
          }
        }
        // 否则插入制表符
        else {
          const newContent = content.substring(0, start) + '\t' + content.substring(end);
          updateContent(newContent);

          // 将光标移到制表符后
          setTimeout(() => {
            textarea.setSelectionRange(start + 1, start + 1);
          }, 0);
        }
      }
    }
  }




  };

  const validateImageUrl = (url) => {
    if (!url) return false;

    try {
      // 对于本地图片路径，转换为API访问路径
      if (url.startsWith('/files/images/')) {
        const fullUrl = `${CONFIG.API_BASE_URL}${url}`;
        return fullUrl;
      }

      // 对于绝对URL，进行基本验证
      if (url.startsWith('http')) {
        new URL(url);
        return url;
      }

      return url;
    } catch {
      return false;
    }
  };


  // 添加图片加载测试函数
  const testImageLoad = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log('图片加载测试成功:', url);
        resolve(true);
      };
      img.onerror = () => {
        console.error('图片加载测试失败:', url);
        resolve(false);
      };
      img.src = url;
    });
  };


  // 添加粘贴事件处理函数
  const handlePaste = (e) => {
    if (!e.clipboardData || !e.clipboardData.items) {
      console.log('剪贴板数据不可用');
      return;
    }

    console.log('检测到粘贴事件，检查剪贴板内容');

    // 检查是否有图片数据
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      const item = e.clipboardData.items[i];
      console.log('剪贴板项目类型:', item.type);

      if (item.type.indexOf('image') !== -1) {
        console.log('检测到图片数据，开始处理');
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleImageFile(file);
        } else {
          console.log('无法获取图片文件');
        }
        return; // 处理完图片后退出循环
      }
    }

    // 如果没有图片，让默认粘贴行为继续
    console.log('剪贴板中没有图片数据，使用默认粘贴行为');
  };

  // 处理图片文件上传
  // 在 handleImageFile 函数中添加更多调试信息
  const handleImageFile = async (file) => {
    console.log('开始处理图片文件上传',file)
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/upload-image`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        const imageUrl = result.url;

        if (imageUrl) {
          // 获取自定义域名设置（如果存在）
          let fullImageUrl = imageUrl;

          // 如果 imageUrl 是相对路径，尝试使用自定义域名补全
          if (imageUrl.startsWith('/')) {
            if (customDomain) {
              // 使用自定义域名补全路径
              const cleanDomain = customDomain.replace(/\/$/, ''); // 移除末尾的斜杠
              fullImageUrl = `${cleanDomain}${imageUrl}`;
            } else {
              // 如果没有自定义域名，使用默认的 API 基础 URL
              fullImageUrl = `${CONFIG.API_BASE_URL}${imageUrl}`;
            }
          }

          const imageName = file.name ? file.name.split('.')[0] : 'img';
          const imageMarkdown = `![${imageName}](${fullImageUrl})`;
          insertTextAtCursor(imageMarkdown);
        }
      }
    } catch (error) {
      console.error('图片上传错误:', error);
    }
  };

  const handleTaskToggle = (lineText, checked) => {
    // 查找并替换对应的任务列表项
    const lines = content.split('\n');
    let lineIndex = -1;
    let actualLineText = '';

    // 精确匹配行内容，保留原始格式
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 去除行首尾空白进行比较，但保留原始行内容
      const normalizedLine = line.trim();
      const normalizedTarget = lineText.trim();

      if (normalizedLine === normalizedTarget) {
        lineIndex = i;
        actualLineText = line; // 保留原始行（包括原始缩进）
        break;
      }
    }

    if (lineIndex !== -1) {
      if (checked) {
        // 未完成 -> 已完成，为整行添加删除线（保持原有缩进）
        lines[lineIndex] = actualLineText.replace(/\[ \]\s*(.*)$/, (match, text) => {
          const trimmedText = text.trim();
          return `[x] ~~${trimmedText}~~`;
        });
      } else {
        // 已完成 -> 未完成，移除整行删除线（保持原有缩进）
        lines[lineIndex] = actualLineText.replace(/\[x\]\s*~~(.*)~~/, '[ ] $1')
            .replace(/\[x\]\s*(.*)/, '[ ] $1');
      }

      const newContent = lines.join('\n');
      updateContent(newContent);

      // 如果提供了 onChange 回调，则调用它
      if (onChange && typeof onChange === 'function') {
        onChange(newContent);
      }
    }
  };




  // 将 img 组件改为 ImgComponent
  const ImgComponent = React.memo(({ node, ...props }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    useEffect(() => {
      if (!props.src) return;

      // 检查缓存
      if (imageCache.has(props.src)) {
        const cacheResult = imageCache.get(props.src);
        if (cacheResult.loaded) {
          setImageLoading(false);
          setImageError(false);
          return;
        } else if (cacheResult.error) {
          setImageLoading(false);
          setImageError(true);
          return;
        }
      }

      // 设置加载状态
      setImageError(false);
      setImageLoading(true);

      // 创建图片加载器
      const img = new Image();
      img.onload = () => {
        // 缓存成功结果
        imageCache.set(props.src, { loaded: true, error: false });
        setImageLoading(false);
      };
      img.onerror = () => {
        // 缓存失败结果
        imageCache.set(props.src, { loaded: false, error: true });
        setImageError(true);
        setImageLoading(false);
      };
      img.src = props.src;

    }, [props.src]);

    // 添加图片点击处理函数
    const handleImageClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // 从图片URL中提取文件名
      try {
        const imageUrl = props.src;
        if (!imageUrl) return;

        // 提取图片文件名
        let fileName = '';
        if (imageUrl.includes('/files/images/')) {
          // 从API路径提取文件名
          fileName = imageUrl.split('/files/images/')[1];
        } else if (imageUrl.includes('://')) {
          // 从完整URL提取文件名
          const url = new URL(imageUrl);
          const pathParts = url.pathname.split('/');
          fileName = pathParts[pathParts.length - 1];
        } else {
          // 从相对路径提取文件名
          const pathParts = imageUrl.split('/');
          fileName = pathParts[pathParts.length - 1];
        }

        if (fileName) {
          // 发送自定义事件到 FileExplorer 组件
          window.dispatchEvent(new CustomEvent('locateAndOpenImage', {
            detail: {
              fileName: fileName,
              imageUrl: imageUrl
            }
          }));
        }
      } catch (error) {
        console.error('处理图片点击事件时出错:', error);
      }
    };

    if (imageError) {
      return (
        <span style={{
          color: 'red',
          padding: '5px 10px',
          border: '1px dashed #ff6b6b',
          backgroundColor: '#ffe0e0',
          borderRadius: '4px',
          display: 'inline-block',
          fontSize: '12px'
        }}>
          图片加载失败: {props.alt || props.src}
        </span>
      );
    }

    if (imageLoading) {
      return (
        <span style={{
          color: '#666',
          padding: '5px 10px',
          border: '1px dashed #ccc',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          display: 'inline-block',
          fontSize: '12px'
        }}>
          图片加载中...
        </span>
      );
    }

    // 阻止图片加载完成时的自动滚动，并添加点击事件
    return (
      <img
        {...props}
        loading="lazy"
        onClick={handleImageClick}
        onLoad={(e) => {
          // 防止图片加载完成时触发滚动
          e.preventDefault();
          e.stopPropagation();
          if (props.onLoad) props.onLoad(e);
        }}
        style={{
          maxWidth: '100%',
          cursor: 'pointer', // 添加手型光标提示可点击
          ...props.style,
          // 避免图片加载时影响布局导致滚动
          display: 'block'
        }}
      />
    );
  }, (prevProps, nextProps) => {
    // 只有当关键属性变化时才重新渲染
    return prevProps.src === nextProps.src &&
           prevProps.alt === nextProps.alt;
  });


  // 自定义渲染组件
  const customComponents = {
    code({ node, inline, className, children, ...props }) {
      try {
        // 处理行内代码
        if (inline) {
          return <code className={className} {...props}>{children}</code>;
        }

        // 处理代码块
        const match = /language-(\w+)/.exec(className || '');
        return !inline && match ? (
          <SyntaxHighlighter
            style={coy}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        ) : (
          <pre {...props}>
            <code>{children}</code>
          </pre>
        );
      } catch (error) {
        console.warn('代码渲染出错:', error);
        // 出错时返回简单的代码显示
        return (
          <pre {...props}>
            <code>{children}</code>
          </pre>
        );
      }
    },

    // tag: ({ node, ...props }) => {
    //   // 从属性中获取标签值
    //   const tagValue = props.value || (props.children && props.children[0] && props.children[0].props && props.children[0].props.children) || '#tag';
    //
    //   // 处理点击事件 - 发送自定义事件到 TaskTab
    //   const handleClick = (e) => {
    //     console.log('Tag clicked1:', tagValue)
    //     e.stopPropagation();
    //     console.log('Tag clicked2')
    //
    //     // 只有在特定字段中才发送事件
    //     if (currentField === 'calendar-log' || currentField === 'note-editor') {
    //       console.log('Tag clicked3')
    //       const event = new CustomEvent('markdownTagClick', {
    //         detail: {
    //           tag: tagValue,
    //           field: currentField
    //         }
    //       });
    //       window.dispatchEvent(event);
    //       console.log('Tag clicked4')
    //     }
    //   };
    //
    //   return (
    //     <span
    //       className="markdown-tag"
    //       {...props}
    //       onClick={handleClick}
    //       style={{
    //         cursor: (currentField === 'calendar-log' || currentField === 'note-editor') ? 'pointer' : 'default',
    //         backgroundColor: '#e1f5fe',
    //         padding: '2px 6px',
    //         borderRadius: '4px',
    //         fontSize: '0.9em',
    //         ...props.style
    //       }}
    //     >
    //       {tagValue}
    //     </span>
    //   );
    // },


    img: ImgComponent,

    li: ({ node, children, ...props }) => {
      // 检查是否有任务列表项的类名
      if (props.className && props.className.includes('task-list-item')) {

        // 查找复选框和文本内容
        let checkbox = null;
        let textContent = [];


        // 遍历子元素分离复选框和文本
        children.forEach((child, index) => {
          if (child && typeof child === 'object' &&
              child.type === 'input' &&
              child.props &&
              child.props.type === 'checkbox') {
            checkbox = child;
          } else {
            textContent.push(child);
          }
        });

        // 如果找到复选框，则渲染为可交互的任务列表项
        if (checkbox) {
          // 提取原始文本用于构造匹配字符串
          const textString = textContent.map(child => {
            if (typeof child === 'string') {
              return child;
            } else if (child && typeof child === 'object' &&
                       child.props && child.props.children) {
              // 处理嵌套的元素，如删除线中的文本
              if (typeof child.props.children === 'string') {
                return child.props.children;
              } else if (Array.isArray(child.props.children)) {
                return child.props.children.map(c => typeof c === 'string' ? c : '').join('');
              }
            }
            return '';
          }).join('').trim();

          // 根据复选框状态构造匹配文本
          const isChecked = checkbox.props.checked;
          let fullLineText;

          if (isChecked) {
            // 已完成的任务需要包含删除线格式
            fullLineText = `- [x] ~~${textString}~~`;
          } else {
            // 未完成的任务
            fullLineText = `- [ ] ${textString}`;
          }

          return (
            <li {...props} className="task-list-item">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  handleTaskToggle(fullLineText, e.target.checked);
                }}
              />
              {textContent.map((child, index) => (
                <span
                  key={index}
                  className={isChecked ? 'task-completed' : ''}
                >
                  {child}
                </span>
              ))}
            </li>
          );
        }
      }

      // 默认渲染
      return <li {...props}>{children}</li>;
    },
    u: ({ node, children, ...props }) => <u {...props}>{children}</u>,
    mark: ({ node, children, ...props }) => <mark {...props}>{children}</mark>,
    del: ({ node, children, ...props }) => <del {...props}>{children}</del>,
    blockquote: ({ node, children, ...props }) => {
      return <blockquote {...props}>{children}</blockquote>;
    },
    div: ({ node, className, children, ...props }) => {
      try {
        if (className && className.startsWith('align-')) {
          return <div className={className} {...props}>{children}</div>;
        }
        return <div {...props}>{children}</div>;
      } catch (e) {
        console.warn('渲染对齐容器时出错:', e);
        // 出错时返回安全的默认渲染
        return <div {...props}>{children || ''}</div>;
      }
    },
  };


  const PreviewErrorBoundary = ({ children }) => {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      if (hasError) {
        const timer = setTimeout(() => setHasError(false), 3000);
        return () => clearTimeout(timer);
      }
    }, [hasError]);

    const handleError = (error, errorInfo) => {
      console.error('预览渲染错误:', error);
      setHasError(true);
    };

    if (hasError) {
      return (
        <div style={{color: 'red', padding: '10px', border: '1px solid #fcc'}}>
          预览渲染出现问题，3秒后自动恢复。请检查 Markdown 语法是否正确。
        </div>
      );
    }

    return (
      <div onError={handleError}>
        {children}
      </div>
    );
  };


  const remarkTags = () => {
    return (tree) => {
      const transformText = (text) => {
        // 处理标签，添加特殊属性以便事件委托识别
        return text.replace(/(#[\w\u4e00-\u9fa5]+)/g,
          '<span class="markdown-tag-clickable" data-tag-value="$1" style="cursor: pointer; color: #108ee9; background-color: #e1f5fe; padding: 2px 6px; border-radius: 4px;">$1</span>');
      };

      const visit = (node) => {
        if (node.type === 'text') {
          if (/#/.test(node.value)) {
            const newNode = { ...node };
            newNode.value = transformText(node.value);
            newNode.type = 'html';
            return newNode;
          }
        }

        if (node.children) {
          node.children.forEach((child, index) => {
            const transformed = visit(child);
            if (transformed !== child) {
              node.children[index] = transformed;
            }
          });
        }

        return node;
      };

      visit(tree);
      return tree;
    };
  };


  const loadAllTags = () => {
    try {
      const tagIndexManager = new TagIndexManager();
      const tagIndex = tagIndexManager.loadIndexFromStorage();

      // 获取所有标签（排除__fileMetadata）
      const tags = Object.keys(tagIndex).filter(tag => tag !== '__fileMetadata');
      setAllTags(tags);
      setShowTagList(true);
    } catch (error) {
      console.error('加载标签列表失败:', error);
      if (onShowStatus) {
        onShowStatus('加载标签列表失败');
      }
    }
  };



  const TagListModal = () => {
    if (!showTagList) return null;

    const insertAllTags = () => {
      if (allTags.length > 0) {
        const tagsText = allTags.join(' ');
        insertTextAtCursor(tagsText);

        // 插入完成后将编辑器滚动到底部
        setTimeout(() => {
          if (textareaRef.current) {
            const textarea = textareaRef.current;
            textarea.scrollTop = textarea.scrollHeight;
          }
        }, 0);

        setShowTagList(false);
      }
    };

    return (
      <div className="modal-overlay" onClick={() => setShowTagList(false)}>
        <div className="tag-list-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>所有标签</h3>
            <div className="modal-actions">
              <button className="insert-all-button" onClick={insertAllTags} title="插入所有标签">⤹</button>
              {/*<button className="refresh-button" onClick={refreshTags} title="刷新标签">↻</button>*/}
              <button className="close-button" onClick={() => setShowTagList(false)}>×</button>
            </div>
          </div>
          <div className="modal-body">
            <div className="tag-list">
              {allTags.length > 0 ? (
                allTags.map((tag, index) => (
                  <span
                    key={index}
                    className="tag-item"
                    onClick={() => {
                      insertTextAtCursor(tag);
                      setShowTagList(false);
                    }}
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <p>暂无标签</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className={`markdown-editor ${isFullscreen ? 'fullscreen' : ''} ${responsiveClassName}`.trim()}>
      <div className="editor-header-primary">
        {!embedded  && (
          <div className="current-file-name">
            {fileName}
          </div>
        )}

        <div className="primary-actions">
          {!embedded  && (
            <button onClick={handleSave} title="保存">💾</button>
          )}


          {/* 视图切换按钮移到第一行 */}
          {/*{(!embedded || isFullscreen) && (*/}
          <div className="view-toggle-group-primary">
            <button
              className={!isPreview && !isSplitView ? 'active' : ''}
              onClick={() => {
                setIsPreview(false);
                setIsSplitView(false);
              }}
              title="编辑模式"
            >
              ✏️
            </button>
            {/*<button*/}
            {/*  className={isSplitView ? 'active' : ''}*/}
            {/*  onClick={() => {*/}
            {/*    setIsPreview(false);*/}
            {/*    setIsSplitView(true);*/}
            {/*  }}*/}
            {/*  title="分屏模式"*/}
            {/*>*/}
            {/*  ║*/}
            {/*</button>*/}
            <button
              className={isSplitView && splitDirection === 'vertical' ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsPreview(false);
                setIsSplitView(true);
                setSplitDirection('vertical');
              }}
              title="左右分屏模式"
            >
              ║
            </button>

            {/* 修改上下分屏模式按钮 */}
            <button
              className={isSplitView && splitDirection === 'horizontal' ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsPreview(false);
                setIsSplitView(true);
                setSplitDirection('horizontal');
              }}
              title="上下分屏模式"
            >
              ═
            </button>

            <button
              className={isPreview && !isSplitView ? 'active' : ''}
              onClick={() => {
                setIsPreview(true);
                setIsSplitView(false);
              }}
              title="预览模式"
            >
              👁️
            </button>
            { (currentField === "calendar-log" ? isFullscreen : true) && (
              <button onClick={toggleFullscreen} title={isFullscreen ? '退出全屏' : '全屏'}>
                {isFullscreen ? '⇲' : '⛶'}
              </button>
            )}
            {onCancel && (!embedded && isFullscreen) && <button onClick={onCancel} title="取消">✕</button>}

            {!embedded && currentField !== "calendar-log" && (
              <button className="markdown-settings-button" onClick={() => setIsSettingsModalOpen(!isSettingsModalOpen)}>
                ⚙️️
              </button>
            )}
            <SettingsModal
              isOpen={isSettingsModalOpen}
              title="笔记设置"
              onClose={() => setIsSettingsModalOpen(false)}
              targetGroup={['general']}
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          </div>
          {/*)}*/}


        </div>
      </div>

      {/* 第二行：工具栏 */}
      {(!embedded || isFullscreen) && (
        <div className="editor-header-secondary">
          <div className="toolbar-container">
            <div className="toolbar-group">
              <button onClick={undo} title="撤销 (Ctrl+Z)" disabled={historyIndex <= 0}>↶</button>
              <button onClick={redo} title="重做 (Ctrl+Y)" disabled={historyIndex >= history.length - 1}>↷</button>
            </div>

            <div className="toolbar-group">
              <button onClick={() => insertMarkdown('ul')} title="无序列表">●</button>
              <button onClick={() => insertMarkdown('ol')} title="有序列表">№</button>
              <button onClick={() => insertMarkdown('tasklist')} title="任务列表 (Ctrl+L)">☐</button>
              <button onClick={handleTaskCommandFromCurrentLine} title="从当前行创建任务 (Ctrl+Enter)">⚡</button>
              <button onClick={() => insertMarkdown('table')} title="表格">📊</button>
              <HeadingSelector />
            </div>

            {!isMobile && (
              <div className="toolbar-group">
                <button onClick={() => insertMarkdown('bold')} title="粗体 (Ctrl+B)"><strong>B</strong></button>
                <button onClick={() => insertMarkdown('italic')} title="斜体 (Ctrl+I)"><em>I</em></button>
                <button onClick={() => insertMarkdown('underline')} title="下划线 (Ctrl+U)"><u>U</u></button>
                <button onClick={() => insertMarkdown('strike')} title="删除线"><del>S</del></button>
                <button onClick={() => insertMarkdown('highlight')} title="高亮 (Ctrl+H)"><mark>H</mark></button>
                <button onClick={() => insertMarkdown('hr')} title="分割线">―</button>
              </div>
            )}

            {!isMobile && (
              <div className="toolbar-group">
                <button onClick={() => insertMarkdown('link')} title="链接">🔗</button>
                <button onClick={() => setShowImageModal(true)} title="图片">🖼️</button>
                <button onClick={() => insertMarkdown('code')} title="行内代码">{'</>'}</button>
                <button onClick={() => insertMarkdown('codeblock')} title="代码块">{'</.>'}</button>
                <button onClick={() => insertMarkdown('quote')} title="引用">❝</button>
                <button onClick={loadAllTags} title="标签列表"><span>#</span></button>

              </div>
            )}

            {/* 在非移动端显示对齐按钮，在移动端隐藏到收纳菜单中 */}
            {/*{!isMobile && (*/}
            {/*  <div className="toolbar-group">*/}
            {/*    <button onClick={() => insertMarkdown('align-left')} title="左对齐">⬅</button>*/}
            {/*    <button onClick={() => insertMarkdown('align-center')} title="居中">⏺</button>*/}
            {/*    <button onClick={() => insertMarkdown('align-right')} title="右对齐">➡</button>*/}
            {/*  </div>*/}
            {/*)}*/}

            {/* 移动端才显示的按钮收纳容器 */}
            {isMobile && (
              <div className="toolbar-overflow">
                <button
                  ref={overflowToggleRef}
                  className="overflow-toggle"
                  title="更多工具"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOverflowMenuOpen(!isOverflowMenuOpen);
                  }}
                >
                  ⋯
                </button>
                <div
                  ref={overflowMenuRef}
                  className={`overflow-menu ${isOverflowMenuOpen ? 'visible' : ''}`}
                >
                  <button onClick={() => {insertMarkdown('bold');setIsOverflowMenuOpen(false);}} title="粗体 (Ctrl+B)"><strong>B</strong></button>
                  <button onClick={() => {insertMarkdown('italic');setIsOverflowMenuOpen(false);}} title="斜体 (Ctrl+I)"><em>I</em></button>
                  <button onClick={() => {insertMarkdown('underline');setIsOverflowMenuOpen(false);}} title="下划线 (Ctrl+U)"><u>U</u></button>
                  <button onClick={() => {insertMarkdown('strike');setIsOverflowMenuOpen(false);}} title="删除线"><del>S</del></button>
                  <button onClick={() => {insertMarkdown('highlight');setIsOverflowMenuOpen(false);}} title="高亮 (Ctrl+H)"><mark>H</mark></button>
                  <button onClick={() => {insertMarkdown('hr');setIsOverflowMenuOpen(false);}} title="分割线">―</button>
                  <button onClick={() => {insertMarkdown('link');setIsOverflowMenuOpen(false);}} title="链接">🔗</button>
                  <button onClick={() => {setShowImageModal(true);setIsOverflowMenuOpen(false);}} title="图片">🖼️</button>
                  <button onClick={() => {insertMarkdown('code');setIsOverflowMenuOpen(false);}} title="行内代码">{'</>'}</button>
                  <button onClick={() => {insertMarkdown('codeblock');setIsOverflowMenuOpen(false);}} title="代码块">{'</.>'}</button>
                  <button onClick={() => {insertMarkdown('quote');setIsOverflowMenuOpen(false);}} title="引用">❝</button>
                  {/*<button onClick={() => {insertMarkdown('align-left');setIsOverflowMenuOpen(false);}} title="左对齐">⬅</button>*/}
                  {/*<button onClick={() => {insertMarkdown('align-center');setIsOverflowMenuOpen(false);}} title="居中">⏺</button>*/}
                  {/*<button onClick={() => {insertMarkdown('align-right');setIsOverflowMenuOpen(false);}} title="右对齐">➡</button>*/}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="editor-content">
        {isSplitView ? (
          <div className={`split-view ${splitDirection === 'horizontal' ? 'split-horizontal' : 'split-vertical'}`}>
            <div
              className="editor-pane"
              ref={editorPaneRef}
            >
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                className="markdown-textarea"
              />
            </div>
            <div
              className="preview-pane preview-align-left"
              ref={previewPaneRef}
            >
              <PreviewErrorBoundary>
                <ReactMarkdown
                  remarkPlugins={[remarkNewlineToBreak, remarkGfm, remarkToc, remarkAlign, remarkTags]}
                  rehypePlugins={[rehypeRaw]}
                  components={customComponents}
                >
                  {content}
                </ReactMarkdown>
              </PreviewErrorBoundary>
            </div>
          </div>
        ) : isPreview ? (
          <div className="preview preview-align-left">
            <PreviewErrorBoundary>
              <ReactMarkdown
                remarkPlugins={[remarkNewlineToBreak, remarkGfm, remarkToc, remarkAlign, remarkTags]}
                rehypePlugins={[rehypeRaw]}
                components={customComponents}
              >
                {content}
              </ReactMarkdown>
            </PreviewErrorBoundary>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className="markdown-textarea"
          />
        )}
      </div>

      {((embedded && isFullscreen)||!embedded) && !isPreview && (
        <div className="editor-footer">
          <small>
            {quickAddTaskHint}
          </small>
          <small>
            {taskCreationFeedback && (
              <span style={{ color: taskCreationFeedback.includes('✅') ? 'green' : 'red', marginRight: '10px' }}>
                {taskCreationFeedback}
              </span>
            )}
            字符数: {content.length} | 单词数: {content.trim() ? content.trim().split(/\s+/).length : 0}
          </small>
        </div>
      )}

      {
        showLinkModal && (
          <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>插入链接</h3>
                <button className="close-button" onClick={() => setShowLinkModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>链接文本:</label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="链接显示文本"
                  />
                </div>
                <div className="form-group">
                  <label>链接地址:</label>
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="modal-actions">
                  <button onClick={handleInsertLink}>插入链接</button>
                  <button onClick={() => setShowLinkModal(false)}>取消</button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        showImageModal && (
          <div className="modal-overlay" onClick={() => setShowImageModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3>插入图片</h3>
              <div className="form-group">
                <label>替代文字:</label>
                <input
                  type="text"
                  value={imageAltText}
                  onChange={(e) => setImageAltText(e.target.value)}
                  placeholder="图片的替代文字"
                />
              </div>
              <div className="form-group">
                <label>图片URL:</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="图片的URL地址"
                />
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowImageModal(false)}>取消</button>
                <button onClick={handleInsertImage}>插入</button>
              </div>
            </div>
          </div>
        )
      }

      <TagListModal />

    </div>

  );
};

export default MarkdownEditor;