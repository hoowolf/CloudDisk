import React, { useState, useEffect } from 'react';
import { Layout, ConfigProvider, theme, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import request from './utils/request';
import { authStorage } from './utils/storage';

// 组件导入
import LoginForm from './components/LoginForm';
import MainLayout from './components/MainLayout';
import { AuthProvider } from './contexts/AuthContext';
import { FileProvider } from './contexts/FileContext';
import './App.css';

const { Content } = Layout;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 检查本地存储的token
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 使用统一的存储工具获取认证信息
        const authData = await authStorage.get();
        
        if (authData && authData.token) {
          // 验证token是否有效
          const response = await request.get('/auth/me');
          
          if (response.code === 0) {
            setIsAuthenticated(true);
          } else {
            // 清除所有存储的无效token
            await authStorage.clear();
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // 清除所有存储的无效token
        await authStorage.clear();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    // 使用统一的存储工具清除认证信息
    await authStorage.clear();
    setIsAuthenticated(false);
  };

  // 设置 dayjs 中文语言
  dayjs.locale('zh-cn');

  if (loading) {
    return (
      <ConfigProvider locale={zhCN}>
        <div className="app-loading">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider 
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
        },
        components: {
          Layout: {
            bodyBg: '#f5f5f5',
            headerBg: '#001529',
            siderBg: '#001529',
          },
          Menu: {
            darkItemBg: '#001529',
            darkItemSelectedBg: '#1890ff',
          },
        },
      }}
    >
      <AntdApp>
        <AuthProvider>
          <FileProvider>
            <Layout className="app-layout">
              <Content className="app-content">
                {!isAuthenticated ? (
                  <LoginForm onLogin={handleLogin} />
                ) : (
                  <MainLayout onLogout={handleLogout} />
                )}
              </Content>
            </Layout>
          </FileProvider>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;