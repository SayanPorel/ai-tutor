import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadIndex } from '@/lib/ingestion/build-index';
import { embedQuery } from '@/lib/ingestion/embed-chunks';
import { pruneChapters } from '@/lib/query/prune-chapters';
import { vectorSearch } from '@/lib/query/vector-search';
import { rerankChunks } from '@/lib/query/rerank';
import { buildPrompt, calculateCost, calculateBaselineCost } from '@/lib/query/build-prompt';
import {
  hashQuery,
  getCachedAnswer,
  saveAnswerToCache,
  logQuery,
  updateProgress,
} from '@/lib/db/queries';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const { query, textbookId, apiKey, userId } = await req.json();

    if (!query || !textbookId || !apiKey) {
      return NextResponse.json(
        { error: 'Query, textbook ID and API key required' },
        { status: 400 }
      );
    }

    // Layer 1: Check exact answer cache
    const queryHash = hashQuery(query);
    const cached = getCachedAnswer(queryHash);

    if (cached) {
      const responseTime = Date.now() - startTime;
      logQuery({
        userId,
        textbookId,
        queryText: query,
        answerText: cached.answer_text,
        chaptersMatched: 'CACHE HIT',
        chunksBeforePrune: 300,
        chunksAfterPrune: 0,
        tokensSent: 0,
        tokensBaseline: 8000,
        costActual: 0,
        costBaseline: calculateBaselineCost(),
        savingsPct: 100,
        cacheHit: true,
        responseTimeMs: responseTime,
      });

      return NextResponse.json({
        answer: cached.answer_text,
        metrics: {
          cacheHit: true,
          tokensSent: 0,
          tokensBaseline: 8000,
          tokensSaved: 8000,
          savingsPct: 100,
          costActual: 0,
          costBaseline: calculateBaselineCost(),
          costSaved: calculateBaselineCost(),
          chaptersMatched: ['Cache'],
          chunksBeforePrune: 300,
          chunksAfterPrune: 0,
          responseTimeMs: responseTime,
        },
      });
    }

    // Layer 2: Load textbook index
    const index = loadIndex(textbookId);
    if (!index) {
      return NextResponse.json(
        { error: 'Textbook not found. Please ingest first.' },
        { status: 404 }
      );
    }

    const totalChunks = index.chunks.length;

    // Layer 3: Chapter pruning
    const pruneResult = pruneChapters(query, index.chapterIndex);

    // Layer 4: Embed query
    const queryEmbedding = await embedQuery(query, apiKey);

    // Layer 5: Vector search within pruned chapters only
    const topChunks = vectorSearch(
      queryEmbedding,
      index.chunks,
      pruneResult.matchedChunkIds,
      20
    );

    // Layer 6: BM25 rerank → top 3
    const reranked = rerankChunks(query, topChunks, 3);

    // Layer 7: Build prompt with token cap
    const textbook = index;
    const promptResult = buildPrompt(query, reranked);

    // Layer 8: Call Gemini Flash
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { maxOutputTokens: 300, temperature: 0.3 },
    });

    const result = await model.generateContent({
      systemInstruction: promptResult.systemPrompt,
      contents: [{ role: 'user', parts: [{ text: promptResult.prompt }] }],
    });

    const answer = result.response.text();
    const responseTime = Date.now() - startTime;

    // Calculate costs
    const costActual = calculateCost(promptResult.tokenEstimate);
    const costBaseline = calculateBaselineCost();
    const savingsPct = ((costBaseline - costActual) / costBaseline) * 100;

    // Save to cache
    saveAnswerToCache(queryHash, query, answer, textbookId, promptResult.tokenEstimate);

    // Log query with full metrics
    logQuery({
      userId,
      textbookId,
      queryText: query,
      answerText: answer,
      chaptersMatched: pruneResult.matchedChapters.join(', '),
      chunksBeforePrune: totalChunks,
      chunksAfterPrune: reranked.length,
      tokensSent: promptResult.tokenEstimate,
      tokensBaseline: 8000,
      costActual,
      costBaseline,
      savingsPct,
      cacheHit: false,
      responseTimeMs: responseTime,
    });

    // Update progress
    if (userId && pruneResult.matchedChapters[0]) {
      updateProgress(userId, textbookId, pruneResult.matchedChapters[0]);
    }

    return NextResponse.json({
      answer,
      metrics: {
        cacheHit: false,
        tokensSent: promptResult.tokenEstimate,
        tokensBaseline: 8000,
        tokensSaved: 8000 - promptResult.tokenEstimate,
        savingsPct: Math.round(savingsPct),
        costActual,
        costBaseline,
        costSaved: costBaseline - costActual,
        chaptersMatched: pruneResult.matchedChapters,
        chunksBeforePrune: totalChunks,
        chunksAfterPrune: reranked.length,
        responseTimeMs: responseTime,
      },
    });
  } catch (err: any) {
    console.error('Query error:', err);
    return NextResponse.json(
      { error: err.message || 'Query failed' },
      { status: 500 }
    );
  }
}