import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, Input, Row, Segmented, Spin, Statistic, Typography } from 'antd';
import { FireOutlined } from '@ant-design/icons';
import ProductCard from '../components/ProductCard';
import { api } from '../api';

export default function Home() {
  const [flash, setFlash] = useState(null);
  const [products, setProducts] = useState(null);
  const [brands, setBrands] = useState([]);
  const [brand, setBrand] = useState('Tất cả');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/flash-sale').then(setFlash).catch((e) => setError(e.message));
    api('/brands').then(setBrands).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (brand !== 'Tất cả') params.set('brand', brand);
    setProducts(null);
    api(`/products?${params}`).then(setProducts).catch((e) => setError(e.message));
  }, [q, brand]);

  return (
    <>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

      <Card
        style={{ marginBottom: 24, background: 'linear-gradient(90deg,#ff4d4f,#fa8c16)', border: 0 }}
        styles={{ body: { padding: 20 } }}
      >
        <Row align="middle" gutter={16}>
          <Col flex="auto">
            <Typography.Title level={2} style={{ color: '#fff', margin: 0 }}>
              <FireOutlined /> FLASH SALE – GIẢM ĐẾN 50%
            </Typography.Title>
            <Typography.Text style={{ color: '#fff' }}>Số lượng có hạn, đặt ngay kẻo lỡ!</Typography.Text>
          </Col>
          <Col>
            {flash && (
              <Statistic.Countdown
                title={<span style={{ color: '#fff' }}>Kết thúc sau</span>}
                value={flash.endsAt} format="HH:mm:ss" valueStyle={{ color: '#fff', fontWeight: 700 }}
              />
            )}
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {flash?.products.map((p) => (
            <Col key={p.id} xs={24} sm={12} md={6}><ProductCard p={p} /></Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
        <Col flex="auto"><Typography.Title level={3} style={{ margin: 0 }}>Tất cả điện thoại</Typography.Title></Col>
        <Col><Input.Search placeholder="Tìm điện thoại..." allowClear onSearch={setQ} style={{ width: 260 }} /></Col>
      </Row>
      <Segmented options={['Tất cả', ...brands]} value={brand} onChange={setBrand} style={{ marginBottom: 16, flexWrap: 'wrap' }} />

      {!products ? <Spin size="large" style={{ display: 'block', margin: 40 }} /> :
        products.length === 0 ? <Empty description="Không có sản phẩm phù hợp" /> : (
          <Row gutter={[16, 16]}>
            {products.map((p) => <Col key={p.id} xs={24} sm={12} md={8} lg={6}><ProductCard p={p} /></Col>)}
          </Row>
        )}
    </>
  );
}
