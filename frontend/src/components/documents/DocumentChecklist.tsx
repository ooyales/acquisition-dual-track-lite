import { useState, useRef } from 'react';
import { FileText, Check, Clock, AlertTriangle, Bot, Loader2, Upload, Download, X } from 'lucide-react';
import type { PackageDocument } from '../../types';
import { aiApi } from '../../api/ai';
import { documentsApi } from '../../api/documents';
import { useAuthStore } from '../../store/authStore';

interface Props {
  documents: PackageDocument[];
  requestId: number;
  onRefresh: () => void;
}

const TOGGLE_ROLES = ['admin', 'budget', 'ko', 'branch_chief', 'cto', 'cio'];

export default function DocumentChecklist({ documents, requestId, onRefresh }: Props) {
  const { user } = useAuthStore();
  const [drafting, setDrafting] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<number | null>(null);

  const canToggle = user && TOGGLE_ROLES.includes(user.role);

  const grouped = documents.reduce<Record<string, PackageDocument[]>>((acc, doc) => {
    const gate = doc.template?.required_before_gate || 'Other';
    if (!acc[gate]) acc[gate] = [];
    acc[gate].push(doc);
    return acc;
  }, {});

  const gateOrder = ['iss', 'asr', 'finance', 'finance_review', 'ko_review', 'legal', 'cio_approval', 'senior_review', 'award', 'Other'];
  const sortedGates = [...gateOrder.filter(g => grouped[g]), ...Object.keys(grouped).filter(g => !gateOrder.includes(g))];
  const gateLabel = (g: string) => {
    const labels: Record<string, string> = { iss: 'ISS Review', asr: 'ASR Review', finance: 'Finance', finance_review: 'Finance Review', ko_review: 'KO Review', legal: 'Legal', cio_approval: 'CIO Approval', senior_review: 'Senior Review', award: 'Award', Other: 'Other' };
    return labels[g] || g.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const required = documents.filter(d => d.is_required);
  const completed = required.filter(d => ['completed', 'approved', 'uploaded', 'drafted'].includes(d.status));
  const previously = documents.filter(d => !d.is_required && d.was_required);

  const handleDraft = async (doc: PackageDocument) => {
    setDrafting(doc.id);
    try {
      const result = await aiApi.draft({ document_id: doc.id, request_id: requestId });
      if (result.content) {
        await documentsApi.update(doc.id, { content: result.content, status: 'drafted' });
        onRefresh();
      }
    } catch {
      // AI not available
    } finally {
      setDrafting(null);
    }
  };

  const handleReview = async (doc: PackageDocument) => {
    setReviewing(doc.id);
    try {
      await aiApi.review({ document_id: doc.id, request_id: requestId });
      onRefresh();
    } catch {
      // AI not available
    } finally {
      setReviewing(null);
    }
  };

  const handleToggle = async (doc: PackageDocument) => {
    setToggling(doc.id);
    try {
      await documentsApi.toggleRequired(doc.id, !doc.is_required);
      onRefresh();
    } catch (err) {
      console.error('Toggle failed:', err);
    }
    setToggling(null);
  };

  const triggerUpload = (docId: number) => {
    setUploadTargetId(docId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;
    setUploading(uploadTargetId);
    try {
      await documentsApi.upload(uploadTargetId, file);
      onRefresh();
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(null);
    setUploadTargetId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (docId: number) => {
    try {
      await documentsApi.download(docId);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'completed' || status === 'approved') return <Check size={14} className="text-green-600" />;
    if (status === 'uploaded') return <Check size={14} className="text-blue-600" />;
    if (status === 'drafted' || status === 'in_review') return <Clock size={14} className="text-blue-600" />;
    if (status === 'not_required') return <X size={14} className="text-gray-300" />;
    if (status === 'not_started') return <AlertTriangle size={14} className="text-gray-400" />;
    return <Clock size={14} className="text-yellow-600" />;
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.zip,.pptx"
        onChange={handleFileSelected}
      />

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Document Checklist</h3>
        <span className="text-sm text-gray-500">{completed.length}/{required.length} complete</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-eaw-primary h-2 rounded-full transition-all"
          style={{ width: `${required.length ? (completed.length / required.length) * 100 : 0}%` }} />
      </div>

      {canToggle && (
        <p className="text-xs text-gray-400">Toggle documents on/off to mark as required or not required for this acquisition.</p>
      )}

      {sortedGates.map(gate => (
        <div key={gate}>
          <h4 className="text-sm font-medium text-gray-500 mb-2">{gateLabel(gate)}</h4>
          <div className="space-y-1">
            {grouped[gate].filter(d => d.is_required).map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                {statusIcon(doc.status)}
                <FileText size={14} className="text-gray-400" />
                <span className="text-sm flex-1">{doc.template?.name || `Document #${doc.id}`}</span>

                {/* Uploaded file download */}
                {doc.uploaded_filename && (
                  <button onClick={() => handleDownload(doc.id)}
                    className="text-xs text-eaw-primary hover:underline flex items-center gap-1">
                    <Download size={12} /> {doc.uploaded_filename}
                  </button>
                )}

                {/* Upload button for not_started docs */}
                {doc.status === 'not_started' && !doc.uploaded_filename && (
                  <button onClick={() => triggerUpload(doc.id)}
                    disabled={uploading === doc.id}
                    className="text-xs text-eaw-primary hover:underline flex items-center gap-1">
                    {uploading === doc.id ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    Upload
                  </button>
                )}

                {/* AI Draft button */}
                {doc.template?.ai_assistable && doc.status === 'not_started' && (
                  <button onClick={() => handleDraft(doc)} disabled={drafting === doc.id}
                    className="text-xs text-eaw-primary hover:underline flex items-center gap-1">
                    {drafting === doc.id ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
                    Draft with AI
                  </button>
                )}

                {/* AI Review button */}
                {doc.template?.ai_assistable && doc.status === 'drafted' && (
                  <button onClick={() => handleReview(doc)} disabled={reviewing === doc.id}
                    className="text-xs text-yellow-600 hover:underline flex items-center gap-1">
                    {reviewing === doc.id ? <Loader2 size={12} className="animate-spin" /> : <Bot size={12} />}
                    AI Review
                  </button>
                )}

                {/* Status label */}
                {!doc.uploaded_filename && doc.status !== 'not_started' && (
                  <span className="text-xs text-gray-400 capitalize">{doc.status.replace(/_/g, ' ')}</span>
                )}

                {/* Toggle switch */}
                {canToggle && (
                  <button
                    onClick={() => handleToggle(doc)}
                    disabled={toggling === doc.id}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                      doc.is_required ? 'bg-eaw-primary' : 'bg-gray-300'
                    }`}
                    title={doc.is_required ? 'Mark as not required' : 'Mark as required'}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${
                      doc.is_required ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    }`} />
                  </button>
                )}
              </div>
            ))}

            {/* Not-required documents (toggled off) */}
            {canToggle && grouped[gate].filter(d => !d.is_required).map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 opacity-50">
                <X size={14} className="text-gray-300" />
                <FileText size={14} className="text-gray-300" />
                <span className="text-sm flex-1 line-through text-gray-400">{doc.template?.name || `Document #${doc.id}`}</span>
                <span className="text-xs text-gray-400">Not required</span>
                <button
                  onClick={() => handleToggle(doc)}
                  disabled={toggling === doc.id}
                  className="relative inline-flex h-5 w-9 items-center rounded-full bg-gray-300 transition-colors shrink-0"
                  title="Mark as required"
                >
                  <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white translate-x-[3px] shadow" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Previously required (for non-toggle users) */}
      {!canToggle && previously.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Previously Required</h4>
          <div className="space-y-1 opacity-60">
            {previously.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-2">
                <FileText size={14} className="text-gray-300" />
                <span className="text-sm line-through">{doc.template?.name || `Document #${doc.id}`}</span>
                <span className="text-xs text-gray-400">{doc.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
