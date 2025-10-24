// src/App.jsx
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Home, Calendar, Ticket, LogIn, UserPlus, Settings,
  Menu, X, Heart, Shield, Stethoscope, LogOut, MessageSquare,
  Play, Pause, Volume2, VolumeX, ArrowDown, ChevronRight, Eye,
  ChevronLeft, Sparkles, Star, Award
} from "lucide-react";
import logoUrl from "./assets/logo.png";

// Quick packages
import QuickPackageBooking from "./components/QuickPackageBooking";
import DonationReceipt from "./pages/user/DonationReceipt";

// >>> Chatbot (NEW)
import ChatbotWidget from "./components/ChatbotWidget";

// Pages and components
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import ManagerRoute from "./components/ManagerRoute";
import AdminRoute from "./components/AdminRoute";
import CaretakerRoute from "./components/CaretakerRoute";
import VetRoute from "./components/VetRoute";
import { useAuth } from "./context/AuthProvider";

import ManagerDashboard from "./pages/manager/ManagerDashboard";
import RegisterElephant from "./pages/manager/RegisterElephant";
import ManageElephant from "./pages/manager/ManageElephant";
import HealthRequests from "./pages/manager/HealthRequests";
import ManagerAnalytics from "./pages/manager/ManagerAnalytics";


import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageUsers from "./pages/admin/ManageUsers";
import AssignCaretaker from "./pages/admin/AssignCaretaker";
import AdoptionRequests from "./pages/admin/AdoptionRequests";
import ContactDetails from "./pages/admin/ContactDetails";
import AdminAnalytics from "./pages/admin/AdminAnalytics"; // <<< NEW

import CaretakerDashboard from "./pages/caretaker/CaretakerDashboard";
import MyElephants from "./pages/caretaker/MyElephants";
import ComingSoon from "./pages/caretaker/IssueReport";

import VetDashboard from "./pages/vet/VetDashboard";
import AllIssues from "./pages/vet/AllIssues";

import EventCalendar from "./pages/EventCalendar";
import BookEvent from "./pages/BookEvent";
import PaymentPage from "./pages/EventPaymentPage";
import MyBookings from "./pages/MyBookings";
import TicketPage from "./pages/TicketPage";
import EventAnalytics from "./pages/eventmgr/EventAnalytics"; 

import BookEntry from "./pages/BookEntry";
import PaymentEntryPage from "./pages/PaymentEntryPage";
import MyEntryBookings from "./pages/MyEntryBookings";

import MonthlyInvoice from "./pages/admin/MonthlyInvoice";

import Adoption from "./pages/user/Adoption";
import Donation from "./pages/user/Donation";
import ManageProfile from "./pages/profile/ManageProfile";
import MyAdoptedElephants from "./pages/user/MyAdoptedElephants";

// Event manager
import EventManagerRoute from "./components/EventManagerRoute";
import EventManagerDashboard from "./pages/eventmgr/EventManagerDashboard";
import MyEvents from "./pages/eventmgr/MyEvents";
import EntryBookings from "./pages/eventmgr/EntryBookings";

// Static pages + Footer
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import Footer from "./components/Footer";

// Scroll to top on route change
function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search, hash]);
  return null;
}

// Simple Elephant icon
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

