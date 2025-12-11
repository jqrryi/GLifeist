// src/components/NoteTab.js
import React, { useState, useEffect, useRef } from 'react';
import FileExplorer, { tagIndexManager } from './FileExplorer';
import MarkdownEditor from './MarkDownEditor';
import CONFIG from '../config';
import './NoteTab.css';

const NoteTab = ({autoSaveInterval = 12, onShowStatus,codeSettings,stats,characterSettings,taskFieldMappings,expFormulas,quickAddTaskHint,customDomain, settings, onUpdateSettings}) => {
  const [currentFile, setCurrentFile] = useState(null);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'success', 'error'
  // const [settings, setSettings] = useState({}); // 添加设置状态
  const lastFocusedFileRef = useRef(null); // 记录上次聚焦的文件ID



  // 处理文件选择
  const handleFileSelect1 = async (file) => {
    // 特殊处理日志文件
    if (file.id && file.id.startsWith('journal_')) {
      try {
        // 如果选择的是日志文件，从服务器获取内容
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/journal/${file.name}`);
        if (response.ok) {
          const data = await response.json();
          const fileWithContent = {
            ...file,
            content: data.content,
            updatedAt: new Date().toISOString()
          };

          setCurrentFile(fileWithContent);

          // 只有在文件真正改变时才聚焦
          if (lastFocusedFileRef.current !== file.id) {
            lastFocusedFileRef.current = file.id;
            // 延迟聚焦以确保组件已完全更新
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('focusMarkdownEditor', {
                detail: { fileId: file.id }
              }));
            }, 150);
          }
        } else {
          console.error('获取日志文件内容失败');
          setCurrentFile(file);
        }
      } catch (error) {
        console.error('获取日志文件内容时出错:', error);
        setCurrentFile(file);
      }
      return;
    }

    // 处理普通文件
    if (file.type === 'file') {
      try {
        // 避免重复加载同一个文件
        if (currentFile && currentFile.id === file.id) {
          return;
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/${file.id}`);
        if (response.ok) {
          const data = await response.json();
          const fileWithContent = {
            ...file,
            content: data.content,
            updatedAt: new Date().toISOString()
          };

          setCurrentFile(fileWithContent);

          // 只有在文件真正改变时才聚焦
          if (lastFocusedFileRef.current !== file.id) {
            lastFocusedFileRef.current = file.id;
            // 延迟聚焦以确保组件已完全更新
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('focusMarkdownEditor', {
                detail: { fileId: file.id }
              }));
            }, 150);
          }
        } else {
          console.error('获取文件内容失败');
          setCurrentFile(file);
        }
      } catch (error) {
        console.error('获取文件内容时出错:', error);
        setCurrentFile(file);
      }
    } else {
      // 如果选择的是文件夹，清空当前文件
      setCurrentFile(null);
      lastFocusedFileRef.current = null;
    }
  };
  const handleFileSelect = async (file) => {
    // 特殊处理日志文件
    if (file.id && file.id.startsWith('journal_')) {
      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/journal/${file.name}`);
        if (response.ok) {
          const data = await response.json();
          const fileWithContent = {
            ...file,
            content: data.content,
            updatedAt: new Date().toISOString()
          };

          setCurrentFile(fileWithContent);

          // 更新标签索引
          const fileModifiedTime = new Date().toISOString();
          tagIndexManager.updateFileIndex(file.id, file.name, data.content, fileModifiedTime);

          if (lastFocusedFileRef.current !== file.id) {
            lastFocusedFileRef.current = file.id;
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('focusMarkdownEditor', {
                detail: { fileId: file.id }
              }));
            }, 150);
          }
        } else {
          console.error('获取日志文件内容失败');
          setCurrentFile(file);
        }
      } catch (error) {
        console.error('获取日志文件内容时出错:', error);
        setCurrentFile(file);
      }
      return;
    }

    // 处理普通文件
    if (file.type === 'file') {
      try {
        if (currentFile && currentFile.id === file.id) {
          return;
        }

        const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/${file.id}`);
        if (response.ok) {
          const data = await response.json();
          const fileWithContent = {
            ...file,
            content: data.content,
            updatedAt: new Date().toISOString()
          };

          setCurrentFile(fileWithContent);

          // 更新标签索引
          const fileModifiedTime = new Date().toISOString();
          tagIndexManager.updateFileIndex(file.id, file.name, data.content, fileModifiedTime);

          if (lastFocusedFileRef.current !== file.id) {
            lastFocusedFileRef.current = file.id;
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('focusMarkdownEditor', {
                detail: { fileId: file.id }
              }));
            }, 150);
          }
        } else {
          console.error('获取文件内容失败');
          setCurrentFile(file);
        }
      } catch (error) {
        console.error('获取文件内容时出错:', error);
        setCurrentFile(file);
      }
    } else {
      setCurrentFile(null);
      lastFocusedFileRef.current = null;
    }
  };

  // 处理文件保存
  const handleFileSave1 = async (content, fileName) => {
    if (!currentFile) return;

    try {
      setSaveStatus('saving');

      // 调用后端 API 保存文件内容
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/${currentFile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          name: fileName || currentFile.name
        })
      });

      if (response.ok) {
        // 更新当前文件内容
        const updatedFile = {
          ...currentFile,
          content, // 确保这里更新了 content
          updatedAt: new Date().toISOString()
        };
        setCurrentFile(updatedFile); // 这里很关键，要更新当前文件状态
        setSaveStatus('success');

        // 2秒后清除成功状态
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('保存文件时出错:', error);
      setSaveStatus('error');
    }
  };
  const handleFileSave = async (content, fileName) => {
    if (!currentFile) return;

    try {
      setSaveStatus('saving');

      const response = await fetch(`${CONFIG.API_BASE_URL}/api/files/${currentFile.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          name: fileName || currentFile.name
        })
      });

      if (response.ok) {
        const updatedFile = {
          ...currentFile,
          content,
          updatedAt: new Date().toISOString()
        };
        setCurrentFile(updatedFile);

        // 更新标签索引
        const fileModifiedTime = new Date().toISOString();
        tagIndexManager.updateFileIndex(currentFile.id, currentFile.name, content, fileModifiedTime);

        setSaveStatus('success');
        setTimeout(() => setSaveStatus(''), 2000);
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('保存文件时出错:', error);
      setSaveStatus('error');
    }
  };


  // 处理文件创建
  const handleFileCreate = (parentFolder) => {
    // FileExplorer 组件已经处理了文件创建逻辑
    // 这里可以添加额外的处理逻辑（如果需要）
    console.log('创建新文件在文件夹:', parentFolder);
  };

  // 处理文件夹创建
  const handleFolderCreate = (parentFolder) => {
    // FileExplorer 组件已经处理了文件夹创建逻辑
    // 这里可以添加额外的处理逻辑（如果需要）
    console.log('创建新文件夹在文件夹:', parentFolder);
  };

  // 处理重命名
  const handleFileRename = (node) => {
    // FileExplorer 组件已经处理了重命名逻辑
    // 这里可以添加额外的处理逻辑（如果需要）
    console.log('重命名节点:', node);
  };

  // 处理删除
  const handleFileDelete = (node) => {
    // FileExplorer 组件已经处理了删除逻辑
    // 如果删除的是当前打开的文件，关闭它
    if (currentFile && currentFile.id === node.id) {
      setCurrentFile(null);
    }
    console.log('删除节点:', node);
  };

  // 计算自动保存间隔（毫秒）
  // const autoSaveInterval = (settings.noteAutoSaveInterval || 15) * 1000;

  return (
    <div className="note-tab">
      <div className="note-content">
        <FileExplorer
          onFileSelect={handleFileSelect}
          onFileCreate={handleFileCreate}
          onFolderCreate={handleFolderCreate}
          onFileRename={handleFileRename}
          onFileDelete={handleFileDelete}
          currentFileId={currentFile?.id}
          collapsed={isExplorerCollapsed}
          onToggleCollapse={() => setIsExplorerCollapsed(!isExplorerCollapsed)}
          autoLoadLastFile={true} // 启用自动加载上次打开的文件
        />
        <div className="editor-area">
          {currentFile ? (
            <MarkdownEditor
              initialValue={currentFile.content || ''}
              onFileSave={handleFileSave}
              fileName={currentFile.name}
              autoSaveInterval={autoSaveInterval*1000} // 传递自动保存间隔配置
              currentField="note-editor" // 添加上下文标识
              onShowStatus={onShowStatus} // 传递状态显示函数
              codeSettings={codeSettings}
              stats={stats}
              characterSettings={characterSettings}
              taskFieldMappings={taskFieldMappings}
              expFormulas={expFormulas}
              quickAddTaskHint={quickAddTaskHint}
              customDomain={customDomain}
              settings={settings}
              onUpdateSettings={onUpdateSettings}
            />
          ) : (
            <div className="editor-placeholder">
              <p>请选择一个文件或创建新文件</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteTab;
