import type { AcquisitionRequest, ApprovalStep } from '../types';

// --- Interfaces ---

export interface ProcessStep {
  id: string;
  label: string;
  description: string;
  responsible: string;
  /** Request statuses that map to "You are here" for this step */
  statusMatches: string[];
  /** Approval gate names that map to this step (for precise matching) */
  gateNames?: string[];
  /** Pipelines this step applies to. Empty = all. */
  pipelines?: string[];
  /** Whether this step is conditional (only applies in certain scenarios) */
  conditional?: boolean;
  /** Short note explaining when this conditional step applies */
  conditionNote?: string;
}

export interface ProcessPhase {
  id: string;
  label: string;
  bgColor: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
  iconName: string;
  steps: ProcessStep[];
}

// --- Phase Definitions ---

export const PROCESS_PHASES: ProcessPhase[] = [
  {
    id: 'request',
    label: 'Request',
    bgColor: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-700',
    iconName: 'FileEdit',
    steps: [
      {
        id: 'need_identified',
        label: 'Need Identified',
        description: 'A program office or end-user identifies a business need for IT goods or services.',
        responsible: 'Requestor',
        statusMatches: [],
      },
      {
        id: 'intake_wizard',
        label: 'Guided Intake',
        description: 'Answer classification questions: need type, buy category, estimated value, vendor status. The system derives acquisition type, tier, and pipeline.',
        responsible: 'Requestor',
        statusMatches: ['draft'],
      },
      {
        id: 'clin_builder',
        label: 'CLIN Builder',
        description: 'Define contract line items (CLINs) — labor, ODC, travel, licenses — with PSC codes, LOA funding, and ceiling amounts.',
        responsible: 'Requestor',
        statusMatches: [],
      },
      {
        id: 'doc_prep',
        label: 'Document Preparation',
        description: 'Prepare the acquisition package: requirements documents (SOW/SOO/PWS), market research, IGCE, J&A (if sole source), and other required artifacts.',
        responsible: 'Requestor',
        statusMatches: [],
      },
      {
        id: 'submit',
        label: 'Submit for Review',
        description: 'Submit the completed package into the approval pipeline. The system activates the first approval gate and notifies the appropriate reviewer.',
        responsible: 'Requestor',
        statusMatches: ['submitted'],
      },
    ],
  },
  {
    id: 'review',
    label: 'Review & Approval',
    bgColor: 'bg-amber-500',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-700',
    iconName: 'ClipboardCheck',
    steps: [
      {
        id: 'iss_review',
        label: 'ISS Review',
        description: 'Branch Chief screens the request for completeness, alignment with division priorities, and resource availability.',
        responsible: 'Branch Chief',
        statusMatches: ['iss_review'],
        gateNames: ['ISS', 'ISS Review', 'PM Approval', 'COR Confirmation', 'COR + PM Justification', 'COR Justification', 'Supervisor'],
      },
      {
        id: 'asr_review',
        label: 'ASR Review',
        description: 'Acquisition Strategy Review board evaluates the procurement approach, competition strategy, and technical requirements.',
        responsible: 'Review Board',
        statusMatches: ['asr_review'],
        gateNames: ['ASR', 'ASR Review'],
        pipelines: ['full'],
        conditional: true,
        conditionNote: 'Full pipeline only',
      },
      {
        id: 'finance_review',
        label: 'Finance Review',
        description: 'Budget Officer validates funding availability, LOA allocations, and PR&C (Purchase Request & Commitment) documentation.',
        responsible: 'Budget Officer',
        statusMatches: ['finance_review'],
        gateNames: ['Finance', 'Finance Review', 'FM Funding', 'BM LOA Confirmation', 'GPC Holder'],
      },
      {
        id: 'ko_review',
        label: 'KO Review',
        description: 'Contracting Officer reviews the complete acquisition package for regulatory compliance, FAR/DFARS adherence, and awards authority.',
        responsible: 'Contracting Officer',
        statusMatches: ['ko_review'],
        gateNames: ['KO Review', 'KO Action', 'KO Execution', 'KO Determination', 'COR Authorization', 'KO Contract Mod'],
      },
      {
        id: 'legal_review',
        label: 'Legal Review',
        description: 'General Counsel reviews sole-source justifications (J&A), brand-name determinations, and other legal matters.',
        responsible: 'Legal Counsel',
        statusMatches: ['legal_review'],
        gateNames: ['Legal Review'],
        conditional: true,
        conditionNote: 'Sole source / J&A required',
      },
      {
        id: 'cio_approval',
        label: 'CIO Approval',
        description: 'Chief Information Officer reviews IT acquisitions for alignment with enterprise architecture, cybersecurity posture, and IT governance standards.',
        responsible: 'CIO',
        statusMatches: ['cio_approval'],
        gateNames: ['CIO Approval', 'CTO Approval'],
        conditional: true,
        conditionNote: 'IT acquisitions only',
      },
      {
        id: 'senior_review',
        label: 'Senior Leadership',
        description: 'Component Head or Senior Executive reviews major acquisitions exceeding the $9M threshold for strategic alignment and risk acceptance.',
        responsible: 'Component Head',
        statusMatches: ['senior_review'],
        gateNames: ['Senior Leadership'],
        conditional: true,
        conditionNote: 'Major acquisitions (>$9M)',
      },
    ],
  },
  {
    id: 'advisory',
    label: 'Advisory Panel',
    bgColor: 'bg-purple-500',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-700',
    iconName: 'Shield',
    steps: [
      {
        id: 'scrm_advisory',
        label: 'SCRM Review',
        description: 'Supply Chain Risk Management team assesses vendor supply chain risks, foreign ownership concerns, and critical component dependencies.',
        responsible: 'SCRM Team',
        statusMatches: [],
      },
      {
        id: 'sbo_advisory',
        label: 'Small Business Review',
        description: 'Small Business Office evaluates set-aside eligibility, subcontracting plan requirements, and small business goal compliance.',
        responsible: 'SB Specialist',
        statusMatches: [],
      },
      {
        id: 'cio_advisory',
        label: 'CIO / IT Governance',
        description: 'CIO advisory reviews IT standards compliance, enterprise license agreements, and technology roadmap alignment.',
        responsible: 'CIO Office',
        statusMatches: [],
      },
      {
        id: 'section508_advisory',
        label: 'Section 508',
        description: 'Accessibility team reviews Section 508 compliance requirements for IT deliverables, ensuring VPAT documentation and accessibility testing plans.',
        responsible: '508 Coordinator',
        statusMatches: [],
      },
    ],
  },
  {
    id: 'decision',
    label: 'Decision',
    bgColor: 'bg-green-500',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-300',
    textColor: 'text-green-700',
    iconName: 'CheckCircle2',
    steps: [
      {
        id: 'approved',
        label: 'Approved',
        description: 'All approval gates passed and advisory reviews complete. The acquisition package is authorized to proceed to solicitation and award.',
        responsible: 'System',
        statusMatches: ['approved'],
      },
      {
        id: 'returned',
        label: 'Returned for Revision',
        description: 'An approver has returned the package to the Requestor with comments. The Requestor can address feedback and resubmit.',
        responsible: 'Requestor',
        statusMatches: ['returned'],
      },
      {
        id: 'cancelled',
        label: 'Cancelled / Rejected',
        description: 'The request has been rejected at an approval gate or cancelled by the Requestor. No further action is taken.',
        responsible: 'N/A',
        statusMatches: ['cancelled'],
      },
    ],
  },
  {
    id: 'award',
    label: 'Award & Execution',
    bgColor: 'bg-indigo-500',
    bgLight: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    textColor: 'text-indigo-700',
    iconName: 'Award',
    steps: [
      {
        id: 'solicitation',
        label: 'Solicitation / RFQ',
        description: 'Contracting Officer issues the solicitation (RFP, RFQ, or task order request) to prospective vendors via appropriate vehicle (full & open, GSA, GWAC, BPA, IDIQ).',
        responsible: 'Contracting Officer',
        statusMatches: [],
      },
      {
        id: 'evaluation',
        label: 'Proposal Evaluation',
        description: 'Technical evaluation panel reviews vendor proposals against evaluation criteria. Best-value or LPTA determination made.',
        responsible: 'Evaluation Panel',
        statusMatches: [],
      },
      {
        id: 'contract_award',
        label: 'Contract Award',
        description: 'Contracting Officer makes the award decision, executes the contract, and notifies successful and unsuccessful offerors.',
        responsible: 'Contracting Officer',
        statusMatches: ['awarded'],
      },
      {
        id: 'po_issuance',
        label: 'PO / Task Order Issued',
        description: 'Purchase order or task order is issued. Funding is obligated against the appropriate LOA. Vendor is authorized to begin performance.',
        responsible: 'Contracting Officer',
        statusMatches: [],
      },
    ],
  },
  {
    id: 'delivery',
    label: 'Delivery & Receipt',
    bgColor: 'bg-teal-500',
    bgLight: 'bg-teal-50',
    borderColor: 'border-teal-300',
    textColor: 'text-teal-700',
    iconName: 'Truck',
    steps: [
      {
        id: 'vendor_performance',
        label: 'Vendor Performance',
        description: 'Vendor delivers goods or performs services per the contract terms. COR monitors performance, milestones, and deliverable quality.',
        responsible: 'Vendor / COR',
        statusMatches: [],
      },
      {
        id: 'clin_execution',
        label: 'CLIN Execution',
        description: 'Individual CLINs are executed as needed — ODC purchases, travel authorizations, and other task-level actions tracked against CLIN ceilings.',
        responsible: 'Program Manager',
        statusMatches: [],
      },
      {
        id: 'invoice_processing',
        label: 'Invoice Processing',
        description: 'Vendor submits invoices. COR validates deliverables received match invoiced amounts. Finance processes payment.',
        responsible: 'COR / Finance',
        statusMatches: [],
      },
      {
        id: 'cor_validation',
        label: 'COR Validation',
        description: 'Contracting Officer\'s Representative validates that all deliverables meet quality standards and contract requirements before acceptance.',
        responsible: 'COR',
        statusMatches: [],
      },
    ],
  },
  {
    id: 'closeout',
    label: 'Closeout',
    bgColor: 'bg-slate-500',
    bgLight: 'bg-slate-50',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-600',
    iconName: 'FolderCheck',
    steps: [
      {
        id: 'final_acceptance',
        label: 'Final Acceptance',
        description: 'Government formally accepts all deliverables. Final performance evaluation (CPARS) is completed. Any remaining funds are de-obligated.',
        responsible: 'COR / KO',
        statusMatches: [],
      },
      {
        id: 'contract_closeout',
        label: 'Contract Closeout',
        description: 'Administrative closeout: final payment processed, contract file documented, records archived per retention schedule. Lifecycle complete.',
        responsible: 'Contracting Officer',
        statusMatches: ['completed'],
      },
    ],
  },
];

