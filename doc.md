客户端设计文档
云盘设计
设计一个linux客户端GUI，实现与服务器的文件操作

1.基础文件操作（上传、下载、列表、删除、创建目录）

2.实现一个简单的用户注册/登录系统，使用Token（如JWT）进行API请求的身份验证。
每个用户只能访问自己名下的文件和目录。

3.实现一个客户端，并实现本地与云端的自动同步
利用操作系统接口，客户端在用户本地实现一个“同步文件夹”，“同步文件夹”中的内容和云端自动同步
客户端需要持续监控本地同步文件夹的文件系统事件（创建、修改、删除、重命名）。
当检测到变更时，自动将变更同步到服务器。
服务器端若有变更（例如通过另一个客户端上传），也应能通知或由客户端拉取，以同步到本地。

4.同步过程中的网络流量优化
a.数据压缩，上传前客户端压缩⽂件（GZIP/Zlib 等），下载后客户端解压，服务器可存储压缩后的数据

b.文件级去重，计算文件哈希（MD5 / SHA-256），上传前先询问服务器是否已有该哈希，若存在，只在元数据里增加引用，不重复存储文件内容。

c.差分同步（增量同步）
当监控到本地大文件被修改后，不应重新上传整个文件。
使用rsync类似的算法或滚动哈希（如Rabin-Karp算法）找出文件中被修改的部分（差异块）。
仅将这些差异块上传到服务器，服务器再根据差异信息和原文件组合出新版本的文件。
这极大地优化了大文件频繁小改动的同步效率。

d.断点续传

e.数据加密,注意加密、去重、差分同步之间的冲突与关系

5.文件共享与协同
文件版本控制： 保留文件的历史版本，支持回滚到任意版本。
冲突解决策略： 当同一个文件在两端同时被修改时，提供手动或自动的冲突解决机制（例如，生成冲突文件）。
共享与协作： 实现文件/文件夹的共享功能，并设置权限（只读、可写）

API 设计

### 4.0 API 规范说明

- **统一前缀**：`/api/v1`
- **默认返回格式**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```
- **认证方式**：除注册/登录外，其余接口需要在 Header 中传入 JWT：
```
Authorization: Bearer <jwt_token>
```

---

### 4.1 认证相关

#### 4.1.1 用户注册

**接口**：`POST /api/v1/auth/register`

**请求体**：
```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "123456"
}
```

**响应示例**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user": {
      "id": "uuid",
      "username": "alice",
      "email": "alice@example.com"
    },
    "token": "<jwt_token>"
  }
}
```

---

#### 4.1.2 用户登录

**接口**：`POST /api/v1/auth/login`

**请求体**：
```json
{
  "username": "alice",
  "password": "123456"
}
```

**响应示例**：同注册接口

---

#### 4.1.3 获取当前用户信息

**接口**：`GET /api/v1/auth/me`

**响应示例**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "uuid",
    "username": "alice",
    "email": "alice@example.com"
  }
}
```

---

### 4.2 文件系统操作

#### 4.2.1 列出目录内容

**接口**：`GET /api/v1/fs/list`

**查询参数**：
- `parent_id`：父目录 ID（UUID），根目录传 `null`

**响应示例**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "parent_id": null,
    "items": [
      {
        "id": "uuid1",
        "name": "Documents",
        "is_dir": true,
        "size": 0,
        "updated_at": "2025-11-17T00:00:00Z"
      },
      {
        "id": "uuid2",
        "name": "notes.txt",
        "is_dir": false,
        "size": 1234,
        "updated_at": "2025-11-17T00:00:00Z"
      }
    ]
  }
}
```

---

#### 4.2.2 创建目录

**接口**：`POST /api/v1/fs/mkdir`

**请求体**：
```json
{
  "parent_id": "uuid_or_null",
  "name": "New Folder"
}
```

**响应示例**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": "uuid",
    "name": "New Folder",
    "is_dir": true
  }
}
```

---

#### 4.2.3 重命名节点

**接口**：`POST /api/v1/fs/rename`

**请求体**：
```json
{
  "id": "node_id",
  "new_name": "new_name"
}
```

---

#### 4.2.4 移动节点

**接口**：`POST /api/v1/fs/move`

**请求体**：
```json
{
  "id": "node_id",
  "new_parent_id": "target_dir_id"
}
```

---

#### 4.2.5 删除节点（逻辑删除）

**接口**：`DELETE /api/v1/fs/node/{id}`

**路径参数**：
- `id`：节点 ID（UUID）

---

### 4.3 文件上传

#### 4.3.1 简单上传（小文件）

**接口**：`POST /api/v1/files/upload-simple`

**请求类型**：`multipart/form-data`

**表单字段**：
- `parent_id`：目录 ID
- `file`：文件内容

**响应示例**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "file_id": "uuid",
    "version_id": "uuid"
  }
}
```

---

#### 4.3.2 高级上传初始化

**接口**：`POST /api/v1/files/upload-init`

**请求体**：
```json
{
  "parent_id": "dir_uuid",
  "name": "big.bin",
  "size": 104857600,
  "hash": "file_sha256",
  "chunk_size": 4194304,
  "chunks": [
    { "index": 0, "chunk_hash": "hash0" },
    { "index": 1, "chunk_hash": "hash1" }
  ]
}
```

