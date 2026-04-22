# Workers System Design
**Date:** 2026-04-19  
**Status:** Approved — ready for implementation planning  
**Reference:** Clarkson's Farm (Charlie Ireland archetype)

---

## Overview

A fully realistic farm labour system. Workers are real people with skills, certifications, personalities, wages, and lives. They communicate with each other, request your approval before acting, and respond to how you treat them. Your farm consultant — a Charlie Ireland-type figure — acts as your right-hand man, filtering requests and managing day-to-day operations on your behalf.

---

## 1. Departments

| ID | Name | Spanish Label |
|----|------|---------------|
| `fields` | Fields | Campos |
| `animals` | Animals | Animales |
| `machinery` | Machinery | Maquinaria |
| `processing` | Processing | Procesado |
| `transport` | Transport | Transporte |
| `office` | Office | Oficina |

---

## 2. Job Roles

### 🌾 Fields
| Role | Key Responsibilities | Autonomy Ceiling |
|------|---------------------|-----------------|
| **Field Hand** | Planting, weeding, manual harvesting, irrigation checks. Entry-level. | Low — always asks |
| **Agronomist** *(absorbs Crop Scout)* | Daily pest/disease/stress field walks + soil analysis, crop rotation, fertiliser programs, yield forecasting. Triggers pest and disease requests. | High at Tier 4 |
| **Irrigation Technician** | Water scheduling, drip/sprinkler systems, aquifer draw management. Requests approval for major water use. | Medium |

### 🐄 Animals
| Role | Key Responsibilities | Autonomy Ceiling |
|------|---------------------|-----------------|
| **Livestock Hand** | Daily feeding, watering, mucking out, basic health checks. Flags anything unusual to the vet. | Low |
| **Veterinarian** | Diagnoses illness, prescribes treatment, performs procedures. Requests approval for expensive interventions. Always pre-certified. | High at Tier 4 |
| **AI Inseminator** | Artificial insemination, breeding schedules, semen selection, pregnancy checks. | Medium |
| **Farrier / Hoof Tech** | Hoof trimming and care for cattle, horses, pigs. Prevents lameness. Can be hired per-visit or full-time. | Medium |

### 🚜 Machinery
| Role | Key Responsibilities | Autonomy Ceiling |
|------|---------------------|-----------------|
| **Tractor Operator** | Operates tractors and implements — ploughing, planting, spraying, baling. | Medium |
| **Combine Operator** | Operates combine harvesters, grain carts, forage harvesters. High seasonal demand. | Medium |
| **Farm Mechanic** | Maintains and repairs all machinery. Reduces breakdown frequency. Flags machines needing replacement. | High — acts on breakdowns without asking |

### 🏭 Processing
**Factory minimum headcount rule:** Each processing building has a required worker count.
- Below minimum → factory paused
- At minimum → reduced efficiency
- Full staff → full output

| Role | Key Responsibilities | Autonomy Ceiling |
|------|---------------------|-----------------|
| **Processing Technician** | Operates equipment, maintains quality standards. Requests approval for large batches. Counts toward factory minimum. | Medium |
| **Quality Controller** | Tests outputs for grade, contamination, moisture, fat. Can reject batches. Unlocks premium market access at high ratings. Counts toward factory minimum. | High — can reject without asking |

### 🚛 Transport
| Role | Key Responsibilities | Autonomy Ceiling |
|------|---------------------|-----------------|
| **Transport Driver** | Moves product to market, auction, or processing. Required for time-sensitive deliveries. | Medium |

### 🏢 Office
| Role | Key Responsibilities | Autonomy Ceiling |
|------|---------------------|-----------------|
| **Farm Administrator** | Handles paperwork, subsidy applications, insurance claims, compliance. Without one, player does all admin — missing deadlines costs money. | High |
| **Security Guard** | Reduces theft events (machinery, livestock, fuel). Night shift option. Hired only when Charlie recommends it based on farm size and theft risk. | High |
| **Department Foreman** | Supervises one chosen department. Filters routine permission requests so only significant decisions reach the player. One per department max. | High |

---

## 3. Worker Entity

