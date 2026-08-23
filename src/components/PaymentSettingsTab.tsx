import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  CreditCard,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  Info,
  Layers,
  ArrowUp,
  ArrowDown,
  Globe,
  Building,
  Copy,
  Sliders,
  Calculator
} from 'lucide-react';
import { PaymentMethodItem, PaymentSettingsConfig, PaymentMethodType } from '../types';
import { StorageService, DEFAULT_PAYMENT_SETTINGS } from '../utils/storage';

interface PaymentSettingsTabProps {
  onNotify?: (type: 'success' | 'info' | 'error', message: string) => void;
  onExchangeRateUpdated?: (newRate: number) => void;
}

export const PaymentSettingsTab: React.FC<PaymentSettingsTabProps> = ({
  onNotify,
  onExchangeRateUpdated
}) => {
  const [config, setConfig] = useState<PaymentSettingsConfig>(() => StorageService.getPaymentSettings());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal / Inline editor for adding or editing a method
  const [editingMethod, setEditingMethod] = useState<PaymentMethodItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form fields for editing/adding
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<PaymentMethodType>('moncash');
  const [formNumber, setFormNumber] = useState('');
  const [formHolder, setFormHolder] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formCurrencies, setFormCurrencies] = useState<('HTG' | 'USD')[]>(['HTG']);
  const [formBadge, setFormBadge] = useState('');
  const [formActive, setFormActive] = useState(true);

  // Listen to external updates if any
  useEffect(() => {
    const handleSettingsChanged = (e: Event) => {
      const customEvent = e as CustomEvent<PaymentSettingsConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      }
    };
    window.addEventListener('upmizik_payment_settings_changed', handleSettingsChanged);
    return () => window.removeEventListener('upmizik_payment_settings_changed', handleSettingsChanged);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    onNotify?.('info', `📋 Nimewo ${text} kopye nan clipboard!`);
  };

  const handleGeneralRateChange = (newRate: number) => {
    if (newRate <= 0 || isNaN(newRate)) return;
    const calcHtgFee = Number((config.artistRegistrationFeeUsd * newRate).toFixed(2));
    setConfig(prev => ({
      ...prev,
      htgExchangeRate: newRate,
      artistRegistrationFeeHtg: calcHtgFee
    }));
    setHasUnsavedChanges(true);
    setIsSaved(false);
  };

  const handleArtistFeeUsdChange = (newFeeUsd: number) => {
    if (newFeeUsd <= 0 || isNaN(newFeeUsd)) return;
    const calcHtg = Number((newFeeUsd * config.htgExchangeRate).toFixed(2));
    setConfig(prev => ({
      ...prev,
      artistRegistrationFeeUsd: newFeeUsd,
      artistRegistrationFeeHtg: calcHtg
    }));
    setHasUnsavedChanges(true);
    setIsSaved(false);
  };

  const handleArtistFeeHtgChange = (newFeeHtg: number) => {
    if (newFeeHtg <= 0 || isNaN(newFeeHtg)) return;
    setConfig(prev => ({
      ...prev,
      artistRegistrationFeeHtg: newFeeHtg
    }));
    setHasUnsavedChanges(true);
    setIsSaved(false);
  };

  const handleToggleMethodActive = (methodId: string) => {
    const updatedMethods = config.methods.map(m =>
      m.id === methodId ? { ...m, isActive: !m.isActive } : m
    );
    const updatedConfig: PaymentSettingsConfig = {
      ...config,
      methods: updatedMethods
    };
    setConfig(updatedConfig);
    // Instant save & broadcast so any open payment popup or new order immediately reacts
    StorageService.savePaymentSettings(updatedConfig);
    const toggled = updatedMethods.find(m => m.id === methodId);
    if (toggled?.isActive) {
      onNotify?.('success', `🟢 Mwayen peman "${toggled.name}" aktive kounye a sou tout komand ak transfè.`);
    } else {
      onNotify?.('info', `🔴 Mwayen peman "${toggled?.name || 'sa a'}" dezaktive sou sit la.`);
    }
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= config.methods.length) return;

    const newMethods = [...config.methods];
    const temp = newMethods[index];
    newMethods[index] = newMethods[targetIndex];
    newMethods[targetIndex] = temp;

    // re-assign order numbers
    newMethods.forEach((m, idx) => {
      m.order = idx + 1;
    });

    const updatedConfig = { ...config, methods: newMethods };
    setConfig(updatedConfig);
    StorageService.savePaymentSettings(updatedConfig);
    onNotify?.('info', `↕️ Lòd mwayen peman yo mete ajou.`);
  };

  const handleDeleteMethod = (methodId: string) => {
    const methodToDelete = config.methods.find(m => m.id === methodId);
    if (!methodToDelete) return;

    if (config.methods.length <= 1) {
      alert('Ou dwe kite omwen yon mwayen peman.');
      return;
    }

    if (window.confirm(`Èske ou sèten ou vle efase mwayen peman "${methodToDelete.name}" la?`)) {
      const updatedMethods = config.methods.filter(m => m.id !== methodId);
      const updatedConfig = {
        ...config,
        methods: updatedMethods
      };
      setConfig(updatedConfig);
      StorageService.savePaymentSettings(updatedConfig);
      onNotify?.('info', `🗑️ Mwayen peman "${methodToDelete.name}" efase.`);
    }
  };

  const openAddModal = () => {
    setEditingMethod(null);
    setFormName('');
    setFormType('moncash');
    setFormNumber('');
    setFormHolder('Clauvens EXAUS');
    setFormInstructions('');
    setFormCurrencies(['HTG']);
    setFormBadge('');
    setFormActive(true);
    setIsAddingNew(true);
  };

  const openEditModal = (method: PaymentMethodItem) => {
    setEditingMethod(method);
    setFormName(method.name);
    setFormType(method.type);
    setFormNumber(method.accountNumberOrId || method.accountNumber || '');
    setFormHolder(method.accountHolderName || method.accountName || '');
    setFormInstructions(method.instructions || '');
    setFormCurrencies(method.currencySupported || ['HTG']);
    setFormBadge(method.badgeText || method.badge || '');
    setFormActive(method.isActive);
    setIsAddingNew(false);
  };

  const handleSaveMethodForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formNumber.trim() || !formHolder.trim()) {
      alert('Tanpri ranpli Non Mwayen an, Nimewo/Kont lan ak Non sou kont lan.');
      return;
    }

    let updatedMethods: PaymentMethodItem[];
    if (editingMethod) {
      // Update existing
      updatedMethods = config.methods.map(m =>
        m.id === editingMethod.id
          ? {
              ...m,
              name: formName.trim(),
              type: formType,
              accountNumberOrId: formNumber.trim(),
              accountHolderName: formHolder.trim(),
              accountNumber: formNumber.trim(),
              accountName: formHolder.trim(),
              instructions: formInstructions.trim() || undefined,
              currencySupported: formCurrencies.length > 0 ? formCurrencies : ['HTG'],
              badgeText: formBadge.trim() || undefined,
              badge: formBadge.trim() || undefined,
              isActive: formActive
            }
          : m
      );
      onNotify?.('success', `Mwayen peman "${formName}" modifye e sovgade avèk siksè.`);
    } else {
      // Add new
      const newMethod: PaymentMethodItem = {
        id: `payment_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: formName.trim(),
        type: formType,
        accountNumberOrId: formNumber.trim(),
        accountHolderName: formHolder.trim(),
        accountNumber: formNumber.trim(),
        accountName: formHolder.trim(),
        instructions: formInstructions.trim() || undefined,
        currencySupported: formCurrencies.length > 0 ? formCurrencies : ['HTG'],
        badgeText: formBadge.trim() || undefined,
        badge: formBadge.trim() || undefined,
        isActive: formActive,
        order: config.methods.length + 1
      };
      updatedMethods = [...config.methods, newMethod];
      onNotify?.('success', `Nouvo mwayen peman "${formName}" ajoute e aktive avèk siksè.`);
    }

    const updatedConfig = {
      ...config,
      methods: updatedMethods
    };
    setConfig(updatedConfig);
    StorageService.savePaymentSettings(updatedConfig);

    setEditingMethod(null);
    setIsAddingNew(false);
  };

  const handleSaveAll = () => {
    StorageService.savePaymentSettings(config);
    setHasUnsavedChanges(false);
    setIsSaved(true);
    onExchangeRateUpdated?.(config.htgExchangeRate);
    onNotify?.('success', '✅ Tout chanjman sou mwayen peman ak nimewo yo sovgade avèk siksè!');
    setTimeout(() => setIsSaved(false), 3500);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Èske ou sèten ou vle remèt tout nimewo ak mwayen peman yo sou paramèt orijinal pa defo yo?')) {
      const reset = StorageService.resetPaymentSettingsToDefault();
      setConfig(reset);
      setHasUnsavedChanges(false);
      setIsSaved(true);
      onExchangeRateUpdated?.(reset.htgExchangeRate);
      onNotify?.('info', '🔄 Paramèt peman yo remèt pa defo.');
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const getMethodBadgeStyle = (type: PaymentMethodType) => {
    switch (type) {
      case 'natcash':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'moncash':
        return 'bg-red-600/15 text-red-300 border-red-600/30';
      case 'zelle':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'cashapp':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'paypal':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'bank_transfer':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    }
  };

  const activeCount = config.methods.filter(m => m.isActive).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Actions Header */}
      <div className="bg-[#0a0f1d]/90 border border-yellow-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xl shadow-yellow-500/20">
            <Sliders className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                Espas Modifikasyon Mwayen Peman
              </h2>
              <span className="bg-yellow-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                Admin Settings
              </span>
            </div>
            <p className="text-xs sm:text-sm text-yellow-300/90 font-medium mt-1">
              Chanje nimewo <strong>MonCash</strong>, <strong>Natcash</strong>, <strong>Zelle</strong>, non sou kont yo, ak frè enskripsyon atis yo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#05070a] hover:bg-white/[0.08] text-slate-300 border border-white/[0.1] flex items-center gap-2 transition-all"
            title="Remèt paramèt orijinal yo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Remèt Pa Defo</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Ajoute Nouvo Mwayen</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges && !isSaved}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xl active:scale-98 ${
              hasUnsavedChanges
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 hover:from-emerald-400 shadow-emerald-500/25 animate-pulse'
                : isSaved
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                : 'bg-white/[0.08] text-slate-400 border border-white/[0.06]'
            }`}
          >
            {isSaved ? (
              <>
                <CheckCircle className="w-4 h-4 text-slate-950" />
                <span>Chanjman yo Sovgade!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{hasUnsavedChanges ? 'Sovgade Tout Chanjman yo' : 'Tout bagay Ajou'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Payment Methods */}
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Mwayen Peman Aktif</span>
            <Smartphone className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono mt-2">
            {activeCount} <span className="text-xs text-slate-400 font-sans font-normal">sou {config.methods.length} total</span>
          </p>
          <p className="text-[10px] text-emerald-400 mt-1">Disponib pou fanatik ak atis yo</p>
        </div>

        {/* Haitian Gourde Exchange Rate */}
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Taux Dola (USD ↔ HTG)</span>
            <Calculator className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-black text-yellow-400 font-mono mt-2">
            1 USD = {config.htgExchangeRate.toFixed(2)} <span className="text-xs text-yellow-300 font-sans">HTG</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Itilize pou tout konvèsyon nan app la</p>
        </div>

        {/* Artist Registration Fee (USD & HTG) */}
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Frè Enskripsyon Atis</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400 font-mono mt-2">
            ${config.artistRegistrationFeeUsd.toFixed(2)} <span className="text-xs text-purple-300 font-sans">USD</span>
          </p>
          <p className="text-[11px] font-bold text-slate-300 font-mono mt-0.5">
            ~{config.artistRegistrationFeeHtg.toLocaleString('en-US')} <span className="text-[10px] text-slate-400 font-sans font-normal">Goud</span>
          </p>
        </div>

        {/* Live Status Indicator */}
        <div className="bg-[#0a0f1d]/90 border border-white/[0.08] p-5 rounded-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-400">Senkronizasyon</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <p className="text-base font-bold text-emerald-400 mt-2 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> An Tan Reyèl
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Chanjman yo parèt touswit sou tout paj yo</p>
        </div>
      </div>

      {/* Global General Parameters (Exchange rate, Artist Fee, Global Notice) */}
      <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Paramèt Jeneral Peman & Taux Echanj</h3>
              <p className="text-xs text-slate-400">Konfigire to konvèsyon an ak frè ofisyèl pou tout sistèm nan.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Exchange Rate Input */}
          <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Taux Dola Ayiti (1 USD = X HTG) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="50"
                max="500"
                step="0.1"
                value={config.htgExchangeRate ?? 145}
                onChange={(e) => handleGeneralRateChange(parseFloat(e.target.value) || 145)}
                className="w-full bg-[#0a0f1d] border border-white/[0.15] rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-yellow-400 focus:border-yellow-400 outline-none"
              />
              <span className="text-xs font-bold text-slate-400 font-mono">HTG</span>
            </div>
            <p className="text-[11px] text-slate-500">To ofisyèl pou konvèti donasyon ak frè enskripsyon.</p>
          </div>

          {/* Artist Registration Fee (USD) */}
          <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Frè Enskripsyon Atis ($ USD) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.5"
                max="100"
                step="0.01"
                value={config.artistRegistrationFeeUsd ?? 4.99}
                onChange={(e) => handleArtistFeeUsdChange(parseFloat(e.target.value) || 4.99)}
                className="w-full bg-[#0a0f1d] border border-white/[0.15] rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-purple-400 focus:border-purple-400 outline-none"
              />
              <span className="text-xs font-bold text-slate-400 font-mono">USD</span>
            </div>
            <p className="text-[11px] text-slate-500">Montan atis la dwe transfere pou aktive kont li.</p>
          </div>

          {/* Artist Registration Fee (HTG Equivalent) */}
          <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-4 space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              Ekwivalan an Goud (HTG) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="50"
                step="0.05"
                value={config.artistRegistrationFeeHtg ?? 723.55}
                onChange={(e) => handleArtistFeeHtgChange(parseFloat(e.target.value) || 723.55)}
                className="w-full bg-[#0a0f1d] border border-white/[0.15] rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-emerald-400 focus:border-emerald-400 outline-none"
              />
              <span className="text-xs font-bold text-slate-400 font-mono">HTG</span>
            </div>
            <p className="text-[11px] text-slate-500">Montan an goud ki afiche sou fòmilè enskripsyon an.</p>
          </div>
        </div>

        {/* Global Notice Textarea */}
        <div className="bg-[#05070a] border border-white/[0.08] rounded-2xl p-4 space-y-2">
          <label className="block text-xs font-bold text-slate-300">
            Nòt & Enstriksyon Peman pou Itilizatè yo:
          </label>
          <textarea
            rows={2}
            value={config.globalNotice || ''}
            onChange={(e) => {
              setConfig(prev => ({ ...prev, globalNotice: e.target.value }));
              setHasUnsavedChanges(true);
              setIsSaved(false);
            }}
            placeholder="egz: Voye kòb la sou nimewo sa yo, pran yon foto (screenshot) prèv transfè a, epi telechaje l..."
            className="w-full bg-[#0a0f1d] border border-white/[0.15] rounded-xl p-3 text-xs text-white focus:border-yellow-400 outline-none resize-none"
          />
        </div>
      </div>

      {/* List of Payment Methods */}
      <div className="bg-[#0a0f1d]/90 border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Lis Mwayen & Nimewo Peman yo ({config.methods.length})</h3>
              <p className="text-xs text-slate-400">Klike sou modifye pou chanje nimewo, non oswa enstriksyon.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Ajoute Yon Lòt Mwayen</span>
          </button>
        </div>

        {/* Methods Cards */}
        <div className="grid grid-cols-1 gap-3.5">
          {config.methods.map((method, idx) => (
            <div
              key={method.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                method.isActive
                  ? 'bg-[#05070a]/90 border-white/[0.12] hover:border-yellow-500/40 shadow-lg'
                  : 'bg-[#05070a]/40 border-white/[0.05] opacity-60'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Info */}
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                    {method.type === 'moncash' || method.type === 'natcash' ? (
                      <Smartphone className="w-5 h-5 text-yellow-400" />
                    ) : method.type === 'bank_transfer' ? (
                      <Building className="w-5 h-5 text-amber-400" />
                    ) : method.type === 'zelle' || method.type === 'paypal' ? (
                      <CreditCard className="w-5 h-5 text-purple-400" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{method.name}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getMethodBadgeStyle(method.type)}`}>
                        {method.type.toUpperCase()}
                      </span>
                      {method.badgeText && (
                        <span className="text-[10px] bg-white/[0.06] text-slate-300 px-2 py-0.5 rounded border border-white/[0.08]">
                          {method.badgeText}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        method.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {method.isActive ? '● Aktif' : '○ Dezaktif'}
                      </span>
                    </div>

                    {/* Account Number and Holder */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <div className="flex items-center gap-1.5 bg-[#0a0f1d] px-3 py-1.5 rounded-xl border border-white/[0.1] font-mono text-yellow-300 font-bold select-all">
                        <span>{method.accountNumberOrId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(method.accountNumberOrId, method.id)}
                          className="text-slate-400 hover:text-white p-0.5"
                          title="Kopye nimewo a"
                        >
                          {copiedId === method.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="text-slate-300 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/[0.06]">
                        Non sou kont lan: <strong className="text-white">{method.accountHolderName}</strong>
                      </div>

                      <div className="text-slate-400 bg-white/[0.03] px-2.5 py-1.5 rounded-xl border border-white/[0.06] text-[11px]">
                        Lajan: <strong className="text-slate-200">{method.currencySupported.join(', ')}</strong>
                      </div>
                    </div>

                    {method.instructions && (
                      <p className="text-[11px] text-slate-400 italic mt-1">
                        "{method.instructions}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {/* Order buttons */}
                  <div className="flex items-center bg-[#0a0f1d] rounded-xl border border-white/[0.08] p-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveOrder(idx, 'up')}
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                      title="Deplase monte"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === config.methods.length - 1}
                      onClick={() => handleMoveOrder(idx, 'down')}
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                      title="Deplase desann"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle Active */}
                  <button
                    type="button"
                    onClick={() => handleToggleMethodActive(method.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      method.isActive
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-slate-800/40 text-slate-400 border-white/[0.08] hover:bg-slate-800'
                    }`}
                  >
                    {method.isActive ? 'Dezaktive' : 'Aktive'}
                  </button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => openEditModal(method)}
                    className="p-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 transition-colors"
                    title="Modifye nimewo ak detay sa yo"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteMethod(method.id)}
                    className="p-2 rounded-xl bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30 transition-colors"
                    title="Efase mwayen sa a"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Preview Section for Admin */}
      <div className="bg-[#0a0f1d]/90 border border-yellow-500/20 rounded-3xl p-6 backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
          <Eye className="w-4 h-4" />
          <span>Apèsi an Tan Reyèl (Kijan Fanatik ak Atis yo ap wè banyè peman an):</span>
        </div>

        {/* Preview of Modal Banner */}
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-blue-950/80 border border-blue-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-blue-300">
            <span className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-yellow-400" />
              KONT PEMAN OFISYÈL UPMIZIK ({activeCount} Mwayen Aktif):
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              1 USD = {config.htgExchangeRate} HTG
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {config.methods.filter(m => m.isActive).map(m => (
              <div key={m.id} className="bg-[#05070a] border border-white/[0.1] rounded-xl p-3 space-y-1 select-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{m.name}</span>
                  <span className="text-[10px] text-yellow-400 font-mono">{m.currencySupported.join('/')}</span>
                </div>
                <p className="text-sm font-mono font-black text-yellow-300">{m.accountNumberOrId}</p>
                <p className="text-[11px] text-emerald-300 font-medium">Non: {m.accountHolderName}</p>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-400 text-center pt-1">
            {config.globalNotice || 'Voye kòb la sou nimewo sa yo, pran yon foto (screenshot) prèv la, epi telechaje l.'}
          </p>
        </div>
      </div>

      {/* MODAL: ADD / EDIT PAYMENT METHOD */}
      {(isAddingNew || editingMethod) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0a0f1d] border border-white/[0.15] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white font-['Cabinet_Grotesk',sans-serif]">
                    {editingMethod ? `Modifye "${editingMethod.name}"` : 'Ajoute Nouvo Mwayen Peman'}
                  </h3>
                  <p className="text-xs text-slate-400">Antre nimewo telefòn oswa idantifyan kont lan.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingMethod(null);
                  setIsAddingNew(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMethodForm} className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Tip Mwayen Peman *</label>
                <select
                  value={formType ?? 'moncash'}
                  onChange={(e) => {
                    const nextType = e.target.value as PaymentMethodType;
                    setFormType(nextType);
                    if (!editingMethod) {
                      if (nextType === 'moncash') {
                        setFormName('MonCash');
                        setFormCurrencies(['HTG']);
                        setFormBadge('Digicel Ayiti');
                      } else if (nextType === 'natcash') {
                        setFormName('Natcash');
                        setFormCurrencies(['HTG']);
                        setFormBadge('Natcom Ayiti');
                      } else if (nextType === 'zelle') {
                        setFormName('Zelle');
                        setFormCurrencies(['USD']);
                        setFormBadge('USA & Entènasyonal');
                      } else if (nextType === 'cashapp') {
                        setFormName('Cash App');
                        setFormCurrencies(['USD']);
                        setFormBadge('USA');
                      } else if (nextType === 'bank_transfer') {
                        setFormName('Depo Labank');
                        setFormCurrencies(['HTG', 'USD']);
                        setFormBadge('Labank Ayiti');
                      }
                    }
                  }}
                  className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                >
                  <option value="moncash">MonCash (Digicel Ayiti)</option>
                  <option value="natcash">Natcash (Natcom Ayiti)</option>
                  <option value="zelle">Zelle (USA / Entènasyonal)</option>
                  <option value="cashapp">Cash App ($Cashtag)</option>
                  <option value="paypal">PayPal</option>
                  <option value="bank_transfer">Depo Labank (Sogebank, Unibank, BUH...)</option>
                  <option value="custom">Lòt / Pèsonalize</option>
                </select>
              </div>

              {/* Name & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Non Mwayen Peman *</label>
                  <input
                    type="text"
                    required
                    value={formName ?? ''}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="egz: MonCash, Natcash, Zelle..."
                    className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Ti Etikèt / Badge (Opsyonèl)</label>
                  <input
                    type="text"
                    value={formBadge ?? ''}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="egz: Digicel Ayiti, USA..."
                    className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Account Number / Phone / ID */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nimewo Telefòn / Nimewo Kont / Imèl *
                </label>
                <input
                  type="text"
                  required
                  value={formNumber ?? ''}
                  onChange={(e) => setFormNumber(e.target.value)}
                  placeholder="egz: 38-91-2317, 35-37-1184, venso509@gmail.com..."
                  className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-yellow-300 font-mono font-bold focus:border-blue-500 outline-none"
                />
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Non Moun ki sou Kont la (Titulaire) *
                </label>
                <input
                  type="text"
                  required
                  value={formHolder ?? ''}
                  onChange={(e) => setFormHolder(e.target.value)}
                  placeholder="egz: Clauvens EXAUS"
                  className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Enstriksyon Espesifik (Opsyonèl)
                </label>
                <input
                  type="text"
                  value={formInstructions ?? ''}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="egz: Fè transfè a epi telechaje resi a..."
                  className="w-full bg-[#05070a] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>

              {/* Currencies supported & Active toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-300 font-bold">Lajan:</label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCurrencies.includes('HTG')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormCurrencies(prev => [...prev, 'HTG']);
                        } else {
                          setFormCurrencies(prev => prev.filter(c => c !== 'HTG'));
                        }
                      }}
                      className="rounded accent-yellow-400"
                    />
                    <span>HTG (Goud)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formCurrencies.includes('USD')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormCurrencies(prev => [...prev, 'USD']);
                        } else {
                          setFormCurrencies(prev => prev.filter(c => c !== 'USD'));
                        }
                      }}
                      className="rounded accent-yellow-400"
                    />
                    <span>USD ($ Dola)</span>
                  </label>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>Mwayen Aktif</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMethod(null);
                    setIsAddingNew(false);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 transition-colors"
                >
                  Anile
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingMethod ? 'Mete Ajou' : 'Ajoute Mwayen an'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
