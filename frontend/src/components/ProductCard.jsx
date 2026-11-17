import { Badge, Button, Card, Space, Typography, message } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import PhoneImage from './PhoneImage';
import { useCart } from '../cart';
import { vnd } from '../api';

export default function ProductCard({ p }) {
  const { add } = useCart();
  const onSale = p.sale_price != null;
  const percent = onSale ? Math.round((1 - p.sale_price / p.price) * 100) : 0;

  const card = (
    <Card
      hoverable
      cover={<Link to={`/product/${p.id}`}><PhoneImage color={p.color} brand={p.brand} /></Link>}
      actions={[
        <Button
          key="add" type="primary" icon={<ShoppingCartOutlined />} disabled={p.stock <= 0}
          onClick={() => { add(p); message.success(`Đã thêm ${p.name} vào giỏ`); }}
        >
          {p.stock > 0 ? 'Thêm vào giỏ' : 'Hết hàng'}
        </Button>,
      ]}
    >
      <Link to={`/product/${p.id}`}>
        <Typography.Text strong ellipsis style={{ display: 'block' }}>{p.name}</Typography.Text>
      </Link>
      <Space direction="vertical" size={0}>
        <Typography.Text type="danger" strong style={{ fontSize: 16 }}>{vnd(p.sale_price ?? p.price)}</Typography.Text>
        {onSale && <Typography.Text delete type="secondary">{vnd(p.price)}</Typography.Text>}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>Còn {p.stock} sản phẩm</Typography.Text>
      </Space>
    </Card>
  );

  return onSale ? <Badge.Ribbon text={`-${percent}%`} color="red">{card}</Badge.Ribbon> : card;
}