```typescript
interface Worker {
  id: string;
  name: string;
  age: number;                        // ages 1 game-year per real year
  nationality: string;
  role: WorkerRole;
  department: WorkerDepartment;
  pinnedAssetId?: string;             // specific field/pen/machine they're locked to
  
  // Experience & skills
  experienceYears: number;            // real years on the job
  skillTree: Record<string, number>;  // nodeId → progress 0–100
  certifications: WorkerCertification[];
  
  // Employment
  contractType: 'permanent' | 'seasonal' | 'casual';
  wagePerDay: number;                 // real-world accurate, varies by role + region + experience
  hireDate: number;                   // game day
  contractEndDate?: number;           // seasonal/casual only
  
  // Wellbeing
  satisfaction: number;               // 0–100
  satisfactionHistory: SatisfactionEvent[];
  isInjured: boolean;
  injuryRecoveryDay?: number;
  
  // Personality (revealed over time, not shown at hire)
  workEthic: number;                  // 0–100, hidden until ~2 weeks on job
  teamPlayer: number;                 // 0–100, hidden until ~2 weeks
  stressThreshold: number;            // 0–100, hidden until under pressure
  
  // Chemistry
  goodChemistryWith: string[];        // worker IDs
  badChemistryWith: string[];         // worker IDs, discovered over time
  
  // State
  currentTask?: WorkerTask;
  isStudying: boolean;
  studyingCertId?: string;
  isOnLeave: boolean;
  leaveReturnDay?: number;
  nightShift: boolean;
}
```

---

## 4. Consultant Entity (Charlie)

One named character. General at start, deepens expertise over time based on what decisions the player repeatedly needs.

```typescript
interface Consultant {
  id: string;
  name: string;                       // player names them at hire or uses default
  age: number;
  
  // Specialization
  specialization: ConsultantSpecialization | null;  // null until ~6 months in
  specializationProgress: Record<ConsultantSpecialization, number>; // tracks drift
  
  // Relationship
  relationshipScore: number;          // 0–100. Grows when you follow advice, drops when you ignore it
  autonomyLevel: number;              // 0–100. Tied to relationship. High = handles more without asking
  
  // Employer reputation (Charlie tracks this)
  employerReputation: number;         // 0–100. Affects applicant quality/quantity
  
  // State
  isHired: boolean;
  hireCost: number;                   // higher day rate than other workers
}

type ConsultantSpecialization =
  | 'crops'       // soil, pests, crop cycles
  | 'livestock'   // animal health, genetics, breeding
  | 'operations'  // machinery, efficiency, logistics
  | 'business'    // contracts, subsidies, market timing
  | 'compliance'; // regulations, insurance, audits
```

**Charlie's personality:** Dry, practical, occasionally frustrated. Tells you when you're making a mistake. Acts autonomously on routine tasks. Escalates only what genuinely needs the player's call.

**Charlie's special role:** He recommends hiring security when farm size, theft events, and regional risk cross a threshold. Player should not proactively hire security — wait for Charlie's recommendation.

---

## 5. Permission Request System

### Architecture: Dedicated Tab + Charlie Filters First

All worker requests go to Charlie first:
- **Routine** → Charlie handles it, logs it in "Charlie Handled" section
- **Significant** → Charlie escalates to player's Requests tab

### Requests Tab Structure
```
[ Needs Your Decision ]         ← escalated by Charlie, requires player action
  - Urgent requests (timer, consequences if ignored)
  - Standard requests (2-day window)

[ Charlie Handled ]             ← collapsible log, informational only
  - What Charlie dealt with today
  - What senior workers auto-handled
```

### Timeout Behaviour by Experience
| Experience Level | Timeout Behaviour |
|-----------------|-------------------|
| Junior (0–2 yrs) | Waits indefinitely. Task doesn't happen until approved. |
| Mid (2–5 yrs) | Waits 1 game day, then skips the task. Consequences accumulate. |
| Senior (5–10 yrs) | Waits 4 hours (game time), then acts on judgment. Quality tied to skill level. |
| Expert (10+ yrs / Tier 4) | Full autonomy in their domain. Never asks. Only logs what they did. |

### Request Card Fields
- Worker name, role, avatar
- Message in their voice (casual/formal by personality)
- Cost and consequence estimate
- Urgency badge (URGENT / ROUTINE)
- Countdown timer for urgent requests
- **"Ask Charlie"** button — Charlie gives his recommendation before you decide
- Approve / Deny buttons

---

## 6. Worker-to-Worker Communication

Workers communicate with each other autonomously. Communication model:

- **Routine coordination** → invisible to player. Happens in background (vet tells livestock hand what treatment to continue, mechanic warns tractor driver about a fault).
- **Information passing** → logged in Charlie Handled (e.g. "Agronomist flagged pest pressure in Field 3 to Tractor Operator").
- **Disagreements** → surfaces to player as a request. Player sides with one worker. The other's satisfaction takes a small hit. Repeatedly siding against the same worker damages their satisfaction significantly.
- **Joint tasks** → some tasks require two workers (e.g. vet + livestock hand for a procedure). Surfaces as a single joint request.

---

## 7. Satisfaction System

`satisfaction` is 0–100. Below 30 = performance penalty. Below 15 = quit risk. Farm-wide average below 25 = strike risk.

