export interface Book {
    id: string;
    title: string;
    author: string;
    isbn?: string;
    genre: string;
    totalCopies: number;
    availableCopies: number;
    coverUrl?: string;
    description?: string;
    language: string;
    publisher?: string;
    year?: number;
    createdAt: string;
    updatedAt: string;
}

export interface Loan {
    id: string;
    studentId: string;
    bookId: string;
    issuedAt: string;
    dueDate: string;
    returnedAt?: string;
    status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'LOST';
    extendedCount: number;
    student?: {
        id: string;
        name: string;
        email: string;
        trustTier: string;
    };
    book?: Book;
    fines?: Fine[];
}

export interface Fine {
    id: string;
    loanId: string;
    studentId: string;
    amount: number;
    reason: string;
    paidAt?: string;
    waivedBy?: string;
    createdAt: string;
}

export interface BookRequest {
    id: string;
    title: string;
    author: string;
    genre?: string;
    reason?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    adminNote?: string;
    reviewedAt?: string;
    createdAt: string;
    student: {
        id: string;
        name: string;
        email: string;
        trustTier: string;
    };
}

export interface Reservation {
    id: string;
    studentId: string;
    bookId: string;
    reservedAt: string;
    expiresAt: string;
    notifiedAt?: string;
    status: 'PENDING' | 'NOTIFIED' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';
    student?: {
        id: string;
        name: string;
        email: string;
        trustTier: string;
    };
    book?: Book;
}

export interface LoanExtension {
    id: string;
    loanId: string;
    studentId: string;
    requestedAt: string;
    newDueDate: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    adminNote?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    student?: {
        id: string;
        name: string;
        email: string;
        trustTier: string;
    };
    loan?: Loan;
}

export interface ReadingGoal {
    id: string;
    studentId: string;
    monthlyGoal: number;
    yearlyGoal: number;
    updatedAt: string;
    booksThisMonth: number;
    monthlyProgress: number;
    yearlyProgress: number;
}

export interface Achievement {
    id: string;
    studentId: string;
    type: string;
    earnedAt: string;
    seen: boolean;
    label: string;
    desc: string;
    emoji: string;
}

export interface ReadingStats {
    totalBooks: number;
    booksThisYear: number;
    currentlyReading: {
        loan: string;
        title: string;
        author: string;
        dueDate: string;
        daysLeft: number;
    }[];
    dueSoon: {
        loan: string;
        title: string;
        author: string;
        dueDate: string;
        daysLeft: number;
    }[];
    favoriteGenres: { genre: string; count: number }[];
    readingStreak: number;
    monthlyStats: { month: string; books: number }[];
    earlyReturns: number;
    onTimeRate: number;
}

export interface AuditLog {
    id: string;
    action: string;
    actorId: string;
    actorRole: 'ADMIN' | 'STUDENT';
    targetType: string;
    targetId: string;
    details: Record<string, unknown> | null;
    ipAddress?: string;
    createdAt: string;
    actor: {
        name: string;
        email: string;
        role: string;
    };
}