import { useState, useMemo } from 'react'

const COST_RANKS: Record<string, number> = { S: 10, M: 7, L: 4, XL: 2 }

interface Feature {
  id: string
  name: string
  description: string
  devCost: 'S' | 'M' | 'L' | 'XL'
  trendScore: number
  defaultUserValue: number
}

const FEATURES: Feature[] = [
  {
    id: 'rpe',
    name: 'RPE Tracking',
    description: 'Log Rate of Perceived Exertion per set for intensity monitoring and autoregulation.',
    devCost: 'S',
    trendScore: 85,
    defaultUserValue: 8,
  },
  {
    id: 'plate-calc',
    name: 'Plate Calculator',
    description: 'Barbell plate math for any target weight across common bar types.',
    devCost: 'S',
    trendScore: 70,
    defaultUserValue: 7,
  },
  {
    id: 'rest-timer',
    name: 'Rest Timer',
    description: 'Between-set countdown with configurable audio and haptic cues.',
    devCost: 'S',
    trendScore: 75,
    defaultUserValue: 7,
  },
  {
    id: 'one-rm',
    name: '1RM Estimator',
    description: 'Auto-calculates estimated one-rep max from logged reps and load.',
    devCost: 'S',
    trendScore: 72,
    defaultUserValue: 6,
  },
  {
    id: 'supersets',
    name: 'Superset & Circuit Logging',
    description: 'Group exercises into supersets or circuits with paired set tracking.',
    devCost: 'M',
    trendScore: 80,
    defaultUserValue: 7,
  },
  {
    id: 'volume-trends',
    name: 'Volume Trend Charts',
    description: 'Weekly total volume and intensity trends per muscle group.',
    devCost: 'M',
    trendScore: 78,
    defaultUserValue: 8,
  },
  {
    id: 'muscle-heatmap',
    name: 'Muscle Group Heatmap',
    description: 'Body diagram heat-map showing session and weekly muscle coverage.',
    devCost: 'M',
    trendScore: 82,
    defaultUserValue: 7,
  },
  {
    id: 'social',
    name: 'Social Sharing',
    description: 'One-tap share of workouts, PRs, and streaks to social platforms.',
    devCost: 'L',
    trendScore: 60,
    defaultUserValue: 4,
  },
  {
    id: 'wearable',
    name: 'Wearable Sync',
    description: 'Sync heart rate and active calories from Apple Watch or Fitbit.',
    devCost: 'XL',
    trendScore: 90,
    defaultUserValue: 6,
  },
  {
    id: 'ai-coach',
    name: 'AI Coaching',
    description: 'ML-driven workout recommendations, deload suggestions, and progression planning.',
    devCost: 'XL',
    trendScore: 95,
    defaultUserValue: 8,
  },
]

const dataSources: Record<string, string> = {
  'User Value': 'Seed estimate — adjust sliders to reflect your priorities',
  'Trend Score': 'Manually scored against 2026 fitness-tech trends (0–100)',
  'Dev Cost': 'T-shirt sizing: S < 2 days · M < 1 week · L < 3 weeks · XL > 3 weeks',
}

function score(f: Feature, values: Record<string, number>): number {
  const u = values[f.id] !== undefined ? values[f.id] : f.defaultUserValue
  const t = f.trendScore / 10
  const c = COST_RANKS[f.devCost] ?? 5
  return Math.round((u * 0.5 + t * 0.3 + c * 0.2) * 10) / 10
}

function sliderStyle(value: number): React.CSSProperties {
  return { ['--val' as string]: `${((value - 1) / 9) * 100}%` }
}