### Satisfaction Factors
| Factor | Effect |
|--------|--------|
| Pay rise granted | +10 to +20 |
| Pay rise denied | −8 to −15 |
| Sided with in a disagreement | +5 |
| Sided against in a disagreement | −5 to −10 (cumulative) |
| Given full autonomy (high experience) | +5/month |
| Micromanaged (senior worker, all requests denied) | −3/week |
| Overworked (too many pinned tasks) | −4/week |
| Underutilized | −2/week |
| Working with good chemistry colleague | +2/week |
| Working with bad chemistry colleague | −3/week |
| Equipment broken / poor facilities | −2/week |
| Performance review acknowledged | +8 |
| Performance review ignored/overdue | −5 |
| Personal request granted (time off, exam fee) | +6 to +12 |
| Personal request denied | −4 to −8 |
| Injury occurred | −15 (+ recovery anxiety) |
| Working night shift without premium pay | −5/week |
| Pay received on time | +1/week |
| Pay delayed | −10 immediately |

### Strikes
When farm-wide satisfaction average drops below 25 for 3 consecutive days:
- Workers collectively down tools
- Charlie acts as mediator
- Player must negotiate: raise wages, improve conditions, or lose workers
- Rare but devastating to operations

---

## 8. Skill Trees

### Structure
- **4 tiers** unlocked by years of experience (XP = time on the job, not grinding)
- **Tier 3 branches** into 2–3 specialisation paths — **player chooses the branch** when the worker reaches Tier 3 XP threshold
- **Tier 4 (Master)** = full autonomy in their domain, can mentor junior staff

### Certifications
- Embedded as nodes within the skill tree
- Require **study time** (worker is ~30% less productive while studying) + **exam fee**
- Player can pay to send worker on an **external training course** to halve study time
- Certs marked **✦** are always held by that role at hire (legal requirement)
- All other certs appear randomly on applicants — more likely the more experienced they are

### Example: Agronomist Tree
| Tier | Nodes |
|------|-------|
| 1 (0–1yr) | Field Scouting, Soil Reading |
| 2 (1–3yr) | Crop Rotation, 📜 Pesticide Applicator Cert, Irrigation Planning |
| 3 (3–6yr) | *Branch:* IPM Specialist / 📜 Certified Agronomist / Precision Ag |
| 4 (6+yr) | Master Agronomist (full autonomy, mentors juniors) |

### Example: Farm Mechanic Tree
| Tier | Nodes |
|------|-------|
| 1 (0–1yr) | Basic Maintenance, Tool Safety ✦, Machine Log-keeping |
| 2 (1–3yr) | Hydraulics, 📜 Electrical Engineer Cert, Welding & Fabrication |
| 3 (3–6yr) | *Branch:* Heavy Plant Specialist / Precision Electronics / Workshop Manager |
| 4 (6+yr) | Master Mechanic (full autonomy, mentors juniors) |

**Electrical Engineer Cert** (Tier 2, ~60hr study, $400 exam fee) unlocks:
- Install, service, and repair solar panels, wind turbines, and battery banks
- Grid infrastructure upgrades
- Lightning damage repair on electrical equipment
- Battery health checks and replacements

*(Full trees for all 15 roles to be defined in implementation)*

### Apprenticeships
- Pair a junior worker with a Tier 3+ senior worker
- Junior gains XP 50% faster
- Senior is 15% less productive while mentoring
- Unlocked once any worker reaches Tier 3

---

## 9. Hiring System

### Job Board Flow
1. Player posts a vacancy (role + contract type + offered wage)
2. Applicant pool generates over 1–3 game days
3. Pool size = random roll within seasonal range:
   - Harvest season: 0–3 applicants, high wage expectations
   - Off-season: 3–12 applicants, lower wage expectations
   - Shoulder season: 1–6 applicants, moderate wages
4. Player reviews applicants and selects one (or none)
5. Hiring costs a one-off fee (varies by role)

### Applicant Information (Partial Reveal)
**Visible at hire:** Name, age, nationality, years experience, contract preference, asking wage, certifications held, one or two personality hints  
**Hidden until ~2 weeks on the job:** Work ethic score, team player score, stress threshold, chemistry with existing staff

### Contract Types
| Type | Description | Cost |
|------|-------------|------|
| **Permanent** | Year-round employment. Full benefits. Redundancy cost if fired. | Highest total cost, most stable |
| **Seasonal** | Fixed-term for a season. No off-season pay. End date set at hire. | Medium cost, no commitment beyond term |
| **Casual** | Day rate, no commitment. Available when needed. | Highest day rate, zero obligation |

### Employer Reputation
- Charlie tracks your reputation as an employer (0–100)
- High reputation → more applicants, better quality, lower wage demands
- Low reputation → fewer applicants, worse quality, higher demands
- Reputation affected by: fair wages, on-time pay, treatment of workers, dismissal behaviour

---

## 10. Worker Economics

### Payroll
- Wages auto-deducted weekly (every 7 game days)
- If farm balance can't cover payroll: Charlie warns you 2 days before
- Missed payroll: immediate −10 satisfaction for all workers, Charlie escalates as urgent

