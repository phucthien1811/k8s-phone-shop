// Kịch bản FLASH SALE: tăng dần lên 200 khách cùng lúc trên cửa hàng.
// Mỗi khách ảo: xem trang flash sale -> xem chi tiết -> (40%) đặt hàng -> nghỉ 1-3 giây.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://frontend';

export const options = {
  stages: [
    { duration: '1m', target: 50 },    // khách bắt đầu vào
    { duration: '1m', target: 200 },   // 20h: mở flash sale, 200 người ùa vào
    { duration: '3m', target: 200 },   // giữ 200 người trong 3 phút
    { duration: '1m', target: 0 },     // hết sale, khách rời đi
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],      // dưới 5% request lỗi
    http_req_duration: ['p(95)<2000'],   // 95% request phản hồi dưới 2 giây
  },
};

const FLASH_IDS = [1, 5, 9, 13];

export default function () {
  const list = http.get(`${BASE}/api/flash-sale`, { tags: { name: 'flash-sale' } });
  check(list, { 'xem flash sale OK': (r) => r.status === 200 });
  sleep(Math.random() * 2 + 1);

  const id = FLASH_IDS[Math.floor(Math.random() * FLASH_IDS.length)];
  const detail = http.get(`${BASE}/api/products/${id}`, { tags: { name: 'product' } });
  check(detail, { 'xem chi tiết OK': (r) => r.status === 200 });
  sleep(Math.random() * 2 + 1);

  if (Math.random() < 0.4) {
    const res = http.post(`${BASE}/api/orders`, JSON.stringify({
      customer: { name: `Khach ${__VU}`, phone: '0900000000', address: 'TP. Ho Chi Minh' },
      items: [{ productId: id, quantity: 1 }],
    }), { headers: { 'Content-Type': 'application/json' }, tags: { name: 'order' } });
    check(res, { 'đặt hàng OK hoặc hết hàng': (r) => r.status === 201 || r.status === 409 });
  }
  sleep(Math.random() * 2 + 1);
}
