import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  ShieldCheck,
  Radio,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Server,
  Key,
  Globe,
  RefreshCw,
  Layers,
  Fuel,
  Info,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { 
  NodeConfig, 
  RpcProviderType, 
  loadNodeConfig, 
  saveNodeConfig, 
  testNodeLatency, 
  NodeLatencyResult,
  getActiveRpcUrl 
} from '../services/nodeService';
import {
  FlashbotsBundleConfig,
  loadFlashbotsConfig,
  saveFlashbotsConfig
} from '../services/flashbotsBundleService';
import {
  DynamicSlippageSettings,
  loadDynamicSlippageSettings,
  saveDynamicSlippageSettings
} from '../services/dynamicQuoterService';
import { Network } from '../types';

interface TransactionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNetwork: Network;
  onSettingsSaved?: () => void;
}

export const TransactionSettingsModal: React.FC<TransactionSettingsModalProps> = ({
  isOpen,
  onClose,
  activeNetwork,
  onSettingsSaved,
}) => {
  // Tabs: 'nodes' | 'flashbots' | 'slippage'
  const [activeTab, setActiveTab] = useState<'nodes' | 'flashbots' | 'slippage'>('nodes');

  // Node Configuration
  const [nodeConfig, setNodeConfig] = useState<NodeConfig>(loadNodeConfig());
  const [showApiKey, setShowApiKey] = useState(false);
  const [latencyResult, setLatencyResult] = useState<NodeLatencyResult | null>(null);
  const [isTestingLatency, setIsTestingLatency] = useState(false);

  // Flashbots Configuration
  const [flashbotsConfig, setFlashbotsConfig] = useState<FlashbotsBundleConfig>(loadFlashbotsConfig());

  // Dynamic Slippage & Quoter Configuration
  const [slippageSettings, setSlippageSettings] = useState<DynamicSlippageSettings>(loadDynamicSlippageSettings());

  // Save Notification
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Refresh config on open
  useEffect(() => {
    if (isOpen) {
      setNodeConfig(loadNodeConfig());
      setFlashbotsConfig(loadFlashbotsConfig());
      setSlippageSettings(loadDynamicSlippageSettings());
      setSaveSuccess(false);
      // Auto-test current node latency
      handleTestLatency();
    }
  }, [isOpen, activeNetwork.id]);

  const handleTestLatency = async () => {
    setIsTestingLatency(true);
    const activeUrl = getActiveRpcUrl(activeNetwork.id, nodeConfig);
    try {
      const res = await testNodeLatency(activeUrl, nodeConfig.providerType);
      setLatencyResult(res);
    } catch (e) {
      console.error('Latency test error:', e);
    } finally {
      setIsTestingLatency(false);
    }
  };

  const handleSaveAll = () => {
    saveNodeConfig(nodeConfig);
    saveFlashbotsConfig(flashbotsConfig);
    saveDynamicSlippageSettings(slippageSettings);
    setSaveSuccess(true);
    if (onSettingsSaved) onSettingsSaved();
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-[#30363d] bg-[#0d1117] shadow-2xl text-slate-100 overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#23282f] bg-[#161b22] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">
                  Transaction & Node Architecture
                </h2>
                <span className="text-[10px] font-mono uppercase bg-blue-950/80 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded">
                  {activeNetwork.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Private Flashbots Bundles • Dedicated Nodes (Alchemy/QuickNode) • Dynamic Slippage Floor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#21262d] hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#23282f] bg-[#0d1117] px-4 pt-2 gap-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('nodes')}
            className={`flex items-center gap-2 py-2.5 px-3 rounded-t-lg border-b-2 font-bold transition-all ${
              activeTab === 'nodes'
                ? 'border-blue-500 text-blue-400 bg-[#161b22]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#161b22]/50'
            }`}
          >
            <Server className="h-4 w-4" />
            <span>1. RPC Nodes & API Keys</span>
            {latencyResult && latencyResult.status === 'ONLINE' && (
              <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                {latencyResult.latencyMs}ms
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('flashbots')}
            className={`flex items-center gap-2 py-2.5 px-3 rounded-t-lg border-b-2 font-bold transition-all ${
              activeTab === 'flashbots'
                ? 'border-emerald-500 text-emerald-400 bg-[#161b22]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#161b22]/50'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>2. Flashbots Private Bundles</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/40 px-1.5 py-0.2 rounded">
              MEV-Share
            </span>
          </button>

          <button
            onClick={() => setActiveTab('slippage')}
            className={`flex items-center gap-2 py-2.5 px-3 rounded-t-lg border-b-2 font-bold transition-all ${
              activeTab === 'slippage'
                ? 'border-amber-500 text-amber-400 bg-[#161b22]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#161b22]/50'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>3. Dynamic Slippage & Quoter</span>
            <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800/40 px-1.5 py-0.2 rounded">
              Repayment Floor
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: DEDICATED RPC NODE SERVICES */}
          {activeTab === 'nodes' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-950/30 border border-blue-800/40 p-3 flex items-start gap-3 text-xs">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 leading-relaxed">
                  Switch from rate-limited public RPCs to dedicated, low-latency node infrastructure. Dedicated endpoints process blocks faster, prevent dropped websocket pings, and ensure rapid flash arbitrage broadcast.
                </p>
              </div>

              {/* Provider Selection Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'alchemy', label: 'Alchemy', badge: 'Ultra Fast', desc: 'Global dedicated JSON-RPC', color: 'border-blue-500' },
                  { id: 'quicknode', label: 'QuickNode', badge: 'Low Latency', desc: 'Dedicated hyper-node endpoint', color: 'border-cyan-500' },
                  { id: 'infura', label: 'Infura', badge: 'Reliable', desc: 'ConsenSys Enterprise RPC', color: 'border-orange-500' },
                  { id: 'flashbots_fast', label: 'Flashbots Protect', badge: 'MEV Shield', desc: 'rpc.flashbots.net/fast (Zero Frontrun)', color: 'border-emerald-500' },
                  { id: 'flashbots_mev_share', label: 'MEV-Share Relay', badge: 'Rebates', desc: 'mev-share.flashbots.net', color: 'border-teal-500' },
                  { id: 'custom', label: 'Custom RPC', badge: 'Private Node', desc: 'Direct Geth / Besu / Erigon URL', color: 'border-purple-500' },
                ].map((item) => {
                  const isSelected = nodeConfig.providerType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNodeConfig((prev) => ({ ...prev, providerType: item.id as RpcProviderType }))}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? `bg-[#161b22] ${item.color} ring-1 ring-blue-500/40 shadow-sm`
                          : 'bg-[#0d1117] border-[#23282f] hover:border-slate-600 hover:bg-[#161b22]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-100">{item.label}</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#23282f] text-slate-300">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* API Key / Endpoint Configuration Form */}
              <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Provider Credentials & Endpoint
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showApiKey ? 'Hide Key' : 'Reveal Key'}</span>
                  </button>
                </div>

                {nodeConfig.providerType === 'alchemy' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-300 flex items-center justify-between">
                      <span>Alchemy API Key (or App Key)</span>
                      <span className="text-[10px] text-slate-500">e.g. oKz-38dF...</span>
                    </label>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={nodeConfig.alchemyApiKey}
                      onChange={(e) => setNodeConfig((prev) => ({ ...prev, alchemyApiKey: e.target.value }))}
                      placeholder="Enter Alchemy API Key..."
                      className="w-full rounded bg-[#0d1117] border border-[#30363d] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500">
                      Auto-constructs: <code className="text-slate-400">https://{activeNetwork.id}-mainnet.g.alchemy.com/v2/{'{API_KEY}'}</code>
                    </p>
                  </div>
                )}

                {nodeConfig.providerType === 'quicknode' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-300">
                      QuickNode Endpoint URL
                    </label>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={nodeConfig.quicknodeEndpoint}
                      onChange={(e) => setNodeConfig((prev) => ({ ...prev, quicknodeEndpoint: e.target.value }))}
                      placeholder="https://example-name.quiknode.pro/your-token/"
                      className="w-full rounded bg-[#0d1117] border border-[#30363d] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {nodeConfig.providerType === 'infura' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-300">
                      Infura Project ID
                    </label>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={nodeConfig.infuraProjectId}
                      onChange={(e) => setNodeConfig((prev) => ({ ...prev, infuraProjectId: e.target.value }))}
                      placeholder="Enter Infura Project ID..."
                      className="w-full rounded bg-[#0d1117] border border-[#30363d] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {nodeConfig.providerType === 'custom' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-300">
                      Custom Dedicated RPC Endpoint (HTTPS / WSS)
                    </label>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={nodeConfig.customRpcUrl}
                      onChange={(e) => setNodeConfig((prev) => ({ ...prev, customRpcUrl: e.target.value }))}
                      placeholder="https://my-private-node.example.com:8545"
                      className="w-full rounded bg-[#0d1117] border border-[#30363d] px-3 py-2 text-xs font-mono text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}

                {(nodeConfig.providerType === 'flashbots_fast' || nodeConfig.providerType === 'flashbots_mev_share') && (
                  <div className="space-y-1 text-xs font-mono bg-[#0d1117] p-2.5 rounded border border-emerald-900/40">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Zero API Key Required
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Routes directly to Flashbots builder relays (<code className="text-slate-300">https://rpc.flashbots.net/fast</code>). Transactions are private and never broadcast to the public mempool.
                    </p>
                  </div>
                )}

                {/* Live Latency Tester Button & Status Banner */}
                <div className="pt-2 border-t border-[#23282f] flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleTestLatency}
                    disabled={isTestingLatency}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold font-mono transition-all"
                  >
                    <RefreshCw className={`h-3 w-3 ${isTestingLatency ? 'animate-spin' : ''}`} />
                    <span>{isTestingLatency ? 'Testing RPC Ping...' : '⚡ Test Node Latency'}</span>
                  </button>

                  {latencyResult && (
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-slate-400">Response:</span>
                      <span className={`font-bold px-2 py-0.5 rounded ${
                        latencyResult.status === 'ONLINE' 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' 
                          : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                      }`}>
                        {latencyResult.latencyMs}ms ({latencyResult.status})
                      </span>
                      {latencyResult.blockNumber > 0 && (
                        <span className="text-[10px] text-slate-500">
                          Block #{latencyResult.blockNumber}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FLASHBOTS PRIVATE BUNDLES */}
          {activeTab === 'flashbots' && (
            <div className="space-y-4 text-xs">
              <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/40 p-3 flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 leading-relaxed font-sans">
                  Flashbots Private Bundles package the flash loan transaction and submit it directly to certified Ethereum block builders (e.g., Builder0x69, Titan, Flashbots). Transactions remain 100% invisible to predatory sandwich searchers until included in a mined block.
                </p>
              </div>

              <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#23282f] pb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                      Private Bundle Transmission
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Bypasses public p2p mempool completely
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={flashbotsConfig.enablePrivateBundles}
                    onChange={(e) => setFlashbotsConfig((prev) => ({ ...prev, enablePrivateBundles: e.target.checked }))}
                    className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-b border-[#23282f] pb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                      Zero-Cost Revert Protection
                    </span>
                    <p className="text-[11px] text-slate-400">
                      If slippage or profit condition is not met, the bundle is dropped with 0 gas penalty
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={flashbotsConfig.revertProtection}
                    onChange={(e) => setFlashbotsConfig((prev) => ({ ...prev, revertProtection: e.target.checked }))}
                    className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-300 font-bold">MEV-Share Searcher Kickback / Refund</span>
                    <span className="text-emerald-400 font-bold">{flashbotsConfig.mevShareSearcherKickbackPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={flashbotsConfig.mevShareSearcherKickbackPct}
                    onChange={(e) => setFlashbotsConfig((prev) => ({ ...prev, mevShareSearcherKickbackPct: Number(e.target.value) }))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">
                    Directs MEV builders to return up to 90% of backrun/bundle arbitrage value back to your wallet address.
                  </p>
                </div>

                <div className="space-y-1.5 font-mono">
                  <label className="text-[11px] text-slate-300">
                    Flashbots Builder Relay Endpoint
                  </label>
                  <input
                    type="text"
                    value={flashbotsConfig.flashbotsBuilderEndpoint}
                    onChange={(e) => setFlashbotsConfig((prev) => ({ ...prev, flashbotsBuilderEndpoint: e.target.value }))}
                    className="w-full rounded bg-[#0d1117] border border-[#30363d] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DYNAMIC SLIPPAGE & ON-CHAIN QUOTER */}
          {activeTab === 'slippage' && (
            <div className="space-y-4 text-xs font-mono">
              <div className="rounded-lg bg-amber-950/30 border border-amber-800/40 p-3 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-slate-300 leading-relaxed font-sans">
                  The Dynamic Quoter verifies DEX reserves right before sending (pre-flight check). It dynamically adjusts slippage parameters to absorb minor normal market noise while enforcing the <strong>Flash Loan Repayment Floor</strong> invariant: <code className="text-amber-300">amountOutMin &gt;= borrowAmount + flashLoanFee</code>.
                </p>
              </div>

              <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-4">
                
                <div className="flex items-center justify-between border-b border-[#23282f] pb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-200 uppercase">
                      Dynamic Pre-Flight On-Chain Quoting
                    </span>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Calculates exact amountOutMin milliseconds prior to signing
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={slippageSettings.enableDynamicQuoting}
                    onChange={(e) => setSlippageSettings((prev) => ({ ...prev, enableDynamicQuoting: e.target.checked }))}
                    className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-b border-[#23282f] pb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-emerald-400 uppercase">
                        Flash Loan Repayment Floor Invariant
                      </span>
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1 py-0.2 rounded font-bold">
                        ENFORCED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Guarantees amountOutMin strictly satisfies principal + 0.05% protocol fee
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={slippageSettings.enforceRepaymentFloor}
                    disabled={true}
                    className="h-4 w-4 rounded accent-emerald-500 cursor-not-allowed opacity-80"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-bold">Base Slippage Tolerance</span>
                    <span className="text-amber-400 font-bold">{slippageSettings.baseSlippagePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={slippageSettings.baseSlippagePercent}
                    onChange={(e) => setSlippageSettings((prev) => ({ ...prev, baseSlippagePercent: Number(e.target.value) }))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0.05% (Strict)</span>
                    <span>0.50% (Standard)</span>
                    <span>1.00% (Permissive)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300 font-bold">Max Slippage Cap (Market Volatility Shield)</span>
                    <span className="text-blue-400 font-bold">{slippageSettings.maxAllowedSlippagePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.05"
                    value={slippageSettings.maxAllowedSlippagePercent}
                    onChange={(e) => setSlippageSettings((prev) => ({ ...prev, maxAllowedSlippagePercent: Number(e.target.value) }))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#23282f]">
                  <div>
                    <span className="text-xs font-bold text-slate-200">
                      Market Noise Adaptive Damping
                    </span>
                    <p className="text-[10px] text-slate-400 font-sans">
                      Scales tolerance slightly on deeper liquidity pools
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={slippageSettings.marketNoiseAbsorption}
                    onChange={(e) => setSlippageSettings((prev) => ({ ...prev, marketNoiseAbsorption: e.target.checked }))}
                    className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
                  />
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Footer with Save Action */}
        <div className="flex items-center justify-between border-t border-[#23282f] bg-[#161b22] px-5 py-3.5">
          <div className="flex items-center gap-2">
            {saveSuccess ? (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="h-4 w-4" />
                Settings Synchronized to Engine!
              </span>
            ) : (
              <span className="text-[11px] font-mono text-slate-400">
                Active Node: <strong className="text-slate-200">{nodeConfig.providerType.toUpperCase()}</strong> ({activeNetwork.name})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-[#30363d] hover:bg-[#21262d] text-xs font-bold text-slate-300 transition-all"
            >
              Close
            </button>
            <button
              onClick={handleSaveAll}
              id="save-transaction-settings-btn"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm shadow-blue-900/40"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Apply & Save Settings</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