**响应示例**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "mode": "chunk_dedup",
    "file_id": "uuid",
    "upload_session_id": "uuid",
    "needed_chunks": [0, 2, 5]
  }
}
```

**说明**：
- `mode` 可能的值：
  - `"file_dedup"`：服务器已有该文件内容，客户端无需上传任何数据
  - `"chunk_dedup"`：部分块已存在，只需上传 `needed_chunks` 中的块
  - `"full_upload"`：需要上传所有块
- `needed_chunks`：需要上传的块索引列表

---

#### 4.3.3 上传单个块

**接口**：`POST /api/v1/files/upload-chunk`

**查询参数**：
- `session_id`：上传会话 ID（UUID）
- `index`：块索引（整数）

**请求头**：
```
X-Chunk-Hash: <chunk_sha256>
Content-Encoding: gzip         // 若压缩后上传
Content-Type: application/octet-stream
```

**请求体**：该块的二进制内容

**响应示例**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "received": true
  }
}
```

---

#### 4.3.4 完成上传

**接口**：`POST /api/v1/files/upload-complete`

**请求体**：
```json
{
  "upload_session_id": "uuid"
}
```

**说明**：服务器检查所有需要的块是否已上传，生成对应的 `file_versions` 记录，更新 `nodes.latest_version_id`，写入 `change_log`。

---

### 4.4 文件下载

#### 4.4.1 整文件下载

**接口**：`GET /api/v1/files/{file_id}/download`

**路径参数**：
- `file_id`：文件 ID（UUID）

**查询参数**：
- `version_id`：版本 ID（UUID，可选，默认最新版本）

**响应特性**：
- 支持 `Content-Encoding: gzip`（服务端压缩返回）
- 支持 HTTP Range 请求（断点续传）

---

#### 4.4.2 获取块清单（用于差分同步）

**接口**：`GET /api/v1/files/{file_id}/manifest`

**路径参数**：
- `file_id`：文件 ID（UUID）

**查询参数**：
- `version_id`：版本 ID（UUID，可选，默认最新版本）

**响应示例**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "file_id": "uuid",
    "version_id": "uuid",
    "size": 104857600,
    "chunk_size": 4194304,
    "chunks": [
      { "index": 0, "chunk_hash": "hash0", "size": 4194304 },
      { "index": 1, "chunk_hash": "hash1", "size": 4194304 }
    ]
  }
}
```

**说明**：客户端可用此信息与本地缓存对比，仅上传/下载发生变化的块。

---

### 4.5 同步接口

#### 4.5.1 获取变更列表

**接口**：`GET /api/v1/sync/changes`

**查询参数**：
- `since_id`：上次获取的最后变更 ID（整数，可选）
- `limit`：返回数量限制（整数，默认 100）

**响应示例**：
```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "last_id": 12345,
    "changes": [
      {
        "id": 12340,
        "node_id": "uuid-file",
        "change_type": "UPDATE",
        "version_id": "uuid-version",
        "path": "/Docs/a.txt",
        "is_dir": false,
        "timestamp": "2025-11-17T00:00:00Z"
      },
      {
        "id": 12341,
        "node_id": "uuid-dir",
        "change_type": "DELETE",
        "path": "/Docs/old/",
        "is_dir": true,
        "timestamp": "2025-11-17T00:00:02Z"
      }
    ]
  }
}
```

**说明**：客户端定期轮询该接口，根据 `change_type` 更新本地文件，实现多端同步。

---

### 4.6 版本控制

#### 4.6.1 查看文件历史版本

**接口**：`GET /api/v1/files/{file_id}/versions`

**路径参数**：
- `file_id`：文件 ID（UUID）

**响应示例**：
```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "id": "v1",
      "version_no": 1,
      "size": 100,
      "hash": "hash_v1",
      "creator_id": "user1",
      "created_at": "2025-11-17T00:00:00Z"
    },
    {
      "id": "v2",
      "version_no": 2,
      "size": 120,
      "hash": "hash_v2",
      "creator_id": "user2",
      "created_at": "2025-11-17T01:00:00Z"
    }
  ]
}
```

---

#### 4.6.2 回滚到指定版本

**接口**：`POST /api/v1/files/{file_id}/rollback`

**路径参数**：
- `file_id`：文件 ID（UUID）

**请求体**：
```json
{
  "version_id": "v1"
}
```

**说明**：服务器新建一个版本，其内容与指定版本相同，`version_no` 自增，同时写入 `change_log`。

---

### 4.7 共享与协同

#### 4.7.1 创建共享

**接口**：`POST /api/v1/shares`

**请求体**：
```json
{
  "resource_id": "node_id",
  "target_user_id": "user_id",
  "permission": "read",
  "expires_at": "2025-12-31T23:59:59Z"
}
```

**参数说明**：
- `permission`：权限类型，`"read"` 或 `"write"`
- `expires_at`：过期时间（ISO 8601 格式，可选）

---

#### 4.7.2 查看我共享出去的资源

**接口**：`GET /api/v1/shares/outgoing`

**响应示例**：
```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "id": "share_uuid",
      "resource_id": "node_uuid",
      "resource_name": "document.pdf",
      "target_user_id": "user_uuid",
      "target_username": "bob",
      "permission": "read",
      "created_at": "2025-11-17T00:00:00Z",
      "expires_at": null
    }
  ]
}
```

---

#### 4.7.3 查看共享给我的资源

**接口**：`GET /api/v1/shares/incoming`

**响应示例**：格式同 `outgoing`，但 `target_user_id` 和 `target_username` 改为 `owner_id` 和 `owner_username`

---

## 设计符合现代UI，美观的客户端.
在桌面端实现 GUI（React + Electron）

### 快速开始：
```bash
npx create-react-app my-electron-app
cd my-electron-app
npm install electron electron-builder --save-dev
```
然后配置主进程（main.js）和渲染进程（你的 React App），详细可参考 [electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate)。

使用Ant Design (AntD) 组件库开发