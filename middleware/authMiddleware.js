const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Access Denied, No Token Provided" });
    }

    console.log("Received Authorization Header:", authHeader);

    const tokenParts = authHeader.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
      return res.status(400).json({ message: "Invalid Token Format" });
    }

    const token = tokenParts[1];

    console.log("Extracted Token:", token);

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Attach decoded user data to request
    console.log("Verified User:", verified);

    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res
      .status(401)
      .json({ message: "Invalid or Expired Token", error: err.message });
  }
};

module.exports = authMiddleware;
