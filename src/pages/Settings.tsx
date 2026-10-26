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

        {/* Google Drive Storage Integration Card */}
        <div className="bg-[#121110]/90 backdrop-blur-md border border-stone-800 rounded-2xl p-8 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-800 text-amber-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-100">Google Drive Story Storage</h3>
                <p className="text-xs text-stone-400">Connected to your Google account for dedicated manuscript file storage.</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Authorized
            </span>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed font-light">
            INOKORA stores your book manuscripts and chapters as JSON documents inside an dedicated <code className="text-amber-300 font-mono">INOKORA_Stories</code> folder in your Google Drive, while metadata and indexes are securely maintained in Firestore.
          </p>

          <div className="pt-2 flex items-center gap-4 text-xs text-stone-400">
            <span>OAuth Scope: <code className="text-stone-300 font-mono">drive.file</code></span>
            <span>•</span>
            <span>Sync Status: <span className="text-emerald-400 font-medium">Active & Verified</span></span>
          </div>
        </div>

      </div>
    </div>
  );
};
