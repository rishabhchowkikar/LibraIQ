'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
    TrendingUp, Award, Target, BookOpen, CheckCircle2,
    Clock, AlertCircle, XCircle, Zap, Star, Info, Sparkles, RefreshCw,
} from 'lucide-react';

interface ScoreData {
    score: number;
    tier: string;
    nextTier: string | null;
    pointsToNextTier: number | null;
    breakdown: {
        baseScore: number;
        earlyReturnBonus: number;
        onTimeBonus: number;
        latePenalty: number;
        cleanStreakBonus: number;
        lostBookPenalty: number;
        unpaidFinePenalty: number;
        patternPenalty: number;
    };
    stats: {
        totalLoans: number;
        earlyReturns: number;
        onTimeReturns: number;
        lateReturns: number;
        lostBooks: number;
        consecutiveLate: number;
    };
}

interface AIScoreExplanation {
    scoreData: {
        score: number;
        tier: string;
        breakdown: Record<string, number>;
        stats: Record<string, number>;
    };
    explanation: string;
    highlight: string;
    tip: string;
}

interface GenreDNA {
    personalityType: string;
    emoji: string;
    description: string;
    genreBreakdown: Record<string, number> | null;
    topGenre: string | null;
    insight: string | null;
    fromCache: boolean;
}

