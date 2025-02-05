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

router.get("/search", authMiddleware, async (req, res) => {
  const { query, author, category, year } = req.query;

  const searchCriteria = { isApproved: true };
  if (query) searchCriteria.title = new RegExp(query, "i");
  if (author) searchCriteria.author = new RegExp(author, "i");
  if (category) searchCriteria.category = new RegExp(category, "i");
  if (year) searchCriteria.publishYear = year;
  const books = await Book.find(searchCriteria);
  res.json(books);
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
