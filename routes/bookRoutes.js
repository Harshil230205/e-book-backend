const express = require("express");
const multer = require("multer");
const authMiddleware = require("../middleware/authMiddleware");
const Book = require("../models/Book");
const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

router.get("/", async (req, res) => {
  const books = await Book.find({ isApproved: true }).sort({ createdAt: -1 });
  res.json(books);
});

router.get("/getAll", async (req, res) => {
  try {
    const { query, category, year, sort, page = 1, limit = 10 } = req.query;

    const searchCriteria = { isApproved: true };

    if (query) {
      searchCriteria.$or = [
        { title: new RegExp(query, "i") },
        { uploadedByName: new RegExp(query, "i") },
      ];
    }

    if (category) searchCriteria.category = new RegExp(category, "i");
    if (year) searchCriteria.publishYear = year;

    const sortOption =
      sort === "oldest" ? { publishYear: 1 } : { publishYear: -1 };

    const books = await Book.find(searchCriteria)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalBooks = await Book.countDocuments(searchCriteria);

    res.json({
      books,
      totalPages: Math.ceil(totalBooks / limit),
      currentPage: parseInt(page),
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching books" });
  }
});

router.get("/my-books", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const searchCriteria = { uploadedBy: req.user.id };

    if (status === "approved") {
      searchCriteria.isApproved = true;
    } else if (status === "pending") {
      searchCriteria.isApproved = false;
    }

    const books = await Book.find(searchCriteria)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalBooks = await Book.countDocuments(searchCriteria);

    res.json({
      books,
      totalPages: Math.ceil(totalBooks / limit),
      currentPage: parseInt(page),
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching user books" });
  }
});

router.post(
  "/upload",
  authMiddleware,
  upload.fields([{ name: "pdf" }, { name: "coverImage" }]),
  async (req, res) => {
    const { title, description, author, category, publishYear } = req.body;
    const newBook = new Book({
      title,
      description,
      author: author || req.user.name,
      category,
      publishYear,
      coverImage: req.files.coverImage[0].path,
      pdf: req.files.pdf[0].path,
      uploadedBy: req.user.id,
      uploadedByName: req.user.name,
    });

    await newBook.save();
    res.json({ message: "Book uploaded, pending approval" });
  }
);

module.exports = router;
