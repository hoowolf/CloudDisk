import request from './request';

// 认证相关API
const authAPI = {
  // 用户登录
  async login(credentials) {
    try {
      const response = await request.post('/auth/login', credentials);
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        const { token, user } = response.data;
        
        // 保存token到localStorage
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '登录失败' 
      };
    }
  },

  // 用户注册
  async register(userData) {
    try {
      const response = await request.post('/auth/register', userData);
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        const { token, user } = response.data;
        
        // 保存token到localStorage
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '注册失败' 
      };
    }
  },

  // 用户登出
  async logout() {
    try {
      await request.post('/auth/logout');
      return { success: true };
    } catch (error) {
      // 即使登出失败，也要清除本地token
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      return { success: true };
    } finally {
      // 清除本地存储的认证信息
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  },

  // 获取当前用户信息
  async getCurrentUser() {
    try {
      const response = await request.get('/auth/me');
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '获取用户信息失败' 
      };
    }
  },

  // 更新用户信息
  async updateProfile(userData) {
    try {
      const response = await request.put('/auth/profile', userData);
      
      // 更新本地用户信息
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...user, ...response };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '更新用户信息失败' 
      };
    }
  },

  // 修改密码
  async changePassword(passwordData) {
    try {
      const response = await request.put('/auth/password', passwordData);
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '修改密码失败' 
      };
    }
  },

  // 刷新token
  async refreshToken() {
    try {
      const response = await request.post('/auth/refresh');
      const { token } = response;
      
      localStorage.setItem('authToken', token);
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '刷新token失败' 
      };
    }
  },

  // 检查token是否有效
  async verifyToken() {
    try {
      await request.get('/auth/verify');
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'token无效' 
      };
    }
  },

  // 发送重置密码邮件
  async sendResetPasswordEmail(email) {
    try {
      const response = await request.post('/auth/reset-password', { email });
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '发送重置密码邮件失败' 
      };
    }
  },

  // 重置密码
  async resetPassword(token, newPassword) {
    try {
      const response = await request.post('/auth/reset-password/confirm', {
        token,
        password: newPassword
      });
      return { success: true, data: response };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '重置密码失败' 
      };
    }
  },

  // 获取登录状态
  isLoggedIn() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      return false;
    }
    
    try {
      // 解析用户信息
      const userData = JSON.parse(user);
      
      // 检查用户数据是否完整
      if (!userData.id || !userData.username || !userData.email) {
        return false;
      }
      
      // TODO: 可以在这里添加token过期时间检查
      
      return true;
    } catch (error) {
      console.error('解析用户信息失败:', error);
      return false;
    }
  },

  // 获取当前用户信息（从localStorage）
  getCurrentUserFromStorage() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  },

  // 清除认证信息
  clearAuth() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }
};

export default authAPI;