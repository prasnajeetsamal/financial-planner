import React, { useMemo, useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import { InputField, InfoTooltip, fmtUSD0 } from './AppFinancialPlanner';

/* ==========
   Tiny hook: persist state across tab switches (sessionStorage)
   Place here or move to a shared utils file.
   ========== */
function useSessionState(key, initialValue) {
  const [state, setState] = React.useState(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  React.useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [key, state]);

  return [state, setState];
}

/** Constants */
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
const CA_STD_DED  = { Single:  5540, MFJ: 11080 };

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
  let tax = 0, prev = 0;
  for (const b of brackets) {
    const cap = Math.min(taxable, b.upTo);
    if (cap > prev) tax += (cap - prev) * b.rate;
    if (taxable <= b.upTo) break;
    prev = cap;
  }
  return Math.max(0, tax);
};

const marginalRate = (taxable, brackets) => {
  for (const b of brackets) if (taxable <= b.upTo) return b.rate;
  return brackets[brackets.length - 1].rate;
};

export default function IncomeTaxTab({ onRateSuggestion }) {
  // Primary earner
  const [usBaseIncome, setUsBaseIncome] = useSessionState('incomeTab.usBaseIncome', 0);
  const [usBonus, setUsBonus]           = useSessionState('incomeTab.usBonus', 0);

  // Dual-earner toggle + spouse
  const [dualEarners, setDualEarners]           = useSessionState('incomeTab.dualEarners', false);
  const [spouseBaseIncome, setSpouseBaseIncome] = useSessionState('incomeTab.spouseBaseIncome', 0);
  const [spouseBonus, setSpouseBonus]           = useSessionState('incomeTab.spouseBonus', 0);

  // 401(k)
  const [use401kPercent, setUse401kPercent]     = useSessionState('incomeTab.use401kPercent', true);
  const [k401EmployeePct, setK401EmployeePct]   = useSessionState('incomeTab.k401EmployeePct', 0);
  const [k401EmployeeFixed, setK401EmployeeFixed] = useSessionState('incomeTab.k401EmployeeFixed', 0);
  const [k401MatchPct, setK401MatchPct]         = useSessionState('incomeTab.k401MatchPct', 0);

  // Deductions & filing
  const [healthHalfMonthly, setHealthHalfMonthly] = useSessionState('incomeTab.healthHalfMonthly', 0);
  const [otherHalfMonthly, setOtherHalfMonthly]   = useSessionState('incomeTab.otherHalfMonthly', 0);
  const [filingStatus, setFilingStatus]           = useSessionState('incomeTab.filingStatus', 'MFJ');

  // Pay frequency (Biweekly removed)
  const [payFreq, setPayFreq] = useSessionState('incomeTab.payFreq', 'Monthly');

  // Coerce any legacy 'Biweekly' to 'Monthly' safely (avoid setState during render)
  useEffect(() => {
    if (payFreq === 'Biweekly') setPayFreq('Monthly');
  }, [payFreq, setPayFreq]);

  // Household gross (primary + spouse if enabled)
  const grossAnnualUS =
    (Number(usBaseIncome) || 0) + (Number(usBonus) || 0) +
    (dualEarners ? ((Number(spouseBaseIncome) || 0) + (Number(spouseBonus) || 0)) : 0);

  // Household 401(k) cap doubles with dual earners
  const household401kCap = IRS_401K_LIMIT_2025 * (dualEarners ? 2 : 1);

  const derived401kByPct = Math.min(
    Math.round(((Number(k401EmployeePct) || 0) / 100) * grossAnnualUS),
    household401kCap
  );

  const k401Employee = use401kPercent
    ? derived401kByPct
    : Math.min(Number(k401EmployeeFixed) || 0, household401kCap);

  const usTax = useMemo(() => {
    const gross = grossAnnualUS;

    // Pre-tax (treated as household-level inputs)
    const pretaxAnnual =
      k401Employee +
      ((Number(healthHalfMonthly) || 0) * 24) +
      ((Number(otherHalfMonthly) || 0) * 24);

    const fedAdjIncome = Math.max(0, gross - pretaxAnnual);
    const stateAdjIncome = Math.max(0, gross - pretaxAnnual);
    const stdFed = FED_STD_DED[filingStatus] ?? 0;
    const stdCA  = CA_STD_DED[filingStatus] ?? 0;

    const fedTaxable = Math.max(0, fedAdjIncome - stdFed);
    const caTaxable  = Math.max(0, stateAdjIncome - stdCA);

    const fedTax = progressiveTax(fedTaxable, FED_BRACKETS[filingStatus]);
    const caTax  = progressiveTax(caTaxable,  CA_BRACKETS[filingStatus]);

    // FICA & SDI (approx as household less cafeteria-plan pretax)
    const pretaxForFICA = ((Number(healthHalfMonthly) || 0) * 24) + ((Number(otherHalfMonthly) || 0) * 24);
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
    const netAnnual = fedAdjIncome - totalTax;

    // Effective tax rate score (Total tax / Gross)
    const effectiveRatePct = gross > 0 ? ((totalTax / gross) * 100).toFixed(1) : '0.0';

    // Periods (no Biweekly)
    const periods =
      payFreq === 'Semi-monthly' ? 24 :
      payFreq === 'Monthly'      ? 12 : 1;

    const per = (v) => v / periods;

    // Suggested ordinary rate ≈ marginal fed + state
    const fedMarg = marginalRate(fedTaxable, FED_BRACKETS[filingStatus]) * 100;
    const caMarg  = marginalRate(caTaxable,  CA_BRACKETS[filingStatus]) * 100;
    const suggestedOrdinaryRate = Math.min(60, Math.round((fedMarg + caMarg) * 10) / 10);

    // ===== Per-period panel (now uses combined BASE salaries if dual earners) =====
    const baseGrossForPeriods =
      (Number(usBaseIncome) || 0) + (dualEarners ? (Number(spouseBaseIncome) || 0) : 0);

    const baseHealthAnnual = (Number(healthHalfMonthly) || 0) * 24;
    const baseOtherAnnual  = (Number(otherHalfMonthly)  || 0) * 24;

    // If % mode, estimate 401k against the base salaries used for paycheck; cap at household cap.
    const baseK401 = use401kPercent
      ? Math.min(Math.round(((Number(k401EmployeePct) || 0) / 100) * baseGrossForPeriods), household401kCap)
      : 0; // if dollar mode, can't reliably attribute fixed amount to base-only

    const basePretaxAnnual = baseK401 + baseHealthAnnual + baseOtherAnnual;
    const fedAdjIncomeBase = Math.max(0, baseGrossForPeriods - basePretaxAnnual);
    const stateAdjIncomeBase = Math.max(0, baseGrossForPeriods - basePretaxAnnual);
    const fedTaxableBase = Math.max(0, fedAdjIncomeBase - stdFed);
    const caTaxableBase  = Math.max(0, stateAdjIncomeBase - stdCA);
    const fedTaxBase = progressiveTax(fedTaxableBase, FED_BRACKETS[filingStatus]);
    const caTaxBase  = progressiveTax(caTaxableBase,  CA_BRACKETS[filingStatus]);

    const pretaxForFICABase = baseHealthAnnual + baseOtherAnnual;
    const ficaBaseBase = Math.max(0, baseGrossForPeriods - pretaxForFICABase);
    const ssTaxableBase = Math.min(ficaBaseBase, Number(FICA_SS_WAGE_BASE_2025) || 0);
    const ssBase = ssTaxableBase * FICA_SS_RATE;
    const medBaseTax = ficaBaseBase * FICA_MED_RATE;
    const addlThresholdBase = filingStatus === 'MFJ' ? Number(ADDL_MED_THRESH_MFJ) || 0 : Number(ADDL_MED_THRESH_SINGLE) || 0;
    const addlMedBase = Math.max(0, ficaBaseBase - addlThresholdBase) * ADDL_MED_RATE;
    const sdiBaseTax = (CA_SDI_HAS_WAGE_CAP ? Math.min(baseGrossForPeriods, Infinity) : baseGrossForPeriods) * CA_SDI_RATE_2025;

    const baseOnly = {
      gross: baseGrossForPeriods,
      pretaxAnnual: basePretaxAnnual,
      fedAdjIncome: fedAdjIncomeBase,
      caAdjIncome: stateAdjIncomeBase,
      fedTax: fedTaxBase,
      caTax: caTaxBase,
      ss: ssBase,
      med: medBaseTax,
      addlMed: addlMedBase,
      sdi: sdiBaseTax,
      per,
      netAnnual: fedAdjIncomeBase - (fedTaxBase + caTaxBase + ssBase + medBaseTax + addlMedBase + sdiBaseTax),
    };

    // Bonus one-time estimate (household marginal)
    const fedMarginalOnly = marginalRate(Math.max(0, fedAdjIncome - stdFed), FED_BRACKETS[filingStatus]) || 0;
    const caMarginalOnly  = marginalRate(Math.max(0, stateAdjIncome - stdCA), CA_BRACKETS[filingStatus]) || 0;
    const ssRemainingCap  = Math.max(0, (Number(FICA_SS_WAGE_BASE_2025) || 0) - (Math.min(ficaBase, Number(FICA_SS_WAGE_BASE_2025) || 0)));
    const householdBonus = (Number(usBonus) || 0) + (dualEarners ? (Number(spouseBonus) || 0) : 0);

    const ssOnBonus = Math.min(householdBonus, ssRemainingCap) * FICA_SS_RATE;
    const medOnBonus = householdBonus * FICA_MED_RATE;
    const addlMedOnBonus =
      Math.max(0, (ficaBase + householdBonus) - addlThreshold) * ADDL_MED_RATE
      - Math.max(0, ficaBase - addlThreshold) * ADDL_MED_RATE;
    const sdiOnBonus = householdBonus * CA_SDI_RATE_2025;

    const fedOnBonus = householdBonus * fedMarginalOnly;
    const caOnBonus  = householdBonus * caMarginalOnly;

    const totalTaxOnBonus = fedOnBonus + caOnBonus + ssOnBonus + medOnBonus + addlMedOnBonus + sdiOnBonus;
    const netBonus = householdBonus - totalTaxOnBonus;

    const bonusEst = {
      bonusGross: householdBonus,
      fedOnBonus, caOnBonus, ssOnBonus, medOnBonus, addlMedOnBonus, sdiOnBonus,
      totalTaxOnBonus, netBonus,
      fedMarginalPct: (fedMarginalOnly * 100).toFixed(1),
      caMarginalPct:  (caMarginalOnly  * 100).toFixed(1),
    };

    // Company match shown against primary base only (display aid)
    const matchAnnual = (Number(k401MatchPct) || 0) / 100 * (Number(usBaseIncome) || 0);

    // Send ordinary-rate suggestion up
    onRateSuggestion?.({ suggestedOrdinaryRate, fedAdjIncome });

    return {
      gross,
      pretaxAnnual,
      fedAdjIncome, stdFed, fedTaxable, fedTax,
      stateAdjIncome, stdCA, caTaxable, caTax,
      ss, med, addlMed, sdi, totalTax, netAnnual,
      periods, per, matchAnnual, suggestedOrdinaryRate,
      baseOnly, bonusEst,
      household401kCap,
      effectiveRatePct
    };
  }, [
    usBaseIncome, usBonus, spouseBaseIncome, spouseBonus, dualEarners,
    use401kPercent, k401EmployeePct, k401Employee, k401MatchPct,
    healthHalfMonthly, otherHalfMonthly, filingStatus, payFreq,
    onRateSuggestion
  ]);

  const matchPerPeriod = (amt) => (usTax?.per ? usTax.per(amt) : 0);

  return (
    <div className="space-y-6">
      {/* Quick scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Effective Tax Rate</div>
          <div className="text-2xl font-extrabold text-gray-800">{usTax.effectiveRatePct}%</div>
        </div>
        <div className="bg-white/80 rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">Adjusted Wages (Household)</div>
          <div className="text-lg font-bold text-gray-800">{fmtUSD0(usTax.fedAdjIncome)}</div>
        </div>
        <div className="bg-white/80 rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">401(k) Cap</div>
          <div className="text-lg font-bold text-gray-800">{fmtUSD0(usTax.household401kCap)}</div>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Income & 401k */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
              Income & 401(k)
            </h3>
            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">$ USD</span>
          </div>

          {/* Dual earner toggle */}
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-700">Dual earners (spouse income)</label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dualEarners}
                onChange={(e) => setDualEarners(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-600">Enable</span>
            </label>
          </div>

          <div className="space-y-4">
            {/* Primary */}
            <InputField label="Annual Base Salary (You)" value={usBaseIncome} onChange={(e) => setUsBaseIncome(Number(e.target.value))} prefix="$" />
            <InputField label="Annual Bonus (You)" value={usBonus} onChange={(e) => setUsBonus(Number(e.target.value))} prefix="$" />

            {/* Spouse fields */}
            {dualEarners && (
              <div className="pt-3 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Spouse Income</h4>
                <div className="space-y-3">
                  <InputField label="Annual Base Salary (Spouse)" value={spouseBaseIncome} onChange={(e) => setSpouseBaseIncome(Number(e.target.value))} prefix="$" />
                  <InputField label="Annual Bonus (Spouse)" value={spouseBonus} onChange={(e) => setSpouseBonus(Number(e.target.value))} prefix="$" />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3 h-[42px]">
                <span className="text-sm font-medium text-gray-700">401(k) Contribution (household)</span>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer h-[42px]">
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
                  <InputField label="Percentage of Household Salary" value={k401EmployeePct} onChange={(e) => setK401EmployeePct(Number(e.target.value))} suffix="%" />
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    Estimated: <span className="font-semibold">{fmtUSD0(derived401kByPct)}</span> (capped at {fmtUSD0(usTax.household401kCap)})
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <InputField label="Dollar Amount (Household)" value={k401EmployeeFixed} onChange={(e) => setK401EmployeeFixed(Number(e.target.value))} prefix="$" />
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    Max allowed (household): <span className="font-semibold">{fmtUSD0(usTax.household401kCap)}</span>
                  </p>
                </div>
              )}

              <div className="mt-3 space-y-1">
                <InputField label="Company Match (%) — your employer" value={k401MatchPct} onChange={(e) => setK401MatchPct(Number(e.target.value))} suffix="%" tooltip="Company match isn't taxed now—shown for planning only" />
                {/* Estimated company match (annual + per-period) */}
                <p className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded">
                  Est. company match (annual): <strong>{fmtUSD0(usTax.matchAnnual)}</strong> &nbsp;•&nbsp;
                  per {payFreq.toLowerCase()}: <strong>{fmtUSD0(matchPerPeriod(usTax.matchAnnual))}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Deductions & Filing */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
              Deductions & Filing
            </h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Health (half-monthly)" value={healthHalfMonthly} onChange={(e) => setHealthHalfMonthly(Number(e.target.value))} prefix="$" />
              <InputField label="Other (half-monthly)" value={otherHalfMonthly} onChange={(e) => setOtherHalfMonthly(Number(e.target.value))} prefix="$" />
            </div>

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
                {/* Biweekly intentionally removed */}
              </select>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-900">
                <strong>Note:</strong> Pre-tax deductions (401k, health, other) reduce taxable income for Federal & CA taxes.
              </p>
            </div>
          </div>
        </div>

        {/* Reference / Standard deduction card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
            FICA & Assumptions
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-gray-600">SS Wage Base (2025)</div>
              <div className="font-semibold">{fmtUSD0(FICA_SS_WAGE_BASE_2025)}</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-gray-600">SS Rate</div>
              <div className="font-semibold">{(FICA_SS_RATE*100).toFixed(2)}%</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-gray-600">Medicare</div>
              <div className="font-semibold">{(FICA_MED_RATE*100).toFixed(2)}%</div>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="text-gray-600">Addl Medicare</div>
              <div className="font-semibold">{(ADDL_MED_RATE*100).toFixed(2)}%</div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <h4 className="text-xs font-semibold text-indigo-900 mb-2">Standard Deductions (2025)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-600">Federal</p>
                <p className="font-bold text-indigo-700">{fmtUSD0(FED_STD_DED.MFJ)} / MFJ &nbsp;|&nbsp; {fmtUSD0(FED_STD_DED.Single)} / Single</p>
              </div>
              <div>
                <p className="text-gray-600">California</p>
                <p className="font-bold text-indigo-700">{fmtUSD0(CA_STD_DED.MFJ)} / MFJ &nbsp;|&nbsp; {fmtUSD0(CA_STD_DED.Single)} / Single</p>
              </div>
            </div>
            <p className="text-[11px] text-indigo-700 mt-2">
              Household 401(k) cap{dualEarners ? ' doubled' : ''}: <strong>{fmtUSD0(IRS_401K_LIMIT_2025)}{dualEarners ? ` → ${fmtUSD0(IRS_401K_LIMIT_2025*2)}` : ''}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Annual Summary */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
              Annual Summary
            </h3>
            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">$ USD</span>
          </div>

          <div className="space-y-2.5 text-sm">
            <Row k="Gross Income (Household)" v={fmtUSD0(usTax.gross)} />
            <Row k="Pre-tax Deductions" v={`-${fmtUSD0(usTax.pretaxAnnual)}`} red />
            <Row k="Adjusted Wages" v={fmtUSD0(usTax.fedAdjIncome)} highlight />

            <Divider />

            <Row k="Federal Taxable" v={fmtUSD0(usTax.fedTaxable)} />
            <Row k="Federal Income Tax" v={`-${fmtUSD0(usTax.fedTax)}`} red />
            <Row k="CA Taxable" v={fmtUSD0(usTax.caTaxable)} />
            <Row k="CA Income Tax" v={`-${fmtUSD0(usTax.caTax)}`} red />

            <Divider />

            <Row k="Social Security" v={`-${fmtUSD0(usTax.ss)}`} red />
            <Row k="Medicare" v={`-${fmtUSD0(usTax.med)}`} red />
            <Row k="Addl Medicare" v={`-${fmtUSD0(usTax.addlMed)}`} red />
            <Row k="California SDI" v={`-${fmtUSD0(usTax.sdi)}`} red />

            <Divider />

            <Row k="Total Tax" v={`-${fmtUSD0(usTax.totalTax)}`} red strong />
            <Row k="Net Take-Home (Annual)" v={fmtUSD0(usTax.netAnnual)} green strong />
          </div>
        </div>

        {/* Per-Period + Bonus */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
              Per-Period Breakdown ({payFreq})
            </h3>
            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">$ USD</span>
          </div>

          <div className="space-y-2.5 text-sm mb-6">
            <Row k={`Gross / period${dualEarners ? ' (You + Spouse base)' : ''}`} v={fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.gross))} />
            <Row k="Pre-tax / period" v={`-${fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.pretaxAnnual))}`} red />
            <Row k="Fed Tax / period" v={`-${fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.fedTax))}`} red />
            <Row k="CA Tax / period" v={`-${fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.caTax))}`} red />
            <Row k="FICA / period" v={`-${fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.ss + usTax.baseOnly.med + usTax.baseOnly.addlMed))}`} red />
            <Row k="CA SDI / period" v={`-${fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.sdi))}`} red />
            <Row k="Net / period" v={fmtUSD0(usTax.baseOnly.per(usTax.baseOnly.netAnnual))} blue strong />
          </div>

          {/* Bonus One-time Estimate */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <h4 className="text-sm font-semibold text-purple-900 mb-3">Bonus — One-time Tax Estimate (Household)</h4>
            <div className="space-y-2 text-sm">
              <Row k="Bonus (gross)" v={fmtUSD0(usTax.bonusEst.bonusGross)} />
              <Row k={`Federal (≈ ${usTax.bonusEst.fedMarginalPct}%)`} v={`-${fmtUSD0(usTax.bonusEst.fedOnBonus)}`} red />
              <Row k={`California (≈ ${usTax.bonusEst.caMarginalPct}%)`} v={`-${fmtUSD0(usTax.bonusEst.caOnBonus)}`} red />
              <Row k="FICA (all)" v={`-${fmtUSD0(usTax.bonusEst.ssOnBonus + usTax.bonusEst.medOnBonus + usTax.bonusEst.addlMedOnBonus)}`} red />
              <Row k="CA SDI" v={`-${fmtUSD0(usTax.bonusEst.sdiOnBonus)}`} red />
              <Divider />
              <Row k="Net Bonus (take-home)" v={fmtUSD0(usTax.bonusEst.netBonus)} purple strong />
            </div>
            <p className="text-xs text-purple-700/80 mt-3 bg-white/50 p-2 rounded">
              Estimated using current marginal rates. Employers may use supplemental withholding rules.
            </p>
          </div>

          <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-xs text-indigo-900">
              <strong>401(k) Company Match (your employer):</strong> {fmtUSD0(usTax.matchAnnual)} / year (≈ {fmtUSD0(matchPerPeriod(usTax.matchAnnual))} per {payFreq.toLowerCase()})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** tiny helpers for rows */
function Row({ k, v, red, green, blue, purple, strong, highlight }) {
  return (
    <div className={`flex justify-between p-2 rounded transition-colors
      ${highlight ? 'bg-indigo-50 font-medium' : 'hover:bg-gray-50'}
      ${red ? 'text-red-600' : green ? 'text-green-600' : blue ? 'text-blue-600' : purple ? 'text-purple-600' : 'text-gray-800'}`}>
      <span className="text-gray-600">{k}</span>
      <span className={`${strong ? 'font-bold' : 'font-semibold'}`}>{v}</span>
    </div>
  );
}
function Divider() { return <div className="h-px bg-gray-200 my-2"></div>; }

