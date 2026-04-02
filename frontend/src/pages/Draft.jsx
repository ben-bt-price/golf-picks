import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Layout from '../components/Layout';

function fmt(cents) {
  if (!cents) return '—';
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function Draft() {
  const { majorId } = useParams();
  const { user } = useAuth();
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  async function loadDraft() {
    try {
      const res = await api.get(`/majors/${majorId}/draft`);
      setDraft(res.data);
    } catch (err) {
      setError('Failed to load draft');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDraft(); }, [majorId]);

  async function makePick(playerId) {
    setPicking(true);
    setError('');
    try {
      await api.post(`/majors/${majorId}/picks`, { playerId });
      await loadDraft();
    } catch (err) {
      setError(err.response?.data?.error || 'Pick failed');
    } finally {
      setPicking(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!draft) return <Layout><p className="text-red-400">{error || 'Draft not found'}</p></Layout>;

  const filteredPlayers = draft.availablePlayers.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const currentPickUser = draft.board.find((u) => u.userId === draft.currentPickUserId);
  const draftDone = draft.currentDraftTurn >= draft.totalSlots;

  return (
    <Layout>
      <div className="mb-4">
        <h1 className="text-xl font-bold">{draft.majorName}</h1>
        <p className="text-green-400 text-sm capitalize">{draft.status.replace(/_/g, ' ')}</p>
      </div>

      {/* Your Turn Banner */}
      {draft.isMyTurn && !draftDone && (
        <div className="mb-5 bg-yellow-500 text-yellow-950 rounded-xl p-4 animate-pulse">
          <p className="font-bold text-lg">🏌️ IT'S YOUR PICK!</p>
          <p className="text-sm">Pick {draft.currentDraftTurn + 1} of {draft.totalSlots}</p>
        </div>
      )}

      {/* Waiting for someone else */}
      {!draft.isMyTurn && !draftDone && draft.status === 'DRAFT_OPEN' && currentPickUser && (
        <div className="mb-5 bg-green-900 border border-green-700 rounded-xl p-4">
          <p className="text-green-300 text-sm">Waiting on</p>
          <p className="font-semibold">{currentPickUser.userName}</p>
          <p className="text-green-400 text-xs mt-1">Pick {draft.currentDraftTurn + 1} of {draft.totalSlots}</p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Draft Board */}
        <div>
          <h2 className="text-sm font-semibold text-green-300 uppercase tracking-wide mb-2">Draft Board</h2>
          <div className="space-y-2">
            {draft.board.map((entry) => (
              <div
                key={entry.userId}
                className={`bg-green-900 border rounded-xl p-3 ${
                  entry.userId === draft.currentPickUserId && !draftDone
                    ? 'border-yellow-500'
                    : 'border-green-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium text-sm ${entry.userId === user?.id ? 'text-yellow-300' : ''}`}>
                    {entry.userName}
                    {entry.userId === user?.id && ' (you)'}
                    {entry.userId === draft.currentPickUserId && !draftDone && ' ←'}
                  </span>
                  <span className="text-green-400 text-xs">{entry.picks.length}/3 picks</span>
                </div>
                <div className="space-y-1">
                  {[1, 2, 3].map((n) => {
                    const pick = entry.picks.find((p) => p.pickOrder === n);
                    return (
                      <div key={n} className="text-sm flex items-center gap-2">
                        <span className="text-green-600 w-4">{n}.</span>
                        {pick ? (
                          <span className="text-white">{pick.player.name}</span>
                        ) : (
                          <span className="text-green-700 italic">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Available Players */}
        {draft.status === 'DRAFT_OPEN' && (
          <div>
            <h2 className="text-sm font-semibold text-green-300 uppercase tracking-wide mb-2">
              {draft.isMyTurn ? 'Choose Your Player' : 'Available Players'}
            </h2>
            <input
              type="search"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-green-950 border border-green-700 rounded-lg px-3 py-2 text-sm text-white placeholder-green-600 focus:outline-none focus:border-green-400 mb-2"
            />
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {filteredPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => draft.isMyTurn && !picking && makePick(p.id)}
                  disabled={!draft.isMyTurn || picking}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                    draft.isMyTurn
                      ? 'bg-green-900 hover:bg-green-700 border border-green-700 hover:border-green-500 cursor-pointer'
                      : 'bg-green-950 border border-green-800 text-green-500 cursor-default'
                  } ${picking ? 'opacity-50' : ''}`}
                >
                  <span>{p.name}</span>
                  {p.worldRanking && (
                    <span className="text-green-500 text-xs">#{p.worldRanking}</span>
                  )}
                </button>
              ))}
              {filteredPlayers.length === 0 && (
                <p className="text-green-600 text-sm text-center py-4">No players found</p>
              )}
            </div>
          </div>
        )}

        {/* Results view for completed majors */}
        {draft.status === 'COMPLETED' && (
          <div>
            <h2 className="text-sm font-semibold text-green-300 uppercase tracking-wide mb-2">Final Results</h2>
            <p className="text-green-500 text-sm">View full results in Standings.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
