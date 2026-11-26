# Gateway

Điểm vào duy nhất của hệ thống (MS-R4). Chỉ định tuyến và áp chính sách; **không chứa luật nghiệp
vụ**, không đọc body, không import mã service. Toàn cảnh: `docs/HE_THONG.md`.

| Tệp | Làm gì |
| --- | --- |
| `routes.json` | Tiền tố đường dẫn → service; danh sách route công khai (`METHOD /path`, `/*` cho mọi đuôi) |
| `src/gateway.ts` | `createGateway`: request id, CORS, `/health` gộp, giới hạn theo IP, chọn route, kiểm JWT lớp 1, chuyển tiếp dạng luồng, 503/504 |
| `src/main.ts` | Đọc `routes.json` và `<TÊN>_URL`, đặt `JWKS_URL` mặc định theo `IDENTITY_URL`, nghe cổng |
| `test/gateway.test.mjs` | Định tuyến, công khai và token, 404/503/504, CORS, giới hạn |

**Thêm một service**: thêm tiền tố của nó vào `routes.json` (và route công khai nếu có), thêm
`<TÊN>_URL` vào `compose.yaml`, sửa bảng trong `docs/HE_THONG.md`.

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `IDENTITY_URL`, `CONTRACT_URL`… | — | Địa chỉ từng service |
| `JWKS_URL` | `${IDENTITY_URL}/api/v1/.well-known/jwks.json` | Khoá công khai để kiểm token |
| `WEB_ORIGIN` | `http://127.0.0.1:5173,http://localhost:5173` | Origin được CORS |
| `GATEWAY_RATE_LIMIT` | 600 | Request mỗi phút mỗi địa chỉ |
| `GATEWAY_TIMEOUT_MS` | 10000 | Hạn trả lời của service |
| `GATEWAY_PORT` | 3000 | Cổng |

Chạy cả hệ: từ thư mục này lên một cấp, `docker compose up --build --wait`, rồi
`npx newman run postman/smart-contract.postman_collection.json -e postman/local.postman_environment.json`.
