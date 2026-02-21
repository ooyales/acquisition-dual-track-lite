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
    │     → Order products/services through an existing           │
    │       contract (ODC / material CLIN)                        │
    │       → TYPE: CLIN Execution — ODC                          │
    │       → PIPELINE: CLIN Execution flow (see module below)    │
    │     → Authorize travel through an existing contract         │
    │       (travel CLIN)                                         │
    │       → TYPE: CLIN Execution — Travel                       │
    │       → PIPELINE: CLIN Execution flow (see module below)    │
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

### Product vs. Service Classification (always asked for new/re-compete/follow-on)

This question has cascading effects on document requirements, evaluation 
strategy, labor law applicability, and PSC code filtering. Getting it wrong 
early is one of the most common reasons packages get bounced.

```
Q-CATEGORY: "What are you buying?"
    → Products (hardware, equipment, supplies)
      → TRIGGERS:
        → Requirements = Specification or Description (not PWS)
        → QASP = Not Required
        → Service Contract Labor Standards = Not Applicable
        → Evaluation lean = LPTA eligible (if commercial)
        → PSC filter = Supplies/Equipment series (40-99, letter series)
        → COR role = Receipt & acceptance
        → Bill of Materials = Required (feeds SCRM)

    → Services (labor, professional services, managed services, support)
      → TRIGGERS:
        → Requirements = PWS or SOO (performance-based)
        → QASP = Required (above SAT)
        → Service Contract Labor Standards = Applicable 
          (KO must incorporate wage determination from DoL)
        → Evaluation lean = Best Value tradeoff (quality matters)
        → PSC filter = Services series (A-Z prefix)
        → COR role = Ongoing surveillance & QASP monitoring
        → Labor category matrix = Required

    → Software / Licenses (subscriptions, perpetual licenses, SaaS)
      → TRIGGERS:
        → Requirements = SOW or Description
        → QASP = Not Required (unless includes managed services)
        → SCLS = Not Applicable
        → Evaluation lean = LPTA eligible (if commercial/COTS)
        → PSC filter = IT/Telecom series (D3xx for IT services, 
          70xx for IT equipment, varies by license vs. subscription)
        → Section 508 = Required
        → FedRAMP assessment = Required (if cloud/SaaS)

    → Mixed (products AND services — e.g., hardware + installation 
      + maintenance)
      → SUB-QUESTION: "Which is the predominant element?"
        → Predominantly products (services are incidental)
          → Overall contract character = Product
          → But: Individual service CLINs still get SCLS treatment
          → QASP may be required for service CLINs
        → Predominantly services (products are incidental)
          → Overall contract character = Service
          → PWS required, QASP required
          → Product CLINs still get standard product treatment
        → Roughly equal
          → Overall contract character = Service (conservative)
          → Full documentation for both product and service elements
      → TRIGGERS:
        → CLIN structure must distinguish product vs. service line items
        → Each CLIN gets its own PSC code based on what it covers
        → KO determines SCLS applicability per CLIN
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
| **Requirements Description / SOW / SOO / PWS** | All acquisitions (not micro-purchase). SOW/Spec for products; PWS/SOO for services (system auto-selects based on Product/Service classification) | ISS |
| **Independent Government Cost Estimate (IGCE)** | Above micro-purchase | ASR |
| **Market Research Report** | New competitive, re-compete, follow-on sole source | ASR |
| **Acquisition Strategy / Acquisition Plan** | Above SAT | ASR |
| **Brand Name Justification (J&A)** | Brand name / sole source | ASR |
| **Exception to Fair Opportunity** | Task order on IDIQ with limited sources | ASR |
| **Determination & Findings (D&F)** | Time & materials, cost-plus, other than fixed-price | ASR |
| **SCRM Assessment** | IT acquisitions with hardware/software | ISS (parallel) |
| **Small Business Coordination Record** | Above micro-purchase | ASR |
| **Funding Certification (PR&C)** | All (except modifications within ceiling). Requires valid LOA assignment. | KO Review |
| **Quality Assurance Surveillance Plan (QASP)** | Service contracts (or mixed with service CLINs) above SAT | KO Review |
| **Service Contract Labor Standards (SCLS) Wage Determination** | Service contracts where SCLS applies (KO incorporates DoL wage determination) | KO Review |
| **Labor Category Matrix** | Service contracts with labor-hour or T&M CLINs | ASR |
| **Past Performance Evaluation Plan** | Competitive above SAT | KO Review |
| **Source Selection Plan** | Competitive above SAT | KO Review |
| **Section 508 Compliance Assessment** | IT acquisitions | ASR |
| **CIO Approval / IT Governance Review** | IT acquisitions (all tiers) | ISS (parallel) |
| **Bill of Materials / Product List** | IT hardware/software acquisitions (product or mixed) | ISS (parallel, feeds SCRM) |
| **FedRAMP Assessment** | Cloud/SaaS acquisitions (software category) | ISS (parallel) |
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
| Business Manager (FM) | New request above micro-purchase | LOA availability, fund type alignment, balance sufficiency | Finance Gate |

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
       ├──→ [PARALLEL] Business Manager confirms LOA availability
       │
       ▼
   ┌─ GATE 1: ISS ─────────────────────────────────────────┐
   │  All parallel advisory inputs visible at this point     │
   │  Approver can see: SCRM flags, CIO recommendations     │
   │  BuyCategory (Product/Service/Mixed) confirmed          │
   │  Decision: Proceed / Revise / Reject                    │
   └────────────────────────────────────────────────────────┘
       │
       ▼ (continue document preparation — CLINs structured,
       │   PSC codes assigned, LOAs selected per CLIN)
       │
   ┌─ GATE 2: ASR ─────────────────────────────────────────┐
   │  Document completeness check (required-before-ASR docs) │
   │  Small Business input visible                           │
   │  CIO vehicle recommendation visible                     │
   │  CLIN structure validated (PSC + LOA assigned)          │
   │  SCLS applicability determined for service CLINs        │
   │  Decision: Approve strategy / Revise / Reject           │
   └────────────────────────────────────────────────────────┘
       │
       ├──→ [PARALLEL] Finance reviews funding (LOA validated,
       │     BM has confirmed balance sufficiency)
       ├──→ [PARALLEL] Legal reviews J&A (if applicable)
       │
       ▼
   ┌─ GATE 3: KO Package Review ───────────────────────────┐
   │  All docs complete, all advisories resolved             │
   │  Finance certified, Legal cleared (if needed)           │
   │  KO checks: every CLIN has PSC ✓ LOA ✓                 │
   │  KO checks: SCLS wage determination incorporated ✓     │
   │  KO checks: QASP present for service CLINs ✓           │
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
| oly_IntakeQ_BuyCategory | Choice | Product / Service / Software-License / Mixed |
| oly_IntakeQ_MixedPredominant | Choice | Predominantly Product / Predominantly Service / Roughly Equal |
| oly_DerivedAcquisitionType | Choice | New Competitive, Re-Compete, Follow-On, Option Exercise, Bridge, Bilateral Mod, Unilateral Mod, CLIN Reallocation, Brand Name, Micro-Purchase |
| oly_DerivedTier | Choice | Micro-Purchase, SAT, Above SAT, Major |
| oly_DerivedPipeline | Choice | Full, Abbreviated, KO-Only, Micro |
| oly_DerivedContractCharacter | Choice | Product, Service, Mixed-Product, Mixed-Service (derived from BuyCategory + MixedPredominant) |
| oly_DerivedRequirementsDocType | Choice | SOW, PWS, SOO, Specification, Description (auto-set based on ContractCharacter) |
| oly_DerivedSCLSApplicable | Yes/No | Auto-set: Yes if ContractCharacter = Service or Mixed-Service |
| oly_DerivedQASPRequired | Yes/No | Auto-set: Yes if ContractCharacter = Service and Tier ≥ SAT |
| oly_DerivedEvalApproach | Choice | LPTA, Best Value Tradeoff, Lowest Price (recommendation — KO can override) |
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

### Table: oly_LineOfAccounting (Business Manager maintains)

The Business Manager maintains this as a reference table of active funding 
lines. Requestors select from this list when building their package. 
The system validates LOA assignment before the Finance gate.

| Column | Type | Description |
|---|---|---|
| oly_LineOfAccountingId | PK | |
| oly_DisplayName | Text (200) | Human-readable label, e.g., "FY26 O&M IT Operations" |
| oly_Appropriation | Text (50) | Appropriation code |
| oly_FundCode | Text (20) | |
| oly_BudgetActivityCode | Text (20) | |
| oly_CostCenter | Text (50) | |
| oly_ObjectClass | Text (20) | e.g., 31.XX (Equipment), 25.XX (Services) |
| oly_ProgramElement | Text (50) | |
| oly_FiscalYear | Text (4) | "2026" |
| oly_TotalAllocation | Currency | Total funds allocated to this LOA |
| oly_ProjectedAmount | Currency | Demand forecasted but no request yet |
| oly_CommittedAmount | Currency | Active acquisition requests in pipeline |
| oly_ObligatedAmount | Currency | Contracts awarded, funds obligated |
| oly_AvailableBalance | Currency | Computed: Total - Projected - Committed - Obligated |
| oly_UncommittedBalance | Currency | Computed: Total - Committed - Obligated (ignores projected) |
| oly_FundType | Choice | O&M, RDT&E, Procurement, MILCON, Working Capital |
| oly_Restrictions | Multi-Line | e.g., "O&M only — no investment purchases over $250K" |
| oly_ExpirationDate | Date Only | Funds expiration (1-year, 2-year, no-year) |
| oly_Status | Choice | Active, Low Balance, Exhausted, Expired, Pending |
| oly_ManagedBy | Lookup → SystemUser | Business Manager responsible |
| oly_LastVerifiedDate | DateTime | When the BM last confirmed the balance |
| oly_Notes | Multi-Line | |

**Funding lifecycle stages:**

The system tracks each dollar through four stages, giving the BM 
a real-time picture of where the money stands — not just what's 
been spent, but what's coming.

```
PROJECTED → COMMITTED → OBLIGATED → EXPENDED
    │            │            │            │
    │            │            │            └── Invoices paid (post-award,
    │            │            │                tracked in financial system)
    │            │            │
    │            │            └── Contract awarded, funds legally obligated
    │            │                (PR&C signed, reflected in financial system)
    │            │
    │            └── Active acquisition request in pipeline
    │                (LOA assigned to CLINs, BM has earmarked funds)
    │                System auto-calculates from CLIN → LOA assignments
    │
    └── Demand forecasted — no acquisition request yet
        (Asset warranty expiring, contract expiring, planned refresh)
        BM manually sets or system auto-generates from demand signals
