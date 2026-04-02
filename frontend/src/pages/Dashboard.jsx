import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';

const STATUS_LABELS = {
  UPCOMING: { label: 'Upcoming', color: 'text-gray-400', bg: 'bg-gray-800' },
  FIELD_READY: { label: 'Field Ready', color: 'text-blue-400', bg: 'bg-blue-900' },
  DRAFT_OPEN: { label: 'Draft Open', color: 'text-yellow-400', bg: 'bg-yellow-900' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-orange-400', bg: 'bg-orange-900' },
  COMPLETED: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-900' },
};

function fmt(cents) {
  if (!cents) return '—';
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function Dashboard() {
  const { user } = useAuth();
  const [majors, setMajors] = useState([]);
  const [standings, setStandings] = useState([]);
  const [activeDraft, setActiveDraft] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/majors'),
      api.get('/standings'),
    ]).then(([majorsRes, standingsRes]) => {
      setMajors(majorsRes.data);
      setStandings(standingsRes.data.standings);

      // Check for open draft where it's this user's turn
      const openMajor = majorsRes.data.find((m) => m.status === 'DRAFT_OPEN');
      if (openMajor) {
        api.get(`/majors/${openMajor.id}/draft`).then((r) => {
          if (r.data.isMyTurn) setActiveDraft(r.data);
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  const myStandings = standings.find((s) => s.userId === user?.id);
  const myRank = standings.findIndex((s) => s.userId === user?.id) + 1;

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Your Turn Banner */}
      {activeDraft && (
        <Link to={`/draft/${activeDraft.majorId}`}>
          <div className="mb-6 bg-yellow-500 text-yellow-950 rounded-xl p-4 flex items-center justify-between animate-pulse">
            <div>
              <p className="font-bold text-lg">🏌️ IT'S YOUR PICK!</p>
              <p className="text-sm font-medium">{activeDraft.majorName} draft is waiting on you</p>
            </div>
            <span className="text-2xl">→</span>
          </div>
        </Link>
      )}

      {/* Your Standing */}
      {myStandings && (
        <div className="mb-6 bg-green-900 border border-green-700 rounded-xl p-4">
          <p className="text-green-300 text-sm mb-1">Your Standing</p>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">#{myRank}</span>
            <span className="text-xl font-semibold text-green-200">{fmt(myStandings.totalEarnings)}</span>
            <span className="text-green-400 text-sm">total prize money</span>
          </div>
        </div>
      )}

      {/* Majors Grid */}
      <h2 className="text-lg font-semibold mb-3 text-green-200">2026 Majors</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {majors.map((major) => {
          const s = STATUS_LABELS[major.status] || STATUS_LABELS.UPCOMING;
          return (
            <div key={major.id} className="bg-green-900 border border-green-700 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{major.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.bg} ${s.color} ml-2 shrink-0`}>
                  {s.label}
                </span>
              </div>
              <p className="text-green-400 text-sm mb-3">
                {new Date(major.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' – '}
                {new Date(major.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              {['DRAFT_OPEN', 'IN_PROGRESS', 'COMPLETED'].includes(major.status) && (
                <Link
                  to={`/draft/${major.id}`}
                  className="text-sm text-green-300 hover:text-white underline"
                >
                  View draft board →
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Top 3 Standings */}
      {standings.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-green-200">Leaderboard</h2>
            <Link to="/standings" className="text-sm text-green-400 hover:text-white">
              Full standings →
            </Link>
          </div>
          <div className="bg-green-900 border border-green-700 rounded-xl overflow-hidden">
            {standings.slice(0, 3).map((s, i) => (
              <div
                key={s.userId}
                className={`flex items-center gap-3 px-4 py-3 ${i < 2 ? 'border-b border-green-800' : ''}`}
              >
                <span className="text-green-400 w-5 text-sm font-bold">#{i + 1}</span>
                <span className={`flex-1 font-medium ${s.userId === user?.id ? 'text-yellow-300' : ''}`}>
                  {s.userName}
                  {s.userId === user?.id && ' (you)'}
                </span>
                <span className="font-semibold text-sm">{fmt(s.totalEarnings)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
