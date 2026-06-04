import { Outlet, useNavigate } from 'react-router-dom';
import { Avatar, Typography, Dropdown } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from './Sidebar';

const { Text } = Typography;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const dropdownItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign out',
      onClick: handleLogout,
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

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
                <Text strong style={{ display: 'block', lineHeight: 1.2 }}>{user.email}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Text>
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
