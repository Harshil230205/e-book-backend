const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Book = require("../models/Book");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const adminMiddleware = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  next();
};

router.get(
  "/books/getAll",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status } = req.query;

      let filter = {};
      if (status === "pending") {
        filter.isApproved = false;
      } else if (status === "approved") {
        filter.isApproved = true;
      }

      const books = await Book.find(filter)
        .populate("uploadedBy", "name email")
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const totalBooks = await Book.countDocuments(filter);

      res.json({
        books,
        totalPages: Math.ceil(totalBooks / limit),
        currentPage: parseInt(page),
      });
    } catch (err) {
      res.status(500).json({ message: "Error fetching books" });
    }
  }
);

router.get("/books/getById/:id", authMiddleware, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    console.log(book);

    if (!book.isApproved && book.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(book);
  } catch (err) {
    res.status(500).json({ message: "Error fetching book" });
  }
});

router.post(
  "/books/approve/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      await Book.findByIdAndUpdate(req.params.id, { isApproved: true });
      res.json({ message: "Book approved" });
    } catch (err) {
      res.status(500).json({ message: "Error approving book" });
    }
  }
);

router.delete(
  "/books/delete/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      if (book.coverImagePublicId) {
        await cloudinary.uploader.destroy(book.coverImagePublicId, {
          resource_type: "image",
        });
      }

      if (book.pdfPublicId) {
        await cloudinary.uploader.destroy(book.pdfPublicId, {
          resource_type: "raw",
        });
      }

      await Book.findByIdAndDelete(req.params.id);

      res.json({ message: "Book and associated files deleted" });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error deleting book", error: err.message });
    }
  }
);
router.get(
  "/users/getAll",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const users = await User.find()
        .select("-password")
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const totalUsers = await User.countDocuments();

      res.json({
        users,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: parseInt(page),
      });
    } catch (err) {
      res.status(500).json({ message: "Error fetching users" });
    }
  }
);

module.exports = router;
