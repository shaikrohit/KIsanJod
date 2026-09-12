# TEST_INFRA.md — Comprehensive 4-Tier E2E Testing Infrastructure

**Project**: KisanJod Mobile-First PWA & Digital Procurement Platform  
**Target Authority**: Department of Consumer Affairs (DoCA), Government of India  
**Testing Architecture Lead**: `test_writer_e2e_1` (Teamwork E2E Test Writer)  
**Specification Baseline**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `spec_architecture_queue.md`, `spec_domain.md`  
**Integrity Mode**: 100% Self-Contained Mock Architecture (Zero External Network Dependencies)

---

## 1. Executive Summary & Testing Philosophy

The KisanJod platform digitizes agricultural procurement for millions of rural farmers, mandi operators, and executive policymakers. Ensuring zero software defects, accurate financial disbursements (Direct Benefit Transfer via PFMS), and flawless queue ripple management requires a **formal, requirement-driven, opaque-box testing framework**.

Our test infrastructure enforces four orthogonal testing tiers derived from empirical software engineering principles:

1. **Tier 1: Feature Functionality (Category-Partition Method)**  
   Systematically decomposes every requirement into functional categories, input parameters, and equivalence classes. Validates primary behavior ("happy paths") for each feature with at least **5 distinct test cases per feature**.
2. **Tier 2: Boundary Value Analysis (BVA) & Adversarial Stress**  
   Evaluates inputs at the exact edges of domain constraints: off-by-one errors, quota saturation limits, extreme load, invalid Aadhaar/OTP formats, corrupted data payloads, and unexpected state transitions. Requires at least **5 edge/boundary test cases per feature**.
3. **Tier 3: Combinatorial & Pairwise Testing**  
   Employs all-pairs combinatorial sampling across multi-dimensional parameter spaces (7 crop commodities × 4 mandi centers × 2 quality grades × 4 delay/early ripple profiles × 2 payment stages) to detect subtle interaction bugs without exponential test explosion.
4. **Tier 4: Real-World Workload Scenarios**  
   Simulates full end-to-end multi-actor operational lifecycles spanning the farmer PWA, mandi weighbridge operations, queue delays, J-Form e-bill generation, and treasury DBT settlement.

---

## 2. Feature Inventory Matrix & Tier Mapping

The KisanJod specification defines **28 core features**. Every feature is mapped across Tiers 1 through 3, with Tier 4 exercising cross-feature operational lifecycles.

