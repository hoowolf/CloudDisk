import React, { useState } from 'react';
import { Form, Input, Button, Card, Tabs, Spin, Checkbox, App } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, CloudOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { TabPane } = Tabs;

const LoginForm = ({ onLogin }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const { login, register } = useAuth();

  // 处理登录
  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password, values.rememberMe || false);
      if (result.success) {
        onLogin();
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理注册
  const handleRegister = async (values) => {
    setLoading(true);
    try {
      const result = await register(values.username, values.email, values.password);
      if (result.success) {
        onLogin();
      }
    } catch (error) {
      console.error('Register error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 登录表单
  const loginForm = (
    <Form
      form={form}
      name="login"
      onFinish={handleLogin}
      layout="vertical"
      size="large"
    >
      <Form.Item
        name="username"
        label="用户名"
        style={{ marginBottom: '10px' }}
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, message: '用户名至少3个字符' }
        ]}
      >
        <Input 
          prefix={<UserOutlined />} 
          placeholder="请输入用户名"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="密码"
        style={{ marginBottom: '10px' }}
        rules={[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码至少6个字符' }
        ]}
      >
        <Input.Password 
          prefix={<LockOutlined />} 
          placeholder="请输入密码"
        />
      </Form.Item>

      <Form.Item
        name="rememberMe"
        valuePropName="checked"
        style={{ marginBottom: '24px' }}
      >
        <Checkbox>记住我</Checkbox>
      </Form.Item>

      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={loading}
          block
          style={{ height: '45px', fontSize: '16px', fontWeight: '500' }}
        >
          登录
        </Button>
      </Form.Item>
    </Form>
  );

  // 注册表单
  const registerForm = (
    <Form
      form={form}
      name="register"
      onFinish={handleRegister}
      layout="vertical"
      size="large"
    >
      <Form.Item
        name="username"
        label="用户名"
        style={{ marginBottom: '16px' }}
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, message: '用户名至少3个字符' }
        ]}
      >
        <Input 
          prefix={<UserOutlined />} 
          placeholder="请输入用户名"
        />
      </Form.Item>

      <Form.Item
        name="email"
        label="邮箱"
        style={{ marginBottom: '16px' }}
        rules={[
          { required: true, message: '请输入邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' }
        ]}
      >
        <Input 
          prefix={<MailOutlined />} 
          placeholder="请输入邮箱地址"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="密码"
        style={{ marginBottom: '16px' }}
        rules={[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码至少6个字符' }
        ]}
      >
        <Input.Password 
          prefix={<LockOutlined />} 
          placeholder="请输入密码"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label="确认密码"
        style={{ marginBottom: '32px' }}
        dependencies={['password']}
        rules={[
          { required: true, message: '请确认密码' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('两次输入的密码不一致'));
            },
          }),
        ]}
      >
        <Input.Password 
          prefix={<LockOutlined />} 
          placeholder="请再次输入密码"
        />
      </Form.Item>

      <Form.Item>
        <Button 
          type="primary" 
          htmlType="submit" 
          loading={loading}
          block
          style={{ height: '45px', fontSize: '16px', fontWeight: '500' }}
        >
          注册
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <App>
      <div className="login-container">
        <Card className="login-card" variant="filled">
          <div className="login-header">
            <CloudOutlined style={{ fontSize: '36px', color: '#1890ff', marginBottom: '10px' }} />
            <h1>云盘客户端</h1>
          </div>

          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            centered
            size="large"
            items={[
              {
                key: 'login',
                label: '登录',
                children: loading ? <Spin /> : loginForm,
              },
              {
                key: 'register',
                label: '注册',
                children: loading ? <Spin /> : registerForm,
              },
            ]}
          />
        </Card>
      </div>
    </App>
  );
};

export default LoginForm;