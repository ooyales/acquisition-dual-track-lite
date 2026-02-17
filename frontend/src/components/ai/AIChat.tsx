import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle } from 'lucide-react';
import { aiApi } from '../../api/ai';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

interface Props {
  mode: 'mrr' | 'ja';
  requestId?: number;
}

const MRR_SCENARIOS: Scenario[] = [
  { id: 'mrr1', title: 'Cloud Migration MRR', description: 'On-prem to cloud infrastructure', prompt: 'Draft an MRR for migrating on-premises data center infrastructure to AWS GovCloud. The agency runs 50 servers supporting 3 mission-critical applications. Current contract expires in 8 months.' },
  { id: 'mrr2', title: 'Cybersecurity Services MRR', description: 'SOC monitoring and incident response', prompt: 'Draft an MRR for a managed Security Operations Center (SOC) service including 24/7 monitoring, incident response, and quarterly vulnerability assessments for a mid-size federal agency.' },
  { id: 'mrr3', title: 'Software Modernization MRR', description: 'Legacy system replacement', prompt: 'Draft an MRR for replacing a legacy COBOL-based case management system with a modern cloud-native solution. The current system processes 100,000+ cases annually and has significant technical debt.' },
];

const JA_SCENARIOS: Scenario[] = [
  { id: 'ja1', title: 'Sole Source - Proprietary Platform', description: 'Platform lock-in justification', prompt: 'Draft a J&A for sole-source procurement of ServiceNow ITSM licenses. The agency has 5 years of customization, 200 workflows, and 2,000 users on the platform. Estimated value $2.5M.' },
  { id: 'ja2', title: 'Sole Source - Critical Timeline', description: 'Urgent national security need', prompt: 'Draft a J&A for sole-source award due to unusual and compelling urgency. A critical vulnerability in the agency border security system requires immediate patching and the incumbent is the only vendor with source code access.' },
  { id: 'ja3', title: 'Limited Sources - Specialized Skills', description: 'Niche technical expertise', prompt: 'Draft a J&A for limited competition among three vendors for quantum computing research support services. Only three firms in the US have the required Q-level clearances and quantum computing expertise.' },
];

export default function AIChat({ mode, requestId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const scenarios = mode === 'mrr' ? MRR_SCENARIOS : JA_SCENARIOS;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const result = await aiApi.chat({
        mode,
        message: text,
        request_id: requestId,
        history,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: result.response || result.content || 'No response.' }]);
    } catch {
      setError('AI service unavailable. Please check that ANTHROPIC_API_KEY is configured.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I\'m unable to connect to the AI service right now. Please ensure the ANTHROPIC_API_KEY environment variable is set in the backend configuration.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Scenario selector */}
      {messages.length === 0 && (
        <div className="p-4 border-b border-gray-200">
          <p className="text-sm text-gray-500 mb-3">
            Select a scenario or type your own {mode === 'mrr' ? 'Market Research Report' : 'Justification & Approval'} request:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {scenarios.map(s => (
              <button key={s.id} onClick={() => sendMessage(s.prompt)}
                className="text-left p-3 rounded-lg border border-gray-200 hover:border-eaw-primary hover:bg-eaw-primary/5 transition-colors">
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-gray-500 mt-1">{s.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-eaw-primary flex items-center justify-center shrink-0">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
              msg.role === 'user'
                ? 'bg-eaw-primary text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-eaw-primary flex items-center justify-center">
              <Loader2 size={14} className="text-white animate-spin" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-500">Thinking...</div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <input className="input-field flex-1" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder={`Ask about ${mode === 'mrr' ? 'market research' : 'justification & approval'}...`}
            disabled={loading} />
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            className="btn-primary flex items-center gap-1">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