// --- Helper: Get all step IDs in order (excluding advisory) ---

function getOrderedStepIds(): string[] {
  const ids: string[] = [];
  for (const phase of PROCESS_PHASES) {
    if (phase.id === 'advisory') continue;
    for (const step of phase.steps) {
      ids.push(step.id);
    }
  }
  return ids;
}

const ORDERED_STEP_IDS = getOrderedStepIds();

// --- Helper: Resolve current step from request data ---

export interface CurrentPosition {
  phaseId: string;
  stepId: string;
}

const STATUS_TO_STEP: Record<string, CurrentPosition> = {
  draft: { phaseId: 'request', stepId: 'intake_wizard' },
  submitted: { phaseId: 'review', stepId: 'iss_review' },
  iss_review: { phaseId: 'review', stepId: 'iss_review' },
  asr_review: { phaseId: 'review', stepId: 'asr_review' },
  finance_review: { phaseId: 'review', stepId: 'finance_review' },
  ko_review: { phaseId: 'review', stepId: 'ko_review' },
  legal_review: { phaseId: 'review', stepId: 'legal_review' },
  cio_approval: { phaseId: 'review', stepId: 'cio_approval' },
  senior_review: { phaseId: 'review', stepId: 'senior_review' },
  approved: { phaseId: 'decision', stepId: 'approved' },
  returned: { phaseId: 'decision', stepId: 'returned' },
  cancelled: { phaseId: 'decision', stepId: 'cancelled' },
  awarded: { phaseId: 'award', stepId: 'contract_award' },
  completed: { phaseId: 'closeout', stepId: 'contract_closeout' },
};