| # | Feature Name | Description | Tier 1 (Category-Partition) | Tier 2 (BVA & Adversarial) | Tier 3 (Pairwise Interactions) |
|---|--------------|-------------|-----------------------------|----------------------------|--------------------------------|
| **F01** | Prisma Relational Schema | 10-model SQLite schema (`Farmer`, `LandRecord`, `Center`, `MandiBay`, `MandiOperator`, `Booking`, `QueueToken`, `WeighmentRecord`, `JFormReceipt`, `DbtPaymentRecord`) | Model constraints, foreign key referential integrity, cascading rules | Missing required fields, unique constraint collisions, orphaned relations | Cross-table joins under concurrent simulated updates |
| **F02** | High-Fidelity Pre-Seeded Personas | 8 diverse regional farmer profiles, 4 mandi centers, 4 operators, realistic land and bank records | Profile field validation, state/district mapping, bank account structures | Missing Khasra records, zero acreage, unmapped IFSC codes | Multi-region persona booking across local mandis |
| **F03** | Mock National Services | Self-contained PM-KISAN, PFMS, and Agmarknet mock API engines simulating government gateways | Deterministic response generation, schema conformance, status codes | Malformed request bodies, unknown government IDs, network failure simulations | Inter-mock coordination (Aadhaar $\to$ PM-KISAN $\to$ PFMS) |
| **F04** | Aadhaar + Mock OTP Auth | 12-digit numeric Aadhaar input, 6-digit OTP verification with demo hint `123456`, session generation | Valid 12-digit Aadhaar, correct OTP `123456`, session token issuance | 11/13-digit inputs, non-numeric chars, wrong OTP (`999999`), expired OTP | Aadhaar length × OTP attempts × session expiry |
| **F05** | Land Records & MSP Quota Lookup | Instant retrieval of Khasra numbers, verified crop acreage, and maximum legal procurement quota | Land parcel retrieval, area calculation in acres/hectares, crop matching | Zero quota remaining, requested quantity exceeding quota, unverified land | Sown crop × land area × productivity benchmark |
| **F06** | Geolocation Center Discovery | Procurement center discovery with district filtering and live distance calculations | GPS coordinate distance calculation (Haversine), district filtering, bay counts | GPS permission denied, coordinates outside India, empty district query | Geolocation distance × active center status × bay count |
| **F07** | Farmer PWA Visual Design System | Mobile-first rural theme (Agri Green `#1B5E20`, Harvest Amber `#D97706`, `#FDFBF7`), 52px+ touch targets | Theme token structure, contrast ratio adherence (WCAG AAA), CSS variables | Viewport boundary tests (320px to 4K), extreme text zoom, dark mode | Screen width × theme palette × high-contrast mode |
| **F08** | Multilingual Language Toggle | Seamless dynamic switcher across English (`en`), Hindi (`hi`), and Telugu (`te`) with zero jargon | Key parity across `en`, `hi`, `te`, active locale persistence, fallback behavior | Missing localization key, corrupted locale string, RTL/script injection | Language code × UI component × dynamic parameter interpolation |
| **F09** | Tap-to-Speak Voice Readout | Web Speech API audio synthesis vocalizing token, wait time, and queue turn in chosen language | Voice string generation for `hi-IN`, `te-IN`, `en-IN`, rate/pitch configuration | Web Speech unsupported fallback, empty token string, interrupted synthesis | Locale × token length × speech synthesis availability |
| **F10** | Visual Crop Selection Cards | Visual cards for Grains (Wheat, Paddy), Pulses (Chana, Moong), Veg/Fruit (Onion, Tomato, Potato) | 7-crop catalog categorization, icon/image attributes, pricing authority | Unknown crop ID, deprecated seasonal crops, zero-price crops | Crop category × packaging type × season |
| **F11** | Quantity Steppers & Volume Slotting | Intuitive steppers (+10, +50, +100 bags) and dynamic time window calculation $T = 10 + (Q/25)\times 10$ | Stepper increments, bag-to-quintal conversions (50kg gunny, 25kg crate), formula output | Negative quantities, decimal fractions, quantity exceeding 1,000 qtl | Increment size × packaging unit × time window formula |
| **F12** | Sequential E-Token & Center Locking | Sequential token generation (`TK-001`, `TK-002`) with locked center and date assignment | Formatted token string generation, atomic counter increment, center lock | Center change attempt after locking, counter rollover, date boundary reset | Mandi center × booking sequence × concurrent slot locks |
| **F13** | Live Dynamic Queue Tracker | Real-time screen showing assigned token, scheduled slot vs live ETA, serving token, farmers ahead | Tracker state projection, farmers ahead counter, bay assignment | Token not found, completed token tracking, zero farmers ahead | Queue depth × serving status × bay count |
| **F14** | Dynamic Ripple ETA Recalculator | Real-time delta propagation ($\Delta_k$) shifting downstream ETAs forward/backward clamped by travel buffer | Mandi delay ($\Delta_k > 0$) propagation, early finish ($\Delta_k < 0$) forward shift | Negative ETA clamp (`now + 15m`), extreme 180-minute delay, multi-bay ripple | Delay delta × downstream queue position × travel buffer |
| **F15** | Proactive Turn-Nearing Alert | 10-minute turn countdown notification instructing farmer to proceed to bay holding area | Threshold trigger ($\le 10\text{ min}$), alert payload generation, modal visibility | Boundary at exactly 10 min, 10 min 01 sec, offline farmer recovery | Alert threshold × notification delivery × audio chime |
| **F16** | Immediate Bay Entry Call | Direct call notification directing token to specific weighment/grading bay (e.g. Bay 1) | Operator "Call" event, bay number assignment, alert broadcast | Non-existent bay ID, token already in progress, double-call idempotency | Bay assignment × operator call state × farmer acknowledgment |
| **F17** | Late Arrival Grace & Standby Promotion | 10-15 min grace period, automatic promotion of next waiting farmer, standby re-entry into queue gaps | Grace countdown timer, standby status transition, next token auto-call | Grace period boundary (14m 59s vs 15m 01s), late farmer arrival check-in | Grace timer duration × queue status × gap availability |
| **F18** | Mandi Operator Portal Auth | Standalone authentication for mandi operators using Employee ID and secure PIN | Valid Employee ID + PIN, operator session claims, assigned center binding | 3-digit PIN, invalid PIN, operator assigned to different center | Operator ID × PIN validity × center assignment |
| **F19** | Operator Queue Board | Real-time list of daily tokens with statuses (`WAITING`, `CALLED`, `AT_BAY`, `STANDBY`, `COMPLETED`) | Queue ordering by token sequence, status filter tabs, action button availability | Out-of-order status transition rejection, empty queue rendering | Status filter × center ID × action transitions |
| **F20** | Weighment & Grading Module | Gross/Tare/Net weight entry, moisture % validation, and Grade A vs FAQ assessment | Net weight calculation ($\text{Gross} - \text{Tare}$), moisture tolerance checks, grade selection | Gross $\le$ Tare, moisture exceeding FAQ threshold, zero net weight | Moisture % × foreign matter × grade qualification |
| **F21** | Official MSP Rate Payout Engine | Automatic total calculation based on official MSP table (Wheat ₹2,275, Paddy ₹2,183, Chana ₹5,440, etc.) | Payout multiplication ($\text{Net} \times \text{Rate}$), Grade A bonus premiums, paise rounding | Fractional quintals ($47.35$), zero deduction verification, rate mismatch | Commodity × quality grade × quantity |
| **F22** | Digital APMC J-Form Receipt | Viewable, downloadable, printable statutory procurement receipt with center seal and SHA-256 signature | Serial number generation (`JF-2026-...`), SHA-256 digital seal hash, QR payload | Duplicate receipt prevention, missing weighment link, seal verification | J-Form attributes × print layout × digital signature |
| **F23** | Auto Turn-Nearing Trigger | Completing a bill in operator portal triggers turn-nearing event for the next sequential token | Event emission upon completion, next token identification, event payload | Last token in queue (no next token), empty queue handling | Queue position × bill completion event × downstream listener |
| **F24** | 2-Step DBT Payment Tracker | Clear visual progress tracker from `Processing` (PFMS Treasury) to `Credited` (DBT transferred) | `PROCESSING` state verification, `CREDITED` transition, status badge styling | Invalid transition (e.g. Credited to Processing), failed settlement simulation | Payment stage × status code × timeline progression |
| **F25** | Verified Banking Metadata Display | Masked bank account number, IFSC code, PFMS Bill Reference, disbursement date, and 16-char Bank UTR | Bank metadata masking (`XXXX-XXXX-1234`), 16-char UTR format, date formatting | Unlinked bank account, invalid IFSC format, missing UTR | Bank entity × account format × UTR generation |
| **F26** | DoCA Executive Analytics Dashboard | Real-time KPIs: total volume (quintals & ₹ amount), waiting time reduction, hourly slot utilization, turnout | Metric aggregations, baseline wait time comparisons (270 min vs current), capacity % | Division by zero on empty dataset, extreme volume numbers, date range boundaries | Date range filter × center metric aggregation × KPI calculation |
| **F27** | 7-Step Programmatic Verification Suite | Standalone script (`scripts/verify_core_flows.ts`) validating end-to-end lifecycle and exiting with code 0 | Deterministic sequential execution of all 7 core steps, exit status 0 | Step assertion failure handling, non-zero exit code on mismatch, diagnostic logs | Step progression × API mocked responses × status code |
| **F28** | Comprehensive 4-Tier E2E Test Suite | Requirement-driven opaque-box test runner covering Tiers 1-4 with >=11xN test cases (`TEST_READY.md`) | Runner execution, test suite discovery, structured reporting, zero failure count | Timeout handling, unhandled exception catching, runner exit code 0/1 | Test tier × suite aggregation × error reporting |

