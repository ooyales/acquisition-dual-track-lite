import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CLINEditor from '../components/clins/CLINEditor';

export default function CLINBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const requestId = Number(id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/requests/${id}`)} className="p-1 hover:bg-gray-200 rounded">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">CLIN Builder</h1>
          <p className="text-sm text-gray-500">Request #{requestId} — Define contract line items, PSC codes, and LOA assignments</p>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <CLINEditor requestId={requestId} />
      </div>
    </div>
  );
}
