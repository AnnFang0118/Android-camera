
import React, { useRef, useState } from 'react';

/**
 * React component: Native camera priority.
 * Main button triggers native camera for guaranteed clarity.
 * Preview shows ID card alignment guide.
 */
export default function Camera() {
  const fileInputRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(null);

  // Handle native file input
  function handleNativeCapture(e) {
    const file = e.target.files[0];
    if (file) {
      setPhotoUrl(URL.createObjectURL(file));
    }
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex items-center justify-center">
      {/* ID Card Overlay Guide */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
        <div className="w-[85%] aspect-[1.586] border-2 border-white/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
          <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br"></div>
          <p className="absolute -top-8 w-full text-center text-white text-sm font-medium shadow-black drop-shadow-md">
            Align ID Card Here
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-20 left-0 w-full px-6 z-20 text-center">
        <p className="text-white text-lg font-medium bg-black/50 backdrop-blur-sm rounded-lg p-4 inline-block">
          📸 Tap the button below to open your camera
        </p>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 w-full p-8 pb-12 z-20 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-white/80 text-sm">Uses your phone's native camera for best quality</p>

        {/* Main Camera Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-24 h-24 bg-white rounded-full border-4 border-white/50 shadow-lg active:scale-95 transition-transform flex items-center justify-center text-4xl"
          aria-label="Take Photo"
        >
          📷
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleNativeCapture}
        className="hidden"
      />

      {/* Photo Preview Modal */}
      {photoUrl && (
        <div className="absolute top-0 left-0 w-full h-full bg-black z-50 flex flex-col items-center justify-center p-4">
          <img
            src={photoUrl}
            alt="Captured"
            className="max-w-full max-h-[80%] object-contain rounded-lg shadow-2xl border border-gray-800"
          />
          <div className="flex gap-4 mt-8 w-full max-w-xs">
            <button
              onClick={() => setPhotoUrl(null)}
              className="flex-1 px-6 py-3 bg-gray-800 text-white rounded-xl font-medium active:bg-gray-700 transition-colors"
            >
              Retake
            </button>
            <button
              onClick={() => { /* Handle confirm/upload here */ }}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium active:bg-blue-500 transition-colors shadow-lg shadow-blue-900/30"
            >
              Use Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
