import { useEffect, useState } from 'react';
import {
  Row, Col, Card, Typography, Skeleton, App, Flex,
} from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import api from '../services/api.js';

const { Title, Text } = Typography;

const LEASE_COLORS = {
  active:     '#0F5D4E',
  expired:    '#5C6069',
  terminated: '#B27620',
};

const fmtKsh = (v, decimals = 0) =>
  `KSh ${Number(v).toLocaleString('en-KE', {
    minimumFractionDigits:  decimals,
    maximumFractionDigits:  decimals,
  })}`;

function ChartCard({ title, description, children }) {
  return (
    <Card
      title={
        <div>
          <div style={{ fontWeight: 600 }}>{title}</div>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>{description}</Text>
        </div>
      }
      style={{ borderRadius: 8 }}
    >
      {children}
    </Card>
  );
}

function EmptyChart() {
  return (
    <Flex align="center" justify="center" style={{ height: 300 }}>
      <Text type="secondary">No data yet — add properties and tenants to see reports.</Text>
    </Flex>
  );
}

function ChartSkeleton() {
  return (
    <div style={{ height: 300, padding: '16px 0' }}>
      <Skeleton active paragraph={{ rows: 6 }} />
    </div>
  );
}

export default function Reports() {
  const { message } = App.useApp();

  const [occupancy,    setOccupancy]    = useState([]);
  const [revenue,      setRevenue]      = useState([]);
  const [leaseStatus,  setLeaseStatus]  = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const { data } = await api.get('/reports/summary');
        setOccupancy(data.occupancy_by_property);
        setRevenue(
          data.revenue_by_property.map(r => ({ ...r, revenue: Number(r.revenue) }))
        );
        setLeaseStatus(data.lease_status_breakdown);
      } catch (err) {
        if (err.response) message.error(err.response.data.error);
        else message.error('Could not reach the server.');
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  const leaseTotal = leaseStatus.reduce((sum, r) => sum + r.count, 0);
  const leaseEmpty = leaseStatus.every(r => r.count === 0);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Reports</Title>
        <Text type="secondary">Operational insights across your properties</Text>
      </div>

      <Row gutter={[16, 16]}>

        {/* Chart 1 — Occupancy by Property */}
        <Col xs={24}>
          <ChartCard
            title="Occupancy by Property"
            description="Unit availability across your properties"
          >
            {loading ? <ChartSkeleton /> : occupancy.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={occupancy} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                  <XAxis dataKey="property_name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend verticalAlign="top" align="right" />
                  <Bar dataKey="occupied" name="Occupied" stackId="a" fill="#0F5D4E" />
                  <Bar dataKey="vacant"   name="Vacant"   stackId="a" fill="#C9E6DC" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Col>

        {/* Chart 2 — Revenue Potential by Property */}
        <Col xs={24}>
          <ChartCard
            title="Revenue Potential by Property"
            description="Monthly rent from active leases"
          >
            {loading ? <ChartSkeleton /> : revenue.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenue} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                  <XAxis dataKey="property_name" tick={{ fontSize: 12 }} />
                  <YAxis
                    width={90}
                    tickFormatter={v => fmtKsh(v, 0)}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={v => [fmtKsh(v, 2), 'Revenue']}
                  />
                  <Bar dataKey="revenue" name="Revenue" fill="#0F5D4E" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Col>

        {/* Chart 3 — Lease Status Breakdown */}
        <Col xs={24}>
          <ChartCard
            title="Lease Status Breakdown"
            description="Distribution of lease states across all your properties"
          >
            {loading ? <ChartSkeleton /> : leaseEmpty ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={leaseStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="45%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(1)}%`
                    }
                  >
                    {leaseStatus.map(entry => (
                      <Cell key={entry.status} fill={LEASE_COLORS[entry.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      leaseTotal > 0
                        ? `${value} (${((value / leaseTotal) * 100).toFixed(1)}%)`
                        : value,
                      name,
                    ]}
                  />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </Col>

      </Row>
    </>
  );
}
