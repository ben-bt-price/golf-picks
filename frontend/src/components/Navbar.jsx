import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/standings', label: 'Standings' },
  { to: '/my-picks', label: 'My Picks' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <nav className="bg-green-800 border-b border-green-700 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-bold text-lg tracking-tight">
          ⛳ Majors Pick'em
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-2 sm:px-3 py-1 rounded text-sm font-medium transition-colors ${
                pathname === l.to
                  ? 'bg-green-700 text-white'
                  : 'text-green-100 hover:text-white hover:bg-green-700'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user?.isAdmin && (
            <Link
              to="/admin"
              className={`px-2 sm:px-3 py-1 rounded text-sm font-medium transition-colors ${
                pathname === '/admin'
                  ? 'bg-green-700 text-white'
                  : 'text-green-100 hover:text-white hover:bg-green-700'
              }`}
            >
              Admin
            </Link>
          )}
          <button
            onClick={logout}
            className="ml-2 text-xs text-green-300 hover:text-white"
          >
            {user?.name?.split(' ')[0]} ✕
          </button>
        </div>
      </div>
    </nav>
  );
}
