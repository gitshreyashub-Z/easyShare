import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

const savedUser = JSON.parse(localStorage.getItem('pasteboxUser') || 'null');

export const loginUser = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', data);
    localStorage.setItem('pasteboxUser', JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/register', data);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Registration failed');
  }
});

export const verifySignupOtp = createAsyncThunk('auth/verifySignupOtp', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/verify-signup-otp', data);
    localStorage.setItem('pasteboxUser', JSON.stringify(res.data));
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Verification failed');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: savedUser, loading: false, error: null },
  reducers: {
    logout: (state) => {
      state.user = null;
      localStorage.removeItem('pasteboxUser');
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(loginUser.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; })
      .addCase(loginUser.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(registerUser.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(registerUser.fulfilled, (s) => { s.loading = false; })
      .addCase(registerUser.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(verifySignupOtp.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(verifySignupOtp.fulfilled, (s, a) => { s.loading = false; s.user = a.payload; })
      .addCase(verifySignupOtp.rejected, (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;