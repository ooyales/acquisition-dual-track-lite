# IT Acquisition & Lifecycle Management — Deep Dive Architecture
## Dual-Track: Power Platform (Deploy Now) + AWS (Art of the Possible)

---

# PART 1: POWER PLATFORM VERSION
## "The Washing Machine" — Guided Intake, Dynamic Checklists, Parallel Routing

---

## Design Philosophy

**The old way:** Pick a checklist → hope it's right → fill out forms → 
email to approver → wait → get bounced → start over.

**The new way:** Answer questions about your situation → system determines 
the acquisition type, required documents, approval flow, and stakeholder 
advisories → work on documents in parallel → everyone who needs to see 
something sees it when the data exists, not when it's "their turn."

**Three core principles:**
1. **Never ask the user to classify** — the system classifies based on answers
2. **Never shame a correction** — changing an answer recalculates everything 
   gracefully, preserving all work already done
3. **Parallel where possible, sequential only where logically required** — 
   SCRM doesn't wait for Finance; Finance doesn't wait for General Counsel


## Updated Threshold Tiers (Effective Oct 1, 2025)

| Tier | Range | Pipeline | Key Characteristic |
|---|---|---|---|
| Micro-Purchase | ≤ $15,000 | Purchase card, minimal docs | GPC, no competition required |
| Simplified (SAT) | $15,001 – $350,000 | Abbreviated pipeline | Simplified procedures, set-aside for small business |
| Above SAT | $350,001 – $9M (commercial) | Full pipeline | Full competition, complete documentation |
| Major Acquisition | > $9M | Full pipeline + additional oversight | Senior leadership review, enhanced documentation |

Note: These are the current FAR thresholds. The system should store 
thresholds as configurable values, not hard-coded — they change every 
few years with inflation adjustments.


## Acquisition Type Decision Tree

Instead of asking "what type of acquisition is this?" up front, the guided 
intake asks situational questions and derives the type.

### Guided Intake Questions (in order)

```
Q1: "What do you need?"
    → New product or service (never had before)
    → Continue/extend something we already have
    → Change something on an existing contract

    ┌─── "New product or service" ──────────────────────────────┐
    │                                                            │
    │ Q2: "Is there a specific product or vendor required?"      │
    │     → Yes, only one vendor/product can meet the need       │
    │       → TYPE: Brand Name / Sole Source                     │
    │       → TRIGGERS: Brand Name Justification (J&A)           │
    │     → No, multiple options could work                      │
    │       → TYPE: New Competitive Acquisition                  │
    │     → Not sure yet                                         │
    │       → TYPE: New Acquisition (competition TBD pending MR) │
    │       → TRIGGERS: Market Research required before ASR      │
    │                                                            │
    │ Q3: "Is this buy available on an existing vehicle?"        │
    │     → Yes, ESI / BPA / GWAC / GSA Schedule                 │
    │       → TRIGGERS: Exception to Fair Opportunity if IDIQ    │
    │     → No / Not sure                                        │
    │       → Standard competition path                          │
    │                                                            │
    └────────────────────────────────────────────────────────────┘

    ┌─── "Continue/extend something we already have" ────────────┐
    │                                                             │
    │ Q2: "What's the situation with the current contract?"       │
    │     → Contract has option years remaining                   │
    │       → TYPE: Option Exercise                               │
    │       → ABBREVIATED PIPELINE                                │
    │     → Contract is expiring, we want the same contractor     │
    │       → TYPE: Follow-On Sole Source                         │
    │       → TRIGGERS: J&A, Market Research                      │
    │     → Contract is expiring, we should compete it            │
    │       → TYPE: Re-Compete                                    │
    │       → FULL PIPELINE                                       │
    │     → We need a bridge to buy time for re-compete           │
    │       → TYPE: Bridge Extension (-8 / Option Extension)      │
    │       → KO-ABBREVIATED PIPELINE                             │
    │     → Contract expired already (gap in coverage)            │
    │       → TYPE: New Competitive (urgency flag)                │
    │       → TRIGGERS: Emergency/Urgency justification           │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘

    ┌─── "Change something on an existing contract" ─────────────┐
    │                                                             │
    │ Q2: "What kind of change?"                                  │
    │     → Add scope, increase funding, extend period            │
    │       → TYPE: Bilateral Modification                        │
    │       → PIPELINE: Depends on dollar value of change         │
    │     → Correct an error, administrative update               │
    │       → TYPE: Unilateral Modification (Administrative)      │
    │       → KO-ONLY (log and notify)                            │
    │     → Move funding between CLINs                            │
    │       → TYPE: CLIN Reallocation                             │
    │       → KO-ONLY (log and notify)                            │
    │     → De-scope or reduce funding                            │
    │       → TYPE: De-scope Modification                         │
    │       → PIPELINE: KO + COR + Program Manager               │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
```

### Dollar Threshold Question (always asked)

```
Q-DOLLAR: "What's the estimated total value?"
    (or "What's the value of the modification?" for mods)

    → ≤ $15,000
      → TIER: Micro-Purchase
      → DOCS: Minimal (purchase request, price reasonableness)
      → PIPELINE: Requestor → COR/Budget → GPC Holder (done)

    → $15,001 – $350,000
      → TIER: SAT
      → DOCS: Standard simplified set
      → PIPELINE: ISS → ASR → Finance → KO

    → $350,001 – $9,000,000
      → TIER: Above SAT
      → DOCS: Full documentation package
      → PIPELINE: ISS → ASR → Finance → KO → Legal → CIO (if IT)

    → > $9,000,000
      → TIER: Major
      → DOCS: Full + enhanced (senior leadership briefing)
      → PIPELINE: Full + Component Head / Agency Head review
```

### "Oops" Design — Changing Answers

When a user changes any answer in the guided intake:

1. System recalculates the acquisition type and tier
2. Document checklist updates:
   - Documents still required: **preserved** (no data loss)
   - Documents no longer required: **moved to "Not Required"** section 
     (greyed out but accessible — work is never deleted)
   - New documents now required: **added** with "NEW" badge
3. Approval flow updates:
   - Steps still relevant: **preserved** with any existing approvals intact
   - Steps no longer needed: **removed from pipeline** (logged in history)
   - New steps added: **inserted** at correct position
4. User sees a clear summary: "Based on your updated answers, here's 
   what changed" — with a diff-style view


## Dynamic Document Checklist Engine

### Document Catalog (Pre-Loaded Reference Data)

Each document has conditions that determine when it's required.

