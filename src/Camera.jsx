import React, { useRef, useState, useEffect } from 'react';

/**
 * React component: starts camera with high-resolution constraints
 * and uses ImageCapture API for maximum quality photos.
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
        // Request highest possible resolution (4K ideal)
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 4096 },
            height: { ideal: 2160 },
            focusMode: { ideal: 'continuous' } // Attempt to force continuous focus
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          // Apply advanced constraints if supported (e.g. focus)
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities();

          if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
          }
        }
      } catch (err) {
        console.error('Error starting camera:', err);
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

  // Capture photo using ImageCapture (high res) or Canvas fallback
  async function capturePhoto() {
    const stream = streamRef.current;
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    const imageCapture = new window.ImageCapture(track);

    try {
      // 1. Try taking a full-resolution photo with ImageCapture
      const blob = await imageCapture.takePhoto();
      setPhotoUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.warn('ImageCapture failed, falling back to canvas:', err);

      // 2. Fallback: Draw video frame to canvas (screen resolution)
      const video = videoRef.current;
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95); // High quality JPEG
      setPhotoUrl(dataUrl);
    }
  }

  return (
    <div className="relative w-screen h-screen bg-black">
      {error && (
        <div className="absolute top-10 left-0 w-full text-center text-red-500 bg-white p-2 z-50">
          {error}
        </div>
      )}

      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
        playsInline
        muted
      />

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <button
          onClick={capturePhoto}
          className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 shadow-lg active:scale-95 transition-transform"
          aria-label="Take Photo"
        />
      </div>

      {photoUrl && (
        <div className="absolute top-0 left-0 w-full h-full bg-black z-30 flex flex-col items-center justify-center">
          <img
            src={photoUrl}
            alt="Captured"
            className="max-w-full max-h-[80%] object-contain"
          />
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setPhotoUrl(null)}
              className="px-6 py-2 bg-gray-800 text-white rounded-lg font-medium"
            >
              Retake
            </button>
            <button
              onClick={() => { /* Handle confirm/upload here */ }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium"
            >
              Use Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
