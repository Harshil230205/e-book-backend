const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const authMiddleware = require("../middleware/authMiddleware");
const Book = require("../models/Book");
const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post(
  "/upload",
  authMiddleware,
  upload.fields([{ name: "pdf" }, { name: "coverImage" }]),
  async (req, res) => {
    try {
      const { title, description, author, category, publishYear } = req.body;

      if (!req.files || !req.files.coverImage || !req.files.pdf) {
        return res
          .status(400)
          .json({ message: "Cover image and PDF are required" });
      }
      const coverImageUpload = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "ebooks/covers", resource_type: "image" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(req.files.coverImage[0].buffer);
      });

      const pdfUpload = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: "ebooks/pdf", resource_type: "raw" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        uploadStream.end(req.files.pdf[0].buffer);
      });

      const newBook = new Book({
        title,
        description,
        author: author || req.user.name,
        category,
        publishYear,
        coverImage: coverImageUpload.secure_url,
        pdf: pdfUpload.secure_url,
        uploadedBy: req.user.id,
        uploadedByName: req.user.name,
        coverImagePublicId: coverImageUpload.public_id,
        pdfPublicId: pdfUpload.public_id,
      });

      await newBook.save();
      res.json({ message: "Book uploaded, pending approval" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error uploading book", error: error.message });
    }
  }
);

router.get("/", async (req, res) => {
  const books = await Book.find({ isApproved: true }).sort({ createdAt: -1 });
  res.json(books);
});

router.get("/getById/:id", async (req, res) => {
  try {
    const book = await Book.findOne({ _id: req.params.id, isApproved: true });

    if (!book) {
      return res
        .status(404)
        .json({ message: "Book not found or not approved" });
    }

    res.json(book);
  } catch (err) {
    res.status(500).json({ message: "Error fetching book" });
  }
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