| Document | Required When | Required Before |
|---|---|---|
| **Requirements Description / SOW / SOO / PWS** | All acquisitions (not micro-purchase) | ISS |
| **Independent Government Cost Estimate (IGCE)** | Above micro-purchase | ASR |
| **Market Research Report** | New competitive, re-compete, follow-on sole source | ASR |
| **Acquisition Strategy / Acquisition Plan** | Above SAT | ASR |
| **Brand Name Justification (J&A)** | Brand name / sole source | ASR |
| **Exception to Fair Opportunity** | Task order on IDIQ with limited sources | ASR |
| **Determination & Findings (D&F)** | Time & materials, cost-plus, other than fixed-price | ASR |
| **SCRM Assessment** | IT acquisitions with hardware/software | ISS (parallel) |
| **Small Business Coordination Record** | Above micro-purchase | ASR |
| **Funding Certification (PR&C)** | All (except modifications within ceiling) | KO Review |
| **Quality Assurance Surveillance Plan (QASP)** | Service contracts above SAT | KO Review |
| **Past Performance Evaluation Plan** | Competitive above SAT | KO Review |
| **Source Selection Plan** | Competitive above SAT | KO Review |
| **Section 508 Compliance Assessment** | IT acquisitions | ASR |
| **CIO Approval / IT Governance Review** | IT acquisitions (all tiers) | ISS (parallel) |
| **Bill of Materials / Product List** | IT hardware/software acquisitions | ISS (parallel, feeds SCRM) |
| **Contract Data Requirements List (CDRL)** | Data deliverables required | KO Review |
| **Security Requirements Document** | Classified or CUI-handling requirements | ASR |
| **Option Exercise Letter** | Option exercise only | KO Action |
| **Modification Document (SF-30)** | Modifications only | KO Action |
| **Bridge/Extension Justification** | Bridge contracts only | KO + COR |
| **Contractor Performance Assessment (CPARS)** | Re-compete, follow-on (existing contractor) | ASR |

### Dataverse Implementation

**Table: oly_DocumentTemplate**

| Column | Type | Description |
|---|---|---|
| oly_DocumentTemplateId | PK | |
| oly_Name | Text (200) | "Market Research Report" |
| oly_Description | Multi-Line | What this document is and why it's needed |
| oly_Category | Choice | Pre-Award, Award, Post-Award, Administrative |
| oly_SharePointTemplateUrl | URL | Link to the Word/Excel template |
| oly_RequiredBefore | Choice | ISS, ASR, Finance Review, KO Review, Award |

**Table: oly_DocumentRule** (the dynamic logic)

| Column | Type | Description |
|---|---|---|
| oly_DocumentRuleId | PK | |
| oly_DocumentTemplate | Lookup → oly_DocumentTemplate | Which document |
| oly_Condition | Text (500) | JSON-encoded rule (see below) |
| oly_Applicability | Choice | Required, Conditional, Recommended, Not Required |
| oly_Priority | Whole Number | For ordering |

**Rule format (stored as JSON in Condition column):**
```json
{
  "allOf": [
    {"field": "AcquisitionType", "operator": "in", 
     "values": ["New Competitive", "Re-Compete"]},
    {"field": "EstimatedValue", "operator": ">", "value": 15000}
  ]
}
```

**Table: oly_PackageDocument** (actual document instances per request)

| Column | Type | Description |
|---|---|---|
| oly_PackageDocumentId | PK | |
| oly_AcquisitionRequest | Lookup → oly_AcquisitionRequest | |
| oly_DocumentTemplate | Lookup → oly_DocumentTemplate | |
| oly_Status | Choice | Not Started, In Progress, Complete, Not Required, N/A |
| oly_AssignedTo | Lookup → SystemUser | |
| oly_DueDate | Date Only | |
| oly_CompletedDate | Date Only | |
| oly_SharePointUrl | URL | Actual document location |
| oly_RequiredBefore | Choice | Which gate needs this |
| oly_IsRequired | Yes/No | Based on current rule evaluation |
| oly_WasRequired | Yes/No | Was required before user changed intake answers |
| oly_Notes | Multi-Line | |


## Parallel Routing Architecture

### The Key Insight: Advisory vs. Approval

Not every review is an approval gate. Some are advisory inputs that should 
happen in parallel with other work, informing the next approval gate.

**Advisory Inputs (parallel, no blocking):**

| Advisory Team | Triggered When | What They Review | Feeds Into |
|---|---|---|---|
| SCRM Team | Bill of Materials or vendor names exist | TAA compliance, country of origin, supply chain risk | ISS / ASR |
| Small Business Office | Market Research drafted | Small business availability, set-aside recommendation | ASR |
| CIO / IT Governance | IT acquisition (any tier) | Technical approach, vehicle recommendation, ESI applicability | ISS / ASR |
| Section 508 | IT acquisition with user-facing components | Accessibility compliance | ASR |

These teams get notified the *moment* the relevant data exists in the request 
— not when "it's their turn." They provide input that's visible to everyone 
at the next gate. If they flag an issue (e.g., "this vendor fails TAA"), 
the requestor sees it immediately and can adjust before wasting time.

**Approval Gates (sequential, blocking):**

| Gate | Approver | Required For | Purpose |
|---|---|---|---|
| 1. ISS (Initial Strategy Session) | Branch Chief / Req. Owner | Above micro-purchase | Validate need, review approach |
| 2. ASR (Acquisition Strategy Review) | Acquisition Review Board | Above SAT | Review strategy, competition, docs |
| 3. Finance Approval | Budget Officer | All (funding certification) | Confirm funds available |
| 4. KO Review | Contracting Officer | All (except micro-purchase) | Review complete package |
| 5. Legal Review | General Counsel | Above SAT + sole source/J&A | Legal sufficiency |
| 6. CIO Approval | Chief Information Officer | IT acquisitions above threshold | IT governance |
| 7. Senior Leadership | Component/Agency Head | Major acquisitions (>$9M) | Executive approval |

### Flow Design: Parallel Advisories + Sequential Gates

