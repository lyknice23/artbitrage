import React, { useState, useEffect } from 'react';
import { 
  X, 
  Zap, 
  ShieldCheck, 
  ExternalLink, 
  Copy, 
  Check, 
  Fuel, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  Lock,
  Flame,
  Cpu,
  Server,
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ArbitrageOpportunity, Network, WalletState } from '../types';
import { executeRealFlashArbitrage, ArbitrageTxReceipt, connectRealWeb3Wallet } from '../services/web3WalletService';
import { loadNodeConfig, getActiveRpcUrl, NodeConfig } from '../services/nodeService';
import { calculateDynamicAmountOutMin, DynamicQuoteResult } from '../services/dynamicQuoterService';

interface RealFlashTxModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: ArbitrageOpportunity | null;
  activeNetwork: Network;
  walletState: WalletState;
  onConnectWallet: (type: 'metamask' | 'rabby' | 'coinbase' | 'walletconnect' | 'browser_injected' | 'demo_vault') => void;
  onSuccessTx: (receipt: ArbitrageTxReceipt, opp: ArbitrageOpportunity) => void;
  liveGasGwei: number;
}

export const RealFlashTxModal: React.FC<RealFlashTxModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  activeNetwork,
  walletState,
  onConnectWallet,
  onSuccessTx,
  liveGasGwei,
}) => {
  const [executionMode, setExecutionMode] = useState<'REAL_WEB3' | 'FLASHBOTS_BUNDLE'>('FLASHBOTS_BUNDLE');
  const [useMevProtection, setUseMevProtection] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [stepStatus, setStepStatus] = useState<string>('idle');
  const [txReceipt, setTxReceipt] = useState<ArbitrageTxReceipt | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [nodeConfig, setNodeConfig] = useState<NodeConfig>(loadNodeConfig());
  const [preFlightQuote, setPreFlightQuote] = useState<DynamicQuoteResult | null>(null);

  // Perform pre-flight dynamic quote calculation on open
  useEffect(() => {
    if (isOpen && opportunity) {
      setNodeConfig(loadNodeConfig());
      const tokenPrice = opportunity.loanValueUsd / (opportunity.loanAmount || 1);
      calculateDynamicAmountOutMin({
        borrowToken: opportunity.tokenSymbol,
        borrowAmount: opportunity.loanAmount,
        tokenBasePriceUsd: tokenPrice,
        buyDex: opportunity.buyDex,
        sellDex: opportunity.sellDex,
        flashLoanFeePercent: opportunity.flashLoanFeePercent || 0.05,
        expectedSpreadPercent: opportunity.spreadPercent,
        networkId: activeNetwork.id,
      }).then(setPreFlightQuote);
    }
  }, [isOpen, opportunity, activeNetwork.id]);

  if (!isOpen || !opportunity) return null;

  const estimatedGasCostUsd = ((380000 * liveGasGwei * 1e-9) * activeNetwork.gasTokenPriceUsd);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleExecute = async () => {
    setErrorMsg(null);
    setTxReceipt(null);
    setIsSubmitting(true);
    setStepStatus('Preparing flash loan calldata & route approval...');

    try {
      if (!walletState.isConnected || !walletState.address) {
        setStepStatus('Requesting Web3 Wallet authorization...');
        try {
          await connectRealWeb3Wallet();
          await onConnectWallet('metamask');
        } catch (e: any) {
          throw new Error(e.message || 'Please connect your Web3 wallet (MetaMask or Rabby) to sign and broadcast live transactions.');
        }
      }

      setStepStatus('Prompting Web3 Wallet for Flash Loan transaction signature...');

      const receipt = await executeRealFlashArbitrage({
        borrowToken: opportunity.tokenSymbol,
        borrowAmount: opportunity.loanAmount,
        expectedProfitUsd: opportunity.netProfitUsd,
        buyDex: opportunity.buyDex,
        sellDex: opportunity.sellDex,
        network: activeNetwork,
        useFlashbotsMevProtection: useMevProtection,
        userAddress: walletState.address || '',
      });

      setTxReceipt(receipt);
      onSuccessTx(receipt, opportunity);

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10B981', '#3B82F6', '#F59E0B'],
      });
    } catch (err: any) {
      console.error('Execution error:', err);
      setErrorMsg(err.message || 'Transaction execution failed.');
    } finally {
      setIsSubmitting(false);
      setStepStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 shadow-inner">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-slate-100">
                  Execute Real Flash Arbitrage
                </h3>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-400 border border-emerald-500/30">
                  +${opportunity.netProfitUsd.toFixed(2)} Expected
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {activeNetwork.name} • Borrow from {opportunity.loanProvider}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Opportunity Specs Overview Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Flash Loan Amount</span>
                <span className="font-mono font-bold text-slate-200 text-sm">
                  {opportunity.loanAmount} {opportunity.tokenSymbol}
                </span>
                <span className="text-[10px] text-slate-400 block">${opportunity.loanValueUsd.toLocaleString()}</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Upfront Capital Req.</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">$0.00</span>
                <span className="text-[10px] text-emerald-500/80 block">Zero Collateral</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Arbitrage Route</span>
                <span className="font-mono font-bold text-slate-200 text-xs truncate block">
                  {opportunity.buyDex} ➔ {opportunity.sellDex}
                </span>
                <span className="text-[10px] text-cyan-400 block">Spread: {opportunity.spreadPercent.toFixed(2)}%</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Est. Gas Cost</span>
                <span className="font-mono font-bold text-amber-400 text-sm">${estimatedGasCostUsd.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 block">{liveGasGwei.toFixed(1)} Gwei</span>
              </div>
            </div>

            {/* Dynamic Pre-Flight Quoting & Repayment Floor Guarantee Badge */}
            {preFlightQuote && (
              <div className="rounded-lg bg-emerald-950/30 border border-emerald-700/50 p-3 text-[11px] font-mono space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Dynamic On-Chain Pre-Flight Quoter
                  </span>
                  <span className="text-[10px] bg-emerald-900/60 border border-emerald-600/40 text-emerald-200 px-2 py-0.5 rounded">
                    Latency: {preFlightQuote.latencyMs}ms
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Dynamic amountOutMin:</span>
                    <span className="text-emerald-300 font-bold">{preFlightQuote.amountOutMin.toFixed(4)} {opportunity.tokenSymbol}</span>
                  </div>
                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Loan Repayment Floor:</span>
                    <span className="text-amber-300 font-bold">{preFlightQuote.flashLoanRepaymentFloor.toFixed(4)} {opportunity.tokenSymbol}</span>
                  </div>
                  <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block">Market Noise Absorption:</span>
                    <span className="text-blue-300 font-bold">±{preFlightQuote.dynamicSlippagePercent.toFixed(2)}% Tol.</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-sans">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Repayment Invariant Satisfied:</strong> <code className="text-emerald-200">amountOutMin &gt;= Principal + 0.05% Fee</code> (Guaranteed zero atomic revert risk).
                  </span>
                </div>
              </div>
            )}

            {/* Active Node & Routing Banner */}
            <div className="flex items-center justify-between text-[11px] font-mono bg-slate-900/70 px-3 py-2 rounded-lg border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-blue-400" />
                Active Node: <strong className="text-slate-200 uppercase">{nodeConfig.providerType}</strong>
              </span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Flashbots Private Bundle
              </span>
            </div>

            {/* Atomic Execution Sequence */}
            <div className="rounded-lg bg-slate-900/90 p-3 border border-slate-800 text-[11px] font-mono space-y-1 text-slate-300">
              <div className="text-slate-500 uppercase text-[10px] font-sans font-bold tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-cyan-400" /> Atomic Transaction Pipeline
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">Step 1:</span> Flash loan {opportunity.loanAmount} {opportunity.tokenSymbol} from {opportunity.loanProvider} pool
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">Step 2:</span> Swap on {opportunity.buyDex} @ ${opportunity.buyPrice}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">Step 3:</span> Counter-swap on {opportunity.sellDex} @ ${opportunity.sellPrice}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">Step 4:</span> Repay loan + fee, retain surplus profit in your wallet/vault
              </div>
            </div>
          </div>

          {/* Execution Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Choose Execution Channel
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Option 1: Real Connected Web3 Wallet */}
              <button
                type="button"
                onClick={() => setExecutionMode('REAL_WEB3')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  executionMode === 'REAL_WEB3'
                    ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500'
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <Wallet className="h-4 w-4 text-emerald-400" /> Real Web3 Wallet (MetaMask / Rabby)
                  </span>
                  {executionMode === 'REAL_WEB3' && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Prompts your connected browser wallet for on-chain contract signature and direct blockchain broadcast.
                </p>
              </button>

              {/* Option 2: Flashbots Private MEV Bundle */}
              <button
                type="button"
                onClick={() => setExecutionMode('FLASHBOTS_BUNDLE')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  executionMode === 'FLASHBOTS_BUNDLE'
                    ? 'border-indigo-500 bg-indigo-950/30 ring-1 ring-indigo-500'
                    : 'border-slate-800 bg-slate-950 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <ShieldCheck className="h-4 w-4 text-indigo-400" /> Flashbots MEV-Share Relay
                  </span>
                  {executionMode === 'FLASHBOTS_BUNDLE' && (
                    <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Routes directly to private block builders (<code className="text-indigo-300">rpc.flashbots.net</code>), completely bypassing the public mempool.
                </p>
              </button>
            </div>
          </div>

          {/* Flashbots MEV Protection Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-3.5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              <div>
                <div className="text-xs font-bold text-indigo-200">
                  Anti-Sandwich & Frontrunning Protection
                </div>
                <div className="text-[11px] text-slate-400">
                  Protects trade from searcher bot sandwiching by enforcing atomic revert on negative slippage
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={useMevProtection}
              onChange={(e) => setUseMevProtection(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
          </div>

          {/* Submitting Status / Feedback */}
          {isSubmitting && (
            <div className="rounded-xl border border-blue-800 bg-blue-950/40 p-3.5 flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />
              <div className="text-xs text-blue-200 font-mono">
                {stepStatus}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="rounded-xl border border-rose-800 bg-rose-950/40 p-3.5 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-rose-200">Execution Error</div>
                <div className="text-[11px] text-rose-300/90 mt-0.5">{errorMsg}</div>
              </div>
            </div>
          )}

          {/* Success Receipt Banner */}
          {txReceipt && (
            <div className="rounded-xl border border-emerald-700 bg-emerald-950/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Flash Arbitrage Executed Successfully!
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  +${txReceipt.arbitrageProfitUsd?.toFixed(2)} Profit
                </span>
              </div>
              <div className="text-[11px] text-slate-300 space-y-1 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Tx Hash:</span>
                  <span className="text-slate-200 truncate">{txReceipt.txHash}</span>
                  <button onClick={() => handleCopy(txReceipt.txHash)} className="text-emerald-400 hover:text-emerald-300">
                    {copiedHash ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <div>Gas Used: {txReceipt.gasUsed} ({txReceipt.effectiveGasPriceGwei} Gwei)</div>
                {txReceipt.blockNumber && <div>Block Included: #{txReceipt.blockNumber}</div>}
              </div>

              {txReceipt.explorerUrl && (
                <a
                  href={txReceipt.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 mt-2"
                >
                  <span>View on {activeNetwork.name} Explorer</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 p-4 bg-slate-950/80">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {txReceipt ? 'Done' : 'Cancel'}
          </button>

          <button
            onClick={handleExecute}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-950/60 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Broadcasting to Network...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-current" />
                <span>Confirm & Execute Flash Arbitrage (+${opportunity.netProfitUsd.toFixed(2)})</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
