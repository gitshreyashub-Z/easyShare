import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDispatch, useSelector } from 'react-redux';
import { uploadFile } from '../store/slices/fileSlice';
import { toast } from 'react-toastify';

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function FileUpload({ onSuccess }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.files);
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setSelectedFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  });

  const handleUpload = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(p => { if (p >= 90) { clearInterval(interval); return p; } return p + 10; });
    }, 200);

    const result = await dispatch(uploadFile(formData));
    clearInterval(interval);
    setProgress(100);

    if (uploadFile.fulfilled.match(result)) {
      toast.success('File uploaded successfully!');
      onSuccess(result.payload);
      setTimeout(() => { setSelectedFile(null); setProgress(0); }, 500);
    } else {
      toast.error(result.payload || 'Upload failed');
      setProgress(0);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
          ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 hover:border-indigo-500/60 hover:bg-gray-900/60'}`}
      >
        <input {...getInputProps()} />
        <div className="text-5xl mb-4">📂</div>
        {isDragActive ? (
          <p className="text-indigo-400 font-medium">Drop it here!</p>
        ) : (
          <>
            <p className="text-white font-semibold text-lg">Drag & drop your file</p>
            <p className="text-gray-500 text-sm mt-1">or <span className="text-indigo-400 underline cursor-pointer">click to browse</span></p>
            <p className="text-gray-600 text-xs mt-3">Max file size: 50MB</p>
          </>
        )}
      </div>

      {selectedFile && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center text-xl">
                {selectedFile.type.startsWith('image') ? '🖼️' :
                  selectedFile.type.includes('pdf') ? '📄' :
                  selectedFile.type.includes('video') ? '🎥' : '📦'}
              </div>
              <div>
                <p className="text-white text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                <p className="text-gray-500 text-xs">{formatSize(selectedFile.size)}</p>
              </div>
            </div>
            <button onClick={() => setSelectedFile(null)} className="text-gray-600 hover:text-red-400 text-lg transition-colors">✕</button>
          </div>

          {progress > 0 && (
            <div className="mb-3">
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-gray-500 text-xs mt-1 text-right">{progress}%</p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Uploading...' : '⚡ Upload File'}
          </button>
        </div>
      )}
    </div>
  );
}