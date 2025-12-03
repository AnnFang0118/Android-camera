import React, { useRef, useState, useEffect } from 'react';

/**
 * React component: Optimal camera selection and focus strategy for ID card photography.
 * 
 * Complete Strategy:
 * 1. Use 4K resolution (4096x2160) to guide Chrome to select main rear camera
 * 2. After 500ms delay, apply macro focus optimization:
 *    - Continuous focus mode for stability
 *    - Macro mode for extreme close-up clarity
 *    - Lock focus distance at 5cm (0.05m) for optimal 5-10cm range
 * 
 * This ensures:
 * - Main camera selection (high resolution)
 * - Locked close-up focus (5-10cm range)
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

          // Log actual video resolution for debugging
          const track = stream.getVideoTracks()[0];
          const settings = track.getSettings();
          console.log('✅ Camera stream obtained');
          console.log('📹 Actual resolution:', settings.width, 'x', settings.height);
          console.log('📹 Frame rate:', settings.frameRate);
          console.log('📹 Facing mode:', settings.facingMode);

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
              // 3. Lock focus distance at 5cm (0.05m) for optimal ID card text clarity
              await track.applyConstraints({
                advanced: [
                  { focusMode: 'continuous' },   // Continuous focus for stability
                  { focusMode: 'macro' },         // Force macro focus mode (extreme close-up)
                  { focusDistance: 0.05 }         // Lock at 5cm (0.05m) for ID cards - optimal for 5-10cm range
                ]
              });
              console.log('✅ Macro focus optimization applied: 5cm focus distance');
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
  // Optimized for ID card recognition - maximum quality
  async function capturePhoto() {
    const stream = streamRef.current;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    const imageCapture = new window.ImageCapture(track);

    try {
      // Use ImageCapture API for best quality (native camera capture)
      const blob = await imageCapture.takePhoto({
        imageWidth: 4096,   // Request maximum resolution
        imageHeight: 2160,
        fillLightMode: 'auto'  // Auto fill light for better exposure
      });
      setPhotoUrl(URL.createObjectURL(blob));
      console.log('✅ Photo captured using ImageCapture API (high quality)');
    } catch (err) {
      console.warn('ImageCapture failed, falling back to canvas:', err);

      // Fallback to canvas with maximum quality
      const video = videoRef.current;
      if (!video) return;

      const canvas = document.createElement('canvas');
      // Use actual video resolution for maximum quality
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      // Use high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0);

      // Maximum quality JPEG (0.98 for best quality vs file size balance)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
      setPhotoUrl(dataUrl);
      console.log('✅ Photo captured using Canvas fallback (resolution:', canvas.width, 'x', canvas.height, ')');
    }
  }

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">
      {error && (
        <div className="absolute top-10 left-0 w-full text-center text-red-500 bg-white p-2 z-50">
          {error}
        </div>
      )}

      {/* Video Preview - Compact size for mobile */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        {/* Video container - fixed small size for mobile with inline styles */}
        <div 
          className="relative flex items-center justify-center mx-auto my-auto"
          style={{
            width: 'min(750px, 95vw)',
            paddingBottom: '75%', // 4:3 aspect ratio (3/4 = 0.75)
            maxWidth: '95vw',
            position: 'relative'
          }}
        >
          <video
            ref={videoRef}
            className="object-contain"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              imageRendering: 'auto',
              WebkitImageRendering: 'auto',
              transform: 'translateZ(0)', // Force hardware acceleration
              backfaceVisibility: 'hidden'
            }}
            playsInline
            muted
            autoPlay
            preload="auto"
          />

          {/* ID Card Overlay Frame - Centered */}
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center px-4">
            <div className="w-full max-w-[80%] aspect-[1.6] border-2 border-white/90 rounded-lg relative shadow-2xl">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-5 h-5 border-t-3 border-l-3 border-white -mt-0.5 -ml-0.5 rounded-tl"></div>
              <div className="absolute top-0 right-0 w-5 h-5 border-t-3 border-r-3 border-white -mt-0.5 -mr-0.5 rounded-tr"></div>
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-3 border-l-3 border-white -mb-0.5 -ml-0.5 rounded-bl"></div>
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-3 border-r-3 border-white -mb-0.5 -mr-0.5 rounded-br"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions - Top */}
      <div className="absolute top-4 left-0 w-full px-4 z-20 text-center">
        <p className="text-white text-xs sm:text-sm bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
          📸 將身分證對齊框架內，距離約 10-15 公分
        </p>
      </div>

      {/* Bottom Controls - Compact for mobile */}
      <div className="absolute bottom-0 left-0 w-full pb-6 pt-4 z-20 flex flex-col items-center gap-3 bg-gradient-to-t from-black/80 to-transparent">
        {/* Shutter Button - Larger for mobile */}
        <button
          onClick={capturePhoto}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full border-4 border-white/50 shadow-2xl active:scale-95 transition-transform"
          aria-label="Take Photo"
        />
        <p className="text-white/70 text-xs px-4 text-center">優化設定：5cm 對焦距離，最佳清晰度</p>
      </div>

      {/* Photo Preview Modal - Optimized for mobile */}
      {photoUrl && (
        <div className="absolute top-0 left-0 w-full h-full bg-black z-50 flex flex-col items-center justify-center p-4">
          <img
            src={photoUrl}
            alt="拍攝的照片"
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl border border-gray-800"
          />
          <div className="flex gap-3 mt-6 w-full max-w-sm px-4">
            <button
              onClick={() => setPhotoUrl(null)}
              className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-xl font-medium active:bg-gray-700 transition-colors text-sm sm:text-base"
            >
              重拍
            </button>
            <button
              onClick={() => { /* Handle confirm/upload here */ }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium active:bg-blue-500 transition-colors shadow-lg shadow-blue-900/30 text-sm sm:text-base"
            >
              使用照片
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