export default function Dashboard() {
  const [userValues, setUserValues] = useState<Record<string, number>>(
    () => Object.fromEntries(FEATURES.map(f => [f.id, f.defaultUserValue]))
  )
  const [costFilter, setCostFilter] = useState<string[]>([])

  const sorted = useMemo(
    () => [...FEATURES].sort((a, b) => score(b, userValues) - score(a, userValues)),
    [userValues]
  )

  const filtered = useMemo(
    () =>
      costFilter.length === 0
        ? sorted
        : sorted.filter(f => costFilter.includes(f.devCost)),
    [sorted, costFilter]
  )

  const averagePriority = useMemo(() => {
    const scores = FEATURES.map(f => score(f, userValues))
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  }, [userValues])

  const highTrendCount = useMemo(
    () => FEATURES.filter(f => f.trendScore >= 80).length,
    []
  )

  function toggleCostFilter(tier: string): void {
    setCostFilter(prev =>
      prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]
    )
  }

  function resetAll(): void {
    setUserValues(Object.fromEntries(FEATURES.map(f => [f.id, f.defaultUserValue])))
    setCostFilter([])
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-header-inner">
          <div className="dash-brand">
            <span className="dash-label">TRAINING</span>
            <span className="dash-wordmark">Iron Logic</span>
          </div>
          <a href="../" className="btn-back" aria-label="Back to Iron Logic app">
            ← App
          </a>
        </div>
        <h1 className="dash-title">Feature Roadmap Prioritizer</h1>
        <p className="dash-subtitle">
          Seed planning model — adjust user-value sliders to explore priority rankings.
        </p>
      </header>

      <section className="seed-banner" aria-label="Data source notice">
        <div className="seed-banner-icon" aria-hidden="true">🌱</div>
        <div className="seed-banner-body">
          <strong>Seed / Planning Data — Not Live Telemetry</strong>
          <p>
            Scores are initial planning estimates, not real usage analytics. Adjust the
            User Value sliders to model your own priorities.
          </p>
          <ul className="seed-sources">
            {Object.entries(dataSources).map(([k, v]) => (
              <li key={k}>
                <span className="seed-key">{k}:</span> {v}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="stats-row" aria-label="Summary statistics">
        <div className="stat-card">
          <div className="stat-value">{FEATURES.length}</div>
          <div className="stat-label">Features</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{averagePriority}</div>
          <div className="stat-label">Avg Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-volt">{highTrendCount}</div>
          <div className="stat-label">High Trend Fit</div>
        </div>
        <div className="stat-card">
          <div className="stat-value stat-top">
            {sorted[0]?.name.split(' ')[0] ?? '—'}
          </div>
          <div className="stat-label">Top Pick</div>
        </div>
      </section>

      <div className="controls-row">
        <div className="filter-chips" role="group" aria-label="Filter by development cost">
          <span className="filter-label">Cost:</span>
          {(['S', 'M', 'L', 'XL'] as const).map(tier => (
            <button
              key={tier}
              className={`chip ${costFilter.includes(tier) ? 'chip-active' : ''}`}
              onClick={() => toggleCostFilter(tier)}
              aria-pressed={costFilter.includes(tier)}
            >
              {tier}
            </button>
          ))}
        </div>
        <button
          className="btn-reset"
          onClick={resetAll}
          aria-label="Reset all filters and slider values to defaults"
        >
          Reset All
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" role="status" aria-live="polite">
          <div className="empty-icon" aria-hidden="true">🔍</div>
          <h2 className="empty-heading">No features match this filter</h2>
          <p className="empty-body">
            The active cost filter{costFilter.length > 1 ? 's' : ''}{' '}
            <strong>{costFilter.join(' + ')}</strong> returned no results. Try
            selecting a different cost tier or reset to view all {FEATURES.length}{' '}
            features.
          </p>
          <button className="btn-primary" onClick={() => setCostFilter([])}>
            Clear Filter
          </button>
        </div>
      ) : (
        <ol className="feature-list" aria-label="Ranked roadmap features">
          {filtered.map((f, i) => {
            const s = score(f, userValues)
            const u = userValues[f.id] ?? f.defaultUserValue
            return (
              <li key={f.id} className="feature-card">
                <div className="feature-rank" aria-label={`Rank ${i + 1}`}>
                  {i + 1}
                </div>
                <div className="feature-body">
                  <div className="feature-top">
                    <div className="feature-name-row">
                      <h2 className="feature-name">{f.name}</h2>
                      <span
                        className={`cost-badge cost-${f.devCost.toLowerCase()}`}
                        title={`Development cost: ${f.devCost}`}
                      >
                        {f.devCost}
                      </span>
                    </div>
                    <p className="feature-desc">{f.description}</p>
                  </div>
                  <div className="feature-metrics">
                    <div className="metric-slider-group">
                      <div className="metric-slider-label">
                        <span className="metric-label">User Value</span>
                        <span className="metric-val">{u}/10</span>
                      </div>
                      <input
                        id={`slider-${f.id}`}
                        type="range"
                        min={1}
                        max={10}
                        value={u}
                        onChange={e =>
                          setUserValues(prev => ({
                            ...prev,
                            [f.id]: Number(e.target.value),
                          }))
                        }
                        className="value-slider"
                        style={sliderStyle(u)}
                        aria-label={`User value for ${f.name}, currently ${u} out of 10`}
                        aria-valuemin={1}
                        aria-valuemax={10}
                        aria-valuenow={u}
                      />
                      <div className="slider-range-labels" aria-hidden="true">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>
                    <div className="metric-pills">
                      <div className="metric-pill">
                        <div
                          className="trend-bar"
                          title={`2026 trend alignment: ${f.trendScore}%`}
                          role="img"
                          aria-label={`Trend alignment ${f.trendScore}%`}
                        >
                          <div
                            className="trend-fill"
                            style={{ width: `${f.trendScore}%` }}
                          />
                        </div>
                        <span className="pill-label">Trend</span>
                        <span className="pill-val">{f.trendScore}%</span>
                      </div>
                      <div className="metric-pill score-pill">
                        <span className="pill-label">Priority</span>
                        <span className="pill-val score-val">{s}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <footer className="dash-footer">
        <a href="../" className="btn-back-footer">
          ← Back to Iron Logic
        </a>
        <span className="footer-note">Seed model · not production analytics</span>
      </footer>
    </div>
  )
}
