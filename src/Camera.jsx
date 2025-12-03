import React, { useRef, useState, useEffect } from 'react';

/**
 * React component: Optimal camera selection and focus strategy for ID card photography.
 * 
 * Complete Strategy:
 * 1. Use 4K resolution (4096x2160) to guide Chrome to select main rear camera
 * 2. After 500ms delay, apply macro focus optimization:
 *    - Continuous focus mode for stability
 *    - Macro mode for extreme close-up clarity
 *    - Lock focus distance at 12cm (0.12m) for ID card clarity
 * 
 * This ensures:
 * - Main camera selection (high resolution)
 * - Locked close-up focus (12cm distance)
 * - Clear text capture on ID cards
 */
export default function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [error, setError] = useState(null);

  // Initialize preview on mount
  useEffect(() => {
    async function startCamera() {
      try {
        // Step 1: Optimal constraints to guide Chrome to select main camera
        // Use 4K resolution to ensure main rear camera is selected
        const optimalConstraints = {
          video: {
            // 1. Force rear camera with exact constraint
            facingMode: { exact: 'environment' },

            // 2. Request very high resolution (4K) to guide camera selection
            // min: ensures preview quality, ideal: guides Chrome to select main camera
            width: { min: 1920, ideal: 4096 },   // Min 1080p, ideal 4K
            height: { min: 1080, ideal: 2160 },   // Min 1080p, ideal 4K

            // 3. Request stable frame rate
            frameRate: { ideal: 30 },

            // 4. Initial continuous focus (will be optimized after 500ms)
            advanced: [
              { focusMode: 'continuous' }
            ]
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(optimalConstraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          console.log('✅ Successfully obtained stream. Applying focus optimization...');

          // Delayed focus optimization (double insurance)
          // Strategy: Use 4K resolution to guide main camera selection first,
          // then apply macro focus after 500ms delay
          setTimeout(async () => {
            const track = stream.getVideoTracks()[0];
            try {
              // Apply optimal focus settings for close-up ID card photography
              // 1. Continuous focus for stability
              // 2. Macro mode for extreme close-up clarity
              // 3. Lock focus distance at 12cm (0.12m) for ID card clarity
              await track.applyConstraints({
                advanced: [
                  { focusMode: 'continuous' },   // Continuous focus for stability
                  { focusMode: 'macro' },         // Force macro focus mode (extreme close-up)
                  { focusDistance: 0.12 }         // Lock at 12cm (0.12m) for ID cards
                ]
              });
              console.log('✅ Macro focus optimization applied: 12cm focus distance');
            } catch (e) {
              console.warn('⚠️ Macro focus optimization failed (expected on some devices):', e);
              // Ignore failure, but we tried our best
            }
          }, 500); // 500ms delay to ensure camera is ready
        }
      } catch (err) {
        console.error('❌ Cannot obtain camera matching constraints:', err);
        setError('Could not start camera. Please ensure permissions are granted.');
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Capture photo using ImageCapture or Canvas fallback
  async function capturePhoto() {
    const stream = streamRef.current;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    const imageCapture = new window.ImageCapture(track);

    try {
      const blob = await imageCapture.takePhoto();
      setPhotoUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.warn('ImageCapture failed, falling back to canvas:', err);

      const video = videoRef.current;
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setPhotoUrl(dataUrl);
    }
  }

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden flex items-center justify-center">
      {error && (
        <div className="absolute top-10 left-0 w-full text-center text-red-500 bg-white p-2 z-50">
          {error}
        </div>
      )}

      {/* Constrained Video Preview - 300x300px */}
      <div className="relative w-[300px] h-[300px] rounded-lg overflow-hidden shadow-2xl">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* ID Card Overlay Frame */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="w-[95%] h-[95%] border-2 border-white/70 rounded-lg relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br"></div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-8 left-0 w-full px-6 z-20 text-center">
        <p className="text-white text-sm bg-black/50 backdrop-blur-sm rounded-lg p-3 inline-block">
          📸 Align your ID card within the frame
        </p>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 w-full p-8 pb-12 z-20 flex flex-col items-center gap-4">
        <p className="text-white/80 text-sm">Optimized for main camera clarity</p>

        {/* Shutter Button */}
        <button
          onClick={capturePhoto}
          className="w-20 h-20 bg-white rounded-full border-4 border-white/50 shadow-lg active:scale-95 transition-transform"
          aria-label="Take Photo"
        />
      </div>

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
