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
      const books = await Book.find().populate("uploadedBy", "name email");
      res.json(books);
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
  "/getAll/users",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const users = await User.find({ isAdmin: false }).select("-password");
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: "Error fetching users" });
    }
  }
);

module.exports = router;
