import React, { useRef, useState, useEffect } from 'react';

/**
 * 优化后的相机组件 - 用于身份证拍摄
 * 
 * 平衡优化策略：
 * 1. 保留原有的16:9 4K解析度（兼容性更好）
 * 2. 改进对焦策略：尝试5cm对焦，如果不支持则使用连续对焦
 * 3. 保留原有的图像平滑化设置（避免过度锐化）
 * 4. 温和的图像增强（避免过度处理）
 * 5. 保留曝光补偿+0.5（原设置）
 */
export default function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [error, setError] = useState(null);

  // 初始化相机
  useEffect(() => {
    async function startCamera() {
      try {
        // 保留原有的16:9 4K解析度设置（兼容性更好）
        const optimalConstraints = {
          video: {
            facingMode: { exact: 'environment' },
            // 使用16:9 4K解析度（原设置）
            width: { min: 1920, ideal: 4096 },
            height: { min: 1080, ideal: 2160 },
            frameRate: { ideal: 30 },
            // 初始连续对焦
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

          const track = stream.getVideoTracks()[0];
          const settings = track.getSettings();
          console.log('✅ 相机流已获取');
          console.log('📹 实际解析度:', settings.width, 'x', settings.height);
          console.log('📹 帧率:', settings.frameRate);
          console.log('📹 面向模式:', settings.facingMode);

          // 应用优化的对焦设置（改进版：尝试5cm，失败则用连续对焦）
          await applyOptimalSettings(track);
        }
      } catch (err) {
        console.error('❌ 无法获取相机:', err);
        setError('无法启动相机。请确保已授予权限。');
      }
    }

    async function applyOptimalSettings(track) {
      try {
        // 策略：先尝试5cm对焦（原设置），如果不支持则回退到连续对焦
        // 这样可以兼容更多设备
        await track.applyConstraints({
          advanced: [
            { focusMode: 'continuous' },
            { focusMode: 'macro' },
            { focusDistance: 0.05 }, // 尝试5cm对焦
            { exposureMode: 'auto' },
            { exposureCompensation: 0.5 }, // 保留原设置
            { whiteBalanceMode: 'auto' }
          ]
        });
        console.log('✅ 已应用5cm对焦优化');
      } catch (e) {
        console.warn('⚠️ 5cm对焦不支持，使用连续对焦:', e);
        // 回退：只使用连续对焦和macro（不强制距离）
        try {
          await track.applyConstraints({
            advanced: [
              { focusMode: 'continuous' },
              { focusMode: 'macro' },
              { exposureMode: 'auto' },
              { exposureCompensation: 0.5 },
              { whiteBalanceMode: 'auto' }
            ]
          });
          console.log('✅ 已应用连续对焦模式（macro）');
        } catch (fallbackErr) {
          // 最后回退：只使用连续对焦
          try {
            await track.applyConstraints({
              advanced: [
                { focusMode: 'continuous' },
                { exposureMode: 'auto' },
                { exposureCompensation: 0.5 },
                { whiteBalanceMode: 'auto' }
              ]
            });
            console.log('✅ 已应用连续对焦模式（基础）');
          } catch (finalErr) {
            console.warn('⚠️ 对焦设置失败，使用默认设置:', finalErr);
          }
        }
      }

      // 二次对焦锁定（原策略）
      setTimeout(async () => {
        try {
          const track = streamRef.current?.getVideoTracks()[0];
          if (!track) return;
          
          await track.applyConstraints({
            advanced: [
              { focusMode: 'single' },
              { focusMode: 'macro' },
              { focusDistance: 0.05 }
            ]
          });
          console.log('✅ 二次对焦锁定完成');
        } catch (e) {
          // 忽略失败
        }
      }, 200);
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 温和的图像增强（保留原设置，避免过度处理）
  function enhanceImage(ctx, canvas) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 使用原设置的温和调整
    const contrast = 1.05;  // 轻微对比度增加（5%）
    const brightness = 8;   // 适度亮度增加（原设置）
    
    for (let i = 0; i < data.length; i += 4) {
      // 应用温和的对比度和亮度调整
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128 + brightness));     // R
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128 + brightness)); // G
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128 + brightness)); // B
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  // 拍照主函数
  async function capturePhoto() {
    const stream = streamRef.current;
    if (!stream) return;

    // 拍照前对焦锁定（原策略）
    try {
      const track = stream.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [
          { focusMode: 'single' },
          { focusMode: 'macro' },
          { focusDistance: 0.05 }
        ]
      });
      // 等待对焦锁定
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (e) {
      console.warn('拍照前对焦锁定失败:', e);
    }

    const track = stream.getVideoTracks()[0];
    const imageCapture = new window.ImageCapture(track);

    try {
      // 使用ImageCapture API（原设置）
      const blob = await imageCapture.takePhoto({
        imageWidth: 4096,   // 保留16:9 4K
        imageHeight: 2160,
        fillLightMode: 'auto'  // 原设置
      });
      
      // 应用图像增强
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      await new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          // 保留原有的高质量渲染设置
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0);
          
          // 应用温和的图像增强
          enhanceImage(ctx, canvas);
          
          const enhancedDataUrl = canvas.toDataURL('image/jpeg', 0.98);
          setPhotoUrl(enhancedDataUrl);
          URL.revokeObjectURL(img.src);
          resolve();
        };
      });
      console.log('✅ 照片已拍摄并增强（ImageCapture API）');
    } catch (err) {
      console.warn('ImageCapture失败，使用Canvas回退:', err);

      // Canvas回退（保留原设置）
      const video = videoRef.current;
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      // 保留原有的高质量渲染设置
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0);

      // 应用温和的图像增强
      enhanceImage(ctx, canvas);

      // 高质量JPEG（原设置）
      const dataUrl = canvas.toDataURL('image/jpeg', 0.98);
      setPhotoUrl(dataUrl);
      console.log('✅ 照片已拍摄并增强（Canvas回退，解析度:', canvas.width, 'x', canvas.height, ')');
    }
  }

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden">
      {error && (
        <div className="absolute top-10 left-0 w-full text-center text-red-500 bg-white p-2 z-50">
          {error}
        </div>
      )}

      {/* Video Preview */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <div 
          className="relative flex items-center justify-center"
          style={{
            width: '400px',
            height: '300px',
            maxWidth: '60vw',
            maxHeight: '45vw',
            position: 'relative',
            margin: 'auto',
            boxSizing: 'border-box'
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: '400px',
              height: '300px',
              maxWidth: '60vw',
              maxHeight: '45vw',
              objectFit: 'cover',
              imageRendering: 'auto',
              WebkitImageRendering: 'auto',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden',
              display: 'block',
              boxSizing: 'border-box'
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

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 w-full pb-6 pt-4 z-20 flex flex-col items-center gap-3 bg-gradient-to-t from-black/80 to-transparent">
        {/* Shutter Button */}
        <button
          onClick={capturePhoto}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full border-4 border-white/50 shadow-2xl active:scale-95 transition-transform"
          aria-label="Take Photo"
        />
        <p className="text-white/70 text-xs px-4 text-center">优化设定：智能对焦 | 4K解析度 | 高质量增强</p>
      </div>

      {/* Photo Preview Modal */}
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