---

## 3. Coverage Thresholds & Quality Gates

The E2E test suite establishes non-negotiable minimum coverage thresholds:

| Testing Tier | Minimum Coverage Rule | Metric Target | Rationale |
|--------------|-----------------------|---------------|-----------|
| **Tier 1: Features** | $\ge 5$ test cases per feature | **140+ test cases** (28 features × 5) | Comprehensive verification of all happy paths, contracts, and requirements. |
| **Tier 2: Boundaries** | $\ge 5$ test cases per feature | **140+ test cases** (28 features × 5) | Rigorous verification of edge conditions, error cases, limits, and security boundaries. |
| **Tier 3: Combinations** | Orthogonal Pairwise Combinations | **30+ test cases** | Detection of cross-feature interactions across multi-dimensional parameters. |
| **Tier 4: Workloads** | $\ge 5$ realistic multi-actor workflows | **5+ test cases** | Full lifecycle validation mirroring operational reality in Indian APMC mandis. |
| **Total Test Cases** | **315+ test cases** | **$\ge 315$ tests passing** | Zero test failures permitted across all 4 tiers. |

---

## 4. Real-World Application Scenarios (Tier 4 Workloads)

Tier 4 simulates realistic, end-to-end operational days at procurement centers across India:

### Scenario 1: Standard Wheat Procurement at Ludhiana Central Mandi
- **Actor**: Farmer Gurpreet Singh (`FARMER_001`, Ludhiana, Punjab).
- **Workflow**:
  1. Authenticates with Aadhaar `548912345678` + OTP `123456`.
  2. PM-KISAN retrieves Khasra `142/1, 142/2` (4.0 acres, 100 quintals quota).
  3. Books 100 quintals (200 gunny bags) of Wheat at Ludhiana Central Mandi (`MND-LUD-01`).
  4. System assigns sequential token `TK-001` and locks center.
  5. Operator calls `TK-001` to Bay 1. Farmer arrives on time.
  6. Operator inputs Gross (142.50 qtl), Tare (42.50 qtl), Net = 100.00 qtl, Grade FAQ, Moisture 11.2%.
  7. Official MSP ₹2,275/qtl calculated $\to$ Payout ₹2,27,500.00.
  8. Digital J-Form `JF-2026-LUD01-00104` generated with SHA-256 seal.
  9. PFMS generates reference `PFMS-2026-PB-00104`, status `PROCESSING`.
  10. DBT settlement clears $\to$ Status `CREDITED` with Bank UTR `UTR982736128491` to Punjab National Bank account `XXXXXX4512`.

