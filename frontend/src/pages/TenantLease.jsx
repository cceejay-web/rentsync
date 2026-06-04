import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Row, Col, Card, Avatar, Typography, Tag, Skeleton, App, Flex,
} from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import api from '../services/api.js';
import { statusColor } from '../utils/statusTag.jsx';

const { Title, Text, Paragraph } = Typography;

const fmtKsh = (v) =>
  `KSh ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function SkeletonCard() {
  return (
    <Card style={{ borderRadius: 8 }}>
      <Skeleton active paragraph={{ rows: 4 }} />
    </Card>
  );
}

export default function TenantLease() {
  const { message } = App.useApp();
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

  const hasUnitStats = lease && (
    lease.unit.bedrooms != null ||
    lease.unit.bathrooms != null ||
    lease.unit.size_sqm != null
  );

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>My Lease</Title>
        <Text type="secondary">Your current rental agreement</Text>
      </div>

      {loading ? (
        <Row gutter={[16, 16]}>
          <Col xs={24}><SkeletonCard /></Col>
          <Col xs={24}><SkeletonCard /></Col>
          <Col xs={24}><SkeletonCard /></Col>
        </Row>
      ) : notFound ? (
        <Card style={{ borderRadius: 8 }}>
          <Text type="secondary">
            No active lease found. Please contact your landlord.
          </Text>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>

          {/* Card 1 — Your Home */}
          <Col xs={24}>
            <Card
              title={<span style={{ fontWeight: 600 }}>Your Home</span>}
              style={{ borderRadius: 8 }}
            >
              <Flex align="center" gap={8} style={{ marginBottom: 4 }}>
                <ApartmentOutlined style={{ color: '#0F5D4E', fontSize: 18 }} />
                <Text strong style={{ fontSize: 16 }}>{lease.property.name}</Text>
                <Tag color={statusColor('vacant')} style={{ marginLeft: 4 }}>
                  Unit {lease.unit.unit_number}
                </Tag>
              </Flex>

              {lease.property.address && (
                <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                  {lease.property.address}
                </Text>
              )}

              {hasUnitStats && (
                <Flex gap={8} wrap="wrap" style={{ marginBottom: 12 }}>
                  {lease.unit.bedrooms != null && (
                    <Text type="secondary">{lease.unit.bedrooms} bed</Text>
                  )}
                  {lease.unit.bedrooms != null && (lease.unit.bathrooms != null || lease.unit.size_sqm != null) && (
                    <Text type="secondary">·</Text>
                  )}
                  {lease.unit.bathrooms != null && (
                    <Text type="secondary">{lease.unit.bathrooms} bath</Text>
                  )}
                  {lease.unit.bathrooms != null && lease.unit.size_sqm != null && (
                    <Text type="secondary">·</Text>
                  )}
                  {lease.unit.size_sqm != null && (
                    <Text type="secondary">{lease.unit.size_sqm} sqm</Text>
                  )}
                </Flex>
              )}

              {lease.unit.description && (
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {lease.unit.description}
                </Paragraph>
              )}
            </Card>
          </Col>

          {/* Card 2 — Lease Terms */}
          <Col xs={24}>
            <Card
              title={<span style={{ fontWeight: 600 }}>Lease Terms</span>}
              style={{ borderRadius: 8 }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: '#14161A', marginBottom: 16 }}>
                {fmtKsh(lease.monthly_rent)}
                <Text type="secondary" style={{ fontSize: 14, fontWeight: 400, marginLeft: 6 }}>
                  / month
                </Text>
              </div>

              <Row gutter={[24, 12]}>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Status</Text>
                  <Tag color={statusColor(lease.lease_status)} style={{ marginTop: 4, textTransform: 'capitalize' }}>
                    {lease.lease_status}
                  </Tag>
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Lease started</Text>
                  <Text strong>{dayjs(lease.start_date).format('DD MMM YYYY')}</Text>
                </Col>
                <Col xs={24} sm={8}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Lease ends</Text>
                  {lease.end_date
                    ? <Text strong>{dayjs(lease.end_date).format('DD MMM YYYY')}</Text>
                    : <Text type="secondary" style={{ fontStyle: 'italic' }}>Open-ended (no end date)</Text>
                  }
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Card 3 — Your Landlord */}
          <Col xs={24}>
            <Card
              title={<span style={{ fontWeight: 600 }}>Your Landlord</span>}
              style={{ borderRadius: 8 }}
            >
              <Flex gap={16} align="flex-start">
                <Avatar
                  size={48}
                  style={{ backgroundColor: '#C9E6DC', color: '#0F5D4E', flexShrink: 0 }}
                >
                  {lease.landlord.name?.[0]?.toUpperCase()}
                </Avatar>
                <div>
                  <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
                    {lease.landlord.name}
                  </Text>
                  {lease.landlord.email && (
                    <div style={{ marginBottom: 2 }}>
                      <a href={`mailto:${lease.landlord.email}`} style={{ color: '#0F5D4E' }}>
                        {lease.landlord.email}
                      </a>
                    </div>
                  )}
                  {lease.landlord.phone && (
                    <div style={{ marginBottom: 8 }}>
                      <a href={`tel:${lease.landlord.phone}`} style={{ color: '#0F5D4E' }}>
                        {lease.landlord.phone}
                      </a>
                    </div>
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Reach out for repairs, questions, or to discuss your lease.
                  </Text>
                </div>
              </Flex>
            </Card>
          </Col>

        </Row>
      )}
    </>
  );
}
