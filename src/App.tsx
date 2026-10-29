/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase.ts';

// Logo icon matching CliGraph brand
function CliGraphLogo({ className }: { className?: string }) {
  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-2xl border border-primary/25 bg-black shadow-lg shadow-primary/25 ${
        className ?? 'size-12'
      }`}
    >
      <img
        src="/assets/cligraph-lion.png"
        alt="CliGraph Logo"
        className="size-full object-cover select-none pointer-events-none"
      />
    </div>
  );
}

// Input component matching CliGraph styles
function FormInput({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  placeholder,
  trailing,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (val: string) => void;
  autoComplete?: string;
  placeholder?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-input bg-card px-4 pr-11 text-base text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        {trailing}
      </div>
    </div>
  );
}

// 1. Welcome Gate Screen (Route: `/` or `/welcome`)
function WelcomeGate({ onNavigate }: { onNavigate: (to: string) => void }) {
  useEffect(() => {
    document.title = 'CliGraph';
  }, []);

  return (
    <div className="auth-shell flex min-h-dvh flex-col px-6 py-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <CliGraphLogo className="size-20 rounded-3xl shadow-2xl shadow-primary/30" />
        <h1 className="font-display mt-6 text-3xl font-bold tracking-tight text-foreground">
          CliGraph
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
          by Jp Clasixs Group
        </p>
      </div>

      <div className="mx-auto w-full max-w-sm space-y-3 pb-2">
        <button
          type="button"
          onClick={() => onNavigate('/auth')}
          className="font-display flex h-13 w-full items-center justify-center rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Get started
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/auth')}
          className="flex h-13 w-full items-center justify-center rounded-xl border border-input bg-card py-3.5 text-center text-base font-semibold text-foreground transition hover:bg-accent"
        >
          I already have an account
        </button>
      </div>
    </div>
  );
}

// 2. Authentication Screen (Route: `/auth`)
function AuthPage({ onNavigate }: { onNavigate: (to: string, replace?: boolean) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    document.title = 'Sign in — CliGraph';

    // Parse potential errors in URL hash (e.g. expired confirmation links)
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorDesc = hashParams.get('error_description');
      if (errorDesc) {
        setError(errorDesc.replace(/\+/g, ' '));
      }
    }

    // Redirect to home if already authenticated
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        onNavigate('/home', true);
      }
    });

    return () => {
      active = false;
    };
  }, [onNavigate]);

  function switchTab(newMode: 'signin' | 'signup') {
    setMode(newMode);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  }

  function validate() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Enter a valid email address.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    if (mode === 'signup' && password !== confirmPassword) {
      return "Passwords don't match.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (signupError) {
          setError(signupError.message);
          return;
        }

        if (data.session) {
          onNavigate('/home', true);
        } else {
          setVerificationSent(true);
        }
      } else {
        const { error: signinError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signinError) {
          setError(
            signinError.message === 'Invalid login credentials'
              ? 'Incorrect email or password.'
              : signinError.message
          );
          return;
        }

        onNavigate('/home', true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (verificationSent) {
    return (
      <div className="auth-shell flex min-h-dvh flex-col px-6 py-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-xl shadow-primary/5">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-7 text-primary"
                aria-hidden="true"
              >
                <rect
                  x="3.5"
                  y="5.5"
                  width="17"
                  height="13"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m4.5 7 7.5 6 7.5-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <h1 className="font-display mt-5 text-xl font-bold text-foreground">
              Check your email
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              We sent a confirmation link to{' '}
              <span className="font-semibold text-foreground">{email.trim()}</span>
              . Tap it to activate your account, then sign in here.
            </p>
            <button
              type="button"
              onClick={() => {
                setVerificationSent(false);
                setMode('signin');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="mt-7 h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell flex min-h-dvh flex-col px-6 py-10">
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <CliGraphLogo className="mx-auto size-14" />
            <h1 className="font-display mt-5 text-2xl font-bold tracking-tight text-foreground">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === 'signin'
                ? 'Sign in to your CliGraph account.'
                : 'Start charting with CliGraph in minutes.'}
            </p>
          </div>

          <div className="mt-7 rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/5">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(['signin', 'signup'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchTab(tab)}
                  className={`h-10 rounded-lg text-sm font-semibold transition ${
                    mode === tab
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'signin' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                >
                  {error}
                </p>
              )}

              <FormInput
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                placeholder="you@example.com"
              />

              <FormInput
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:text-foreground"
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="size-5"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 3l18 18"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 8.6 4 9.8 6.6a.9.9 0 0 1 0 .8 15 15 0 0 1-2.2 3M6.6 6.7A14.7 14.7 0 0 0 2.2 11.6a.9.9 0 0 0 0 .8C3.4 15 7 19 12 19a9.4 9.4 0 0 0 5.3-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="size-5"
                        aria-hidden="true"
                      >
                        <path
                          d="M2.2 12.4a.9.9 0 0 1 0-.8C3.4 9 7 5 12 5s8.6 4 9.8 6.6a.9.9 0 0 1 0 .8C20.6 15 17 19 12 19s-8.6-4-9.8-6.6Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                      </svg>
                    )}
                  </button>
                }
              />

              {mode === 'signup' && (
                <FormInput
                  id="confirm"
                  label="Confirm password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                />
              )}

              <button
                type="submit"
                disabled={loading}
                className="font-display h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? 'Please wait…' : mode === 'signin' ? 'Log in' : 'Create account'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              {mode === 'signin' ? 'New to CliGraph? ' : 'Already have an account? '}
              <button
                type="button"
                onClick={() => switchTab(mode === 'signin' ? 'signup' : 'signin')}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {mode === 'signin' ? 'Create an account' : 'Log in instead'}
              </button>
            </p>
          </div>
        </div>
      </div>

      <p className="pt-6 text-center text-xs text-muted-foreground/80">
        CliGraph · Secure sign-in
      </p>
    </div>
  );
}

