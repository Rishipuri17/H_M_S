import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export const ForecastLineChart = ({ data }) => {
  // data format: [{ date: '2026-03-25', patients: 120 }, ...]
  if (!data || data.length === 0) return <div>No forecast data available.</div>;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <h4 style={{ textAlign: 'center', marginBottom: 12, color: '#334155' }}>Patient Arrival Forecast (Next 7 Days)</h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(tick) => {
              const d = new Date(tick);
              return `${d.getDate()} / ${d.getMonth() + 1}`;
            }}
            stroke="#94a3b8" 
          />
          <YAxis stroke="#94a3b8" />
          <Tooltip 
            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="patients" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            name="Predicted Arrivals"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};


export const HistoricalBarChart = ({ data }) => {
  // data format: [{ name: 'Last Week', historical: 700, predicted: 750 }]
  if (!data || data.length === 0) return null;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <h4 style={{ textAlign: 'center', marginBottom: 12, color: '#334155' }}>Predicted vs Historical Weekly Volume</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" />
          <Tooltip 
            cursor={{ fill: '#f1f5f9' }}
            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
          />
          <Legend />
          <Bar dataKey="historical" fill="#94a3b8" name="Historical" radius={[4, 4, 0, 0]} />
          <Bar dataKey="predicted" fill="#f59e0b" name="Predicted" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


export const DiseasePieChart = () => {
  // Static dummy data illustrating risk categories
  const data = [
    { name: 'Low Risk', value: 45, color: '#10b981' },
    { name: 'Medium Risk', value: 35, color: '#f59e0b' },
    { name: 'High Risk', value: 20, color: '#ef4444' },
  ];

  return (
    <div style={{ width: '100%', height: 300 }}>
      <h4 style={{ textAlign: 'center', marginBottom: 0, color: '#334155' }}>System-wide Risk Distribution</h4>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
            formatter={(value) => `${value}%`}
          />
          <Legend verticalAlign="bottom" height={36}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
