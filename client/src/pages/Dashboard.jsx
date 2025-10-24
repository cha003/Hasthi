// client/src/pages/Dashboard.jsx
import React from "react";
import { useAuth } from "../context/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Heart, Gift, Calendar, Ticket, Users, Sparkles, ArrowRight, Eye } from "lucide-react";

// Elephant SVG (brand icon)
const ElephantIcon = ({ className = "w-8 h-8", color = "currentColor" }) => (
  <svg viewBox="0 0 100 100" className={className} fill={color} aria-hidden="true">
    <path d="M20 60c0-15 10-25 25-25s25 10 25 25c0 8-3 15-8 20h-34c-5-5-8-12-8-20z"/>
    <circle cx="35" cy="55" r="2" fill="white"/>
    <path d="M15 65c-5 0-8 3-8 8s3 8 8 8c2 0 4-1 5-2"/>
    <path d="M45 40c-8-5-15-3-20 2"/>
    <circle cx="25" cy="75" r="8" opacity="0.1"/>
    <circle cx="55" cy="75" r="8" opacity="0.1"/>
  </svg>
);

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          {/* Decorative elephants */}
          <div className="absolute top-8 left-8 opacity-10 animate-pulse">
            <ElephantIcon className="w-24 h-24 text-white" />
          </div>
          <div className="absolute bottom-8 right-8 opacity-10 rotate-12">
            <ElephantIcon className="w-32 h-32 text-white" />
          </div>
          <div className="absolute top-1/2 left-1/4 opacity-5">
            <ElephantIcon className="w-40 h-40 text-white" />
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <ElephantIcon className="w-16 h-16 text-white mr-4" />
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Welcome to Hasthi.lk
              </h1>
            </div>
            <p className="text-xl text-emerald-100 mb-8 max-w-3xl mx-auto">
              Join us in protecting and caring for Sri Lanka&apos;s majestic elephants.
              Every donation and adoption makes a difference in their lives.
            </p>
            {user && (
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 inline-block border border-white/30">
                <p className="text-white text-lg mb-2">
                  Hello, <span className="font-semibold">{user.name}</span>!
                </p>
                <p className="text-emerald-100 capitalize flex items-center justify-center">
                  <Users className="w-5 h-5 mr-2" />
                  Role: {user.role}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Primary Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Donation Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-pink-50 opacity-50" />
            <div className="absolute top-4 right-4 opacity-10">
              <Gift className="w-20 h-20 text-rose-500" />
            </div>

            <div className="relative p-8">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900">Donation</h3>
                  <div className="w-12 h-1 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"></div>
                </div>
              </div>

              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Support elephant care, food, and medical expenses. Your generosity directly impacts
                the wellbeing of these magnificent creatures.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center text-gray-600">
                  <Heart className="w-5 h-5 text-rose-500 mr-3" />
                  <span>Direct impact on elephant welfare</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Sparkles className="w-5 h-5 text-rose-500 mr-3" />
                  <span>Transparent fund allocation</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 text-rose-500 mr-3" />
                  <span>Join our community of supporters</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/donation")}
                className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-rose-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center group shadow-lg hover:shadow-xl"
              >
                <span>Donate Now</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Adoption Card */}
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-50" />
            <div className="absolute top-4 right-4 opacity-10">
              <Heart className="w-20 h-20 text-emerald-500" />
            </div>

            <div className="relative p-8">
              <div className="flex items-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-2xl font-bold text-gray-900">Adoption</h3>
                  <div className="w-12 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"></div>
                </div>
              </div>

              <p className="text-gray-600 text-lg leading-relaxed mb-8">
                Choose an elephant to symbolically adopt and follow their journey.
                Build a special connection while supporting their care.
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-center text-gray-600">
                  <ElephantIcon className="w-5 h-5 text-emerald-500 mr-3" />
                  <span>Personal connection with elephants</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-5 h-5 text-emerald-500 mr-3" />
                  <span>Regular updates and photos</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Ticket className="w-5 h-5 text-emerald-500 mr-3" />
                  <span>Special adoption certificate</span>
                </div>
              </div>

              <button
                onClick={() => navigate("/adoption")}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 flex items-center justify-center group shadow-lg hover:shadow-xl"
              >
                <span>Browse Elephants</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
        {/* NEW: View My Adopt button (below Donation & Adoption) */}
        <div className="mb-16">
          <div className="max-w-xl mx-auto">
            <button
              onClick={() => navigate("/adoption/mine")}
              className="w-full bg-white border border-emerald-200 hover:border-emerald-400 shadow-sm hover:shadow-md transition-all rounded-xl py-4 px-6 flex items-center justify-center text-emerald-700 font-semibold"
            >
              <Eye className="w-5 h-5 mr-2" />
              View My Adopt
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Our Impact Together
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <ElephantIcon className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-emerald-600 mb-2">150+</div>
              <div className="text-gray-600 font-medium">Elephants Protected</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-rose-600 mb-2">$50K+</div>
              <div className="text-gray-600 font-medium">Donated This Month</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">1000+</div>
              <div className="text-gray-600 font-medium">Active Adoptions</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-2">5K+</div>
              <div className="text-gray-600 font-medium">Community Members</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-12 text-white">
          <ElephantIcon className="w-20 h-20 text-white mx-auto mb-6 opacity-90" />
          <h3 className="text-3xl font-bold mb-4">Every Action Makes a Difference</h3>
          <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
            Join thousands of others who are making a real impact in elephant conservation.
            Together, we can ensure these magnificent creatures thrive for generations to come.
          </p>
        </div>
      </div>
    </div>
  );
}