// Animated Text Component
const AnimatedText = ({ words, className = "" }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsVisible(true);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span
      className={`${className} transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      {words[currentIndex]}
    </span>
  );
};

// Image Carousel Component
const ImageCarousel = ({ images, autoPlay = true, interval = 4000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoPlay) return;

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, interval);

    return () => clearInterval(timer);
  }, [images.length, autoPlay, interval]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl group">
      {/* Images */}
      <div
        className="flex transition-transform duration-700 ease-in-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((image, index) => (
          <div key={index} className="w-full h-full flex-shrink-0">
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all opacity-0 group-hover:opacity-100"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all opacity-0 group-hover:opacity-100"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentIndex ? "bg-white" : "bg-white/50 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Floating Animation Component
const FloatingElement = ({ children, delay = 0 }) => (
  <div
    className="animate-bounce"
    style={{
      animationDelay: `${delay}s`,
      animationDuration: "3s",
      animationIterationCount: "infinite",
    }}
  >
    {children}
  </div>
);

/* ============================== Enhanced Home Page ============================== */
function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  // Sample images for carousel - replace with your actual images
  const heroImages = [
    { src: "../src/assets/elephants5.jpg", alt: "Elephants in sanctuary" },
    { src: "../src/assets/elephants7.jpg", alt: "Baby elephant playing" },
    { src: "../src/assets/elephants9.jpg", alt: "Elephant family" },
    { src: "../src/assets/elephants8.jpg", alt: "Elephant bathing" },
  ];

  const heroWords = ["Protect", "Rescue", "Nurture", "Conserve", "Love", "Safeguard"];

  const togglePlay = () => {
    const video = document.getElementById("hero-video");
    if (!video) return;
    if (isPlaying) video.pause();
    else video.play();
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = document.getElementById("hero-video");
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const scrollToContent = () => {
    const el = document.getElementById("main-content");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      {/* Enhanced Hero Section with Image Carousel */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image Carousel */}
        <div className="absolute inset-0 z-0">
          <ImageCarousel images={heroImages} />
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60 z-10" />

        {/* Floating Elements */}
        <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
          <FloatingElement delay={0}>
            <div className="absolute top-20 left-20">
              <Heart className="w-8 h-8 text-white/20" />
            </div>
          </FloatingElement>
          <FloatingElement delay={1}>
            <div className="absolute top-40 right-32">
              <Sparkles className="w-6 h-6 text-emerald-300/30" />
            </div>
          </FloatingElement>
          <FloatingElement delay={2}>
            <div className="absolute bottom-40 left-32">
              <Star className="w-7 h-7 text-teal-300/30" />
            </div>
          </FloatingElement>
          <FloatingElement delay={0.5}>
            <div className="absolute bottom-60 right-20">
              <Award className="w-6 h-6 text-cyan-300/30" />
            </div>
          </FloatingElement>
        </div>

        {/* Hero Content */}
        <div className="relative z-30 text-center text-white px-4 max-w-6xl mx-auto">
          {/* Main Heading with Animated Text */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            <AnimatedText
              words={heroWords}
              className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent"
            />
            <br />
            <span className="text-white">Our Elephants</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-4xl mx-auto leading-relaxed">
            Join us in creating a safe haven for Sri Lanka's majestic elephants.
            Experience the wonder of these gentle giants while supporting vital conservation efforts.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Link
              to={user ? "/adoption" : "/register"}
              className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full font-semibold text-lg shadow-2xl hover:shadow-emerald-500/25 hover:scale-105 transition-all overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                {user ? "Adopt Now" : "Join Our Mission"}
                <Heart className="w-5 h-5" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <Link
              to="/calendar"
              className="group px-8 py-4 border-2 border-white/30 rounded-full font-semibold text-lg hover:bg-white/10 hover:border-white/50 transition-all backdrop-blur-sm"
            >
              <span className="flex items-center gap-2">
                Visit Sanctuary
                <Calendar className="w-5 h-5" />
              </span>
            </Link>
          </div>

          {/* Scroll Indicator */}
          <button onClick={scrollToContent} className="animate-bounce hover:animate-pulse transition-all group">
            <div className="flex flex-col items-center gap-2 text-white/80 hover:text-white">
              <span className="text-sm font-medium">Discover More</span>
              <ArrowDown className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </div>
          </button>
        </div>

        {/* Video Controls (if you still want video) */}
        <div className="absolute bottom-6 left-6 z-30 flex gap-4">
          <button
            onClick={togglePlay}
            className="p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all backdrop-blur-sm"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleMute}
            className="p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all backdrop-blur-sm"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </section>

      {/* Main Content Section */}
      <section id="main-content" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Enhanced Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* Adoption Feature */}
            <div className="group relative bg-white rounded-2xl p-8 shadow-lg border border-emerald-100 hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500 to-transparent rounded-bl-full" />
              </div>

              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-emerald-600 transition-colors">
                  Adopt an Elephant
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Create a special bond with one of our rescued elephants. Your adoption helps provide food, medical care, and a safe environment.
                </p>
                <Link to="/adoption" className="inline-flex items-center text-emerald-600 font-semibold hover:text-emerald-700 transition-colors group/link">
                  Learn More
                  <ChevronRight className="w-4 h-4 ml-1 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Events Feature */}
            <div className="group relative bg-white rounded-2xl p-8 shadow-lg border border-emerald-100 hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-teal-500 to-transparent rounded-bl-full" />
              </div>

              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-teal-600 transition-colors">
                  Visit &amp; Events
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Book entry tickets and join special events. Experience the majestic beauty of elephants up close in their natural habitat.
                </p>
                <Link to="/calendar" className="inline-flex items-center text-emerald-600 font-semibold hover:text-emerald-700 transition-colors group/link">
                  View Calendar
                  <ChevronRight className="w-4 h-4 ml-1 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Donation Feature */}
            <div className="group relative bg-white rounded-2xl p-8 shadow-lg border border-emerald-100 hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 overflow-hidden">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500 to-transparent rounded-bl-full" />
              </div>

              <div className="relative z-10">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-cyan-600 transition-colors">
                  Make a Donation
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Support our conservation efforts with a donation. Every contribution helps us protect these magnificent creatures for future generations.
                </p>
                <Link to="/donation" className="inline-flex items-center text-emerald-600 font-semibold hover:text-emerald-700 transition-colors group/link">
                  Donate Now
                  <ChevronRight className="w-4 h-4 ml-1 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* Enhanced View My Adopt Section */}
          <div className="mb-16">
            <div className="max-w-xl mx-auto">
              <button
                onClick={() => navigate("/adoption/mine")}
                aria-label="View my adopted elephants"
                title="View my adopted elephants"
                className="group relative w-full rounded-2xl p-[3px] overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 hover:scale-[1.02]"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
                />
                <span className="relative z-10 flex items-center justify-center gap-3 rounded-[14px] bg-white py-6 px-8 shadow-lg group-hover:shadow-2xl transition-all duration-500">
                  <div className="relative">
                    <Eye className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <div className="absolute -inset-2 bg-emerald-100 rounded-full opacity-0 group-hover:opacity-50 group-hover:scale-150 transition-all duration-500" />
                  </div>
                  <span className="font-bold text-lg text-emerald-700 group-hover:text-emerald-800 transition-colors">
                    View My Adopted Elephants
                  </span>
                  <ChevronRight className="w-6 h-6 text-emerald-600 transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110" />
                </span>
              </button>

              <p className="mt-4 text-center text-gray-600">
                See your adopted elephants, track their progress, view benefits &amp; download certificates.
              </p>
            </div>
          </div>

          {/* Quick Packages wizard */}
          <QuickPackageBooking />

          {/* Enhanced Impact Stats */}
          <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-12 text-white overflow-hidden mb-20">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute top-10 left-10 opacity-10">
                <FloatingElement>
                  <ElephantIcon className="w-32 h-32" />
                </FloatingElement>
              </div>
              <div className="absolute bottom-10 right-10 opacity-10">
                <FloatingElement delay={1}>
                  <ElephantIcon className="w-24 h-24" />
                </FloatingElement>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5">
                <FloatingElement delay={0.5}>
                  <ElephantIcon className="w-40 h-40" />
                </FloatingElement>
              </div>

              {/* Gradient Orbs */}
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-300/10 blur-3xl rounded-full translate-x-1/3 translate-y-1/3" />
            </div>

            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold text-center mb-4">
                Our <AnimatedText words={["Impact", "Mission", "Success", "Journey"]} className="text-yellow-300" />
              </h2>
              <p className="text-xl text-emerald-100 text-center mb-12 max-w-3xl mx-auto">
                Together, we're making a real difference in elephant conservation
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div className="group cursor-pointer">
                  <div className="text-5xl md:text-6xl font-bold mb-2 group-hover:scale-110 transition-transform duration-300">
                    50+
                  </div>
                  <div className="text-emerald-100 text-lg">Elephants Rescued</div>
                  <div className="w-12 h-1 bg-yellow-300 mx-auto mt-2 rounded-full group-hover:w-16 transition-all" />
                </div>
                <div className="group cursor-pointer">
                  <div className="text-5xl md:text-6xl font-bold mb-2 group-hover:scale-110 transition-transform duration-300">
                    500+
                  </div>
                  <div className="text-emerald-100 text-lg">Adoptions Made</div>
                  <div className="w-12 h-1 bg-yellow-300 mx-auto mt-2 rounded-full group-hover:w-16 transition-all" />
                </div>
                <div className="group cursor-pointer">
                  <div className="text-5xl md:text-6xl font-bold mb-2 group-hover:scale-110 transition-transform duration-300">
                    1000+
                  </div>
                  <div className="text-emerald-100 text-lg">Visitors Welcomed</div>
                  <div className="w-12 h-1 bg-yellow-300 mx-auto mt-2 rounded-full group-hover:w-16 transition-all" />
                </div>
                <div className="group cursor-pointer">
                  <div className="text-5xl md:text-6xl font-bold mb-2 group-hover:scale-110 transition-transform duration-300">
                    10+
                  </div>
                  <div className="text-emerald-100 text-lg">Years of Service</div>
                  <div className="w-12 h-1 bg-yellow-300 mx-auto mt-2 rounded-full group-hover:w-16 transition-all" />
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Conservation Story Section */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Our <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Conservation Story</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                For over a decade, we have been dedicated to the protection and rehabilitation of Sri Lanka's elephant population through innovative conservation programs and community engagement.
              </p>
            </div>

            {/* Story Sections with Enhanced Images */}
            <div className="space-y-20">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h3 className="text-3xl font-bold text-gray-900">Rescue &amp; Rehabilitation</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Our dedicated team works around the clock to rescue elephants from dangerous situations including human-elephant conflicts, injuries, and abandonment. Each rescued elephant receives comprehensive medical care and psychological support.
                  </p>
                  <div className="space-y-4">
                    {[
                      "24/7 Emergency rescue operations",
                      "Advanced veterinary medical facilities",
                      "Specialized rehabilitation programs",
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 group">
                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                        <span className="text-gray-700 group-hover:text-emerald-600 transition-colors">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-r  blur-lg opacity-30 group-hover:opacity-50 transition-opacity rounded-3xl" />
                  <div className="relative bg-gradient-to-r  rounded-2xl p-2 h-96 overflow-hidden">
                    <ImageCarousel
                      images={[
                        { src: "../src/assets/elephants1.jpg", alt: "Elephant rescue" },
                        { src: "../src/assets/elephants3.jpg", alt: "Medical care" },
                        { src: "../src/assets/elephants5.jpg", alt: "Rehabilitation" },
                      ]}
                      interval={3000}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="relative group order-2 lg:order-1">
                  <div className="absolute -inset-4 bg-gradient-to-r  blur-lg opacity-30 group-hover:opacity-50 transition-opacity rounded-3xl" />
                  <div className="relative bg-gradient-to-r  rounded-2xl p-2 h-96 overflow-hidden">
                    <ImageCarousel
                      images={[
                        { src: "../src/assets/elephants11.jpg", alt: "Community work" },
                        { src: "../src/assets/elephants9.jpg", alt: "Education programs" },
                        { src: "../src/assets/elephants6.jpg", alt: "Eco-tourism" },
                      ]}
                      interval={3500}
                    />
                  </div>
                </div>
                <div className="space-y-6 order-1 lg:order-2">
                  <h3 className="text-3xl font-bold text-gray-900">Community Impact</h3>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    We work closely with local communities to create sustainable solutions that benefit both elephants and people. Our programs include education initiatives, eco-tourism development, and conflict mitigation strategies.
                  </p>
                  <div className="space-y-4">
                    {[
                      "Educational outreach programs",
                      "Sustainable eco-tourism initiatives",
                      "Human-elephant conflict resolution",
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 group">
                        <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                        <span className="text-gray-700 group-hover:text-teal-600 transition-colors">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Success Stories */}
          <div className="mb-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                <AnimatedText
                  words={["Success", "Rescue", "Hope", "Victory"]}
                  className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent"
                />{" "}
                Stories
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Every elephant has a story. Here are some of our most heartwarming rescue and rehabilitation successes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: "Kumari's Journey",
                  story:
                    "Rescued as an orphaned calf, Kumari has grown into a healthy adult elephant and now helps care for other young elephants in our sanctuary.",
                  year: "2018",
                  image: "../src/assets/elephants1.jpg",
                },
                {
                  name: "Raja's Recovery",
                  story:
                    "After suffering severe injuries from a vehicle collision, Raja made a full recovery through our intensive medical care program.",
                  year: "2020",
                  image: "../src/assets/elephants2.jpg",
                },
                {
                  name: "Nanda's New Life",
                  story:
                    "Once trapped in a conflict zone, Nanda now thrives in our protected habitat and has become a mother to two healthy calves.",
                  year: "2019",
                  image: "../src/assets/elephants4.jpg",
                },
              ].map((story, index) => (
                <div
                  key={index}
                  className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={story.image}
                      alt={story.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t ${story.gradient} opacity-60 group-hover:opacity-40 transition-opacity`}
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-semibold text-gray-800">
                      {story.year}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors">
                      {story.name}
                    </h3>
                    <p className="text-gray-600 mb-4 leading-relaxed">{story.story}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-emerald-600 font-medium">Rescued in {story.year}</div>
                      <Heart className="w-5 h-5 text-red-400 group-hover:text-red-500 group-hover:scale-110 transition-all" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Get Involved Section */}
          <div className="mb-20">
            <div className="relative bg-cover bg-center rounded-3xl overflow-hidden">
              {/* Background Image with Overlay */}
              <div className="absolute inset-0">
                <img
                  src="../src/assets/elephants7.jpg"
                  alt="Get Involved Background"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/70" />
              </div>

              {/* Animated Background Elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <FloatingElement>
                  <div className="absolute top-10 left-10">
                    <Calendar className="w-16 h-16 text-white/10" />
                  </div>
                </FloatingElement>
                <FloatingElement delay={1}>
                  <div className="absolute bottom-10 right-10">
                    <Heart className="w-12 h-12 text-white/10" />
                  </div>
                </FloatingElement>
                <FloatingElement delay={0.5}>
                  <div className="absolute top-1/3 right-1/4">
                    <Ticket className="w-10 h-10 text-white/10" />
                  </div>
                </FloatingElement>
              </div>

              <div className="relative z-10 p-12 text-white text-center">
                <h2 className="text-4xl md:text-6xl font-bold mb-8">
                  Get <AnimatedText words={["Involved", "Engaged", "Connected", "Active"]} className="text-yellow-300" /> Today
                </h2>
                <p className="text-xl text-gray-200 mb-12 max-w-4xl mx-auto leading-relaxed">
                  There are many ways you can help us protect Sri Lanka's elephants. Whether through adoption, donations, volunteering, or simply visiting, every action makes a difference.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                  {[
                    { icon: Heart, title: "Adopt", desc: "Support an elephant with monthly contributions", color: "bg-emerald-500" },
                    { icon: Calendar, title: "Visit", desc: "Experience elephants in their natural habitat", color: "bg-teal-500" },
                    { icon: Heart, title: "Donate", desc: "Make a one-time or recurring donation", color: "bg-cyan-500" },
                    { icon: MessageSquare, title: "Share", desc: "Spread awareness about elephant conservation", color: "bg-blue-500" },
                  ].map((item, index) => (
                    <div key={index} className="group text-center">
                      <div className={`w-16 h-16 ${item.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                        <item.icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-300 transition-colors">{item.title}</h3>
                      <p className="text-gray-300 text-sm group-hover:text-white transition-colors">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to={user ? "/adoption" : "/register"}
                    className="group relative inline-flex items-center px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full font-semibold text-lg shadow-2xl hover:shadow-emerald-500/50 hover:scale-105 transition-all overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {user ? "Start Adopting" : "Join Our Mission"}
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>

                  <Link
                    to="/calendar"
                    className="inline-flex items-center px-8 py-4 border-2 border-white/50 text-white rounded-full font-semibold text-lg hover:bg-white/10 hover:border-white transition-all backdrop-blur-sm"
                  >
                    Explore Events
                    <Calendar className="w-5 h-5 ml-2" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Newsletter Section */}
          <div className="mb-20">
            <div className="relative rounded-3xl overflow-hidden border border-teal-100 shadow-2xl">
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-teal-50 to-green-50">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5" />
              </div>

              {/* Floating Orbs */}
              <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-200/30 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              <div
                className="absolute bottom-0 right-0 w-56 h-56 bg-cyan-200/30 blur-3xl rounded-full translate-x-1/3 translate-y-1/3 animate-pulse"
                style={{ animationDelay: "1s" }}
              />

              <div className="relative z-10 max-w-3xl mx-auto text-center px-8 py-16">
                {/* Animated Logo */}
                <div className="flex items-center justify-center mb-8 group">
                  <div className="relative">
                    <img
                      src="../src/assets/logo.png"
                      alt="Hasthi.lk Logo"
                      className="h-20 w-20 object-contain rounded-full bg-white p-2 shadow-lg group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute -inset-2 border-2 border-emerald-200 rounded-full animate-pulse" />
                  </div>
                </div>

                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
                  Stay{" "}
                  <AnimatedText
                    words={["Connected", "Updated", "Informed", "Engaged"]}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
                  />
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
                  Subscribe to our newsletter to receive updates about our elephants, conservation efforts, and upcoming events. Join our community of elephant lovers!
                </p>

                <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-6">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className="flex-1 px-6 py-4 rounded-xl border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all bg-white/80 backdrop-blur-sm"
                  />
                  <button
                    type="submit"
                    className="group px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 via-teal-500 to-green-500 shadow-lg hover:shadow-2xl hover:scale-105 transition-all relative overflow-hidden"
                  >
                    <span className="relative z-10">Subscribe</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-teal-400 to-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </form>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Shield className="w-4 h-4" />
                  <span>We respect your privacy. Unsubscribe at any time.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =========================== Role-based links =========================== */
