import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Space,
  Button,
  Typography,
  message,
  Popconfirm,
  Empty,
  Tag
} from 'antd';
import {
  ReloadOutlined,
  UndoOutlined,
  DeleteOutlined,
  FolderOutlined,
  FileOutlined
} from '@ant-design/icons';
import fileAPI from '../utils/fileAPI';
import { formatFileSize, formatDate } from '../utils/fileUtils';

const { Text } = Typography;

const TrashManager = () => {
  const [trashFiles, setTrashFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const res = await fileAPI.getTrash();
      if (res.success) {
        setTrashFiles(res.data?.items || []);
      } else {
        message.error(res.message || '获取回收站失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrash();
  }, []);

  const handleRestore = async (file) => {
    setRestoringId(file.id);
    try {
      const res = await fileAPI.restoreTrashFile(file.id);
      if (res.success) {
        message.success('恢复成功');
        await loadTrash();
      } else {
        message.error(res.message || '恢复失败');
      }
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentlyDelete = async (file) => {
    setDeletingId(file.id);
    try {
      const res = await fileAPI.permanentlyDeleteTrashFile(file.id);
      if (res.success) {
        message.success('彻底删除成功');
        await loadTrash();
      } else {
        message.error(res.message || '彻底删除失败');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleBatchRestore = async (ids) => {
    try {
      const promises = ids.map(id => fileAPI.restoreTrashFile(id));
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        message.success(`成功恢复 ${successCount} 个项目`);
        await loadTrash();
      } else {
        message.error('恢复失败');
      }
    } catch (error) {
      message.error('批量恢复失败');
    }
  };

  const handleBatchDelete = async (ids) => {
    try {
      const promises = ids.map(id => fileAPI.permanentlyDeleteTrashFile(id));
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        message.success(`成功删除 ${successCount} 个项目`);
        await loadTrash();
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {record.is_dir ? (
            <FolderOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
          ) : (
            <FileOutlined style={{ color: '#666', fontSize: '16px' }} />
          )}
          <Text>{text}</Text>
          {record.is_dir && <Tag color="blue">文件夹</Tag>}
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (text, record) => (
        <Text type="secondary">
          {record.is_dir ? '-' : formatFileSize(text)}
        </Text>
      ),
    },
    {
      title: '删除时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (text) => <Text type="secondary">{formatDate(text)}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="恢复文件"
            description="确定要恢复该文件吗？"
            onConfirm={() => handleRestore(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              icon={<UndoOutlined />}
              loading={restoringId === record.id}
            >
              恢复
            </Button>
          </Popconfirm>
          <Popconfirm
            title="彻底删除"
            description="确定要彻底删除该文件吗？此操作不可恢复！"
            onConfirm={() => handlePermanentlyDelete(record)}
            okText="确定删除"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === record.id}
            >
              彻底删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys) => {
      setSelectedRowKeys(keys);
    },
  };

  return (
    <Card
      title="回收站"
      extra={
        <Space>
          {selectedRowKeys.length > 0 && (
            <>
              <Popconfirm
                title="批量恢复"
                description={`确定要恢复选中的 ${selectedRowKeys.length} 个项目吗？`}
                onConfirm={() => {
                  handleBatchRestore(selectedRowKeys);
                  setSelectedRowKeys([]);
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button icon={<UndoOutlined />}>
                  批量恢复 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
              <Popconfirm
                title="批量彻底删除"
                description={`确定要彻底删除选中的 ${selectedRowKeys.length} 个项目吗？此操作不可恢复！`}
                onConfirm={() => {
                  handleBatchDelete(selectedRowKeys);
                  setSelectedRowKeys([]);
                }}
                okText="确定删除"
                cancelText="取消"
                okType="danger"
              >
                <Button danger icon={<DeleteOutlined />}>
                  批量删除 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            </>
          )}
          <Button icon={<ReloadOutlined />} onClick={loadTrash} loading={loading}>
            刷新
          </Button>
        </Space>
      }
      style={{ height: '100%', overflow: 'auto' }}
    >
      {trashFiles.length === 0 && !loading ? (
        <Empty description="回收站为空" />
      ) : (
        <Table
          rowKey="id"
          rowSelection={rowSelection}
          columns={columns}
          dataSource={trashFiles}
          loading={loading}
          pagination={false}
        />
      )}
    </Card>
  );
};

export default TrashManager;

