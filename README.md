# 💸 SmartSpend Flow — AI-Powered Financial & Corporate Expense Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Groq AI](https://img.shields.io/badge/Groq_AI-Llama_3.3-F05032?style=for-the-badge)](https://groq.com/)

**SmartSpend Flow** is a full-stack, enterprise-grade personal and corporate financial management ecosystem. Designed for modern professionals and tech employees, it bridges the gap between daily personal budgeting, multi-bank account ledgers, corporate reimbursement tracking, and seamless hands-free mobile automation via Telegram and n8n.

---

## 🌟 Key Features

### 🏦 Multi-Bank Account & Wallet Ledger
* **Account Types**: Current Account, Savings Account, UPI Wallet (GPay/PhonePe), and Cash in Hand.
* **Live Balance Ledger**: Tracks opening balance, real-time debits/credits, and inter-account fund transfers (`/api/accounts/transfer`).
* **Visual Card Interface**: Color-coded account badges with masked account numbers and liquid net-worth metrics.

### 🤖 Automated Indian Bank SMS Parser & Webhook
* **Instant Bank Parsing**: Processes raw transaction SMS alerts from major Indian banks (**HDFC Bank, SBI, ICICI Bank, Axis Bank, Kotak Mahindra, PNB, Canara Bank, IndusInd**).
* **Hybrid Parser**: High-speed Regex pattern matching combined with **Groq AI (Llama 3.3)** for complex or unformatted messages.
* **Auto-Balance Sync**: Extracts `Avl Bal` from SMS and synchronizes the real-time bank balance automatically.
* **Auto-Routing**: Automatically differentiates between **Debits (Expenses)** and **Credits (Salary/Income)**.

### 👔 Corporate Claims & Employee Reimbursements
* Tailored for IT and corporate professionals (e.g. Aptean).
* Mark expenses as **Reimbursable** (Broadband, Client Outings, Commute, Certifications).
* Track claim lifecycle: `Pending` ➔ `Submitted to Finance` ➔ `Approved` ➔ `Reimbursed`.
* **1-Click Export**: Download formatted CSV claim reports ready for HR/Finance ERP portals.

### ⚡ Quick Spot Income & Sudden Bonus
* Rapid modal to log one-time spot income, performance bonuses, freelance earnings, or investment dividends.
* Quick preset increment buttons (`+₹1k`, `+₹2k`, `+₹5k`, `+₹10k`, `+₹25k`, `+₹50k`).
* Automatically adjusts and recalculates monthly spending limits in real-time.

### 📱 Telegram Bot & n8n Integration
* Built-in webhooks (`/api/webhook/telegram`, `/api/webhook/n8n`, `/api/webhook/bank-sms`).
* Forward SMS messages or type simple text (`Lunch 250`, `Petrol 500`) to log expenses instantly to the `piranav` profile.
* Generates formatted Markdown confirmation replies for Telegram chat.

### 🔒 Model Context Protocol (MCP) Server
* Standalone MCP Server (`mcp-server/`) allowing AI agents (Claude, Gemini, cursor, etc.) to securely query financial stats.
* Time-based OTP verification with token rotation and rate limiting.

---

## 🏗️ Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │             User Channels               │
                      └────┬─────────────────┬──────────────────┘
                           │                 │
              [Telegram Bot / n8n / SMS]     │   [Web Browser SPA]
                           │                 │   (React 18 + Tailwind)
                           ▼                 ▼
              ┌─────────────────────────────────────────────────┐
              │           Express.js API Gateway                │
              │  • Auth & Session Guard                         │
              │  • Bank SMS Parser (Regex + Groq AI)            │
              │  • Ledger & Transfer Engine                     │
              │  • Corporate Reimbursement Tracker              │
              └────────────────────┬────────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────────────┐
              ▼                                                 ▼
┌───────────────────────────┐                     ┌───────────────────────────┐
│     PostgreSQL Engine     │                     │     Groq AI Inference     │
│  • users / expenses       │                     │  • Llama-3.3-70b-versatile│
│  • bank_accounts          │                     │  • Smart Categorization   │
│  • income_sources         │                     │  • Financial Insights     │
│  • budgets / mcp_tokens   │                     └───────────────────────────┘
└───────────────────────────┘
```

---

## 🚀 API Endpoints Summary

### Webhooks & Ingestion
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/webhook/bank-sms` | Ingests raw bank SMS, auto-updates balance & records transaction |
| `POST` | `/api/webhook/telegram` | Ingests Telegram bot messages or forwarded SMS |
| `POST` | `/api/webhook/n8n` | Inbound n8n workflow integration |

### Bank Accounts & Ledgers
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/accounts` | Fetch all bank accounts & liquid net balance |
| `POST` | `/api/accounts` | Create new bank account / wallet |
| `PUT` | `/api/accounts/:id` | Update balance or account details |
| `POST` | `/api/accounts/transfer`| Record inter-account fund transfer |
| `GET` | `/api/accounts/transfers`| List transfer audit log |

### Corporate Reimbursements
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/reimbursements` | List all reimbursable expenses with pending/approved totals |
| `PATCH` | `/api/reimbursements/:id` | Update claim status (`submitted`, `approved`, `reimbursed`) |
| `GET` | `/api/reimbursements/export` | Export reimbursement ledger as CSV |

### Data Exports & Summary
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/export/csv` | Download complete accounting ledger (expenses & income) |
| `GET` | `/api/export/summary` | Get monthly financial summary JSON & budget score |

---

## 🛠️ Local Development Setup

### 1. Prerequisites
* **Node.js**: v18.0.0 or higher
* **PostgreSQL**: v14 or higher

### 2. Clone and Install
```bash
git clone https://github.com/Piranav-unique/budget_track.git
cd budget_track
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/budget_db
SESSION_SECRET=your_super_secret_session_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
TELEGRAM_WEBHOOK_SECRET=your_telegram_secret
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Deployment (VPS + PM2 + Cloudflare)

On your Ubuntu/Debian Cloud VPS:

```bash
cd /root/budget_track
git pull origin main
npm install
npm run build
pm2 restart all
```

---

## 👤 Author
**Piranav MN**  
* GitHub: [@Piranav-unique](https://github.com/Piranav-unique)  
* Project: [SmartSpend Flow](https://github.com/Piranav-unique/budget_track)
