import React from 'react';
import { Logo } from './Logo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#09090b]/80 backdrop-blur-md border-t border-[#292524] text-stone-400 py-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="space-y-4 md:col-span-1">
            <Logo size="sm" showTagline={false} />
            <p className="text-sm text-stone-400">
              Your imagination, in print. A sanctuary for authors, novelists, and dreamers to write, design, and publish stories.
            </p>
          </div>

          <div>
            <h4 className="text-stone-200 font-medium text-sm mb-3 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-stone-200 transition-colors">Story Editor</a></li>
              <li><a href="#" className="hover:text-stone-200 transition-colors">Cover Studio</a></li>
              <li><a href="#" className="hover:text-stone-200 transition-colors">Public Library</a></li>
              <li><a href="#" className="hover:text-stone-200 transition-colors">AI Writing Assistant</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-stone-200 font-medium text-sm mb-3 uppercase tracking-wider">Genres</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-stone-200 transition-colors">Epic Fantasy</a></li>
              <li><a href="#" className="hover:text-stone-200 transition-colors">Cyberpunk & Sci-Fi</a></li>
              <li><a href="#" className="hover:text-stone-200 transition-colors">Historical Fiction</a></li>
              <li><a href="#" className="hover:text-stone-200 transition-colors">Mystery & Thriller</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-stone-200 font-medium text-sm mb-3 uppercase tracking-wider">Sanctuary</h4>
            <p className="text-sm text-stone-400 mb-3">
              Subscribe to receive weekly craft tips and writing prompts from acclaimed authors.
            </p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="bg-[#1c1917] border border-stone-800 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-rose-500 w-full"
              />
              <button className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Join
              </button>
            </div>
          </div>

        </div>

        <div className="border-t border-[#1c1917] pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400">
          <p>© {new Date().getFullYear()} INKORA Inc. All rights reserved. Crafted for storytellers.</p>
          <div className="flex items-center gap-6 mt-4 sm:mt-0">
            <a href="#" className="hover:text-stone-200 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-stone-200 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-stone-200 transition-colors">Guidelines</a>
          </div>
        </div>

      </div>
    </footer>
  );
};
