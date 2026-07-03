import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';

export default function ShareModal({ file, onClose }) {
  const [tab, setTab] = useState('link');
  const shareUrl = file.shareUrl;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  };

  const shareOptions = [
    { label: 'WhatsApp', color: 'bg-green-600', emoji: '💬', url: `https://wa.me/?text=${encodeURIComponent(shareUrl)}` },
    { label: 'Email', color: 'bg-blue-600', emoji: '📧', url: `mailto:?subject=Check this file&body=${encodeURIComponent(shareUrl)}` },
    { label: 'Twitter', color: 'bg-sky-500', emoji: '🐦', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Share File</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl transition-colors">✕</button>
        </div>

        {/* File info */}
        <div className="bg-gray-800/50 rounded-xl p-3 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center text-xl">📄</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{file.originalName}</p>
            <p className="text-gray-500 text-xs">{file.downloadCount} downloads</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5 bg-gray-800/50 rounded-xl p-1">
          {['link', 'qr', 'social'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize
                ${tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              {t === 'link' ? '🔗 Link' : t === 'qr' ? '📱 QR Code' : '📤 Social'}
            </button>
          ))}
        </div>

        {/* Link Tab */}
        {tab === 'link' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="input-field text-sm flex-1" />
              <button onClick={copyLink} className="btn-primary px-4 py-2 text-sm whitespace-nowrap">Copy</button>
            </div>
            
            <a 
              href={`http://localhost:5000/api/files/${file.shortId}/download`}
              className="btn-ghost w-full text-center block text-sm"
            >
              ⬇️ Download File
            </a>
          </div>
        )}

        {/* QR Tab */}
        {tab === 'qr' && (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={shareUrl} size={180} />
            </div>
            <p className="text-gray-500 text-sm text-center">Scan to access the file</p>
          </div>
        )}

        {/* Social Tab */}
        {tab === 'social' && (
          <div className="space-y-3">
            {shareOptions.map((opt) => (
              <a
                key={opt.label}
                href={opt.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${opt.color} flex items-center gap-3 px-4 py-3 rounded-xl text-white font-medium hover:opacity-90 transition-opacity`}
              >
                <span className="text-xl">{opt.emoji}</span>
                Share on {opt.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}