'use client';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [textbooks, setTextbooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') fetchStats();
  }, [status]);

  async function fetchStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data.stats);
      setTextbooks(data.textbooks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
            <span className="font-semibold text-gray-900">AI Tutor</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Hi, {session?.user?.name}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total queries',
              value: stats?.totalQueries || 0,
              color: 'text-indigo-600',
              bg: 'bg-indigo-50',
            },
            {
              label: 'Cache hits',
              value: stats?.cacheHits || 0,
              color: 'text-green-600',
              bg: 'bg-green-50',
            },
            {
              label: 'Tokens saved',
              value: stats?.totalTokensSaved?.toLocaleString() || 0,
              color: 'text-purple-600',
              bg: 'bg-purple-50',
            },
            {
              label: 'Cost saved',
              value: `$${(stats?.totalCostSaved || 0).toFixed(4)}`,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
            },
          ].map(card => (
            <div key={card.label}
              className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className={`text-2xl font-bold ${card.color} mb-1`}>
                {card.value}
              </div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Avg savings banner */}
        {stats?.avgSavingsPct > 0 && (
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 mb-8 text-white flex items-center justify-between">
            <div>
              <div className="font-semibold">Average cost reduction vs baseline RAG</div>
              <div className="text-indigo-200 text-sm">
                Context pruning + caching + token compression working together
              </div>
            </div>
            <div className="text-4xl font-bold">
              {Math.round(stats.avgSavingsPct)}%
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Textbooks */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Your Textbooks</h2>
              <Link href="/upload"
                className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                + Upload PDF
              </Link>
            </div>

            {textbooks.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
                <div className="text-4xl mb-3">📚</div>
                <div className="font-medium text-gray-900 mb-1">No textbooks yet</div>
                <div className="text-sm text-gray-500 mb-4">
                  Upload your first PDF to get started
                </div>
                <Link href="/upload"
                  className="bg-indigo-600 text-white text-sm px-6 py-2 rounded-lg hover:bg-indigo-700 transition">
                  Upload Textbook
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {textbooks.map(tb => (
                  <div key={tb.id}
                    className="bg-white rounded-xl border border-gray-100 p-5 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="font-medium text-gray-900">{tb.title}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {tb.subject} • {tb.board} • {tb.chunk_count} chunks
                      </div>
                    </div>
                    <Link href={`/chat/${tb.id}`}
                      className="bg-indigo-50 text-indigo-600 text-sm px-4 py-2 rounded-lg hover:bg-indigo-100 transition font-medium">
                      Ask Questions →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent queries */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Recent Queries</h2>
            <div className="space-y-2">
              {(stats?.recentQueries || []).length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-400">
                  No queries yet
                </div>
              ) : (
                stats.recentQueries.map((q: any) => (
                  <div key={q.id}
                    className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <div className="text-sm text-gray-700 font-medium truncate mb-1">
                      {q.query_text}
                    </div>
                    <div className="flex items-center gap-2">
                      {q.cache_hit ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Cache hit
                        </span>
                      ) : (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          {q.savings_pct?.toFixed(0)}% saved
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {q.tokens_sent} tokens
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}