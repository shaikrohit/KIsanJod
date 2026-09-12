# Project: KisanJod Mobile-First PWA & Digital Procurement Platform

## Architecture
KisanJod is an integrated digital agricultural procurement platform built with Next.js 14 (App Router), TypeScript, Tailwind CSS, and Prisma ORM with local SQLite (`file:./dev.db`). It provides a seamless, transparent bridge between rural farmers, mandi procurement operators, and the Department of Consumer Affairs (DoCA).

### System Data Flow
1. **Farmer Authentication & Quota Verification**:
   - Farmer enters 12-digit Aadhaar.
   - Realistic mock OTP service validates with hint `123456`.
   - On auth, system pulls pre-seeded PM-KISAN & land registry records (Khasra numbers, verified crop acreage, and maximum statutory procurement quota calculated via state productivity norms).
2. **Visual Booking & Slotting**:
   - Visual crop cards (Wheat, Paddy, Chana, Moong, Onion, Tomato, Potato) with quantity steppers (+10, +50, +100 bags).
   - District procurement center discovery with geolocation distance sorting.
   - Dynamic time window calculated by volume handling formula: $T = 10\text{ min} + (Q / 25) \times 10\text{ min}$.
   - Atomic sequential e-token assignment (`TK-001`, `TK-002`, etc.) locked to center and date.
3. **Real-Time Queue & Dynamic Ripple ETA**:
   - Queue Tracker displays assigned token, scheduled vs live dynamic ETA, serving token, and farmers ahead.
   - Dynamic ripple engine calculates processing deviations ($\Delta_k = t_{\text{actual}} - t_{\text{projected}}$) and cascades ETA adjustments to all subsequent farmers in real-time, clamped by travel time buffer ($\text{now} + 15$ min).
   - Automated 10-minute turn countdown notifications and immediate bay entry calls.
   - 10-15 minute grace period with standby promotion so bays never sit idle, allowing smooth re-entry into subsequent queue gaps.
4. **Mandi Operator Procurement & Statutory J-Form**:
   - Operator login via Employee ID + PIN.
   - Real-time queue board (Waiting, Called, At Bay, Standby, Completed).
   - Gross, Tare, and Net weighment recording, moisture %, and crop grading (Grade A vs FAQ).
   - System calculates payout based on official CACP MSP rates (Wheat ₹2,275/qtl, Paddy ₹2,183/qtl, Chana ₹5,440/qtl, Moong ₹8,558/qtl, etc.).
   - Issues statutory digital APMC J-Form receipt with unique receipt number and digital SHA-256 seal.
   - Bill completion auto-dispatches turn-nearing notification to the next sequential farmer.
5. **Transparent PFMS / DBT Pipeline & DoCA Analytics**:
   - 2-step payment tracker (`Processing` under PFMS Treasury $\to$ `Credited` via DBT).
   - Displays verified Aadhaar-linked bank metadata (Bank name, masked account number, IFSC), PFMS Bill Reference, disbursement date, and 16-character Bank UTR.
   - DoCA Executive Analytics Dashboard tracks total procurement volume (quintals & ₹ amount), average waiting time reduction metrics, hourly slot capacity utilization, and daily turnout.
6. **100% Self-Contained Mock Services**:
   - PM-KISAN, PFMS, and Agmarknet mock services simulate national portals locally with zero external network dependencies.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Prisma Relational Schema | 10-model SQLite schema (`file:./dev.db`) for farmers, land, centers, operators, bookings, queue, bills, DBT | M1 | Survey |
