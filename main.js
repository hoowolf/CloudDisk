const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const Store = require('electron-store').default;
const isDev = process.env.NODE_ENV === 'development';

// 初始化 electron-store
const store = new Store({
  name: 'clouddisk-config',
  defaults: {
    auth: {
      user: null,
      token: null,
      rememberMe: false
    }
  }
});

let mainWindow;

// 同步相关状态（本地文件系统监控）
let syncWatcher = null;
let syncDebounceTimer = null;
let syncEventQueue = [];
const syncStatus = {
  running: false,
  lastEventAt: null,
  lastError: null,
};

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'), // 可选：设置应用图标
    show: false, // 先不显示，等加载完成后再显示
    titleBarStyle: 'default',
    webSecurity: true
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // 开发环境下打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // 当窗口准备显示时才显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // 设置焦点到窗口
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // 设置菜单栏
  createMenu();

  // 处理窗口关闭
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理文件拖拽和导航
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
}

// 创建应用菜单
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建文件夹',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            mainWindow.webContents.send('menu-new-folder');
          }
        },
        {
          label: '上传文件',
          accelerator: 'CmdOrCtrl+U',
          click: () => {
            mainWindow.webContents.send('menu-upload-file');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '切换开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '切换全屏', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于云盘客户端',
              message: '云盘客户端 v1.0.0',
              detail: '一个基于 Electron + React + Ant Design 的云盘桌面客户端'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC 事件处理
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// 存储相关 IPC 处理
ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store-delete', (event, key) => {
  store.delete(key);
  return true;
});

ipcMain.handle('store-clear', () => {
  store.clear();
  return true;
});

// 文件系统相关 IPC 处理
ipcMain.handle('fs-get-sync-path', async () => {
  try {
    const p = store.get('sync.path') || '';
    return p;
  } catch (e) {
    return '';
  }
});

