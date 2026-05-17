'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Book } from '@/lib/type';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Library, Plus, Search, Edit2, Trash2,
    BookOpen, Save, Hash,
    BookCopy, BookCheck,
} from 'lucide-react';
import { BooksTableSkeleton } from '@/components/shared/DashboardSkeleton';

const emptyForm = {
    title: '', author: '', isbn: '', genre: '',
    totalCopies: 1, description: '', language: 'English',
    publisher: '', year: new Date().getFullYear(),
};

export default function AdminBooksPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingBook, setEditingBook] = useState<Book | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);

    const fetchBooks = useCallback(async () => {
        try {
            const { data } = await api.get('/books');
            if (data.success) setBooks(data.books);
        } catch {
            toast.error('Failed to load books');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBooks(); }, [fetchBooks]);

    // Read URL params on mount — if ?update=true&book=<id>, open edit sheet
    useEffect(() => {
        const isUpdate = searchParams.get('update') === 'true';
        const bookId = searchParams.get('book');
        if (isUpdate && bookId && books.length > 0) {
            const target = books.find(b => b.id === bookId);
            if (target) openEdit(target, false);
        }
    }, [books, searchParams]);

    const filtered = books.filter(b =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase()) ||
        b.genre.toLowerCase().includes(search.toLowerCase())
    );

    const openAdd = () => {
        setEditingBook(null);
        setFormData(emptyForm);
        router.replace('/admin/books');
        setSheetOpen(true);
    };

    const openEdit = (book: Book, pushUrl = true) => {
        setEditingBook(book);
        setFormData({
            title: book.title,
            author: book.author,
            isbn: book.isbn || '',
            genre: book.genre,
            totalCopies: book.totalCopies,
            description: book.description || '',
            language: book.language,
            publisher: book.publisher || '',
            year: book.year || new Date().getFullYear(),
        });
        if (pushUrl) {
            router.replace(`/admin/books?update=true&book=${book.id}`);
        }
        setSheetOpen(true);
    };

    const closeSheet = () => {
        setSheetOpen(false);
        setEditingBook(null);
        router.replace('/admin/books');
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingBook) {
                await api.put(`/books/${editingBook.id}`, formData);
                toast.success('Book updated successfully');
            } else {
                await api.post('/books', formData);
                toast.success('Book added successfully');
            }
            await fetchBooks();
            closeSheet();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to save book');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id: string, title: string) => {
        toast(`Delete "${title}"?`, {
            description: 'This action cannot be undone.',
            action: {
                label: 'Delete',
                onClick: async () => {
                    try {
                        await api.delete(`/books/${id}`);
                        await fetchBooks();
                        toast.success('Book deleted');
                    } catch (err: any) {
                        toast.error(err.response?.data?.error || 'Failed to delete book');
                    }
                },
            },
            cancel: {
                label: 'Cancel',
                onClick: () => {},
            },
        });
    };

    const stats = [
        { label: 'Total Titles', value: books.length, icon: Hash, color: 'text-blue-600', bg: 'bg-blue-50', iconColor: 'text-blue-500' },
        { label: 'Total Copies', value: books.reduce((s, b) => s + b.totalCopies, 0), icon: BookCopy, color: 'text-violet-600', bg: 'bg-violet-50', iconColor: 'text-violet-500' },
        { label: 'Available Now', value: books.reduce((s, b) => s + b.availableCopies, 0), icon: BookCheck, color: 'text-emerald-600', bg: 'bg-emerald-50', iconColor: 'text-emerald-500' },
    ];

    if (loading) return <BooksTableSkeleton />;

    return (
        <div className="space-y-5 max-w-7xl">

            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                        <Library className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Books</h1>
                        <p className="text-sm text-muted-foreground">Manage your library inventory</p>
                    </div>
                </div>
                <Button onClick={openAdd} className="gap-2 cursor-pointer">
                    <Plus className="w-4 h-4" />
                    Add Book
                </Button>
            </div>

            {/* ── Stats ──────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3">
                {stats.map(({ label, value, icon: Icon, color, bg, iconColor }) => (
                    <Card key={label} className="shadow-none border border-border/60 p-0 h-fit">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                                        {label}
                                    </p>
                                    <p className={`text-3xl font-bold leading-none ${color}`}>{value}</p>
                                </div>
                                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                                    <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Search bar ─────────────────────────────────── */}
            <div className="px-4 py-3 border-b border-border/60">
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, author, or genre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 bg-muted/40 border-transparent focus:border-input focus:bg-background transition-colors"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <Library className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-muted-foreground">No books found</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                        {search ? 'Try a different search term' : 'Click "Add Book" to get started'}
                    </p>
                </div>
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent bg-muted/30">
                                <TableHead className="w-[40%] font-semibold text-xs uppercase tracking-wide">Book</TableHead>
                                <TableHead className="font-semibold text-xs uppercase tracking-wide">Genre</TableHead>
                                <TableHead className="text-center font-semibold text-xs uppercase tracking-wide">Total Copies</TableHead>
                                <TableHead className="text-center font-semibold text-xs uppercase tracking-wide">Available</TableHead>
                                <TableHead className="font-semibold text-xs uppercase tracking-wide">Year</TableHead>
                                <TableHead className="text-right font-semibold text-xs uppercase tracking-wide">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((book) => (
                                <TableRow key={book.id} className="group hover:bg-muted/30 transition-colors">
                                    <TableCell className="py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-11 bg-primary/8 rounded-md flex items-center justify-center shrink-0 border border-primary/10">
                                                <BookOpen className="w-4 h-4 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate max-w-60">{book.title}</p>
                                                <p className="text-xs text-muted-foreground">{book.author}</p>
                                                {book.isbn && (
                                                    <p className="text-[11px] text-muted-foreground/50 font-mono mt-0.5">{book.isbn}</p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-normal text-xs">
                                            {book.genre}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="font-semibold tabular-nums">{book.totalCopies}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                                                ${book.availableCopies > 0
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-red-100 text-red-600'
                                            }`}
                                        >
                                            {book.availableCopies}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm tabular-nums">
                                        {book.year || '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEdit(book)}
                                                className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(book.id, book.title)}
                                                className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="px-4 py-2.5 border-t border-border/60 bg-muted/20">
                        <p className="text-xs text-muted-foreground">
                            Showing <strong>{filtered.length}</strong> of <strong>{books.length}</strong> books
                        </p>
                    </div>
                </>
            )}

            {/* ── Add / Edit Sheet ────────────────────────────── */}
            <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet(); }}>
                <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">

                    <SheetHeader className="px-6 py-5 border-b border-border/60 shrink-0">
                        <div className="flex items-center gap-3">
                            <div>
                                <SheetTitle className="text-base">
                                    {editingBook ? 'Edit Book' : 'Add New Book'}
                                </SheetTitle>
                                <SheetDescription className="text-xs mt-0.5">
                                    {editingBook
                                        ? `Editing "${editingBook.title}"`
                                        : 'Fill in the details to add a new book'
                                    }
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <form id="book-form" onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="title" className="text-sm font-medium">
                                    Title <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    required
                                    placeholder="Book title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="author" className="text-sm font-medium">
                                    Author <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="author"
                                    required
                                    placeholder="Author name"
                                    value={formData.author}
                                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="genre" className="text-sm font-medium">
                                        Genre <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="genre"
                                        required
                                        placeholder="Fiction, Science..."
                                        value={formData.genre}
                                        onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="copies" className="text-sm font-medium">
                                        Total Copies <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="copies"
                                        type="number"
                                        min="1"
                                        required
                                        value={formData.totalCopies}
                                        onChange={(e) => setFormData({ ...formData, totalCopies: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="isbn" className="text-sm font-medium">ISBN</Label>
                                    <Input
                                        id="isbn"
                                        placeholder="9780..."
                                        value={formData.isbn}
                                        onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="year" className="text-sm font-medium">Year</Label>
                                    <Input
                                        id="year"
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="publisher" className="text-sm font-medium">Publisher</Label>
                                    <Input
                                        id="publisher"
                                        placeholder="Publisher name"
                                        value={formData.publisher}
                                        onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="language" className="text-sm font-medium">Language</Label>
                                    <Input
                                        id="language"
                                        value={formData.language}
                                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                                <textarea
                                    id="description"
                                    rows={4}
                                    placeholder="Brief description of the book..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none transition"
                                />
                            </div>
                        </form>
                    </div>

                    <div className="px-6 py-4 border-t border-border/60 bg-muted/20 shrink-0 flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1 cursor-pointer"
                            onClick={closeSheet}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            form="book-form"
                            className="flex-1 cursor-pointer"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    {editingBook ? 'Update Book' : 'Add Book'}
                                </>
                            )}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
