'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
    TrendingUp, TrendingDown, Minus, RefreshCw,
    Search, Users, Star, Trophy, Eye, Sparkles, AlertTriangle,
    Award,
} from 'lucide-react';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';

interface StudentScore {
    student: { id: string; name: string; email: string; currentTier: string };
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

interface AISummary {
    student: { id: string; name: string };
    summary: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    riskReason: string;
    recommendation: string;
    fromCache: boolean;
}

interface RecomputeResult {
    upgraded: number;
    downgraded: number;
    unchanged: number;
    total: number;
}

const TIER_COLORS: Record<string, { badge: string; label: string; bar: string }> = {
    BRONZE: { badge: 'bg-orange-100 text-orange-700 border-orange-200', label: '🥉 BRONZE', bar: 'bg-orange-500' },
    SILVER: { badge: 'bg-slate-100 text-slate-700 border-slate-200', label: '🥈 SILVER', bar: 'bg-slate-500' },
    GOLD: { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: '🥇 GOLD', bar: 'bg-yellow-500' },
    PLATINUM: { badge: 'bg-purple-100 text-purple-700 border-purple-200', label: '💎 PLATINUM', bar: 'bg-purple-500' },
};

const RISK_COLORS: Record<string, { badge: string; label: string }> = {
    LOW: { badge: 'bg-green-100 text-green-700 border-green-200', label: 'LOW RISK' },
    MEDIUM: { badge: 'bg-amber-100 text-amber-700 border-amber-200', label: 'MEDIUM RISK' },
    HIGH: { badge: 'bg-red-100 text-red-700 border-red-200', label: 'HIGH RISK' },
};

function scoreColor(score: number) {
    if (score >= 80) return 'text-purple-700';
    if (score >= 60) return 'text-green-700';
    if (score >= 40) return 'text-amber-700';
    return 'text-red-700';
}

function scoreBarColor(score: number) {
    if (score >= 80) return 'bg-purple-500';
    if (score >= 60) return 'bg-green-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-red-500';
}

function TrendIcon({ score }: { score: number }) {
    if (score >= 70) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (score >= 40) return <Minus className="w-4 h-4 text-gray-400" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
}

function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-lg">🥇</span>;
    if (rank === 2) return <span className="text-lg">🥈</span>;
    if (rank === 3) return <span className="text-lg">🥉</span>;
    return <span className="text-sm font-bold text-gray-500">#{rank}</span>;
}

function AdminScoresSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="h-8 bg-gray-200 rounded w-40 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-64" />
                </div>
                <div className="h-10 bg-gray-200 rounded w-48" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {[0, 1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="h-7 bg-gray-200 rounded w-12 mb-1" />
                        <div className="h-3 bg-gray-200 rounded w-20" />
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-10 bg-gray-200 rounded mb-4" />
                {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-4 items-center py-4 border-b border-gray-100 last:border-0">
                        <div className="h-5 bg-gray-200 rounded w-8" />
                        <div className="h-5 bg-gray-200 rounded w-40" />
                        <div className="h-5 bg-gray-200 rounded w-24 ml-auto" />
                        <div className="h-6 bg-gray-200 rounded w-20" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AdminScoresPage() {
    const [scores, setScores] = useState<StudentScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [recomputing, setRecomputing] = useState(false);
    const [search, setSearch] = useState('');

    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<StudentScore | null>(null);
    const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        fetchScores();
    }, []);

    const fetchScores = async () => {
        try {
            const { data } = await api.get('/scores');
            if (data.success) setScores(data.scores);
        } catch {
            toast.error('Failed to load student scores');
        } finally {
            setLoading(false);
        }
    };

    const handleRecompute = async () => {
        setRecomputing(true);
        try {
            const { data } = await api.post('/scores/recompute');
            if (data.success) {
                const r: RecomputeResult = data.result;
                toast.success(
                    `Recomputed ${r.total} scores — ↑ ${r.upgraded} upgraded, ↓ ${r.downgraded} downgraded, ${r.unchanged} unchanged`
                );
                await fetchScores();
            }
        } catch {
            toast.error('Failed to recompute scores');
        } finally {
            setRecomputing(false);
        }
    };

    const fetchAISummary = async (entry: StudentScore) => {
        setAiSummary(null);
        setAiLoading(true);
        try {
            const { data } = await api.get(`/ai/student-summary/${entry.student.id}`);
            if (data.success) setAiSummary(data);
        } catch {
            toast.error('Failed to load AI summary');
        } finally {
            setAiLoading(false);
        }
    };

    const openSheet = (entry: StudentScore) => {
        setSelectedEntry(entry);
        setSheetOpen(true);
        fetchAISummary(entry);
    };

    const refreshAISummary = () => {
        if (selectedEntry) fetchAISummary(selectedEntry);
    };

    if (loading) return <AdminScoresSkeleton />;

    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const filtered = sorted.filter(s =>
        search.trim() === '' ||
        s.student.name.toLowerCase().includes(search.toLowerCase()) ||
        s.student.email.toLowerCase().includes(search.toLowerCase())
    );

    const totalStudents = scores.length;
    const avgScore = totalStudents > 0 ? Math.round(scores.reduce((s, r) => s + r.score, 0) / totalStudents) : 0;
    const tierCounts = scores.reduce<Record<string, number>>((acc, s) => {
        acc[s.tier] = (acc[s.tier] || 0) + 1;
        return acc;
    }, {});

    const selectedTierInfo = selectedEntry ? (TIER_COLORS[selectedEntry.tier] || TIER_COLORS.BRONZE) : null;

    return (
        <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Reader Scores</h1>
                            <p className="text-sm text-gray-500">Student library performance leaderboard</p>
                        </div>
                    </div>
                    <button
                        onClick={handleRecompute}
                        disabled={recomputing}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${recomputing ? 'animate-spin' : ''}`} />
                        {recomputing ? 'Recomputing…' : 'Recompute All Scores'}
                    </button>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Users className="w-3.5 h-3.5 text-gray-400" />
                            <p className="text-xs text-gray-500">Students</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Star className="w-3.5 h-3.5 text-gray-400" />
                            <p className="text-xs text-gray-500">Avg Score</p>
                        </div>
                        <p className={`text-2xl font-bold ${scoreColor(avgScore)}`}>{avgScore}</p>
                    </div>
                    {(['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'] as const).map(tier => {
                        const tc = TIER_COLORS[tier];
                        return (
                            <div key={tier} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                <p className="text-xs text-gray-500 mb-1">{tc.label}</p>
                                <p className={`text-2xl font-bold ${tc.badge.split(' ')[1]}`}>
                                    {tierCounts[tier] || 0}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Table card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    {/* Search */}
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or email…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-gray-50"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Rank</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Score</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tier</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Trend</th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">AI</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-16 text-gray-400">
                                            <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                                            <p className="font-medium">No students found</p>
                                            {search && <p className="text-xs mt-1">Try a different search term</p>}
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((entry) => {
                                        const globalRank = sorted.indexOf(entry) + 1;
                                        const tc = TIER_COLORS[entry.tier] || TIER_COLORS.BRONZE;
                                        return (
                                            <tr key={entry.student.id} className="hover:bg-gray-50 transition-colors">
                                                {/* Rank */}
                                                <td className="px-4 py-4 text-center">
                                                    <RankBadge rank={globalRank} />
                                                </td>

                                                {/* Student */}
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                                                            <span className="text-xs font-bold text-indigo-700">
                                                                {entry.student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-gray-900 truncate">{entry.student.name}</p>
                                                            <p className="text-xs text-gray-400 truncate">{entry.student.email}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Score bar */}
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-base font-bold w-8 shrink-0 ${scoreColor(entry.score)}`}>
                                                            {entry.score}
                                                        </span>
                                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${scoreBarColor(entry.score)}`}
                                                                style={{ width: `${entry.score}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Tier badge */}
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${tc.badge}`}>
                                                        {tc.label}
                                                    </span>
                                                </td>

                                                {/* Stats */}
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                                                            {entry.stats.totalLoans} loans
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                                            {entry.stats.onTimeReturns} on-time
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                                                            {entry.stats.lateReturns} late
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Trend */}
                                                <td className="px-4 py-4 text-center">
                                                    <TrendIcon score={entry.score} />
                                                </td>

                                                {/* AI Summary */}
                                                <td className="px-4 py-4 text-center">
                                                    <button
                                                        onClick={() => openSheet(entry)}
                                                        title="View AI Summary"
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-200 transition-colors"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {filtered.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 text-right">
                            Showing {filtered.length} of {totalStudents} students · Sorted by score
                        </div>
                    )}
                </div>
            </div>

            {/* AI Summary Sheet */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
                    <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
                        <SheetTitle className="text-lg font-bold text-gray-900">
                            {selectedEntry?.student.name}
                        </SheetTitle>
                        <SheetDescription asChild>
                            <div className="flex items-center gap-2 mt-1">
                                {selectedTierInfo && (
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${selectedTierInfo.badge}`}>
                                        {selectedTierInfo.label}
                                    </span>
                                )}
                                {selectedEntry && (
                                    <span className={`text-sm font-bold ${scoreColor(selectedEntry.score)}`}>
                                        Score: {selectedEntry.score}
                                    </span>
                                )}
                            </div>
                        </SheetDescription>
                    </SheetHeader>

                    <div className="px-6 py-5 space-y-5">
                        {/* Stats row */}
                        {selectedEntry && (
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Total Loans', value: selectedEntry.stats.totalLoans },
                                    { label: 'On-Time', value: selectedEntry.stats.onTimeReturns },
                                    { label: 'Late', value: selectedEntry.stats.lateReturns },
                                ].map(stat => (
                                    <div key={stat.label} className="text-center bg-gray-50 rounded-lg p-3">
                                        <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Divider */}
                        <div className="border-t border-gray-100" />

                        {/* AI Summary section */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-indigo-500" />
                                    <h3 className="text-sm font-bold text-gray-900">AI Behaviour Summary</h3>
                                </div>
                                <button
                                    onClick={refreshAISummary}
                                    disabled={aiLoading}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>

                            {aiLoading ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-16 bg-gray-100 rounded-lg" />
                                    <div className="h-8 bg-gray-100 rounded-lg w-32" />
                                    <div className="h-4 bg-gray-100 rounded w-full" />
                                    <div className="h-4 bg-gray-100 rounded w-4/5" />
                                    <div className="h-12 bg-blue-50 rounded-lg" />
                                </div>
                            ) : aiSummary ? (
                                <div className="space-y-4">
                                    {/* Summary paragraph */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <p className="text-sm text-gray-700 leading-relaxed">{aiSummary.summary}</p>
                                    </div>

                                    {/* Risk level */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-gray-400" />
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Risk Assessment</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${(RISK_COLORS[aiSummary.riskLevel] || RISK_COLORS.LOW).badge}`}>
                                                {(RISK_COLORS[aiSummary.riskLevel] || RISK_COLORS.LOW).label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 pl-1">{aiSummary.riskReason}</p>
                                    </div>

                                    {/* Recommendation */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">Recommendation</p>
                                        <p className="text-sm text-blue-800">{aiSummary.recommendation}</p>
                                    </div>

                                    {/* Cache indicator */}
                                    {aiSummary.fromCache && (
                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                                            Cached response
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400">
                                    <Award className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                    <p className="text-sm">AI summary unavailable</p>
                                </div>
                            )}

                            <p className="text-xs text-gray-400 mt-5 text-right">✨ AI Powered by Groq</p>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
