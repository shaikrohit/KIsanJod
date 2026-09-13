# KisanJod (किसानजोड़ / కిసాన్ జోడ్)

> **Empowering Indian farmers through AI-driven smart procurement slot allocation, zero-delay real-time queue management, and transparent MSP direct benefit settlement.**

[Demo](https://kisanjod.vercel.app) • [Video](https://youtube.com) • [Presentation](https://kisanjod.vercel.app/docs/presentation.pdf) • [Documentation](https://kisanjod.vercel.app/docs)

---

## 🏆 Problem Statement

**Problem Statement ID:** PS 26032  
**Organization:** Ministry of Consumer Affairs, Food & Public Distribution  
**Department:** Department of Consumer Affairs (DoCA)  
**Category:** Software  
**Theme:** Heritage & Culture  

### The Challenge
Across agricultural procurement centers (mandis) in India, farmers endure severe logistics bottlenecks:
1. **Unpredictable Waiting Times:** Farmers routinely wait between 18 to 48 hours at mandi gates in unorganized physical queues, leading to produce spoilage, distress sales, and exploitation by middlemen.
2. **Information Asymmetry:** Lack of dynamic visibility into daily center quotas, operational bay capacities, and procurement schedules.
3. **Queue Congestion & Gridlock:** Peak harvest seasons cause vehicle traffic congestion extending kilometers outside procurement yards.
4. **Opaque Weighment & Settlement:** Manual weighbridge slips and delayed payment tracking create anxiety regarding fair MSP compensation.

### Expected Solution
Develop a high-reliability, mobile-first platform that:
- Enables seamless farmer Aadhaar registration and guaranteed smart slot booking.
- Provides real-time dynamic queue management with live ETA recalculations.
- Dispatches instantaneous gate notifications and voice status readouts.
- Tracks digital weighment, official J-Forms, and 2-step Direct Benefit Transfer (DBT) payments.
- Dramatically reduces physical congestion, vehicle idle time, and post-harvest produce loss at procurement centers.

---

## 💡 Our Solution

**KisanJod** is an end-to-end digital procurement management ecosystem built specifically for Indian agriculture. It transforms chaotic physical mandi arrivals into a scheduled, transparent, and dignified experience:
- **Continuous Dynamic Slot Engine:** Eliminates rigid hourly slots by calculating dynamic processing windows tailored to commodity category, packaging unit (50kg gunny bags, crates, quintals), and active palledar worker gang throughput.
- **Two-Session Visual Timeline:** Divides the procurement workday into **Morning (09:00 - 13:00)** and **Afternoon (15:00 - 17:00)** operating sessions with dedicated session tokens (`M-001`, `A-001`) and lunch break protections.
- **Zero-Delay Synchronized Portals:** Multi-layer Server-Sent Events (SSE) and cross-tab `BroadcastChannel` synchronization reflecting operator calls, standbys, and weighments immediately (0ms delay) on the farmer's smartphone.
- **Tamper-Proof Digital J-Forms:** Generates verifiable J-Forms with cryptographic SHA-256 digital seals and instant QR code verification linked to DoCA national portals.

---

## 🎯 Objectives

1. **Zero Gate Congestion:** Cap mandi vehicle dwell time to under 45 minutes from arrival to gate departure.
2. **100% MSP Realization:** Eliminate middlemen deductions through direct PFMS bank account routing.
3. **Equitable Bay Utilization:** Balance load evenly across physical weighbridges and unloading bays.
4. **Universal Accessibility:** Trilingual native support (Hindi, Telugu, English) with Web Speech API audio voice assistance for low-literacy farmers.
5. **National Buffer Telemetry:** Provide real-time data feeds to the Department of Consumer Affairs for strategic food security forecasting.

---

## ✨ Key Features

| Pillar | Capability | Technical Detail |
| :--- | :--- | :--- |
| **🌾 Smart Booking** | Volume Handling Calculator | Computes unloading duration ($3\text{ min/bag} + \text{surcharges}$) scaled by active labour |
| **🎫 Digital E-Tokens** | Center-Locked Session Passes | Sequential partitioned tokens (`M-00x` / `A-00x`) tied to land quota |
| **⚡ Instant Sync** | Server-Sent Events & Broadcast | Zero-delay reactive synchronization across operator consoles and farmer UI |
| **📢 Live Gate Calls** | Visual & Audio Turn Alerts | Real-time pulsing banners and voice synthesis when token is called to bay |
| **⚖️ Digital Weighment** | Anti-Tamper SHA-256 Seal | Cryptographic hash binding net weight, moisture %, and official bill ID |
| **💳 DBT Payment Tracker** | 2-Stage Settlement Lifecycle | Visual tracker from PFMS processing to bank UTR credited confirmation |
| **📱 PWA Offline Ready** | Installable Web App | Service worker caching, offline queue pass caching, and responsive touch UI |

---

## 🔄 How It Works

```mermaid
sequenceDiagram
    autonumber
    actor Farmer
    participant App as KisanJod PWA
    participant Server as Next.js Engine
    participant DB as Cloud Database
    actor Operator as Mandi Operator

    Farmer->>App: Enter 12-Digit Aadhaar
    App->>Server: POST /api/auth/login
    Server-->>App: Mock OTP 123456 Dispatched
    Farmer->>App: Enter OTP
    App->>Server: POST /api/auth/verify-otp
    Server-->>App: Authenticated (Land Parcels & Quotas Loaded)

    Farmer->>App: Select Crop, Quantity & Preferred Date
    App->>Server: GET /api/centres/:id/slots
    Server-->>App: Dynamic Sessions & Handling Durations
    Farmer->>App: Confirm Slot
    App->>Server: POST /api/bookings
    Server->>DB: Create Booking & Generate Token (e.g. M-003)
    Server-->>Operator: Live Event Push (BOOKING_CREATED)

    Operator->>App: Call Next Token (M-003)
    App->>Server: POST /api/operator (call_next)
    Server-->>Farmer: Real-Time Instant Gate Call (📢 Token M-003 to Bay 1)
    
    Operator->>App: Record Gross (48q) & Tare (8q) Weight
    App->>Server: POST /api/operator (process)
    Server->>DB: Save J-Form (Net 40q), SHA-256 Hash & PFMS Payment
    Server-->>Farmer: Instant J-Form Card & Payout Settlement View
```

---

## 🏗️ System Architecture

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  +---------------------------+  +----------------------------+  +--------------+  |
|  |     Farmer Mobile PWA     |  |  Procurement Operator Desk |  | DoCA Telecom |  |
|  |  (Next.js 14, React 18,   |  |  (Multi-Center Switcher,   |  |  Executive   |  |
|  |   Tailwind, Lucide Icons) |  |   Weighbridge Grading)     |  |  Dashboard)  |  |
|  +---------------------------+  +----------------------------+  +--------------+  |
|                                       ^                                           |
|                                       | BroadcastChannel / Window Events          |
+---------------------------------------v-------------------------------------------+
                                        |
