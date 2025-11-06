import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

export function Login() {
  const { loginWithPhantom, isLoggingIn } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const handlePhantomLogin = async () => {
    setIsConnecting(true);
    try {
      const { solana } = window as any;

      if (!solana?.isPhantom) {
        toast.error('Phantom wallet not found. Please install it.');
        window.open('https://phantom.app/', '_blank');
        return;
      }

      const response = await solana.connect();
      const walletAddress = response.publicKey.toString();

      const message = `Sign this message to login to AgentForge.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await solana.signMessage(encodedMessage, 'utf8');

      const signature = Buffer.from(signedMessage.signature).toString('base64');

      loginWithPhantom({
        walletAddress,
        signature,
        message,
      });
    } catch (error) {
      console.error('Phantom login error:', error);
      toast.error('Failed to connect to Phantom wallet');
    } finally {
      setIsConnecting(false);
    }
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
            Connect Wallet
          </h2>

          <button
            onClick={handlePhantomLogin}
            disabled={isLoggingIn || isConnecting}
            className="w-full bg-gradient-to-r from-solana-purple to-solana-green text-dark-bg font-semibold py-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <Wallet size={24} />
            {isConnecting || isLoggingIn ? 'Connecting...' : 'Connect with Phantom'}
          </button>

          <p className="text-sm text-gray-500 text-center mt-6">
            By connecting, you agree to our Terms of Service
          </p>
        </div>

        <div className="mt-8 text-center">
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
    </div>
  );
}
