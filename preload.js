const { contextBridge, ipcRenderer } = require('electron');

// 暴露受保护的方法，允许渲染进程使用 ipcRenderer，而无需暴露整个对象
contextBridge.exposeInMainWorld('electronAPI', {
  // 对话框相关
  showSaveDialog: (options) => {
    try {
      return ipcRenderer.invoke('show-save-dialog', options);
    } catch (error) {
      console.error('showSaveDialog error:', error);
      return Promise.reject(error);
    }
  },
  showOpenDialog: (options) => {
    try {
      return ipcRenderer.invoke('show-open-dialog', options);
    } catch (error) {
      console.error('showOpenDialog error:', error);
      return Promise.reject(error);
    }
  },
  showMessageBox: (options) => {
    try {
      return ipcRenderer.invoke('show-message-box', options);
    } catch (error) {
      console.error('showMessageBox error:', error);
      return Promise.reject(error);
    }
  },
  
  // 菜单事件监听（改进版本，支持移除监听器）
  onMenuNewFolder: (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    ipcRenderer.on('menu-new-folder', (event, ...args) => callback(...args));
    // 返回移除函数
    return () => ipcRenderer.removeListener('menu-new-folder', callback);
  },
  onMenuUploadFile: (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    ipcRenderer.on('menu-upload-file', (event, ...args) => callback(...args));
    // 返回移除函数
    return () => ipcRenderer.removeListener('menu-upload-file', callback);
  },
  
  // 移除监听器
  removeAllListeners: (channel) => {
    if (typeof channel === 'string') {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  
  // 存储相关（electron-store）
  store: {
    get: (key) => {
      try {
        return ipcRenderer.invoke('store-get', key);
      } catch (error) {
        console.error('store.get error:', error);
        return Promise.reject(error);
      }
    },
    set: (key, value) => {
      try {
        return ipcRenderer.invoke('store-set', key, value);
      } catch (error) {
        console.error('store.set error:', error);
        return Promise.reject(error);
      }
    },
    delete: (key) => {
      try {
        return ipcRenderer.invoke('store-delete', key);
      } catch (error) {
        console.error('store.delete error:', error);
        return Promise.reject(error);
      }
    },
    clear: () => {
      try {
        return ipcRenderer.invoke('store-clear');
      } catch (error) {
        console.error('store.clear error:', error);
        return Promise.reject(error);
      }
    }
  },
  
  // 平台信息（只读）
  platform: process.platform,
  
  // 应用信息
  app: {
    getName: () => '云盘客户端',
    getVersion: () => '1.0.0'
  },
  
  // 文件系统操作（用于同步文件夹）
  fs: {
    getSyncPath: () => {
      try {
        return ipcRenderer.invoke('fs-get-sync-path');
      } catch (error) {
        console.error('fs.getSyncPath error:', error);
        return Promise.reject(error);
      }
    },
    setSyncPath: (dirPath) => {
      try {
        if (typeof dirPath !== 'string') {
          return Promise.reject(new Error('dirPath must be a string'));
        }
        return ipcRenderer.invoke('fs-set-sync-path', dirPath);
      } catch (error) {
        console.error('fs.setSyncPath error:', error);
        return Promise.reject(error);
      }
    },
    readdir: (dirPath) => {
      try {
        if (typeof dirPath !== 'string') {
          return Promise.reject(new Error('dirPath must be a string'));
        }
        return ipcRenderer.invoke('fs-readdir', dirPath);
      } catch (error) {
        console.error('fs.readdir error:', error);
        return Promise.reject(error);
      }
    },
    mkdir: (dirPath) => {
      try {
        if (typeof dirPath !== 'string') {
          return Promise.reject(new Error('dirPath must be a string'));
        }
        return ipcRenderer.invoke('fs-mkdir', dirPath);
      } catch (error) {
        console.error('fs.mkdir error:', error);
        return Promise.reject(error);
      }
    },
    remove: (targetPath, isDir) => {
      try {
        if (typeof targetPath !== 'string') {
          return Promise.reject(new Error('targetPath must be a string'));
        }
        return ipcRenderer.invoke('fs-remove', targetPath, isDir);
      } catch (error) {
        console.error('fs.remove error:', error);
        return Promise.reject(error);
      }
    },
    rename: (oldPath, newPath) => {
      try {
        if (typeof oldPath !== 'string' || typeof newPath !== 'string') {
          return Promise.reject(new Error('Paths must be strings'));
        }
        return ipcRenderer.invoke('fs-rename', oldPath, newPath);
      } catch (error) {
        console.error('fs.rename error:', error);
        return Promise.reject(error);
      }
    },
    stat: (filePath) => {
      try {
        if (typeof filePath !== 'string') {
          return Promise.reject(new Error('filePath must be a string'));
        }
        return ipcRenderer.invoke('fs-stat', filePath);
      } catch (error) {
        console.error('fs.stat error:', error);
        return Promise.reject(error);
      }
    },
    writeFile: (targetPath, data) => {
      try {
        if (typeof targetPath !== 'string') {
          return Promise.reject(new Error('targetPath must be a string'));
        }
        return ipcRenderer.invoke('fs-write-file', targetPath, data);
      } catch (error) {
        console.error('fs.writeFile error:', error);
        return Promise.reject(error);
      }
    },
    readFile: (targetPath) => {
      try {
        if (typeof targetPath !== 'string') {
          return Promise.reject(new Error('targetPath must be a string'));
        }
        return ipcRenderer.invoke('fs-read-file', targetPath);
      } catch (error) {
        console.error('fs.readFile error:', error);
        return Promise.reject(error);
      }
    }
  },

  // 同步相关（本地文件系统监控）
  sync: {
    start: () => {
      try {
        return ipcRenderer.invoke('sync-start');
      } catch (error) {
        console.error('sync.start error:', error);
        return Promise.reject(error);
      }
    },
    stop: () => {
      try {
        return ipcRenderer.invoke('sync-stop');
      } catch (error) {
        console.error('sync.stop error:', error);
        return Promise.reject(error);
      }
    },
    getStatus: () => {
      try {
        return ipcRenderer.invoke('sync-get-status');
      } catch (error) {
        console.error('sync.getStatus error:', error);
        return Promise.reject(error);
      }
    },
    /**
     * 订阅本地文件系统事件（批量）
     * @param {(events: any[]) => void} callback
     * @returns {() => void} 取消订阅函数
     */
    onLocalEvents: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      const channel = 'sync-local-events';
      const handler = (_event, events) => {
        callback(events);
      };
      ipcRenderer.on(channel, handler);
      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    },

    /**
     * 订阅同步路径变更事件
     * @param {(path: string) => void} callback
     * @returns {() => void} 取消订阅函数
     */
    onPathUpdated: (callback) => {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }
      const channel = 'sync-path-updated';
      const handler = (_event, newPath) => {
        callback(newPath);
      };
      ipcRenderer.on(channel, handler);
      return () => {
        ipcRenderer.removeListener(channel, handler);
      };
    }
  }
});

// 暴露版本信息（只读）
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
});