import { useEffect, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Table, Tag, Typography, Button, Drawer, DatePicker, Input,
  Flex, App, Space, Divider,
} from 'antd';
import api from '../services/api.js';
import { statusColor } from '../utils/statusTag.jsx';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;

const fmtKsh = (v) =>
  `KSh ${Number(v).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

const FILTER_OPTIONS = [
  { label: 'All',       value: 'all'       },
  { label: 'Pending',   value: 'pending'   },
  { label: 'Approved',  value: 'approved'  },
  { label: 'Rejected',  value: 'rejected'  },
  { label: 'Withdrawn', value: 'withdrawn' },
];

export default function ManagerApplications() {
  const { message } = App.useApp();

  const [applications, setApplications] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [startDate,    setStartDate]    = useState(null);
  const [responseText, setResponseText] = useState('');
  const [deciding,     setDeciding]     = useState(null); // 'approve' | 'reject' | null

  async function fetchApplications() {
    try {
      const { data } = await api.get('/applications');
      setApplications(data.applications);
    } catch (err) {
      if (err.response) message.error(err.response.data.error);
      else message.error('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchApplications(); }, []);

  const filtered = useMemo(() =>
    activeFilter === 'all'
      ? applications
      : applications.filter(a => a.status === activeFilter),
    [applications, activeFilter]
  );

  function openDrawer(record) {
    setSelected(record);
    setStartDate(null);
    setResponseText(record.manager_response ?? '');
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelected(null);
  }

  async function handleDecide(decision) {
    if (decision === 'approve' && !startDate) {
      message.warning('Please select a lease start date before approving.');
      return;
    }
    if (decision === 'reject' && !responseText.trim()) {
      message.warning('Please enter a reason for the tenant before rejecting.');
      return;
    }

    setDeciding(decision);
    try {
      const { data } = await api.patch(`/applications/${selected.id}`, {
        decision,
        manager_response: responseText.trim() || undefined,
        start_date:       decision === 'approve' ? startDate.format('YYYY-MM-DD') : undefined,
      });
      setApplications(prev =>
        prev.map(a => a.id === data.application.id ? { ...a, ...data.application } : a)
      );
      message.success(decision === 'approve' ? 'Application approved — tenant moved.' : 'Application rejected.');
      closeDrawer();
    } catch (err) {
      message.error(err.response?.data?.error ?? 'An unexpected error occurred.');
    } finally {
      setDeciding(null);
    }
  }

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
      title: 'Current Unit',
      key: 'current',
      render: (_, r) => `${r.current_property_name} / ${r.current_unit_number}`,
    },
    {
      title: 'Requested Unit',
      key: 'target',
      render: (_, r) => `${r.target_property_name} / ${r.target_unit_number}`,
    },
    {
      title: 'Target Rent',
      dataIndex: 'monthly_rent',
      key: 'monthly_rent',
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
      title: 'Applied',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => dayjs(v).fromNow(),
    },
    {
      title: '',
      key: 'actions',
      render: (_, r) => (
        <Button size="small" onClick={() => openDrawer(r)}>Review</Button>
      ),
    },
  ];

  const isPending = selected?.status === 'pending';

  const statParts = [];
  if (selected?.bedrooms  != null) statParts.push(`${selected.bedrooms} bed`);
  if (selected?.bathrooms != null) statParts.push(`${selected.bathrooms} bath`);
  if (selected?.size_sqm  != null) statParts.push(`${selected.size_sqm} sqm`);

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Unit Move Applications</Title>
          <Text type="secondary">Tenant requests to transfer to a different unit</Text>
        </div>
      </Flex>

      <Flex gap={8} wrap="wrap" style={{ marginBottom: 16 }}>
        {FILTER_OPTIONS.map(opt => (
          <Button
            key={opt.value}
            type={activeFilter === opt.value ? 'primary' : 'default'}
            size="small"
            onClick={() => setActiveFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </Flex>

      <Table
        rowKey="id"
        dataSource={filtered}
        columns={COLUMNS}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'No applications.' }}
        style={{ background: '#fff', borderRadius: 8 }}
      />

      <Drawer
        title="Review Application"
        placement="right"
        width={520}
        open={drawerOpen}
        onClose={closeDrawer}
        footer={
          isPending ? (
            <Flex justify="flex-end" gap={8}>
              <Button onClick={closeDrawer}>Cancel</Button>
              <Button
                danger
                loading={deciding === 'reject'}
                disabled={deciding === 'approve'}
                onClick={() => handleDecide('reject')}
              >
                Reject
              </Button>
              <Button
                type="primary"
                loading={deciding === 'approve'}
                disabled={deciding === 'reject'}
                onClick={() => handleDecide('approve')}
              >
                Approve
              </Button>
            </Flex>
          ) : (
            <Flex justify="flex-end">
              <Button onClick={closeDrawer}>Close</Button>
            </Flex>
          )
        }
      >
        {selected && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {/* Status */}
            <Flex gap={8} align="center">
              <Tag color={statusColor(selected.status)} style={{ textTransform: 'capitalize' }}>
                {selected.status}
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Applied {dayjs(selected.created_at).fromNow()}
                {selected.decided_at && ` · Decided ${dayjs(selected.decided_at).fromNow()}`}
              </Text>
            </Flex>

            {/* Tenant */}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Tenant</Text>
              <Text strong>{selected.tenant_name}</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>{selected.tenant_email}</Text>
              {selected.tenant_phone && (
                <Text type="secondary" style={{ display: 'block', fontSize: 13 }}>{selected.tenant_phone}</Text>
              )}
            </div>

            <Divider style={{ margin: 0 }} />

            {/* Units side-by-side */}
            <Flex gap={16}>
              <div style={{ flex: 1, background: '#F8F5F0', borderRadius: 6, padding: '12px 14px' }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>CURRENT UNIT</Text>
                <Text strong style={{ display: 'block' }}>{selected.current_property_name}</Text>
                <Text style={{ fontSize: 13 }}>Unit {selected.current_unit_number}</Text>
              </div>
              <div style={{ flex: 1, background: '#E8F4EF', borderRadius: 6, padding: '12px 14px' }}>
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>REQUESTED UNIT</Text>
                <Text strong style={{ display: 'block' }}>{selected.target_property_name}</Text>
                <Text style={{ fontSize: 13 }}>Unit {selected.target_unit_number}</Text>
                <Text style={{ fontSize: 13, display: 'block', color: '#0F5D4E', fontWeight: 600 }}>
                  {fmtKsh(selected.monthly_rent)}/mo
                </Text>
                {statParts.length > 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>{statParts.join(' · ')}</Text>
                )}
              </div>
            </Flex>

            {/* Tenant's message */}
            {selected.message && (
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Tenant's message</Text>
                <div style={{ background: '#F8F5F0', borderRadius: 6, padding: '12px 14px' }}>
                  <Paragraph style={{ marginBottom: 0, fontSize: 13 }}>{selected.message}</Paragraph>
                </div>
              </div>
            )}

            {/* Target unit description */}
            {selected.target_description && (
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Unit description</Text>
                <Paragraph
                  type="secondary"
                  ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
                  style={{ fontSize: 13, marginBottom: 0 }}
                >
                  {selected.target_description}
                </Paragraph>
              </div>
            )}

            {isPending && (
              <>
                <Divider style={{ margin: 0 }} />

                {/* Start date — required for approve */}
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    New lease start date <Text style={{ color: '#ff4d4f' }}>*</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}> (required to approve)</Text>
                  </Text>
                  <DatePicker
                    value={startDate}
                    onChange={(d) => setStartDate(d)}
                    format="DD MMM YYYY"
                    style={{ width: '100%' }}
                    disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                  />
                </div>

                {/* Manager response */}
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    Response to tenant
                    <Text type="secondary" style={{ fontSize: 11 }}> (required to reject)</Text>
                  </Text>
                  <Input.TextArea
                    rows={3}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Reason for rejection, or a note to the tenant…"
                  />
                </div>
              </>
            )}

            {/* Prior response (decided applications) */}
            {!isPending && selected.manager_response && (
              <div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Landlord response</Text>
                <div style={{ background: '#F8F5F0', borderRadius: 6, padding: '12px 14px' }}>
                  <Paragraph style={{ marginBottom: 0, fontSize: 13 }}>{selected.manager_response}</Paragraph>
                </div>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </>
  );
}
