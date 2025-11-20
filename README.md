# Linux云盘桌面客户端

一个基于 React + Electron + Ant Design 开发的现代化云盘桌面客户端，支持文件管理、用户认证、自动同步等功能。

## 功能特性

### 核心功能
- ✅ 用户认证系统（登录/注册/登出）
- ✅ 基础文件操作（浏览、搜索、创建、重命名、删除、移动）
- ✅ 文件上传下载管理
- ✅ 文件夹管理和组织
- ✅ 自动同步功能
- ✅ 文件分享与协同
- ✅ 回收站管理
- ✅ 文件版本控制
- ✅ 收藏夹功能

### 高级特性
- 🚀 网络流量优化（压缩、去重、差分同步）
- 📱 响应式设计，支持多设备
- 🔒 安全认证和数据加密
- 📊 存储空间管理
- 🔔 通知中心
- ⚙️ 灵活的设置选项

### 技术栈
- **前端框架**: React 18
- **桌面框架**: Electron
- **UI组件库**: Ant Design (AntD)
- **状态管理**: React Context API
- **HTTP客户端**: Axios
- **构建工具**: Webpack
- **代码规范**: ESLint + Prettier

## 项目结构

```
CloudDisk/
├── public/                 # 静态资源
│   └── index.html         # HTML模板
├── src/                   # 源代码
│   ├── components/        # React组件
│   │   ├── LoginForm.js   # 登录表单
│   │   ├── MainLayout.js  # 主布局
│   │   ├── FileManager.js # 文件管理器
│   │   ├── UploadManager.js # 上传管理器
│   │   ├── Settings.js    # 设置组件
│   │   └── NotificationCenter.js # 通知中心
│   ├── contexts/          # React Context
│   │   ├── AuthContext.js # 认证上下文
│   │   └── FileContext.js # 文件管理上下文
│   ├── utils/             # 工具函数
│   │   ├── fileUtils.js   # 文件工具
│   │   ├── request.js     # HTTP请求封装
│   │   ├── authAPI.js     # 认证API
│   │   └── fileAPI.js     # 文件API
│   ├── App.js             # 主应用组件
│   ├── App.css            # 应用样式
│   ├── index.js           # 应用入口
│   └── index.css          # 全局样式
├── main.js                # Electron主进程
├── preload.js             # Electron预加载脚本
├── package.json           # 项目配置
├── webpack.config.js      # Webpack配置
└── .babelrc               # Babel配置
```

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0

### 安装依赖

```bash
# 使用npm
npm install

# 或使用yarn
yarn install
```

### 开发模式

```bash
# 启动开发服务器
npm start

# 或
yarn start
```

### 构建应用

```bash
# 构建生产版本
npm run build

# 打包桌面应用
npm run electron:build

# 或使用yarn
yarn build
yarn electron:build
```

### 运行测试

```bash
# 运行单元测试
npm test

# 或
yarn test
```

## 配置说明

### 环境变量

创建 `.env` 文件来配置环境变量：

```env
# API服务器地址
REACT_APP_API_URL=http://localhost:3001/api

# 应用版本
REACT_APP_VERSION=1.0.0

# 开发模式
NODE_ENV=development

# Electron配置
ELECTRON_START_URL=http://localhost:3000
```

### API配置

项目默认连接到 `http://localhost:3001/api`。如需修改，请：

1. 更新 `src/utils/request.js` 中的 `baseURL`
2. 确保后端API服务正常运行

## 主要组件说明

### AuthContext (认证上下文)
提供用户认证状态管理，包括：
- 登录/注册/登出
- 用户信息管理
- Token管理
- 认证状态检查

### FileContext (文件管理上下文)
处理文件相关操作，包括：
- 文件列表获取
- 文件上传下载
- 文件夹管理
- 文件搜索
- 批量操作

### MainLayout (主布局)
应用的主界面布局，包含：
- 侧边栏导航
- 顶部工具栏
- 文件管理区域
- 设置和通知中心

### FileManager (文件管理器)
文件操作界面，支持：
- 表格/列表视图切换
- 文件搜索
- 右键菜单操作
- 批量操作
- 拖拽上传

## 快捷键

- `Ctrl + N`: 新建文件夹
- `Ctrl + U`: 上传文件
- `F5`: 刷新文件列表
- `Ctrl + F`: 搜索文件
- `Esc`: 取消当前操作

## 自定义配置

### 修改主题
在 `src/App.js` 中修改 Ant Design 主题配置：

```javascript
const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
};
```

### 添加新组件
1. 在 `src/components/` 下创建新组件
2. 在 `src/App.js` 中导入并使用
3. 更新相应的 Context 以支持新功能

### API集成
项目已准备好与RESTful API集成：
- 认证API在 `src/utils/authAPI.js`
- 文件API在 `src/utils/fileAPI.js`
- 统一请求封装在 `src/utils/request.js`

## 常见问题

### Q: 应用无法启动？
A: 检查Node.js版本，确保 >= 16.0.0，并重新安装依赖。

### Q: 登录失败？
A: 确认后端API服务正在运行，并检查API URL配置。

### Q: 文件上传失败？
A: 检查网络连接和服务器配置，确保支持大文件上传。

### Q: 如何修改界面语言？
A: 项目默认使用中文界面，如需修改请更新相关组件中的文本内容。

## 开发指南

### 代码规范
- 使用 ESLint 进行代码检查
- 遵循 React 最佳实践
- 组件采用函数式组件 + Hooks
- 使用 PropTypes 进行类型检查

### 提交规范
```
feat: 添加新功能
fix: 修复bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建或辅助工具变动
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- ✅ 用户认证系统
- ✅ 文件管理功能
- ✅ 上传下载功能
- ✅ 响应式设计
- ✅ 设置和通知中心