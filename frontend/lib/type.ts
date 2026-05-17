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