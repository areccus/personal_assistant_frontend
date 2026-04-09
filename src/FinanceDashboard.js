import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import './FinanceDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';

// ── Category config ───────────────────────────────────────────────────────────

const CAT_CONFIG = {
  dining:        { color: '#F97316', label: 'Dining' },
  groceries:     { color: '#22C55E', label: 'Groceries' },
  fuel:          { color: '#EAB308', label: 'Fuel' },
  transport:     { color: '#FBBF24', label: 'Transport' },
  shopping:      { color: '#A855F7', label: 'Shopping' },
  utilities:     { color: '#EF4444', label: 'Utilities' },
  rent:          { color: '#DC2626', label: 'Rent' },
  income:        { color: '#10B981', label: 'Income' },
  subscriptions: { color: '#3B82F6', label: 'Subscriptions' },
  entertainment: { color: '#60A5FA', label: 'Entertainment' },
  health:        { color: '#EC4899', label: 'Health' },
  insurance:     { color: '#FB923C', label: 'Insurance' },
  transfer:      { color: '#6B7280', label: 'Transfer' },
  savings:       { color: '#34D399', label: 'Savings' },
  other:         { color: '#9CA3AF', label: 'Other' },
};

const catColor = (cat) => CAT_CONFIG[cat]?.color || '#9CA3AF';
const catLabel = (cat) =>
  CAT_CONFIG[cat]?.label || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : 'Other');

const EXPENSE_CATS = Object.keys(CAT_CONFIG).filter(
  (c) => !['income', 'transfer', 'savings'].includes(c)
);

// ── Material Symbols icon per category ───────────────────────────────────────

const CAT_MATERIAL_ICON = {
  dining:        'restaurant',
  groceries:     'shopping_cart',
  fuel:          'local_gas_station',
  transport:     'directions_bus',
  shopping:      'shopping_bag',
  utilities:     'electric_bolt',
  rent:          'home',
  health:        'healing',
  subscriptions: 'subscriptions',
  entertainment: 'sports_esports',
  insurance:     'shield',
  transfer:      'swap_horiz',
  savings:       'savings',
  income:        'payments',
  other:         'category',
};

const catMIcon = (cat) => CAT_MATERIAL_ICON[cat] || 'category';

// ── Formatters ────────────────────────────────────────────────────────────────

const fmt = (n) =>
  '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (n) =>
  '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

// ── Data helpers ──────────────────────────────────────────────────────────────

/**
 * True when a transaction represents real out-of-pocket spending.
 * Filters internal transfers to prevent double-counting:
 *   CC purchases  → debit on "Credit Card" account  → keep
 *   CC payment    → debit on checking account        → skip
 *   Savings xfer  → debit on checking account        → skip
 */
const INTERNAL_KW = ['autopay', 'credit card payment', 'card payment', 'online payment'];

function isRealExpense(t) {
  if (t.type !== 'debit') return false;
  const account = (t.account || '').toLowerCase();
  const desc    = (t.description || '').toLowerCase();
  if (account.includes('savings')) return false;
  if (!account.includes('credit')) {
    if (desc.includes('transfer')) return false;
    if (INTERNAL_KW.some((kw) => desc.includes(kw))) return false;
  }
  return true;
}

function isRealIncome(t) {
  if (t.type !== 'credit') return false;
  const account = (t.account || '').toLowerCase();
  const desc    = (t.description || '').toLowerCase();
  if (account.includes('credit')) return false;  // CC bill payment — not income
  if (account.includes('savings')) return false; // savings transfer — not income
  if (desc.includes('transfer')) return false;   // inter-account transfer
  return true;
}

function getLastNMonths(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return {
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short' }),
    };
  });
}

function buildMonthlySpending(transactions, months) {
  const totals = Object.fromEntries(months.map((m) => [m.key, 0]));
  transactions.forEach((t) => {
    if (!isRealExpense(t)) return;
    const mo = t.date.slice(0, 7);
    if (mo in totals) totals[mo] += t.amount;
  });
  return months.map((m) => ({ month: m.label, amount: Math.round(totals[m.key]) }));
}

