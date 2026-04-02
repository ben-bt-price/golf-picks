import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';

function fmt(cents) {
  if (!cents) return '$0';
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Standings() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/standings').then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
        </div>
      </Layout>
    );
  }

  const { standings, majors } = data;

  return (
    <Layout>
      <h1 className="text-xl font-bold mb-5">Season Standings</h1>

      <div className="space-y-2 mb-8">
        {standings.map((s, i) => (
          <div key={s.userId}>
            <button
              className={`w-full bg-green-900 border rounded-xl p-4 flex items-center gap-3 transition-colors ${
                expanded === s.userId ? 'border-green-500' : 'border-green-700 hover:border-green-600'
              }`}
              onClick={() => setExpanded(expanded === s.userId ? null : s.userId)}
            >
              <span className="text-xl w-7">{MEDALS[i] || `${i + 1}.`}</span>
              <span className={`flex-1 font-semibold text-left ${s.userId === user?.id ? 'text-yellow-300' : ''}`}>
                {s.userName}
                {s.userId === user?.id && ' (you)'}
              </span>
              <span className="font-bold">{fmt(s.totalEarnings)}</span>
              <span className="text-green-500 ml-1">{expanded === s.userId ? '▲' : '▼'}</span>
            </button>

            {expanded === s.userId && (
              <div className="bg-green-950 border border-green-800 border-t-0 rounded-b-xl px-4 py-3 space-y-3">
                {majors.map((major) => {
                  const mEntry = s.byMajor.find((m) => m.majorId === major.id);
                  return (
                    <div key={major.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-green-300">{major.name}</span>
                        <span className="text-sm font-semibold">{fmt(mEntry?.earnings)}</span>
                      </div>
                      {mEntry?.picks.map((p, pi) => (
                        <div key={pi} className="flex items-center gap-2 text-sm text-green-400 ml-2">
                          <span className="text-green-600">{pi + 1}.</span>
                          <span className="flex-1">{p.playerName}</span>
                          {p.position && <span className="text-xs">{p.position}</span>}
                          <span>{fmt(p.prizeMoney)}</span>
                        </div>
                      ))}
                      {!mEntry && <p className="text-xs text-green-700 ml-2">No picks yet</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
