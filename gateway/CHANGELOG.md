# Changelog — gateway

Thay đổi của API gateway (repo cha, nhánh `main`); mới nhất ở trên.

- **feat(gateway): route every service and wait for all of them** — `routes.json` có tiền tố của contract, signing, execution (`/executions`, không trùng `/contracts`), decision, payment, audit, route công khai `/public/*` và callback ngân hàng; `compose.yaml` chạy đủ 6 service (mỗi service một database, `JWKS_URL`, địa chỉ các service nó gọi); Postman kiểm cả 7 service sống sau gateway
- **feat(gateway): single entry point with token check, limits and the compose stack** — `gateway/` (TypeScript, `node:http`, không thư viện proxy): định tuyến theo tiền tố dài nhất trong `routes.json`, route công khai, kiểm JWT RS256 lớp 1 qua JWKS của identity (MS-B2), giới hạn theo IP (`GATEWAY_RATE_LIMIT`/phút), CORS theo `WEB_ORIGIN` (có cookie), `x-request-id`, `x-forwarded-for`, timeout `GATEWAY_TIMEOUT_MS` → 504, service không tới được → 503, lỗi dạng problem+json; `GET /api/v1/health` gộp trạng thái các service; `compose.yaml` (Postgres một database mỗi service, identity, gateway; chỉ gateway mở cổng); Postman 25 request, 51 assertion (`postman/`)
