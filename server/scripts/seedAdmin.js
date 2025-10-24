// server/scripts/seedAdmin.js
require("dotenv").config();
const { connectDB } = require("../config/db");
const User = require("../models/User");

(async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    const email = process.env.ADMIN_EMAIL || "admin@example.com";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const name = process.env.ADMIN_NAME || "Admin";

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, password, role: "admin" });
      console.log("✅ Admin created:", { email, password });
    } else {
      user.role = "admin";
      if (password) user.password = password;
      await user.save();
      console.log("🔄 Admin updated:", email);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
