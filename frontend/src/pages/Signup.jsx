import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Select, App } from 'antd';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = 'http://localhost:5000/api';

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'tenant',  label: 'Tenant'  },
];

export default function Signup() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(values) {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/auth/signup`, values);
      login(data.token);
      navigate(data.user.role === 'tenant' ? '/tenant/home' : '/dashboard');
    } catch (err) {
      if (err.response) {
        message.error(err.response.data.error);
      } else {
        message.error('Could not reach the server.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Card title="Create your RentSync account" style={{ width: 400, maxWidth: '100%' }}>
        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Full name"
            name="full_name"
            rules={[{
              validator: (_, value) =>
                value?.trim()
                  ? Promise.resolve()
                  : Promise.reject(new Error('Please enter your full name.')),
            }]}
          >
            <Input placeholder="Jane Mwangi" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email.' },
              { type: 'email', message: 'Please enter a valid email address.' },
            ]}
          >
            <Input placeholder="you@example.com" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please enter a password.' },
              { min: 8, message: 'Password must be at least 8 characters.' },
            ]}
          >
            <Input.Password placeholder="Min. 8 characters" />
          </Form.Item>

          <Form.Item
            label="Phone (M-Pesa)"
            name="phone"
            rules={[
              { required: true, message: 'Please enter your phone number.' },
              { pattern: /^254[0-9]{9}$/, message: 'Format: 254XXXXXXXXX (e.g. 254712345678)' },
            ]}
          >
            <Input placeholder="254712345678" />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Please select a role.' }]}
          >
            <Select placeholder="Select a role" options={ROLE_OPTIONS} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Create account
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </Card>
    </div>
  );
}
