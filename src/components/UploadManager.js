import React, { useState, useCallback } from 'react';
import { 
  Modal, Upload, Button, Progress, Space, Typography, 
  message, Table, Tag, Tooltip, Empty, App
} from 'antd';
import { 
  UploadOutlined, PauseOutlined, PlayCircleOutlined, 
  DeleteOutlined, FileOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useFile } from '../contexts/FileContext';
import { formatFileSize, getFileType } from '../utils/fileUtils';
import request from '../utils/request';

const { Text } = Typography;

const UploadManager = ({ visible, onClose, currentParentId = null, onUploadSuccess }) => {
  const { message } = App.useApp();
  const { setUploadingFiles } = useFile();
  const [uploadList, setUploadList] = useState([]);
  const [uploading, setUploading] = useState(false);

  // 处理文件上传前的验证
  const beforeUpload = useCallback((file) => {
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      message.error(`文件 ${file.name} 超过大小限制 (100MB)`);
      return Upload.LIST_IGNORE;
    }

    const uploadItem = {
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: getFileType(file.name),
      status: 'waiting', // waiting, uploading, paused, completed, error
      progress: 0,
      speed: 0,
      timeRemaining: 0,
      error: null,
    };

    setUploadList(prev => [...prev, uploadItem]);
    return false; // 阻止自动上传
  }, []);

  // 单文件上传
  const uploadSingleFile = useCallback(async (uploadItem) => {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('file', uploadItem.file);
      // 使用当前文件夹ID，如果没有则上传到根目录
      formData.append('parent_id', currentParentId || 'null');

      const xhr = new XMLHttpRequest();
      
      // 更新状态为上传中
      setUploadList(prev => prev.map(item => 
        item.id === uploadItem.id 
          ? { ...item, status: 'uploading' }
          : item
      ));

      // 进度监听
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadList(prev => prev.map(item => 
            item.id === uploadItem.id 
              ? { 
                  ...item, 
                  progress: percentComplete,
                  speed: event.loaded / (Date.now() / 1000), // 简化速度计算
                }
              : item
          ));
        }
      });

      // 完成监听
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.code === 0) {
              setUploadList(prev => prev.map(item => 
                item.id === uploadItem.id 
                  ? { ...item, status: 'completed', progress: 100 }
                  : item
              ));
              message.success(`${uploadItem.name} 上传成功`);
              // 如果所有文件都上传完成，触发刷新
              const remaining = uploadList.filter(item => item.id !== uploadItem.id && item.status !== 'completed');
              if (remaining.length === 0 && onUploadSuccess) {
                onUploadSuccess();
              }
            } else {
              throw new Error(response.message || '上传失败');
            }
          } catch (error) {
            setUploadList(prev => prev.map(item => 
              item.id === uploadItem.id 
                ? { ...item, status: 'error', error: error.message }
                : item
            ));
            message.error(`${uploadItem.name} 上传失败: ${error.message}`);
          }
        } else {
          setUploadList(prev => prev.map(item => 
            item.id === uploadItem.id 
              ? { ...item, status: 'error', error: '网络错误' }
              : item
          ));
          message.error(`${uploadItem.name} 上传失败`);
        }
        resolve();
      });

      // 错误监听
      xhr.addEventListener('error', () => {
        setUploadList(prev => prev.map(item => 
          item.id === uploadItem.id 
            ? { ...item, status: 'error', error: '网络错误' }
            : item
        ));
        message.error(`${uploadItem.name} 上传失败`);
        resolve();
      });

      // 发送请求 - 使用完整的API URL
      const baseURL = 'http://localhost:8000/api/v1';
      xhr.open('POST', `${baseURL}/files/upload-simple`);
      // 优先从 localStorage 获取，然后从 sessionStorage
      let token = localStorage.getItem('authToken');
      if (!token) {
        token = sessionStorage.getItem('authToken');
      }
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  }, [currentParentId, message, uploadList, onUploadSuccess]);

  // 开始上传
  const startUpload = useCallback(async () => {
    if (uploadList.length === 0) return;

    setUploading(true);
    const waitingItems = uploadList.filter(item => item.status === 'waiting');
    
    for (const item of waitingItems) {
      await uploadSingleFile(item);
    }
    
    setUploading(false);
    
    // 所有文件上传完成后刷新列表
    if (waitingItems.length > 0 && onUploadSuccess) {
      onUploadSuccess();
    }
  }, [uploadList, uploadSingleFile, onUploadSuccess]);

  // 暂停上传
  const pauseUpload = (id) => {
    setUploadList(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: 'paused' }
        : item
    ));
  };

  // 继续上传
  const resumeUpload = (id) => {
    setUploadList(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: 'uploading' }
        : item
    ));
  };

  // 取消上传
  const cancelUpload = (id) => {
    setUploadList(prev => prev.filter(item => item.id !== id));
  };

  // 清除已完成的项目
  const clearCompleted = () => {
    setUploadList(prev => prev.filter(item => item.status !== 'completed'));
  };

  // 表格列定义
  const columns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <FileOutlined style={{ color: '#1890ff' }} />
          <Text>{text}</Text>
          <Tag color="blue">{record.type}</Tag>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (text) => <Text type="secondary">{formatFileSize(text)}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusConfig = {
          waiting: { color: 'default', icon: <PauseOutlined />, text: '等待中' },
          uploading: { color: 'processing', icon: <UploadOutlined />, text: '上传中' },
          paused: { color: 'warning', icon: <PauseOutlined />, text: '已暂停' },
          completed: { color: 'success', icon: <CheckCircleOutlined />, text: '已完成' },
          error: { color: 'error', icon: <ExclamationCircleOutlined />, text: '失败' },
        };
        
        const config = statusConfig[status];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress, record) => (
        <div style={{ width: 100 }}>
          <Progress 
            percent={Math.round(progress)} 
            size="small"
            status={record.status === 'error' ? 'exception' : 'normal'}
            showInfo={false}
          />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {Math.round(progress)}%
          </Text>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.status === 'uploading' && (
            <Tooltip title="暂停">
              <Button 
                type="text" 
                icon={<PauseOutlined />} 
                size="small"
                onClick={() => pauseUpload(record.id)}
              />
            </Tooltip>
          )}
          {record.status === 'paused' && (
            <Tooltip title="继续">
              <Button 
                type="text" 
                icon={<PlayCircleOutlined />} 
                size="small"
                onClick={() => resumeUpload(record.id)}
              />
            </Tooltip>
          )}
          {(record.status === 'waiting' || record.status === 'paused' || record.status === 'error') && (
            <Tooltip title="移除">
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                size="small"
                danger
                onClick={() => cancelUpload(record.id)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <App>
      <Modal
        title="上传管理器"
        open={visible}
        onCancel={onClose}
        width={800}
        footer={[
          <Button key="clear" onClick={clearCompleted}>
            清除已完成
          </Button>,
          <Button key="cancel" onClick={onClose}>
            关闭
          </Button>,
          <Button 
            key="upload" 
            type="primary" 
            loading={uploading}
            disabled={uploadList.length === 0}
            onClick={startUpload}
          >
            开始上传 ({uploadList.filter(item => item.status === 'waiting').length})
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Upload
            multiple
            beforeUpload={beforeUpload}
            showUploadList={false}
            accept="*/*"
          >
            <Button icon={<UploadOutlined />}>
              选择文件上传
            </Button>
          </Upload>
        </div>

        {uploadList.length === 0 ? (
          <Empty 
            description="暂无上传任务"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={uploadList}
            rowKey="id"
            pagination={false}
            size="small"
          />
        )}
      </Modal>
    </App>
  );
};

export default UploadManager;