import { useRef, useEffect } from "react";
import { Activity } from "lucide-react";

// ─── Typed chart interface (avoids `new (...args: unknown[])` constraint issue) ─

interface ChartDataset {
  data: number[];
  shift: () => void;
  push: (v: number) => void;
}

interface ChartInstance {
  data: {
    labels: string[];
    datasets: ChartDataset[];
  };
  update: (mode: string) => void;
  destroy: () => void;
}

// Use a callable-constructor signature so it satisfies `(...args: any) => any`
type ChartConstructor = new (...args: any[]) => ChartInstance; // eslint-disable-line @typescript-eslint/no-explicit-any

function getChartClass(): ChartConstructor | undefined {
  // Cast through `unknown` first to avoid the "neither type sufficiently overlaps" error
  return (window as unknown as Record<string, unknown>)["Chart"] as ChartConstructor | undefined;
}

export function InlineVitalsChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartInstance | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initChart = () => {
    const Chart = getChartClass();
    if (!Chart || !canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const hrData = Array.from({ length: 20 }, () => Math.round(68 + Math.random() * 20));
    const spo2Data = Array.from({ length: 20 }, () => Math.round(95 + Math.random() * 4));
    const labels = Array.from({ length: 20 }, (_, i) => i === 19 ? "now" : `${19 - i}s`);

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "HR", data: hrData,
            borderColor: "#f87171", backgroundColor: "transparent",
            borderWidth: 1.5, pointRadius: 0, tension: 0.4, yAxisID: "y",
          },
          {
            label: "SpO₂", data: spo2Data,
            borderColor: "#34d399", backgroundColor: "transparent",
            borderWidth: 1.5, borderDash: [4, 3], pointRadius: 0, tension: 0.4, yAxisID: "y2",
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 200 },
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index", intersect: false,
            backgroundColor: "rgba(0,0,0,0.85)",
            titleFont: { size: 10 }, bodyFont: { size: 10 }, padding: 6,
          },
        },
        scales: {
          x: { ticks: { color: "rgba(255,255,255,0.25)", font: { size: 9 }, maxTicksLimit: 4 }, grid: { color: "rgba(255,255,255,0.05)" }, border: { display: false } },
          y: { position: "left", min: 50, max: 110, ticks: { color: "#f87171", font: { size: 9 }, stepSize: 30 }, grid: { color: "rgba(255,255,255,0.05)" }, border: { display: false } },
          y2: { position: "right", min: 90, max: 100, ticks: { color: "#34d399", font: { size: 9 }, stepSize: 5 }, grid: { display: false }, border: { display: false } },
        },
      },
    });

    intervalRef.current = setInterval(() => {
      const c = chartRef.current;
      if (!c) return;
      // Shift labels
      const labelArr = c.data.labels as string[];
      labelArr.shift();
      labelArr.push("now");
      c.data.labels = labelArr.map((_, i, a) => i === a.length - 1 ? "now" : `${a.length - 1 - i}s`);
      // Shift datasets
      (c.data.datasets[0].data as number[]).shift();
      (c.data.datasets[0].data as number[]).push(Math.round(68 + Math.random() * 20));
      (c.data.datasets[1].data as number[]).shift();
      (c.data.datasets[1].data as number[]).push(Math.round(95 + Math.random() * 4));
      c.update("none");
    }, 2000);
  };

  useEffect(() => {
    if (getChartClass()) {
      initChart();
    } else {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
      s.onload = initChart;
      document.head.appendChild(s);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-black/40 border border-white/10 rounded-[6px] p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-white/30" />
          <span className="text-[9px] text-white/40 font-medium uppercase tracking-wide">Live vitals</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-3 h-px bg-red-400 inline-block" />
            <span className="text-red-400 font-mono text-[9px]">HR</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3" style={{ borderTop: "1.5px dashed #34d399" }} />
            <span className="text-emerald-400 font-mono text-[9px]">SpO₂</span>
          </span>
        </div>
      </div>
      <div className="h-[80px]">
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