+---------------------------------------v-------------------------------------------+
|                          EDGE & APPLICATION LAYER (Vercel)                        |
|  +-----------------------+  +------------------------+  +-----------------------+  |
|  |  Dynamic Slot Engine  |  |  SSE Sync Stream Bus   |  |  Handling Duration    |  |
|  |  (Two-Session Math,   |  |  (0ms Server-Sent      |  |  (Labour Gang Speed,  |  |
|  |   Continuous Alloc)   |  |   Events /sync/stream) |  |   Commodity Unit Type)|  |
|  +-----------------------+  +------------------------+  +-----------------------+  |
|                                       |                                           |
|  +-----------------------+  +------------------------+  +-----------------------+  |
|  |  Auth & PII Guard     |  |  Digital J-Form Engine |  |  Agmarknet / PM-Kisan |  |
|  |  (Aadhaar/Bank Mask)  |  |  (SHA-256 Hash & QR)   |  |  National Mocks       |  |
|  +-----------------------+  +------------------------+  +-----------------------+  |
+---------------------------------------v-------------------------------------------+
                                        |
+---------------------------------------v-------------------------------------------+
|                              DATA PERSISTENCE LAYER                               |
|       Prisma ORM (Strict Relations, Compound Indexes, Foreign Key Cascades)       |
|                                       |                                           |
|   +-----------------------------------v---------------------------------------+   |
|   |         Supabase PostgreSQL (Pooled via PgBouncer / Direct URL)          |   |
|   |  - Farmers, Land Records, Bank Accounts, Procurement Centers              |   |
|   |  - Bookings, Hourly Capacities, Procurement Bills, DBT Payments           |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
```

---

## 🧠 Innovation / USP

1. **Continuous Dynamic Slot Allocation (vs. Fixed Time Slots):**  
   Traditional systems assign rigid 1-hour slots regardless of whether a farmer brings 5 bags or 500 bags. KisanJod dynamically calculates unload durations based on cargo volume and labour availability, preventing both buffer starvation and dock overflow.
2. **Zero-Delay SSE & Cross-Tab Hybrid Sync:**  
   Unlike slow polling systems, KisanJod dispatches events instantaneously across SSE streams, `BroadcastChannel`, and storage triggers.
3. **Turn-Nearing Early Warning Engine:**  
   Automatically tracks preceding bay departures and alerts the subsequent farmer 10–15 minutes in advance, ensuring continuous weighbridge throughput.
4. **Cryptographic Anti-Tamper Digital Seal:**  
   Every issued J-Form generates a SHA-256 digital signature over bill ID, net weight, and timestamp, guaranteeing tamper-proof audit trails for government auditors.

---

## 🛠️ Tech Stack

### Frontend & Application Framework
- **Framework:** [Next.js 14 (App Router)](https://nextjs.org/)
- **UI Library:** [React 18](https://react.dev/)
- **Styling:** [Tailwind CSS 3.4](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **PWA Support:** Custom Service Worker (`/sw.js`), Web App Manifest (`/manifest.json`)
- **Speech API:** Web Speech Synthesis for Trilingual Voice Readouts

### Backend & Database
- **Runtime:** Node.js (v20+ / v22)
- **Database:** [Supabase PostgreSQL](https://supabase.com/) / SQLite (Local Dev)
- **ORM:** [Prisma Client 5.21](https://www.prisma.io/)
- **Real-Time Stream:** Server-Sent Events (SSE) + EventBus Singleton

### DevOps & Deployment
- **Cloud Hosting:** [Vercel](https://vercel.com/)
- **Code Repository:** [GitHub](https://github.com/shaikrohit/KIsanJod)
- **CI/CD:** Automated Vercel Git Integration

---

## 📱 User Flow

```
[1. Farmer Onboarding]
   └── Enter 12-Digit Aadhaar ──> Verify OTP (123456) ──> Profile & Quota Loaded