```
REQUEST SUBMITTED
       │
       ├──→ [PARALLEL] SCRM Team reviews Bill of Materials
       ├──→ [PARALLEL] CIO team reviews technical approach  
       ├──→ [PARALLEL] Small Business reviews market research (when ready)
       ├──→ [PARALLEL] 508 team reviews accessibility (when applicable)
       │
       ▼
   ┌─ GATE 1: ISS ─────────────────────────────────────────┐
   │  All parallel advisory inputs visible at this point     │
   │  Approver can see: SCRM flags, CIO recommendations     │
   │  Decision: Proceed / Revise / Reject                    │
   └────────────────────────────────────────────────────────┘
       │
       ▼ (continue document preparation)
       │
   ┌─ GATE 2: ASR ─────────────────────────────────────────┐
   │  Document completeness check (required-before-ASR docs) │
   │  Small Business input visible                           │
   │  CIO vehicle recommendation visible                     │
   │  Decision: Approve strategy / Revise / Reject           │
   └────────────────────────────────────────────────────────┘
       │
       ├──→ [PARALLEL] Finance reviews funding (if not already done)
       ├──→ [PARALLEL] Legal reviews J&A (if applicable)
       │
       ▼
   ┌─ GATE 3: KO Package Review ───────────────────────────┐
   │  All docs complete, all advisories resolved             │
   │  Finance certified, Legal cleared (if needed)           │
   │  Decision: Accept package / Return with deficiencies    │
   └────────────────────────────────────────────────────────┘
       │
       ▼
   PROCEED TO SOLICITATION / AWARD
```

### Abbreviated Pipelines

**Option Exercise:**
```
Request → COR confirms performance → Finance certifies funds → KO executes
(No ISS, no ASR, no competition documents)
```

**Bridge Extension (-8):**
```
Request → COR + PM justify need → KO determines authority → KO executes
(J&A if sole source bridge, otherwise admin action)
```

**KO-Only (Unilateral Mod, CLIN Reallocation):**
```
Request → KO documents action → Log & Notify COR/PM → Done
```

**Micro-Purchase:**
```
Request → Supervisor approves → GPC holder purchases → Log
(No ISS, no ASR, no competition, minimal documentation)
```


## Dataverse Schema Additions

### Table: oly_AcquisitionRequest (Enhanced from previous sketch)

**New columns for guided intake:**

| Column | Type | Description |
|---|---|---|
| oly_IntakeQ1_NeedType | Choice | New / Continue-Extend / Change Existing |
| oly_IntakeQ2_Situation | Choice | (Dynamic based on Q1 — see decision tree) |
| oly_IntakeQ3_SpecificVendor | Choice | Yes / No / Not Sure |
| oly_IntakeQ4_ExistingVehicle | Choice | ESI / BPA / GWAC / GSA / No / Not Sure |
| oly_IntakeQ5_ChangeType | Choice | (For modifications — see decision tree) |
| oly_DerivedAcquisitionType | Choice | New Competitive, Re-Compete, Follow-On, Option Exercise, Bridge, Bilateral Mod, Unilateral Mod, CLIN Reallocation, Brand Name, Micro-Purchase |
| oly_DerivedTier | Choice | Micro-Purchase, SAT, Above SAT, Major |
| oly_DerivedPipeline | Choice | Full, Abbreviated, KO-Only, Micro |
| oly_IntakeCompleted | Yes/No | All required questions answered |
| oly_IntakeCompletedDate | DateTime | |
| oly_IntakeLastModified | DateTime | Track when answers change |

**Existing contract fields (for continue/extend/change paths):**

| Column | Type | Description |
|---|---|---|
| oly_ExistingContractNumber | Text (50) | |
| oly_ExistingContractVendor | Text (200) | |
| oly_ExistingContractValue | Currency | |
| oly_ExistingContractEndDate | Date Only | |
| oly_ExistingContractVehicle | Text (200) | GWAC, BPA, etc. |
| oly_OptionsRemaining | Whole Number | |
| oly_CurrentOptionYear | Whole Number | |
| oly_CPARSRating | Choice | Exceptional, Very Good, Satisfactory, Marginal, Unsatisfactory |

**Parallel advisory tracking:**

| Column | Type | Description |
|---|---|---|
| oly_SCRMStatus | Choice | Not Required, Pending, Clear, Flagged, Waived |
| oly_SCRMNotes | Multi-Line | SCRM team findings |
| oly_SCRMReviewedBy | Lookup → SystemUser | |
| oly_SCRMReviewedDate | DateTime | |
| oly_SBOStatus | Choice | Not Required, Pending, Set-Aside Recommended, No Set-Aside, Small Business Available |
| oly_SBONotes | Multi-Line | |
| oly_CIOStatus | Choice | Not Required, Pending, Approved, ESI Required, Concerns |
| oly_CIONotes | Multi-Line | |
| oly_Section508Status | Choice | Not Required, Pending, Compliant, Exceptions Needed |

### Table: oly_ThresholdConfig (Configurable — not hard-coded)

| Column | Type | Description |
|---|---|---|
| oly_ThresholdConfigId | PK | |
| oly_Name | Text (100) | "Micro-Purchase Threshold" |
| oly_Value | Currency | 15000 |
| oly_EffectiveDate | Date Only | 2025-10-01 |
| oly_ExpirationDate | Date Only | (null = current) |
| oly_FARReference | Text (50) | "FAR 2.101" |
| oly_Notes | Multi-Line | |

### Table: oly_AdvisoryInput

Captures parallel advisory team inputs.

| Column | Type | Description |
|---|---|---|
| oly_AdvisoryInputId | PK | |
| oly_AcquisitionRequest | Lookup → oly_AcquisitionRequest | |
| oly_Team | Choice | SCRM, Small Business Office, CIO/IT Governance, Section 508, Legal, Other |
| oly_Status | Choice | Requested, In Review, Complete - No Issues, Complete - Issues Found, Waived |
| oly_Findings | Multi-Line | What they found |
| oly_Recommendation | Multi-Line | What they recommend |
| oly_Reviewer | Lookup → SystemUser | |
| oly_RequestedDate | DateTime | When the advisory was triggered |
| oly_CompletedDate | DateTime | |
| oly_ImpactsStrategy | Yes/No | Does this change the acquisition approach? |
| oly_BlocksGate | Choice | None, ISS, ASR, KO Review | Which gate should this block if unresolved |


## Power Automate Flows

### Flow 1: Intake Completion → Generate Checklist & Pipeline

```
TRIGGER: When oly_AcquisitionRequest.IntakeCompleted changes to Yes

STEP 1: Evaluate guided intake answers
        → Determine DerivedAcquisitionType
        → Determine DerivedTier (based on EstimatedValue + ThresholdConfig)
        → Determine DerivedPipeline

STEP 2: Query oly_DocumentRule table
        → For each rule, evaluate Condition against request fields
        → Generate oly_PackageDocument records for all applicable documents
        → Set RequiredBefore gate for each
        → Set IsRequired = Yes/No based on rule evaluation

STEP 3: Generate approval pipeline
        → Look up ApprovalTemplate based on DerivedPipeline
        → Create ApprovalStep records

STEP 4: Trigger parallel advisories
        → If IT acquisition + Bill of Materials exists:
          → Create AdvisoryInput for SCRM (Status = Requested)
          → Notify SCRM team with BOM data
        → If IT acquisition:
          → Create AdvisoryInput for CIO (Status = Requested)
          → Notify CIO team with technical details
        → If above micro-purchase:
          → Create AdvisoryInput for SBO (Status = Requested)
          → Will be notified again when Market Research is ready

STEP 5: Notify requestor:
        "Your acquisition [Number] has been set up as a [Type].
         [X] documents are required. First gate: [Gate Name] by [Date]."
```

