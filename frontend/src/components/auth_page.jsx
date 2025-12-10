import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGoogle, FaFacebookF, FaGithub, FaLinkedinIn } from 'react-icons/fa';

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
  >
    <Icon className="text-gray-600" size={18} />
  </button>
);

/**
 * The Sign In Form Component.
 */
const SignInForm = ({ formData, onChange, onSubmit }) => (
  <form onSubmit={onSubmit} className="w-full max-w-md px-8">
    <h1 className="text-5xl font-extrabold mb-8 text-gray-900">Sign In</h1>
    
    <div className="flex justify-center gap-3 mb-8">
      <SocialButton icon={FaGoogle} label="Google" />
      <SocialButton icon={FaFacebookF} label="Facebook" />
      <SocialButton icon={FaGithub} label="GitHub" />
      <SocialButton icon={FaLinkedinIn} label="LinkedIn" />
    </div>
    
    <p className="text-sm text-gray-500 mb-6 text-center">or use your email password</p>
    
    <div className="space-y-4">
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
    
    <a href="#" className="text-sm text-gray-500 hover:text-gray-700 block mt-4">
      Forget Your Password?
    </a>
    
    <button type="submit" className="primary-btn mt-8">
      SIGN IN
    </button>
  </form>
);

/**
 * The Sign Up Form Component.
 */
const SignUpForm = ({ formData, onChange, onSubmit }) => (
  <form onSubmit={onSubmit} className="w-full max-w-md px-8">
    <h1 className="text-5xl font-extrabold mb-8 text-gray-900">Create Account</h1>
    
    <div className="flex justify-center gap-3 mb-8">
      <SocialButton icon={FaGoogle} label="Google" />
      <SocialButton icon={FaFacebookF} label="Facebook" />
      <SocialButton icon={FaGithub} label="GitHub" />
      <SocialButton icon={FaLinkedinIn} label="LinkedIn" />
    </div>
    
    <p className="text-sm text-gray-500 mb-6 text-center">or use your email for registration</p>
    
    <div className="space-y-4">
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
    setError(''); setSuccess('');
    const url = isSignUpActive ? "http://localhost:5000/user/login" : "http://localhost:5000/user/register";
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Something went wrong");
      }
      const user = await response.json();
      if (isSignUpActive) {
        setSuccess("Login successful! Redirecting...");
        triggerConfetti();
        setTimeout(() => { onLogin(user); navigate("/"); }, 1200);
      } else {
        setSuccess("Registration successful! Please log in.");
        triggerConfetti();
        setTimeout(() => setIsSignUpActive(true), 1200);
      }
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#e6e9f0] to-[#dce1f3] p-6" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        .auth-container {
          width: min(95vw, 1100px);
          min-height: 640px;
          border-radius: 40px;
          box-shadow: 0 25px 70px rgba(0,0,0,0.25);
          background: white;
          display: grid;
          grid-template-columns: 55% 45%;
          overflow: hidden;
          position: relative;
        }
        
        .purple-panel {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
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
          transition: transform 0.8s cubic-bezier(0.19, 1, 0.22, 1), border-radius 0.8s cubic-bezier(0.19, 1, 0.22, 1);
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
          transition: all 0.3s ease;
        }
        
        .outline-btn:hover {
          background: white;
          color: #8b5cf6;
          transform: scale(1.05);
        }
        
        .form-panel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }
        
        .social-btn {
          width: 48px;
          height: 48px;
          border: 1.5px solid #d1d5db;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: white;
          transition: all 0.25s ease;
          cursor: pointer;
        }
        
        .social-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
          transform: translateY(-2px);
        }
        
        .form-input {
          width: 100%;
          padding: 16px 20px;
          border: none;
          background: #f3f4f6;
          border-radius: 12px;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s ease;
        }
        
        .form-input:focus {
          background: #e5e7eb;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        
        .primary-btn {
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
          color: white;
          border: none;
          border-radius: 50px;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);
        }
        
        .primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(139, 92, 246, 0.4);
        }
        
        @media (max-width: 968px) {
          .auth-container { grid-template-columns: 1fr; min-height: auto; }
          .purple-panel { border-radius: 0 0 200px 200px; transform: none !important; order: initial; }
          .purple-panel h2 { font-size: 2.5rem; }
        }
      `}</style>

      {showConfetti && <div ref={confettiRef} className="fixed inset-0 pointer-events-none z-50 confetti" />}

      {(error || success) && (
        <div
          className={`fixed left-1/2 top-8 z-[1001] px-6 py-3 rounded-xl font-bold text-sm transition-all duration-500 animate-notif-center ${
            error ? "bg-red-500/90 text-white border border-red-400" : "bg-green-500/90 text-white border border-green-400"
          }`}
          style={{ transform: "translateX(-50%)", minWidth: "280px", maxWidth: "90vw" }}
        >
          {error || success}
        </div>
      )}

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

        <div className="form-panel">
          {!isSignUpActive ? (
            <SignInForm formData={formData} onChange={handleInputChange} onSubmit={handleSubmit} />
          ) : (
            <SignUpForm formData={formData} onChange={handleInputChange} onSubmit={handleSubmit} />
          )}
        </div>
      </div>
    </div>
  );
};