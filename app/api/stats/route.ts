import { NextResponse } from 'next/server';
import { getStats } from '@/lib/db/queries';
import { getTextbooks } from '@/lib/db/queries';

export async function GET() {
  try {
    const stats = getStats();
    const textbooks = getTextbooks();
    return NextResponse.json({ stats, textbooks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}