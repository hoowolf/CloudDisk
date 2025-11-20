const { contextBridge, ipcRenderer } = require('electron');

// 暴露受保护的方法，允许渲染进程使用 ipcRenderer，而无需暴露整个对象
contextBridge.exposeInMainWorld('electronAPI', {
  // 对话框相关
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // 菜单事件监听
  onMenuNewFolder: (callback) => ipcRenderer.on('menu-new-folder', callback),
  onMenuUploadFile: (callback) => ipcRenderer.on('menu-upload-file', callback),
  
  // 移除监听器
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // 存储相关（electron-store）
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key),
    clear: () => ipcRenderer.invoke('store-clear')
  },
  
  // 平台信息
  platform: process.platform,
  
  // 应用信息
  app: {
    getName: () => '云盘客户端',
    getVersion: () => '1.0.0'
  },
  
  // 文件系统操作（用于同步文件夹）
  fs: {
    getSyncPath: () => ipcRenderer.invoke('fs-get-sync-path'),
    readdir: (dirPath) => ipcRenderer.invoke('fs-readdir', dirPath),
    mkdir: (dirPath) => ipcRenderer.invoke('fs-mkdir', dirPath),
    remove: (targetPath, isDir) => ipcRenderer.invoke('fs-remove', targetPath, isDir),
    rename: (oldPath, newPath) => ipcRenderer.invoke('fs-rename', oldPath, newPath),
    stat: (filePath) => ipcRenderer.invoke('fs-stat', filePath)
  }
});

// 暴露版本信息
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron
});