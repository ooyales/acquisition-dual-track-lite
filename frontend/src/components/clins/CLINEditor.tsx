import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Info } from 'lucide-react';
import { clinsApi } from '../../api/clins';
import { pscApi } from '../../api/psc';
import { loaApi } from '../../api/loa';
import type { AcquisitionCLIN, PSCCode, LineOfAccounting } from '../../types';
import { SEVERABILITY_LABELS } from '../../types';
import StatusBadge from '../common/StatusBadge';

interface Props {
  requestId: number;
}

interface CLINForm {
  clin_number: string;
  description: string;
  clin_type: string;
  psc_code: string;
  loa_id: string;
  clin_ceiling: string;
  contract_type: string;
  severability: string;
}

const INITIAL_FORM: CLINForm = {
  clin_number: '', description: '', clin_type: 'ffp', psc_code: '',
  loa_id: '', clin_ceiling: '', contract_type: 'firm_fixed_price', severability: 'severable',
};

export default function CLINEditor({ requestId }: Props) {
  const [clins, setClins] = useState<AcquisitionCLIN[]>([]);
  const [form, setForm] = useState<CLINForm>(INITIAL_FORM);
  const [editing, setEditing] = useState<number | null>(null);
  const [pscSearch, setPscSearch] = useState('');
  const [pscResults, setPscResults] = useState<PSCCode[]>([]);
  const [loas, setLoas] = useState<LineOfAccounting[]>([]);
  const [showPsc, setShowPsc] = useState(false);

  useEffect(() => {
    clinsApi.forRequest(requestId).then(data => setClins(Array.isArray(data) ? data : data.clins || []));
    loaApi.list().then(data => setLoas(Array.isArray(data) ? data : data.loas || []));
  }, [requestId]);

  useEffect(() => {
    if (pscSearch.length >= 2) {
      pscApi.search(pscSearch).then(data => {
        setPscResults(Array.isArray(data) ? data : data.codes || []);
        setShowPsc(true);
      });
    } else {
      setPscResults([]);
      setShowPsc(false);
    }
  }, [pscSearch]);

  const set = (field: keyof CLINForm, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    const payload = {
      ...form,
      request_id: requestId,
      clin_ceiling: parseFloat(form.clin_ceiling) || 0,
      loa_id: form.loa_id ? parseInt(form.loa_id) : null,
    };
    if (editing) {
      await clinsApi.update(editing, payload);
    } else {
      await clinsApi.create(payload);
    }
    setForm(INITIAL_FORM);
    setEditing(null);
    const data = await clinsApi.forRequest(requestId);
    setClins(Array.isArray(data) ? data : data.clins || []);
  };

  const handleEdit = (clin: AcquisitionCLIN) => {
    setForm({
      clin_number: clin.clin_number || '',
      description: clin.description || '',
      clin_type: clin.clin_type || 'ffp',
      psc_code: clin.psc_code || '',
      loa_id: clin.loa_id ? String(clin.loa_id) : '',
      clin_ceiling: String(clin.clin_ceiling || ''),
      contract_type: clin.contract_type || 'firm_fixed_price',
      severability: clin.severability || 'severable',
    });
    setEditing(clin.id);
  };

  const handleDelete = async (id: number) => {
    await clinsApi.remove(id);
    const data = await clinsApi.forRequest(requestId);
    setClins(Array.isArray(data) ? data : data.clins || []);
  };

  const total = clins.reduce((s, c) => s + (c.clin_ceiling || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">CLIN Builder</h3>
        <span className="text-sm text-gray-500">Total: ${total.toLocaleString()}</span>
      </div>

      {/* Existing CLINs */}
      {clins.length > 0 && (
        <table className="eaw-table">
          <thead>
            <tr>
              <th>CLIN #</th>
              <th>Description</th>
              <th>PSC</th>
              <th>LOA</th>
              <th>Ceiling</th>
              <th>Severability</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clins.map(c => (
              <tr key={c.id}>
                <td className="font-medium">{c.clin_number}</td>
                <td className="text-sm">{c.description}</td>
                <td className="text-sm">{c.psc_code}</td>
                <td className="text-sm">{c.loa_id ? `LOA-${c.loa_id}` : '—'}</td>
                <td className="text-sm">${(c.clin_ceiling || 0).toLocaleString()}</td>
                <td className="text-xs capitalize">{SEVERABILITY_LABELS[c.severability || ''] || c.severability}</td>
                <td><StatusBadge status={c.clin_status || 'healthy'} /></td>
                <td className="flex gap-1">
                  <button onClick={() => handleEdit(c)} className="text-xs text-eaw-primary hover:underline">Edit</button>
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-red-600 hover:underline">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add/Edit Form */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium">{editing ? 'Edit CLIN' : 'Add CLIN'}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">CLIN Number</label>
            <input className="input-field text-sm" value={form.clin_number}
              onChange={e => set('clin_number', e.target.value)} placeholder="0001" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <input className="input-field text-sm" value={form.description}
              onChange={e => set('description', e.target.value)} placeholder="Cloud hosting services" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ceiling ($)</label>
            <input type="number" className="input-field text-sm" value={form.clin_ceiling}
              onChange={e => set('clin_ceiling', e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <label className="block text-xs text-gray-500 mb-1">PSC Code</label>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field text-sm pl-7" value={form.psc_code || pscSearch}
                onChange={e => { setPscSearch(e.target.value); set('psc_code', ''); }}
                onFocus={() => pscSearch.length >= 2 && setShowPsc(true)}
                placeholder="Search PSC..." />
            </div>
            {showPsc && pscResults.length > 0 && (
              <div className="absolute z-10 w-64 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {pscResults.map(p => (
                  <button key={p.code} onClick={() => { set('psc_code', p.code); setShowPsc(false); setPscSearch(''); }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-b border-gray-100">
                    <span className="font-medium">{p.code}</span> — {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">LOA</label>
            <select className="select-field text-sm" value={form.loa_id} onChange={e => set('loa_id', e.target.value)}>
              <option value="">Select LOA</option>
              {loas.map(l => (
                <option key={l.id} value={l.id}>
                  {l.fund_code} — ${(l.available_balance || 0).toLocaleString()} avail
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Contract Type</label>
            <select className="select-field text-sm" value={form.contract_type} onChange={e => set('contract_type', e.target.value)}>
              <option value="firm_fixed_price">Firm Fixed Price</option>
              <option value="time_and_materials">Time & Materials</option>
              <option value="cost_plus_fixed_fee">Cost Plus Fixed Fee</option>
              <option value="labor_hour">Labor Hour</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Severability</label>
            <select className="select-field text-sm" value={form.severability} onChange={e => set('severability', e.target.value)}>
              <option value="severable">Severable</option>
              <option value="non_severable">Non-Severable</option>
            </select>
          </div>
        </div>
        {form.severability && (
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 rounded p-2">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <span>{form.severability === 'severable'
              ? 'Severable services can be divided into components that independently satisfy a need. Funding may cross fiscal years.'
              : 'Non-severable services must be completed in full to meet the requirement. Must be fully funded with same-year funds.'
            }</span>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={handleSave} className="btn-primary flex items-center gap-1 text-sm">
            <Plus size={14} /> {editing ? 'Update CLIN' : 'Add CLIN'}
          </button>
          {editing && (
            <button onClick={() => { setForm(INITIAL_FORM); setEditing(null); }} className="btn-secondary text-sm">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