| 2 | High-Fidelity Pre-Seeded Personas | 8 diverse farmer personas, 4 mandi centers, 4 operators, realistic Khasra records and bank accounts | M1 | Survey |
| 3 | Mock National Services | Self-contained PM-KISAN, PFMS, and Agmarknet mock API engines simulating government gateways | M1 | Survey |
| 4 | Aadhaar + Mock OTP Auth | 12-digit Aadhaar input, 6-digit OTP verification with demo hint `123456`, session state management | M2 | Survey |
| 5 | Land Records & MSP Quota Lookup | Instant retrieval of Khasra numbers, verified crop acreage, and maximum legal procurement quota | M2 | Survey |
| 6 | Geolocation Center Discovery | Procurement center discovery with district filtering and live distance calculations | M2 | Survey |
| 7 | Farmer PWA Visual Design System | Mobile-first rural theme (Agri Green `#1B5E20`, Harvest Amber `#D97706`, off-white cards `#FDFBF7`), 52px+ touch targets | M3 | Survey |
| 8 | Multilingual Language Toggle | Seamless dynamic switcher across English, Hindi (हिंदी), and Telugu (తెలుగు) with zero jargon | M3 | Survey |
| 9 | Tap-to-Speak Voice Readout | Web Speech API audio synthesis vocalizing token, wait time, and queue turn in chosen language with visual fallback | M3 | Survey |
| 10 | Visual Crop Selection Cards | Visual cards for Grains (Wheat, Paddy), Pulses (Chana, Moong), Veg/Fruit (Onion, Tomato, Potato) | M3 | Survey |
| 11 | Quantity Steppers & Volume Slotting | Intuitive steppers (+10, +50, +100 bags) and dynamic time window calculation ($T = 10 + (Q/25)\times 10$) | M3 | Survey |
| 12 | Sequential E-Token & Center Locking | Sequential token generation (`TK-001`, `TK-002`) with locked center and date assignment | M3 | Survey |
| 13 | Live Dynamic Queue Tracker | Real-time screen showing assigned token, scheduled slot vs live ETA, serving token, farmers ahead | M4 | Survey |
| 14 | Dynamic Ripple ETA Recalculator | Real-time delta propagation ($\Delta_k$) shifting downstream ETAs forward/backward clamped by travel buffer | M4 | Survey |
| 15 | Proactive Turn-Nearing Alert | 10-minute turn countdown notification instructing farmer to proceed to bay holding area | M4 | Survey |
| 16 | Immediate Bay Entry Call | Direct call notification directing token to specific weighment/grading bay (e.g. Bay 1) | M4 | Survey |
| 17 | Late Arrival Grace & Standby Promotion | 10-15 min grace period, automatic promotion of next waiting farmer, standby re-entry into queue gaps | M4 | Survey |
| 18 | Mandi Operator Portal Auth | Standalone authentication for mandi operators using Employee ID and secure PIN | M5 | Survey |
| 19 | Operator Queue Board | Real-time list of daily tokens with statuses (`Waiting`, `Called`, `At Bay`, `Standby`, `Completed`) | M5 | Survey |
| 20 | Weighment & Grading Module | Gross/Tare/Net weight entry, moisture % validation, and Grade A vs FAQ assessment | M5 | Survey |
| 21 | Official MSP Rate Payout Engine | Automatic total calculation based on official MSP table (Wheat ₹2,275, Paddy ₹2,183, Chana ₹5,440, etc.) | M5 | Survey |
| 22 | Digital APMC J-Form Receipt | Viewable, downloadable, printable statutory procurement receipt with center seal and SHA-256 signature | M5 | Survey |
| 23 | Auto Turn-Nearing Trigger | Completing a bill in operator portal triggers turn-nearing event for the next sequential token | M5 | Survey |
| 24 | 2-Step DBT Payment Tracker | Clear visual progress tracker from `Processing` (PFMS Treasury) to `Credited` (DBT transferred) | M6 | Survey |
| 25 | Verified Banking Metadata Display | Masked bank account number, IFSC code, PFMS Bill Reference, disbursement date, and 16-char Bank UTR | M6 | Survey |
| 26 | DoCA Executive Analytics Dashboard | Real-time KPIs: total volume (quintals & ₹ amount), waiting time reduction, hourly slot utilization, turnout | M6 | Survey |
| 27 | 7-Step Programmatic Verification Suite | Standalone script (`scripts/verify_core_flows.ts`) validating end-to-end lifecycle and exiting with code 0 | M7 | Survey |
| 28 | Comprehensive 4-Tier E2E Test Suite | Requirement-driven opaque-box test runner covering Tiers 1-4 with >=11xN test cases (`TEST_READY.md`) | M7 | Survey |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Foundation & Mock Government Schemas | Next.js 14 setup, Tailwind tokens, 10-model Prisma SQLite schema, mock PM-KISAN/PFMS/Agmarknet services, seed script with 8 personas | none | PLANNED |
| M2 | Aadhaar Auth, Land Records & Center Discovery | 12-digit Aadhaar login, OTP hint 6-digit verification, Khasra land quota retrieval, district geolocation center lookup | M1 | PLANNED |
| M3 | Farmer PWA Booking UI & Multilingual Voice Engine | Mobile-first visual booking flow, crop cards, quantity steppers, token generation (`TK-001`), English/Hindi/Telugu toggle, Web Speech readout | M2 | PLANNED |
| M4 | Real-Time Dynamic Queue Engine & Ripple ETA | Dynamic queue engine, ripple ETA delta propagation, 10-minute turn alert, immediate bay call, grace period and standby promotion | M3 | PLANNED |
| M5 | Mandi Operator Portal, Weighment & J-Form e-Bills | Operator login (ID+PIN), queue progression board, weighment (gross/tare/net), Grade A/FAQ grading, MSP calculation, J-Form receipt, turn-nearing dispatch | M4 | PLANNED |
| M6 | DBT Payment Tracking & DoCA Executive Analytics | 2-step payment tracker (`Processing` -> `Credited`), PFMS ref, bank metadata, Bank UTR, DoCA Executive Analytics dashboard | M5 | PLANNED |
| M7 | Final E2E Test Suite Pass & Adversarial Hardening | Phase 1: 100% pass of E2E test suite (Tiers 1-4) and standalone verification script (`scripts/verify_core_flows.ts` exit 0). Phase 2: Adversarial coverage hardening (Tier 5) and forensic audit | M6 | PLANNED |