ipcMain.handle('fs-set-sync-path', async (event, dirPath) => {
  try {
    if (!dirPath || typeof dirPath !== 'string') {
      return { success: false, error: '路径无效' };
    }
    // 规范化路径
    const target = dirPath;
    // 如果不存在则创建
    try {
      await fsp.mkdir(target, { recursive: true });
    } catch (e) {}
    // 校验是目录
    const stat = await fsp.stat(target);
    if (!stat.isDirectory()) {
      return { success: false, error: '请选择目录路径' };
    }
    store.set('sync.path', target);

    // 通知渲染进程同步路径已更新
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('sync-path-updated', target);
    }

    return { success: true, data: target };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('fs-stat', async (event, filePath) => {
  try {
    const s = await fsp.stat(filePath);
    return {
      success: true,
      data: {
        is_dir: s.isDirectory(),
        size: s.size,
        created_at: s.birthtime,
        updated_at: s.mtime
      }
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('fs-readdir', async (event, dirPath) => {
  try {
    const items = await fsp.readdir(dirPath, { withFileTypes: true });
    const results = await Promise.all(items.map(async (d) => {
      const fullPath = require('path').join(dirPath, d.name);
      const s = await fsp.stat(fullPath);
      return {
        name: d.name,
        path: fullPath,
        is_dir: d.isDirectory(),
        size: s.size,
        created_at: s.birthtime,
        updated_at: s.mtime
      };
    }));
    return { success: true, data: results };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('fs-mkdir', async (event, dirPath) => {
  try {
    await fsp.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('fs-rename', async (event, oldPath, newPath) => {
  try {
    await fsp.rename(oldPath, newPath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('fs-remove', async (event, targetPath, isDir) => {
  try {
    if (isDir) {
      await fsp.rm(targetPath, { recursive: true, force: true });
    } else {
      await fsp.rm(targetPath, { force: true });
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('fs-write-file', async (event, targetPath, data) => {
  try {
    // data 可能是 ArrayBuffer、Uint8Array 或 base64 字符串
    let buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (data && data.type === 'Buffer' && data.data) {
      buffer = Buffer.from(data.data);
    } else if (data instanceof Uint8Array) {
      buffer = Buffer.from(data);
    } else if (typeof data === 'string') {
      buffer = Buffer.from(data, 'base64');
    } else if (data && data.arrayBuffer) {
      const ab = await data.arrayBuffer();
      buffer = Buffer.from(ab);
    } else {
      return { success: false, error: '不支持的数据类型' };
    }
    await fsp.mkdir(require('path').dirname(targetPath), { recursive: true });
    await fsp.writeFile(targetPath, buffer);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('fs-read-file', async (_event, targetPath) => {
  try {
    if (!targetPath || typeof targetPath !== 'string') {
      return { success: false, error: '路径无效' };
    }
    const data = await fsp.readFile(targetPath);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 启动本地同步文件夹监控
function startSyncWatcher() {
  if (syncWatcher) {
    syncStatus.running = true;
    console.log('[Sync][main] 监控已在运行，直接返回当前状态', syncStatus);
    return syncStatus;
  }

  const syncPath = store.get('sync.path');
  if (!syncPath || typeof syncPath !== 'string') {
    const error = '未设置本地同步路径';
    syncStatus.lastError = error;
    console.error('[Sync][main] 启动监控失败：未设置同步路径');
    throw new Error(error);
  }

  try {
    // 确保目录存在
    if (!fs.existsSync(syncPath)) {
      fs.mkdirSync(syncPath, { recursive: true });
    }
    console.log('[Sync][main] 启动本地文件系统监控', { syncPath });

    // 使用 fs.watch 递归监控目录变更
    syncWatcher = fs.watch(
      syncPath,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return;
        const fullPath = path.join(syncPath, filename);

        const event = {
          rawType: eventType,
          filename,
          fullPath,
          at: new Date().toISOString(),
        };

        syncEventQueue.push(event);

        if (syncDebounceTimer) {
          clearTimeout(syncDebounceTimer);
        }

        // 500ms 防抖聚合事件
        syncDebounceTimer = setTimeout(async () => {
          const queue = syncEventQueue;
          syncEventQueue = [];

          const enriched = await Promise.all(
            queue.map(async (e) => {
              try {
                const stat = await fsp.stat(e.fullPath);
                return {
                  ...e,
                  type: e.rawType === 'change' ? 'modify' : 'rename',
                  isDir: stat.isDirectory(),
                  exists: true,
                };
              } catch (err) {
                // 文件不存在，视为删除
                return {
                  ...e,
                  type: 'delete',
                  isDir: false,
                  exists: false,
                };
              }
            })
          );

          syncStatus.lastEventAt = new Date().toISOString();
          console.log('[Sync][main] 本地变更事件批次', {
            count: enriched.length,
            events: enriched.slice(0, 20), // 避免一次输出过多
          });

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('sync-local-events', enriched);
          }
        }, 500);
      }
    );

    syncStatus.running = true;
    syncStatus.lastError = null;
    console.log('[Sync][main] 本地文件系统监控已启动');
    return syncStatus;
  } catch (err) {
    syncStatus.lastError = err.message || String(err);
    if (syncWatcher) {
      try {
        syncWatcher.close();
      } catch (e) {
        // ignore
      }
      syncWatcher = null;
    }
    console.error('[Sync][main] 启动监控异常', err);
    throw err;
  }
}

function stopSyncWatcher() {
  if (syncWatcher) {
    try {
      syncWatcher.close();
    } catch (e) {
      // ignore
    }
    syncWatcher = null;
  }
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  syncEventQueue = [];
  syncStatus.running = false;
  console.log('[Sync][main] 本地文件系统监控已停止');
  return syncStatus;
}

// 应用事件处理
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户明确按下 Cmd + Q，否则保持应用活跃
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时
  // 通常会重新创建窗口
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 安全性：防止新窗口创建
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
  
  contents.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl !== contents.getURL()) {
      event.preventDefault();
    }
  });
});

// 同步相关 IPC（供渲染进程控制本地监控）
ipcMain.handle('sync-start', async () => {
  try {
    const status = startSyncWatcher();
    return { success: true, data: status };
  } catch (error) {
    return { success: false, error: error.message || String(error) };
  }
});

ipcMain.handle('sync-stop', async () => {
  const status = stopSyncWatcher();
  return { success: true, data: status };
});

ipcMain.handle('sync-get-status', async () => {
  return { success: true, data: syncStatus };
});