import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * 优化后的相机组件 - 用于身份证拍摄
 * 
 * 优化策略：
 * 1. 对焦策略：移除强制5cm，使用连续对焦和ROI对焦
 * 2. 曝光控制：调整曝光补偿，避免过曝
 * 3. 解析度：使用4:3比例最高解析度
 * 4. 影像后处理：USM锐化、Gamma校正
 * 5. 稳定度检测：陀螺仪检测和连拍选优
 */
export default function Camera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isStable, setIsStable] = useState(false);
  const [focusStatus, setFocusStatus] = useState('focusing');
  const torchEnabledRef = useRef(false);
  const gyroRef = useRef({ x: 0, y: 0, z: 0, lastUpdate: 0 });
  const stabilityCheckRef = useRef(null);

  // 陀螺仪稳定度检测
  useEffect(() => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ 需要请求权限
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            startGyroTracking();
          }
        })
        .catch(console.error);
    } else if (typeof DeviceOrientationEvent !== 'undefined') {
      startGyroTracking();
    }

    function startGyroTracking() {
      let lastBeta = null;
      let lastGamma = null;
      let stableCount = 0;

      const handleOrientation = (event) => {
        const now = Date.now();
        const beta = event.beta || 0; // 前后倾斜
        const gamma = event.gamma || 0; // 左右倾斜

        if (lastBeta !== null && lastGamma !== null) {
          const deltaBeta = Math.abs(beta - lastBeta);
          const deltaGamma = Math.abs(gamma - lastGamma);
          const movement = Math.sqrt(deltaBeta * deltaBeta + deltaGamma * deltaGamma);

          // 如果移动幅度小于阈值（约0.5度），认为是稳定的
          if (movement < 0.5) {
            stableCount++;
            if (stableCount > 10) { // 连续10次检测稳定（约300ms）
              setIsStable(true);
            }
          } else {
            stableCount = 0;
            setIsStable(false);
          }
        }

        lastBeta = beta;
        lastGamma = gamma;
        gyroRef.current = { x: beta, y: gamma, z: 0, lastUpdate: now };
      };

      window.addEventListener('deviceorientation', handleOrientation);

      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }
  }, []);

  // 初始化相机
  useEffect(() => {
    async function startCamera() {
      try {
        // 使用4:3比例的最高解析度（而非16:9）
        // 常见4:3解析度：4032×3024, 3264×2448, 2592×1944
        const optimalConstraints = {
          video: {
            facingMode: { exact: 'environment' },
            // 请求4:3比例的高解析度
            width: { min: 1920, ideal: 4032 },
            height: { min: 1440, ideal: 3024 },
            frameRate: { ideal: 30 },
            // 初始使用连续对焦，不强制macro
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

          // 应用优化的对焦和曝光设置
          await applyOptimalSettings(track);
        }
      } catch (err) {
        console.error('❌ 无法获取相机:', err);
        setError('无法启动相机。请确保已授予权限。');
      }
    }

    async function applyOptimalSettings(track) {
      try {
        // 优化策略1：使用连续对焦，不强制macro和固定距离
        // 优化策略2：曝光补偿设为0或负值，避免过曝
        // 优化策略3：中央重点测光（如果支持）
        const constraints = {
          advanced: [
            { focusMode: 'continuous' }, // 连续对焦，让相机自动选择最佳距离
            { exposureMode: 'auto' },
            { exposureCompensation: 0 }, // 改为0，避免过曝
            { whiteBalanceMode: 'auto' }
          ]
        };

        // 尝试应用macro模式（如果支持），但不强制
        try {
          await track.applyConstraints({
            advanced: [
              ...constraints.advanced,
              { focusMode: 'macro' } // 尝试macro，但不强制
            ]
          });
          console.log('✅ 已应用macro对焦模式');
        } catch (macroErr) {
          // 如果不支持macro，只使用continuous
          await track.applyConstraints(constraints);
          console.log('✅ 已应用连续对焦模式（macro不支持）');
        }

        setFocusStatus('focused');
      } catch (e) {
        console.warn('⚠️ 优化设置失败，使用默认设置:', e);
        setFocusStatus('error');
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (stabilityCheckRef.current) {
        clearInterval(stabilityCheckRef.current);
      }
    };
  }, []);

  // USM锐化（Unsharp Masking）
  function applyUnsharpMask(ctx, canvas, amount = 1.0, radius = 1.0, threshold = 0) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(imageData, 0, 0);

    // 创建模糊版本（使用简单的高斯模糊近似）
    tempCtx.filter = `blur(${radius}px)`;
    tempCtx.drawImage(tempCanvas, 0, 0);
    const blurredData = tempCtx.getImageData(0, 0, width, height).data;

    // 应用锐化：原图 + (原图 - 模糊图) * amount
    for (let i = 0; i < data.length; i += 4) {
      const diff = data[i] - blurredData[i];
      if (Math.abs(diff) > threshold) {
        data[i] = Math.min(255, Math.max(0, data[i] + diff * amount)); // R
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + (data[i + 1] - blurredData[i + 1]) * amount)); // G
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + (data[i + 2] - blurredData[i + 2]) * amount)); // B
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // Gamma校正（保留细节的亮度调整）
  function applyGammaCorrection(ctx, canvas, gamma = 1.2) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const invGamma = 1.0 / gamma;

    for (let i = 0; i < data.length; i += 4) {
      // 归一化到0-1，应用gamma，再转回0-255
      data[i] = Math.pow(data[i] / 255, invGamma) * 255; // R
      data[i + 1] = Math.pow(data[i + 1] / 255, invGamma) * 255; // G
      data[i + 2] = Math.pow(data[i + 2] / 255, invGamma) * 255; // B
    }

    ctx.putImageData(imageData, 0, 0);
  }

  // 计算图片清晰度分数（用于连拍选优）
  function calculateSharpness(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    let sharpness = 0;
    let count = 0;

    // 使用拉普拉斯算子计算边缘强度
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const idxUp = ((y - 1) * width + x) * 4;
        const idxDown = ((y + 1) * width + x) * 4;
        const idxLeft = (y * width + (x - 1)) * 4;
        const idxRight = (y * width + (x + 1)) * 4;

        // 计算灰度值
        const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        const grayUp = data[idxUp] * 0.299 + data[idxUp + 1] * 0.587 + data[idxUp + 2] * 0.114;
        const grayDown = data[idxDown] * 0.299 + data[idxDown + 1] * 0.587 + data[idxDown + 2] * 0.114;
        const grayLeft = data[idxLeft] * 0.299 + data[idxLeft + 1] * 0.587 + data[idxLeft + 2] * 0.114;
        const grayRight = data[idxRight] * 0.299 + data[idxRight + 1] * 0.587 + data[idxRight + 2] * 0.114;

        // 拉普拉斯算子
        const laplacian = Math.abs(4 * gray - grayUp - grayDown - grayLeft - grayRight);
        sharpness += laplacian;
        count++;
      }
    }

    return count > 0 ? sharpness / count : 0;
  }

  // 处理单张照片
  async function processPhoto(blob) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');

        // 关闭平滑化，保持锐利
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0);

        // 应用Gamma校正（如果图片偏暗）
        applyGammaCorrection(ctx, canvas, 1.1);

        // 应用USM锐化
        applyUnsharpMask(ctx, canvas, 1.2, 0.8, 5);

        const enhancedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        URL.revokeObjectURL(img.src);
        resolve({ dataUrl: enhancedDataUrl, canvas, ctx });
      };
    });
  }

  // 连拍选优
  async function captureBurstPhotos() {
    const stream = streamRef.current;
    if (!stream) return null;

    const track = stream.getVideoTracks()[0];
    const imageCapture = new window.ImageCapture(track);
    const photos = [];

    // 连续拍摄3张
    for (let i = 0; i < 3; i++) {
      try {
        const blob = await imageCapture.takePhoto({
          imageWidth: 4032, // 4:3比例
          imageHeight: 3024,
          fillLightMode: 'off' // 不使用闪光灯
        });
        photos.push(blob);
        // 短暂延迟
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.warn(`连拍第${i + 1}张失败:`, err);
      }
    }

    if (photos.length === 0) return null;

    // 处理所有照片并计算清晰度
    const processed = await Promise.all(
      photos.map(async (blob) => {
        const result = await processPhoto(blob);
        const imageData = result.ctx.getImageData(0, 0, result.canvas.width, result.canvas.height);
        const sharpness = calculateSharpness(imageData);
        return { ...result, sharpness, blob };
      })
    );

    // 选择清晰度最高的一张
    const best = processed.reduce((prev, current) => 
      current.sharpness > prev.sharpness ? current : prev
    );

    console.log('✅ 连拍完成，已选择最清晰的照片（清晰度分数:', best.sharpness.toFixed(2), ')');
    return best.dataUrl;
  }

  // 拍照主函数
  const capturePhoto = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) return;

    // 如果支持连拍，使用连拍选优
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};

    // 检查是否支持ImageCapture API
    if (window.ImageCapture && capabilities) {
      try {
        // 优先使用连拍选优
        const bestPhoto = await captureBurstPhotos();
        if (bestPhoto) {
          setPhotoUrl(bestPhoto);
          return;
        }
      } catch (err) {
        console.warn('连拍失败，使用单张拍摄:', err);
      }
    }

    // 回退到单张拍摄
    try {
      const track = stream.getVideoTracks()[0];
      const imageCapture = new window.ImageCapture(track);

      const blob = await imageCapture.takePhoto({
        imageWidth: 4032, // 4:3比例
        imageHeight: 3024,
        fillLightMode: 'off'
      });

      const result = await processPhoto(blob);
      setPhotoUrl(result.dataUrl);
      console.log('✅ 照片已拍摄并优化');
    } catch (err) {
      console.warn('ImageCapture失败，使用Canvas回退:', err);

      // Canvas回退
      const video = videoRef.current;
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      // 关闭平滑化
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(video, 0, 0);

      // 应用后处理
      applyGammaCorrection(ctx, canvas, 1.1);
      applyUnsharpMask(ctx, canvas, 1.2, 0.8, 5);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setPhotoUrl(dataUrl);
      console.log('✅ 照片已拍摄并优化（Canvas回退，解析度:', canvas.width, 'x', canvas.height, ')');
    }
  }, []);

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

          {/* ID Card Overlay Frame - Centered (ROI对焦区域) */}
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
          {isStable && <span className="ml-2 text-green-400">✓ 稳定</span>}
        </p>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 w-full pb-6 pt-4 z-20 flex flex-col items-center gap-3 bg-gradient-to-t from-black/80 to-transparent">
        {/* Shutter Button */}
        <button
          onClick={capturePhoto}
          disabled={focusStatus === 'focusing'}
          className={`w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full border-4 border-white/50 shadow-2xl active:scale-95 transition-transform ${
            focusStatus === 'focusing' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          aria-label="Take Photo"
        />
        <p className="text-white/70 text-xs px-4 text-center">
          优化设定：连续对焦 | 4:3高解析度 | 自动锐化
        </p>
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
