import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownUp,
  ArrowLeft,
  BarChart3,
  Brain,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  Dumbbell,
  Filter,
  Moon,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sun,
  Timer,
  Watch,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CostBand = "S" | "M" | "L" | "XL";
type Category = "Training logic" | "Logging flow" | "Integrations" | "Analytics";

type Feature = {
  id: string;
  name: string;
  category: Category;
  cost: CostBand;
  effort: number;
  trend: number;
  userRating: number;
  strategicFit: number;
  evidence: string;
  why: string;
};

const costLabels: Record<CostBand, string> = {
  S: "1-2 days",
  M: "3-5 days",
  L: "1-2 weeks",
  XL: "3+ weeks",
};

// Iron Logic-native cost band styling: volt for the cheapest tier (the
// gym-floor wins), graded slate fills for everything else. Keeps the panel
// monochromatic so the volt accent only fires where it earns attention.
const costClasses: Record<CostBand, string> = {
  S: "border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]",
  M: "border-border bg-[hsl(var(--muted)/0.7)] text-foreground",
  L: "border-border bg-[hsl(var(--muted)/0.5)] text-muted-foreground",
  XL: "border-[hsl(var(--destructive)/0.35)] bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]",
};

const initialFeatures: Feature[] = [
  {
    id: "ai-coach",
    name: "AI coaching",
    category: "Training logic",
    cost: "XL",
    effort: 5,
    trend: 98,
    userRating: 92,
    strategicFit: 95,
    evidence: "Top 2026 trend: adaptive plans, coaching decisions, injury-risk prompts.",
    why: "Turns raw logs into recommendations when recovery, missed sessions, or equipment changes disrupt the plan.",
  },
  {
    id: "rpe",
    name: "RPE / RIR tracking",
    category: "Logging flow",
    cost: "M",
    effort: 2,
    trend: 82,
    userRating: 90,
    strategicFit: 88,
    evidence: "High-value strength feature for fatigue management and autoregulation.",
    why: "Lets you judge intensity without needing perfect wearable data and enables smarter load progression.",
  },
  {
    id: "supersets",
    name: "Supersets and circuits",
    category: "Logging flow",
    cost: "M",
    effort: 2,
    trend: 72,
    userRating: 83,
    strategicFit: 80,
    evidence: "Common workflow need for efficient lifting sessions and conditioning blocks.",
    why: "Improves session speed by grouping movements, timers, and volume into a single logging flow.",
  },
  {
    id: "wearables",
    name: "Wearable sync",
    category: "Integrations",
    cost: "XL",
    effort: 5,
    trend: 96,
    userRating: 78,
    strategicFit: 86,
    evidence: "2026 trend driver: recovery, HRV, sleep, strain, and biomonitoring inputs.",
    why: "Connects strength sessions with recovery context from Apple Health, Google Fit, Garmin, or Whoop-style data.",
  },
  {
    id: "plate-calc",
    name: "Plate calculator",
    category: "Logging flow",
    cost: "S",
    effort: 1,
    trend: 58,
    userRating: 86,
    strategicFit: 78,
    evidence: "Low-cost gym-floor utility; less trend-led, but high day-to-day value.",
    why: "Reduces friction during barbell work with quick loading math and unit-aware plate selection.",
  },
  {
    id: "templates",
    name: "Program templates",
    category: "Training logic",
    cost: "L",
    effort: 3,
    trend: 84,
    userRating: 88,
    strategicFit: 92,
    evidence: "Personalized plans and reusable templates are baseline expectations in modern trackers.",
    why: "Turns repeat sessions into structured blocks for progressive overload, deloads, and equipment constraints.",
  },
  {
    id: "progress",
    name: "Progress analytics",
    category: "Analytics",
    cost: "L",
    effort: 3,
    trend: 86,
    userRating: 87,
    strategicFit: 90,
    evidence: "Users expect trend views, 1RM estimates, volume, consistency, and adherence signals.",
    why: "Makes the logger motivating by showing whether strength, volume, and consistency are actually moving.",
  },
  {
    id: "rest-timer",
    name: "Adaptive rest timer",
    category: "Logging flow",
    cost: "M",
    effort: 2,
    trend: 76,
    userRating: 81,
    strategicFit: 82,
    evidence: "Practical bridge between simple logging and coaching quality.",
    why: "Suggests rest based on lift type, RPE, prior set performance, and whether the next set is a PR attempt.",
  },
  {
    id: "prs",
    name: "PR detection",
    category: "Analytics",
    cost: "S",
    effort: 1,
    trend: 70,
    userRating: 84,
    strategicFit: 84,
    evidence: "Retention-friendly feedback loop that makes progress visible immediately.",
    why: "Automatically flags weight, reps, estimated 1RM, volume, and streak milestones without manual review.",
  },
  {
    id: "exercise-library",
    name: "Exercise library and notes",
    category: "Logging flow",
    cost: "L",
    effort: 3,
    trend: 66,
    userRating: 76,
    strategicFit: 74,
    evidence: "Foundational quality feature; enables substitutions, cues, and education content later.",
    why: "Creates a clean base for movement history, substitutions, technique cues, and future AI suggestions.",
  },
];

