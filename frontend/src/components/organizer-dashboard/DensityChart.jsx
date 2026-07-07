/**
 * @fileoverview DensityChart component.
 * Renders a responsive Recharts bar chart showing live crowd density percentages across all stadium zones.
 */

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

// ---------------------------------------------------------------------------
// Recharts configuration constants — defined outside the component to avoid
// recreating inline objects on every render (each new object reference triggers
// Recharts to re-animate the chart unnecessarily).
// ---------------------------------------------------------------------------

/** Tooltip content panel styles passed to the Recharts Tooltip component. */
const TOOLTIP_CONTENT_STYLE = { backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 };

/** Tooltip label styles. */
const TOOLTIP_LABEL_STYLE = { color: '#fff', fontWeight: 'bold', fontSize: 12 };

/** Tooltip item styles (data line colour). */
const TOOLTIP_ITEM_STYLE = { color: '#c084fc', fontSize: 12 };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DensityChart — Renders a live Recharts bar chart of per-zone crowd densities.
 *
 * Chart data is derived from `stadiumState.crowd_density` via a memoised
 * transformation so the chart only re-renders when the underlying sensor values
 * change, not on every parent render cycle.
 *
 * @param {Object|null} stadiumState - Live stadium state object; chart shows a
 *   placeholder when null/undefined (e.g. on first load before first poll).
 */
export default function DensityChart({ stadiumState }) {
  /**
   * Converts the crowd_density map into the [{name, density}] array
   * format required by Recharts. Memoised to avoid unnecessary recomputation.
   *
   * @type {Array<{name: string, density: number}>}
   */
  const chartData = useMemo(() => {
    if (!stadiumState) return [];
    return Object.entries(stadiumState.crowd_density).map(([name, density]) => ({ name, density }));
  }, [stadiumState]);

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col gap-4 lg:col-span-2">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-indigo-400" aria-hidden="true" />
          Zone Densities Live Matrix
        </h3>
        <p className="text-xs text-slate-400">Current crowd sensor index per sector</p>
      </div>
      <div className="h-[220px] w-full">
        {stadiumState ? (
          <>
            {/* Screen reader table representing the chart data */}
            <div className="sr-only">
              <h4>Live Sector Crowd Densities Table</h4>
              <table>
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Density Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((d) => (
                    <tr key={d.name}>
                      <td>{d.name}</td>
                      <td>{d.density}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={TOOLTIP_CONTENT_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                />
                <Bar dataKey="density" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="text-xs text-slate-500">Awaiting data...</p>
        )}
      </div>
    </div>
  );
}
