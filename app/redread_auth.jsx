// ============================================================
// REDREAD — Auth client (étape 8)
// Connexion Supabase + garde d'accès liste blanche.
// Utilisé par l'app (étape 5) et l'interface de validation (étape 4).
// Web (React) et Expo partagent cette logique ; seuls les composants
// d'UI diffèrent (div vs View). Ici version web/React.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

// En prod : variables d'environnement (jamais la service_role côté client)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY   // anon key : RLS s'applique
);

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// ---------- provider : session + profil militant ----------
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [militant, setMilitant] = useState(null);   // { role, active, ... } ou null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadMilitant(data.session.user.id);
      else setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      if (sess) loadMilitant(sess.user.id);
      else { setMilitant(null); setLoading(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // charge la fiche militant ; RLS garantit qu'on ne lit que la sienne
  async function loadMilitant(uid) {
    setLoading(true);
    const { data } = await supabase
      .from('militants')
      .select('role, active, display_name, cell')
      .eq('id', uid)
      .maybeSingle();
    setMilitant(data && data.active ? data : null);
    setLoading(false);
  }

  const value = {
    session, militant, loading,
    isMilitant: !!militant,
    canValidate: militant?.role === 'validateur' || militant?.role === 'admin',
    isAdmin: militant?.role === 'admin',
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    supabase,
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// ---------- garde d'accès ----------
// Enveloppe l'app : bloque tant que l'utilisateur n'est pas un militant actif.
// requireValidator=true pour protéger l'interface de validation.
export function Guard({ children, requireValidator = false }) {
  const { loading, session, isMilitant, canValidate, signIn, signOut } = useAuth();

  if (loading) return <Splash text="Chargement…" />;

  // pas connecté du tout
  if (!session) return <LoginScreen onSignIn={signIn} />;

  // connecté mais pas sur la liste blanche (ou désactivé)
  if (!isMilitant) {
    return (
      <Splash text="Accès réservé">
        <p style={S.note}>
          Ce compte n'est pas sur la liste des militants autorisés.
          Demande à un responsable de t'ajouter, puis reconnecte-toi.
        </p>
        <button style={S.btnGhost} onClick={signOut}>Se déconnecter</button>
      </Splash>
    );
  }

  // militant mais rôle insuffisant pour la validation
  if (requireValidator && !canValidate) {
    return (
      <Splash text="Validation réservée">
        <p style={S.note}>Seuls les validateurs peuvent relire les analyses.</p>
        <button style={S.btnGhost} onClick={signOut}>Se déconnecter</button>
      </Splash>
    );
  }

  return children;
}

// ---------- écran de connexion ----------
function LoginScreen({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(''); setBusy(true);
    const { error } = await onSignIn(email.trim(), pw);
    setBusy(false);
    if (error) setErr("Connexion impossible. Vérifie l'adresse et le mot de passe.");
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <Logo />
        <div style={S.title}>REDREAD</div>
        <div style={S.sub}>La presse, lue par classe</div>

        <input style={S.input} type="email" placeholder="Courriel militant"
          value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} />
        <input style={S.input} type="password" placeholder="Mot de passe"
          value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} />

        {err && <div style={S.err}>{err}</div>}

        <button style={S.btn} onClick={submit} disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <div style={S.hint}>Accès sur invitation. Pas de compte public.</div>
      </div>
    </div>
  );
}

// ---------- éléments visuels ----------
function Splash({ text, children }) {
  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <Logo />
        <div style={S.title}>{text}</div>
        {children}
      </div>
    </div>
  );
}
function Logo() {
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%', position: 'relative', margin: '0 auto 16px',
      background: 'conic-gradient(from 135deg, #FAF0F0 0deg 180deg, #050202 180deg 360deg)',
      border: '1px solid #2A1C1C',
    }}>
      <span style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-30%,-50%)',
        width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent',
        borderLeft: '12px solid #FF1A1A',
      }} />
    </div>
  );
}

const S = {
  wrap: { minHeight: '100vh', background: '#050202', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', padding: 20 },
  card: { background: '#0E0808', border: '1px solid #2A1C1C', padding: '32px 28px',
    width: '100%', maxWidth: 360, textAlign: 'center' },
  title: { fontFamily: '"Bebas Neue", Impact, sans-serif', fontSize: 32, letterSpacing: 2,
    color: '#FAF0F0', lineHeight: 1 },
  sub: { fontFamily: 'monospace', fontSize: 11, color: '#8A7C7C', letterSpacing: 1, marginBottom: 24 },
  input: { width: '100%', background: '#050202', border: '1px solid #2A1C1C', color: '#FAF0F0',
    padding: '11px 12px', fontSize: 14, marginBottom: 12, borderRadius: 0, boxSizing: 'border-box' },
  btn: { width: '100%', background: '#FF1A1A', color: '#050202', border: 'none', padding: '12px',
    fontFamily: '"Bebas Neue", Impact, sans-serif', fontSize: 18, letterSpacing: 1.5,
    cursor: 'pointer', borderRadius: 0 },
  btnGhost: { background: 'transparent', color: '#8A7C7C', border: '1px solid #2A1C1C',
    padding: '10px 18px', fontFamily: 'monospace', fontSize: 12, cursor: 'pointer', marginTop: 8 },
  err: { color: '#E0A82E', fontSize: 12, fontFamily: 'monospace', marginBottom: 12, textAlign: 'left' },
  hint: { fontFamily: 'monospace', fontSize: 10, color: '#8A7C7C', marginTop: 14 },
  note: { color: '#8A7C7C', fontSize: 13, lineHeight: 1.5, margin: '12px 0' },
};