export function resolveCurrentStep(
  request: AcquisitionRequest
): CurrentPosition | null {
  return STATUS_TO_STEP[request.status] || null;
}

// --- Helper: Determine step visual state ---

export type StepState = 'completed' | 'current' | 'upcoming' | 'skipped';

export function getStepState(
  stepId: string,
  currentPosition: CurrentPosition | null,
  pipeline?: string | null
): StepState {
  if (!currentPosition) return 'upcoming';

  const currentIdx = ORDERED_STEP_IDS.indexOf(currentPosition.stepId);
  const stepIdx = ORDERED_STEP_IDS.indexOf(stepId);

  // Steps not in the ordered list (advisory steps) stay upcoming
  if (stepIdx === -1 || currentIdx === -1) return 'upcoming';

  if (stepId === currentPosition.stepId) return 'current';
  if (stepIdx < currentIdx) return 'completed';
  return 'upcoming';
}

// --- Helper: Check if step applies to a pipeline ---

export function isStepApplicable(step: ProcessStep, track: string): boolean {
  if (track === 'all') return true;
  if (!step.pipelines || step.pipelines.length === 0) return true;
  return step.pipelines.includes(track);
}

// --- Helper: Build a tailored roadmap for a specific request ---

export interface RoadmapStep {
  id: string;
  label: string;
  phase: string;       // phase color key
  responsible: string;
  state: 'completed' | 'current' | 'upcoming';
}

