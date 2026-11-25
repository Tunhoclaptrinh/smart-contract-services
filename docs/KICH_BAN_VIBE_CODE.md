# Kịch bản chia việc để vibe code nhanh

Mục tiêu: 6 người làm song song từ 27/11, không giẫm chân nhau, AI làm phần chép và chỉnh mã cũ,
người giữ đúng nghiệp vụ. Hạn: bảo vệ khoảng 15/12.

## 1. Năm nguyên tắc tăng tốc

1. **Mỗi người một lát dọc**: một repo service + các màn web gọi service đó. Không ai sửa thư mục
   của người khác, nên gần như không có xung đột merge.
2. **Hợp đồng API trước, mã sau**: ngày đầu mỗi người viết `service/openapi.yaml` và handler MSW
   bên web. Web và service làm song song, không chờ nhau.
3. **Không chờ identity**: service nào cũng tự ký token trong test bằng `signActorToken` của chassis
   (xem `scripts/smoke-service.mjs`), nên chạy, test độc lập từ ngày 1.
4. **AI chép, người duyệt nghiệp vụ**: AI đọc `../codecash`, chép và chỉnh; người đọc lại theo
   `NGHIEP_VU.md` và kiểm số liệu. CI (typecheck, lint, test, kiểm phần nền) là người duyệt đầu tiên.
5. **PR nhỏ, merge mỗi ngày**: một PR một việc (một endpoint, một màn), dưới khoảng 400 dòng tự
   viết (tệp chép nguyên không tính). Cuối ngày không để nhánh treo.

## 2. Chuẩn bị (mỗi người, 30 phút, ngày 27/11)

```bash
mkdir -p ~/btl && cd ~/btl
git clone https://github.com/Tunhoclaptrinh/Code-n-Cash.git codecash          # mã cũ, chỉ đọc
git clone git@github.com:Tunhoclaptrinh/smart-contract-web.git btl-frontend
git clone git@github.com:Tunhoclaptrinh/smart-contract-services.git btl-backend
git clone git@github.com:Tunhoclaptrinh/smart-contract-services-<tên>.git btl-backend-<tên>
cd btl-backend-<tên> && git remote add upstream git@github.com:Tunhoclaptrinh/smart-contract-services.git
pnpm install && pnpm test        # phải xanh trước khi viết dòng đầu tiên
```

Tên thư mục phải **đúng như trên**: `CLAUDE.md` của các repo chỉ tới `../codecash`. Mở công cụ AI ở
thư mục repo đang làm (không mở ở `~/btl`), để nó đọc đúng `CLAUDE.md`.

Trưởng nhóm làm trước, sáng 27/11: tạo repo service cho từng người (`scripts/new-service.sh <tên>`,
`gh repo create`, push, `scripts/protect-branches.sh`), thêm người vào repo (quyền Write), điền
`service/SERVICE.md` phần "Thông tin". Riêng `decision` là Python: tạo repo trống theo mục 3.

## 3. Chia việc

| Người | Repo service | Màn web (`btl-frontend/src/features/…`) | Saga, thí nghiệm |
| --- | --- | --- | --- |
| TV1 (trưởng nhóm) | identity; gateway, `compose.yaml` (repo cha `main`) | `platform` (tổ chức, người dùng, mời thành viên) | — |
| TV2 | contract | `contracts` (danh sách, wizard soạn, số hoá mốc) | bước 1 của S1 |
| TV3 | signing (gồm tài liệu) | `signing` (vị trí ký, trình tự, cách ký, xác minh công khai) | S1, phát S2 |
| TV4 | execution | `milestones` (việc cần làm, chi tiết, chứng từ), `disputes` | S3, nhận S2, F1 |
| TV5 | decision (Python FastAPI quanh `codecash_engine`), payment | truy vết quyết định, duyệt chi, phiên bản luật | S4, F2 |
| TV6 | audit (gồm thông báo); `packages/http-client`, outbox/consumer (phần nền) | `audit`, `dashboard`, thông báo | DLQ, k6 |

Ai sở hữu tệp cũ nào: `docs/DOI_CHIEU_CODECASH.md` (backend), `btl-frontend/docs/DOI_CHIEU_CODECASH.md` (web).

## 4. Lịch

| Ngày | Tất cả | Mốc kiểm |
| --- | --- | --- |
| T6 27/11 | Chuẩn bị (mục 2); điền `SERVICE.md` (dữ liệu, endpoint, nguồn CodeCash); viết `openapi.yaml` | Mỗi repo service CI xanh |
| T7 28/11 | Endpoint đầu tiên + test; màn đầu tiên trên MSW | Mỗi người 1 PR merge |
| CN 29/11 | Endpoint còn lại của luồng chính; identity xong token, refresh | |
| T2 30/11 | `compose.yaml` chạy đủ service; web gọi qua gateway | `docker compose up --wait` xanh |
| 01–03/12 | Nghiệp vụ chính từng service; S1, S3 | |
| T6 04/12 | **Ngày tích hợp**: chạy luồng demo §5 từ đầu tới cuối, sửa chỗ gãy | Luồng demo chạy hết |
| 05–07/12 | S2, S4; outbox, RabbitMQ, DLQ; màn còn lại | |
| T3 08/12 | **Đóng tính năng**: chỉ sửa lỗi, test, đo | |
| 08–10/12 | F1, F2 có số liệu; Postman ≥ 5 request mỗi service; độ phủ web ≥ 50% | |
| 11–12/12 | Báo cáo, slide, ảnh chụp | |
| 13–14/12 | Diễn tập 2 lần, có bấm giờ | |

