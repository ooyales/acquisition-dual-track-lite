import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import { intakeApi } from '../../api/intake';
import { requestsApi } from '../../api/requests';
import { ACQUISITION_TYPE_LABELS, TIER_LABELS, PIPELINE_LABELS } from '../../types';
import type { DerivationResult, IntakeOptions } from '../../types';

const STEPS = ['Need Type', 'Category & Value', 'Competition', 'Existing Contract', 'Review & Submit'];

interface Answers {
  title: string;
  description: string;
  need_type: string;
  need_sub_type: string;
  buy_category: string;
  predominant_element: string;
  estimated_value: string;
  vendor_known: string;
  existing_vehicle: string;
  existing_contract_number: string;
  existing_contract_end: string;
  existing_contractor_name: string;
  justification_summary: string;
}

const INITIAL: Answers = {
  title: '', description: '', need_type: '', need_sub_type: '',
  buy_category: '', predominant_element: '', estimated_value: '',
  vendor_known: '', existing_vehicle: '',
  existing_contract_number: '', existing_contract_end: '',
  existing_contractor_name: '', justification_summary: '',
};

// Fallback options when API is unavailable
const DEFAULT_Q1 = [
  { value: 'new', label: 'New Requirement', description: 'Brand new product, service, or software' },
  { value: 'continue_extend', label: 'Continue / Renew / Extend', description: 'Exercise option, renew, follow-on, recompete, CLIN execution' },
  { value: 'change_existing', label: 'Modify Existing Contract', description: 'Add/remove scope, admin changes, CLIN reallocation' },
];

const DEFAULT_Q2: Record<string, { value: string; label: string; description?: string }[]> = {
  new: [
    { value: 'no_specific_vendor', label: 'No Specific Vendor', description: 'Open competition for best value' },
    { value: 'specific_vendor', label: 'Specific Vendor Required', description: 'Sole source or brand name justification needed' },
  ],
  continue_extend: [
    { value: 'options_remaining', label: 'Renew / Exercise Option', description: 'Exercise an option year on the existing contract' },
    { value: 'expiring_same_vendor', label: 'New Contract, Same Vendor', description: 'Sole source justification required' },
    { value: 'expiring_compete', label: 'Recompete with New Vendors', description: 'Open the requirement to competition' },
    { value: 'need_bridge', label: 'Bridge / Emergency Extension', description: 'Temporary coverage while re-competing' },
    { value: 'expired_gap', label: 'Contract Expired (Gap)', description: 'Urgent — service gap exists' },
    { value: 'odc_clin', label: 'ODC CLIN Execution', description: 'Execute an ODC CLIN on existing contract' },
    { value: 'travel_clin', label: 'Travel CLIN Execution', description: 'Execute a travel CLIN on existing contract' },
    { value: 'odc_clin_insufficient', label: 'ODC CLIN — Insufficient Funds', description: 'Need additional funding for ODC CLIN' },
  ],
  change_existing: [
    { value: 'add_scope', label: 'Add Scope / New Work', description: 'Add requirements to existing contract' },
    { value: 'admin_correction', label: 'Admin Change', description: 'Correct administrative items (name, address, etc.)' },
    { value: 'clin_reallocation', label: 'CLIN Reallocation', description: 'Move funding between CLINs' },
  ],
};

const DEFAULT_BUY_CATEGORIES = [
  { value: 'product', label: 'Product', description: 'Hardware, equipment' },
  { value: 'service', label: 'Service', description: 'Professional services' },
  { value: 'software_license', label: 'Software', description: 'Licenses, SaaS, subscriptions' },
  { value: 'mixed', label: 'Mixed', description: 'Multiple categories' },
];

