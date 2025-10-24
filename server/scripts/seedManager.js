// server/scripts/seedManager.js
require("dotenv").config();
const { connectDB } = require("../config/db");
const User = require("../models/User");

(async () => {
  try {
    await connectDB(process.env.MONGODB_URI);

    const email = process.env.MANAGER_EMAIL || "manager@example.com";
    const password = process.env.MANAGER_PASSWORD || "manager123";
    const name = process.env.MANAGER_NAME || "Manager";

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, password, role: "manager" });
      console.log("✅ Manager user created:", { email, password });
    } else {
      user.role = "manager";
      if (password) user.password = password;
      await user.save();
      console.log("🔄 Manager user updated:", email);
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
