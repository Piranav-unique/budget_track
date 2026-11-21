# SmartSpend Flow (budget_track) — Master Project Context & Architecture

## 1. Overview
SmartSpend Flow is a fullstack personal finance management and expense tracking platform built for Piranav. It features live multi-account bank ledger tracking, daily corporate spending automation, AI financial insights powered by Groq AI, and automated Telegram bot expense logging powered by n8n.

---

## 2. Live Infrastructure & VPS Hosting
- **Server**: Ubuntu 24.04 LTS VPS on AIC Cloud
- **Host IP**: `148.113.8.216`
- **SSH Port**: `20093` (user: `root`)
- **Web App**: `https://budget.aurumgold.co.in` (PM2 process `budget-track`, port 3000)
- **Database Adminer**: `https://db.aurumgold.co.in` (Docker container `db-dashboard`, port 8088)
- **n8n Automation Engine**: `https://n8n.aurumgold.co.in` (Docker container `budget-n8n`, port 5678)
- **Cloudflare Tunnel**: `aurumgold-api` (PM2 `aurum-tunnel`) routing external HTTPS traffic securely to local VPS ports.
- **Project Directory on VPS**: `/var/www/budget_track`

---

## 3. Database Architecture (PostgreSQL 16)
- **Container**: `budget-postgres` on Docker network `budget-net`
- **Port Mapping**: `127.0.0.1:5433 -> 5432` (host port 5433 used because 5432 belongs to pre-existing container `ags-gold-db`)
- **Database Name**: `budget_db`
- **User**: `budget_user`
- **Persistent SSD Volume**: `budget_pg_data`

### Database Tables:
1. `users`: Stores user authentication records (Piranav is auto-assigned ID 1).
2. `expenses`: Records all transactions with `amount`, `category`, `description`, `source` (Account), `note`, `date`, `confidence`.
3. `bank_accounts`: Tracks live bank accounts and liquid balances:
   - `Current Bank Account` (Primary operational and corporate expense account)
   - `Savings Bank Account` (Emergency fund & salary holding)
   - `UPI Wallet` (GPay / PhonePe / Paytm)
   - `Cash in Hand`
4. `account_transfers`: Audit log of inter-account fund transfers (e.g. Current Account -> Savings).
5. `income_sources`: Stores salary and spot income credits.
6. `budgets`: Stores monthly limit, weekly allowance, savings goal, and income.

---

## 4. Financial Rules & Budget Allocation
- **Monthly Income**: ₹30,000 (30k salary)
- **Monthly Spending Budget**: ₹20,000 (~₹5,000/week or ~₹666/day)
- **Monthly Savings Target**: ₹10,000 (33% savings rate)
- **Daily Corporate Office Spend**: ₹50/day (office tea, coffee, snacks) = ₹1,500/month charged to Current Bank Account.
- **Discretionary Daily Spending**: ~₹616/day

---

## 5. Technology Stack & Key Modules
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Radix UI, Lucide React, React Router DOM.
  - `/` & `/dashboard`: Main financial dashboard with KPI cards, Corporate Spend tracker, and Bank Balances widget.
  - `/accounts`: Bank Accounts and Wallets management hub, atomic fund transfers, and balance calibration.
  - `/add-expense`: Expense entry with AI auto-categorization and account selector.
  - `/budget`: Budget slider and salary targets.
  - `/analytics`: Spending trends and category breakdowns.
- **Backend**: Node.js 20, Express, TypeScript, `pg` (node-postgres Pool), Passport.js.
  - Automatic balance sync: Logging an expense automatically deducts from the selected bank account; deleting an expense refunds it.
- **AI Engine**: Groq SDK (`openai/gpt-oss-120b`).
- **Automation**: n8n workflow for Telegram bot expense ingestion.

---

## 6. Deployment Command
To deploy updates to the live VPS:
```bash
cd /var/www/budget_track && git pull origin main && npm run build && pm2 restart budget-track --update-env
```
