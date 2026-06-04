import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  List, Tag, Typography, Button, Popconfirm, Flex, Divider, App,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { statusColor } from '../utils/statusTag.jsx';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const fmtKsh = (v) =>
  `KSh ${Number(v).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

export default function TenantApplications() {
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading,      setLoading]      = useState(true);

  async function fetchApplications() {
    try {
      const { data } = await api.get('/tenant/applications');
      setApplications(data.applications);
    } catch (err) {
      if (err.response) message.error(err.response.data.error);
      else message.error('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchApplications(); }, []);

  async function handleWithdraw(appId) {
    try {
      const { data } = await api.patch(`/tenant/applications/${appId}/withdraw`);
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, ...data.application } : a));
      message.success('Application withdrawn.');
    } catch (err) {
      message.error(err.response?.data?.error ?? 'An unexpected error occurred.');
    }
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>My Applications</Title>
        <Text type="secondary">Unit move requests</Text>
      </div>

      <List
        loading={loading}
        dataSource={applications}
        locale={{
          emptyText: (
            <Text type="secondary">
              You haven't submitted any applications yet.{' '}
              <a onClick={() => navigate('/tenant/available')} style={{ color: '#0F5D4E' }}>
                Browse Available Units
              </a>{' '}
              to apply.
            </Text>
          ),
        }}
        renderItem={(app) => (
          <List.Item style={{
            display: 'block', background: '#fff', borderRadius: 8,
            marginBottom: 12, padding: 20, border: '1px solid #EFF0F2',
          }}>
            <Flex align="center" gap={8} style={{ marginBottom: 6 }}>
              <Text strong style={{ fontSize: 15 }}>
                {app.property_name} / {app.unit_number}
              </Text>
              <Tag color={statusColor(app.status)} style={{ textTransform: 'capitalize' }}>
                {app.status}
              </Tag>
            </Flex>

            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
              {fmtKsh(app.monthly_rent)}/mo
              {' · '}Applied {dayjs(app.created_at).fromNow()}
              {app.decided_at && ` · Decided ${dayjs(app.decided_at).fromNow()}`}
            </Text>

            {app.message && (
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>
                Your message: {app.message}
              </Text>
            )}

            {app.manager_response && (
              <>
                <Divider style={{ margin: '10px 0' }} />
                <div style={{ background: '#F8F5F0', borderRadius: 6, padding: '10px 14px' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    Landlord response
                  </Text>
                  <Text>{app.manager_response}</Text>
                </div>
              </>
            )}

            {app.status === 'pending' && (
              <div style={{ marginTop: 12 }}>
                <Popconfirm
                  title="Withdraw this application?"
                  description="This cannot be undone."
                  onConfirm={() => handleWithdraw(app.id)}
                  okText="Withdraw"
                  okButtonProps={{ danger: true }}
                  cancelText="Cancel"
                >
                  <Button size="small" danger>Withdraw application</Button>
                </Popconfirm>
              </div>
            )}
          </List.Item>
        )}
      />
    </>
  );
}
