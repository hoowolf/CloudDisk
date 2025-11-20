import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { message, notification } from 'antd';
import { useAuth } from './AuthContext';
import request from '../utils/request';

// 创建文件管理上下文
const FileContext = createContext();

// 文件管理提供者组件
export const FileProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(false);
  const [currentParentId, setCurrentParentId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: '全部文件', path: '/' }]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [isSyncView, setIsSyncView] = useState(false); // 是否在同步文件夹视图
  const [syncPath, setSyncPath] = useState(''); // 同步文件夹路径
  const [currentSyncPath, setCurrentSyncPath] = useState(''); // 当前同步文件夹内的路径

  // 获取认证头信息
  const getAuthHeaders = useCallback(() => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  // 获取共享给我的文件列表
  const fetchSharedFiles = useCallback(async () => {
    if (!isAuthenticated || !token) return;

    setLoading(true);
    try {
      const response = await request.get('/shares/incoming');
      if (response.code === 0) {
        // 将共享信息转换为文件列表格式
        const sharedItems = (response.data || []).map(share => ({
          id: share.resource_id,
          name: share.resource_name || '（已删除）',
          is_dir: share.resource_is_dir || false,
          size: 0,
          updated_at: share.created_at,
          shared: true, // 标记为共享文件
          share_info: share, // 保留共享信息
          owner_username: share.owner_username,
          permission: share.permission
        }));
        setFiles(sharedItems);
        setCurrentParentId(null);
        setBreadcrumbs([{ id: null, name: '共享给我的', path: '/shared' }]);
        setCurrentPath('/shared');
      } else {
        message.error(response.message || '获取共享文件失败');
      }
    } catch (error) {
      console.error('Fetch shared files error:', error);
      message.error('获取共享文件失败');
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated, message]);

  // 获取文件列表
  const fetchFiles = useCallback(async (parentId = null) => {
    if (!isAuthenticated || !token) return;

    // 如果在同步文件夹视图，使用本地文件系统
    if (isSyncView) {
      await fetchSyncFiles(currentSyncPath || syncPath);
      return;
    }

    setLoading(true);
    try {
      const response = await request.get(`/fs/list?parent_id=${parentId || 'null'}`);

      if (response.code === 0) {
        setFiles(response.data.items);
        setCurrentParentId(parentId);
      } else {
        message.error(response.message || '获取文件列表失败');
      }
    } catch (error) {
      console.error('Fetch files error:', error);
      message.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated, message, isSyncView, syncPath, currentSyncPath]);

  // 获取同步文件夹文件列表
  const fetchSyncFiles = useCallback(async (dirPath) => {
    if (!window.electronAPI || !window.electronAPI.fs) {
      message.error('文件系统接口不可用');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.fs.readdir(dirPath);
      if (result.success) {
        // 转换文件格式以匹配前端显示
        const formattedFiles = result.data.map(item => ({
          id: item.path, // 使用路径作为ID
          name: item.name,
          path: item.path,
          is_dir: item.is_dir,
          size: item.size,
          created_at: item.created_at,
          updated_at: item.updated_at,
          parent_path: dirPath // 父路径
        }));
        setFiles(formattedFiles);
        setCurrentSyncPath(dirPath);
        
        // 更新面包屑（如果还没有设置）
        if (breadcrumbs.length === 0 || breadcrumbs[0].name !== '同步文件') {
          const newBreadcrumbs = [{ id: syncPath, name: '同步文件', path: syncPath }];
          if (dirPath !== syncPath) {
            const relativePath = dirPath.replace(syncPath, '').replace(/^[/\\]/, '');
            if (relativePath) {
              const pathParts = relativePath.split(/[/\\]/).filter(p => p);
              let currentPath = syncPath;
              for (const part of pathParts) {
                currentPath = currentPath.endsWith('/') || currentPath.endsWith('\\') 
                  ? currentPath + part 
                  : currentPath + '/' + part;
                newBreadcrumbs.push({
                  id: currentPath,
                  name: part,
                  path: currentPath
                });
              }
            }
          }
          setBreadcrumbs(newBreadcrumbs);
        }
      } else {
        message.error(result.error || '获取文件列表失败');
      }
    } catch (error) {
      console.error('Fetch sync files error:', error);
      message.error('获取同步文件夹内容失败');
    } finally {
      setLoading(false);
    }
  }, [syncPath, breadcrumbs]);

  // 进入文件夹
  const navigateToFolder = useCallback((folder) => {
    setSelectedFiles([]);
    
    // 如果在同步文件夹视图，使用路径导航
    if (isSyncView) {
      const newPath = folder.path || folder.id;
      
      // 构建面包屑（相对于同步文件夹根目录）
      const newBreadcrumbs = [{ id: syncPath, name: '同步文件', path: syncPath }];
      
      if (newPath !== syncPath) {
        // 获取相对于同步文件夹根目录的路径部分
        const relativePath = newPath.replace(syncPath, '').replace(/^[/\\]/, '');
        if (relativePath) {
          const pathParts = relativePath.split(/[/\\]/).filter(p => p);
          let currentPath = syncPath;
          
          for (const part of pathParts) {
            currentPath = currentPath.endsWith('/') || currentPath.endsWith('\\') 
              ? currentPath + part 
              : currentPath + '/' + part;
            newBreadcrumbs.push({
              id: currentPath,
              name: part,
              path: currentPath
            });
          }
        }
      }
      
      setBreadcrumbs(newBreadcrumbs);
      fetchSyncFiles(newPath);
      return;
    }
    
    // 更新面包屑导航
    const newBreadcrumb = { 
      id: folder.id, 
      name: folder.name, 
      path: `${currentPath === '/' ? '' : currentPath}/${folder.name}` 
    };
    setBreadcrumbs(prev => {
      // 检查是否已存在该文件夹（避免重复）
      const existingIndex = prev.findIndex(b => b.id === folder.id);
      if (existingIndex >= 0) {
        // 如果已存在，截取到该位置（返回导航）
        return prev.slice(0, existingIndex + 1);
      } else {
        // 如果不存在，添加到面包屑
        return [...prev, newBreadcrumb];
      }
    });
    setCurrentPath(prev => `${prev === '/' ? '' : prev}/${folder.name}`);
    fetchFiles(folder.id);
  }, [currentPath, fetchFiles, isSyncView, syncPath, fetchSyncFiles]);

  // 返回上级目录
  const navigateUp = useCallback(() => {
    if (isSyncView) {
      // 同步文件夹视图：返回到父目录
      if (currentSyncPath && currentSyncPath !== syncPath) {
        // 获取父目录路径
        const lastSlashIndex = Math.max(
          currentSyncPath.lastIndexOf('/'),
          currentSyncPath.lastIndexOf('\\')
        );
        if (lastSlashIndex > syncPath.length) {
          const parentPath = currentSyncPath.substring(0, lastSlashIndex);
          fetchSyncFiles(parentPath);
        } else {
          fetchSyncFiles(syncPath);
        }
      }
      return;
    }
    
    if (breadcrumbs.length > 1) {
      const newBreadcrumbs = breadcrumbs.slice(0, -1);
      const parentId = newBreadcrumbs[newBreadcrumbs.length - 1].id;
      setBreadcrumbs(newBreadcrumbs);
      const pathStr = `/${newBreadcrumbs.map(b => b.name).join('/')}`;
      setCurrentPath(pathStr);
      fetchFiles(parentId);
    }
  }, [breadcrumbs, fetchFiles, isSyncView, currentSyncPath, syncPath, fetchSyncFiles]);

  // 导航到面包屑中的某个位置
  const navigateToBreadcrumb = useCallback((targetId) => {
    if (isSyncView) {
      // 同步文件夹视图：使用路径导航
      const targetBreadcrumb = breadcrumbs.find(b => b.id === targetId);
      if (targetBreadcrumb) {
        const targetPath = targetBreadcrumb.path || targetBreadcrumb.id;
        const targetIndex = breadcrumbs.findIndex(b => b.id === targetId);
        const newBreadcrumbs = breadcrumbs.slice(0, targetIndex + 1);
        setBreadcrumbs(newBreadcrumbs);
        fetchSyncFiles(targetPath);
      }
      return;
    }
    
    const targetIndex = breadcrumbs.findIndex(b => b.id === targetId);
    if (targetIndex >= 0) {
      const newBreadcrumbs = breadcrumbs.slice(0, targetIndex + 1);
      setBreadcrumbs(newBreadcrumbs);
      const pathStr = `/${newBreadcrumbs.map(b => b.name).join('/')}`;
      setCurrentPath(pathStr);
      fetchFiles(targetId);
    }
  }, [breadcrumbs, fetchFiles, isSyncView, fetchSyncFiles]);

  // 创建文件夹
  const createFolder = async (name, parentId = currentParentId) => {
    try {
      const response = await request.post('/fs/mkdir', {
        parent_id: parentId,
        name: name
      });

      if (response.code === 0) {
        message.success('文件夹创建成功');
        fetchFiles(currentParentId); // 刷新文件列表
        return { success: true, data: response.data };
      } else {
        message.error(response.message || '创建文件夹失败');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Create folder error:', error);
      message.error('创建文件夹失败');
      return { success: false, error: error.message };
    }
  };

  // 重命名文件/文件夹
  const renameItem = async (id, newName) => {
    try {
      const response = await request.post('/fs/rename', {
        id,
        new_name: newName
      });

      if (response.code === 0) {
        message.success('重命名成功');
        fetchFiles(currentParentId); // 刷新文件列表
        return { success: true };
      } else {
        message.error(response.message || '重命名失败');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Rename error:', error);
      message.error('重命名失败');
      return { success: false, error: error.message };
    }
  };

  // 删除文件/文件夹
  const deleteItems = async (ids) => {
    try {
      const deletePromises = ids.map(async (id) => {
        return await request.delete(`/fs/node/${id}`);
      });

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(result => result.code === 0).length;

      if (successCount > 0) {
        message.success(`成功删除 ${successCount} 个项目`);
        setSelectedFiles([]);
        fetchFiles(currentParentId); // 刷新文件列表
        return { success: true, successCount };
      } else {
        message.error('删除失败');
        return { success: false };
      }
    } catch (error) {
      console.error('Delete error:', error);
      message.error('删除失败');
      return { success: false, error: error.message };
    }
  };

  // 移动文件/文件夹
  const moveItems = async (ids, newParentId) => {
    try {
      const movePromises = ids.map(async (id) => {
        return await request.post('/fs/move', {
          id,
          new_parent_id: newParentId
        });
      });

      const results = await Promise.all(movePromises);
      const successCount = results.filter(result => result.code === 0).length;

      if (successCount > 0) {
        message.success(`成功移动 ${successCount} 个项目`);
        setSelectedFiles([]);
        fetchFiles(currentParentId); // 刷新文件列表
        return { success: true, successCount };
      } else {
        message.error('移动失败');
        return { success: false };
      }
    } catch (error) {
      console.error('Move error:', error);
      message.error('移动失败');
      return { success: false, error: error.message };
    }
  };

  // 初始化同步文件夹路径，并监听路径变更
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.fs) {
      window.electronAPI.fs.getSyncPath().then(path => {
        setSyncPath(path);
      });
    }

    let unsubscribe;
    if (window.electronAPI && window.electronAPI.sync && window.electronAPI.sync.onPathUpdated) {
      unsubscribe = window.electronAPI.sync.onPathUpdated((newPath) => {
        setSyncPath(newPath || '');
      });
    }

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // 初始化时加载根目录文件
  useEffect(() => {
    if (isAuthenticated && token && !isSyncView) {
      // 初始化面包屑
      setBreadcrumbs([{ id: null, name: '全部文件', path: '/' }]);
      setCurrentPath('/');
      fetchFiles();
    }
  }, [isAuthenticated, token, fetchFiles, isSyncView]);

  const value = {
    // 状态
    files,
    currentPath,
    currentParentId,
    breadcrumbs,
    selectedFiles,
    viewMode,
    loading,
    uploadingFiles,
    isSyncView,
    syncPath,
    currentSyncPath,
    
    // 方法
    fetchFiles,
    fetchSharedFiles,
    fetchSyncFiles,
    navigateToFolder,
    navigateUp,
    navigateToBreadcrumb,
    createFolder,
    renameItem,
    deleteItems,
    moveItems,
    openNamedRootFolder: async (folderName) => {
      try {
        const response = await request.get(`/fs/list?parent_id=null`);
        if (response.code === 0) {
          const target = (response.data.items || []).find(item => item.is_dir && item.name === folderName);
          if (target) {
            setIsSyncView(false);
            setSelectedFiles([]);
            setBreadcrumbs([
              { id: target.id, name: target.name, path: `/${target.name}` }
            ]);
            setCurrentPath(`/${target.name}`);
            setCurrentParentId(target.id);
            await fetchFiles(target.id);
            return { success: true };
          } else {
            message.error(`未找到文件夹：${folderName}`);
            return { success: false };
          }
        } else {
          message.error(response.message || '获取根目录失败');
          return { success: false };
        }
      } catch (error) {
        console.error('Open named root folder error:', error);
        message.error('打开默认文件夹失败');
        return { success: false };
      }
    },
    openAllRoot: async () => {
      try {
        setIsSyncView(false);
        setSelectedFiles([]);
        setBreadcrumbs([{ id: null, name: '全部文件', path: '/' }]);
        setCurrentPath('/');
        setCurrentParentId(null);
        await fetchFiles(null);
        return { success: true };
      } catch (error) {
        return { success: false };
      }
    },
    setSelectedFiles,
    setViewMode,
    setUploadingFiles,
    setIsSyncView,
  };

  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
};

// 使用文件管理上下文的Hook
export const useFile = () => {
  const context = useContext(FileContext);
  if (context === undefined) {
    throw new Error('useFile must be used within a FileProvider');
  }
  return context;
};