import React, { useState, useMemo } from 'react';
import { 
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
  DollarSign, 
  Layers, 
  Coins, 
  Lock, 
  Unlock, 
  Download, 
  Clock, 
  ArrowDownLeft, 
  Zap, 
  ChevronRight,
  Sliders,
  Send,
  Info,
  LogOut,
  Sparkles,
  Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Network, WalletState, VaultBalanceItem, WithdrawalRecord, BotStats } from '../types';
import { TOKENS, NETWORKS } from '../data/chainsAndDexes';

interface WalletWithdrawSpaceProps {
  activeNetwork: Network;
  walletState: WalletState;
  onConnectWallet: (type: 'metamask' | 'rabby' | 'coinbase' | 'walletconnect' | 'browser_injected' | 'demo_vault') => void;
  onDisconnectWallet: () => void;
  stats: BotStats;
  vaultBalances: VaultBalanceItem[];
  withdrawals: WithdrawalRecord[];
  onExecuteWithdrawal: (
    tokenSymbol: string,
    amount: number,
    destinationAddress: string,
    method: 'VAULT_HARVEST' | 'EMERGENCY_RESCUE' | 'EOA_TRANSFER'
  ) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  liveGasGwei: number;
}

export const WalletWithdrawSpace: React.FC<WalletWithdrawSpaceProps> = ({
  activeNetwork,
  walletState,
  onConnectWallet,
  onDisconnectWallet,
  stats,
  vaultBalances,
  withdrawals,
  onExecuteWithdrawal,
  liveGasGwei,
}) => {
  // Withdrawal Form State
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<string>('USDC');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('1500');
  const [customRecipient, setCustomRecipient] = useState<string>('');
  const [withdrawMethod, setWithdrawMethod] = useState<'VAULT_HARVEST' | 'EMERGENCY_RESCUE' | 'EOA_TRANSFER'>('VAULT_HARVEST');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<{ txHash: string; amount: number; symbol: string } | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Selected Token Details
  const selectedToken = useMemo(() => {
    return vaultBalances.find((v) => v.symbol === selectedTokenSymbol) || vaultBalances[0];
  }, [vaultBalances, selectedTokenSymbol]);

  // Total Vault Net Value
  const totalVaultValueUsd = useMemo(() => {
    return vaultBalances.reduce((acc, curr) => acc + curr.valueUsd, 0);
  }, [vaultBalances]);

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

  const estimatedGasUsd = useMemo(() => {
    const gasUnits = withdrawMethod === 'VAULT_HARVEST' ? 65000 : 45000;
    return (liveGasGwei * gasUnits * 1e-9) * activeNetwork.gasTokenPriceUsd;
  }, [liveGasGwei, withdrawMethod, activeNetwork]);

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
      setWithdrawError(`Insufficient ${selectedToken.symbol} in vault balance (available: ${selectedToken.amount.toLocaleString()} ${selectedToken.symbol}).`);
      return;
    }

    const destination = customRecipient.trim() || walletState.address;
    if (!destination || !destination.startsWith('0x') || destination.length !== 42) {
      setWithdrawError('Please connect a wallet or enter a valid 42-character EVM recipient address.');
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

        // Trigger confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#3B82F6', '#F59E0B'],
        });

        // Reset amount to a safe default
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

  const handleDownloadCsv = () => {
    if (withdrawals.length === 0) return;
    const headers = 'ID,Timestamp,Token,Amount,AmountUSD,Destination,Network,TxHash,Status,Method,GasFeeUSD\n';
    const rows = withdrawals
      .map(
        (w) =>
          `"${w.id}","${new Date(w.timestamp).toISOString()}","${w.tokenSymbol}",${w.amount},${w.amountUsd},"${w.destinationAddress}","${w.networkId}","${w.txHash}","${w.status}","${w.method}",${w.gasFeeUsd}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Arbitrage_Withdrawals_${activeNetwork.id}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Wallet & Vault Overview */}
      <div className="rounded-lg border border-[#30363d] bg-gradient-to-r from-[#161b22] via-[#0d1624] to-[#161b22] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600/30 text-blue-400 border border-blue-500/40">
                <Wallet className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold tracking-tight text-white">
                Web3 Wallet & Vault Fund Management
              </h2>
              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                NON-CUSTODIAL WITHDRAWAL
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Connect your Web3 wallet (MetaMask, Rabby, Coinbase, or any EVM provider) to withdraw accumulated arbitrage trading profits and vault reserves directly to your personal address. All contract payouts are executed atomically via smart contract vault harvest functions.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Multi-Asset Vault (ETH, USDC, USDT, TUT, WBTC, DAI)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Direct Smart Contract Yield Harvest (<code className="text-blue-400 font-mono">withdrawProfits()</code>)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Fuel className="h-3.5 w-3.5 text-blue-400" />
                <span>Flashbots MEV-Protected Payout Routing</span>
              </span>
            </div>
          </div>

          {/* Quick Stat Pill */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3.5 text-right space-y-1 min-w-[200px]">
            <div className="text-[10px] uppercase font-mono text-slate-400">Total Accrued Vault Value</div>
            <div className="text-xl font-bold font-mono text-emerald-400">
              ${totalVaultValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Net Bot Profit: <span className="text-blue-400 font-bold">+${stats.totalNetProfitUsd.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Wallet Connection Status & Withdraw Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Wallet Connection & Vault Inventory (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Wallet Connection Status Card */}
          <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#23282f] pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Connected Web3 Wallet
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${walletState.isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-slate-600'}`}></span>
                <span className={`text-[11px] font-mono font-bold ${walletState.isConnected ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {walletState.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </div>
            </div>

            {walletState.isConnected && walletState.address ? (
              <div className="space-y-3">
                <div className="bg-[#0d1117] p-3 rounded-lg border border-[#23282f] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono text-slate-400">Target Address</span>
                    <span className="text-[10px] font-mono text-blue-400 bg-blue-950/70 border border-blue-800/40 px-2 py-0.5 rounded">
                      {walletState.walletType?.toUpperCase() || 'EVM'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold text-slate-100 truncate" title={walletState.address}>
                      {walletState.address.substring(0, 10)}...{walletState.address.substring(34)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(walletState.address!)}
                        className="p-1.5 rounded bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy Address"
                      >
                        {copiedText === walletState.address ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <a
                        href={`${activeNetwork.explorerUrl}/address/${walletState.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded bg-[#161b22] border border-[#30363d] text-slate-400 hover:text-slate-200 transition-colors"
                        title="View on Explorer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#23282f] text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Active Chain:</span>
                      <span className="text-slate-200 font-semibold">{activeNetwork.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Wallet ETH Balance:</span>
                      <span className="text-emerald-400 font-semibold">{walletState.balanceEth.toFixed(4)} ETH</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onDisconnectWallet}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-[#0d1117] border border-[#30363d] text-rose-400 hover:bg-rose-950/30 hover:border-rose-700/50 text-xs font-medium transition-colors"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Disconnect Wallet</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Select your preferred Web3 wallet provider to link your account:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onConnectWallet('metamask')}
                    disabled={walletState.isConnecting}
                    className="flex items-center gap-2 p-2.5 rounded bg-[#0d1117] border border-[#30363d] hover:border-orange-500/60 hover:bg-[#1c1813] text-left transition-all group"
                  >
                    <span className="h-6 w-6 rounded bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-xs">
                      🦊
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-orange-400">MetaMask</div>
                      <div className="text-[10px] text-slate-500">Browser Extension</div>
                    </div>
                  </button>

                  <button
                    onClick={() => onConnectWallet('rabby')}
                    disabled={walletState.isConnecting}
                    className="flex items-center gap-2 p-2.5 rounded bg-[#0d1117] border border-[#30363d] hover:border-blue-500/60 hover:bg-[#131924] text-left transition-all group"
                  >
                    <span className="h-6 w-6 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                      🐰
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-blue-400">Rabby Wallet</div>
                      <div className="text-[10px] text-slate-500">DeFi Optimized</div>
                    </div>
                  </button>

                  <button
                    onClick={() => onConnectWallet('coinbase')}
                    disabled={walletState.isConnecting}
                    className="flex items-center gap-2 p-2.5 rounded bg-[#0d1117] border border-[#30363d] hover:border-cyan-500/60 hover:bg-[#111f26] text-left transition-all group"
                  >
                    <span className="h-6 w-6 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                      🔵
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400">Coinbase</div>
                      <div className="text-[10px] text-slate-500">Smart Wallet / App</div>
                    </div>
                  </button>

                  <button
                    onClick={() => onConnectWallet('walletconnect')}
                    disabled={walletState.isConnecting}
                    className="flex items-center gap-2 p-2.5 rounded bg-[#0d1117] border border-[#30363d] hover:border-purple-500/60 hover:bg-[#1f1426] text-left transition-all group"
                  >
                    <span className="h-6 w-6 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs">
                      ⚡
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-purple-400">WalletConnect</div>
                      <div className="text-[10px] text-slate-500">Mobile & Hardware</div>
                    </div>
                  </button>
                </div>

                <div className="pt-2 border-t border-[#23282f]">
                  <button
                    onClick={() => onConnectWallet('demo_vault')}
                    disabled={walletState.isConnecting}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm shadow-blue-900/40"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Instant Sandbox Wallet Connect</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vault Asset Inventory Breakdown */}
          <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#23282f] pb-2.5">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Accrued Vault Assets
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {vaultBalances.length} Tokens Available
              </span>
            </div>

            <div className="space-y-2">
              {vaultBalances.map((item) => (
                <div
                  key={item.symbol}
                  onClick={() => setSelectedTokenSymbol(item.symbol)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedTokenSymbol === item.symbol
                      ? 'bg-[#121927] border-blue-500/70 shadow-sm shadow-blue-950'
                      : 'bg-[#0d1117] border-[#23282f] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-100">{item.symbol}</span>
                        <span className="text-[10px] text-slate-500">{item.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        ${item.basePriceUsd < 0.1 ? item.basePriceUsd.toFixed(6) : item.basePriceUsd.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-slate-200">
                      {item.amount < 1 ? item.amount.toFixed(4) : item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      ${item.valueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Execution Form (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23282f] pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Withdraw Funds to External Wallet
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Network: <strong className="text-slate-200">{activeNetwork.name}</strong>
              </span>
            </div>

            {/* Error or Success Alert */}
            {withdrawError && (
              <div className="flex items-start gap-2 p-3 rounded bg-rose-950/40 border border-rose-700/50 text-rose-300 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <div>
                  <strong className="block font-bold">Withdrawal Error</strong>
                  <span>{withdrawError}</span>
                </div>
              </div>
            )}

            {withdrawSuccess && (
              <div className="p-3.5 rounded bg-emerald-950/50 border border-emerald-700/60 text-emerald-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Withdrawal Confirmed On-Chain!</span>
                </div>
                <div className="text-[11px] font-mono text-slate-300">
                  Transferred <strong className="text-white">{withdrawSuccess.amount.toLocaleString()} {withdrawSuccess.symbol}</strong> directly to destination wallet.
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono bg-[#0d1117] p-2 rounded border border-emerald-800/40">
                  <span className="text-slate-400">Tx Hash:</span>
                  <a
                    href={`${activeNetwork.explorerUrl}/tx/${withdrawSuccess.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1 font-bold truncate max-w-[280px]"
                  >
                    <span>{withdrawSuccess.txHash.substring(0, 14)}...{withdrawSuccess.txHash.substring(54)}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              
              {/* Asset Selector */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                  Select Asset to Withdraw
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {vaultBalances.map((b) => (
                    <button
                      key={b.symbol}
                      type="button"
                      onClick={() => {
                        setSelectedTokenSymbol(b.symbol);
                        const safeInit = (b.amount * 0.5);
                        setWithdrawAmount(safeInit > 0 ? safeInit.toFixed(2) : '0');
                      }}
                      className={`p-2 rounded border text-center transition-all ${
                        selectedTokenSymbol === b.symbol
                          ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm'
                          : 'bg-[#0d1117] text-slate-300 border-[#30363d] hover:border-slate-500'
                      }`}
                    >
                      <div className="text-xs">{b.symbol}</div>
                      <div className="text-[9px] font-mono opacity-80">${Math.round(b.valueUsd).toLocaleString()}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input & Percentage Buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                    Withdrawal Amount ({selectedToken.symbol})
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Available: <strong className="text-slate-200">{selectedToken.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {selectedToken.symbol}</strong> (${selectedToken.valueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={selectedToken.amount}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2.5 text-sm font-mono text-slate-100 font-bold focus:border-blue-500 focus:outline-none pr-28"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span className="text-xs font-mono font-bold text-slate-400 mr-1">{selectedToken.symbol}</span>
                    <button
                      type="button"
                      onClick={() => handlePercentageSelect(100)}
                      className="bg-blue-950 text-blue-300 border border-blue-700/60 px-2 py-1 rounded text-[10px] font-bold font-mono hover:bg-blue-900 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Percentage Presets */}
                <div className="flex items-center gap-2 pt-1">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentageSelect(pct)}
                      className="flex-1 py-1 rounded bg-[#0d1117] border border-[#30363d] hover:border-blue-500/50 text-[11px] font-mono text-slate-300 hover:text-white transition-colors"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Address Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                    Recipient EVM Address
                  </label>
                  {walletState.isConnected && (
                    <button
                      type="button"
                      onClick={() => setCustomRecipient(walletState.address || '')}
                      className="text-[10px] text-blue-400 hover:underline font-mono"
                    >
                      Use Connected Wallet
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={customRecipient || (walletState.isConnected ? walletState.address || '' : '')}
                  onChange={(e) => setCustomRecipient(e.target.value)}
                  placeholder="0x... (Recipient Address)"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 font-mono">
                  Funds will be transferred to this address via smart contract vault harvest.
                </p>
              </div>

              {/* Method Selector */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Smart Contract Execution Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('VAULT_HARVEST')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      withdrawMethod === 'VAULT_HARVEST'
                        ? 'bg-blue-950/60 border-blue-500 text-slate-100'
                        : 'bg-[#0d1117] border-[#30363d] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Unlock className="h-3.5 w-3.5 text-blue-400" />
                      <span>Vault Harvest</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">withdrawProfits()</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('EMERGENCY_RESCUE')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      withdrawMethod === 'EMERGENCY_RESCUE'
                        ? 'bg-amber-950/60 border-amber-500 text-slate-100'
                        : 'bg-[#0d1117] border-[#30363d] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                      <span>Owner Rescue</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">rescueERC20()</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('EOA_TRANSFER')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      withdrawMethod === 'EOA_TRANSFER'
                        ? 'bg-emerald-950/60 border-emerald-500 text-slate-100'
                        : 'bg-[#0d1117] border-[#30363d] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Direct Transfer</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">safeTransfer()</div>
                  </button>
                </div>
              </div>

              {/* Transaction Summary Breakdown */}
              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#23282f] space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Payout:</span>
                  <strong className="text-slate-100">
                    {parseFloat(withdrawAmount) || 0} {selectedToken.symbol} (~${((parseFloat(withdrawAmount) || 0) * selectedToken.basePriceUsd).toFixed(2)})
                  </strong>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Network Gas:</span>
                  <span className="text-emerald-400 font-semibold">
                    ~${estimatedGasUsd.toFixed(3)} ({liveGasGwei.toFixed(1)} Gwei)
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1 border-t border-[#23282f]">
                  <span>Flashbots Bundle MEV Protection:</span>
                  <span className="text-blue-400 font-semibold">Enabled (Private Relay)</span>
                </div>
              </div>

              {/* Execution Trigger */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-all shadow-md shadow-emerald-950 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Signing & Confirming Withdrawal On-Chain...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-4 w-4" />
                    <span>Confirm & Withdraw Funds to Wallet</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Bottom Section: Withdrawal Transaction Audit Log */}
      <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23282f] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Withdrawal Transaction History ({withdrawals.length})
            </h3>
          </div>

          <button
            onClick={handleDownloadCsv}
            disabled={withdrawals.length === 0}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono text-slate-300 bg-[#0d1117] border border-[#30363d] rounded hover:border-slate-500 transition-colors disabled:opacity-40"
          >
            <Download className="h-3 w-3 text-blue-400" />
            <span>Export CSV Statement</span>
          </button>
        </div>

        {withdrawals.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs font-mono">
            No withdrawal transactions recorded yet on this session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-[#23282f] text-[10px] uppercase text-slate-400 bg-[#0d1117]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">USD Value</th>
                  <th className="py-2.5 px-3">Destination Address</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Tx Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23282f] text-slate-300">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-[#12161f] transition-colors">
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(w.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-200">
                      {w.tokenSymbol}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">
                      +{w.amount.toLocaleString()} {w.tokenSymbol}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      ${w.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      <span className="truncate block max-w-[130px]" title={w.destinationAddress}>
                        {w.destinationAddress.substring(0, 6)}...{w.destinationAddress.substring(38)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-blue-300 font-mono">
                      {w.method}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded text-[10px] font-bold">
                        {w.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <a
                        href={`${activeNetwork.explorerUrl}/tx/${w.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                      >
                        <span>{w.txHash.substring(0, 6)}...{w.txHash.substring(60)}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
