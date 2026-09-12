# Original User Request

## Initial Request — 2026-09-07T17:25:49Z

Build KisanJod, a mobile-first Progressive Web App (PWA) and digital procurement platform for the Department of Consumer Affairs (DoCA) that eliminates farmer waiting times and mandi congestion through Aadhaar-based slot booking, dynamic token queue management, proactive turn-nearing notifications, a streamlined procurement operator workflow (grading, weighing, e-bills), and transparent DBT payment tracking.

Working directory: c:\Users\rohit\OneDrive\Desktop\KisanJod
Integrity mode: development

## Requirements

### R1. Farmer Mobile PWA & Visual Slot Booking
- Mobile-first, visual-centric PWA tailored for rural farmers:
  * Farmer-friendly green & warm earthy color palette (agri green, harvest amber, soft off-white cards).
  * Minimal text, zero technical jargon, large touch targets (50px+).
  * Multilingual Language Switcher: Seamless toggle between **English, Hindi (हिंदी), and Telugu (తెలుగు)** with accurate localized text.
  * Tap-to-Speak Voice Readout: High-accessibility speaker button on the Token card and alerts that reads out token number, wait time, and queue status aloud in the chosen language (using browser Web Speech synthesis).
  * Visual cards with crop imagery (Grains: Wheat, Paddy; Pulses: Chana, Moong; Vegetables/Fruits: Onion, Tomato, Potato).
- Authentication:
  * Strict Aadhaar + OTP verification flow (user enters 12-digit Aadhaar number and receives/enters a 6-digit mock OTP with a helpful on-screen demo OTP hint like `123456`).
  * On verification, automatically pulls pre-seeded government land records (Khasra numbers, verified crop acreage, and MSP maximum procurement quota).
- Geolocation-based procurement center discovery with district filtering and live distance indicators.
- Simplified Visual Booking Flow (No vehicle selection needed):
  * 1. Select Crop card (with picture/icon).
  * 2. Enter approximate quantity (gunny bags / boxes / quintals) using intuitive quick stepper buttons (+10, +50, +100).
  * 3. Select Center & Calculated Time Window based on the volume handling formula.
  * 4. Confirm & receive sequential Queue Token Number (e.g., `TK-001`, `TK-002`). Center is locked upon confirmation.

### R2. Real-Time Queue, Ripple ETA & Proactive Turn-Nearing Notification System
- Live Queue Tracker on the Farmer's app displaying:
  * Assigned Token Number (e.g., `TK-002`)
  * Scheduled Slot vs Live Dynamic ETA (e.g., `Scheduled: 09:30 AM | Live ETA: 09:35 AM (+5 min mandi delay)`)
  * Currently serving token at the mandi
  * Number of farmers/vehicles ahead
- Dynamic Ripple-Time Recalculation: If a preceding farmer's weighment/unloading takes longer or finishes earlier, the live ETA dynamically shifts forward/backward for all subsequent farmers in real-time.
- Proactive Turn-Nearing & Countdown Notifications:
  * 10-Minute Turn Countdown Alert: *"Ahead farmer's processing is completing. Your turn will be in approximately 10 minutes. Please arrive at the bay holding area."*
  * Immediate Bay Entry Call: *"Token TK-002: Please proceed to Bay 1 for weighment & grading."*
- Late Arrival & Standby Handling:
  * If a farmer fails to arrive within a 10–15 minute grace period, operator can trigger "Call Next / Standby" — smoothly promoting the next waiting farmer so the bay never sits idle.
  * The late farmer is notified of their standby status, allowing seamless re-entry upon arrival into the next available gap.

### R3. Streamlined Centre Operator Portal & Billing
- Standalone login for Mandi Centre Operators (Employee ID + PIN).
- Operator Queue Dashboard showing the day's booked tokens in queue order with active status tags (Waiting, Called, At Bay, Standby, Completed).
- One-Click Queue Progression:
  * Operator can call next token, initiate weighment, or put delayed token on standby.
  * Enters the assessed crop grade (Grade A / FAQ - Fair Average Quality) and net weight in quintals.
  * System calculates the total amount based on official MSP rates (e.g., Wheat ₹2,275/quintal, Paddy ₹2,183/quintal).
  * Generates the official digital Procurement Bill / J-Form Receipt.
  * Completing a bill triggers the turn-nearing notification for the next farmer in line.

