import React, { useState, useMemo } from 'react';
import { 
  X, 
  Wallet, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Fuel, 
  ShieldCheck, 
  RefreshCw, 
  Coins, 
  Unlock, 
  Send,
  Sparkles,
  LogOut
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Network, WalletState, VaultBalanceItem, BotStats } from '../types';

interface WalletWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNetwork: Network;
  walletState: WalletState;
  onConnectWallet: (type: 'metamask' | 'rabby' | 'coinbase' | 'walletconnect' | 'browser_injected' | 'demo_vault') => void;
  onDisconnectWallet: () => void;
  stats: BotStats;
  vaultBalances: VaultBalanceItem[];
  onExecuteWithdrawal: (
    tokenSymbol: string,
    amount: number,
    destinationAddress: string,
    method: 'VAULT_HARVEST' | 'EMERGENCY_RESCUE' | 'EOA_TRANSFER'
  ) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  liveGasGwei: number;
}

export const WalletWithdrawModal: React.FC<WalletWithdrawModalProps> = ({
  isOpen,
  onClose,
  activeNetwork,
  walletState,
  onConnectWallet,
  onDisconnectWallet,
  stats,
  vaultBalances,
  onExecuteWithdrawal,
  liveGasGwei,
}) => {
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>('USDC');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('1000');
  const [customRecipient, setCustomRecipient] = useState<string>('');
  const [withdrawMethod, setWithdrawMethod] = useState<'VAULT_HARVEST' | 'EMERGENCY_RESCUE' | 'EOA_TRANSFER'>('VAULT_HARVEST');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<{ txHash: string; amount: number; symbol: string } | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedToken = vaultBalances.find((v) => v.symbol === selectedTokenSymbol) || vaultBalances[0];

  const totalVaultValueUsd = vaultBalances.reduce((acc, curr) => acc + curr.valueUsd, 0);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handlePercentageSelect = (percent: number) => {
    if (!selectedToken) return;
    const calculated = (selectedToken.amount * percent) / 100;
    setWithdrawAmount(calculated > 0.0001 ? calculated.toFixed(4).replace(/\.?0+$/, '') : '0');
  };

  const estimatedGasUsd = (liveGasGwei * 65000 * 1e-9) * activeNetwork.gasTokenPriceUsd;

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    setWithdrawSuccess(null);

    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setWithdrawError('Please enter a valid positive withdrawal amount.');
      return;
    }

    if (amountNum > selectedToken.amount) {
      setWithdrawError(`Insufficient ${selectedToken.symbol} in vault balance.`);
      return;
    }

    const destination = customRecipient.trim() || walletState.address;
    if (!destination || !destination.startsWith('0x') || destination.length !== 42) {
      setWithdrawError('Please connect a wallet or enter a valid 42-character recipient address.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await onExecuteWithdrawal(selectedTokenSymbol, amountNum, destination, withdrawMethod);
      if (res.success && res.txHash) {
        setWithdrawSuccess({
          txHash: res.txHash,
          amount: amountNum,
          symbol: selectedTokenSymbol,
        });

        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });

        setWithdrawAmount('100');
      } else {
        setWithdrawError(res.error || 'Withdrawal transaction failed on-chain.');
      }
    } catch (err: any) {
      setWithdrawError(err?.message || 'Unexpected withdrawal execution error.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#23282f] px-5 py-4 bg-[#0d1117]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Connect Wallet & Withdraw Profits</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.5 rounded">
                  VAULT RESERVE
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Total Accrued: <strong className="text-emerald-400 font-bold">${totalVaultValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#23282f] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Wallet State Section */}
          <div className="bg-[#0d1117] rounded-lg p-3.5 border border-[#23282f] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                Web3 Wallet Status
              </span>
              <span className={`text-[10px] font-mono font-bold ${walletState.isConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                {walletState.isConnected ? '● CONNECTED' : '○ DISCONNECTED'}
              </span>
            </div>

            {walletState.isConnected && walletState.address ? (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#23282f]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-100">
                    {walletState.address.substring(0, 8)}...{walletState.address.substring(36)}
                  </span>
                  <button
                    onClick={() => handleCopy(walletState.address!)}
                    className="p-1 rounded bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-slate-200"
                    title="Copy Address"
                  >
                    {copiedText === walletState.address ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <span className="text-[10px] font-mono text-emerald-400 bg-[#161b22] px-2 py-0.5 rounded border border-[#30363d]">
                    {walletState.balanceEth.toFixed(3)} ETH
                  </span>
                </div>

                <button
                  onClick={onDisconnectWallet}
                  className="text-[10px] text-rose-400 hover:underline flex items-center gap-1 font-mono"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Disconnect</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => onConnectWallet('metamask')}
                    className="p-2 rounded bg-[#161b22] border border-[#30363d] hover:border-orange-500 text-left text-xs text-slate-200 font-bold transition-all"
                  >
                    🦊 MetaMask
                  </button>
                  <button
                    onClick={() => onConnectWallet('rabby')}
                    className="p-2 rounded bg-[#161b22] border border-[#30363d] hover:border-blue-500 text-left text-xs text-slate-200 font-bold transition-all"
                  >
                    🐰 Rabby
                  </button>
                  <button
                    onClick={() => onConnectWallet('coinbase')}
                    className="p-2 rounded bg-[#161b22] border border-[#30363d] hover:border-cyan-500 text-left text-xs text-slate-200 font-bold transition-all"
                  >
                    🔵 Coinbase
                  </button>
                  <button
                    onClick={() => onConnectWallet('walletconnect')}
                    className="p-2 rounded bg-[#161b22] border border-[#30363d] hover:border-purple-500 text-left text-xs text-slate-200 font-bold transition-all"
                  >
                    ⚡ WalletConnect
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Feedback messages */}
          {withdrawError && (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-700/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{withdrawError}</span>
            </div>
          )}

          {withdrawSuccess && (
            <div className="p-3 rounded bg-emerald-950/50 border border-emerald-700/60 text-emerald-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Withdrawal Confirmed: +{withdrawSuccess.amount} {withdrawSuccess.symbol}</span>
              </div>
              <div className="text-[11px] font-mono text-cyan-300">
                Tx: {withdrawSuccess.txHash.substring(0, 18)}...
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleWithdrawSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                Asset to Harvest
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {vaultBalances.map((b) => (
                  <button
                    key={b.symbol}
                    type="button"
                    onClick={() => {
                      setSelectedTokenSymbol(b.symbol);
                      setWithdrawAmount((b.amount * 0.5).toFixed(2));
                    }}
                    className={`p-1.5 rounded border text-center text-xs transition-all ${
                      selectedTokenSymbol === b.symbol
                        ? 'bg-blue-600 text-white border-blue-500 font-bold'
                        : 'bg-[#0d1117] text-slate-300 border-[#30363d]'
                    }`}
                  >
                    <div>{b.symbol}</div>
                    <div className="text-[9px] opacity-75">${Math.round(b.valueUsd)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Amount</span>
                <span className="text-slate-300 text-[11px]">
                  Available: {selectedToken.amount.toFixed(2)} {selectedToken.symbol}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-100 focus:border-blue-500 focus:outline-none pr-16"
                />
                <button
                  type="button"
                  onClick={() => handlePercentageSelect(100)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold font-mono bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-700/60"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Destination Recipient Address
              </label>
              <input
                type="text"
                value={customRecipient || (walletState.isConnected ? walletState.address || '' : '')}
                onChange={(e) => setCustomRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Gas summary */}
            <div className="flex items-center justify-between text-xs font-mono bg-[#0d1117] p-2.5 rounded border border-[#23282f] text-slate-400">
              <span>Estimated Gas Fee:</span>
              <span className="text-emerald-400 font-bold">~${estimatedGasUsd.toFixed(3)}</span>
            </div>

            {/* Action button */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full h-10 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Harvesting Yield to Wallet...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Confirm Withdrawal</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
