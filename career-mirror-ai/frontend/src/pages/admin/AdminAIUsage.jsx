import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Bot, Cpu } from 'lucide-react'
import { api } from '../../services/api'
import { Badge, PageHead, SkeletonCard, StatCard } from '../../components/ui'

const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--ink)',
}

const PALETTE = ['var(--accent)', 'var(--violet)', 'var(--gold)', 'var(--accent-2)', 'var(--warn)', 'var(--success)']

export default function AdminAIUsage() {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(14)

  useEffect(() => {
    api.get(`/admin/ai-usage?days=${days}`).then((res) => setData(res.data)).catch(() => {})
  }, [days])

  if (!data) {
    return (
      <div className="page-enter">
        <PageHead title="AI Usage" sub="Local model & engine activity" />
        <div className="grid-4"><SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} /></div>
      </div>
    )
  }

  return (
    <div className="page-enter">
      <PageHead
        title="AI Usage"
        sub="Every local analysis, simulation and chat — no paid API tokens"
        actions={
          <select className="input" style={{ width: 150 }} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        }
      />

      <div className="grid-4">
        <StatCard label="Total AI Calls" value={data.total_calls} icon={<Cpu size={20} />} tone="var(--violet)" />
        <StatCard label="Analyses" value={data.by_endpoint.find((e) => e.name === 'analysis')?.count ?? 0} icon={<Bot size={20} />} />
        <StatCard label="What-if Simulations" value={data.by_endpoint.find((e) => e.name === 'what-if')?.count ?? 0} icon={<Bot size={20} />} tone="var(--gold)" />
        <StatCard label="Chat Messages" value={data.by_endpoint.find((e) => e.name === 'chat')?.count ?? 0} icon={<Bot size={20} />} tone="var(--success)" />
      </div>

      <div className="grid-2 mt-24">
        <div className="card card-pad">
          <div className="card-title mb-24">Calls per day</div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={data.per_day} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--violet)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--violet)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="count" name="Calls" stroke="var(--violet)" strokeWidth={2.5} fill="url(#aiGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card card-pad">
          <div className="card-title mb-24">By endpoint</div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={data.by_endpoint} dataKey="count" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                {data.by_endpoint.map((e, i) => <Cell key={e.name} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex" style={{ justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            {data.by_endpoint.map((e, i) => (
              <Badge key={e.name} kind="neutral" dot>{e.name} · {e.count}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-pad mt-24">
        <div className="card-title mb-24">By model / engine</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.by_model} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: 'var(--ink-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--line-faint)' }} />
            <Bar dataKey="count" name="Calls" radius={[6, 6, 0, 0]}>
              {data.by_model.map((m, i) => <Cell key={m.name} fill={PALETTE[i % PALETTE.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="small muted mt-16">
          The skill matcher and fallback answer engine run fully on-device. If Ollama is installed, chat uses a local LLM (e.g. llama3.2:3b).
        </p>
      </div>
    </div>
  )
}
