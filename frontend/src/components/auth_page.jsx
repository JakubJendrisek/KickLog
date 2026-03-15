import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import PrivacyPolicyModal from './privacy_policy.jsx';

const AUTH_STATUS_VISIBILITY_MS = 2300;

/**
 * The Sign In Form Component.
 */
const SignInForm = ({ formData, onChange, onSubmit, showPassword, onTogglePassword }) => (
  <form onSubmit={onSubmit} className="auth-form" aria-label="Sign in form">
    <h1 className="auth-title">Sign In</h1>
    
    <p className="auth-subtitle">Use your email and password:</p>
    
    <div className="flex flex-col gap-2">
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={onChange}
        placeholder="Email"
        className="form-input"
        required
      />
      <div className="password-wrap">
        <input
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={formData.password}
          onChange={onChange}
          placeholder="Password"
          className="form-input password-input"
          required
        />
        <button
          type="button"
          className="password-toggle"
          onClick={onTogglePassword}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <FaEyeSlash size={16} aria-hidden="true" /> : <FaEye size={16} aria-hidden="true" />}
        </button>
      </div>
    </div>
    
    <a href="#" className="auth-link">
      Forgot your password?
    </a>
    
    <button type="submit" className="primary-btn">
      SIGN IN
    </button>
  </form>
);

/**
 * The Sign Up Form Component.
 */
const SignUpForm = ({ formData, onChange, onSubmit, onOpenPrivacy, privacyAccepted, showPassword, onTogglePassword }) => (
  <form onSubmit={onSubmit} className="auth-form" aria-label="Sign up form">
    <h1 className="auth-title">Create Account</h1>
    
    <p className="auth-subtitle">Use your email to register:</p>
    
    <div className="flex flex-col gap-2">
      <input
        type="text"
        name="username"
        value={formData.username}
        onChange={onChange}
        placeholder="Name"
        className="form-input"
        required
      />
      <input
        type="email"
        name="email"
        value={formData.email}
        onChange={onChange}
        placeholder="Email"
        className="form-input"
        required
      />
      <div className="password-wrap">
        <input
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={formData.password}
          onChange={onChange}
          placeholder="Password"
          className="form-input password-input"
          required
        />
        <button
          type="button"
          className="password-toggle"
          onClick={onTogglePassword}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <FaEyeSlash size={16} aria-hidden="true" /> : <FaEye size={16} aria-hidden="true" />}
        </button>
      </div>
    </div>

    <button
      type="button"
      className="auth-legal auth-legal-link"
      onClick={onOpenPrivacy}
      aria-label="Open privacy policy"
      title="Open privacy policy"
    >
      Privacy policy
      {privacyAccepted ? <span aria-hidden="true"> ✓</span> : null}
    </button>
    
    <div className="auth-submit-wrap" data-disabled={!privacyAccepted}>
      {!privacyAccepted ? (
        <span className="auth-tooltip" role="tooltip">
          First agree to the privacy policy
        </span>
      ) : null}

      <button
        type="submit"
        className="primary-btn"
        disabled={!privacyAccepted}
        aria-disabled={!privacyAccepted}
      >
        SIGN UP
      </button>
    </div>
  </form>
);

/**
 * The main component for the Auth Page (Login/Register).
 */
