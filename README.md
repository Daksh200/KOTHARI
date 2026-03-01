# Furnish POS Application

This workspace contains the **Furnish POS** system: a full-stack point‑of‑sale application for a furnishing shop. Backend APIs are implemented with Next.js API routes and Prisma. The frontend uses Next.js App Router with React, TypeScript and Tailwind CSS to deliver a cashier‑friendly interface.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment configuration

Before deploying you will need to set several environment variables in the hosting platform or `.env` file:

- `DATABASE_URL` – Prisma/PostgreSQL connection string
- `JWT_SECRET` – secret used to sign JSON web tokens
- `PRINTER_TCP_HOST` – (optional) thermal printer TCP hostname or IP
- `PRINTER_TCP_PORT` – (optional) thermal printer TCP port (e.g. 9100)

If `PRINTER_TCP_*` are unset, ESC/POS output will be written to `./.prints` when the print endpoint is called; this is useful for staging without a physical printer.

> **Database setup:** after updating the Prisma schema (e.g. adding fields such as `isActive`, `city`, `pincode`) run
> 
> ```bash
> npx prisma migrate dev   # apply migrations locally
> npx prisma generate      # regenerate client types for TypeScript
> ```
> 
> In production or staging use `npx prisma migrate deploy` instead of `migrate dev`.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### End-to-End Tests

The repository includes a set of Playwright tests under `tests/` which exercise the POS keyboard workflow. To run them:

```bash
npm install # ensure dependencies including @playwright/test
npm run dev  # start the app
npm run test:e2e
```
# KOTHARI
