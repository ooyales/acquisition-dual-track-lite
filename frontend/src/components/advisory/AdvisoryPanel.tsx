import { useState, useRef } from 'react';
import { Shield, AlertTriangle, Check, Clock, MessageSquare, Send, Paperclip, Download } from 'lucide-react';
import type { AdvisoryInput } from '../../types';
import { ADVISORY_LABELS } from '../../types';
import { advisoryApi } from '../../api/advisory';

interface Props {
  advisories: AdvisoryInput[];
  onRefresh?: () => void;
}

const TEAM_COLORS: Record<string, string> = {
  scrm: 'border-purple-300 bg-purple-50',
  sbo: 'border-orange-300 bg-orange-50',
  cio: 'border-blue-300 bg-blue-50',
  section508: 'border-green-300 bg-green-50',
  fm: 'border-yellow-300 bg-yellow-50',
};

export default function AdvisoryPanel({ advisories, onRefresh }: Props) {
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [responseText, setResponseText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!advisories || advisories.length === 0) {
    return <p className="text-sm text-gray-500">No advisory inputs required.</p>;
  }

  const statusIcon = (status: string) => {
    if (status === 'complete_no_issues' || status === 'complete_issues_found') return <Check size={14} className="text-green-600" />;
    if (status === 'info_requested') return <MessageSquare size={14} className="text-amber-600" />;
    if (status === 'in_review' || status === 'requested') return <Clock size={14} className="text-yellow-600" />;
    return <Shield size={14} className="text-gray-400" />;
  };

  const handleRespond = async (advisoryId: number) => {
    if (!responseText.trim() && !selectedFile) return;
    setSubmitting(true);
    try {
      await advisoryApi.respond(advisoryId, responseText, selectedFile || undefined);
      setRespondingId(null);
      setResponseText('');
      setSelectedFile(null);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to respond:', err);
    }
    setSubmitting(false);
  };

  const handleDownload = async (advisoryId: number) => {
    try {
      await advisoryApi.downloadAttachment(advisoryId);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <Shield size={16} /> Advisory Inputs
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {advisories.map(adv => (
          <div key={adv.id} className={`rounded-lg border p-3 ${TEAM_COLORS[adv.team] || 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{ADVISORY_LABELS[adv.team] || adv.team}</span>
              <div className="flex items-center gap-1">
                {statusIcon(adv.status)}
                <span className="text-xs capitalize">{adv.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
            {adv.findings && (
              <p className="text-xs text-gray-600 line-clamp-2">{adv.findings}</p>
            )}
            {adv.impacts_strategy && (
              <div className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertTriangle size={10} /> Impacts strategy
              </div>
            )}
            {adv.blocks_gate && (
              <div className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertTriangle size={10} /> Blocks gate progression
              </div>
            )}

            {/* Info Request banner — requestor can respond with text + file */}
            {adv.status === 'info_requested' && adv.info_request_message && (
              <div className="mt-2 bg-amber-100 border border-amber-300 rounded p-2">
                <div className="flex items-center gap-1 text-amber-800 text-xs font-semibold mb-1">
                  <MessageSquare size={12} /> Information Requested
                </div>
                <p className="text-xs text-amber-900">{adv.info_request_message}</p>

                {respondingId === adv.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      className="w-full text-xs border border-amber-300 rounded p-2 bg-white"
                      rows={3}
                      value={responseText}
                      onChange={e => setResponseText(e.target.value)}
                      placeholder="Provide the requested information..."
                    />
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.zip"
                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary text-xs flex items-center gap-1 px-2 py-1"
                        type="button"
                      >
                        <Paperclip size={12} />
                        {selectedFile ? selectedFile.name : 'Attach File'}
                      </button>
                      {selectedFile && (
                        <button
                          onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(adv.id)}
                        disabled={submitting || (!responseText.trim() && !selectedFile)}
                        className="btn-primary text-xs flex items-center gap-1 px-2 py-1"
                        style={submitting || (!responseText.trim() && !selectedFile) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                      >
                        <Send size={12} /> Send Response
                      </button>
                      <button
                        onClick={() => { setRespondingId(null); setResponseText(''); setSelectedFile(null); }}
                        className="btn-secondary text-xs px-2 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setRespondingId(adv.id)}
                    className="mt-2 btn-primary text-xs flex items-center gap-1 px-2 py-1"
                  >
                    <Send size={12} /> Respond
                  </button>
                )}
              </div>
            )}

            {/* Show previous info exchange if it was resolved */}
            {adv.info_response && adv.status !== 'info_requested' && (
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                <p className="text-xs text-blue-600 mb-0.5">Asked: {adv.info_request_message}</p>
                <p className="text-xs text-blue-800">Response: {adv.info_response}</p>
                {adv.info_response_filename && (
                  <button
                    onClick={() => handleDownload(adv.id)}
                    className="mt-1 text-xs text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <Download size={10} /> {adv.info_response_filename}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
