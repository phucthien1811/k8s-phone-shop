import { useEffect, useState } from 'react';
import { Badge, Layout, Menu, Tag, Typography } from 'antd';
import { CloudServerOutlined, DashboardOutlined, HomeOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Admin from './pages/Admin';
import { api, lastServedBy, onServedBy } from './api';
import { useCart } from './cart';

const { Header, Content, Footer } = Layout;

export default function App() {
  const { count } = useCart();
  const location = useLocation();
  const [served, setServed] = useState(lastServedBy);
  const [version, setVersion] = useState('');

  useEffect(() => onServedBy(setServed), []);
  useEffect(() => { api('/info').then((i) => setVersion(i.version)).catch(() => {}); }, [location.pathname]);

  const selected = location.pathname.startsWith('/admin') ? 'admin' : location.pathname.startsWith('/cart') ? 'cart' : 'home';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#1f1f1f' }}>
        <Link to="/" style={{ color: '#fff', fontSize: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>
          📱 K8s Phone Store
        </Link>
        <Menu
          theme="dark" mode="horizontal" selectedKeys={[selected]} style={{ flex: 1, minWidth: 0, background: 'transparent' }}
          items={[
            { key: 'home', icon: <HomeOutlined />, label: <Link to="/">Trang chủ</Link> },
            { key: 'cart', icon: <Badge count={count} size="small" offset={[6, -2]}><ShoppingCartOutlined style={{ color: '#fff' }} /></Badge>, label: <Link to="/cart">Giỏ hàng</Link> },
            { key: 'admin', icon: <DashboardOutlined />, label: <Link to="/admin">Hậu trường K8s</Link> },
          ]}
        />
      </Header>

      <Content style={{ padding: '24px 16px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Content>

      <Footer style={{ textAlign: 'center' }}>
        <Typography.Text type="secondary">
          <CloudServerOutlined /> Phục vụ bởi Pod{' '}
          <Tag color="blue">{served?.pod || '...'}</Tag> trên node <Tag color="green">{served?.node || '...'}</Tag>
          phiên bản <Tag color="purple">{version || '...'}</Tag>
          <br />
          Đồ án Hệ thống mã nguồn mở · Mã nguồn MIT · React + Express + MySQL trên Kubernetes
        </Typography.Text>
      </Footer>
    </Layout>
  );
}
