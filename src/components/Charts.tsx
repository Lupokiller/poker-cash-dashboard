'use client';
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { currency } from '@/lib/data';

const gridStroke = '#3f3f46';
const axisStroke = '#a1a1aa';
const tooltipStyle = {
  backgroundColor: 'rgb(24 24 27 / 0.95)',
  border: '1px solid rgb(63 63 70)',
  borderRadius: '0.75rem',
};

export function RankingChart({ data }: { data: { name: string; net: number }[] }) {
  return (
    <div className='glass-card flex h-80 flex-col p-4'>
      <h3 className='mb-3 text-sm font-semibold text-zinc-200'>Ranking lucro/prejuizo</h3>
      <div className='min-h-0 flex-1'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray='3 3' stroke={gridStroke} vertical={false} />
            <XAxis dataKey='name' stroke={axisStroke} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <YAxis stroke={axisStroke} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => currency(Number(value ?? 0))}
              labelStyle={{ color: '#e4e4e7' }}
            />
            <Bar dataKey='net' radius={[6, 6, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.net >= 0 ? '#34d399' : '#fb7185'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BankrollLine({ data }: { data: { session: string; balance: number }[] }) {
  return (
    <div className='glass-card flex h-80 flex-col p-4'>
      <h3 className='mb-3 text-sm font-semibold text-zinc-200'>Evolucao do caixa por sessao</h3>
      <div className='min-h-0 flex-1'>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray='3 3' stroke={gridStroke} />
            <XAxis dataKey='session' stroke={axisStroke} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <YAxis stroke={axisStroke} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => currency(Number(value ?? 0))}
              labelStyle={{ color: '#e4e4e7' }}
            />
            <Line type='monotone' dataKey='balance' stroke='#38bdf8' strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RakeEvolutionChart({ data }: { data: { date: string; lucroReal: number; label: string }[] }) {
  return (
    <div className='glass-card p-4'>
      <h3 className='mb-3 text-sm font-semibold text-zinc-200'>Evolução do lucro real</h3>
      <div className='h-[260px] w-full min-w-0'>
        <ResponsiveContainer width='100%' height='100%'>
          <AreaChart data={data}>
            <defs>
              <linearGradient id='lucroRealAreaFill' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#8b5cf6' stopOpacity={0.45} />
                <stop offset='100%' stopColor='#1e3a8a' stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' stroke={gridStroke} vertical={false} />
            <XAxis dataKey='label' stroke={axisStroke} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <YAxis stroke={axisStroke} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => currency(Number(value ?? 0))}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as { date?: string } | undefined;
                return item?.date ? `Sessão ${item.date}` : '';
              }}
              labelStyle={{ color: '#e4e4e7' }}
            />
            <Area
              type='monotone'
              dataKey='lucroReal'
              stroke='#a78bfa'
              strokeWidth={2.5}
              fill='url(#lucroRealAreaFill)'
              dot={{ r: 3, fill: '#c4b5fd', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DistributionPie({ data }: { data: { name: string; value: number }[] }) {
  const colors = ['#34d399', '#fb7185', '#fbbf24'];
  return (
    <div className='glass-card flex h-80 flex-col p-4'>
      <h3 className='mb-3 text-sm font-semibold text-zinc-200'>Distribuicao dos resultados</h3>
      <div className='min-h-0 flex-1'>
        <ResponsiveContainer width='100%' height='100%'>
          <PieChart>
            <Pie data={data} dataKey='value' nameKey='name' outerRadius={88} innerRadius={28}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} stroke='rgb(39 39 42)' strokeWidth={1} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => currency(Number(value ?? 0))}
              labelStyle={{ color: '#e4e4e7' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
