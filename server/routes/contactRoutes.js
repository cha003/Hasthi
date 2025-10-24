const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage'); // Your Mongoose model

// Route to fetch all contact messages (GET)
router.get('/', async (req, res) => {
  try {
    const contactMessages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json({ data: contactMessages });
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ error: 'Failed to fetch contact messages' });
  }
});

// Route to submit a contact message (POST)
router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const newContactMessage = new ContactMessage({
      name,
      email,
      subject,
      message
    });

    await newContactMessage.save();
    res.status(201).json({ message: 'Message sent successfully!' });
  } catch (error) {
    console.error('Error saving contact message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