### R4. Transparent Procurement & DBT Payment Tracking
- 2-Step Transparent Payment Tracker: Clean, clutter-free status for farmers transitioning from **"Processing"** (Under PFMS Treasury Clearance) to **"Credited"** (Transferred via DBT).
- Official Government Metadata: Displays the farmer's verified Aadhaar-linked bank account (Bank name, Masked A/C number, IFSC code), PFMS Bill Reference Number, disbursement date, and Bank UTR (Unique Transaction Reference).
- Digital Procurement Receipt / J-Form: Viewable, downloadable, and printable receipt showing crop grade, net weight in quintals, official MSP rate, total payout, and procurement center seal.

### R5. DoCA Department Executive Analytics Dashboard
- Administrative dashboard displaying:
  * Total procurement volume (Quintals & ₹ Amount) across centres.
  * Average waiting time reduction metrics.
  * Hourly slot capacity utilization.
  * Daily farmer turnout and completed payments.

### R6. Unified Scalable Architecture & Programmatic Verification
- Built on Next.js 14/15 (TypeScript, Tailwind CSS) with Prisma ORM. Runs 100% out-of-the-box locally with SQLite, and seamlessly supports Supabase / PostgreSQL in deployed environments via `DATABASE_URL`.
- Mock APIs matching national government schemas (PM-KISAN, PFMS, Agmarknet) with clear documentation on how they map to production government gateways.
- Automated verification script / test suite validating the entire lifecycle: Farmer login → Slot booking → Token assignment → Operator processing (grade + weight) → Bill generation → Turn-nearing notification trigger → Payment status update.

### R7. Core Engineering Quality Pillars
- **1. Code Quality:** Clean, modular directory structure (features, components, lib, api), fully typed TypeScript contracts, readable self-documenting code without dead code.
- **2. Security:** Strict server-side input validation, parameter sanitization, secure session handling, and tamper-proof queue token sequencing.
- **3. Efficiency:** Minimal client bundle size, optimized asset loading, debounced queries, and fast sub-second UI transitions.
- **4. Testing:** Automated end-to-end programmatic verification suite testing happy paths and boundary conditions (quota limits, late arrival standby, queue ripple).
- **5. Accessibility & Farmer UX:** High contrast color ratios (WCAG compliant), 50px+ touch targets, bilingual English/Hindi toggle, zero technical jargon, and rich visual crop iconography.

## Acceptance Criteria

### Automated Programmatic Verification
- [ ] Verification script runs and exits with status 0, validating all core APIs:
  1. Farmer Aadhaar auth and land quota retrieval.
  2. Slot availability lookup and booking confirmation.
  3. Sequential E-Token generation based on existing booking count.
  4. Operator token lookup and submission of weight/grade.
  5. Procurement receipt / J-Form calculation with official MSP rates.
  6. Turn-nearing notification event fired for the next sequential token.
  7. Payment status transition to "Credited" with UTR reference.

### User Interface & Role Functionality
- [ ] Farmer PWA renders a clean, accessible green/earthy theme with large touch targets and working English, Hindi, and Telugu language toggle.
- [ ] Tap-to-speak voice button successfully vocalizes the farmer's token number and queue turn in the chosen language via browser speech synthesis.
- [ ] Visual crop selection cards (Grains, Pulses, Vegetables, Fruits) with quantity steppers allow booking in under 30 seconds without typing complex text.
- [ ] Booking generates a sequential e-token (e.g. `TK-001`) with locked center assignment.
- [ ] Farmer's live screen displays serving token, farmers ahead, and dynamic ripple ETA.
- [ ] Operator portal allows logging in, selecting token, inputting weight & grade, and issuing bill receipt.
- [ ] Completing a token in operator portal immediately updates the queue and triggers a turn-nearing countdown alert for the next farmer.
- [ ] 2-step payment tracker displays Aadhaar-linked bank details, PFMS reference, and UTR number.
- [ ] DoCA Admin dashboard displays procurement statistics and slot utilization charts.

## Follow-up — 2026-09-07T17:27:19Z

User instruction update: Ensure all data (Aadhaar verification, OTP, land records/Khasra numbers, crop acreage, MSP quotas, procurement centres, and banking/UTR details) is 100% self-contained mock data. Do NOT attempt to call real external government APIs. All government integrations must be realistic mock APIs that simulate government services locally.

