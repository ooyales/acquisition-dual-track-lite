import IntakeWizard from '../components/intake/IntakeWizard';

export default function GuidedIntakePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Start New Acquisition</h1>
        <p className="text-sm text-gray-500 mt-1">
          Answer a few questions — we'll derive the acquisition type, approval pipeline, and document checklist automatically.
        </p>
      </div>
      <IntakeWizard />
    </div>
  );
}