// 3. Home Screen (Route: `/home`)
interface FileAttachment {
  name: string;
  sizeFormatted: string;
  isImage: boolean;
  previewUrl?: string;
}

interface MessageEntry {
  id: string;
  text: string;
  attachments: FileAttachment[];
}

// 3. Dashboard Screen (Route: `/home` or `/dashboard`)
function HomePage({ onNavigate }: { onNavigate: (to: string, replace?: boolean) => void }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [entries, setEntries] = useState<MessageEntry[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'CliGraph';

    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (!data.user) {
        onNavigate('/auth', true);
      } else {
        setUserEmail(data.user.email ?? null);
        setCheckingAuth(false);
      }
    });

    return () => {
      active = false;
    };
  }, [onNavigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: FileAttachment[] = [];
    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/');
      newAttachments.push({
        name: file.name,
        sizeFormatted: formatBytes(file.size),
        isImage: isImg,
        previewUrl: isImg ? URL.createObjectURL(file) : undefined,
      });
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;

    const newEntry: MessageEntry = {
      id: `${Date.now()}-${Math.random()}`,
      text: inputText.trim(),
      attachments: [...attachments],
    };

    setEntries((prev) => [...prev, newEntry]);
    setInputText('');
    setAttachments([]);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      onNavigate('/auth', true);
    } catch {
      setSigningOut(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="auth-shell flex min-h-dvh flex-col items-center justify-center px-6 py-10">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="auth-shell flex min-h-dvh flex-col">
      {/* Clean Navbar */}
      <header className="border-b border-border/70 bg-card/70 backdrop-blur-md sticky top-0 z-10 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CliGraphLogo className="size-9 rounded-xl shadow-md" />
          <span className="font-display font-bold text-lg text-foreground tracking-tight">
            CliGraph
          </span>
        </div>
        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="text-xs text-muted-foreground hidden sm:inline font-medium">
              {userEmail}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-input bg-card text-foreground transition hover:bg-accent disabled:opacity-60"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto p-4 sm:p-6 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <CliGraphLogo className="size-16 rounded-2xl shadow-xl shadow-primary/25" />
          </div>
        ) : (
          <div className="space-y-4 flex-1 py-4">
            {entries.map((entry) => (
              <div key={entry.id} className="flex flex-col items-end">
                <div className="max-w-[85%] rounded-2xl bg-card border border-border p-4 shadow-sm space-y-2">
                  {entry.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {entry.attachments.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-xl bg-muted/60 p-2 text-xs text-foreground border border-border/50"
                        >
                          {file.isImage && file.previewUrl ? (
                            <img
                              src={file.previewUrl}
                              alt={file.name}
                              className="size-10 rounded-lg object-cover"
                            />
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="size-4 text-primary shrink-0"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[140px]">{file.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {file.sizeFormatted}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {entry.text && (
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {entry.text}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* Input bar matching requirement:
          1. placeholder to type in text and a send button by the side.
          2. a + on by the left to upload files.
          no extra text or generic stuff. */}
      <div className="sticky bottom-0 px-4 pb-6 pt-2 max-w-3xl w-full mx-auto">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-2.5 rounded-2xl bg-card/90 border border-border backdrop-blur-sm">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-xl bg-muted px-2.5 py-1 text-xs text-foreground"
              >
                {file.isImage && file.previewUrl ? (
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className="size-5 rounded object-cover"
                  />
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="size-3.5 text-primary"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                )}
                <span className="truncate max-w-[140px] font-medium">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-muted-foreground hover:text-foreground rounded-full p-0.5 transition"
                  aria-label="Remove"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="size-3"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSend}
          className="relative flex items-center gap-2 rounded-2xl border border-input bg-card p-1.5 shadow-lg shadow-primary/5 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 transition"
        >
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload files"
            className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground shrink-0"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent px-2 text-base text-foreground outline-none placeholder:text-muted-foreground/70"
          />

          <button
            type="submit"
            disabled={!inputText.trim() && attachments.length === 0}
            aria-label="Send"
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40 shrink-0"
          >
            <span>Send</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

// Main App component with routing
export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const navigate = (to: string, replace = false) => {
    if (replace) {
      window.history.replaceState({}, '', to);
    } else {
      window.history.pushState({}, '', to);
    }
    setCurrentPath(to);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);

    // Listen to Supabase auth state changes (e.g. email verification tokens in URL hash)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/home', true);
      } else if (event === 'SIGNED_OUT') {
        if (window.location.pathname === '/home' || window.location.pathname === '/dashboard') {
          navigate('/auth', true);
        }
      }
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Normalize path
  const normalizedPath = currentPath === '/welcome' ? '/' : currentPath;

  if (normalizedPath === '/home' || normalizedPath === '/dashboard') {
    return <HomePage onNavigate={navigate} />;
  }

  if (normalizedPath === '/auth') {
    return <AuthPage onNavigate={navigate} />;
  }

  // Default to Welcome Gate for `/` and any other routes
  return <WelcomeGate onNavigate={navigate} />;
}
