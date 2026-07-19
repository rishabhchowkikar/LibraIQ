'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Achievement, ReadingGoal, ReadingStats } from '@/lib/type';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell,
} from 'recharts';
import {
    Trophy, BookOpen, Flame, CheckCircle2, Target, Pencil, Lock, Users,
} from 'lucide-react';

const ACHIEVEMENTS_META: Record<string, { label: string; desc: string; emoji: string }> = {
    FIRST_BOOK: { label: 'First Chapter', desc: 'Borrowed your first book', emoji: '📖' },
    FIVE_BOOKS: { label: 'Bookworm', desc: 'Borrowed 5 books', emoji: '📚' },
    TEN_BOOKS: { label: 'Avid Reader', desc: 'Borrowed 10 books', emoji: '🎓' },
    TWENTY_FIVE_BOOKS: { label: 'Scholar', desc: 'Borrowed 25 books', emoji: '🏛️' },
    FIRST_EARLY: { label: 'Ahead of Schedule', desc: 'Returned a book early', emoji: '⚡' },
    NO_FINES: { label: 'Clean Record', desc: 'No fines ever', emoji: '✨' },
    PLATINUM_TIER: { label: 'Elite Member', desc: 'Reached Platinum tier', emoji: '💎' },
    STREAK_3: { label: 'Regular Reader', desc: 'Active 3 months in a row', emoji: '🔥' },
    STREAK_6: { label: 'Dedicated Reader', desc: 'Active 6 months in a row', emoji: '🌟' },
};

const GENRE_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ec4899'];

