-- CreateEnum
CREATE TYPE "LoanExtensionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "ReservationStatus" ADD VALUE 'NOTIFIED';

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "notifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "loan_extensions" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "newDueDate" TIMESTAMP(3) NOT NULL,
    "status" "LoanExtensionStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "loan_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_goals" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "monthlyGoal" INTEGER NOT NULL DEFAULT 2,
    "yearlyGoal" INTEGER NOT NULL DEFAULT 12,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loan_extensions_loanId_idx" ON "loan_extensions"("loanId");

-- CreateIndex
CREATE INDEX "loan_extensions_studentId_idx" ON "loan_extensions"("studentId");

-- CreateIndex
CREATE INDEX "loan_extensions_status_idx" ON "loan_extensions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reading_goals_studentId_key" ON "reading_goals"("studentId");

-- CreateIndex
CREATE INDEX "achievements_studentId_idx" ON "achievements"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_studentId_type_key" ON "achievements"("studentId", "type");

-- AddForeignKey
ALTER TABLE "loan_extensions" ADD CONSTRAINT "loan_extensions_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_extensions" ADD CONSTRAINT "loan_extensions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_goals" ADD CONSTRAINT "reading_goals_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
