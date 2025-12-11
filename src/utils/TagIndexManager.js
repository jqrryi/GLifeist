class TagIndexManager {
  constructor() {
    this.storageKey = 'markdown-tag-index';
    this.tagIndex = this.loadIndexFromStorage();
  }

  // 从localStorage加载索引
  loadIndexFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('加载标签索引失败，将重新构建:', error);
    }
    return { __fileMetadata: {} };
  }

  // 保存索引到localStorage
  saveIndexToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.tagIndex));
    } catch (error) {
      console.error('保存标签索引失败:', error);
    }
  }

  // 提取文件中的标签
  extractTagsFromFile(content, fileId, fileName) {
    const tagMap = new Map();
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // 匹配标签格式 #tag，支持中英文和数字
      const tagMatches = line.match(/#[\w\u4e00-\u9fa5]+/g);
      if (tagMatches) {
        tagMatches.forEach(tag => {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, []);
          }

          const position = line.indexOf(tag);
          const contextStart = Math.max(0, position - 30);
          const contextEnd = Math.min(line.length, position + tag.length + 30);

          tagMap.get(tag).push({
            paragraphIndex: lineIndex,
            paragraphContent: line,
            context: line.substring(contextStart, contextEnd),
            matchPosition: position
          });
        });
      }
    });

    return tagMap;
  }

  // 更新文件索引
  updateFileIndex(fileId, fileName, content, fileModifiedTime) {
    // 移除旧的文件记录
    this.removeFileFromIndex(fileId);

    // 提取并添加新的标签索引
    const tagMap = this.extractTagsFromFile(content, fileId, fileName);
    tagMap.forEach((positions, tag) => {
      if (!this.tagIndex[tag]) {
        this.tagIndex[tag] = [];
      }

      this.tagIndex[tag].push({
        fileId,
        fileName,
        positions
      });
    });

    // 更新文件元数据
    if (!this.tagIndex.__fileMetadata) {
      this.tagIndex.__fileMetadata = {};
    }
    this.tagIndex.__fileMetadata[fileId] = {
      modifiedTime: fileModifiedTime,
      fileName: fileName
    };

    this.saveIndexToStorage();
    console.log('标签索引已更新:', fileId);
  }

  // 从索引中移除文件
  removeFileFromIndex(fileId) {
    Object.keys(this.tagIndex).forEach(tag => {
      if (tag !== '__fileMetadata') {
        this.tagIndex[tag] = this.tagIndex[tag].filter(item => item.fileId !== fileId);
        // 清理空的标签
        if (this.tagIndex[tag].length === 0) {
          delete this.tagIndex[tag];
        }
      }
    });

    // 移除文件元数据
    if (this.tagIndex.__fileMetadata) {
      delete this.tagIndex.__fileMetadata[fileId];
    }
  }

  // 获取标签搜索结果
  getTagSearchResults(tag) {
    return this.tagIndex[tag] || [];
  }
  
  // 清空所有索引（用于调试）
  clearAllIndexes() {
    this.tagIndex = { __fileMetadata: {} };
    this.saveIndexToStorage();
  }
}

export default TagIndexManager;