export default function StudentReadingStatsPage() {
    const [stats, setStats] = useState<ReadingStats | null>(null);
    const [goal, setGoal] = useState<ReadingGoal | null>(null);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingGoal, setEditingGoal] = useState(false);
    const [monthlyGoalInput, setMonthlyGoalInput] = useState(2);
    const [yearlyGoalInput, setYearlyGoalInput] = useState(12);
    const [savingGoal, setSavingGoal] = useState(false);

    const [showOnLeaderboard, setShowOnLeaderboard] = useState(false);
    const [savingVisibility, setSavingVisibility] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await api.get('/reading-stats');
            if (data.success) {
                setStats(data.stats);
                setGoal(data.goal);
                setAchievements(data.achievements);
                setMonthlyGoalInput(data.goal.monthlyGoal);
                setYearlyGoalInput(data.goal.yearlyGoal);
                setShowOnLeaderboard(data.showOnLeaderboard);

                (data.newAchievements || []).forEach((type: string) => {
                    const meta = ACHIEVEMENTS_META[type];
                    if (meta) toast.success(`${meta.emoji} Achievement unlocked: ${meta.label}!`, { description: meta.desc });
                });
            }
        } catch {
            toast.error('Failed to load reading stats');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const handleToggleLeaderboard = async (checked: boolean) => {
        setSavingVisibility(true);
        try {
            await api.patch('/reading-stats/leaderboard-visibility', { showOnLeaderboard: checked });
            setShowOnLeaderboard(checked);
            toast.success(checked ? 'You\'re now visible on the leaderboard' : 'Removed from the leaderboard');
        } catch {
            toast.error('Failed to update leaderboard visibility');
        } finally {
            setSavingVisibility(false);
        }
    };

    const handleSaveGoal = async () => {
        if (monthlyGoalInput < 1 || yearlyGoalInput < 1) {
            toast.error('Goals must be at least 1');
            return;
        }
        setSavingGoal(true);
        try {
            await api.put('/reading-stats/goal', { monthlyGoal: monthlyGoalInput, yearlyGoal: yearlyGoalInput });
            toast.success('Reading goals updated');
            setEditingGoal(false);
            await fetchStats();
        } catch {
            toast.error('Failed to update goals');
        } finally {
            setSavingGoal(false);
        }
    };

    if (loading || !stats || !goal) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-12 w-64 bg-muted rounded-md" />
                    <div className="h-32 bg-muted rounded-lg" />
                    <div className="h-64 bg-muted rounded-lg" />
                </div>
            </div>
        );
    }

    const earnedTypes = new Set(achievements.map(a => a.type));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center shrink-0">
                        <Trophy className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Reading Stats & Achievements</h1>
                        <p className="text-muted-foreground">Track your reading journey and unlock badges</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-muted-foreground">Total Books</p>
                        <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{stats.totalBooks}</p>
                </div>
                <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-muted-foreground">Reading Streak</p>
                        <div className="w-10 h-10 bg-orange-500/10 rounded-md flex items-center justify-center">
                            <Flame className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{stats.readingStreak} mo</p>
                </div>
                <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-muted-foreground">On-Time Rate</p>
                        <div className="w-10 h-10 bg-green-500/10 rounded-md flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{stats.onTimeRate}%</p>
                </div>
                <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-muted-foreground">Currently Reading</p>
                        <div className="w-10 h-10 bg-blue-500/10 rounded-md flex items-center justify-center">
                            <Target className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-foreground">{stats.currentlyReading.length}</p>
                </div>
            </div>

            {/* Goals */}
            <div className="bg-card rounded-lg border border-border p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-foreground">Reading Goals</h2>
                    {!editingGoal && (
                        <button
                            onClick={() => setEditingGoal(true)}
                            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                            <Pencil className="w-3.5 h-3.5" /> Edit Goals
                        </button>
                    )}
                </div>

                {editingGoal ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Monthly Goal</label>
                            <input
                                type="number" min={1} value={monthlyGoalInput}
                                onChange={(e) => setMonthlyGoalInput(Number(e.target.value))}
                                className="w-28 px-3 py-2 text-sm border border-border rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Yearly Goal</label>
                            <input
                                type="number" min={1} value={yearlyGoalInput}
                                onChange={(e) => setYearlyGoalInput(Number(e.target.value))}
                                className="w-28 px-3 py-2 text-sm border border-border rounded-md bg-background focus:ring-2 focus:ring-ring outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveGoal}
                                disabled={savingGoal}
                                className="px-4 py-2 rounded-md font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                                {savingGoal ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                onClick={() => setEditingGoal(false)}
                                className="px-4 py-2 rounded-md font-medium text-sm border border-border hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <div className="flex justify-between text-sm mb-1.5">
                                <span className="font-medium text-foreground">Monthly ({goal.booksThisMonth}/{goal.monthlyGoal})</span>
                                <span className="text-muted-foreground">{goal.monthlyProgress}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${goal.monthlyProgress}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1.5">
                                <span className="font-medium text-foreground">Yearly ({stats.booksThisYear}/{goal.yearlyGoal})</span>
                                <span className="text-muted-foreground">{goal.yearlyProgress}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${goal.yearlyProgress}%` }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Leaderboard opt-in */}
            <div className="bg-card rounded-lg border border-border p-6 mb-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="font-semibold text-foreground text-sm">Show me on the Leaderboard</p>
                        <p className="text-xs text-muted-foreground">Opt in to compare your reading stats with other students</p>
                    </div>
                </div>
                <button
                    onClick={() => handleToggleLeaderboard(!showOnLeaderboard)}
                    disabled={savingVisibility}
                    role="switch"
                    aria-checked={showOnLeaderboard}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 ${showOnLeaderboard ? 'bg-primary' : 'bg-muted'
                        }`}
                >
                    <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${showOnLeaderboard ? 'translate-x-5' : 'translate-x-0'
                            }`}
                    />
                </button>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-card rounded-lg border border-border p-6">
                    <h2 className="text-lg font-bold text-foreground mb-4">Monthly Activity — This Year</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={stats.monthlyStats}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="books" name="Books" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-card rounded-lg border border-border p-6">
                    <h2 className="text-lg font-bold text-foreground mb-4">Favorite Genres</h2>
                    {stats.favoriteGenres.length === 0 ? (
                        <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
                            No borrowing history yet
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={stats.favoriteGenres}
                                    dataKey="count"
                                    nameKey="genre"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    label={(props: any) => `${props.genre}: ${props.count}`}
                                >
                                    {stats.favoriteGenres.map((_, i) => (
                                        <Cell key={i} fill={GENRE_COLORS[i % GENRE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Achievements */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">Achievements</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(ACHIEVEMENTS_META).map(([type, meta]) => {
                        const earned = earnedTypes.has(type);
                        return (
                            <div
                                key={type}
                                className={`rounded-lg border p-4 text-center transition-colors ${earned
                                    ? 'border-primary/30 bg-primary/5'
                                    : 'border-border bg-muted/20 opacity-60'
                                    }`}
                            >
                                <div className="text-3xl mb-2">{earned ? meta.emoji : <Lock className="w-6 h-6 mx-auto text-muted-foreground" />}</div>
                                <p className="font-semibold text-sm text-foreground">{meta.label}</p>
                                <p className="text-xs text-muted-foreground mt-1">{meta.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
