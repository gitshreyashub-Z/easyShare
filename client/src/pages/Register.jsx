import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, verifySignupOtp, clearError } from '../store/slices/authSlice';
import { toast } from 'react-toastify';
import api from '../api/axios';

export default function Register() {
  const [step, setStep] = useState(1); // 1: Form, 2: OTP Verification
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const otpInputRefs = useRef([]);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, user } = useSelector((s) => s.auth);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first OTP input when entering step 2
  useEffect(() => {
    if (step === 2 && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const otpValue = otpDigits.join('');

  // OTP digit handling
  const handleOtpChange = (index, value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    const digit = cleanValue.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasteData.length; i++) {
      newDigits[i] = pasteData[i];
    }
    setOtpDigits(newDigits);

    const focusIndex = Math.min(pasteData.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  // Step 1: Submit Details & Request OTP
  const submitDetails = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const resultAction = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(resultAction)) {
      toast.success(resultAction.payload?.message || 'Verification code sent to your email!');
      setResendCooldown(60);
      setStep(2);
    }
  };

  // Step 2: Verify Signup OTP
  const submitVerification = async (e) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }

    const resultAction = await dispatch(
      verifySignupOtp({
        email: form.email.trim().toLowerCase(),
        otp: otpValue,
      })
    );

    if (verifySignupOtp.fulfilled.match(resultAction)) {
      toast.success(`Welcome to PasteBox, ${resultAction.payload.name}!`);
      navigate('/dashboard');
    }
  };

  // Resend Signup OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      const { data } = await api.post('/auth/resend-signup-otp', {
        email: form.email.trim().toLowerCase(),
      });
      toast.success(data.message || 'New verification code sent!');
      setResendCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create an account</h1>
          <p className="text-gray-400 text-sm">
            {step === 1 && 'Start sharing files securely in seconds'}
            {step === 2 && 'Enter the 6-digit verification code sent to your email'}
          </p>
        </div>

        {/* Step Progression Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              1
            </span>
            <span className="text-xs font-medium text-gray-400">Details</span>
          </div>
          <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-800'}`} />
          <div className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === 2 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              2
            </span>
            <span className="text-xs font-medium text-gray-400">Verify Email</span>
          </div>
        </div>

        {/* Card */}
        <div className="card">
          {/* STEP 1: Registration Form */}
          {step === 1 && (
            <form onSubmit={submitDetails} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block font-medium">Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handle}
                  placeholder="Your name"
                  className="input-field"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1.5 block font-medium">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handle}
                  placeholder="you@example.com"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1.5 block font-medium">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handle}
                    placeholder="Min 6 characters"
                    className="input-field pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Verify Signup OTP */}
          {step === 2 && (
            <form onSubmit={submitVerification} className="space-y-5">
              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3.5 flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate max-w-[220px]" title={form.email}>
                  {form.email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtpDigits(['', '', '', '', '', '']);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium ml-2"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="text-sm text-gray-300 mb-2 block font-medium">6-Digit Verification Code</label>
                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-12 h-14 text-center text-2xl font-bold bg-gray-950 border border-gray-700 focus:border-indigo-500 rounded-xl text-white outline-none transition-all duration-150"
                      required
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpValue.length !== 6}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  'Verify & Activate Account'
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                <span>Didn't receive the code?</span>
                {resendCooldown > 0 ? (
                  <span className="text-gray-500">Resend in {resendCooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    {resending ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </div>
            </form>
          )}

          <p className="text-center text-gray-500 text-sm mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}