const getRoleLinks = (user) => {
  const staticLinks = [];

  if (!user) {
    return [
      { to: "/", icon: Home, label: "Home" },
      { to: "/calendar", icon: Calendar, label: "Calendar" },
      { to: "/entry/book", icon: Ticket, label: "Entry Ticket" },
      { to: "/about", icon: Heart, label: "About" },
      { to: "/contact", icon: MessageSquare, label: "Contact" },
      { to: "/login", icon: LogIn, label: "Login" },
      { to: "/register", icon: UserPlus, label: "Register" },
      ...staticLinks,
    ];
  }

  const role = user.role?.toLowerCase();

  if (["admin", "caretaker", "veterinarian", "manager"].includes(role)) {
    const map = {
      admin: { to: "/admin", icon: Shield, label: "Admin Dashboard" },
      caretaker: { to: "/caretaker", icon: Heart, label: "Caretaker Dashboard" },
      veterinarian: { to: "/vet", icon: Stethoscope, label: "Vet Dashboard" },
      manager: { to: "/manager", icon: Settings, label: "Manager Dashboard" },
    };
    const links = [{ to: "/", icon: Home, label: "Home" }, map[role], ...staticLinks];

    if (role === "admin") {
      links.push({ to: "/admin/contact-details", icon: MessageSquare, label: "Contact List" });
    }

    return links;
  }

  if (role === "eventmanager") {
    return [
      { to: "/", icon: Home, label: "Home" },
      { to: "/eventmgr", icon: Calendar, label: "Event Manager" },
      { to: "/calendar", icon: Calendar, label: "Calendar" },
      ...staticLinks,
    ];
  }

  if (role === "user") {
    return [
      { to: "/", icon: Home, label: "Home" },
      { to: "/calendar", icon: Calendar, label: "Calendar" },
      { to: "/bookings", icon: Calendar, label: "My Bookings" },
      { to: "/entry/book", icon: Ticket, label: "Entry Ticket" },
      { to: "/entry/my", icon: Ticket, label: "My Entries" },
      { to: "/about", icon: Heart, label: "About" },
      { to: "/contact", icon: MessageSquare, label: "Contact" },
      ...staticLinks,
    ];
  }

  return [...staticLinks];
};

