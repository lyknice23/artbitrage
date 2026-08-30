import React, { useState } from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Fuel, 
  Zap, 
  Layers, 
  Activity,
  Award,
  Download,
  FileSpreadsheet,
  Copy,
  Check,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Clock,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { BotStats, ProfitHistoryPoint, TradeLog } from '../types';

interface AnalyticsDashboardProps {
  stats: BotStats;
  profitHistory: ProfitHistoryPoint[];
  tradeLogs: TradeLog[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  stats,
  profitHistory,
  tradeLogs,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'REVERTED'>('ALL');
  const [sortField, setSortField] = useState<'timestamp' | 'netProfitUsd' | 'gasCostUsd' | 'latencyMs'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);
  const [copiedTxHash, setCopiedTxHash] = useState<string | null>(null);

  const winRate = stats.totalExecuted > 0
    ? ((stats.successfulTrades / stats.totalExecuted) * 100).toFixed(1)
    : '100.0';

  // Pair Performance tally
  const pairPerformance: Record<string, { trades: number; profit: number }> = {};
  tradeLogs.forEach((log) => {
    const pairKey = `${log.tokenSymbol}/${log.quoteSymbol}`;
    if (!pairPerformance[pairKey]) {
      pairPerformance[pairKey] = { trades: 0, profit: 0 };
    }
    pairPerformance[pairKey].trades += 1;
    pairPerformance[pairKey].profit += log.netProfitUsd;
  });

  const pairList = Object.entries(pairPerformance).map(([pair, data]) => ({
    pair,
    trades: data.trades,
    profit: Math.round(data.profit),
  })).sort((a, b) => b.profit - a.profit);

