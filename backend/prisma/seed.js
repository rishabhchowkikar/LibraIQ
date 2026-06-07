const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Helper to create a date X days from now (negative = past)
const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

async function main() {
  console.log("🌱 Starting comprehensive Phase 1 seed...\n");

  // ─── STEP 1: Clean existing data (order matters for FK constraints) ──
  console.log("🧹 Cleaning existing data...");
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.fine.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();
  console.log("✅ Clean complete\n");

  // ─── STEP 2: Create Users ──────────────────────────────────────────
  console.log("👤 Creating users...");

  const hashedPassword = await bcrypt.hash("password123", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);

  // Admin
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@libraiq.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });

  // SCENARIO: Platinum student — best reader, long history, no issues
  const platinum = await prisma.user.create({
    data: {
      name: "Arjun Sharma",
      email: "arjun@student.com",
      password: hashedPassword,
      role: "STUDENT",
      trustTier: "PLATINUM",
    },
  });

  // SCENARIO: Gold student — good reader, occasional late return
  const gold = await prisma.user.create({
    data: {
      name: "Priya Patel",
      email: "priya@student.com",
      password: hashedPassword,
      role: "STUDENT",
      trustTier: "GOLD",
    },
  });

  // SCENARIO: Silver student — average reader
  const silver = await prisma.user.create({
    data: {
      name: "Rahul Verma",
      email: "rahul@student.com",
      password: hashedPassword,
      role: "STUDENT",
      trustTier: "SILVER",
    },
  });

  // SCENARIO: Bronze student — new student, no history yet
  const bronze = await prisma.user.create({
    data: {
      name: "Sneha Joshi",
      email: "sneha@student.com",
      password: hashedPassword,
      role: "STUDENT",
      trustTier: "BRONZE",
    },
  });

  // SCENARIO: Student with unpaid fines — BLOCKED from new loans
  const blocked = await prisma.user.create({
    data: {
      name: "Vikram Singh",
      email: "vikram@student.com",
      password: hashedPassword,
      role: "STUDENT",
      trustTier: "BRONZE",
    },
  });

  console.log("✅ Created 6 users (1 admin, 5 students)\n");

  // ─── STEP 3: Create Books ──────────────────────────────────────────
  console.log("📚 Creating books...");

  // SCENARIO: Fully available book
  const alchemist = await prisma.book.create({
    data: {
      title: "The Alchemist",
      author: "Paulo Coelho",
      isbn: "9780061122415",
      genre: "Fiction",
      totalCopies: 3,
      availableCopies: 3,
      description: "A timeless tale about following your dreams.",
      publisher: "HarperCollins",
      year: 1988,
      language: "English",
    },
  });

  // SCENARIO: Partially available book (1 of 2 copies out)
  const atomicHabits = await prisma.book.create({
    data: {
      title: "Atomic Habits",
      author: "James Clear",
      isbn: "9780735211292",
      genre: "Self-Help",
      totalCopies: 2,
      availableCopies: 1,
      description: "Tiny changes, remarkable results.",
      publisher: "Avery",
      year: 2018,
      language: "English",
    },
  });

  // SCENARIO: Fully borrowed book (0 available — triggers reservation)
  const sapiens = await prisma.book.create({
    data: {
      title: "Sapiens",
      author: "Yuval Noah Harari",
      isbn: "9780062316097",
      genre: "History",
      totalCopies: 2,
      availableCopies: 0,
      description: "A brief history of humankind.",
      publisher: "Harper",
      year: 2011,
      language: "English",
    },
  });

  // SCENARIO: Technical book
  const cleanCode = await prisma.book.create({
    data: {
      title: "Clean Code",
      author: "Robert C. Martin",
      isbn: "9780132350884",
      genre: "Technology",
      totalCopies: 2,
      availableCopies: 2,
      description: "A handbook of agile software craftsmanship.",
      publisher: "Prentice Hall",
      year: 2008,
      language: "English",
    },
  });

  // SCENARIO: Single copy book
  const deepWork = await prisma.book.create({
    data: {
      title: "Deep Work",
      author: "Cal Newport",
      isbn: "9781455586691",
      genre: "Self-Help",
      totalCopies: 1,
      availableCopies: 0,
      description: "Rules for focused success in a distracted world.",
      publisher: "Grand Central",
      year: 2016,
      language: "English",
    },
  });

  // SCENARIO: New arrival
  const thinking = await prisma.book.create({
    data: {
      title: "Thinking, Fast and Slow",
      author: "Daniel Kahneman",
      isbn: "9780374533557",
      genre: "Psychology",
      totalCopies: 3,
      availableCopies: 3,
      description: "How two systems drive the way we think.",
      publisher: "Farrar, Straus and Giroux",
      year: 2011,
      language: "English",
    },
  });

  // SCENARIO: Hindi language book
  const godan = await prisma.book.create({
    data: {
      title: "Godan",
      author: "Munshi Premchand",
      isbn: "9788126701",
      genre: "Fiction",
      totalCopies: 2,
      availableCopies: 2,
      description: "A classic Hindi novel about rural India.",
      publisher: "Lokbharti",
      year: 1936,
      language: "Hindi",
    },
  });

  console.log("✅ Created 7 books\n");

  // ─── STEP 4: Create Loans ──────────────────────────────────────────
  console.log("📋 Creating loans...");

  // ── PLATINUM student (Arjun) — Active loan due in 15 days ──────────
  const loan1 = await prisma.loan.create({
    data: {
      studentId: platinum.id,
      bookId: sapiens.id,
      issuedAt: daysFromNow(-15),
      dueDate: daysFromNow(15),
      status: "ACTIVE",
    },
  });

  // ── PLATINUM student (Arjun) — Another active loan due in 3 days ───
  const loan2 = await prisma.loan.create({
    data: {
      studentId: platinum.id,
      bookId: deepWork.id,
      issuedAt: daysFromNow(-27),
      dueDate: daysFromNow(3),
      status: "ACTIVE",
    },
  });

  // ── PLATINUM student (Arjun) — Returned on time ────────────────────
  const loan3 = await prisma.loan.create({
    data: {
      studentId: platinum.id,
      bookId: alchemist.id,
      issuedAt: daysFromNow(-40),
      dueDate: daysFromNow(-12),
      returnedAt: daysFromNow(-14),
      status: "RETURNED",
    },
  });

  // ── GOLD student (Priya) — Active loan due in 7 days ───────────────
  const loan4 = await prisma.loan.create({
    data: {
      studentId: gold.id,
      bookId: atomicHabits.id,
      issuedAt: daysFromNow(-14),
      dueDate: daysFromNow(7),
      status: "ACTIVE",
    },
  });

  // ── GOLD student (Priya) — Returned slightly late (fine paid) ──────
  const loan5 = await prisma.loan.create({
    data: {
      studentId: gold.id,
      bookId: cleanCode.id,
      issuedAt: daysFromNow(-35),
      dueDate: daysFromNow(-15),
      returnedAt: daysFromNow(-12),
      status: "OVERDUE",
    },
  });

  // ── GOLD student (Priya) — Returned on time ────────────────────────
  const loan6 = await prisma.loan.create({
    data: {
      studentId: gold.id,
      bookId: thinking.id,
      issuedAt: daysFromNow(-60),
      dueDate: daysFromNow(-35),
      returnedAt: daysFromNow(-36),
      status: "RETURNED",
    },
  });

  // ── SILVER student (Rahul) — Active loan due today ─────────────────
  const loan7 = await prisma.loan.create({
    data: {
      studentId: silver.id,
      bookId: sapiens.id,
      issuedAt: daysFromNow(-21),
      dueDate: daysFromNow(0),
      status: "ACTIVE",
    },
  });

  // ── SILVER student (Rahul) — Returned late (overdue fine) ──────────
  const loan8 = await prisma.loan.create({
    data: {
      studentId: silver.id,
      bookId: godan.id,
      issuedAt: daysFromNow(-50),
      dueDate: daysFromNow(-30),
      returnedAt: daysFromNow(-22),
      status: "OVERDUE",
    },
  });

  // ── BLOCKED student (Vikram) — OVERDUE loan with unpaid fine ───────
  const loan9 = await prisma.loan.create({
    data: {
      studentId: blocked.id,
      bookId: cleanCode.id,
      issuedAt: daysFromNow(-45),
      dueDate: daysFromNow(-20),
      status: "OVERDUE",
    },
  });

  console.log("✅ Created 9 loans across all scenarios\n");

  // ─── STEP 5: Create Fines ──────────────────────────────────────────
  console.log("💰 Creating fines...");

  // SCENARIO: Unpaid fine from active overdue loan (Vikram — BLOCKED)
  const fine1 = await prisma.fine.create({
    data: {
      loanId: loan9.id,
      studentId: blocked.id,
      amount: 100,
      reason: "Overdue by 20 days at ₹5/day",
    },
  });

  // SCENARIO: Paid fine (Priya returned late, paid her fine)
  const fine2 = await prisma.fine.create({
    data: {
      loanId: loan5.id,
      studentId: gold.id,
      amount: 15,
      reason: "Overdue by 3 days at ₹5/day",
      paidAt: daysFromNow(-11),
    },
  });

  // SCENARIO: Waived fine (Rahul had a fine that got waived)
  const fine3 = await prisma.fine.create({
    data: {
      loanId: loan8.id,
      studentId: silver.id,
      amount: 40,
      reason:
        "Overdue by 8 days at ₹5/day | Waived: Student explained medical emergency",
      waivedBy: admin.id,
    },
  });

  console.log("✅ Created 3 fines (1 unpaid, 1 paid, 1 waived)\n");

  // ─── STEP 6: Create Notifications ─────────────────────────────────
  console.log("🔔 Creating notifications...");

  await prisma.notification.createMany({
    data: [
      // Arjun — due reminder
      {
        userId: platinum.id,
        type: "DUE_REMINDER",
        message:
          '"Deep Work" is due in 3 days — return it to keep your reading record clean.',
        isRead: false,
      },
      // Arjun — tier upgrade
      {
        userId: platinum.id,
        type: "TIER_CHANGE",
        message:
          "🎉 Congratulations! You've been upgraded to Platinum tier. Enjoy 4 books at a time!",
        isRead: true,
      },
      // Priya — fine paid confirmation
      {
        userId: gold.id,
        type: "FINE_ALERT",
        message:
          'Your fine of ₹15 for "Clean Code" has been marked as paid. Account is clear!',
        isRead: true,
      },
      // Priya — due reminder
      {
        userId: gold.id,
        type: "DUE_REMINDER",
        message: '"Atomic Habits" is due in 7 days — plan your return.',
        isRead: false,
      },
      // Rahul — fine waived
      {
        userId: silver.id,
        type: "FINE_ALERT",
        message:
          'Your fine of ₹40 for "Godan" has been waived. Reason: Medical emergency noted.',
        isRead: false,
      },
      // Rahul — due today
      {
        userId: silver.id,
        type: "DUE_REMINDER",
        message: '🚨 "Sapiens" is due TODAY! Return it to avoid a late fine.',
        isRead: false,
      },
      // Vikram — overdue alert
      {
        userId: blocked.id,
        type: "OVERDUE_ALERT",
        message:
          '⚠️ "Clean Code" is 20 days overdue. Fine: ₹100. Your account is blocked until this is cleared.',
        isRead: false,
      },
    ],
  });

  console.log("✅ Created 7 notifications\n");

  // ─── STEP 7: Summary ───────────────────────────────────────────────
  console.log("═══════════════════════════════════════════");
  console.log("🎉 SEED COMPLETE — Phase 1 Test Scenarios");
  console.log("═══════════════════════════════════════════\n");

  console.log("📝 TEST ACCOUNTS:");
  console.log("─────────────────────────────────────────");
  console.log("ADMIN:");
  console.log("  admin@libraiq.com       / admin123");
  console.log("");
  console.log("STUDENTS:");
  console.log(
    "  arjun@student.com       / password123  → PLATINUM (2 active, 1 returned)",
  );
  console.log(
    "  priya@student.com       / password123  → GOLD     (1 active, 1 returned, fine paid)",
  );
  console.log(
    "  rahul@student.com       / password123  → SILVER   (1 active due TODAY, fine waived)",
  );
  console.log(
    "  sneha@student.com       / password123  → BRONZE   (no loans — new student)",
  );
  console.log(
    "  vikram@student.com      / password123  → BRONZE   (BLOCKED — ₹100 unpaid fine)",
  );
  console.log("");
  console.log("📚 BOOKS:");
  console.log("─────────────────────────────────────────");
  console.log("  The Alchemist           → 3/3 available");
  console.log("  Atomic Habits           → 1/2 available");
  console.log("  Sapiens                 → 0/2 available (both borrowed)");
  console.log("  Clean Code              → 2/2 available");
  console.log("  Deep Work               → 0/1 available (borrowed)");
  console.log("  Thinking, Fast and Slow → 3/3 available");
  console.log("  Godan (Hindi)           → 2/2 available");
  console.log("");
  console.log("📋 LOAN SCENARIOS:");
  console.log("─────────────────────────────────────────");
  console.log("  ACTIVE   → Arjun: Sapiens (15 days left)");
  console.log("  ACTIVE   → Arjun: Deep Work (3 days left — urgent)");
  console.log("  RETURNED → Arjun: The Alchemist (returned on time)");
  console.log("  ACTIVE   → Priya: Atomic Habits (7 days left)");
  console.log(
    "  OVERDUE  → Priya: Clean Code (returned 3 days late, fine PAID)",
  );
  console.log("  RETURNED → Priya: Thinking Fast (returned on time)");
  console.log("  ACTIVE   → Rahul: Sapiens (due TODAY)");
  console.log("  OVERDUE  → Rahul: Godan (returned 8 days late, fine WAIVED)");
  console.log(
    "  OVERDUE  → Vikram: Clean Code (20 days overdue, fine UNPAID → BLOCKED)",
  );
  console.log("");
  console.log("💰 FINE SCENARIOS:");
  console.log("─────────────────────────────────────────");
  console.log("  ₹100 UNPAID  → Vikram (Clean Code, 20 days overdue)");
  console.log("  ₹15  PAID    → Priya  (Clean Code, 3 days late)");
  console.log("  ₹40  WAIVED  → Rahul  (Godan, 8 days late — medical)");
  console.log("═══════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
