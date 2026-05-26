import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-local-secret-3c8d3523-cc88-4edf-b0e5-e4d50a7f47c2";

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No session token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains id, phone, role
    next();
  } catch (error) {
    console.error("JWT Verification error:", error.message);
    return res.status(401).json({ error: "Invalid or expired session token. Please log in again." });
  }
};
