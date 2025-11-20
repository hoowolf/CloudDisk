import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import request from '../utils/request';
import { authStorage } from '../utils/storage';

// 创建认证上下文
const AuthContext = createContext();

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // 初始化时检查本地存储的用户信息
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 使用统一的存储工具获取认证信息
        const authData = await authStorage.get();
        
        if (authData && authData.user && authData.token) {
          setUser(authData.user);
          setToken(authData.token);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        // 清除可能损坏的存储数据
        await authStorage.clear();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 登录函数
  const login = async (username, password, rememberMe = false) => {
    try {
      const response = await request.post('/auth/login', { username, password });

      if (response.code === 0) {
        const { user: userData, token: authToken } = response.data;
        
        setUser(userData);
        setToken(authToken);
        
        // 使用统一的存储工具保存认证信息
        await authStorage.save({ user: userData, token: authToken }, rememberMe);
        
        message.success('登录成功');
        return { success: true, user: userData };
      } else {
        message.error(response.message || '登录失败');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      message.error('登录失败，请检查网络连接');
      return { success: false, error: error.message };
    }
  };

  // 注册函数（注册后默认记住登录状态）
  const register = async (username, email, password, rememberMe = true) => {
    try {
      const response = await request.post('/auth/register', { username, email, password });

      if (response.code === 0) {
        const { user: userData, token: authToken } = response.data;
        
        setUser(userData);
        setToken(authToken);
        
        // 使用统一的存储工具保存认证信息（注册默认记住）
        await authStorage.save({ user: userData, token: authToken }, rememberMe);
        
        message.success('注册成功');
        return { success: true, user: userData };
      } else {
        message.error(response.message || '注册失败');
        return { success: false, error: response.message };
      }
    } catch (error) {
      console.error('Register error:', error);
      
      // 提供更详细的错误信息
      if (error.code === 'NETWORK_ERROR') {
        message.error('网络连接失败，请检查网络设置');
      } else {
        message.error(`注册失败: ${error.message}`);
      }
      
      return { success: false, error: error.message };
    }
  };

  // 登出函数
  const logout = async () => {
    setUser(null);
    setToken(null);
    // 使用统一的存储工具清除认证信息
    await authStorage.clear();
    message.success('已退出登录');
  };

  // 获取当前用户信息的函数
  const getCurrentUser = async () => {
    try {
      // 使用统一的存储工具获取 token
      const authData = await authStorage.get();
      
      if (!authData || !authData.token) {
        throw new Error('未找到认证令牌');
      }

      const response = await request.get('/auth/me');

      if (response.code === 0) {
        setUser(response.data.user);
        // 更新存储的用户信息
        await authStorage.save({ user: response.data.user, token: authData.token }, authData.rememberMe);
        return response.data.user;
      } else {
        throw new Error(response.message || '获取用户信息失败');
      }
    } catch (error) {
      console.error('Get current user error:', error);
      // 清除所有存储的无效令牌
      await authStorage.clear();
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    getCurrentUser,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 使用认证上下文的Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};