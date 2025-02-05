require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");

const app = express();
connectDB();

app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.send("Api working is perfectly");
});

// Separate routes for users and admins
app.use("/api/user", require("./routes/userAuthRoutes"));
app.use("/api/admin", require("./routes/adminAuthRoutes"));
app.use("/api/books", require("./routes/bookRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
