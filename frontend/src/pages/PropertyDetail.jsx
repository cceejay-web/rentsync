import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select,
  Popconfirm, App, Typography, Flex, Tag, Spin, Row, Col,
} from 'antd';
import { PlusOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import api from '../services/api.js';
import { statusColor } from '../utils/statusTag.jsx';

const { Title, Text } = Typography;

function formatRent(val) {
  return `KSh ${Number(val).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const COLS = (onEdit, onDelete) => [
  {
    title: 'Unit Number',
    dataIndex: 'unit_number',
    key: 'unit_number',
  },
  {
    title: 'Monthly Rent',
    dataIndex: 'monthly_rent',
    key: 'monthly_rent',
    render: (val) => formatRent(val),
  },
  {
    title: 'Bed / Bath',
    key: 'bed_bath',
    render: (_, r) => {
      if (r.bedrooms == null && r.bathrooms == null) return '—';
      return `${r.bedrooms ?? '—'} / ${r.bathrooms ?? '—'}`;
    },
  },
  {
    title: 'Size',
    key: 'size',
    render: (_, r) => r.size_sqm != null ? `${r.size_sqm} sqm` : '—',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (val) => (
      <Tag color={statusColor(val)}>
        {val.charAt(0).toUpperCase() + val.slice(1)}
      </Tag>
    ),
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
          title="Delete this unit?"
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

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [property, setProperty]       = useState(null);
  const [units, setUnits]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalOpen, setModalOpen]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [propRes, unitsRes] = await Promise.all([
        api.get(`/properties/${id}`),
        api.get(`/properties/${id}/units`),
      ]);
      setProperty(propRes.data.property);
      setUnits(unitsRes.data.units);
    } catch (err) {
      toastError(message, err);
      if (err.response?.status === 404) navigate('/properties');
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnits() {
    try {
      const { data } = await api.get(`/properties/${id}/units`);
      setUnits(data.units);
    } catch (err) {
      toastError(message, err);
    }
  }

  useEffect(() => { fetchAll(); }, [id]);

  function openCreate() {
    setEditingUnit(null);
    form.resetFields();
    setModalOpen(true);
  }

  function openEdit(record) {
    setEditingUnit(record);
    form.setFieldsValue({
      unit_number:  record.unit_number,
      monthly_rent: Number(record.monthly_rent),
      status:       record.status,
      bedrooms:     record.bedrooms    ?? null,
      bathrooms:    record.bathrooms   ?? null,
      size_sqm:     record.size_sqm != null ? Number(record.size_sqm) : null,
      description:  record.description ?? '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    form.resetFields();
  }

  async function handleSave(values) {
    const body = { ...values, description: values.description?.trim() || undefined };
    setSaving(true);
    try {
      if (editingUnit) {
        await api.put(`/properties/${id}/units/${editingUnit.id}`, body);
        message.success('Unit updated.');
      } else {
        await api.post(`/properties/${id}/units`, body);
        message.success('Unit created.');
      }
      closeModal();
      await fetchUnits();
    } catch (err) {
      if (err.response?.status === 409) {
        return message.error(err.response.data.error);
      }
      toastError(message, err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(unitId) {
    try {
      await api.delete(`/properties/${id}/units/${unitId}`);
      message.success('Unit deleted.');
      await fetchUnits();
    } catch (err) {
      if (err.response?.status === 409) {
        return message.error(err.response.data.error);
      }
      toastError(message, err);
    }
  }

  const columns = COLS(openEdit, handleDelete);

  if (loading) {
    return (
      <Flex justify="center" style={{ paddingTop: 64 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  return (
    <>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/properties')}
        style={{ paddingLeft: 0, marginBottom: 8 }}
      >
        Back to Properties
      </Button>

      {property && (
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>{property.name}</Title>
          <Text type="secondary">{property.address}</Text>
        </div>
      )}

      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Units</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add Unit
        </Button>
      </Flex>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={units}
        locale={{ emptyText: 'No units yet — add your first one.' }}
      />

      <Modal
        title={editingUnit ? 'Edit Unit' : 'Add Unit'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={closeModal}
        confirmLoading={saving}
        okText={editingUnit ? 'Save changes' : 'Create'}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            label="Unit Number"
            name="unit_number"
            rules={[{
              validator: (_, val) =>
                val?.trim() && val.trim().length <= 50
                  ? Promise.resolve()
                  : Promise.reject(new Error('Unit number is required and must be 50 characters or fewer.')),
            }]}
          >
            <Input placeholder="e.g. A1, 101, GF-02" />
          </Form.Item>

          <Form.Item
            label="Monthly Rent"
            name="monthly_rent"
            rules={[{ required: true, message: 'Monthly rent is required.' }]}
          >
            <InputNumber
              min={0}
              precision={2}
              addonBefore="KSh"
              style={{ width: '100%' }}
              placeholder="e.g. 15000"
            />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            rules={[{ required: true, message: 'Status is required.' }]}
          >
            <Select placeholder="Select status">
              <Select.Option value="vacant">Vacant</Select.Option>
              <Select.Option value="occupied">Occupied</Select.Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label="Bedrooms" name="bedrooms">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="e.g. 2" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Bathrooms" name="bathrooms">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} placeholder="e.g. 1" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label="Size" name="size_sqm">
                <InputNumber min={0} step={0.5} addonAfter="sqm" style={{ width: '100%' }} placeholder="e.g. 45" />
              </Form.Item>
            </Col>
          </Row>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: -12, marginBottom: 16 }}>
            All optional — leave blank if unknown.
          </Text>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} placeholder="Unit features, furnishing, floor, view…" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
