import { useState } from "react";
import axios from "axios"; // Import axios to make HTTP requests
import { MapPin, Phone, Mail, Send, MessageSquare, Clock, Globe, Heart, CheckCircle } from "lucide-react";

// Import the Google Maps component
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const ElephantIcon = ({ className = "w-8 h-8", color = "currentColor" }) => (
  <svg viewBox="0 0 100 100" className={className} fill={color} aria-hidden="true">
    <path d="M20 60c0-15 10-25 25-25s25 10 25 25c0 8-3 15-8 20h-34c-5-5-8-12-8-20z" />
    <circle cx="35" cy="55" r="2" fill="white" />
    <path d="M15 65c-5 0-8 3-8 8s3 8 8 8c2 0 4-1 5-2" />
    <path d="M45 40c-8-5-15-3-20 2" />
    <circle cx="25" cy="75" r="8" opacity="0.1" />
    <circle cx="55" cy="75" r="8" opacity="0.1" />
  </svg>
);

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [showMapInfo, setShowMapInfo] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Simple form validation
    if (!formData.name || !formData.email || !formData.message) {
      setError("Please fill out all required fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Send POST request to the backend API
      const response = await axios.post("http://localhost:5000/api/contact", formData, {
        withCredentials: true, // If you're using cookies for session
      });
      if (response.status === 201) {
        setIsSubmitted(true);
        setTimeout(() => {
          setIsSubmitted(false);
          setFormData({ name: '', email: '', subject: '', message: '' });
        }, 3000);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("There was an error sending your message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: MapPin,
      title: "Our Location",
      info: "Pinnawala Elephant Orphanage",
      description: "Visit us at our headquarters in the heart of Colombo",
      color: "emerald"
    },
    {
      icon: Phone,
      title: "Call Us",
      info: "+94 77 123 4567",
      description: "Available Monday to Friday, 9:00 AM - 6:00 PM",
      color: "teal"
    },
    {
      icon: Mail,
      title: "Email Support",
      info: "support@hasthi.lk",
      description: "We respond to all emails within 24 hours",
      color: "cyan"
    }
  ];

  const location = {
  lat: 7.3150,
  lng: 80.3703
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Have questions, suggestions, or want to get involved in elephant conservation? 
            We'd love to hear from you!
          </p>
        </div>

        {/* Contact Form */}
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
              <h2 className="text-2xl font-bold">Send us a Message</h2>
              <p className="text-emerald-100 mt-2">We'll get back to you within 24 hours</p>
            </div>

            <div className="p-8">
              {isSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600">Thank you for reaching out. We'll respond soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && <p className="text-red-500">{error}</p>}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select a topic...</option>
                      {["General Inquiry", "Adoption Process", "Veterinary Support", "Partnership Opportunities", "Technical Support", "Other"].map((topic, index) => (
                        <option key={index} value={topic}>{topic}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows="5"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      placeholder="Tell us how we can help you..."
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 shadow-md disabled:opacity-50"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Contact Methods */}
          <div className="space-y-8">
            {contactMethods.map((method, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg p-8 border border-emerald-100">
                <div className={`w-12 h-12 bg-gradient-to-r from-${method.color}-100 to-${method.color}-200 rounded-xl flex items-center justify-center mb-6`}>
                  <method.icon className={`w-6 h-6 text-${method.color}-600`} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{method.title}</h3>
                <p className={`text-lg font-medium text-${method.color}-600 mb-2`}>{method.info}</p>
                <p className="text-gray-600 text-sm">{method.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Google Maps */}
      <div className="mt-16">
        <LoadScript googleMapsApiKey="AIzaSyAJ8FmdvkXCDNZ3jTju2UmEPOeTe6AZ1-w">
          <GoogleMap
            mapContainerStyle={{ height: "400px", width: "100%" }}
            center={location}
            zoom={12}
            onClick={() => setShowMapInfo(true)}
          >
            <Marker position={location} />
            {showMapInfo && (
              <InfoWindow position={location} onCloseClick={() => setShowMapInfo(false)}>
                <div>
                  <h4 className="font-semibold">Our Location</h4>
                  <p>Visit us at our headquarters in Colombo</p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </LoadScript>
      </div>
    </div>
  );
}
