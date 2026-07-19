'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Book } from '@/lib/type';
import { StarRating } from '@/components/shared/StarRating';
import { Library, Search, BookOpen } from 'lucide-react';

const GENRES = [
    'Fiction', 'Non-Fiction', 'Self-Help', 'History', 'Technology',
    'Psychology', 'Science', 'Biography', 'Mystery', 'Other',
];

export default function StudentBooksPage() {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [genre, setGenre] = useState('');
    const [availableOnly, setAvailableOnly] = useState(false);
    const [sort, setSort] = useState('title');

    const fetchBooks = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = { sort };
            if (search) params.search = search;
            if (genre) params.genre = genre;
            if (availableOnly) params.available = 'true';

            const { data } = await api.get('/books', { params });
            if (data.success) setBooks(data.books);
        } catch {
            toast.error('Failed to load books');
        } finally {
            setLoading(false);
        }
    }, [search, genre, availableOnly, sort]);

    useEffect(() => {
        const timeout = setTimeout(fetchBooks, 300);
        return () => clearTimeout(timeout);
    }, [fetchBooks]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center shrink-0">
                        <Library className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Browse Books</h1>
                        <p className="text-muted-foreground">Explore the full library catalog</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-lg border border-border p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by title, author, or ISBN..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent transition outline-none"
                        />
                    </div>
                    <select
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="px-3 py-2.5 border border-border rounded-md bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                    >
                        <option value="">All Genres</option>
                        {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="px-3 py-2.5 border border-border rounded-md bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                    >
                        <option value="title">Sort: Title</option>
                        <option value="newest">Sort: Newest</option>
                        <option value="rating">Sort: Highest Rated</option>
                    </select>
                    <label className="flex items-center gap-2 px-3 py-2.5 border border-border rounded-md text-sm text-foreground cursor-pointer whitespace-nowrap">
                        <input
                            type="checkbox"
                            checked={availableOnly}
                            onChange={(e) => setAvailableOnly(e.target.checked)}
                            className="rounded border-border"
                        />
                        Available only
                    </label>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-card rounded-lg border border-border p-5 animate-pulse space-y-3">
                            <div className="h-5 bg-muted rounded w-3/4" />
                            <div className="h-4 bg-muted rounded w-1/2" />
                            <div className="h-4 bg-muted rounded w-1/3" />
                        </div>
                    ))}
                </div>
            ) : books.length === 0 ? (
                <div className="bg-card rounded-lg border border-border p-12 text-center">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-1">No books found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {books.map((book) => (
                        <Link
                            key={book.id}
                            href={`/student/books/${book.id}`}
                            className="bg-card rounded-lg border border-border p-5 hover:border-primary/40 hover:shadow-sm transition-all flex flex-col"
                        >
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-bold text-foreground leading-tight">{book.title}</h3>
                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${book.availableCopies > 0
                                    ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                    }`}>
                                    {book.availableCopies > 0 ? 'Available' : 'Unavailable'}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">by {book.author}</p>
                            <div className="flex items-center gap-2 mb-3">
                                <StarRating value={book.avgRating} readOnly size={16} />
                                <span className="text-xs text-muted-foreground">
                                    {book.reviewCount > 0 ? `${book.avgRating.toFixed(1)} (${book.reviewCount})` : 'No reviews yet'}
                                </span>
                            </div>
                            <span className="mt-auto inline-flex items-center self-start px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                                {book.genre}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