export default function IntakeWizard() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(INITIAL);
  const [derived, setDerived] = useState<DerivationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState<IntakeOptions | null>(null);
  const navigate = useNavigate();
  const deriveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load options from API on mount
  useEffect(() => {
    intakeApi.getOptions().then(setOptions).catch(() => {
      // Fallback to defaults if API fails
    });
  }, []);

  const set = (field: keyof Answers, value: string) =>
    setAnswers(prev => ({ ...prev, [field]: value }));

  // Debounced server-side derivation
  const deriveFromServer = useCallback((a: Answers) => {
    if (deriveTimer.current) clearTimeout(deriveTimer.current);
    deriveTimer.current = setTimeout(async () => {
      if (!a.need_type) return;
      try {
        const result = await intakeApi.derive({
          intake_q1_need_type: a.need_type,
          intake_q2_situation: a.need_sub_type,
          intake_q3_specific_vendor: a.vendor_known,
          intake_q5_change_type: a.need_type === 'change_existing' ? a.need_sub_type : undefined,
          intake_q_buy_category: a.buy_category,
          intake_q_mixed_predominant: a.predominant_element === 'product' ? 'predominantly_product' : a.predominant_element === 'service' ? 'predominantly_service' : undefined,
          estimated_value: a.estimated_value ? parseFloat(a.estimated_value) : 0,
        });
        setDerived(result);
      } catch {
        // silently ignore derivation errors
      }
    }, 400);
  }, []);

  // Re-derive whenever answers change
  useEffect(() => {
    deriveFromServer(answers);
  }, [answers.need_type, answers.need_sub_type, answers.buy_category,
      answers.predominant_element, answers.estimated_value, answers.vendor_known,
      answers.existing_vehicle, deriveFromServer]);

  // Get options with fallbacks
  const q1Options = options?.q1_options || DEFAULT_Q1;
  const q2Options = options?.q2_options || DEFAULT_Q2;
  const buyCategories = options?.buy_category_options || DEFAULT_BUY_CATEGORIES;

  const canNext = (): boolean => {
    switch (step) {
      case 0: return !!answers.title && !!answers.need_type;
      case 1: return !!answers.buy_category && !!answers.estimated_value;
      case 2: return !!answers.vendor_known;
      case 3:
        if (answers.need_type === 'continue_extend' || answers.need_type === 'change_existing') {
          return !!answers.existing_contract_number;
        }
        if (answers.need_type === 'bpa_task_order') {
          return !!answers.existing_vehicle;
        }
        return true;
      case 4: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...answers,
        estimated_value: parseFloat(answers.estimated_value) || 0,
      };
      const req = await requestsApi.create(payload);
      await intakeApi.complete(req.id);
      navigate(`/requests/${req.id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; msg?: string }; status?: number }; message?: string };
      const msg = axiosErr?.response?.data?.error
        || axiosErr?.response?.data?.msg
        || axiosErr?.message
        || 'Failed to submit acquisition request';
      console.error('Submit error:', axiosErr?.response?.status, axiosErr?.response?.data || axiosErr?.message);
      setError(`${msg}${axiosErr?.response?.status ? ` (${axiosErr.response.status})` : ''}`);
      setSubmitting(false);
    }
  };

  // Auto-set vendor_known for paths where vendor is already determined
  useEffect(() => {
    const sub = answers.need_sub_type;
    if (answers.need_type === 'continue_extend') {
      if (['options_remaining', 'expiring_same_vendor', 'need_bridge', 'odc_clin', 'travel_clin', 'odc_clin_insufficient'].includes(sub)) {
        set('vendor_known', 'yes_sole');
      } else if (sub === 'expiring_compete' || sub === 'expired_gap') {
        set('vendor_known', 'no');
      }
    } else if (answers.need_type === 'change_existing') {
      set('vendor_known', 'yes_sole');
    }
  }, [answers.need_type, answers.need_sub_type]);

  // Step-specific skip logic
  const skipStep = (s: number): boolean => {
    if (s === 3 && answers.need_type === 'new') return true;
    if (s === 2) {
      const sub = answers.need_sub_type;
      if (answers.need_type === 'continue_extend' && ['options_remaining', 'expiring_same_vendor', 'need_bridge', 'odc_clin', 'travel_clin', 'odc_clin_insufficient'].includes(sub)) return true;
      if (answers.need_type === 'change_existing') return true;
    }
    return false;
  };

  const nextStep = () => {
    let next = step + 1;
    while (next < STEPS.length && skipStep(next)) next++;
    setStep(next);
  };

  const prevStep = () => {
    let prev = step - 1;
    while (prev >= 0 && skipStep(prev)) prev--;
    setStep(prev);
  };

  const displayType = derived?.derived_acquisition_type || '';
  const displayTier = derived?.derived_tier || '';
  const displayPipeline = derived?.derived_pipeline || '';
  const displayCharacter = derived?.derived_contract_character || '';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => {
          if (skipStep(i)) return null;
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && !skipStep(i - 1) && <div className="w-8 h-px bg-gray-300" />}
              <div className={`flex items-center gap-1.5 text-xs font-medium ${
                active ? 'text-eaw-primary' : done ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  active ? 'bg-eaw-primary text-white' : done ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                }`}>
                  {done ? <Check size={12} /> : i + 1}
                </div>
                <span className="hidden sm:inline">{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Derivation Preview */}
      {derived && displayType && displayType !== 'unknown' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
          <span className="font-medium text-blue-800">Auto-Classification: </span>
          <span className="text-blue-700">
            {ACQUISITION_TYPE_LABELS[displayType] || displayType}
            {' · '}
            {TIER_LABELS[displayTier] || displayTier}
            {' · '}
            {PIPELINE_LABELS[displayPipeline] || displayPipeline} pipeline
          </span>
          {derived.urgency_flag && (
            <span className="ml-2 text-red-600 font-medium">⚠ Urgent</span>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-eaw p-6">
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Step 0: Need Type */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">What do you need?</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Title</label>
              <input className="input-field" value={answers.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g., Cloud Infrastructure Modernization" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input-field" rows={3} value={answers.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Brief description of the requirement..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type of Need</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q1Options.map(opt => (
                  <button key={opt.value} onClick={() => { set('need_type', opt.value); set('need_sub_type', ''); }}
                    className={`text-left p-3 rounded-lg border-2 transition-colors ${
                      answers.need_type === opt.value
                        ? 'border-eaw-primary bg-eaw-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="font-medium text-sm">{opt.label}</div>
                    {opt.description && <div className="text-xs text-gray-500 mt-1">{opt.description}</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Q2 sub-options for continue_extend */}
            {answers.need_type === 'continue_extend' && (q2Options['continue_extend'] || []).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How do you want to continue?</label>
                <div className="grid grid-cols-1 gap-2">
                  {(q2Options['continue_extend'] || []).map(opt => (
                    <button key={opt.value} onClick={() => set('need_sub_type', opt.value)}
                      className={`text-left p-3 rounded-lg border-2 text-sm transition-colors ${
                        answers.need_sub_type === opt.value
                          ? 'border-eaw-primary bg-eaw-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="font-medium">{opt.label}</div>
                      {opt.description && <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Q2 sub-options for new */}
            {answers.need_type === 'new' && (q2Options['new'] || []).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vendor situation?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(q2Options['new'] || []).map(opt => (
                    <button key={opt.value} onClick={() => set('need_sub_type', opt.value)}
                      className={`text-left p-3 rounded-lg border-2 text-sm transition-colors ${
                        answers.need_sub_type === opt.value
                          ? 'border-eaw-primary bg-eaw-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="font-medium">{opt.label}</div>
                      {opt.description && <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Q2/Q5 sub-options for change_existing */}
            {answers.need_type === 'change_existing' && (q2Options['change_existing'] || []).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What kind of change?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(q2Options['change_existing'] || []).map(opt => (
                    <button key={opt.value} onClick={() => set('need_sub_type', opt.value)}
                      className={`text-left p-2.5 rounded border-2 text-sm ${
                        answers.need_sub_type === opt.value
                          ? 'border-eaw-primary bg-eaw-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="font-medium">{opt.label}</div>
                      {opt.description && <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Category & Value */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Category & Estimated Value</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">What are you buying?</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {buyCategories.map(opt => (
                  <button key={opt.value} onClick={() => set('buy_category', opt.value)}
                    className={`text-left p-3 rounded-lg border-2 transition-colors ${
                      answers.buy_category === opt.value
                        ? 'border-eaw-primary bg-eaw-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="font-medium text-sm">{opt.label}</div>
                    {opt.description && <div className="text-xs text-gray-500 mt-1">{opt.description}</div>}
                  </button>
                ))}
              </div>
            </div>
            {answers.buy_category === 'mixed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Predominant element?</label>
                <div className="flex gap-3">
                  {['product', 'service'].map(v => (
                    <button key={v} onClick={() => set('predominant_element', v)}
                      className={`px-4 py-2 rounded border text-sm capitalize ${
                        answers.predominant_element === v
                          ? 'border-eaw-primary bg-eaw-primary/5 font-medium'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>{v}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Total Value ($)</label>
              <div className="flex items-center">
                <span className="bg-gray-100 border border-r-0 border-gray-300 rounded-l px-3 py-2 text-gray-500 text-sm">$</span>
                <input type="number" className="input-field rounded-l-none flex-1"
                  value={answers.estimated_value}
                  onChange={e => set('estimated_value', e.target.value)}
                  placeholder="0.00" min="0" step="1000" />
              </div>
              {derived && displayTier && (
                <p className="text-xs text-gray-500 mt-1">
                  Threshold tier: <span className="font-medium">{TIER_LABELS[displayTier] || displayTier}</span>
                  {displayTier === 'micro' && ' — Simplified procedures apply'}
                  {displayTier === 'sat' && ' — Below Simplified Acquisition Threshold'}
                  {displayTier === 'above_sat' && ' — Full competition required'}
                  {displayTier === 'major' && ' — Senior review required'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Competition */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Competition & Vendor</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Do you have a specific vendor in mind?</label>
              <div className="space-y-2">
                {[
                  { value: 'no', label: 'No — Open competition', description: 'Best value through full and open competition' },
                  { value: 'yes_limited', label: 'Yes — Limited sources', description: 'Small number of known capable vendors' },
                  { value: 'yes_sole', label: 'Yes — Sole source', description: 'Only one vendor can meet the requirement (J&A needed)' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => set('vendor_known', opt.value)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                      answers.vendor_known === opt.value
                        ? 'border-eaw-primary bg-eaw-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>
            {answers.vendor_known === 'yes_sole' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sole Source Justification Summary</label>
                <textarea className="input-field" rows={3} value={answers.justification_summary}
                  onChange={e => set('justification_summary', e.target.value)}
                  placeholder="Briefly explain why this vendor is the only source..." />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Existing Contract / Vehicle */}
        {step === 3 && (
          <div className="space-y-4">
            {(answers.need_type === 'continue_extend' || answers.need_type === 'change_existing') ? (
              <>
                <h2 className="text-lg font-semibold">Existing Contract Details</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Number</label>
                  <input className="input-field" value={answers.existing_contract_number}
                    onChange={e => set('existing_contract_number', e.target.value)}
                    placeholder="e.g., GS-35F-0001X" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contractor Name</label>
                  <input className="input-field" value={answers.existing_contractor_name}
                    onChange={e => set('existing_contractor_name', e.target.value)}
                    placeholder="e.g., Acme Federal Solutions" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract End Date</label>
                  <input type="date" className="input-field" value={answers.existing_contract_end}
                    onChange={e => set('existing_contract_end', e.target.value)} />
                </div>
              </>
            ) : answers.need_type === 'bpa_task_order' ? (
              <>
                <h2 className="text-lg font-semibold">Existing Vehicle</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Which vehicle?</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'gsa_schedule', label: 'GSA Schedule' },
                      { value: 'gwac', label: 'GWAC (e.g., CIO-SP3, VETS2)' },
                      { value: 'agency_bpa', label: 'Agency BPA' },
                      { value: 'agency_idiq', label: 'Agency IDIQ' },
                    ].map(opt => (
                      <button key={opt.value} onClick={() => set('existing_vehicle', opt.value)}
                        className={`p-3 rounded-lg border-2 text-left text-sm transition-colors ${
                          answers.existing_vehicle === opt.value
                            ? 'border-eaw-primary bg-eaw-primary/5 font-medium'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>{opt.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle/Contract Number</label>
                  <input className="input-field" value={answers.existing_contract_number}
                    onChange={e => set('existing_contract_number', e.target.value)}
                    placeholder="e.g., GS-35F-0001X" />
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review & Submit</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Title</span>
                <p className="font-medium">{answers.title}</p>
              </div>
              <div>
                <span className="text-gray-500">Need Type</span>
                <p className="font-medium capitalize">{answers.need_type.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <span className="text-gray-500">Category</span>
                <p className="font-medium capitalize">{answers.buy_category.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <span className="text-gray-500">Estimated Value</span>
                <p className="font-medium">${parseFloat(answers.estimated_value || '0').toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">Vendor Approach</span>
                <p className="font-medium capitalize">{answers.vendor_known.replace(/_/g, ' ')}</p>
              </div>
              {answers.existing_contract_number && (
                <div>
                  <span className="text-gray-500">Contract #</span>
                  <p className="font-medium">{answers.existing_contract_number}</p>
                </div>
              )}
            </div>
            {derived && displayType && (
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <h3 className="font-medium text-sm mb-2">Derived Classification</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Type</span>
                    <p className="font-medium">{ACQUISITION_TYPE_LABELS[displayType] || displayType}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tier</span>
                    <p className="font-medium">{TIER_LABELS[displayTier] || displayTier}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Pipeline</span>
                    <p className="font-medium">{PIPELINE_LABELS[displayPipeline] || displayPipeline}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Character</span>
                    <p className="font-medium capitalize">{displayCharacter.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                {derived.advisory_triggers && (
                  <div className="mt-2 text-xs text-gray-500">
                    Advisory reviews: <span className="font-medium">{derived.advisory_triggers}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <button onClick={prevStep} disabled={step === 0}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">
            <ChevronLeft size={16} /> Back
          </button>
          {step === 4 ? (
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex items-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {submitting ? 'Submitting...' : 'Submit Acquisition'}
            </button>
          ) : (
            <button onClick={nextStep} disabled={!canNext()} className="btn-primary flex items-center gap-1">
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
