import React, { useEffect, useState } from 'react';
import { Card, Tabs, Table, Tag, Space, Button, Typography, message, Popconfirm } from 'antd';
import { DeleteOutlined, ReloadOutlined, FolderOutlined, FileOutlined, EyeOutlined } from '@ant-design/icons';
import { useFile } from '../contexts/FileContext';
import fileAPI from '../utils/fileAPI';

const { Text } = Typography;
const { TabPane } = Tabs;

const ShareManager = ({ onOpenSharedResource }) => {
  const [outgoing, setOutgoing] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loadingOutgoing, setLoadingOutgoing] = useState(false);
  const [loadingIncoming, setLoadingIncoming] = useState(false);
  const { navigateToFolder } = useFile();

  const loadOutgoing = async () => {
    setLoadingOutgoing(true);
    try {
      const res = await fileAPI.getOutgoingShares();
      if (res.success) {
        setOutgoing(res.data || []);
      } else {
        message.error(res.message || '获取我共享的资源失败');
      }
    } finally {
      setLoadingOutgoing(false);
    }
  };

  const loadIncoming = async () => {
    setLoadingIncoming(true);
    try {
      const res = await fileAPI.getIncomingShares();
      if (res.success) {
        setIncoming(res.data || []);
      } else {
        message.error(res.message || '获取共享给我的资源失败');
      }
    } finally {
      setLoadingIncoming(false);
    }
  };

  useEffect(() => {
    loadOutgoing();
    loadIncoming();
  }, []);

  const handleDeleteShare = async (shareId) => {
    const res = await fileAPI.deleteShare(shareId);
    if (res.success) {
      message.success('已取消共享');
      await loadOutgoing();
    } else {
      message.error(res.message || '取消共享失败');
    }
  };

  const columnsCommon = [
    {
      title: '资源名称',
      dataIndex: 'resource_name',
      key: 'resource_name',
      render: (text) => text || <Text type="secondary">（已删除）</Text>,
    },
    {
      title: '权限',
      dataIndex: 'permission',
      key: 'permission',
      render: (p) =>
        p === 'write' ? (
          <Tag color="blue">可读写</Tag>
        ) : (
          <Tag color="green">只读</Tag>
        ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
    },
    {
      title: '过期时间',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (t) => (t ? t : <Text type="secondary">永不过期</Text>),
    },
  ];

  const outgoingColumns = [
    ...columnsCommon,
    {
      title: '共享给',
      dataIndex: 'target_username',
      key: 'target_username',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="取消共享"
            description="确定取消该共享吗？"
            onConfirm={() => handleDeleteShare(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              取消共享
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleOpenSharedResource = async (share) => {
    if (!share.resource_id) {
      message.warning('该资源已被删除');
      return;
    }
    
    // 如果提供了回调函数，使用回调（用于在MainLayout中切换视图）
    if (onOpenSharedResource) {
      onOpenSharedResource(share);
      return;
    }
    
    // 直接使用共享信息中的 is_dir 字段
    try {
      if (share.resource_is_dir) {
        // 如果是文件夹，导航到该文件夹
        navigateToFolder({
          id: share.resource_id,
          name: share.resource_name || '共享文件夹',
          is_dir: true
        });
      } else {
        // 如果是文件，下载文件
        const downloadRes = await fileAPI.downloadFile(share.resource_id);
        if (downloadRes.success && downloadRes.data) {
          if (downloadRes.data instanceof Blob) {
            const url = window.URL.createObjectURL(downloadRes.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = share.resource_name || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            message.success('文件下载成功');
          }
        } else {
          message.error(downloadRes.message || '下载失败');
        }
      }
    } catch (error) {
      console.error('Open shared resource error:', error);
      message.error('打开共享资源失败');
    }
  };

  const incomingColumns = [
    ...columnsCommon,
    {
      title: '来自',
      dataIndex: 'owner_username',
      key: 'owner_username',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={record.resource_name ? <EyeOutlined /> : null}
            onClick={() => handleOpenSharedResource(record)}
            disabled={!record.resource_id}
          >
            打开
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="共享管理"
      extra={
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              loadOutgoing();
              loadIncoming();
            }}
          >
            刷新
          </Button>
        </Space>
      }
      style={{ height: '100%', overflow: 'auto' }}
    >
      <Tabs defaultActiveKey="outgoing">
        <TabPane tab="我共享的" key="outgoing">
          <Table
            rowKey="id"
            columns={outgoingColumns}
            dataSource={outgoing}
            loading={loadingOutgoing}
            pagination={false}
          />
        </TabPane>
        <TabPane tab="共享给我的" key="incoming">
          <Table
            rowKey="id"
            columns={incomingColumns}
            dataSource={incoming}
            loading={loadingIncoming}
            pagination={false}
          />
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default ShareManager;


