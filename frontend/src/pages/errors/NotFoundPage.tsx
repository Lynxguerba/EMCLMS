import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <>
      {/* Main Container */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100"></div>
        
        {/* Content Container */}
        <div className="relative w-full max-w-2xl z-10">
          <div className="p-8 sm:p-12">
            {/* Animated 404 Illustration */}
            <div className="flex justify-center mb-8">
              <div className="relative w-64 h-64">
                {/* Outer rotating circle */}
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full animate-spin-slow opacity-30"></div>
                
                {/* Middle rotating circle - opposite direction */}
                <div className="absolute inset-8 border-4 border-blue-300 rounded-full animate-spin-reverse opacity-40"></div>
                
                {/* Inner pulsing circle */}
                <div className="absolute inset-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full animate-pulse-slow"></div>
                
                {/* 404 Text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-7xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 bg-clip-text text-transparent animate-float">
                      404
                    </h1>
                  </div>
                </div>
                
                {/* Floating particles */}
                <div className="absolute top-8 left-8 w-3 h-3 bg-blue-400 rounded-full animate-float-particle-1"></div>
                <div className="absolute top-16 right-12 w-2 h-2 bg-blue-500 rounded-full animate-float-particle-2"></div>
                <div className="absolute bottom-16 left-16 w-4 h-4 bg-blue-300 rounded-full animate-float-particle-3"></div>
                <div className="absolute bottom-8 right-8 w-2 h-2 bg-blue-600 rounded-full animate-float-particle-4"></div>
              </div>
            </div>

            {/* Error Message */}
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 bg-clip-text text-transparent mb-4">
                Page Not Found
              </h2>
              <p className="text-gray-600 text-base sm:text-lg max-w-md mx-auto">
                Oops! The page you're looking for doesn't exist or has been moved.
                Let's get you back on track.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => navigate(-1)}
                className="group w-full sm:w-auto px-8 py-3 bg-white border-2 border-blue-900 text-blue-900 font-semibold rounded-xl shadow-md hover:shadow-xl hover:shadow-blue-900/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-blue-900/0 via-blue-900/10 to-blue-900/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200 relative z-10" />
                <span className="relative z-10">Go Back</span>
              </button>

              <button
                onClick={() => navigate("/")}
                className="group w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 hover:from-blue-950 hover:via-blue-900 hover:to-blue-950 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-900/50 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 relative overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                <Home className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 relative z-10" />
                <span className="relative z-10">Go Home</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wave1 {
          0% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-25%) translateY(-10px); }
          100% { transform: translateX(0) translateY(0); }
        }
        
        @keyframes wave2 {
          0% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-15%) translateY(-15px); }
          100% { transform: translateX(0) translateY(0); }
        }
        
        @keyframes wave3 {
          0% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-20%) translateY(-8px); }
          100% { transform: translateX(0) translateY(0); }
        }
        
        .wave-animation-1 {
          animation: wave1 10s ease-in-out infinite;
        }
        
        .wave-animation-2 {
          animation: wave2 12s ease-in-out infinite;
        }
        
        .wave-animation-3 {
          animation: wave3 8s ease-in-out infinite;
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes float-particle-1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-15px, -20px); }
        }
        
        @keyframes float-particle-2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(10px, -15px); }
        }
        
        @keyframes float-particle-3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-10px, 20px); }
        }
        
        @keyframes float-particle-4 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(15px, 15px); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        
        .animate-spin-reverse {
          animation: spin-reverse 6s linear infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        
        .animate-float-particle-1 {
          animation: float-particle-1 4s ease-in-out infinite;
        }
        
        .animate-float-particle-2 {
          animation: float-particle-2 5s ease-in-out infinite;
        }
        
        .animate-float-particle-3 {
          animation: float-particle-3 4.5s ease-in-out infinite;
        }
        
        .animate-float-particle-4 {
          animation: float-particle-4 5.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}