import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Typography, theme, Popover, Avatar, Divider } from 'antd';
  import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    HomeOutlined,
    FolderOutlined,
    FileOutlined,
    CloudSyncOutlined,
    SettingOutlined,
    UserOutlined,
    LogoutOutlined,
    DeleteOutlined
  } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useFile } from '../contexts/FileContext';
import FileManager from './FileManager';
import Settings from './Settings';
import ShareManager from './ShareManager';
import TrashManager from './TrashManager';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MainLayout = ({ onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeKey, setActiveKey] = useState('files');
  const [showSettings, setShowSettings] = useState(false);
  const { user, logout } = useAuth();
  const { 
    currentPath, 
    loading, 
    fetchFiles,
    openNamedRootFolder,
    navigateToBreadcrumb,
    openAllRoot 
  } = useFile();
  const { token } = theme.useToken();

  // 监听菜单快捷键事件
  useEffect(() => {
    if (window.electronAPI) {
      const handleNewFolder = () => {
        // 触发新建文件夹事件
        window.dispatchEvent(new CustomEvent('new-folder'));
      };

      window.electronAPI.onMenuNewFolder(handleNewFolder);

      return () => {
        window.electronAPI.removeAllListeners('menu-new-folder');
      };
    }
  }, []);

  // 侧边栏菜单项
  const menuItems = [
    {
      key: 'files',
      icon: <HomeOutlined />,
      label: '全部文件',
    },
    {
      key: 'recent',
      icon: <FileOutlined />,
      label: '最近文件',
    },
    {
      key: 'shared',
      icon: <CloudSyncOutlined />,
      label: '共享文件',
    },
    {
      key: 'sync',
      icon: <CloudSyncOutlined />,
      label: '同步文件',
    },
    {
      key: 'share-manager',
      icon: <FolderOutlined />,
      label: '共享管理',
    },
    {
      key: 'trash',
      icon: <DeleteOutlined />,
      label: '回收站',
    },
  ];

  // 渲染主内容区
  const renderMainContent = () => {
    switch (activeKey) {
      case 'files':
        return <FileManager />;
      case 'recent':
        return <FileManager view="recent" />;
      case 'shared':
        return <FileManager view="shared" />;
      case 'share-manager':
        return <ShareManager onOpenSharedResource={(share) => {
          // 当在共享管理中点击"打开"时，切换到共享文件视图并导航到该资源
          setActiveKey('shared');
        }} />;
      case 'trash':
        return <TrashManager />;
      case 'sync':
        return <FileManager view="sync" />;
      default:
        return <FileManager />;
    }
  };

  return (
    <Layout className="main-layout">
      {/* 侧边栏 */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="light"
        width={240}
        style={{
          background: '#ffffff',
          borderRight: `1px solid ${token.colorBorder}`,
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.06)',
          position: 'relative'
        }}
      >
        {/* Logo 区域 */}
        <div className={`logo-container ${collapsed ? 'collapsed' : ''}`}>
          {collapsed ? (
            <CloudSyncOutlined />
          ) : (
            <div className="logo-text">
              <CloudSyncOutlined />
              <span>DaseCloud</span>
            </div>
          )}
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          items={menuItems}
          onClick={async ({ key }) => {
            if (key === 'sync') {
              setActiveKey('sync');
              await openNamedRootFolder('同步文件');
              return;
            }
            if (key === 'shared') {
              setActiveKey('shared');
              await openNamedRootFolder('我的共享');
              return;
            }
            if (key === 'files') {
              setActiveKey('files');
              await openAllRoot();
              return;
            }
            setActiveKey(key);
          }}
          style={{ 
            borderRight: 0,
            background: 'transparent',
            padding: '8px 0'
          }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 0,
            width: '100%',
            borderTop: `1px solid ${token.colorBorder}`,
            padding: '12px 16px',
            background: '#ffffff'
          }}
        >
          <Button
            block
            icon={<SettingOutlined />}
            onClick={() => setShowSettings(true)}
          >
            设置
          </Button>
        </div>
      </Sider>

      <Layout>
        {/* 顶部导航栏 */}
        <Header 
          className="main-header"
          style={{
            background: token.colorBgContainer,
            borderBottom: `1px solid ${token.colorBorder}`,
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 100,
          }}
        >
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 40, height: 40 }}
            />
          </div>

          <div className="header-right">
            {/* 用户头像和信息 */}
              <Popover
                content={
                  <div style={{ minWidth: 200 }}>
                    <div style={{ paddingBottom: 8 }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>
                        {user?.username || '用户'}
                      </div>
                      {user?.email && (
                        <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                          {user.email}
                        </div>
                      )}
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <Button
                      type="text"
                      danger
                      icon={<LogoutOutlined />}
                      block
                      onClick={() => {
                        logout();
                        onLogout();
                      }}
                      style={{ textAlign: 'left', padding: '4px 0' }}
                    >
                      退出登录
                    </Button>
                  </div>
                }
                placement="bottomRight"
                trigger="hover"
                overlayStyle={{ zIndex: 1000 }}
              >
                <Avatar 
                  icon={<UserOutlined />} 
                  size="default"
                  style={{ 
                    cursor: 'pointer',
                    backgroundColor: token.colorPrimary,
                    display: 'inline-flex'
                  }}
                />
              </Popover>
          </div>
        </Header>

        {/* 主内容区 */}
        <Content 
          className="main-content"
          style={{
            background: token.colorBgLayout,
            padding: '24px',
            minHeight: 'calc(100vh - 64px)',
            overflow: 'auto',
          }}
        >
          {renderMainContent()}
        </Content>
      </Layout>

      {/* 设置模态框 */}
      {showSettings && (
        <Settings 
          visible={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </Layout>
  );
};

export default MainLayout;