import request from './request';

// 文件系统相关API
const fileAPI = {
  // 获取文件列表 (根据文档规范，使用parent_id而不是path)
  async getFileList(parentId = null, page = 1, limit = 20) {
    try {
      const response = await request.get('/fs/list', {
        params: { parent_id: parentId, page, limit }
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '获取文件列表失败' 
      };
    }
  },

  // 创建共享 (根据文档规范)
  async createShare(resourceId, permissions, expireAt = null) {
    try {
      const requestData = {
        resource_id: resourceId,
        permissions: permissions
      };
      if (expireAt) requestData.expire_at = expireAt;
      
      const response = await request.post('/shares/create', requestData);
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '创建共享失败' 
      };
    }
  },

  // 查看共享给我的资源 (根据文档规范)
  async getSharedWithMe(page = 1, limit = 20) {
    try {
      const response = await request.get('/shares/shared-with-me', {
        params: { page, limit }
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '获取共享资源失败' 
      };
    }
  },

  // 获取文件/文件夹信息 (根据文档规范)
  async getFileInfo(fileId) {
    try {
      const response = await request.get(`/files/${fileId}/info`);
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '获取文件信息失败' 
      };
    }
  },

  // 创建文件夹 (根据文档规范)
  async createFolder(parentId, name) {
    try {
      const response = await request.post('/fs/mkdir', {
        parent_id: parentId,
        name
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '创建文件夹失败' 
      };
    }
  },

  // 重命名文件/文件夹 (根据文档规范)
  async renameFile(id, newName) {
    try {
      const response = await request.post('/fs/rename', {
        id,
        new_name: newName
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '重命名失败' 
      };
    }
  },

  // 删除文件/文件夹 (根据文档规范)
  async deleteFile(id) {
    try {
      const response = await request.delete(`/fs/node/${id}`);
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '删除失败' 
      };
    }
  },

  // 移动文件/文件夹 (根据文档规范)
  async moveFile(id, newParentId) {
    try {
      const response = await request.post('/fs/move', {
        id,
        new_parent_id: newParentId
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '移动文件失败' 
      };
    }
  },

  // 复制文件/文件夹 (根据文档规范)
  async copyFile(id, targetParentId) {
    try {
      const response = await request.post('/fs/copy', {
        id,
        target_parent_id: targetParentId
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '复制文件失败' 
      };
    }
  },

  // 简单上传（小文件）(根据文档规范)
  async uploadSimple(parentId, file) {
    try {
      const formData = new FormData();
      formData.append('parent_id', parentId);
      formData.append('file', file);
      
      const response = await request.post('/files/upload-simple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '简单上传失败' 
      };
    }
  },

  // 高级上传初始化 (根据文档规范)
  async uploadInit(parentId, name, size, hash, chunkSize, chunks) {
    try {
      const response = await request.post('/files/upload-init', {
        parent_id: parentId,
        name,
        size,
        hash,
        chunk_size: chunkSize,
        chunks
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '上传初始化失败' 
      };
    }
  },

  // 上传单个块 (根据文档规范)
  async uploadChunk(sessionId, index, chunk, chunkHash) {
    try {
      const response = await request.post(`/files/upload-chunk?session_id=${sessionId}&index=${index}`, chunk, {
        headers: {
          'X-Chunk-Hash': chunkHash,
          'Content-Type': 'application/octet-stream'
        }
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '上传块失败' 
      };
    }
  },

  // 完成上传 (根据文档规范)
  async uploadComplete(uploadSessionId) {
    try {
      const response = await request.post('/files/upload-complete', {
        upload_session_id: uploadSessionId
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '完成上传失败' 
      };
    }
  },

  // 整文件下载 (根据文档规范)
  async downloadFile(fileId, versionId = null) {
    try {
      const params = versionId ? { version_id: versionId } : {};
      const response = await request.get(`/files/${fileId}/download`, {
        params,
        responseType: 'blob'
      });
      
      // 响应拦截器对于 blob 响应会返回完整的 response 对象
      // 下载接口返回的是二进制流，直接返回 Blob
      if (response.data instanceof Blob) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: '下载失败：响应格式错误' };
      }
    } catch (error) {
      // 处理错误响应
      if (error.response) {
        // 如果错误响应是 blob，尝试解析为 JSON
        if (error.response.data instanceof Blob) {
          try {
            const errorText = await error.response.data.text();
            const errorData = JSON.parse(errorText);
            return { 
              success: false, 
              message: errorData.detail || errorData.message || '下载失败' 
            };
          } catch {
            return { 
              success: false, 
              message: '下载失败' 
            };
          }
        } else {
          return { 
            success: false, 
            message: error.response.data?.detail || error.response.data?.message || '下载失败' 
          };
        }
      }
      return { 
        success: false, 
        message: error.message || '下载失败' 
      };
    }
  },

  // 获取文件内容（预览）
  async getFileContent(fileId, versionId = null) {
    try {
      const params = versionId ? { version_id: versionId } : {};
      const response = await request.get(`/files/${fileId}/content`, {
        params,
        responseType: 'blob'
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '获取文件内容失败' 
      };
    }
  },

  // 获取块清单（用于差分同步）(根据文档规范)
  async getFileManifest(fileId, versionId = null) {
    try {
      const params = versionId ? { version_id: versionId } : {};
      const response = await request.get(`/files/${fileId}/manifest`, {
        params
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '获取块清单失败' 
      };
    }
  },

  // 查看文件历史版本 (根据文档规范)
  async getFileVersions(fileId) {
    try {
      const response = await request.get(`/files/${fileId}/versions`);
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '获取文件版本失败' 
      };
    }
  },

  // 回滚到指定版本 (根据文档规范)
  async rollbackFileVersion(fileId, versionId) {
    try {
      const response = await request.post(`/files/${fileId}/rollback`, {
        version_id: versionId
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '回滚文件版本失败' 
      };
    }
  },

  // 获取变更列表 (根据文档规范)
  async getSyncChanges(sinceId = null, limit = 100) {
    try {
      const params = {};
      if (sinceId !== null) params.since_id = sinceId;
      if (limit !== 100) params.limit = limit;
      
      const response = await request.get('/sync/changes', {
        params
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '获取同步变更失败' 
      };
    }
  },

  // 添加/取消收藏 (根据文档规范)
  async toggleFavorite(fileId) {
    try {
      const response = await request.post(`/files/${fileId}/favorite`);
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '操作收藏失败' 
      };
    }
  },

  // 获取最近访问的文件 (根据文档规范)
  async getRecentFiles(limit = 10) {
    try {
      const response = await request.get('/files/recent', {
        params: { limit }
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '获取最近访问文件失败' 
      };
    }
  },

  // 获取回收站文件 (根据文档规范)
  async getTrash(page = 1, limit = 20) {
    try {
      const response = await request.get('/files/trash', {
        params: { page, limit }
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '获取回收站失败' 
      };
    }
  },

  // 恢复回收站文件 (根据文档规范)
  async restoreTrashFile(fileId) {
    try {
      const response = await request.post(`/files/trash/restore/${fileId}`);
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '恢复文件失败' 
      };
    }
  },

  // 清空回收站 (根据文档规范)
  async emptyTrash() {
    try {
      const response = await request.delete('/files/trash');
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '清空回收站失败' 
      };
    }
  },

  // 获取存储空间信息 (根据文档规范)
  async getStorageInfo() {
    try {
      const response = await request.get('/files/storage');
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '获取存储信息失败' 
      };
    }
  },

  // 批量操作 (根据文档规范)
  async batchOperation(operation, paths) {
    try {
      const response = await request.post('/files/batch', {
        operation,
        paths
      });
      
      // 根据文档规范，响应格式为 {code, message, data}
      if (response.code === 0) {
        return { success: true, data: response.data };
      } else {
        return { success: false, message: response.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '批量操作失败' 
      };
    }
  }
};

export default fileAPI;