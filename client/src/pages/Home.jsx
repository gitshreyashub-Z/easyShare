import { useState } from 'react';
import FileUpload from '../components/FileUpload';
import ShareModal from '../components/ShareModal';

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState(null);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-24 px-4 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 text-sm px-4 py-2 rounded-full mb-6">
            ⚡ Fast, Free & Anonymous File Sharing
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
            Share files in <span className="text-indigo-400">seconds</span>
          </h1>
          <p className="text-gray-400 text-xl mb-12 max-w-xl mx-auto">
            Upload any file, get a shareable link instantly. No sign-up required. Works with QR codes too.
          </p>

          <FileUpload onSuccess={setUploadedFile} />
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 border-t border-gray-800">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '⚡', title: 'Lightning Fast', desc: 'Files uploaded and ready to share in seconds.' },
            { icon: '🔗', title: 'Instant Links', desc: 'Get a short shareable link or QR code immediately.' },
            { icon: '🔒', title: 'Auto-Expiry', desc: 'Files auto-expire in 7 days to keep things clean.' },
          ].map((f) => (
            <div key={f.title} className="card text-center">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {uploadedFile && (
        <ShareModal file={uploadedFile} onClose={() => setUploadedFile(null)} />
      )}
    </div>
  );
}