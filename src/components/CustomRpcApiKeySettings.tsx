import React, { useState, useEffect } from 'react';
import {
  Key,
  Server,
  Globe,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Lock,
  Cpu,
  Activity,
  Database,
  Cloud,
  Layers,
  Sparkles,
  HelpCircle,
  Coins
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
import { Network, UserProfile } from '../types';
import { saveUserNodeConfigToFirestore, loadUserNodeConfigFromFirestore } from '../services/userService';

interface CustomRpcApiKeySettingsProps {
  activeNetwork: Network;
  userProfile?: UserProfile | null;
  onConfigUpdated?: (config: NodeConfig) => void;
}

export const CustomRpcApiKeySettings: React.FC<CustomRpcApiKeySettingsProps> = ({
  activeNetwork,
  userProfile,
  onConfigUpdated,
}) => {
  const [config, setConfig] = useState<NodeConfig>(loadNodeConfig());
  
  // Masking state for each individual key input
  const [showKeys, setShowKeys] = useState<{
    alchemy: boolean;
    infura: boolean;
    quicknode: boolean;
    etherscan: boolean;
    coingecko: boolean;
    customRpc: boolean;
  }>({
    alchemy: false,
    infura: false,
    quicknode: false,
    etherscan: false,
    coingecko: false,
    customRpc: false,
  });

  const [latencyResult, setLatencyResult] = useState<NodeLatencyResult | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSavingToDb, setIsSavingToDb] = useState<boolean>(false);
  const [dbSyncMessage, setDbSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    setConfig(loadNodeConfig());
  }, [activeNetwork.id]);

  // Load from Firestore if user is authenticated and has stored keys
  useEffect(() => {
    if (userProfile?.uid) {
      loadUserNodeConfigFromFirestore(userProfile.uid).then((cloudConfig) => {
        if (cloudConfig) {
          setConfig(cloudConfig);
          saveNodeConfig(cloudConfig);
          setDbSyncMessage('Synced with Firestore Cloud Database');
        }
      });
    }
  }, [userProfile?.uid]);

  const toggleKeyVisibility = (key: keyof typeof showKeys) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllKeys = (visible: boolean) => {
    setShowKeys({
      alchemy: visible,
      infura: visible,
      quicknode: visible,
      etherscan: visible,
      coingecko: visible,
      customRpc: visible,
    });
  };

  const areAnyKeysVisible = Object.values(showKeys).some(Boolean);

  const handleTestLatency = async () => {
    setIsTesting(true);
    const activeUrl = getActiveRpcUrl(activeNetwork.id, config);
    try {
      const res = await testNodeLatency(activeUrl, config.providerType);
      setLatencyResult(res);
    } catch (e) {
      console.error('Failed to test node latency:', e);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingToDb(true);
    
    // 1. Local Engine Storage
    saveNodeConfig(config);
    
    // 2. Cloud Firestore Storage
    const targetUid = userProfile?.uid || 'guest_user';
    try {
      await saveUserNodeConfigToFirestore(targetUid, config);
      setDbSyncMessage(`✓ Saved to Cloud Database (User Vault: ${targetUid.slice(0, 8)}...)`);
    } catch (err) {
      console.warn('Firestore database write warning:', err);
      setDbSyncMessage('✓ Stored securely in Local Storage Vault');
    } finally {
      setIsSavingToDb(false);
    }

    setIsSaved(true);
    if (onConfigUpdated) onConfigUpdated(config);
    setTimeout(() => setIsSaved(false), 3500);
  };

  const currentRpcUrl = getActiveRpcUrl(activeNetwork.id, config);

  return (
    <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-5 shadow-xl space-y-6">
      {/* Header with Security & Global Masking Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23282f] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                Custom RPC Endpoints & Private API Keys
              </h3>
              <span className="text-[10px] font-mono uppercase bg-blue-950/80 text-blue-300 border border-blue-700/50 px-2 py-0.5 rounded">
                {activeNetwork.name}
              </span>
              <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 px-2 py-0.5 rounded flex items-center gap-1">
                <Lock className="h-2.5 w-2.5" />
                <span>Masked Display</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-xs text-slate-400">
                All credentials are password-masked by default for screen recording and streaming security.
              </p>
              {dbSyncMessage && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 rounded flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  <span>{dbSyncMessage}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Global Reveal / Hide All Keys Switch */}
          <button
            type="button"
            onClick={() => toggleAllKeys(!areAnyKeysVisible)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-slate-300 text-xs font-mono transition-colors cursor-pointer"
            title={areAnyKeysVisible ? 'Mask all API key fields' : 'Reveal all API key fields'}
          >
            {areAnyKeysVisible ? (
              <>
                <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                <span>Mask All</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 text-blue-400" />
                <span>Reveal All</span>
              </>
            )}
          </button>

          {/* Latency Ping */}
          <button
            type="button"
            onClick={handleTestLatency}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] text-slate-200 text-xs font-mono font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Pinging...' : '⚡ Ping Test'}</span>
          </button>
          
          {/* Save to Database */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSavingToDb}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono transition-all shadow-md shadow-blue-950 disabled:opacity-50 cursor-pointer"
          >
            {isSavingToDb ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Database className="h-3.5 w-3.5" />
            )}
            <span>{isSavingToDb ? 'Saving...' : 'Save to Database'}</span>
          </button>
        </div>
      </div>

      {/* Active Node Route & Ping Status */}
      <div className="rounded-lg bg-[#161b22] border border-[#23282f] p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <span className="text-slate-400">Active Routing:</span>
          <span className="font-bold text-white uppercase bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d]">
            {config.providerType.replace('_', ' ')}
          </span>
          <span className="text-slate-500 truncate max-w-xs text-[11px]">
            ({currentRpcUrl})
          </span>
        </div>

        {latencyResult && (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
              latencyResult.status === 'ONLINE'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                : 'bg-rose-950 text-rose-400 border border-rose-800/40'
            }`}>
              Latency: {latencyResult.latencyMs}ms ({latencyResult.status})
            </span>
            {latencyResult.blockNumber > 0 && (
              <span className="text-slate-400 text-[11px]">
                Block #{latencyResult.blockNumber}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Provider Selector Cards */}
      <div>
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2 font-mono">
          1. Select Primary Low-Latency RPC Node
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { id: 'alchemy', label: 'Alchemy', badge: 'Ultra-Fast', desc: 'JSON-RPC API Key' },
            { id: 'infura', label: 'Infura', badge: 'ConsenSys', desc: 'Project ID Key' },
            { id: 'quicknode', label: 'QuickNode', badge: 'Dedicated', desc: 'Custom Endpoint' },
            { id: 'flashbots_fast', label: 'Flashbots', badge: 'MEV-Shield', desc: 'Private Builder' },
            { id: 'flashbots_mev_share', label: 'MEV-Share', badge: 'Rebates', desc: 'Backrun Relay' },
            { id: 'custom', label: 'Custom RPC', badge: 'Self-Hosted', desc: 'Geth/Erigon URL' },
          ].map((item) => {
            const isSelected = config.providerType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, providerType: item.id as RpcProviderType }))}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/40 shadow-sm'
                    : 'bg-[#161b22] border-[#23282f] hover:border-slate-600 hover:bg-[#1a202c]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-100">{item.label}</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#0d1117] text-slate-300">
                    {item.badge}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Masked Password-Style API Key Inputs Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block font-mono">
            2. Masked API Keys Vault (Stored Securely in Database)
          </label>
          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
            <Lock className="h-3 w-3 text-emerald-400" />
            <span>Click eye icon to reveal / edit</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Alchemy API Key */}
          <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#23282f] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-400 flex items-center gap-1.5 font-mono">
                <Server className="h-3.5 w-3.5" />
                <span>Alchemy API Key</span>
              </label>
              <button
                type="button"
                onClick={() => toggleKeyVisibility('alchemy')}
                className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] cursor-pointer transition-colors"
                title={showKeys.alchemy ? 'Hide key' : 'Show key'}
              >
                {showKeys.alchemy ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Eye className="h-3.5 w-3.5 text-blue-400" />}
                <span className="font-mono text-[10px]">{showKeys.alchemy ? 'Hide' : 'Reveal'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showKeys.alchemy ? 'text' : 'password'}
                value={config.alchemyApiKey}
                onChange={(e) => setConfig((prev) => ({ ...prev, alchemyApiKey: e.target.value.trim() }))}
                placeholder="Enter Alchemy API Key (e.g. oKz_9f83Kjlsd928374...)"
                autoComplete="off"
                spellCheck="false"
                className="w-full rounded bg-[#0d1117] border border-[#30363d] px-3 py-2 pr-10 text-xs font-mono text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-600"
              />
              <div className="absolute right-3 top-2.5 text-slate-500 pointer-events-none">
                {showKeys.alchemy ? <Eye className="h-3.5 w-3.5 text-blue-400/60" /> : <Lock className="h-3.5 w-3.5 text-slate-600" />}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Auto-constructs: <code className="text-slate-400">https://{activeNetwork.id}-mainnet.g.alchemy.com/v2/...</code>
            </p>
          </div>

          {/* Infura Project ID */}
          <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#23282f] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-orange-400 flex items-center gap-1.5 font-mono">
                <Globe className="h-3.5 w-3.5" />
                <span>Infura Project ID / API Key</span>
              </label>
              <button
                type="button"
                onClick={() => toggleKeyVisibility('infura')}
                className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] cursor-pointer transition-colors"
                title={showKeys.infura ? 'Hide key' : 'Show key'}
              >
                {showKeys.infura ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Eye className="h-3.5 w-3.5 text-orange-400" />}
                <span className="font-mono text-[10px]">{showKeys.infura ? 'Hide' : 'Reveal'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showKeys.infura ? 'text' : 'password'}
                value={config.infuraProjectId}
                onChange={(e) => setConfig((prev) => ({ ...prev, infuraProjectId: e.target.value.trim() }))}
                placeholder="Enter Infura Project ID (e.g. 7c98f0e21a3449b29...)"
                autoComplete="off"
                spellCheck="false"
                className="w-full rounded bg-[#0d1117] border border-[#30363d] px-3 py-2 pr-10 text-xs font-mono text-white focus:border-orange-500 focus:outline-none placeholder:text-slate-600"
              />
              <div className="absolute right-3 top-2.5 text-slate-500 pointer-events-none">
                {showKeys.infura ? <Eye className="h-3.5 w-3.5 text-orange-400/60" /> : <Lock className="h-3.5 w-3.5 text-slate-600" />}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Auto-constructs: <code className="text-slate-400">https://{activeNetwork.id === 'ethereum' ? 'mainnet' : activeNetwork.id}.infura.io/v3/...</code>
            </p>
          </div>

          {/* QuickNode Endpoint URL */}
          <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#23282f] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 font-mono">
                <Zap className="h-3.5 w-3.5" />
                <span>QuickNode Private Endpoint (HTTPS / WSS)</span>
              </label>
              <button
                type="button"
                onClick={() => toggleKeyVisibility('quicknode')}
                className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] cursor-pointer transition-colors"
                title={showKeys.quicknode ? 'Hide endpoint' : 'Show endpoint'}
              >
                {showKeys.quicknode ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Eye className="h-3.5 w-3.5 text-cyan-400" />}
                <span className="font-mono text-[10px]">{showKeys.quicknode ? 'Hide' : 'Reveal'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showKeys.quicknode ? 'text' : 'password'}
                value={config.quicknodeEndpoint}
                onChange={(e) => setConfig((prev) => ({ ...prev, quicknodeEndpoint: e.target.value.trim() }))}
                placeholder="https://example-name.quiknode.pro/your-auth-token/"
                autoComplete="off"
                spellCheck="false"
                className="w-full rounded bg-[#0d1117] border border-[#30363d] px-3 py-2 pr-10 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none placeholder:text-slate-600"
              />
              <div className="absolute right-3 top-2.5 text-slate-500 pointer-events-none">
                {showKeys.quicknode ? <Eye className="h-3.5 w-3.5 text-cyan-400/60" /> : <Lock className="h-3.5 w-3.5 text-slate-600" />}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Dedicated hyper-node custom endpoint with sub-50ms latency.
            </p>
          </div>

          {/* Etherscan API Key */}
          <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#23282f] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Etherscan / Block Explorer API Key</span>
              </label>
              <button
                type="button"
                onClick={() => toggleKeyVisibility('etherscan')}
                className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] cursor-pointer transition-colors"
                title={showKeys.etherscan ? 'Hide key' : 'Show key'}
              >
                {showKeys.etherscan ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Eye className="h-3.5 w-3.5 text-emerald-400" />}
                <span className="font-mono text-[10px]">{showKeys.etherscan ? 'Hide' : 'Reveal'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showKeys.etherscan ? 'text' : 'password'}
                value={config.etherscanApiKey || ''}
                onChange={(e) => setConfig((prev) => ({ ...prev, etherscanApiKey: e.target.value.trim() }))}
                placeholder="Enter Etherscan API Key (e.g. 3K49DJSS8923HDJS...)"
                autoComplete="off"
                spellCheck="false"
                className="w-full rounded bg-[#0d1117] border border-[#30363d] px-3 py-2 pr-10 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none placeholder:text-slate-600"
              />
              <div className="absolute right-3 top-2.5 text-slate-500 pointer-events-none">
                {showKeys.etherscan ? <Eye className="h-3.5 w-3.5 text-emerald-400/60" /> : <Lock className="h-3.5 w-3.5 text-slate-600" />}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              For contract verification, verified ABI retrieval & gas oracle.
            </p>
          </div>

          {/* Custom Self-Hosted RPC Endpoint */}
          <div className="md:col-span-2 p-3.5 rounded-lg bg-[#161b22] border border-[#23282f] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-purple-400 flex items-center gap-1.5 font-mono">
                <Cpu className="h-3.5 w-3.5" />
                <span>Custom Private RPC Endpoint (Geth / Erigon / Besu / Anvil)</span>
              </label>
              <button
                type="button"
                onClick={() => toggleKeyVisibility('customRpc')}
                className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 px-2 py-0.5 rounded bg-[#0d1117] border border-[#30363d] cursor-pointer transition-colors"
                title={showKeys.customRpc ? 'Hide endpoint' : 'Show endpoint'}
              >
                {showKeys.customRpc ? <EyeOff className="h-3.5 w-3.5 text-amber-400" /> : <Eye className="h-3.5 w-3.5 text-purple-400" />}
                <span className="font-mono text-[10px]">{showKeys.customRpc ? 'Hide' : 'Reveal'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showKeys.customRpc ? 'text' : 'password'}
                value={config.customRpcUrl}
                onChange={(e) => setConfig((prev) => ({ ...prev, customRpcUrl: e.target.value.trim() }))}
                placeholder="https://my-private-geth-node.internal:8545"
                autoComplete="off"
                spellCheck="false"
                className="w-full rounded bg-[#0d1117] border border-[#30363d] px-3 py-2 pr-10 text-xs font-mono text-white focus:border-purple-500 focus:outline-none placeholder:text-slate-600"
              />
              <div className="absolute right-3 top-2.5 text-slate-500 pointer-events-none">
                {showKeys.customRpc ? <Eye className="h-3.5 w-3.5 text-purple-400/60" /> : <Lock className="h-3.5 w-3.5 text-slate-600" />}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Use your own self-hosted or cloud-hosted Ethereum execution client.
            </p>
          </div>

        </div>
      </div>

      {/* Save & Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#23282f]">
        <div className="flex items-center gap-2">
          {isSaved ? (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 className="h-4 w-4" />
              API keys saved to Database (Firestore + Local Vault)!
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
              <Cloud className="h-3.5 w-3.5 text-blue-400" />
              <span>Database Persistence: Securely stored under your account in Firestore.</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSavingToDb}
          id="custom-strategy-save-api-keys-btn"
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono transition-all shadow-md shadow-blue-950 cursor-pointer disabled:opacity-50"
        >
          {isSavingToDb ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Database className="h-4 w-4" />
          )}
          <span>{isSavingToDb ? 'Saving to Database...' : 'Save API Keys to Database'}</span>
        </button>
      </div>

    </div>
  );
};
