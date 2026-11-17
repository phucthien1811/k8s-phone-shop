import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Descriptions, InputNumber, Row, Space, Spin, Tag, Typography, message } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import PhoneImage from '../components/PhoneImage';
import { api, vnd } from '../api';
import { useCart } from '../cart';

export default function Product() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const { add } = useCart();

  useEffect(() => { api(`/products/${id}`).then(setP).catch((e) => setError(e.message)); }, [id]);

  if (error) return <Alert type="error" showIcon message={error} />;
  if (!p) return <Spin size="large" style={{ display: 'block', margin: 40 }} />;

  const specs = typeof p.specs === 'string' ? JSON.parse(p.specs) : p.specs || {};
  return (
    <Card>
      <Row gutter={32}>
        <Col xs={24} md={10}><PhoneImage color={p.color} brand={p.brand} height={320} /></Col>
        <Col xs={24} md={14}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Tag color="geekblue">{p.brand}</Tag>
              {p.flash_sale ? <Tag color="red">Flash Sale</Tag> : null}
              <Typography.Title level={2} style={{ marginTop: 8 }}>{p.name}</Typography.Title>
            </div>
            <Space align="baseline">
              <Typography.Title level={3} type="danger" style={{ margin: 0 }}>{vnd(p.sale_price ?? p.price)}</Typography.Title>
              {p.sale_price != null && <Typography.Text delete type="secondary">{vnd(p.price)}</Typography.Text>}
            </Space>
            <Typography.Paragraph>{p.description}</Typography.Paragraph>
            <Descriptions bordered column={1} size="small"
              items={Object.entries(specs).map(([k, v]) => ({ key: k, label: k, children: v }))} />
            <Typography.Text type="secondary">Còn {p.stock} sản phẩm</Typography.Text>
            <Space>
              <InputNumber min={1} max={Math.max(1, p.stock)} value={qty} onChange={(v) => setQty(v || 1)} />
              <Button type="primary" size="large" icon={<ShoppingCartOutlined />} disabled={p.stock <= 0}
                onClick={() => { add(p, qty); message.success('Đã thêm vào giỏ hàng'); }}>
                Thêm vào giỏ
              </Button>
            </Space>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}
