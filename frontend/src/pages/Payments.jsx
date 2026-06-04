import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Row, Col, Card, List, Avatar, Typography, Tag, Table, Button, Skeleton, App, Flex,
} from 'antd';
import api from '../services/api.js';
import { statusColor } from '../utils/statusTag.jsx';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const fmtKsh = (v) =>
  `KSh ${Number(v).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

const COLUMNS = [
  {
    title: 'Tenant',
    key: 'tenant',
    render: (_, r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.tenant_name}</div>
        <Text type="secondary" style={{ fontSize: 12 }}>{r.tenant_email}</Text>
      </div>
    ),
  },
  {
    title: 'Unit',
    key: 'unit',
    render: (_, r) => `${r.property_name} / ${r.unit_number}`,
  },
  {
    title: 'Amount',
    dataIndex: 'amount',
    key: 'amount',
    render: (v) => fmtKsh(v),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (v) => (
      <Tag color={statusColor(v)} style={{ textTransform: 'capitalize' }}>{v}</Tag>
    ),
  },
  {
    title: 'Receipt',
    dataIndex: 'mpesa_receipt',
    key: 'mpesa_receipt',
    render: (v) => v
      ? <Text code style={{ fontSize: 12 }}>{v}</Text>
      : <Text type="secondary">—</Text>,
  },
  {
    title: 'Paid At',
    key: 'paid_at',
    render: (_, r) => (
      <div>
        <div>{r.paid_at ? dayjs(r.paid_at).fromNow() : '—'}</div>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Initiated {dayjs(r.created_at).fromNow()}
        </Text>
      </div>
    ),
  },
];

export default function Payments() {
  const { message } = App.useApp();

  const [tenants,    setTenants]    = useState([]);
  const [payments,   setPayments]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [initiating, setInitiating] = useState(null);

  async function loadPayments() {
    const { data } = await api.get('/payments');
    setPayments(data.payments);
  }

  async function loadTenants() {
    const { data } = await api.get('/tenants');
    setTenants(data.tenants.filter(t => t.lease_status === 'active'));
  }

  useEffect(() => {
    async function fetchAll() {
      try {
        await Promise.all([loadTenants(), loadPayments()]);
      } catch (err) {
        if (err.response) message.error(err.response.data.error);
        else message.error('Could not reach the server.');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  useEffect(() => {
    const hasPending = payments.some(p => p.status === 'pending');
    if (!hasPending) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get('/payments');
        setPayments(data.payments);
      } catch {
        // Silent — don't toast on background refresh failures
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [payments]);

  async function handleInitiate(tenant) {
    setInitiating(tenant.lease_id);
    try {
      await api.post('/payments/initiate', { lease_id: tenant.lease_id });
      message.success(`STK Push sent to ${tenant.full_name}`);
      await loadPayments();
    } catch (err) {
      const status = err.response?.status;
      if (status === 502) {
        message.error('M-Pesa service unavailable. Please try again in a moment.');
      } else if (status === 404) {
        message.error('This lease is no longer active.');
        await Promise.all([loadTenants(), loadPayments()]);
      } else {
        message.error(err.response?.data?.error ?? 'An unexpected error occurred.');
      }
    } finally {
      setInitiating(null);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Payments</Title>
        <Text type="secondary">STK Push history across your properties</Text>
      </div>

      {/* Active tenants — initiate section */}
      <Card
        title={<span style={{ fontWeight: 600 }}>Active Tenants</span>}
        style={{ borderRadius: 8, marginBottom: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        {loading ? (
          <div style={{ padding: 24 }}>
            <Skeleton active paragraph={{ rows: 3 }} />
          </div>
        ) : (
          <List
            dataSource={tenants}
            locale={{ emptyText: 'No active leases yet. Add tenants in the Tenants page first.' }}
            renderItem={(tenant) => (
              <List.Item
                style={{ padding: '12px 24px' }}
                extra={
                  <Flex align="center" gap={16}>
                    <Text strong>{fmtKsh(tenant.monthly_rent)}</Text>
                    <Button
                      type="primary"
                      size="small"
                      loading={initiating === tenant.lease_id}
                      disabled={initiating !== null}
                      onClick={() => handleInitiate(tenant)}
                    >
                      Initiate Payment
                    </Button>
                  </Flex>
                }
              >
                <List.Item.Meta
                  avatar={
                    <Avatar style={{ backgroundColor: '#C9E6DC', color: '#0F5D4E' }}>
                      {tenant.full_name?.[0]?.toUpperCase()}
                    </Avatar>
                  }
                  title={tenant.full_name}
                  description={`${tenant.property_name} / ${tenant.unit_number}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Payment history */}
      <Card
        title={<span style={{ fontWeight: 600 }}>Payment History</span>}
        style={{ borderRadius: 8 }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={payments}
          columns={COLUMNS}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          locale={{ emptyText: 'No payments yet. Initiate the first one above.' }}
          style={{ borderRadius: 8, overflow: 'hidden' }}
        />
      </Card>
    </>
  );
}