/**
 * Builds a linear roadmap from the request's actual approval steps,
 * bookended by the request/submit phase and post-approval phases.
 */
export function buildRequestRoadmap(
  request: AcquisitionRequest,
  approvalSteps: ApprovalStep[]
): RoadmapStep[] {
  const roadmap: RoadmapStep[] = [];
  const status = request.status;

  // --- Phase 1: Request (always the same) ---
  const requestDone = status !== 'draft';
  roadmap.push({
    id: 'rm_intake',
    label: 'Intake & Submit',
    phase: 'blue',
    responsible: 'Requestor',
    state: requestDone ? 'completed' : 'current',
  });

  // --- Phase 2: Approval gates (from actual approval steps if available, else from known templates) ---
  const sorted = [...approvalSteps].sort((a, b) => a.step_number - b.step_number);

  if (sorted.length > 0) {
    // Use real approval steps
    for (const step of sorted) {
      if (step.status === 'skipped') continue;
      let state: 'completed' | 'current' | 'upcoming' = 'upcoming';
      if (step.status === 'approved') state = 'completed';
      else if (step.status === 'active' || step.status === 'in_review') state = 'current';
      else if (step.status === 'rejected') state = 'current'; // show rejection point
      else if (step.status === 'returned') state = 'current';

      roadmap.push({
        id: `rm_gate_${step.step_number}`,
        label: step.gate_name || `Step ${step.step_number}`,
        phase: 'amber',
        responsible: (step.approver_role || '').replace(/_/g, ' '),
        state,
      });
    }
  } else if (status === 'draft' || status === 'submitted') {
    // Not yet submitted or just submitted — show template-based preview
    const templateSteps = PIPELINE_TEMPLATE_GATES[request.pipeline || ''];
    if (templateSteps) {
      for (const ts of templateSteps) {
        roadmap.push({
          id: `rm_tmpl_${ts.gate}`,
          label: ts.gate,
          phase: 'amber',
          responsible: ts.role,
          state: 'upcoming',
        });
      }
    }
  }

  // --- Phase 3: Decision ---
  const isTerminal = ['approved', 'awarded', 'completed'].includes(status);
  const isReturned = status === 'returned';
  const isCancelled = status === 'cancelled';
  roadmap.push({
    id: 'rm_decision',
    label: isCancelled ? 'Rejected' : isReturned ? 'Returned' : 'Decision',
    phase: isCancelled ? 'red' : 'green',
    responsible: 'System',
    state: isTerminal ? 'completed' : (isReturned || isCancelled) ? 'current' : 'upcoming',
  });

  // Don't show post-decision steps if returned/cancelled
  if (isReturned || isCancelled) return roadmap;

  // --- Phase 4: Award ---
  roadmap.push({
    id: 'rm_award',
    label: 'Contract Award',
    phase: 'indigo',
    responsible: 'Contracting Officer',
    state: status === 'awarded' || status === 'completed' ? 'completed'
         : status === 'awarded' ? 'current' : 'upcoming',
  });

  // --- Phase 5: Delivery ---
  roadmap.push({
    id: 'rm_delivery',
    label: 'Delivery & Receipt',
    phase: 'teal',
    responsible: 'Vendor / COR',
    state: status === 'completed' ? 'completed' : 'upcoming',
  });

  // --- Phase 6: Closeout ---
  roadmap.push({
    id: 'rm_closeout',
    label: 'Closeout',
    phase: 'slate',
    responsible: 'Contracting Officer',
    state: status === 'completed' ? 'current' : 'upcoming',
  });

  return roadmap;
}

