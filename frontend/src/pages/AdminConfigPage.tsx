import { useEffect, useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { adminApi } from '../api/admin';

type Tab = 'thresholds' | 'templates' | 'rules' | 'users';

interface Threshold {
  id: number;
  name: string;
  dollar_limit: number;
  far_reference: string;
}

interface Template {
  id: number;
  pipeline_type: string;
  steps: Array<{ step_number: number; gate_name: string; approver_role: string; sla_days: number }>;
}

interface Rule {
  id: number;
  template_name: string;
  conditions: string;
  applicability: string;
}

interface UserItem {
  id: number;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
}

export default function AdminConfigPage() {
  const [tab, setTab] = useState<Tab>('thresholds');
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingThreshold, setEditingThreshold] = useState<number | null>(null);
  const [thresholdValue, setThresholdValue] = useState('');

  useEffect(() => {
    setLoading(true);
    if (tab === 'thresholds') {
      adminApi.getThresholds().then(data => {
        setThresholds(Array.isArray(data) ? data : data.thresholds || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (tab === 'templates') {
      adminApi.getTemplates().then(data => {
        setTemplates(Array.isArray(data) ? data : data.templates || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (tab === 'rules') {
      adminApi.getRules().then(data => {
        setRules(Array.isArray(data) ? data : data.rules || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      adminApi.getUsers().then(data => {
        setUsers(Array.isArray(data) ? data : data.users || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [tab]);

  const handleSaveThreshold = async (id: number) => {
    await adminApi.updateThreshold(id, { dollar_limit: parseFloat(thresholdValue) });
    setEditingThreshold(null);
    adminApi.getThresholds().then(data => setThresholds(Array.isArray(data) ? data : data.thresholds || []));
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'thresholds', label: 'FAR Thresholds' },
    { key: 'templates', label: 'Approval Templates' },
    { key: 'rules', label: 'Document Rules' },
    { key: 'users', label: 'Users' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Settings size={24} className="text-eaw-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Configuration</h1>
          <p className="text-sm text-gray-500">Manage thresholds, templates, rules, and users</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors ${
              tab === t.key
                ? 'border-eaw-primary text-eaw-primary font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t.label}</button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
            {tab === 'thresholds' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">Configure FAR acquisition dollar thresholds</p>
                <table className="eaw-table">
                  <thead>
                    <tr><th>Tier</th><th>Dollar Limit</th><th>FAR Reference</th><th></th></tr>
                  </thead>
                  <tbody>
                    {thresholds.map(t => (
                      <tr key={t.id}>
                        <td className="font-medium capitalize">{t.name.replace(/_/g, ' ')}</td>
                        <td>
                          {editingThreshold === t.id ? (
                            <input type="number" className="input-field text-sm w-40" value={thresholdValue}
                              onChange={e => setThresholdValue(e.target.value)} />
                          ) : (
                            `$${t.dollar_limit.toLocaleString()}`
                          )}
                        </td>
                        <td className="text-sm text-gray-500">{t.far_reference}</td>
                        <td>
                          {editingThreshold === t.id ? (
                            <button onClick={() => handleSaveThreshold(t.id)}
                              className="text-xs text-green-600 hover:underline flex items-center gap-1">
                              <Save size={12} /> Save
                            </button>
                          ) : (
                            <button onClick={() => { setEditingThreshold(t.id); setThresholdValue(String(t.dollar_limit)); }}
                              className="text-xs text-eaw-primary hover:underline">Edit</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'templates' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Approval pipeline templates and their gates</p>
                {templates.map(t => (
                  <div key={t.id} className="border border-gray-200 rounded-lg p-3">
                    <h3 className="font-medium capitalize mb-2">{t.pipeline_type.replace(/_/g, ' ')} Pipeline</h3>
                    <div className="flex flex-wrap gap-2">
                      {(t.steps || []).sort((a, b) => a.step_number - b.step_number).map(s => (
                        <div key={s.step_number}
                          className="bg-gray-100 rounded px-3 py-1.5 text-xs flex items-center gap-2">
                          <span className="bg-eaw-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                            {s.step_number}
                          </span>
                          <span className="font-medium">{s.gate_name}</span>
                          <span className="text-gray-400">({s.approver_role}, {s.sla_days}d)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'rules' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Document checklist conditional rules ({rules.length} rules)</p>
                <div className="max-h-96 overflow-y-auto">
                  <table className="eaw-table text-xs">
                    <thead>
                      <tr><th>Document</th><th>Conditions</th><th>Applicability</th></tr>
                    </thead>
                    <tbody>
                      {rules.map(r => (
                        <tr key={r.id}>
                          <td className="font-medium">{r.template_name}</td>
                          <td className="font-mono text-gray-600 max-w-xs truncate">{r.conditions}</td>
                          <td className="text-gray-500">{r.applicability}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">System users and roles</p>
                <table className="eaw-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="font-medium">{u.display_name}</td>
                        <td className="text-sm text-gray-500">{u.email}</td>
                        <td className="text-sm capitalize">{u.role.replace(/_/g, ' ')}</td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
