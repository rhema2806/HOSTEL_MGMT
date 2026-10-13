# Online Hostel and Mess Management System

A full-stack MERN application for managing hostel accommodation and mess operations for a college: student records, hostel/room/bed allocation, mess menus, meal attendance, billing, complaints, leave requests, notices, notifications and reports, behind role-based dashboards for Students, Wardens, Mess Managers and Admins.

## Features

- JWT authentication with bcrypt password hashing and forced password change on first login
- Role-based access control enforced entirely on the backend (never just hidden in the UI)
- Student management with search, filter, sort and server-side pagination
- Hostel → Block → Room → Bed hierarchy; beds are computed from room capacity plus active allocations
- Room allocation, transfer and vacate flows with database-level uniqueness guarantees against double-booking
- Mess menus (breakfast/lunch/snacks/dinner), meal attendance with duplicate prevention, mess feedback
- Monthly mess billing generated from actual attendance, with manual payment recording (Razorpay-ready)
- Complaints with category-based routing, status history and role-scoped visibility
- Leave requests with date validation, overlap checks and approval workflow
- Notices with targeted audiences (all / hostel / mess / year / department)
- Internal notification system (bell icon, unread count, mark as read)
- Role-specific dashboards and filterable, exportable (CSV) reports
- Centralized error handling, consistent API responses, environment-based configuration

## Technology stack

**Frontend:** React 18, Vite, React Router, Axios, Material UI (MUI), Context API
**Backend:** Node.js, Express, Mongoose, JWT, bcryptjs, express-rate-limit, helmet
**Database:** MongoDB (local or Atlas)

## Folder structure

```text
Online-Hostel-Mess-Management/
├── server/                 REST API (Express + Mongoose)
│   ├── src/
│   │   ├── config/         env loading, DB connection
│   │   ├── controllers/    request handlers
│   │   ├── middleware/     auth, error handling
│   │   ├── models/         Mongoose schemas
│   │   ├── routes/         route definitions
│   │   ├── services/       business logic (allocation, billing, scope, notifications)
│   │   ├── validators/     request body validation
│   │   ├── utils/          helpers, constants, seed script
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── client/                 React app (Vite)
│   ├── src/
│   │   ├── components/     reusable UI (DataTable, FormDialog, StatusBadge, ...)
│   │   ├── context/        AuthContext, ToastContext
│   │   ├── hooks/          useList, useFetch, useDebounce
│   │   ├── layouts/        Sidebar, Navbar, DashboardLayout
│   │   ├── pages/          one file per screen, grouped by module
│   │   ├── routes/         route table and role guards
│   │   └── services/       Axios instance
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── API.md               endpoint reference
│   └── postman_collection.json
└── README.md
```

## Prerequisites

- Node.js 18 or later and npm
- MongoDB, either:
  - **Local**: MongoDB Community Server running on `mongodb://127.0.0.1:27017`, or
  - **Atlas**: a free cluster at https://www.mongodb.com/cloud/atlas

## Installation

```bash
git clone <this-repo>   # or unzip the project
cd Online-Hostel-Mess-Management
```

### 1. Backend setup

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/hostel_mess   # or your Atlas connection string
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
CLIENT_URL=http://localhost:5173
```

```bash
npm install
npm run seed     # loads realistic demo data (wipes the configured database first)
npm run dev      # starts the API on http://localhost:5000
```

### 2. Frontend setup

In a second terminal:

```bash
cd client
cp .env.example .env    # leave VITE_API_URL empty for local dev (Vite proxies /api)
npm install
npm run dev              # starts the app on http://localhost:5173
```

Open http://localhost:5173 in your browser.

## Running the application

- `npm run dev` in `server/` — API with auto-restart on file changes
- `npm run dev` in `client/` — Vite dev server with hot reload
- `npm run build` in `client/` — production build to `client/dist/`
- `npm start` in `server/` — production start (no auto-restart)

## Demo credentials

After running `npm run seed` in `server/`:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@hostel.edu` | `Admin@123` |
| Warden (Kaveri Boys Hostel) | `warden@hostel.edu` | `Warden@123` |
| Warden (Vaigai Girls Hostel) | `warden2@hostel.edu` | `Warden@123` |
| Mess Manager | `mess@hostel.edu` | `Mess@123` |
| Student | any seeded student email, e.g. `arun.kumar@student.edu` | `Student@123` |