  // Filter & sort logs for display & export
  const filteredLogs = tradeLogs.filter((log) => {
    if (statusFilter === 'SUCCESS' && log.status !== 'SUCCESS') return false;
    if (statusFilter === 'REVERTED' && log.status === 'SUCCESS') return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchPair = `${log.tokenSymbol}/${log.quoteSymbol}`.toLowerCase().includes(q);
      const matchDex = log.buyDex.toLowerCase().includes(q) || log.sellDex.toLowerCase().includes(q);
      const matchProvider = log.flashLoanProvider.toLowerCase().includes(q);
      const matchTx = log.txHash.toLowerCase().includes(q);
      const matchId = log.id.toLowerCase().includes(q);
      return matchPair || matchDex || matchProvider || matchTx || matchId;
    }
    return true;
  }).sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    return sortOrder === 'desc' ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
  });

  // CSV Generator Helper
  const generateCsvContent = (logs: TradeLog[]): string => {
    const headers = [
      'Trade ID',
      'Timestamp (Unix ms)',
      'Timestamp (UTC ISO)',
      'Network ID',
      'Token Pair',
      'Borrow Asset',
      'Quote Asset',
      'Borrow Amount',
      'Borrow Value (USD)',
      'Buy DEX',
      'Buy Price (USD)',
      'Sell DEX',
      'Sell Price (USD)',
      'Flash Loan Provider',
      'Flash Loan Fee (USD)',
      'Gross Profit (USD)',
      'Gas Cost (USD)',
      'Net Profit (USD)',
      'Execution Status',
      'Transaction Hash',
      'Block Number',
      'Execution Latency (ms)'
    ];

    const escapeCsvField = (field: unknown): string => {
      if (field === null || field === undefined) return '""';
      const str = String(field);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = logs.map((log) => [
      log.id,
      log.timestamp,
      new Date(log.timestamp).toISOString(),
      log.networkId,
      `${log.tokenSymbol}/${log.quoteSymbol}`,
      log.tokenSymbol,
      log.quoteSymbol,
      log.borrowAmount,
      log.borrowAmountUsd.toFixed(2),
      log.buyDex,
      log.buyPrice.toFixed(4),
      log.sellDex,
      log.sellPrice.toFixed(4),
      log.flashLoanProvider,
      log.flashLoanFeeUsd.toFixed(2),
      log.grossProfitUsd.toFixed(2),
      log.gasCostUsd.toFixed(2),
      log.netProfitUsd.toFixed(2),
      log.status,
      log.txHash,
      log.blockNumber,
      log.latencyMs
    ].map(escapeCsvField).join(','));

    return [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
  };

  // Trigger Download CSV
  const handleExportCsv = (onlyFiltered = false) => {
    const targetLogs = onlyFiltered ? filteredLogs : tradeLogs;
    if (targetLogs.length === 0) return;

    const csvContent = generateCsvContent(targetLogs);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `defi_arbitrage_trade_logs_${timestampStr}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  // Copy CSV to Clipboard
  const handleCopyCsv = () => {
    if (tradeLogs.length === 0) return;
    const csvContent = generateCsvContent(filteredLogs.length > 0 ? filteredLogs : tradeLogs);
    navigator.clipboard.writeText(csvContent);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const copyTxHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedTxHash(hash);
    setTimeout(() => setCopiedTxHash(null), 1500);
  };

  const toggleSort = (field: 'timestamp' | 'netProfitUsd' | 'gasCostUsd' | 'latencyMs') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">

      {/* Header & Quick CSV Export Action Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"></span>
              <h2 className="font-display text-base font-bold uppercase tracking-wider text-slate-100">
                Performance Analytics & Trade Log Audits
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Comprehensive PnL metrics, win-rate attribution, and instant CSV export of all executed arbitrage transactions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Copy CSV Button */}
            <button
              id="copy-csv-btn"
              onClick={handleCopyCsv}
              disabled={tradeLogs.length === 0}
              title="Copy CSV to clipboard"
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                copiedCsv
                  ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                  : tradeLogs.length === 0
                  ? 'border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed'
                  : 'border-slate-700 bg-slate-800/90 text-slate-300 hover:border-slate-500 hover:text-white hover:bg-slate-700'
              }`}
            >
              {copiedCsv ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              <span>{copiedCsv ? 'CSV Copied!' : 'Copy CSV'}</span>
            </button>

            {/* Export CSV Download Button */}
            <button
              id="export-trade-logs-csv-btn"
              onClick={() => handleExportCsv(false)}
              disabled={tradeLogs.length === 0}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold transition-all shadow-sm ${
                exportSuccess
                  ? 'border-emerald-500 bg-emerald-600 text-white shadow-emerald-900/30'
                  : tradeLogs.length === 0
                  ? 'border-slate-800 bg-slate-800/50 text-slate-500 cursor-not-allowed'
                  : 'border-blue-500 bg-blue-600 text-white hover:bg-blue-500 hover:border-blue-400 active:scale-[0.98] shadow-blue-900/30'
              }`}
            >
              {exportSuccess ? (
                <>
                  <Check className="h-4 w-4 text-white animate-bounce" />
                  <span>Downloaded CSV!</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <FileSpreadsheet className="h-3.5 w-3.5 opacity-80" />
                  <span>Export CSV ({tradeLogs.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Export Success Feedback Toast */}
        {exportSuccess && (
          <div className="mt-3.5 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/60 p-2.5 text-xs text-emerald-300 animate-fadeIn">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Success:</strong> {tradeLogs.length} trade logs exported to CSV file (including transaction hashes, DEX routing, gas breakdowns, and net profit calculations).
            </span>
          </div>
        )}
      </div>
      
      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Net Profit */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Net Profit</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-emerald-400">
            ${stats.totalNetProfitUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Across {stats.successfulTrades} executed flash loans
          </div>
        </div>

        {/* Win Rate */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Atomic Win Rate</span>
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-cyan-300">
            {winRate}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {stats.successfulTrades} success / {stats.failedTrades} reverted
          </div>
        </div>

        {/* Gas Spent */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Gas Consumed</span>
            <Fuel className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-amber-300">
            ${stats.totalGasSpentUsd.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Net ROI Ratio: {stats.totalGasSpentUsd > 0 ? (stats.totalNetProfitUsd / stats.totalGasSpentUsd).toFixed(1) : '∞'}x
          </div>
        </div>

        {/* Volume Handled */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Flash Volume Loaned</span>
            <Zap className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-indigo-300">
            ${(stats.totalVolumeProcessedUsd / 1000).toFixed(1)}k
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Zero capital locked in reserves
          </div>
        </div>

      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Cumulative PnL Timeline */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-100">
                Cumulative Profit Timeline ($)
              </h3>
              <p className="text-xs text-slate-400">Real-time session equity curve</p>
            </div>
            <span className="rounded bg-emerald-950/80 px-2 py-0.5 font-mono text-xs font-bold text-emerald-400 border border-emerald-800/50">
              Live Feed
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profitHistory} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="cumulativeProfit" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#equityGrad)" name="Total Equity ($)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pair Leaderboard */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-cyan-400" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-100">
              Most Profitable Pairs
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">Ranked by cumulative arbitrage yield</p>

          <div className="space-y-3">
            {pairList.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No completed executions yet.</p>
            ) : (
              pairList.slice(0, 5).map((item, idx) => (
                <div key={item.pair} className="flex items-center justify-between rounded-lg bg-slate-950/60 p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 font-mono text-[10px] font-bold text-slate-300">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-200">{item.pair}</span>
                    <span className="text-[10px] text-slate-500">({item.trades} trades)</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    +${item.profit.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Trade Execution History & Exportable CSV Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
        
        {/* Table Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-100">
              Executed Trade Logs
            </h3>
            <span className="rounded bg-cyan-950/60 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-300 border border-cyan-800/40">
              {filteredLogs.length} / {tradeLogs.length} Records
            </span>
          </div>

          {/* Search, Filter & Quick Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                id="search-trade-logs"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search pair, DEX, tx..."
                className="w-48 sm:w-56 rounded-lg border border-slate-700 bg-slate-950/70 py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center rounded-lg border border-slate-700 bg-slate-950/70 p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`rounded px-2 py-1 font-medium transition-colors ${
                  statusFilter === 'ALL' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('SUCCESS')}
                className={`rounded px-2 py-1 font-medium transition-colors ${
                  statusFilter === 'SUCCESS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Success
              </button>
              <button
                onClick={() => setStatusFilter('REVERTED')}
                className={`rounded px-2 py-1 font-medium transition-colors ${
                  statusFilter === 'REVERTED' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reverted
              </button>
            </div>

            {/* Download Filtered CSV Button */}
            <button
              id="export-filtered-csv-btn"
              onClick={() => handleExportCsv(true)}
              disabled={filteredLogs.length === 0}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                filteredLogs.length === 0
                  ? 'border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed'
                  : 'border-emerald-600/60 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm text-[10px] uppercase text-slate-400 font-semibold tracking-wider font-sans">
              <tr>
                <th 
                  onClick={() => toggleSort('timestamp')}
                  className="py-3 px-4 cursor-pointer hover:text-cyan-300 select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Time (UTC)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Token Pair & Route</th>
                <th className="py-3 px-4">Loan Provider & Size</th>
                <th className="py-3 px-4 text-right">Buy / Sell Price</th>
                <th 
                  onClick={() => toggleSort('gasCostUsd')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-cyan-300 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Gas Spent</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('netProfitUsd')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-cyan-300 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Net Profit</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Status</th>
                <th 
                  onClick={() => toggleSort('latencyMs')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-cyan-300 select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Latency</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right font-sans">Tx Hash</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/80 bg-slate-900/40">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="h-8 w-8 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-400">No trade logs found</p>
                      <p className="text-xs text-slate-500">
                        {searchTerm ? 'Try adjusting your search query or filter.' : 'Executed transactions will appear here and can be exported as CSV.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  const dateStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  
                  return (
                    <tr key={log.id} className="transition-colors hover:bg-slate-800/60">
                      {/* Time */}
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">{dateStr}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(log.timestamp).toISOString().slice(0, 10)}
                          </span>
                        </div>
                      </td>

                      {/* Token Pair & Route */}
                      <td className="py-3 px-4 font-sans whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-100 font-mono">
                            {log.tokenSymbol}/{log.quoteSymbol}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {log.buyDex} &rarr; {log.sellDex}
                          </span>
                        </div>
                      </td>

                      {/* Loan Provider & Size */}
                      <td className="py-3 px-4 font-sans whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono text-slate-200">
                            {log.borrowAmount} {log.tokenSymbol}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ${log.borrowAmountUsd.toLocaleString()} ({log.flashLoanProvider})
                          </span>
                        </div>
                      </td>

                      {/* Buy / Sell Price */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span className="text-slate-300">${log.buyPrice.toLocaleString()}</span>
                          <span className="text-slate-400 text-[10px]">${log.sellPrice.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Gas Spent */}
                      <td className="py-3 px-4 text-right text-amber-300 whitespace-nowrap">
                        ${log.gasCostUsd.toFixed(2)}
                      </td>

                      {/* Net Profit */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`font-bold text-sm ${isSuccess ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {log.netProfitUsd > 0 ? '+' : ''}${log.netProfitUsd.toFixed(2)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isSuccess
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50'
                            : 'bg-rose-950/70 text-rose-300 border border-rose-800/50'
                        }`}>
                          {isSuccess ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-rose-400" />}
                          {log.status}
                        </span>
                      </td>

                      {/* Latency */}
                      <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">
                        {log.latencyMs}ms
                      </td>

                      {/* Tx Hash */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-mono text-[11px] text-slate-400">
                            {log.txHash.slice(0, 6)}...{log.txHash.slice(-4)}
                          </span>
                          <button
                            onClick={() => copyTxHash(log.txHash)}
                            title="Copy Tx Hash"
                            className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          >
                            {copiedTxHash === log.txHash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary of Table */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-4">
            <span>Showing <strong className="text-slate-200">{filteredLogs.length}</strong> of <strong className="text-slate-200">{tradeLogs.length}</strong> transactions</span>
            <span>Total Filtered Net PnL: <strong className={filteredLogs.reduce((s, l) => s + l.netProfitUsd, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              +${filteredLogs.reduce((s, l) => s + l.netProfitUsd, 0).toFixed(2)}
            </strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">RFC 4180 CSV Compliant</span>
            <button
              onClick={() => handleExportCsv(false)}
              disabled={tradeLogs.length === 0}
              className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 disabled:text-slate-600 disabled:no-underline"
            >
              Export Full Dataset (.csv)
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

