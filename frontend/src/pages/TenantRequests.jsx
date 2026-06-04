import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  List, Tag, Typography, Button, Modal, Form, Input, Select,
  Flex, App, Divider,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '../services/api.js';
import { statusColor } from '../utils/statusTag.jsx';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;

const CATEGORY_OPTIONS = [
  { value: 'repair',      label: 'Repair'      },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'complaint',   label: 'Complaint'   },
  { value: 'other',       label: 'Other'       },
];

const CATEGORY_COLORS = {
  repair:      '#FA8C16',
  maintenance: '#1677ff',
  complaint:   '#722ED1',
  other:       '#5C6069',
};

export default function TenantRequests() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function fetchRequests() {
    try {
      const { data } = await api.get('/tenant/requests');
      setRequests(data.requests);
    } catch (err) {
      if (err.response) message.error(err.response.data.error);
      else message.error('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRequests(); }, []);

  function openModal() {
    form.resetFields();
    setModalOpen(true);
  }

  async function handleSubmit(values) {
    setSubmitting(true);
    try {
      await api.post('/tenant/requests', values);
      message.success('Request filed successfully.');
      setModalOpen(false);
      await fetchRequests();
    } catch (err) {
      if (err.response) message.error(err.response.data.error);
      else message.error('Could not reach the server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Requests</Title>
          <Text type="secondary">Maintenance, repairs, and complaints</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
          File a Request
        </Button>
      </Flex>

      <List
        loading={loading}
        dataSource={requests}
        locale={{ emptyText: 'No requests yet — use the button above to file your first one.' }}
        renderItem={(req) => (
          <List.Item style={{ display: 'block', background: '#fff', borderRadius: 8, marginBottom: 12, padding: 20, border: '1px solid #EFF0F2' }}>
            <Flex align="center" gap={8} style={{ marginBottom: 6 }}>
              <Text strong style={{ fontSize: 15 }}>{req.subject}</Text>
              <Tag color={statusColor(req.status)} style={{ textTransform: 'capitalize' }}>
                {req.status.replace('_', ' ')}
              </Tag>
            </Flex>

            <Flex gap={8} align="center" style={{ marginBottom: 10 }}>
              <Tag color={CATEGORY_COLORS[req.category]} style={{ textTransform: 'capitalize', fontSize: 11 }}>
                {req.category}
              </Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {req.property_name} · Unit {req.unit_number} · {dayjs(req.created_at).fromNow()}
              </Text>
            </Flex>

            <Paragraph
              type="secondary"
              ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}
              style={{ marginBottom: req.manager_response ? 12 : 0 }}
            >
              {req.description}
            </Paragraph>

            {req.manager_response && (
              <>
                <Divider style={{ margin: '10px 0' }} />
                <div style={{ background: '#F8F5F0', borderRadius: 6, padding: '10px 14px' }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    Manager response · updated {dayjs(req.updated_at).fromNow()}
                  </Text>
                  <Text>{req.manager_response}</Text>
                </div>
              </>
            )}
          </List.Item>
        )}
      />

      <Modal
        title="File a Request"
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText="Submit"
        destroyOnHidden
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please select a category.' }]}
          >
            <Select placeholder="Select a category" options={CATEGORY_OPTIONS} />
          </Form.Item>

          <Form.Item
            label="Subject"
            name="subject"
            rules={[{
              validator: (_, val) =>
                val?.trim() && val.trim().length <= 200
                  ? Promise.resolve()
                  : Promise.reject(new Error('Subject is required and must be 200 characters or fewer.')),
            }]}
          >
            <Input placeholder="Brief summary of the issue" showCount maxLength={200} />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{
              validator: (_, val) =>
                val?.trim()
                  ? Promise.resolve()
                  : Promise.reject(new Error('Please describe the issue.')),
            }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Describe the issue in detail — location, when it started, severity, etc."
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
