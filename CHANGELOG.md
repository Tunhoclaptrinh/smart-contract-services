# Changelog

Mỗi bước dựng phần nền ghi một mục; mới nhất ở trên.

- **feat: define resources, roles and the permission matrix** — `resources.json` (trường, kiểu, ràng buộc của từng tài nguyên), `permissions.json` (vai trò → quyền và phạm vi), quy tắc vai trò nội bộ và quản trị công ty
- **chore: add ESLint and Prettier** — luật lint và định dạng dùng chung (lấy từ CodeCash)
- **chore: scaffold the API service with NestJS and TypeScript** — NestJS 11, TypeScript `strict`, tiền tố `/api/v1`, `GET /health`
- **docs: plan the backend base** — phân tích phần nền, nguồn lấy từ CodeCash và thứ tự dựng (`docs/PHAN_TICH.md`)