### Flow 2: Intake Answer Changed → Recalculate

```
TRIGGER: When oly_AcquisitionRequest intake fields modified 
         AND IntakeCompleted = Yes

STEP 1: Re-evaluate all rules (same as Flow 1, Steps 1-2)

STEP 2: Compare new document list to existing:
        → Documents still required: no change
        → Documents no longer required:
          → Set IsRequired = No, WasRequired = Yes
          → DO NOT delete the record or any uploaded document
        → New documents required:
          → Create new PackageDocument records

STEP 3: Compare new pipeline to existing:
        → Steps still relevant: preserve
        → Steps no longer needed: set Status = "Skipped"
        → New steps: insert at correct position

STEP 4: Notify requestor:
        "Your acquisition type has been updated to [New Type].
         Added: [new docs]. Removed: [removed docs]. 
         All existing work has been preserved."
```

### Flow 3: Advisory Input Received

```
TRIGGER: When oly_AdvisoryInput.Status changes to Complete

STEP 1: If ImpactsStrategy = Yes:
        → Notify requestor and assigned COR
        → If advisory has BlocksGate set:
          → Flag the gate: "Advisory issue must be resolved"
        
STEP 2: If Team = SCRM and Status = "Complete - Issues Found":
        → High-priority notification:
          "SCRM has identified supply chain concerns with [Vendor].
           [Findings summary]. This must be resolved before [Gate]."

STEP 3: Update parent request advisory status fields
        → e.g., oly_SCRMStatus = advisory.Status
```

### Flow 4: Gate Readiness Check

```
TRIGGER: When document status changes to "Complete"
         OR when advisory input completed

STEP 1: Check: Are all required-before-[this gate] documents complete?
STEP 2: Check: Are all advisory inputs for this gate resolved?
STEP 3: If all conditions met:
        → Move gate to "Ready for Review"
        → Notify approver: "Gate [X] for [Request] is ready"
STEP 4: If not all conditions met:
        → Calculate completeness percentage
        → Show: "3 of 5 documents complete, 1 advisory pending"
```

### Flow 5: KO-Only Action (Short Circuit)

```
TRIGGER: When DerivedPipeline = "KO-Only"

STEP 1: Skip all approval gates
STEP 2: Route directly to KO for action
STEP 3: KO documents justification
STEP 4: Status = "Executed"
STEP 5: Notify COR, PM for awareness only
STEP 6: Log in change history
```


## Model-Driven App: Enhanced Design

### Guided Intake (Custom Page or Canvas App Component)

The intake wizard should NOT be the standard Model-Driven form. It should 
be a clean, guided experience — either:

**Option A: Embedded Canvas App** within the Model-Driven App
- Canvas App provides the wizard-style step-by-step experience
- Writes to the same Dataverse tables
- Model-Driven App shows the results and ongoing management

**Option B: Custom Page (recommended)**
- Power Apps custom pages can be added to Model-Driven Apps
- Full design control for the intake wizard
- Seamless transition to Model-Driven for workflow management

### Main Form: Enhanced with Advisory Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  ACQ-FY26-0031  │  Re-Compete  │  Above SAT  │  Full Pipeline  │
│  [$1.2M IT Services]                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ADVISORY PANEL (always visible at top)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ SCRM     │ │ SBO      │ │ CIO      │ │ 508      │          │
│  │ 🟡 Review│ │ ✅ Clear │ │ ⚠️ ESI   │ │ ⬜ N/A   │          │
│  │          │ │ SB avail │ │ required │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                  │
│  Tab: Intake Answers                                             │
│  Tab: Document Checklist (dynamic, with gate grouping)           │
│  Tab: Approval Pipeline (visual stage indicator)                 │
│  Tab: Advisory Details                                           │
│  Tab: Existing Contract (if applicable)                          │
│  Tab: Post-Award                                                 │
│  Tab: Activity / Comments                                        │
│                                                                  │
│  DOCUMENT CHECKLIST (grouped by gate)                            │
│  ┌─ Required Before: ISS ──────────────────────────────────┐   │
│  │ ✅ Requirements Description (SOW)          Complete      │   │
│  │ 🔄 Bill of Materials                       In Progress   │   │
│  │ ✅ SCRM Assessment                          Complete      │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌─ Required Before: ASR ──────────────────────────────────┐   │
│  │ ✅ Market Research Report                   Complete      │   │
│  │ ✅ IGCE                                     Complete      │   │
│  │ 🔄 Acquisition Strategy                    In Progress    │   │
│  │ ✅ Small Business Coordination              Complete      │   │
│  │ ⬜ Source Selection Plan                    Not Started    │   │
│  │ ─── Previously Required (type changed) ───               │   │
│  │ 🚫 Brand Name Justification           No Longer Required │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```


## Power BI Dashboard Additions

### Gate Flow Visualization

```
┌──────────────────────────────────────────────────────────────┐
│               ACQUISITION PIPELINE STATUS                     │
│                                                              │
│  ● ISS ───── ◉ ASR ───── ○ Finance ─── ○ KO ─── ○ Award   │
│  Complete    Active       Waiting      Waiting    Waiting    │
│                                                              │
│  Gate 2 (ASR) Status:                                        │
│  Documents:  4/6 complete (67%)                              │
│  Advisories: SCRM ✅ | SBO ✅ | CIO ⚠️ pending              │
│  Blockers:   CIO review outstanding                          │
│                                                              │
│  CYCLE TIME ANALYTICS                                        │
│  Avg ISS to ASR:        12 days (target: 10)                 │
│  Avg ASR to KO:         18 days (target: 15)                 │
│  Avg KO to Award:       8 days (target: 5)                   │
│  Total Avg Cycle:       38 days                              │
│  Most Common Bottleneck: ASR (advisory inputs delayed)       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```


---


# PART 2: AWS VERSION (Art of the Possible)
## Everything in Part 1, Plus AI

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React Frontend (same guided intake wizard)                   │
│  ├── Intake Wizard (identical logic to Power Platform)        │
│  ├── Document Workspace                                       │
│  ├── Pipeline Dashboard                                       │
│  └── AI Assistant Panel (the differentiator)                  │
├──────────────────────────────────────────────────────────────┤
│  FastAPI Backend                                              │
│  ├── Rules Engine (Python — same decision tree)               │
│  ├── Document Generation Service                              │
│  ├── Notification Service (email / Teams webhook)             │
│  └── Claude Integration Service                               │
├──────────────────────────────────────────────────────────────┤
│  Claude API (Sonnet for speed, Opus for complex analysis)     │
│  ├── Acquisition Strategy Drafter                             │
│  ├── Market Research Analyzer                                 │
│  ├── IGCE Assistant                                           │
│  ├── Document Review / Compliance Check                       │
│  └── Conversational Advisor ("Ask the Acquisition Expert")    │
├──────────────────────────────────────────────────────────────┤
│  SQLite / PostgreSQL (same schema concepts as Dataverse)      │
│  S3 (document storage — replaces SharePoint)                  │
│  AWS App Runner (hosting)                                     │
└──────────────────────────────────────────────────────────────┘
```

