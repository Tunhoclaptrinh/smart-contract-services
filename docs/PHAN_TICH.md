# Phân tích phần nền backend

Viết một lần trước khi dựng; tiến độ từng bước ghi ở `CHANGELOG.md`.

## Mục tiêu

Dựng **phần nền** dùng chung cho mọi service trước khi có nghiệp vụ: lưu trữ có giao dịch và nhật ký chuỗi băm, CRUD tài nguyên dùng chung (lọc, sắp xếp, phân trang, nhập/xuất, khoá phiên bản, phạm vi tổ chức), xác thực JWT, ma trận quyền, xử lý lỗi và nhật ký yêu cầu. Bắt đầu là một service `services/api`; sau đó tách theo nghiệp vụ (định danh, hợp đồng, ký, thực hiện, quyết định, chi tiền, kiểm toán, thông báo) và thêm gateway, `docker compose`.

## Nguồn

Lấy từ CodeCash `apps/api/src/common`, `auth.ts`, `main.ts`, `permissions.controller.ts`, `packages/contracts/{resources,permissions}.json` bản `c667ec4`, kèm bộ test CRUD và test PostgreSQL của CodeCash.

| Lấy | Không lấy ở phần nền |
| --- | --- |
| `common/`: repository (tệp, MongoDB, PostgreSQL), chuỗi băm nhật ký, CRUD chung, bộ lọc lỗi, interceptor, guard | Engine quyết định, hợp đồng, ký số, chứng từ, thanh toán, thông báo (`domain/`, `trust/`) |
| Xác thực, đăng nhập demo, khôi phục demo, ma trận quyền | Danh bạ tài khoản dựng từ Data Pack: thay bằng `seed-directory.ts` cùng hình dạng |
| `resources.json` (trừ `documents`, `contract-templates` cần mã nghiệp vụ), `permissions.json` nguyên bản | Phục vụ web tĩnh, CI và Docker của CodeCash (làm lại khi tách service) |

## Thứ tự dựng

1. Khởi tạo NestJS + TypeScript strict, `GET /health`.
2. ESLint, Prettier.
3. Định nghĩa tài nguyên, ma trận quyền, vai trò.
4. Lưu trữ: tệp, MongoDB, PostgreSQL; nhật ký chuỗi băm niêm phong trong giao dịch.
5. CRUD tài nguyên dùng chung.
6. Xác thực, tài khoản seed, ma trận quyền qua API.
7. Pipeline yêu cầu: lỗi thống nhất, interceptor, ghi nhật ký lần đọc, xuất nhật ký, Swagger.
8. Test CRUD và test PostgreSQL.

## Việc sau phần nền (theo đề Microservices)

Tách ít nhất 4 service nghiệp vụ, mỗi service CSDL riêng; API Gateway; OpenAPI cho từng service; timeout, thử lại, phân biệt 4xx và 503/504; luồng nhiều bước có hoàn tác; Dockerfile từng service và `docker compose up`; Postman ≥ 10 request; thí nghiệm lỗi có số liệu.