These are development-only credentials created by the seed script — never used as defaults in production code. `npm run seed` refuses to run when `NODE_ENV=production`.

## API overview

Full endpoint reference: [`docs/API.md`](docs/API.md). A ready-to-import collection is at [`docs/postman_collection.json`](docs/postman_collection.json) (set the collection variable `baseUrl` to `http://localhost:5000/api`, log in via `POST /auth/login`, and the collection's tests script stores the token automatically for subsequent requests).

Base URL: `http://localhost:5000/api`

```text
/auth            login, logout, current user, change password, staff registration (admin only)
/users           admin: manage staff accounts
/students        student CRUD, self-service profile updates
/hostels /blocks /rooms /beds     hostel structure and bed availability
/allocations     allocate, transfer, vacate beds
/messes /menus   mess info and daily/weekly menus
/meal-attendance marking and roster
/mess-bills      generate bills, record payments
/complaints      file and triage complaints
/leaves          apply for and decide on leave
/notices         targeted announcements
/notifications   in-app notifications
/feedback        meal ratings
/reports         hostel, mess, complaint and leave reports
/dashboard       role-specific dashboard data
```

Every response follows `{ "success": true, "data": ... }` on success or `{ "success": false, "message": "...", "errors"?: [...] }` on failure. List endpoints add a `pagination` object.

## Database structure

See the data model notes in `docs/API.md`. In short:

- `beds` and `floors` are not separate collections — a floor is a number on `Room`, and a bed is `1..room.capacity`, computed from active `RoomAllocation` documents. This keeps occupancy always consistent with the source of truth (allocations) instead of a second table that can drift.
- Two partial unique indexes on `RoomAllocation` (`{student}` and `{room, bedNumber}`, both filtered to `status: 'active'`) make double-booking impossible at the database level, even under concurrent requests — not just checked in application code.
- Unique indexes also enforce one bill per student per month, one attendance record per student/date/meal, and one feedback entry per student/date/meal.

## Security notes

- Passwords are hashed with bcrypt (cost factor 12) and never returned by the API.
- JWTs are short-lived (`JWT_EXPIRES_IN`, default 8h) and invalidated if the password changes.
- Every route is protected by `authenticate` + `authorize(...)` middleware; students, wardens and mess managers are further restricted to their own data or assigned scope inside each controller — the frontend hiding a button is not treated as security.
- Public self-registration is disabled; only an admin can create staff accounts, and students are only created through the Students module.
- Login is rate-limited (30 attempts / 15 minutes per IP).
- CORS is restricted to the origins listed in `CLIENT_URL`.

## Future enhancements

The codebase is structured so the following can be added without restructuring existing modules:

- **Payment gateway (Razorpay)** — `Payment.gateway` already reserves `provider`/`orderId`/`paymentId`/`signature` fields; `billing.service.recordPayment` is the single place a "Pay Now" verification callback would call into.
- **Email notifications** — `notification.service.js` is the single choke point where every in-app notification is created; adding an email transport there covers leave, complaint, bill and notice events at once.
- **PDF reports** — the `/reports/*` endpoints already return the structured data; a PDF renderer can consume the same responses.
- **QR-based meal attendance** — `MealAttendance.method` already distinguishes `'manual'` from `'qr'`; a QR endpoint would call the same underlying marking logic as the bulk/roster endpoints.

## Testing

`server/tests/` contains a starting point using Node's built-in test runner (`npm test`). The most safety-critical rules (capacity limits, duplicate allocation, duplicate attendance, date validation) are enforced by MongoDB schema validation and unique indexes, in addition to the application-level checks in the service layer — see `docs/API.md` for the full list of business rules and where each is enforced.