/** Known approval template gates per pipeline (fallback when no steps exist yet) */
const PIPELINE_TEMPLATE_GATES: Record<string, { gate: string; role: string }[]> = {
  full: [
    { gate: 'ISS', role: 'Branch Chief' },
    { gate: 'ASR', role: 'Review Board' },
    { gate: 'Finance', role: 'Budget Officer' },
    { gate: 'KO Review', role: 'Contracting Officer' },
  ],
  full_legal: [
    { gate: 'ISS', role: 'Branch Chief' },
    { gate: 'ASR', role: 'Review Board' },
    { gate: 'Legal Review', role: 'Legal Counsel' },
    { gate: 'Finance', role: 'Budget Officer' },
    { gate: 'KO Review', role: 'Contracting Officer' },
  ],
  abbreviated: [
    { gate: 'COR Confirmation', role: 'COR' },
    { gate: 'Finance', role: 'Budget Officer' },
    { gate: 'KO Execution', role: 'Contracting Officer' },
  ],
  ko_abbreviated: [
    { gate: 'COR + PM Justification', role: 'COR / PM' },
    { gate: 'KO Determination', role: 'Contracting Officer' },
  ],
  ko_only: [
    { gate: 'KO Action', role: 'Contracting Officer' },
  ],
  clin_execution: [
    { gate: 'PM Approval', role: 'Program Manager' },
    { gate: 'CTO Approval', role: 'CTO' },
    { gate: 'COR Authorization', role: 'COR' },
  ],
  clin_exec_funding: [
    { gate: 'FM Funding', role: 'Funds Manager' },
    { gate: 'BM LOA Confirmation', role: 'Budget Manager' },
    { gate: 'KO Contract Mod', role: 'Contracting Officer' },
    { gate: 'PM Approval', role: 'Program Manager' },
    { gate: 'CTO Approval', role: 'CTO' },
    { gate: 'COR Authorization', role: 'COR' },
  ],
  modification: [
    { gate: 'COR Justification', role: 'COR' },
    { gate: 'Finance', role: 'Budget Officer' },
    { gate: 'KO Review', role: 'Contracting Officer' },
  ],
  micro: [
    { gate: 'Supervisor', role: 'Supervisor' },
    { gate: 'GPC Holder', role: 'Card Holder' },
  ],
};

// --- Helper: Map roadmap step numbers to detailed tile step IDs ---

export function buildStepNumberMap(
  roadmapSteps: RoadmapStep[],
): Map<string, number> {
  const map = new Map<string, number>();

  for (let i = 0; i < roadmapSteps.length; i++) {
    const rm = roadmapSteps[i];
    const num = i + 1;

    // Fixed roadmap steps → detailed step IDs
    if (rm.id === 'rm_intake') {
      map.set('intake_wizard', num);
      continue;
    }
    if (rm.id === 'rm_decision') {
      map.set('approved', num);
      map.set('returned', num);
      map.set('cancelled', num);
      continue;
    }
    if (rm.id === 'rm_award') {
      map.set('contract_award', num);
      continue;
    }
    if (rm.id === 'rm_delivery') {
      map.set('vendor_performance', num);
      continue;
    }
    if (rm.id === 'rm_closeout') {
      map.set('contract_closeout', num);
      continue;
    }

    // Gate-based: match roadmap label against step gateNames in the process phases
    const label = rm.label.toLowerCase();
    for (const phase of PROCESS_PHASES) {
      for (const step of phase.steps) {
        if (step.gateNames?.some(gn => gn.toLowerCase() === label)) {
          map.set(step.id, num);
        }
      }
    }
  }

  return map;
}

// --- Helper: Get advisory status from request ---

export function getAdvisoryStatus(
  request: AcquisitionRequest | null,
  teamKey: string
): string | null {
  if (!request) return null;
  const fieldMap: Record<string, string | null | undefined> = {
    scrm_advisory: request.scrm_status,
    sbo_advisory: request.sbo_status,
    cio_advisory: request.cio_status,
    section508_advisory: request.section508_status,
  };
  return fieldMap[teamKey] ?? null;
}
