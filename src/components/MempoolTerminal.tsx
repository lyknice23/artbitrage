import React, { useState } from 'react';
import { 
  Terminal, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Download, 
  Copy, 
  Check, 
  ShieldAlert, 
  Search,
  Filter
} from 'lucide-react';
import { TradeLog, Network } from '../types';

interface MempoolTerminalProps {
  logs: TradeLog[];
  activeNetwork: Network;
  onClearLogs: () => void;
}

export const MempoolTerminal: React.FC<MempoolTerminalProps> = ({
  logs,
  activeNetwork,
  onClearLogs,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterStatus !== 'ALL' && log.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.txHash.toLowerCase().includes(q) ||
        log.tokenSymbol.toLowerCase().includes(q) ||
        log.buyDex.toLowerCase().includes(q) ||
        log.sellDex.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const exportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `flashloan_arbitrage_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-sm overflow-hidden">
      {/* Terminal Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-4 bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-cyan-400 border border-slate-700">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-100">
              Live DeFi Mempool & Execution Terminal
            </h3>
            <p className="text-[11px] text-slate-400">
              Real-time block stream, flash loan execution traces, and MEV arbitrage outcomes
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search tx / pair..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-950 py-1 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FRONTRUN_DETECTED">Frontrun Sandwiches</option>
            <option value="REVERTED_SLIPPAGE">Reverted</option>
          </select>

          {/* Export JSON */}
          <button
            onClick={exportLogs}
            title="Export Execution History as JSON"
            className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>

          {/* Clear */}
          <button
            onClick={onClearLogs}
            className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-3 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Terminal className="h-8 w-8 mx-auto text-slate-600 mb-2" />
            <p>No transaction logs recorded yet.</p>
            <p className="text-[11px] text-slate-600 font-sans">
              Start the bot engine or execute a manual flash loan to view real-time traces.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isSuccess = log.status === 'SUCCESS';
            const isFrontrun = log.status === 'FRONTRUN_DETECTED';

            return (
              <div
                key={log.id}
                className={`rounded-xl border p-3.5 transition-all ${
                  isSuccess
                    ? 'border-emerald-900/40 bg-emerald-950/10'
                    : isFrontrun
                    ? 'border-rose-900/50 bg-rose-950/20'
                    : 'border-amber-900/40 bg-amber-950/10'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    {isSuccess ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> [SUCCESS]
                      </span>
                    ) : isFrontrun ? (
                      <span className="flex items-center gap-1 text-rose-400 font-bold">
                        <ShieldAlert className="h-3.5 w-3.5" /> [FRONTRUN DETECTED]
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <XCircle className="h-3.5 w-3.5" /> [REVERTED]
                      </span>
                    )}

                    <span className="text-slate-300 font-sans font-bold">
                      {log.tokenSymbol}/{log.quoteSymbol} Flash Loan
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-cyan-400">{log.flashLoanProvider}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()} ({log.latencyMs}ms)
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Block #{log.blockNumber}
                    </span>
                  </div>
                </div>

                {/* Main details */}
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4 text-[11px]">
                  <div>
                    <span className="text-slate-500">Borrowed:</span>{' '}
                    <span className="text-slate-200 font-bold">
                      {log.borrowAmount} {log.tokenSymbol} (${log.borrowAmountUsd.toLocaleString()})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Route:</span>{' '}
                    <span className="text-slate-300">
                      {log.buyDex} → {log.sellDex}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Gas Spent:</span>{' '}
                    <span className="text-amber-400 font-bold">
                      ${log.gasCostUsd.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Net Profit:</span>{' '}
                    <span
                      className={`font-bold ${
                        log.netProfitUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {log.netProfitUsd >= 0 ? '+' : ''}${log.netProfitUsd.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Sub-steps trace */}
                <div className="mt-2.5 rounded bg-slate-950/80 p-2 text-[10px] space-y-1 text-slate-400 border border-slate-900">
                  {log.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={step.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}>
                          {step.status === 'SUCCESS' ? '✓' : '✗'}
                        </span>
                        <span className="text-slate-300">{step.title}:</span>
                        <span>{step.description}</span>
                      </div>
                      <span className="text-slate-600 font-mono">{step.gasUsed.toLocaleString()} gas</span>
                    </div>
                  ))}
                </div>

                {/* Tx Hash row */}
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-1">
                    <span>Tx Hash:</span>
                    <span className="font-mono text-slate-400">{log.txHash.slice(0, 18)}...{log.txHash.slice(-8)}</span>
                    <button
                      onClick={() => copyHash(log.txHash)}
                      className="ml-1 text-slate-400 hover:text-cyan-300"
                    >
                      {copiedHash === log.txHash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>

                  <a
                    href={`${activeNetwork.explorerUrl}${log.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <span>View on {activeNetwork.shortName}scan</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
