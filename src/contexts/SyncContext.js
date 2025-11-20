import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { message } from 'antd';
import syncClient from '../utils/syncClient';

const SyncContext = createContext(null);

export const SyncProvider = ({ children }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isAuto, setIsAuto] = useState(true);
  const [syncPath, setSyncPath] = useState('');
  const [lastEvent, setLastEvent] = useState(null);
  const [lastRemoteSyncAt, setLastRemoteSyncAt] = useState(null);
  const [lastError, setLastError] = useState(null);

  const remoteTimerRef = useRef(null);
  const unsubscribeRef = useRef(null);

  const stopRemoteLoop = () => {
    if (remoteTimerRef.current) {
      clearInterval(remoteTimerRef.current);
      remoteTimerRef.current = null;
    }
  };

  const startRemoteLoop = useCallback(
    (intervalMinutes, localSyncRoot) => {
      stopRemoteLoop();
      if (!intervalMinutes || intervalMinutes <= 0 || !localSyncRoot) return;
      const intervalMs = intervalMinutes * 60 * 1000;
      remoteTimerRef.current = setInterval(async () => {
        try {
          await syncClient.syncRemoteChanges(localSyncRoot);
          setLastRemoteSyncAt(new Date().toISOString());
        } catch (error) {
          console.error('Sync remote changes error:', error);
          setLastError(error.message || String(error));
        }
      }, intervalMs);
    },
    []
  );

  const start = useCallback(
    async (options = {}) => {
      if (!window.electronAPI || !window.electronAPI.sync || !window.electronAPI.fs) {
        return;
      }

      try {
        const localPath = await window.electronAPI.fs.getSyncPath();
        if (!localPath) {
          message.warning('请先在设置中选择本地同步路径');
          return;
        }
        setSyncPath(localPath);

        const res = await window.electronAPI.sync.start();
        if (!res || !res.success) {
          throw new Error(res?.error || '启动本地同步监控失败');
        }
        setIsRunning(true);
        setLastError(null);

        // 订阅本地文件系统事件
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
        unsubscribeRef.current = window.electronAPI.sync.onLocalEvents(async (events) => {
          if (!Array.isArray(events)) return;
          for (const e of events) {
            setLastEvent(e);
            try {
              await syncClient.handleLocalChange({
                type: e.type,
                syncRoot: localPath,
                fullPath: e.fullPath,
                oldFullPath: e.oldFullPath,
                isDir: e.isDir,
              });
            } catch (error) {
              console.error('Handle local change error:', error);
              setLastError(error.message || String(error));
            }
          }
        });

        // 启动云端轮询
        const intervalMinutes = options.intervalMinutes ?? 30;
        startRemoteLoop(intervalMinutes, localPath);
      } catch (error) {
        console.error('Start sync error:', error);
        setIsRunning(false);
        setLastError(error.message || String(error));
      }
    },
    [startRemoteLoop]
  );

  const stop = useCallback(async () => {
    if (!window.electronAPI || !window.electronAPI.sync) return;
    try {
      await window.electronAPI.sync.stop();
    } catch (error) {
      console.error('Stop sync error:', error);
    }
    setIsRunning(false);
    stopRemoteLoop();
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
  }, []);

  const triggerOnce = useCallback(async () => {
    // 每次都重新获取同步路径，不依赖状态
    if (!window.electronAPI || !window.electronAPI.fs) {
      message.warning('文件系统接口不可用');
      return;
    }
    
    const localPath = await window.electronAPI.fs.getSyncPath();
    if (!localPath) {
      message.warning('尚未设置本地同步路径，无法执行刷新同步');
      return;
    }
    
    const startedAt = new Date().toISOString();
    console.log('[Sync] 手动同步开始', {
      syncPath: localPath,
      at: startedAt,
    });
    
    try {
      await syncClient.syncRemoteChanges(localPath);
      const finishedAt = new Date().toISOString();
      setLastRemoteSyncAt(finishedAt);
      console.log('[Sync] 手动同步完成', {
        syncPath: localPath,
        startedAt,
        finishedAt,
      });
      message.success('已与云端执行一次同步');
    } catch (error) {
      console.error('[Sync] 手动同步失败', error);
      setLastError(error.message || String(error));
      message.error('手动同步失败：' + (error.message || '未知错误'));
    }
  }, []);

  // 初始化：根据设置自动启动同步
  useEffect(() => {
    (async () => {
      if (!window.electronAPI || !window.electronAPI.store) return;
      try {
        const settings = await window.electronAPI.store.get('sync.settings');
        const auto = settings?.auto ?? true;
        const interval = settings?.interval ?? '30';
        setIsAuto(auto);

        if (auto) {
          await start({ intervalMinutes: Number(interval) || 30 });
        }
      } catch (error) {
        console.error('Init sync settings error:', error);
      }
    })();

    return () => {
      stopRemoteLoop();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [start]);

  const value = {
    isRunning,
    isAuto,
    syncPath,
    lastEvent,
    lastRemoteSyncAt,
    lastError,
    start,
    stop,
    triggerOnce,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return ctx;
};


