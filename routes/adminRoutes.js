const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const Book = require("../models/Book");
const User = require("../models/User");
const router = express.Router();

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
      await Book.findByIdAndDelete(req.params.id);
      res.json({ message: "Book deleted" });
    } catch (err) {
      res.status(500).json({ message: "Error deleting book" });
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
