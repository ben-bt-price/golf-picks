import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';

function fmt(cents) {
  if (!cents) return '—';
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function MyPicks() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/standings').then((res) => {
      const mine = res.data.standings.find((s) => s.userId === user?.id);
      setData({ standing: mine, majors: res.data.majors });
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
        </div>
      </Layout>
    );
  }

  const { standing, majors } = data;

  return (
    <Layout>
      <h1 className="text-xl font-bold mb-1">My Picks</h1>
      {standing && (
        <p className="text-green-400 mb-5">
          Total earnings: <span className="font-bold text-white">{fmt(standing.totalEarnings)}</span>
        </p>
      )}

      <div className="space-y-4">
        {majors.map((major) => {
          const mEntry = standing?.byMajor.find((m) => m.majorId === major.id);
          const statusColor = {
            UPCOMING: 'text-gray-400',
            FIELD_READY: 'text-blue-400',
            DRAFT_OPEN: 'text-yellow-400',
            IN_PROGRESS: 'text-orange-400',
            COMPLETED: 'text-green-400',
          }[major.status] || 'text-gray-400';

          return (
            <div key={major.id} className="bg-green-900 border border-green-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">{major.name}</h2>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${statusColor}`}>{major.status.replace(/_/g, ' ')}</span>
                  {mEntry && <span className="font-semibold text-sm">{fmt(mEntry.earnings)}</span>}
                </div>
              </div>

              {mEntry?.picks.length > 0 ? (
                <div className="space-y-1">
                  {mEntry.picks.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-green-600 w-4">{i + 1}.</span>
                      <span className="flex-1">{p.playerName}</span>
                      {p.position && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          p.position === 'MC' || p.position === 'WD' || p.position === 'DQ'
                            ? 'bg-red-900 text-red-300'
                            : 'bg-green-800 text-green-300'
                        }`}>
                          {p.position}
                        </span>
                      )}
                      <span className="text-green-300 w-20 text-right">{fmt(p.prizeMoney)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-green-600 text-sm italic">
                  {['UPCOMING', 'FIELD_READY'].includes(major.status)
                    ? 'Draft not open yet'
                    : 'No picks made'}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