```

**How the stages flow in the system:**

1. **Projected:** The BM sees a demand signal (warranty expiring, 
   contract ending, planned refresh from Asset Tracker) and earmarks 
   funds in the spend plan. No acquisition request exists yet. The 
   BM enters the projected amount against the LOA manually, or the 
   system auto-generates a projection from the demand forecast 
   (see Demand Forecasting below). This is the BM's planning tool.

2. **Committed:** An acquisition request is created and CLINs are 
   assigned to this LOA. The system automatically calculates the 
   committed amount by summing all CLIN estimated values pointing 
   to this LOA where the request status is active (not cancelled 
   or awarded). The projected amount for this demand is released 
   (converted from projected to committed). This is the BM's 
   pipeline visibility tool.

3. **Obligated:** The contract is awarded and funds are legally 
   obligated. The system moves the amount from committed to 
   obligated. In practice, the BM updates this from the financial 
   system of record (e.g., GFEBS, DEAMS, DAI, or equivalent). 
   This is the BM's execution tracking tool.

4. **Expended:** Invoices are paid against the obligation. This is 
   typically tracked in the financial system of record, not in 
   the acquisition tool — but the system can display it for 
   dashboard visibility if the BM maintains it.

**Validation rules (enhanced):**
- System warns if oly_AvailableBalance < request EstimatedValue
- System warns if oly_UncommittedBalance < request EstimatedValue
  (means other pipeline requests are already claiming this LOA)
- System blocks if LOA Status = Exhausted or Expired
- System warns if FundType doesn't align with BuyCategory 
  (e.g., O&M funds for a product buy above investment threshold)
- System warns if FiscalYear doesn't cover the planned award date
- System warns if Projected + Committed + Obligated > TotalAllocation
  (over-programmed — BM needs to resolve before more requests 
  can claim this LOA)

### Table: oly_DemandForecast (System-generated + BM-managed)

Demand signals that represent future acquisition needs before a 
formal request exists. Generated automatically from the Asset 
Tracker and Acquisition Tracker, or entered manually by the BM 
for known upcoming needs.

| Column | Type | Description |
|---|---|---|
| oly_DemandForecastId | PK | |
| oly_Title | Text (300) | "Server maintenance — Dell PowerEdge FY23 warranty expiring" |
| oly_Source | Choice | Asset Warranty Expiration, Contract Expiration, Option Year Due, Planned Refresh, Technology Sunset, Manual (BM Entered) |
| oly_SourceAsset | Lookup → oly_ITAsset | (if generated from Asset Tracker) |
| oly_SourceContract | Lookup → oly_AcquisitionRequest | (if generated from expiring contract) |
| oly_EstimatedValue | Currency | Estimated cost based on historical data |
| oly_EstimatedValueBasis | Multi-Line | How the estimate was derived (e.g., "Based on prior contract $180K/yr for similar equipment") |
| oly_NeedByDate | Date Only | When the capability must be in place |
| oly_AcquisitionLeadTime | Whole Number | Estimated months to award (based on type/tier) |
| oly_SubmitByDate | Date Only | Computed: NeedByDate minus AcquisitionLeadTime |
| oly_FiscalYear | Text (4) | Which FY this demand falls in |
| oly_SuggestedLOA | Lookup → oly_LineOfAccounting | BM's planned funding source |
| oly_BuyCategory | Choice | Product, Service, Software/License, Mixed |
| oly_LikelyAcquisitionType | Choice | New, Re-Compete, Follow-On, Option Exercise |
| oly_Status | Choice | Forecasted, Acknowledged by BM, Funded (LOA earmarked), Acquisition Created, Cancelled, Deferred |
| oly_AcquisitionRequest | Lookup → oly_AcquisitionRequest | (linked when a real request is created) |
| oly_AssignedTo | Lookup → SystemUser | Who should initiate the request |
| oly_CreatedDate | DateTime | |
| oly_Notes | Multi-Line | |

**Auto-generation rules (Power Automate or scheduled flow):**

```
FLOW: Demand Signal Generator (runs monthly on 1st)

RULE 1: Asset Warranty Expiration
  → Query oly_ITAsset where WarrantyEndDate is within 12 months
  → AND no active DemandForecast exists for this asset
  → AND no active AcquisitionRequest references this asset
  → CREATE DemandForecast:
    Title: "[AssetType] maintenance — [Vendor] [Model] warranty 
           expiring [WarrantyEndDate]"
    Source: Asset Warranty Expiration
    EstimatedValue: [lookup prior maintenance contracts for 
                     similar assets, or use configurable default 
                     % of asset purchase price]
    NeedByDate: WarrantyEndDate
    AcquisitionLeadTime: 4 months (configurable default for 
                         service contracts below SAT)
    BuyCategory: Service
    LikelyAcquisitionType: New (if first maintenance) or 
                           Follow-On (if prior contract exists)

