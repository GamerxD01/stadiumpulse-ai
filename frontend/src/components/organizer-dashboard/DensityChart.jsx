import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

export default function DensityChart({ stadiumState }) {
  const getChartData = () => {
    if (!stadiumState) return [];
    return Object.entries(stadiumState.crowd_density).map(([name, density]) => ({
      name,
      density
    }));
  };

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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8 }}
                labelStyle={{ color: '#fff', fonttext: 'bold', fontSize: 12 }}
                itemStyle={{ color: '#c084fc', fontSize: 12 }}
              />
              <Bar dataKey="density" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-slate-500">Awaiting data...</p>
        )}
      </div>
    </div>
  );
}
