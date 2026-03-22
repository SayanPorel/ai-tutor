import db from './database';
import crypto from 'crypto';

export function createUser(name: string, email: string, hashedPassword: string) {
  const stmt = db.prepare(`
    INSERT INTO users (name, email, password) VALUES (?, ?, ?)
  `);
  return stmt.run(name, email, hashedPassword);
}

export function getUserByEmail(email: string) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as any;
}

export function getUserById(id: number) {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as any;
}

export function saveTextbook(title: string, subject: string, board: string, filePath: string, chunkCount: number) {
  const stmt = db.prepare(`
    INSERT INTO textbooks (title, subject, board, file_path, chunk_count)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(title, subject, board, filePath, chunkCount);
}

export function getTextbooks() {
  return db.prepare(`SELECT * FROM textbooks ORDER BY created_at DESC`).all() as any[];
}

export function getTextbookById(id: number) {
  return db.prepare(`SELECT * FROM textbooks WHERE id = ?`).get(id) as any;
}

// Answer cache functions
export function hashQuery(query: string): string {
  return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
}

export function getCachedAnswer(queryHash: string) {
  const result = db.prepare(`
    SELECT * FROM answer_cache WHERE query_hash = ?
  `).get(queryHash) as any;
  if (result) {
    db.prepare(`
      UPDATE answer_cache SET hit_count = hit_count + 1 WHERE query_hash = ?
    `).run(queryHash);
  }
  return result;
}

export function saveAnswerToCache(
  queryHash: string,
  queryText: string,
  answerText: string,
  textbookId: number,
  tokensUsed: number
) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO answer_cache
    (query_hash, query_text, answer_text, textbook_id, tokens_used)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(queryHash, queryText, answerText, textbookId, tokensUsed);
}

export function logQuery(data: {
  userId?: number;
  textbookId?: number;
  queryText: string;
  answerText: string;
  chaptersMatched: string;
  chunksBeforePrune: number;
  chunksAfterPrune: number;
  tokensSent: number;
  tokensBaseline: number;
  costActual: number;
  costBaseline: number;
  savingsPct: number;
  cacheHit: boolean;
  responseTimeMs: number;
}) {
  const stmt = db.prepare(`
    INSERT INTO query_logs (
      user_id, textbook_id, query_text, answer_text,
      chapters_matched, chunks_before_prune, chunks_after_prune,
      tokens_sent, tokens_baseline, cost_actual, cost_baseline,
      savings_pct, cache_hit, response_time_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    data.userId, data.textbookId, data.queryText, data.answerText,
    data.chaptersMatched, data.chunksBeforePrune, data.chunksAfterPrune,
    data.tokensSent, data.tokensBaseline, data.costActual, data.costBaseline,
    data.savingsPct, data.cacheHit ? 1 : 0, data.responseTimeMs
  );
}

export function getStats() {
  return {
    totalQueries: (db.prepare(`SELECT COUNT(*) as c FROM query_logs`).get() as any).c,
    cacheHits: (db.prepare(`SELECT COUNT(*) as c FROM query_logs WHERE cache_hit = 1`).get() as any).c,
    totalTokensSaved: (db.prepare(`SELECT SUM(tokens_baseline - tokens_sent) as s FROM query_logs`).get() as any).s || 0,
    totalCostSaved: (db.prepare(`SELECT SUM(cost_baseline - cost_actual) as s FROM query_logs`).get() as any).s || 0,
    avgSavingsPct: (db.prepare(`SELECT AVG(savings_pct) as a FROM query_logs`).get() as any).a || 0,
    recentQueries: db.prepare(`SELECT * FROM query_logs ORDER BY created_at DESC LIMIT 10`).all(),
  };
}

export function updateProgress(userId: number, textbookId: number, chapter: string) {
  const existing = db.prepare(`
    SELECT * FROM progress WHERE user_id = ? AND textbook_id = ? AND chapter = ?
  `).get(userId, textbookId, chapter) as any;

  if (existing) {
    db.prepare(`
      UPDATE progress SET questions_asked = questions_asked + 1, last_active = CURRENT_TIMESTAMP
      WHERE user_id = ? AND textbook_id = ? AND chapter = ?
    `).run(userId, textbookId, chapter);
  } else {
    db.prepare(`
      INSERT INTO progress (user_id, textbook_id, chapter, questions_asked)
      VALUES (?, ?, ?, 1)
    `).run(userId, textbookId, chapter);
  }
}

export function getUserProgress(userId: number) {
  return db.prepare(`
    SELECT p.*, t.title as textbook_title
    FROM progress p
    JOIN textbooks t ON p.textbook_id = t.id
    WHERE p.user_id = ?
    ORDER BY p.last_active DESC
  `).all(userId) as any[];
}