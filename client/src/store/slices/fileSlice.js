import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axios';

export const uploadFile = createAsyncThunk('files/upload', async (formData, { rejectWithValue }) => {
  try {
    const res = await api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        // progress handled in component
      },
    });
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Upload failed');
  }
});

export const fetchMyFiles = createAsyncThunk('files/fetchMy', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/files/my-files');
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Fetch failed');
  }
});

export const deleteFile = createAsyncThunk('files/delete', async (shortId, { rejectWithValue }) => {
  try {
    await api.delete(`/files/${shortId}`);
    return shortId;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Delete failed');
  }
});

const fileSlice = createSlice({
  name: 'files',
  initialState: { myFiles: [], lastUploaded: null, loading: false, error: null },
  reducers: {
    clearLastUploaded: (state) => { state.lastUploaded = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadFile.pending, (s) => { s.loading = true; s.error = null; })
      .addCase(uploadFile.fulfilled, (s, a) => { s.loading = false; s.lastUploaded = a.payload; })
      .addCase(uploadFile.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(fetchMyFiles.fulfilled, (s, a) => { s.myFiles = a.payload; })
      .addCase(deleteFile.fulfilled, (s, a) => {
        s.myFiles = s.myFiles.filter(f => f.shortId !== a.payload);
      });
  },
});

export const { clearLastUploaded } = fileSlice.actions;
export default fileSlice.reducer;