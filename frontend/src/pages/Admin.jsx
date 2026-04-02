import { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-green-300 uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Button({ onClick, disabled, variant = 'primary', children, className = '' }) {
  const base = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40';
  const variants = {
    primary: 'bg-green-600 hover:bg-green-500 text-white',
    secondary: 'bg-green-800 hover:bg-green-700 text-white border border-green-600',
    danger: 'bg-red-900 hover:bg-red-800 text-red-200 border border-red-700',
    yellow: 'bg-yellow-500 hover:bg-yellow-400 text-yellow-950',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

const STATUS_ORDER = ['UPCOMING', 'FIELD_READY', 'DRAFT_OPEN', 'IN_PROGRESS', 'COMPLETED'];

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [majors, setMajors] = useState([]);
  const [newUser, setNewUser] = useState({ email: '', name: '' });
  const [newMajor, setNewMajor] = useState({ name: '', year: 2026, startDate: '', endDate: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [purseInputs, setPurseInputs] = useState({});
  const [espnInputs, setEspnInputs] = useState({});

  function flash(m) { setMsg(m); setTimeout(() => setMsg(''), 4000); }

  async function load() {
    const [u, m] = await Promise.all([api.get('/users'), api.get('/majors')]);
    setUsers(u.data);
    setMajors(m.data);
  }

  useEffect(() => { load(); }, []);

  async function createUser(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/users', newUser);
      flash(`Created ${res.data.name}. Setup link: ${res.data.setupUrl}`);
      setNewUser({ email: '', name: '' });
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  }

  async function resendInvite(userId) {
    try {
      const res = await api.post(`/users/${userId}/resend-invite`);
      flash(`Setup link: ${res.data.setupUrl}`);
    } catch (err) {
      flash(err.response?.data?.error || 'Failed');
    }
  }

  async function deleteUser(userId, name) {
    if (!confirm(`Delete ${name}? This removes all their picks.`)) return;
    try {
      await api.delete(`/users/${userId}`);
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed');
    }
  }

  async function createMajor(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/majors', newMajor);
      setNewMajor({ name: '', year: 2026, startDate: '', endDate: '' });
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed to create major');
    } finally {
      setLoading(false);
    }
  }

  async function setEspnId(majorId) {
    const espnEventId = espnInputs[majorId]?.trim();
    if (!espnEventId) return;
    try {
      await api.patch(`/majors/${majorId}`, { espnEventId });
      flash('ESPN ID saved');
      load();
    } catch (err) {
      flash('Failed to save ESPN ID');
    }
  }

  async function syncField(majorId) {
    setLoading(true);
    try {
      const res = await api.post(`/majors/${majorId}/sync-field`);
      flash(`Synced ${res.data.added} players`);
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Sync failed');
    } finally {
      setLoading(false);
    }
  }

  async function openDraft(majorId) {
    if (!confirm('Open the draft? This randomizes the pick order.')) return;
    try {
      const res = await api.post(`/majors/${majorId}/open-draft`);
      flash('Draft opened! First pick goes to: ' + res.data.firstPickUserId);
      load();
    } catch (err) {
      flash(err.response?.data?.error || 'Failed');
    }
  }

  async function syncResults(majorId) {
    const purse = purseInputs[majorId];
    setLoading(true);
    try {
      const res = await api.post(`/majors/${majorId}/sync-results`, {
        purse: purse ? parseInt(purse) : undefined,
      });
      flash(`Synced results for ${res.data.synced} players`);
    } catch (err) {
      flash(err.response?.data?.error || 'Sync failed');
    } finally {
      setLoading(false);
    }
  }

  async function completeMajor(majorId) {
    if (!confirm('Mark this major as completed?')) return;
    try {
      await api.post(`/majors/${majorId}/complete`);
      load();
    } catch (err) {
      flash('Failed');
    }
  }

  return (
    <Layout>
      <h1 className="text-xl font-bold mb-6">Admin Panel</h1>

      {msg && (
        <div className="mb-4 bg-green-800 border border-green-600 rounded-lg p-3 text-sm break-all">
          {msg}
        </div>
      )}

      {/* Users */}
      <Section title="Users">
        <div className="bg-green-900 border border-green-700 rounded-xl overflow-hidden mb-3">
          {users.length === 0 && (
            <p className="text-green-500 text-sm p-4">No users yet</p>
          )}
          {users.map((u, i) => (
            <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${i < users.length - 1 ? 'border-b border-green-800' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {u.name}
                  {u.isAdmin && <span className="ml-2 text-xs text-yellow-400">admin</span>}
                </p>
                <p className="text-green-400 text-xs truncate">{u.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${u.isSetup ? 'bg-green-800 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                {u.isSetup ? 'Active' : 'Pending'}
              </span>
              {!u.isSetup && (
                <Button variant="secondary" onClick={() => resendInvite(u.id)}>Resend</Button>
              )}
              {!u.isAdmin && (
                <Button variant="danger" onClick={() => deleteUser(u.id, u.name)}>✕</Button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={createUser} className="flex flex-wrap gap-2">
          <input
            placeholder="Name"
            value={newUser.name}
            onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
            required
            className="flex-1 min-w-32 bg-green-950 border border-green-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400"
          />
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
            required
            className="flex-1 min-w-48 bg-green-950 border border-green-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400"
          />
          <Button type="submit" disabled={loading}>Add User</Button>
        </form>
        <p className="text-green-500 text-xs mt-2">After creating a user, copy the setup link from the flash message and send it to them.</p>
      </Section>

      {/* Majors */}
      <Section title="Majors">
        <div className="space-y-3 mb-3">
          {majors.map((major) => (
            <div key={major.id} className="bg-green-900 border border-green-700 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{major.name}</h3>
                  <p className="text-green-400 text-xs">{major.status}</p>
                </div>
                <span className="text-green-400 text-xs">
                  {major._count?.playerFields || 0} players in field
                </span>
              </div>

              {/* ESPN ID */}
              <div className="flex gap-2 mb-2">
                <input
                  placeholder={major.espnEventId || 'ESPN Event ID'}
                  value={espnInputs[major.id] ?? ''}
                  onChange={(e) => setEspnInputs((p) => ({ ...p, [major.id]: e.target.value }))}
                  className="flex-1 bg-green-950 border border-green-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-green-400"
                />
                <Button variant="secondary" onClick={() => setEspnId(major.id)}>Save ESPN ID</Button>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {major.status === 'UPCOMING' || major.status === 'FIELD_READY' ? (
                  <Button onClick={() => syncField(major.id)} disabled={!major.espnEventId || loading}>
                    Sync Field
                  </Button>
                ) : null}

                {(major.status === 'FIELD_READY' || major.status === 'UPCOMING') && major._count?.playerFields > 0 && (
                  <Button variant="yellow" onClick={() => openDraft(major.id)} disabled={users.length < 2}>
                    Open Draft
                  </Button>
                )}

                {(major.status === 'IN_PROGRESS' || major.status === 'DRAFT_OPEN') && (
                  <>
                    <input
                      type="number"
                      placeholder="Purse (USD, optional)"
                      value={purseInputs[major.id] || ''}
                      onChange={(e) => setPurseInputs((p) => ({ ...p, [major.id]: e.target.value }))}
                      className="w-40 bg-green-950 border border-green-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                    />
                    <Button onClick={() => syncResults(major.id)} disabled={!major.espnEventId || loading}>
                      Sync Results
                    </Button>
                  </>
                )}

                {major.status === 'IN_PROGRESS' && (
                  <Button variant="secondary" onClick={() => completeMajor(major.id)}>
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Create major form */}
        <form onSubmit={createMajor} className="bg-green-900 border border-green-700 rounded-xl p-4">
          <p className="text-xs text-green-400 mb-2">Add Major</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              placeholder="Name (e.g. Masters Tournament)"
              value={newMajor.name}
              onChange={(e) => setNewMajor((p) => ({ ...p, name: e.target.value }))}
              required
              className="col-span-2 bg-green-950 border border-green-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400"
            />
            <div>
              <label className="text-xs text-green-400 block mb-1">Start Date</label>
              <input
                type="date"
                value={newMajor.startDate}
                onChange={(e) => setNewMajor((p) => ({ ...p, startDate: e.target.value }))}
                required
                className="w-full bg-green-950 border border-green-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-400"
              />
            </div>
            <div>
              <label className="text-xs text-green-400 block mb-1">End Date</label>
              <input
                type="date"
                value={newMajor.endDate}
                onChange={(e) => setNewMajor((p) => ({ ...p, endDate: e.target.value }))}
                required
                className="w-full bg-green-950 border border-green-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-400"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading}>Add Major</Button>
        </form>
      </Section>
    </Layout>
  );
}
