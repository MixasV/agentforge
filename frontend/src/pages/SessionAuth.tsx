import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

interface SessionConfig {
  sessionId: string;
  validDays: number;
  maxTransactions: number;
  maxAmountSol: number;
  allowedPrograms: string[];
}

export const SessionAuth: React.FC = () => {
  const [searchParams] = useSearchParams();
  // const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string>('');
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    const id = searchParams.get('sessionId');
    if (id) {
      setSessionId(id);
      fetchConfig(id);
    } else {
      setStatus('error');
      setErrorMessage('Session ID not provided');
      setLoading(false);
    }
  }, [searchParams]);

  const fetchConfig = async (id: string) => {
    try {
      const response = await axios.get(`/api/session/config/${id}`);
      if (response.data.success) {
        setConfig(response.data.data);
        setStatus('ready');
      } else {
        setStatus('error');
        setErrorMessage(response.data.error || 'Failed to load configuration');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Failed to fetch session configuration');
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    try {
      // Check if Phantom or Solflare is installed
      if ('solana' in window) {
        const provider = (window as any).solana;
        if (provider?.isPhantom || provider?.isSolflare) {
          const resp = await provider.connect();
          setWalletAddress(resp.publicKey.toString());
          setWalletConnected(true);
        }
      } else {
        // For demo purposes, simulate wallet connection
        alert('⚠️ Phantom wallet not detected. For demo: simulating wallet connection...');
        const mockAddress = 'Demo' + Math.random().toString(36).substring(2, 8) + '...xyz';
        setWalletAddress(mockAddress);
        setWalletConnected(true);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet');
    }
  };

  const handleAuthorize = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setAuthorizing(true);

    try {
      // Generate ephemeral keypair (mock for now)
      const mockPrivateKey = btoa(Math.random().toString(36).repeat(5)).substring(0, 88);
      const mockPublicKey = 'Session' + Math.random().toString(36).substring(2, 12);

      // Send authorization to backend
      const response = await axios.post('/api/session/authorize', {
        sessionId,
        sessionKeyPublic: mockPublicKey,
        sessionKeyPrivate: mockPrivateKey,
        userWallet: walletAddress,
      });

      if (response.data.success) {
        setStatus('success');
        // Redirect to Telegram after 3 seconds
        setTimeout(() => {
          window.close(); // Try to close window
        }, 3000);
      } else {
        throw new Error(response.data.error || 'Authorization failed');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.response?.data?.error || error.message || 'Authorization failed');
    } finally {
      setAuthorizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading session configuration...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">✅ Authorization Successful!</h1>
          <p className="text-gray-300 mb-4">Your trading bot is now authorized.</p>
          <p className="text-gray-400 text-sm">You can close this window and return to Telegram.</p>
          <button
            onClick={() => window.close()}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">❌ Authorization Failed</h1>
          <p className="text-red-400 mb-4">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🔐 Authorize Trading Bot</h1>
          <p className="text-gray-400">Connect your wallet to authorize automated trading</p>
        </div>

        {config && (
          <div className="bg-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Authorization Details:</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Valid for:</span>
                <span className="text-white font-medium">{config.validDays} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max transactions:</span>
                <span className="text-white font-medium">{config.maxTransactions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max per trade:</span>
                <span className="text-white font-medium">{config.maxAmountSol} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Allowed:</span>
                <span className="text-white font-medium">Jupiter swaps only</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
          <h3 className="text-blue-400 font-semibold mb-2">🔒 Security:</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Your private key is NEVER shared</li>
            <li>• Bot gets temporary, limited access only</li>
            <li>• You can revoke anytime</li>
            <li>• Session expires automatically</li>
          </ul>
        </div>

        {!walletConnected ? (
          <button
            onClick={connectWallet}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Connect Wallet
          </button>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3 text-center">
              <p className="text-green-400 text-sm mb-1">✅ Wallet Connected</p>
              <p className="text-gray-300 text-xs font-mono">{walletAddress}</p>
            </div>
            <button
              onClick={handleAuthorize}
              disabled={authorizing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              {authorizing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Authorizing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  ✅ Authorize Bot
                </>
              )}
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-6">
          By authorizing, you agree to allow the bot to execute trades within the specified limits
        </p>
      </div>
    </div>
  );
};
