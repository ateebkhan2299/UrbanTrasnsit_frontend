import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bus, Mail, Lock, Eye, EyeOff, User, ShieldCheck, BarChart3, CheckSquare, Layers } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedRole, setSelectedRole] = useState('Administrator');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const demoRoles = [];

  const handleQuickSelect = (item) => {
    setSelectedRole(item.role);
    setEmail(item.email);
    setPassword(item.password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const username = email ? email.split('@')[0] : 'admin';
    try {
      await login({ username, password });
      navigate('/overview');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed. Check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-[#141414] overflow-hidden font-sans">
      {/* Background with subtle transport transit aesthetic */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center filter blur-[3px] scale-105 opacity-40"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1920&q=80')`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/80 to-blue-950/60 z-0" />

      {/* Main Login Card - Exact Match with Image Card 1 */}
      <div className="relative z-10 w-full max-w-[420px] bg-[#1F1F1F] rounded shadow-2xl p-8 border border-[#2A2A2A] animate-in fade-in zoom-in duration-300">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded bg-[#E31E24] flex items-center justify-center text-white shadow-lg shadow-red-600/30 mb-3">
            <Bus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-1.5">
            UrbanTransit <span className="text-[#E31E24]">IQ</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide mt-0.5">
            Smart Public Transport Intelligence
          </p>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white">Welcome Back</h2>
          <p className="text-xs text-slate-500 mt-1">Sign in to your account</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300 mb-1.5">Email address</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@transit.gov.pk"
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-[#141414] border border-[#2A2A2A] rounded focus:bg-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-white placeholder-slate-400 transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 text-sm bg-[#141414] border border-[#2A2A2A] rounded focus:bg-[#1F1F1F] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-white placeholder-slate-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#E31E24] focus:ring-blue-500 rounded"
              />
              Remember me
            </label>
            <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-[#E31E24] font-semibold hover:underline">
              Forgot password?
            </a>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-[#E31E24] hover:bg-[#b81419] active:scale-[0.99] text-white font-semibold text-sm rounded shadow-lg shadow-red-600/25 transition-all duration-200 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>

        {/* Or continue with demo roles (Card 1 design) */}
        <div className="mt-6 pt-5 border-t border-[#2A2A2A]">
          <p className="text-[11px] font-semibold text-slate-400 text-center uppercase tracking-wider mb-3">
            Or continue with
          </p>

          <div className="grid grid-cols-4 gap-2">
            {demoRoles.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedRole === item.role;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => handleQuickSelect(item)}
                  className={`flex flex-col items-center justify-center p-2 rounded border text-[11px] font-medium transition ${
                    isSelected
                      ? 'border-[#E31E24] bg-red-600/10 text-white shadow-sm'
                      : 'border-[#2A2A2A] hover:bg-[#141414] text-slate-300'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${item.color}`} />
                  <span className="truncate w-full text-center">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
