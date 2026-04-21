# Mohite Newspaper Agency

Newspaper delivery billing web app built with Next.js, Prisma, SQLite, and shadcn/ui.

## Stack

- Next.js App Router
- TypeScript
- Prisma ORM v7 with SQLite adapter
- shadcn/ui with preset `b1aJCZFGU`
- Server components + server actions
- JSON API routes for CRUD and portal workflows

## Features

- Admin login
- Dashboard with customer and outstanding metrics
- Newspaper CRUD with pricing updates
- Customer CRUD with address and active status
- Customer subscription management with delivery-day configuration
- Monthly bill generation for all active customers
- Previous balance carry-forward for unpaid and partial bills
- Bill detail pages with UPI QR payload and manual payment marking
- Manual transaction management and bill linking
- Customer OTP login flow
- Customer portal with current bill, QR, subscriptions, and history
- Bill CSV export

## Project structure

```text
src/
  app/
    admin/
      login/
      customers/
      newspapers/
      bills/
      transactions/
    customer/
      login/
    api/
      admin/
      customer/
  components/
    admin-shell.tsx
    customer-login-form.tsx
    metric-card.tsx
    qr-bill-card.tsx
    status-badge.tsx
    ui/
  lib/
    actions.ts
    auth.ts
    billing.ts
    constants.ts
    format.ts
    prisma.ts
    validators.ts
prisma/
  schema.prisma
  setup.sql
  seed.ts
```

## Database schema

Main business tables:

- `Newspaper`
- `Customer`
- `CustomerNewspaper`
- `Bill`
- `Transaction`

Support tables:

- `AdminUser`
- `AuthSession`
- `CustomerOtp`

Important bill fields:

- `month`, `year`
- `totalAmount`
- `previousBalance`
- `grandTotal`
- `billNote`
- `qrPayload`
- `status`
- `generatedAt`
- `paidAt`

## Billing logic

- `basePrice` is treated as the monthly 7-day subscription price.
- If a customer receives a paper on only selected days, the bill prorates as:
  - `(monthly price / 7) * selected delivery day count`
- If a custom price is set on a customer subscription, it overrides the newspaper base price.
- Outstanding balance is calculated from older unpaid or partial bills minus recorded transactions.
- Each bill uses this UPI note format exactly:
  - `Bill No: CustomerID_MON_YY`
- Example:
  - `Bill No: 1024_MAR_26`

## API overview

Admin:

- `POST /api/admin/login`
- `GET,POST /api/admin/newspapers`
- `GET,PUT,DELETE /api/admin/newspapers/:id`
- `GET,POST /api/admin/customers`
- `GET,PUT,DELETE /api/admin/customers/:id`
- `GET /api/admin/bills`
- `POST /api/admin/bills/generate`
- `GET,PATCH /api/admin/bills/:id`
- `GET /api/admin/bills/export`
- `GET,POST /api/admin/transactions`

Customer:

- `POST /api/customer/login`
- `POST /api/customer/verify-otp`
- `GET /api/customer/me`
- `POST /api/logout`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Create the SQLite schema and seed sample data:

```bash
npm run db:setup
```

4. Start the app:

```bash
npm run dev
```

5. Open:

- `http://localhost:3000/admin/login`
- `http://localhost:3000/customer/login`

## Default credentials and seed data

Admin:

- Username: `admin`
- Password: `admin1234`

Seed customer phones:

- `9876543210`
- `9123456780`

In development, the customer OTP endpoint returns an OTP preview in the response and the login screen shows it after requesting OTP.

## Notes

- Prisma schema validation and client generation work in this environment.
- Prisma schema-engine commands like `prisma migrate dev` and `prisma db push` are currently failing here with a generic schema-engine error, so the repo includes `prisma/setup.sql` and `npm run db:setup` as the working bootstrap path.
- Runtime data access uses Prisma with the official SQLite adapter as documented by Prisma:
  - [SQLite adapter docs](https://www.prisma.io/docs/concepts/database-connectors/sqlite)
  - [Prisma v7 upgrade guide](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
