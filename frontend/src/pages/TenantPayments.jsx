import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Card, Table, Tag, Typography, App } from 'antd';
import api from '../services/api.js';
import { statusColor } from '../utils/statusTag.jsx';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const fmtKsh = (v) =>
  `KSh ${Number(v).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

const COLUMNS = [
  {
    title: 'Date',
    key: 'date',
    render: (_, r) => (
      <div>
        <div>{r.paid_at ? dayjs(r.paid_at).format('DD MMM YYYY') : '—'}</div>
        <Text type="secondary" style={{ fontSize: 11 }}>
          Initiated {dayjs(r.created_at).fromNow()}
        </Text>
      </div>
    ),
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
    title: 'Initiated by',
    dataIndex: 'landlord_name',
    key: 'landlord_name',
    render: (v) => <Text type="secondary">{v}</Text>,
  },
];

export default function TenantPayments() {
  const { message } = App.useApp();
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function fetchPayments() {
      try {
        const { data } = await api.get('/tenant/payments');
        setPayments(data.payments);
      } catch (err) {
        if (err.response) message.error(err.response.data.error);
        else message.error('Could not reach the server.');
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Payments</Title>
        <Text type="secondary">Your rent payment history</Text>
      </div>

      <Card style={{ borderRadius: 8 }} styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={payments}
          columns={COLUMNS}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          locale={{ emptyText: 'No payments yet — your landlord will initiate the first rent collection.' }}
          style={{ borderRadius: 8, overflow: 'hidden' }}
        />
      </Card>
    </>
  );
}
