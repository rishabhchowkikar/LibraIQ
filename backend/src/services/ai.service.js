const axios = require("axios");
const prisma = require("../config/database");

// ─── Simple in-memory cache ───────────────────────────────────
const cache = new Map();

const getCached = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
};

const setCache = (key, data, ttlHours = 24) => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
  });
};

// ─── Ask Groq helper ──────────────────────────────────────────
const askGroq = async (prompt, systemPrompt = "") => {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );

    return response.data.choices[0]?.message?.content || null;
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error("Groq API error:", errMsg);
    return null;
  }
};

// ─── Parse JSON safely from Groq response ────────────────────
const parseGroqJSON = (text) => {
  try {
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 1: Book Recommendations
// ═══════════════════════════════════════════════════════════════
const getBookRecommendations = async (studentId) => {
  const cacheKey = `recommendations:${studentId}`;
  const cached = getCached(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true, trustTier: true },
  });

  const loans = await prisma.loan.findMany({
    where: { studentId },
    include: {
      book: { select: { id: true, title: true, author: true, genre: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  const borrowedBookIds = loans.map((l) => l.bookId);
  const borrowedBooks = loans.map((l) => ({
    title: l.book.title,
    author: l.book.author,
    genre: l.book.genre,
  }));

  const genreCounts = {};
  borrowedBooks.forEach((b) => {
    genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre);

  const availableBooks = await prisma.book.findMany({
    where: {
      availableCopies: { gt: 0 },
      id: { notIn: borrowedBookIds },
    },
    select: { id: true, title: true, author: true, genre: true },
    take: 20,
  });

  if (availableBooks.length === 0) {
    return { recommendations: [], message: "No available books to recommend." };
  }

  const prompt = `You are a librarian AI for LibraIQ.

Student: ${student.name} (${student.trustTier} tier)
Previously borrowed: ${JSON.stringify(borrowedBooks)}
Top genres: ${topGenres.join(", ") || "None yet"}

Available books: ${JSON.stringify(availableBooks)}

Recommend exactly 3 books from the available list based on reading history.
If no history, recommend diverse popular books.

Respond ONLY with valid JSON, no extra text:
{
  "recommendations": [
    {
      "bookId": "exact id from available books",
      "title": "book title",
      "author": "book author", 
      "genre": "book genre",
      "reason": "2-3 sentence personalised reason"
    }
  ],
  "summary": "one sentence about student reading taste"
}`;

  const response = await askGroq(prompt);

  if (!response) {
    const fallback = {
      recommendations: availableBooks.slice(0, 3).map((b) => ({
        bookId: b.id,
        title: b.title,
        author: b.author,
        genre: b.genre,
        reason: "Recommended from our library collection.",
      })),
      summary: "Explore our collection!",
    };
    return { ...fallback, fromCache: false };
  }

  const parsed = parseGroqJSON(response);
  if (!parsed) {
    return {
      recommendations: availableBooks.slice(0, 3).map((b) => ({
        bookId: b.id,
        title: b.title,
        author: b.author,
        genre: b.genre,
        reason: "Recommended from our library collection.",
      })),
      summary: "Explore our collection!",
      fromCache: false,
    };
  }

  setCache(cacheKey, parsed, 24);
  return { ...parsed, fromCache: false };
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 2: Score Explanation
// ═══════════════════════════════════════════════════════════════
const getScoreExplanation = async (studentId, scoreData) => {
  const cacheKey = `score-explanation:${studentId}:${scoreData.score}`;
  const cached = getCached(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true },
  });

  const prompt = `You are a friendly librarian AI for LibraIQ.

Student: ${student.name}
Reader Score: ${scoreData.score}/100
Tier: ${scoreData.tier}
${scoreData.nextTier ? `Next Tier: ${scoreData.nextTier} (${scoreData.pointsToNextTier} points away)` : "Highest tier reached!"}

Breakdown:
- Base Score: ${scoreData.breakdown.baseScore}
- Early Return Bonus: ${scoreData.breakdown.earlyReturnBonus}
- On Time Bonus: ${scoreData.breakdown.onTimeBonus}
- Late Penalty: ${scoreData.breakdown.latePenalty}
- Lost Book Penalty: ${scoreData.breakdown.lostBookPenalty}
- Clean Streak Bonus: ${scoreData.breakdown.cleanStreakBonus}
- Unpaid Fine Penalty: ${scoreData.breakdown.unpaidFinePenalty}
- Pattern Penalty: ${scoreData.breakdown.patternPenalty}

Stats: ${scoreData.stats.totalLoans} loans, ${scoreData.stats.earlyReturns} early, ${scoreData.stats.onTimeReturns} on time, ${scoreData.stats.lateReturns} late

Write a friendly 2-3 sentence explanation addressing ${student.name.split(" ")[0]} directly.
Mention what they did well and one specific tip to improve or maintain tier.

Respond ONLY with valid JSON:
{
  "explanation": "friendly explanation here",
  "highlight": "one key positive in 5-8 words",
  "tip": "one specific actionable tip"
}`;

  const response = await askGroq(prompt);

  const fallback = {
    explanation: `Your score of ${scoreData.score} puts you in ${scoreData.tier} tier. ${scoreData.nextTier ? `Return books on time to reach ${scoreData.nextTier}!` : "Excellent — keep it up!"}`,
    highlight: "Keep up your reading habits!",
    tip: scoreData.nextTier
      ? `Return your next book early to gain +7 points toward ${scoreData.nextTier}!`
      : "Maintain Platinum by returning books on time!",
  };

  if (!response) return { ...fallback, fromCache: false };

  const parsed = parseGroqJSON(response);
  if (!parsed) return { ...fallback, fromCache: false };

  setCache(cacheKey, parsed, 12);
  return { ...parsed, fromCache: false };
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 3: Genre DNA
// ═══════════════════════════════════════════════════════════════
const getGenreDNA = async (studentId) => {
  const cacheKey = `genre-dna:${studentId}`;
  const cached = getCached(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true },
  });

  const loans = await prisma.loan.findMany({
    where: { studentId },
    include: {
      book: { select: { title: true, genre: true, author: true } },
    },
  });

  if (loans.length === 0) {
    return {
      personalityType: "New Reader",
      emoji: "📖",
      description:
        "Your reading journey is just beginning! Borrow some books to discover your reading personality.",
      genreBreakdown: {},
      topGenre: null,
      fromCache: false,
    };
  }

  const booksRead = loans.map((l) => ({
    title: l.book.title,
    genre: l.book.genre,
  }));

  const genreCounts = {};
  booksRead.forEach((b) => {
    genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
  });

  const totalBooks = booksRead.length;
  const genreBreakdown = {};
  Object.entries(genreCounts).forEach(([genre, count]) => {
    genreBreakdown[genre] = Math.round((count / totalBooks) * 100);
  });

  const topGenre = Object.entries(genreCounts).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];

  const prompt = `You are a reading personality analyser for LibraIQ.

Student: ${student.name}
Total Books: ${totalBooks}
Books Read: ${JSON.stringify(booksRead)}
Genre Breakdown: ${JSON.stringify(genreBreakdown)}%

Create a fun reading personality profile.

Respond ONLY with valid JSON:
{
  "personalityType": "2-4 word creative name like 'The Knowledge Seeker'",
  "emoji": "one relevant emoji",
  "description": "2-3 fun sentences about their reading personality",
  "topGenre": "${topGenre}",
  "insight": "one interesting insight about their pattern"
}`;

  const response = await askGroq(prompt);

  if (!response) {
    return {
      personalityType: "Avid Reader",
      emoji: "📚",
      description: `You love reading ${topGenre || "various"} books. Keep exploring!`,
      genreBreakdown,
      topGenre,
      fromCache: false,
    };
  }

  const parsed = parseGroqJSON(response);
  if (!parsed) {
    return {
      personalityType: "Avid Reader",
      emoji: "📚",
      description: "A dedicated reader with varied interests.",
      genreBreakdown,
      topGenre,
      fromCache: false,
    };
  }

  const result = { ...parsed, genreBreakdown };
  setCache(cacheKey, result, 168);
  return { ...result, fromCache: false };
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 4: Student Summary (Admin)
// ═══════════════════════════════════════════════════════════════
const getStudentSummary = async (studentId) => {
  const cacheKey = `student-summary:${studentId}`;
  const cached = getCached(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true, email: true, trustTier: true, createdAt: true },
  });

  const loans = await prisma.loan.findMany({
    where: { studentId },
    include: { book: { select: { title: true, genre: true } } },
    orderBy: { issuedAt: "desc" },
  });

  const fines = await prisma.fine.findMany({ where: { studentId } });

  const totalLoans = loans.length;
  const returnedLoans = loans.filter((l) => l.status === "RETURNED");
  const overdueLoans = loans.filter((l) => l.status === "OVERDUE");
  const lostLoans = loans.filter((l) => l.status === "LOST");
  const unpaidFines = fines.filter((f) => !f.paidAt && !f.waivedBy);
  const totalFines = fines.reduce((s, f) => s + f.amount, 0);

  let lateReturns = 0;
  let earlyReturns = 0;
  returnedLoans.forEach((l) => {
    if (!l.returnedAt) return;
    const diff = new Date(l.returnedAt) - new Date(l.dueDate);
    if (diff > 0) lateReturns++;
    else earlyReturns++;
  });

  const genreCounts = {};
  loans.forEach((l) => {
    genreCounts[l.book.genre] = (genreCounts[l.book.genre] || 0) + 1;
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);

  const memberSince = new Date(student.createdAt).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const prompt = `You are a librarian AI assistant for LibraIQ.

Student: ${student.name} | Member since: ${memberSince} | Tier: ${student.trustTier}

Loan Stats:
- Total: ${totalLoans} | Returned: ${returnedLoans.length}
- Overdue: ${overdueLoans.length} | Lost: ${lostLoans.length}
- Early returns: ${earlyReturns} | Late returns: ${lateReturns}

Fines: Total ₹${totalFines} | Unpaid: ${unpaidFines.length}
Top Genres: ${topGenres.join(", ") || "None yet"}

Write a professional 3-4 sentence summary for the librarian.
Include tier status, reliability assessment, and any concerns.

Respond ONLY with valid JSON:
{
  "summary": "professional paragraph here",
  "riskLevel": "LOW or MEDIUM or HIGH",
  "riskReason": "brief reason in one sentence",
  "recommendation": "one specific recommendation for librarian"
}`;

  const response = await askGroq(prompt);

  const fallback = {
    summary: `${student.name} is a ${student.trustTier.toLowerCase()} tier member with ${totalLoans} total loans since ${memberSince}. ${lateReturns > 0 ? `${lateReturns} late return(s) on record.` : "Good return record."} ${unpaidFines.length > 0 ? `Has ${unpaidFines.length} unpaid fine(s).` : "No outstanding fines."}`,
    riskLevel:
      unpaidFines.length > 0 || lostLoans.length > 0 ? "MEDIUM" : "LOW",
    riskReason: unpaidFines.length > 0 ? "Has unpaid fines" : "Good standing",
    recommendation: "Continue monitoring loan activity regularly.",
  };

  if (!response) return { ...fallback, fromCache: false };

  const parsed = parseGroqJSON(response);
  if (!parsed) return { ...fallback, fromCache: false };

  setCache(cacheKey, parsed, 24);
  return { ...parsed, fromCache: false };
};

module.exports = {
  getBookRecommendations,
  getScoreExplanation,
  getGenreDNA,
  getStudentSummary,
};
