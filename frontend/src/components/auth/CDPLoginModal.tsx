import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { X, Mail, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface CDPLoginModalProps {
  isOpen: boolean;
  onSuccess: (token: string, user: any) => void;
  onClose: () => void;
}

type AuthStep = 'email' | 'otp';

export function CDPLoginModal({ isOpen, onSuccess, onClose }: CDPLoginModalProps) {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [flowId, setFlowId] = useState('');

  const initiateLoginMutation = useMutation({
    mutationFn: async (emailValue: string) => {
      const response = await api.post('/auth/cdp/login', { email: emailValue });
      return response.data;
    },
    onSuccess: (data) => {
      setFlowId(data.data.flowId);
      setStep('otp');
      toast.success('OTP sent to your email!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send OTP');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (otpValue: string) => {
      const response = await api.post('/auth/cdp/verify', {
        flowId,
        otp: otpValue,
        email,
      });
      return response.data;
    },
    onSuccess: (data) => {
      const { token, user } = data.data;
      localStorage.setItem('authToken', token);
      toast.success('Login successful!');
      onSuccess(token, user);
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Invalid OTP');
    },
  });

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }
    initiateLoginMutation.mutate(email);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      toast.error('OTP must be 6 digits');
      return;
    }
    verifyOtpMutation.mutate(otp);
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setOtp('');
    setFlowId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-xl max-w-md w-full border border-dark-border">
        <div className="flex items-center justify-between p-6 border-b border-dark-border">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Mail size={24} className="text-solana-purple" />
            {step === 'email' ? 'Login with Email' : 'Verify OTP'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-dark-bg rounded-lg transition-colors"
            disabled={initiateLoginMutation.isPending || verifyOtpMutation.isPending}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="bg-solana-purple/10 border border-solana-purple/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-300 flex items-center gap-2">
                  <CheckCircle size={16} className="text-solana-green" />
                  No seed phrases needed! Wallet created automatically.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-solana-purple transition-colors"
                  disabled={initiateLoginMutation.isPending}
                />
              </div>

              <button
                type="submit"
                disabled={initiateLoginMutation.isPending}
                className={clsx(
                  'w-full py-3 rounded-lg font-semibold transition-opacity',
                  'bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg',
                  'hover:opacity-90 disabled:opacity-50'
                )}
              >
                {initiateLoginMutation.isPending ? 'Sending...' : 'Send OTP'}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Powered by Coinbase CDP Embedded Wallets
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-dark-bg rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-300 mb-1">OTP sent to:</p>
                <p className="text-sm font-semibold text-solana-purple">{email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Enter OTP Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:border-solana-purple transition-colors"
                  disabled={verifyOtpMutation.isPending}
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Check your email for the 6-digit code
                </p>
              </div>

              <button
                type="submit"
                disabled={verifyOtpMutation.isPending}
                className={clsx(
                  'w-full py-3 rounded-lg font-semibold transition-opacity',
                  'bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg',
                  'hover:opacity-90 disabled:opacity-50'
                )}
              >
                {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify & Login'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                }}
                className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                disabled={verifyOtpMutation.isPending}
              >
                Back to email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