Mỗi ngày: sáng `git pull` (repo service thêm `git fetch upstream` xem có phần nền mới không), tối
PR những gì đã xong. Vướng phần nền: nhắn trưởng nhóm, xử lý trong ngày.

## 5. Luồng demo (thứ tự ưu tiên khi thiếu thời gian)

1. Đăng ký công ty, tạo tài khoản (identity). 2. Soạn hợp đồng từ mẫu, mốc (contract). 3. Ký theo
lượt, niêm phong, hợp đồng có hiệu lực (signing, S1, S2). 4. Nộp chứng từ, phê duyệt (execution).
5. Engine ra quyết định có vết (decision). 6. Lập và chi lệnh (payment, S4). 7. Kiểm chuỗi băm,
thông báo (audit).

## 6. Vòng làm một việc (60–90 phút)

1. `git switch main && git pull && git switch -c feat/<phần>-<việc>`
2. Đưa AI prompt ở mục 7 (thay `<…>`).
3. Đọc danh sách luật AI liệt kê **trước** khi cho nó viết mã; sai nguồn thì sửa ngay lúc này.
4. Chạy dịch vụ, gọi thử qua Swagger (`/api/docs`) hoặc màn web.
5. `pnpm typecheck && pnpm lint && pnpm test` (web: `pnpm check`) xanh.
6. Commit, push, PR: mô tả "chuyển từ `codecash/<tệp>`, đã đổi …", có ảnh hoặc ví dụ request.

## 7. Prompt mẫu

**Viết hợp đồng API cho service (ngày đầu)**

> Đọc `CLAUDE.md`, `service/SERVICE.md`, `docs/DOI_CHIEU_CODECASH.md` mục <service>, và các tệp cũ
> được liệt kê trong `../codecash/apps/api/src`. Viết `service/openapi.yaml` (OpenAPI 3.1) cho các
> endpoint ở `SERVICE.md`: schema request/response lấy đúng tên trường cũ, mỗi endpoint có lỗi 4xx
> nghiệp vụ kèm `code`. Cập nhật bảng Endpoint trong `SERVICE.md`. Chưa viết mã.

**Chuyển một endpoint**

> Theo quy trình mục 5 của `CLAUDE.md`, chuyển `<phương thức đường dẫn>` từ
> `../codecash/apps/api/src/<tệp>` (hàm `<tên>`) vào service này. Trước khi viết mã: liệt kê các
> luật nghiệp vụ hàm cũ làm, mỗi luật kèm mục `NGHIEP_VU.md`. Sau đó chép, chỉnh import sang
> `@sc/nest-common`, chỉ dùng bảng của service này, viết test (một ca đúng, một ca lỗi), chạy kiểm
> tra đến xanh. Ghi rà soát và cải tiến vào `SERVICE.md`.

**Rà soát nghiệp vụ một phần đã chuyển**

> So `service/src/<tệp>` với `../codecash/apps/api/src/<tệp cũ>` và `../codecash/docs/NGHIEP_VU.md`
> mục <số>. Liệt kê: luật bị mất, luật đổi kết quả, mã lỗi đổi, trường hợp biên chưa có test. Không
> sửa mã; ghi kết quả vào mục "Rà soát" của `SERVICE.md`.

**Chuyển một màn web**

> Đọc `CLAUDE.md` của `btl-frontend`. Chuyển màn `<tên>` từ `../codecash/apps/web/src/features/<x>/`
> vào `src/features/<x>/`: route lazy trong `src/router.tsx`, mục menu trong
> `src/shared/layout/navConfig.ts`, chữ trong `src/locales/{vi,en}/<x>.json`, API theo
> `openapi.yaml` của service trong `src/features/<x>/api.ts`, handler MSW cho test. Viết ≥ 5 test.

**CI đỏ**

> CI báo lỗi sau: <dán log>. Tìm nguyên nhân, sửa trong phạm vi được sửa của `CLAUDE.md`. Nếu lỗi
> do kiểm phần nền thì hoàn tác tệp nền và cho tôi biết cần đổi gì ở repo cha.

## 8. Bẫy hay gặp khi vibe code

| Bẫy | Cách tránh |
| --- | --- |
| AI sửa chassis, cấu hình cho "chạy được" | CI chặn (`check-base-untouched`); yêu cầu thay đổi phần nền qua trưởng nhóm |
| AI bịa luật nghiệp vụ | Bắt nó trích mục `NGHIEP_VU.md` trước khi viết mã (bước 3 mục 6) |
| Dùng số thực cho tiền | Chuỗi thập phân như CodeCash; test với số lẻ |
| Đọc thẳng bảng của service khác | Gọi API qua gateway hoặc nhận sự kiện |
| Tin vai trò, mã tổ chức client gửi | Lấy từ `req.user` |
| PR khổng lồ, nhánh sống nhiều ngày | Một PR một việc, merge mỗi ngày |
| Nhánh tụt sau phần nền | `git merge origin/main` (repo service: PR `sync/base-<ngày>` theo `KIEN_TRUC_REPO.md`) |