export default function AuthPage({ onLogin = () => {} }) {
  // State to manage which view is active: true for Sign Up, false for Sign In (login)
  const [isSignUpActive, setIsSignUpActive] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', username: '', password: '' });
  const [authStatus, setAuthStatus] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const navigate = useNavigate();
  const confettiRef = useRef(null);
  const statusTimerRef = useRef(null);
  const redirectTimerRef = useRef(null);

  const clearFeedbackTimers = () => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }

    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  };

  useEffect(() => () => {
    clearFeedbackTimers();
  }, []);

  // Function to handle input field changes
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Function to trigger confetti animation
  const triggerConfetti = () => { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 1800); };

  // Function to handle form submission for login and registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearFeedbackTimers();
    setAuthStatus(null);
    const isSigningUp = isSignUpActive;

    if (isSigningUp && !privacyAccepted) {
      setAuthStatus({
        kind: 'error',
        badge: 'Action needed',
        title: 'Privacy policy required',
        text: 'Please confirm the privacy policy to create an account.',
      });
      statusTimerRef.current = setTimeout(() => {
        setAuthStatus(null);
        statusTimerRef.current = null;
      }, AUTH_STATUS_VISIBILITY_MS);
      setPrivacyOpen(true);
      return;
    }

    try {
      let token;
      const jsonConfig = {
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (isSigningUp) {
        const registerRes = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/users/register`,
          {
            email: formData.email,
            username: formData.username,
            password: formData.password,
          },
          jsonConfig
        );
        console.log('User registered successfully:', registerRes.data);
        token = registerRes?.data?.token;

        // If backend ever stops returning token on register, fall back to login.
        if (!token) {
          const loginRes = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/users/login`,
            {
              email: formData.email,
              password: formData.password,
            },
            jsonConfig
          );
          console.log('Auto-login after register:', loginRes.data);
          token = loginRes?.data?.token;
        }
      } else {
        const loginRes = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/users/login`,
          {
            email: formData.email,
            password: formData.password,
          },
          jsonConfig
        );
        console.log('User logged in successfully:', loginRes.data);
        token = loginRes?.data?.token;
      }

      if (!token) {
        throw new Error('Missing token from server response');
      }

      localStorage.setItem('token', token);

      setAuthStatus(
        isSigningUp
          ? {
              kind: 'success',
              badge: 'Account created',
              title: 'Welcome to KickLog',
              text: 'Your account is ready and everything is synced.',
            }
          : {
              kind: 'success',
              badge: 'Signed in',
              title: 'Great to see you again',
              text: 'Sign in successful. Preparing your dashboard now.',
            }
      );
      triggerConfetti();

      redirectTimerRef.current = setTimeout(() => {
        redirectTimerRef.current = null;
        onLogin(formData);
        navigate('/main');
      }, AUTH_STATUS_VISIBILITY_MS);
    } catch (err) {
      console.error('Auth error:', err);
      const message = err?.response?.data?.message || err?.message || 'Authentication failed';
      setAuthStatus({
        kind: 'error',
        badge: 'Authentication error',
        title: isSigningUp ? 'Sign up failed' : 'Sign in failed',
        text: message,
      });
      statusTimerRef.current = setTimeout(() => {
        setAuthStatus(null);
        statusTimerRef.current = null;
      }, AUTH_STATUS_VISIBILITY_MS);
    }
  };

  return (
    <div className="auth-root min-h-screen relative">
      <style>{`
        .auth-root {
          --kl-auth-bg: color-mix(in srgb, #ffffff 96%, var(--accent-green-soft, #bbf7d0) 4%);
          --kl-auth-fg: #0f172a;
          --kl-auth-surface: color-mix(in srgb, #ffffff 92%, var(--accent-green-soft, #bbf7d0) 8%);
          --kl-auth-surface2: color-mix(in srgb, #ffffff 86%, var(--accent-green-soft, #bbf7d0) 14%);
          --kl-auth-stroke: color-mix(in srgb, #e5e7eb 70%, var(--accent-green-soft, #bbf7d0) 30%);
          --kl-auth-muted: color-mix(in srgb, var(--kl-auth-fg) 58%, transparent);
          --kl-auth-ease: var(--theme-ease, cubic-bezier(0.2, 0.8, 0.2, 1));
          --kl-auth-dur: var(--theme-dur, 820ms);

          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          color: var(--kl-auth-fg);
          background: var(--kl-auth-bg);
          overflow: hidden;
          isolation: isolate;
          position: relative;
        }

        .auth-root::before {
          content: "";
          position: fixed;
          inset: -4px;
          pointer-events: none;
          z-index: 0;
          filter: blur(20px) saturate(1.45);
          opacity: 0.92;
          animation: authPaneDrift 16s var(--kl-auth-ease) infinite;
          background:
            radial-gradient(
              720px 260px at 10% 0%,
              color-mix(in srgb, var(--accent-green, #16a34a) 52%, transparent),
              transparent 62%
            ),
            radial-gradient(
              760px 300px at 96% 18%,
              color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 44%, transparent),
              transparent 66%
            ),
            radial-gradient(
              560px 320px at 20% 102%,
              color-mix(
                in srgb,
                color-mix(in srgb, var(--accent-green, #16a34a) 72%, var(--accent-green-soft, #bbf7d0)) 34%,
                transparent
              ),
              transparent 66%
            );
        }

        .auth-back-btn {
          position: fixed;
          top: 18px;
          left: 18px;
          width: 44px;
          height: 44px;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--kl-auth-surface) 88%, transparent);
          border: 1.5px solid var(--kl-auth-stroke);
          color: color-mix(in srgb, var(--kl-auth-fg) 84%, transparent);
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.14);
          cursor: pointer;
          z-index: 60;
          transition:
            transform var(--kl-auth-dur) var(--kl-auth-ease),
            background-color var(--kl-auth-dur) var(--kl-auth-ease),
            border-color var(--kl-auth-dur) var(--kl-auth-ease),
            box-shadow var(--kl-auth-dur) var(--kl-auth-ease),
            color var(--kl-auth-dur) var(--kl-auth-ease);
        }

        .auth-back-btn:hover {
          transform: translateY(-2px);
          background: color-mix(in srgb, var(--kl-auth-surface2) 88%, transparent);
          border-color: color-mix(in srgb, var(--accent-green, #16a34a) 30%, var(--kl-auth-stroke));
          color: color-mix(in srgb, var(--accent-green, #16a34a) 68%, var(--kl-auth-fg));
          box-shadow: 0 20px 56px rgba(0,0,0,0.18);
        }

        .auth-back-btn:focus-visible {
          outline: none;
          box-shadow:
            0 0 0 3px color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 60%, transparent),
            0 20px 56px rgba(0,0,0,0.18);
        }

        @keyframes authPaneDrift {
          0% { transform: translate3d(0px, 0px, 0) scale(1); }
          50% { transform: translate3d(14px, -10px, 0) scale(1.02); }
          100% { transform: translate3d(0px, 0px, 0) scale(1); }
        }

        @keyframes authEnter {
          0% { opacity: 0; transform: translateY(14px) scale(0.99); filter: blur(10px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }

        @keyframes authSwap {
          0% { opacity: 0; transform: translateY(10px); filter: blur(8px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        .auth-container {
          width: min(95vw, 1100px);
          min-height: 640px;
          border-radius: 40px;
          border: 2px solid var(--kl-auth-stroke);
          box-shadow: 0 28px 80px rgba(0,0,0,0.20);
          background: color-mix(in srgb, var(--kl-auth-surface) 72%, transparent);
          -webkit-backdrop-filter: blur(14px);
          backdrop-filter: blur(14px);
          display: grid;
          grid-template-columns: 55% 45%;
          overflow: hidden;
          position: relative;
          z-index: 1;
          animation: authEnter var(--kl-auth-dur) var(--kl-auth-ease) both;
        }

        .purple-panel {
          background:
            radial-gradient(820px 420px at 0% 0%, color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 42%, transparent), transparent 55%),
            linear-gradient(
              135deg,
              color-mix(in srgb, var(--accent-green, #16a34a) 72%, #0b1220) 0%,
              color-mix(in srgb, var(--accent-green, #16a34a) 42%, #0b1220) 55%,
              color-mix(in srgb, var(--accent-green, #16a34a) 64%, #0b1220) 100%
            );
          border-radius: 200px 0 0 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: white;
          text-align: center;
          position: relative;
          z-index: 10;
          transition: transform var(--kl-auth-dur) var(--kl-auth-ease), border-radius var(--kl-auth-dur) var(--kl-auth-ease);
          order: 2;
        }

        .purple-panel.shifted {
          transform: translateX(-122.22%);
          border-radius: 0 200px 200px 0;
          z-index: 5;
        }

        .purple-panel h2 {
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 1.5rem;
          line-height: 1.1;
        }

        .purple-panel p {
          font-size: 1rem;
          line-height: 1.6;
          margin-bottom: 2.5rem;
          opacity: 0.95;
          max-width: 320px;
        }

        .outline-btn {
          background: transparent;
          color: white;
          border: 2px solid white;
          padding: 14px 50px;
          border-radius: 50px;
          font-size: 0.875rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform var(--kl-auth-dur) var(--kl-auth-ease), background-color var(--kl-auth-dur) var(--kl-auth-ease), color var(--kl-auth-dur) var(--kl-auth-ease);
        }

        .outline-btn:hover {
          background: white;
          color: color-mix(in srgb, var(--accent-green, #16a34a) 70%, #0b1220);
          transform: translateY(-2px) scale(1.03);
        }

        .form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem;
          position: relative;
          z-index: 15;
          transition: transform var(--kl-auth-dur) var(--kl-auth-ease);
        }

        .form-panel form {
          width: min(100%, 360px);
        }

        .form-panel.shifted {
          transform: translateX(82%);
        }

        .auth-form {
          width: min(100%, 360px);
          padding: 0 24px;
          --kl-auth-inline-gap: clamp(12px, 1.6vh, 16px);
          animation: authSwap 360ms var(--kl-auth-ease) both;
        }

        .auth-title {
          font-size: 44px;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: -0.02em;
          margin: 0 0 22px;
          color: var(--kl-auth-fg);
        }

        .auth-subtitle {
          font-size: 12px;
          color: var(--kl-auth-muted);
          font-weight: 900;
          letter-spacing: 0.01em;
          margin: 22px 0;
          text-align: left;
        }

        .auth-link {
          font-size: 12px;
          color: var(--kl-auth-muted);
          font-weight: 900;
          text-decoration: none;
          display: inline-block;
          margin-top: var(--kl-auth-inline-gap);
          transition: color var(--kl-auth-dur) var(--kl-auth-ease);
        }

        .auth-link + .primary-btn {
          margin-top: var(--kl-auth-inline-gap);
        }

        .auth-link:hover {
          color: color-mix(in srgb, var(--kl-auth-fg) 86%, var(--accent-green, #16a34a));
        }

        .auth-legal {
          margin: var(--kl-auth-inline-gap) 0;
          font-size: 12px;
          color: var(--kl-auth-muted);
          font-weight: 900;
          text-align: left;
        }

        .auth-legal-link {
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .auth-legal-link:hover {
          color: color-mix(in srgb, var(--kl-auth-fg) 86%, var(--accent-green, #16a34a));
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .form-input {
          width: 100%;
          padding: 10px 16px;
          border: 1px solid var(--kl-auth-stroke);
          background: color-mix(in srgb, var(--kl-auth-surface) 78%, transparent);
          border-radius: 12px;
          font-size: 0.9rem;
          outline: none;
          color: var(--kl-auth-fg);
          font-weight: 800;
          transition: border-color var(--kl-auth-dur) var(--kl-auth-ease), box-shadow var(--kl-auth-dur) var(--kl-auth-ease), background-color var(--kl-auth-dur) var(--kl-auth-ease);
        }

        .form-input::placeholder {
          color: color-mix(in srgb, var(--kl-auth-muted) 90%, transparent);
          font-weight: 800;
        }

        .form-input:focus {
          background: color-mix(in srgb, var(--kl-auth-surface2) 76%, transparent);
          border-color: color-mix(in srgb, var(--accent-green, #16a34a) 40%, var(--kl-auth-stroke));
          box-shadow:
            0 0 0 3px color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 55%, transparent),
            0 10px 30px rgba(0,0,0,0.14);
        }

        .password-wrap {
          position: relative;
          width: 100%;
        }

        .password-input {
          padding-right: 44px;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: color-mix(in srgb, var(--kl-auth-fg) 64%, transparent);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 2px;
          border-radius: 8px;
          transition: color var(--kl-auth-dur) var(--kl-auth-ease), background-color var(--kl-auth-dur) var(--kl-auth-ease);
        }

        .password-toggle:hover {
          color: color-mix(in srgb, var(--accent-green, #16a34a) 72%, var(--kl-auth-fg));
          background: color-mix(in srgb, var(--kl-auth-surface2) 72%, transparent);
        }

        .password-toggle:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 55%, transparent);
        }

        .primary-btn {
          width: 100%;
          padding: 16px 24px;
          background:
            radial-gradient(520px 180px at 30% 0%, color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 55%, transparent), transparent 60%),
            linear-gradient(
              135deg,
              color-mix(in srgb, var(--accent-green, #16a34a) 78%, #0b1220) 0%,
              color-mix(in srgb, var(--accent-green, #16a34a) 58%, #0b1220) 100%
            );
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: transform var(--kl-auth-dur) var(--kl-auth-ease), box-shadow var(--kl-auth-dur) var(--kl-auth-ease), filter var(--kl-auth-dur) var(--kl-auth-ease);
          box-shadow:
            0 18px 52px rgba(0, 0, 0, 0.30),
            0 0 0 1px rgba(22, 163, 74, 0.18);
        }

        .primary-btn:hover {
          transform: translateY(-2px);
          box-shadow:
            0 22px 64px rgba(0, 0, 0, 0.34),
            0 0 0 2px rgba(187, 247, 208, 0.34),
            0 0 0 10px rgba(22, 163, 74, 0.16);
          filter: saturate(1.08);
        }

        .auth-submit-wrap {
          position: relative;
        }

        .auth-submit-wrap[data-disabled="true"] {
          cursor: not-allowed;
        }

        .auth-tooltip {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 10px);
          transform: translateX(-50%) translateY(4px);
          opacity: 0;
          pointer-events: none;
          white-space: nowrap;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.18);
          background: rgba(15,23,42,.92);
          color: rgba(255,255,255,.92);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.01em;
          box-shadow: 0 18px 52px rgba(0,0,0,0.30);
          transition: opacity var(--kl-auth-dur) var(--kl-auth-ease), transform var(--kl-auth-dur) var(--kl-auth-ease);
          z-index: 5;
        }

        .auth-submit-wrap[data-disabled="true"]:hover .auth-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        @keyframes authStatusOverlayIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes authStatusCardIn {
          0% { opacity: 0; transform: translateY(14px) scale(0.96); filter: blur(8px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }

        @keyframes authStatusRing {
          0% { transform: scale(0.92); opacity: 0.72; }
          100% { transform: scale(1.22); opacity: 0; }
        }

        @keyframes authStatusLoad {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }

        @keyframes authStatusSweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }

        .auth-status-overlay {
          position: absolute;
          inset: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(16px, 2.4vw, 26px);
          animation: authStatusOverlayIn 220ms var(--kl-auth-ease) both;
          backdrop-filter: blur(6px);
        }

        .auth-status-overlay.is-success {
          background:
            radial-gradient(380px 220px at 50% 6%, color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 50%, transparent), transparent 64%),
            color-mix(in srgb, rgba(7, 33, 19, 0.62) 72%, transparent);
        }

        .auth-status-overlay.is-error {
          background:
            radial-gradient(380px 220px at 50% 6%, rgba(254, 202, 202, 0.58), transparent 64%),
            rgba(69, 10, 10, 0.62);
        }

        .auth-status-card {
          width: min(100%, 420px);
          border-radius: 26px;
          border: 1px solid transparent;
          padding: 20px 18px 16px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.42);
          display: grid;
          gap: 10px;
          text-align: center;
          animation: authStatusCardIn 320ms var(--kl-auth-ease) both;
        }

        .auth-status-overlay.is-success .auth-status-card {
          background: color-mix(in srgb, #ffffff 86%, var(--accent-green-soft, #bbf7d0) 14%);
          border-color: color-mix(in srgb, var(--accent-green, #16a34a) 36%, #bbf7d0);
          color: color-mix(in srgb, #0f172a 86%, var(--accent-green, #16a34a));
        }

        .auth-status-overlay.is-error .auth-status-card {
          background: color-mix(in srgb, #ffffff 88%, #fee2e2 12%);
          border-color: rgba(239, 68, 68, 0.45);
          color: #7f1d1d;
        }

        .auth-status-markWrap {
          display: flex;
          justify-content: center;
          margin-bottom: 2px;
        }

        .auth-status-mark {
          position: relative;
          width: 82px;
          height: 82px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 16px 42px rgba(0,0,0,0.24);
        }

        .auth-status-mark::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: inherit;
          border: 2px solid currentColor;
          opacity: 0;
          animation: authStatusRing 1.1s ease-out infinite;
        }

        .auth-status-overlay.is-success .auth-status-mark {
          background: linear-gradient(135deg, color-mix(in srgb, var(--accent-green, #16a34a) 84%, #0b1220), color-mix(in srgb, var(--accent-green, #16a34a) 62%, #bbf7d0));
          color: #ecfdf5;
        }

        .auth-status-overlay.is-error .auth-status-mark {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: #fff1f2;
        }

        .auth-status-badge {
          justify-self: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 5px 12px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 900;
          border: 1px solid transparent;
        }

        .auth-status-overlay.is-success .auth-status-badge {
          background: color-mix(in srgb, var(--accent-green-soft, #bbf7d0) 72%, transparent);
          border-color: color-mix(in srgb, var(--accent-green, #16a34a) 30%, transparent);
          color: color-mix(in srgb, #0f172a 80%, var(--accent-green, #16a34a));
        }

        .auth-status-overlay.is-error .auth-status-badge {
          background: rgba(255, 241, 242, 0.95);
          border-color: rgba(239, 68, 68, 0.38);
          color: #991b1b;
        }

        .auth-status-title {
          margin: 0;
          font-size: 21px;
          line-height: 1.12;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .auth-status-text {
          margin: 0;
          font-size: 13.5px;
          line-height: 1.5;
          font-weight: 800;
          opacity: 0.92;
        }

        .auth-status-loader {
          margin-top: 2px;
          height: 10px;
          border-radius: 999px;
          position: relative;
          overflow: hidden;
          border: 1px solid transparent;
          background: color-mix(in srgb, #e2e8f0 85%, transparent);
        }

        .auth-status-overlay.is-success .auth-status-loader {
          border-color: color-mix(in srgb, var(--accent-green, #16a34a) 24%, transparent);
        }

        .auth-status-overlay.is-error .auth-status-loader {
          border-color: rgba(239, 68, 68, 0.35);
          background: rgba(254, 226, 226, 0.72);
        }

        .auth-status-loaderFill {
          position: absolute;
          inset: 0;
          transform-origin: left center;
          animation: authStatusLoad var(--auth-status-duration, 2300ms) linear forwards;
        }

        .auth-status-overlay.is-success .auth-status-loaderFill {
          background: linear-gradient(90deg, color-mix(in srgb, var(--accent-green, #16a34a) 86%, #0b1220), color-mix(in srgb, var(--accent-green, #16a34a) 62%, #bbf7d0));
        }

        .auth-status-overlay.is-error .auth-status-loaderFill {
          background: linear-gradient(90deg, #dc2626, #f97316);
        }

        .auth-status-loaderFill::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 40%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
          animation: authStatusSweep 1.1s linear infinite;
        }

        .auth-status-meta {
          margin: 0;
          font-size: 11.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 900;
          opacity: 0.84;
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-container { animation: none !important; }
          .auth-form { animation: none !important; }
          .auth-root::before { animation: none !important; }
          .purple-panel,
          .form-panel { transition: none !important; }
          .outline-btn,
          .primary-btn,
          .form-input,
          .auth-status-overlay,
          .auth-status-card,
          .auth-status-mark::after,
          .auth-status-loaderFill,
          .auth-status-loaderFill::after { transition: none !important; animation: none !important; }
        }

        @media (max-width: 968px) {
          .auth-container { grid-template-columns: 1fr; min-height: auto; }
          .purple-panel { border-radius: 0 0 200px 200px; transform: none !important; order: initial; }
          .purple-panel h2 { font-size: 2.5rem; }
          .form-panel,
          .form-panel.shifted { transform: none; }
        }
      `}</style>

      <button
        type="button"
        className="auth-back-btn"
        onClick={() => navigate('/welcome')}
        aria-label="Back to welcome"
        title="Back"
      >
        <FaArrowLeft size={18} aria-hidden="true" />
      </button>

      <PrivacyPolicyModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        onConfirm={() => setPrivacyAccepted(true)}
      />

      {showConfetti && <div ref={confettiRef} className="fixed inset-0 pointer-events-none z-50 confetti" />}

      <div className="relative w-full flex justify-center z-[1]">
        <div className="auth-container">
          <div className={`purple-panel ${isSignUpActive ? 'shifted' : ''}`}>
            <h2>{isSignUpActive ? 'Hello, Friend!' : 'Welcome Back!'}</h2>
            <p>
              {isSignUpActive 
                ? 'Register with your personal details to use all of site features'
                : 'Enter your personal details to use all of site features'
              }
            </p>
            <button 
              onClick={() => {
                clearFeedbackTimers();
                setAuthStatus(null);
                setIsSignUpActive(!isSignUpActive);
                setShowPassword(false);
              }} 
              className="outline-btn"
            >
              {isSignUpActive ? 'SIGN IN' : 'SIGN UP'}
            </button>
          </div>

          <div className={`form-panel ${isSignUpActive ? 'shifted' : ''}`}>
            <div className="w-full flex flex-col items-center">
              {!isSignUpActive ? (
                <SignInForm
                  key="signin"
                  formData={formData}
                  onChange={handleInputChange}
                  onSubmit={handleSubmit}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((v) => !v)}
                />
              ) : (
                <SignUpForm
                  key="signup"
                  formData={formData}
                  onChange={handleInputChange}
                  onSubmit={handleSubmit}
                  onOpenPrivacy={() => setPrivacyOpen(true)}
                  privacyAccepted={privacyAccepted}
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword((v) => !v)}
                />
              )}
            </div>
          </div>

          {authStatus ? (
            <div
              className={`auth-status-overlay ${authStatus.kind === 'error' ? 'is-error' : 'is-success'}`}
              role={authStatus.kind === 'error' ? 'alert' : 'status'}
              aria-live={authStatus.kind === 'error' ? 'assertive' : 'polite'}
              style={{ '--auth-status-duration': `${AUTH_STATUS_VISIBILITY_MS}ms` }}
            >
              <div className="auth-status-card">
                <div className="auth-status-markWrap">
                  <span className="auth-status-mark" aria-hidden="true">
                    {authStatus.kind === 'error' ? <FaTimes size={30} /> : <FaCheck size={30} />}
                  </span>
                </div>

                <span className="auth-status-badge">{authStatus.badge}</span>
                <p className="auth-status-title">{authStatus.title}</p>
                <p className="auth-status-text">{authStatus.text}</p>

                <div className="auth-status-loader" aria-hidden="true">
                  <span className="auth-status-loaderFill" />
                </div>

                <p className="auth-status-meta">
                  {authStatus.kind === 'success'
                    ? 'Redirecting to your dashboard'
                    : 'Please check your details and try again'}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};