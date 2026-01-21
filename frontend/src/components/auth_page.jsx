import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGoogle, FaFacebookF, FaGithub, FaLinkedinIn } from 'react-icons/fa';
import axios from 'axios';

/**
 * Custom Social Button component for reusability.
 * @param {object} props
 * @param {React.Component} props.icon - The Fa icon component to display.
 * @param {string} props.label - The label for the button, used as a tooltip.
 */
const SocialButton = ({ icon: Icon, label }) => (
  <button
    type="button"
    className="social-btn"
    title={label}
    aria-label={label}
  >
    <Icon className="social-icon" size={18} />
  </button>
);

/**
 * The Sign In Form Component.
 */
const SignInForm = ({ formData, onChange, onSubmit }) => (
  <form onSubmit={onSubmit} className="auth-form" aria-label="Sign in form">
    <h1 className="auth-title">Sign In</h1>
    
    <div className="flex justify-center gap-3">
      <SocialButton icon={FaGoogle} label="Google" />
      <SocialButton icon={FaFacebookF} label="Facebook" />
    </div>
    
    <p className="auth-subtitle">Or use your email password:</p>
    
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
      <input
        type="password"
        name="password"
        value={formData.password}
        onChange={onChange}
        placeholder="Password"
        className="form-input"
        required
      />
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
const SignUpForm = ({ formData, onChange, onSubmit }) => (
  <form onSubmit={onSubmit} className="auth-form" aria-label="Sign up form">
    <h1 className="auth-title">Create Account</h1>
    
    <div className="flex justify-center gap-3">
      <SocialButton icon={FaGoogle} label="Google" />
      <SocialButton icon={FaFacebookF} label="Facebook" />
    </div>
    
    <p className="auth-subtitle">Or use your email for registration:</p>
    
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
      <input
        type="password"
        name="password"
        value={formData.password}
        onChange={onChange}
        placeholder="Password"
        className="form-input"
        required
      />
    </div>
    
    <button type="submit" className="primary-btn mt-8">
      SIGN UP
    </button>
  </form>
);

/**
 * The main component for the Auth Page (Login/Register).
 */
export default function AuthPage({ onLogin = () => {} }) {
  // State to manage which view is active: true for Sign Up, false for Sign In (login)
  const [isSignUpActive, setIsSignUpActive] = useState(false);
  const [formData, setFormData] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const navigate = useNavigate();
  const confettiRef = useRef(null);

  // Function to handle input field changes
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Function to trigger confetti animation
  const triggerConfetti = () => { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 1800); };

  // Function to handle form submission for login and registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      let token;

      if (isSignUpActive) {
        const registerRes = await axios.post('http://localhost:5000/api/users/register', formData);
        console.log('User registered successfully:', registerRes.data);
        token = registerRes?.data?.token;

        // If backend ever stops returning token on register, fall back to login.
        if (!token) {
          const loginRes = await axios.post('http://localhost:5000/api/users/login', {
            email: formData.email,
            password: formData.password,
          });
          console.log('Auto-login after register:', loginRes.data);
          token = loginRes?.data?.token;
        }
      } else {
        const loginRes = await axios.post('http://localhost:5000/api/users/login', {
          email: formData.email,
          password: formData.password,
        });
        console.log('User logged in successfully:', loginRes.data);
        token = loginRes?.data?.token;
      }

      if (!token) {
        throw new Error('Missing token from server response');
      }

      localStorage.setItem('token', token);

      setSuccess(isSignUpActive ? 'Signed up! You are now signed in.' : 'Signed in! Redirecting...');
      triggerConfetti();

      setTimeout(() => {
        onLogin(formData);
        navigate('/main');
      }, 400);
    } catch (err) {
      console.error('Auth error:', err);
      const message = err?.response?.data?.message || err?.message || 'Authentication failed';
      setError(message);
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

        .social-btn {
          width: 48px;
          height: 48px;
          border: 1.5px solid var(--kl-auth-stroke);
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--kl-auth-surface) 80%, transparent);
          transition: transform var(--kl-auth-dur) var(--kl-auth-ease), border-color var(--kl-auth-dur) var(--kl-auth-ease), background-color var(--kl-auth-dur) var(--kl-auth-ease);
          cursor: pointer;
        }

        .social-icon {
          color: color-mix(in srgb, var(--kl-auth-fg) 62%, transparent);
          transition: color var(--kl-auth-dur) var(--kl-auth-ease);
        }

        .social-btn:hover {
          background: color-mix(in srgb, var(--kl-auth-surface2) 80%, transparent);
          border-color: color-mix(in srgb, var(--accent-green, #16a34a) 36%, var(--kl-auth-stroke));
          transform: translateY(-3px);
        }

        .social-btn:hover .social-icon {
          color: color-mix(in srgb, var(--accent-green, #16a34a) 70%, var(--kl-auth-fg));
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

        @media (prefers-reduced-motion: reduce) {
          .auth-container { animation: none !important; }
          .auth-form { animation: none !important; }
          .auth-root::before { animation: none !important; }
          .purple-panel,
          .form-panel { transition: none !important; }
          .outline-btn,
          .social-btn,
          .primary-btn,
          .form-input { transition: none !important; }
        }

        @media (max-width: 968px) {
          .auth-container { grid-template-columns: 1fr; min-height: auto; }
          .purple-panel { border-radius: 0 0 200px 200px; transform: none !important; order: initial; }
          .purple-panel h2 { font-size: 2.5rem; }
          .form-panel,
          .form-panel.shifted { transform: none; }
        }
      `}</style>

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
              onClick={() => setIsSignUpActive(!isSignUpActive)} 
              className="outline-btn"
            >
              {isSignUpActive ? 'SIGN IN' : 'SIGN UP'}
            </button>
          </div>

          <div className={`form-panel ${isSignUpActive ? 'shifted' : ''}`}>
            <div className="w-full flex flex-col items-center">
              {!isSignUpActive ? (
                <SignInForm key="signin" formData={formData} onChange={handleInputChange} onSubmit={handleSubmit} />
              ) : (
                <SignUpForm key="signup" formData={formData} onChange={handleInputChange} onSubmit={handleSubmit} />
              )}

              {(error || success) && (
                <div
                  className={`mt-4 w-full max-w-[360px] px-6 py-3 rounded-xl font-bold text-sm text-center border ${
                    error
                      ? "bg-red-500/10 text-red-700 border-red-300"
                      : "bg-green-500/10 text-green-700 border-green-300"
                  }`}
                  role={error ? "alert" : "status"}
                  aria-live={error ? "assertive" : "polite"}
                >
                  {error || success}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};