### Realistic Wage Ranges (USD/day, adjustable by price region)
| Role | Junior | Senior |
|------|--------|--------|
| Field Hand | $40–60 | $60–90 |
| Agronomist | $120–160 | $180–250 |
| Veterinarian | $200–300 | $300–450 |
| AI Inseminator | $150–200 | $220–300 |
| Tractor/Combine Op | $80–120 | $120–180 |
| Farm Mechanic | $90–130 | $140–200 |
| Processing Tech | $70–100 | $100–140 |
| Transport Driver | $80–110 | $110–160 |
| Consultant | $300–500 | — (flat) |

---

## 11. Worker Events

### Injuries
- Can occur during: machinery operation, animal handling, chemical application
- Probability reduced by: relevant certs, safety equipment, mechanic keeping machines maintained
- Injured worker unavailable for `recoveryDays` (3–21 days depending on severity)
- Costs covered by farm insurance if policy active
- Triggers insurance claim request via Charlie

### Poaching
- NPC competitor farms can approach your workers (more likely to target high-skill, high-experience staff)
- Player gets notification: *"[Worker] has been approached by [NPC Farm] — they're offering $X/day more."*
- Player can match, negotiate, or let them go
- Consultant (Charlie) can't be poached

### Retirement / Aging
- Workers age 1 year per game year
- Workers retire at age 62–68 (random per worker)
- Charlie gives 1-year advance warning: *"Tom Bradley's talking about retiring in the next year or so — worth thinking about succession."*

### Night Shifts
- Certain roles support night shift: Livestock Hand (dairy milking), Security Guard, Processing Technician
- Night shift workers require a wage premium (+20–30%) or satisfaction drops
- Scheduled independently from day workers

### Performance Reviews
- Charlie reminds player when a review is overdue (every 6 months per worker)
- Review options: Give raise, Praise, Issue warning, Let go
- Skipping reviews hurts satisfaction; holding them builds loyalty

### Personal Requests
Workers occasionally ask the player directly:
- *"Can I take [day] off?"* — Approve/Deny (affects satisfaction, leaves task gap)
- *"Will you cover my exam fee?"* — Approve/Deny (speeds up certification)
- *"I need better equipment to do my job properly"* — triggers equipment review
- *"I'd like a pay rise"* — Approve/Deny/Negotiate

### Team Chemistry
- Discovered organically after 2+ weeks working together
- Good chemistry: +2 satisfaction/week for both, small output bonus
- Bad chemistry: −3 satisfaction/week for both, occasional disagreement requests
- Charlie surfaces chemistry issues: *"James and Pedro don't seem to be getting along — might be worth separating them."*

---

## 12. System Integrations

| Existing System | Integration |
|----------------|-------------|
| **Weather / Climate** | Extreme heat/cold/rain reduces outdoor worker productivity or stops work entirely |
| **Pest System** | Agronomist is primary detector. Without agronomist, pests go undetected longer |
| **Water System** | Irrigation Technician manages aquifer draw and scheduling. Without one, water use is suboptimal |
| **Processing Buildings** | Each building has a `minWorkers` and `fullStaffCount`. Under-staffed = paused or reduced output |
| **Animal System** | Vet required for treatments, AI Inseminator for genetics work, Livestock Hand for daily health |
| **Machinery System** | Machines need an operator to run. Farm Mechanic reduces breakdown frequency |
| **Insurance System** | Worker injuries trigger claims. Admin handles claim paperwork |
| **NPC Competitors** | Competitor farms poach workers. Higher employer reputation = harder to poach |
| **Market / Auction** | Transport Driver required for time-sensitive deliveries and auction runs |
| **Banking / Subsidies** | Farm Administrator accelerates subsidy applications and compliance filings |

---

## 13. New Files Required

| File | Purpose |
|------|---------|
| `data/workerTypes.ts` | All role definitions, cert definitions, skill tree structures, wage ranges |
| `engine/workers.ts` | Daily tick logic: task scheduling, request generation, satisfaction updates, XP gain, injury rolls, poaching rolls, payroll deduction |
| `store/useGameStore.ts` | Add `workers[]`, `consultant`, `pendingRequests[]`, `requestLog[]`, `jobPostings[]`, `employerReputation` to game state |
| `app/(tabs)/trabajadores.tsx` | Full workers UI: staff list, requests tab, hire flow, worker detail/skill tree |

---

## 14. Save Key

Adding workers state to `useGameStore` requires bumping the save key from `granja-tycoon-save-v5` to `granja-tycoon-save-v6`. Old saves will not migrate — this is expected.

---

## 15. Out of Scope

- Worker housing building (post-MVP, can add later)
- Union mechanics beyond basic strike (too complex for first pass)
- Multiple consultants
- Worker storylines / narrative arcs (post-MVP)
