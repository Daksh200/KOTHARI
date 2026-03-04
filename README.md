# Furnish POS Application

This workspace contains the **Furnish POS** system: a full-stack point‑of‑sale application for a furnishing shop. Backend APIs are implemented with Next.js API routes and Prisma with PostgreSQL. The frontend uses Next.js App Router with React, TypeScript and Tailwind CSS to deliver a cashier‑friendly interface.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

- **Dashboard** - Sales summary and quick navigation
- **Billing/POS** - Counter billing with product search
- **Products** - Product catalog and pricing management
- **Inventory** - Stock in / out / adjustment
- **Customers** - Customer management with advance payments
- **Reports** - Admin reports and top products
- **Day Book** - Daily transactions record

## Getting Started

First, run the development server:

```
bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Default Login Users

Run once to create users:

```
bash
node create-users.js
```

Then login with:

- `admin@furnish.local / Admin@1234` (Admin access)
- `staff@furnish.local / Staff@1234` (Staff access)

## Environment Configuration

Before deploying you will need to set several environment variables in the hosting platform or `.env` file:

- `DATABASE_URL` – Prisma/PostgreSQL connection string
- `JWT_SECRET` – secret used to sign JSON web tokens
- `PRINTER_TCP_HOST` – (optional) thermal printer TCP hostname or IP
- `PRINTER_TCP_PORT` – (optional) thermal printer TCP port (e.g. 9100)

If `PRINTER_TCP_*` are unset, ESC/POS output will be written to `./.prints` when the print endpoint is called; this is useful for staging without a physical printer.

> **Database setup:** after updating the Prisma schema run:
> 
> 
```
bash
> npx prisma migrate dev   # apply migrations locally
> npx prisma generate      # regenerate client types for TypeScript
> 
```
> 
> In production or staging use `npx prisma migrate deploy` instead of `migrate dev`.

## Core Pages

- `/dashboard` - Sales summary and quick navigation
- `/billing` - Counter billing (POS)
- `/products` - Product catalog and pricing
- `/inventory` - Stock in / out / adjustment
- `/reports` - Admin reports and top products

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## End-to-End Tests

The repository includes a set of Playwright tests under `tests/` which exercise the POS keyboard workflow. To run them:

```
bash
npm install # ensure dependencies including @playwright/test
npm run dev  # start the app
npm run test:e2e
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── billing/          # Billing/POS page
│   ├── dashboard/        # Dashboard page
│   ├── products/         # Products management
│   ├── inventory/        # Inventory management
│   ├── customers/        # Customer management
│   ├── reports/          # Reports page
│   └── login/            # Login page
├── components/           # React components
├── lib/                  # Utility libraries
├── prisma/               # Database schema and migrations
└── tests/                # E2E tests
```

---

**KOTHARI Furnishing POS** - Built with Next.js, Prisma, PostgreSQL, and Tailwind CSS
