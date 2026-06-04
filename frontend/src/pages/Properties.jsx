import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Table, Button, Modal, Form, Input, Popconfirm, App, Typography, Flex,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../services/api.js';

const { Title } = Typography;

const COLS = (onEdit, onDelete) => [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (val, record) => <Link to={`/properties/${record.id}`}>{val}</Link>,
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: 'Created',
    dataIndex: 'created_at',
    key: 'created_at',
    render: (val) => new Date(val).toLocaleDateString('en-KE'),
  },
  {
    title: 'Actions',
    key: 'actions',
    render: (_, record) => (
      <Flex gap="small">
        <Button size="small" onClick={() => onEdit(record)}>Edit</Button>
        <Popconfirm
          title="Delete this property?"
          description="This cannot be undone."
          onConfirm={() => onDelete(record.id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
          cancelText="Cancel"
        >
          <Button size="small" danger>Delete</Button>
        </Popconfirm>
      </Flex>
    ),
  },
];

function toastError(message, err) {
  if (err.response) return message.error(err.response.data.error);
  message.error('Could not reach the server.');
}

export default function Properties() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [properties, setProperties]         = useState([]);
  const [loading, setLoading]               = useState(false);
  const [modalOpen, setModalOpen]           = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);

  async function fetchProperties() {
    setLoading(true);
    try {
      const { data } = await api.get('/properties');
      setProperties(data.properties);
    } catch (err) {
      toastError(message, err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProperties(); }, []);

  function openCreate() {
    setEditingProperty(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditingProperty(record);
    form.setFieldsValue({ name: record.name, address: record.address });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    form.resetFields();
  }

  async function handleSave(values) {
    setSaving(true);
    try {
      if (editingProperty) {
        await api.put(`/properties/${editingProperty.id}`, values);
        message.success('Property updated.');
      } else {
        await api.post('/properties', values);
        message.success('Property created.');
      }
      closeModal();
      await fetchProperties();
    } catch (err) {
      toastError(message, err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/properties/${id}`);
      message.success('Property deleted.');
      await fetchProperties();
    } catch (err) {
      if (err.response?.status === 409) {
        return message.error(err.response.data.error);
      }
      toastError(message, err);
    }
  }

  const columns = COLS(openEdit, handleDelete);

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Properties</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Property
        </Button>
      </Flex>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={properties}
        loading={loading}
        locale={{ emptyText: 'No properties yet — add your first one.' }}
      />

      <Modal
        title={editingProperty ? 'Edit Property' : 'Add Property'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={closeModal}
        confirmLoading={saving}
        okText={editingProperty ? 'Save changes' : 'Create'}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            label="Name"
            name="name"
            rules={[{
              validator: (_, val) =>
                val?.trim() && val.trim().length <= 255
                  ? Promise.resolve()
                  : Promise.reject(new Error('Name is required and must be 255 characters or fewer.')),
            }]}
          >
            <Input placeholder="e.g. Sunset Apartments" />
          </Form.Item>

          <Form.Item
            label="Address"
            name="address"
            rules={[{
              validator: (_, val) =>
                val?.trim() && val.trim().length <= 1000
                  ? Promise.resolve()
                  : Promise.reject(new Error('Address is required and must be 1000 characters or fewer.')),
            }]}
          >
            <Input.TextArea rows={3} placeholder="e.g. 14 Ngong Road, Nairobi" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
