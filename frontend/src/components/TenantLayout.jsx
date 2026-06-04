import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Avatar, Typography, Dropdown, Menu } from 'antd';
import {
  LogoutOutlined, FileTextOutlined, WalletOutlined,
  MessageOutlined, AppstoreOutlined, QuestionCircleOutlined,
  HomeOutlined, FileSearchOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext.jsx';

const { Text } = Typography;

const TENANT_MENU = [
  { key: '/tenant/home',      icon: <HomeOutlined />,           label: 'Home'            },
  { key: '/tenant/lease',     icon: <FileTextOutlined />,       label: 'My Lease'        },
  { key: '/tenant/payments',  icon: <WalletOutlined />,         label: 'Payments'        },
  { key: '/tenant/requests',  icon: <MessageOutlined />,        label: 'Requests'        },
  { key: '/tenant/available',     icon: <AppstoreOutlined />,       label: 'Available Units' },
  { key: '/tenant/applications',  icon: <FileSearchOutlined />,     label: 'My Applications' },
  { key: '/tenant/help',          icon: <QuestionCircleOutlined />, label: 'Help'            },
];

export default function TenantLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const dropdownItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', onClick: handleLogout },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
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
          items={TENANT_MENU}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1, borderRight: 0 }}
        />
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          height: 64,
          background: '#F8F5F0',
          borderBottom: '1px solid #EFF0F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
        }}>
          <Text strong style={{ fontSize: 16 }}>RentSync</Text>
          <Dropdown menu={{ items: dropdownItems }} trigger={['click']}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <Avatar style={{ backgroundColor: '#C9E6DC', color: '#0F5D4E' }}>
                {user.email[0].toUpperCase()}
              </Avatar>
              <div>
                <Text strong style={{ display: 'block', lineHeight: 1.2 }}>
                  {user.full_name || user.email}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>Tenant</Text>
              </div>
            </div>
          </Dropdown>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: 24, background: '#F8F5F0' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
