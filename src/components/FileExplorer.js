// src/components/FileExplorer.js
import React, { useState, useEffect, useRef } from 'react';
import TagIndexManager from '../utils/TagIndexManager';
import './FileExplorer.css';
import CONFIG from '../config';


// 创建标签索引管理器实例
const tagIndexManager = new TagIndexManager();



// 将 ImageViewerModal 移出 FileExplorer 组件，作为独立组件
const ImageViewerModal = ({
  isOpen,
  selectedImage,
  imageFilesCache,
  onClose,
  onPrev,
  onNext,
  imageScale,
  setImageScale,
  imagePosition,
  setImagePosition,
  onDelete,
  onFileSelect
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [prevImagePosition, setPrevImagePosition] = useState({ x: 0, y: 0 });

  // 计算当前索引
  const currentIndex = selectedImage && imageFilesCache ?
    imageFilesCache.findIndex(img => img.name === selectedImage.name) : -1;

  const hasNext = imageFilesCache && imageFilesCache.length > 1;
  const hasPrev = imageFilesCache && imageFilesCache.length > 1;

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!imageFilesCache || imageFilesCache.length <= 0) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      } else if (e.key === '+' || e.key === '=') {
        setImageScale(prev => Math.min(prev + 0.1, 3));
      } else if (e.key === '-' || e.key === '_') {
        setImageScale(prev => Math.max(prev - 0.1, 0.2));
      }
    };

    if (isOpen && selectedImage) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, selectedImage, imageFilesCache, imageScale, onClose, onNext, onPrev, setImageScale]);

  const handleNext = () => {
    if (onNext) onNext();
  };

  const handlePrev = () => {
    if (onPrev) onPrev();
  };

  const handleZoomIn = () => {
    setImageScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setImageScale(prev => Math.max(prev - 0.2, 0.2));
  };

  const handleReset = () => {
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
    setPrevImagePosition({ x: 0, y: 0 });
  };

  const handleClose = () => {
    setIsDragging(false);
    if (onClose) onClose();
  };

  const handleDelete = () => {
    if (onDelete && selectedImage) {
      onDelete(selectedImage);
    }
  };

  const handleToggleFullscreen = () => {
    const modal = document.querySelector('.image-viewer-modal');
    if (!modal) return;

    if (!document.fullscreenElement) {
      if (modal.requestFullscreen) {
        modal.requestFullscreen();
      } else if (modal.webkitRequestFullscreen) {
        modal.webkitRequestFullscreen();
      } else if (modal.msRequestFullscreen) {
        modal.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  const handleWheel = (e) => {
    // e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.2, Math.min(3, imageScale + delta));
    setImageScale(newScale);
  };

  const handleMouseDown = (e) => {
    if (imageScale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPrevImagePosition(imagePosition);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    setImagePosition({
      x: prevImagePosition.x + deltaX,
      y: prevImagePosition.y + deltaY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 条件渲染
  if (!isOpen || !selectedImage) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="image-viewer-modal" onClick={e => e.stopPropagation()}>
        <div className="image-viewer-header">
          <h3>{selectedImage.name}</h3>
          <div className="image-viewer-header-buttons">
            {onDelete && (
              <button
                className="delete-button"
                onClick={handleDelete}
                title="删除图片"
              >
                🗑
              </button>
            )}
            <button className="fullscreen-button" onClick={handleToggleFullscreen}>↕</button>
            <button className="close-button" onClick={handleClose}>×</button>
          </div>
        </div>

        <div
          className="image-viewer-content"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={selectedImage.imageUrl}
            alt={selectedImage.name}
            style={{
              transform: `scale(${imageScale}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              cursor: isDragging ? 'grabbing' : (imageScale > 1 ? 'grab' : 'default')
            }}
          />
        </div>

        <div className="image-viewer-controls">
          <button
            className="nav-button prev-button"
            onClick={handlePrev}
            disabled={!hasPrev}
          >
            &lt;
          </button>

          <div className="zoom-controls">
            <button onClick={handleZoomOut}>-</button>
            <span>{Math.round(imageScale * 100)}%</span>
            <button onClick={handleZoomIn}>+</button>
            <button onClick={handleReset}>⟳</button>
          </div>

          <button
            className="nav-button next-button"
            onClick={handleNext}
            disabled={!hasNext}
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
};


const FileExplorer = ({
  onFileSelect,
  onFileCreate,
  onFolderCreate,
  onFileRename,
  onFileDelete,
  currentFileId,
  collapsed,
  onToggleCollapse,
  apiBaseUrl = `${CONFIG.API_BASE_URL}/api/files`, // 默认API基础路径
  autoLoadLastFile = true // 新增属性，控制是否自动加载上次打开的文件
}) => {
  const [fileTree, setFileTree] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, node: null });
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, node: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const editInputRef = useRef(null);
  const [usedImages, setUsedImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  // 图片查看器相关状态
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageFilesCache, setImageFilesCache] = useState([]);
  //
  // const [imageViewerOpen, setImageViewerOpen] = useState(false);
  // const [selectedImage, setSelectedImage] = useState(null);
  // const [imageScale, setImageScale] = useState(1);
  // const [imageFilesCache, setImageFilesCache] = useState([]); // 缓存图片文件列表用于导航
  const [journalFiles, setJournalFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [lastSelectedFile, setLastSelectedFile] = useState(null);
  const [shiftStartFile, setShiftStartFile] = useState(null);
  const [isShiftKeyDown, setIsShiftKeyDown] = useState(false);


  const [filePagination, setFilePagination] = useState(() => {
    try {
      const savedSettings = localStorage.getItem('filePaginationSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && typeof parsed === 'object') {
          // 确保 global 属性存在
          if (!parsed.global) {
            parsed.global = { pageSize: 10 };
          }
          // 确保每个文件夹有独立的 currentPage
          if (!parsed.folders) {
            parsed.folders = {};
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('加载分页设置失败:', e);
    }

    // 默认统一设置
    return {
      global: { pageSize: 10 },
      folders: {} // 用于存储每个文件夹的独立当前页码
    };
  });
  const [sortSettings, setSortSettings] = useState(() => {
    try {
      const savedSettings = localStorage.getItem('fileSortSettings');
      if (savedSettings) {
        return JSON.parse(savedSettings);
      }
    } catch (e) {
      console.error('加载排序设置失败:', e);
    }
    // 默认设置：根目录按文件名升序排序
    return {
      global: { sortBy: 'name', sortOrder: 'asc' },
      folders: {} // 存储各个文件夹的独立排序设置
    };
  });


  const [moveToModalOpen, setMoveToModalOpen] = useState(false);
  const [moveToSourceNodes, setMoveToSourceNodes] = useState([]);
  const [moveToTargetFolder, setMoveToTargetFolder] = useState(null);
  const [expandedMoveToFolders, setExpandedMoveToFolders] = useState(new Set(['root']));

  // 在 FileExplorer 组件的状态中添加搜索相关状态
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isLoadingFromSearch, setIsLoadingFromSearch] = useState(false);


  const [searchLoadedFileId, setSearchLoadedFileId] = useState(null);

  // 修改 loadFileTree 函数，确保文件夹顺序和状态
  const loadFileTree = async () => {
    try {
      setLoading(true);
      // console.log('开始加载文件树...');
      const response = await fetch(`${apiBaseUrl}/tree`);

      if (response.ok) {
        const data = await response.json();
        // console.log('文件树加载成功:', data);

        // 确保根节点包含所有必要目录并按指定顺序排列
        if (data.length > 0) {
          const rootNode = data[0];
          if (rootNode.children) {
            // 创建必要的目录
            const requiredDirs = [
              { id: 'images', name: ' 图片', type: 'folder' },
              { id: 'journals', name: ' 手账', type: 'folder' }
            ];

            // 确保目录存在并按顺序排列
            const orderedChildren = [];
            const existingChildren = [...rootNode.children];

            requiredDirs.forEach(dir => {
              const existingDir = existingChildren.find(child => child.id === dir.id);
              if (existingDir) {
                orderedChildren.push(existingDir);
              } else {
                orderedChildren.push({
                  id: dir.id,
                  name: dir.name,
                  type: 'folder',
                  children: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
              }
            });

            // 添加其他不在列表中的子节点
            existingChildren.forEach(child => {
              if (!requiredDirs.some(dir => dir.id === child.id)) {
                orderedChildren.push(child);
              }
            });

            rootNode.children = orderedChildren;
          }
        }

        setFileTree(data);

        // 不再在这里设置展开状态，而是依赖 useEffect 中加载的状态
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('加载文件树失败:', err);
      setError(`加载文件树失败: ${err.message}`);
      // 加载失败时使用默认文件树
      const defaultTree = getDefaultFileTree();
      // console.log('使用默认文件树:', defaultTree);
      setFileTree(defaultTree);
    } finally {
      setLoading(false);
    }
  };


  // 默认文件树结构
  const getDefaultFileTree = () => {
    const tree = [
      {
        id: 'root',
        name: '根目录',
        type: 'folder',
        children: [
          {
            id: 'notes',
            name: '笔记簿',
            type: 'folder',
            children: [
              {
                id: 'welcome',
                name: '欢迎使用.md',
                type: 'file',
                content: '# 欢迎使用笔记簿\n\n这是一个功能强大的 Markdown 编辑器，支持以下功能：\n\n- 实时预览\n- 任务列表\n- 代码高亮\n- 文件管理\n\n开始创建您的第一个文档吧！',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'images',
            name: '图片',
            type: 'folder',
            children: [], // 图片文件将动态加载到这里
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    // console.log('生成默认文件树:', tree);
    return tree;
  };

  const getLastOpenedFile = () => {
    try {
      const savedFile = localStorage.getItem('lastOpenedFile');
      return savedFile ? JSON.parse(savedFile) : null;
    } catch (e) {
      console.error('解析上次打开的文件信息失败:', e);
      return null;
    }
  };

  const saveLastOpenedFile = (file) => {
    try {
      localStorage.setItem('lastOpenedFile', JSON.stringify(file));
    } catch (e) {
      console.error('保存文件信息失败:', e);
    }
  };

  const clearLastOpenedFile = () => {
    try {
      localStorage.removeItem('lastOpenedFile');
    } catch (e) {
      console.error('清除文件信息失败:', e);
    }
  };

  const findNodePath = (nodes, targetId, path = []) => {
    for (let node of nodes) {
      const currentPath = [...path, node.id];
      if (node.id === targetId) {
        return currentPath;
      }
      if (node.children) {
        const result = findNodePath(node.children, targetId, currentPath);
        if (result) return result;
      }
    }
    return null;
  };

  // 添加加载图片文件的函数
  const loadImages = async () => {
    try {
      // console.log('开始加载图片列表...');
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/images`);
      // console.log('图片API响应状态:', response.status);

      if (response.ok) {
        const images = await response.json();
        // console.log('获取到的图片列表:', images);

        // 转换为统一格式，使用完整路径
        const imageNodes = images.map(image => ({
          name: image.name,
          type: 'file',
          imageUrl: `${CONFIG.API_BASE_URL}/files/images/${image.name}`,
          size: image.size,
          createdAt: image.createdAt,
          updatedAt: image.updatedAt
        }));
        // console.log('转换后的图片节点:', imageNodes);
        setImageFiles(imageNodes);

        // 删除以下自动展开代码：
        // setExpandedFolders(prev => {
        //   const newSet = new Set(prev);
        //   newSet.add('images');
        //   console.log('更新展开文件夹集合:', newSet);
        //   return newSet;
        // });
      } else {
        console.error('获取图片列表失败，状态码:', response.status);
      }
    } catch (error) {
      console.error('加载图片文件失败:', error);
    }
  };


  // 在组件顶部添加 ESC 键事件处理
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        // 第一优先级：关闭模态框
        if (imageViewerOpen) {
          setImageViewerOpen(false);
          setSelectedImage(null);
          return;
        }

        // 检查其他模态框状态（如果有）
        // 这里可以根据实际的模态框状态进行扩展

        // 第二优先级：清除搜索框内容
        const searchInput = document.querySelector('.search-box input');
        if (searchTerm) {
          // 如果搜索框有内容，清除内容
          setSearchTerm('');
          setSearchResults([]);

          // 如果搜索框聚焦，取消聚焦
          if (document.activeElement.tagName === 'INPUT' &&
              document.activeElement.closest('.search-box')) {
            document.activeElement.blur();
          }
          return;
        }

        // 第三优先级：退出聚焦状态
        if (document.activeElement.tagName === 'INPUT' &&
            document.activeElement.closest('.search-box')) {
          // 退出搜索框聚焦
          document.activeElement.blur();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [imageViewerOpen, searchResults, searchTerm]);

  // 在 FileExplorer.js 中添加键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 检查是否按下了 'f' 键，并且没有其他修饰键
      if (e.key === 'f' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
        // 检查当前是否没有模态框打开且没有输入框聚焦
        const isModalOpen = imageViewerOpen; // 可以根据实际模态框状态扩展
        const isInputFocused = document.activeElement.tagName === 'INPUT' ||
                              document.activeElement.tagName === 'TEXTAREA';

        if (!isModalOpen && !isInputFocused) {
          e.preventDefault();
          // 聚焦搜索框
          const searchInput = document.querySelector('.search-box input');
          if (searchInput) {
            searchInput.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageViewerOpen]); // 根据实际模态框状态添加依赖

  // 在 FileExplorer.js 组件中添加 useEffect 来监听图片定位事件
  useEffect(() => {
    const handleLocateAndOpenImage = async (event) => {
      const { fileName, imageUrl } = event.detail;
      // console.log('接收到定位图片请求:', fileName);

      try {
        // 1. 展开图片文件夹
        // setExpandedFolders(prev => {
        //   const newSet = new Set(prev);
        //   newSet.add('images');
        //   return newSet;
        // });

        // 2. 加载图片文件夹内容（如果尚未加载）
        if (imageFiles.length === 0) {
          await loadImages();
        }

        // 3. 在图片文件列表中查找对应文件
        const targetImage = imageFiles.find(img => img.name === fileName);

        if (targetImage) {
          // 4. 选中该图片文件
          const imageId = `image_${targetImage.name}`;
          setSelectedFiles(new Set([imageId]));

          // 5. 打开图片预览器
          setSelectedImage(targetImage);
          setImageViewerOpen(true);

          // console.log('成功定位并打开图片:', fileName);
        } else {
          console.warn('未找到对应图片文件:', fileName);

          // 可以添加用户提示
          alert(`未找到图片文件: ${fileName}`);
        }
      } catch (error) {
        console.error('定位图片时出错:', error);
        alert('定位图片时出错');
      }
    };

    // 添加事件监听器
    window.addEventListener('locateAndOpenImage', handleLocateAndOpenImage);

    // 清理函数
    return () => {
      window.removeEventListener('locateAndOpenImage', handleLocateAndOpenImage);
    };
  }, [imageFiles, loadImages]);

  // 修改自动加载文件的 useEffect
  // 修改 `FileExplorer.js` 中的自动加载 useEffect，确保不影响正常功能
  useEffect(() => {
    // console.log('检查自动加载条件:', {
    //   autoLoadLastFile,
    //   hasOnFileSelect: !!onFileSelect,
    //   isLoadingFromSearch,
    //   currentFileId,
    //   searchLoadedFileId
    // });

    // 在搜索加载期间完全禁用自动加载
    if (isLoadingFromSearch || searchLoadedFileId) {
      // console.log('搜索相关操作中，跳过自动加载');
      return;
    }

    if (autoLoadLastFile && onFileSelect && !currentFileId) {
      const lastFile = getLastOpenedFile();
      // console.log('获取最后打开的文件:', lastFile);

      // 确保最后打开的文件不是当前已加载的文件
      if (lastFile && lastFile.id !== currentFileId) {
        // console.log('准备自动加载最后打开的文件:', lastFile.id);

        const timer = setTimeout(async () => {
          // 再次检查状态，防止竞态条件
          if (isLoadingFromSearch || searchLoadedFileId || currentFileId) {
            console.log('状态已改变，取消自动加载');
            return;
          }

          try {
            console.log('开始验证文件是否存在:', `${apiBaseUrl}/${lastFile.id}`);
            const response = await fetch(`${apiBaseUrl}/${lastFile.id}`);
            if (response.ok) {
              console.log('文件存在，执行自动加载:', lastFile.id);
              onFileSelect(lastFile);
            } else {
              console.log('文件不存在，清除记录');
              clearLastOpenedFile();
            }
          } catch (err) {
            console.warn('自动加载失败:', err);
            clearLastOpenedFile();
          }
        }, 1000);

        return () => clearTimeout(timer);
      } else {
        console.log('最后打开文件与当前文件相同，跳过自动加载');
      }
    }
  }, [apiBaseUrl, onFileSelect, autoLoadLastFile, isLoadingFromSearch, currentFileId, searchLoadedFileId]);



  // 初始化加载文件树和图片
  // 分别处理文件树和图片加载
  useEffect(() => {
    loadFileTree();
  }, [apiBaseUrl]);


  useEffect(() => {
    if (fileTree.length > 0) {
      const hasImagesFolder = fileTree[0]?.children?.some(node => node.id === 'images');
      const hasJournalsFolder = fileTree[0]?.children?.some(node => node.id === 'journals');
      // console.log('检测目录:', { hasImagesFolder, hasJournalsFolder });
      if (hasImagesFolder) {
        // console.log('加载图片文件...');
        loadImages();
        getUsedImages();
      }

      if (hasJournalsFolder) {
        // console.log('加载日志文件...');
        loadJournals();
      }
    }
  }, [fileTree]);


  useEffect(() => {
    if (autoLoadLastFile && currentFileId) {
      // 展开到当前文件所在的路径
      const expandToNode = (nodes, targetId) => {
        const path = findNodePath(nodes, targetId);
        if (path) {
          setExpandedFolders(prev => {
            const newSet = new Set(prev);
            // 展开路径上的所有文件夹
            path.forEach(id => newSet.add(id));
            return newSet;
          });
        }
      };

      // 延迟执行确保文件树已加载
      const timer = setTimeout(() => {
        expandToNode(fileTree, currentFileId);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentFileId, fileTree, autoLoadLastFile]);


  // 添加一个新的 useEffect 来监听 fileTree 的变化
  // useEffect(() => {
  //   console.log('文件树已更新:', fileTree);
  //   // 检查是否包含 images 目录
  //   const findImagesFolder = (nodes) => {
  //     for (let node of nodes) {
  //       if (node.id === 'images') {
  //         console.log('在文件树中找到images目录:', node);
  //         return true;
  //       }
  //       if (node.children) {
  //         if (findImagesFolder(node.children)) return true;
  //       }
  //     }
  //     return false;
  //   };
  //
  //   if (fileTree.length > 0) {
  //     const hasImagesFolder = findImagesFolder(fileTree);
  //     console.log('文件树是否包含images目录:', hasImagesFolder);
  //     if (hasImagesFolder) {
  //       // 强制展开 images 目录
  //       setExpandedFolders(prev => new Set(prev).add('images'));
  //     }
  //   }
  // }, [fileTree]);

  // 添加调试 useEffect
  useEffect(() => {
    // console.log('=== 调试信息 ===');
    // console.log('fileTree:', fileTree);
    // console.log('imageFiles:', imageFiles);
    // console.log('expandedFolders:', expandedFolders);

    // 检查 fileTree 中是否包含 images 目录
    const hasImagesFolder = fileTree.length > 0 &&
      fileTree[0]?.children?.some(node => node.id === 'images');
    // console.log('fileTree 中是否包含 images 目录:', hasImagesFolder);

    // 检查 images 目录是否展开
    const isImagesExpanded = expandedFolders.has('images');
    // console.log('images 目录是否展开:', isImagesExpanded);
  }, [fileTree, imageFiles, expandedFolders]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        setIsShiftKeyDown(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setIsShiftKeyDown(false);
        setShiftStartFile(null); // 松开 Shift 键时重置起始文件
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const savedExpandedFolders = loadExpandedFolders();
    setExpandedFolders(savedExpandedFolders);
  }, []);

  useEffect(() => {
    // 从 localStorage 加载分页设置
    const loadPaginationSettings = () => {
      try {
        const savedSettings = localStorage.getItem('filePaginationSettings');
        if (savedSettings) {
          setFilePagination(JSON.parse(savedSettings));
        }
      } catch (e) {
        console.error('加载分页设置失败:', e);
      }
    };

    loadPaginationSettings();
  }, []);


  // useEffect(() => {
  //   console.log('=== FileExplorer 状态调试 ===');
  //   console.log('currentFileId:', currentFileId);
  //   console.log('isLoadingFromSearch:', isLoadingFromSearch);
  //   console.log('searchLoadedFileId:', searchLoadedFileId);
  //   console.log('autoLoadLastFile:', autoLoadLastFile);
  // }, [currentFileId, isLoadingFromSearch, searchLoadedFileId, autoLoadLastFile]);


  useEffect(() => {
    const handleTagSearchRequest = (event) => {
      const { tag } = event.detail;
      console.log('接收到标签搜索请求:', tag);

      const results = tagIndexManager.getTagSearchResults(tag);

      // 转换为搜索结果格式
      const searchResults = results.map(item => ({
        fileId: item.fileId,
        fileName: item.fileName,
        fileType: item.fileId.startsWith('journal_') ? 'journal' : 'file',
        matches: item.positions
      }));

      // 使用已存在的状态 setter
      setSearchResults(searchResults);
      setSearchTerm(tag);
    };

    window.addEventListener('tagSearchRequested', handleTagSearchRequest);

    return () => {
      window.removeEventListener('tagSearchRequested', handleTagSearchRequest);
    };
  }, []); // 依赖数组为空，因为 tagIndexManager 是全局实例


  useEffect(() => {
    // 当 currentFileId 改变时，更新相关状态
    if (currentFileId) {
      // 如果当前文件不是通过搜索加载的，清理搜索状态
      if (searchLoadedFileId && searchLoadedFileId !== currentFileId) {
        setIsLoadingFromSearch(false);
        setSearchLoadedFileId(null);
      }

      // 更新最后选中的文件
      setLastSelectedFile(currentFileId);
    }
  }, [currentFileId, searchLoadedFileId]);

  const saveExpandedFolders = (folders) => {
    try {
      localStorage.setItem('expandedFolders', JSON.stringify(Array.from(folders)));
    } catch (e) {
      console.error('保存展开文件夹状态失败:', e);
    }
  };

  const loadExpandedFolders = () => {
    try {
      const saved = localStorage.getItem('expandedFolders');
      return saved ? new Set(JSON.parse(saved)) : new Set(['root']);
    } catch (e) {
      console.error('加载展开文件夹状态失败:', e);
      return new Set(['root']);
    }
  };

  // 切换文件夹展开/折叠状态
  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      // 保存状态到本地存储
      saveExpandedFolders(newSet);
      return newSet;
    });
  };

  // 在文件树中查找节点
  const findNode = (nodes, id) => {
    for (let node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 在指定父节点下添加子节点（服务器端）
  // 修改 addChildNodeServer 函数，添加同名文件检查
  const addChildNodeServer = async (parentId, childNode) => {
    try {
      // 首先加载当前文件树以检查同名文件
      const currentTree = fileTree.length > 0 ? fileTree : await loadFileTree();

      // 查找父节点
      const findParentNode = (nodes, id) => {
        for (let node of nodes) {
          if (node.id === id) {
            return node;
          }
          if (node.children) {
            const found = findParentNode(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const parentNode = findParentNode(currentTree, parentId);

      // 检查同名文件并生成唯一文件名
      let uniqueName = childNode.name;
      if (parentNode && parentNode.children) {
        const siblings = parentNode.children;
        const existingNames = siblings
          .filter(sibling => sibling.type === childNode.type)
          .map(sibling => sibling.name);

        if (existingNames.includes(uniqueName)) {
          // 生成带"(副本)"的唯一文件名
          let counter = 1;
          let baseName = uniqueName;
          let extension = '';

          // 处理文件扩展名
          if (childNode.type === 'file' && uniqueName.includes('.')) {
            const lastDotIndex = uniqueName.lastIndexOf('.');
            baseName = uniqueName.substring(0, lastDotIndex);
            extension = uniqueName.substring(lastDotIndex);
          }

          // 循环直到找到唯一名称
          while (existingNames.includes(uniqueName)) {
            if (extension) {
              uniqueName = `${baseName}(副本${counter > 1 ? counter : ''})${extension}`;
            } else {
              uniqueName = `${baseName}(副本${counter > 1 ? counter : ''})`;
            }
            counter++;
          }
        }
      }

      const response = await fetch(`${apiBaseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentId,
          name: uniqueName, // 使用唯一文件名
          type: childNode.type,
          content: childNode.content || ''
        })
      });

      if (response.ok) {
        const newNode = await response.json();
        // 重新加载文件树以获取最新状态
        await loadFileTree();
        return newNode;
      } else {
        throw new Error('Failed to create node');
      }
    } catch (err) {
      setError(err.message);
      return null;
    }
  };


  // 从服务器删除节点
  const removeNodeServer = async (nodeId) => {
    try {
      const response = await fetch(`${apiBaseUrl}/${nodeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // 重新加载文件树以获取最新状态
        await loadFileTree();
        return true;
      } else {
        throw new Error('Failed to delete node');
      }
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // 重命名节点（服务器端）
  // 修改 renameNodeServer 函数
  const renameNodeServer = async (nodeId, newName) => {
    try {
      const response = await fetch(`${apiBaseUrl}/${nodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName })
      });

      if (response.ok) {
        // 只更新特定节点，而不是重新加载整个文件树
        setFileTree(prevTree => {
          const updateNodeName = (nodes) => {
            return nodes.map(node => {
              if (node.id === nodeId) {
                return { ...node, name: newName, updatedAt: new Date().toISOString() };
              }
              if (node.children) {
                return { ...node, children: updateNodeName(node.children) };
              }
              return node;
            });
          };
          return updateNodeName(prevTree);
        });
        return true;
      } else {
        throw new Error('Failed to rename node');
      }
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // 过滤文件树（搜索功能）
  const filterTree = (nodes, term) => {
    if (!term) return nodes;

    return nodes.filter(node => {
      if (node.name.toLowerCase().includes(term.toLowerCase())) {
        return true;
      }
      if (node.type === 'folder' && node.children) {
        const filteredChildren = filterTree(node.children, term);
        if (filteredChildren.length > 0) {
          return true;
        }
      }
      return false;
    }).map(node => {
      if (node.type === 'folder' && node.children) {
        return {
          ...node,
          children: filterTree(node.children, term)
        };
      }
      return node;
    });
  };

  // 开始重命名
  const startRename = (node) => {
    setEditingNodeId(node.id);
    setNewNodeName(node.name);
    setTimeout(() => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    }, 0);
  };

  // 完成重命名
  const finishRename = async (node) => {
    if (newNodeName && newNodeName !== node.name) {
      await renameNodeServer(node.id, newNodeName);
      // 重命名完成后，如果这是一个新创建的文件，应该通知父组件打开它
      if (onFileSelect && node.type === 'file') {
        // 创建一个更新后的节点对象
        const updatedNode = {
          ...node,
          name: newNodeName
        };
        // 延迟一小段时间确保重命名完成后再选择文件
        setTimeout(() => {
          onFileSelect(updatedNode);
        }, 100);
      }
    }
    setEditingNodeId(null);
    setNewNodeName('');
  };

  const loadJournals = async () => {
    try {
      // console.log('开始加载日志文件列表...');
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/journals`);
      // console.log('日志API响应状态:', response.status);

      if (response.ok) {
        const journals = await response.json();
        // console.log('获取到的日志列表:', journals);

        // 转换为统一格式，添加正确的 ID
        const journalNodes = journals.map(journal => ({
          id: `journal_${journal.name}`, // 添加唯一 ID
          name: journal.name,
          type: 'file',
          contentUrl: `${CONFIG.API_BASE_URL}/files/journals/${journal.name}`,
          size: journal.size,
          createdAt: journal.createdAt,
          updatedAt: journal.updatedAt
        }));
        // console.log('转换后的日志节点:', journalNodes);
        setJournalFiles(journalNodes);
      } else {
        console.error('获取日志列表失败，状态码:', response.status);
        const errorText = await response.text();
        console.error('错误详情:', errorText);
      }
    } catch (error) {
      console.error('加载日志文件失败:', error);
    }
  };

  // 添加多选处理函数
  const handleShiftSelect = (currentFile, folderId) => {
    // 获取当前文件夹中的所有文件
    let allFiles = [];
    if (folderId === 'journals') {
      allFiles = journalFiles.map(j => `journal_${j.name}`);
    } else if (folderId === 'images') {
      allFiles = imageFiles.map(i => `image_${i.name}`);
    }

    if (allFiles.length === 0) return;

    const currentFileId = `${folderId === 'journals' ? 'journal' : 'image'}_${currentFile.name}`;

    // 如果还没有设置起始文件，则设置当前文件为起始文件
    let startFileId = shiftStartFile;
    if (!startFileId) {
      startFileId = currentFileId;
      setShiftStartFile(startFileId);
    }

    const startIndex = allFiles.indexOf(startFileId);
    const currentIndex = allFiles.indexOf(currentFileId);

    if (startIndex === -1 || currentIndex === -1) return;

    const [start, end] = [startIndex, currentIndex].sort((a, b) => a - b);
    const newSelection = new Set();

    for (let i = start; i <= end; i++) {
      newSelection.add(allFiles[i]);
    }

    setSelectedFiles(newSelection);
  };

  const handleCtrlSelect = (file, fileType) => {
    const fileId = file.id || `${fileType}_${file.name}`;
    const newSelection = new Set(selectedFiles);

    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }

    setSelectedFiles(newSelection);
  };

  const traverseFileTree = (nodes, expandedFolders, callback) => {
    if (!nodes || nodes.length === 0) return [];

    const globalSortSettings = sortSettings.global || { sortBy: 'name', sortOrder: 'asc' };

    // 统一排序逻辑
    const sortedNodes = [...nodes].sort((a, b) => {
      // 文件夹优先显示
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;

      // 文件排序
      let compareResult = 0;
      switch (globalSortSettings.sortBy) {
        case 'name':
          compareResult = a.name.localeCompare(b.name, 'zh-CN', {
            numeric: true,
            sensitivity: 'base'
          });
          break;
        case 'createdAt':
          compareResult = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        case 'updatedAt':
          compareResult = new Date(a.updatedAt) - new Date(b.updatedAt);
          break;
        default:
          compareResult = a.name.localeCompare(b.name, 'zh-CN', {
            numeric: true,
            sensitivity: 'base'
          });
      }
      return globalSortSettings.sortOrder === 'asc' ? compareResult : -compareResult;
    });

    const result = [];

    sortedNodes.forEach(node => {
      if (node.type === 'file') {
        // 统一文件过滤条件
        if (!node.id.startsWith('image_') && !node.id.startsWith('journal_')) {
          if (callback) {
            callback(node);
          }
          result.push(node.id);
        }
      } else if (node.type === 'folder') {
        // 统一文件夹处理逻辑
        if (callback) {
          callback(node);
        }

        // 特殊文件夹处理
        if (node.id === 'images' || node.id === 'journals') {
          // 这些文件夹有独立的处理逻辑，在各自函数中处理
        } else if (expandedFolders.has(node.id) && node.children) {
          // 递归处理展开的普通文件夹
          const childResults = traverseFileTree(node.children, expandedFolders, callback);
          result.push(node.id); // 添加文件夹本身
          result.push(...childResults);
        }
      }
    });

    return result;
  };

  // 保持原有的多选处理函数，但优化普通文件夹的处理逻辑，使用统一的排序方式，确保使用与渲染一致的排序逻辑
  const handleShiftSelectForTree = (currentNode) => {
    console.log('Shift多选处理:', currentNode.id);

    // 使用统一的文件遍历逻辑获取文件顺序
    const displayOrder = traverseFileTree(
      fileTree.length > 0 ? fileTree[0].children : [],
      expandedFolders,
      null // 不需要回调函数
    );

    console.log('文件显示顺序 (按渲染顺序):', displayOrder);

    if (displayOrder.length === 0) {
      setSelectedFiles(new Set([currentNode.id]));
      setShiftStartFile(currentNode.id);
      setLastSelectedFile(currentNode.id);
      return;
    }

    let startFileId = shiftStartFile || currentNode.id;

    const startIndex = displayOrder.indexOf(startFileId);
    const currentIndex = displayOrder.indexOf(currentNode.id);

    console.log('起始索引:', startIndex, '当前索引:', currentIndex);

    if (startIndex === -1 || currentIndex === -1) {
      setSelectedFiles(new Set([currentNode.id]));
      setShiftStartFile(currentNode.id);
      setLastSelectedFile(currentNode.id);
      return;
    }

    const minIndex = Math.min(startIndex, currentIndex);
    const maxIndex = Math.max(startIndex, currentIndex);

    const newSelection = new Set();
    for (let i = minIndex; i <= maxIndex; i++) {
      newSelection.add(displayOrder[i]);
    }

    setSelectedFiles(newSelection);
    setLastSelectedFile(currentNode.id);

  };



  // 保持 Ctrl 多选功能不变
  const handleCtrlSelectForTree = (node) => {
    const newSelection = new Set(selectedFiles);

    if (newSelection.has(node.id)) {
      newSelection.delete(node.id);
    } else {
      newSelection.add(node.id);
    }

    setSelectedFiles(newSelection);
    setLastSelectedFile(node.id);
  };


  // 添加分页控制函数
  const handlePageChange = (folderId, page) => {
    setFilePagination(prev => {
      const newPagination = {
        ...prev,
        folders: {
          ...prev.folders,
          [folderId]: page
        }
      };

      // 保存到 localStorage
      try {
        localStorage.setItem('filePaginationSettings', JSON.stringify(newPagination));
      } catch (e) {
        console.error('保存分页设置失败:', e);
      }

      return newPagination;
    });
  };

  const getFolderPagination = (folderId) => {
    // 使用统一的 pageSize 设置
    const pageSize = (filePagination.global && filePagination.global.pageSize) || 10;
    // 使用文件夹独立的 currentPage 设置
    const currentPage = (filePagination.folders && filePagination.folders[folderId]) || 1;

    return { currentPage, pageSize };
  };

  // 辅助函数：对普通文件和文件夹进行排序
  const sortOtherFiles = (files, folderSortSettings) => {
    const folders = files.filter(file => file.type === 'folder');
    const regularFiles = files.filter(file => file.type !== 'folder');

    // 排序函数
    const sortFunction = (a, b) => {
      let compareA, compareB;

      switch (folderSortSettings.sortBy) {
        case 'name':
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
          break;
        case 'createdAt':
          compareA = new Date(a.createdAt).getTime();
          compareB = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          compareA = new Date(a.updatedAt).getTime();
          compareB = new Date(b.updatedAt).getTime();
          break;
        default:
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
      }

      if (compareA < compareB) {
        return folderSortSettings.sortOrder === 'asc' ? -1 : 1;
      }
      if (compareA > compareB) {
        return folderSortSettings.sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    };

    // 分别排序文件夹和文件
    folders.sort(sortFunction);
    regularFiles.sort(sortFunction);

    // 文件夹在前，文件在后
    return [...folders, ...regularFiles];
  };

  // 添加处理排序设置的函数 修改 handleSortChange 函数，只允许根目录修改全局排序设置
  const handleSortChange = (folderId, sortBy) => {
    // 只有根目录可以修改排序设置
    if (folderId !== 'root') {
      return;
    }

    setSortSettings(prev => {
      const currentSortBy = (prev.global && prev.global.sortBy) || 'name';
      const currentSortOrder = (prev.global && prev.global.sortOrder) || 'asc';

      // 如果点击的是当前排序字段，则切换排序顺序，否则设置为升序
      const newSortOrder = (currentSortBy === sortBy) ?
        (currentSortOrder === 'asc' ? 'desc' : 'asc') : 'asc';

      const newSettings = {
        ...prev,
        global: {
          sortBy: sortBy,
          sortOrder: newSortOrder
        }
      };

      // 保存到 localStorage
      try {
        localStorage.setItem('fileSortSettings', JSON.stringify(newSettings));
      } catch (e) {
        console.error('保存排序设置失败:', e);
      }

      return newSettings;
    });
  };


  const handlePageSizeChange = (pageSize) => {
    setFilePagination(prev => {
      const newPagination = {
        ...prev,
        global: {
          ...prev.global,
          pageSize: pageSize
        }
      };

      // 保存到 localStorage
      try {
        localStorage.setItem('filePaginationSettings', JSON.stringify(newPagination));
      } catch (e) {
        console.error('保存分页设置失败:', e);
      }

      return newPagination;
    });
  };



  // 修改 renderFolderWithPagination 函数，确保在无文件显示时也显示分页控件
  const renderFolderWithPagination = (node, level) => {
    // 获取文件夹中的文件并应用与 renderTree 相同的排序逻辑
    const children = node.children ? [...node.children] : [];

    // 使用全局排序设置对当前层级节点进行排序，保持与 renderTree 一致
    const globalSortSettings = sortSettings.global || { sortBy: 'name', sortOrder: 'asc' };

    // 分离文件夹和文件
    const folders = children.filter(child => child.type === 'folder');
    const files = children.filter(child => child.type === 'file');

    // 对文件夹和文件分别排序
    const sortNodes = (nodesToSort) => {
      return [...nodesToSort].sort((a, b) => {
        let compareResult = 0;

        switch (globalSortSettings.sortBy) {
          case 'name':
            compareResult = a.name.localeCompare(b.name, 'zh-CN', {
              numeric: true,
              sensitivity: 'base'
            });
            break;
          case 'createdAt':
            compareResult = new Date(a.createdAt) - new Date(b.createdAt);
            break;
          case 'updatedAt':
            compareResult = new Date(a.updatedAt) - new Date(b.updatedAt);
            break;
          default:
            compareResult = a.name.localeCompare(b.name, 'zh-CN', {
              numeric: true,
              sensitivity: 'base'
            });
        }

        return globalSortSettings.sortOrder === 'asc' ? compareResult : -compareResult;
      });
    };

    // 对文件夹和文件分别排序
    const sortedFolders = sortNodes(folders);
    const sortedFiles = sortNodes(files);

    // 合并结果：文件夹在前，文件在后
    const sortedChildren = [...sortedFolders, ...sortedFiles];

    const pagination = getFolderPagination(node.id);
    const pageSize = pagination.pageSize || 10;
    let currentPage = pagination.currentPage || 1;

    // 计算总页数并确保当前页不会超出范围
    const totalPages = Math.ceil(sortedChildren.length / pageSize);
    if (totalPages > 0 && currentPage > totalPages) {
      currentPage = totalPages;
      // 更新当前页到状态中
      handlePageChange(node.id, currentPage);
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentChildren = sortedChildren.slice(startIndex, endIndex);

    return (
      <div className="children">
        {currentChildren.map((childNode, index) => (
          <div key={childNode.id || `${node.id}_child_${index}`} className="file-node">
            {renderTree([childNode], level + 1)[0]}
          </div>
        ))}

        {/* 分页控件 - 修改显示条件以确保在需要时显示 */}
        {(sortedChildren.length > pageSize || totalPages > 1) && (
          <div className="pagination-controls" style={{ paddingLeft: `${(level + 1) * 16}px` }}>
            <button
              onClick={() => handlePageChange(node.id, 1)}
              disabled={currentPage === 1}
            >
              &lt;&lt;
            </button>
            <button
              onClick={() => handlePageChange(node.id, currentPage - 1)}
              disabled={currentPage === 1}
            >
              &lt;
            </button>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = Math.max(1, Math.min(
                  totalPages,
                  parseInt(e.target.value) || 1
                ));
                handlePageChange(node.id, page);
              }}
              className="page-input"
            />
            <span className="page-info">/ {totalPages || 1}</span>
            <button
              onClick={() => handlePageChange(node.id, currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              &gt;
            </button>
            <button
              onClick={() => handlePageChange(node.id, totalPages)}
              disabled={currentPage === totalPages}
            >
              &gt;&gt;
            </button>
          </div>
        )}
      </div>
    );
  };


  const renderTree = (nodes, level = 0) => {
    // 首先对当前层级的节点进行排序
    const globalSortSettings = sortSettings.global || { sortBy: 'name', sortOrder: 'asc' };

    // 分离文件夹和文件
    const folders = nodes.filter(node => node.type === 'folder');
    const files = nodes.filter(node => node.type === 'file');

    // 对文件夹和文件分别排序
    const sortNodes = (nodesToSort) => {
      return [...nodesToSort].sort((a, b) => {
        let compareResult = 0;

        switch (globalSortSettings.sortBy) {
          case 'name':
            compareResult = a.name.localeCompare(b.name, 'zh-CN', {
              numeric: true,
              sensitivity: 'base'
            });
            break;
          case 'createdAt':
            compareResult = new Date(a.createdAt) - new Date(b.createdAt);
            break;
          case 'updatedAt':
            compareResult = new Date(a.updatedAt) - new Date(b.updatedAt);
            break;
          default:
            compareResult = a.name.localeCompare(b.name, 'zh-CN', {
              numeric: true,
              sensitivity: 'base'
            });
        }

        return globalSortSettings.sortOrder === 'asc' ? compareResult : -compareResult;
      });
    };

    // 特殊处理：确保 images 和 journals 永远置顶
    const specialFolders = [];
    const regularFolders = [];

    // 确保 images 和 journals 始终在最前面
    const imagesFolder = folders.find(folder => folder.id === 'images');
    const journalsFolder = folders.find(folder => folder.id === 'journals');

    if (imagesFolder) specialFolders.push(imagesFolder);
    if (journalsFolder) specialFolders.push(journalsFolder);


    folders.forEach(folder => {
      if (folder.id !== 'images' && folder.id !== 'journals') {
        regularFolders.push(folder);
      }
    });

    // 对普通文件夹排序
    const sortedRegularFolders = sortNodes(regularFolders);
    // 对文件排序
    const sortedFiles = sortNodes(files);

    // 合并结果：特殊文件夹 -> 普通文件夹 -> 文件
    const finalSortedNodes = [...specialFolders, ...sortedRegularFolders, ...sortedFiles];

    return finalSortedNodes.map(node => {
      // 特殊处理 images 目录节点
      if (node.id === 'images') {
        const files = imageFiles;
        const pagination = getFolderPagination('images');
        const pageSize = pagination.pageSize || 10;
        const currentPage = pagination.currentPage || 1;
        const totalPages = Math.ceil(files.length / pageSize);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const currentImages = files.slice(startIndex, endIndex);

        return (
          <div key={node.id} className="file-node">
            <div
              className={`node-content ${node.type} ${currentFileId === node.id ? 'active' : ''}`}
              style={{ paddingLeft: `${level * 16}px` }}
              onClick={() => toggleFolder(node.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY,
                  node: node
                });
              }}
            >
              <span className="toggle">
                {expandedFolders.has(node.id) ? '▼' : '▶'}
              </span>
              <span className="icon">📁</span>
              <span className="node-name">{node.name}</span>
            </div>
            {expandedFolders.has(node.id) && (
              <div className="children">
                {currentImages.map((image, index) => {
                  const imageId = `image_${image.name}`;
                  return (
                    <div key={`image_${image.name}_${index}`} className="file-node">
                      <div
                        className={`node-content file ${currentFileId === imageId ? 'active' : ''} ${selectedFiles.has(imageId) ? 'selected' : ''}`}
                        style={{ paddingLeft: `${(level + 1) * 16}px` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (e.shiftKey) {
                            handleShiftSelect(image, 'images');
                          } else if (e.ctrlKey || e.metaKey) {
                            handleCtrlSelect(image, 'image');
                            setLastSelectedFile(imageId);
                          } else {
                            setSelectedFiles(new Set([imageId]));
                            setLastSelectedFile(imageId);
                            setShiftStartFile(imageId);
                            setSelectedImage(image);
                            setImageFilesCache(imageFiles);
                            setImageViewerOpen(true);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!selectedFiles.has(imageId)) {
                            setSelectedFiles(new Set([imageId]));
                            setLastSelectedFile(imageId);
                            setShiftStartFile(imageId);
                          }
                          setContextMenu({
                            visible: true,
                            x: e.clientX,
                            y: e.clientY,
                            node: { ...image, id: imageId, type: 'file' },
                            isMultiSelect: selectedFiles.size > 1
                          });
                        }}
                      >
                        <span className="icon">🖼️</span>
                        <span className="node-name">{image.name}</span>
                      </div>
                    </div>
                  );
                })}
                {imageFiles.length > pageSize && (
                  <div className="pagination-controls" style={{ paddingLeft: `${(level + 1) * 16}px` }}>
                    <button
                      onClick={() => handlePageChange('images', 1)}
                      disabled={currentPage === 1}
                    >
                      &lt;&lt;
                    </button>
                    <button
                      onClick={() => handlePageChange('images', currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      &lt;
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const page = Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1));
                        handlePageChange('images', page);
                      }}
                      className="page-input"
                    />
                    <span className="page-info">/ {totalPages}</span>
                    <button
                      onClick={() => handlePageChange('images', currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                       &gt;
                    </button>
                    <button
                      onClick={() => handlePageChange('images', totalPages)}
                      disabled={currentPage === totalPages}
                    >
                       &gt;&gt;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      // 特殊处理 journals 目录节点
      if (node.id === 'journals') {
        const journalFilesList = journalFiles;
        const journalPagination = getFolderPagination('journals');
        const journalPageSize = journalPagination.pageSize || 10;
        const journalCurrentPage = journalPagination.currentPage || 1;
        const journalTotalPages = Math.ceil(journalFilesList.length / journalPageSize);
        const journalStartIndex = (journalCurrentPage - 1) * journalPageSize;
        const journalEndIndex = journalStartIndex + journalPageSize;
        const currentJournals = journalFilesList.slice(journalStartIndex, journalEndIndex);

        return (
          <div key={node.id} className="file-node">
            <div
              className={`node-content ${node.type} ${currentFileId === node.id ? 'active' : ''}`}
              style={{ paddingLeft: `${level * 16}px` }}
              onClick={() => toggleFolder(node.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY,
                  node: node
                });
              }}
            >
              <span className="toggle">
                {expandedFolders.has(node.id) ? '▼' : '▶'}
              </span>
              <span className="icon">📁</span>
              <span className="node-name">{node.name}</span>
            </div>
            {expandedFolders.has(node.id) && (
              <div className="children">
                {currentJournals.map((journal, index) => {
                  const journalId = `journal_${journal.name}`;
                  return (
                    <div key={`journal_${journal.name}_${index}`} className="file-node">
                      <div
                        className={`node-content file ${currentFileId === journalId ? 'active' : ''} ${selectedFiles.has(journalId) ? 'selected' : ''}`}
                        style={{ paddingLeft: `${(level + 1) * 16}px` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (e.shiftKey) {
                            handleShiftSelect(journal, 'journals');
                          } else if (e.ctrlKey || e.metaKey) {
                            handleCtrlSelect(journal, 'journal');
                            setLastSelectedFile(journalId);
                          } else {
                            setSelectedFiles(new Set([journalId]));
                            setLastSelectedFile(journalId);
                            setShiftStartFile(journalId);
                            saveLastOpenedFile({ ...journal, id: journalId });
                            onFileSelect && onFileSelect({ ...journal, id: journalId });
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!selectedFiles.has(journalId)) {
                            setSelectedFiles(new Set([journalId]));
                            setLastSelectedFile(journalId);
                            setShiftStartFile(journalId);
                          }
                          setContextMenu({
                            visible: true,
                            x: e.clientX,
                            y: e.clientY,
                            node: { ...journal, id: journalId, type: 'file' },
                            isMultiSelect: selectedFiles.size > 1
                          });
                        }}
                      >
                        <span className="icon">📝</span>
                        <span className="node-name">{journal.name}</span>
                      </div>
                    </div>
                  );
                })}
                {journalFiles.length > journalPageSize && (
                  <div className="pagination-controls">
                    <button
                      onClick={() => handlePageChange('journals', 1)}
                      disabled={journalCurrentPage === 1}
                    >
                      &lt;&lt;
                    </button>
                    <button
                      onClick={() => handlePageChange('journals', journalCurrentPage - 1)}
                      disabled={journalCurrentPage === 1}
                    >
                      &lt;
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={journalTotalPages}
                      value={journalCurrentPage}
                      onChange={(e) => {
                        const page = Math.max(1, Math.min(journalTotalPages, parseInt(e.target.value) || 1));
                        handlePageChange('journals', page);
                      }}
                      className="page-input"
                    />
                    <span className="page-info">/ {journalTotalPages}</span>
                    <button
                      onClick={() => handlePageChange('journals', journalCurrentPage + 1)}
                      disabled={journalCurrentPage === journalTotalPages}
                    >
                       &gt;
                    </button>
                    <button
                      onClick={() => handlePageChange('journals', journalTotalPages)}
                      disabled={journalCurrentPage === journalTotalPages}
                    >
                       &gt;&gt;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      // 处理其他普通节点（文件和文件夹）
      return (
        <div key={node.id} className="file-node">
          <div
            className={`node-content ${node.type} ${currentFileId === node.id ? 'active' : ''} ${selectedFiles.has(node.id) ? 'selected' : ''}`}
            style={{ paddingLeft: `${level * 16}px` }}
            onClick={(e) => {
              if (node.type === 'folder') {
                toggleFolder(node.id);
              } else {
                if (e.shiftKey) {
                  handleShiftSelectForTree(node);
                } else if (e.ctrlKey || e.metaKey) {
                  handleCtrlSelectForTree(node);
                } else {
                  setSelectedFiles(new Set([node.id]));
                  setLastSelectedFile(node.id);
                  setShiftStartFile(node.id);
                  if (!isLoadingFromSearch && !searchLoadedFileId) {
                    saveLastOpenedFile(node);
                  }
                  onFileSelect && onFileSelect(node);
                }
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (!selectedFiles.has(node.id)) {
                setSelectedFiles(new Set([node.id]));
                setLastSelectedFile(node.id);
                setShiftStartFile(node.id);
              }
              setContextMenu({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                node: node
              });
            }}
          >
            {node.type === 'folder' && (
              <span className="toggle">
                {expandedFolders.has(node.id) ? '▼' : '▶'}
              </span>
            )}
            <span className="icon">
              {node.type === 'folder' ? '📂' : '📄'}
            </span>
            {editingNodeId === node.id ? (
              <input
                ref={editInputRef}
                type="text"
                className="rename-input"
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                onBlur={() => finishRename(node)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    finishRename(node);
                  } else if (e.key === 'Escape') {
                    setEditingNodeId(null);
                    setNewNodeName('');
                  }
                }}
              />
            ) : (
              <span className="node-name">{node.name}</span>
            )}
          </div>
          {node.type === 'folder' && expandedFolders.has(node.id) && node.children && (
            <div className="children">
              {/* 对于 images 和 journals 文件夹，使用专门的处理 */}
              {node.id === 'images' || node.id === 'journals' ? (
                // 这里保留原有的 images 和 journals 处理逻辑
                node.id === 'images' ?
                  // images 处理逻辑
                  (() => {
                    const files = imageFiles;
                    const pagination = getFolderPagination('images');
                    const pageSize = pagination.pageSize || 10;
                    let currentPage = pagination.currentPage || 1;
                    const totalPages = Math.ceil(files.length / pageSize);

                    // 确保当前页不会超出范围
                    if (totalPages > 0 && currentPage > totalPages) {
                      currentPage = totalPages;
                    }

                    const startIndex = (currentPage - 1) * pageSize;
                    const endIndex = startIndex + pageSize;
                    const currentImages = files.slice(startIndex, endIndex);

                    return (
                      <>
                        {currentImages.map((image, index) => {
                          const imageId = `image_${image.name}`;
                          return (
                            <div key={`image_${image.name}_${index}`} className="file-node">
                              <div
                                className={`node-content file ${currentFileId === imageId ? 'active' : ''} ${selectedFiles.has(imageId) ? 'selected' : ''}`}
                                style={{ paddingLeft: `${(level + 1) * 16}px` }}
                                onClick={(e) => {
                                  e.stopPropagation();

                                  // 处理多选
                                  if (e.shiftKey) {
                                    // Shift键选择连续文件，使用固定的起始文件
                                    handleShiftSelect(image, 'images');
                                  } else if (e.ctrlKey || e.metaKey) {
                                    // Ctrl/Cmd键选择多个文件
                                    handleCtrlSelect(image, 'image');
                                    // 更新 lastSelectedFile 用于后续的 Shift 选择
                                    setLastSelectedFile(imageId);
                                  } else {
                                    // 单选
                                    setSelectedFiles(new Set([imageId]));
                                    setLastSelectedFile(imageId);
                                    setShiftStartFile(imageId); // 重置 Shift 起始文件
                                    // 打开图片预览模态框
                                    setSelectedImage(image);
                                    setImageFilesCache(imageFiles);
                                    setImageViewerOpen(true);
                                  }
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();

                                  // 如果该文件未被选中，则清空选择并选中该文件
                                  if (!selectedFiles.has(imageId)) {
                                    setSelectedFiles(new Set([imageId]));
                                    setLastSelectedFile(imageId);
                                    setShiftStartFile(imageId); // 重置 Shift 起始文件
                                  }

                                  setContextMenu({
                                    visible: true,
                                    x: e.clientX,
                                    y: e.clientY,
                                    node: { ...image, id: imageId, type: 'file' },
                                    isMultiSelect: selectedFiles.size > 1
                                  });
                                }}
                              >
                                <span className="icon">🖼️</span>
                                <span className="node-name">{image.name}</span>
                              </div>
                            </div>
                          );
                        })}

                        {/* 分页控件 */}
                        {files.length > pageSize && (
                          <div className="pagination-controls" style={{ paddingLeft: `${(level + 1) * 16}px` }}>
                            <button
                              onClick={() => handlePageChange('images', 1)}
                              disabled={currentPage === 1}
                            >
                              &lt;&lt;
                            </button>
                            <button
                              onClick={() => handlePageChange('images', currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              &lt;
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={totalPages}
                              value={currentPage}
                              onChange={(e) => {
                                const page = Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1));
                                handlePageChange('images', page);
                              }}
                              className="page-input"
                            />
                            <span className="page-info">/ {totalPages}</span>
                            <button
                              onClick={() => handlePageChange('images', currentPage + 1)}
                              disabled={currentPage === totalPages}
                            >
                               &gt;
                            </button>
                            <button
                              onClick={() => handlePageChange('images', totalPages)}
                              disabled={currentPage === totalPages}
                            >
                               &gt;&gt;
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()
                  :
                  // journals 处理逻辑
                  (() => {
                    const journalFilesList = journalFiles;
                    const journalPagination = getFolderPagination('journals');
                    const journalPageSize = journalPagination.pageSize || 10;
                    let journalCurrentPage = journalPagination.currentPage || 1;
                    const journalTotalPages = Math.ceil(journalFilesList.length / journalPageSize);

                    // 确保当前页不会超出范围
                    if (journalTotalPages > 0 && journalCurrentPage > journalTotalPages) {
                      journalCurrentPage = journalTotalPages;
                    }

                    const journalStartIndex = (journalCurrentPage - 1) * journalPageSize;
                    const journalEndIndex = journalStartIndex + journalPageSize;
                    const currentJournals = journalFilesList.slice(journalStartIndex, journalEndIndex);

                    return (
                      <>
                        {currentJournals.map((journal, index) => {
                          const journalId = `journal_${journal.name}`;
                          return (
                            <div key={`journal_${journal.name}_${index}`} className="file-node">
                              <div
                                className={`node-content file ${currentFileId === journalId ? 'active' : ''} ${selectedFiles.has(journalId) ? 'selected' : ''}`}
                                style={{ paddingLeft: `${(level + 1) * 16}px` }}
                                onClick={(e) => {
                                  e.stopPropagation();

                                  // 处理多选
                                  if (e.shiftKey) {
                                    // Shift键选择连续文件，使用固定的起始文件
                                    handleShiftSelect(journal, 'journals');
                                  } else if (e.ctrlKey || e.metaKey) {
                                    // Ctrl/Cmd键选择多个文件
                                    handleCtrlSelect(journal, 'journal');
                                    // 更新 lastSelectedFile 用于后续的 Shift 选择
                                    setLastSelectedFile(journalId);
                                  } else {
                                    // 单选
                                    setSelectedFiles(new Set([journalId]));
                                    setLastSelectedFile(journalId);
                                    setShiftStartFile(journalId); // 重置 Shift 起始文件
                                    // 打开日志文件
                                    saveLastOpenedFile({ ...journal, id: journalId });
                                    onFileSelect && onFileSelect({ ...journal, id: journalId });
                                  }
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();

                                  // 如果该文件未被选中，则清空选择并选中该文件
                                  if (!selectedFiles.has(journalId)) {
                                    setSelectedFiles(new Set([journalId]));
                                    setLastSelectedFile(journalId);
                                    setShiftStartFile(journalId); // 重置 Shift 起始文件
                                  }

                                  setContextMenu({
                                    visible: true,
                                    x: e.clientX,
                                    y: e.clientY,
                                    node: { ...journal, id: journalId, type: 'file' },
                                    isMultiSelect: selectedFiles.size > 1
                                  });
                                }}
                              >
                                <span className="icon">📝</span>
                                <span className="node-name">{journal.name}</span>
                              </div>
                            </div>
                          );
                        })}

                        {/* 分页控件 */}
                        {journalFiles.length > journalPageSize && (
                          <div className="pagination-controls">
                            <button
                              onClick={() => handlePageChange('journals', 1)}
                              disabled={journalCurrentPage === 1}
                            >
                              &lt;&lt;
                            </button>
                            <button
                              onClick={() => handlePageChange('journals', journalCurrentPage - 1)}
                              disabled={journalCurrentPage === 1}
                            >
                              &lt;
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={journalTotalPages}
                              value={journalCurrentPage}
                              onChange={(e) => {
                                const page = Math.max(1, Math.min(journalTotalPages, parseInt(e.target.value) || 1));
                                handlePageChange('journals', page);
                              }}
                              className="page-input"
                            />
                            <span className="page-info">/ {journalTotalPages}</span>
                            <button
                              onClick={() => handlePageChange('journals', journalCurrentPage + 1)}
                              disabled={journalCurrentPage === journalTotalPages}
                            >
                               &gt;
                            </button>
                            <button
                              onClick={() => handlePageChange('journals', journalTotalPages)}
                              disabled={journalCurrentPage === journalTotalPages}
                            >
                               &gt;&gt;
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()
              ) : (
                // 对于其他文件夹，递归渲染子节点
                renderFolderWithPagination(node, level)
              )}
            </div>
          )}
        </div>
      );
    });
  };


  // 添加处理移动操作的函数
  const handleMoveTo = (sourceNode) => {
    // 验证源节点
    if (!sourceNode) {
      console.error('无效的源节点');
      return;
    }

    // 设置源节点（单个节点或多个选中节点）
    const sources = selectedFiles.size > 1
      ? Array.from(selectedFiles).map(id => findNode(fileTree, id)).filter(Boolean)
      : [sourceNode];

    // 验证是否有有效的源节点
    if (sources.length === 0) {
      alert('没有选中有效的文件或文件夹');
      return;
    }

    setMoveToSourceNodes(sources);
    setMoveToModalOpen(true);
  };

  // 处理上下文菜单操作 修改 handleContextMenuAction 函数，只在根目录显示排序选项
  const handleContextMenuAction = async (action, pageSize) => {
    const node = contextMenu.node;
    const isMultiSelect = contextMenu.isMultiSelect;
    setContextMenu({ visible: false, x: 0, y: 0, node: null });

    switch (action) {
      // 只有根目录才显示排序选项
      case 'setSortBy':
        // 从 action 参数中提取排序字段
        const sortBy = pageSize; // 这里复用了 pageSize 参数来传递排序字段
        // 只有根目录可以修改排序
        if (node.id === 'root') {
          handleSortChange(node.id, sortBy);
        }
        break;

      // 其他操作保持不变
      case 'previewImage':
        // 打开图片预览模态框
        setSelectedImage(node);
        setImageViewerOpen(true);
        break;

      case 'delete':
        // 检查是否是多选删除
        const isMultiSelectDelete = selectedFiles.size > 1 && selectedFiles.has(node.id);

        if (isMultiSelectDelete) {
          // 批量删除普通文件
          if (window.confirm(`确定要删除选中的 ${selectedFiles.size} 个文件吗？此操作不可撤销。`)) {
            try {
              let successCount = 0;
              let failCount = 0;

              // 逐个删除选中的文件
              for (const fileId of selectedFiles) {
                try {
                  const response = await fetch(`${apiBaseUrl}/${fileId}`, {
                    method: 'DELETE'
                  });

                  if (response.ok) {
                    successCount++;
                  } else {
                    failCount++;
                  }
                } catch (error) {
                  console.error(`删除文件 ${fileId} 失败:`, error);
                  failCount++;
                }
              }

              // 重新加载文件树
              await loadFileTree();
              setSelectedFiles(new Set());

              if (failCount === 0) {
                alert(`成功删除 ${successCount} 个文件`);
              } else {
                alert(`删除完成：成功 ${successCount} 个，失败 ${failCount} 个`);
              }
            } catch (error) {
              console.error('批量删除文件失败:', error);
              alert('批量删除文件时发生错误');
            }
          }
        } else {
          // 单个删除
          setDeleteConfirmation({ show: true, node: node });
        }
        break;

      case 'setPageSize':
        handlePageSizeChange(pageSize);
        break;

      case 'moveTo':
        // 实现移动功能的逻辑
        handleMoveTo(node);
        break;

      case 'createFile':
        const newFile = {
          name: '未命名文件.md',
          type: 'file',
          content: ''
        };
        const createdFile = await addChildNodeServer(node.id, newFile);
        if (createdFile) {
          // 重命名完成后，自动打开新创建的文件
          if (onFileSelect && createdFile.type === 'file') {
            // 延迟一小段时间确保创建完成后再选择文件
            setTimeout(() => {
              onFileSelect(createdFile);
            }, 100);
          }
        }
        break;

      case 'createFolder':
        const newFolder = {
          name: '新建文件夹',
          type: 'folder',
          children: []
        };
        await addChildNodeServer(node.id, newFolder);
        break;

      case 'rename':
        startRename(node);
        break;

      case 'deleteJournal':
        if (isMultiSelect && selectedFiles.size > 1) {
          // 批量删除日志文件
          if (window.confirm(`确定要删除选中的 ${selectedFiles.size} 个日志文件吗？此操作不可撤销。`)) {
            try {
              const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/journals/batch-delete`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fileNames: Array.from(selectedFiles).map(id => id.replace('journal_', '')) })
              });

              if (response.ok) {
                // 重新加载日志文件列表
                await loadJournals();
                setSelectedFiles(new Set());
                alert('日志文件已删除');
              } else {
                alert('删除日志文件失败');
              }
            } catch (error) {
              console.error('批量删除日志文件失败:', error);
              alert('删除日志文件时发生错误');
            }
          }
        } else {
          // 单个删除日志文件
          if (window.confirm(`确定要删除日志文件 "${node.name}" 吗？此操作不可撤销。`)) {
            try {
              const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/journal/${node.name}`, {
                method: 'DELETE'
              });

              if (response.ok) {
                // 重新加载日志文件列表
                await loadJournals();
                alert('日志文件已删除');
              } else {
                alert('删除日志文件失败');
              }
            } catch (error) {
              console.error('删除日志文件失败:', error);
              alert('删除日志文件时发生错误');
            }
          }
        }
        break;

      case 'deleteUnused':
        if (window.confirm('确定要删除所有未使用的图片吗？此操作不可撤销。')) {
          try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/images/delete-unused`, {
              method: 'DELETE'
            });

            if (response.ok) {
              // 刷新文件列表
              await loadImages();
              await getUsedImages();
              alert('未使用图片已删除');
            } else {
              const result = await response.json();
              alert(`删除失败: ${result.error || '未知错误'}`);
            }
          } catch (error) {
            console.error('删除未使用图片失败:', error);
            alert('删除未使用图片时发生错误');
          }
        }
        break;

      default:
        break;
    }
  };

  // 确认删除
  const confirmDelete = async () => {
    const node = deleteConfirmation.node;
    if (node) {
      // 如果删除的是当前保存的文件，清除记录
      const lastFile = getLastOpenedFile();
      if (lastFile && lastFile.id === node.id) {
        clearLastOpenedFile();
      }

      await removeNodeServer(node.id);

      // 如果删除的是当前打开的文件，通知父组件
      if (onFileDelete) {
        onFileDelete(node);
      }
    }
    setDeleteConfirmation({ show: false, node: null });
  };

  // 取消删除
  const cancelDelete = () => {
    setDeleteConfirmation({ show: false, node: null });
  };



  // 修改搜索处理函数，添加标签搜索支持
  const handleSearch = async (term) => {
    // 检查是否是标签搜索（以#开头）
    if (term && term.startsWith('#')) {
      // 执行标签搜索
      handleTagSearch(term);
      return;
    }

    // 原有的文件名和全文搜索逻辑
    if (!term || !term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchTerm(term);

    try {
      // 搜索普通文件内容
      const fileSearchResults = await searchInFiles(term, fileTree);

      // 搜索手账文件内容
      const journalSearchResults = await searchInJournalFiles(term);

      // 合并搜索结果
      const allResults = [...fileSearchResults, ...journalSearchResults];
      setSearchResults(allResults);
    } catch (error) {
      console.error('搜索出错:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 添加标签搜索处理函数
  const handleTagSearch = (tag) => {
    console.log('执行标签搜索:', tag);

    const results = tagIndexManager.getTagSearchResults(tag);

    // 转换为搜索结果格式
    const searchResults = results.map(item => ({
      fileId: item.fileId,
      fileName: item.fileName,
      fileType: item.fileId.startsWith('journal_') ? 'journal' : 'file',
      matches: item.positions
    }));

    setSearchResults(searchResults);
    setIsSearching(false);
    setSearchTerm(tag);
  };


  // 搜索普通文件内容
  const searchInFiles = async (term, nodes) => {
    const results = [];

    const searchNode = async (node) => {
      if (node.type === 'file' && node.id !== 'welcome') {
        try {
          // 获取文件内容
          const response = await fetch(`${apiBaseUrl}/${node.id}`);
          if (response.ok) {
            const data = await response.json();
            const content = data.content || '';

            // 搜索匹配段落
            const matches = findMatchingParagraphs(content, term);
            if (matches.length > 0) {
              results.push({
                fileId: node.id,
                fileName: node.name,
                fileType: 'file',
                matches: matches
              });
            }
          }
        } catch (error) {
          console.error(`搜索文件 ${node.name} 出错:`, error);
        }
      }

      // 递归搜索子节点
      if (node.children) {
        for (const child of node.children) {
          await searchNode(child);
        }
      }
    };

    // 遍历所有节点
    for (const node of nodes) {
      await searchNode(node);
    }

    return results;
  };

  // 搜索手账文件内容
  const searchInJournalFiles = async (term) => {
    const results = [];

    try {
      // 获取所有手账文件
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/journals`);
      if (response.ok) {
        const journals = await response.json();

        // 并行搜索所有手账文件
        const searchPromises = journals.map(async (journal) => {
          try {
            const contentResponse = await fetch(`${CONFIG.API_BASE_URL}/api/files/journal/${journal.name}`);
            if (contentResponse.ok) {
              const data = await contentResponse.json();
              const content = data.content || '';

              // 搜索匹配段落
              const matches = findMatchingParagraphs(content, term);
              if (matches.length > 0) {
                return {
                  fileId: `journal_${journal.name}`,
                  fileName: journal.name,
                  fileType: 'journal',
                  matches: matches
                };
              }
            }
          } catch (error) {
            console.error(`搜索手账文件 ${journal.name} 出错:`, error);
          }
          return null;
        });

        const searchResults = await Promise.all(searchPromises);
        return searchResults.filter(result => result !== null);
      }
    } catch (error) {
      console.error('获取手账文件列表出错:', error);
    }

    return results;
  };

  // 查找匹配的段落
  const findMatchingParagraphs = (content, term) => {
    const matches = [];
    const lines = content.split('\n');
    const termLower = term.toLowerCase();

    // 按段落分组（以空行分隔）
    const paragraphs = [];
    let currentParagraph = [];

    lines.forEach(line => {
      if (line.trim() === '') {
        if (currentParagraph.length > 0) {
          paragraphs.push(currentParagraph.join('\n'));
          currentParagraph = [];
        }
      } else {
        currentParagraph.push(line);
      }
    });

    // 添加最后一个段落
    if (currentParagraph.length > 0) {
      paragraphs.push(currentParagraph.join('\n'));
    }

    // 在每个段落中查找匹配项
    paragraphs.forEach((paragraph, index) => {
      if (paragraph.toLowerCase().includes(termLower)) {
        // 找到匹配项在段落中的位置
        const matchIndex = paragraph.toLowerCase().indexOf(termLower);
        const contextStart = Math.max(0, matchIndex - 30);
        const contextEnd = Math.min(paragraph.length, matchIndex + term.length + 30);
        const context = paragraph.substring(contextStart, contextEnd);

        matches.push({
          paragraphIndex: index,
          paragraphContent: paragraph,
          context: context,
          matchPosition: matchIndex
        });
      }
    });

    return matches;
  };


  // 修改搜索输入框的处理
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 对于标签搜索，可以考虑实时显示结果
    if (value.startsWith('#') && value.length > 1) {
      // 标签搜索不需要实时处理，等待用户按Enter
    } else {
      // 文件名搜索使用防抖
      searchTimeoutRef.current = setTimeout(() => {
        if (value.trim()) {
          // 实时过滤文件树（仅按文件名）
          const filtered = filterTree(fileTree, value);
          // 这里可以设置一个状态用于显示文件名匹配结果
        }
      }, 300);
    }
  };

  // 在组件顶部添加引用
  const searchTimeoutRef = useRef(null);

  // 在组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);


  // 修改搜索框键盘事件处理
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      console.log('Enter键按下，执行搜索:', searchTerm);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      handleSearch(searchTerm);
    }
  };

  // 关闭上下文菜单
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu({ visible: false, x: 0, y: 0, node: null });
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [contextMenu.visible]);

  const filteredTree = filterTree(fileTree, searchTerm);


  if (loading) {
    return (
      <div className={`file-explorer ${collapsed ? 'collapsed' : ''}`}>
        <button onClick={onToggleCollapse} className="collapse-btn">
          {collapsed ? '▶' : '◀'}
        </button>
        {!collapsed && (
          <div className="explorer-main">
            <div className="explorer-header">
              <h3>文件资源管理器</h3>
            </div>
            <div className="explorer-content">
              <div className="loading-state">加载中...</div>
            </div>
          </div>
        )}
      </div>
    );
  }


  // 添加获取使用中的图片的函数
  const getUsedImages = async () => {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/used-images`);
      if (response.ok) {
        const images = await response.json();
        setUsedImages(images);
      }
    } catch (error) {
      console.error('获取使用中的图片失败:', error);
    }
  };



  const deleteImage = async (image) => {
    if (!image) return;

    if (window.confirm(`确定要删除图片 "${image.name}" 吗？此操作不可撤销。`)) {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/image/${image.name}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          // 重新加载图片列表
          await loadImages();

          // 如果删除的是当前查看的图片，关闭预览器
          if (selectedImage && selectedImage.name === image.name) {
            setImageViewerOpen(false);
            setSelectedImage(null);
          }

          alert('图片已删除');
        } else {
          const errorData = await response.json();
          alert(`删除图片失败: ${errorData.error || '未知错误'}`);
        }
      } catch (error) {
        console.error('删除图片失败:', error);
        alert(`删除图片时发生错误: ${error.message}`);
      }
    }
  };


  // 图片导航函数
  const handleNextImage = () => {
    if (!imageFilesCache || imageFilesCache.length <= 1) return;
    const currentIndex = selectedImage && imageFilesCache ?
      imageFilesCache.findIndex(img => img.name === selectedImage.name) : -1;
    const nextIndex = (currentIndex + 1) % imageFilesCache.length;
    setSelectedImage(imageFilesCache[nextIndex]);
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handlePrevImage = () => {
    if (!imageFilesCache || imageFilesCache.length <= 1) return;
    const currentIndex = selectedImage && imageFilesCache ?
      imageFilesCache.findIndex(img => img.name === selectedImage.name) : -1;
    const prevIndex = (currentIndex - 1 + imageFilesCache.length) % imageFilesCache.length;
    setSelectedImage(imageFilesCache[prevIndex]);
    setImageScale(1);
    setImagePosition({ x: 0, y: 0 });
  };



  const MoveToModal = () => {
    if (!moveToModalOpen) return null;

    const toggleMoveToFolder = (folderId) => {
      setExpandedMoveToFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderId)) {
          newSet.delete(folderId);
        } else {
          newSet.add(folderId);
        }
        return newSet;
      });
    };

    const handleFolderSelect = (folderNode) => {
      setMoveToTargetFolder(folderNode);
    };

    const handleMove = async () => {
      if (!moveToTargetFolder || moveToSourceNodes.length === 0) return;

      try {
        // For each source node, call the move API
        const movePromises = moveToSourceNodes.map(node => {
          // 修复API端点 - 使用正确的移动端点
          return fetch(`${apiBaseUrl}/${node.id}/move`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              targetFolderId: moveToTargetFolder.id,
              targetFolderName: moveToTargetFolder.name // 可能需要目标文件夹名称
            })
          });
        });

        const results = await Promise.all(movePromises);

        // 检查每个移动操作的结果
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (let i = 0; i < results.length; i++) {
          if (results[i].ok) {
            successCount++;
          } else {
            failCount++;
            try {
              const errorData = await results[i].json();
              errors.push(`"${moveToSourceNodes[i].name}": ${errorData.error || '未知错误'}`);
            } catch (e) {
              errors.push(`"${moveToSourceNodes[i].name}": 服务器响应错误`);
            }
          }
        }

        // 重新加载文件树以反映更改
        await loadFileTree();

        // 关闭模态框并重置状态
        setMoveToModalOpen(false);
        setMoveToSourceNodes([]);
        setMoveToTargetFolder(null);
        setSelectedFiles(new Set());

        // 显示结果消息
        if (failCount === 0) {
          alert(`成功移动 ${successCount} 个项目到 "${moveToTargetFolder.name}"`);
        } else {
          alert(`移动完成: ${successCount} 个成功, ${failCount} 个失败\n失败详情:\n${errors.join('\n')}`);
        }
      } catch (error) {
        console.error('移动文件失败:', error);
        alert(`移动文件时发生错误: ${error.message}`);
      }
    };

    const handleClose = () => {
      setMoveToModalOpen(false);
      setMoveToSourceNodes([]);
      setMoveToTargetFolder(null);
      setExpandedMoveToFolders(new Set(['root']));
    };

    // Render folder tree for selection
    const renderFolderTree = (nodes, level = 0) => {
      return nodes.map(node => {
        // Skip non-folders and source nodes
        if (node.type !== 'folder' || moveToSourceNodes.some(source => source.id === node.id)) {
          return null;
        }

        // Skip special folders: images and journals
        if (node.id === 'images' || node.id === 'journals') {
          return null;
        }

        // Skip children of source folders to prevent moving into themselves
        const isDescendantOfSource = moveToSourceNodes.some(source => {
          if (source.type !== 'folder') return false;
          return findNode([source], node.id) !== null;
        });

        if (isDescendantOfSource) {
          return null;
        }

        const isExpanded = expandedMoveToFolders.has(node.id);
        const hasChildren = node.children && node.children.length > 0;

        return (
          <div key={node.id} className="folder-node">
            <div
              className={`folder-item ${moveToTargetFolder?.id === node.id ? 'selected' : ''}`}
              style={{ paddingLeft: `${level * 20}px` }}
              onClick={() => handleFolderSelect(node)}
            >
              {hasChildren && (
                <span
                  className="expand-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMoveToFolder(node.id);
                  }}
                >
                  {isExpanded ? '−' : '+'}
                </span>
              )}
              <span className="icon">📁</span>
              <span className="folder-name">{node.name}</span>
            </div>
            {hasChildren && isExpanded && (
              <div className="folder-children">
                {renderFolderTree(node.children, level + 1)}
              </div>
            )}
          </div>
        );
      });
    };

    return (
      <div className="modal-overlay" onClick={handleClose}>
        <div className="move-to-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>移动到...</h3>
            <button className="close-button" onClick={handleClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="source-info">
              <p>移动以下项目:</p>
              <ul>
                {moveToSourceNodes.map(node => (
                  <li key={node.id}>{node.name}</li>
                ))}
              </ul>
            </div>
            <div className="folder-selector">
              <p>选择目标文件夹:</p>
              <div className="folder-tree">
                {fileTree.length > 0 && renderFolderTree(fileTree)}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={handleClose}>
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={handleMove}
              disabled={!moveToTargetFolder}
            >
              移动
            </button>
          </div>
        </div>
      </div>
    );
  };



  return (
    <div className={`file-explorer ${collapsed ? 'collapsed' : ''}`}>
      <button onClick={onToggleCollapse} className="collapse-btn">
        {collapsed ? '▶' : '◀'}
      </button>
      {!collapsed && (
        <div className="explorer-main">
          <div className="explorer-header">
            <h3>文件资源管理器</h3>
          </div>

          <div className="search-box" title="输入文件名或输入#标签快速搜索,按Enter键搜索文件内容">
            <input
              type="text"
              placeholder="搜索文件名或输入#标签搜索..."
              className="search-input"
              value={searchTerm}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
            />
            {isSearching && <div className="search-loading">搜索中...</div>}
            {searchTerm && (
              <button
                className="clear-search-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm('');
                  setSearchResults([]);
                  // 重新聚焦到搜索框
                  // setTimeout(() => {
                  //   const searchInput = document.querySelector('.task-system-search-input');
                  //   if (searchInput) {
                  //     searchInput.focus();
                  //   }
                  // }, 0);
                }}
                title="清空搜索"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                </svg>
              </button>
            )}
          </div>

          <div className="explorer-content">
            {error && (
              <div className="error-message">
                错误: {error}
                <button onClick={loadFileTree} className="retry-button">
                  重试
                </button>
              </div>
            )}

           {searchResults.length > 0 ? (
              <div className="search-results">
                <div className="search-results-header">
                  <h4>搜索结果 ({searchResults.length} 个文件)</h4>
                  <button
                    className="close-search-results"
                    onClick={() => {
                      setSearchResults([]);
                      setSearchTerm('');
                    }} // 点击关闭按钮清空搜索结果
                    title="关闭搜索结果"
                  >
                    ×
                  </button>
                </div>
                <div className="search-results-list">
                  {searchResults.map((result, index) => (
                    <div key={`${result.fileId || 'unknown'}_${index}`} className="search-result-item">
                      <div
                        className="search-result-file"
                        onClick={() => {
                          // 打开文件
                          if (result.fileId) {
                            if (result.fileId.startsWith('journal_')) {
                              const fileName = result.fileId.replace('journal_', '');
                              const journalNode = {
                                id: result.fileId,
                                name: fileName,
                                type: 'file'
                              };
                              onFileSelect && onFileSelect(journalNode);
                            } else {
                              const fileNode = findNode(fileTree, result.fileId);
                              fileNode && onFileSelect && onFileSelect(fileNode);
                            }
                          }
                        }}
                      >
                        <span className="icon">
                          {result.fileType === 'journal' ? '📝' : '📄'}
                        </span>
                        <span className="file-name">{result.fileName || '未知文件'}</span>
                        <span className="match-count">
                          ({(result.matches && Array.isArray(result.matches) ? result.matches.length : 0)} 处匹配)
                        </span>
                      </div>
                      <div className="search-result-matches">
                        {result.matches && Array.isArray(result.matches) && result.matches.map((match, matchIndex) => (
                          <div
                            key={matchIndex}
                            className="match-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              // 点击具体匹配项时才滚动到位置
                              if (result.fileId && match) {
                                // 先打开文件
                                let fileNode = null;
                                if (result.fileId.startsWith('journal_')) {
                                  const fileName = result.fileId.replace('journal_', '');
                                  fileNode = {
                                    id: result.fileId,
                                    name: fileName,
                                    type: 'file'
                                  };
                                } else {
                                  fileNode = findNode(fileTree, result.fileId);
                                }

                                if (fileNode && onFileSelect) {
                                  // 设置搜索状态
                                  setIsLoadingFromSearch(true);
                                  setSearchLoadedFileId(result.fileId);

                                  onFileSelect(fileNode);

                                  // 延迟执行滚动定位
                                  setTimeout(() => {
                                    window.dispatchEvent(new CustomEvent('selectSearchMatch', {
                                      detail: { match, fileId: result.fileId }
                                    }));

                                    // 重置搜索状态
                                    setTimeout(() => {
                                      setIsLoadingFromSearch(false);
                                    }, 2000);
                                  }, 500);
                                }
                              }
                            }}
                          >
                            <span className="match-context">
                              {match.context ? `...${match.context}...` : '上下文不可用'}
                            </span>
                            <span className="match-position">
                              段落 {(match.paragraphIndex !== undefined) ? match.paragraphIndex + 1 : '未知'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // 当没有搜索结果时显示正常的文件树
              <>
                {filteredTree.length > 0 ? (
                  renderTree(filteredTree)
                ) : (
                  <div className="empty-state">未找到匹配的文件</div>
                )}
              </>
            )}

          </div>

        </div>
      )}




      {/* 上下文菜单 */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.node && (
            <>
              {/* 图片文件的特殊菜单 */}
              {contextMenu.node.id && contextMenu.node.id.startsWith('image_') && (
                <>
                  <div className="menu-item" onClick={() => handleContextMenuAction('previewImage')}>
                    预览
                  </div>
                  <div className="menu-item" onClick={() => handleContextMenuAction('deleteImage')}>
                    删除
                  </div>
                </>
              )}

              {/* 手账文件菜单 */}
              {contextMenu.node.id && contextMenu.node.id.startsWith('journal_') && (
                <div className="menu-item" onClick={() => handleContextMenuAction('deleteJournal')}>
                  删除
                </div>
              )}

              {/* 图片目录菜单 */}
              {contextMenu.node.id === 'images' && (
                <div className="menu-item" onClick={() => handleContextMenuAction('deleteUnused')}>
                  删除未使用图片
                </div>
              )}

              {/* 只在根目录显示每页文件数选项 */}
              {contextMenu.node.id === 'root' && (
                <>
                  <div className="menu-item" onClick={() => handleContextMenuAction('createFile')}>
                    新建文件
                  </div>
                  <div className="menu-item" onClick={() => handleContextMenuAction('createFolder')}>
                    新建文件夹
                  </div>
                  <div className="divider"></div>
                  <div className="submenu">
                    <div className="menu-item">排序方式 ►</div>
                    <div className="submenu-content">
                      <div
                        className="menu-item"
                        onClick={() => handleContextMenuAction('setSortBy', 'name')}
                      >
                        {(sortSettings.global?.sortBy === 'name' ? '✓ ' : '')}按文件名
                      </div>
                      <div
                        className="menu-item"
                        onClick={() => handleContextMenuAction('setSortBy', 'createdAt')}
                      >
                        {(sortSettings.global?.sortBy === 'createdAt' ? '✓ ' : '')}按创建时间
                      </div>
                      <div
                        className="menu-item"
                        onClick={() => handleContextMenuAction('setSortBy', 'updatedAt')}
                      >
                        {(sortSettings.global?.sortBy === 'updatedAt' ? '✓ ' : '')}按修改时间
                      </div>
                    </div>
                  </div>
                  <div className="divider"></div>
                  <div className="submenu">
                    <div className="menu-item">每页文件数 ►</div>
                    <div className="submenu-content">
                      {[5, 10, 30, 50].map(size => (
                        <div
                          key={size}
                          className="menu-item"
                          onClick={() => handleContextMenuAction('setPageSize', size)}
                        >
                          {(filePagination.global?.pageSize || 10) === size ? '✓ ' : ''}{size}项/页
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 普通文件夹菜单（移除每页文件数选项）*/}
              {contextMenu.node.type === 'folder' &&
               contextMenu.node.id !== 'root' &&
               contextMenu.node.id !== 'images' &&
               contextMenu.node.id !== 'journals' && (
                <>
                  <div className="menu-item" onClick={() => handleContextMenuAction('createFile')}>
                    新建文件
                  </div>
                  <div className="menu-item" onClick={() => handleContextMenuAction('createFolder')}>
                    新建文件夹
                  </div>
                  <div className="menu-item" onClick={() => handleContextMenuAction('moveTo')}>
                    移动到...
                  </div>
                  <div className="menu-item" onClick={() => handleContextMenuAction('rename')}>
                    重命名
                  </div>
                </>
              )}


              {/* 普通文件菜单 */}
              {contextMenu.node.type === 'file' &&
               !contextMenu.node.id.startsWith('image_') &&
               !contextMenu.node.id.startsWith('journal_') && (
               <>
                  <div className="menu-item" onClick={() => handleContextMenuAction('delete')}>
                  删除
                  </div>
                  <div className="menu-item" onClick={() => handleContextMenuAction('moveTo')}>
                  移动到...
                  </div>
               </>
              )}

              {/* 普通文件重命名菜单 */}
              {contextMenu.node.type === 'file' &&
               !contextMenu.node.id.startsWith('image_') &&
               !contextMenu.node.id.startsWith('journal_') &&
               selectedFiles.size <= 1 && (
                <div className="menu-item" onClick={() => handleContextMenuAction('rename')}>
                  重命名
                </div>
              )}
            </>
          )}
        </div>
      )}


      {/* 删除确认弹窗 */}
      {deleteConfirmation.show && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>确认删除</h3>
            </div>
            <div className="modal-body">
              确定要删除 "{deleteConfirmation.node?.name}" 吗？此操作不可撤销。
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cancelDelete}>
                取消
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}


      <ImageViewerModal
        isOpen={imageViewerOpen}
        selectedImage={selectedImage}
        imageFilesCache={imageFilesCache}
        onClose={() => setImageViewerOpen(false)}
        onNext={handleNextImage}
        onPrev={handlePrevImage}
        imageScale={imageScale}
        setImageScale={setImageScale}
        imagePosition={imagePosition}
        setImagePosition={setImagePosition}
        onDelete={deleteImage}
        onFileSelect={onFileSelect} // 添加这一行
      />

      {MoveToModal()}
    </div>
  );
};

// 导出 tagIndexManager 供其他组件使用
export { tagIndexManager };
export default FileExplorer;
