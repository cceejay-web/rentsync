import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, App } from 'antd';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const API_BASE = 'http://localhost:5000/api';

export default function Login() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(values) {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/auth/login`, values);
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
      <Card title="Sign in to RentSync" style={{ width: 400, maxWidth: '100%' }}>
        <Form layout="vertical" onFinish={handleSubmit}>
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
            rules={[{ required: true, message: 'Please enter your password.' }]}
          >
            <Input.Password placeholder="Password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Sign in
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
      </Card>
    </div>
  );
}
