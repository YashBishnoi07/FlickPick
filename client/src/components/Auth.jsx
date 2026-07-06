import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import styles from './Auth.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SECURITY_QUESTIONS = [
  "What is your favorite animal?",
  "What is your mother's maiden name?",
  "What city were you born in?",
  "What was the name of your first pet?",
  "What is your favorite movie?"
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration fields
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Forgot password fields
  const [retrievedQuestion, setRetrievedQuestion] = useState('');

  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const { login, register, googleLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await googleLogin(credentialResponse.credential);
      navigate('/');
    } catch (err) {
      setError('Google Login failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      if (isLogin) {
        await login(username, password);
        navigate('/'); // Go home on success
      } else {
        await register(username, password, securityQuestion, securityAnswer);
        navigate('/'); // Go home on success
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      if (forgotStep === 1) {
        const res = await axios.post(`${API_URL}/api/auth/get-security-question`, { username });
        setRetrievedQuestion(res.data.question);
        setForgotStep(2);
      } else if (forgotStep === 2) {
        const res = await axios.post(`${API_URL}/api/auth/reset-password-security`, { 
          username, 
          securityAnswer, 
          newPassword: password 
        });
        setSuccessMsg(res.data.message);
        setForgotStep(3); // Success state
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process request');
    }
  };

  if (isForgotPassword) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>FlickPick</h1>
          <h2 className={styles.subtitle}>Reset Password</h2>
          
          {error && <div className={styles.error}>{error}</div>}
          {successMsg && <div className={styles.success} style={{color: '#4CAF50', marginBottom: '16px', textAlign: 'center'}}>{successMsg}</div>}
          
          {forgotStep === 1 && (
            <form onSubmit={handleForgotSubmit} className={styles.form}>
              <p style={{color: '#ccc', fontSize: '14px', marginBottom: '16px', textAlign: 'center'}}>
                Enter your username to answer your security question.
              </p>
              <input 
                type="text" 
                placeholder="Username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                className={styles.input}
              />
              <button type="submit" className={styles.btn}>Continue</button>
            </form>
          )}

          {forgotStep === 2 && (
            <form onSubmit={handleForgotSubmit} className={styles.form}>
              <p style={{color: '#ccc', fontSize: '14px', marginBottom: '16px', textAlign: 'center'}}>
                <strong>Question:</strong> {retrievedQuestion}
              </p>
              <input 
                type="text" 
                placeholder="Your Answer" 
                value={securityAnswer} 
                onChange={(e) => setSecurityAnswer(e.target.value)} 
                required 
                className={styles.input}
              />
              <input 
                type="password" 
                placeholder="New Password"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className={styles.input}
              />
              <button type="submit" className={styles.btn}>Reset Password</button>
            </form>
          )}

          {forgotStep === 3 && (
            <button 
              onClick={() => {
                setIsForgotPassword(false);
                setIsLogin(true);
                setForgotStep(1);
                setPassword('');
                setSecurityAnswer('');
              }} 
              className={styles.btn}
              style={{marginTop: '16px'}}
            >
              Back to Log In
            </button>
          )}

          {forgotStep !== 3 && (
            <p className={styles.switchText} style={{marginTop: '16px'}}>
              <button onClick={() => { setIsForgotPassword(false); setForgotStep(1); setSecurityAnswer(''); }} className={styles.switchBtn}>
                Cancel
              </button>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>FlickPick</h1>
        <h2 className={styles.subtitle}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        {error && <div className={styles.error}>{error}</div>}
        {successMsg && <div className={styles.success} style={{color: '#4CAF50', marginBottom: '16px', textAlign: 'center'}}>{successMsg}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
            className={styles.input}
          />
          {!isLogin && (
            <>
              <select 
                value={securityQuestion} 
                onChange={(e) => setSecurityQuestion(e.target.value)}
                className={styles.input}
                style={{ appearance: 'auto', backgroundColor: '#111', color: '#fff' }}
              >
                {SECURITY_QUESTIONS.map((q, idx) => (
                  <option key={idx} value={q}>{q}</option>
                ))}
              </select>
              <input 
                type="text" 
                placeholder="Security Answer (for password reset)" 
                value={securityAnswer} 
                onChange={(e) => setSecurityAnswer(e.target.value)} 
                required
                className={styles.input}
              />
            </>
          )}
          <input 
            type="password" 
            placeholder="Password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className={styles.input}
          />
          <button type="submit" className={styles.btn}>
            {isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div style={{ margin: '20px 0', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google Login failed')}
            theme="filled_black"
            shape="pill"
            width="100%"
          />
        </div>

        <p className={styles.switchText}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className={styles.switchBtn}>
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>

        {isLogin && (
          <p className={styles.switchText} style={{marginTop: '8px'}}>
            <button onClick={() => setIsForgotPassword(true)} className={styles.switchBtn}>
              Forgot Password?
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;
