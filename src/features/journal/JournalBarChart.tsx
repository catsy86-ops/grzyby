import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface JournalBarChartDatum {
  name: string
  count: number
  // Kolor słupka per-wpis (np. wg jadalności gatunku) - gdy brak, wszystkie słupki dostają ten
  // sam domyślny kolor (var(--color-primary)).
  fill?: string
}

// Wspólny wykres słupkowy statystyk Dziennika - wydzielony z JournalView.tsx przy okazji
// dodawania trzeciego wykresu (najlepsze miejscówki), żeby nie potroić tego samego bloku
// XAxis/YAxis/Tooltip. Etykiety osi X ukośne tylko gdy jest ich więcej/dłuższe (nazwy gatunków,
// miejscówek) - wykres miesięczny (12 krótkich etykiet) zostaje poziomy.
export function JournalBarChart({ data, angledLabels = false }: { data: JournalBarChartDatum[]; angledLabels?: boolean }) {
  return (
    <div className="h-56 rounded-xl border border-border p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
            interval={0}
            angle={angledLabels ? -20 : 0}
            textAnchor={angledLabels ? 'end' : 'middle'}
          />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--color-muted-foreground)' }} />
          <Tooltip
            cursor={{ fill: 'var(--color-muted)' }}
            contentStyle={{
              background: 'var(--color-popover)',
              color: 'var(--color-popover-foreground)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--color-popover-foreground)' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill ?? 'var(--color-primary)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
