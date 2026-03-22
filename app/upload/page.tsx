'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Upload() {
  const { data: session } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: '', subject: '', board: '', apiKey: ''
  });
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !form.apiKey) return;

    setStatus('processing');
    setProgress('Parsing PDF...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', form.title || file.name);
      formData.append('subject', form.subject);
      formData.append('board', form.board);
      formData.append('apiKey', form.apiKey);

      setProgress('Detecting chapters and chunking text...');

      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      setProgress('Embedding chunks (this takes 2-3 minutes for large books)...');

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setResult(data.stats);
      setStatus('done');

      // Save API key to localStorage for reuse
      localStorage.setItem('gemini_api_key', form.apiKey);

    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Back to dashboard
          </Link>
          <span className="font-semibold text-gray-900">Upload Textbook</span>
          <div />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">

        {status === 'done' ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Textbook processed successfully!
            </h2>
            <div className="grid grid-cols-2 gap-3 my-6 text-left">
              {[
                { label: 'Pages', value: result?.pages },
                { label: 'Chapters detected', value: result?.chapters },
                { label: 'Chunks created', value: result?.chunks },
                { label: 'Embeddings generated', value: result?.embedded },
              ].map(item => (
                <div key={item.label}
                  className="bg-gray-50 rounded-xl p-4">
                  <div className="text-2xl font-bold text-indigo-600">
                    {item.value}
                  </div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mb-6">
              The textbook has been indexed. You will never need to re-process it.
              All future queries run against this pre-built index.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 transition">
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Upload a Textbook PDF
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              Processed once. Never re-read. All queries use the pre-built index.
            </p>

            {/* API Key notice */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <div className="text-sm font-medium text-blue-800 mb-1">
                Need a free Gemini API key?
              </div>
              <div className="text-xs text-blue-600">
                Go to{' '}
                <a href="https://aistudio.google.com" target="_blank"
                  className="underline font-medium">
                  aistudio.google.com
                </a>
                {' '}→ Get API Key → Create API key. Free, no credit card needed.
              </div>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Textbook PDF
                </label>
                <div
                  onClick={() => document.getElementById('fileInput')?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 transition">
                  {file ? (
                    <div>
                      <div className="text-2xl mb-1">📄</div>
                      <div className="font-medium text-gray-900">{file.name}</div>
                      <div className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl mb-1">📂</div>
                      <div className="text-sm text-gray-500">
                        Click to select PDF
                      </div>
                    </div>
                  )}
                </div>
                <input
                  id="fileInput"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Form fields */}
              {[
                { label: 'Title (optional)', key: 'title', placeholder: 'e.g. Class 10 Science' },
                { label: 'Subject', key: 'subject', placeholder: 'e.g. Science, Mathematics' },
                { label: 'Board', key: 'board', placeholder: 'e.g. CBSE, WBCHSE, ICSE' },
                { label: 'Your Gemini API Key', key: 'apiKey', placeholder: 'AIza...' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.key === 'apiKey' ? 'password' : 'text'}
                    value={(form as any)[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder={field.placeholder}
                    required={field.key === 'apiKey'}
                  />
                </div>
              ))}

              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {status === 'processing' && (
                <div className="bg-indigo-50 text-indigo-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  {progress}
                </div>
              )}

              <button
                type="submit"
                disabled={!file || !form.apiKey || status === 'processing'}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50">
                {status === 'processing' ? 'Processing...' : 'Upload & Process Textbook'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}