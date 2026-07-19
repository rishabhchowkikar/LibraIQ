'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Book, Review } from '@/lib/type';
import { StarRating } from '@/components/shared/StarRating';
import {
    BookOpen, Calendar, Globe, User as UserIcon, Trash2, MessageSquare,
} from 'lucide-react';

export default function StudentBookDetailPage() {
    const { id } = useParams<{ id: string }>();

    const [book, setBook] = useState<Book | null>(null);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewsTotal, setReviewsTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [myReview, setMyReview] = useState<Review | null>(null);
    const [eligible, setEligible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [reserving, setReserving] = useState(false);

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [bookRes, reviewsRes, myReviewsRes, loansRes] = await Promise.all([
                api.get(`/books/${id}`),
                api.get(`/reviews/${id}`, { params: { page } }),
                api.get('/reviews/my-reviews'),
                api.get('/loans/my-loans'),
            ]);

            if (bookRes.data.success) setBook(bookRes.data.book);
            if (reviewsRes.data.success) {
                setReviews(reviewsRes.data.reviews);
                setReviewsTotal(reviewsRes.data.total);
                setPages(reviewsRes.data.pages);
            }

            const mine = myReviewsRes.data.reviews?.find((r: Review) => r.bookId === id) || null;
            setMyReview(mine);
            if (mine) {
                setRating(mine.rating);
                setComment(mine.comment || '');
            }

            const hasReturnedLoan = loansRes.data.loans?.some(
                (l: { bookId: string; returnedAt?: string }) => l.bookId === id && l.returnedAt
            );
            setEligible(!!hasReturnedLoan);
        } catch {
            toast.error('Failed to load book details');
        } finally {
            setLoading(false);
        }
    }, [id, page]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleReserve = async () => {
        setReserving(true);
        try {
            const { data } = await api.post('/reservations', { bookId: id });
            toast.success(data.message || 'Reservation created');
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to reserve book');
        } finally {
            setReserving(false);
        }
    };

    const handleSubmitReview = async () => {
        if (rating === 0) {
            toast.error('Please select a star rating');
            return;
        }
        setSubmitting(true);
        try {
            await api.post(`/reviews/${id}`, { rating, comment: comment || undefined });
            toast.success(myReview ? 'Review updated' : 'Review submitted');
            await fetchAll();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to save review');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteReview = async () => {
        if (!myReview) return;
        try {
            await api.delete(`/reviews/${myReview.id}`);
            toast.success('Review deleted');
            setMyReview(null);
            setRating(0);
            setComment('');
            await fetchAll();
        } catch {
            toast.error('Failed to delete review');
        }
    };

    if (loading || !book) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-40 bg-muted rounded-lg" />
                    <div className="h-64 bg-muted rounded-lg" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Book header */}
            <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-28 h-36 bg-primary/10 rounded-md flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                        <BookOpen className="w-10 h-10 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-foreground">{book.title}</h1>
                        <p className="text-muted-foreground mb-3">by {book.author}</p>

                        <div className="flex items-center gap-2 mb-3">
                            <StarRating value={book.avgRating} readOnly size={18} />
                            <span className="text-sm text-muted-foreground">
                                {book.reviewCount > 0 ? `${book.avgRating.toFixed(1)} (${book.reviewCount} review${book.reviewCount !== 1 ? 's' : ''})` : 'No reviews yet'}
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                            <span className="inline-flex items-center gap-1"><Globe className="w-4 h-4" /> {book.language}</span>
                            {book.year && <span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4" /> {book.year}</span>}
                            <span className="px-2 py-0.5 rounded-full bg-muted border border-border">{book.genre}</span>
                        </div>

                        {book.description && (
                            <p className="text-sm text-foreground/80 leading-relaxed mb-4">{book.description}</p>
                        )}

                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1.5 rounded-md text-sm font-semibold ${book.availableCopies > 0
                                ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                }`}>
                                {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Currently unavailable'}
                            </span>
                            {book.availableCopies === 0 && (
                                <button
                                    onClick={handleReserve}
                                    disabled={reserving}
                                    className="px-4 py-2 rounded-md font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                >
                                    {reserving ? 'Reserving...' : 'Reserve'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Review form */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-bold text-foreground mb-4">
                    {myReview ? 'Your Review' : 'Write a Review'}
                </h2>

                {!eligible ? (
                    <p className="text-sm text-muted-foreground">
                        Borrow and return this book to leave a review.
                    </p>
                ) : (
                    <div className="space-y-3">
                        <StarRating value={rating} onChange={setRating} size={28} />
                        <textarea
                            rows={3}
                            placeholder="Share your thoughts on this book (optional)..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleSubmitReview}
                                disabled={submitting}
                                className="px-4 py-2 rounded-md font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                                {submitting ? 'Saving...' : myReview ? 'Update Review' : 'Submit Review'}
                            </button>
                            {myReview && (
                                <button
                                    onClick={handleDeleteReview}
                                    className="px-4 py-2 rounded-md font-medium text-sm border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Reviews list */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" /> Reviews
                    <span className="text-sm font-normal text-muted-foreground">({reviewsTotal})</span>
                </h2>

                {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No reviews yet — be the first!</p>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((r) => (
                            <div key={r.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                        <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                        {r.student?.name || 'Anonymous'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(r.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <StarRating value={r.rating} readOnly size={14} />
                                {r.comment && <p className="text-sm text-foreground/80 mt-2">{r.comment}</p>}
                            </div>
                        ))}
                    </div>
                )}

                {pages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 rounded-md text-sm border border-border disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
                        <button
                            onClick={() => setPage((p) => Math.min(pages, p + 1))}
                            disabled={page === pages}
                            className="px-3 py-1.5 rounded-md text-sm border border-border disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
