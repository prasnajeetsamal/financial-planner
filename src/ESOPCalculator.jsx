// -----------------------------------------------------------------------------------------------------------------------------------------------
// --------------------- Code Archive --------------------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------------------------

import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, DollarSign, Plus, Trash2, Calendar, Info, Download, Copy, Check } from 'lucide-react';

// ====== REUSABLE COMPONENTS (defined outside to prevent recreation) ======
const InfoTooltip = ({ text }) => (
  <div className="group relative inline-block ml-1">
    <Info size={14} className="text-gray-400 hover:text-indigo-600 cursor-help transition-colors" />
    <div className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

const InputField = ({ label, value, onChange, type = "number", placeholder = "0", prefix, suffix, tooltip, disabled = false }) => (
  <div className="space-y-1.5">
    <label className="flex items-center text-sm font-medium text-gray-700">
      {label}
      {tooltip && <InfoTooltip text={tooltip} />}
    </label>
    <div className="relative group">
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full ${prefix ? 'pl-8' : 'pl-4'} ${suffix ? 'pr-12' : 'pr-4'} py-3 border-2 border-gray-200 rounded-xl 
          focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
          ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white hover:border-gray-300 hover:shadow-sm'} 
          transition-all duration-200 text-sm font-medium shadow-sm`}
        placeholder={placeholder}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const StatCard = ({ icon: Icon, title, value, subtitle, gradient }) => (
  <div className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${gradient} text-white shadow-lg hover:shadow-xl transition-all duration-300 group`}>
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
          <Icon size={20} />
        </div>
        <h3 className="text-sm font-medium opacity-90">{title}</h3>
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
    </div>
  </div>
);

