import React, { useState, useRef } from 'react';
import {
  Table, Card, Button, Input, Space, Modal, Dropdown, 
  Typography, Empty, Spin, Tooltip, message, 
  Breadcrumb, Row, Col, Tag, Progress, TreeSelect
} from 'antd';
import {
  FolderOutlined, FileOutlined, UploadOutlined, 
  DownloadOutlined, DeleteOutlined, EditOutlined,
  DragOutlined, ShareAltOutlined, SearchOutlined,
  ReloadOutlined,
  EyeOutlined, HistoryOutlined, MoreOutlined,
  DragOutlined as MoveOutlined, EditOutlined as RenameOutlined,
  SortAscendingOutlined, SortDescendingOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import { useFile } from '../contexts/FileContext';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../contexts/SyncContext';
import { formatFileSize, formatDate } from '../utils/fileUtils';
import UploadManager from './UploadManager';
import ShareModal from './ShareModal';
import VersionHistory from './VersionHistory';
import fileAPI from '../utils/fileAPI';
import request from '../utils/request';

const { Search } = Input;
const { Text } = Typography;

const FileManager = ({ view = 'all' }) => {
  const { 
    files, 
    loading, 
    currentParentId, 
    breadcrumbs,
    selectedFiles,
    setSelectedFiles,
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
    isSyncView,
    setIsSyncView,
    syncPath,
    currentSyncPath
  } = useFile();
  const { token } = useAuth();
  const { triggerOnce } = useSync();

  React.useEffect(() => {
    // 同步视图展示云端"同步文件"目录，由菜单点击触发 openNamedRootFolder
    setIsSyncView(false);
    
    // 如果是共享文件视图，加载共享给我的文件
    if (view === 'shared') {
      fetchSharedFiles();
    }
  }, [view, setIsSyncView, fetchSharedFiles]);

  const [searchText, setSearchText] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextTarget, setContextTarget] = useState(null);
  const [showUploadManager, setShowUploadManager] = useState(false);
  const [sortType, setSortType] = useState('time'); // 'name' 或 'time'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' 或 'desc'
  const [selectedFileId, setSelectedFileId] = useState(null); // 当前选中的文件ID
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState(null); // 鼠标悬停的行ID
  const [showMoveModal, setShowMoveModal] = useState(false); // 移动文件模态框
  const [moveTarget, setMoveTarget] = useState(null); // 要移动的文件/文件夹
  const [moveTargetParentId, setMoveTargetParentId] = useState(null); // 移动目标文件夹ID
  const [shareTarget, setShareTarget] = useState(null); // 要分享的文件/文件夹
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [versionFile, setVersionFile] = useState(null); // 查看版本的文件
  const [versionDrawerVisible, setVersionDrawerVisible] = useState(false);
  const tableRef = useRef();
  const inCloudSyncFolder = !isSyncView && Array.isArray(breadcrumbs) && breadcrumbs.length > 0 && breadcrumbs[0].name === '同步文件';
  const needSyncPathGuard = () => inCloudSyncFolder && !syncPath;

  const handleUploadToSync = async () => {
    if (!syncPath) {
      message.warning('请先在设置中选择同步路径');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const baseDir = currentSyncPath || syncPath;
        const separator = baseDir.includes('\\') ? '\\' : '/';
        const targetPath = `${baseDir}${baseDir.endsWith(separator) ? '' : separator}${file.name}`;
        const arrayBuffer = await file.arrayBuffer();
        const writeRes = await window.electronAPI.fs.writeFile(targetPath, new Uint8Array(arrayBuffer));
        if (writeRes && writeRes.success) {
          message.success('已写入本地同步文件夹');
          fetchSyncFiles(baseDir);
          // 云端镜像：上传到“同步文件”目录
          try {
            const rootRes = await request.get('/fs/list?parent_id=null');
            if (rootRes.code === 0) {
              const syncFolder = (rootRes.data.items || []).find(i => i.is_dir && i.name === '同步文件');
              const parentId = syncFolder ? syncFolder.id : null;
              if (parentId) {
                const upRes = await fileAPI.uploadSimple(parentId, file);
                if (upRes.success) {
                  message.success('已同步到云端');
                } else {
                  message.warning('本地写入成功，云端上传失败');
                }
              }
            }
          } catch {}
        } else {
          message.error(writeRes?.error || '写入本地失败');
        }
      } catch (err) {
        message.error('上传到本地失败');
      }
    };
    input.click();
  };

  const guardOr = (fn) => {
    if (needSyncPathGuard()) {
      message.warning('请先在设置中选择本地同步路径');
      return;
    }
    return fn();
  };

  // 过滤和排序文件列表
  const filteredFiles = React.useMemo(() => {
    let result = files.filter(file => 
      file.name.toLowerCase().includes(searchText.toLowerCase())
    );

    // 排序逻辑
    result = [...result].sort((a, b) => {
      // 文件夹始终排在前面
      if (a.is_dir && !b.is_dir) return -1;
      if (!a.is_dir && b.is_dir) return 1;

      if (sortType === 'name') {
        const comparison = a.name.localeCompare(b.name, 'zh-CN');
        return sortOrder === 'asc' ? comparison : -comparison;
      } else if (sortType === 'time') {
        const timeA = new Date(a.updated_at).getTime();
        const timeB = new Date(b.updated_at).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }
      return 0;
    });

    return result;
  }, [files, searchText, sortType, sortOrder]);

  // 处理文件名点击
  const handleFileNameClick = (record) => {
    setSelectedFileId(record.id);
    
    if (record.is_dir) {
      // 如果是文件夹，进入文件夹
      setSelectedFileId(null); // 进入文件夹时清除选中状态
      navigateToFolder(record);
    } else {
      // 如果是文件，预览文件
      handlePreviewFile(record);
    }
  };

  // 预览文件
  const handlePreviewFile = async (file) => {
    try {
      // 获取文件下载链接
      const response = await request.get(`/files/${file.id}/download`);
      
      if (response.code === 0) {
        // 如果返回的是下载URL，直接打开
        if (response.data.url) {
          window.open(response.data.url, '_blank');
        } else if (response.data instanceof Blob) {
          // 如果返回的是Blob，创建临时URL预览
          const url = window.URL.createObjectURL(response.data);
          window.open(url, '_blank');
        } else {
          message.info('该文件类型暂不支持预览');
        }
      } else {
        message.error('无法预览该文件');
      }
    } catch (error) {
      console.error('Preview file error:', error);
      message.error('预览文件失败');
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {record.is_dir ? (
            <FolderOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
          ) : (
            <FileOutlined style={{ color: '#666', fontSize: '16px' }} />
          )}
          <Text 
            style={{ 
              cursor: 'pointer',
              color: selectedFileId === record.id ? '#1890ff' : 'inherit',
              fontWeight: selectedFileId === record.id ? 600 : 'normal',
              transition: 'all 0.2s'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleFileNameClick(record);
            }}
          >
            {text}
          </Text>
          {view === 'shared' && record.owner_username && (
            <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
              （来自：{record.owner_username}）
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 160,
      render: (text, record) => (
        <Text type="secondary">
          {record.is_dir ? '-' : formatFileSize(text)}
        </Text>
      ),
    },
    {
      title: '修改日期',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 200,
      render: (text) => <Text type="secondary">{formatDate(text)}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => {
        if (hoveredRowId !== record.id) {
          return null;
        }
        return (
          <Space size="small">
            {/* 下载按钮（同步文件夹视图中不显示） */}
            {!record.is_dir && !isSyncView && (
              <Tooltip title="下载">
                <Button
                  type="text"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(record);
                  }}
                />
              </Tooltip>
            )}
            {/* 分享按钮（共享文件视图中不显示，因为不是自己的文件） */}
            {view !== 'shared' && (
              <Tooltip title="分享">
                <Button
                  type="text"
                  size="small"
                  icon={<ShareAltOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (record.is_dir || !isSyncView) {
                      setShareTarget(record);
                      setShareModalVisible(true);
                    } else {
                      message.info('本地同步视图下暂不支持云端共享');
                    }
                  }}
                />
              </Tooltip>
            )}
            {/* 版本历史（仅文件） */}
            {!record.is_dir && !isSyncView && (
              <Tooltip title="版本历史">
                <Button
                  type="text"
                  size="small"
                  icon={<HistoryOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setVersionFile(record);
                    setVersionDrawerVisible(true);
                  }}
                />
              </Tooltip>
            )}
            {/* 移动按钮（共享文件视图中不显示，因为不是自己的文件） */}
            {view !== 'shared' && (
              <Tooltip title="移动">
                <Button
                  type="text"
                  size="small"
                  icon={<MoveOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMove(record);
                  }}
                />
              </Tooltip>
            )}
            {/* 重命名按钮（共享文件视图中不显示，因为不是自己的文件） */}
            {view !== 'shared' && (
              <Tooltip title="重命名">
                <Button
                  type="text"
                  size="small"
                  icon={<RenameOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRename(record);
                  }}
                />
              </Tooltip>
            )}
            {/* 删除按钮（共享文件视图中不显示，因为不是自己的文件） */}
            {view !== 'shared' && (
              <Tooltip title="删除">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete([record.id]);
                  }}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys: selectedFiles,
    onChange: (selectedRowKeys) => {
      setSelectedFiles(selectedRowKeys);
    },
    onSelect: (record, selected) => {
      // 点击复选框时不影响文件名点击
      if (selected) {
        setSelectedFileId(null);
      }
    },
  };

  // 处理双击事件
  const handleDoubleClick = (record) => {
    setSelectedFileId(record.id);
    if (record.is_dir) {
      navigateToFolder(record);
    } else {
      handlePreviewFile(record);
    }
  };

  // 新建文件夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    if (needSyncPathGuard()) {
      message.warning('请先设置本地同步路径');
      return;
    }
    
    // 如果在同步文件夹视图，使用本地文件系统
    if (isSyncView) {
      if (!window.electronAPI || !window.electronAPI.fs) {
        message.error('文件系统接口不可用');
        return;
      }
      
      try {
        const targetPath = currentSyncPath || syncPath;
        const newFolderPath = `${targetPath}/${newFolderName.trim()}`;
        const result = await window.electronAPI.fs.mkdir(newFolderPath);
        if (result.success) {
          message.success('文件夹创建成功');
          setShowNewFolderModal(false);
          setNewFolderName('');
          fetchSyncFiles(targetPath); // 刷新文件列表
        } else {
          message.error(result.error || '创建文件夹失败');
        }
      } catch (error) {
        console.error('Create folder error:', error);
        message.error('创建文件夹失败');
      }
      return;
    }
    
    const result = await createFolder(newFolderName.trim());
    if (result.success) {
      setShowNewFolderModal(false);
      setNewFolderName('');
    }
  };

  // 重命名
  const handleRename = async (record) => {
    if (needSyncPathGuard()) {
      message.warning('请先设置本地同步路径');
      return;
    }
    Modal.confirm({
      title: '重命名',
      content: (
        <Input
          defaultValue={record.name}
          onPressEnter={async (e) => {
            const newName = e.target.value.trim();
            if (newName && newName !== record.name) {
              if (isSyncView) {
                // 同步文件夹视图：使用本地文件系统
                if (!window.electronAPI || !window.electronAPI.fs) {
                  message.error('文件系统接口不可用');
                  return;
                }
                try {
                  const oldPath = record.path || record.id;
                  const lastSlashIndex = Math.max(
                    oldPath.lastIndexOf('/'),
                    oldPath.lastIndexOf('\\')
                  );
                  const parentPath = lastSlashIndex > 0 ? oldPath.substring(0, lastSlashIndex) : oldPath;
                  const separator = oldPath.includes('\\') ? '\\' : '/';
                  const newPath = `${parentPath}${separator}${newName}`;
                  const result = await window.electronAPI.fs.rename(oldPath, newPath);
                  if (result.success) {
                    message.success('重命名成功');
                    fetchSyncFiles(currentSyncPath || syncPath);
                    Modal.destroyAll();
                  } else {
                    message.error(result.error || '重命名失败');
                  }
                } catch (error) {
                  console.error('Rename error:', error);
                  message.error('重命名失败');
                }
              } else {
                await renameItem(record.id, newName);
                Modal.destroyAll();
              }
            }
          }}
        />
      ),
      onOk: async () => {
        const input = document.querySelector('.ant-modal input');
        const newName = input?.value?.trim();
        if (newName && newName !== record.name) {
          if (isSyncView) {
            // 同步文件夹视图：使用本地文件系统
            if (!window.electronAPI || !window.electronAPI.fs) {
              message.error('文件系统接口不可用');
              return;
            }
            try {
              const oldPath = record.path || record.id;
              const lastSlashIndex = Math.max(
                oldPath.lastIndexOf('/'),
                oldPath.lastIndexOf('\\')
              );
              const parentPath = lastSlashIndex > 0 ? oldPath.substring(0, lastSlashIndex) : oldPath;
              const separator = oldPath.includes('\\') ? '\\' : '/';
              const newPath = `${parentPath}${separator}${newName}`;
              const result = await window.electronAPI.fs.rename(oldPath, newPath);
              if (result.success) {
                message.success('重命名成功');
                fetchSyncFiles(currentSyncPath || syncPath);
              } else {
                message.error(result.error || '重命名失败');
              }
            } catch (error) {
              console.error('Rename error:', error);
              message.error('重命名失败');
            }
          } else {
            await renameItem(record.id, newName);
          }
        }
      },
    });
  };

  // 下载文件
  const handleDownload = async (file) => {
    // 如果在同步文件夹视图，文件在本地，不需要下载
    if (isSyncView) {
      message.info('文件已在本地，无需下载');
      return;
    }
    
    try {
      const response = await fileAPI.downloadFile(file.id);
      if (response.success && response.data) {
        // 如果返回的是 Blob，创建下载链接
        if (response.data instanceof Blob) {
          const url = window.URL.createObjectURL(response.data);
          const link = document.createElement('a');
          link.href = url;
          link.download = file.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          message.success('文件下载成功');
        } else if (response.data.url) {
          // 如果返回的是 URL，直接打开
          window.open(response.data.url, '_blank');
          message.success('文件下载已开始');
        }
      } else {
        message.error(response.message || '下载失败');
      }
    } catch (error) {
      console.error('Download error:', error);
      message.error('下载失败');
    }
  };

  // 移动文件/文件夹
  const handleMove = (record) => {
    if (needSyncPathGuard()) {
      message.warning('请先设置本地同步路径');
      return;
    }
    setMoveTarget(record);
    setShowMoveModal(true);
  };

  // 构建文件夹树（用于移动文件时的选择器）
  const buildFolderTree = (allFiles, excludeId = null) => {
    // 只获取文件夹
    const folders = allFiles.filter(f => f.is_dir && f.id !== excludeId);
    if (!folders || folders.length === 0) {
      return [
        {
          title: '根目录（全部文件）',
          value: 'root',
          key: 'root',
        }
      ];
    }

    // 构建树形结构
    const buildNode = (folder) => {
      if (!folder) return null;
      const children = folders
        .filter(f => f.parent_id === folder.id)
        .map(buildNode)
        .filter(node => node !== null);
      
      return {
        title: folder.name || '未命名文件夹',
        value: String(folder.id),
        key: String(folder.id),
        ...(children.length > 0 ? { children } : {})
      };
    };

    const rootFolders = folders.filter(f => !f.parent_id || f.parent_id === null);
    
    return [
      {
        title: '根目录（全部文件）',
        value: 'root',
        key: 'root',
      },
      ...rootFolders.map(buildNode).filter(node => node !== null)
    ];
  };

  // 确认移动
  const handleMoveConfirm = async () => {
    if (!moveTarget) return;
    
    try {
      // moveTargetParentId 已经是 null 或者目标文件夹 ID
      const result = await moveItems([moveTarget.id], moveTargetParentId);
      if (result.success) {
        setShowMoveModal(false);
        setMoveTarget(null);
        setMoveTargetParentId(null);
      }
    } catch (error) {
      console.error('Move error:', error);
      message.error('移动失败');
    }
  };

  // 删除
  const handleDelete = async (ids) => {
    if (needSyncPathGuard()) {
      message.warning('请先设置本地同步路径');
      return;
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${ids.length} 个项目吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (isSyncView) {
          // 同步文件夹视图：使用本地文件系统
          if (!window.electronAPI || !window.electronAPI.fs) {
            message.error('文件系统接口不可用');
            return;
          }
          try {
            const deletePromises = ids.map(async (id) => {
              const file = files.find(f => f.id === id);
              if (!file) return { success: false };
              const result = await window.electronAPI.fs.remove(file.path || file.id, file.is_dir);
              return result;
            });
            const results = await Promise.all(deletePromises);
            const successCount = results.filter(r => r.success).length;
            if (successCount > 0) {
              message.success(`成功删除 ${successCount} 个项目`);
              setSelectedFiles([]);
              fetchSyncFiles(currentSyncPath || syncPath);
            } else {
              message.error('删除失败');
            }
          } catch (error) {
            console.error('Delete error:', error);
            message.error('删除失败');
          }
        } else {
          await deleteItems(ids);
        }
      },
    });
  };

  // 批量操作菜单
  const bulkActionMenu = {
    items: [
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除选中',
        onClick: () => handleDelete(selectedFiles),
      },
      {
        key: 'move',
        icon: <MoveOutlined />,
        label: '移动到',
        onClick: () => {
          // TODO: 实现移动功能
          message.info('移动功能开发中...');
        },
      },
    ],
  };

  // 右键菜单
  const contextMenuItems = contextTarget ? [
    {
      key: 'open',
      label: '打开',
      icon: <EyeOutlined />,
      onClick: () => {
        if (contextTarget.is_dir) {
          navigateToFolder(contextTarget);
        }
      },
    },
    {
      key: 'rename',
      label: '重命名',
      icon: <RenameOutlined />,
      onClick: () => handleRename(contextTarget),
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => handleDelete([contextTarget.id]),
    },
  ] : [];

  return (
    <div className="file-manager">
      <Card 
        title={
          <Space>
            <Text strong style={{ fontSize: '18px' }}>
              {view === 'recent' ? '最近文件' : 
               view === 'shared' ? '共享文件' : 
               view === 'sync' ? '同步文件' : '全部文件'}
            </Text>
            {!loading && <Text type="secondary">({filteredFiles.length} 个项目)</Text>}
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={async () => {
                if (isSyncView) {
                  // 同步文件视图：先执行一次云端->本地同步，再刷新本地视图
                  console.log('[Sync] 刷新按钮点击（同步文件视图）');
                  try {
                    await triggerOnce();
                  } catch (e) {
                    console.error('[Sync] triggerOnce 执行出错', e);
                  }
                  await fetchSyncFiles(currentSyncPath || syncPath);
                } else {
                  console.log('[Sync] 刷新按钮点击（云端视图）', {
                    parentId: currentParentId,
                  });
                  fetchFiles(currentParentId);
                }
              }}
              loading={loading}
            />
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'name',
                    label: '按名称排序',
                    icon: sortType === 'name' ? (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />) : null,
                    onClick: () => {
                      if (sortType === 'name') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortType('name');
                        setSortOrder('asc');
                      }
                    },
                  },
                  {
                    key: 'time',
                    label: '按时间排序',
                    icon: sortType === 'time' ? (sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />) : null,
                    onClick: () => {
                      if (sortType === 'time') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortType('time');
                        setSortOrder('desc');
                      }
                    },
                  },
                ],
              }}
              trigger={['hover']}
              placement="bottomRight"
            >
              <Button 
                icon={sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
              >
                排序
              </Button>
            </Dropdown>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {/* 路径面包屑导航 */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {breadcrumbs.length > 1 && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => {
                  setSelectedFileId(null);
                  navigateUp();
                }}
                style={{ marginRight: '8px' }}
              >
              </Button>
            )}
            <Breadcrumb
              items={breadcrumbs.map((item, index) => ({
                key: item.id || 'root',
                title: index === 0 ? (
                  <span style={{ cursor: 'pointer', color: '#1890ff' }} onClick={() => {
                    setSelectedFileId(null);
                    if (isSyncView) {
                      fetchSyncFiles(syncPath);
                    } else {
                      navigateToBreadcrumb(null);
                    }
                  }}>
                    {item.name}
                  </span>
                ) : index === breadcrumbs.length - 1 ? (
                  <span style={{ color: '#666' }}>{item.name}</span>
                ) : (
                  <span 
                    style={{ cursor: 'pointer', color: '#1890ff' }} 
                    onClick={() => {
                      setSelectedFileId(null);
                      navigateToBreadcrumb(item.id);
                    }}
                  >
                    {item.name}
                  </span>
                ),
              }))}
            />
          </div>
        )}

        {needSyncPathGuard() && (
          <div style={{ marginBottom: 12, padding: '10px 12px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6 }}>
            <Text>当前处于云端“同步文件”目录，需先设置本地同步路径后才能进行上传或修改。请点击左下角“设置”按钮选择路径。</Text>
          </div>
        )}

        <Space style={{ marginBottom: 16 }} size="middle">
          <Search
            placeholder="搜索文件和文件夹"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          
          {!isSyncView && (
            <Button 
              icon={<UploadOutlined />}
              type="primary"
              onClick={() => guardOr(() => setShowUploadManager(true))}
              disabled={needSyncPathGuard()}
            >
              上传文件
            </Button>
          )}
          {isSyncView && (
            <Button 
              icon={<UploadOutlined />}
              type="primary"
              onClick={handleUploadToSync}
              disabled={!syncPath}
            >
              上传到同步
            </Button>
          )}
          
          <Button 
            icon={<FolderOutlined />}
            onClick={() => guardOr(() => setShowNewFolderModal(true))}
            disabled={needSyncPathGuard()}
          >
            新建文件夹
          </Button>

          {selectedFiles.length > 0 && (
            <Dropdown menu={bulkActionMenu} placement="bottomLeft">
              <Button icon={<MoreOutlined />}>
                批量操作 ({selectedFiles.length})
              </Button>
            </Dropdown>
          )}
        </Space>

        {/* 文件列表 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size="large" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <Empty 
            description="暂无文件"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            ref={tableRef}
            rowSelection={rowSelection}
            columns={columns}
            dataSource={filteredFiles}
            rowKey="id"
            pagination={false}
            loading={loading}
            onRow={(record) => ({
              onDoubleClick: () => handleDoubleClick(record),
              onMouseEnter: () => setHoveredRowId(record.id),
              onMouseLeave: () => setHoveredRowId(null),
              onContextMenu: (e) => {
                e.preventDefault();
                setContextTarget(record);
                setContextMenuPosition({ x: e.clientX, y: e.clientY });
                setContextMenuVisible(true);
              },
            })}
            scroll={{ y: 'calc(100vh - 400px)' }}
            size="middle"
            style={{ 
              background: '#fff'
            }}
            className="file-list-table"
          />
        )}
      </Card>

      {/* 新建文件夹模态框 */}
      <Modal
        title="新建文件夹"
        open={showNewFolderModal}
        onOk={handleCreateFolder}
        onCancel={() => {
          setShowNewFolderModal(false);
          setNewFolderName('');
        }}
        okButtonProps={{ disabled: !newFolderName.trim() }}
      >
        <Input
          placeholder="请输入文件夹名称"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onPressEnter={handleCreateFolder}
          autoFocus
        />
      </Modal>

      {/* 右键菜单 */}
      <Dropdown
        menu={{ items: contextMenuItems }}
        open={contextMenuVisible}
        onOpenChange={setContextMenuVisible}
        trigger={['contextMenu']}
        openKeys={[]}
        getPopupContainer={() => document.body}
      >
        <div />
      </Dropdown>

      {/* 上传管理器 */}
      {showUploadManager && (
        <UploadManager 
          visible={showUploadManager}
          onClose={() => setShowUploadManager(false)}
          currentParentId={currentParentId}
          onUploadSuccess={() => {
            // 上传成功后刷新文件列表
            fetchFiles(currentParentId);
          }}
        />
      )}

      {/* 移动文件模态框 */}
      <Modal
        title="移动到"
        open={showMoveModal}
        onOk={handleMoveConfirm}
        onCancel={() => {
          setShowMoveModal(false);
          setMoveTarget(null);
          setMoveTargetParentId(null);
        }}
        okText="确定"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">选择目标文件夹：</Text>
        </div>
        <TreeSelect
          style={{ width: '100%' }}
          treeData={buildFolderTree(files, moveTarget?.id)}
          placeholder="请选择目标文件夹"
          value={moveTargetParentId === null ? 'root' : moveTargetParentId ? String(moveTargetParentId) : 'root'}
          onChange={(value) => {
            setMoveTargetParentId(value === 'root' ? null : (value ? Number(value) : null));
          }}
          treeDefaultExpandAll
          showSearch
          treeNodeFilterProp="title"
          allowClear
        />
        {moveTarget && (
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">移动对象：</Text>
            <Text strong style={{ marginLeft: 8 }}>
              {moveTarget.is_dir ? '📁' : '📄'} {moveTarget.name}
            </Text>
          </div>
        )}
      </Modal>

      {/* 分享模态框 */}
      {shareTarget && (
        <ShareModal
          open={shareModalVisible}
          onClose={() => {
            setShareModalVisible(false);
            setShareTarget(null);
          }}
          resource={shareTarget}
          onShared={() => {
            // 共享成功后，可在此扩展：通知或刷新“我的共享”目录
          }}
        />
      )}

      {/* 版本历史抽屉 */}
      {versionFile && (
        <VersionHistory
          open={versionDrawerVisible}
          onClose={() => {
            setVersionDrawerVisible(false);
            setVersionFile(null);
          }}
          file={versionFile}
        />
      )}
    </div>
  );
};

export default FileManager;
