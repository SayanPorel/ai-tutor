'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.push('/dashboard');
  }, [status, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">

        {/* Hero */}
        <div className="mb-8">
          <span className="inline-block bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1 rounded-full mb-6">
            Built for Rural India — Works on 2G & Offline
          </span>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AI Tutor
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Personalized learning from your state board textbooks
          </p>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Upload any CBSE, ICSE or state board textbook PDF. Get instant,
            curriculum-aligned answers. Works offline. Uses 97% fewer tokens
            than standard AI systems — completely free.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
          {[
            { value: '97%', label: 'Cost reduction' },
            { value: '2G', label: 'Works on 2G' },
            { value: '$0', label: 'Free forever' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold text-indigo-600">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-4 justify-center mb-16">
          <Link href="/register"
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 transition">
            Get Started Free
          </Link>
          <Link href="/login"
            className="bg-white text-gray-700 px-8 py-3 rounded-xl font-medium border border-gray-200 hover:bg-gray-50 transition">
            Sign In
          </Link>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            {
              step: '1',
              title: 'Get your free API key',
              desc: 'Visit aistudio.google.com → Get API Key. Free, no credit card. Takes 2 minutes.',
              color: 'bg-blue-50 border-blue-100',
              num: 'bg-blue-100 text-blue-700',
            },
            {
              step: '2',
              title: 'Upload your textbook',
              desc: 'Upload any state board PDF. We process it once and build a smart index — never re-read again.',
              color: 'bg-purple-50 border-purple-100',
              num: 'bg-purple-100 text-purple-700',
            },
            {
              step: '3',
              title: 'Ask anything',
              desc: 'Get precise, curriculum-aligned answers. Works offline after first use. 97% cheaper than standard AI.',
              color: 'bg-green-50 border-green-100',
              num: 'bg-green-100 text-green-700',
            },
          ].map(item => (
            <div key={item.step} className={`rounded-xl p-6 border ${item.color}`}>
              <div className={`w-8 h-8 rounded-full ${item.num} font-bold text-sm flex items-center justify-center mb-3`}>
                {item.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}