### Scenario 2: Paddy Procurement with Mandi Weighbridge Delay & Ripple ETA Cascade
- **Actors**: 3 sequential farmers at Guntur APMC Mandi (`MND-GNT-01`):
  - Farmer 1 (`TK-001`): Venkata Ramana, 50 qtl Paddy.
  - Farmer 2 (`TK-002`): Farmer B, 40 qtl Paddy.
  - Farmer 3 (`TK-003`): Farmer C, 30 qtl Paddy.
- **Workflow**:
  1. All 3 farmers receive initial scheduled slots (09:00, 09:30, 10:00).
  2. Farmer 1 experiences unexpected unloading delay of +25 minutes due to weighbridge calibration.
  3. Ripple recalculator detects $\Delta_1 = +25\text{ min}$ and dynamically cascades:
     - `TK-002` Live ETA shifts from 09:30 $\to$ 09:55 (+25 min delay badge).
     - `TK-003` Live ETA shifts from 10:00 $\to$ 10:25 (+25 min delay badge).
  4. At 09:45, `TK-002` is within 10 minutes of live ETA $\to$ Proactive `NEAR_TURN` alert fires.
  5. Farmer 1 finishes. Operator calls `TK-002`. Farmer 2 proceeds immediately to Bay 1.
  6. Grade A Paddy assessed (+₹20 premium $\to$ ₹2,203/qtl). Payout and J-Form completed.

### Scenario 3: Chana Booking with Standby Grace Expiry & Late Arrival Gap Re-entry
- **Actors**: Farmer Ramesh Patel (`FARMER_003`, Sehore, MP) and Farmer Savitri Bai (`FARMER_004`).
- **Workflow**:
  1. `TK-002` (Ramesh Patel) called to Bay 1 at 10:00 AM. Grace period timer starts (15 mins).
  2. Farmer Ramesh is stuck in road traffic. Grace timer reaches 15:00 without arrival.
  3. Standby engine triggers:
     - `TK-002` transitions to `STANDBY`.
     - Alert dispatched to Farmer Ramesh: *"Turn missed. Moved to Standby. Tap I am Here upon arrival."*
     - Next token `TK-003` (Savitri Bai) is immediately promoted to `CALLED`.
     - Bay 1 remains 100% utilized with zero idle delay.
  4. At 10:25 AM, Ramesh arrives and taps "I Am Here" $\to$ `STANDBY_READY`.
  5. As soon as Savitri Bai's weighment finishes, Ramesh is automatically slotted into the next bay gap.
  6. Weighment completed, Chana ₹5,440/qtl calculated, J-Form issued.

