import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { Alert, Button, Card, Col, Popconfirm, Progress, Row, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { ApiOutlined, ClusterOutlined, FireOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { api, vnd } from '../api';

// Biểu đồ cột nhỏ vẽ bằng SVG (lịch sử số Pod backend và số đơn/phút)
function MiniBars({ data, max, color, height = 60 }) {
  const w = 300, bw = w / Math.max(data.length, 1);
  const m = Math.max(max || 0, ...data, 1);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      {data.map((v, i) => {
        const h = (v / m) * (height - 4);
        return <rect key={i} x={i * bw + 1} y={height - h} width={Math.max(bw - 2, 1)} height={h} fill={color} rx="1" />;
      })}
    </svg>
  );
}

const HISTORY = 60; // giữ 60 mẫu (~2 phút, mỗi 2 giây một mẫu)

export default function Admin() {
  const [cluster, setCluster] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [podHistory, setPodHistory] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [lb, setLb] = useState(null);
  const [lbRunning, setLbRunning] = useState(false);
  const [stressing, setStressing] = useState(false);
  const stressRef = useRef(false);

  // Cập nhật trạng thái cụm và thống kê mỗi 2 giây
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const [c, s] = await Promise.all([api('/cluster'), api('/stats')]);
        if (!alive) return;
        setCluster(c); setStats(s); setError('');
        const running = (c.pods || []).filter((p) => p.app === 'backend' && p.phase === 'Running' && p.ready).length;
        setPodHistory((h) => [...h, running].slice(-HISTORY));
        setOrderHistory((h) => [...h, s.ordersLastMinute].slice(-HISTORY));
      } catch (e) { if (alive) setError(e.message); }
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => () => { stressRef.current = false; }, []);

  // Gửi 60 request liên tiếp, đếm xem mỗi Pod nhận bao nhiêu -> thấy cân bằng tải
  const testLoadBalancing = async () => {
    setLbRunning(true);
    const counts = {};
    for (let i = 0; i < 60; i++) {
      try { const info = await api('/info'); counts[info.pod] = (counts[info.pod] || 0) + 1; } catch { /* bỏ qua */ }
    }
    setLb(counts); setLbRunning(false);
  };

  // Gọi /api/stress liên tục trong 90 giây để đẩy CPU backend lên -> HPA tăng Pod
  const startStress = async () => {
    stressRef.current = true; setStressing(true);
    message.info('Đang tạo tải CPU trong 90 giây, theo dõi số Pod backend...');
    const until = Date.now() + 90000;
    const worker = async () => {
      while (stressRef.current && Date.now() < until) {
        try { await api('/stress?ms=400'); } catch { await new Promise((r) => setTimeout(r, 500)); }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    stressRef.current = false; setStressing(false);
  };

  const resetData = async () => { await api('/admin/reset', { method: 'POST' }); message.success('Đã xóa đơn hàng và khôi phục tồn kho'); };

  const pods = cluster?.pods || [];
  const backendPods = pods.filter((p) => p.app === 'backend');
  const hpa = cluster?.hpa;
  const lbTotal = lb ? Object.values(lb).reduce((a, b) => a + b, 0) : 0;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={2} style={{ margin: 0 }}><ClusterOutlined /> Hậu trường Kubernetes</Typography.Title>
      {error && <Alert type="error" showIcon message={error} />}
      {cluster && !cluster.inCluster && <Alert type="info" showIcon message="Backend đang chạy ngoài Kubernetes nên không có thông tin cụm." />}

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="Pod backend đang chạy" value={backendPods.filter((p) => p.phase === 'Running' && p.ready).length} suffix={hpa ? `/ tối đa ${hpa.max}` : ''} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="CPU trung bình (HPA)" value={hpa?.currentCpu ?? '-'} suffix={hpa ? `% / mục tiêu ${hpa.targetCpu}%` : ''} valueStyle={{ color: hpa && hpa.currentCpu > hpa.targetCpu ? '#cf1322' : undefined }} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Đơn hàng trong 1 phút" value={stats?.ordersLastMinute ?? '-'} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Tổng doanh thu" value={stats ? vnd(stats.revenue) : '-'} /><Typography.Text type="secondary">{stats?.totalOrders ?? 0} đơn</Typography.Text></Card></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Số Pod backend theo thời gian (HPA)" size="small">
            <MiniBars data={podHistory} max={hpa?.max || 6} color="#1677ff" />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Số đơn hàng / phút theo thời gian" size="small">
            <MiniBars data={orderHistory} color="#fa541c" />
          </Card>
        </Col>
      </Row>

      <Card title="Các Pod trong namespace" extra={<Tag color="blue">{cluster?.namespace}</Tag>}>
        <Table size="small" rowKey="name" pagination={false} dataSource={pods} columns={[
          { title: 'Pod', dataIndex: 'name' },
          { title: 'Ứng dụng', dataIndex: 'app', render: (v) => <Tag color={{ backend: 'blue', frontend: 'green', mysql: 'orange' }[v]}>{v}</Tag> },
          { title: 'Node', dataIndex: 'node' },
          { title: 'IP Pod', dataIndex: 'podIP' },
          { title: 'Trạng thái', render: (_, p) => <Tag color={p.phase === 'Running' && p.ready ? 'success' : p.phase === 'Terminating' ? 'error' : 'warning'}>{p.ready || p.phase !== 'Running' ? p.phase : 'Starting'}</Tag> },
          { title: 'Khởi động lại', dataIndex: 'restarts' },
          { title: 'Tuổi', dataIndex: 'startedAt', render: (v) => (v ? `${dayjs().diff(dayjs(v), 'second')} giây` : '-') },
        ]} />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title={<><ApiOutlined /> Kiểm tra cân bằng tải</>}
            extra={<Button onClick={testLoadBalancing} loading={lbRunning}>Gửi 60 request</Button>}>
            {!lb ? <Typography.Text type="secondary">Bấm nút để xem Service chia request cho các Pod backend như thế nào.</Typography.Text> :
              Object.entries(lb).map(([pod, n]) => (
                <div key={pod}><Typography.Text code>{pod}</Typography.Text>
                  <Progress percent={Math.round((n / lbTotal) * 100)} format={() => `${n} request`} /></div>
              ))}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={<><FireOutlined /> Công cụ demo</>}>
            <Space wrap>
              <Button type="primary" danger icon={<ThunderboltOutlined />} loading={stressing} onClick={startStress}>Tạo tải CPU (90 giây)</Button>
              {stressing && <Button onClick={() => { stressRef.current = false; }}>Dừng</Button>}
              <Popconfirm title="Xóa toàn bộ đơn hàng và khôi phục tồn kho?" onConfirm={resetData}>
                <Button icon={<ReloadOutlined />}>Làm mới dữ liệu demo</Button>
              </Popconfirm>
            </Space>
            <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              Kịch bản 200 khách flash sale được chạy bằng k6 (thư mục <Typography.Text code>loadtest/</Typography.Text>).
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>

      <Card title="Đơn hàng theo Pod xử lý (10 phút gần nhất)">
        {!stats?.byPod?.length ? <Typography.Text type="secondary">Chưa có đơn hàng.</Typography.Text> :
          stats.byPod.map((r) => (
            <div key={r.pod}><Typography.Text code>{r.pod}</Typography.Text>
              <Progress percent={Math.round((r.orders / stats.byPod.reduce((s, x) => s + x.orders, 0)) * 100)} format={() => `${r.orders} đơn`} strokeColor="#fa541c" /></div>
          ))}
      </Card>
    </Space>
  );
}
