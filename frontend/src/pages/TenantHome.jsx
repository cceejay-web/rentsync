import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Typography, Skeleton, App } from 'antd';
import {
  FileTextOutlined, WalletOutlined, MessageOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

const { Title, Text } = Typography;

export default function TenantHome() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lease,    setLease]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchLease() {
      try {
        const { data } = await api.get('/tenant/me');
        setLease(data.lease);
      } catch (err) {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else if (err.response) {
          message.error(err.response.data.error);
        } else {
          message.error('Could not reach the server.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchLease();
  }, []);

  const QUICK_ACTIONS = [
    {
      icon: <FileTextOutlined style={{ fontSize: 28, color: '#0F5D4E' }} />,
      title: 'My Lease',
      description: 'View your rental agreement and landlord contact.',
      onClick: () => navigate('/tenant/lease'),
      clickable: true,
    },
    {
      icon: <WalletOutlined style={{ fontSize: 28, color: '#0F5D4E' }} />,
      title: 'Payments',
      description: 'View your rent payment history.',
      onClick: () => navigate('/tenant/payments'),
      clickable: true,
    },
    {
      icon: <MessageOutlined style={{ fontSize: 28, color: '#0F5D4E' }} />,
      title: 'File a Request',
      description: 'Report a repair or maintenance issue.',
      onClick: () => navigate('/tenant/requests'),
      clickable: true,
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          Welcome, {user.full_name || user.email}
        </Title>
        {loading ? (
          <Skeleton active paragraph={false} style={{ width: 200, marginTop: 4 }} />
        ) : notFound ? (
          <Text type="secondary">Your tenant portal</Text>
        ) : (
          <Text type="secondary">{lease.property.name} · Unit {lease.unit.unit_number}</Text>
        )}
      </div>

      {notFound ? (
        <Card style={{ borderRadius: 8 }}>
          <Text type="secondary">
            No active lease found. Please contact your landlord.
          </Text>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {QUICK_ACTIONS.map((action) => (
            <Col xs={24} sm={8} key={action.title}>
              <Card
                style={{
                  borderRadius: 8,
                  cursor: action.clickable ? 'pointer' : 'default',
                  opacity: action.clickable ? 1 : 0.6,
                  height: '100%',
                }}
                styles={{ body: { padding: 24 } }}
                onClick={action.clickable ? action.onClick : undefined}
                hoverable={action.clickable}
              >
                <div style={{ marginBottom: 12 }}>{action.icon}</div>
                <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
                  {action.title}
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {action.description}
                </Text>
                {!action.clickable && (
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic' }}>
                      Coming soon
                    </Text>
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </>
  );
}
