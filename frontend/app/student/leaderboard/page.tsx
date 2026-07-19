'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { LeaderboardEntry } from '@/lib/type';
import { Trophy, Medal, Flame, Users } from 'lucide-react';

const tierDot: Record<string, string> = {
    BRONZE: 'bg-[var(--bronze)]',
    SILVER: 'bg-[var(--silver)]',
    GOLD: 'bg-[var(--gold)]',
    PLATINUM: 'bg-[var(--platinum)]',
};

const rankStyle = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400 border-yellow-200';
    if (rank === 2) return 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200';
    if (rank === 3) return 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200';
    return 'bg-muted text-muted-foreground border-border';
};

export default function StudentLeaderboardPage() {
    const { user } = useAuthStore();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/reading-stats/leaderboard')
            .then(({ data }) => { if (data.success) setLeaderboard(data.leaderboard); })
            .catch(() => toast.error('Failed to load leaderboard'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-12 w-64 bg-muted rounded-md" />
                    <div className="h-96 bg-muted rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center shrink-0">
                        <Trophy className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
                        <p className="text-muted-foreground">Top readers this year — opt in from Reading Stats</p>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
                {leaderboard.length === 0 ? (
                    <div className="text-center py-12">
                        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-foreground font-medium mb-1">No one on the leaderboard yet</p>
                        <p className="text-sm text-muted-foreground">
                            Opt in from the Reading Stats page to be the first!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {leaderboard.map((entry) => {
                            const isMe = entry.id === user?.id;
                            return (
                                <div
                                    key={entry.id}
                                    className={`flex items-center gap-4 p-4 rounded-lg border ${isMe ? 'border-primary/40 bg-primary/5' : 'border-border'
                                        }`}
                                >
                                    <span className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 ${rankStyle(entry.rank)}`}>
                                        {entry.rank <= 3 ? <Medal className="w-4 h-4" /> : entry.rank}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-foreground truncate">
                                            {entry.name} {isMe && <span className="text-xs text-primary font-normal">(you)</span>}
                                        </p>
                                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <span className={`w-1.5 h-1.5 rounded-full ${tierDot[entry.trustTier]}`} />
                                            {entry.trustTier}
                                        </span>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-bold text-foreground">{entry.booksThisYear} <span className="text-xs font-normal text-muted-foreground">books</span></p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                                            <Flame className="w-3 h-3" /> {entry.readingStreak} mo streak
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
