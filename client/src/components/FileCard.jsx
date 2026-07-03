import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { deleteFile } from '../store/slices/fileSlice';
import { toast } from 'react-toastify';
import ShareModal from './ShareModal';

const formatSize = (bytes) => {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getIcon = (mime = '') => {
  if (mime.startsWith('image')) return '🖼️';
  if (mime.includes('pdf')) return '📄';
  if (mime.startsWith('video')) return '🎥';
  if (mime.startsWith('audio')) return '🎵';
  if (mime.includes('zip') || mime.includes('rar')) return '📦';
  return '📁';
};

const timeLeft = (date) => {
  const diff = new Date(date) - new Date();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days}d left`;
};

export default function FileCard({ file }) {
  const dispatch = useDispatch();
  const [showShare, setShowShare] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this file?')) return;
    setDeleting(true);
    const res = await dispatch(deleteFile(file.shortId));
    if (deleteFile.fulfilled.match(res)) toast.success('File deleted');
    else { toast.error('Delete failed'); setDeleting(false); }
  };

  return (
    <>
      <div className="card hover:border-gray-700 transition-all group">
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center text-2xl">
            {getIcon(file.mimetype)}
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowShare(true)}
              className="text-gray-500 hover:text-indigo-400 transition-colors text-lg"
              title="Share"
            >🔗</button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-gray-500 hover:text-red-400 transition-colors text-lg"
              title="Delete"
            >🗑️</button>
          </div>
        </div>

        <p className="text-white font-medium text-sm truncate mb-1">{file.originalName}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{formatSize(file.size)}</span>
          <span>•</span>
          <span>{file.downloadCount} downloads</span>
          <span>•</span>
          <span className={file.expiresAt && new Date(file.expiresAt) < new Date() ? 'text-red-400' : 'text-green-400'}>
            {timeLeft(file.expiresAt)}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShowShare(true)}
            className="btn-primary text-xs py-2 px-3 flex-1"
          >
            Share
          </button>
          
          {/* Fixed the missing opening '<a' tag below */}
          <a 
            href={`http://localhost:5000/api/files/${file.shortId}/download`}
            className="btn-ghost text-xs py-2 px-3 flex-1 text-center"
          >
            Download
          </a>
        </div>
      </div>

      {showShare && <ShareModal file={file} onClose={() => setShowShare(false)} />}
    </>
  );
}