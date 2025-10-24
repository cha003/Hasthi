// server/controllers/authController.js
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "7d",
  });
}

function setTokenCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
  });
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "name, email and password are required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already registered" });

    const user = await User.create({ name, email, password, provider: "local" });
    const token = makeToken({ id: user._id, role: user.role });
    setTokenCookie(res, token);

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (e) {
    next(e);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "email and password are required" });

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await user.matchPassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = makeToken({ id: user._id, role: user.role });
    setTokenCookie(res, token);

    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (e) {
    next(e);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (e) {
    next(e);
  }
};

exports.logout = async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production"
  });
  res.json({ message: "Logged out" });
};

// ---- GOOGLE AUTH ----
async function verifyGoogleIdToken(idToken) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  return ticket.getPayload(); // { sub, email, email_verified, name, picture, ... }
}

exports.googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body; // GIS returns this JWT
    if (!credential) return res.status(400).json({ message: "Missing Google credential" });

    const payload = await verifyGoogleIdToken(credential);
    const { sub: googleId, email, email_verified, name, picture } = payload;

    if (!email || !email_verified)
      return res.status(401).json({ message: "Google account not verified" });

    let user = await User.findOne({ email });

    if (!user) {
      // create a local user seeded by Google profile
      const randomPass = crypto.randomBytes(32).toString("hex");
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        password: randomPass,        // will be hashed by pre-save
        provider: "google",
        googleId,
        avatar: picture
      });
    } else {
      // attach googleId if this email logs in with Google
      let changed = false;
      if (!user.googleId) { user.googleId = googleId; changed = true; }
      if (picture && !user.avatar) { user.avatar = picture; changed = true; }
      if (user.provider !== "google") { user.provider = "local"; } // keep "local" if originally local
      if (changed) await user.save();
    }

    const token = makeToken({ id: user._id, role: user.role });
    setTokenCookie(res, token);

    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar }
    });
  } catch (e) {
    next(e);
  }
};
