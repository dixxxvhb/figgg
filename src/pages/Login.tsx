import React, { useState } from 'react';
import { authenticate } from '../services/storage';
import { Button } from '../components/common/Button';
import { DancerPortal } from './DancerPortal';
import { User } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [showDancerPortal, setShowDancerPortal] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authenticate(password)) {
      onSuccess();
    } else {
      setError(true);
      setPassword('');
    }
  };

  // Show dancer portal if selected
  if (showDancerPortal) {
    return <DancerPortal onBack={() => setShowDancerPortal(false)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-forest-600 px-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blush-200/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-blush-200/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blush-200/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <img
            src="/images/logo.png"
            alt="DWD Collective"
            className="w-32 h-32 mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold text-white">DWD Collective</h1>
          <p className="text-blush-200/80 mt-2">Enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="Password"
              className={`w-full px-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-blush-200 focus:border-transparent bg-white/10 backdrop-blur text-white placeholder-blush-200/50 ${
                error ? 'border-red-400 bg-red-500/10' : 'border-blush-200/30'
              }`}
              autoFocus
            />
            {error && (
              <p className="text-red-300 text-sm mt-2">Incorrect password</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-blush-200 hover:bg-blush-100 text-forest-700 font-semibold shadow-lg"
            size="lg"
          >
            Unlock
          </Button>
        </form>

        {/* Dancer Portal Button */}
        <div className="mt-8 pt-6 border-t border-blush-200/20">
          <button
            onClick={() => setShowDancerPortal(true)}
            className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl bg-white/5 hover:bg-white/10 border-2 border-blush-200/20 hover:border-blush-200/40 transition-all text-white"
          >
            <User size={20} className="text-blush-200" />
            <span className="font-medium">I'm a Dancer</span>
          </button>
          <p className="text-center text-blush-200/50 text-sm mt-2">
            View your classes, dances & schedule
          </p>
        </div>

      </div>
    </div>
  );
}
