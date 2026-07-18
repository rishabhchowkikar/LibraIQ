-- DropIndex
DROP INDEX "audit_logs_targetType_idx";

-- DropIndex
DROP INDEX "book_requests_status_idx";

-- DropIndex
DROP INDEX "book_requests_studentId_idx";

-- DropIndex
DROP INDEX "fines_studentId_idx";

-- DropIndex
DROP INDEX "loan_extensions_status_idx";

-- DropIndex
DROP INDEX "loan_extensions_studentId_idx";

-- DropIndex
DROP INDEX "loans_bookId_idx";

-- DropIndex
DROP INDEX "loans_status_idx";

-- DropIndex
DROP INDEX "loans_studentId_idx";

-- DropIndex
DROP INDEX "notifications_isRead_idx";

-- DropIndex
DROP INDEX "notifications_userId_idx";

-- DropIndex
DROP INDEX "payments_orderId_idx";

-- DropIndex
DROP INDEX "payments_studentId_idx";

-- DropIndex
DROP INDEX "reservations_bookId_idx";

-- DropIndex
DROP INDEX "reservations_status_idx";

-- DropIndex
DROP INDEX "reservations_studentId_idx";

-- CreateIndex
CREATE INDEX "audit_logs_actorRole_createdAt_idx" ON "audit_logs"("actorRole", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_targetType_createdAt_idx" ON "audit_logs"("targetType", "createdAt");

-- CreateIndex
CREATE INDEX "book_requests_studentId_createdAt_idx" ON "book_requests"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "book_requests_status_createdAt_idx" ON "book_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "books_genre_idx" ON "books"("genre");

-- CreateIndex
CREATE INDEX "fines_studentId_paidAt_waivedBy_idx" ON "fines"("studentId", "paidAt", "waivedBy");

-- CreateIndex
CREATE INDEX "fines_studentId_createdAt_idx" ON "fines"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "fines_createdAt_idx" ON "fines"("createdAt");

-- CreateIndex
CREATE INDEX "fines_paidAt_idx" ON "fines"("paidAt");

-- CreateIndex
CREATE INDEX "loan_extensions_studentId_requestedAt_idx" ON "loan_extensions"("studentId", "requestedAt");

-- CreateIndex
CREATE INDEX "loan_extensions_status_requestedAt_idx" ON "loan_extensions"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "loans_studentId_issuedAt_idx" ON "loans"("studentId", "issuedAt");

-- CreateIndex
CREATE INDEX "loans_status_dueDate_idx" ON "loans"("status", "dueDate");

-- CreateIndex
CREATE INDEX "loans_bookId_status_idx" ON "loans"("bookId", "status");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_sentAt_idx" ON "notifications"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "payments_linkId_idx" ON "payments"("linkId");

-- CreateIndex
CREATE INDEX "payments_studentId_createdAt_idx" ON "payments"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "reservations_bookId_status_reservedAt_idx" ON "reservations"("bookId", "status", "reservedAt");

-- CreateIndex
CREATE INDEX "reservations_studentId_bookId_status_idx" ON "reservations"("studentId", "bookId", "status");

-- CreateIndex
CREATE INDEX "reservations_studentId_reservedAt_idx" ON "reservations"("studentId", "reservedAt");

-- CreateIndex
CREATE INDEX "reservations_status_expiresAt_idx" ON "reservations"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");

