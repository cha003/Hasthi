import { Link } from "react-router-dom";
import { 
  MapPin, Phone, Mail, Heart, Shield, Globe,
  Facebook, Twitter, Instagram, Youtube, ArrowRight, Star
} from "lucide-react";

// Enhanced Elephant Icon
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

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { to: "/about", label: "About Us", icon: Heart },
    { to: "/contact", label: "Contact Us", icon: Mail },
    { to: "/donation", label: "Make Donation", icon: Heart },
    { to: "/adoption", label: "Adopt Elephant", icon: Shield }
  ];

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook", color: "hover:text-blue-400" },
    { icon: Twitter, href: "#", label: "Twitter", color: "hover:text-sky-400" },
    { icon: Instagram, href: "#", label: "Instagram", color: "hover:text-pink-400" },
    { icon: Youtube, href: "#", label: "YouTube", color: "hover:text-red-400" }
  ];

  const legalLinks = [
    { to: "/privacy", label: "Privacy Policy" },
    { to: "/terms", label: "Terms of Service" },
    { to: "/cookies", label: "Cookie Policy" }
  ];

  return (
    <footer className="relative mt-12 overflow-hidden">
      {/* Background with decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        {/* Decorative overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
        
        {/* Floating elephants */}
        <div className="absolute top-8 right-16 opacity-10">
          <ElephantIcon className="w-32 h-32 text-white" />
        </div>
        <div className="absolute bottom-16 left-12 opacity-10 rotate-12">
          <ElephantIcon className="w-24 h-24 text-white" />
        </div>
        
        {/* Gradient orbs */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-32 -translate-y-32" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-x-24 translate-y-24" />
      </div>

      <div className="relative z-10 text-white">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-1 md:col-span-2">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4 backdrop-blur-sm">
                  <img
          src="../src/assets/logo.png"
          alt="Hasthi.lk Logo"
          className="h-35 w-35 object-contain shrink-0 rounded-full bg-white p-1 shadow-md"
        />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
                    Hasthi.Lk
                  </h2>
                  <div className="w-16 h-0.5 bg-gradient-to-r from-white/60 to-transparent rounded-full" />
                </div>
              </div>
              <p className="text-white/80 leading-relaxed mb-6 text-sm">
                Sri Lanka's premier elephant adoption and care platform. 
                Connecting compassionate hearts with elephant conservation through 
                transparent, ethical, and sustainable practices.
              </p>
              
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">200+</div>
                  <div className="text-xs text-white/60">Elephants</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">50+</div>
                  <div className="text-xs text-white/60">Caretakers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">15+</div>
                  <div className="text-xs text-white/60">Sanctuaries</div>
                </div>
              </div>

              {/* Newsletter */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <h4 className="font-semibold mb-2 text-sm">Stay Updated</h4>
                <div className="flex">
                  <input 
                    type="email" 
                    placeholder="Your email"
                    className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded-l-lg text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                  <button className="px-4 py-2 bg-white/20 border border-white/30 border-l-0 rounded-r-lg hover:bg-white/30 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-bold text-lg mb-6 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-teal-200" />
                Quick Links
              </h3>
              <ul className="space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <Link 
                      to={link.to} 
                      className="flex items-center text-white/80 hover:text-white hover:translate-x-1 transition-all duration-200 group text-sm"
                    >
                      <link.icon className="w-4 h-4 mr-3 text-green-200 group-hover:text-white transition-colors" />
                      <span>{link.label}</span>
                      <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Additional Links */}
              <div className="mt-8">
                <h4 className="font-semibold text-sm mb-3 text-teal-200">Support</h4>
                <ul className="space-y-2">
                  <li><Link to="/help" className="text-xs text-white/60 hover:text-white/80 transition-colors">Help Center</Link></li>
                  <li><Link to="/faq" className="text-xs text-white/60 hover:text-white/80 transition-colors">FAQ</Link></li>
                  <li><Link to="/volunteer" className="text-xs text-white/60 hover:text-white/80 transition-colors">Volunteer</Link></li>
                </ul>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="font-bold text-lg mb-6 flex items-center">
                <Phone className="w-5 h-5 mr-2 text-blue-200" />
                Get in Touch
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 group">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
                    <MapPin className="w-4 h-4 text-green-200" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Our Location</p>
                    <p className="text-white/70 text-sm">Colombo, Sri Lanka</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 group">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
                    <Phone className="w-4 h-4 text-teal-200" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Call Us</p>
                    <p className="text-white/70 text-sm">+94 77 123 4567</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 group">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
                    <Mail className="w-4 h-4 text-blue-200" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Email Support</p>
                    <p className="text-white/70 text-sm">support@hasthi.lk</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social & Recognition */}
            <div>
              <h3 className="font-bold text-lg mb-6 flex items-center">
                <Star className="w-5 h-5 mr-2 text-green-200" />
                Connect & Awards
              </h3>
              
              {/* Social Media */}
              <div className="mb-8">
                <h4 className="font-semibold text-sm mb-4 text-blue-100">Follow Us</h4>
                <div className="flex space-x-3">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.href}
                      title={social.label}
                      className={`w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/20 ${social.color} transition-all duration-200 hover:scale-110 hover:-translate-y-1`}
                    >
                      <social.icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div className="mb-6">
                <h4 className="font-semibold text-sm mb-3 text-teal-100">Certifications</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-xs text-white/70">
                    <Shield className="w-3 h-3 mr-2 text-green-200" />
                    Wildlife Conservation Certified
                  </div>
                  <div className="flex items-center text-xs text-white/70">
                    <Star className="w-3 h-3 mr-2 text-teal-200" />
                    ISO 14001 Environmental Standards
                  </div>
                  <div className="flex items-center text-xs text-white/70">
                    <Heart className="w-3 h-3 mr-2 text-blue-200" />
                    Ethical Animal Care Accredited
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="text-center">
                  <div className="text-xs text-white/60 mb-1">Trusted by</div>
                  <div className="text-sm font-semibold text-white">1000+ Families</div>
                  <div className="flex justify-center mt-2">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} className="w-3 h-3 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 bg-black/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-center md:text-left">
                <p className="text-sm text-white/80">
                  © {currentYear} <span className="font-semibold">Hasthi.Lk</span> — All Rights Reserved
                </p>
                <p className="text-xs text-white/60 mt-1">
                  Committed to elephant welfare and conservation in Sri Lanka
                </p>
              </div>
              
              <div className="flex items-center space-x-6">
                {legalLinks.map((link, index) => (
                  <Link 
                    key={index}
                    to={link.to} 
                    className="text-xs text-white/60 hover:text-white/80 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
