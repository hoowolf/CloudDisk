import React, { useState } from 'react';
import { Modal, List, Badge, Button, Empty, Typography, Space, Tabs, Tag } from 'antd';
import { 
  BellOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  CloseCircleOutlined,
  InfoCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  SyncOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TabPane } = Tabs;

const NotificationCenter = ({ visible, onClose }) => {
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'success',
      title: '文件上传完成',
      message: 'document.pdf 已成功上传到云端',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5分钟前
      read: false,
      icon: <UploadOutlined />,
      actions: ['查看', '打开']
    },
    {
      id: '2',
      type: 'info',
      title: '同步提醒',
      message: '检测到 3 个文件需要同步',
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15分钟前
      read: false,
      icon: <SyncOutlined />,
      actions: ['查看详情']
    },
    {
      id: '3',
      type: 'warning',
      title: '存储空间不足',
      message: '您的云盘存储空间仅剩余 100MB',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30分钟前
      read: true,
      icon: <ExclamationCircleOutlined />,
      actions: ['管理存储']
    },
    {
      id: '4',
      type: 'success',
      title: '文件分享成功',
      message: 'presentation.pptx 已分享给用户: alice@example.com',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1小时前
      read: true,
      icon: <ShareAltOutlined />,
      actions: ['复制链接', '查看分享']
    },
    {
      id: '5',
      type: 'error',
      title: '文件下载失败',
      message: 'video.mp4 下载失败，请检查网络连接',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2小时前
      read: true,
      icon: <CloseCircleOutlined />,
      actions: ['重试下载']
    }
  ]);

  const [activeTab, setActiveTab] = useState('all');

  // 获取通知类型对应的图标和颜色
  const getNotificationStyle = (type) => {
    switch (type) {
      case 'success':
        return { color: '#52c41a', icon: <CheckCircleOutlined /> };
      case 'warning':
        return { color: '#faad14', icon: <ExclamationCircleOutlined /> };
      case 'error':
        return { color: '#ff4d4f', icon: <CloseCircleOutlined /> };
      default:
        return { color: '#1890ff', icon: <InfoCircleOutlined /> };
    }
  };

  // 格式化时间显示
  const formatTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else {
      return `${days}天前`;
    }
  };

  // 过滤通知
  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter(n => !n.read);
      case 'success':
        return notifications.filter(n => n.type === 'success');
      case 'warning':
        return notifications.filter(n => n.type === 'warning');
      case 'error':
        return notifications.filter(n => n.type === 'error');
      default:
        return notifications;
    }
  };

  // 获取未读通知数量
  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  // 标记为已读
  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  // 标记所有为已读
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  // 删除通知
  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  // 清空所有通知
  const clearAll = () => {
    setNotifications([]);
  };

  // 处理通知操作
  const handleNotificationAction = (notification, action) => {
    markAsRead(notification.id);
    
    switch (action) {
      case '查看':
        // TODO: 打开文件或导航到相关页面
        console.log('查看文件:', notification.message);
        break;
      case '打开':
        // TODO: 打开文件
        console.log('打开文件:', notification.message);
        break;
      case '查看详情':
        // TODO: 显示同步详情
        console.log('查看同步详情');
        break;
      case '管理存储':
        // TODO: 打开存储管理页面
        console.log('管理存储');
        break;
      case '复制链接':
        // TODO: 复制分享链接到剪贴板
        console.log('复制分享链接');
        break;
      case '查看分享':
        // TODO: 显示分享详情
        console.log('查看分享详情');
        break;
      case '重试下载':
        // TODO: 重试下载
        console.log('重试下载');
        break;
      default:
        break;
    }
  };

  // 渲染通知项
  const renderNotificationItem = (item) => {
    const style = getNotificationStyle(item.type);
    
    return (
      <List.Item
        className={`notification-item ${!item.read ? 'unread' : ''}`}
        style={{
          backgroundColor: item.read ? 'transparent' : 'rgba(24, 144, 255, 0.05)',
          padding: '12px 16px',
          borderLeft: item.read ? '3px solid transparent' : '3px solid #1890ff',
          marginBottom: '1px'
        }}
      >
        <List.Item.Meta
          avatar={
            <div style={{ 
              color: style.color, 
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px'
            }}>
              {item.icon}
            </div>
          }
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong={!item.read} style={{ margin: 0 }}>
                {item.title}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {formatTime(item.timestamp)}
              </Text>
            </div>
          }
          description={
            <div>
              <Text type="secondary" style={{ marginRight: '8px' }}>
                {item.message}
              </Text>
              {!item.read && (
                <Tag color="blue" style={{ marginLeft: '8px' }}>新</Tag>
              )}
            </div>
          }
        />
        
        <div style={{ marginTop: '8px' }}>
          <Space size="small">
            {item.actions.map(action => (
              <Button
                key={action}
                size="small"
                type="text"
                onClick={() => handleNotificationAction(item, action)}
              >
                {action}
              </Button>
            ))}
            <Button
              size="small"
              type="text"
              danger
              onClick={() => deleteNotification(item.id)}
            >
              删除
            </Button>
          </Space>
        </div>
      </List.Item>
    );
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <Modal
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <BellOutlined style={{ marginRight: '8px' }} />
            通知中心
          </span>
          {getUnreadCount() > 0 && (
            <Button type="link" size="small" onClick={markAllAsRead}>
              全部标为已读
            </Button>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="clear" onClick={clearAll} disabled={notifications.length === 0}>
          清空所有通知
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        style={{ marginBottom: '16px' }}
      >
        <TabPane 
          tab={
            <span>
              全部
              <Badge count={notifications.length} size="small" style={{ marginLeft: '4px' }} />
            </span>
          } 
          key="all" 
        />
        <TabPane 
          tab={
            <span>
              未读
              <Badge count={getUnreadCount()} size="small" style={{ marginLeft: '4px' }} />
            </span>
          } 
          key="unread" 
        />
        <TabPane tab="成功" key="success" />
        <TabPane tab="警告" key="warning" />
        <TabPane tab="错误" key="error" />
      </Tabs>

      {filteredNotifications.length === 0 ? (
        <Empty
          description="暂无通知"
          style={{ margin: '40px 0' }}
        />
      ) : (
        <List
          dataSource={filteredNotifications}
          renderItem={renderNotificationItem}
          style={{ maxHeight: '400px', overflowY: 'auto' }}
        />
      )}
    </Modal>
  );
};

export default NotificationCenter;