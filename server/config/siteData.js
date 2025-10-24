// server/config/siteData.js
// 🔧 EDIT THESE VALUES with your real details.
// Keep this file as your single source of truth for the chatbot.

module.exports = {
  brandName: "Hasthi.lk",
  currency: "LKR",
  // Public contact/showcase info
  contact: {
    phone: "+94 11 2 345 678",
    email: "info@hasthi.lk",
    website: "https://hasthi.lk"
  },
  // Location (shown to users)
  location: {
    name: "Pinnawala Elephant Orphanage",
    address: "Rambukkana, Kegalle, Sri Lanka",
    // (Approx) map coords; update if needed
    map: { lat: 7.3015, lng: 80.3830 },
    // Optional opening info (leave "" if you don't want the bot to mention)
    openHours: "",
    notes: ""
  },
  // Packages you sell on the site (examples — update labels/prices/benefits)
  packages: [
    {
      key: "couple",
      title: "Romantic Escape",
      priceLKR: 2400, // number (omit commas)
      includes: [
        "Entry tickets for 2",
        "Photo at viewing deck",
        "Souvenir badge x2"
      ]
    }, {
      key: "family",
      title: "Family Adventure (3 Adults + 1 Kids)",
      priceLKR: 3870,
      includes: [
        "4 entry tickets",
        "Guided mini-tour (30 mins)",
        "Ice cream vouchers x4"
      ]
    },
    {
      key: "Max combo",
      title: "Group Celebration (5 Adults + 3 Kids)",
      priceLKR: 6800,
      includes: [
        "8 entry tickets",
        "Guided mini-tour (30 mins)",
        "Ice cream vouchers x8"
      ]
    },
   
  ],
  // Entry ticket pricing (examples — set your real tiers)
  entryTickets: {
    // if you have different local/foreigner tiers, add them here
    local: {
      adult: 1500,
      child: 800,
      
    },
    foreign: {
      adult: 5000,
      child: 2500,
     
    },
    // Optional add-ons
    addOns: [
      { title: "Guided Tour (30 mins)", priceLKR: 2500 },
      { title: "Souvenir Photo", priceLKR: 1200 }
    ],
    notes: "" // e.g., "Kids under 5 are free", "Bring student ID", etc.
  },
  // Adoption / Donation (optional; leave arrays empty if not using)
  adoption: [
    {
      title: "Monthly Adoption",
      priceLKR: 7500,
      includes: ["Adoption certificate", "Quarterly update email"]
    }
  ],
  donations: [
    { title: "Feed an Elephant (1 day)", priceLKR: 3500 },
    { title: "Medical Fund", priceLKR: 0 } // 0 means user enters any amount
  ],
  // Internal version stamp to force-refresh the prompt cache when you edit
  kbVersion: "2025-09-26"
};
