import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  HomeOutlined,
  TeamOutlined,
  MessageOutlined,
  FileSearchOutlined,
  DollarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext.jsx';

const ALL_ITEMS = [
  { key: '/dashboard',  icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/properties', icon: <HomeOutlined />,      label: 'Properties' },
  { key: '/tenants',    icon: <TeamOutlined />,      label: 'Tenants'   },
  { key: '/requests',      icon: <MessageOutlined />,    label: 'Requests'     },
  { key: '/applications', icon: <FileSearchOutlined />, label: 'Applications' },
  { key: '/payments',     icon: <DollarOutlined />,     label: 'Payments'     },
  { key: '/reports',    icon: <FileTextOutlined />,  label: 'Reports' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  const items = user?.role === 'manager' ? ALL_ITEMS : ALL_ITEMS.slice(0, 1);

  return (
    <div style={{
      width: 220,
      background: '#FFFFFF',
      borderRight: '1px solid #EFF0F2',
      height: '100vh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '24px 20px 20px' }}>
        <span style={{ fontSize: 20, fontWeight: 400, color: '#14161A' }}>Rent</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#0F5D4E' }}>Sync</span>
      </div>

      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[pathname]}
        items={items}
        onClick={({ key }) => navigate(key)}
        style={{ flex: 1, borderRight: 0 }}
      />
    </div>
  );
}
