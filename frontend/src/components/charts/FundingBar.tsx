import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface FundingData {
  name: string;
  projected: number;
  committed: number;
  obligated: number;
  available: number;
}

interface Props {
  data: FundingData[];
}

export default function FundingBar({ data }: Props) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">No funding data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
        <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
        <Legend />
        <Bar dataKey="obligated" stackId="a" fill="#22c55e" name="Obligated" />
        <Bar dataKey="committed" stackId="a" fill="#3b82f6" name="Committed" />
        <Bar dataKey="projected" stackId="a" fill="#f59e0b" name="Projected" />
        <Bar dataKey="available" stackId="a" fill="#e5e7eb" name="Available" />
      </BarChart>
    </ResponsiveContainer>
  );
}
