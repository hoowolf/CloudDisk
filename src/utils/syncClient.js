import fileAPI from './fileAPI';
import { sha256, chunkFile, gzipCompress, DEFAULT_CHUNK_SIZE, sleep } from './syncUtils';

// 云端同步根目录名称
const CLOUD_SYNC_ROOT_NAME = '同步文件';
// 本地存储 key
const MAPPING_KEY = 'sync.mapping';
const LAST_CHANGE_ID_KEY = 'sync.lastChangeId';

/**
 * 同步客户端：
 * - 负责调用后端 API
 * - 维护本地路径 <-> 云端节点 ID 的映射
 * - 处理上传 / 下载 / 差分等逻辑
 */
class SyncClient {
  constructor() {
    this._ensureElectronStore();
  }

  _ensureElectronStore() {
    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.store) {
      // 在非 Electron 环境（如测试）下，降级为内存存储
      if (!this._memoryStore) {
        this._memoryStore = {
          [MAPPING_KEY]: {},
          [LAST_CHANGE_ID_KEY]: null,
        };
      }
    }
  }

  async _getStore(key) {
    if (window.electronAPI && window.electronAPI.store) {
      return window.electronAPI.store.get(key);
    }
    return this._memoryStore?.[key];
  }

  async _setStore(key, value) {
    if (window.electronAPI && window.electronAPI.store) {
      await window.electronAPI.store.set(key, value);
    } else if (this._memoryStore) {
      this._memoryStore[key] = value;
    }
  }

  async _getMapping() {
    const mapping = (await this._getStore(MAPPING_KEY)) || {};
    return mapping;
  }

  async _setMapping(mapping) {
    await this._setStore(MAPPING_KEY, mapping);
  }

  /**
   * 确保云端存在“同步文件”根目录，返回其 ID
   */
  async ensureCloudSyncRoot() {
    const res = await fileAPI.getFileList(null, 1, 100);
    if (!res.success) {
      throw new Error(res.message || '获取根目录失败');
    }
    const items = res.data.items || [];
    let syncFolder = items.find((i) => i.is_dir && i.name === CLOUD_SYNC_ROOT_NAME);
    if (!syncFolder) {
      const createRes = await fileAPI.createFolder(null, CLOUD_SYNC_ROOT_NAME);
      if (!createRes.success) {
        throw new Error(createRes.message || '创建同步文件夹失败');
      }
      syncFolder = createRes.data;
    }
    return syncFolder.id;
  }

  /**
   * 将本地路径映射到云端节点
   * @param {string} relativePath 相对于同步根目录的路径（使用 / 分隔）
   * @param {string} nodeId 云端节点 ID
   * @param {boolean} isDir 是否为目录
   */
  async setPathMapping(relativePath, nodeId, isDir) {
    const mapping = await this._getMapping();
    mapping[relativePath] = { nodeId, isDir };
    await this._setMapping(mapping);
  }

  async deletePathMapping(relativePath) {
    const mapping = await this._getMapping();
    if (mapping[relativePath]) {
      delete mapping[relativePath];
      await this._setMapping(mapping);
    }
  }

  async getPathMapping(relativePath) {
    const mapping = await this._getMapping();
    return mapping[relativePath] || null;
  }

  /**
   * 本地文件/目录变更 -> 云端
   * @param {Object} options
   * @param {'create'|'modify'|'delete'|'rename'} options.type
   * @param {string} options.syncRoot 本地同步根目录绝对路径
   * @param {string} options.fullPath 变更项绝对路径
   * @param {string} [options.oldFullPath] 重命名前路径
   * @param {boolean} options.isDir 是否为目录
   */
  async handleLocalChange({ type, syncRoot, fullPath, oldFullPath, isDir }) {
    console.log('[Sync][client] 处理本地变更', {
      type,
      syncRoot,
      fullPath,
      oldFullPath,
      isDir,
    });
    const cloudRootId = await this.ensureCloudSyncRoot();
    const relativePath = this._toRelativePath(syncRoot, fullPath);

    if (type === 'delete') {
      const mapping = await this.getPathMapping(relativePath);
      if (mapping && mapping.nodeId && !mapping.isDir) {
        await fileAPI.deleteFile(mapping.nodeId);
      }
      await this.deletePathMapping(relativePath);
      return;
    }

    if (type === 'rename' && oldFullPath) {
      const oldRel = this._toRelativePath(syncRoot, oldFullPath);
      const oldMapping = await this.getPathMapping(oldRel);
      if (oldMapping) {
        // 云端重命名
        const name = this._basename(fullPath);
        await fileAPI.renameFile(oldMapping.nodeId, name);
        await this.deletePathMapping(oldRel);
        await this.setPathMapping(relativePath, oldMapping.nodeId, oldMapping.isDir);
        return;
      }
    }

    if (isDir) {
      // 目录：在云端创建对应目录（如果不存在）
      const parentInfo = this._splitParent(relativePath);
      let parentId = cloudRootId;
      if (parentInfo.parentPath) {
        const parentMapping = await this.getPathMapping(parentInfo.parentPath);
        if (parentMapping && parentMapping.nodeId) {
          parentId = parentMapping.nodeId;
        }
      }
      const createRes = await fileAPI.createFolder(parentId, parentInfo.name);
      if (createRes.success) {
        await this.setPathMapping(relativePath, createRes.data.id, true);
      }
      return;
    }

    // 文件：使用简单上传或分块上传
    await this._uploadFileWithOptimization({ cloudRootId, syncRoot, fullPath, relativePath });
  }

  _toRelativePath(syncRoot, fullPath) {
    let rel = fullPath.replace(syncRoot, '');
    rel = rel.replace(/^[/\\]/, '');
    return rel.split(/[/\\]/).join('/');
  }

  _basename(fullPath) {
    const parts = fullPath.split(/[/\\]/);
    return parts[parts.length - 1] || '';
  }

  _splitParent(relativePath) {
    const parts = relativePath.split('/');
    const name = parts.pop();
    const parentPath = parts.length ? parts.join('/') : '';
    return { parentPath, name };
  }

  async _uploadFileWithOptimization({ cloudRootId, syncRoot, fullPath, relativePath }) {
    // 1. 读取文件
    console.log('[Sync][client] _uploadFileWithOptimization 开始', {
      fullPath,
      relativePath,
    });
    const statRes = await window.electronAPI.fs.stat(fullPath);
    if (!statRes || !statRes.success || statRes.data.is_dir) {
      console.warn('[Sync][client] stat 失败或是目录，跳过上传', {
        fullPath,
      });
      return;
    }

    const readRes = await window.electronAPI.fs.readFile(fullPath);
    if (!readRes || !readRes.success || !readRes.data) {
      console.warn('[Sync][client] 读取文件失败，跳过上传', {
        fullPath,
      });
      return;
    }

    // 将 Buffer 对象转换为 Uint8Array
    let uint8;
    const raw = readRes.data;
    if (raw instanceof Uint8Array) {
      uint8 = raw;
    } else if (raw && raw.type === 'Buffer' && Array.isArray(raw.data)) {
      uint8 = new Uint8Array(raw.data);
    } else {
      console.warn('[Sync][client] 不支持的 readFile 返回类型，跳过上传', {
        fullPath,
      });
      return;
    }

    const size = uint8.byteLength;
    const parentInfo = this._splitParent(relativePath);

    let parentId = cloudRootId;
    if (parentInfo.parentPath) {
      const parentMapping = await this.getPathMapping(parentInfo.parentPath);
      if (parentMapping && parentMapping.nodeId) {
        parentId = parentMapping.nodeId;
      }
    }

    const name = parentInfo.name;

    // 2. 小文件：直接简单上传（<10MB）
    if (size < 10 * 1024 * 1024 && typeof File !== 'undefined') {
      console.log('[Sync][client] 小文件简单上传', {
        relativePath,
        size,
      });
      const blob = new Blob([uint8]);
      const file = new File([blob], name);
      const res = await fileAPI.uploadSimple(parentId, file);
      if (res.success && res.data && res.data.id) {
        await this.setPathMapping(relativePath, res.data.id, false);
      }
      return;
    }

    // 3. 大文件：分块 + gzip + 块哈希
    console.log('[Sync][client] 大文件分块上传', {
      relativePath,
      size,
    });
    const fileHash = await sha256(uint8);
    const blob = new Blob([uint8]);
    const chunks = await chunkFile(blob, DEFAULT_CHUNK_SIZE);

    const chunksMeta = [];
    for (const { index, data } of chunks) {
      const hash = await sha256(data);
      chunksMeta.push({ index, chunk_hash: hash });
    }

    const initRes = await fileAPI.uploadInit(
      parentId,
      name,
      size,
      fileHash,
      DEFAULT_CHUNK_SIZE,
      chunksMeta
    );

    if (!initRes.success || !initRes.data || !initRes.data.upload_session_id) {
      return;
    }

    const sessionId = initRes.data.upload_session_id;

    for (const { index, data } of chunks) {
      const compressed = gzipCompress(data);
      const chunkHash = await sha256(compressed);
      await fileAPI.uploadChunk(sessionId, index, compressed, chunkHash);
      await sleep(10);
    }

    const completeRes = await fileAPI.uploadComplete(sessionId);
    if (completeRes.success && completeRes.data && completeRes.data.node_id) {
      await this.setPathMapping(relativePath, completeRes.data.node_id, false);
    }
  }

  /**
   * 处理云端变更 -> 本地
   * @param {string} localSyncRoot 本地同步根目录
   * @param {number} [limit]
   */
  async syncRemoteChanges(localSyncRoot, limit = 100) {
    const lastId = await this._getStore(LAST_CHANGE_ID_KEY);
    console.log('[Sync][client] 拉取云端变更开始', {
      localSyncRoot,
      sinceId: lastId,
      limit,
    });
    const res = await fileAPI.getSyncChanges(lastId, limit);
    if (!res.success) {
      console.error('[Sync][client] 拉取云端变更失败', {
        error: res.message || '未知错误',
        lastId,
      });
      return;
    }

    const { last_id: newLastId, changes } = res.data || {};
    if (!Array.isArray(changes) || !changes.length) {
      if (newLastId != null) {
        await this._setStore(LAST_CHANGE_ID_KEY, newLastId);
      }
      console.log('[Sync][client] 云端无新的变更', {
        newLastId,
      });
      return;
    }

    console.log('[Sync][client] 即将应用云端变更', {
      count: changes.length,
    });
    for (const change of changes) {
      await this._applyRemoteChange(localSyncRoot, change);
      await sleep(50);
    }

    if (newLastId != null) {
      await this._setStore(LAST_CHANGE_ID_KEY, newLastId);
    }
    console.log('[Sync][client] 云端变更应用完成', {
      lastId: newLastId,
    });
  }

  async _applyRemoteChange(localSyncRoot, change) {
    const { path: remotePath, is_dir: isDir, change_type: changeType, node_id: nodeId, version_id: versionId } = change;
    if (!remotePath || !remotePath.startsWith(`/${CLOUD_SYNC_ROOT_NAME}`)) {
      return;
    }
    // 生成相对于“同步文件”的相对路径
    const rel = remotePath.replace(`/${CLOUD_SYNC_ROOT_NAME}`, '').replace(/^[/\\]/, '');
    const localPath = this._joinLocal(localSyncRoot, rel);
    console.log('[Sync][client] 应用云端变更', {
      changeType,
      remotePath,
      localPath,
      isDir,
      nodeId,
      versionId,
    });

    if (changeType === 'DELETE') {
      if (isDir) {
        await window.electronAPI.fs.remove(localPath, true);
      } else {
        await window.electronAPI.fs.remove(localPath, false);
      }
      await this.deletePathMapping(rel);
      return;
    }

    if (isDir) {
      await window.electronAPI.fs.mkdir(localPath);
      await this.setPathMapping(rel, nodeId, true);
      return;
    }

    // 文件：下载并写入本地
    const downloadRes = await fileAPI.downloadFile(nodeId, versionId);
    if (!downloadRes.success) return;
    const blob = downloadRes.data;
    const buf = await blob.arrayBuffer();
    await window.electronAPI.fs.writeFile(localPath, new Uint8Array(buf));
    await this.setPathMapping(rel, nodeId, false);
  }

  _joinLocal(root, rel) {
    if (!rel) return root;
    const sep = root.includes('\\') ? '\\' : '/';
    return `${root}${root.endsWith(sep) ? '' : sep}${rel.split('/').join(sep)}`;
  }
}

const syncClient = new SyncClient();

export default syncClient;


