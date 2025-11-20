import React, { useState } from 'react';
import { Modal, Form, Input, Switch, Select, Button, Space, Typography, Tabs, Divider, message } from 'antd';
import { UserOutlined, LockOutlined, CloudOutlined, BellOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { Option } = Select;

const Settings = ({ visible, onClose }) => {
  const { user, getCurrentUser, logout } = useAuth();
  const [form] = Form.useForm();
  const [syncForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [syncPathValue, setSyncPathValue] = useState('');

  // 处理表单提交
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      if (window.electronAPI && window.electronAPI.store) {
        await window.electronAPI.store.set('sync.settings', {
          auto: values?.autoSync ?? true,
          interval: values?.syncInterval ?? '30'
        });

        // 根据自动同步开关启动/停止本地监控
        if (window.electronAPI.sync) {
          if (values?.autoSync ?? true) {
            await window.electronAPI.sync.start();
          } else {
            await window.electronAPI.sync.stop();
          }
        }
      }
      message.success('设置保存成功');
    } catch (error) {
      message.error('设置保存失败');
    } finally {
      setLoading(false);
    }
  };

  // 更新用户信息
  const handleUpdateProfile = async (values) => {
    setLoading(true);
    try {
      // TODO: 实现用户信息更新
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('用户信息更新成功');
    } catch (error) {
      message.error('用户信息更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      // TODO: 实现密码修改
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('密码修改成功');
      form.resetFields(['currentPassword', 'newPassword', 'confirmPassword']);
    } catch (error) {
      message.error('密码修改失败');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    (async () => {
      // 初始化同步设置（自动同步、同步间隔）
      try {
        if (window.electronAPI && window.electronAPI.store) {
          const settings = await window.electronAPI.store.get('sync.settings');
          syncForm.setFieldsValue({
            autoSync: settings?.auto ?? true,
            syncInterval: settings?.interval ?? '30',
          });
        } else {
          syncForm.setFieldsValue({
            autoSync: true,
            syncInterval: '30',
          });
        }
      } catch {
        // ignore
      }

      // 初始化同步路径
      if (window.electronAPI && window.electronAPI.fs) {
        const p = await window.electronAPI.fs.getSyncPath();
        if (p) {
          setSyncPathValue(p);
          syncForm.setFieldsValue({ syncPath: p });
        }
      }
    })();
  }, [syncForm]);

  // 个人资料设置
  const profileSettings = (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleUpdateProfile}
      initialValues={{
        username: user?.username || '',
        email: user?.email || '',
      }}
    >
      <Form.Item
        label="用户名"
        name="username"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, message: '用户名至少3个字符' }
        ]}
      >
        <Input prefix={<UserOutlined />} placeholder="用户名" />
      </Form.Item>

      <Form.Item
        label="邮箱"
        name="email"
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' }
        ]}
      >
        <Input prefix={<UserOutlined />} placeholder="邮箱地址" />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存更改
          </Button>
          <Button onClick={() => form.resetFields()}>
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  // 安全设置
  const securitySettings = (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleChangePassword}
    >
      <Form.Item
        label="当前密码"
        name="currentPassword"
        rules={[
          { required: true, message: '请输入当前密码' }
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="当前密码" />
      </Form.Item>

      <Form.Item
        label="新密码"
        name="newPassword"
        rules={[
          { required: true, message: '请输入新密码' },
          { min: 6, message: '密码至少6个字符' }
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="新密码" />
      </Form.Item>

      <Form.Item
        label="确认新密码"
        name="confirmPassword"
        dependencies={['newPassword']}
        rules={[
          { required: true, message: '请确认新密码' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('newPassword') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('两次输入的密码不一致'));
            },
          }),
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="确认新密码" />
      </Form.Item>

      <Divider />

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            修改密码
          </Button>
          <Button onClick={() => form.resetFields()}>
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  // 同步设置
  const syncSettings = (
    <Form
      form={syncForm}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        autoSync: true,
        syncInterval: '30',
      }}
    >
      <Form.Item label="自动同步" name="autoSync">
        <Switch />
      </Form.Item>

      <Form.Item label="同步间隔" name="syncInterval">
        <Select defaultValue="30">
          <Option value="5">5分钟</Option>
          <Option value="15">15分钟</Option>
          <Option value="30">30分钟</Option>
          <Option value="60">1小时</Option>
        </Select>
      </Form.Item>


      <Form.Item label="同步文件夹路径" name="syncPath">
        <Input placeholder="请选择本地同步路径" value={syncPathValue} readOnly />
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            保存设置
          </Button>
          <Button onClick={async () => {
            if (!window.electronAPI) return;
            const result = await window.electronAPI.showOpenDialog({ properties: ['openDirectory','createDirectory'] });
            const p = result && result.filePaths && result.filePaths[0];
            if (p) {
              const setRes = await window.electronAPI.fs.setSyncPath(p);
              if (setRes && setRes.success) {
                setSyncPathValue(p);
                syncForm.setFieldsValue({ syncPath: p });
                message.success('同步路径已设置');
              } else {
                message.error(setRes?.error || '设置同步路径失败');
              }
            }
          }}>
            浏览文件夹
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  // 通知设置
  const notificationSettings = (
    <Form layout="vertical" onFinish={handleSubmit}>
      <Form.Item label="桌面通知" name="desktopNotification">
        <Switch defaultChecked />
      </Form.Item>

      <Form.Item label="声音提醒" name="soundNotification">
        <Switch />
      </Form.Item>

      <Form.Item label="通知类型" name="notificationTypes">
        <Select mode="multiple" defaultValue={['upload', 'download', 'error']}>
          <Option value="upload">上传完成</Option>
          <Option value="download">下载完成</Option>
          <Option value="error">错误提示</Option>
          <Option value="sync">同步完成</Option>
          <Option value="share">文件分享</Option>
        </Select>
      </Form.Item>

      <Form.Item label="勿扰模式" name="doNotDisturb">
        <Switch />
      </Form.Item>

      <Form.Item label="勿扰时间" name="doNotDisturbTime">
        <Space>
          <Input placeholder="22:00" style={{ width: 80 }} />
          <span>至</span>
          <Input placeholder="08:00" style={{ width: 80 }} />
        </Space>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          保存设置
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <Modal
      title="设置"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={null}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane 
          tab={
            <span>
              <UserOutlined />
              个人资料
            </span>
          } 
          key="profile"
        >
          {profileSettings}
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <LockOutlined />
              安全设置
            </span>
          } 
          key="security"
        >
          {securitySettings}
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <CloudOutlined />
              同步设置
            </span>
          } 
          key="sync"
        >
          {syncSettings}
        </TabPane>
        
        <TabPane 
          tab={
            <span>
              <BellOutlined />
              通知设置
            </span>
          } 
          key="notification"
        >
          {notificationSettings}
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default Settings;