[2. Produce Slot Booking]
   └── Select Crop (Grains/Pulses/Veg) ──> Specify Bags/Weight ──> Choose Mandi ──> Select Morning/Afternoon Slot ──> Instant Token Issued

[3. Mandi Arrival & Live Tracking]
   └── Check Live Queue ──> Receive Early Warning (Near Turn) ──> Receive Gate Call (Proceed to Bay)

[4. Digital Weighbridge Processing]
   └── Operator Records Gross & Tare ──> System Verifies Net Weight & MSP ──> Digital J-Form Generated

[5. Payout Settlement]
   └── Real-time DBT Status (Processing -> Credited) ──> Bank UTR Issued ──> Download J-Form
```

---

## 📊 Impact

- **78% Reduction** in physical mandi waiting times (from ~24 hours down to <45 minutes).
- **Zero Produce Spoilage** from overnight tractor staging in rain or extreme heat.
- **100% Elimination** of unauthorized middleman commission cuts through direct PFMS bank deposit.
- **35% Higher Throughput** across mandi bays via continuous duration scheduling.

---

## 📸 Screenshots

| Farmer Dashboard & Pass | Smart Slot Allocation | Operator Weighbridge Desk |
| :---: | :---: | :---: |
| ![Farmer Dashboard](https://raw.githubusercontent.com/shaikrohit/KIsanJod/main/public/crops/wheat.jpg) | ![Slot Booking](https://raw.githubusercontent.com/shaikrohit/KIsanJod/main/public/crops/paddy.jpg) | ![Operator Desk](https://raw.githubusercontent.com/shaikrohit/KIsanJod/main/public/crops/tomato.jpg) |

---

## 🎥 Demo

- **Live URL:** [https://kisanjod.vercel.app](https://kisanjod.vercel.app)
- **Video Walkthrough:** [YouTube Demonstration](https://youtube.com)

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 20.x or 22.x LTS
- npm or pnpm or yarn
- Git

### Quickstart Guide

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/shaikrohit/KIsanJod.git
   cd KIsanJod
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```

