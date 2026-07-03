import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyFiles } from '../store/slices/fileSlice';
import FileCard from '../components/FileCard';
import FileUpload from '../components/FileUpload';
import ShareModal from '../components/ShareModal';
import { useState } from 'react';

export default function Dashboard() {
  const dispatch = useDispatch();
  const { myFiles } = useSelector((s) => s.files);
  const { user } = useSelector((s) => s.auth);
  const [justUploaded, setJustUploaded] = useState(null);

  useEffect(() => {
    dispatch(fetchMyFiles());
  }, [dispatch]);

  const handleSuccess = (file) => {
    setJustUploaded(file);
    dispatch(fetchMyFiles());
  };

  const totalSize = myFiles.reduce((a, f) => a + f.size, 0);
  const formatSize = (b) => (b / (1024 * 1024)).toFixed(1) + ' MB';

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">
          Welcome back, <span className="text-indigo-400">{user?.name}</span> 👋
        </h1>
        <p className="text-gray-500">Manage all your uploaded files here.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Files', value: myFiles.length, icon: '📁' },
          { label: 'Total Size', value: formatSize(totalSize), icon: '💾' },
          { label: 'Total Downloads', value: myFiles.reduce((a, f) => a + f.downloadCount, 0), icon: '⬇️' },
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className="text-3xl">{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-gray-500 text-sm">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Upload New File</h2>
            <FileUpload onSuccess={handleSuccess} />
          </div>
        </div>

        {/* Files */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">Your Files</h2>
          {myFiles.length === 0 ? (
            <div className="card text-center py-16">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-gray-500">No files uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myFiles.map((f) => <FileCard key={f._id} file={f} />)}
            </div>
          )}
        </div>
      </div>

      {justUploaded && <ShareModal file={justUploaded} onClose={() => setJustUploaded(null)} />}
    </div>
  );
}