## What AI Adds (The "Art of the Possible")

### 1. Intelligent Intake

Instead of rigid decision tree questions, Claude conducts a 
conversational intake:

```
User: "We need to renew our CrowdStrike contract. It's about $800K 
       and the contract ends in 4 months."

Claude: "Got it. Let me set this up. Based on what you've described:
         
         • This is a software/service renewal — I've classified it 
           as a Follow-On with a potential Re-Compete requirement.
         • At $800K, this is above the SAT ($350K), so full 
           documentation is required.
         • With 4 months until expiration, we're tight on timeline.
         
         A few questions to refine the approach:
         
         1. Are you satisfied with CrowdStrike's performance? 
            (This determines if we can justify sole source follow-on 
             vs. needing to compete.)
         2. Is CrowdStrike on an existing vehicle like ESI or a GWAC?
         3. Has the CIO's office expressed preference for this product?
         
         Also — I'm flagging this to SCRM now since CrowdStrike 
         is a security product and they'll need to confirm TAA 
         compliance for the current version."
```

### 2. AI-Drafted Documents

Claude generates first drafts of key documents, pre-populated 
from the intake data and prior acquisitions:

**Market Research Report:**
- Claude searches prior acquisitions for similar products/services
- Drafts market overview, vendor landscape, small business availability
- Pulls from IGCE historical pricing data
- Flags areas needing human input ("I need you to confirm...")

**Acquisition Strategy:**
- Generates strategy based on acquisition type, value, vehicle
- Includes contract type recommendation with rationale
- Drafts evaluation criteria suggestions
- References current FAR/DFARS guidance

**IGCE:**
- Pulls historical pricing from oly_PriorAcquisition table
- Adjusts for inflation, period of performance, scope changes
- Generates line-item cost breakdown
- Flags where estimates need validation

**Brand Name Justification / J&A:**
- Drafts the three required elements (why only this vendor, 
  what research was done, how competition was considered)
- References market research findings
- Formatted to agency-specific template

### 3. Document Review & Compliance Check

Before a package goes to any gate, Claude reviews it:

```
Claude Review Summary for ACQ-FY26-0031:

✅ SOW: Complete, clearly defines requirements
✅ IGCE: Aligned with market research findings
⚠️ Market Research: References 2023 data — recommend updating 
   to reflect current market. CrowdStrike pricing changed in 
   Q3 2025.
⚠️ Acquisition Strategy: References "simplified acquisition" 
   but estimated value ($800K) exceeds SAT. Recommend updating 
   strategy to reflect full competition requirements.
❌ Small Business Coordination: Missing. Required before ASR 
   for acquisitions above SAT.
```

### 4. Conversational Acquisition Advisor

An "Ask the Expert" panel where anyone in the workflow can ask 
questions about the acquisition:

```
Requestor: "The CIO wants us to use the ESI vehicle but I found 
            a small business on GSA that's 20% cheaper. What do I do?"

Claude: "Good question — this is a common tension. Here's the 
         framework:
         
         The CIO's ESI preference is a recommendation, not a 
         mandate. Under FAR Part 19, the small business set-aside 
         requirement has priority if the Rule of Two is met (two 
         or more small businesses can perform the work at fair 
         market price).
         
         However, with the current administration's reduced 
         emphasis on mandatory set-asides, you have more 
         flexibility. I'd recommend:
         
         1. Document both options in the Market Research Report
         2. Present the comparison at the ASR
         3. Let the Acquisition Review Board make the call 
            with full visibility into both paths
         
         This way neither the CIO nor the SBO feels blindsided."
```

### 5. Predictive Analytics

The AWS version can analyze historical acquisition data to:

