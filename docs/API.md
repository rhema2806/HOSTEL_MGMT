# API Reference

Base URL: `http://localhost:5000/api`

All endpoints except `POST /auth/login` require `Authorization: Bearer <token>`. Responses follow:

```json
{ "success": true, "data": { ... }, "pagination": { "page": 1, "limit": 10, "total": 42, "pages": 5 } }
{ "success": false, "message": "Room is already at full capacity", "errors": ["..."] }
```

Standard HTTP status codes are used: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `500`.

List endpoints accept `?page=1&limit=10&sort=field:asc|desc` plus endpoint-specific filters (documented inline in the route files, e.g. `server/src/routes/student.routes.js`).

## Auth

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/login` | public | `{ email, password }` → `{ token, user }` |
| POST | `/auth/logout` | any | Symmetry endpoint; client discards the token |
| GET | `/auth/me` | any | Current user (+ student profile and allocation, if a student) |
| POST | `/auth/change-password` | any | `{ currentPassword, newPassword }` |
| POST | `/auth/register` | admin | Creates a staff account (`admin`/`warden`/`mess_manager`). Students are created via `/students` |

## Users (admin only)

`GET /users`, `GET /users/:id`, `PATCH /users/:id`, `POST /users/:id/reset-password`, `DELETE /users/:id` (deactivates)

## Students

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/students` | admin, warden, mess_manager | Filters: `search, department, year, status, mess, hostel, room, unallocated` |
| POST | `/students` | admin, warden | Creates the login (student role) and profile together |
| GET | `/students/:id` | scoped | Admin: all. Warden: their hostels. Student: self only |
| PATCH | `/students/:id` | admin, warden | Full profile update |
| PATCH | `/students/me` | student | Self-service: `phone, dob, address, guardianName, guardianPhone, emergencyContact, photoUrl` |
| DELETE | `/students/:id` | admin, warden | Deactivates, releases bed |

## Hostels, blocks, rooms, beds

- `GET/POST/PATCH/DELETE /hostels`, `/hostels/:id` — admin manages, wardens can read within their scope
- `GET/POST/PATCH/DELETE /blocks?hostel=` — same scope rules
- `GET/POST/PATCH/DELETE /rooms?hostel=&block=&floor=&status=&vacancy=`, `GET /rooms/:id/beds` — computed bed list per room
- `GET /beds/available?hostel=&block=` — rooms with free beds, for the allocation screen

## Allocations

| Method | Path | Role |
|---|---|---|
| GET | `/allocations?status=active\|vacated\|transferred\|all&hostel=&room=&student=` | admin, warden |
| GET | `/allocations/me` | student — current bed, roommates, history |
| POST | `/allocations` `{ studentId, roomId, bedNumber, remarks? }` | admin, warden |
| POST | `/allocations/transfer` `{ studentId, roomId, bedNumber, remarks? }` | admin, warden |
| POST | `/allocations/:id/vacate` `{ remarks? }` | admin, warden |

Business rules enforced server-side: one active allocation per student, one active occupant per bed, `bedNumber` within `1..room.capacity`, room must be `available`.

## Mess, menus, attendance, feedback

- `GET/POST/PATCH/DELETE /messes`
- `GET /menus?mess=&from=&to=`, `GET /menus/today`, `PUT /menus` (upsert by mess+date), `DELETE /menus/:id`
- `GET /meal-attendance?student=&mealType=&date=|from=&to=`, `GET /meal-attendance/roster?mess=&date=&mealType=`, `POST /meal-attendance` (single, rejects duplicates with 409), `POST /meal-attendance/bulk` (idempotent upsert)
- `POST /feedback` (student), `GET /feedback`, `GET /feedback/summary?mess=&from=&to=`

## Mess bills

| Method | Path | Role |
|---|---|---|
| GET | `/mess-bills?status=&month=&mess=&student=&hostel=&search=` | scoped (student: own only; warden: read-only) |
| POST | `/mess-bills/generate` `{ mess, month, dueDate, otherCharges? }` | admin, mess_manager |
| GET | `/mess-bills/:id` | scoped |
| PATCH | `/mess-bills/:id` `{ otherCharges?, discount?, dueDate?, remarks? }` | admin, mess_manager |
| POST | `/mess-bills/:id/payments` `{ amount, method, reference? }` | admin, mess_manager |
| DELETE | `/mess-bills/:id` | admin |

Status is derived automatically from `paidAmount` vs `finalAmount` and `dueDate` (`pending → partially_paid/overdue → paid`).

## Complaints

`GET /complaints?category=&status=&priority=&hostel=&search=`, `POST /complaints` (student), `GET /complaints/:id`, `PATCH /complaints/:id` `{ status?, priority?, assignedTo?, resolution? }`, `DELETE /complaints/:id` (admin)

## Leave requests

`GET /leaves?status=&hostel=&student=`, `POST /leaves` (student), `GET /leaves/:id`, `PATCH /leaves/:id/decision` `{ status: approved|rejected, remarks? }`, `PATCH /leaves/:id/cancel` (student, own)

## Notices

`GET /notices?category=` (students see only notices targeted at them and currently published), `POST /notices`, `PATCH /notices/:id`, `DELETE /notices/:id` — writers restricted to their own scope (warden → their hostel, mess manager → their mess, admin → any)

## Notifications

`GET /notifications?unread=true`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`, `POST /notifications/broadcast` (admin)

## Reports

`GET /reports/hostel/occupancy|vacancies|students`, `GET /reports/mess/daily-attendance|monthly-usage|billing|feedback`, `GET /reports/complaints/by-category|trends`, `GET /reports/leaves`

## Dashboard

`GET /dashboard` — returns role-specific data (see `server/src/controllers/dashboard.controller.js`)

## Business rules and where they're enforced

| Rule | Enforced by |
|---|---|
| One active bed per student | Partial unique index on `RoomAllocation.student` |
| One active occupant per bed | Partial unique index on `RoomAllocation.{room, bedNumber}` |
| Room capacity respected | `allocation.service.js` checked before insert, plus the unique index as a final backstop |
| No duplicate meal attendance | Unique index on `MealAttendance.{student, date, mealType}` |
| One bill per student per month | Unique index on `MessBill.{student, month}` |
| Leave end date ≥ start date | Mongoose schema validator + controller check |
| No overlapping leave requests | Controller check against existing pending/approved leaves |
| Payment cannot exceed balance | `billing.service.recordPayment` |
| Role/ownership checks | `middleware/auth.js` + per-module `services/scope.service.js` / `services/studentScope.service.js` |
