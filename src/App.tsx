/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
} from './lib/firebase.ts';
import { uploadToSupabaseBucket } from './lib/storage.ts';

// Logo icon using the lion head emblem
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
  labelRight,
  type,
  value,
  onChange,
  autoComplete,
  placeholder,
  trailing,
}: {
  id: string;
  label: string;
  labelRight?: React.ReactNode;
  type: string;
  value: string;
  onChange: (val: string) => void;
  autoComplete?: string;
  placeholder?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-semibold text-foreground">
          {label}
        </label>
        {labelRight}
      </div>
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

function formatFirebaseAuthError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: string }).code;
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Incorrect email or password.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please log in.';
      case 'auth/weak-password':
        return 'Password must be at least 8 characters.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'auth/popup-closed-by-user':
        return 'Sign in was cancelled.';
      default:
        if ('message' in error && typeof (error as { message: string }).message === 'string') {
          return (error as { message: string }).message;
        }
    }
  }
  return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
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

// 2. Authentication Screen (Route: `/auth`) powered by FIREBASE AUTH
function AuthPage({ onNavigate }: { onNavigate: (to: string, replace?: boolean) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    document.title =
      mode === 'forgot'
        ? 'Reset Password — CliGraph'
        : mode === 'signup'
        ? 'Create Account — CliGraph'
        : 'Sign in — CliGraph';
  }, [mode]);

  function switchTab(newMode: 'signin' | 'signup' | 'forgot') {
    setMode(newMode);
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setResetSent(false);
  }

  function validate() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Enter a valid email address.';
    }
    if (mode === 'forgot') return null;
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
      if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email.trim());
        setResetSent(true);
      } else if (mode === 'signup') {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        try {
          await sendEmailVerification(userCred.user);
        } catch (e) {
          console.warn('Email verification send notice:', e);
        }
        setVerificationSent(true);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onNavigate('/home', true);
      }
    } catch (err) {
      setError(formatFirebaseAuthError(err));
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

  // Forgot Password Screen
  if (mode === 'forgot') {
    return (
      <div className="auth-shell flex min-h-dvh flex-col px-6 py-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="text-center">
              <CliGraphLogo className="mx-auto size-16" />
              <h1 className="font-display mt-5 text-2xl font-bold tracking-tight text-foreground">
                Reset your password
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your registered email and we&apos;ll send you a password reset link.
              </p>
            </div>

            <div className="mt-7 rounded-3xl border border-border bg-card p-6 shadow-xl shadow-primary/5">
              {resetSent ? (
                <div className="text-center py-2 space-y-4">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="size-6"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    Reset link sent!
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    We sent a password reset link to{' '}
                    <span className="font-semibold text-foreground">{email.trim()}</span>. Please
                    check your inbox (and spam folder) to reset your password.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchTab('signin')}
                    className="mt-3 font-display h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Back to log in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="font-display h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {loading ? 'Sending link…' : 'Send reset link'}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => switchTab('signin')}
                      className="text-sm font-semibold text-muted-foreground hover:text-foreground transition"
                    >
                      Remember your password?{' '}
                      <span className="text-primary underline-offset-2 hover:underline">
                        Log in
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        <p className="pt-6 text-center text-xs text-muted-foreground/80">
          CliGraph · Powered by Firebase Auth &amp; Supabase Storage
        </p>
      </div>
    );
  }

  return (
    <div className="auth-shell flex min-h-dvh flex-col px-6 py-10">
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <CliGraphLogo className="mx-auto size-16" />
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
                labelRight={
                  mode === 'signin' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setResetSent(false);
                      }}
                      className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      Forgot password?
                    </button>
                  ) : undefined
                }
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
        CliGraph · Powered by Firebase Auth &amp; Supabase Storage
      </p>
    </div>
  );
}

// 3. Home / Dashboard Screen (Route: `/home` or `/dashboard`)
interface PendingAttachment {
  file: File;
  name: string;
  sizeFormatted: string;
  isImage: boolean;
  previewUrl?: string;
}

interface MessageAttachment {
  name: string;
  sizeFormatted: string;
  isImage: boolean;
  url: string;
  path: string;
}

interface MessageEntry {
  id: string;
  text: string;
  attachments: MessageAttachment[];
}