- Predict cycle time based on acquisition type, value, and complexity
- Identify bottleneck patterns ("Legal review averages 12 days 
  for J&A documents — consider submitting early")
- Flag risk factors ("3 of the last 5 re-competes in this 
  value range were protested — ensure source selection 
  documentation is thorough")
- Recommend optimal timing ("Based on fiscal year patterns, 
  submitting this package in Q2 has 30% faster KO processing 
  than Q4")


## The Demo Pitch

**At a summit, the dual-track story becomes:**

> "Let me show you two things.
>
> First — [opens Power Platform app] — here's a working acquisition 
> management system that runs inside your M365 GCC tenant right now. 
> No ATO, no new infrastructure. Your team can submit a request, 
> answer five questions, and the system tells them exactly what 
> documents they need, in what order, for which gates. SCRM, 
> Small Business, CIO all get notified in parallel. The KO sees 
> a complete package, not a pile of emails. We can have this 
> running in your environment in four weeks.
>
> Now — [opens AWS app] — here's where it gets interesting. Same 
> workflow, but with an AI acquisition advisor that drafts your 
> Market Research Report, generates your IGCE from historical data, 
> reviews your package for compliance issues before it reaches the 
> KO, and answers your team's FAR questions in plain English. This 
> is the future of acquisition management. When you're ready for it, 
> we'll help you get there.
>
> Both versions share the same philosophy: the system should be 
> smarter than a Word checklist, and nobody should ever get shamed 
> for picking the wrong form."


## Deployment Approach

### Phase 1: Power Platform (Weeks 1-6)

| Week | Deliverables |
|---|---|
| 1 | Dataverse schema, threshold config, document catalog, document rules |
| 2 | Guided intake wizard (Custom Page or embedded Canvas App) |
| 3 | Dynamic checklist generation, approval pipeline creation |
| 4 | Parallel advisory flows, gate readiness checks |
| 5 | Power BI dashboards, SharePoint document templates |
| 6 | Sample data, UAT, training, deployment |

### Phase 2: AWS Version (Weeks 4-10, overlapping)

| Week | Deliverables |
|---|---|
| 4-5 | FastAPI backend with same rules engine, React intake wizard |
| 6-7 | Claude integration: intelligent intake, document drafting |
| 8 | Document review/compliance check, conversational advisor |
| 9 | Predictive analytics, historical data analysis |
| 10 | Demo preparation, sample data, polish |

The overlap is intentional — the rules engine logic is designed once 
and implemented in both platforms. The Dataverse schema maps directly 
to the SQL schema. The approval flow logic is conceptually identical.


## What They See at the Summit

**Slide 1:** "Your team shut down InfoPath. Now they're emailing checklists."

**Slide 2:** "We built a system where you answer five questions and it 
tells you everything you need."

**[Live Demo: Power Platform version]**

**Slide 3:** "Now imagine that system could also write your first draft."

**[Live Demo: AWS version with Claude]**

**Slide 4:** "Both versions. Same philosophy. Your choice of deployment."


---


# PART 3: ACQUISITION AI ASSISTANT — Feature Specification
## The "70% Draft in 30 Seconds" Engine

---

## The Problem It Solves

Acquisition professionals know the FAR, know the approval flow, and know 
the agency's preferences. What they typically don't know — and shouldn't 
have to know — is why Gigamon's network visibility fabric is architecturally 
distinct from Keysight's, or how CrowdStrike's Falcon sensor differs from 
SentinelOne's at the kernel level, or whether a particular vendor's SaaS 
offering holds FedRAMP High authorization.

Today, they walk over to the technical lead (you) and ask. You stop what 
you're doing, context-switch out of platform development, and spend two 
hours translating engineering reality into FAR-compliant prose. Then you 
take Tylenol.

The AI assistant replaces the Tylenol. It gives the acquisition team a 
collaborator that understands both the technology AND the regulatory 
framework, producing a 70% draft that the team reviews and refines with 
their acquisition judgment. The AI handles technical research and 
FAR-compliant structuring. The team handles strategy, relationships, 
and agency-specific context.


## Two Assistant Modes

### Mode 1: Market Research Report (MRR) Assistant

**Purpose:** Draft FAR Part 10-compliant Market Research Reports that 
describe the market landscape, identify vendors, assess small business 
availability, analyze contract vehicles, and recommend an acquisition 
strategy.

**System Prompt (production version):**

```
You are an expert federal acquisition Market Research Report (MRR) 
assistant. You help government acquisition professionals draft 
FAR-compliant Market Research Reports.

Your role:
- Ask clarifying questions about the requirement if needed
- Research and describe the market landscape for the product/service
- Identify potential vendors (large and small business)
- Assess small business availability (critical for the Small Business Office)
- Evaluate available contract vehicles (GSA Schedule, GWACs, ESI, BPAs)
- Recommend a competition strategy
- Flag TAA/SCRM concerns for IT products
- Write in formal but clear government prose

When drafting, follow this MRR structure:
1. Purpose & Scope
2. Requirement Description
3. Market Overview & Industry Trends
4. Vendor Identification (with business size status)
5. Small Business Availability Assessment
6. Contract Vehicle Analysis
7. Price Analysis / Historical Pricing
8. Recommended Acquisition Strategy
9. Conclusion

Always cite FAR Part 10 (Market Research) requirements. Use specific, 
factual language. When you don't have specific pricing data, indicate 
where the team should insert actual quotes or historical data with 
[TO BE VERIFIED] markers.

IMPORTANT: You are helping draft a real government document. Be thorough, 
specific, and FAR-compliant. Never fabricate vendor names or pricing — 
use realistic placeholders clearly marked as [TO BE VERIFIED] when 
specific data is needed.
```

**Enhanced system prompt (with agency context injection):**

In production, the system prompt is augmented with agency-specific context 
pulled from the acquisition request record:

```
ACQUISITION CONTEXT (from intake):
- Acquisition Number: {request.number}
- Type: {request.derived_type}
- Estimated Value: {request.estimated_value}
- Tier: {request.derived_tier}
- Category: {request.category}
- Existing Contract: {request.existing_contract_number or "N/A"}
- Existing Vendor: {request.existing_vendor or "N/A"}
- CPARS Rating: {request.cpars_rating or "N/A"}
- CIO Recommendation: {request.cio_notes or "None yet"}
- SCRM Status: {request.scrm_status or "Not reviewed"}

AGENCY PREFERENCES:
- Preferred vehicles: {agency.preferred_vehicles}
- ESI agreements: {agency.esi_list}
- Small business goals: {agency.sb_goals}
```

This context injection means the AI doesn't ask questions it already 
has answers to. If the intake already captured that this is a $450K 
network equipment buy with Gigamon as the incumbent, the MRR assistant 
starts drafting immediately with that context rather than asking 
"what do you need?"


### Mode 2: Justification & Approval (J&A) Assistant

**Purpose:** Draft legally defensible justifications for other than 
full and open competition under FAR 6.302, structured for General 
Counsel review and KO approval.

**System Prompt (production version):**

```
You are an expert federal acquisition Justification & Approval (J&A) 
assistant. You help government acquisition professionals draft legally 
defensible justifications for other than full and open competition 
under FAR 6.302.

Your role:
- Understand the specific authority being cited (FAR 6.302-1 through 6.302-7)
- Build a compelling, fact-based argument for limiting competition
- Ensure all statutory requirements are addressed
- Anticipate questions from General Counsel and the reviewing authority
- Reference relevant case law and GAO protest decisions where helpful
- Write in formal legal/regulatory prose

When drafting a J&A, follow this structure:
1. Contracting Activity & Description of Action
2. Description of Supplies/Services
3. Authority Cited (specific FAR 6.302 subsection)
4. Demonstration that the Contractor's Unique Qualifications Apply
5. Efforts to Ensure Maximum Competition (market research summary)
6. Determination by the Contracting Officer
7. Certification (for actions exceeding $900K — threshold updated Oct 2025)

Common authorities:
- FAR 6.302-1: Only one responsible source (brand name / sole source)
- FAR 6.302-2: Unusual and compelling urgency
- FAR 6.302-3: Industrial mobilization or expert services
- FAR 6.302-7: Public interest (requires head of agency)

J&A APPROVAL THRESHOLDS (updated Oct 2025):
- Up to $900K: Contracting Officer
- $900K to $20M: Competition Advocate
- $20M to $90M: Head of Procuring Activity (HPA)
- Over $90M: Senior Procurement Executive (SPE)

IMPORTANT: J&As are legal documents subject to protest. Every claim 
must be supportable. Never overstate exclusivity — instead, build the 
case methodically with specific technical facts. Mark any claims that 
need verification as [TO BE VERIFIED BY TECHNICAL TEAM].
```


## Pre-Loaded Scenario Library

These scenarios serve two purposes: (1) demo-ready examples for summits, 
and (2) training examples that show the team how to prompt the assistant.

### MRR Scenarios

**Scenario 1: Gigamon Network Visibility**
```
We need to procure Gigamon network visibility and traffic intelligence 
for our agency's network. We currently have Gigamon GigaVUE nodes 
deployed at 4 locations providing network TAP and packet broker 
services for our security tool stack (IDS, DLP, forensics). The 
current contract is $650K and expiring in 6 months. Our security 
tools (Palo Alto, FireEye, Splunk) all receive mirrored traffic 
from Gigamon. Help me draft the Market Research Report.
```

**Scenario 2: Cloud SIEM Platform**
```
We need to procure a cloud-based Security Information and Event 
Management (SIEM) platform. Currently using on-premise Splunk 
Enterprise but the infrastructure is aging and we want to move to 
cloud. Approximately 50GB/day log ingestion from 800+ sources. Need 
FedRAMP High. Estimated value $1.2M/year for 3 years ($3.6M total). 
This is a new competitive acquisition.
```

**Scenario 3: IT Staff Augmentation Re-Compete**
```
We need to re-compete our IT staff augmentation contract. Current 
contract is with [Incumbent] for $4.2M/year, 28 FTEs providing 
help desk (Tier 1-3), systems administration, network engineering, 
and cybersecurity support. Contract expires in 9 months. CPARS 
rating is "Satisfactory." The Small Business Office wants to know 
if small businesses can handle this scope.
```

### J&A Scenarios

**Scenario 1: Gigamon Sole Source**
```
We need a J&A for sole source procurement of Gigamon GigaVUE network 
visibility platform. Our entire security monitoring architecture 
depends on Gigamon's packet broker technology. We have 4 GigaVUE 
nodes that feed mirrored traffic to 6 security tools. The GigaSMART 
applications (SSL decryption, application filtering, NetFlow 
generation) are configured with 200+ custom traffic policies. 
Switching to an alternative (Keysight, APCON, Ixia) would require 
reconfiguring all security tool integrations and rebuilding every 
traffic policy — estimated 4-6 months of security monitoring 
degradation. Authority: FAR 6.302-1. Value: $650K.
```

**Scenario 2: Urgency Bridge Contract**
```
We need a J&A under FAR 6.302-2 (urgency) for a 6-month bridge 
contract with our current IT managed services provider. The 
re-compete was delayed because the acquisition package was returned 
from the ASR with deficiencies in the market research — the Small 
Business Office required additional analysis. If we don't bridge, 
28 IT support staff go home on contract expiration and our help 
desk, network operations, and cybersecurity monitoring stop. 
Value: $2.1M for 6 months.
```

**Scenario 3: Brand Name — Palo Alto Firewalls**
```
Brand name justification for Palo Alto Networks next-gen firewalls. 
Our security architecture is built on Palo Alto's Panorama 
centralized management platform with over 2,000 custom firewall 
rules in PAN-OS format, GlobalProtect VPN for 500 remote users, 
and WildFire threat intelligence integration. The CISO certifies 
that switching vendors would require a full security architecture 
redesign ($1.2M estimated, 12 months) and create an unacceptable 
security gap during transition. Firewall purchase: $380K.
```


## Workflow Integration Points

The AI assistant doesn't exist in isolation — it's embedded at specific 
points in the acquisition pipeline where documents are needed.

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ACQUISITION REQUEST                       │
│                    ACQ-FY26-0031                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  DOCUMENT CHECKLIST                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📄 Market Research Report          [Draft with AI ✨]  │  │
│  │ 📄 IGCE                            [Draft with AI ✨]  │  │
│  │ 📄 Acquisition Strategy            [Draft with AI ✨]  │  │
│  │ 📄 J&A (Sole Source)               [Draft with AI ✨]  │  │
│  │ 📄 Source Selection Plan           [Draft with AI ✨]  │  │
│  │ 📄 SOW / PWS                       [Upload]           │  │
│  │ 📄 Funding Certification (PR&C)    [Upload]           │  │
│  │ 📄 QASP                            [Draft with AI ✨]  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Click "Draft with AI" → Opens AI Assistant in context       │
│  → Pre-loaded with acquisition details from the request      │
│  → Generates draft → User reviews/edits → Saves to package   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Context Flow

When a user clicks "Draft with AI" on a specific document, the system:

1. **Pulls acquisition context** from the request record (type, value, 
   tier, vendor, existing contract, intake answers)

2. **Pulls advisory inputs** already received (SCRM findings, CIO 
   recommendation, SBO assessment)

3. **Pulls historical data** from prior acquisitions (if the agency 
   has previously purchased similar products/services)

4. **Injects all context** into the system prompt so Claude starts 
   with full awareness

5. **Opens the assistant** with a pre-formed first message:
   "I'm drafting a [Market Research Report] for [ACQ-FY26-0031], 
   a [$650K] [follow-on sole source] for [Gigamon GigaVUE network 
   visibility platform]. Here's what I know so far: [context]. 
   Let me generate an initial draft."

6. **User reviews** the draft in the assistant panel, asks follow-up 
   questions, requests revisions

7. **User clicks "Save to Package"** → draft is saved as the document 
   in the acquisition package, linked to the PackageDocument record

8. **Document status** updates from "Not Started" to "Draft (AI-Assisted)" 
   → team reviews and upgrades to "Complete" after human verification


### AI-Assistable Documents

| Document | AI Can Draft? | AI Approach |
|---|---|---|
| Market Research Report | ✅ Yes | Full draft from requirement + market knowledge |
| J&A / Brand Name Justification | ✅ Yes | Legal argument from technical facts |
| IGCE | ✅ Yes | Structure + historical data + placeholders |
| Acquisition Strategy | ✅ Yes | Strategy from type + value + vehicle analysis |
| Source Selection Plan | ✅ Yes | Evaluation criteria from requirement |
| QASP | ✅ Yes | Surveillance plan from SOW/PWS |
| SOW / PWS | ⚠️ Partial | Can structure and suggest; needs heavy human input |
| Funding Certification | ❌ No | Financial system data — human only |
| CPARS Report | ❌ No | Performance assessment — human judgment only |
| Signed Approvals | ❌ No | Authority actions — human only |


## Document Quality Safeguards

### The [TO BE VERIFIED] Pattern

Every AI-generated draft uses a consistent marker pattern for claims 
that require human verification:

```
[TO BE VERIFIED] — Factual claims the team must confirm
[TO BE VERIFIED BY TECHNICAL TEAM] — Technical specifications
[TO BE VERIFIED BY KO] — Contracting officer determinations
[INSERT ACTUAL DATA] — Where real pricing/dates must be added
[AGENCY TO CONFIRM] — Agency-specific policies or preferences
```

These markers serve triple duty:
1. **Honesty** — The AI never fabricates specifics
2. **Workflow** — The team has a clear punch list of what needs validation
3. **Audit trail** — Reviewers can see exactly which claims were AI-drafted 
   vs. human-verified

### Pre-Submission AI Review

Before any document goes to a gate, the AI can perform a compliance review:

```
COMPLIANCE REVIEW: Market Research Report (ACQ-FY26-0031)

FAR PART 10 REQUIREMENTS CHECK:
✅ 10.001(a)(2): Describes commercial availability
✅ 10.001(a)(3): Identifies potential small business sources
✅ 10.002(b)(1): Contacted knowledgeable individuals
⚠️ 10.002(b)(2): Should reference recent GSA Advantage search
   → Recommend adding: "GSA Advantage was searched on [DATE] 
     using keywords [X], yielding [N] results."
❌ 10.002(b)(4): No reference to FedBizOpps/SAM.gov sources
   → Required: Document whether prior solicitations for similar 
     requirements were reviewed on SAM.gov.

INTERNAL CONSISTENCY CHECK:
⚠️ Market Research states "no small business can perform" but 
   vendor list includes [Vendor X] which is SBA-certified small.
   → Resolve: Either update SB assessment or remove vendor.

THRESHOLD COMPLIANCE:
✅ Value ($650K) above SAT ($350K) — full MR required: confirmed
✅ J&A approval level: Contracting Officer (under $900K): correct

REMAINING [TO BE VERIFIED] MARKERS: 3
- Line 45: Pricing data for Gigamon GigaVUE HC3
- Line 72: Number of current network TAP locations  
- Line 89: Incumbent contract number and award date
```


## Implementation: FastAPI Backend

### Claude Integration Service

```python
# Simplified architecture — production version

class AcquisitionAIService:
    """Manages Claude API interactions for document generation."""
    
    DOCUMENT_PROMPTS = {
        "mrr": SYSTEM_PROMPT_MRR,
        "ja": SYSTEM_PROMPT_JA,
        "igce": SYSTEM_PROMPT_IGCE,
        "acq_strategy": SYSTEM_PROMPT_ACQ_STRATEGY,
        "source_selection": SYSTEM_PROMPT_SOURCE_SELECTION,
        "qasp": SYSTEM_PROMPT_QASP,
    }
    
    async def generate_draft(
        self, 
        document_type: str,
        acquisition_request: AcquisitionRequest,
        advisory_inputs: list[AdvisoryInput],
        prior_acquisitions: list[PriorAcquisition],
        user_message: str
    ) -> str:
        """Generate an AI-assisted document draft."""
        
        # Build context-enriched system prompt
        system = self.DOCUMENT_PROMPTS[document_type]
        system += self._build_context_block(
            acquisition_request, 
            advisory_inputs,
            prior_acquisitions
        )
        
        # Call Claude (Sonnet for drafts, Opus for complex J&As)
        model = "claude-sonnet-4-20250514"
        if document_type == "ja" and acquisition_request.estimated_value > 900000:
            model = "claude-opus-4-6"  # Higher-stakes, use best model
        
        response = await anthropic_client.messages.create(
            model=model,
            max_tokens=4000,
            system=system,
            messages=[{"role": "user", "content": user_message}]
        )
        
        return response.content[0].text
    
    async def review_document(
        self,
        document_type: str,
        document_text: str,
        acquisition_request: AcquisitionRequest
    ) -> ComplianceReview:
        """Review a draft document for FAR compliance."""
        
        system = SYSTEM_PROMPT_REVIEWER  # Separate reviewer prompt
        message = f"""Review this {document_type} for FAR compliance.
        
        Acquisition context:
        - Type: {acquisition_request.derived_type}
        - Value: ${acquisition_request.estimated_value:,.0f}
        - Tier: {acquisition_request.derived_tier}
        
        Document to review:
        {document_text}
        
        Check for:
        1. FAR regulatory compliance (cite specific sections)
        2. Internal consistency
        3. Remaining [TO BE VERIFIED] markers
        4. Threshold compliance
        5. Missing required elements
        
        Return structured findings."""
        
        # Always use Opus for reviews — accuracy matters most
        response = await anthropic_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2000,
            system=system,
            messages=[{"role": "user", "content": message}]
        )
        
        return parse_review(response.content[0].text)
```

### API Endpoints

```
POST /api/ai/draft
  Body: { document_type, request_id, message }
  Returns: { draft_text, markers_count, model_used }

POST /api/ai/review  
  Body: { document_type, request_id, document_text }
  Returns: { findings[], compliance_score, markers_remaining }

POST /api/ai/chat
  Body: { request_id, messages[], mode }
  Returns: { response, context_used }

GET  /api/ai/scenarios
  Returns: { mrr: [...], ja: [...] }
```


## Model Selection Strategy

| Task | Model | Rationale |
|---|---|---|
| MRR Draft | Sonnet | Speed matters, market research is broad |
| J&A Draft (under $900K) | Sonnet | Standard justifications |
| J&A Draft (over $900K) | Opus | Higher stakes, needs stronger reasoning |
| IGCE Draft | Sonnet | Structured, template-driven |
| Document Compliance Review | Opus | Accuracy critical, catches subtle issues |
| Conversational Q&A | Sonnet | Speed for interactive use |
| Pre-ASR Package Review | Opus | Comprehensive analysis needed |


## What This Means for Your Team

**Before (the Tylenol approach):**
1. Acquisition team gets a requirement
2. Doesn't know the technology → walks to your desk
3. You context-switch out of real work
4. You spend 2 hours explaining the tech landscape
5. They go back, attempt to write it, get stuck
6. Come back with follow-up questions
7. You review the draft, find errors
8. Total: 6-8 hours of your time per MRR/J&A

**After (the AI assistant approach):**
1. Acquisition team gets a requirement
2. Opens the AI assistant with acquisition context pre-loaded
3. AI drafts the MRR or J&A in 30 seconds (70% complete)
4. Team reviews, fills in [TO BE VERIFIED] markers
5. If they have a technical question, they ask the AI
6. AI catches compliance issues before submission
7. You review only the final product (if at all)
8. Total: 0-30 minutes of your time per MRR/J&A

**Net result:** Your team stops being dependent on you as Wikipedia. 
You stop taking Tylenol. The documents are more consistent, more 
compliant, and produced faster. Everybody wins.
