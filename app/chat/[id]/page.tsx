'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metrics?: {
    cacheHit: boolean;
    tokensSent: number;
    tokensBaseline: number;
    tokensSaved: number;
    savingsPct: number;
    costActual: number;
    costBaseline: number;
    costSaved: number;
    chaptersMatched: string[];
    chunksBeforePrune: number;
    chunksAfterPrune: number;
    responseTimeMs: number;
  };
}

export default function Chat() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const textbookId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showMetrics, setShowMetrics] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('gemini_api_key');
    if (saved) setApiKey(saved);
    else setShowApiKey(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !apiKey || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          textbookId: parseInt(textbookId),
          apiKey,
          userId: (session?.user as any)?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        metrics: data.metrics,
      }]);

      localStorage.setItem('gemini_api_key', apiKey);

    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}. Please check your API key and try again.`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/dashboard"
            className="text-gray-500 hover:text-gray-700 text-sm">
            ← Dashboard
          </Link>
          <span className="font-semibold text-gray-900 text-sm">AI Tutor Chat</span>
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="text-xs text-indigo-600 hover:underline">
            {apiKey ? '🔑 Key set' : '⚠️ Set API Key'}
          </button>
        </div>
      </header>

      {/* API Key input */}
      {showApiKey && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="text-xs text-amber-700 mb-2 font-medium">
              Enter your free Gemini API key to start chatting
              (get one at aistudio.google.com)
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="flex-1 border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={() => {
                  if (apiKey) {
                    localStorage.setItem('gemini_api_key', apiKey);
                    setShowApiKey(false);
                  }
                }}
                className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">💬</div>
              <div className="font-medium text-gray-900 mb-1">
                Ask anything from your textbook
              </div>
              <div className="text-sm text-gray-500">
                Try: "What is photosynthesis?" or "Explain Newton's laws"
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-100 text-gray-800 shadow-sm'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>

              {/* Metrics panel */}
              {msg.metrics && (
                <div className="mt-2 ml-1">
                  <button
                    onClick={() => setShowMetrics(showMetrics === i ? null : i)}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    {msg.metrics.cacheHit ? (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        ⚡ Cache hit — $0.00
                      </span>
                    ) : (
                      <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        {msg.metrics.savingsPct}% saved vs baseline
                      </span>
                    )}
                    <span className="ml-1">
                      {showMetrics === i ? '▲ hide' : '▼ details'}
                    </span>
                  </button>

                  {showMetrics === i && msg.metrics && (
                    <div className="mt-2 bg-white border border-gray-100 rounded-xl p-4 shadow-sm text-xs space-y-2">
                      <div className="font-semibold text-gray-700 mb-2">
                        Cost & Token Analysis
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            label: 'Tokens sent',
                            value: msg.metrics.tokensSent.toLocaleString(),
                            color: 'text-indigo-600',
                          },
                          {
                            label: 'Baseline tokens',
                            value: msg.metrics.tokensBaseline.toLocaleString(),
                            color: 'text-red-500',
                          },
                          {
                            label: 'Tokens saved',
                            value: msg.metrics.tokensSaved.toLocaleString(),
                            color: 'text-green-600',
                          },
                          {
                            label: 'Saving %',
                            value: `${msg.metrics.savingsPct}%`,
                            color: 'text-green-600',
                          },
                          {
                            label: 'Actual cost',
                            value: `$${msg.metrics.costActual.toFixed(6)}`,
                            color: 'text-indigo-600',
                          },
                          {
                            label: 'Baseline cost',
                            value: `$${msg.metrics.costBaseline.toFixed(6)}`,
                            color: 'text-red-500',
                          },
                          {
                            label: 'Cost saved',
                            value: `$${msg.metrics.costSaved.toFixed(6)}`,
                            color: 'text-green-600',
                          },
                          {
                            label: 'Response time',
                            value: `${msg.metrics.responseTimeMs}ms`,
                            color: 'text-gray-600',
                          },
                          {
                            label: 'Chunks before prune',
                            value: msg.metrics.chunksBeforePrune,
                            color: 'text-red-500',
                          },
                          {
                            label: 'Chunks after prune',
                            value: msg.metrics.chunksAfterPrune,
                            color: 'text-green-600',
                          },
                        ].map(item => (
                          <div key={item.label}
                            className="bg-gray-50 rounded-lg p-2">
                            <div className={`font-bold ${item.color}`}>
                              {item.value}
                            </div>
                            <div className="text-gray-400">{item.label}</div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-gray-500 mb-1">Chapters matched:</div>
                        <div className="flex flex-wrap gap-1">
                          {msg.metrics.chaptersMatched.map((ch, j) => (
                            <span key={j}
                              className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                              {ch}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={apiKey ? 'Ask a question from your textbook...' : 'Set your API key first ↑'}
              disabled={!apiKey || loading}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || !apiKey || loading}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 text-sm">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}