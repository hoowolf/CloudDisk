import React, { useEffect, useState } from 'react';
import { Drawer, Table, Tag, Space, Button, Typography, message, Popconfirm } from 'antd';
import { RollbackOutlined, DeleteOutlined } from '@ant-design/icons';
import fileAPI from '../utils/fileAPI';
import { formatFileSize, formatDate } from '../utils/fileUtils';

const { Text } = Typography;

/**
 * 文件版本历史侧边栏
 * props:
 *  - open: 是否打开
 *  - onClose: 关闭回调
 *  - file: 当前文件 { id, name, ... }
 */
const VersionHistory = ({ open, onClose, file }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rollbackingId, setRollbackingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadVersions = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await fileAPI.getFileVersions(file.id);
      if (res.success) {
        setVersions(res.data || []);
      } else {
        message.error(res.message || '获取版本历史失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && file) {
      loadVersions();
    }
  }, [open, file?.id]);

  const handleRollback = async (version) => {
    if (!file) return;
    setRollbackingId(version.id);
    try {
      const res = await fileAPI.rollbackFileVersion(file.id, version.id);
      if (res.success) {
        message.success('回滚成功，已生成新版本');
        await loadVersions();
      } else {
        message.error(res.message || '回滚失败');
      }
    } finally {
      setRollbackingId(null);
    }
  };

  const handleDeleteVersion = async (version) => {
    if (!file) return;
    setDeletingId(version.id);
    try {
      const res = await fileAPI.deleteFileVersion(file.id, version.id);
      if (res.success) {
        message.success('版本删除成功');
        await loadVersions();
      } else {
        message.error(res.message || '删除版本失败');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      title: '版本号',
      dataIndex: 'version_no',
      key: 'version_no',
      render: (no, record, index) =>
        index === 0 ? (
          <Space>
            <Text strong>v{no}</Text>
            <Tag color="blue">当前</Tag>
          </Space>
        ) : (
          <Text>v{no}</Text>
        ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (s) => formatFileSize(s),
    },
    {
      title: '哈希',
      dataIndex: 'hash',
      key: 'hash',
      ellipsis: true,
      render: (h) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {h}
        </Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (t) => formatDate(t),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record, index) =>
        index === 0 ? (
          <Text type="secondary">当前版本</Text>
        ) : (
          <Space>
            <Popconfirm
              title="确认回滚"
              description={`确定回滚到版本 v${record.version_no} 吗？将新增一个新版本。`}
              onConfirm={() => handleRollback(record)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                size="small"
                icon={<RollbackOutlined />}
                loading={rollbackingId === record.id}
              >
                回滚
              </Button>
            </Popconfirm>
            <Popconfirm
              title="确认删除"
              description={`确定删除版本 v${record.version_no} 吗？此操作不可恢复。`}
              onConfirm={() => handleDeleteVersion(record)}
              okText="确定"
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
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
    },
  ];

  return (
    <Drawer
      title={`版本历史：${file?.name || ''}`}
      placement="right"
      width={520}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={versions}
        loading={loading}
        pagination={false}
      />
    </Drawer>
  );
};

export default VersionHistory;


