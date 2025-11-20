import axios from 'axios';

// 创建axios实例
const request = axios.create({
  baseURL: 'http://localhost:8000/api/v1', // 基础URL
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加认证token（优先从 localStorage 获取，然后从 sessionStorage）
    let token = localStorage.getItem('authToken');
    if (!token) {
      token = sessionStorage.getItem('authToken');
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 添加请求时间戳
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 计算请求耗时
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;
    console.log(`API请求 ${response.config.url} 耗时: ${duration}ms`);
    
    // 对于 blob 响应（如下载文件），返回完整的 response 对象，而不是 response.data
    // 因为 blob 响应需要直接使用 response.data（Blob 对象）
    if (response.config.responseType === 'blob') {
      return response;
    }
    
    return response.data;
  },
  (error) => {
    // 处理常见错误
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // 未授权，清除所有存储的token并跳转到登录页
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          sessionStorage.removeItem('authToken');
          sessionStorage.removeItem('user');
          window.location.href = '/login';
          break;
        case 403:
          console.error('没有权限访问该资源');
          break;
        case 404:
          console.error('请求的资源不存在');
          break;
        case 500:
          console.error('服务器内部错误');
          break;
        default:
          console.error(`请求错误: ${data.message || error.message}`);
      }
    } else if (error.request) {
      console.error('网络错误，请检查网络连接');
    } else {
      console.error('请求配置错误:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default request;