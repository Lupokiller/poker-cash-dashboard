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
  ScatterChart,
  Scatter,
  ZAxis,
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
      <div className='h-[280px] w-full min-w-0'>
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

export function PlayerNetLine({ data }: { data: { label: string; cumulativeNet: number }[] }) {
  if (data.length === 0) {
    return (
      <div className='flex h-48 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 text-sm text-zinc-500'>
        Sem sessões finalizadas para exibir evolução.
      </div>
    );
  }

  return (
    <div className='h-48 w-full min-w-0'>
      <ResponsiveContainer width='100%' height='100%'>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray='3 3' stroke={gridStroke} vertical={false} />
          <XAxis dataKey='label' stroke={axisStroke} tick={{ fill: '#a1a1aa', fontSize: 10 }} />
          <YAxis stroke={axisStroke} tick={{ fill: '#a1a1aa', fontSize: 10 }} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [currency(Number(value ?? 0)), 'Resultado acumulado']}
            labelStyle={{ color: '#e4e4e7' }}
          />
          <Line
            type='monotone'
            dataKey='cumulativeNet'
            stroke='#34d399'
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#34d399' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BankrollLine({ data }: { data: { session: string; balance: number }[] }) {
  return (
    <div className='glass-card flex h-80 flex-col p-4'>
      <h3 className='mb-3 text-sm font-semibold text-zinc-200'>Evolução do caixa por sessão</h3>
      <div className='h-[280px] w-full min-w-0'>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray='3 3' stroke={gridStroke} />
            <XAxis dataKey='session' stroke={axisStroke} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <YAxis stroke={axisStroke} tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [currency(Number(value ?? 0)), 'Rake acumulado']}
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
      <div className='h-[280px] w-full min-w-0'>
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

/** Rake/hora × tamanho da mesa — pontos = noites com cronômetro. */
export function TableSizeRakeScatter({
  data,
}: {
  data: { playersCount: number; rakePerHour: number; date: string; rakeBruto: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className='glass-card flex h-80 flex-col items-center justify-center p-4 text-center'>
        <h3 className='text-sm font-semibold text-zinc-200'>Radar rake/hora × mesa</h3>
        <p className='mt-2 max-w-sm text-sm text-zinc-500'>
          Inicie e encerre o cronômetro nas noites para ver onde a mesa rende mais por hora.
        </p>
      </div>
    );
  }

  return (
    <div className='glass-card flex h-80 flex-col p-4'>
      <h3 className='mb-1 text-sm font-semibold text-zinc-200'>Radar rake/hora × tamanho da mesa</h3>
      <p className='mb-3 text-xs text-zinc-500'>
        Cada ponto é uma noite. Ideal: mais rake/hora com o tamanho certo de mesa.
      </p>
      <div className='h-[240px] w-full min-w-0'>
        <ResponsiveContainer width='100%' height='100%'>
          <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
            <CartesianGrid strokeDasharray='3 3' stroke={gridStroke} />
            <XAxis
              type='number'
              dataKey='playersCount'
              name='Jogadores'
              stroke={axisStroke}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              allowDecimals={false}
              label={{ value: 'Jogadores', position: 'insideBottom', offset: -2, fill: '#71717a', fontSize: 10 }}
            />
            <YAxis
              type='number'
              dataKey='rakePerHour'
              name='Rake/h'
              stroke={axisStroke}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              tickFormatter={(v) =>
                new Intl.NumberFormat('pt-BR', {
                  notation: 'compact',
                  style: 'currency',
                  currency: 'BRL',
                  maximumFractionDigits: 0,
                }).format(Number(v))
              }
            />
            <ZAxis type='number' dataKey='rakeBruto' range={[60, 280]} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value, name) => {
                if (name === 'rakePerHour' || name === 'Rake/h') {
                  return [currency(Number(value ?? 0)) + '/h', 'Rake/hora'];
                }
                if (name === 'playersCount' || name === 'Jogadores') {
                  return [String(value), 'Jogadores'];
                }
                return [currency(Number(value ?? 0)), String(name)];
              }}
              labelFormatter={(_, payload) => {
                const item = payload?.[0]?.payload as { date?: string } | undefined;
                return item?.date ? `Sessão ${item.date}` : '';
              }}
              labelStyle={{ color: '#e4e4e7' }}
            />
            <Scatter data={data} fill='#38bdf8' fillOpacity={0.85} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