const TIER_COLORS: Record<string, { stroke: string; badge: string; bar: string; label: string; ring: string }> = {
    BRONZE: { stroke: '#ea580c', badge: 'bg-orange-100 text-orange-700 border-orange-200', bar: 'bg-orange-500', label: '🥉 BRONZE', ring: 'ring-orange-200' },
    SILVER: { stroke: '#64748b', badge: 'bg-slate-100 text-slate-700 border-slate-200', bar: 'bg-slate-500', label: '🥈 SILVER', ring: 'ring-slate-200' },
    GOLD: { stroke: '#ca8a04', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', bar: 'bg-yellow-500', label: '🥇 GOLD', ring: 'ring-yellow-200' },
    PLATINUM: { stroke: '#7c3aed', badge: 'bg-purple-100 text-purple-700 border-purple-200', bar: 'bg-purple-500', label: '💎 PLATINUM', ring: 'ring-purple-200' },
};

const TIER_RANGES: Record<string, { start: number; end: number }> = {
    BRONZE: { start: 0, end: 40 },
    SILVER: { start: 40, end: 60 },
    GOLD: { start: 60, end: 80 },
    PLATINUM: { start: 80, end: 100 },
};

const BREAKDOWN_META: { key: keyof ScoreData['breakdown']; label: string; description: string }[] = [
    { key: 'baseScore', label: 'Base Score', description: 'Starting score for all readers' },
    { key: 'earlyReturnBonus', label: 'Early Return Bonus', description: 'Returned books before due date' },
    { key: 'onTimeBonus', label: 'On-Time Bonus', description: 'Returned books exactly on time' },
    { key: 'cleanStreakBonus', label: 'Clean Streak Bonus', description: '30-day streak with no late returns' },
    { key: 'latePenalty', label: 'Late Return Penalty', description: 'Books returned after the due date' },
    { key: 'lostBookPenalty', label: 'Lost Book Penalty', description: 'Books marked as lost' },
    { key: 'unpaidFinePenalty', label: 'Unpaid Fine Penalty', description: 'Fines unpaid for 14+ days' },
    { key: 'patternPenalty', label: 'Pattern Penalty', description: '3+ consecutive late returns' },
];

const SCORING_RULES = {
    positive: [
        { icon: CheckCircle2, label: 'Early return', value: '+7 pts', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
        { icon: Clock, label: 'On-time return', value: '+5 pts', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
        { icon: Zap, label: 'Clean 30-day streak', value: '+10 pts', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    ],
    penalties: [
        { icon: AlertCircle, label: '1–3 days late', value: '-5 pts', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        { icon: AlertCircle, label: '4–7 days late', value: '-10 pts', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        { icon: AlertCircle, label: '7+ days late', value: '-15 pts', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        { icon: XCircle, label: 'Lost book', value: '-25 pts', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        { icon: XCircle, label: 'Unpaid fine 14+ days', value: '-10 pts', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        { icon: XCircle, label: '3+ consecutive late', value: '-20 pts', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    ],
};

const GENRE_BAR: Record<string, string> = {
    'Self-Help': 'bg-blue-500',
    'Fiction': 'bg-purple-500',
    'History': 'bg-amber-500',
    'Technology': 'bg-green-500',
    'Psychology': 'bg-rose-500',
};

const GENRE_BADGE: Record<string, string> = {
    'Self-Help': 'bg-blue-100 text-blue-700',
    'Fiction': 'bg-purple-100 text-purple-700',
    'History': 'bg-amber-100 text-amber-700',
    'Technology': 'bg-green-100 text-green-700',
    'Psychology': 'bg-rose-100 text-rose-700',
};

function ScoreGauge({ score, tier }: { score: number; tier: string }) {
    const r = 45;
    const cx = 60;
    const cy = 60;
    const circumference = 2 * Math.PI * r;
    const filled = circumference * 0.75 * (score / 100);
    const color = (TIER_COLORS[tier] || TIER_COLORS.BRONZE).stroke;

    return (
        <svg viewBox="0 0 120 120" className="w-44 h-44">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="9"
                strokeDasharray={`${circumference * 0.75} ${circumference}`}
                strokeLinecap="round" transform={`rotate(135, ${cx}, ${cy})`} />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="9"
                strokeDasharray={`${filled} ${circumference}`}
                strokeLinecap="round" transform={`rotate(135, ${cx}, ${cy})`} />
            <text x={cx} y={cy - 5} textAnchor="middle" fill={color} fontSize="28" fontWeight="bold">{score}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#9ca3af" fontSize="11">out of 100</text>
        </svg>
    );
}

function ScorePageSkeleton() {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-64 mb-8" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-6">
                    <div className="w-44 h-44 rounded-full bg-gray-200 mx-auto mb-4" />
                    <div className="h-6 bg-gray-200 rounded w-24 mx-auto mb-4" />
                    <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                                <div className="h-4 bg-gray-200 rounded w-40" />
                                <div className="h-6 bg-gray-200 rounded w-16" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function StudentScorePage() {
    const [scoreData, setScoreData] = useState<ScoreData | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiExplanation, setAiExplanation] = useState<AIScoreExplanation | null>(null);
    const [aiExplanationLoading, setAiExplanationLoading] = useState(true);
    const [aiExplanationKey, setAiExplanationKey] = useState(0);
    const [genreDNA, setGenreDNA] = useState<GenreDNA | null>(null);
    const [genreDNALoading, setGenreDNALoading] = useState(true);

    useEffect(() => {
        const fetchScore = async () => {
            try {
                const { data } = await api.get('/scores/my-score');
                if (data.success) setScoreData(data);
            } catch {
                toast.error('Failed to load your score');
            } finally {
                setLoading(false);
            }
        };
        fetchScore();
    }, []);

    useEffect(() => {
        const fetchAIExplanation = async () => {
            setAiExplanationLoading(true);
            setAiExplanation(null);
            try {
                const { data } = await api.get('/ai/score-explanation', {
                    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
                });
                if (data.success) setAiExplanation(data);
            } catch {
                // silently fail — non-critical AI section
            } finally {
                setAiExplanationLoading(false);
            }
        };
        fetchAIExplanation();
    }, [aiExplanationKey]);

    useEffect(() => {
        const fetchGenreDNA = async () => {
            try {
                const { data } = await api.get('/ai/genre-dna', {
                    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
                });
                if (data.success) setGenreDNA(data);
            } catch {
                // silently fail — non-critical AI section
            } finally {
                setGenreDNALoading(false);
            }
        };
        fetchGenreDNA();
    }, []);

    if (loading) return <ScorePageSkeleton />;

    if (!scoreData) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center py-20">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">Score data unavailable</p>
                    <p className="text-sm text-gray-500 mt-1">Borrow your first book to start building your score!</p>
                </div>
            </div>
        );
    }

    const tierInfo = TIER_COLORS[scoreData.tier] || TIER_COLORS.BRONZE;
    const tierRange = TIER_RANGES[scoreData.tier] || TIER_RANGES.BRONZE;
    const tierProgress = Math.min(100, Math.round(((scoreData.score - tierRange.start) / (tierRange.end - tierRange.start)) * 100));

    const totalBreakdown = Object.values(scoreData.breakdown).reduce((a, b) => a + b, 0);

    const sortedGenres = genreDNA?.genreBreakdown
        ? Object.entries(genreDNA.genreBreakdown).sort(([, a], [, b]) => b - a)
        : [];

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                        <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">My Reader Score</h1>
                </div>
                <p className="text-gray-500 ml-13">Your library performance at a glance</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Gauge card */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center">
                    <ScoreGauge score={scoreData.score} tier={scoreData.tier} />

                    <span className={`mt-3 inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border ${tierInfo.badge}`}>
                        {tierInfo.label}
                    </span>

                    {/* Progress to next tier */}
                    <div className="w-full mt-5">
                        {scoreData.tier !== 'PLATINUM' && scoreData.nextTier ? (
                            <>
                                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                                    <span className="font-medium">→ {scoreData.nextTier}</span>
                                    <span>{scoreData.pointsToNextTier} pts needed</span>
                                </div>
                                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${tierInfo.bar}`}
                                        style={{ width: `${tierProgress}%` }}
                                    />
                                </div>
                                <p className="text-center text-xs text-gray-400 mt-2">{tierProgress}% of the way there</p>
                            </>
                        ) : (
                            <div className="text-center">
                                <p className="text-sm font-semibold text-purple-600">🎉 Max tier reached!</p>
                                <p className="text-xs text-gray-400 mt-1">You're in the top tier</p>
                            </div>
                        )}
                    </div>

                    {/* Tier ladder */}
                    <div className="w-full mt-5 pt-5 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tier Ladder</p>
                        <div className="space-y-2">
                            {(['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'] as const).map((t) => {
                                const tc = TIER_COLORS[t];
                                const isActive = t === scoreData.tier;
                                return (
                                    <div key={t} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium ${isActive ? `${tc.badge} border` : 'text-gray-400'}`}>
                                        <span>{tc.label}</span>
                                        <span className="opacity-70">
                                            {t === 'BRONZE' ? '0–39' : t === 'SILVER' ? '40–59' : t === 'GOLD' ? '60–79' : '80+'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right column */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Stats grid */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Star className="w-4 h-4 text-gray-500" />
                            <h2 className="text-base font-bold text-gray-900">Loan Statistics</h2>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Total Loans', value: scoreData.stats.totalLoans, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Early Returns', value: scoreData.stats.earlyReturns, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                                { label: 'On-Time', value: scoreData.stats.onTimeReturns, icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
                                { label: 'Late Returns', value: scoreData.stats.lateReturns, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
                                { label: 'Lost Books', value: scoreData.stats.lostBooks, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
                                { label: 'Consec. Late', value: scoreData.stats.consecutiveLate, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
                            ].map(stat => (
                                <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center`}>
                                    <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
                                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                                    <p className="text-xs text-gray-500 leading-tight">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Score breakdown */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="w-4 h-4 text-gray-500" />
                            <h2 className="text-base font-bold text-gray-900">Score Breakdown</h2>
                        </div>
                        <div className="space-y-1">
                            {BREAKDOWN_META.map((item, idx) => {
                                const value = scoreData.breakdown[item.key];
                                const isPositive = value >= 0;
                                const isZero = value === 0;
                                return (
                                    <div
                                        key={item.key}
                                        className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{item.label}</p>
                                            <p className="text-xs text-gray-400">{item.description}</p>
                                        </div>
                                        <span className={`text-sm font-bold min-w-13 text-right ${isZero ? 'text-gray-400' : isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                            {value > 0 ? '+' : ''}{value}
                                        </span>
                                    </div>
                                );
                            })}
                            <div className="flex items-center justify-between py-3 px-3 mt-2 border-t-2 border-gray-200">
                                <p className="text-sm font-bold text-gray-900">Total Score</p>
                                <span className="text-lg font-bold" style={{ color: tierInfo.stroke }}>
                                    {totalBreakdown}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* How scoring works */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-2 mb-5">
                    <Info className="w-4 h-4 text-gray-500" />
                    <h2 className="text-base font-bold text-gray-900">How Scoring Works</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Points you earn
                        </p>
                        <div className="space-y-2">
                            {SCORING_RULES.positive.map((rule) => (
                                <div key={rule.label} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${rule.bg} ${rule.border}`}>
                                    <div className="flex items-center gap-2">
                                        <rule.icon className={`w-4 h-4 ${rule.color}`} />
                                        <span className="text-sm text-gray-700">{rule.label}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${rule.color}`}>{rule.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" /> Penalties applied
                        </p>
                        <div className="space-y-2">
                            {SCORING_RULES.penalties.map((rule) => (
                                <div key={rule.label} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${rule.bg} ${rule.border}`}>
                                    <div className="flex items-center gap-2">
                                        <rule.icon className={`w-4 h-4 ${rule.color}`} />
                                        <span className="text-sm text-gray-700">{rule.label}</span>
                                    </div>
                                    <span className={`text-sm font-bold ${rule.color}`}>{rule.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-4 text-center">
                    Scores are recalculated automatically after each loan activity. Scores are capped at 100.
                </p>
            </div>

            {/* AI Score Explanation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <h2 className="text-base font-bold text-gray-900">AI Score Explanation</h2>
                    </div>
                    <button
                        onClick={() => setAiExplanationKey(k => k + 1)}
                        disabled={aiExplanationLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${aiExplanationLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {aiExplanationLoading ? (
                    <div className="space-y-3 animate-pulse">
                        <div className="h-10 bg-green-100 rounded-lg w-full" />
                        <div className="space-y-2 py-2">
                            <div className="h-4 bg-gray-200 rounded w-full" />
                            <div className="h-4 bg-gray-200 rounded w-5/6" />
                            <div className="h-4 bg-gray-200 rounded w-4/6" />
                        </div>
                        <div className="h-10 bg-blue-100 rounded-lg w-full" />
                    </div>
                ) : aiExplanation ? (
                    <div className="space-y-4">
                        {aiExplanation.highlight ? (
                            <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                <p className="text-sm font-medium text-green-800">{aiExplanation.highlight}</p>
                            </div>
                        ) : null}

                        {aiExplanation.explanation ? (
                            <p className="text-sm text-gray-700 leading-relaxed px-1">{aiExplanation.explanation}</p>
                        ) : null}

                        {aiExplanation.tip ? (
                            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                                <Zap className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-sm font-medium text-blue-800">{aiExplanation.tip}</p>
                            </div>
                        ) : null}

                        {!aiExplanation.highlight && !aiExplanation.explanation && !aiExplanation.tip && (
                            <p className="text-sm text-gray-400 text-center py-4">
                                Borrow and return books to generate your personalised score explanation.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <Award className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">AI explanation unavailable</p>
                    </div>
                )}

                <p className="text-xs text-gray-400 mt-4 text-right">✨ AI Powered by Groq</p>
            </div>

            {/* Reading DNA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-5">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-base font-bold text-gray-900">Your Reading DNA</h2>
                </div>

                {genreDNALoading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-64 mb-1" />
                        <div className="h-4 bg-gray-200 rounded w-full" />
                        <div className="h-4 bg-gray-200 rounded w-4/5" />
                        <div className="space-y-3 pt-2">
                            {[0, 1, 2].map(i => (
                                <div key={i}>
                                    <div className="flex justify-between mb-1">
                                        <div className="h-3 bg-gray-200 rounded w-20" />
                                        <div className="h-3 bg-gray-200 rounded w-8" />
                                    </div>
                                    <div className="h-2.5 bg-gray-200 rounded-full w-full" />
                                </div>
                            ))}
                        </div>
                        <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto" />
                    </div>
                ) : genreDNA ? (
                    <>
                        {/* Personality heading */}
                        <div className="mb-4">
                            <h3 className="text-2xl font-bold text-gray-900">
                                {genreDNA.emoji} {genreDNA.personalityType}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{genreDNA.description}</p>
                        </div>

                        {/* Genre breakdown bars */}
                        {sortedGenres.length > 0 && (
                            <div className="space-y-3 mb-5">
                                {sortedGenres.map(([genre, pct]) => {
                                    const barColor = GENRE_BAR[genre] || 'bg-gray-400';
                                    const badgeColor = GENRE_BADGE[genre] || 'bg-gray-100 text-gray-600';
                                    return (
                                        <div key={genre}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColor}`}>
                                                    {genre}
                                                </span>
                                                <span className="text-xs font-bold text-gray-600">{pct}%</span>
                                            </div>
                                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${barColor}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Insight quote */}
                        {genreDNA.insight ? (
                            <p className="text-sm text-gray-500 italic border-l-2 border-indigo-200 pl-3">
                                "{genreDNA.insight}"
                            </p>
                        ) : null}
                    </>
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">Reading DNA unavailable</p>
                        <p className="text-xs mt-1">Borrow more books to unlock your reading personality</p>
                    </div>
                )}

                <p className="text-xs text-gray-400 mt-4 text-right">✨ AI Powered by Groq</p>
            </div>
        </div>
    );
}
