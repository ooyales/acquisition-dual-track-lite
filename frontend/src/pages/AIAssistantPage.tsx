import { useState } from 'react';
import { Bot } from 'lucide-react';
import AIChat from '../components/ai/AIChat';

export default function AIAssistantPage() {
  const [mode, setMode] = useState<'mrr' | 'ja'>('mrr');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Bot size={24} className="text-eaw-primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-500">
            Draft acquisition documents with Claude AI
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setMode('mrr')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'mrr'
              ? 'bg-eaw-primary text-white'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}>
          Market Research Report
        </button>
        <button onClick={() => setMode('ja')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'ja'
              ? 'bg-eaw-primary text-white'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}>
          Justification & Approval
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <AIChat key={mode} mode={mode} />
      </div>
    </div>
  );
}
