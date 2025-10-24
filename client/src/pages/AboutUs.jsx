import { Heart, Shield, Users, MapPin, Stethoscope, Leaf, Award, Globe } from "lucide-react";

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

export default function AboutUs() {
  const features = [
    {
      icon: Heart,
      title: "Elephant Adoption",
      description: "Connect with individual elephants through our transparent adoption program"
    },
    {
      icon: Stethoscope,
      title: "Veterinary Care",
      description: "Professional medical support and health monitoring for every elephant"
    },
    {
      icon: Users,
      title: "Expert Caretakers",
      description: "Experienced mahouts and caretakers ensuring daily wellbeing"
    },
    {
      icon: Shield,
      title: "Ethical Practices",
      description: "Committed to the highest standards of elephant welfare and conservation"
    }
  ];

  const stats = [
    { number: "200+", label: "Elephants Protected", icon: ElephantIcon },
    { number: "50+", label: "Dedicated Caretakers", icon: Users },
    { number: "15+", label: "Partner Sanctuaries", icon: MapPin },
    { number: "5+", label: "Years of Service", icon: Award }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-10 opacity-10">
             <img
          src="../src/assets/logo.png"
          alt="Hasthi.lk Logo"
          className="h-35 w-35 object-contain shrink-0 rounded-full bg-white p-1 shadow-md"
        />
          </div>
          <div className="absolute bottom-10 left-10 opacity-10 rotate-180">
            <img
          src="../src/assets/logo.png"
          alt="Hasthi.lk Logo"
          className="h-35 w-35 object-contain shrink-0 rounded-full bg-white p-1 shadow-md"
        />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl">
                 <img
          src="../src/assets/logo.png"
          alt="Hasthi.lk Logo"
          className="h-35 w-35 object-contain shrink-0 rounded-full bg-white p-1 shadow-md"
        />
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">
              About Hasthi.Lk
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mx-auto mb-6" />
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Sri Lanka's pioneering elephant adoption and care management platform,
              bridging the gap between conservation and community involvement
            </p>
          </div>

          {/* Main Content Cards */}
          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            {/* Mission Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-emerald-100 relative overflow-hidden">
              <div className="absolute top-4 right-4 opacity-10">
                <Globe className="w-16 h-16 text-emerald-500" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center mr-4">
                    <Heart className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Our Mission</h2>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Welcome to <span className="font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Hasthi.Lk</span> — 
                  Sri Lanka's first elephant adoption and care management platform. Our mission is to bring people 
                  closer to elephants by enabling transparent adoption programs, supporting caretakers and veterinarians, 
                  and ensuring sustainable conservation practices.
                </p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-emerald-700">Pioneering Conservation Technology</span>
                </div>
              </div>
            </div>

            {/* Values Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-emerald-100 relative overflow-hidden">
              <div className="absolute top-4 right-4 opacity-10">
                <Leaf className="w-16 h-16 text-teal-500" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-100 to-cyan-100 rounded-xl flex items-center justify-center mr-4">
                    <Shield className="w-6 h-6 text-teal-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Our Values</h2>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We collaborate with trusted sanctuaries and wildlife organizations to ensure safe, 
                  healthy, and ethical environments for elephants. Every adoption or donation directly 
                  contributes to food, medicine, and caretaking expenses.
                </p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-teal-700">Transparent & Ethical Operations</span>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-emerald-100 mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Our Impact</h2>
              <div className="w-16 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mx-auto" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:from-emerald-100 group-hover:to-teal-100 transition-all duration-200 border border-emerald-100">
                    <stat.icon className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">
                    {stat.number}
                  </div>
                  <div className="text-gray-600 font-medium text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">What We Offer</h2>
              <div className="w-20 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mx-auto mb-4" />
              <p className="text-gray-600 max-w-2xl mx-auto">
                Comprehensive elephant care and conservation services designed for the modern world
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100 hover:shadow-xl transition-all duration-200 group hover:-translate-y-1">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center mb-4 group-hover:from-emerald-500 group-hover:to-teal-500 transition-all duration-200">
                    <feature.icon className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors duration-200" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Vision Statement */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-xl p-8 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12" />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <img
          src="../src/assets/logo.png"
          alt="Hasthi.lk Logo"
          className="h-35 w-35 object-contain shrink-0 rounded-full bg-white p-1 shadow-md"
        />
              </div>
              <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
              <p className="text-xl leading-relaxed max-w-3xl mx-auto opacity-95">
                Together, we believe in a future where elephants thrive in harmony with people, 
                culture, and nature. Join us in creating a sustainable ecosystem where conservation 
                meets innovation.
              </p>
              <div className="flex items-center justify-center space-x-2 mt-6">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}