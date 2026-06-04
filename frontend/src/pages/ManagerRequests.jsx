import { useEffect, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Table, Tag, Typography, Button, Drawer, Radio, Input,
  Flex, App, Space,
} from 'antd';
import api from '../services/api.js';
import { statusColor } from '../utils/statusTag.jsx';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;

const NEXT_STEPS = {
  open:         ['acknowledged', 'in_progress', 'closed'],
  acknowledged: ['in_progress', 'resolved', 'closed'],
  in_progress:  ['resolved', 'closed'],
  resolved:     ['closed'],
  closed:       [],
};

const CATEGORY_COLORS = {
  repair:      '#FA8C16',
  maintenance: '#1677ff',
  complaint:   '#722ED1',
  other:       '#5C6069',
};

const FILTER_OPTIONS = [
  { label: 'All',         value: 'all'         },
  { label: 'Open',        value: 'open'        },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved',    value: 'resolved'    },
];

export default function ManagerRequests() {
  const { message } = App.useApp();

  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeFilter,  setActiveFilter]  = useState('all');
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [selected,      setSelected]      = useState(null);
  const [newStatus,     setNewStatus]     = useState(null);
  const [responseText,  setResponseText]  = useState('');
  const [updating,      setUpdating]      = useState(false);

  async function fetchRequests() {
    try {
      const { data } = await api.get('/requests');
      setRequests(data.requests);
    } catch (err) {
      if (err.response) message.error(err.response.data.error);
      else message.error('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRequests(); }, []);

  const filtered = useMemo(() =>
    activeFilter === 'all'
      ? requests
      : requests.filter(r => r.status === activeFilter),
    [requests, activeFilter]
  );

  function openDrawer(record) {
    setSelected(record);
    setNewStatus(null);
    setResponseText(record.manager_response ?? '');
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelected(null);
  }

  async function handleUpdate() {
    if (!newStatus) return;
    setUpdating(true);
    try {
      const { data } = await api.patch(`/requests/${selected.id}`, {
        status:           newStatus,
        manager_response: responseText.trim() || undefined,
      });
      setRequests(prev => prev.map(r => r.id === data.request.id ? { ...r, ...data.request } : r));
      message.success('Request updated.');
      closeDrawer();
    } catch (err) {
      if (err.response) message.error(err.response.data.error);
      else message.error('Could not reach the server.');
    } finally {
      setUpdating(false);
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
      title: 'Property / Unit',
      key: 'unit',
      render: (_, r) => `${r.property_name} / ${r.unit_number}`,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (v) => (
        <Tag color={CATEGORY_COLORS[v]} style={{ textTransform: 'capitalize' }}>{v}</Tag>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      render: (v) => v.length > 60 ? v.substring(0, 60) + '…' : v,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => (
        <Tag color={statusColor(v)} style={{ textTransform: 'capitalize' }}>
          {v.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Filed',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v) => dayjs(v).fromNow(),
    },
    {
      title: '',
      key: 'actions',
      render: (_, r) => (
        <Button size="small" onClick={() => openDrawer(r)}>View</Button>
      ),
    },
  ];

  const nextSteps = selected ? NEXT_STEPS[selected.status] : [];

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Requests</Title>
          <Text type="secondary">Tenant maintenance and complaint requests</Text>
        </div>
      </Flex>

      <Radio.Group
        options={FILTER_OPTIONS}
        value={activeFilter}
        onChange={(e) => setActiveFilter(e.target.value)}
        optionType="button"
        buttonStyle="solid"
        style={{ marginBottom: 16 }}
      />

      <Table
        rowKey="id"
        dataSource={filtered}
        columns={COLUMNS}
        loading={loading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'No requests yet.' }}
        style={{ background: '#fff', borderRadius: 8 }}
      />

      <Drawer
        title={selected?.subject ?? 'Request detail'}
        placement="right"
        width={480}
        open={drawerOpen}
        onClose={closeDrawer}
        footer={
          <Flex justify="flex-end" gap={8}>
            <Button onClick={closeDrawer}>Cancel</Button>
            <Button
              type="primary"
              loading={updating}
              disabled={!newStatus}
              onClick={handleUpdate}
            >
              Update
            </Button>
          </Flex>
        }
      >
        {selected && (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            {/* Meta */}
            <div>
              <Flex gap={8} wrap="wrap" style={{ marginBottom: 6 }}>
                <Tag color={CATEGORY_COLORS[selected.category]} style={{ textTransform: 'capitalize' }}>
                  {selected.category}
                </Tag>
                <Tag color={statusColor(selected.status)} style={{ textTransform: 'capitalize' }}>
                  {selected.status.replace('_', ' ')}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {selected.property_name} · Unit {selected.unit_number} · filed {dayjs(selected.created_at).fromNow()}
              </Text>
            </div>

            {/* Description */}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Description</Text>
              <div style={{ background: '#F8F5F0', borderRadius: 6, padding: '12px 14px' }}>
                <Paragraph style={{ marginBottom: 0 }}>{selected.description}</Paragraph>
              </div>
            </div>

            {/* Manager response */}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                Response to tenant (optional)
              </Text>
              <Input.TextArea
                rows={3}
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Leave a note for the tenant — e.g. scheduled date, resolution details…"
              />
            </div>

            {/* Status update */}
            <div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                Update status
              </Text>
              {nextSteps.length > 0 ? (
                <Radio.Group
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                >
                  {nextSteps.map(s => (
                    <Radio.Button key={s} value={s} style={{ textTransform: 'capitalize' }}>
                      {s.replace('_', ' ')}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              ) : (
                <Text type="secondary" style={{ fontStyle: 'italic' }}>
                  This request is closed — no further status changes.
                </Text>
              )}
            </div>
          </Space>
        )}
      </Drawer>
    </>
  );
}
