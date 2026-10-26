import React, { useState } from 'react';
import { 
  BookOpen, PenTool, LayoutDashboard, Compass, Sparkles, Settings, 
  Bookmark, Menu, X, LogIn, LogOut, ShieldAlert 
} from 'lucide-react';
import { User } from '../types';
import { Logo } from './Logo';

interface NavbarProps {
  currentPage: string; 
  onNavigate: (page: string) => void;
  user: User;
  onOpenAuth: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentPage, 
  onNavigate, 
  user, 
  onOpenAuth,
  onSignOut 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: null },
    { id: 'library', label: 'Library', icon: Compass, iconColor: 'text-amber-400' },
    { id: 'bookshelf', label: 'Bookshelf', icon: Bookmark, iconColor: 'text-rose-400' },
    { id: 'mystories', label: 'My Stories', icon: PenTool, iconColor: 'text-rose-400' },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-emerald-400' }
  ];

  const handleNavClick = (pageId: string) => {
    onNavigate(pageId);
    setMobileMenuOpen(false);
  };

  const isGuest = user.id === 'guest';

  return (
    <header className="sticky top-0 z-50 bg-[#0c0a09]/90 backdrop-blur-md border-b border-[#292524] text-[#f5f5f4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Logo 
          onClick={() => handleNavClick('home')} 
          size="md"
        />

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1 bg-[#1c1917] px-3 py-1.5 rounded-full border border-[#292524]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPage === item.id ||
              (item.id === 'mystories' && currentPage === 'editor');

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-rose-900/60 text-rose-200 shadow-inner border border-rose-800/50'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/50'
                }`}
              >
                {Icon && <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Medium-screen compact menu */}
        <nav className="hidden md:flex xl:hidden items-center gap-1 bg-[#1c1917] px-2.5 py-1 rounded-full border border-[#292524]">
          {navItems.slice(0, 4).map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-rose-900/60 text-rose-200 shadow-inner'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <button
            onClick={() => handleNavClick('mystories')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              currentPage === 'mystories' || currentPage === 'editor'
                ? 'bg-rose-900/60 text-rose-200 shadow-inner'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            My Stories
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => handleNavClick('cover-studio')}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-stone-200 text-xs font-medium border border-stone-700 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Cover Studio</span>
          </button>

          {/* Admin link — strictly shown only for authenticated verified owner */}
          {user.isAdmin && (
            <button
              onClick={() => handleNavClick('admin')}
              className={`p-2 rounded-lg transition-colors ${
                currentPage === 'admin'
                  ? 'bg-rose-900/80 text-rose-200 border border-rose-800'
                  : 'bg-stone-800/60 hover:bg-stone-800 text-stone-300'
              }`}
              title="Admin & Moderation Panel"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </button>
          )}

          <button
            onClick={() => handleNavClick('settings')}
            className="p-2 rounded-lg bg-stone-800/60 hover:bg-stone-800 text-stone-300 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Auth State Button / Profile */}
          {isGuest ? (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-medium shadow-md shadow-rose-950/40 flex items-center gap-1.5 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-800">
              <div 
                onClick={() => handleNavClick('profile')}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-8 h-8 rounded-full object-cover border-2 border-rose-600/50 group-hover:border-rose-500 transition-colors"
                />
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-medium text-stone-200 truncate max-w-[90px]">{user.name}</div>
                  <div className="text-[10px] text-stone-400">{user.isAdmin ? 'Admin' : 'Author'}</div>
                </div>
              </div>

              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="p-1.5 rounded-lg bg-stone-800/60 hover:bg-rose-950/80 text-stone-400 hover:text-rose-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-stone-800/60 hover:bg-stone-800 text-stone-300 md:hidden transition-colors"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-800 bg-[#121110]/95 backdrop-blur-xl px-4 py-4 space-y-2 animate-fade-in">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentPage === item.id ||
              (item.id === 'mystories' && currentPage === 'editor');

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-colors ${
                  isActive
                    ? 'bg-rose-950/80 text-rose-200 border border-rose-800/60'
                    : 'text-stone-300 hover:bg-stone-800/50 hover:text-white'
                }`}
              >
                {Icon && <Icon className={`w-4 h-4 ${item.iconColor}`} />}
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => handleNavClick('cover-studio')}
            className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 text-amber-300 hover:bg-stone-800/50"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Cover Studio</span>
          </button>

          <button
            onClick={() => handleNavClick('admin')}
            className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 text-rose-300 hover:bg-stone-800/50"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Admin Control Center</span>
          </button>

          {isGuest ? (
            <button
              onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 text-white bg-rose-600 hover:bg-rose-500"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to INOKORA</span>
            </button>
          ) : (
            <button
              onClick={() => { if (onSignOut) onSignOut(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2.5 text-stone-400 hover:text-rose-400 hover:bg-stone-800/50"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out ({user.name})</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
