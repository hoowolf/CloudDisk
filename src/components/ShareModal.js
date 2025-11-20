import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, Radio, DatePicker, Spin, message } from 'antd';
import fileAPI from '../utils/fileAPI';

const { Option } = Select;

/**
 * 文件/文件夹分享模态框
 * props:
 *  - open: 是否显示
 *  - onClose: 关闭回调
 *  - resource: 当前要分享的节点 { id, name, ... }
 *  - onShared: 分享成功回调
 */
const ShareModal = ({ open, onClose, resource, onShared }) => {
  const [form] = Form.useForm();
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async (keyword = '') => {
    setLoadingUsers(true);
    try {
      const res = await fileAPI.getUsers(keyword);
      if (res.success) {
        setUsers(res.data || []);
      } else {
        message.error(res.message || '获取用户列表失败');
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (open) {
      form.resetFields();
      loadUsers();
    }
  }, [open]);

  const handleSearchUser = (value) => {
    loadUsers(value);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (!resource) {
        message.error('未选择要分享的资源');
        return;
      }
      setSubmitting(true);
      const expiresAt = values.expires_at
        ? values.expires_at.toISOString()
        : null;

      const res = await fileAPI.createShare(
        resource.id,
        values.target_user_id,
        values.permission,
        expiresAt
      );
      if (res.success) {
        message.success('共享成功');
        if (onShared) onShared(res.data);
        onClose();
      } else {
        message.error(res.message || '共享失败');
      }
    } catch (err) {
      // 校验错误不提示
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`共享：${resource?.name || ''}`}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okButtonProps={{ loading: submitting }}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ permission: 'read' }}
      >
        <Form.Item
          label="目标用户"
          name="target_user_id"
          rules={[{ required: true, message: '请选择要共享给的用户' }]}
        >
          <Select
            showSearch
            placeholder="输入用户名搜索"
            onSearch={handleSearchUser}
            notFoundContent={loadingUsers ? <Spin size="small" /> : null}
            filterOption={false}
          >
            {users.map((u) => (
              <Option key={u.id} value={u.id}>
                {u.username} {u.email ? `(${u.email})` : ''}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="权限" name="permission">
          <Radio.Group>
            <Radio value="read">只读</Radio>
            <Radio value="write">可读写</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="过期时间" name="expires_at">
          <DatePicker
            style={{ width: '100%' }}
            showTime
            placeholder="不选则永不过期"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ShareModal;