RULE 2: Contract Expiration (no options remaining)
  → Query oly_AcquisitionRequest where:
    ExistingContractEndDate is within 12 months
    AND OptionsRemaining = 0
    AND no active DemandForecast exists for this contract
    AND no active successor AcquisitionRequest exists
  → CREATE DemandForecast:
    Title: "Re-compete/Follow-on — [Vendor] [Description] 
           contract expiring [EndDate]"
    Source: Contract Expiration
    EstimatedValue: ExistingContractValue (annualized, 
                    adjusted for inflation)
    NeedByDate: ExistingContractEndDate
    AcquisitionLeadTime: 6 months (above SAT) or 3 months (SAT)
    LikelyAcquisitionType: Re-Compete

RULE 3: Option Year Exercise Due
  → Query oly_AcquisitionRequest where:
    OptionsRemaining > 0
    AND next option exercise date is within 6 months
    AND no active DemandForecast exists for this option
  → CREATE DemandForecast:
    Title: "Option Year [N] exercise — [Vendor] [Description]"
    Source: Option Year Due
    EstimatedValue: [option year CLIN value from contract]
    NeedByDate: [option exercise deadline from contract]
    AcquisitionLeadTime: 2 months (option exercises are fast)
    LikelyAcquisitionType: Option Exercise

RULE 4: Technology Refresh / End of Life
  → Query oly_ITAsset where:
    EndOfLifeDate is within 18 months (longer lead time for 
    capital equipment procurement)
    AND no active DemandForecast exists
  → CREATE DemandForecast:
    Title: "Technology refresh — [AssetType] [Vendor] [Model] 
           reaching end of life [EOLDate]"
    Source: Technology Sunset
    EstimatedValue: [replacement cost estimate from asset record 
                     or configurable default by asset category]
    NeedByDate: EndOfLifeDate
    AcquisitionLeadTime: 6 months (product procurement)
    BuyCategory: Product (or Mixed if includes installation)
    LikelyAcquisitionType: New Competitive
```

**What the BM sees — the Demand Pipeline Dashboard:**

```
┌──────────────────────────────────────────────────────────────┐
│          FY26 FUNDING & DEMAND PIPELINE                       │
│          LOA: FY26 O&M IT Operations                          │
│                                                               │
│  Total Allocation:     $4,200,000                             │
│  ┌──────────────────────────────────────────────────────┐    │
│  │████████████ Obligated: $1,800,000 (43%)              │    │
│  │██████ Committed: $950,000 (23%)                      │    │
│  │████ Projected: $620,000 (15%)                        │    │
│  │     Available: $830,000 (20%)                        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  UPCOMING DEMAND (next 12 months)                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Mar 26  Option Year 3 — IT Help Desk      $420K  ✅ Funded│
│  │ May 26  Warranty exp — Dell servers (15)   $180K  ⚠️ NEW  │
│  │ Jul 26  Re-compete — CrowdStrike EDR      $800K  ⚠️ NEW  │
│  │ Sep 26  Refresh — Cisco switches (48)     $450K  🔴 Unfunded│
│  │ Nov 26  Option Year 2 — Managed SIEM      $1.2M  📋 Next FY│
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ⚠️ Warning: Projected + Committed exceeds Available by $140K │
│  Action needed: De-scope, defer, or identify additional funds  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Integration with Acquisition Request lifecycle:**

When a BM acknowledges a demand forecast and earmarks an LOA:
→ LOA.ProjectedAmount increases by the forecast's EstimatedValue
→ LOA.AvailableBalance decreases accordingly
→ BM can see the impact on the overall spend plan immediately

