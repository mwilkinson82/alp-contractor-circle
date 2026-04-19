/**
 * RateSetupWizard — Guided 5-step modal for configuring labor rates.
 *
 * Steps:
 * 1. Work Type: Residential or Commercial (big visual cards)
 * 2. Shop Type: Open Shop or Union (with brief explanation)
 * 3. Region: Map/dropdown with RS Means city cost indexes
 * 4. Project Specialty: Optional multiplier (water treatment, hospital, industrial, etc.)
 * 5. Processing Animation: "Calibrating your rates..." with visual factor display
 *
 * Result: recalculates all trade rates in one shot based on selected labor type + region + specialty.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RegionSelector from "@/components/RegionSelector";
import {
  Building2,
  Home,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  Shield,
  Users,
  MapPin,
  Wrench,
  Check,
  Zap,
} from "lucide-react";
import type { LaborType } from "../../../shared/tradeRates";
import { getRegion } from "../../../shared/costRegions";

const STORAGE_KEY = "alp-rate-setup-config";

export interface RateSetupConfig {
  workType: "residential" | "commercial";
  shopType: "open" | "union";
  laborType: LaborType;
  regionCode: string | null;
  regionName: string | null;
  regionMultiplier: number; // basis points, 10000 = 1.00x
  specialty: string | null;
  specialtyMultiplier: number; // basis points, 10000 = 1.00x
  configuredAt: string; // ISO timestamp
}

const DEFAULT_CONFIG: RateSetupConfig = {
  workType: "commercial",
  shopType: "open",
  laborType: "com_open",
  regionCode: null,
  regionName: null,
  regionMultiplier: 10000,
  specialty: null,
  specialtyMultiplier: 10000,
  configuredAt: "",
};

export function loadRateConfig(): RateSetupConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export function saveRateConfig(config: RateSetupConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

// ─── Specialty Definitions ───────────────────────────────────────────────────
const PROJECT_SPECIALTIES = [
  { id: "standard", label: "Standard Commercial", description: "Office buildings, retail, restaurants, tenant improvements", multiplier: 10000, icon: Building2 },
  { id: "healthcare", label: "Healthcare / Hospital", description: "Hospitals, clinics, medical offices — infection control, MEP-heavy", multiplier: 11500, icon: Shield },
  { id: "education", label: "Education / Institutional", description: "Schools, universities, government buildings", multiplier: 10800, icon: Building2 },
  { id: "industrial", label: "Industrial / Manufacturing", description: "Warehouses, factories, distribution centers", multiplier: 10300, icon: Wrench },
  { id: "water_treatment", label: "Water Treatment Plant", description: "Water/wastewater treatment, pump stations — specialized trades", multiplier: 12000, icon: Zap },
  { id: "power_energy", label: "Power / Energy", description: "Power plants, substations, solar farms — high-voltage work", multiplier: 12500, icon: Zap },
  { id: "high_rise", label: "High-Rise / Multi-Story", description: "High-rise residential or commercial — crane time, logistics premium", multiplier: 11200, icon: Building2 },
  { id: "renovation", label: "Renovation / Remodel", description: "Existing structure work — demolition, phasing, limited access", multiplier: 10500, icon: Wrench },
];

const RES_SPECIALTIES = [
  { id: "standard_res", label: "Standard Residential", description: "Single-family homes, townhomes, duplexes", multiplier: 10000, icon: Home },
  { id: "custom_home", label: "Custom / Luxury Home", description: "High-end finishes, complex architecture, premium materials", multiplier: 11500, icon: Home },
  { id: "multi_family", label: "Multi-Family", description: "Apartments, condos, mixed-use residential", multiplier: 10800, icon: Building2 },
  { id: "res_renovation", label: "Residential Renovation", description: "Remodels, additions, kitchen/bath — existing structure work", multiplier: 10500, icon: Wrench },
];

// ─── Processing Animation Phases ─────────────────────────────────────────────
const PROCESSING_PHASES = [
  { label: "Loading RS Means baseline data", duration: 800 },
  { label: "Applying labor type adjustments", duration: 600 },
  { label: "Factoring regional cost index", duration: 700 },
  { label: "Applying project specialty multiplier", duration: 500 },
  { label: "Calculating burdened rates", duration: 600 },
  { label: "Finalizing rate library", duration: 400 },
];

interface RateSetupWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (config: RateSetupConfig) => void;
  isApplying: boolean;
  existingConfig?: RateSetupConfig | null;
}

export default function RateSetupWizard({
  open,
  onClose,
  onComplete,
  isApplying,
  existingConfig,
}: RateSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [workType, setWorkType] = useState<"residential" | "commercial">(
    existingConfig?.workType || "commercial"
  );
  const [shopType, setShopType] = useState<"open" | "union">(
    existingConfig?.shopType || "open"
  );
  const [regionCode, setRegionCode] = useState<string | null>(
    existingConfig?.regionCode || null
  );
  const [regionName, setRegionName] = useState<string | null>(
    existingConfig?.regionName || null
  );
  const [regionMultiplier, setRegionMultiplier] = useState<number>(
    existingConfig?.regionMultiplier || 10000
  );
  const [specialty, setSpecialty] = useState<string | null>(
    existingConfig?.specialty || null
  );

  // Processing animation state
  const [processingPhase, setProcessingPhase] = useState(0);
  const [showComplete, setShowComplete] = useState(false);

  const totalSteps = 5;

  // Reset step when modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      setProcessingPhase(0);
      setShowComplete(false);
    }
  }, [open]);

  // Processing animation
  useEffect(() => {
    if (step !== 5) return;
    if (showComplete) return;

    let timeout: ReturnType<typeof setTimeout>;
    if (processingPhase < PROCESSING_PHASES.length) {
      timeout = setTimeout(() => {
        setProcessingPhase((p) => p + 1);
      }, PROCESSING_PHASES[processingPhase].duration);
    } else {
      // All phases done — show complete state
      timeout = setTimeout(() => {
        setShowComplete(true);
      }, 300);
    }
    return () => clearTimeout(timeout);
  }, [step, processingPhase, showComplete]);

  const deriveLaborType = (): LaborType => {
    if (workType === "residential") return shopType === "union" ? "res_union" : "res_open";
    return shopType === "union" ? "com_union" : "com_open";
  };

  const getSpecialtyMultiplier = (): number => {
    const list = workType === "commercial" ? PROJECT_SPECIALTIES : RES_SPECIALTIES;
    const found = list.find((s) => s.id === specialty);
    return found?.multiplier || 10000;
  };

  const handleApply = useCallback(() => {
    const config: RateSetupConfig = {
      workType,
      shopType,
      laborType: deriveLaborType(),
      regionCode,
      regionName,
      regionMultiplier,
      specialty,
      specialtyMultiplier: getSpecialtyMultiplier(),
      configuredAt: new Date().toISOString(),
    };
    saveRateConfig(config);
    onComplete(config);
  }, [workType, shopType, regionCode, regionName, regionMultiplier, specialty, onComplete]);

  const specialties = workType === "commercial" ? PROJECT_SPECIALTIES : RES_SPECIALTIES;
  const selectedSpecialty = specialties.find((s) => s.id === specialty);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl text-cream flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Configure Your Rate Library
          </DialogTitle>
          <DialogDescription className="text-cream-muted">
            Set up your labor rates in under 60 seconds. <span className="font-semibold"><span className="text-white">Construct</span><span className="text-amber-400">Line</span></span> will calibrate 92 classifications across 20 trades.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto overscroll-contain min-h-0">

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 py-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => s < step && step < 5 ? setStep(s) : undefined}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  s === step
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-110"
                    : s < step
                      ? "bg-amber-500/30 text-amber-300 cursor-pointer hover:bg-amber-500/50"
                      : "bg-white/10 text-cream-muted"
                }`}
              >
                {s < step ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  s
                )}
              </button>
              {s < 5 && (
                <div className={`w-8 h-0.5 transition-colors duration-300 ${s < step ? "bg-amber-500/40" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-center gap-1 pb-4">
          {["Work Type", "Shop Type", "Region", "Specialty", "Apply"].map((label, i) => (
            <div key={label} className="flex items-center">
              <span className={`text-[9px] font-medium w-8 text-center ${
                i + 1 === step ? "text-amber-400" : i + 1 < step ? "text-amber-300/60" : "text-cream-muted/40"
              }`}>
                {label}
              </span>
              {i < 4 && <div className="w-8" />}
            </div>
          ))}
        </div>

        {/* ─── Step 1: Work Type ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-cream">What type of work is this for?</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Residential Card */}
              <button
                onClick={() => { setWorkType("residential"); setSpecialty(null); }}
                className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left group ${
                  workType === "residential"
                    ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                }`}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                    workType === "residential" ? "bg-amber-500/20" : "bg-white/10 group-hover:bg-white/15"
                  }`}>
                    <Home className={`w-8 h-8 ${workType === "residential" ? "text-amber-400" : "text-cream-muted"}`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${workType === "residential" ? "text-amber-300" : "text-cream"}`}>Residential</h3>
                    <p className="text-xs text-cream-muted mt-1">Single-family, multi-family, custom homes, renovations</p>
                  </div>
                </div>
                {workType === "residential" && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>

              {/* Commercial Card */}
              <button
                onClick={() => { setWorkType("commercial"); setSpecialty(null); }}
                className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left group ${
                  workType === "commercial"
                    ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                }`}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                    workType === "commercial" ? "bg-amber-500/20" : "bg-white/10 group-hover:bg-white/15"
                  }`}>
                    <Building2 className={`w-8 h-8 ${workType === "commercial" ? "text-amber-400" : "text-cream-muted"}`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${workType === "commercial" ? "text-amber-300" : "text-cream"}`}>Commercial</h3>
                    <p className="text-xs text-cream-muted mt-1">Office, retail, industrial, healthcare, institutional</p>
                  </div>
                </div>
                {workType === "commercial" && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Shop Type ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-cream">Open Shop or Union?</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Open Shop */}
              <button
                onClick={() => setShopType("open")}
                className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left group ${
                  shopType === "open"
                    ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                }`}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                    shopType === "open" ? "bg-amber-500/20" : "bg-white/10 group-hover:bg-white/15"
                  }`}>
                    <Users className={`w-8 h-8 ${shopType === "open" ? "text-amber-400" : "text-cream-muted"}`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${shopType === "open" ? "text-amber-300" : "text-cream"}`}>Open Shop</h3>
                    <p className="text-xs text-cream-muted mt-1">Non-union labor. Flexible crew composition, market-rate wages.</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center">
                    <Badge className="bg-white/10 text-cream-muted border-white/10 text-[9px]">Lower burden</Badge>
                    <Badge className="bg-white/10 text-cream-muted border-white/10 text-[9px]">No fringe</Badge>
                  </div>
                </div>
                {shopType === "open" && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>

              {/* Union */}
              <button
                onClick={() => setShopType("union")}
                className={`relative p-6 rounded-xl border-2 transition-all duration-200 text-left group ${
                  shopType === "union"
                    ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                }`}
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                    shopType === "union" ? "bg-amber-500/20" : "bg-white/10 group-hover:bg-white/15"
                  }`}>
                    <Shield className={`w-8 h-8 ${shopType === "union" ? "text-amber-400" : "text-cream-muted"}`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${shopType === "union" ? "text-amber-300" : "text-cream"}`}>Union</h3>
                    <p className="text-xs text-cream-muted mt-1">Union labor with prevailing wages, fringe benefits, and training funds.</p>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center">
                    <Badge className="bg-white/10 text-cream-muted border-white/10 text-[9px]">Higher wages</Badge>
                    <Badge className="bg-white/10 text-cream-muted border-white/10 text-[9px]">Fringe + pension</Badge>
                  </div>
                </div>
                {shopType === "union" && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>
            </div>

            {/* Quick summary of what changes */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 mt-2">
              <p className="text-xs text-cream-muted">
                <span className="text-cream font-medium">What this affects:</span>{" "}
                {shopType === "union"
                  ? "Higher base wages, union fringe benefits ($6.50–$14/hr), pension contributions (5–6%), and training fund allocations. Burden typically 35–45% of base wage."
                  : "Market-rate base wages, no union fringe or training fund. Standard burden (FICA, WC, GL, health) typically 25–30% of base wage."}
              </p>
            </div>
          </div>
        )}

        {/* ─── Step 3: Region ────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-cream">What region?</span>
            </div>
            <p className="text-xs text-cream-muted -mt-2">
              RS Means city cost indexes adjust your rates for local market conditions. Leave as National Average if you're not sure.
            </p>
            <RegionSelector
              value={regionCode}
              onChange={(code) => {
                setRegionCode(code);
                if (code) {
                  const region = getRegion(code);
                  if (region) {
                    setRegionName(region.name);
                    setRegionMultiplier(region.multiplier);
                  }
                } else {
                  setRegionName(null);
                  setRegionMultiplier(10000);
                }
              }}
              defaultExpanded={true}
              currency="USD"
            />
          </div>
        )}

        {/* ─── Step 4: Project Specialty ─────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-cream">Project Specialty</span>
              <Badge className="bg-white/10 text-cream-muted border-white/10 text-[10px] font-normal">Optional</Badge>
            </div>
            <p className="text-xs text-cream-muted -mt-2">
              Different project types have different labor complexity. Select the closest match — or leave as Standard for no adjustment.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {specialties.map((s) => {
                const Icon = s.icon;
                const isSelected = specialty === s.id || (!specialty && s.multiplier === 10000 && s.id.includes("standard"));
                const adjustPct = ((s.multiplier - 10000) / 100).toFixed(0);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSpecialty(s.id)}
                    className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                      isSelected
                        ? "border-amber-500/50 bg-amber-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-amber-500/20" : "bg-white/10"
                      }`}>
                        <Icon className={`w-4.5 h-4.5 ${isSelected ? "text-amber-400" : "text-cream-muted"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isSelected ? "text-amber-300" : "text-cream"}`}>{s.label}</span>
                        </div>
                        <p className="text-[10px] text-cream-muted mt-0.5 leading-tight">{s.description}</p>
                        {s.multiplier !== 10000 && (
                          <Badge className="mt-1.5 bg-blue-500/10 text-blue-300 border-blue-500/20 text-[9px]">
                            +{adjustPct}% labor factor
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Step 5: Processing Animation ──────────────────────────── */}
        {step === 5 && (
          <div className="py-6">
            {!showComplete ? (
              <div className="space-y-6">
                {/* Animated header */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center mb-4">
                    <Sparkles className="w-10 h-10 text-amber-400 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold text-cream">Calibrating Your Rates</h3>
                  <p className="text-sm text-cream-muted mt-1">
                    Configuring 92 classifications across 20 trades...
                  </p>
                </div>

                {/* Configuration summary */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 px-3 py-1">
                    {workType === "commercial" ? "Commercial" : "Residential"}
                  </Badge>
                  <span className="text-cream-muted">×</span>
                  <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 px-3 py-1">
                    {shopType === "union" ? "Union" : "Open Shop"}
                  </Badge>
                  {regionCode && regionCode !== "national" && (
                    <>
                      <span className="text-cream-muted">×</span>
                      <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/25 px-3 py-1">
                        {regionName || regionCode}
                      </Badge>
                    </>
                  )}
                  {selectedSpecialty && selectedSpecialty.multiplier !== 10000 && (
                    <>
                      <span className="text-cream-muted">×</span>
                      <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/25 px-3 py-1">
                        {selectedSpecialty.label}
                      </Badge>
                    </>
                  )}
                </div>

                {/* Processing phases */}
                <div className="space-y-2 max-w-md mx-auto">
                  {PROCESSING_PHASES.map((phase, i) => (
                    <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${
                      i < processingPhase ? "opacity-100" : i === processingPhase ? "opacity-100" : "opacity-30"
                    }`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                        i < processingPhase
                          ? "bg-emerald-500/20"
                          : i === processingPhase
                            ? "bg-amber-500/20"
                            : "bg-white/10"
                      }`}>
                        {i < processingPhase ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : i === processingPhase ? (
                          <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                        )}
                      </div>
                      <span className={`text-sm ${
                        i < processingPhase ? "text-emerald-300" : i === processingPhase ? "text-cream" : "text-cream-muted/50"
                      }`}>
                        {phase.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="max-w-md mx-auto">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(processingPhase / PROCESSING_PHASES.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* ─── Complete State ─────────────────────────────────────── */
              <div className="text-center space-y-5">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                  <Check className="w-10 h-10 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-cream">Rates Calibrated</h3>
                  <p className="text-sm text-cream-muted mt-1">
                    92 classifications across 20 CSI trades configured.
                  </p>
                </div>

                {/* Summary card */}
                <div className="max-w-sm mx-auto p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 text-left">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cream-muted">Work Type</span>
                    <span className="text-cream font-medium capitalize">{workType}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cream-muted">Shop Type</span>
                    <span className="text-cream font-medium capitalize">{shopType === "union" ? "Union" : "Open Shop"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cream-muted">Region</span>
                    <span className="text-cream font-medium">{regionName || "National Average"}</span>
                  </div>
                  {selectedSpecialty && selectedSpecialty.multiplier !== 10000 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-cream-muted">Specialty</span>
                      <span className="text-cream font-medium">{selectedSpecialty.label}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm">
                    <span className="text-cream-muted">Combined Factor</span>
                    <span className="text-amber-400 font-bold">
                      {((regionMultiplier / 10000) * (getSpecialtyMultiplier() / 10000)).toFixed(2)}x
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleApply}
                  disabled={isApplying}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold px-8 py-3 text-base shadow-lg shadow-amber-500/20"
                >
                  {isApplying ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 mr-2" />
                  )}
                  Apply to My Rate Library
                </Button>
              </div>
            )}
          </div>
        )}

        </div>{/* end scrollable body */}

        {/* Footer Navigation — hidden on step 5 */}
        {step < 5 && (
          <DialogFooter className="flex items-center justify-between gap-2 pt-2">
            <div className="flex gap-2">
              {step > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => setStep(step - 1)}
                  className="text-cream-muted hover:text-cream"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-cream-muted hover:text-cream"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setStep(step + 1)}
                className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
              >
                {step === 4 ? "Calibrate Rates" : "Next"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