---

## Interface Contracts

### 1. Farmer Auth & Land Module (`/src/lib/services/auth.ts`)
```typescript
export interface AadhaarAuthRequest {
  aadhaarNumber: string; // 12 digits
}

export interface OtpVerifyRequest {
  aadhaarNumber: string;
  otp: string; // 6 digits, hint "123456"
}

export interface FarmerProfile {
  id: string;
  aadhaarNumber: string;
  name: string;
  mobileNumber: string;
  district: string;
  state: string;
  landRecords: {
    khasraNumber: string;
    subDivision: string;
    cropSown: string;
    verifiedAcreage: number;
    maxProcurementQuotaQuintals: number;
  }[];
  bankAccount: {
    bankName: string;
    accountNumberMasked: string;
    ifscCode: string;
  };
}
```

### 2. Slot & Booking Engine (`/src/lib/services/booking.ts`)
```typescript
export interface SlotBookingRequest {
  farmerId: string;
  cropCommodity: string; // e.g. "WHEAT", "PADDY", "CHANA"
  quantityQuintals: number;
  centerId: string;
  bookingDate: string; // YYYY-MM-DD
}

export interface SlotBookingResult {
  bookingId: string;
  tokenNumber: string; // e.g. "TK-001"
  scheduledSlotStart: string; // ISO DateTime
  scheduledSlotEnd: string;
  centerName: string;
  bayAssigned: number;
  status: "WAITING" | "CALLED" | "AT_BAY" | "STANDBY" | "COMPLETED";
}
```

### 3. Queue & Ripple ETA Engine (`/src/lib/services/queue.ts`)
```typescript
export interface QueueStatusResponse {
  tokenNumber: string;
  scheduledSlotStart: string;
  dynamicEta: string; // Shifted dynamically
  delayMinutes: number; // e.g. +5 min mandi delay
  servingTokenNumber: string | null;
  farmersAheadCount: number;
  status: "WAITING" | "CALLED" | "AT_BAY" | "STANDBY" | "COMPLETED";
  bayNumber?: number;
  turnAlertActive: boolean; // True if <= 10 min
  immediateCallActive: boolean; // True if CALLED
  isStandby: boolean;
}
```

### 4. Operator Procurement & J-Form Receipt (`/src/lib/services/procurement.ts`)
```typescript
export interface OperatorWeighmentSubmission {
  operatorId: string;
  bookingId: string;
  tokenNumber: string;
  grossWeightQuintals: number;
  tareWeightQuintals: number;
  netWeightQuintals: number;
  cropGrade: "GRADE_A" | "FAQ";
  moisturePercentage: number;
}

export interface JFormReceipt {
  receiptId: string;
  billNumber: string; // e.g. "JFORM-2026-DOCA-001"
  bookingId: string;
  tokenNumber: string;
  farmerName: string;
  cropCommodity: string;
  cropGrade: string;
  netWeightQuintals: number;
  mspRatePerQuintal: number;
  totalGrossPayout: number;
  netFarmerPayout: number;
  issuedAt: string;
  sealHash: string; // SHA-256
}
```

