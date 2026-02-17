import { useEffect, useState } from 'react';
import { DollarSign, Plus, AlertTriangle } from 'lucide-react';
import { loaApi } from '../api/loa';
import type { LineOfAccounting } from '../types';
import StatusBadge from '../components/common/StatusBadge';

export default function LOAPage() {
  const [loas, setLoas] = useState<LineOfAccounting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fund_code: '', appropriation: '', fiscal_year: new Date().getFullYear().toString(),
    total_amount: '', description: '',
  });

  const loadLoas = () => {
    loaApi.list().then(data => {
      setLoas(Array.isArray(data) ? data : data.loas || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadLoas(); }, []);

  const handleCreate = async () => {
    await loaApi.create({
      fund_code: form.fund_code,
      appropriation: form.appropriation,
      display_name: form.description || form.fund_code,
      total_allocation: parseFloat(form.total_amount) || 0,
      fiscal_year: form.fiscal_year,
    });
    setShowForm(false);
    setForm({ fund_code: '', appropriation: '', fiscal_year: new Date().getFullYear().toString(), total_amount: '', description: '' });
    loadLoas();
  };

  const healthColor = (loa: LineOfAccounting) => {
    const avail = loa.available_balance || 0;
    const total = loa.total_amount || 1;
    const pct = avail / total;
    if (pct > 0.3) return 'bg-green-500';
    if (pct > 0.1) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const healthStatus = (loa: LineOfAccounting) => {
    const avail = loa.available_balance || 0;
    const total = loa.total_amount || 1;
    const pct = avail / total;
    if (pct > 0.3) return 'healthy';
    if (pct > 0.1) return 'watch';
    return 'critical';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign size={24} className="text-eaw-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lines of Accounting</h1>
            <p className="text-sm text-gray-500">{loas.length} LOAs</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add LOA
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h3 className="font-medium">New Line of Accounting</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input className="input-field text-sm" placeholder="Fund Code" value={form.fund_code}
              onChange={e => setForm(f => ({ ...f, fund_code: e.target.value }))} />
            <input className="input-field text-sm" placeholder="Appropriation" value={form.appropriation}
              onChange={e => setForm(f => ({ ...f, appropriation: e.target.value }))} />
            <input type="number" className="input-field text-sm" placeholder="Fiscal Year" value={form.fiscal_year}
              onChange={e => setForm(f => ({ ...f, fiscal_year: e.target.value }))} />
            <input type="number" className="input-field text-sm" placeholder="Total Amount" value={form.total_amount}
              onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} />
            <input className="input-field text-sm" placeholder="Description" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn-primary text-sm">Create LOA</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : loas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No lines of accounting defined.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loas.map(loa => {
            const avail = loa.available_balance || 0;
            const total = loa.total_amount || 0;
            const used = total - avail;
            const pct = total > 0 ? (used / total) * 100 : 0;

            return (
              <div key={loa.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium">{loa.fund_code}</span>
                    <span className="text-sm text-gray-500 ml-2">FY{loa.fiscal_year}</span>
                  </div>
                  <StatusBadge status={healthStatus(loa)} />
                </div>
                {loa.description && <p className="text-sm text-gray-500 mb-3">{loa.description}</p>}

                {/* Balance bar */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Used: ${used.toLocaleString()}</span>
                    <span>Available: ${avail.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className={`h-3 rounded-full transition-all ${healthColor(loa)}`}
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="text-xs text-gray-400 text-right">Total: ${total.toLocaleString()}</div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Projected</span>
                    <p className="font-medium">${(loa.projected_amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Committed</span>
                    <p className="font-medium">${(loa.committed_amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Obligated</span>
                    <p className="font-medium">${(loa.obligated_amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Available</span>
                    <p className="font-medium text-green-600">${avail.toLocaleString()}</p>
                  </div>
                </div>

                {avail < 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle size={12} /> Over-allocated by ${Math.abs(avail).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