/* ============================== Navigation ============================== */
function Nav() {
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout?.();
    navigate("/");
  };

  const roleLinks = getRoleLinks(user);

  return (
    <>
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMenuOpen(false)} />
      )}

      {/* Enhanced Sticky Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 shadow-2xl backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Enhanced Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative w-12 h-12">
                <img
                  src={logoUrl}
                  alt="Hasthi.lk Logo"
                  className="h-12 w-12 object-contain rounded-full bg-white p-1 shadow-lg"
                  onError={(e) => {
                    // fallback to icon if image fails
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.nextElementSibling;
                    if (fallback) fallback.classList.remove("hidden");
                  }}
                />
                {/* Fallback icon (hidden unless image fails) */}
                <div className="hidden absolute inset-0 flex items-center justify-center">
                  <ElephantIcon className="w-10 h-10 text-white/90" />
                </div>
              </div>
              <span className="text-2xl font-bold text-white tracking-tight group-hover:text-yellow-200 transition-colors">
                Hasthi.Lk
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              {roleLinks.map((l) => (
                <NavItem key={l.to} to={l.to} icon={l.icon}>
                  {l.label}
                </NavItem>
              ))}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white hover:bg-white/20 transition-all font-medium group"
                >
                  <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="whitespace-nowrap leading-none">Logout</span>
                </button>
              ) : null}
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-2">
              {user && <ProfileAvatar user={user} />}
              <button
                onClick={() => setIsMenuOpen((v) => !v)}
                className="md:hidden p-2 rounded-lg text-white hover:bg-white/20 transition-all"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Mobile Menu */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className="bg-black/20 backdrop-blur-sm border-t border-white/10">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 space-y-2">
              <MobileNavLinks links={roleLinks} onNavigate={() => setIsMenuOpen(false)} />
              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 p-3 rounded-lg text-white hover:bg-white/20 transition-all w-full group"
                >
                  <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium whitespace-nowrap leading-none">Logout</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

