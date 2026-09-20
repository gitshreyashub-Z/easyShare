import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { getApiUrl } from '../api/axios';
import ShareModal from '../components/ShareModal';

const formatSize = (b) => b < 1024 * 1024 ? (b / 1024).toFixed(1) + ' KB' : (b / (1024 * 1024)).toFixed(1) + ' MB';
const getIcon = (mime = '') => {
  if (mime.startsWith('image')) return '🖼️';
  if (mime.includes('pdf')) return '📄';
  if (mime.startsWith('video')) return '🎥';
  return '📁';
};

export default function FilePreview() {
  const { shortId } = useParams();
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    api.get(`/files/${shortId}`)
      .then(r => setFile(r.data))
      .catch(() => setError('File not found or has expired.'));
  }, [shortId]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card text-center max-w-sm w-full">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-white font-bold text-xl mb-2">File Not Found</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  if (!file) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500 text-center">
        <div className="text-4xl mb-3 animate-pulse">⏳</div>
        <p>Loading file...</p>
      </div>
    </div>
  );

  const isImage = file.mimetype?.startsWith('image');
  const previewUrl = getApiUrl(`/files/${file.shortId}/preview`);
  const downloadUrl = getApiUrl(`/files/${file.shortId}/download`);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="card text-center">
          {isImage ? (
            <img src={previewUrl} alt={file.originalName} className="rounded-xl mb-5 max-h-72 w-full object-contain bg-gray-800" />
          ) : (
            <div className="text-7xl mb-5">{getIcon(file.mimetype)}</div>
          )}

          <h1 className="text-white font-bold text-xl mb-1 truncate">{file.originalName}</h1>
          <div className="flex items-center justify-center gap-3 text-gray-500 text-sm mb-6">
            <span>{formatSize(file.size)}</span>
            <span>•</span>
            <span>{file.downloadCount} downloads</span>
          </div>

          <div className="flex gap-3">
            <a href={downloadUrl} className="btn-primary flex-1 text-center text-sm py-3">
              ⬇️ Download
            </a>
            <button onClick={() => setShowShare(true)} className="btn-ghost flex-1 text-sm py-3">
              🔗 Share
            </button>
          </div>
        </div>
      </div>

      {showShare && <ShareModal file={file} onClose={() => setShowShare(false)} />}
    </div>
  );
}
