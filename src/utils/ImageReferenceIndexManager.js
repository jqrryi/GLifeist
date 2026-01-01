// src/utils/ImageReferenceIndexManager.js
import userDataManager from './userDataManager';

class ImageReferenceIndexManager {
  constructor() {
    this.storageKey = 'markdown-image-reference-index';
    this.imageIndex = this.loadIndexFromStorage();
  }

  // 从localStorage加载索引
  loadIndexFromStorage() {
    try {
      // const data = localStorage.getItem(this.storageKey);
      const data = userDataManager.getUserData(this.storageKey);

      if (data) {
        return data;
      }
    } catch (error) {
      console.warn('加载图片引用索引失败，将重新构建:', error);
    }
    return {};
  }

  // 保存索引到localStorage
  saveIndexToStorage() {
    try {
      // localStorage.setItem(this.storageKey, JSON.stringify(this.imageIndex));
      userDataManager.setUserData(this.storageKey, this.imageIndex);
    } catch (error) {
      console.error('保存图片引用索引失败:', error);
    }
  }

  // 提取文件中的图片引用
  extractImageReferencesFromFile(content, fileId, fileName) {
    const imageMap = new Map();
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      // 匹配Markdown图片语法 ![alt](url)
      const imageMatches = line.match(/!\[.*?\]\((.*?)\)/g);
      if (imageMatches) {
        imageMatches.forEach(match => {
          const urlMatch = match.match(/!\[.*?\]\((.*?)\)/);
          if (urlMatch && urlMatch[1]) {
            const imageUrl = urlMatch[1];
            // 提取文件名
            const imageName = imageUrl.split('/').pop();

            if (!imageMap.has(imageName)) {
              imageMap.set(imageName, []);
            }

            const position = line.indexOf(match);
            const contextStart = Math.max(0, position - 30);
            const contextEnd = Math.min(line.length, position + match.length + 30);

            imageMap.get(imageName).push({
              paragraphIndex: lineIndex,
              paragraphContent: line,
              lineNumber: lineIndex,
              context: line.substring(contextStart, contextEnd),
              matchPosition: position
            });
          }
        });
      }
    });

    return imageMap;
  }

  // 更新文件索引
  updateFileIndex(fileId, fileName, content, fileModifiedTime) {
    // 移除旧的文件记录
    this.removeFileFromIndex(fileId);

    // 提取并添加新的图片引用索引
    const imageMap = this.extractImageReferencesFromFile(content, fileId, fileName);
    imageMap.forEach((positions, imageName) => {
      if (!this.imageIndex[imageName]) {
        this.imageIndex[imageName] = [];
      }

      this.imageIndex[imageName].push({
        fileId,
        fileName,
        positions
      });
    });

    this.saveIndexToStorage();
    // console.log('图片引用索引已更新:', fileId);
  }

  // 从索引中移除文件
  removeFileFromIndex(fileId) {
    Object.keys(this.imageIndex).forEach(imageName => {
      this.imageIndex[imageName] = this.imageIndex[imageName].filter(item => item.fileId !== fileId);
      // 清理空的图片引用
      if (this.imageIndex[imageName].length === 0) {
        delete this.imageIndex[imageName];
      }
    });
  }

  // 获取图片引用搜索结果
  getImageReferenceResults(imageName) {
    return this.imageIndex[imageName] || [];
  }

  // 清空所有索引（用于调试）
  clearAllIndexes() {
    this.imageIndex = {};
    this.saveIndexToStorage();
  }
}

export default ImageReferenceIndexManager;
