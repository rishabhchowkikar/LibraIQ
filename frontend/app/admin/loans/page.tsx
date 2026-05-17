'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Loan, Book } from '@/lib/type';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    FileText,
    Plus,
    Search,
    BookOpen,
    AlertCircle,
    RotateCcw,
    Clock,
    CheckCircle2,
    TrendingUp,
} from 'lucide-react';

// ─── Skeleton ────────────────────────────────────────────────
function PageSkeleton() {
    return (
        <div className="space-y-6 max-w-7xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-4 w-44" />
                    </div>
                </div>
                <Skeleton className="h-9 w-28 rounded-lg" />
            </div>

            <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                        <CardContent className="pt-5 pb-4">
                            <Skeleton className="h-3 w-24 mb-2" />
                            <Skeleton className="h-8 w-12" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <Skeleton className="h-9 w-72 rounded-lg" />
                </CardHeader>
                <div className="px-6 pb-6 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
                            <Skeleton className="w-9 h-11 rounded" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-28" />
                            </div>
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <Skeleton className="h-8 w-20 rounded-md" />
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────
export default function AdminLoansPage() {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Issue sheet state
    const [issueOpen, setIssueOpen] = useState(false);
    const [issueData, setIssueData] = useState({ studentId: '', bookId: '' });
    const [issueError, setIssueError] = useState('');
    const [issueLoading, setIssueLoading] = useState(false);

    // Return sheet state
    const [returnOpen, setReturnOpen] = useState(false);
    const [returningLoan, setReturningLoan] = useState<Loan | null>(null);
    const [returnLoading, setReturnLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [loansRes, booksRes] = await Promise.all([
                api.get('/loans'),
                api.get('/books'),
            ]);
            if (loansRes.data.success) setLoans(loansRes.data.loans);
            if (booksRes.data.success) setBooks(booksRes.data.books);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // ─── Derived Data ─────────────────────────────────────────
    const activeLoans = loans.filter(l => l.status === 'ACTIVE');
    const overdueLoans = loans.filter(l => l.status === 'OVERDUE');
    const returnedLoans = loans.filter(l => l.status === 'RETURNED');

    const filterLoans = (status?: string) =>
        loans.filter(loan => {
            const q = search.toLowerCase();
            const matchSearch =
                loan.book?.title.toLowerCase().includes(q) ||
                loan.student?.name.toLowerCase().includes(q) ||
                loan.student?.email?.toLowerCase().includes(q);
            const matchStatus = !status || loan.status === status;
            return matchSearch && matchStatus;
        });

    const getDaysInfo = (dueDate: string, status: string) => {
        const days = Math.ceil(
            (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (status === 'OVERDUE' || days < 0)
            return { label: `${Math.abs(days)}d overdue`, cls: 'text-red-500 font-medium' };
        if (days === 0)
            return { label: 'Due today', cls: 'text-orange-500 font-medium' };
        if (days <= 3)
            return { label: `${days} days left`, cls: 'text-orange-400' };
        return { label: `${days} days left`, cls: 'text-muted-foreground' };
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 gap-1">
                        <Clock className="w-3 h-3" /> Active
                    </Badge>
                );
            case 'RETURNED':
                return (
                    <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Returned
                    </Badge>
                );
            case 'OVERDUE':
                return (
                    <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="w-3 h-3" /> Overdue
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    // ─── Handlers ────────────────────────────────────────────
    const handleIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        setIssueError('');
        setIssueLoading(true);
        try {
            const { data } = await api.post('/loans/issue', issueData);
            if (data.success) {
                await fetchData();
                setIssueOpen(false);
                setIssueData({ studentId: '', bookId: '' });
                toast.success('Book issued successfully!');
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || 'Failed to issue book';
            setIssueError(msg);
            toast.error(msg);
        } finally {
            setIssueLoading(false);
        }
    };

    const handleReturn = async () => {
        if (!returningLoan) return;
        setReturnLoading(true);
        try {
            const { data } = await api.post('/loans/return', { loanId: returningLoan.id });
            if (data.success) {
                await fetchData();
                setReturnOpen(false);
                setReturningLoan(null);
                toast.success(data.message || 'Book returned successfully!');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to return book');
        } finally {
            setReturnLoading(false);
        }
    };

    const openReturn = (loan: Loan) => {
        setReturningLoan(loan);
        setReturnOpen(true);
    };

    // ─── Loan Table Component ─────────────────────────────────
    const LoanTable = ({ list }: { list: Loan[] }) => {
        if (list.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-muted-foreground">No loans found</p>
                    {search && (
                        <p className="text-sm text-muted-foreground/70 mt-1">
                            Try a different search term
                        </p>
                    )}
                </div>
            );
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[28%]">Book</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {list.map((loan) => {
                        const daysInfo = loan.status === 'ACTIVE'
                            ? getDaysInfo(loan.dueDate, loan.status)
                            : null;

                        return (
                            <TableRow key={loan.id} className="group">
                                {/* Book */}
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-11 bg-primary/10 rounded-md flex items-center justify-center shrink-0 border border-primary/10">
                                            <BookOpen className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate max-w-[160px]">
                                                {loan.book?.title}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {loan.book?.author}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>

                                {/* Student */}
                                <TableCell>
                                    <p className="text-sm font-medium">{loan.student?.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {loan.student?.trustTier?.toLowerCase()} tier
                                    </p>
                                </TableCell>

                                {/* Issued date */}
                                <TableCell className="text-sm text-muted-foreground">
                                    {new Date(loan.issuedAt).toLocaleDateString()}
                                </TableCell>

                                {/* Due date */}
                                <TableCell>
                                    <p className="text-sm">
                                        {new Date(loan.dueDate).toLocaleDateString()}
                                    </p>
                                    {daysInfo && (
                                        <p className={`text-xs mt-0.5 ${daysInfo.cls}`}>
                                            {daysInfo.label}
                                        </p>
                                    )}
                                    {loan.returnedAt && (
                                        <p className="text-xs text-green-600 mt-0.5">
                                            Returned {new Date(loan.returnedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </TableCell>

                                {/* Status */}
                                <TableCell>{getStatusBadge(loan.status)}</TableCell>

                                {/* Action */}
                                <TableCell className="text-right">
                                    {loan.status === 'ACTIVE' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openReturn(loan)}
                                            className="h-8 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            Return
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        );
    };

    if (loading) return <PageSkeleton />;

    // ─── Render ───────────────────────────────────────────────
    return (
        <div className="space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                        <FileText className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Loans</h1>
                        <p className="text-sm text-muted-foreground">Issue and manage book loans</p>
                    </div>
                </div>
                <Button
                    onClick={() => {
                        setIssueError('');
                        setIssueData({ studentId: '', bookId: '' });
                        setIssueOpen(true);
                    }}
                    className="gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Issue Book
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Loans', value: loans.length, color: 'text-purple-600', icon: TrendingUp },
                    { label: 'Active Loans', value: activeLoans.length, color: 'text-blue-600', icon: Clock },
                    { label: 'Overdue', value: overdueLoans.length, color: 'text-red-600', icon: AlertCircle },
                ].map(stat => (
                    <Card key={stat.label} className="shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        {stat.label}
                                    </p>
                                    <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                                </div>
                                <stat.icon className={`w-5 h-5 mt-1 ${stat.color} opacity-60`} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Table Card */}
            <Card className="shadow-sm">
                <CardHeader className="pb-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by book or student..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </CardHeader>

                <Separator />

                <Tabs defaultValue="all">
                    <div className="px-6 pt-4">
                        <TabsList>
                            <TabsTrigger value="all" className="gap-1.5 text-xs">
                                All
                                <Badge variant="secondary" className="text-xs px-1.5">
                                    {loans.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="active" className="gap-1.5 text-xs">
                                Active
                                <Badge variant="secondary" className="text-xs px-1.5">
                                    {activeLoans.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="overdue" className="gap-1.5 text-xs">
                                Overdue
                                <Badge
                                    className={`text-xs px-1.5 ${overdueLoans.length > 0 ? 'bg-red-100 text-red-700' : ''}`}
                                >
                                    {overdueLoans.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="returned" className="gap-1.5 text-xs">
                                Returned
                                <Badge variant="secondary" className="text-xs px-1.5">
                                    {returnedLoans.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="all" className="mt-0">
                        <LoanTable list={filterLoans()} />
                    </TabsContent>
                    <TabsContent value="active" className="mt-0">
                        <LoanTable list={filterLoans('ACTIVE')} />
                    </TabsContent>
                    <TabsContent value="overdue" className="mt-0">
                        <LoanTable list={filterLoans('OVERDUE')} />
                    </TabsContent>
                    <TabsContent value="returned" className="mt-0">
                        <LoanTable list={filterLoans('RETURNED')} />
                    </TabsContent>
                </Tabs>

                {loans.length > 0 && (
                    <div className="px-6 py-3 border-t">
                        <p className="text-xs text-muted-foreground">
                            <strong>{loans.length}</strong> total loans recorded
                        </p>
                    </div>
                )}
            </Card>

            {/* ── Issue Book Sheet ─────────────────────────────── */}
            <Sheet open={issueOpen} onOpenChange={setIssueOpen}>
                <SheetContent className="sm:max-w-md p-6">
                    <SheetHeader className="mb-6 p-0">
                        <SheetTitle className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Plus className="w-4 h-4 text-primary" />
                            </div>
                            Issue a Book
                        </SheetTitle>
                        <SheetDescription>
                            Assign an available book to a student
                        </SheetDescription>
                    </SheetHeader>

                    {issueError && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{issueError}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleIssue} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="studentId">Student ID</Label>
                            <Input
                                id="studentId"
                                required
                                placeholder="Paste student UUID..."
                                value={issueData.studentId}
                                onChange={(e) =>
                                    setIssueData({ ...issueData, studentId: e.target.value })
                                }
                            />
                            <p className="text-xs text-muted-foreground">
                                Find student IDs from your database
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bookId">Select Book</Label>
                            <select
                                id="bookId"
                                required
                                value={issueData.bookId}
                                onChange={(e) =>
                                    setIssueData({ ...issueData, bookId: e.target.value })
                                }
                                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Choose an available book...</option>
                                {books
                                    .filter(b => b.availableCopies > 0)
                                    .map(book => (
                                        <option key={book.id} value={book.id}>
                                            {book.title} — {book.author} ({book.availableCopies} left)
                                        </option>
                                    ))}
                            </select>
                            {books.filter(b => b.availableCopies > 0).length === 0 && (
                                <p className="text-xs text-red-500">No books currently available</p>
                            )}
                        </div>

                        <Separator />

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIssueOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1" disabled={issueLoading}>
                                {issueLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Issuing...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" /> Issue Book
                                    </span>
                                )}
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>

            {/* ── Return Book Sheet ────────────────────────────── */}
            <Sheet open={returnOpen} onOpenChange={setReturnOpen}>
                <SheetContent className="sm:max-w-md p-6">
                    <SheetHeader className="mb-6 p-0">
                        <SheetTitle className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                <RotateCcw className="w-4 h-4 text-primary" />
                            </div>
                            Process Return
                        </SheetTitle>
                        <SheetDescription>
                            Confirm the return of this book
                        </SheetDescription>
                    </SheetHeader>

                    {returningLoan && (
                        <div className="space-y-6">
                            {/* Book info */}
                            <div className="bg-muted/40 rounded-lg border p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-12 bg-primary/10 rounded flex items-center justify-center shrink-0">
                                        <BookOpen className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{returningLoan.book?.title}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {returningLoan.book?.author}
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                <dl className="space-y-2 text-sm">
                                    {[
                                        { label: 'Student', value: returningLoan.student?.name },
                                        {
                                            label: 'Issued on',
                                            value: new Date(returningLoan.issuedAt).toLocaleDateString(),
                                        },
                                        {
                                            label: 'Due date',
                                            value: new Date(returningLoan.dueDate).toLocaleDateString(),
                                        },
                                    ].map(item => (
                                        <div key={item.label} className="flex justify-between">
                                            <dt className="text-muted-foreground">{item.label}</dt>
                                            <dd className="font-medium">{item.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>

                            {/* Fine warning */}
                            {new Date(returningLoan.dueDate) < new Date() && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        This book is overdue. A fine of ₹5/day will be applied automatically.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setReturnOpen(false);
                                        setReturningLoan(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleReturn}
                                    disabled={returnLoading}
                                >
                                    {returnLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> Confirm Return
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}