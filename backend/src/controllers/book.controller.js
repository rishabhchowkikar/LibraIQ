const prisma = require("../config/database");
const { createLog } = require("../services/audit.service");

// get all books
exports.getAllBooks = async (req, res, next) => {
  try {
    const { search, genre, available, sort } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { author: { contains: search, mode: "insensitive" } },
        { isbn: { contains: search, mode: "insensitive" } },
      ];
    }

    if (genre) {
      where.genre = genre;
    }

    if (available === "true") {
      where.availableCopies = { gt: 0 };
    }

    const sortMap = {
      newest: { createdAt: "desc" },
      rating: { avgRating: "desc" },
      title: { title: "asc" },
    };

    const books = await prisma.book.findMany({
      where,
      orderBy: sortMap[sort] || sortMap.title,
    });

    res.status(200).json({
      success: true,
      count: books.length,
      books,
    });
  } catch (error) {
    console.error("Get books error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch books",
      details: error,
    });
  }
};

//get single book
exports.getBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === "ADMIN";

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        loans: {
          where: { status: "ACTIVE" },
          select: isAdmin
            ? {
                id: true,
                dueDate: true,
                student: { select: { id: true, name: true, email: true } },
              }
            : { id: true, dueDate: true },
        },
      },
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        error: "Book Not Found",
      });
    }

    res.status(200).json({
      success: true,
      book,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch book",
      details: error,
    });
  }
};

// Create book (Admin only)
exports.createBook = async (req, res, next) => {
  try {
    const {
      title,
      author,
      isbn,
      genre,
      totalCopies,
      coverUrl,
      description,
      language,
      publisher,
      year,
    } = req.body;

    if (!title || !author || !genre) {
      return res.status().json({
        success: false,
        error: "Title, Genre, and Author are requried",
      });
    }

    const book = await prisma.book.create({
      data: {
        title,
        author,
        isbn,
        genre,
        totalCopies: totalCopies || 1,
        availableCopies: totalCopies || 1,
        coverUrl,
        description,
        language: language || "English",
        publisher,
        year,
      },
    });

    await createLog({
      action: "BOOK_ADDED",
      actorId: req.user.userId,
      actorRole: "ADMIN",
      targetType: "BOOK",
      targetId: book.id,
      details: {
        title: book.title,
        author: book.author,
        genre: book.genre,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "Book Saved Successfully",
      book,
    });
  } catch (error) {
    console.error("Create book error:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        error: "Book with this ISBN already exists",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create book",
    });
  }
};

// Update book (Admin only)

exports.updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    // Don't allow direct update of availableCopies
    delete updatedData.availableCopies;

    const book = await prisma.book.update({
      where: { id },
      data: { ...updatedData },
    });

    await createLog({
      action: "BOOK_EDITED",
      actorId: req.user.userId,
      actorRole: "ADMIN",
      targetType: "BOOK",
      targetId: id,
      details: {
        title: book.title,
        updatedFields: Object.keys(req.body),
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: "Book updated successfully",
      book,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: "Book not found",
      });
    }
    res.status(500).json({
      success: false,
      error: "Failed to update book",
    });
  }
};

// Delete book (Admin only)
exports.deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check for active loans
    const activeLoan = await prisma.loan.count({
      where: {
        bookId: { id },
        status: "ACTIVE",
      },
    });

    if (activeLoan > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete book with active loans",
      });
    }

    await prisma.book.delete({
      where: { id },
    });

    await createLog({
      action: "BOOK_DELETED",
      actorId: req.user.userId,
      actorRole: "ADMIN",
      targetType: "BOOK",
      targetId: id,
      details: {
        title: bookToDelete?.title,
        author: bookToDelete?.author,
      },
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: "Book not found",
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete book",
    });
  }
};