### 5. DBT Pipeline & Status (`/src/lib/services/dbt.ts`)
```typescript
export interface DbtRecord {
  paymentId: string;
  receiptId: string;
  farmerId: string;
  amount: number;
  status: "PROCESSING" | "CREDITED";
  pfmsBillReference: string;
  bankUtrNumber?: string; // 16 alphanumeric characters
  disbursementDate?: string;
  bankName: string;
  accountNumberMasked: string;
  ifscCode: string;
}
```

### 6. Programmatic Verification Contract (`scripts/verify_core_flows.ts`)
```typescript
// Deterministic 7-step verification executed via: npx tsx scripts/verify_core_flows.ts
// Exits with code 0 on complete pass, or code 1 on failure:
// 1. Farmer Aadhaar auth + land quota retrieval
// 2. Slot availability lookup + booking confirmation
// 3. Sequential E-Token generation (TK-001, TK-002)
// 4. Operator token lookup + weight/grade submission
// 5. Procurement receipt / J-Form calculation with official MSP rates
// 6. Turn-nearing notification event fired for next sequential token
// 7. Payment status transition to "Credited" with UTR reference
```

---

## Code Layout
```
c:\Users\rohit\OneDrive\Desktop\KisanJod/
├── prisma/
│   ├── schema.prisma              # 10 relational SQLite models
│   └── seed.ts                    # 8 farmers, 4 centers, 4 operators seed
├── public/
│   ├── icons/                     # PWA icons & manifest assets
│   ├── crops/                     # Crop imagery (wheat, paddy, chana, etc.)
│   └── manifest.json              # PWA manifest
├── scripts/
│   ├── verify_core_flows.ts       # 7-step automated verification script (exit 0)
│   └── run_e2e_tests.ts           # E2E test runner for Tiers 1-4
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/              # Aadhaar & OTP route handlers
│   │   │   ├── bookings/          # Slot booking & token route handlers
│   │   │   ├── queue/             # Dynamic queue & ripple ETA route handlers
│   │   │   ├── operator/          # Operator login & weighment route handlers
│   │   │   ├── payments/          # DBT status transition route handlers
│   │   │   └── analytics/         # DoCA analytics metrics route handlers
│   │   ├── layout.tsx             # Root layout with language/audio providers
│   │   ├── page.tsx               # Farmer PWA root landing & booking
│   │   ├── queue/page.tsx         # Live queue tracker & audio turn alert
│   │   ├── operator/page.tsx      # Centre operator login & procurement board
│   │   ├── payments/page.tsx      # 2-step DBT tracking & J-Form receipt
│   │   ├── analytics/page.tsx     # DoCA executive dashboard
│   │   └── globals.css            # Tailwind directives & design tokens
│   ├── components/
│   │   ├── ui/                    # Tactile buttons (52px+), cards, badges, steppers
│   │   ├── pwa/                   # Install prompt, offline banner
│   │   ├── booking/               # Crop selector, quantity stepper, center picker
│   │   ├── queue/                 # Ripple ETA card, bay call modal, countdown alert
│   │   ├── operator/              # Weighment form, grading toggle, J-Form preview
│   │   ├── payments/              # 2-step tracker, bank details, receipt download
│   │   └── voice/                 # Web Speech tap-to-speak component & visual ticker
│   ├── lib/
│   │   ├── db.ts                  # Prisma Client singleton
│   │   ├── queueEngine.ts         # Volume formula, ripple ETA delta propagation
│   │   ├── mspPricing.ts          # Official CACP MSP rate lookup table
│   │   ├── speech.ts              # Web Speech API wrapper & regional voice matcher
│   │   ├── translations/          # Typed dictionaries (en.ts, hi.ts, te.ts)
│   │   └── mocks/                 # National mock services (PM-KISAN, PFMS, Agmarknet)
│   └── types/
│       └── index.ts               # Shared TypeScript domain contracts
├── .env                           # DATABASE_URL="file:./dev.db"
├── next.config.mjs                # Next.js configuration
├── package.json                   # Dependencies blueprint
├── postcss.config.mjs             # PostCSS plugins
├── tailwind.config.ts             # Tailwind design tokens & themes
└── tsconfig.json                  # Strict TypeScript configuration
```

