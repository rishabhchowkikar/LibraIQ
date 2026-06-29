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