export default function ESOPCalculator() {
  // ====== APP-LEVEL TABS (Changed from 2 to 3 tabs) ======
  const [activeTab, setActiveTab] = useState('esop-india');

  // ==== DEFAULTS (ESOP) ====
  const [tranches, setTranches] = useState([
    { id: 1, numShares: 0, exercisePrice: 640 },
    { id: 2, numShares: 0, exercisePrice: 840 }
  ]);
  const [fmvExercise, setFmvExercise] = useState(5040);
  const [fmvSale, setFmvSale] = useState(10000);
  const [exerciseDate, setExerciseDate] = useState('2025-12-15'); // Changed from 2025-01-15
  const [saleDate, setSaleDate] = useState('2026-12-31'); // Changed from 2025-07-15
  const [otherIncome, setOtherIncome] = useState(0);
  const [isListed, setIsListed] = useState(true);
  const [financialYear, setFinancialYear] = useState('2025-26');

  // US ESOP specific states
  const [usExercisePriceINR, setUsExercisePriceINR] = useState(640);
  const [usFmvExerciseINR, setUsFmvExerciseINR] = useState(5040);
  const [usFmvSaleINR, setUsFmvSaleINR] = useState(10000);
  const [usUseIncomeTaxData, setUsUseIncomeTaxData] = useState(true);
  const [usManualBaseSalary, setUsManualBaseSalary] = useState(0);
  const [usManualBonus, setUsManualBonus] = useState(0);
  const [usManual401k, setUsManual401k] = useState(0);
  const [usManualHealth, setUsManualHealth] = useState(0);
  const [usManualOther, setUsManualOther] = useState(0);
  
  // US / FX
  const [fxRate, setFxRate] = useState(87);
  const [usEffectiveRate, setUsEffectiveRate] = useState(33);
  const [usCGRate, setUsCGRate] = useState(10);
  const [includeNIIT, setIncludeNIIT] = useState(false);
  const [includeFICA, setIncludeFICA] = useState(false);

  // Calc + view toggles
  const [showResults, setShowResults] = useState(false);
  const [planToExercise, setPlanToExercise] = useState(true);

  // Copy/export feedback
  const [justCopied, setJustCopied] = useState(false);
  const [justExported, setJustExported] = useState(false);

  // ====== POLICY BY FINANCIAL YEAR (ESOP India) ======
  const policyByFY = {
    '2024-25': { standardDeduction: 50000, listedSTCG: 0.15, listedLTCG: 0.10, ltcgExemption: 100000, isNewPolicy: false },
    '2025-26': { standardDeduction: 75000, listedSTCG: 0.20, listedLTCG: 0.125, ltcgExemption: 125000, isNewPolicy: true },
    '2026-27': { standardDeduction: 75000, listedSTCG: 0.20, listedLTCG: 0.125, ltcgExemption: 125000, isNewPolicy: true }
  };
  const fyPolicy = policyByFY[financialYear] ?? policyByFY['2025-26'];

  // ====== HELPERS (ESOP) ======
  const calculateHoldingMonths = () => {
    if (!exerciseDate || !saleDate) return 0;
    const start = new Date(exerciseDate);
    const end = new Date(saleDate);
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(0, months);
  };
  const holdMonths = calculateHoldingMonths();

  const addTranche = () => {
    const newId = Math.max(...tranches.map(t => t.id), 0) + 1;
    setTranches([...tranches, { id: newId, numShares: 0, exercisePrice: 0 }]);
  };
  const removeTranche = (id) => {
    if (tranches.length > 1) setTranches(tranches.filter(t => t.id !== id));
  };
  const updateTranche = (id, field, value) => {
    const v = Number(value);
    setTranches(tranches.map(t => (t.id === id ? { ...t, [field]: Number.isFinite(v) ? v : 0 } : t)));
  };
  const handleCalculate = () => setShowResults(true);

  const totalShares = tranches.reduce((sum, t) => sum + (Number.isFinite(t.numShares) ? t.numShares : 0), 0);
  const weightedAvgExercisePrice =
    totalShares > 0
      ? tranches.reduce((sum, t) => sum + (t.numShares * (Number.isFinite(t.exercisePrice) ? t.exercisePrice : 0)), 0) / totalShares
      : 0;

  // ====== INDIA slabs ======
  const calculateSlabTax = (income) => {
    const slabs = [
      { max: 400000, rate: 0.00 },
      { max: 800000, rate: 0.05 },
      { max: 1200000, rate: 0.10 },
      { max: 1600000, rate: 0.15 },
      { max: 2000000, rate: 0.20 },
      { max: 2400000, rate: 0.25 },
      { max: Infinity, rate: 0.30 }
    ];
    let tax = 0, prev = 0;
    const y = Math.max(0, income);
    for (const s of slabs) {
      if (y > prev) {
        const chunk = Math.min(y, s.max) - prev;
        tax += chunk * s.rate;
      }
      if (y <= s.max) break;
      prev = s.max;
    }
    return tax;
  };
  const getSurchargeRate = (totalIncome) => {
    if (totalIncome <= 5000000) return 0;
    if (totalIncome <= 10000000) return 0.10;
    if (totalIncome <= 20000000) return 0.15;
    return 0.25;
  };
  const capSurchargeForListedCG = (rate) => Math.min(rate, 0.15);
  const applyCess = (basePlusSurcharge) => 0.04 * basePlusSurcharge;

  const indiaTotalTaxFromIncome = (taxableIncome) => {
    if (taxableIncome <= 0) return 0;
    const baseTax = calculateSlabTax(taxableIncome);
    const surcharge = baseTax * getSurchargeRate(taxableIncome);
    const cess = applyCess(baseTax + surcharge);
    return baseTax + surcharge + cess;
  };

  // ====== FORMATTING ======
  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

  const formatLargeNumber = (value) => {
    const v = Number.isFinite(value) ? value : 0;
    if (v >= 10000000) return `₹ ${(v / 10000000).toFixed(2)} Cr`;
    if (v >= 100000) return `₹ ${(v / 100000).toFixed(2)} L`;
    return formatCurrency(v);
  };

  // ========= US/CA INCOME TAX TAB =========
  const [usBaseIncome, setUsBaseIncome] = useState(0);
  const [usBonus, setUsBonus] = useState(0);
  const [use401kPercent, setUse401kPercent] = useState(true);
  const [k401EmployeePct, setK401EmployeePct] = useState(0);
  const [k401EmployeeFixed, setK401EmployeeFixed] = useState(0);
  const [k401MatchPct, setK401MatchPct] = useState(0);
  const [healthSemiMonthly, setHealthSemiMonthly] = useState(0);
  const [otherSemiMonthly, setOtherSemiMonthly] = useState(0);
  const [filingStatus, setFilingStatus] = useState('MFJ');
  const [payFreq, setPayFreq] = useState('Monthly');
  
  // Spouse income (only for MFJ)
  const [spouseBaseIncome, setSpouseBaseIncome] = useState(0);
  const [spouseBonus, setSpouseBonus] = useState(0);
  const [spouseUse401kPercent, setSpouseUse401kPercent] = useState(true);
  const [spouseK401EmployeePct, setSpouseK401EmployeePct] = useState(0);
  const [spouseK401EmployeeFixed, setSpouseK401EmployeeFixed] = useState(0);
  const [spouseK401MatchPct, setSpouseK401MatchPct] = useState(0);
  const [spouseHealthSemiMonthly, setSpouseHealthSemiMonthly] = useState(0);
  const [spouseOtherSemiMonthly, setSpouseOtherSemiMonthly] = useState(0);
  // Removed: const [spousePayFreq, setSpousePayFreq] = useState('Monthly');

  // Constants
  const IRS_401K_LIMIT_2025 = 23500;
  const FICA_SS_WAGE_BASE_2025 = 176100;
  const FICA_SS_RATE = 0.062;
  const FICA_MED_RATE = 0.0145;
  const ADDL_MED_RATE = 0.009;
  const ADDL_MED_THRESH_SINGLE = 200000;
  const ADDL_MED_THRESH_MFJ = 250000;
  const CA_SDI_RATE_2025 = 0.012;
  const CA_SDI_HAS_WAGE_CAP = false;

  const FED_STD_DED = { Single: 15750, MFJ: 31500 };
  const CA_STD_DED = { Single: 5540, MFJ: 11080 };

  const FED_BRACKETS = {
    Single: [
      { upTo: 11925, rate: 0.10 },
      { upTo: 48475, rate: 0.12 },
      { upTo: 103350, rate: 0.22 },
      { upTo: 197300, rate: 0.24 },
      { upTo: 250525, rate: 0.32 },
      { upTo: 626350, rate: 0.35 },
      { upTo: Infinity, rate: 0.37 }
    ],
    MFJ: [
      { upTo: 23850, rate: 0.10 },
      { upTo: 96950, rate: 0.12 },
      { upTo: 206700, rate: 0.22 },
      { upTo: 394600, rate: 0.24 },
      { upTo: 501050, rate: 0.32 },
      { upTo: 751600, rate: 0.35 },
      { upTo: Infinity, rate: 0.37 }
    ]
  };

  const CA_BRACKETS = {
    Single: [
      { upTo: 10412, rate: 0.01 },
      { upTo: 24684, rate: 0.02 },
      { upTo: 38959, rate: 0.04 },
      { upTo: 54081, rate: 0.06 },
      { upTo: 68350, rate: 0.08 },
      { upTo: 349137, rate: 0.093 },
      { upTo: 418961, rate: 0.103 },
      { upTo: 698271, rate: 0.113 },
      { upTo: Infinity, rate: 0.123 }
    ],
    MFJ: [
      { upTo: 20824, rate: 0.01 },
      { upTo: 49368, rate: 0.02 },
      { upTo: 77918, rate: 0.04 },
      { upTo: 108162, rate: 0.06 },
      { upTo: 136700, rate: 0.08 },
      { upTo: 698274, rate: 0.093 },
      { upTo: 837922, rate: 0.103 },
      { upTo: 1396542, rate: 0.113 },
      { upTo: Infinity, rate: 0.123 }
    ]
  };

  const progressiveTax = (taxable, brackets) => {
    let tax = 0;
    let prev = 0;
    for (const b of brackets) {
      const cap = Math.min(taxable, b.upTo);
      if (cap > prev) {
        tax += (cap - prev) * b.rate;
        prev = cap;
      }
      if (taxable <= b.upTo) break;
    }
    return Math.max(0, tax);
  };

  const marginalRate = (taxable, brackets) => {
    for (const b of brackets) {
      if (taxable <= b.upTo) return b.rate;
    }
    return brackets[brackets.length - 1].rate;
  };

  const fmtUSD0 = (v) => `$${(Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  const grossAnnualUS = (Number(usBaseIncome) || 0) + (Number(usBonus) || 0);
  const derived401kByPct = Math.min(
    Math.round(((Number(k401EmployeePct) || 0) / 100) * grossAnnualUS),
    IRS_401K_LIMIT_2025
  );
  const k401Employee = use401kPercent ? derived401kByPct : Math.min(Number(k401EmployeeFixed) || 0, IRS_401K_LIMIT_2025);

  // Spouse calculations (only for MFJ)
  const spouseGrossAnnual = filingStatus === 'MFJ' ? ((Number(spouseBaseIncome) || 0) + (Number(spouseBonus) || 0)) : 0;
  const spouseDerived401kByPct = filingStatus === 'MFJ' ? Math.min(
    Math.round(((Number(spouseK401EmployeePct) || 0) / 100) * spouseGrossAnnual),
    IRS_401K_LIMIT_2025
  ) : 0;
  const spouseK401Employee = filingStatus === 'MFJ' 
    ? (spouseUse401kPercent ? spouseDerived401kByPct : Math.min(Number(spouseK401EmployeeFixed) || 0, IRS_401K_LIMIT_2025))
    : 0;

  const usTax = useMemo(() => {
    // Calculate household totals (user + spouse for MFJ)
    const householdGross = grossAnnualUS + (filingStatus === 'MFJ' ? spouseGrossAnnual : 0);
    const householdPretax = k401Employee + ((Number(healthSemiMonthly) || 0) * 24) + ((Number(otherSemiMonthly) || 0) * 24)
      + (filingStatus === 'MFJ' ? (spouseK401Employee + ((Number(spouseHealthSemiMonthly) || 0) * 24) + ((Number(spouseOtherSemiMonthly) || 0) * 24)) : 0);
    
    const gross = householdGross;
    const pretaxAnnual = householdPretax;
    const fedAdjIncome = Math.max(0, gross - pretaxAnnual);
    const stateAdjIncome = Math.max(0, gross - pretaxAnnual);
    const stdFed = FED_STD_DED[filingStatus] ?? 0;
    const stdCA = CA_STD_DED[filingStatus] ?? 0;
    const fedTaxable = Math.max(0, fedAdjIncome - stdFed);
    const caTaxable = Math.max(0, stateAdjIncome - stdCA);
    const fedTax = progressiveTax(fedTaxable, FED_BRACKETS[filingStatus]);
    const caTax = progressiveTax(caTaxable, CA_BRACKETS[filingStatus]);

    const pretaxForFICA = ((Number(healthSemiMonthly) || 0) * 24) + ((Number(otherSemiMonthly) || 0) * 24)
      + (filingStatus === 'MFJ' ? (((Number(spouseHealthSemiMonthly) || 0) * 24) + ((Number(spouseOtherSemiMonthly) || 0) * 24)) : 0);
    const ficaBase = Math.max(0, gross - pretaxForFICA);
    const ssTaxable = Math.min(ficaBase, Number(FICA_SS_WAGE_BASE_2025) || 0);
    const ss = ssTaxable * FICA_SS_RATE;
    const medBase = ficaBase;
    const med = medBase * FICA_MED_RATE;
    const addlThreshold = filingStatus === 'MFJ' ? Number(ADDL_MED_THRESH_MFJ) || 0 : Number(ADDL_MED_THRESH_SINGLE) || 0;
    const addlMed = Math.max(0, medBase - addlThreshold) * ADDL_MED_RATE;
    const sdiBase = gross;
    const sdi = (CA_SDI_HAS_WAGE_CAP ? Math.min(sdiBase, Infinity) : sdiBase) * CA_SDI_RATE_2025;
    const totalTax = fedTax + caTax + ss + med + addlMed + sdi;
    const netAnnual = fedAdjIncome - (fedTax + caTax + ss + med + addlMed + sdi);
    const periods = payFreq === 'Semi-monthly' ? 24 : (payFreq === 'Monthly' ? 12 : 1); // Semi-monthly = 24 (twice per month)
    const per = (v) => v / periods;
    const matchAnnual = (Number(k401MatchPct) || 0) / 100 * (Number(usBaseIncome) || 0);
    const spouseMatchAnnual = filingStatus === 'MFJ' ? ((Number(spouseK401MatchPct) || 0) / 100 * (Number(spouseBaseIncome) || 0)) : 0;
    const fedMarg = marginalRate(fedTaxable, FED_BRACKETS[filingStatus]) * 100;
    const caMarg = marginalRate(caTaxable, CA_BRACKETS[filingStatus]) * 100;
    const suggestedOrdinaryRate = Math.min(60, Math.round((fedMarg + caMarg) * 10) / 10);

    // Individual (user) calculations for per-period breakdown
    const baseGross = Number(usBaseIncome) || 0;
    const bonusGross = Number(usBonus) || 0;
    const baseK401 = use401kPercent ? Math.min(Math.round(((Number(k401EmployeePct) || 0) / 100) * baseGross), IRS_401K_LIMIT_2025) : 0;
    const baseHealthAnnual = (Number(healthSemiMonthly) || 0) * 24;
    const baseOtherAnnual = (Number(otherSemiMonthly) || 0) * 24;
    const basePretaxAnnual = baseK401 + baseHealthAnnual + baseOtherAnnual;
    const fedAdjIncomeBase = Math.max(0, baseGross - basePretaxAnnual);
    const stateAdjIncomeBase = Math.max(0, baseGross - basePretaxAnnual);
    const fedTaxableBase = Math.max(0, fedAdjIncomeBase - stdFed);
    const caTaxableBase = Math.max(0, stateAdjIncomeBase - stdCA);
    const fedTaxBase = progressiveTax(fedTaxableBase, FED_BRACKETS[filingStatus]);
    const caTaxBase = progressiveTax(caTaxableBase, CA_BRACKETS[filingStatus]);
    const pretaxForFICABase = baseHealthAnnual + baseOtherAnnual;
    const ficaBaseBase = Math.max(0, baseGross - pretaxForFICABase);
    const ssTaxableBase = Math.min(ficaBaseBase, Number(FICA_SS_WAGE_BASE_2025) || 0);
    const ssBase = ssTaxableBase * FICA_SS_RATE;
    const medBaseBase = ficaBaseBase;
    const medBaseTax = medBaseBase * FICA_MED_RATE;
    const addlThresholdBase = filingStatus === 'MFJ' ? Number(ADDL_MED_THRESH_MFJ) || 0 : Number(ADDL_MED_THRESH_SINGLE) || 0;
    const addlMedBase = Math.max(0, medBaseBase - addlThresholdBase) * ADDL_MED_RATE;
    const sdiBaseTax = (CA_SDI_HAS_WAGE_CAP ? Math.min(baseGross, Infinity) : baseGross) * CA_SDI_RATE_2025;
    const basePeriods = periods;
    const perBase = (v) => v / basePeriods;

    const baseOnly = {
      gross: baseGross,
      pretaxAnnual: basePretaxAnnual,
      fedAdjIncome: fedAdjIncomeBase,
      caAdjIncome: stateAdjIncomeBase,
      fedTax: fedTaxBase,
      caTax: caTaxBase,
      ss: ssBase,
      med: medBaseTax,
      addlMed: addlMedBase,
      sdi: sdiBaseTax,
      periods: basePeriods,
      per: perBase,
      netAnnual: fedAdjIncomeBase - (fedTaxBase + caTaxBase + ssBase + medBaseTax + addlMedBase + sdiBaseTax),
    };

    const fedMarginalOnly = marginalRate(Math.max(0, fedAdjIncome - stdFed), FED_BRACKETS[filingStatus]) || 0;
    const caMarginalOnly = marginalRate(Math.max(0, stateAdjIncome - stdCA), CA_BRACKETS[filingStatus]) || 0;
    const ssRemainingCap = Math.max(0, (Number(FICA_SS_WAGE_BASE_2025) || 0) - ssTaxableBase);
    const ssOnBonus = Math.min(bonusGross, ssRemainingCap) * FICA_SS_RATE;
    const medOnBonus = bonusGross * FICA_MED_RATE;
    const combinedMedBase = medBaseBase + bonusGross;
    const addlMedOnBonus = Math.max(0, combinedMedBase - addlThresholdBase) * ADDL_MED_RATE - Math.max(0, medBaseBase - addlThresholdBase) * ADDL_MED_RATE;
    const sdiOnBonus = bonusGross * CA_SDI_RATE_2025;
    const fedOnBonus = bonusGross * fedMarginalOnly;
    const caOnBonus = bonusGross * caMarginalOnly;
    const totalTaxOnBonus = fedOnBonus + caOnBonus + ssOnBonus + medOnBonus + addlMedOnBonus + sdiOnBonus;
    const netBonus = bonusGross - totalTaxOnBonus;

    const bonusEst = {
      bonusGross,
      fedOnBonus,
      caOnBonus,
      ssOnBonus,
      medOnBonus,
      addlMedOnBonus,
      sdiOnBonus,
      totalTaxOnBonus,
      netBonus,
      fedMarginalPct: (fedMarginalOnly * 100).toFixed(1),
      caMarginalPct: (caMarginalOnly * 100).toFixed(1),
    };

    // Spouse calculations (for MFJ)
    let spouseOnly = null;
    let spouseBonusEst = null;
    
    if (filingStatus === 'MFJ') {
      const spouseBaseGross = Number(spouseBaseIncome) || 0;
      const spouseBonusGross = Number(spouseBonus) || 0;
      const spouseBaseK401 = spouseUse401kPercent ? Math.min(Math.round(((Number(spouseK401EmployeePct) || 0) / 100) * spouseBaseGross), IRS_401K_LIMIT_2025) : spouseK401Employee;
      const spouseBaseHealthAnnual = (Number(spouseHealthSemiMonthly) || 0) * 24;
      const spouseBaseOtherAnnual = (Number(spouseOtherSemiMonthly) || 0) * 24;
      const spouseBasePretaxAnnual = spouseBaseK401 + spouseBaseHealthAnnual + spouseBaseOtherAnnual;
      
      // For per-period breakdown, we can't easily split household tax, so we'll show proportional allocation
      const spouseShareOfIncome = spouseBaseGross / (baseGross + spouseBaseGross || 1);
      const spousePeriods = payFreq === 'Semi-monthly' ? 24 : (payFreq === 'Monthly' ? 12 : 1);
      const perSpouse = (v) => v / spousePeriods;
      
      spouseOnly = {
        gross: spouseBaseGross,
        pretaxAnnual: spouseBasePretaxAnnual,
        // Allocate household taxes proportionally for display
        fedTax: fedTaxBase * spouseShareOfIncome,
        caTax: caTaxBase * spouseShareOfIncome,
        ss: ssBase * spouseShareOfIncome,
        med: medBaseTax * spouseShareOfIncome,
        addlMed: addlMedBase * spouseShareOfIncome,
        sdi: sdiBaseTax * spouseShareOfIncome,
        periods: spousePeriods,
        per: perSpouse,
        netAnnual: spouseBaseGross - spouseBasePretaxAnnual - (fedTaxBase + caTaxBase + ssBase + medBaseTax + addlMedBase + sdiBaseTax) * spouseShareOfIncome,
      };
      
      // Spouse bonus estimate
      const spouseSSRemainingCap = Math.max(0, (Number(FICA_SS_WAGE_BASE_2025) || 0) - ssTaxableBase * spouseShareOfIncome);
      const spouseSSOnBonus = Math.min(spouseBonusGross, spouseSSRemainingCap) * FICA_SS_RATE;
      const spouseMedOnBonus = spouseBonusGross * FICA_MED_RATE;
      const spouseCombinedMedBase = (medBaseBase * spouseShareOfIncome) + spouseBonusGross;
      const spouseAddlMedOnBonus = Math.max(0, spouseCombinedMedBase - addlThresholdBase) * ADDL_MED_RATE - Math.max(0, medBaseBase * spouseShareOfIncome - addlThresholdBase) * ADDL_MED_RATE;
      const spouseSDIOnBonus = spouseBonusGross * CA_SDI_RATE_2025;
      const spouseFedOnBonus = spouseBonusGross * fedMarginalOnly;
      const spouseCAOnBonus = spouseBonusGross * caMarginalOnly;
      const spouseTotalTaxOnBonus = spouseFedOnBonus + spouseCAOnBonus + spouseSSOnBonus + spouseMedOnBonus + spouseAddlMedOnBonus + spouseSDIOnBonus;
      const spouseNetBonus = spouseBonusGross - spouseTotalTaxOnBonus;
      
      spouseBonusEst = {
        bonusGross: spouseBonusGross,
        fedOnBonus: spouseFedOnBonus,
        caOnBonus: spouseCAOnBonus,
        ssOnBonus: spouseSSOnBonus,
        medOnBonus: spouseMedOnBonus,
        addlMedOnBonus: spouseAddlMedOnBonus,
        sdiOnBonus: spouseSDIOnBonus,
        totalTaxOnBonus: spouseTotalTaxOnBonus,
        netBonus: spouseNetBonus,
        fedMarginalPct: (fedMarginalOnly * 100).toFixed(1),
        caMarginalPct: (caMarginalOnly * 100).toFixed(1),
      };
    }

    return {
      gross,
      pretaxAnnual,
      fedAdjIncome,
      stdFed,
      fedTaxable,
      fedTax,
      stateAdjIncome,
      stdCA,
      caTaxable,
      caTax,
      ss,
      med,
      addlMed,
      sdi,
      totalTax,
      netAnnual,
      periods,
      per,
      matchAnnual,
      spouseMatchAnnual,
      suggestedOrdinaryRate,
      baseOnly,
      bonusEst,
      spouseOnly,
      spouseBonusEst,
    };
  }, [
    usBaseIncome,
    usBonus,
    use401kPercent,
    k401EmployeePct,
    k401Employee,
    k401MatchPct,
    healthSemiMonthly,
    otherSemiMonthly,
    filingStatus,
    payFreq,
    spouseBaseIncome,
    spouseBonus,
    spouseUse401kPercent,
    spouseK401EmployeePct,
    spouseK401Employee,
    spouseK401MatchPct,
    spouseHealthSemiMonthly,
    spouseOtherSemiMonthly,
    // spousePayFreq removed
  ]);

  // ====== MAIN CALCS (ESOP INDIA) ======
  const calculationsIndia = useMemo(() => {
    const standardDeduction = fyPolicy.standardDeduction ?? 75000;
    const totalDeductions = standardDeduction;

    const perquisite = tranches.reduce((sum, t) => {
      const spread = Math.max(0, fmvExercise - (Number.isFinite(t.exercisePrice) ? t.exercisePrice : 0));
      const shares = Number.isFinite(t.numShares) ? t.numShares : 0;
      return sum + spread * shares;
    }, 0);

    const baseOtherIncome = Math.max(0, (Number.isFinite(otherIncome) ? otherIncome : 0));
    const incomeBefore = Math.max(0, baseOtherIncome - totalDeductions);
    const incomeAfter = Math.max(0, baseOtherIncome + perquisite - totalDeductions);

    const indiaTaxBefore = indiaTotalTaxFromIncome(incomeBefore);
    const indiaTaxAfter = indiaTotalTaxFromIncome(incomeAfter);
    const totalPerquisiteTax = Math.max(0, indiaTaxAfter - indiaTaxBefore);

    const surchargeRatePerq = getSurchargeRate(incomeAfter);

    let capitalGain = 0;
    if (planToExercise && totalShares > 0) {
      capitalGain = (fmvSale - fmvExercise) * totalShares;
    }

    const listedSTCGrate = fyPolicy.listedSTCG;
    const listedLTCGrate = fyPolicy.listedLTCG;
    const ltcgExemption = fyPolicy.ltcgExemption;
    const isNewTaxPolicy = !!fyPolicy.isNewPolicy;

    let capitalGainTax = 0;
    if (planToExercise && capitalGain > 0) {
      if (isListed) {
        if (holdMonths <= 12) {
          const baseSTCG = capitalGain * listedSTCGrate;
          const surchargeRateCG = capSurchargeForListedCG(getSurchargeRate(incomeAfter + capitalGain));
          capitalGainTax = baseSTCG + baseSTCG * surchargeRateCG + applyCess(baseSTCG + baseSTCG * surchargeRateCG);
        } else {
          const taxableGain = Math.max(0, capitalGain - ltcgExemption);
          const baseLTCG = taxableGain * listedLTCGrate;
          const surchargeRateCG = capSurchargeForListedCG(getSurchargeRate(incomeAfter + capitalGain));
          capitalGainTax = baseLTCG + baseLTCG * surchargeRateCG + applyCess(baseLTCG + baseLTCG * surchargeRateCG);
        }
      } else {
        if (holdMonths <= 24) {
          const taxWithCG = indiaTotalTaxFromIncome(incomeAfter + capitalGain);
          capitalGainTax = Math.max(0, taxWithCG - indiaTotalTaxFromIncome(incomeAfter));
        } else {
          const baseLTCG = capitalGain * 0.20;
          const surchargeRateCG = getSurchargeRate(incomeAfter + capitalGain);
          capitalGainTax = baseLTCG + baseLTCG * surchargeRateCG + applyCess(baseLTCG + baseLTCG * surchargeRateCG);
        }
      }
    }

    const exerciseCost = tranches.reduce(
      (sum, t) => sum + ((Number.isFinite(t.exercisePrice) ? t.exercisePrice : 0) * (Number.isFinite(t.numShares) ? t.numShares : 0)),
      0
    );

    const totalTax = totalPerquisiteTax + capitalGainTax;
    const totalCostToExercise = exerciseCost + totalTax; // NEW: Total Cost to Exercise
    const totalOutflow = totalCostToExercise;

    const grossProceeds = planToExercise ? (fmvSale * totalShares) : 0;
    const netAfterTax = planToExercise ? (grossProceeds - totalOutflow) : 0;

    const effectiveTaxRate = planToExercise && grossProceeds > 0 ? (totalTax / grossProceeds) * 100 : 0;

    return {
      perquisite,
      totalPerquisiteTax,
      surchargeRatePerq: surchargeRatePerq * 100,
      capitalGain,
      capitalGainTax,
      exerciseCost,
      totalTax,
      totalCostToExercise, // NEW
      totalOutflow,
      grossProceeds,
      netAfterTax,
      effectiveTaxRate,
      totalShares,
      weightedAvgExercisePrice,
      stcgRate: listedSTCGrate * 100,
      ltcgRate: listedLTCGrate * 100,
      ltcgExemption,
      isNewTaxPolicy
    };
  }, [
    tranches,
    fmvExercise,
    fmvSale,
    saleDate,
    holdMonths,
    isListed,
    otherIncome,
    planToExercise,
    totalShares,
    financialYear
  ]);

  // ====== MAIN CALCS (ESOP US) ======
  const calculationsUS = useMemo(() => {
    // Convert INR to USD
    const exercisePriceUSD = usExercisePriceINR / fxRate;
    const fmvExerciseUSD = usFmvExerciseINR / fxRate;
    const fmvSaleUSD = usFmvSaleINR / fxRate;

    // Get income data (either from Income Tax tab or manual)
    const baseSalary = usUseIncomeTaxData ? (Number(usBaseIncome) || 0) : (Number(usManualBaseSalary) || 0);
    const bonus = usUseIncomeTaxData ? (Number(usBonus) || 0) : (Number(usManualBonus) || 0);
    const k401 = usUseIncomeTaxData ? k401Employee : (Number(usManual401k) || 0);
    const health = usUseIncomeTaxData ? ((Number(healthSemiMonthly) || 0) * 24) : (Number(usManualHealth) || 0);
    const other = usUseIncomeTaxData ? ((Number(otherSemiMonthly) || 0) * 24) : (Number(usManualOther) || 0);

    // Calculate perquisite in USD
    const perquisitePerShare = Math.max(0, fmvExerciseUSD - exercisePriceUSD);
    const perquisiteUSD = perquisitePerShare * totalShares;

    // Base income (without ESOP perquisite)
    const baseGrossIncome = baseSalary + bonus;
    const basePretax = k401 + health + other;
    const baseFedAdjIncome = Math.max(0, baseGrossIncome - basePretax);
    const baseStateAdjIncome = Math.max(0, baseGrossIncome - basePretax);

    // Calculate tax on base income (without perquisite)
    const stdFed = FED_STD_DED[filingStatus] ?? 0;
    const stdCA = CA_STD_DED[filingStatus] ?? 0;
    const baseFedTaxable = Math.max(0, baseFedAdjIncome - stdFed);
    const baseCaTaxable = Math.max(0, baseStateAdjIncome - stdCA);
    const baseFedTax = progressiveTax(baseFedTaxable, FED_BRACKETS[filingStatus]);
    const baseCaTax = progressiveTax(baseCaTaxable, CA_BRACKETS[filingStatus]);
    
    // Calculate FICA on base income
    const baseFicaBase = Math.max(0, baseGrossIncome - (health + other));
    const baseSSTaxable = Math.min(baseFicaBase, FICA_SS_WAGE_BASE_2025);
    const baseSS = baseSSTaxable * FICA_SS_RATE;
    const baseMedBase = baseFicaBase;
    const baseMed = baseMedBase * FICA_MED_RATE;
    const addlThreshold = filingStatus === 'MFJ' ? ADDL_MED_THRESH_MFJ : ADDL_MED_THRESH_SINGLE;
    const baseAddlMed = Math.max(0, baseMedBase - addlThreshold) * ADDL_MED_RATE;
    const baseSDI = baseGrossIncome * CA_SDI_RATE_2025;
    
    const baseTotalTax = baseFedTax + baseCaTax + baseSS + baseMed + baseAddlMed + baseSDI;

    // Income including perquisite
    const totalGrossIncome = baseGrossIncome + perquisiteUSD;
    const totalPretax = basePretax; // 401k, health, other don't apply to ESOP perquisite
    const totalFedAdjIncome = Math.max(0, totalGrossIncome - totalPretax);
    const totalStateAdjIncome = Math.max(0, totalGrossIncome - totalPretax);
    
    // Calculate tax with perquisite
    const totalFedTaxable = Math.max(0, totalFedAdjIncome - stdFed);
    const totalCaTaxable = Math.max(0, totalStateAdjIncome - stdCA);
    const totalFedTax = progressiveTax(totalFedTaxable, FED_BRACKETS[filingStatus]);
    const totalCaTax = progressiveTax(totalCaTaxable, CA_BRACKETS[filingStatus]);
    
    // FICA on total (including perquisite)
    const totalFicaBase = Math.max(0, totalGrossIncome - (health + other));
    const totalSSTaxable = Math.min(totalFicaBase, FICA_SS_WAGE_BASE_2025);
    const totalSS = totalSSTaxable * FICA_SS_RATE;
    const totalMedBase = totalFicaBase;
    const totalMed = totalMedBase * FICA_MED_RATE;
    const totalAddlMed = Math.max(0, totalMedBase - addlThreshold) * ADDL_MED_RATE;
    const totalSDI = totalGrossIncome * CA_SDI_RATE_2025;
    
    const totalTaxWithPerquisite = totalFedTax + totalCaTax + totalSS + totalMed + totalAddlMed + totalSDI;

    // Marginal tax due to perquisite
    const marginalTaxFromPerquisite = Math.max(0, totalTaxWithPerquisite - baseTotalTax);

    // Capital gains
    let capitalGainUSD = 0;
    let capitalGainTax = 0;
    
    if (planToExercise && totalShares > 0) {
      capitalGainUSD = (fmvSaleUSD - fmvExerciseUSD) * totalShares;
      
      if (capitalGainUSD > 0) {
        // Long-term or short-term based on holding period
        if (holdMonths > 12) {
          // Long-term capital gains
          capitalGainTax = capitalGainUSD * (Number(usCGRate) / 100);
        } else {
          // Short-term capital gains (taxed as ordinary income)
          const cgFedTaxable = totalFedTaxable + capitalGainUSD;
          const cgCaTaxable = totalCaTaxable + capitalGainUSD;
          const cgFedTax = progressiveTax(cgFedTaxable, FED_BRACKETS[filingStatus]);
          const cgCaTax = progressiveTax(cgCaTaxable, CA_BRACKETS[filingStatus]);
          capitalGainTax = (cgFedTax - totalFedTax) + (cgCaTax - totalCaTax);
        }

        // Add NIIT if applicable
        if (includeNIIT && capitalGainUSD > 0) {
          const magiApprox = totalFedAdjIncome + capitalGainUSD;
          const niitThreshold = filingStatus === 'MFJ' ? 250000 : 200000;
          const niitBase = Math.max(0, Math.min(capitalGainUSD, magiApprox - niitThreshold));
          const niit = 0.038 * niitBase;
          capitalGainTax += niit;
        }
      }
    }

    const exerciseCostUSD = exercisePriceUSD * totalShares;
    const totalTaxUSD = marginalTaxFromPerquisite + capitalGainTax;
    const totalCostToExerciseUSD = exerciseCostUSD + totalTaxUSD;
    const grossProceedsUSD = planToExercise ? (fmvSaleUSD * totalShares) : 0;
    const netAfterTaxUSD = planToExercise ? (grossProceedsUSD - totalCostToExerciseUSD) : 0;
    const effectiveTaxRateUS = planToExercise && grossProceedsUSD > 0 ? (totalTaxUSD / grossProceedsUSD) * 100 : 0;

    return {
      exercisePriceUSD,
      fmvExerciseUSD,
      fmvSaleUSD,
      perquisiteUSD,
      baseSalary,
      bonus,
      baseGrossIncome,
      baseTotalTax,
      totalGrossIncome,
      totalTaxWithPerquisite,
      marginalTaxFromPerquisite,
      capitalGainUSD,
      capitalGainTax,
      exerciseCostUSD,
      totalTaxUSD,
      totalCostToExerciseUSD,
      grossProceedsUSD,
      netAfterTaxUSD,
      effectiveTaxRateUS,
      totalShares,
      weightedAvgExercisePriceUSD: totalShares > 0 ? (tranches.reduce((sum, t) => sum + (t.numShares * (t.exercisePrice / fxRate)), 0) / totalShares) : 0
    };
  }, [
    tranches,
    usExercisePriceINR,
    usFmvExerciseINR,
    usFmvSaleINR,
    fxRate,
    usUseIncomeTaxData,
    usManualBaseSalary,
    usManualBonus,
    usManual401k,
    usManualHealth,
    usManualOther,
    usBaseIncome,
    usBonus,
    k401Employee,
    healthSemiMonthly,
    otherSemiMonthly,
    filingStatus,
    planToExercise,
    holdMonths,
    usCGRate,
    includeNIIT,
    totalShares
  ]);

  // ====== COPY/EXPORT (ESOP) ======
  const buildResultsSnapshot = () => ({
    timestamp: new Date().toISOString(),
    inputs: {
      activeTab,
      ...(activeTab === 'esop-india' ? {
        financialYear,
        isListed,
        planToExercise,
        fmvExercise,
        fmvSale,
        exerciseDate,
        saleDate,
        otherIncome,
        tranches: tranches.map(t => ({ id: t.id, numShares: t.numShares, exercisePrice: t.exercisePrice }))
      } : {}),
      ...(activeTab === 'esop-us' ? {
        usExercisePriceINR,
        usFmvExerciseINR,
        usFmvSaleINR,
        fxRate,
        usUseIncomeTaxData,
        usManualBaseSalary,
        usManualBonus,
        usManual401k,
        usManualHealth,
        usManualOther,
        tranches: tranches.map(t => ({ id: t.id, numShares: t.numShares, exercisePrice: t.exercisePrice }))
      } : {})
    },
    outputs: activeTab === 'esop-india' ? calculationsIndia : (activeTab === 'esop-us' ? calculationsUS : {})
  });

  const handleCopyJSON = async () => {
    try {
      const snapshot = buildResultsSnapshot();
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (e) {
      console.error('Copy failed:', e);
      alert('Copy failed. Check browser permissions.');
    }
  };

  const csvEscape = (v) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const handleDownloadCSV = () => {
    const rows = [];
    rows.push(['SECTION', 'KEY', 'VALUE']);
    rows.push(['Meta', 'Timestamp', new Date().toISOString()]);
    rows.push(['Meta', 'Active Tab', activeTab]);
    
    if (activeTab === 'esop-india') {
      rows.push(['Inputs', 'Financial Year', financialYear]);
      rows.push(['Inputs', 'Listed', isListed ? 'Yes' : 'No']);
      rows.push(['Inputs', 'Plan To Exercise', planToExercise ? 'Yes' : 'No']);
      rows.push(['Inputs', 'FMV at Exercise', fmvExercise]);
      rows.push(['Inputs', 'Sale Price/Expected FMV', fmvSale]);
      rows.push(['Inputs', 'Exercise Date', exerciseDate]);
      rows.push(['Inputs', 'Sale Date', saleDate]);
      rows.push(['Inputs', 'Other Income', otherIncome]);
      rows.push(['India', 'Perquisite', calculationsIndia.perquisite]);
      rows.push(['India', 'Perquisite Tax', calculationsIndia.totalPerquisiteTax]);
      rows.push(['India', 'Capital Gain', calculationsIndia.capitalGain]);
      rows.push(['India', 'Capital Gain Tax', calculationsIndia.capitalGainTax]);
      rows.push(['India', 'Exercise Cost', calculationsIndia.exerciseCost]);
      rows.push(['India', 'Total Tax', calculationsIndia.totalTax]);
      rows.push(['India', 'Total Cost to Exercise', calculationsIndia.totalCostToExercise]);
      rows.push(['India', 'Gross Proceeds', calculationsIndia.grossProceeds]);
      rows.push(['India', 'Net After Tax', calculationsIndia.netAfterTax]);
    } else if (activeTab === 'esop-us') {
      rows.push(['Inputs', 'Exercise Price (INR)', usExercisePriceINR]);
      rows.push(['Inputs', 'FMV at Exercise (INR)', usFmvExerciseINR]);
      rows.push(['Inputs', 'Sale Price (INR)', usFmvSaleINR]);
      rows.push(['Inputs', 'FX Rate', fxRate]);
      rows.push(['US', 'Perquisite (USD)', calculationsUS.perquisiteUSD]);
      rows.push(['US', 'Base Income', calculationsUS.baseGrossIncome]);
      rows.push(['US', 'Total Income with Perquisite', calculationsUS.totalGrossIncome]);
      rows.push(['US', 'Tax on Base Income', calculationsUS.baseTotalTax]);
      rows.push(['US', 'Marginal Tax from Perquisite', calculationsUS.marginalTaxFromPerquisite]);
      rows.push(['US', 'Capital Gain (USD)', calculationsUS.capitalGainUSD]);
      rows.push(['US', 'Capital Gain Tax', calculationsUS.capitalGainTax]);
      rows.push(['US', 'Exercise Cost (USD)', calculationsUS.exerciseCostUSD]);
      rows.push(['US', 'Total Tax', calculationsUS.totalTaxUSD]);
      rows.push(['US', 'Total Cost to Exercise (USD)', calculationsUS.totalCostToExerciseUSD]);
      rows.push(['US', 'Gross Proceeds (USD)', calculationsUS.grossProceedsUSD]);
      rows.push(['US', 'Net After Tax (USD)', calculationsUS.netAfterTaxUSD]);
    }

    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `${activeTab}_results_${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setJustExported(true);
    setTimeout(() => setJustExported(false), 1500);
  };

  // ====== RENDER ======
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="w-full max-w-[1600px] mx-auto flex">
        {/* ===== SIDEBAR ===== */}
        <aside className="w-72 flex-shrink-0 border-r border-gray-200 bg-white/90 backdrop-blur-xl sticky top-0 h-screen overflow-y-auto shadow-xl">
          <div className="p-6 space-y-6">
            {/* Logo/Header */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur opacity-50"></div>
                <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl">
                  <Calculator className="text-white" size={24} />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Finance Planner</h1>
                <p className="text-xs text-gray-500">Tax & ESOP Calculator</p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

            {/* Main Navigation - 3 separate tabs */}
            <nav className="space-y-2">
              <button
                onClick={() => { setActiveTab('esop-india'); setShowResults(false); }}
                className={`w-full group relative overflow-hidden rounded-xl py-3.5 px-4 text-left font-semibold transition-all duration-300 ${
                  activeTab === 'esop-india'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow'
                }`}
              >
                <span className="relative z-10 flex items-center gap-3">
                  <span className="text-xl">🇮🇳</span>
                  ESOP IN Calc
                </span>
              </button>
              
              <button
                onClick={() => { setActiveTab('esop-us'); setShowResults(false); }}
                className={`w-full group relative overflow-hidden rounded-xl py-3.5 px-4 text-left font-semibold transition-all duration-300 ${
                  activeTab === 'esop-us'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow'
                }`}
              >
                <span className="relative z-10 flex items-center gap-3">
                  <span className="text-xl">🇺🇸</span>
                  ESOP US Calc
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('income-tax')}
                className={`w-full group relative overflow-hidden rounded-xl py-3.5 px-4 text-left font-semibold transition-all duration-300 ${
                  activeTab === 'income-tax'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/50'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow'
                }`}
              >
                <span className="relative z-10 flex items-center gap-3">
                  <DollarSign size={18} />
                  Income Tax Calc
                </span>
              </button>
            </nav>

            {/* Quick Info Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wider">Current View</span>
              </div>
              <p className="text-sm font-bold text-indigo-700">
                {activeTab === 'esop-india' && '🇮🇳 ESOP IN Calc'}
                {activeTab === 'esop-us' && '🇺🇸 ESOP US Calc'}
                {activeTab === 'income-tax' && 'Income Tax Calc'}
              </p>
              <p className="text-xs text-indigo-600 mt-1 font-medium">
                {activeTab === 'esop-india' && 'Currency: ₹ INR'}
                {activeTab === 'esop-us' && 'Currency: $ USD (from ₹ INR)'}
                {activeTab === 'income-tax' && 'Currency: $ USD'}
              </p>
            </div>
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="flex-1 p-6 space-y-6">
          {/* Page Header */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-1">
                  {activeTab === 'esop-india' && '🇮🇳 ESOP IN Calculator'}
                  {activeTab === 'esop-us' && '🇺🇸 ESOP US Calculator'}
                  {activeTab === 'income-tax' && 'Income Tax Calculator'}
                </h2>
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  {activeTab === 'esop-india' && 'India ESOP Tax Planning (₹ INR)'}
                  {activeTab === 'esop-us' && 'US ESOP Tax Planning ($ USD converted from ₹ INR)'}
                  {activeTab === 'income-tax' && 'Federal & California Tax Estimator ($ USD)'}
                </p>
              </div>
            </div>
          </div>

          {/* TAB CONTENT */}
          {activeTab === 'esop-india' ? (
            <div className="space-y-6">
              {/* Input Cards Row */}
              <div className="grid grid-cols-2 gap-6">
                {/* ESOP Grants Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                        ESOP Grants
                      </h3>
                      <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">₹ INR</span>
                    </div>
                    <button
                      onClick={addTranche}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm font-medium"
                    >
                      <Plus size={16} />
                      Add Grant
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    {tranches.map((tranche, index) => (
                      <div key={tranche.id} className="bg-gradient-to-br from-gray-50 to-blue-50/50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide bg-indigo-50 px-2 py-1 rounded">
                            Grant {index + 1}
                          </span>
                          {tranches.length > 1 && (
                            <button
                              onClick={() => removeTranche(tranche.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Shares"
                            value={tranche.numShares}
                            onChange={(e) => updateTranche(tranche.id, 'numShares', e.target.value)}
                            placeholder="0"
                          />
                          <InputField
                            label="Exercise Price"
                            value={tranche.exercisePrice}
                            onChange={(e) => updateTranche(tranche.id, 'exercisePrice', e.target.value)}
                            prefix="₹"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                          Exercise cost: <span className="font-semibold">
                            {formatLargeNumber((tranche.numShares || 0) * (tranche.exercisePrice || 0))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="mt-4 pt-4 border-t border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Shares</p>
                        <p className="text-lg font-bold text-gray-800">{totalShares.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Exercise Cost</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {formatLargeNumber(tranches.reduce((s, t) => s + (t.numShares || 0) * (t.exercisePrice || 0), 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Income, Valuation & Timeline Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                      Income, Valuation & Timeline
                    </h3>
                    <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">₹ INR</span>
                  </div>

                  {/* Plan to Exercise Toggle */}
                  <div className="mb-5 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 hover:border-purple-300 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={planToExercise}
                        onChange={(e) => setPlanToExercise(e.target.checked)}
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-gray-800 block group-hover:text-purple-700 transition-colors">
                          I plan to exercise and sell my options
                        </span>
                        <p className="text-xs text-gray-600 mt-1">
                          {planToExercise ? "We'll calculate your complete tax liability" : "We'll show only exercise costs"}
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-4">
                    {/* Other Annual Income */}
                    <InputField
                      label="Other Annual Income"
                      value={otherIncome}
                      onChange={(e) => setOtherIncome(Number(e.target.value))}
                      prefix="₹"
                      tooltip="Your other taxable income for the year"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      {/* FMV at Exercise with USD conversion */}
                      <div className="space-y-1.5">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                          FMV at Exercise
                          <InfoTooltip text="Fair Market Value when you exercise your options" />
                        </label>
                        <div className="relative group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">₹</span>
                          <input
                            type="number"
                            value={fmvExercise}
                            onChange={(e) => setFmvExercise(Number(e.target.value))}
                            className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white hover:border-gray-300 hover:shadow-sm transition-all duration-200 text-sm font-medium shadow-sm"
                            placeholder="0"
                          />
                        </div>
                        <p className="text-xs text-gray-600">USD: {fmtUSD0(fmvExercise / fxRate)}</p>
                      </div>

                      {/* Sale Price with USD conversion */}
                      {planToExercise && (
                        <div className="space-y-1.5">
                          <label className="flex items-center text-sm font-medium text-gray-700">
                            Sale Price / Expected FMV
                            <InfoTooltip text="Expected price when selling your shares" />
                          </label>
                          <div className="relative group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">₹</span>
                            <input
                              type="number"
                              value={fmvSale}
                              onChange={(e) => setFmvSale(Number(e.target.value))}
                              className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white hover:border-gray-300 hover:shadow-sm transition-all duration-200 text-sm font-medium shadow-sm"
                              placeholder="0"
                            />
                          </div>
                          <p className="text-xs text-gray-600">USD: {fmtUSD0(fmvSale / fxRate)}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                          Exercise Date
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                          <input
                            type="date"
                            value={exerciseDate}
                            onChange={(e) => setExerciseDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:border-gray-300 transition-all text-sm"
                          />
                        </div>
                      </div>

                      {planToExercise && (
                        <div className="space-y-1.5">
                          <label className="flex items-center text-sm font-medium text-gray-700">
                            Sale Date (Expected)
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            <input
                              type="date"
                              value={saleDate}
                              onChange={(e) => setSaleDate(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:border-gray-300 transition-all text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Holding Period Display */}
                    {planToExercise && (
                      <div className="pt-3">
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Holding Period</span>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-indigo-600">{holdMonths} months</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {isListed
                                  ? holdMonths <= 12
                                    ? `STCG @ ${(fyPolicy.listedSTCG * 100).toFixed(1)}%`
                                    : `LTCG @ ${(fyPolicy.listedLTCG * 100).toFixed(1)}%`
                                  : holdMonths <= 24 ? "STCG @ Slab" : "LTCG @ 20%"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Parameters */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                    Additional Parameters
                  </h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">₹ INR</span>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Financial Year - uniform height */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Financial Year</label>
                      <select
                        value={financialYear}
                        onChange={(e) => setFinancialYear(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:border-gray-300 transition-all text-sm h-[42px]"
                      >
                        <option value="2025-26">FY 2025-26</option>
                        <option value="2024-25">FY 2024-25</option>
                        <option value="2026-27">FY 2026-27</option>
                      </select>
                    </div>

                    {/* Shares Listed Toggle - uniform height */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Shares Listed?</label>
                      <button
                        type="button"
                        onClick={() => setIsListed(v => !v)}
                        className={`w-full h-[42px] px-4 rounded-lg border flex items-center justify-between text-sm transition-all ${
                          isListed 
                            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 text-indigo-800 shadow-sm' 
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="font-medium">{isListed ? 'Yes (Listed)' : 'No (Unlisted)'}</span>
                        <div className={`relative w-11 h-6 rounded-full transition-colors ${isListed ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                          <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${isListed ? 'translate-x-5' : ''}`}></div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleCalculate}
                    className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3"
                  >
                    <Calculator size={20} />
                    Calculate Tax Liability
                  </button>
                </div>
              </div>

              {/* Results Section */}
              {showResults && (
                <div className="space-y-6 animate-fade-in">
                  {/* Results Header with Actions */}
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 border border-gray-100">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">Tax Calculation Results</h3>
                          <p className="text-xs text-gray-500 mt-0.5">All amounts in ₹ INR</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyJSON}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            justCopied
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {justCopied ? <Check size={16} /> : <Copy size={16} />}
                          {justCopied ? 'Copied!' : 'Copy JSON'}
                        </button>
                        <button
                          onClick={handleDownloadCSV}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            justExported
                              ? 'bg-green-600 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {justExported ? <Check size={16} /> : <Download size={16} />}
                          {justExported ? 'Exported!' : 'Export CSV'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stat Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      icon={TrendingUp}
                      title="Total Shares"
                      value={totalShares.toLocaleString('en-US')}
                      gradient="from-blue-500 to-blue-600"
                    />
                    <StatCard
                      icon={DollarSign}
                      title="Avg Exercise Price"
                      value={`₹${weightedAvgExercisePrice.toFixed(2)}`}
                      gradient="from-purple-500 to-purple-600"
                    />
                    <StatCard
                      icon={Calculator}
                      title="Holding Period"
                      value={`${holdMonths} months`}
                      subtitle={holdMonths <= (isListed ? 12 : 24) ? 'Short Term' : 'Long Term'}
                      gradient="from-indigo-500 to-indigo-600"
                    />
                    <StatCard
                      icon={TrendingUp}
                      title="Effective Tax Rate"
                      value={`${calculationsIndia.effectiveTaxRate.toFixed(2)}%`}
                      gradient="from-pink-500 to-pink-600"
                    />
                  </div>

                  {/* Detailed Results Grid */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Perquisite Tax */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg">
                          <TrendingUp size={20} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">Perquisite Tax</h4>
                          <p className="text-xs text-gray-500">At Exercise - India</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">Perquisite Value</span>
                          <span className="font-bold text-gray-800">{formatLargeNumber(calculationsIndia.perquisite)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">Surcharge Rate</span>
                          <span className="font-semibold text-indigo-600">{calculationsIndia.surchargeRatePerq.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-200 mt-4">
                          <span className="font-bold text-gray-800">Total Tax</span>
                          <span className="text-xl font-bold text-orange-600">{formatLargeNumber(calculationsIndia.totalPerquisiteTax)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Capital Gains Tax */}
                    {planToExercise ? (
                      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                            <DollarSign size={20} className="text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800">Capital Gains Tax</h4>
                            <p className="text-xs text-gray-500">At Sale - India</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Capital Gain</span>
                            <span className="font-bold text-gray-800">{formatLargeNumber(calculationsIndia.capitalGain)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Tax Type</span>
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                              {isListed
                                ? holdMonths <= 12
                                  ? `STCG @ ${calculationsIndia.stcgRate.toFixed(1)}%`
                                  : `LTCG @ ${calculationsIndia.ltcgRate.toFixed(2)}%`
                                : holdMonths <= 24 ? "STCG @ Slab" : "LTCG @ 20%"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 mt-4">
                            <span className="font-bold text-gray-800">Total Tax</span>
                            <span className="text-xl font-bold text-green-600">{formatLargeNumber(calculationsIndia.capitalGainTax)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-2xl shadow-lg p-6 border border-gray-200 flex items-center justify-center">
                        <div className="text-center">
                          <Info size={32} className="text-gray-400 mx-auto mb-3" />
                          <h4 className="font-bold text-gray-700 mb-1">Capital Gains Tax</h4>
                          <p className="text-sm text-gray-500">Enable "I plan to exercise and sell…" to see CG tax</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Final Summary Card */}
                  <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-10 bg-white rounded-full"></div>
                      <h3 className="text-2xl font-bold">Financial Summary</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <p className="text-sm text-indigo-200 mb-1">Exercise Cost</p>
                        <p className="text-2xl font-bold">{formatLargeNumber(calculationsIndia.exerciseCost)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-indigo-200 mb-1">Total Tax</p>
                        <p className="text-2xl font-bold">{formatLargeNumber(calculationsIndia.totalTax)}</p>
                      </div>
                    </div>
                    
                    {/* NEW: Total Cost to Exercise */}
                    <div className="bg-white/10 rounded-xl p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-indigo-100">Total Cost to Exercise</span>
                        <span className="text-2xl font-bold">{formatLargeNumber(calculationsIndia.totalCostToExercise)}</span>
                      </div>
                      <p className="text-xs text-indigo-200 mt-2">Exercise Cost + Total Tax</p>
                    </div>
                    
                    {planToExercise && (
                      <>
                        <div className="h-px bg-white/30 mb-6"></div>
                        <div className="bg-white rounded-2xl p-6 text-gray-900 shadow-xl">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Gross Proceeds</p>
                              <p className="text-lg font-semibold text-gray-700">{formatLargeNumber(calculationsIndia.grossProceeds)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600 mb-1">Effective Tax Rate</p>
                              <p className="text-lg font-bold text-indigo-600">{calculationsIndia.effectiveTaxRate.toFixed(2)}%</p>
                            </div>
                          </div>
                          <div className="h-px bg-gray-200 my-4"></div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-800">Net After-Tax Value</span>
                            <span className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                              {formatLargeNumber(calculationsIndia.netAfterTax)}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'esop-us' ? (
            <div className="space-y-6">
              {/* US ESOP Calculator Content */}
              <div className="grid grid-cols-2 gap-6">
                {/* ESOP Grants Card (Same as India) */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex justify-between items-center mb-5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                        ESOP Grants
                      </h3>
                      <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Shares</span>
                    </div>
                    <button
                      onClick={addTranche}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 text-sm font-medium"
                    >
                      <Plus size={16} />
                      Add Grant
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar mb-4">
                    {tranches.map((tranche, index) => (
                      <div key={tranche.id} className="bg-gradient-to-br from-gray-50 to-blue-50/50 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide bg-indigo-50 px-2 py-1 rounded">
                            Grant {index + 1}
                          </span>
                          {tranches.length > 1 && (
                            <button
                              onClick={() => removeTranche(tranche.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Shares"
                            value={tranche.numShares}
                            onChange={(e) => updateTranche(tranche.id, 'numShares', e.target.value)}
                            placeholder="0"
                          />
                          <InputField
                            label="Exercise Price (₹)"
                            value={tranche.exercisePrice}
                            onChange={(e) => updateTranche(tranche.id, 'exercisePrice', e.target.value)}
                            prefix="₹"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                          Exercise cost: <span className="font-semibold">
                            ₹{((tranche.numShares || 0) * (tranche.exercisePrice || 0)).toLocaleString('en-IN')} 
                            ({fmtUSD0(((tranche.numShares || 0) * (tranche.exercisePrice || 0)) / fxRate)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Total Shares</p>
                        <p className="text-lg font-bold text-gray-800">{totalShares.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Avg Exercise (USD)</p>
                        <p className="text-lg font-bold text-indigo-600">
                          {fmtUSD0(calculationsUS.weightedAvgExercisePriceUSD)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Valuation & Currency Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                      Valuation & Currency
                    </h3>
                    <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">₹ → $</span>
                  </div>

                  {/* Plan to Exercise Toggle */}
                  <div className="mb-5 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 hover:border-purple-300 transition-colors">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={planToExercise}
                        onChange={(e) => setPlanToExercise(e.target.checked)}
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-gray-800 block group-hover:text-purple-700 transition-colors">
                          I plan to exercise and sell my options
                        </span>
                        <p className="text-xs text-gray-600 mt-1">
                          {planToExercise ? "We'll calculate your complete tax liability" : "We'll show only exercise costs"}
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="space-y-4">
                    {/* FX Rate */}
                    <InputField
                      label="FX Rate (₹/$)"
                      value={fxRate}
                      onChange={(e) => setFxRate(Number(e.target.value))}
                      tooltip="INR to USD exchange rate"
                    />

                    {/* FMV at Exercise - show both INR and USD side by side */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                          FMV at Exercise (INR)
                          <InfoTooltip text="Fair Market Value when you exercise your options" />
                        </label>
                        <div className="relative group">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">₹</span>
                          <input
                            type="number"
                            value={usFmvExerciseINR}
                            onChange={(e) => setUsFmvExerciseINR(Number(e.target.value))}
                            className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:border-gray-300 transition-all text-sm"
                            placeholder="0"
                          />
                        </div>
                        <p className="text-xs text-gray-600">USD: {fmtUSD0(usFmvExerciseINR / fxRate)}</p>
                      </div>

                      {planToExercise && (
                        <div className="space-y-1.5">
                          <label className="flex items-center text-sm font-medium text-gray-700">
                            Sale Price / Expected FMV (INR)
                            <InfoTooltip text="Expected price when selling your shares" />
                          </label>
                          <div className="relative group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium pointer-events-none">₹</span>
                            <input
                              type="number"
                              value={usFmvSaleINR}
                              onChange={(e) => setUsFmvSaleINR(Number(e.target.value))}
                              className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:border-gray-300 transition-all text-sm"
                              placeholder="0"
                            />
                          </div>
                          <p className="text-xs text-gray-600">USD: {fmtUSD0(usFmvSaleINR / fxRate)}</p>
                        </div>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="flex items-center text-sm font-medium text-gray-700">Exercise Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                          <input
                            type="date"
                            value={exerciseDate}
                            onChange={(e) => setExerciseDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:border-gray-300 transition-all text-sm"
                          />
                        </div>
                      </div>

                      {planToExercise && (
                        <div className="space-y-1.5">
                          <label className="flex items-center text-sm font-medium text-gray-700">Sale Date (Expected)</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            <input
                              type="date"
                              value={saleDate}
                              onChange={(e) => setSaleDate(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:border-gray-300 transition-all text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Holding Period Display */}
                    {planToExercise && (
                      <div className="pt-3">
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Holding Period</span>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-indigo-600">{holdMonths} months</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {holdMonths > 12 ? `US LTCG @ ${usCGRate}%` : 'US STCG @ ordinary rate'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CG Rate */}
                    {planToExercise && holdMonths > 12 && (
                      <InputField
                        label="CG Rate (%)"
                        value={usCGRate}
                        onChange={(e) => setUsCGRate(Number(e.target.value))}
                        suffix="%"
                        tooltip="Long-term capital gains tax rate"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Income Integration Card */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                    Income Integration
                  </h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">$ USD</span>
                </div>

                <div className="space-y-6">
                  {/* Toggle for data source */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={usUseIncomeTaxData}
                        onChange={(e) => setUsUseIncomeTaxData(e.target.checked)}
                        className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-bold text-gray-800 block group-hover:text-purple-700 transition-colors">
                          Use data from Income Tax Calculator
                        </span>
                        <p className="text-xs text-gray-600 mt-1">
                          {usUseIncomeTaxData 
                            ? "Using salary, bonus, and deductions from Income Tax tab" 
                            : "Enter income details manually below"}
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Manual inputs (shown when toggle is off) */}
                  {!usUseIncomeTaxData && (
                    <div className="grid grid-cols-3 gap-6 p-4 bg-gray-50 rounded-xl">
                      <InputField
                        label="US Base Salary"
                        value={usManualBaseSalary}
                        onChange={(e) => setUsManualBaseSalary(Number(e.target.value))}
                        prefix="$"
                        tooltip="Your annual base salary"
                      />
                      <InputField
                        label="US Bonus"
                        value={usManualBonus}
                        onChange={(e) => setUsManualBonus(Number(e.target.value))}
                        prefix="$"
                        tooltip="Annual bonus amount"
                      />
                      <InputField
                        label="401(k) Annual"
                        value={usManual401k}
                        onChange={(e) => setUsManual401k(Number(e.target.value))}
                        prefix="$"
                        tooltip="Annual 401(k) contribution"
                      />
                      <InputField
                        label="Health (Annual)"
                        value={usManualHealth}
                        onChange={(e) => setUsManualHealth(Number(e.target.value))}
                        prefix="$"
                        tooltip="Annual health insurance deduction"
                      />
                      <InputField
                        label="Other Deductions (Annual)"
                        value={usManualOther}
                        onChange={(e) => setUsManualOther(Number(e.target.value))}
                        prefix="$"
                        tooltip="Other annual pre-tax deductions"
                      />
                    </div>
                  )}

                  {/* Income Summary */}
                  <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                    <h4 className="text-sm font-semibold text-indigo-900 mb-3">Income Summary (for tax calculation)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 mb-1">Base Salary</p>
                        <p className="font-bold text-gray-800">
                          {fmtUSD0(usUseIncomeTaxData ? usBaseIncome : usManualBaseSalary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Bonus</p>
                        <p className="font-bold text-gray-800">
                          {fmtUSD0(usUseIncomeTaxData ? usBonus : usManualBonus)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">ESOP Perquisite</p>
                        <p className="font-bold text-indigo-600">{fmtUSD0(calculationsUS.perquisiteUSD)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Total Income</p>
                        <p className="font-bold text-purple-600">{fmtUSD0(calculationsUS.totalGrossIncome)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tax Options */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeNIIT}
                        onChange={(e) => setIncludeNIIT(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 font-medium">Include NIIT (3.8%)</span>
                    </label>
                  </div>

                  <button
                    onClick={handleCalculate}
                    className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3"
                  >
                    <Calculator size={20} />
                    Calculate Tax Liability
                  </button>
                </div>
              </div>

              {/* US Results Section */}
              {showResults && (
                <div className="space-y-6 animate-fade-in">
                  {/* Results Header */}
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-5 border border-gray-100">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">Tax Calculation Results</h3>
                          <p className="text-xs text-gray-500 mt-0.5">All amounts in $ USD</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyJSON}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            justCopied ? 'bg-green-100 text-green-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          {justCopied ? <Check size={16} /> : <Copy size={16} />}
                          {justCopied ? 'Copied!' : 'Copy JSON'}
                        </button>
                        <button
                          onClick={handleDownloadCSV}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                            justExported ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {justExported ? <Check size={16} /> : <Download size={16} />}
                          {justExported ? 'Exported!' : 'Export CSV'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      icon={TrendingUp}
                      title="Total Shares"
                      value={totalShares.toLocaleString('en-US')}
                      gradient="from-blue-500 to-blue-600"
                    />
                    <StatCard
                      icon={DollarSign}
                      title="ESOP Perquisite"
                      value={fmtUSD0(calculationsUS.perquisiteUSD)}
                      gradient="from-purple-500 to-purple-600"
                    />
                    <StatCard
                      icon={Calculator}
                      title="Holding Period"
                      value={`${holdMonths} months`}
                      subtitle={holdMonths > 12 ? 'Long Term' : 'Short Term'}
                      gradient="from-indigo-500 to-indigo-600"
                    />
                    <StatCard
                      icon={TrendingUp}
                      title="Effective Tax Rate"
                      value={`${calculationsUS.effectiveTaxRateUS.toFixed(2)}%`}
                      gradient="from-pink-500 to-pink-600"
                    />
                  </div>

                  {/* Tax Breakdown Cards */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Income & Perquisite Tax */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg">
                          <TrendingUp size={20} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">Income & Perquisite Tax</h4>
                          <p className="text-xs text-gray-500">Tax impact from ESOP exercise</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">Base Income (Salary + Bonus)</span>
                          <span className="font-bold text-gray-800">{fmtUSD0(calculationsUS.baseGrossIncome)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600">Tax on Base Income</span>
                          <span className="font-semibold text-gray-600">{fmtUSD0(calculationsUS.baseTotalTax)}</span>
                        </div>
                        <div className="h-px bg-gray-200"></div>
                        <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                          <span className="text-sm text-indigo-800 font-medium">ESOP Perquisite</span>
                          <span className="font-bold text-indigo-600">{fmtUSD0(calculationsUS.perquisiteUSD)}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-200">
                          <span className="font-bold text-gray-800">Additional Tax from Perquisite</span>
                          <span className="text-xl font-bold text-orange-600">{fmtUSD0(calculationsUS.marginalTaxFromPerquisite)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Capital Gains Tax */}
                    {planToExercise ? (
                      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                            <DollarSign size={20} className="text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800">Capital Gains Tax</h4>
                            <p className="text-xs text-gray-500">At Sale - US</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Capital Gain</span>
                            <span className="font-bold text-gray-800">{fmtUSD0(calculationsUS.capitalGainUSD)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Tax Type</span>
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">
                              {holdMonths > 12 ? `LTCG @ ${usCGRate}%` : 'STCG @ ordinary rate'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 mt-4">
                            <span className="font-bold text-gray-800">Total Tax</span>
                            <span className="text-xl font-bold text-green-600">{fmtUSD0(calculationsUS.capitalGainTax)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-2xl shadow-lg p-6 border border-gray-200 flex items-center justify-center">
                        <div className="text-center">
                          <Info size={32} className="text-gray-400 mx-auto mb-3" />
                          <h4 className="font-bold text-gray-700 mb-1">Capital Gains Tax</h4>
                          <p className="text-sm text-gray-500">Enable "I plan to exercise and sell…" to see CG tax</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Final Summary Card */}
                  <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-10 bg-white rounded-full"></div>
                      <h3 className="text-2xl font-bold">Financial Summary</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <p className="text-sm text-indigo-200 mb-1">Exercise Cost (USD)</p>
                        <p className="text-2xl font-bold">{fmtUSD0(calculationsUS.exerciseCostUSD)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-indigo-200 mb-1">Total Tax (USD)</p>
                        <p className="text-2xl font-bold">{fmtUSD0(calculationsUS.totalTaxUSD)}</p>
                      </div>
                    </div>
                    
                    {/* Total Cost to Exercise */}
                    <div className="bg-white/10 rounded-xl p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-indigo-100">Total Cost to Exercise</span>
                        <span className="text-2xl font-bold">{fmtUSD0(calculationsUS.totalCostToExerciseUSD)}</span>
                      </div>
                      <p className="text-xs text-indigo-200 mt-2">Exercise Cost + Total Tax</p>
                    </div>
                    
                    {planToExercise && (
                      <>
                        <div className="h-px bg-white/30 mb-6"></div>
                        <div className="bg-white rounded-2xl p-6 text-gray-900 shadow-xl">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Gross Proceeds</p>
                              <p className="text-lg font-semibold text-gray-700">{fmtUSD0(calculationsUS.grossProceedsUSD)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600 mb-1">Effective Tax Rate</p>
                              <p className="text-lg font-bold text-indigo-600">{calculationsUS.effectiveTaxRateUS.toFixed(2)}%</p>
                            </div>
                          </div>
                          <div className="h-px bg-gray-200 my-4"></div>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-800">Net After-Tax Value</span>
                            <span className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                              {fmtUSD0(calculationsUS.netAfterTaxUSD)}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // ============ INCOME TAX CALCULATOR TAB ============
            <div className="space-y-6">
              {/* Input Cards */}
              <div className="grid grid-cols-2 gap-6">
                {/* Income & 401k Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                      {filingStatus === 'MFJ' ? 'Your Income & 401(k)' : 'Income & 401(k)'}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">$ USD</span>
                  </div>
                  <div className="space-y-4">
                    <InputField
                      label="Annual Base Salary"
                      value={usBaseIncome}
                      onChange={(e) => setUsBaseIncome(Number(e.target.value))}
                      prefix="$"
                      tooltip="Your annual base salary before any deductions"
                    />
                    <InputField
                      label="Annual Bonus"
                      value={usBonus}
                      onChange={(e) => setUsBonus(Number(e.target.value))}
                      prefix="$"
                      tooltip="Expected annual bonus amount"
                    />

                    {/* 401k Section */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">401(k) Contribution</span>
                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={use401kPercent}
                            onChange={(e) => setUse401kPercent(e.target.checked)}
                            className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          Enter as %
                        </label>
                      </div>
                      {use401kPercent ? (
                        <div className="space-y-2">
                          <InputField
                            label="Percentage of Salary"
                            value={k401EmployeePct}
                            onChange={(e) => setK401EmployeePct(Number(e.target.value))}
                            suffix="%"
                          />
                          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            Estimated: <span className="font-semibold">{fmtUSD0(derived401kByPct)}</span> (capped at ${IRS_401K_LIMIT_2025.toLocaleString()})
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <InputField
                            label="Dollar Amount"
                            value={k401EmployeeFixed}
                            onChange={(e) => setK401EmployeeFixed(Number(e.target.value))}
                            prefix="$"
                          />
                          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            Max allowed: <span className="font-semibold">${IRS_401K_LIMIT_2025.toLocaleString()}</span>
                          </p>
                        </div>
                      )}
                      <div className="mt-3">
                        <InputField
                          label="Company Match (%)"
                          value={k401MatchPct}
                          onChange={(e) => setK401MatchPct(Number(e.target.value))}
                          suffix="%"
                          tooltip="Company match isn't taxed now—shown for planning only"
                        />
                        {/* NEW: Show estimated company match */}
                        <p className="text-xs text-gray-600 bg-indigo-50 p-2 rounded mt-2">
                          Estimated company match: <span className="font-semibold text-indigo-700">{fmtUSD0(usTax.matchAnnual)}</span> / year
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spouse Income & 401k Card (only for MFJ) */}
                {filingStatus === 'MFJ' && (
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-pink-500 to-rose-600 rounded-full"></div>
                        Spouse Income & 401(k)
                      </h3>
                      <span className="text-xs font-semibold px-2 py-1 bg-pink-100 text-pink-700 rounded-full">$ USD</span>
                    </div>
                    <div className="space-y-4">
                      <InputField
                        label="Annual Base Salary"
                        value={spouseBaseIncome}
                        onChange={(e) => setSpouseBaseIncome(Number(e.target.value))}
                        prefix="$"
                        tooltip="Spouse's annual base salary before any deductions"
                      />
                      <InputField
                        label="Annual Bonus"
                        value={spouseBonus}
                        onChange={(e) => setSpouseBonus(Number(e.target.value))}
                        prefix="$"
                        tooltip="Spouse's expected annual bonus amount"
                      />

                      {/* Spouse 401k Section */}
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">401(k) Contribution</span>
                          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={spouseUse401kPercent}
                              onChange={(e) => setSpouseUse401kPercent(e.target.checked)}
                              className="w-3.5 h-3.5 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
                            />
                            Enter as %
                          </label>
                        </div>
                        {spouseUse401kPercent ? (
                          <div className="space-y-2">
                            <InputField
                              label="Percentage of Salary"
                              value={spouseK401EmployeePct}
                              onChange={(e) => setSpouseK401EmployeePct(Number(e.target.value))}
                              suffix="%"
                            />
                            <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              Estimated: <span className="font-semibold">{fmtUSD0(spouseDerived401kByPct)}</span> (capped at ${IRS_401K_LIMIT_2025.toLocaleString()})
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <InputField
                              label="Dollar Amount"
                              value={spouseK401EmployeeFixed}
                              onChange={(e) => setSpouseK401EmployeeFixed(Number(e.target.value))}
                              prefix="$"
                            />
                            <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              Max allowed: <span className="font-semibold">${IRS_401K_LIMIT_2025.toLocaleString()}</span>
                            </p>
                          </div>
                        )}
                        <div className="mt-3">
                          <InputField
                            label="Company Match (%)"
                            value={spouseK401MatchPct}
                            onChange={(e) => setSpouseK401MatchPct(Number(e.target.value))}
                            suffix="%"
                            tooltip="Spouse's company match isn't taxed now—shown for planning only"
                          />
                          <p className="text-xs text-gray-600 bg-pink-50 p-2 rounded mt-2">
                            Estimated company match: <span className="font-semibold text-pink-700">{fmtUSD0(usTax?.spouseMatchAnnual || 0)}</span> / year
                          </p>
                        </div>
                        {/* Pay Frequency selector removed - now using unified payFreq from "Your Deductions and Filing" section */}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Deductions & Filing Card - Full Width */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                    Deductions & Filing
                  </h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">$ USD</span>
                </div>
                <div className="space-y-4">
                  {/* Employee & Spouse Deductions Side by Side */}
                  <div className={`grid gap-6 ${filingStatus === 'MFJ' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {/* Employee's Deductions */}
                    <div>
                      <p className="text-sm font-semibold text-indigo-700 mb-3 uppercase tracking-wide">
                        {filingStatus === 'MFJ' ? "Your Deductions" : "Deductions"}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <InputField
                          label="Health"
                          value={healthSemiMonthly}
                          onChange={(e) => setHealthSemiMonthly(Number(e.target.value))}
                          prefix="$"
                          tooltip="Pre-tax health insurance deduction per semi-monthly period"
                        />
                        <InputField
                          label="Other"
                          value={otherSemiMonthly}
                          onChange={(e) => setOtherSemiMonthly(Number(e.target.value))}
                          prefix="$"
                          tooltip="Other pre-tax deductions per semi-monthly period"
                        />
                      </div>
                    </div>

                    {/* Spouse's Deductions (only for MFJ) */}
                    {filingStatus === 'MFJ' && (
                      <div>
                        <p className="text-sm font-semibold text-pink-700 mb-3 uppercase tracking-wide">Spouse's Deductions</p>
                        <div className="grid grid-cols-2 gap-3">
                          <InputField
                            label="Health"
                            value={spouseHealthSemiMonthly}
                            onChange={(e) => setSpouseHealthSemiMonthly(Number(e.target.value))}
                            prefix="$"
                            tooltip="Spouse's pre-tax health insurance deduction per semi-monthly period"
                          />
                          <InputField
                            label="Other"
                            value={spouseOtherSemiMonthly}
                            onChange={(e) => setSpouseOtherSemiMonthly(Number(e.target.value))}
                            prefix="$"
                            tooltip="Spouse's other pre-tax deductions per semi-monthly period"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Semi-monthly Note */}
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-xs text-amber-900">
                      <strong>Note:</strong> All deduction amounts above are per semi-monthly pay period (24 periods/year).
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Filing Status</label>
                      <select
                        value={filingStatus}
                        onChange={(e) => setFilingStatus(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:border-gray-300 transition-all text-sm"
                      >
                        <option value="Single">Single</option>
                        <option value="MFJ">Married Filing Jointly</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Pay Frequency</label>
                      <select
                        value={payFreq}
                        onChange={(e) => setPayFreq(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:border-gray-300 transition-all text-sm"
                      >
                        <option>Yearly</option>
                        <option>Monthly</option>
                        <option>Semi-monthly</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-900">
                      <strong>Note:</strong> Pre-tax deductions (401k, health, other) reduce your taxable income for Federal & CA taxes.
                    </p>
                  </div>
                </div>
              </div>

              {/* FICA & Info Card - Full Width */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                    FICA & Assumptions
                  </h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">$ USD</span>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">SS Wage Base (2025)</label>
                      <input
                        type="number"
                        value={FICA_SS_WAGE_BASE_2025}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">SS Rate</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={FICA_SS_RATE}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Medicare Rate</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={FICA_MED_RATE}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Addl Medicare Rate</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={ADDL_MED_RATE}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 mt-4">
                    <h4 className="text-xs font-semibold text-indigo-900 mb-2">Standard Deductions (2025)</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-700">
                          <span className="font-medium">Federal {filingStatus}:</span>{' '}
                          <span className="font-bold text-indigo-700">{fmtUSD0(FED_STD_DED[filingStatus])}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-700">
                          <span className="font-medium">California {filingStatus}:</span>{' '}
                          <span className="font-bold text-indigo-700">{fmtUSD0(CA_STD_DED[filingStatus])}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Results Cards */}
              <div className={`grid gap-6 ${filingStatus === 'MFJ' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {/* Annual Summary */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                      {filingStatus === 'MFJ' ? 'Household Annual Summary' : 'Annual Summary'}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">$ USD</span>
                  </div>
                  {filingStatus === 'MFJ' && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-pink-50 rounded-lg border border-indigo-200">
                      <p className="text-xs text-indigo-900 font-medium">
                        <strong>Married Filing Jointly:</strong> Showing combined household income and taxes
                      </p>
                    </div>
                  )}
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">Gross Income</span>
                      <span className="font-semibold">{fmtUSD0(usTax.gross)}</span>
                    </div>
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">Pre-tax Deductions</span>
                      <span className="font-semibold text-red-600">-{fmtUSD0(usTax.pretaxAnnual)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-indigo-50 rounded font-medium">
                      <span className="text-gray-700">Adjusted Wages</span>
                      <span>{fmtUSD0(usTax.fedAdjIncome)}</span>
                    </div>

                    <div className="h-px bg-gray-200 my-2"></div>

                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">Federal Taxable</span>
                      <span className="font-semibold">{fmtUSD0(usTax.fedTaxable)}</span>
                    </div>
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">Federal Income Tax</span>
                      <span className="font-semibold text-red-600">-{fmtUSD0(usTax.fedTax)}</span>
                    </div>

                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">CA Taxable</span>
                      <span className="font-semibold">{fmtUSD0(usTax.caTaxable)}</span>
                    </div>
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">CA Income Tax</span>
                      <span className="font-semibold text-red-600">-{fmtUSD0(usTax.caTax)}</span>
                    </div>

                    <div className="h-px bg-gray-200 my-2"></div>

                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">Social Security</span>
                      <span className="font-semibold text-red-600">-{fmtUSD0(usTax.ss)}</span>
                    </div>
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">Medicare</span>
                      <span className="font-semibold text-red-600">-{fmtUSD0(usTax.med)}</span>
                    </div>
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">Additional Medicare</span>
                      <span className="font-semibold text-red-600">-{fmtUSD0(usTax.addlMed)}</span>
                    </div>
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">California SDI</span>
                      <span className="font-semibold text-red-600">-{fmtUSD0(usTax.sdi)}</span>
                    </div>

                    <div className="h-px bg-gray-200 my-2"></div>

                    <div className="flex justify-between p-3 bg-red-50 rounded-lg font-semibold">
                      <span className="text-gray-800">Total Tax</span>
                      <span className="text-red-600">-{fmtUSD0(usTax.totalTax)}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg font-bold border border-green-200">
                      <span className="text-gray-800">Net Take-Home (Annual)</span>
                      <span className="text-green-600">{fmtUSD0(usTax.netAnnual)}</span>
                    </div>
                  </div>
                </div>

                {/* Per-Period Breakdown */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                      {filingStatus === 'MFJ' ? 'Your Per-Period Breakdown' : `Per-Period Breakdown (${payFreq})`}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">$ USD</span>
                  </div>
                  {filingStatus === 'MFJ' && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-900 font-medium">
                        Pay Frequency: <strong>{payFreq}</strong> ({usTax.baseOnly.periods} periods/year)
                      </p>
                    </div>
                  )}
                  <div className="space-y-2.5 text-sm mb-6">
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">Gross / period</span>
                      <span className="font-semibold">{fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.gross))}</span>
                    </div>
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">Pre-tax / period</span>
                      <span className="font-semibold text-red-600">-{fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.pretaxAnnual))}</span>
                    </div>
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">Fed Tax / period</span>
                      <span className="font-semibold text-red-600">-{fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.fedTax))}</span>
                    </div>
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">CA Tax / period</span>
                      <span className="font-semibold text-red-600">-{fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.caTax))}</span>
                    </div>
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">FICA / period</span>
                      <span className="font-semibold text-red-600">
                        -{fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.ss + usTax.baseOnly.med + usTax.baseOnly.addlMed))}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                      <span className="text-gray-600">CA SDI / period</span>
                      <span className="font-semibold text-red-600">-{fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.sdi))}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg font-bold border border-blue-200 mt-2">
                      <span className="text-gray-800">Net / period</span>
                      <span className="text-blue-600">{fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.netAnnual))}</span>
                    </div>
                  </div>

                  {/* Bonus Estimate */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-3 text-sm">Bonus — One-time Tax Estimate</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bonus (gross)</span>
                        <span className="font-semibold">{fmtUSD0(usTax.bonusEst.bonusGross)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Federal (≈ {usTax.bonusEst.fedMarginalPct}%)</span>
                        <span className="font-semibold text-red-600">-{fmtUSD0(usTax.bonusEst.fedOnBonus)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">California (≈ {usTax.bonusEst.caMarginalPct}%)</span>
                        <span className="font-semibold text-red-600">-{fmtUSD0(usTax.bonusEst.caOnBonus)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">FICA (all)</span>
                        <span className="font-semibold text-red-600">
                          -{fmtUSD0(usTax.bonusEst.ssOnBonus + usTax.bonusEst.medOnBonus + usTax.bonusEst.addlMedOnBonus)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CA SDI</span>
                        <span className="font-semibold text-red-600">-{fmtUSD0(usTax.bonusEst.sdiOnBonus)}</span>
                      </div>
                      <div className="h-px bg-purple-200 my-2"></div>
                      <div className="flex justify-between font-bold">
                        <span className="text-purple-900">Net Bonus (take-home)</span>
                        <span className="text-purple-600">{fmtUSD0(usTax.bonusEst.netBonus)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-purple-700/80 mt-3 bg-white/50 p-2 rounded">
                      Estimated using current marginal rates. Employers may use supplemental withholding rules.
                    </p>
                  </div>
                </div>

                {/* Spouse Per-Period Breakdown (only for MFJ) */}
                {filingStatus === 'MFJ' && usTax.spouseOnly && (
                  <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-pink-500 to-rose-600 rounded-full"></div>
                        Spouse's Per-Period Breakdown
                      </h3>
                      <span className="text-xs font-semibold px-2 py-1 bg-pink-100 text-pink-700 rounded-full">$ USD</span>
                    </div>
                    <div className="mb-4 p-3 bg-pink-50 rounded-lg border border-pink-200">
                      <p className="text-xs text-pink-900 font-medium">
                        Pay Frequency: <strong>{payFreq}</strong> ({usTax.spouseOnly.periods} periods/year)
                      </p>
                    </div>
                    <div className="space-y-2.5 text-sm mb-6">
                      <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                        <span className="text-gray-600">Gross / period</span>
                        <span className="font-semibold">{fmtUSD0(usTax.spouseOnly.per(usTax.spouseOnly.gross))}</span>
                      </div>
                      <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                        <span className="text-gray-600">Pre-tax / period</span>
                        <span className="font-semibold text-red-600">-{fmtUSD0(usTax.spouseOnly.per(usTax.spouseOnly.pretaxAnnual))}</span>
                      </div>
                      <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                        <span className="text-gray-600">Fed Tax / period (allocated)</span>
                        <span className="font-semibold text-red-600">-{fmtUSD0(usTax.spouseOnly.per(usTax.spouseOnly.fedTax))}</span>
                      </div>
                      <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                        <span className="text-gray-600">CA Tax / period (allocated)</span>
                        <span className="font-semibold text-red-600">-{fmtUSD0(usTax.spouseOnly.per(usTax.spouseOnly.caTax))}</span>
                      </div>
                      <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                        <span className="text-gray-600">FICA / period (allocated)</span>
                        <span className="font-semibold text-red-600">
                          -{fmtUSD0(usTax.spouseOnly.per(usTax.spouseOnly.ss + usTax.spouseOnly.med + usTax.spouseOnly.addlMed))}
                        </span>
                      </div>
                      <div className="flex justify-between p-2 hover:bg-gray-50 rounded transition-colors">
                        <span className="text-gray-600">CA SDI / period (allocated)</span>
                        <span className="font-semibold text-red-600">-{fmtUSD0(usTax.spouseOnly.per(usTax.spouseOnly.sdi))}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg font-bold border border-pink-200 mt-2">
                        <span className="text-gray-800">Net / period</span>
                        <span className="text-pink-600">{fmtUSD0(usTax.spouseOnly.per(usTax.spouseOnly.netAnnual))}</span>
                      </div>
                    </div>

                    {/* Spouse Bonus Estimate */}
                    <div className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-200">
                      <h4 className="font-semibold text-pink-900 mb-3 text-sm">Bonus — One-time Tax Estimate</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bonus (gross)</span>
                          <span className="font-semibold">{fmtUSD0(usTax.spouseBonusEst?.bonusGross || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Federal (≈ {usTax.spouseBonusEst?.fedMarginalPct || 0}%)</span>
                          <span className="font-semibold text-red-600">-{fmtUSD0(usTax.spouseBonusEst?.fedOnBonus || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">California (≈ {usTax.spouseBonusEst?.caMarginalPct || 0}%)</span>
                          <span className="font-semibold text-red-600">-{fmtUSD0(usTax.spouseBonusEst?.caOnBonus || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">FICA (all)</span>
                          <span className="font-semibold text-red-600">
                            -{fmtUSD0((usTax.spouseBonusEst?.ssOnBonus || 0) + (usTax.spouseBonusEst?.medOnBonus || 0) + (usTax.spouseBonusEst?.addlMedOnBonus || 0))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">CA SDI</span>
                          <span className="font-semibold text-red-600">-{fmtUSD0(usTax.spouseBonusEst?.sdiOnBonus || 0)}</span>
                        </div>
                        <div className="h-px bg-pink-200 my-2"></div>
                        <div className="flex justify-between font-bold">
                          <span className="text-pink-900">Net Bonus (take-home)</span>
                          <span className="text-pink-600">{fmtUSD0(usTax.spouseBonusEst?.netBonus || 0)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-pink-700/80 mt-3 bg-white/50 p-2 rounded">
                        Estimated using current marginal rates. Employers may use supplemental withholding rules.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Annual Income Summary - Only for Income Tax Calculator */}
              {activeTab === 'income-tax' && (
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-10 bg-white rounded-full"></div>
                    <h3 className="text-2xl font-bold">Annual Income Summary</h3>
                  </div>

                  {/* After-Tax Annual Income */}
                  <div className="mb-6">
                    <h4 className="text-sm text-indigo-200 mb-4 font-semibold uppercase tracking-wide">After-Tax Annual Income</h4>
                    <div className={`grid gap-6 ${filingStatus === 'MFJ' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                      <div>
                        <p className="text-sm text-indigo-200 mb-1">{filingStatus === 'MFJ' ? 'Your Income' : 'Net Income'}</p>
                        <p className="text-2xl font-bold">{fmtUSD0(usTax.baseOnly?.netAnnual || 0)}</p>
                      </div>
                      {filingStatus === 'MFJ' && usTax.spouseOnly && (
                        <>
                          <div>
                            <p className="text-sm text-indigo-200 mb-1">Spouse's Income</p>
                            <p className="text-2xl font-bold">{fmtUSD0(usTax.spouseOnly?.netAnnual || 0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-indigo-200 mb-1">Combined</p>
                            <p className="text-2xl font-bold">{fmtUSD0(usTax.netAnnual)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* After-Tax Bonus */}
                  <div className="bg-white/10 rounded-xl p-4 mb-6">
                    <h4 className="text-sm text-indigo-100 mb-4 font-semibold uppercase tracking-wide">After-Tax Bonus (One-Time)</h4>
                    <div className={`grid gap-6 ${filingStatus === 'MFJ' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                      <div>
                        <p className="text-sm text-indigo-200 mb-1">{filingStatus === 'MFJ' ? 'Your Bonus' : 'Net Bonus'}</p>
                        <p className="text-xl font-bold">{fmtUSD0(usTax.bonusEst?.netBonus || 0)}</p>
                      </div>
                      {filingStatus === 'MFJ' && usTax.spouseBonusEst && (
                        <>
                          <div>
                            <p className="text-sm text-indigo-200 mb-1">Spouse's Bonus</p>
                            <p className="text-xl font-bold">{fmtUSD0(usTax.spouseBonusEst?.netBonus || 0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-indigo-200 mb-1">Combined</p>
                            <p className="text-xl font-bold">{fmtUSD0((usTax.bonusEst?.netBonus || 0) + (usTax.spouseBonusEst?.netBonus || 0))}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 401(k) Company Match */}
                  <div className="bg-white/10 rounded-xl p-4">
                    <h4 className="text-sm text-indigo-100 mb-4 font-semibold uppercase tracking-wide">401(k) Company Match (Annual)</h4>
                    <div className={`grid gap-6 ${filingStatus === 'MFJ' ? 'grid-cols-3' : 'grid-cols-1'}`}>
                      <div>
                        <p className="text-sm text-indigo-200 mb-1">{filingStatus === 'MFJ' ? 'Your Match' : 'Company Match'}</p>
                        <p className="text-xl font-bold">{fmtUSD0(usTax.matchAnnual || 0)}</p>
                      </div>
                      {filingStatus === 'MFJ' && (
                        <>
                          <div>
                            <p className="text-sm text-indigo-200 mb-1">Spouse's Match</p>
                            <p className="text-xl font-bold">{fmtUSD0(usTax.spouseMatchAnnual || 0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-indigo-200 mb-1">Combined</p>
                            <p className="text-xl font-bold">{fmtUSD0((usTax.matchAnnual || 0) + (usTax.spouseMatchAnnual || 0))}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-indigo-200 mt-4 bg-white/10 p-3 rounded-lg">
                    <strong>Note:</strong> 401(k) company match is not taxed when contributed but will be taxed upon withdrawal in retirement.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer Disclaimer */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-400 rounded-xl p-6 shadow-md">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center shadow">
                  <span className="text-xl">💡</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 mb-2 text-base">Important Information</h4>
                {activeTab === 'esop-india' ? (
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      Perquisite calculation uses incremental method (after − before), including surcharge + 4% cess. 
                      Finance Act 2024 updates are modeled for FY 2025-26+.
                    </p>
                  </div>
                ) : activeTab === 'esop-us' ? (
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      US ESOP calculator applies full progressive Federal + CA tax on total income (including perquisite), 
                      then calculates marginal tax impact. Uses 2025 tax brackets and proper treatment of all deductions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      Income tax calculator uses 2025 Federal brackets & standard deduction, 2025 SS wage cap, and 2024 CA table 
                      (update when 2025 FTB tables post). Health/other are assumed Section 125 pre-tax.
                    </p>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-amber-300">
                  <p className="text-sm text-amber-900 font-semibold">
                    ⚠️ Estimates only — please consult your tax advisor for filing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}