import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  CreditCard, 
  Wallet, 
  ArrowRight, 
  Lock, 
  Crown, 
  Coins, 
  AlertCircle,
  Clock,
  Flame,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, WalletState } from '../types';
import { processSubscriptionPayment, checkAccessStatus } from '../services/userService';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onProfileUpdated: (updated: UserProfile) => void;
  walletState: WalletState;
  onConnectWallet?: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
  walletState,
  onConnectWallet,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [paymentMethod, setPaymentMethod] = useState<'crypto_usdc' | 'crypto_usdt' | 'crypto_eth' | 'card_stripe'>('crypto_usdc');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [txReceiptHash, setTxReceiptHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const access = checkAccessStatus(userProfile);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']
      });
    } catch {}
  };

  const handleExecutePayment = async () => {
    if (!userProfile) {
      setError('Please sign in or create an account first.');
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      // Artificial transaction wait for blockchain verification
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const result = await processSubscriptionPayment(
        userProfile,
        selectedPlan,
        paymentMethod
      );

      if (result.success) {
        setTxReceiptHash(result.paymentRecord.txHash);
        setPaymentSuccess(true);
        onProfileUpdated(result.updatedProfile);
        triggerConfetti();
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div 
        id="paywall-modal-container"
        className="relative w-full max-w-3xl bg-[#0d1117] border border-[#23282f] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-emerald-950 p-6 border-b border-[#23282f] relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-black/30 hover:bg-black/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-900/30">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    Arbitrage Bot Pro Paywall
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold uppercase">
                    Institutional Tier
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  1 Week Free Included • Choose $100/mo or $1,000/year for Unlimited Live Execution
                </p>
              </div>
            </div>

            {/* Trial Status Badge */}
            <div className="flex items-center gap-2 bg-[#161b22]/90 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-mono">
              <Clock className="h-4 w-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Current Status</div>
                <div className="font-bold text-amber-300">
                  {access.isTrial ? `Trial (${access.formattedCountdown})` : access.isPaid ? 'Active Pro Member' : 'Trial Expired'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {paymentSuccess ? (
          /* Payment Success View */
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold text-white">
              Subscription Activated Successfully!
            </h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Your account has been upgraded to <span className="text-emerald-400 font-bold">{selectedPlan === 'annual' ? 'Pro Annual ($1,000/yr)' : 'Pro Monthly ($100/mo)'}</span>.
              All multi-DEX flash loan engines and private mempool bundlers are fully unlocked.
            </p>

            <div className="max-w-md mx-auto bg-[#161b22] border border-[#23282f] rounded-xl p-4 text-left font-mono text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Payment Plan:</span>
                <span className="text-slate-200 font-bold">{selectedPlan === 'annual' ? '$1,000 / Year' : '$100 / Month'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Method:</span>
                <span className="text-emerald-400 font-bold uppercase">{paymentMethod.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Receipt / Tx Hash:</span>
                <span className="text-blue-400 font-mono">{txReceiptHash?.substring(0, 14)}...{txReceiptHash?.substring(56)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Database Sync:</span>
                <span className="text-emerald-400">Synced to Firestore Cloud</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-950"
            >
              Return to Arbitrage Dashboard
            </button>
          </div>
        ) : (
          /* Pricing & Checkout Plan Selection */
          <div className="p-6 space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Monthly Plan: $100 / mo */}
              <div
                id="plan-card-monthly"
                onClick={() => setSelectedPlan('monthly')}
                className={`relative cursor-pointer rounded-xl p-5 transition-all border ${
                  selectedPlan === 'monthly'
                    ? 'bg-[#161b22] border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-950'
                    : 'bg-[#0e1217] border-[#23282f] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                    Monthly Pass
                  </span>
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    selectedPlan === 'monthly' ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-600'
                  }`}>
                    {selectedPlan === 'monthly' && <Check className="h-3 w-3" />}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-extrabold text-white">$100</span>
                  <span className="text-xs text-slate-400 font-medium">/ month</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-4">
                  Full flexible month-to-month arbitrage engine access. Cancel anytime.
                </p>

                <div className="border-t border-[#23282f] pt-3 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>Unlimited Flash Loan Executions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>8 EVM Chains & 12 DEX Aggregators</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>Flashbots MEV Frontrun Protection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <span>Cloud Database Profile & Wallet Sync</span>
                  </div>
                </div>
              </div>

              {/* Annual Plan: $1000 / year */}
              <div
                id="plan-card-annual"
                onClick={() => setSelectedPlan('annual')}
                className={`relative cursor-pointer rounded-xl p-5 transition-all border ${
                  selectedPlan === 'annual'
                    ? 'bg-[#161b22] border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950'
                    : 'bg-[#0e1217] border-[#23282f] hover:border-slate-600'
                }`}
              >
                {/* Save Badge */}
                <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md">
                  SAVE $200 (2 MONTHS FREE)
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5 text-amber-400" />
                    Annual Pro Pass
                  </span>
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    selectedPlan === 'annual' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-600'
                  }`}>
                    {selectedPlan === 'annual' && <Check className="h-3 w-3" />}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-extrabold text-white">$1,000</span>
                  <span className="text-xs text-slate-400 font-medium">/ year</span>
                  <span className="text-[10px] text-emerald-400 font-mono ml-2">($83.33/mo)</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-4">
                  Best value for institutional and active algorithmic DeFi traders.
                </p>

                <div className="border-t border-[#23282f] pt-3 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2 font-semibold text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Everything in Monthly included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Sub-15ms Ultra Fast Mempool Priority</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Private Flashbots Builder Bundle Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>0% Protocol Fee on Harvested Yields</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Select Payment Method
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('crypto_usdc')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                    paymentMethod === 'crypto_usdc'
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-[#161b22] border-[#23282f] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Coins className="h-5 w-5 text-blue-400 mb-1" />
                  <span>USDC (ERC-20)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('crypto_usdt')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                    paymentMethod === 'crypto_usdt'
                      ? 'bg-emerald-600/20 border-emerald-500 text-white'
                      : 'bg-[#161b22] border-[#23282f] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Coins className="h-5 w-5 text-emerald-400 mb-1" />
                  <span>USDT (Tether)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('crypto_eth')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                    paymentMethod === 'crypto_eth'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-[#161b22] border-[#23282f] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Zap className="h-5 w-5 text-indigo-400 mb-1" />
                  <span>ETH ({selectedPlan === 'annual' ? '0.318 ETH' : '0.0318 ETH'})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card_stripe')}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                    paymentMethod === 'card_stripe'
                      ? 'bg-purple-600/20 border-purple-500 text-white'
                      : 'bg-[#161b22] border-[#23282f] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="h-5 w-5 text-purple-400 mb-1" />
                  <span>Credit / Debit Card</span>
                </button>
              </div>
            </div>

            {/* Connected Wallet Verification */}
            {paymentMethod.startsWith('crypto_') && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#161b22] border border-[#23282f] text-xs">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-slate-400" />
                  <div>
                    <span className="text-slate-400">Payer Wallet: </span>
                    <span className="font-mono text-slate-200 font-semibold">
                      {walletState.isConnected && walletState.address
                        ? `${walletState.address.substring(0, 8)}...${walletState.address.substring(36)}`
                        : userProfile?.walletAddress 
                          ? `${userProfile.walletAddress.substring(0, 8)}...${userProfile.walletAddress.substring(36)}`
                          : 'No wallet connected'}
                    </span>
                  </div>
                </div>
                {(!walletState.isConnected || !walletState.address) && onConnectWallet && (
                  <button
                    type="button"
                    onClick={onConnectWallet}
                    className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            )}

            {/* Checkout Action Button */}
            <button
              type="button"
              id="paywall-checkout-btn"
              onClick={handleExecutePayment}
              disabled={isProcessing}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-xl ${
                selectedPlan === 'annual'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-950'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authorizing on-chain payment & updating Firestore database...</span>
                </div>
              ) : (
                <>
                  <span>
                    Pay {selectedPlan === 'annual' ? '$1,000 / Year' : '$100 / Month'} & Unlock Institutional Bot
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                256-Bit Encrypted & Firestore Verified
              </span>
              <span>•</span>
              <span>Instant Receipt & Auto Renewal Control</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