const NavItem = ({ to, icon: Icon, children, className = "" }) => (
  <Link
    to={to}
    className={`group inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:bg-white/20 transition-all font-medium ${className}`}
  >
    <Icon className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" />
    {/* Prevent labels like "Entry Ticket" from breaking to two lines */}
    <span className="whitespace-nowrap leading-none">{children}</span>
  </Link>
);

const ProfileAvatar = ({ user }) => (
  <Link
    to="/profile"
    className="group flex items-center space-x-2 p-1 rounded-full hover:bg-white/20 transition-all"
    title="Manage Profile"
  >
    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold border-2 border-white/30 overflow-hidden group-hover:scale-110 transition-transform">
      {user.avatar ? (
        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <span>{(user.name?.[0] || "?").toUpperCase()}</span>
      )}
    </div>
  </Link>
);

const MobileNavLinks = ({ links, onNavigate }) => (
  <>
    {links.map((l) => (
      <MobileNavLink key={l.to} to={l.to} icon={l.icon} onClick={onNavigate}>
        {l.label}
      </MobileNavLink>
    ))}
  </>
);

const MobileNavLink = ({ to, icon: Icon, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="group flex items-center space-x-3 p-3 rounded-lg text-white hover:bg-white/20 transition-all"
  >
    <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
    {/* Keep single-line labels in the mobile list too */}
    <span className="font-medium whitespace-nowrap leading-none">{children}</span>
  </Link>
);

/* ============================== Not Found ============================== */
function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      <div className="relative bg-white/80 backdrop-blur rounded-3xl border border-emerald-100 shadow-2xl p-10 max-w-2xl mx-auto text-center">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
          <ElephantIcon className="w-10 h-10 text-white" />
        </div>
        <h1 className="mt-6 text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          404
        </h1>
        <p className="mt-3 text-xl font-semibold text-gray-900">Page Not Found</p>
        <p className="mt-2 text-gray-600">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md transition"
          >
            Go Home
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ============================== App Routes ============================== */
export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
        <Nav />
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/calendar" element={<EventCalendar />} />

            {/* Event booking */}
            <Route path="/events/:id/book" element={<ProtectedRoute><BookEvent /></ProtectedRoute>} />
            <Route path="/payments/:id" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
            <Route path="/tickets/:id" element={<ProtectedRoute><TicketPage /></ProtectedRoute>} />

            {/* Entry tickets */}
            <Route path="/entry/book" element={<BookEntry />} />
            <Route path="/payments/entry/:id" element={<ProtectedRoute><PaymentEntryPage /></ProtectedRoute>} />
            <Route path="/entry/my" element={<ProtectedRoute><MyEntryBookings /></ProtectedRoute>} />

            {/* User stuff */}
            <Route path="/donation" element={<ProtectedRoute><Donation /></ProtectedRoute>} />
            <Route path="/adoption" element={<ProtectedRoute><Adoption /></ProtectedRoute>} />
            <Route path="/adoption/mine" element={<ProtectedRoute><MyAdoptedElephants /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ManageProfile /></ProtectedRoute>} />
            <Route path="/donations/receipt" element={<DonationReceipt />} />

            {/* Manager */}
            <Route path="/manager" element={<ManagerRoute><ManagerDashboard /></ManagerRoute>}>
              <Route index element={<Navigate to="register-elephant" replace />} />
              <Route path="register-elephant" element={<RegisterElephant />} />
              <Route path="manage-elephant" element={<ManageElephant />} />
              <Route path="health-requests" element={<HealthRequests />} />
              <Route path="analytics" element={<ManagerAnalytics />} />
            </Route>

            {/* Admin */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>}>
              {/* Default to Analytics tab to showcase visualizations */}
              <Route index element={<Navigate to="analytics" replace />} />
              <Route path="analytics" element={<AdminAnalytics />} /> {/* <<< NEW */}
              <Route path="manage-users" element={<ManageUsers />} />
              <Route path="assign-caretaker" element={<AssignCaretaker />} />
              <Route path="adoption-requests" element={<AdoptionRequests />} />
              <Route path="reports" element={<MonthlyInvoice />} />
              <Route path="contact-details" element={<ContactDetails />} />
            </Route>

            {/* Caretaker */}
            <Route path="/caretaker" element={<CaretakerRoute><CaretakerDashboard /></CaretakerRoute>}>
              <Route index element={<Navigate to="my-elephants" replace />} />
              <Route path="my-elephants" element={<MyElephants />} />
              <Route path="coming-soon" element={<ComingSoon />} />
            </Route>

            {/* Vet */}
            <Route path="/vet" element={<VetRoute><VetDashboard /></VetRoute>}>
              <Route index element={<Navigate to="issues" replace />} />
              <Route path="issues" element={<AllIssues />} />
            </Route>

            {/* Event Manager */}
            <Route
              path="/eventmgr"
              element={
                <EventManagerRoute>
                  <EventManagerDashboard />
                </EventManagerRoute>
              }
            >
              <Route index element={<Navigate to="events" replace />} />
              <Route path="events" element={<MyEvents />} />
              <Route path="entry-bookings" element={<EntryBookings />} />
                <Route path="analytics" element={<EventAnalytics />} />
            </Route>

            {/* Static pages */}
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>

        {/* >>> Chatbot floating on all pages (NEW) */}
        <ChatbotWidget />

        <Footer />
      </div>
    </BrowserRouter>
  );
}
