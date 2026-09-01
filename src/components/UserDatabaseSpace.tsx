import React, { useState } from 'react';
import { 
  Database, 
  User, 
  Mail, 
  Wallet, 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  Crown, 
  RefreshCw, 
  Save, 
  Sparkles, 
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  Key,
  Flame
} from 'lucide-react';
import { UserProfile, SavedWalletItem, PaymentRecord } from '../types';
import { saveUserProfileToDb, checkAccessStatus } from '../services/userService';

interface UserDatabaseSpaceProps {
  userProfile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onOpenPaywall: () => void;
  onOpenAuth: () => void;
  connectedWalletAddress?: string | null;
}

export const UserDatabaseSpace: React.FC<UserDatabaseSpaceProps> = ({
  userProfile,
  onUpdateProfile,
  onOpenPaywall,
  onOpenAuth,
  connectedWalletAddress,
}) => {
  // Local state for profile inputs
  const [name, setName] = useState(userProfile?.name || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [primaryWallet, setPrimaryWallet] = useState(userProfile?.walletAddress || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Wallet Form State
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [newWalletNetwork, setNewWalletNetwork] = useState('Ethereum Mainnet');
  const [isAddingWallet, setIsAddingWallet] = useState(false);

  // Copy indicator state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync state when profile prop changes
  React.useEffect(() => {
    if (userProfile) {
      setName(userProfile.name);
      setEmail(userProfile.email);
      setPrimaryWallet(userProfile.walletAddress);
    }
  }, [userProfile]);

  const access = checkAccessStatus(userProfile);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setIsSaving(true);
    const updated: UserProfile = {
      ...userProfile,
      name,
      email,
      walletAddress: primaryWallet,
      isSyncedWithDb: true,
    };

    const ok = await saveUserProfileToDb(updated);
    onUpdateProfile(updated);
    setIsSaving(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !newWalletAddress.trim()) return;

    const newWallet: SavedWalletItem = {
      id: `w_${Date.now()}`,
      address: newWalletAddress.trim(),
      label: newWalletLabel.trim() || 'Trading Wallet',
      network: newWalletNetwork,
      addedAt: Date.now(),
      isPrimary: (userProfile.savedWallets?.length || 0) === 0,
    };

    const updatedWallets = [...(userProfile.savedWallets || []), newWallet];
    const updated: UserProfile = {
      ...userProfile,
      savedWallets: updatedWallets,
    };

    await saveUserProfileToDb(updated);
    onUpdateProfile(updated);

    setNewWalletAddress('');
    setNewWalletLabel('');
    setIsAddingWallet(false);
  };

  const handleDeleteWallet = async (walletId: string) => {
    if (!userProfile) return;
    const updatedWallets = (userProfile.savedWallets || []).filter((w) => w.id !== walletId);
    const updated: UserProfile = {
      ...userProfile,
      savedWallets: updatedWallets,
    };
    await saveUserProfileToDb(updated);
    onUpdateProfile(updated);
  };

  const handleSetPrimaryWallet = async (wallet: SavedWalletItem) => {
    if (!userProfile) return;
    const updatedWallets = (userProfile.savedWallets || []).map((w) => ({
      ...w,
      isPrimary: w.id === wallet.id,
    }));
    const updated: UserProfile = {
      ...userProfile,
      walletAddress: wallet.address,
      savedWallets: updatedWallets,
    };
    setPrimaryWallet(wallet.address);
    await saveUserProfileToDb(updated);
    onUpdateProfile(updated);
  };

  // Fast Dev / Testing helper to simulate trial expiration or reset
  const handleSimulateTrialExpire = async () => {
    if (!userProfile) return;
    const updated: UserProfile = {
      ...userProfile,
      trialEndsAt: Date.now() - 1000,
      subscriptionPlan: 'expired',
      subscriptionStatus: 'expired',
      subscriptionExpiresAt: Date.now() - 1000,
    };
    await saveUserProfileToDb(updated);
    onUpdateProfile(updated);
  };

  const handleResetFreeTrial = async () => {
    if (!userProfile) return;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const updated: UserProfile = {
      ...userProfile,
      trialEndsAt: Date.now() + SEVEN_DAYS_MS,
      subscriptionPlan: 'free_trial',
      subscriptionStatus: 'trialing',
      subscriptionExpiresAt: Date.now() + SEVEN_DAYS_MS,
    };
    await saveUserProfileToDb(updated);
    onUpdateProfile(updated);
  };

  if (!userProfile) {
    return (
      <div className="rounded-xl border border-[#23282f] bg-[#0d1117] p-8 text-center max-w-2xl mx-auto my-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-4">
          <Database className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">User Database & Profile Space</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
          Sign in or register to save your trader name, email, and multi-chain wallet addresses to persistent Firestore cloud storage. Includes 1 week free trial!
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-950"
        >
          Sign In / Create Account (7 Days Free)
        </button>
      </div>
    );
  }

  // Calculate 7-day progress percentage
  const trialTotalMs = 7 * 24 * 60 * 60 * 1000;
  const trialRemainingMs = Math.max(0, userProfile.trialEndsAt - Date.now());
  const trialPercentUsed = Math.min(100, Math.max(0, 100 - (trialRemainingMs / trialTotalMs) * 100));

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="rounded-xl border border-[#23282f] bg-[#0d1117] p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-950">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  User Database & Wallet Storage
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Firestore Cloud Synced
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage user names, emails, and address book stored in the persistent database.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenPaywall}
              id="user-space-upgrade-btn"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition-all"
            >
              <Crown className="h-4 w-4 text-amber-300" />
              <span>{access.isPaid ? 'Manage Subscription' : 'Upgrade Plan ($100/mo)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: User Profile & Subscription Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: User Profile Editor (Saved to Firestore) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Details Card */}
          <div className="rounded-xl border border-[#23282f] bg-[#0d1117] p-5">
            <div className="flex items-center justify-between border-b border-[#23282f] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Trader Profile Information (Cloud Database)
                </h2>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">UID: {userProfile.id.substring(0, 12)}...</span>
            </div>

            {saveSuccess && (
              <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs">
                <Check className="h-4 w-4 shrink-0" />
                <span>User name, email, and wallet address successfully saved to Firestore Database!</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* User Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    User Name / Handle
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Satoshi Trader"
                      className="w-full bg-[#161b22] border border-[#23282f] focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors font-medium"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@domain.eth"
                      className="w-full bg-[#161b22] border border-[#23282f] focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors font-medium"
                    />
                  </div>
                </div>

              </div>

              {/* Primary Wallet Address */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Primary EVM Wallet Address (Default Arbitrage Receiver)
                  </label>
                  {connectedWalletAddress && connectedWalletAddress !== primaryWallet && (
                    <button
                      type="button"
                      onClick={() => setPrimaryWallet(connectedWalletAddress)}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-mono underline"
                    >
                      Fill with Connected Wallet ({connectedWalletAddress.substring(0, 6)}...)
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Wallet className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={primaryWallet}
                    onChange={(e) => setPrimaryWallet(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-[#161b22] border border-[#23282f] focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Encrypted & stored in `users/{userProfile.id}` collection</span>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm shadow-blue-950 transition-all"
                >
                  {isSaving ? (
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>Save Changes to Database</span>
                </button>
              </div>
            </form>
          </div>

          {/* Multi-Wallet Address Book Stored in Database */}
          <div className="rounded-xl border border-[#23282f] bg-[#0d1117] p-5">
            <div className="flex items-center justify-between border-b border-[#23282f] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-400" />
                <div>
                  <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Saved Wallet Addresses Database ({userProfile.savedWallets?.length || 0})
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Store and label multiple multi-sig, bot treasury, and cold storage wallets.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingWallet(!isAddingWallet)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161b22] hover:bg-[#21262d] border border-[#23282f] text-slate-200 text-xs font-semibold transition-all"
              >
                <Plus className="h-3.5 w-3.5 text-emerald-400" />
                <span>Add Wallet</span>
              </button>
            </div>

            {/* Add New Wallet Form */}
            {isAddingWallet && (
              <form onSubmit={handleAddWallet} className="mb-5 p-4 rounded-xl bg-[#161b22] border border-[#23282f] space-y-3">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Register New Wallet to Database</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-400 mb-1">Wallet Address (EVM 0x...)</label>
                    <input
                      type="text"
                      required
                      value={newWalletAddress}
                      onChange={(e) => setNewWalletAddress(e.target.value)}
                      placeholder="0x71C28994361f36b12a8A4476a8d672De4259b84A"
                      className="w-full bg-[#0d1117] border border-[#23282f] focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Network</label>
                    <select
                      value={newWalletNetwork}
                      onChange={(e) => setNewWalletNetwork(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#23282f] focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none"
                    >
                      <option value="Ethereum Mainnet">Ethereum Mainnet</option>
                      <option value="Arbitrum One">Arbitrum One</option>
                      <option value="Polygon">Polygon POS</option>
                      <option value="Optimism">Optimism</option>
                      <option value="Base">Base</option>
                      <option value="BNB Smart Chain">BNB Smart Chain</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Wallet Label / Purpose</label>
                  <input
                    type="text"
                    value={newWalletLabel}
                    onChange={(e) => setNewWalletLabel(e.target.value)}
                    placeholder="e.g. Flash Loan Treasury Multi-sig"
                    className="w-full bg-[#0d1117] border border-[#23282f] focus:border-emerald-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingWallet(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#0d1117] text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm shadow-emerald-950"
                  >
                    Save Wallet to Firestore
                  </button>
                </div>
              </form>
            )}

            {/* List of Saved Wallets */}
            <div className="space-y-2.5">
              {(userProfile.savedWallets || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-[#161b22] rounded-lg">
                  No additional wallets saved in database yet.
                </div>
              ) : (
                (userProfile.savedWallets || []).map((wallet) => {
                  const isPrimary = wallet.address.toLowerCase() === (userProfile.walletAddress || '').toLowerCase();
                  return (
                    <div
                      key={wallet.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#161b22] border border-[#23282f] hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#0d1117] border border-[#23282f] text-slate-300">
                          <Wallet className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-200">{wallet.label}</span>
                            <span className="text-[10px] text-blue-400 bg-blue-950/80 px-1.5 py-0.2 rounded border border-blue-800/30">
                              {wallet.network}
                            </span>
                            {isPrimary && (
                              <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.2 rounded font-bold border border-emerald-500/30">
                                Primary Default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-slate-400">{wallet.address}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(wallet.address, wallet.id)}
                              className="text-slate-500 hover:text-slate-300"
                              title="Copy Address"
                            >
                              {copiedId === wallet.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            </button>
                            <a
                              href={`https://etherscan.io/address/${wallet.address}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-slate-300"
                              title="View on Etherscan"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryWallet(wallet)}
                            className="text-xs text-slate-400 hover:text-blue-400 px-2 py-1 rounded bg-[#0d1117] border border-[#23282f] transition-colors"
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteWallet(wallet.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                          title="Delete from database"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Direct RPC Node & API Key Management Card in User Database Space */}
          <div className="rounded-xl border border-blue-500/30 bg-[#0d1117] p-5 shadow-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#23282f] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                    <span>API Keys & Node Infrastructure Settings</span>
                    <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded font-mono uppercase">
                      Alchemy / QuickNode / Infura
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter your own dedicated Web3 RPC API keys, private endpoints, and Flashbots protect relays.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const btn = document.getElementById('navbar-node-settings-btn');
                  if (btn) btn.click();
                }}
                id="user-space-open-node-settings-btn"
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-950 transition-all cursor-pointer"
              >
                <Key className="h-3.5 w-3.5" />
                <span>Configure API Keys & Nodes</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-[#161b22] border border-[#23282f]">
                <div className="text-xs font-bold text-slate-200 mb-1">Alchemy API Key</div>
                <div className="text-[11px] text-slate-400">High-speed global JSON-RPC with instant mempool websockets.</div>
              </div>
              <div className="p-3 rounded-lg bg-[#161b22] border border-[#23282f]">
                <div className="text-xs font-bold text-slate-200 mb-1">QuickNode Endpoint</div>
                <div className="text-[11px] text-slate-400">Dedicated hyper-node custom endpoint with sub-50ms latency.</div>
              </div>
              <div className="p-3 rounded-lg bg-[#161b22] border border-[#23282f]">
                <div className="text-xs font-bold text-slate-200 mb-1">Infura Project ID</div>
                <div className="text-[11px] text-slate-400">Enterprise Ethereum & Layer 2 multi-chain connectivity.</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: 7-Day Free Trial Tracker & Paywall Plans ($100/mo vs $1,000/yr) */}
        <div className="space-y-6">
          
          {/* Subscription Status Card */}
          <div className="rounded-xl border border-[#23282f] bg-[#0d1117] p-5 shadow-lg relative overflow-hidden">
            {/* Background Glow */}
            <div className={`absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl pointer-events-none ${
              access.isPaid ? 'bg-emerald-600/20' : access.isTrial ? 'bg-blue-600/20' : 'bg-rose-600/20'
            }`} />

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Membership & Paywall
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                access.isPaid 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : access.isTrial
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {access.statusLabel}
              </span>
            </div>

            {/* Trial Tracker Details */}
            <div className="space-y-3 mb-5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-300">Free 1-Week Trial Time:</span>
                <span className="text-sm font-mono font-bold text-amber-300">
                  {access.formattedCountdown}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#161b22] h-2 rounded-full overflow-hidden border border-[#23282f]">
                <div 
                  className={`h-full transition-all duration-500 ${
                    access.isPaid 
                      ? 'bg-emerald-500' 
                      : access.isTrial 
                        ? 'bg-gradient-to-r from-blue-500 to-emerald-400' 
                        : 'bg-rose-500'
                  }`}
                  style={{ width: access.isPaid ? '100%' : `${trialPercentUsed}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Created: {new Date(userProfile.createdAt).toLocaleDateString()}</span>
                <span>Trial Ends: {new Date(userProfile.trialEndsAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Paywall Pricing Callout */}
            <div className="p-3.5 rounded-xl bg-[#161b22] border border-[#23282f] space-y-2 mb-4">
              <div className="text-xs font-bold text-slate-200">
                Paywall Pricing Options:
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Monthly Pass:</span>
                <span className="font-bold text-blue-400 font-mono">$100 / month</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Flame className="h-3 w-3 text-amber-400" />
                  Annual Pass (Best):
                </span>
                <span className="font-bold text-emerald-400 font-mono">$1,000 / year</span>
              </div>
              <div className="text-[10px] text-emerald-300/80 font-medium">
                ✨ Annual tier includes 2 months free ($200 savings)
              </div>
            </div>

            <button
              onClick={onOpenPaywall}
              id="paywall-activate-btn"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition-all"
            >
              <Crown className="h-4 w-4 text-amber-300" />
              <span>{access.isPaid ? 'Extend Subscription ($100/mo or $1000/yr)' : 'Upgrade to Pro ($100/mo)'}</span>
            </button>

            {/* Testing / Demo Helper for Fast Review */}
            <div className="mt-5 pt-4 border-t border-[#23282f]">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono mb-2">
                🧪 Paywall Testing Tools
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleSimulateTrialExpire}
                  className="px-2 py-1.5 rounded bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/40 text-rose-300 text-[10px] font-semibold transition-colors text-center"
                  title="Simulate trial expiration to test paywall lock"
                >
                  Simulate Expired Trial
                </button>
                <button
                  type="button"
                  onClick={handleResetFreeTrial}
                  className="px-2 py-1.5 rounded bg-blue-950/40 hover:bg-blue-950/80 border border-blue-800/40 text-blue-300 text-[10px] font-semibold transition-colors text-center"
                  title="Reset to 7 days free trial"
                >
                  Reset 7-Day Trial
                </button>
              </div>
            </div>

          </div>

          {/* Database Schema & Cloud Info */}
          <div className="rounded-xl border border-[#23282f] bg-[#0d1117] p-4 text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <Database className="h-4 w-4 text-blue-400" />
              <span>Cloud Storage Collections</span>
            </div>
            <div className="space-y-1.5 font-mono text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>users/{userProfile.id}:</span>
                <span className="text-emerald-400">Profile & Wallets</span>
              </div>
              <div className="flex justify-between">
                <span>payments:</span>
                <span className="text-blue-400">Receipts & Subscriptions</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
