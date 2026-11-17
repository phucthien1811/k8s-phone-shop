# K8s Phone Store

Cửa hàng điện thoại 3 tầng triển khai trên **Kubernetes**: giao diện **React + Ant Design**, API **Node.js Express**, cơ sở dữ liệu **MySQL 8**.
Dự án minh họa khả năng **tự mở rộng (HPA)**, **cân bằng tải**, **tự phục hồi**, **lưu trữ bền vững (PVC)** và **cập nhật không gián đoạn** qua kịch bản *Flash Sale 200 khách cùng lúc*.

> Đồ án học phần Hệ thống mã nguồn mở – Nguyễn Trần Phúc Thiên. Phát hành theo giấy phép [MIT](LICENSE).

## Kiến trúc

```
Trình duyệt ──► NodePort 30080 ──► frontend (Nginx + React, 2 Pod)
                                        │  /api/*
                                        ▼
                                  Service backend ──► backend (Express, 2→6 Pod, HPA)
                                                            │
                                                            ▼
                                                   mysql-0 (StatefulSet + PVC 2Gi)
```

| Thành phần | Công nghệ | Đối tượng Kubernetes |
|---|---|---|
| Giao diện | React 18, Ant Design 5, Vite, Nginx | Deployment, Service NodePort, HPA |
| API | Node.js 20, Express, mysql2 | Deployment, Service, HPA, ServiceAccount + RBAC |
| Cơ sở dữ liệu | MySQL 8.0 | StatefulSet, Headless Service, PVC |
| Cấu hình | | ConfigMap, Secret |
| Kiểm thử tải | k6 | Job |

## Cấu trúc thư mục

```
backend/     API Express (tự tạo bảng + 20 sản phẩm mẫu khi khởi động)
frontend/    React + Ant Design, nginx.conf chuyển /api sang backend
k8s/         Toàn bộ manifest Kubernetes
loadtest/    Kịch bản k6 Flash Sale và Job chạy trong cụm
.github/     GitHub Actions build & push image lên Docker Hub
```

## API chính

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/products?q=&brand=` | Danh sách sản phẩm |
| GET | `/api/products/:id` | Chi tiết sản phẩm |
| GET | `/api/flash-sale` | Sản phẩm flash sale + thời điểm kết thúc |
| POST | `/api/orders` | Đặt hàng (transaction, khóa dòng chống bán quá tồn kho) |
| GET | `/api/info` | Pod / node / phiên bản đang phục vụ |
| GET | `/api/cluster` | Danh sách Pod và trạng thái HPA (đọc qua Kubernetes API) |
| GET | `/api/stats` | Số đơn, doanh thu, đơn theo Pod |
| GET | `/api/stress?ms=400` | Tạo tải CPU để minh họa HPA |

## Build image

Đẩy tag lên GitHub, GitHub Actions sẽ tự build và push:

```bash
git tag v1 && git push origin v1
```

Hoặc build trên máy có Docker:

```bash
docker build -t iristhientiy/phone-shop-backend:v1 --build-arg APP_VERSION=v1 ./backend
docker build -t iristhientiy/phone-shop-frontend:v1 ./frontend
docker push iristhientiy/phone-shop-backend:v1
docker push iristhientiy/phone-shop-frontend:v1
```

## Triển khai

Yêu cầu cụm đã có Metrics Server và StorageClass mặc định (ví dụ local-path).

```bash
kubectl apply -f k8s/
kubectl get all -n shop
```

Truy cập: `http://<IP-công-khai-của-node>:30080` – trang **Hậu trường K8s** ở `/admin`.

## Kiểm thử Flash Sale (200 khách)

```bash
kubectl create configmap k6-script -n shop --from-file=loadtest/flash-sale.js
kubectl apply -f loadtest/k6-job.yaml
kubectl get hpa -n shop --watch          # theo dõi số Pod backend tăng/giảm
kubectl logs -n shop job/k6-flash-sale -f # xem kết quả k6
```

## Chạy thử trên máy (không cần Kubernetes)

```bash
cd backend && npm install && DB_HOST=localhost DB_USER=shop DB_PASSWORD=shop npm start
cd frontend && npm install && npm run dev
```
