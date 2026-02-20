import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Map, MapPin, ChevronRight, FileEdit, ClipboardCheck, Shield,
  CheckCircle2, Award, Truck, FolderCheck, Check, Clock, X,
  ArrowLeft, Info,
} from 'lucide-react';
import { requestsApi } from '../api/requests';
import { approvalsApi } from '../api/approvals';
import {
  PROCESS_PHASES,
  resolveCurrentStep,
  getStepState,
  isStepApplicable,
  getAdvisoryStatus,
  buildRequestRoadmap,
  buildStepNumberMap,
} from '../data/processGuideData';
import type { ProcessPhase, ProcessStep, CurrentPosition, StepState, RoadmapStep } from '../data/processGuideData';
import type { AcquisitionRequest, ApprovalStep } from '../types';
import { STATUS_LABELS, PIPELINE_LABELS } from '../types';

// Icon lookup by name
const ICON_MAP: Record<string, React.ElementType> = {
  FileEdit, ClipboardCheck, Shield, CheckCircle2, Award, Truck, FolderCheck,
};

// --- Track Selector ---

function TrackSelector({
  selected,
  onChange,
  locked,
}: {
  selected: string;
  onChange: (t: string) => void;
  locked: boolean;
}) {
  const tracks = [
    { key: 'all', label: 'All Steps' },
    { key: 'full', label: 'IT Services (Full)' },
    { key: 'abbreviated', label: 'IT Products (Abbreviated)' },
  ];

  return (
    <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1 w-fit">
      {tracks.map(t => (
        <button
          key={t.key}
          onClick={() => !locked && onChange(t.key)}
          disabled={locked}
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            selected === t.key
              ? 'bg-white shadow-sm font-medium text-gray-900'
              : locked
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// --- Step Card ---

function StepCard({
  step,
  state,
  applicable,
  phase,
  expanded,
  onToggle,
  roadmapNum,
}: {
  step: ProcessStep;
  state: StepState;
  applicable: boolean;
  phase: ProcessPhase;
  expanded: boolean;
  onToggle: () => void;
  roadmapNum?: number;
}) {
  const circleStyle = (): string => {
    if (!applicable) return 'bg-gray-200 text-gray-400';
    switch (state) {
      case 'completed': return 'bg-green-500 text-white';
      case 'current': return `${phase.bgColor} text-white`;
      case 'upcoming': return 'bg-gray-200 text-gray-500';
      case 'skipped': return 'bg-gray-200 text-gray-400';
      default: return 'bg-gray-200 text-gray-500';
    }
  };

  const circleIcon = () => {
    if (!applicable) return <X size={12} />;
    switch (state) {
      case 'completed': return <Check size={12} />;
      case 'current': return <Clock size={12} />;
      default: return <span className="text-[10px] font-bold">{' '}</span>;
    }
  };

  const pulseStyle = state === 'current' && applicable
    ? { animation: 'pulse-ring 2s ease-out infinite', boxShadow: '0 0 0 0 rgba(51, 122, 183, 0.4)' }
    : {};

  return (
    <div
      className={`flex items-start gap-2.5 p-2 rounded-md cursor-pointer transition-colors hover:bg-gray-50 ${
        !applicable ? 'opacity-40' : ''
      }`}
      onClick={onToggle}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${circleStyle()}`}
        style={pulseStyle}
      >
        {circleIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {roadmapNum != null && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: '#337ab7' }}
            >
              {roadmapNum}
            </span>
          )}
          <span className={`text-sm font-medium ${!applicable ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {step.label}
          </span>
          {state === 'current' && applicable && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
              style={{ backgroundColor: '#337ab7' }}
            >
              YOU ARE HERE
            </span>
          )}
          {step.conditional && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${phase.bgLight} ${phase.textColor}`}>
              {step.conditionNote}
            </span>
          )}
          {!applicable && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">N/A</span>
          )}
        </div>
        <span className="text-[11px] text-gray-400">{step.responsible}</span>
        {expanded && (
          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{step.description}</p>
        )}
      </div>
    </div>
  );
}

// --- Phase Column ---

function PhaseColumn({
  phase,
  track,
  currentPosition,
  expandedSteps,
  onToggleStep,
  stepNumberMap,
}: {
  phase: ProcessPhase;
  track: string;
  currentPosition: CurrentPosition | null;
  expandedSteps: Set<string>;
  onToggleStep: (id: string) => void;
  stepNumberMap?: Map<string, number>;
}) {
  const Icon = ICON_MAP[phase.iconName] || FileEdit;
  const isCurrentPhase = currentPosition?.phaseId === phase.id;

  return (
    <div
      className={`min-w-[210px] w-[220px] rounded-lg border overflow-hidden ${
        isCurrentPhase && currentPosition ? `${phase.borderColor} ring-2 ring-offset-1` : 'border-gray-200'
      }`}
      style={isCurrentPhase && currentPosition ? { '--tw-ring-color': 'rgba(51,122,183,0.3)' } as React.CSSProperties : {}}
    >
      {/* Phase header */}
      <div className={`${phase.bgColor} px-3 py-2.5 flex items-center gap-2`}>
        <Icon size={16} className="text-white" />
        <span className="text-sm font-semibold text-white">{phase.label}</span>
      </div>
      {/* Steps */}
      <div className="bg-white p-2 space-y-0.5">
        {phase.steps.map(step => {
          const applicable = isStepApplicable(step, track);
          const state = getStepState(step.id, currentPosition, track);
          return (
            <StepCard
              key={step.id}
              step={step}
              state={state}
              applicable={applicable}
              phase={phase}
              expanded={expandedSteps.has(step.id)}
              onToggle={() => onToggleStep(step.id)}
              roadmapNum={stepNumberMap?.get(step.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// --- Advisory Lane ---

function AdvisoryLane({
  phase,
  request,
  expandedSteps,
  onToggleStep,
}: {
  phase: ProcessPhase;
  request: AcquisitionRequest | null;
  expandedSteps: Set<string>;
  onToggleStep: (id: string) => void;
}) {
  return (
    <div className={`rounded-lg border ${phase.borderColor} overflow-hidden`}>
      <div className={`${phase.bgColor} px-3 py-2 flex items-center gap-2`}>
        <Shield size={16} className="text-white" />
        <span className="text-sm font-semibold text-white">{phase.label}</span>
        <span className="text-xs text-white/70 ml-1">(runs in parallel with Review & Approval)</span>
      </div>
      <div className="bg-white p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {phase.steps.map(step => {
            const advStatus = getAdvisoryStatus(request, step.id);
            const isComplete = advStatus === 'complete' || advStatus === 'completed';
            const isActive = advStatus === 'in_progress' || advStatus === 'assigned';
            const expanded = expandedSteps.has(step.id);

            return (
              <div
                key={step.id}
                className="p-2.5 rounded-md border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => onToggleStep(step.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                    isComplete ? 'bg-green-500' : isActive ? 'bg-purple-500' : 'bg-gray-200'
                  }`}>
                    {isComplete ? <Check size={10} /> : isActive ? <Clock size={10} /> : null}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{step.label}</span>
                </div>
                <span className="text-[11px] text-gray-400">{step.responsible}</span>
                {advStatus && (
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded capitalize ${
                    isComplete ? 'bg-green-100 text-green-700' :
                    isActive ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{advStatus.replace(/_/g, ' ')}</span>
                )}
                {expanded && (
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{step.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Request Roadmap (compact linear view for a specific request) ---

const PHASE_COLORS: Record<string, { bg: string; text: string; line: string }> = {
  blue:   { bg: 'bg-blue-500',   text: 'text-blue-700',   line: 'bg-blue-300' },
  amber:  { bg: 'bg-amber-500',  text: 'text-amber-700',  line: 'bg-amber-300' },
  green:  { bg: 'bg-green-500',  text: 'text-green-700',  line: 'bg-green-300' },
  red:    { bg: 'bg-red-500',    text: 'text-red-700',    line: 'bg-red-300' },
  indigo: { bg: 'bg-indigo-500', text: 'text-indigo-700', line: 'bg-indigo-300' },
  teal:   { bg: 'bg-teal-500',   text: 'text-teal-700',   line: 'bg-teal-300' },
  slate:  { bg: 'bg-slate-500',  text: 'text-slate-600',  line: 'bg-slate-300' },
};

function RequestRoadmap({ steps }: { steps: RoadmapStep[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <MapPin size={16} className="text-eaw-primary" />
        Your Roadmap
      </h3>
      <div className="overflow-x-auto">
        <div className="flex items-start" style={{ minWidth: 'max-content' }}>
          {steps.map((step, i) => {
            const colors = PHASE_COLORS[step.phase] || PHASE_COLORS.slate;
            const isCurrent = step.state === 'current';
            const isCompleted = step.state === 'completed';

            return (
              <div key={step.id} className="flex items-start">
                {/* Step node */}
                <div className="flex flex-col items-center" style={{ width: '100px' }}>
                  {/* Circle */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted ? 'bg-green-500 text-white' :
                      isCurrent ? `${colors.bg} text-white` :
                      'bg-gray-200 text-gray-400'
                    }`}
                    style={isCurrent ? { animation: 'pulse-ring 2s ease-out infinite' } : {}}
                  >
                    {isCompleted ? <Check size={16} /> :
                     isCurrent ? <Clock size={16} /> :
                     <span className="text-xs font-bold">{i + 1}</span>}
                  </div>
                  {/* Label */}
                  <span className={`text-xs font-medium mt-1.5 text-center leading-tight ${
                    isCurrent ? 'text-gray-900 font-semibold' : isCompleted ? 'text-green-700' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                  <span className={`text-[10px] mt-0.5 text-center ${
                    isCurrent ? 'text-gray-500' : 'text-gray-300'
                  }`}>
                    {step.responsible}
                  </span>
                  {isCurrent && (
                    <span
                      className="text-[9px] font-bold mt-1 px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: '#337ab7' }}
                    >
                      YOU ARE HERE
                    </span>
                  )}
                </div>
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="flex items-center" style={{ paddingTop: '14px' }}>
                    <div className={`h-0.5 w-8 ${isCompleted ? 'bg-green-400' : 'bg-gray-200'}`} />
                    <ChevronRight size={14} className={isCompleted ? 'text-green-400' : 'text-gray-300'} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Legend ---

function Legend() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Legend</h3>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-green-500 inline-flex items-center justify-center">
            <Check size={10} className="text-white" />
          </span>
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-4 h-4 rounded-full inline-flex items-center justify-center text-white"
            style={{ backgroundColor: '#337ab7' }}
          >
            <Clock size={10} />
          </span>
          Current Step (You Are Here)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-gray-200 inline-block" />
          Upcoming
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-gray-200 opacity-40 inline-flex items-center justify-center">
            <X size={10} className="text-gray-400" />
          </span>
          Not Applicable (N/A)
        </span>
        <span className="flex items-center gap-1.5">
          <Info size={14} className="text-gray-400" />
          Click any step to expand its description
        </span>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function ProcessGuidePage() {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId');

  const [request, setRequest] = useState<AcquisitionRequest | null>(null);
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState(!!requestId);
  const [track, setTrack] = useState<string>('all');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [currentPosition, setCurrentPosition] = useState<CurrentPosition | null>(null);

  // Fetch request data when requestId is provided
  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }
    const id = Number(requestId);
    if (isNaN(id)) { setLoading(false); return; }

    Promise.all([
      requestsApi.get(id),
      approvalsApi.forRequest(id).catch(() => []),
    ]).then(([req, apprs]) => {
      setRequest(req);
      setApprovalSteps(Array.isArray(apprs) ? apprs : apprs.steps || []);
      const pos = resolveCurrentStep(req);
      setCurrentPosition(pos);
      // Auto-select track based on pipeline
      if (req.pipeline === 'full') setTrack('full');
      else if (req.pipeline === 'abbreviated' || req.pipeline === 'ko_abbreviated') setTrack('abbreviated');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [requestId]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const mainPhases = PROCESS_PHASES.filter(p => p.id !== 'advisory');
  const advisoryPhase = PROCESS_PHASES.find(p => p.id === 'advisory')!;

  // Build step number map when a request roadmap exists
  const roadmapSteps = request ? buildRequestRoadmap(request, approvalSteps) : [];
  const stepNumberMap = request ? buildStepNumberMap(roadmapSteps) : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eaw-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Map size={24} className="text-eaw-primary shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Acquisition Process Guide</h1>
            <p className="text-sm text-gray-500">
              End-to-end journey from request initiation through contract closeout
            </p>
          </div>
        </div>
        {request && (
          <Link
            to={`/requests/${request.id}`}
            className="flex items-center gap-1.5 text-sm text-eaw-primary hover:underline shrink-0"
          >
            <ArrowLeft size={14} />
            Back to request
          </Link>
        )}
      </div>

      {/* Request context banner */}
      {request && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start sm:items-center gap-3">
          <MapPin size={20} className="text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Viewing journey for: {request.title}
            </p>
            <p className="text-xs text-blue-600">
              Status: {STATUS_LABELS[request.status] || request.status}
              {request.pipeline && <> &middot; Pipeline: {PIPELINE_LABELS[request.pipeline] || request.pipeline}</>}
            </p>
          </div>
        </div>
      )}

      {/* Request-specific roadmap */}
      {request && (
        <RequestRoadmap steps={buildRequestRoadmap(request, approvalSteps)} />
      )}

      {/* Track selector */}
      <h3 className="text-sm font-semibold text-gray-600 mt-2">
        {request ? 'Full Reference Map' : 'Explore the Full Lifecycle'}
      </h3>
      <TrackSelector
        selected={track}
        onChange={setTrack}
        locked={!!request}
      />

      {/* Journey map — horizontal phases */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-stretch gap-3" style={{ minWidth: 'max-content' }}>
          {mainPhases.map((phase, i) => (
            <div key={phase.id} className="flex items-stretch gap-3">
              <PhaseColumn
                phase={phase}
                track={track}
                currentPosition={currentPosition}
                expandedSteps={expandedSteps}
                onToggleStep={toggleStep}
                stepNumberMap={stepNumberMap}
              />
              {i < mainPhases.length - 1 && (
                <div className="flex items-center">
                  <ChevronRight size={22} className="text-gray-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Advisory parallel lane */}
      <AdvisoryLane
        phase={advisoryPhase}
        request={request}
        expandedSteps={expandedSteps}
        onToggleStep={toggleStep}
      />

      {/* Legend */}
      <Legend />

      {/* Pulsing animation keyframes */}
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(51, 122, 183, 0.5); }
          70% { box-shadow: 0 0 0 8px rgba(51, 122, 183, 0); }
          100% { box-shadow: 0 0 0 0 rgba(51, 122, 183, 0); }
        }
      `}</style>
    </div>
  );
}