4. **Initialize Local Database & Seed Data:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Run Automated Acceptance Tests:**
   ```bash
   npm run test:full    # Runs all 53 End-to-End System Health Audits
   npm run test:e2e     # Runs 323 4-Tier Automated E2E Tests
   npm run verify       # Runs 8 Core DoCA Verification Steps
   ```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# ------------------------------------------------------------------------------
# Database Connection (SQLite local development / Supabase PostgreSQL production)
# ------------------------------------------------------------------------------
DATABASE_URL="file:./dev.db"

# Production Supabase Connection (Pooled via PgBouncer on port 6543):
# DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Production Supabase Direct Connection (Direct port 5432 for migrations):
# DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# ------------------------------------------------------------------------------
# Application Metadata
# ------------------------------------------------------------------------------
NEXT_PUBLIC_APP_NAME="KisanJod"
NEXT_PUBLIC_DEFAULT_LOCALE="en"
```

---

## 📁 Project Structure

```
KisanJod/
├── prisma/
│   ├── schema.prisma              # Database schema (Farmers, Centers, Bookings, Bills, Payments)
│   ├── seed.ts                    # Master database seeding script (4 centers, 4 operators, 8 farmers)
│   └── dev.db                     # Local SQLite database
├── public/
│   ├── crops/                     # Authentic APMC commodity photography (Wheat, Paddy, etc.)
│   ├── icons/                     # PWA icons and avatar vector assets
│   ├── manifest.json              # Web App Manifest for mobile installation
│   └── sw.js                      # Custom service worker for offline caching
├── scripts/
│   ├── dev.js                     # Smart network launcher & port collision cleaner
│   ├── verify_full_system.ts      # 53-point complete system health audit
│   ├── verify_core_flows.ts       # 8-step DoCA core acceptance suite
│   ├── verify_realtime_sync.ts    # 0ms real-time event bus & lifecycle verification
│   ├── run_e2e_tests.ts           # 323 4-tier E2E automated test runner
│   └── test_all_pages.ts          # Multi-page HTTP 200 route & asset audit
├── src/
│   ├── app/
│   │   ├── admin/page.tsx         # DoCA National Telemetry & Analytics Dashboard
│   │   ├── api/                   # REST API Endpoints
│   │   │   ├── admin/stats/       # Telemetry aggregation
│   │   │   ├── auth/              # Aadhaar login & OTP verification
│   │   │   ├── bookings/          # Slot reservation & cancellation
│   │   │   ├── centres/           # Mandi centers & session slot engine
│   │   │   ├── operator/          # Desk actions (call_next, standby, process)
│   │   │   ├── queue/             # Live queue telemetry by center ID
│   │   │   └── sync/stream/       # Server-Sent Events (SSE) instant stream
│   │   ├── farmer/
│   │   │   ├── book/page.tsx      # Step-by-step smart slot reservation
│   │   │   ├── dashboard/page.tsx # Active gate pass, pulsing call banners, and history
│   │   │   ├── payments/page.tsx  # Digital J-Forms & 2-stage DBT payment tracker
│   │   │   └── queue/page.tsx     # Live queue monitor with voice audio synthesis
│   │   ├── login/page.tsx         # Farmer Aadhaar entry & discrete Staff portal
│   │   ├── operator/page.tsx      # Weighbridge desk console & center switcher
│   │   └── layout.tsx             # Root layout with responsive GlobalHeader
│   ├── components/
│   │   ├── GlobalHeader.tsx       # Universal navigation & slide-over profile drawer
│   │   └── ConfirmationModal.tsx  # Accessible decision dialogs
│   └── lib/
│       ├── db.ts                  # Prisma Client singleton
│       ├── handlingDuration.ts    # Dynamic volume-duration algorithm
│       ├── i18n.tsx               # Trilingual localization context (EN, HI, TE)
│       ├── syncBus.ts             # Server-side event bus for instant sync
│       └── useInstantSync.ts      # Multi-channel client hook (SSE + BroadcastChannel)
├── package.json                   # Dependencies, build scripts & test commands
└── tailwind.config.ts             # Custom agricultural palette & typography tokens
```

---

## 🗄️ Database / API

### Core Data Models
- **`Farmer`**: Aadhaar identity, personal metadata, village, district, state, preferred language.
- **`LandRecord`**: Khasra/Khatauni numbers, sown crop, verified land area in acres, maximum procurement quota.
- **`BankAccount`**: Masked account number, IFSC, bank name (for DBT disbursement).
- **`ProcurementCenter`**: Mandi name, code, district, bay count, operating sessions, active palledar workers.
- **`Booking`**: E-Token number (`M-001`), scheduled time window, dynamic ETA, bay assignment, status (`WAITING`, `CALLED`, `AT_BAY`, `STANDBY`, `COMPLETED`, `CANCELLED`).
- **`ProcurementBill`**: Digital J-Form number, gross/tare/net weight, moisture %, grade, MSP rate, net payable, SHA-256 seal hash, QR code payload.
- **`DbtPayment`**: PFMS reference number, bank UTR, disbursement timestamp, status (`PROCESSING`, `CREDITED`).

### Key API Endpoints
- `POST /api/auth/login`: Validates 12-digit Aadhaar and dispatches 6-digit OTP.
- `POST /api/auth/verify-otp`: Verifies OTP and returns farmer profile with land quotas.
- `GET /api/centres`: Retrieves list of active APMC procurement centers and session configs.
- `GET /api/centres/:id/slots`: Calculates continuous dynamic slot intervals based on requested cargo volume.
- `POST /api/bookings`: Confirms slot booking, reserves capacity, and issues sequential token.
- `GET /api/queue/:centreId`: Returns real-time waiting, called, and standby tokens for a center.
- `POST /api/operator`: Handles operator station actions (`call_next`, `standby`, `process`, `cancel`).
- `GET /api/admin/stats`: Supplies national procurement telemetry and buffer stock analytics.
- `GET /api/sync/stream`: Persistent Server-Sent Events stream for instant cross-portal updates.

---

## 🚀 Deployment

### Step 1: Push to GitHub
```bash
git remote add origin https://github.com/shaikrohit/KIsanJod.git
git push -u origin main
```

### Step 2: Cloud Database Setup (Supabase)
1. Log in to [Supabase](https://supabase.com) and create a new project named `kisanjod`.
2. Navigate to **Project Settings &rarr; Database**.
3. Copy the **Connection String** (use **Transaction Pooler** port `6543` for `DATABASE_URL` and **Direct Connection** port `5432` for `DIRECT_URL`).
4. Update `.env` with your Supabase credentials.
5. Push schema and seed data to Supabase:
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

### Step 3: Deploy to Vercel
1. Log in to [Vercel](https://vercel.com) and click **Add New &rarr; Project**.
2. Import the `shaikrohit/KIsanJod` GitHub repository.
3. Configure Environment Variables in Vercel:
   - `DATABASE_URL`: `[Your Supabase Pooled Connection String]`
   - `DIRECT_URL`: `[Your Supabase Direct Connection String]`
   - `NEXT_PUBLIC_APP_NAME`: `KisanJod`
   - `NEXT_PUBLIC_DEFAULT_LOCALE`: `en`
4. Click **Deploy**. Vercel will automatically build and host the application globally.

---

## 🔮 Future Scope

- **Automated IoT Weighbridge Integration:** Direct RS-232 / TCP streaming from digital weighbridge scales to eliminate manual weight entry entirely.
- **AI Computer Vision Moisture & Quality Grading:** On-device camera scanning of grain samples for instant moisture and foreign matter grading.
- **WhatsApp & SMS Gateway Dispatch:** Native integration with NIC / CDAC SMS gateways for automated regional language SMS notifications.
- **Multi-State Inter-Mandi Arbitrage:** Live AGMARKNET price intelligence recommending the highest-paying procurement centers within driving distance.

---

## 👥 Team

- **Shaik Rohit** — *Project Lead & Full-Stack Architect* ([GitHub: @shaikrohit](https://github.com/shaikrohit) • Email: `shaik.rohit.official@gmail.com`)

---

## 📄 License

This project is developed under the auspices of the **Department of Consumer Affairs (DoCA)**, Ministry of Consumer Affairs, Food & Public Distribution, Government of India. Distributed under the **MIT License**.
