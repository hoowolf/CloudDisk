import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 扩展 dayjs
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的文件大小
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * 格式化日期
 * @param {string} date - 日期字符串
 * @param {string} format - 格式化模式
 * @returns {string} 格式化后的日期
 */
export const formatDate = (date, format = 'YYYY-MM-DD HH:mm') => {
  if (!date) return '';
  
  const dayjsDate = dayjs(date);
  if (!dayjsDate.isValid()) return '';

  // 如果是今年的日期，不显示年份
  if (dayjsDate.isSame(dayjs(), 'year')) {
    return dayjsDate.format('MM-DD HH:mm');
  }
  
  return dayjsDate.format(format);
};

/**
 * 获取相对时间（如：2小时前）
 * @param {string} date - 日期字符串
 * @returns {string} 相对时间
 */
export const getRelativeTime = (date) => {
  if (!date) return '';
  
  const dayjsDate = dayjs(date);
  if (!dayjsDate.isValid()) return '';

  return dayjsDate.fromNow();
};

/**
 * 获取文件图标类名
 * @param {string} fileName - 文件名
 * @param {boolean} isDir - 是否为目录
 * @returns {string} 图标类名
 */
export const getFileIcon = (fileName, isDir = false) => {
  if (isDir) return 'folder';

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  const iconMap = {
    // 图片
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', 
    bmp: 'image', svg: 'image', webp: 'image',
    
    // 文档
    pdf: 'file-pdf', doc: 'file-word', docx: 'file-word',
    xls: 'file-excel', xlsx: 'file-excel',
    ppt: 'file-powerpoint', pptx: 'file-powerpoint',
    txt: 'file-text', md: 'file-text',
    
    // 压缩文件
    zip: 'file-zip', rar: 'file-zip', '7z': 'file-zip', tar: 'file-zip', gz: 'file-zip',
    
    // 代码文件
    js: 'file-code', ts: 'file-code', html: 'file-code', 
    css: 'file-code', json: 'file-code', xml: 'file-code',
    py: 'file-code', java: 'file-code', cpp: 'file-code', c: 'file-code',
    
    // 音频
    mp3: 'file-audio', wav: 'file-audio', flac: 'file-audio', aac: 'file-audio',
    
    // 视频
    mp4: 'file-video', avi: 'file-video', mov: 'file-video', 
    wmv: 'file-video', flv: 'file-video', mkv: 'file-video',
  };

  return iconMap[ext] || 'file';
};

/**
 * 获取文件类型
 * @param {string} fileName - 文件名
 * @returns {string} 文件类型
 */
export const getFileType = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  const typeMap = {
    // 图片
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', 
    bmp: 'image', svg: 'image', webp: 'image',
    
    // 文档
    pdf: 'document', doc: 'document', docx: 'document',
    xls: 'document', xlsx: 'document',
    ppt: 'document', pptx: 'document',
    txt: 'document', md: 'document',
    
    // 压缩文件
    zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
    
    // 代码文件
    js: 'code', ts: 'code', html: 'code', 
    css: 'code', json: 'code', xml: 'code',
    py: 'code', java: 'code', cpp: 'code', c: 'code',
    
    // 音频
    mp3: 'audio', wav: 'audio', flac: 'audio', aac: 'audio',
    
    // 视频
    mp4: 'video', avi: 'video', mov: 'video', 
    wmv: 'video', flv: 'video', mkv: 'video',
  };

  return typeMap[ext] || 'other';
};

/**
 * 计算文件哈希值（简化版）
 * @param {string} input - 输入字符串
 * @returns {string} 哈希值
 */
export const simpleHash = (input) => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为 32 位整数
  }
  return Math.abs(hash).toString(16);
};

/**
 * 生成文件下载链接
 * @param {string} fileId - 文件ID
 * @param {string} versionId - 版本ID（可选）
 * @returns {string} 下载链接
 */
export const getDownloadUrl = (fileId, versionId = null) => {
  let url = `/api/v1/files/${fileId}/download`;
  if (versionId) {
    url += `?version_id=${versionId}`;
  }
  return url;
};

/**
 * 验证文件类型
 * @param {string} fileName - 文件名
 * @param {Array} allowedTypes - 允许的文件类型扩展名
 * @returns {boolean} 是否允许
 */
export const validateFileType = (fileName, allowedTypes = []) => {
  if (allowedTypes.length === 0) return true;
  
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return allowedTypes.includes(ext);
};

/**
 * 验证文件大小
 * @param {number} fileSize - 文件大小（字节）
 * @param {number} maxSize - 最大大小（字节）
 * @returns {boolean} 是否超出限制
 */
export const validateFileSize = (fileSize, maxSize) => {
  return fileSize <= maxSize;
};

/**
 * 格式化字节数显示
 * @param {number} bytes - 字节数
 * @returns {string} 格式化的字节数
 */
export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 延迟函数
 * @param {number} ms - 毫秒数
 * @returns {Promise} Promise
 */
export const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间
 * @returns {Function} 防抖后的函数
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 时间限制
 * @returns {Function} 节流后的函数
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};