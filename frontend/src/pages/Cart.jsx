import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Card, Col, Empty, Form, Input, InputNumber, Result, Row, Table, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { api, vnd } from '../api';
import { useCart } from '../cart';

export default function Cart() {
  const { items, setQty, remove, clear, total } = useCart();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const placeOrder = async (customer) => {
    setPlacing(true); setError('');
    try {
      const r = await api('/orders', {
        method: 'POST',
        body: { customer, items: items.map((i) => ({ productId: i.id, quantity: i.quantity })) },
      });
      setDone(r); clear();
    } catch (e) { setError(e.message); }
    setPlacing(false);
  };

  if (done) {
    return (
      <Result status="success" title={`Đặt hàng thành công! Mã đơn #${done.orderId}`}
        subTitle={<>Tổng tiền {vnd(done.total)} · Đơn được xử lý bởi Pod <b>{done.servedBy}</b> trên node <b>{done.node}</b></>}
        extra={<Link to="/"><Button type="primary">Tiếp tục mua sắm</Button></Link>} />
    );
  }
  if (!items.length) return <Empty description="Giỏ hàng trống"><Link to="/"><Button type="primary">Mua sắm ngay</Button></Link></Empty>;

  return (
    <Row gutter={24}>
      <Col xs={24} lg={15}>
        <Card title="Giỏ hàng">
          <Table rowKey="id" pagination={false} dataSource={items} columns={[
            { title: 'Sản phẩm', dataIndex: 'name', render: (v, r) => <Link to={`/product/${r.id}`}>{v}</Link> },
            { title: 'Đơn giá', dataIndex: 'price', render: vnd },
            { title: 'SL', dataIndex: 'quantity', render: (v, r) => <InputNumber min={1} value={v} onChange={(n) => setQty(r.id, n || 1)} /> },
            { title: 'Thành tiền', render: (_, r) => vnd(r.price * r.quantity) },
            { render: (_, r) => <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(r.id)} /> },
          ]} />
          <Typography.Title level={4} style={{ textAlign: 'right', marginTop: 16 }}>Tổng cộng: {vnd(total)}</Typography.Title>
        </Card>
      </Col>
      <Col xs={24} lg={9}>
        <Card title="Thông tin giao hàng">
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
          <Form layout="vertical" onFinish={placeOrder}>
            <Form.Item name="name" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item>
            <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Nhập số điện thoại' }]}><Input /></Form.Item>
            <Form.Item name="address" label="Địa chỉ" rules={[{ required: true, message: 'Nhập địa chỉ' }]}><Input.TextArea rows={2} /></Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={placing}>Đặt hàng</Button>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}
