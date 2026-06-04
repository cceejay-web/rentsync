import { useEffect, useState } from 'react';
import {
  Row, Col, Card, Typography, Button, Modal, Input, Skeleton, App,
} from 'antd';
import api from '../services/api.js';

const { Title, Text, Paragraph } = Typography;

const fmtKsh = (v) =>
  `KSh ${Number(v).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

function UnitCard({ unit, onApply }) {
  const hasStats = unit.bedrooms != null || unit.bathrooms != null || unit.size_sqm != null;

  const statParts = [];
  if (unit.bedrooms  != null) statParts.push(`${unit.bedrooms} bed`);
  if (unit.bathrooms != null) statParts.push(`${unit.bathrooms} bath`);
  if (unit.size_sqm  != null) statParts.push(`${unit.size_sqm} sqm`);

  return (
    <Card
      title={<span style={{ fontWeight: 600 }}>{unit.property_name} / {unit.unit_number}</span>}
      style={{ borderRadius: 8, height: '100%' }}
      styles={{ body: { padding: 20 } }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, color: '#0F5D4E', marginBottom: 4 }}>
        {fmtKsh(unit.monthly_rent)}
        <span style={{ fontSize: 13, fontWeight: 400, color: '#5C6069', marginLeft: 4 }}>/mo</span>
      </div>

      {unit.property_address && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 10 }}>
          {unit.property_address}
        </Text>
      )}

      {hasStats && (
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>
          {statParts.join('  ·  ')}
        </Text>
      )}

      {unit.description && (
        <Paragraph
          type="secondary"
          ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
          style={{ fontSize: 13, marginBottom: 14 }}
        >
          {unit.description}
        </Paragraph>
      )}

      <Button type="primary" style={{ marginTop: 4 }} onClick={() => onApply(unit)}>
        Apply to Move Here
      </Button>
    </Card>
  );
}

export default function TenantAvailable() {
  const { message } = App.useApp();

  const [units,       setUnits]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [applyTarget, setApplyTarget] = useState(null);
  const [applyMsg,    setApplyMsg]    = useState('');
  const [applying,    setApplying]    = useState(false);

  async function fetchUnits() {
    try {
      const { data } = await api.get('/tenant/available-units');
      setUnits(data.units);
    } catch (err) {
      if (err.response) message.error(err.response.data.error);
      else message.error('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUnits(); }, []);

  function openApply(unit) {
    setApplyTarget(unit);
    setApplyMsg('');
  }

  function closeApply() {
    setApplyTarget(null);
    setApplyMsg('');
  }

  async function handleApply() {
    setApplying(true);
    try {
      await api.post('/tenant/applications', {
        target_unit_id: applyTarget.id,
        message:        applyMsg.trim() || undefined,
      });
      message.success('Application submitted! Your landlord will review it.');
      closeApply();
      await fetchUnits();
    } catch (err) {
      const status = err.response?.status;
      if (status === 409) {
        message.error('You already have a pending application for this unit.');
      } else {
        message.error(err.response?.data?.error ?? 'An unexpected error occurred.');
      }
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Available Units</Title>
        <Text type="secondary">Vacant units from your landlord</Text>
      </div>

      {loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2].map(k => (
            <Col xs={24} md={12} key={k}>
              <Card style={{ borderRadius: 8 }}>
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : units.length === 0 ? (
        <Card style={{ borderRadius: 8 }}>
          <Text type="secondary">
            No vacant units available from your landlord right now.
          </Text>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {units.map(unit => (
            <Col xs={24} md={12} key={unit.id}>
              <UnitCard unit={unit} onApply={openApply} />
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={applyTarget ? `Apply for ${applyTarget.property_name} / ${applyTarget.unit_number}` : ''}
        open={!!applyTarget}
        onOk={handleApply}
        onCancel={closeApply}
        confirmLoading={applying}
        okText="Submit Application"
        destroyOnHidden
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Your application will be reviewed by your landlord. You can include an optional message below.
        </Text>
        <Input.TextArea
          rows={3}
          value={applyMsg}
          onChange={(e) => setApplyMsg(e.target.value)}
          placeholder="Why are you interested in this unit? (optional)"
        />
      </Modal>
    </>
  );
}
