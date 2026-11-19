import { useCallback, useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import adminApi from '../../services/adminApi';
import { toast, errMsg } from '../../components/Toast';
import { ErrorState, EmptyState } from '../../components/admin/AdminShell';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthLabel = (key) => {
  const [year, month] = String(key).split('-').map(Number);
  if (!year || !month) return key;
  return `${MONTH_NAMES[month - 1]} ${String(year).slice(2)}`;
};

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#0d9488',
  processing: '#6366f1',
  shipped: '#2563eb',
  delivered: '#16a34a',
  cancelled: '#dc2626'
};

const AXIS_TICKS = { color: '#78716c', font: { size: 11 } };

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#57534e', boxWidth: 12, font: { size: 11 } } }
  }
};

const ChartCard = ({ title, children }) => (
  <div className="bg-white rounded-sm border border-ink/10 p-6">
    <h2 className="font-bold text-ink mb-4">{title}</h2>
    <div className="relative h-64" role="img" aria-label={title}>{children}</div>
  </div>
);

const ChartSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6" aria-hidden="true">
    {[0, 1].map((i) => (
      <div key={i} className="bg-white rounded-sm border border-ink/10 p-6">
        <div className="h-4 w-40 bg-parchment rounded animate-pulse mb-4" />
        <div className="h-56 bg-cream rounded-sm animate-pulse" />
      </div>
    ))}
  </div>
);

function DashboardCharts() {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.statsTimeSeries(months);
      setData(res.data);
    } catch (err) {
      const message = errMsg(err, 'Failed to load chart data');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    load();
  }, [load]);

  const timeline = data?.timeline || [];
  const ordersByStatus = data?.ordersByStatus || [];
  const topCategories = data?.topCategories || [];
  const topArtisans = data?.topArtisans || [];
  const labels = timeline.map((row) => monthLabel(row.key));
  const hasData =
    ordersByStatus.length > 0 || timeline.some((row) => row.orders > 0 || row.newUsers > 0);

  const revenueOrdersData = {
    labels,
    datasets: [
      {
        label: 'Revenue',
        data: timeline.map((row) => row.revenue),
        borderColor: '#b45309',
        backgroundColor: 'rgba(180, 83, 9, 0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        yAxisID: 'y'
      },
      {
        label: 'Orders',
        data: timeline.map((row) => row.orders),
        borderColor: '#0d9488',
        backgroundColor: '#0d9488',
        tension: 0.3,
        pointRadius: 3,
        yAxisID: 'y1'
      }
    ]
  };

  const revenueOrdersOptions = {
    ...baseOptions,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      ...baseOptions.plugins,
      tooltip: {
        callbacks: {
          label: (ctx) =>
            ctx.dataset.label === 'Revenue'
              ? ` Revenue: ${inr(ctx.parsed.y)}`
              : ` Orders: ${ctx.parsed.y}`
        }
      }
    },
    scales: {
      x: { ticks: AXIS_TICKS, grid: { display: false } },
      y: {
        position: 'left',
        ticks: { ...AXIS_TICKS, callback: (value) => inr(value) },
        grid: { color: 'rgba(120, 113, 108, 0.12)' }
      },
      y1: {
        position: 'right',
        ticks: { ...AXIS_TICKS, precision: 0 },
        grid: { drawOnChartArea: false }
      }
    }
  };

  const newUsersData = {
    labels,
    datasets: [
      {
        label: 'New users',
        data: timeline.map((row) => row.newUsers),
        backgroundColor: '#f59e0b',
        borderRadius: 4
      }
    ]
  };

  const newUsersOptions = {
    ...baseOptions,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: AXIS_TICKS, grid: { display: false } },
      y: { ticks: { ...AXIS_TICKS, precision: 0 }, grid: { color: 'rgba(120, 113, 108, 0.12)' } }
    }
  };

  const statusData = {
    labels: ordersByStatus.map((row) => row.status),
    datasets: [
      {
        data: ordersByStatus.map((row) => row.count),
        backgroundColor: ordersByStatus.map((row) => STATUS_COLORS[row.status] || '#a8a29e'),
        borderWidth: 0
      }
    ]
  };

  const statusOptions = {
    ...baseOptions,
    cutout: '65%',
    plugins: {
      legend: { ...baseOptions.plugins.legend, position: 'bottom' },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} orders` } }
    }
  };

  const horizontalBar = (rows, valueKey, formatter) => ({
    data: {
      labels: rows.map((row) => row.label),
      datasets: [
        {
          label: 'Revenue',
          data: rows.map((row) => row[valueKey]),
          backgroundColor: '#b45309',
          borderRadius: 4
        }
      ]
    },
    options: {
      ...baseOptions,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${formatter(ctx.parsed.x)}` } }
      },
      scales: {
        x: { ticks: { ...AXIS_TICKS, callback: (value) => formatter(value) }, grid: { color: 'rgba(120, 113, 108, 0.12)' } },
        y: { ticks: AXIS_TICKS, grid: { display: false } }
      }
    }
  });

  const categories = horizontalBar(
    topCategories.map((row) => ({
      label: row.category.charAt(0).toUpperCase() + row.category.slice(1),
      revenue: row.revenue
    })),
    'revenue',
    inr
  );

  const artisans = horizontalBar(
    topArtisans.map((row) => ({ label: row.name, revenue: row.revenue })),
    'revenue',
    inr
  );

  return (
    <section className="mb-8">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="font-bold text-ink">Analytics</h2>
        <div className="flex gap-2">
          {[3, 6, 12].map((option) => (
            <button
              key={option}
              onClick={() => setMonths(option)}
              aria-pressed={months === option}
              className={`px-3 py-1 rounded-sm text-sm font-medium transition ${
                months === option
                  ? 'bg-terracotta text-white'
                  : 'bg-white text-ink-soft hover:bg-linen'
              }`}
            >
              {option} months
            </button>
          ))}
        </div>
      </div>

      {loading && <ChartSkeleton />}

      {!loading && error && (
        <div className="bg-white rounded-sm border border-ink/10 p-6">
          <ErrorState message={error} />
          <div className="text-center mt-4">
            <button
              onClick={load}
              className="px-4 py-2 bg-terracotta text-white rounded-sm text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && !hasData && <EmptyState message="No data yet" />}

      {!loading && !error && hasData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <ChartCard title="Monthly revenue & orders">
              <Line data={revenueOrdersData} options={revenueOrdersOptions} />
            </ChartCard>
            <ChartCard title="Monthly new users">
              <Bar data={newUsersData} options={newUsersOptions} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChartCard title="Orders by status">
              <Doughnut data={statusData} options={statusOptions} />
            </ChartCard>
            <ChartCard title="Top categories">
              <Bar data={categories.data} options={categories.options} />
            </ChartCard>
            <ChartCard title="Top artisans">
              <Bar data={artisans.data} options={artisans.options} />
            </ChartCard>
          </div>
        </>
      )}
    </section>
  );
}

export default DashboardCharts;
