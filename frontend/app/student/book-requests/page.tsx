'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { BookMarked, BookOpen } from 'lucide-react';
import type { BookRequest } from '@/lib/type';

const GENRES = [
    'Fiction', 'Non-Fiction', 'Self-Help', 'History', 'Technology',
    'Psychology', 'Science', 'Biography', 'Mystery', 'Other',
];

function statusBadgeClass(status: string) {
    if (status === 'PENDING') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (status === 'APPROVED') return 'bg-green-100 text-green-700 border-green-200';
    return 'bg-red-100 text-red-700 border-red-200';
}

export default function StudentBookRequestsPage() {
    const [requests, setRequests] = useState<BookRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [genre, setGenre] = useState('');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        try {
            const { data } = await api.get('/book-requests/my-requests');
            if (data.success) setRequests(data.requests);
        } catch {
            toast.error('Failed to load your requests');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await api.post('/book-requests', {
                title, author,
                genre: genre || undefined,
                reason: reason || undefined,
            });
            toast.success('Book request submitted successfully');
            setTitle(''); setAuthor(''); setGenre(''); setReason('');
            await fetchRequests();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                    <BookMarked className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Request a Book</h1>
                    <p className="text-sm text-muted-foreground">Can't find a book in the library? Ask us to add it.</p>
                </div>
            </div>

            {/* Form */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base">Submit a New Request</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">
                                    Book Title <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="title" required value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Atomic Habits"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="author">
                                    Author <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="author" required value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    placeholder="e.g. James Clear"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Genre</Label>
                            <Select value={genre || 'NONE'} onValueChange={(v) => setGenre(v === 'NONE' ? '' : v)}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Select genre (optional)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">No genre</SelectItem>
                                    {GENRES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reason">Why do you want this book?</Label>
                            <textarea
                                id="reason"
                                rows={4}
                                placeholder="Tell us why you'd like this book..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <Button type="submit" disabled={submitting} className="gap-2">
                            {submitting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <BookMarked className="w-4 h-4" />
                                    Submit Request
                                </>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* My requests */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        My Requests
                        <Badge variant="secondary" className="text-xs">{requests.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-3 w-1/3" />
                                </div>
                            ))}
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                                <BookOpen className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-muted-foreground">
                                No requests yet. Submit your first request above!
                            </p>
                        </div>
                    ) : (
                        <div>
                            {requests.map((req, idx) => (
                                <div key={req.id}>
                                    <div className="py-4 flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            <p className="font-bold text-sm wrap-break-word">{req.title}</p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm text-muted-foreground truncate">{req.author}</span>
                                                {req.genre && <Badge variant="secondary" className="text-xs">{req.genre}</Badge>}
                                                <Badge className={`${statusBadgeClass(req.status)} hover:${statusBadgeClass(req.status)} text-xs`}>
                                                    {req.status}
                                                </Badge>
                                            </div>

                                            {req.adminNote && req.status === 'APPROVED' && (
                                                <blockquote className="bg-green-50 border border-green-200 rounded-md px-3 py-2 text-sm text-green-800">
                                                    Admin note: {req.adminNote}
                                                </blockquote>
                                            )}
                                            {req.adminNote && req.status === 'REJECTED' && (
                                                <blockquote className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-800">
                                                    Reason: {req.adminNote}
                                                </blockquote>
                                            )}

                                            {req.reviewedAt && (
                                                <p className="text-xs text-muted-foreground">
                                                    Reviewed on {new Date(req.reviewedAt).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground text-right flex-shrink-0">
                                            {new Date(req.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    {idx < requests.length - 1 && <Separator />}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
