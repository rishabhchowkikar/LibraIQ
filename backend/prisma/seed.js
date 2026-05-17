const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@libraiq.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@libraiq.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin created:", admin.email);

  // Create student users
  const studentPassword = await bcrypt.hash("student123", 10);
  const students = await Promise.all([
    prisma.user.upsert({
      where: { email: "arjun@student.com" },
      update: {},
      create: {
        name: "Arjun Sharma",
        email: "arjun@student.com",
        password: studentPassword,
        role: "STUDENT",
        trustTier: "GOLD",
      },
    }),
    prisma.user.upsert({
      where: { email: "priya@student.com" },
      update: {},
      create: {
        name: "Priya Patel",
        email: "priya@student.com",
        password: studentPassword,
        role: "STUDENT",
        trustTier: "SILVER",
      },
    }),
  ]);
  console.log("✅ Students created:", students.length);

  // Create books
  const books = await Promise.all([
    prisma.book.create({
      data: {
        title: "The Alchemist",
        author: "Paulo Coelho",
        isbn: "9780061122415",
        genre: "Fiction",
        totalCopies: 3,
        availableCopies: 3,
        description: "A timeless tale about following your dreams.",
        year: 1988,
      },
    }),
    prisma.book.create({
      data: {
        title: "Atomic Habits",
        author: "James Clear",
        isbn: "9780735211292",
        genre: "Self-Help",
        totalCopies: 2,
        availableCopies: 2,
        description: "Tiny changes, remarkable results.",
        year: 2018,
      },
    }),
    prisma.book.create({
      data: {
        title: "Sapiens",
        author: "Yuval Noah Harari",
        isbn: "9780062316097",
        genre: "History",
        totalCopies: 2,
        availableCopies: 1,
        description: "A brief history of humankind.",
        year: 2011,
      },
    }),
    prisma.book.create({
      data: {
        title: "Clean Code",
        author: "Robert C. Martin",
        isbn: "9780132350884",
        genre: "Technology",
        totalCopies: 2,
        availableCopies: 2,
        description: "A handbook of agile software craftsmanship.",
        year: 2008,
      },
    }),
  ]);
  console.log("✅ Books created:", books.length);

  // Create a loan for Arjun
  const loan = await prisma.loan.create({
    data: {
      studentId: students[0].id,
      bookId: books[2].id, // Sapiens
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
  });

  // Update book availability
  await prisma.book.update({
    where: { id: books[2].id },
    data: { availableCopies: { decrement: 1 } },
  });

  console.log("✅ Loan created");
  console.log("\n🎉 Seed completed!");
  console.log("\n📝 Test Accounts:");
  console.log("Admin: admin@libraiq.com / admin123");
  console.log("Student 1: arjun@student.com / student123");
  console.log("Student 2: priya@student.com / student123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
