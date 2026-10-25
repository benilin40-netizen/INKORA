import React, { useState } from 'react';
import { Sparkles, Database, Check } from 'lucide-react';
import { User } from '../types';

interface SettingsProps {
  user: User;
  onSaveUser: (user: User) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onSaveUser }) => {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [avatar, setAvatar] = useState(user.avatar);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveUser({ ...user, name, bio, avatar });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-transparent text-[#f5f5f4] py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-serif font-bold text-stone-100">Settings</h1>
          <p className="text-stone-400 text-sm mt-1">Manage your author profile, API integrations, and preferences.</p>
        </div>

        {saved && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 p-4 rounded-xl flex items-center gap-2 text-sm">
            <Check className="w-4 h-4" /> <span>Settings successfully updated!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-8 space-y-6 shadow-xl">
          <h3 className="text-lg font-serif font-bold text-stone-100 border-b border-stone-800 pb-4">Author Profile</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Avatar Image URL</label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Author Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-200 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-medium text-sm shadow-lg transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
