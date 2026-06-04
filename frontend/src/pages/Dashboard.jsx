import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Row, Col, Card, List, Avatar, Typography, Flex, Skeleton, App,
} from 'antd';
import {
  HomeOutlined, ApartmentOutlined, UserOutlined,
  UserAddOutlined, DollarCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

// Icon shown in the activity feed per event type
const ACTIVITY_ICONS = {
  property_added: <HomeOutlined    style={{ color: '#0F5D4E' }} />,
  unit_added:     <ApartmentOutlined style={{ color: '#0F5D4E' }} />,
  tenant_added:   <UserAddOutlined  style={{ color: '#0F5D4E' }} />,
};

// Mint circle wrapping an icon — used in stat cards and activity avatars
function IconCircle({ icon, size = 48 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: '#C9E6DC',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {icon}
    </div>
  );
}

function StatCard({ label, value, subtitle, icon, loading }) {
  return (
    <Card
      style={{ borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: '100%' }}
      styles={{ body: { padding: 24 } }}
    >
      <Flex justify="space-between" align="flex-start" gap={16}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
          <div style={{
            fontSize: 32, fontWeight: 700, color: '#14161A',
            lineHeight: 1.2, margin: '8px 0 4px',
          }}>
            {loading
              ? <Skeleton.Input active size="large" style={{ width: 80 }} />
              : value}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>{subtitle}</Text>
        </div>
        <IconCircle icon={icon} />
      </Flex>
    </Card>
  );
}

export default function Dashboard() {
  const { message } = App.useApp();
  const { user } = useAuth();

  const [stats, setStats] = useState({
    total_properties:          0,
    total_units:               0,
    occupied_units:            0,
    vacant_units:              0,
    active_tenants:            0,
    monthly_revenue_potential: '0.00',
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const { data } = await api.get('/dashboard/summary');
        setStats(data.stats);
        setRecentActivity(data.recent_activity);
      } catch (err) {
        if (err.response) message.error(err.response.data.error);
        else message.error('Could not reach the server.');
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  const formattedRevenue = `KSh ${Number(stats.monthly_revenue_potential).toLocaleString(
    'en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }
  )}`;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Dashboard</Title>
        <Text type="secondary">Welcome back, {user.full_name || user.email}</Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Total Properties"
            value={stats.total_properties}
            subtitle="Properties under management"
            icon={<HomeOutlined style={{ fontSize: 22, color: '#0F5D4E' }} />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Total Units"
            value={stats.total_units}
            subtitle={`${stats.occupied_units} occupied · ${stats.vacant_units} vacant`}
            icon={<ApartmentOutlined style={{ fontSize: 22, color: '#0F5D4E' }} />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Active Tenants"
            value={stats.active_tenants}
            subtitle="Leases currently active"
            icon={<UserOutlined style={{ fontSize: 22, color: '#0F5D4E' }} />}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            label="Monthly Revenue"
            value={formattedRevenue}
            subtitle="From active leases"
            icon={<DollarCircleOutlined style={{ fontSize: 22, color: '#0F5D4E' }} />}
            loading={loading}
          />
        </Col>
      </Row>

      <Card
        title={<span style={{ fontWeight: 600 }}>Recent Activity</span>}
        style={{ marginTop: 24, borderRadius: 8 }}
        styles={{ body: { padding: 0 } }}
      >
        <List
          dataSource={recentActivity}
          locale={{ emptyText: 'No recent activity yet — start by adding a property.' }}
          renderItem={(item) => (
            <List.Item style={{ padding: '12px 24px' }}>
              <List.Item.Meta
                avatar={
                  <Avatar
                    style={{ backgroundColor: '#C9E6DC' }}
                    icon={ACTIVITY_ICONS[item.type] ?? <HomeOutlined style={{ color: '#0F5D4E' }} />}
                  />
                }
                title={item.description}
                description={dayjs(item.timestamp).fromNow()}
              />
            </List.Item>
          )}
        />
      </Card>
    </>
  );
}
