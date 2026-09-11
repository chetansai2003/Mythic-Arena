import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, Shield, LogOut } from 'lucide-react';
import { loginSchema, registerSchema } from '@mythic/shared';
import { Button, Field, Skeleton, StatusBanner } from './components.jsx';
import { useApi } from './api-context.jsx';

export function AccountGate({ children }) {
  const session = useSelector((state) => state.session);
  const api = useApi();
  if (session.status === 'loading') return <Skeleton label="Restoring your session"/>;
  if (session.status === 'unavailable') return <StatusBanner kind="error" action={<Button variant="secondary" onClick={() => api.bootstrap()}>Try again</Button>}>Account access is temporarily unavailable.</StatusBanner>;
  return session.user ? children : <div className="account-prompt"><Shield size={24}/><h2>Make room for your legends.</h2><p>Sign in to build and save your decks. Every card in the collection is available to every player.</p><Link className="button button-primary" to="/login" state={{ from: '/decks' }}>Sign in <ArrowRight size={16}/></Link><Link className="text-link" to="/register">Create an account</Link></div>;
}
export default function AccountPage({ register = false }) {
  const api = useApi(); const navigate = useNavigate(); const location = useLocation();
  const user = useSelector((state) => state.session.user);
  const [fields, setFields] = useState({ email: '', password: '', displayName: '' });
  const [issues, setIssues] = useState({}); const [error, setError] = useState(''); const [pending, setPending] = useState(false);
  const change = (event) => setFields((old) => ({ ...old, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setError(''); setIssues({});
    const parsed = (register ? registerSchema : loginSchema).safeParse(register ? fields : { email: fields.email, password: fields.password });
    if (!parsed.success) { setIssues(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message]))); return; }
    setPending(true);
    try { await api.signIn(parsed.data, register); const destination = ['/decks', '/lobby'].includes(location.state?.from) ? location.state.from : '/lobby'; navigate(destination, { replace: true }); }
    catch (failure) { setError(failure.message); }
    finally { setPending(false); }
  }
  async function logout() { setPending(true); try { await api.logout(); } catch (failure) { setError(failure.message); } finally { setPending(false); } }
  return <div className="page"><div className="page-heading"><div><p className="eyebrow"><span className="gold-line"/>BEGIN YOUR JOURNEY</p><h1>{register ? 'Create an account' : 'Welcome back'}</h1><p className="subtitle">Your legends, your decks, your story.</p></div></div><div className="auth-grid"><form className="content-panel auth-form" onSubmit={submit} noValidate><div className="mode-icon gold"><Shield size={25}/></div><h2>{user ? `You’re signed in, ${user.displayName}` : register ? 'Claim your name' : 'Return to the arena'}</h2>
    {user ? <><p className="muted">{user.email}</p><Link to="/decks" className="button button-primary">Open my decks <ArrowRight size={16}/></Link><Button type="button" variant="secondary" onClick={logout} disabled={pending}><LogOut size={16}/> Sign out</Button></> : <>
      <p className="muted">{register ? 'One account. Five mythic traditions. A collection ready to explore.' : 'Sign in to pick up where your strategy left off.'}</p>
      {register && <><Field id="display-name" name="displayName" label="Display name" value={fields.displayName} onChange={change} autoComplete="nickname" disabled={pending} aria-invalid={!!issues.displayName} aria-describedby={issues.displayName ? 'name-error' : undefined}/>{issues.displayName && <p className="field-error" id="name-error">{issues.displayName}</p>}</>}
      <Field id="email" name="email" label="Email address" type="email" value={fields.email} onChange={change} autoComplete="email" disabled={pending} aria-invalid={!!issues.email} aria-describedby={issues.email ? 'email-error' : undefined}/>{issues.email && <p className="field-error" id="email-error">{issues.email}</p>}
      <Field id="password" name="password" label="Password" type="password" value={fields.password} onChange={change} autoComplete={register ? 'new-password' : 'current-password'} disabled={pending} aria-invalid={!!issues.password} aria-describedby={issues.password ? 'password-error' : register ? 'password-help' : undefined}/>{register && <p id="password-help" className="input-hint">Use 12–128 characters. A memorable passphrase works well.</p>}{issues.password && <p className="field-error" id="password-error">{issues.password}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Please wait…' : register ? 'Create account' : 'Sign in'}<ArrowRight size={16}/></Button><Link className="text-link" to={register ? '/login' : '/register'}>{register ? 'Already have an account? Sign in' : 'New to the arena? Create an account'}<ArrowRight size={14}/></Link>
    </>}{error && <StatusBanner kind="error">{error}</StatusBanner>}</form><div className="auth-aside"><BookOpen size={36}/><h2>A world worth<br/>making your own.</h2><p>Twenty original cards. Five mythic traditions.<br/>Bring your own strategy to the arena.</p><span className="small-tag">EVERY CARD AVAILABLE · NO PURCHASE REQUIRED</span></div></div></div>;
}
