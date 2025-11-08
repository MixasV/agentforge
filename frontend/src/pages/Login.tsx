import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Wallet, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { CDPLoginModal } from '@/components/auth/CDPLoginModal';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const { loginWithPhantom, isLoggingIn } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCDPModalOpen, setIsCDPModalOpen] = useState(false);
  const navigate = useNavigate();

  const handlePhantomLogin = async () => {
    setIsConnecting(true);
    try {
      const { solana } = window as any;

      if (!solana?.isPhantom) {
        toast.error('Phantom wallet not found. Please install it.');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      console.log('🔵 Connecting to Phantom...');
      const response = await solana.connect();
      const walletAddress = response.publicKey.toString();
      console.log('✅ Connected! Wallet:', walletAddress);

      const message = `Sign this message to login to AgentForge.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
      console.log('📝 Requesting signature...');
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await solana.signMessage(encodedMessage, 'utf8');
      console.log('✅ Signature received');

      const signature = btoa(String.fromCharCode(...signedMessage.signature));
      console.log('🚀 Sending login request...', { walletAddress, signatureLength: signature.length });

      loginWithPhantom({
        walletAddress,
        signature,
        message,
      });
    } catch (error) {
      console.error('❌ Phantom login error:', error);
      toast.error('Failed to connect to Phantom wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCDPSuccess = (_token: string, user: any) => {
    toast.success(`Welcome, ${user.email}!`);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-solana-purple to-solana-green bg-clip-text text-transparent">
            AgentForge
          </h1>
          <p className="text-gray-400">
            No-Code Agent Builder for Solana
          </p>
        </div>

        <div className="bg-dark-card rounded-xl p-8 border border-dark-border">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Choose Login Method
          </h2>

          <button
            onClick={() => setIsCDPModalOpen(true)}
            disabled={isLoggingIn || isConnecting}
            className="w-full bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg font-semibold py-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-3 mb-4"
          >
            <Mail size={24} />
            Login with Email (No Seed Phrase!)
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dark-card text-gray-500">or if you prefer</span>
            </div>
          </div>

          <button
            onClick={handlePhantomLogin}
            disabled={isLoggingIn || isConnecting}
            className="w-full bg-gray-800 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <Wallet size={20} />
            {isConnecting || isLoggingIn ? 'Connecting...' : 'Login with Phantom (Advanced)'}
          </button>

          <p className="text-sm text-gray-500 text-center mt-6">
            By logging in, you agree to our Terms of Service
          </p>
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-gray-500">
            <span className="text-solana-green">✓</span> No seed phrases with email login
          </p>
          <p className="text-sm text-gray-500">
            Don't have Phantom?{' '}
            <a
              href="https://phantom.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-solana-purple hover:underline"
            >
              Install it here
            </a>
          </p>
        </div>
      </div>

      <CDPLoginModal
        isOpen={isCDPModalOpen}
        onSuccess={handleCDPSuccess}
        onClose={() => setIsCDPModalOpen(false)}
      />
    </div>
  );
}
