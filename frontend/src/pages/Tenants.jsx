import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select,
  DatePicker, Popconfirm, App, Typography, Flex, Tag,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../services/api.js';
import { statusColor } from '../utils/statusTag.jsx';

const { Title } = Typography;

function formatRent(val) {
  return `KSh ${Number(val).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const COLS = (onEdit, onTerminate) => [
  {
    title: 'Name',
    dataIndex: 'full_name',
    key: 'full_name',
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: 'Phone',
    dataIndex: 'phone',
    key: 'phone',
  },
  {
    title: 'Unit',
    key: 'unit',
    render: (_, record) => `${record.property_name} / ${record.unit_number}`,
  },
  {
    title: 'Monthly Rent',
    dataIndex: 'monthly_rent',
    key: 'monthly_rent',
    render: (val) => formatRent(val),
  },
  {
    title: 'Status',
    dataIndex: 'lease_status',
    key: 'lease_status',
    render: (val) => (
      <Tag color={statusColor(val)}>
        {val.charAt(0).toUpperCase() + val.slice(1)}
      </Tag>
    ),
  },
  {
    title: 'Start Date',
    dataIndex: 'start_date',
    key: 'start_date',
    render: (val) => new Date(val).toLocaleDateString('en-KE'),
  },
  {
    title: 'Actions',
    key: 'actions',
    render: (_, record) => (
      <Flex gap="small">
        <Button size="small" onClick={() => onEdit(record)}>Edit</Button>
        {record.lease_status === 'active' ? (
          <Popconfirm
            title="Terminate this lease?"
            description="The unit will be marked vacant. This cannot be undone."
            onConfirm={() => onTerminate(record.tenant_id)}
            okText="Terminate"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Button size="small" danger>Terminate</Button>
          </Popconfirm>
        ) : (
          <Button size="small" danger disabled>Terminate</Button>
        )}
      </Flex>
    ),
  },
];

function toastError(message, err) {
  if (err.response) return message.error(err.response.data.error);
  message.error('Could not reach the server.');
}

export default function Tenants() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [tenants, setTenants]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [modalOpen, setModalOpen]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [vacantUnits, setVacantUnits]   = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  async function fetchTenants() {
    setLoading(true);
    try {
      const { data } = await api.get('/tenants');
      setTenants(data.tenants);
    } catch (err) {
      toastError(message, err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTenants(); }, []);

  async function openAdd() {
    setEditingTenant(null);
    form.resetFields();
    form.setFieldsValue({ start_date: dayjs() });
    setModalOpen(true);

    setLoadingUnits(true);
    try {
      const { data } = await api.get('/units/vacant');
      setVacantUnits(data.units);
    } catch (err) {
      toastError(message, err);
    } finally {
      setLoadingUnits(false);
    }
  }

  function openEdit(record) {
    setEditingTenant(record);
    form.setFieldsValue({
      full_name:    record.full_name,
      phone:        record.phone,
      monthly_rent: Number(record.monthly_rent),
      end_date:     record.end_date ? dayjs(record.end_date) : null,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    form.resetFields();
  }

  function onUnitChange(unitId) {
    const unit = vacantUnits.find(u => u.unit_id === unitId);
    if (unit) form.setFieldValue('monthly_rent', Number(unit.monthly_rent));
  }

  async function handleSave(values) {
    setSaving(true);
    try {
      if (editingTenant) {
        const body = {
          full_name:    values.full_name,
          phone:        values.phone,
          monthly_rent: values.monthly_rent,
          end_date:     values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
        };
        await api.put(`/tenants/${editingTenant.tenant_id}`, body);
        message.success('Tenant updated.');
      } else {
        const body = {
          full_name:    values.full_name,
          email:        values.email,
          phone:        values.phone,
          password:     values.password,
          unit_id:      values.unit_id,
          monthly_rent: values.monthly_rent,
          start_date:   values.start_date.format('YYYY-MM-DD'),
          end_date:     values.end_date ? values.end_date.format('YYYY-MM-DD') : undefined,
        };
        await api.post('/tenants', body);
        message.success('Tenant created.');
      }
      closeModal();
      await fetchTenants();
    } catch (err) {
      if (err.response?.status === 409) {
        return message.error(err.response.data.error);
      }
      toastError(message, err);
    } finally {
      setSaving(false);
    }
  }

  async function handleTerminate(tenantId) {
    try {
      await api.post(`/tenants/${tenantId}/terminate`);
      message.success('Lease terminated.');
      await fetchTenants();
    } catch (err) {
      toastError(message, err);
    }
  }

  const columns = COLS(openEdit, handleTerminate);
  const isAdd   = editingTenant === null;

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Tenants</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          Add Tenant
        </Button>
      </Flex>

      <Table
        rowKey="tenant_id"
        columns={columns}
        dataSource={tenants}
        loading={loading}
        locale={{ emptyText: 'No tenants yet — add your first one.' }}
      />

      <Modal
        title={isAdd ? 'Add Tenant' : 'Edit Tenant'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={closeModal}
        confirmLoading={saving}
        okText={isAdd ? 'Create' : 'Save changes'}
        destroyOnHidden
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>

          {/* ── Fields shown in both Add and Edit ── */}
          <Form.Item
            label="Full Name"
            name="full_name"
            rules={[{
              validator: (_, val) =>
                val?.trim() && val.trim().length <= 255
                  ? Promise.resolve()
                  : Promise.reject(new Error('Full name is required and must be 255 characters or fewer.')),
            }]}
          >
            <Input placeholder="e.g. Jane Mwangi" />
          </Form.Item>

          <Form.Item
            label="Phone"
            name="phone"
            rules={[{
              validator: (_, val) =>
                /^254[0-9]{9}$/.test(val ?? '')
                  ? Promise.resolve()
                  : Promise.reject(new Error('Phone must be in Kenyan format (254XXXXXXXXX).')),
            }]}
          >
            <Input placeholder="254712345678" />
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
            label="End Date"
            name="end_date"
          >
            <DatePicker style={{ width: '100%' }} placeholder="Leave blank for open-ended lease" />
          </Form.Item>

          {/* ── Fields shown only in Add mode ── */}
          {isAdd && (
            <>
              <Form.Item
                label="Email"
                name="email"
                rules={[{
                  validator: (_, val) =>
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val?.trim() ?? '')
                      ? Promise.resolve()
                      : Promise.reject(new Error('A valid email address is required.')),
                }]}
              >
                <Input placeholder="e.g. jane@example.com" />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[{
                  validator: (_, val) =>
                    val && val.length >= 8
                      ? Promise.resolve()
                      : Promise.reject(new Error('Password must be at least 8 characters.')),
                }]}
              >
                <Input.Password placeholder="Min. 8 characters" />
              </Form.Item>

              <Form.Item
                label="Confirm Password"
                name="confirm_password"
                dependencies={['password']}
                extra="The tenant will use this password to log into their portal. Share it with them securely (in person, via WhatsApp, or SMS). They can change it later."
                rules={[{
                  validator: (_, val) => {
                    const pwd = form.getFieldValue('password');
                    if (!val) return Promise.reject(new Error('Please confirm the password.'));
                    if (val !== pwd) return Promise.reject(new Error('Passwords do not match.'));
                    return Promise.resolve();
                  },
                }]}
              >
                <Input.Password placeholder="Re-enter password" />
              </Form.Item>

              <Form.Item
                label="Unit"
                name="unit_id"
                rules={[{ required: true, message: 'Please select a unit.' }]}
              >
                <Select
                  placeholder={loadingUnits ? 'Loading units…' : 'Select a vacant unit'}
                  loading={loadingUnits}
                  disabled={loadingUnits}
                  onChange={onUnitChange}
                >
                  {vacantUnits.map(u => (
                    <Select.Option key={u.unit_id} value={u.unit_id}>
                      {u.property_name} / {u.unit_number} — {formatRent(u.monthly_rent)}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Start Date"
                name="start_date"
                rules={[{ required: true, message: 'Start date is required.' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}

        </Form>
      </Modal>
    </>
  );
}
