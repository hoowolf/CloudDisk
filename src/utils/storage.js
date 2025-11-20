/**
 * 统一的存储工具
 * 在 Electron 环境中使用 electron-store，在 Web 环境中使用 localStorage/sessionStorage
 */

// 检测是否在 Electron 环境中
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI && window.electronAPI.store;
};

/**
 * 获取存储值
 * @param {string} key - 存储键
 * @param {boolean} useSession - 是否使用会话存储（仅 Web 环境）
 * @returns {Promise<any>} 存储的值
 */
export const getStorage = async (key, useSession = false) => {
  if (isElectron()) {
    // Electron 环境：使用 electron-store
    try {
      const value = await window.electronAPI.store.get(key);
      return value;
    } catch (error) {
      console.error('Failed to get from electron-store:', error);
      return null;
    }
  } else {
    // Web 环境：使用 localStorage 或 sessionStorage
    const storage = useSession ? sessionStorage : localStorage;
    try {
      const value = storage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Failed to get from storage:', error);
      return null;
    }
  }
};

/**
 * 设置存储值
 * @param {string} key - 存储键
 * @param {any} value - 要存储的值
 * @param {boolean} useSession - 是否使用会话存储（仅 Web 环境）
 * @returns {Promise<boolean>} 是否成功
 */
export const setStorage = async (key, value, useSession = false) => {
  if (isElectron()) {
    // Electron 环境：使用 electron-store
    try {
      await window.electronAPI.store.set(key, value);
      return true;
    } catch (error) {
      console.error('Failed to set to electron-store:', error);
      return false;
    }
  } else {
    // Web 环境：使用 localStorage 或 sessionStorage
    const storage = useSession ? sessionStorage : localStorage;
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Failed to set to storage:', error);
      return false;
    }
  }
};

/**
 * 删除存储值
 * @param {string} key - 存储键
 * @returns {Promise<boolean>} 是否成功
 */
export const removeStorage = async (key) => {
  if (isElectron()) {
    // Electron 环境：使用 electron-store
    try {
      await window.electronAPI.store.delete(key);
      return true;
    } catch (error) {
      console.error('Failed to delete from electron-store:', error);
      return false;
    }
  } else {
    // Web 环境：同时清除 localStorage 和 sessionStorage
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from storage:', error);
      return false;
    }
  }
};

/**
 * 清除所有存储
 * @returns {Promise<boolean>} 是否成功
 */
export const clearStorage = async () => {
  if (isElectron()) {
    // Electron 环境：使用 electron-store
    try {
      await window.electronAPI.store.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear electron-store:', error);
      return false;
    }
  } else {
    // Web 环境：清除所有存储
    try {
      localStorage.clear();
      sessionStorage.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }
};

/**
 * 专门用于认证信息的存储工具
 */
export const authStorage = {
  /**
   * 保存认证信息
   * @param {object} authData - 认证数据 { user, token }
   * @param {boolean} rememberMe - 是否记住我
   */
  save: async (authData, rememberMe = false) => {
    const { user, token } = authData;
    
    if (isElectron()) {
      // Electron 环境：使用 electron-store
      await window.electronAPI.store.set('auth', {
        user,
        token,
        rememberMe
      });
      // 同时在 localStorage 中保存一份，以便 request.js 可以同步获取
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('authToken', token);
    } else {
      // Web 环境：根据 rememberMe 选择存储方式
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('user', JSON.stringify(user));
      storage.setItem('authToken', token);
      // 清除另一种存储方式的数据
      const otherStorage = rememberMe ? sessionStorage : localStorage;
      otherStorage.removeItem('user');
      otherStorage.removeItem('authToken');
    }
  },

  /**
   * 获取认证信息
   * @returns {Promise<{user: object, token: string} | null>}
   */
  get: async () => {
    if (isElectron()) {
      // Electron 环境：从 electron-store 获取
      const auth = await window.electronAPI.store.get('auth');
      if (auth && auth.user && auth.token) {
        // 同步到 localStorage，以便 request.js 可以同步获取
        localStorage.setItem('user', JSON.stringify(auth.user));
        localStorage.setItem('authToken', auth.token);
        return {
          user: auth.user,
          token: auth.token,
          rememberMe: auth.rememberMe || false
        };
      }
      // 如果 electron-store 中没有，尝试从 localStorage 获取（兼容旧数据）
      const user = localStorage.getItem('user');
      const token = localStorage.getItem('authToken');
      if (user && token) {
        try {
          return {
            user: JSON.parse(user),
            token: token,
            rememberMe: true
          };
        } catch (error) {
          console.error('Failed to parse user data:', error);
          return null;
        }
      }
      return null;
    } else {
      // Web 环境：优先从 localStorage 获取，然后从 sessionStorage
      let user = localStorage.getItem('user');
      let token = localStorage.getItem('authToken');
      
      if (!user || !token) {
        user = sessionStorage.getItem('user');
        token = sessionStorage.getItem('authToken');
      }
      
      if (user && token) {
        try {
          return {
            user: JSON.parse(user),
            token: token,
            rememberMe: !!localStorage.getItem('user')
          };
        } catch (error) {
          console.error('Failed to parse user data:', error);
          return null;
        }
      }
      
      return null;
    }
  },

  /**
   * 清除认证信息
   */
  clear: async () => {
    if (isElectron()) {
      // Electron 环境：清除 electron-store 中的认证信息
      await window.electronAPI.store.delete('auth');
      // 同时清除 localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
    } else {
      // Web 环境：清除所有存储的认证信息
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('authToken');
    }
  }
};