function thisMonthTotal(transactions) {
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return transactions
    .filter((t) => isRealExpense(t) && t.date.startsWith(key))
    .reduce((s, t) => s + t.amount, 0);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ height = 180 }) {
  return <div className="fin-skeleton" style={{ height }} />;
}

// ── Category chip ─────────────────────────────────────────────────────────────

function CategoryChip({ category }) {
  const cat = category || 'other';
  return (
    <span className="fin-cat-chip" style={{ '--chip-color': catColor(cat) }}>
      {catLabel(cat)}
    </span>
  );
}

// ── Recharts dark tooltip ─────────────────────────────────────────────────────

function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="fin-tooltip">
      {label && <div className="fin-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#e5e2e1', fontSize: 12 }}>
          {p.name ? `${p.name}: ` : ''}{fmtShort(p.value)}
        </div>
      ))}
    </div>
  );
}

// ── SVG Donut chart ───────────────────────────────────────────────────────────

function buildDonutSlices(data, total) {
  let cumulative = 0;
  return data.map((d) => {
    const pct = total > 0 ? (d.value / total) * 100 : 0;
    const slice = {
      ...d,
      pct,
      dasharray:  `${pct.toFixed(2)} 100`,
      dashoffset: (-cumulative).toFixed(2),
    };
    cumulative += pct;
    return slice;
  });
}

function DonutChart({ slices }) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  const built = buildDonutSlices(slices, total);
  return (
    <div className="fin-donut-wrap">
      <svg className="fin-donut-svg" viewBox="0 0 36 36">
        {/* Background ring */}
        <circle
          cx="18" cy="18" r="15.9155"
          fill="transparent"
          stroke="#2a2a2a"
          strokeWidth="3"
          strokeDasharray="100 100"
        />
        {built.map((s, i) => (
          <circle
            key={i}
            cx="18" cy="18" r="15.9155"
            fill="transparent"
            stroke={s.color}
            strokeWidth="3"
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
          />
        ))}
      </svg>
      <div className="fin-donut-center">
        <span className="fin-donut-label">Total</span>
        <span className="fin-donut-total">{fmtShort(total)}</span>
      </div>
    </div>
  );
}

// ── All Transactions view ─────────────────────────────────────────────────────

function AllTransactionsView({ transactions, onBack }) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? transactions.filter(
        (t) =>
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          (t.category || '').toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  return (
    <div className="fin-all-txns">
      <div className="fin-all-header">
        <button className="fin-back-btn" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="fin-all-title">Transactions</h2>
        <input
          className="fin-search"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="fin-table-wrap">
        <table className="fin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i}>
                <td className="fin-td-date">{t.date}</td>
                <td className="fin-td-desc">{t.description}</td>
                <td><CategoryChip category={t.category} /></td>
                <td className={`fin-td-amt ${t.type === 'credit' ? 'credit' : 'debit'}`}>
                  {t.type === 'credit' ? '+' : '-'}{fmt(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="fin-empty">No transactions found</div>
        )}
      </div>
    </div>
  );
}

// ── Spent tab ─────────────────────────────────────────────────────────────────

