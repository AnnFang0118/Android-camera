import React, { useRef, useState, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

/**
 * React component: starts camera preview using @zxing/library
 * which handles device selection and autofocus better on Android.
 */
export default function Camera() {
  const videoRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const codeReader = useRef(new BrowserMultiFormatReader());

  // Initialize preview on mount
  useEffect(() => {
    const reader = codeReader.current;
    let mounted = true;

    async function startCamera() {
      try {
        const videoInputDevices = await reader.listVideoInputDevices();
        
        // Try to find the back camera
        const rearCamera = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('environment')
        );
        
        const selectedDeviceId = rearCamera ? rearCamera.deviceId : videoInputDevices[0].deviceId;
        
        if (!mounted) return;

        // Start continuous decode (preview)
        // We pass a callback that does nothing because we are only interested in the camera feed,
        // not the actual barcode decoding.
        await reader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, err) => {
          // Ignore decoding results/errors
        });
      } catch (err) {
        console.error('Error starting camera:', err);
      }
    }

    startCamera();

    return () => {
      mounted = false;
      reader.reset();
    };
  }, []);

  // Capture photo by drawing current video frame to canvas
  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg');
    setPhotoUrl(dataUrl);
  }

  return (
    <div className="relative w-screen h-screen">
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
        playsInline
        muted
      />
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <button onClick={capturePhoto} className="px-6 py-3 bg-white rounded-full shadow-lg text-black font-semibold">
          📸 Capture
        </button>
      </div>
      {photoUrl && (
        <div className="absolute top-0 left-0 w-full h-full bg-black z-10">
          <img
            src={photoUrl}
            alt="Captured"
            className="w-full h-full object-contain"
          />
          <button 
            onClick={() => setPhotoUrl(null)}
            className="absolute top-4 right-4 text-white bg-gray-800 px-4 py-2 rounded"
          >
            Retake
          </button>
        </div>
      )}
    </div>
  );
}