function HomePage({
  user,
  onNavigate,
}: {
  user: User;
  onNavigate: (to: string, replace?: boolean) => void;
}) {
  const [signingOut, setSigningOut] = useState(false);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [entries, setEntries] = useState<MessageEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'CliGraph';
  }, []);

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

    const newAttachments: PendingAttachment[] = [];
    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/');
      newAttachments.push({
        file,
        name: file.name,
        sizeFormatted: formatBytes(file.size),
        isImage: isImg,
        previewUrl: isImg ? URL.createObjectURL(file) : undefined,
      });
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    setUploadError(null);
    e.target.value = '';
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => {
      const item = prev[index];
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return;
    if (!inputText.trim() && attachments.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const uploadedAttachments: MessageAttachment[] = [];

      // Upload each attachment directly to the Supabase UPLOADS bucket
      for (const item of attachments) {
        const res = await uploadToSupabaseBucket(item.file, user.uid);
        uploadedAttachments.push({
          name: res.name,
          sizeFormatted: item.sizeFormatted,
          isImage: item.isImage,
          url: res.signedUrl,
          path: res.path,
        });
      }

      const newEntry: MessageEntry = {
        id: `${Date.now()}-${Math.random()}`,
        text: inputText.trim(),
        attachments: uploadedAttachments,
      };

      setEntries((prev) => [...prev, newEntry]);
      setInputText('');
      setAttachments([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut(auth);
      onNavigate('/auth', true);
    } catch {
      setSigningOut(false);
    }
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
          {user.email && (
            <span className="text-xs text-muted-foreground hidden sm:inline font-medium">
              {user.email}
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
                        <a
                          key={i}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-xl bg-muted/60 p-2 text-xs text-foreground border border-border/50 transition hover:border-primary/50 hover:bg-muted group"
                          title="Open from Supabase uploads bucket"
                        >
                          {file.isImage ? (
                            <img
                              src={file.url}
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
                          <div className="min-w-0 pr-1">
                            <p className="font-medium truncate max-w-[140px] group-hover:text-primary transition">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {file.sizeFormatted} · Supabase
                            </p>
                          </div>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="size-3 text-muted-foreground opacity-60 group-hover:opacity-100 shrink-0"
                          >
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
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

      {/* Input bar:
          1. placeholder to type in text and a send button by the side.
          2. a + on by the left to upload files to the Supabase UPLOADS bucket. */}
      <div className="sticky bottom-0 px-4 pb-6 pt-2 max-w-3xl w-full mx-auto">
        {uploadError && (
          <div className="mb-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive flex items-center justify-between">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-destructive font-bold text-sm px-1"
            >
              ×
            </button>
          </div>
        )}

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
                  disabled={uploading}
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
            disabled={uploading}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Upload files"
            className="flex size-11 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground shrink-0 disabled:opacity-40"
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
            disabled={uploading}
            placeholder={uploading ? 'Uploading to Supabase UPLOADS…' : 'Type a message...'}
            className="flex-1 bg-transparent px-2 text-base text-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
          />

          <button
            type="submit"
            disabled={uploading || (!inputText.trim() && attachments.length === 0)}
            aria-label="Send"
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40 shrink-0"
          >
            {uploading ? (
              <>
                <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span className="hidden sm:inline">Uploading…</span>
              </>
            ) : (
              <>
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
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Main App component with routing
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
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

    // Single central authoritative Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthInitialized(true);

      const path = window.location.pathname;
      if (user) {
        if (path === '/auth') {
          navigate('/home', true);
        }
      } else {
        if (path === '/home' || path === '/dashboard') {
          navigate('/auth', true);
        }
      }
    });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      unsubscribe();
    };
  }, []);

  if (!authInitialized) {
    return (
      <div className="auth-shell flex min-h-dvh flex-col items-center justify-center px-6 py-10">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Normalize path
  const normalizedPath = currentPath === '/welcome' ? '/' : currentPath;

  if (normalizedPath === '/home' || normalizedPath === '/dashboard') {
    if (!currentUser) {
      return <AuthPage onNavigate={navigate} />;
    }
    return <HomePage user={currentUser} onNavigate={navigate} />;
  }

  if (normalizedPath === '/auth') {
    return <AuthPage onNavigate={navigate} />;
  }

  // Default to Welcome Gate for `/` and any other routes
  return <WelcomeGate onNavigate={navigate} />;
}