function SpentTab({ transactions, summary, loading, onViewAll }) {
  const months3      = getLastNMonths(3);
  const rawMonthly   = buildMonthlySpending(transactions, months3);

  // add avg field to each entry for the dashed reference line
  const monthlyAmounts = rawMonthly.map((d) => d.amount);
  const avgAmount =
    monthlyAmounts.length > 0
      ? Math.round(monthlyAmounts.reduce((s, v) => s + v, 0) / monthlyAmounts.length)
      : 0;
  const monthlyData = rawMonthly.map((d) => ({ ...d, avg: avgAmount }));

  const recent5 = transactions.slice(0, 5);

  // Donut / category data
  const byCategory = summary?.data?.by_category || {};
  const pieData = Object.entries(byCategory)
    .filter(([cat]) => EXPENSE_CATS.includes(cat))
    .map(([cat, amount]) => ({
      name:  catLabel(cat),
      value: Math.round(amount),
      cat,
      color: catColor(cat),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Cash flow
  const totalIncome   = summary?.data?.total_income || 0;
  const totalExpenses = summary?.data?.total_spent  || 0;
  const expPct        = totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0;
  const net           = totalIncome - totalExpenses;

  return (
    <div className="fin-tab-content">

      {/* Bento grid */}
      <div className="fin-bento">

        {/* Left: Expense Categories */}
        <div className="fin-card">
          <div className="fin-section-label">Expense Categories</div>
          {loading ? (
            <Skeleton height={320} />
          ) : pieData.length > 0 ? (
            <>
              <DonutChart slices={pieData} />
              <ul className="fin-pie-legend">
                {pieData.map((d, i) => (
                  <li key={i} className="fin-pie-legend-item">
                    <div className="fin-pie-legend-left">
                      <span className="fin-pie-legend-dot" style={{ background: d.color }} />
                      <span className="fin-pie-legend-name">{d.name}</span>
                    </div>
                    <span className="fin-pie-legend-amt">{fmtShort(d.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="fin-empty">No category data yet</div>
          )}
        </div>

        {/* Right column */}
        <div className="fin-bento-right">

          {/* Spend this Month */}
          <div className="fin-card">
            <div className="fin-chart-header">
              <span className="fin-section-label" style={{ marginBottom: 0 }}>
                Spend this Month
              </span>
              <div className="fin-chart-legend">
                <div className="fin-legend-item">
                  <span className="fin-legend-dot-solid" />
                  <span className="fin-legend-text">Current</span>
                </div>
                <div className="fin-legend-item">
                  <span className="fin-legend-dot-dashed" />
                  <span className="fin-legend-text">Avg</span>
                </div>
              </div>
            </div>
            {loading ? (
              <Skeleton height={160} />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={monthlyData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%"   stopColor="#3d5afe" />
                      <stop offset="100%" stopColor="#bbc3ff" />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#8e8fa2', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#8e8fa2', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? '$' + (v / 1000).toFixed(0) + 'k' : '$' + v
                    }
                    width={44}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="url(#lineGrad)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#bbc3ff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="rgba(68,70,86,0.4)"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 3"
                    activeDot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Cash Flow Analysis */}
          <div className="fin-card">
            <div className="fin-section-label">Cash Flow Analysis</div>
            {loading ? (
              <Skeleton height={140} />
            ) : (
              <div className="fin-cashflow">
                <div className="fin-cashflow-row">
                  <div className="fin-cashflow-meta">
                    <span className="fin-cashflow-label">Total Income</span>
                    <span className="fin-cashflow-value">{fmt(totalIncome)}</span>
                  </div>
                  <div className="fin-cashflow-track">
                    <div
                      className="fin-cashflow-fill"
                      style={{ width: '100%', background: '#1c2971' }}
                    />
                  </div>
                </div>
                <div className="fin-cashflow-row">
                  <div className="fin-cashflow-meta">
                    <span className="fin-cashflow-label">Total Expenses</span>
                    <span className="fin-cashflow-value expenses">{fmt(totalExpenses)}</span>
                  </div>
                  <div className="fin-cashflow-track">
                    <div
                      className="fin-cashflow-fill"
                      style={{ width: expPct + '%', background: '#3d5afe' }}
                    />
                  </div>
                </div>
                <div className="fin-cashflow-net">
                  <span className="fin-cashflow-net-label">Net Savings</span>
                  <span className={`fin-cashflow-net-value${net < 0 ? ' negative' : ''}`}>
                    {net >= 0 ? '+' : ''}{fmt(net)}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Latest Transactions */}
      <div className="fin-card">
        <div className="fin-card-header">
          <span className="fin-section-label" style={{ marginBottom: 0 }}>
            Latest Transactions
          </span>
          <button className="fin-view-all" onClick={onViewAll}>View All ›</button>
        </div>
        {loading ? (
          <Skeleton height={200} />
        ) : (
          <div className="fin-txn-list">
            {recent5.length === 0 && (
              <div className="fin-empty">No recent transactions</div>
            )}
            {recent5.map((t, i) => (
              <div key={i} className="fin-txn-row">
                <div className="fin-txn-icon">
                  <span className="material-symbols-outlined">{catMIcon(t.category)}</span>
                </div>
                <div className="fin-txn-info">
                  <div className="fin-txn-desc">{t.description}</div>
                  <div className="fin-txn-date">{t.date}</div>
                </div>
                <div className="fin-txn-right">
                  <div className={`fin-txn-amt ${t.type === 'credit' ? 'credit' : 'debit'}`}>
                    {t.type === 'credit' ? '+' : '-'}{fmt(t.amount)}
                  </div>
                  {t.account && (
                    <div className="fin-txn-acct">{t.account}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Goals tab ─────────────────────────────────────────────────────────────────

function GoalsTab({ goals, summary, loading, onGoalSaved }) {
  const [budgetLimits, setBudgetLimits] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zc_budget_limits') || '{}'); }
    catch { return {}; }
  });
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showGoalForm,   setShowGoalForm]   = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: 'dining', amount: '' });
  const [goalForm,   setGoalForm]   = useState({ name: '', target_amount: '', target_date: '' });
  const [saving, setSaving] = useState(false);

  const spendingByCategory = summary?.data?.by_category || {};

  const saveBudget = () => {
    if (!budgetForm.amount) return;
    const updated = { ...budgetLimits, [budgetForm.category]: parseFloat(budgetForm.amount) };
    setBudgetLimits(updated);
    localStorage.setItem('zc_budget_limits', JSON.stringify(updated));
    setShowBudgetForm(false);
    setBudgetForm({ category: 'dining', amount: '' });
  };

  const removeBudget = (cat) => {
    const updated = { ...budgetLimits };
    delete updated[cat];
    setBudgetLimits(updated);
    localStorage.setItem('zc_budget_limits', JSON.stringify(updated));
  };

  const saveGoal = async () => {
    if (!goalForm.name || !goalForm.target_amount) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/budget/goals`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          goalForm.name,
          target_amount: parseFloat(goalForm.target_amount),
          target_date:   goalForm.target_date || null,
        }),
      });
      setGoalForm({ name: '', target_amount: '', target_date: '' });
      setShowGoalForm(false);
      if (onGoalSaved) onGoalSaved();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fin-tab-content">

      {/* Budget Management */}
      <div className="fin-card">
        <div className="fin-manage-header">
          <h3 className="fin-manage-title">Manage Budgets</h3>
          <button
            className="fin-new-cat-btn"
            onClick={() => setShowBudgetForm((v) => !v)}
          >
            <span className="material-symbols-outlined">add_circle</span>
            New Category
          </button>
        </div>

        {showBudgetForm && (
          <div className="fin-inline-form">
            <select
              className="fin-select"
              value={budgetForm.category}
              onChange={(e) => setBudgetForm((f) => ({ ...f, category: e.target.value }))}
            >
              {EXPENSE_CATS.map((c) => (
                <option key={c} value={c}>{catLabel(c)}</option>
              ))}
            </select>
            <input
              className="fin-input"
              type="number"
              placeholder="Monthly limit ($)"
              value={budgetForm.amount}
              onChange={(e) => setBudgetForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <div className="fin-form-row">
              <button className="fin-save-btn" onClick={saveBudget}>Save</button>
              <button
                className="fin-cancel-btn"
                onClick={() => setShowBudgetForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <Skeleton height={100} />
        ) : Object.keys(budgetLimits).length === 0 ? (
          <div className="fin-empty">No budgets set — add a category above</div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="fin-budget-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Planned</th>
                  <th>Actual</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(budgetLimits).map(([cat, limit]) => {
                  const spent      = spendingByCategory[cat] || 0;
                  const pct        = limit > 0 ? Math.round((spent / limit) * 100) : 0;
                  const status     = pct >= 100 ? 'over-limit' : pct >= 85 ? 'at-risk' : 'on-budget';
                  const statusLabel = pct >= 100 ? 'Over Limit' : pct >= 85 ? 'At Risk' : 'On Budget';
                  return (
                    <tr key={cat}>
                      <td>
                        <span
                          className="fin-cat-dot"
                          style={{ background: catColor(cat) }}
                        />
                        <span className="fin-table-cat">{catLabel(cat)}</span>
                      </td>
                      <td>{fmt(limit)}</td>
                      <td className={pct >= 100 ? 'fin-table-over' : ''}>{fmt(spent)}</td>
                      <td>
                        <span className={`fin-status-badge ${status}`}>{statusLabel}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="fin-table-edit-btn"
                          onClick={() => removeBudget(cat)}
                          title="Remove budget"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="fin-budget-cards">
              {Object.entries(budgetLimits).map(([cat, limit]) => {
                const spent     = spendingByCategory[cat] || 0;
                const pct       = limit > 0 ? Math.round((spent / limit) * 100) : 0;
                const remaining = Math.max(limit - spent, 0);
                return (
                  <div key={cat} className="fin-budget-card">
                    <div className="fin-budget-card-left">
                      <div className="fin-budget-card-icon">
                        <span className="material-symbols-outlined">{catMIcon(cat)}</span>
                      </div>
                      <div>
                        <div className="fin-budget-card-name">{catLabel(cat)}</div>
                        <div className="fin-budget-card-sub">{pct}% of {fmt(limit)}</div>
                      </div>
                    </div>
                    <div className="fin-budget-card-right">
                      <div className="fin-budget-card-amt">{fmt(spent)}</div>
                      <div className="fin-budget-card-rem">Remaining: {fmt(remaining)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Savings Goals */}
      <div className="fin-card">
        <div className="fin-goals-section-header">
          <h3 className="fin-goals-section-title">Savings Goals</h3>
          <button
            className="fin-add-btn"
            onClick={() => setShowGoalForm((v) => !v)}
          >
            + Add Goal
          </button>
        </div>

        {showGoalForm && (
          <div className="fin-inline-form">
            <input
              className="fin-input"
              placeholder="Goal name (e.g. Japan Trip)"
              value={goalForm.name}
              onChange={(e) => setGoalForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="fin-input"
              type="number"
              placeholder="Target amount ($)"
              value={goalForm.target_amount}
              onChange={(e) =>
                setGoalForm((f) => ({ ...f, target_amount: e.target.value }))
              }
            />
            <input
              className="fin-input"
              type="date"
              value={goalForm.target_date}
              onChange={(e) =>
                setGoalForm((f) => ({ ...f, target_date: e.target.value }))
              }
            />
            <div className="fin-form-row">
              <button
                className="fin-save-btn"
                onClick={saveGoal}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                className="fin-cancel-btn"
                onClick={() => setShowGoalForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <Skeleton height={160} />
        ) : (
          <div className="fin-goals-list">
            {goals.length === 0 && (
              <div className="fin-empty">No savings goals yet — add one above</div>
            )}
            {goals.map((g, i) => {
              const pct     = g.pct_complete || 0;
              const onTrack =
                !g.days_left ||
                pct >= 80 ||
                (g.monthly_needed && g.monthly_needed < 1000);
              const barColor = g.completed ? '#4ADE80' : '#3d5afe';
              const badgeClass = g.completed
                ? 'complete'
                : onTrack
                ? 'on-track'
                : 'behind';
              const badgeLabel = g.completed
                ? 'Complete'
                : onTrack
                ? 'On Track'
                : 'Behind';
              return (
                <div key={i} className="fin-goal-card">
                  <div className="fin-goal-head">
                    <span className="fin-goal-name">{g.name}</span>
                    <span className={`fin-goal-badge ${badgeClass}`}>{badgeLabel}</span>
                  </div>
                  <div className="fin-goal-amounts">
                    <span className="fin-goal-saved">{fmt(g.current_saved)}</span>
                    <span className="fin-goal-sep"> / </span>
                    <span className="fin-goal-target">{fmt(g.target_amount)}</span>
                    {g.target_date && (
                      <span className="fin-goal-date"> · by {g.target_date}</span>
                    )}
                  </div>
                  <div className="fin-progress-track">
                    <div
                      className="fin-progress-fill"
                      style={{ width: Math.min(pct, 100) + '%', background: barColor }}
                    />
                  </div>
                  <div className="fin-goal-foot">
                    <span className="fin-goal-pct">{pct}% saved</span>
                    {g.monthly_needed && !g.completed && (
                      <span className="fin-goal-proj">Need {fmt(g.monthly_needed)}/mo</span>
                    )}
                    {g.days_left != null && !g.completed && (
                      <span className="fin-goal-days">{g.days_left}d left</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

function FinanceDashboard({ onBack, theme = 'dark' }) {
  const [tab,          setTab]          = useState('spent');
  const [transactions, setTransactions] = useState([]);
  const [summary,      setSummary]      = useState(null);
  const [goals,        setGoals]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [showAllTxns,  setShowAllTxns]  = useState(false);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [txnRes, sumRes, goalsRes] = await Promise.all([
        fetch(`${API_URL}/budget/transactions?days=90`).then((r) => r.json()),
        fetch(`${API_URL}/budget/summary?days=30`).then((r) => r.json()),
        fetch(`${API_URL}/budget/goals`).then((r) => r.json()),
      ]);
      setTransactions(txnRes.transactions || []);
      setSummary(sumRes);
      setGoals(goalsRes.goals || []);
    } catch {
      setError('Failed to load financial data. Is the ZeroClaw backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchData]);

  const handleRefresh = () => {
    setLoading(true);
    fetchData();
  };

  // All-transactions full-screen slide-in
  if (showAllTxns) {
    return (
      <div className={`fin-shell ${theme}`}>
        <AllTransactionsView
          transactions={transactions}
          onBack={() => setShowAllTxns(false)}
        />
      </div>
    );
  }

  const totalIncome    = summary?.data?.total_income || 0;
  const spentThisMonth = thisMonthTotal(transactions);

  return (
    <div className="fin-shell">

      {/* Header */}
      <div className="fin-header">
        <button className="fin-back-btn" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className="fin-header-center">
          <div className="fin-eyebrow">Portfolio Analytics</div>
          <h1 className="fin-title">Budget Breakdown</h1>
        </div>

        <div className="fin-header-right">
          <div className="fin-stat-card">
            <div className="fin-stat-label">Total Income</div>
            <div className="fin-stat-value">{fmt(totalIncome)}</div>
          </div>
          <div className="fin-stat-card">
            <div className="fin-stat-label">Spent to Date</div>
            <div className="fin-stat-value primary">{fmt(spentThisMonth)}</div>
          </div>
          <button
            className="fin-refresh-btn"
            onClick={handleRefresh}
            title="Refresh data"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="fin-tabs">
        <button
          className={`fin-tab ${tab === 'spent' ? 'active' : ''}`}
          onClick={() => setTab('spent')}
        >
          Spent
        </button>
        <button
          className={`fin-tab ${tab === 'goals' ? 'active' : ''}`}
          onClick={() => setTab('goals')}
        >
          Budget &amp; Goals
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="fin-error-card">
          <span>{error}</span>
          <button className="fin-retry-btn" onClick={handleRefresh}>Retry</button>
        </div>
      )}

      {/* Content */}
      {!error && (
        tab === 'spent' ? (
          <SpentTab
            transactions={transactions}
            summary={summary}
            loading={loading}
            onViewAll={() => setShowAllTxns(true)}
          />
        ) : (
          <GoalsTab
            goals={goals}
            summary={summary}
            loading={loading}
            onGoalSaved={fetchData}
          />
        )
      )}

    </div>
  );
}

export default FinanceDashboard;