When the requestor creates an acquisition request from a forecast:
→ DemandForecast.Status = "Acquisition Created"
→ DemandForecast.AcquisitionRequest = link to new request
→ As CLINs are assigned to the LOA:
  → LOA.CommittedAmount increases
  → LOA.ProjectedAmount decreases by the same amount
  → (Money moves from "projected" to "committed" — net zero impact 
    on available balance, but now it's real pipeline, not forecast)

When the contract is awarded:
→ LOA.CommittedAmount decreases
→ LOA.ObligatedAmount increases
→ (Money moves from "committed" to "obligated")

### Table: oly_PSCCode (Pre-loaded federal reference data)

Product Service Codes from the federal PSC manual. Loaded once, 
updated annually. Approximately 2,800 codes. The system pre-filters 
this list based on the BuyCategory from the intake.

| Column | Type | Description |
|---|---|---|
| oly_PSCCodeId | PK | |
| oly_Code | Text (10) | e.g., "D302", "7010", "R425" |
| oly_Title | Text (300) | e.g., "IT and Telecom - Systems Development" |
| oly_Category | Choice | Services, R&D, Supplies/Equipment |
| oly_ServiceOrProduct | Choice | Product, Service | (simplified flag for filtering) |
| oly_Group | Text (100) | e.g., "D3 - IT & Telecom Services", "70 - IT Equipment" |
| oly_IsITRelated | Yes/No | Quick filter for IT acquisitions |
| oly_SBAvailabilityIndicator | Choice | High, Medium, Low | (based on FPDS historical data) |
| oly_TypicalSCLSApplicable | Yes/No | Whether this PSC typically triggers SCLS |
| oly_EffectiveDate | Date Only | When this code became active |
| oly_Status | Choice | Active, Retired, Replaced |
| oly_ReplacedBy | Text (10) | If retired, which code replaced it |

**Pre-filtering logic:**
- BuyCategory = Product → show Supplies/Equipment category
- BuyCategory = Service → show Services category
- BuyCategory = Software/License → show IT-related codes (D3xx, 70xx)
- BuyCategory = Mixed → show both, grouped by Product vs. Service
- IT acquisition flag → further filter to IT-related codes

### Table: oly_AcquisitionCLIN (Child of AcquisitionRequest)

Contract Line Item Numbers define the structure of what's being bought.
Each CLIN carries its own PSC code, LOA, and product/service designation.
This is where the Product vs. Service distinction becomes granular for
mixed acquisitions.

| Column | Type | Description |
|---|---|---|
| oly_AcquisitionCLINId | PK | |
| oly_AcquisitionRequest | Lookup → oly_AcquisitionRequest | Parent request |
| oly_CLINNumber | Text (10) | e.g., "0001", "0002", "1001" (option CLIN) |
| oly_Description | Text (500) | What this line item covers |
| oly_CLINType | Choice | Product, Service, Software/License, Data |
| oly_PSCCode | Lookup → oly_PSCCode | Product Service Code for this CLIN |
| oly_LineOfAccounting | Lookup → oly_LineOfAccounting | Funding source for this CLIN |
| oly_EstimatedValue | Currency | Estimated cost of this CLIN |
| oly_Quantity | Whole Number | For product CLINs |
| oly_UnitOfMeasure | Choice | Each, Lot, Hour, Month, Year, License |
| oly_PeriodOfPerformance | Text (100) | e.g., "Base Year", "Option Year 1" |
| oly_ContractType | Choice | FFP, T&M, Labor-Hour, Cost-Plus, Hybrid |
| oly_SCLSApplicable | Yes/No | Does SCLS apply to this CLIN? |
| oly_WageDeterminationNumber | Text (50) | DoL wage determination # (if SCLS) |
| oly_Severability | Choice | Severable, Non-Severable, TBD (KO Determination) |
| oly_SeverabilityBasis | Multi-Line | Why this CLIN is severable or not (for audit trail) |
| oly_SortOrder | Whole Number | Display ordering |
| oly_Notes | Multi-Line | |

**Severability guidance (surfaced to user during CLIN entry):**

When a user creates a service CLIN, the system asks a plain-language 
question to help determine severability:

```
"Does this work have value if stopped partway through?"

  → Yes, each period of performance stands on its own
    (e.g., monthly help desk support, ongoing monitoring, 
     staff augmentation hours)
    → DEFAULT: Severable
    → SYSTEM NOTE: "Severable services may be funded with the 
      fiscal year appropriation current at the START of the 
      performance period, even if performance crosses fiscal years."

  → No, value is only realized when the deliverable is complete
    (e.g., migration project, system development, study/report, 
     one-time installation)
    → DEFAULT: Non-Severable
    → SYSTEM NOTE: "Non-severable services must be fully funded 
      at award with the appropriation current at time of award. 
      Ensure the selected LOA has sufficient balance for the 
      full obligation."

  → Not sure / It's complicated
    → DEFAULT: TBD (KO Determination)
    → SYSTEM NOTE: "This CLIN will be flagged for KO review. 
      The KO will make the final severability determination 
      before the Finance gate."
```

**System validation rules for severability:**

- If Severable + CLINType = Service:
  → Warn if period of performance exceeds 12 months per period 
    (Bona Fide Needs rule — severable services generally limited 
    to 12-month periods; use option years for multi-year needs)
  → Validate LOA fiscal year covers the start of the performance period
  → Allow cross-FY funding: FY26 O&M can fund a 12-month severable 
    contract starting July FY26 even though 6 months fall in FY27

- If Non-Severable + CLINType = Service:
  → Validate LOA available balance ≥ full CLIN estimated value 
    (entire amount obligated at award)
  → Validate LOA fiscal year is current at planned award date
  → Warn if LOA is a 1-year appropriation and the deliverable 
    timeline extends well beyond the FY (may need multi-year or 
    no-year funds)
  → No 12-month period limitation (can cross FY boundaries)

- If TBD (KO Determination):
  → Flag at KO Review gate: "Severability determination required 
    for CLIN [X] before Finance can validate funding."
  → KO resolves → system recalculates funding validation

- If CLINType = Product:
  → Severability is N/A (products follow standard obligation rules)
  → Field is hidden or auto-set to "N/A"

**System behaviors:**
- Total of all CLIN EstimatedValues should match request EstimatedValue
  (system warns on mismatch)
- If CLINType = Service and ContractType ≠ FFP, D&F document auto-required
- Each CLIN's PSC is pre-filtered based on its CLINType
- LOA assignment per CLIN allows split-funding across different 
  appropriations (common for mixed buys)
- KO Review gate checks: "Does every CLIN have a PSC assigned?" and 
  "Does every CLIN have a LOA assigned?" and "Are all severability 
  determinations resolved (no TBD remaining)?"


## Configuration Philosophy: Baseline + Configuration, Not Customization

This system is designed around a core principle: **encode institutional 
knowledge as configurable data, not custom code.**

Federal acquisition has hundreds of nuances — severability, SCLS 
applicability, TAA compliance, small business set-aside rules, J&A 
approval thresholds, commercial item determinations, and more. Each 
of these could be treated as a custom feature requiring developer 
intervention to change. Instead, they're treated as configurable 
business rules that practitioners can manage.

### Three Layers of the System

**Layer 1: FAR Baseline (built-in, rarely changes)**

These are the structural elements that come from statute and regulation. 
They change only when the FAR or DFARS is amended — which happens 
infrequently and with advance notice.

Examples:
- The acquisition lifecycle stages (requirement → strategy → competition → award)
- The approval hierarchy concept (thresholds determine who approves)
- The document types that exist (MRR, J&A, IGCE, SOW/PWS, etc.)
- The distinction between products and services
- The concept of severability and its funding implications

The system encodes these as its core data model and workflow engine. 
They're the "bones" of the application. Changing them would require 
actual development — but they almost never need to change.

**Layer 2: Regulatory Configuration (admin-managed, changes periodically)**

These are the specific values, thresholds, and rules that the FAR 
defines but that change over time due to inflation adjustments, 
policy updates, or regulatory reform.

Examples:
- Micro-purchase threshold ($15K as of Oct 2025)
- Simplified acquisition threshold ($350K as of Oct 2025)
- J&A approval thresholds ($900K / $20M / $90M as of Oct 2025)
- Which documents are required at which thresholds
- Which PSC codes are active
- SCLS applicability criteria

These are stored in configuration tables (oly_ThresholdConfig, 
oly_DocumentRule, oly_PSCCode) and managed by an admin or 
acquisition policy lead. When the FAR overhaul drops a document 
requirement or changes a threshold, you update a row. No developer 
needed. No deployment. No testing cycle.

**Layer 3: Agency Preferences (business-user managed, changes frequently)**

These are the agency-specific policies, preferences, and institutional 
knowledge that differ from one organization to another.

Examples:
- Preferred contract vehicles (ESI agreements, specific GWACs)
- CIO approval threshold (some agencies require CIO sign-off 
  for all IT buys; others only above a certain dollar value)
- Small business goals and set-aside preferences
- Active Lines of Accounting and their restrictions
- Local approval chain (who is the Competition Advocate, 
  who sits on the Acquisition Review Board)
- Agency-specific document templates
- Whether the ISS is required for SAT-level buys (some agencies 
  skip it, others don't)

These are stored in reference tables and managed by the Business 
Manager, Acquisition Logistics team, or designated admin. Your 
team — the people who currently maintain the Word checklists — 
become the system's configuration managers. Same knowledge, 
better container.

### What This Means in Practice

When someone on your team encounters a nuance — "wait, does a 
software subscription renewal count as severable or non-severable?" 
— the system doesn't leave them guessing. It:

1. **Asks the right question** at the right time (during CLIN entry, 
   not at intake when it's too abstract)
2. **Provides contextual guidance** in plain language ("Does this 
   work have value if stopped partway through?")
3. **Defaults to the common answer** (monthly subscription = severable)
4. **Flags the edge case** for KO review if the answer is ambiguous
5. **Calculates the downstream impact** (funding validation, 
   period of performance limits) automatically
6. **Preserves the KO's authority** — the system recommends, 
   the KO decides, the system enforces whatever they decide

Your team doesn't need to be acquisition law experts. They need 
a system that asks the right questions, provides the right defaults, 
and escalates the right edge cases. That's the difference between 
"whatever the KO says" (passive, uninformed) and "here's our 
recommendation based on the situation — KO, do you concur?" 
(proactive, credible).

### Configuration vs. Customization Decision Framework

When a new nuance or agency-specific requirement emerges, the 
question is: does this need code, or does this need data?

| Scenario | Approach | Who Does It |
|---|---|---|
| New FAR threshold value | Update oly_ThresholdConfig | Admin / Policy Lead |
| New document requirement | Add row to oly_DocumentRule + oly_DocumentTemplate | Admin |
| New PSC code published | Add row to oly_PSCCode | Admin (annual update) |
| New contract vehicle preferred | Update agency preference config | Business Manager |
| New approval chain member | Update role assignments | Admin |
| CIO changes IT approval threshold | Update agency preference config | Admin |
| FAR eliminates a document type | Set DocumentTemplate status = Retired | Admin |
| New acquisition type emerges | Potentially add to intake decision tree | Developer (rare) |
| New parallel advisory team needed | Add to AdvisoryInput team choices | Developer (rare) |
| Fundamentally new workflow pattern | New flow design | Developer (rare) |

The goal: **90% of changes are configuration. 10% are customization. 
The 10% should feel rare.**


## Licensing & Platform Requirements

### What G5 Gives You (and What It Doesn't)

The agency's Microsoft 365 G5 licenses provide a strong foundation 
but are not sufficient for the Dataverse-backed architecture described 
in this document. Here's the precise boundary:

**Covered by G5 (no additional cost):**
- SharePoint Online (document storage for acquisition packages)
- Power BI Pro (all dashboards and pipeline visualizations)
- Power Apps for Microsoft 365 (standard connectors only — 
  SharePoint, Outlook, Excel, Teams)
- Power Automate for Microsoft 365 (standard connectors only)
- Microsoft Teams (notifications, collaboration)
- The "Dataverse" service plan visible in the G5 admin center 
  (this is deceptive — see below)

**NOT covered by G5 — requires additional licensing:**
- Dataverse as a data store for custom apps
- Model-driven apps (the primary UX for this system)
- Premium connectors in Power Automate (Approvals connector 
  with Dataverse, custom connectors)
- Canvas apps that read/write Dataverse tables

**The G5 Dataverse trap:** G5 includes a service plan labeled 
"Dataverse" in the Microsoft 365 admin center. This does NOT 
grant the right to build custom apps on Dataverse. It exists 
solely to support Microsoft's own applications (like Project 
for the Web) that use Dataverse internally. Developers can 
design apps and view Dataverse tables with a G5 license, but 
the published app will fail at runtime for users without a 
Power Apps Premium or Per App license. This is the single most 
common licensing mistake in Power Platform deployments.

### Required Licenses

**Power Apps Premium — $20/user/month (commercial) | GCC pricing similar**

This is the recommended license for all regular users of the 
acquisition system. It provides:
- Unlimited custom apps (model-driven and canvas) per user
- Full Dataverse access (read, write, create, delete)
- Premium and custom connectors
- Power Automate cloud flows (included with Power Apps Premium)
- 250 MB Dataverse database capacity accrued per license to 
  the tenant pool
- 2 GB Dataverse file capacity accrued per license
- 500 AI Builder credits per license (future use)
- Managed Environments support

At 2,000+ users, the price drops to approximately $12/user/month 
(Enterprise tier). The agency's GCC agreement may have negotiated 
rates — check with the Microsoft account team or reseller.

**Power Apps Per App — $5/user/app/month**

An alternative for users who only need access to a single 
application. Useful for leadership or occasional users who 
only view dashboards but don't submit or approve requests. 
Each Per App license accrues 50 MB Dataverse database capacity 
(vs. 250 MB for Premium), so it contributes less to the 
tenant's shared pool.

Per App licenses stack: if a user needs access to 3 apps 
(Acquisition Tracker + Asset Tracker + Compliance Tracker), 
that's $15/user/month — at which point Premium at $20 is 
the better deal for 4+ apps.

**Power Automate Premium — $15/user/month (only if needed)**

NOT required for this solution. Power Apps Premium includes 
cloud flow rights sufficient for all approval workflows, 
advisory notifications, and scheduled flows in the architecture. 
Power Automate Premium is only needed for desktop RPA (robotic 
process automation) or process mining, neither of which this 
solution requires.

**Dataverse Capacity Add-Ons — $40/GB/month (if needed)**

Dataverse capacity is pooled at the tenant level. As of 
December 2025, Microsoft increased default entitlements. Each 
Power Apps Premium license accrues ~250 MB database capacity. 
A tenant with 50 Premium licenses would have approximately 
12+ GB of shared Dataverse database capacity — more than 
sufficient for years of acquisition records, CLIN data, 
advisory inputs, demand forecasts, and document metadata.

Documents themselves (Word files, PDFs, signed approvals) 
are stored in SharePoint, not Dataverse. Dataverse stores 
the structured metadata and workflow state. This keeps 
database consumption low.

If the tenant does approach capacity limits (visible in 
the Power Platform admin center), additional capacity can 
be purchased in 1 GB increments at $40/GB/month. This is 
unlikely to be needed for this workload unless the agency 
deploys multiple data-intensive Power Platform solutions 
on the same tenant.

### Recommended License Model

For a typical agency acquisition organization:

```
┌─────────────────────────────────────────────────────────────┐
│  ROLE-BASED LICENSE ALLOCATION                               │
│                                                              │
│  POWER APPS PREMIUM ($20/user/month)                         │
│  ├── Acquisition Professionals (KOs, CS)         ~15 users   │
│  ├── Program Managers / CORs (requestors)        ~30 users   │
│  ├── Advisory Teams (SCRM, SBO, CIO, 508)        ~10 users   │
│  ├── Business Manager / Finance                   ~5 users   │
│  └── System Admins / Config Managers              ~3 users   │
│      Subtotal: ~63 users × $20 = $1,260/month               │
│                                                              │
│  POWER APPS PER APP ($5/user/app/month)                      │
│  ├── Leadership (dashboard view only)            ~10 users   │
│  └── Occasional reviewers (read-only)             ~5 users   │
│      Subtotal: ~15 users × $5 = $75/month                   │
│                                                              │
│  ALREADY COVERED BY G5 (no additional cost)                  │
│  ├── Power BI Pro (all dashboards)               All users   │
│  ├── SharePoint Online (document storage)        All users   │
│  └── Teams (notifications, collaboration)        All users   │
│                                                              │
│  TOTAL ADDITIONAL LICENSING: ~$1,335/month (~$16,020/year)   │
│                                                              │
│  DATAVERSE CAPACITY (included with above licenses):          │
│  63 Premium × 250 MB = 15.75 GB database                    │
│  63 Premium × 2 GB = 126 GB file                             │
│  15 Per App × 50 MB = 0.75 GB database                       │
│  Total: ~16.5 GB database, ~126 GB file (more than adequate) │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### ROI Context

$16,020/year in licensing to replace a process where:
- A single acquisition package bounced at ASR costs 2-4 weeks 
  of rework across 3-5 people
- Technical leads spend 6-8 hours per MRR/J&A translating 
  technology into FAR prose (on the AWS track, AI reduces 
  this to 30 minutes)
- The BM discovers funding gaps reactively instead of 
  12 months in advance via demand forecasting
- Nobody knows what's in the pipeline until someone asks 
  via email

One acquisition that closes two weeks faster than it would 
under the current process likely saves more than the entire 
annual licensing cost in avoided delays, reduced rework, 
and recovered staff productivity.

### The SharePoint Lists Fallback Option

If Dataverse licensing cannot be secured, the system can be 
built on SharePoint Lists as the data layer instead. This 
approach is fully covered under the existing G5 licenses 
with zero additional cost.

**What works on SharePoint Lists:**
- Guided intake (Canvas App with SharePoint as data source)
- Document checklist (list items with status tracking)
- Approval workflows (Power Automate standard connectors)
- Advisory notifications (Power Automate → Teams/email)
- Basic dashboards (Power BI connecting to SharePoint Lists)
- Document storage (already SharePoint)

**What you lose without Dataverse:**
- Relational integrity: SharePoint lookups are weaker than 
  Dataverse relationships. The CLIN → LOA → PSC chain requires 
  workarounds (storing IDs as text, manual validation)
- Business rules at the data layer: no server-side calculated 
  fields, no automatic rollups (e.g., summing CLIN values to 
  validate against request total)
- Model-driven app UX: the rich form experience with related 
  record grids, business process flows, and timeline controls 
  is Dataverse-only. Canvas apps on SharePoint work but require 
  more custom UI development
- Security roles: SharePoint permissions are list/item level, 
  not field-level. Dataverse supports column-level security 
  (e.g., BM can see LOA balances, requestors cannot)
- Performance at scale: SharePoint Lists support up to 30M items 
  but query performance degrades above ~5,000 items without 
  indexed columns and delegation-friendly formulas
- Offline capability: Dataverse supports offline-first mobile 
  apps; SharePoint does not
- The demand forecasting pipeline (LOA lifecycle stages, 
  automatic balance calculations) becomes significantly 
  harder — computed columns and rollups that Dataverse 
  handles natively must be implemented in Power Automate 
  flows that run on every record change

**Recommendation:** SharePoint Lists is a viable MVP path if 
licensing is blocked in the near term. Build the intake wizard 
and document checklist on SharePoint to prove the concept, then 
migrate to Dataverse when Premium licenses are secured. The 
business logic (intake decision tree, document rules, approval 
routing) is the same regardless of the data layer — only the 
plumbing changes. Design the Power Automate flows with 
Dataverse migration in mind: use variables and expressions 
for business logic rather than embedding SharePoint-specific 
column references throughout.

### License Procurement Path

For a federal agency on a GCC tenant:

1. **Identify the existing EA/EAS/MPSA agreement** — the agency 
   likely procures Microsoft licenses through an Enterprise 
   Agreement. Power Apps Premium can be added as a line item 
   on the existing agreement.

2. **Request a quote from the Microsoft account team or reseller** 
   — government pricing may differ from commercial list prices. 
   Ask specifically about "Power Apps Premium for GCC" and 
   "Dataverse capacity included with Power Apps Premium."

3. **Start with a pilot allocation** — procure 10-15 Premium 
   licenses for the core team (KOs, BM, lead PMs, system admin). 
   Build and validate the system. Then expand licensing as the 
   user base grows.

4. **Use the 30-day free trial strategically** — Power Apps 
   offers a 30-day trial that includes full Dataverse access. 
   This is enough time to build a working prototype, demo it 
   to stakeholders, and use the demo to justify the license 
   procurement.

5. **The per-app fallback** — if the agency is reluctant to 
   commit to Premium pricing across the board, start with 
   Per App licenses ($5/user/app) for the acquisition system 
   only. This limits exposure while proving value. Upgrade to 
   Premium when additional apps (Asset Tracker, Compliance 
   Tracker) come online.


## Power Automate Flows

### Flow 1: Intake Completion → Generate Checklist & Pipeline

```
TRIGGER: When oly_AcquisitionRequest.IntakeCompleted changes to Yes

STEP 1: Evaluate guided intake answers
        → Determine DerivedAcquisitionType
        → Determine DerivedTier (based on EstimatedValue + ThresholdConfig)
        → Determine DerivedPipeline
        → Determine DerivedContractCharacter (from BuyCategory + MixedPredominant)
        → Auto-set DerivedRequirementsDocType (SOW/PWS/SOO/Spec)
        → Auto-set DerivedSCLSApplicable
        → Auto-set DerivedQASPRequired
        → Auto-set DerivedEvalApproach (LPTA or Best Value recommendation)

STEP 2: Query oly_DocumentRule table
        → For each rule, evaluate Condition against request fields
          (rules now include BuyCategory and ContractCharacter conditions)
        → Generate oly_PackageDocument records for all applicable documents
        → If ContractCharacter = Service → require PWS, QASP, Labor Matrix
        → If ContractCharacter = Product → require Spec/Description, BOM
        → If ContractCharacter = Mixed → require both sets per CLIN type
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
        → If above micro-purchase:
          → Create AdvisoryInput for Business Manager (Status = Requested)
          → Notify BM: "New acquisition [Number], est. $[Value], needs LOA"
          → BM can pre-identify appropriate LOA before requestor builds CLINs

STEP 5: Notify requestor:
        "Your acquisition [Number] has been set up as a [Type] ([Product/Service]).
         [X] documents are required. First gate: [Gate Name] by [Date].
         Note: [PWS/QASP/Wage Determination] required because this is a 
         service acquisition."
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


## CLIN Execution Tracker Module (ODC, Travel, and Beyond)

### Why This Module Exists

The acquisition lifecycle tracker handles the front end — getting a 
contract awarded. The 3×3 Spend Analytics dashboard (already built) 
handles financial visibility — ceiling, obligations, burn rates, 
runway. But between award and the spend dashboard, there's an 
operational layer where people execute work against active contracts 
every day: ordering HW/SW renewals through ODC CLINs, authorizing 
travel through travel CLINs, directing training through training CLINs.

This is currently handled through ATMS — the Acquisition and Travel 
Management System that the Directorate is retiring. This module 
replaces ATMS and unifies all CLIN execution activity into the 
same platform as the acquisition lifecycle.

### The Generalized Pattern

Every CLIN execution request follows the same mechanics regardless 
of what's being ordered:

```
REQUESTOR                SYSTEM                    APPROVERS
    │                       │                          │
    ├─ "I need X from       │                          │
    │   CLIN Y on           │                          │
    │   Contract Z"         │                          │
    │                       │                          │
    │                  ┌────┴────┐                     │
    │                  │ CHECK:  │                     │
    │                  │ Does    │                     │
    │                  │ CLIN Y  │                     │
    │                  │ have    │                     │
    │                  │ enough  │                     │
    │                  │ $?      │                     │
    │                  └────┬────┘                     │
    │                       │                          │
    │              ┌────────┴────────┐                 │
    │              │                 │                  │
    │         YES: Funds         NO: Funds              │
    │         Sufficient         Insufficient           │
    │              │                 │                  │
    │              ▼                 ▼                  │
    │         STANDARD          FUNDING ACTION          │
    │         APPROVAL          REQUIRED                │
    │         PM → CTO          FM identifies $         │
    │              │            BM confirms LOA         │
    │              │            KO mods contract        │
    │              │            (adds funds to CLIN)    │
    │              │                 │                  │
    │              │            Then: Standard          │
    │              │            Approval resumes        │
    │              │            PM → CTO                │
    │              │                 │                  │
    │              ▼                 ▼                  │
    │         AUTHORIZED ◄──────────┘                  │
    │              │                                   │
    │              ▼                                   │
    │         Performer executes                       │
    │         COR validates invoice                    │
    │         Spend feeds Power BI dashboard           │
    │                                                  │
```

### CLIN Execution Types

The system supports multiple execution types. ODC and Travel are 
the initial two; others can be added through configuration.

**ODC (Other Direct Costs) — HW/SW Renewals, Purchases:**

A Requirement Officer identifies a product or service that needs 
to be procured through the performer — typically a maintenance 
renewal, license renewal, or equipment purchase that's within 
the contract's scope. The performer procures it and invoices 
against the ODC CLIN.

Approval chain: PM → CTO
Documentation: Vendor quote or renewal notice, justification 
for why this is within contract scope.
Typical examples: Gigamon maintenance renewal, CrowdStrike 
license renewal, Palo Alto support renewal, replacement server 
hardware, network equipment.

**Travel:**

A traveler (government or contractor staff) needs to travel for 
mission-related purposes. Travel is funded through the contract's 
Travel CLIN. The performer books travel and invoices against the 
Travel CLIN.

Approval chain: PM → CTO (same as ODC — the Directorate treats 
travel the same way they treat ODC buys on the contract)
Documentation: Travel authorization (destination, dates, purpose, 
estimated cost breakdown), and post-travel voucher for actuals.
Typical examples: Conference attendance, site visits, training 
travel, program reviews at other locations.

**Future execution types (configurable):**

Training, materials, subcontractor tasking — same pattern, 
different data fields, same funding mechanics. Added through 
configuration (new choice values + field visibility rules), 
not custom development.

### Data Model

**Table: oly_CLINExecutionRequest**

The core table for all CLIN execution activity. Child of both 
the contract record and the specific CLIN.

| Column | Type | Description |
|---|---|---|
| oly_CLINExecutionRequestId | PK | |
| oly_RequestNumber | Auto-Number | e.g., "EXEC-FY26-0001" |
| oly_ExecutionType | Choice | ODC, Travel, Training, Materials, Other |
| oly_Contract | Lookup → oly_AcquisitionRequest | Which contract |
| oly_CLIN | Lookup → oly_AcquisitionCLIN | Which CLIN to charge |
| oly_Title | Text (300) | "Gigamon Maintenance Renewal FY26" |
| oly_Description | Multi-Line | Detailed description of what's needed |
| oly_EstimatedCost | Currency | How much this will cost |
| oly_ActualCost | Currency | Actual invoiced amount (post-execution) |
| oly_CostVariance | Currency | Computed: Actual - Estimated |
| oly_RequestedBy | Lookup → SystemUser | Who submitted the request |
| oly_RequestedDate | DateTime | |
| oly_NeedByDate | Date Only | When this must be in place |
| oly_Status | Choice | Draft, Submitted, PM Approved, CTO Approved, Funding Action Required, Funding Action Complete, Authorized, Performer Executing, Invoice Received, COR Validated, Complete, Rejected, Cancelled |
| oly_FundingStatus | Choice | Sufficient, Insufficient — Funding Action Required, Funding Action In Progress, Funding Action Complete |
| oly_FundingActionRequired | Yes/No | System-set based on CLIN balance check |
| oly_FundingActionAmount | Currency | How much additional funding is needed |
| oly_FundingActionMod | Lookup → oly_AcquisitionRequest | Link to the mod request (if funding action triggers a bilateral mod) |
| oly_PMApproval | Choice | Pending, Approved, Rejected, Returned |
| oly_PMApprovedBy | Lookup → SystemUser | |
| oly_PMApprovedDate | DateTime | |
| oly_PMComments | Multi-Line | |
| oly_CTOApproval | Choice | Pending, Approved, Rejected, Returned |
| oly_CTOApprovedBy | Lookup → SystemUser | |
| oly_CTOApprovedDate | DateTime | |
| oly_CTOComments | Multi-Line | |
| oly_PerformerNotifiedDate | DateTime | When the performer was told to proceed |
| oly_InvoiceNumber | Text (50) | Performer's invoice reference |
| oly_InvoiceDate | Date Only | |
| oly_CORValidatedBy | Lookup → SystemUser | |
| oly_CORValidatedDate | DateTime | |
| oly_DemandForecast | Lookup → oly_DemandForecast | Link to forecast that triggered this (if applicable) |
| oly_Notes | Multi-Line | |

**ODC-specific fields (visible when ExecutionType = ODC):**

| Column | Type | Description |
|---|---|---|
| oly_ODC_ProductName | Text (300) | "Gigamon GigaVUE Maintenance" |
| oly_ODC_Vendor | Text (200) | "Gigamon" |
| oly_ODC_RenewalOf | Lookup → oly_ITAsset | Link to asset being renewed (if applicable) |
| oly_ODC_QuoteNumber | Text (100) | Vendor quote reference |
| oly_ODC_QuoteDocument | URL | SharePoint link to the quote PDF |
| oly_ODC_RenewalPeriod | Text (50) | "12 months" or "36 months" |
| oly_ODC_PriorYearCost | Currency | What this cost last time (for comparison) |
| oly_ODC_PriceIncrease | Currency | Computed: EstimatedCost - PriorYearCost |
| oly_ODC_PriceIncreasePct | Decimal | Computed: PriceIncrease / PriorYearCost |

**Travel-specific fields (visible when ExecutionType = Travel):**

| Column | Type | Description |
|---|---|---|
| oly_Travel_TravelerName | Text (200) | Who is traveling |
| oly_Travel_TravelerOrg | Choice | Government, Contractor |
| oly_Travel_Destination | Text (300) | City, State or City, Country |
| oly_Travel_Purpose | Multi-Line | Mission justification |
| oly_Travel_DepartureDate | Date Only | |
| oly_Travel_ReturnDate | Date Only | |
| oly_Travel_NumDays | Whole Number | Computed from dates |
| oly_Travel_Airfare | Currency | Estimated airfare |
| oly_Travel_Lodging | Currency | Estimated lodging |
| oly_Travel_PerDiem | Currency | Estimated meals & incidentals |
| oly_Travel_RentalCar | Currency | Estimated ground transport |
| oly_Travel_OtherCosts | Currency | Baggage, parking, tolls, etc. |
| oly_Travel_TotalEstimate | Currency | Computed: sum of all travel costs |
| oly_Travel_Actual_Airfare | Currency | Actual (post-travel) |
| oly_Travel_Actual_Lodging | Currency | Actual |
| oly_Travel_Actual_PerDiem | Currency | Actual |
| oly_Travel_Actual_RentalCar | Currency | Actual |
| oly_Travel_Actual_Other | Currency | Actual |
| oly_Travel_Actual_Total | Currency | Actual total |
| oly_Travel_VoucherDocument | URL | SharePoint link to travel voucher |
| oly_Travel_ConferenceEvent | Text (200) | Conference or event name (if applicable) |

### CLIN Balance Tracking

For the execution tracker to work, the system needs real-time 
visibility into each CLIN's funding status. This extends the 
CLIN table we already have.

**Additional fields on oly_AcquisitionCLIN (for active contracts):**

| Column | Type | Description |
|---|---|---|
| oly_CLINCeiling | Currency | Maximum value the government has agreed to |
| oly_CLINObligated | Currency | How much has been funded so far (incremental) |
| oly_CLINInvoiced | Currency | How much the performer has billed |
| oly_CLINPending | Currency | Computed: sum of approved but not-yet-invoiced execution requests |
| oly_CLINAvailable | Currency | Computed: Obligated - Invoiced - Pending |
| oly_CLINRemainingCeiling | Currency | Computed: Ceiling - Obligated (room for mods) |
| oly_CLINBurnRate | Currency | Computed: monthly average of invoiced amounts |
| oly_CLINRunwayMonths | Decimal | Computed: Available / BurnRate |
| oly_CLINStatus | Choice | Healthy, Watch (< 3 months runway), Critical (< 1 month), Exhausted |
| oly_CLINLastUpdated | DateTime | When the COR last reconciled balances |

**CLIN funding status visualization (in the app):**

```
CONTRACT: Accenture Federal — IT Support Services (FA8773-24-D-0042)
POP: Oct 2024 – Sep 2027 (Base + 2 Options)

┌─ CLIN 0001: Labor (FFP) ──────────────────────────────────────┐
│  Ceiling: $3,200,000  │  Obligated: $1,600,000  │  Invoiced: $1,280,000
│  ████████████████░░░░░░░░░░░░░░░░░░░  40% Invoiced │ Healthy
└───────────────────────────────────────────────────────────────┘

┌─ CLIN 0002: ODC — HW/SW (T&M) ───────────────────────────────┐
│  Ceiling: $800,000  │  Obligated: $450,000  │  Invoiced: $380,000
│  Pending Requests: $95,000 (Gigamon + CrowdStrike renewals)
│  Available: -$25,000  ⚠️ FUNDING ACTION REQUIRED
│  ██████████████████████████████████████ 106% Committed │ Critical
└───────────────────────────────────────────────────────────────┘

┌─ CLIN 0003: Travel ───────────────────────────────────────────┐
│  Ceiling: $200,000  │  Obligated: $120,000  │  Invoiced: $82,000
│  Pending Requests: $14,000 (2 upcoming trips)
│  Available: $24,000  │  Runway: ~4 months
│  ████████████████████████░░░░░░░░░░░░  80% Committed │ Watch
└───────────────────────────────────────────────────────────────┘
```

### Execution Flows

**Flow: CLIN Execution Request Submitted**

```
TRIGGER: When oly_CLINExecutionRequest.Status changes to "Submitted"

STEP 1: Validate request
        → Is a contract selected? Is a CLIN selected?
        → Does the ExecutionType match the CLIN type?
          (ODC request → ODC CLIN, Travel request → Travel CLIN)

STEP 2: Check CLIN balance
        → Query oly_AcquisitionCLIN for the selected CLIN
        → Calculate: CLINAvailable = Obligated - Invoiced - Pending
        → Compare: EstimatedCost vs. CLINAvailable

STEP 3a: If CLINAvailable ≥ EstimatedCost (funds sufficient)
        → Set FundingStatus = "Sufficient"
        → Set FundingActionRequired = No
        → Route to PM for approval (standard flow)
        → Notify PM: "New [ODC/Travel] request: [Title], $[Amount]. 
          CLIN [Number] has sufficient funds."

STEP 3b: If CLINAvailable < EstimatedCost (funds insufficient)
        → Set FundingStatus = "Insufficient — Funding Action Required"
        → Set FundingActionRequired = Yes
        → Calculate FundingActionAmount = EstimatedCost - CLINAvailable
          (plus buffer if configured — e.g., add 10% for other 
          upcoming needs)
        → Notify PM: "New [ODC/Travel] request: [Title], $[Amount].
          ⚠️ CLIN [Number] is short by $[Shortfall]. Funding action 
          required before authorization."
        → Notify FM/BM: "Funding action needed: Contract [Number], 
          CLIN [Number] needs $[Amount] additional obligation. 
          Current ceiling has $[RemainingCeiling] room."
        → If RemainingCeiling ≥ FundingActionAmount:
          → Note: "Within ceiling — KO can add funds via funding mod"
        → If RemainingCeiling < FundingActionAmount:
          → Note: "Exceeds ceiling — KO needs ceiling increase mod 
            (bilateral modification required)"
        → Hold request in "Funding Action Required" status
        → FM/BM identify LOA, KO executes mod
        → When FundingStatus changes to "Funding Action Complete":
          → Resume standard approval flow (PM → CTO)
```

**Flow: Standard Approval (PM → CTO)**

```
TRIGGER: FundingStatus = "Sufficient" OR "Funding Action Complete"
         AND Status = "Submitted" or "Funding Action Complete"

STEP 1: Route to PM
        → Create Approval (Power Automate Approvals connector)
        → PM reviews request, CLIN balance, documentation
        → PM approves / rejects / returns for revision

STEP 2: If PM Approved → Route to CTO
        → Create Approval for CTO
        → CTO reviews and approves / rejects / returns

STEP 3: If CTO Approved
        → Set Status = "Authorized"
        → Update CLIN Pending amount (+= EstimatedCost)
        → Notify requestor: "Your [ODC/Travel] request has been 
          authorized. The performer has been notified."
        → Notify performer (via COR or direct): "You are authorized 
          to proceed with [description]. Charge to CLIN [Number]."
        → Generate authorization document (for travel: travel 
          authorization form; for ODC: procurement direction letter)
```

**Flow: Invoice Received and COR Validation**

```
TRIGGER: When Status changes to "Invoice Received"

STEP 1: COR reviews invoice
        → Validates: Is the invoiced amount reasonable vs. estimate?
        → Validates: Did the performer deliver what was authorized?
        → COR marks as validated or disputes

STEP 2: If COR Validated
        → Set Status = "Complete"
        → Update CLIN balances:
          → CLINPending -= EstimatedCost (remove from pending)
          → CLINInvoiced += ActualCost (add to invoiced)
        → Record CostVariance = ActualCost - EstimatedCost
        → If Travel: prompt for travel voucher upload
        → Data feeds Power BI Spend Analytics dashboard

STEP 3: Recalculate CLIN health
        → Update CLINAvailable, CLINBurnRate, CLINRunwayMonths
        → Update CLINStatus (Healthy / Watch / Critical / Exhausted)
        → If CLINStatus changes to "Watch" or "Critical":
          → Notify PM and BM: "CLIN [Number] on contract [Number] 
            has [X] months of runway remaining at current burn rate."
```

### Travel-Specific Workflow Additions

**Per Diem Lookup:**

The system should include a reference table for GSA per diem rates, 
or at minimum link to the GSA per diem lookup. When a traveler 
enters a destination, the system can auto-populate the standard 
lodging and M&IE rates for that location.

**Table: oly_PerDiemRate (optional — loaded from GSA data)**

| Column | Type | Description |
|---|---|---|
| oly_PerDiemRateId | PK | |
| oly_Location | Text (200) | "Arlington, VA" |
| oly_State | Text (50) | |
| oly_FiscalYear | Text (4) | |
| oly_LodgingRate | Currency | Standard lodging rate |
| oly_MIERate | Currency | Meals & Incidental Expenses rate |
| oly_EffectiveDate | Date Only | |

**Post-Travel Reconciliation:**

After the trip, the traveler (or COR) enters actual costs. 
The system calculates the variance and flags any significant 
overages. The travel voucher document is uploaded to SharePoint 
and linked to the request record.

```
IF Travel_Actual_Total > Travel_TotalEstimate * 1.10 THEN
  Flag: "Actual travel costs exceeded estimate by more than 10%. 
  COR review required."
```

### Integration Points

**→ Acquisition Lifecycle Tracker:**

When a CLIN Execution Request triggers a funding action that 
requires a contract modification (either to add funds within 
ceiling or to increase the ceiling), the system can auto-create 
a new oly_AcquisitionRequest record with:
- IntakeQ1 = "Change Existing"
- IntakeQ5 = "Add scope, increase funding"
- DerivedAcquisitionType = "Bilateral Modification"
- Pre-populated contract reference and CLIN
- EstimatedValue = FundingActionAmount
This routes through the standard acquisition approval flow, 
but with context that it was triggered by a CLIN execution 
shortfall.

**→ Spend Analytics (Power BI Dashboard):**

Completed CLIN Execution Requests feed the existing 3×3 KPI 
dashboard. The data model already has contract/CLIN/obligation 
tracking. The execution tracker adds:
- Granular transaction-level detail (what was bought/traveled)
- Pending amounts (authorized but not yet invoiced)
- Forecast accuracy (estimated vs. actual per request)
- Travel spend analytics (by destination, by traveler, by 
  purpose — useful for the CIO's annual travel reporting)

**→ Asset Tracker:**

When an ODC execution request is for a HW/SW renewal and is 
linked to an asset via oly_ODC_RenewalOf, completion of the 
request can automatically update the asset's maintenance 
contract dates, warranty extension, and next renewal date. 
This closes the loop on the Demand Forecast: asset warranty 
expires → demand forecast created → acquisition or CLIN 
execution request created → completed → asset record updated 
→ next expiration tracked.

**→ Demand Forecast:**

ODC renewal requests that originated from a Demand Forecast 
are linked via oly_DemandForecast. When the request completes, 
the forecast status updates to "Executed" and the next cycle's 
forecast is seeded based on the actual cost and the renewal 
period.

### ATMS Replacement Completeness Checklist

The CLIN Execution Tracker replaces the legacy ATMS system. 
To ensure nothing is lost in the transition:

| ATMS Capability | New System Equivalent |
|---|---|
| Submit HW/SW acquisition request | CLIN Execution Request (type: ODC) |
| Submit travel request | CLIN Execution Request (type: Travel) |
| PM approval | PM Approval step in execution flow |
| CTO approval | CTO Approval step in execution flow |
| Track request status | Status field with full lifecycle tracking |
| View approval history | Approval audit trail (dates, names, comments) |
| Attach documents (quotes, vouchers) | SharePoint document links on request |
| View spending against contract | CLIN balance visualization + Power BI |
| Travel cost breakdown | Travel-specific fields (airfare, lodging, per diem, etc.) |
| Post-travel voucher | Travel voucher upload and actual cost reconciliation |
| Email notifications | Power Automate notifications (email + Teams) |
| Reporting | Power BI Spend Analytics (already built) |

Items the new system adds that ATMS didn't have:
- Automatic CLIN balance check before approval
- Funding action trigger when CLIN is insufficient
- Auto-link to contract modification workflow
- Integration with Asset Tracker for renewal lifecycle
- Demand forecasting for upcoming renewals
- Per diem rate lookup
- Cost variance tracking (estimated vs. actual)
- CLIN health monitoring with runway projections


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