### Scenario 4: High-Volume Potato Booking with Multi-Bay Load Balancing
- **Actor**: Farmer Mohan Lal (`FARMER_008`, Agra, UP).
- **Workflow**:
  1. Farmer books large 300 quintals Potato quota (600 gunny bags) at Agra Mandi (`MND-AGR-01`).
  2. Slot engine computes volume handling duration: $10 + (300 / 25) \times 10 = 130\text{ minutes}$.
  3. Load balancing engine detects excessive single-bay occupancy and distributes across parallel bays (Bay 1 & Bay 2).
  4. Operator processes dual-bay concurrent weighments.
  5. Net weight 300.00 qtl verified. PSF rate ₹1,100/qtl applied $\to$ Payout ₹3,30,000.00.
  6. J-Form issued with composite bay metadata.

### Scenario 5: End-to-End Trilingual Farmer Journey with Voice Readout & DBT Lifecycle
- **Actor**: Farmer Appa Rao (`FARMER_006`, Warangal, Telangana).
- **Workflow**:
  1. Farmer opens PWA on mobile viewport (390px width).
  2. Toggles language from English to Telugu (`te`). All interface strings translate instantly to zero-jargon Telugu agrarian terms.
  3. Enters Aadhaar `654321098765`, receives demo OTP `123456`.
  4. Visual Moong crop card selected with quick stepper (+10, +50). Books 19.5 quintals at Warangal Mandi.
  5. Sequential token `TK-005` generated. Center locked.
  6. Live tracker displays serving token and Telugu text.
  7. Farmer taps "Tap-to-Speak" voice readout button $\to$ Web Speech synthesizer vocalizes status in Telugu (`te-IN`):
     *"మీ టోకెన్ నంబర్ T K 0 0 5. మీ సమయం 11:15 AM..."*
  8. Mandi operator completes weighment (Moong Grade A ₹8,650/qtl $\to$ ₹1,68,675.00).
  9. J-Form issued. 2-Step DBT tracker displays `Processing` under PFMS, then updates to `Credited` with UTR `UTR551122334455` and Union Bank account `XXXXXX1154`.

---

## 5. Verification Architecture & Test Execution Harness

The test suite is executable via standard TypeScript execution engines (`tsx` / `node`):

```
KisanJod Test Suite Architecture
├── tests/
│   ├── helpers/
│   │   ├── types.ts              # Domain interfaces and contracts
│   │   ├── fixtures.ts           # Pre-seeded 8 personas, 4 centers, 4 operators, MSP rates
│   │   ├── domain_engine.ts      # Authoritative logic oracle (formulas, state machines, rules)
│   │   └── test_runner.ts        # Zero-dependency test harness & assertion framework
│   └── e2e/
│       ├── tier1_features.test.ts     # Tier 1: 28 features × >=5 tests (140+ tests)
│       ├── tier2_boundaries.test.ts   # Tier 2: 28 features × >=5 boundaries (140+ tests)
│       ├── tier3_combinations.test.ts # Tier 3: Pairwise combinations (30+ tests)
│       └── tier4_realworld.test.ts    # Tier 4: 5 realistic multi-actor workloads (5+ tests)
└── scripts/
    ├── run_e2e_tests.ts          # Master runner executing Tiers 1-4 with exit code 0/1
    └── verify_core_flows.ts      # 7-step programmatic verification script (exit code 0)
```

### Execution Commands
- **Run Full 4-Tier E2E Test Suite**:
  ```bash
  npx tsx scripts/run_e2e_tests.ts
  ```
- **Run 7-Step Acceptance Criteria Lifecycle Verification**:
  ```bash
  npx tsx scripts/verify_core_flows.ts
  ```
- **Exit Code Guarantee**: Both runners strictly return **exit code 0** on complete pass, or **exit code 1** with detailed failure diagnostics on any assertion violation.
