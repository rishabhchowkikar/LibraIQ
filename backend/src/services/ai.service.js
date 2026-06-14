const { GoogleGenerativeAI } = require("@google/generative-ai");
const prisma = require("../config/database");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

const setCache = (key, data, ttlHours = 20) => {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
  });
};

// ─── Ask Gemini helper ────────────────────────────────────────
const askGemini = async (prompt) => {
  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini API error:", error.message);
    return null;
  }
};

// ─── Parse JSON safely from Gemini response ──────────────────
const parseGeminiJSON = (text) => {
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

  // Fetch student data
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { name: true, trustTier: true },
  });

  // fetch students's loan history
  const loan = await prisma.loan.findMany({
    where: { studentId },
    include: {
      book: { select: { id: true, title: true, author: true, genre: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  const borrowedBookIds = loan.map((l) => l.bookId);
  const borrowedBooks = loan.map((l) => ({
    title: l.book.title,
    author: l.book.author,
    genre: l.book.genre,
  }));

  // Get genre preference
  const genreCounts = {};
  borrowedBooks.forEach((b) => {
    genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
  });

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre);

  // Fetch available books not already borrowed
  const availableBooks = await prisma.book.findMany({
    where: {
      availableCopies: { gt: 0 },
      id: { notIn: borrowedBookIds },
    },
    select: {
      id: true,
      title: true,
      author: true,
      genre: true,
      description: true,
    },
    take: 20,
  });

  if (availableBooks.length === 0) {
    return {
      recommendations: [],
      message: "No available books to recommend at this time.",
    };
  }

  const prompt = `
You are a librarian AI assistant for LibraIQ library management system.

Student Profile:
- Name: ${student.name}
- Trust Tier: ${student.trustTier}
- Books Previously Borrowed: ${borrowedBooks.length > 0 ? JSON.stringify(borrowedBooks) : "No history yet"}
- Favourite Genres: ${topGenres.length > 0 ? topGenres.join(", ") : "No preference yet"}

Available Books in Library:
${JSON.stringify(availableBooks)}

Task: Recommend exactly 3 books from the available books list for this student.
Base recommendations on their reading history and genre preferences.
If no history, recommend popular books across different genres.

Respond ONLY with valid JSON. No explanation outside JSON.
Format:
{
  "recommendations": [
    {
      "bookId": "the exact id from available books",
      "title": "book title",
      "author": "book author",
      "genre": "book genre",
      "reason": "2-3 sentence personalised reason why this book suits this student"
    }
  ],
  "summary": "One sentence about the student's reading taste"
}
`;

  const response = await askGemini(prompt);
  if (!response) {
    return {
      recommendations: availableBooks.slice(0, 3).map((b) => ({
        bookId: b.id,
        title: b.title,
        author: b.author,
        genre: b.genre,
        reason: "Recommended based on library collection.",
      })),
      summary: "Explore our collection!",
      fromCache: false,
    };
  }

  const parsed = parseGeminiJSON(response);
  if (!parsed) {
    return {
      recommendations: availableBooks.slice(0, 3).map((b) => ({
        bookId: b.id,
        title: b.title,
        author: b.author,
        genre: b.genre,
        reason: "Recommended based on library collection.",
      })),
      summary: "Explore our collection!",
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

  const tierEmoji = {
    BRONZE: "🥉",
    SILVER: "🥈",
    GOLD: "🥇",
    PLATINUM: "💎",
  };

  const prompt = `
You are a friendly librarian AI for LibraIQ library system.

Student: ${student.name}
Current Reader Score: ${scoreData.score}/100
Current Tier: ${tierEmoji[scoreData.tier]} ${scoreData.tier}
${scoreData.nextTier ? `Next Tier: ${scoreData.nextTier} (${scoreData.pointsToNextTier} points away)` : "Already at highest tier: PLATINUM!"}

Score Breakdown:
- Base Score: ${scoreData.breakdown.baseScore}
- Early Return Bonus: ${scoreData.breakdown.earlyReturnBonus > 0 ? "+" : ""}${scoreData.breakdown.earlyReturnBonus}
- On Time Bonus: ${scoreData.breakdown.onTimeBonus > 0 ? "+" : ""}${scoreData.breakdown.onTimeBonus}
- Late Return Penalty: ${scoreData.breakdown.latePenalty}
- Lost Book Penalty: ${scoreData.breakdown.lostBookPenalty}
- Clean Streak Bonus: ${scoreData.breakdown.cleanStreakBonus > 0 ? "+" : ""}${scoreData.breakdown.cleanStreakBonus}
- Unpaid Fine Penalty: ${scoreData.breakdown.unpaidFinePenalty}
- Pattern Penalty: ${scoreData.breakdown.patternPenalty}

Stats:
- Total Loans: ${scoreData.stats.totalLoans}
- Early Returns: ${scoreData.stats.earlyReturns}
- On Time Returns: ${scoreData.stats.onTimeReturns}
- Late Returns: ${scoreData.stats.lateReturns}
- Lost Books: ${scoreData.stats.lostBooks}

Task: Write a friendly, encouraging, personalised explanation for ${student.name.split(" ")[0]} about:
1. Why their score is ${scoreData.score}
2. What they did well
3. What brought the score down (if anything)
4. Specific actionable tip to improve or maintain tier

Keep it warm, encouraging, and under 100 words.
Address the student directly (use "you").

Respond ONLY with valid JSON:
{
  "explanation": "your explanation here",
  "highlight": "one key positive thing in 5-8 words",
  "tip": "one specific actionable tip in one sentence"
}
`;

  const response = await askGemini(prompt);
  if (!response) {
    const fallback = {
      explanation: `Your Reader Score of ${scoreData.score} places you in ${scoreData.tier} tier. Keep returning books on time to improve your score!`,
      highlight: "Keep up the great reading!",
      tip: scoreData.nextTier
        ? `Return your next ${scoreData.pointsToNextTier >= 7 ? "few" : "next"} books on time to reach ${scoreData.nextTier}!`
        : "Maintain your Platinum status by returning books early!",
    };
    return { ...fallback, fromCache: false };
  }

  const parsed = parseGeminiJSON(response);
  if (!parsed) {
    return {
      explanation: `Your Reader Score is ${scoreData.score}. Keep up the good work!`,
      highlight: "Great reading habits!",
      tip: "Return books on time to improve your score.",
      fromCache: false,
    };
  }

  setCache(cacheKey, parsed, 12);
  return { ...parsed, fromCache: false };
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 3: Genre DNA / Reading Personality
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
      book: { select: { title: true, author: true, genre: true } },
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
    author: l.book.author,
  }));

  // Calculate genre breakdown
  const genreCounts = {};
  booksRead.forEach((b) => {
    genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
  });

  const totalBooks = booksRead.length;
  const genreBreakdown = {};
  Object.entries(genreCounts).forEach(([genre, count]) => {
    genreBreakdown[genre] = Math.round((count / totalBooks) * 100);
  });

  const prompt = `
You are a reading personality analyser for LibraIQ library system.

Student: ${student.name}
Total Books Borrowed: ${totalBooks}
Books Read: ${JSON.stringify(booksRead)}
Genre Breakdown: ${JSON.stringify(genreBreakdown)} (percentages)

Task: Analyse this student's reading pattern and create a fun reading personality profile.

Respond ONLY with valid JSON:
{
  "personalityType": "Creative name for their reading personality (2-4 words, e.g. 'The Knowledge Seeker', 'The Story Hunter')",
  "emoji": "one relevant emoji for their personality",
  "description": "2-3 sentences describing their reading personality based on the genres they choose. Make it fun and insightful.",
  "topGenre": "their most read genre",
  "insight": "one interesting insight about their reading pattern in one sentence"
}
`;

  const response = await askGemini(prompt);
  if (!response) {
    const topGenre = Object.entries(genreCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    return {
      personalityType: "Avid Reader",
      emoji: "📚",
      description: `You love reading ${topGenre || "various genres"} books. Keep exploring!`,
      genreBreakdown,
      topGenre,
      fromCache: false,
    };
  }

  const parsed = parseGeminiJSON(response);
  if (!parsed) {
    const topGenre = Object.entries(genreCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
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
  setCache(cacheKey, result, 168); // 7 days cache
  return { ...result, fromCache: false };
};

// ═══════════════════════════════════════════════════════════════
// FEATURE 4: Student Behaviour Summary (Admin)
// ═══════════════════════════════════════════════════════════════

const getStudentSummary = async (studentId) => {
  const cacheKey = `student-summary:${studentId}`;
  const cached = getCached(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      name: true,
      email: true,
      trustTier: true,
      createdAt: true,
    },
  });

  const loans = await prisma.loan.findMany({
    where: { studentId },
    include: {
      book: {
        select: {
          title: true,
          genre: true,
        },
      },
    },
    orderBy: { issuedAt: "asc" },
  });

  const fines = await prisma.fine.findMany({
    where: { studentId },
  });

  // Calculate stats
  const totalLoans = loans.length;
  const returnedLoans = loans.filter((l) => l.status === "RETURNED");
  const overdueLoans = loans.filter((l) => l.status === "OVERDUE");
  const lostLoans = loans.filter((l) => l.status === "LOST");
  const activeLoans = loans.filter((l) => l.status === "ACTIVE");
  const totalFines = fines.reduce((s, f) => s + f.amount, 0);
  const unpaidFines = fines.filter((f) => !f.paidAt && !f.waivedBy);

  // Genre breakdown
  const genreCounts = {};
  loans.forEach((l) => {
    genreCounts[l.book.genre] = (genreCounts[l.book.genre] || 0) + 1;
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);

  // Late return analysis
  // Late return analysis
  let lateReturns = 0;
  let earlyReturns = 0;
  returnedLoans.forEach((l) => {
    if (!l.returnedAt) return;
    const diff = new Date(l.returnedAt) - new Date(l.dueDate);
    if (diff > 0) lateReturns++;
    else earlyReturns++;
  });

  const memberSince = new Date(student.createdAt).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const prompt = `
You are a professional librarian AI assistant for LibraIQ library management system.
Generate a concise professional summary for a librarian/admin about this student.

Student Profile:
- Name: ${student.name}
- Member Since: ${memberSince}
- Trust Tier: ${student.trustTier}

Loan Statistics:
- Total Loans: ${totalLoans}
- Currently Active: ${activeLoans.length}
- Returned: ${returnedLoans.length}
- Overdue: ${overdueLoans.length}
- Lost Books: ${lostLoans.length}
- Early Returns: ${earlyReturns}
- Late Returns: ${lateReturns}

Reading Preferences:
- Top Genres: ${topGenres.join(", ") || "Not established yet"}

Fine History:
- Total Fines: ₹${totalFines}
- Unpaid Fines: ${unpaidFines.length} (₹${unpaidFines.reduce((s, f) => s + f.amount, 0)})

Task: Write a professional 3-4 sentence summary that a librarian would read to quickly 
understand this student's borrowing behaviour, reliability, and reading patterns.
Mention their tier status and any concerns or commendations.

Respond ONLY with valid JSON:
{
  "summary": "professional paragraph summary here",
  "riskLevel": "LOW or MEDIUM or HIGH",
  "riskReason": "brief reason for risk level in one sentence",
  "recommendation": "one specific recommendation for the librarian in one sentence"
}
`;

  const response = await askGemini(prompt);
  if (!response) {
    return {
      summary: `${student.name} is a ${student.trustTier.toLowerCase()} tier member with ${totalLoans} total loans. ${lateReturns > 0 ? `${lateReturns} late return(s) on record.` : "Good return record."} ${unpaidFines.length > 0 ? `Has ${unpaidFines.length} unpaid fine(s).` : "No outstanding fines."}`,
      riskLevel:
        unpaidFines.length > 0 || lostLoans.length > 0 ? "MEDIUM" : "LOW",
      riskReason: unpaidFines.length > 0 ? "Has unpaid fines" : "Good standing",
      recommendation: "Monitor loan activity regularly.",
      fromCache: false,
    };
  }
  const parsed = parseGeminiJSON(response);
  if (!parsed) {
    return {
      summary: `${student.name} has ${totalLoans} loans with ${student.trustTier} tier status.`,
      riskLevel: "LOW",
      riskReason: "Insufficient data for analysis.",
      recommendation: "Continue monitoring.",
      fromCache: false,
    };
  }

  setCache(cacheKey, parsed, 24);
  return { ...parsed, fromCache: false };
};

module.exports = {
  getBookRecommendations,
  getScoreExplanation,
  getGenreDNA,
  getStudentSummary,
};
