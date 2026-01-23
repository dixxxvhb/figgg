import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { authenticate } from '../services/storage';
import { Button } from '../components/common/Button';

interface LoginProps {
  onSuccess: () => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authenticate(password)) {
      onSuccess();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 rounded-full mb-4">
            <Lock className="text-violet-600" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Dance Notes</h1>
          <p className="text-gray-500 mt-1">Enter your password to continue</p>
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
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">Incorrect password</p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg">
            Unlock
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Default password: dance2024
        </p>
      </div>
    </div>
  );
}