const dataSources = [
  "2026 AI fitness trend research",
  "Workout logger competitor patterns",
  "Iron Logic strength-training roadmap assumptions",
  "Editable user-value sliders",
];

function scoreFeature(feature: Feature, weights: Weights) {
  const costEfficiency = (6 - feature.effort) * 20;
  const weighted =
    feature.userRating * weights.user +
    feature.trend * weights.trend +
    feature.strategicFit * weights.fit +
    costEfficiency * weights.cost;
  return Math.round(weighted / (weights.user + weights.trend + weights.fit + weights.cost));
}

type Weights = {
  user: number;
  trend: number;
  fit: number;
  cost: number;
};

const defaultWeights: Weights = {
  user: 40,
  trend: 25,
  fit: 20,
  cost: 15,
};

// Inline mark mirroring the Iron Logic identity: a barbell silhouette with a
// loaded plate, set in the volt accent. Uses currentColor so it inherits the
// header's primary tint and stays sharp at 24px and 64px.
function Logo() {
  return (
    <svg
      aria-label="Iron Logic logo"
      className="h-8 w-8 text-primary"
      fill="none"
      viewBox="0 0 48 48"
    >
      <rect x="6" y="22" width="36" height="4" rx="1" fill="currentColor" />
      <rect x="10" y="16" width="5" height="16" rx="1" fill="currentColor" />
      <rect x="33" y="16" width="5" height="16" rx="1" fill="currentColor" />
      <rect x="17" y="19" width="3" height="10" rx="1" fill="currentColor" opacity="0.6" />
      <rect x="28" y="19" width="3" height="10" rx="1" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function MiniMetric({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Activity;
}) {
  return (
    <Card className="bg-card border-card-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              {label}
            </p>
            <p
              className="mt-2 truncate font-serif text-xl font-bold leading-none tracking-tight"
              data-testid={`metric-${label.toLowerCase().replaceAll(" ", "-")}`}
            >
              {value}
            </p>
          </div>
          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function RangeControl({
  label,
  value,
  min = 0,
  max = 100,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  testId: string;
}) {
  return (
    <label className="grid gap-2 text-[13px]">
      <span className="flex items-center justify-between gap-3">
        <span className="font-serif text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
        <span
          className="inline-flex items-center rounded-md border border-[hsl(var(--primary)/0.22)] bg-[hsl(var(--primary)/0.08)] px-2 py-0.5 text-[11px] font-bold tracking-wider text-primary tabular-nums"
          data-testid={`${testId}-value`}
        >
          {value}
        </span>
      </span>
      <input
        aria-label={label}
        className="h-1.5 w-full"
        data-testid={testId}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
    </label>
  );
}

export default function Dashboard() {
  const [features, setFeatures] = useState(initialFeatures);
  const [weights, setWeights] = useState(defaultWeights);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | Category>("All");
  const [maxCost, setMaxCost] = useState<"All" | CostBand>("All");
  const [minTrend, setMinTrend] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Iron Logic ships dark-only — default to dark regardless of OS preference
  // so the dashboard always lands on the canonical look first. Users can
  // still flip to light via the toggle if they want it.
  useEffect(() => {
    setTheme("dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const ranked = useMemo(() => {
    return features
      .map((feature) => ({
        ...feature,
        score: scoreFeature(feature, weights),
      }))
      .filter((feature) => {
        const matchesQuery = `${feature.name} ${feature.why}`.toLowerCase().includes(query.toLowerCase());
        const matchesCategory = category === "All" || feature.category === category;
        const matchesCost = maxCost === "All" || feature.effort <= { S: 1, M: 2, L: 3, XL: 5 }[maxCost];
        const matchesTrend = feature.trend >= minTrend;
        return matchesQuery && matchesCategory && matchesCost && matchesTrend;
      })
      .sort((a, b) => b.score - a.score);
  }, [category, features, maxCost, minTrend, query, weights]);

  const topFeature = ranked[0];
  const quickWins = ranked.filter((feature) => feature.effort <= 2 && feature.score >= 75).length;
  const averageTrend = Math.round(ranked.reduce((sum, feature) => sum + feature.trend, 0) / Math.max(ranked.length, 1));
  const averagePriority = Math.round(ranked.reduce((sum, feature) => sum + feature.score, 0) / Math.max(ranked.length, 1));
  const highTrendCount = ranked.filter((feature) => feature.trend >= 90).length;

  const chartData = ranked.slice(0, 8).map((feature) => ({
    name: feature.name.replace(" and ", " + "),
    score: feature.score,
    trend: feature.trend,
  }));

  function updateFeatureRating(id: string, userRating: number) {
    setFeatures((current) =>
      current.map((feature) => (feature.id === id ? { ...feature, userRating } : feature)),
    );
  }

  function resetModel() {
    setFeatures(initialFeatures);
    setWeights(defaultWeights);
    setQuery("");
    setCategory("All");
    setMaxCost("All");
    setMinTrend(0);
  }

  return (
    <div className="dashboard-shell bg-background text-foreground">
      <a className="sr-only focus:not-sr-only" href="#main-dashboard">
        Skip to dashboard
      </a>
      <header className="sticky top-0 z-50 border-b border-card-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="leading-tight">
              <p className="font-serif text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Iron Logic
              </p>
              <h1 className="font-serif text-xl font-bold uppercase tracking-tight">
                Roadmap
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              data-testid="link-back-to-app"
              size="sm"
              variant="outline"
            >
              <a href="../index.html" aria-label="Back to Workout Logger">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to App
              </a>
            </Button>
            <Button data-testid="button-reset-model" onClick={resetModel} size="sm" variant="secondary">
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset
            </Button>
            <Button
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              data-testid="button-theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              size="icon"
              variant="outline"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[320px_1fr] lg:px-8" id="main-dashboard">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Prioritization controls">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-serif text-sm font-bold uppercase tracking-[0.08em]">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                Scoring Weights
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <RangeControl
                label="User value"
                onChange={(value) => setWeights((current) => ({ ...current, user: value }))}
                testId="slider-weight-user"
                value={weights.user}
              />
              <RangeControl
                label="2026 trend alignment"
                onChange={(value) => setWeights((current) => ({ ...current, trend: value }))}
                testId="slider-weight-trend"
                value={weights.trend}
              />
              <RangeControl
                label="Strategic fit"
                onChange={(value) => setWeights((current) => ({ ...current, fit: value }))}
                testId="slider-weight-fit"
                value={weights.fit}
              />
              <RangeControl
                label="Cost efficiency"
                onChange={(value) => setWeights((current) => ({ ...current, cost: value }))}
                testId="slider-weight-cost"
                value={weights.cost}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-serif text-sm font-bold uppercase tracking-[0.08em]">
                <Filter className="h-4 w-4 text-primary" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Search features
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    data-testid="input-search-features"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="AI, RPE, plate..."
                    value={query}
                  />
                </div>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Category
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  data-testid="select-category"
                  onChange={(event) => setCategory(event.target.value as "All" | Category)}
                  value={category}
                >
                  <option>All</option>
                  <option>Training logic</option>
                  <option>Logging flow</option>
                  <option>Integrations</option>
                  <option>Analytics</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Max development cost
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  data-testid="select-cost"
                  onChange={(event) => setMaxCost(event.target.value as "All" | CostBand)}
                  value={maxCost}
                >
                  <option>All</option>
                  <option>S</option>
                  <option>M</option>
                  <option>L</option>
                  <option>XL</option>
                </select>
              </label>
              <RangeControl
                label="Minimum trend score"
                onChange={setMinTrend}
                testId="slider-min-trend"
                value={minTrend}
              />
            </CardContent>
          </Card>

          <Card className="border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.08)]">
            <CardContent className="p-4">
              <p className="font-serif text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
                Next Move
              </p>
              <p
                className="mt-2 font-serif text-lg font-bold leading-tight tracking-tight"
                data-testid="text-recommended-next-move"
              >
                {topFeature ? topFeature.name : "No matching feature"}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Ship the top item for the best blend of user value, trend lift, and realistic build effort.
              </p>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <MiniMetric
              helper="Highest ranked visible feature"
              icon={CheckCircle2}
              label="Top pick"
              value={topFeature?.name ?? "None"}
            />
            <MiniMetric
              helper="Score 75+ and M or smaller"
              icon={Zap}
              label="Quick wins"
              value={`${quickWins}`}
            />
            <MiniMetric
              helper="Mean among filtered rows"
              icon={Activity}
              label="Trend avg"
              value={`${averageTrend}`}
            />
            <MiniMetric
              helper="Features currently ranked"
              icon={ArrowDownUp}
              label="Visible"
              value={`${ranked.length}/10`}
            />
          </div>

          <Card className="border-[hsl(var(--primary)/0.22)] bg-[hsl(var(--primary)/0.05)]">
            <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.12)] font-serif text-[10px] font-bold uppercase tracking-[0.1em] text-primary" variant="outline">
                    Seed Model
                  </Badge>
                  <Badge className="border-card-border bg-card font-serif text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground" variant="outline">
                    No production usage telemetry yet
                  </Badge>
                </div>
                <h2 className="mt-3 font-serif text-lg font-bold uppercase tracking-tight">
                  Meaningful enough to plan, not final enough to ship blindly.
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  The ranking is based on a curated 10-feature roadmap, 2026 fitness-tech trend alignment, rough solo-dev effort,
                  and your adjustable value ratings. Treat this as a decision aid until real Iron Logic usage, workout frequency,
                  and retention data exist.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center md:min-w-[270px]">
                <div className="rounded-md border border-card-border bg-card p-3">
                  <p className="font-serif text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Inputs</p>
                  <p className="mt-1 font-serif text-xl font-bold text-primary">{dataSources.length}</p>
                </div>
                <div className="rounded-md border border-card-border bg-card p-3">
                  <p className="font-serif text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Avg score</p>
                  <p className="mt-1 font-serif text-xl font-bold text-primary">{averagePriority}</p>
                </div>
                <div className="rounded-md border border-card-border bg-card p-3">
                  <p className="font-serif text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Trend 90+</p>
                  <p className="mt-1 font-serif text-xl font-bold text-primary">{highTrendCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
              <div>
                <CardTitle className="font-serif text-sm font-bold uppercase tracking-[0.08em]">
                  Priority Curve
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Top visible features by weighted priority score.</p>
              </div>
              <Badge
                className="border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.1)] font-serif text-[10px] font-bold uppercase tracking-[0.1em] text-primary"
                variant="outline"
              >
                Live Model
              </Badge>
            </CardHeader>
            <CardContent className="h-80 pt-3" data-testid="chart-priority-curve">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 18, right: 18, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="score" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" type="number" />
                  <YAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                    type="category"
                    width={132}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--popover-border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                    cursor={{ fill: "hsl(var(--muted))" }}
                  />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        fill={
                          index === 0
                            ? "hsl(var(--primary))"
                            : entry.trend >= 90
                              ? "hsl(var(--accent))"
                              : "hsl(var(--chart-3))"
                        }
                        key={`cell-${entry.name}`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-sm font-bold uppercase tracking-[0.08em]">
                Ranked Feature Backlog
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Adjust user ratings inline. Cost bands are rough implementation estimates for a solo-friendly workout logger.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3">
              {ranked.map((feature, index) => (
                <article
                  className="grid gap-4 rounded-lg border border-card-border bg-[hsl(var(--secondary))] p-4 transition-colors hover:border-[hsl(var(--primary)/0.4)] lg:grid-cols-[56px_minmax(0,1fr)_240px]"
                  data-testid={`card-feature-${feature.id}`}
                  key={feature.id}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-md border font-serif text-xl font-bold tabular-nums ${
                      index === 0
                        ? "border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.12)] text-primary"
                        : "border-card-border bg-card text-foreground"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        className="font-serif text-lg font-bold tracking-tight"
                        data-testid={`text-feature-name-${feature.id}`}
                      >
                        {feature.name}
                      </h2>
                      <Badge
                        className={`border font-serif text-[10px] font-bold uppercase tracking-[0.08em] ${costClasses[feature.cost]}`}
                        variant="outline"
                      >
                        {feature.cost} · {costLabels[feature.cost]}
                      </Badge>
                      <Badge
                        className="border-card-border bg-card font-serif text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
                        variant="outline"
                      >
                        {feature.category}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{feature.why}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{feature.evidence}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Brain className="h-3.5 w-3.5 text-primary" />
                        <span className="font-serif font-bold uppercase tracking-[0.06em]">Trend</span>
                        <span className="tabular-nums text-foreground">{feature.trend}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
                        <span className="font-serif font-bold uppercase tracking-[0.06em]">Effort</span>
                        <span className="tabular-nums text-foreground">{feature.effort}/5</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {feature.id === "wearables" ? (
                          <Watch className="h-3.5 w-3.5 text-primary" />
                        ) : feature.id === "plate-calc" ? (
                          <Calculator className="h-3.5 w-3.5 text-primary" />
                        ) : feature.id === "rest-timer" ? (
                          <Timer className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Dumbbell className="h-3.5 w-3.5 text-primary" />
                        )}
                        <span className="font-serif font-bold uppercase tracking-[0.06em]">Fit</span>
                        <span className="tabular-nums text-foreground">{feature.strategicFit}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid content-between gap-4">
                    <div>
                      <p className="font-serif text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        Priority
                      </p>
                      <p
                        className="mt-1 font-serif text-2xl font-bold tabular-nums tracking-tight text-primary"
                        data-testid={`text-score-${feature.id}`}
                      >
                        {feature.score}
                      </p>
                    </div>
                    <RangeControl
                      label="Your rating"
                      onChange={(value) => updateFeatureRating(feature.id, value)}
                      testId={`slider-rating-${feature.id}`}
                      value={feature.userRating}
                    />
                  </div>
                </article>
              ))}
              {ranked.length === 0 ? (
                <div
                  className="rounded-lg border border-dashed border-[hsl(var(--primary)/0.35)] bg-[hsl(var(--primary)/0.05)] p-8 text-center"
                  data-testid="state-empty-results"
                >
                  <BarChart3 className="mx-auto h-8 w-8 text-primary" />
                  <h2 className="mt-3 font-serif text-lg font-bold tracking-tight">
                    No roadmap items match this cut
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    That does not mean the roadmap is empty. It means the current search, category, cost, and trend filters are too strict for the seed model.
                  </p>
                  <Button className="mt-5" data-testid="button-empty-reset" onClick={resetModel} size="sm" variant="secondary">
                    <RotateCcw className="mr-1.5 h-4 w-4" />
                    Restore full backlog
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-sm font-bold uppercase tracking-[0.08em]">
                Trend Score Rationale
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <p>
                High trend scores reward AI coaching, biomonitoring, wearable sync, personalization, and adaptive training logic.
              </p>
              <p>
                Mid trend scores reward logging quality features that improve adherence but are less tied to 2026 market movement.
              </p>
              <p>
                Low-cost features can still rank highly because the model includes cost efficiency alongside trend alignment.
              </p>
              <div className="md:col-span-3">
                <p className="text-xs">
                  Research inputs: MobiDev fitness technology trends, Virtuagym fitness technology guide, Everfit personal training trends,
                  Setgraph workout logger app testing, and IDEA Health & Fitness reporting on AI fitness ecosystems.
                </p>
                <p className="mt-2 text-xs">
                  Next data upgrade: replace seed ratings with anonymized app events such as feature opens, abandoned sessions,
                  completed workouts, repeat usage, and manual “this helped” votes.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
