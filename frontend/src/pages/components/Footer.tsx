import { Facebook, Mail, Phone, MapPin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#3d4aff] text-white mt-8 overflow-hidden w-full border-t border-blue-500/20">
      <div className="w-full px-6 md:px-12 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Brand/Logo Section */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/emc_logo.png"
                alt="EMC Logo"
                className="w-12 h-12 md:w-14 md:h-14 object-contain bg-white rounded-full p-1"
              />
              <div>
                <h2 className="text-lg md:text-xl font-bold leading-tight tracking-wide">
                  Evangelical Mission College
                </h2>
                <p className="text-xs text-blue-100 font-medium">Learning Management and Library Search System</p>
              </div>
            </div>
            <p className="text-sm text-blue-50 leading-relaxed max-w-sm">
              Empowering Faith, Knowledge & Community.
            </p>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-md font-bold uppercase tracking-wider text-blue-200">
              Contact Info
            </h3>
            <ul className="space-y-3 text-sm text-blue-50">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-200" />
                <a href="mailto:emcshalom1994@gmail.com" className="hover:underline hover:text-white transition-colors">
                  emcshalom1994@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 flex-shrink-0 text-blue-200" />
                <a href="tel:0822977298" className="hover:underline hover:text-white transition-colors">
                  (082) 297 7298
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-200" />
                <span>
                  Mahogany St. Countryside Village Bangkal, Davao City, Philippines, 8000
                </span>
              </li>
            </ul>
          </div>

          {/* Social Links & Resource Info */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-md font-bold uppercase tracking-wider text-blue-200">
              Connect With Us
            </h3>
            <div className="flex gap-4">
              <a
                href="https://web.facebook.com/evangelicalmissioncollege/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center text-white"
                title="Follow us on Facebook"
              >
                <Facebook className="w-6 h-6" />
              </a>
            </div>
            <p className="text-xs text-blue-200 max-w-xs leading-relaxed pt-2">
              For system inquiries or administrative support, please contact the IT Administrator desk or send an email directly.
            </p>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-8 pt-8 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between text-xs text-blue-100 gap-4">
          <p>© {new Date().getFullYear()} Evangelical Mission College. All rights reserved.</p>
          
        </div>
      </div>
    </footer>
  );
}
