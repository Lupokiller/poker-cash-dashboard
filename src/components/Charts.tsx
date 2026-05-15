'use client';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { currency } from '@/lib/data';

export function RankingChart({ data }: { data: { name: string; net: number }[] }) {
  return <div className='glass-card p-4 h-80'><h3 className='mb-3 font-medium'>Ranking lucro/prejuizo</h3><ResponsiveContainer width='100%' height='90%'><BarChart data={data}><CartesianGrid strokeDasharray='3 3' stroke='#334155' /><XAxis dataKey='name' stroke='#94a3b8' /><YAxis stroke='#94a3b8' /><Tooltip formatter={(value) => currency(Number(value ?? 0))} /><Bar dataKey='net'>{data.map((d,i)=><Cell key={i} fill={d.net>=0?'#34d399':'#fb7185'} />)}</Bar></BarChart></ResponsiveContainer></div>;
}

export function BankrollLine({ data }: { data: { session: string; balance: number }[] }) {
  return <div className='glass-card p-4 h-80'><h3 className='mb-3 font-medium'>Evolucao do caixa por sessao</h3><ResponsiveContainer width='100%' height='90%'><LineChart data={data}><CartesianGrid strokeDasharray='3 3' stroke='#334155' /><XAxis dataKey='session' stroke='#94a3b8' /><YAxis stroke='#94a3b8' /><Tooltip formatter={(value) => currency(Number(value ?? 0))} /><Line type='monotone' dataKey='balance' stroke='#38bdf8' strokeWidth={3} /></LineChart></ResponsiveContainer></div>;
}

export function DistributionPie({ data }: { data: { name: string; value: number }[] }) {
  const colors = ['#34d399','#fb7185','#fbbf24'];
  return <div className='glass-card p-4 h-80'><h3 className='mb-3 font-medium'>Distribuicao dos resultados</h3><ResponsiveContainer width='100%' height='90%'><PieChart><Pie data={data} dataKey='value' nameKey='name' outerRadius={95}>{data.map((_,i)=><Cell key={i} fill={colors[i%colors.length]} />)}</Pie><Tooltip formatter={(value) => currency(Number(value ?? 0))} /></PieChart></ResponsiveContainer></div>;
}
