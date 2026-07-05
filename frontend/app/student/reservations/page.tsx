'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Book, Reservation } from '@/lib/type';
import {
    BookMarked, Search, Clock, XCircle, CheckCircle2,
    AlertCircle, Users, BellRing,
} from 'lucide-react';

function statusConfig(status: Reservation['status']) {
    switch (status) {
        case 'PENDING':
            return { bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400', icon: Clock, label: 'Waiting in queue' };
        case 'NOTIFIED':
            return { bg: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400', icon: BellRing, label: 'Available now' };
        case 'FULFILLED':
            return { bg: 'bg-primary/10 text-primary', icon: CheckCircle2, label: 'Fulfilled' };
        case 'EXPIRED':
            return { bg: 'bg-muted text-muted-foreground', icon: XCircle, label: 'Expired' };
        default:
            return { bg: 'bg-muted text-muted-foreground', icon: XCircle, label: 'Cancelled' };
    }
}

export default function StudentReservationsPage() {
    const [books, setBooks] = useState<Book[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [reservingId, setReservingId] = useState<string | null>(null);
    const [cancellingId, setCancellingId] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [booksRes, reservationsRes] = await Promise.all([
                api.get('/books'),
                api.get('/reservations/my-reservations'),
            ]);
            if (booksRes.data.success) setBooks(booksRes.data.books);
            if (reservationsRes.data.success) setReservations(reservationsRes.data.reservation);
        } catch {
            toast.error('Failed to load reservations');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const activeReservationBookIds = new Set(
        reservations.filter(r => r.status === 'PENDING' || r.status === 'NOTIFIED').map(r => r.bookId)
    );

    const unavailableBooks = books.filter(b => b.availableCopies === 0);
    const filteredUnavailable = unavailableBooks.filter(b =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase())
    );

    const handleReserve = async (book: Book) => {
        setReservingId(book.id);
        try {
            const { data } = await api.post('/reservations', { bookId: book.id });
            toast.success(data.message || 'Reservation created');
            await fetchAll();
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to reserve book');
        } finally {
            setReservingId(null);
        }
    };

    const handleCancel = async (id: string) => {
        setCancellingId(id);
        try {
            await api.delete(`/reservations/${id}`);
            toast.success('Reservation cancelled');
            await fetchAll();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to cancel reservation');
        } finally {
            setCancellingId(null);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-12 w-64 bg-muted rounded-md" />
                    <div className="h-40 bg-muted rounded-lg" />
                    <div className="h-40 bg-muted rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center shrink-0">
                        <BookMarked className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Reservations</h1>
                        <p className="text-muted-foreground">Reserve books that are currently checked out</p>
                    </div>
                </div>
            </div>

            {/* Browse unavailable books */}
            <div className="bg-card rounded-lg border border-border p-6 mb-8">
                <h2 className="text-xl font-bold text-foreground mb-4">Books Currently Unavailable</h2>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by title or author..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition outline-none"
                    />
                </div>

                {filteredUnavailable.length === 0 ? (
                    <div className="text-center py-10">
                        <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium text-sm">
                            {search ? 'No matching unavailable books' : 'All books are currently available — nothing to reserve!'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredUnavailable.map((book) => {
                            const alreadyReserved = activeReservationBookIds.has(book.id);
                            return (
                                <div key={book.id} className="flex items-center justify-between gap-4 border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-foreground truncate">{book.title}</p>
                                        <p className="text-sm text-muted-foreground">by {book.author} · {book.genre}</p>
                                    </div>
                                    <button
                                        onClick={() => handleReserve(book)}
                                        disabled={alreadyReserved || reservingId === book.id}
                                        className="px-4 py-2 rounded-md font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
                                    >
                                        {alreadyReserved ? 'Already Reserved' : reservingId === book.id ? 'Reserving...' : 'Reserve'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* My Reservations */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-xl font-bold text-foreground mb-6">My Reservations</h2>

                {reservations.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookMarked className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-foreground font-medium mb-1">No reservations yet</p>
                        <p className="text-sm text-muted-foreground">Reserve an unavailable book above to join the queue</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reservations.map((res) => {
                            const config = statusConfig(res.status);
                            const StatusIcon = config.icon;
                            const canCancel = res.status === 'PENDING' || res.status === 'NOTIFIED';
                            const hoursLeft = res.status === 'NOTIFIED'
                                ? Math.max(0, Math.ceil((new Date(res.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))
                                : null;

                            return (
                                <div key={res.id} className="border border-border rounded-lg p-5">
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-foreground truncate">{res.book?.title}</h3>
                                            <p className="text-sm text-muted-foreground mb-3">by {res.book?.author}</p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`px-3 py-1 rounded-md font-semibold text-xs flex items-center gap-1.5 ${config.bg}`}>
                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                    {config.label}
                                                </span>
                                                {res.status === 'NOTIFIED' && hoursLeft !== null && (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        {hoursLeft > 0 ? `${hoursLeft}h left to borrow` : 'Expiring soon'}
                                                    </span>
                                                )}
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    Reserved {new Date(res.reservedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        {canCancel && (
                                            <button
                                                onClick={() => handleCancel(res.id)}
                                                disabled={cancellingId === res.id}
                                                className="px-4 py-2 rounded-md font-medium text-sm border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors whitespace-nowrap"
                                            >
                                                {cancellingId === res.id ? 'Cancelling...' : 'Cancel'}
                                            </button>
                                        )}
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
