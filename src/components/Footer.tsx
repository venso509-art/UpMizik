import React from 'react';
import { Music, Heart, Shield, Smartphone, HeartHandshake, MessageCircle, Phone, Mail } from 'lucide-react';
import { ActiveView } from '../types';

interface FooterProps {
  setCurrentView: (v: ActiveView) => void;
  onOpenArtistAuth: () => void;
  onOpenAdminAuth?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  setCurrentView,
  onOpenArtistAuth
}) => {
  return (
    <footer className="bg-[#040609] border-t border-white/[0.06] text-slate-400 text-xs mt-16 pb-24 sm:pb-16 relative">
      {/* Top flag stripe */}
      <div className="h-1 w-full flex">
        <div className="w-1/2 bg-blue-600 h-full"></div>
        <div className="w-1/2 bg-red-600 h-full"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-400/30 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-500/20">
                <div className="flex items-end gap-1 h-4 pb-0.5" aria-hidden="true">
                  <span className="w-[2.5px] bg-yellow-400 rounded-full h-2"></span>
                  <span className="w-[2.5px] bg-red-400 rounded-full h-4"></span>
                  <span className="w-[2.5px] bg-blue-200 rounded-full h-2.5"></span>
                  <span className="w-[2.5px] bg-yellow-300 rounded-full h-1.5"></span>
                </div>
              </div>
              <span className="text-xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                Up<span className="text-red-500">Mizik</span>
              </span>
              <span className="text-[10px] font-bold uppercase bg-yellow-400 text-slate-950 px-2 py-0.5 rounded-md">
                Ayiti
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              Premye platfòm difizyon mizik ayisyen ki fèt pou konekte jèn atis yo dirèkteman ak fanatik yo. Atis yo resevwa <strong className="text-yellow-400">tout sipò</strong> yo pa Moncash ak Natcash.
            </p>
            <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-2xl p-3.5 max-w-md backdrop-blur-md space-y-2.5">
              {/* WhatsApp Contact */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <a
                  id="footer-whatsapp-link"
                  href="https://wa.me/18494989133"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all group"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>WhatsApp: <strong>+1 (849) 498-9133</strong></span>
                </a>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-300">
                <span>Ekip: <strong className="text-yellow-400">upmizik@gmail.com</strong></span>
                <span>Admin: <strong className="text-blue-400">admin.upmizik@gmail.com</strong></span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Navigasyon</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setCurrentView('public')} className="hover:text-white transition-colors">
                  Difizyon & Top 3
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentView('social')} className="hover:text-pink-400 transition-colors flex items-center gap-1.5">
                  <span>UpMizik Social</span>
                  <span className="text-[10px] text-pink-400 font-bold bg-pink-500/20 px-1 rounded">Nouvo</span>
                </button>
              </li>
              <li>
                <button onClick={onOpenArtistAuth} className="hover:text-yellow-400 transition-colors">
                  Espas Atis (Koneksyon)
                </button>
              </li>
            </ul>
          </div>

          {/* Trust & Guarantee */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Prensip UpMizik</h4>
            <ul className="space-y-2.5 text-[11px]">
              <li className="flex items-center gap-2 text-slate-300">
                <HeartHandshake className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span>85% reveni pou atis la</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Verifikasyon manyèl pa admin</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Règleman 1ye chak mwa</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Sipò dirèk sou WhatsApp</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© 2026 UpMizik Ayiti. Tout dwa rezève. Bati pou kilti mizik kreyòl la.</p>
          <p className="flex items-center gap-1">
            Fèt ak <Heart className="w-3 h-3 text-red-500 fill-red-500" /> pou tout Atis Ayisyen
          </p>
        </div>
      </div>
    </footer>
  );
};
