'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Upload,
  RefreshCw,
  Copy,
  Check,
  FileText,
  Sliders,
  Languages,
  RotateCw,
  Sparkles,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import type { Worker } from 'tesseract.js';

interface ImageToTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertBody: (text: string, mode: 'append' | 'replace') => void;
  onInsertSubject?: (text: string) => void;
}

type OcrLanguage = 'amh+eng' | 'amh' | 'eng';

export const ImageToTextModal: React.FC<ImageToTextModalProps> = ({
  isOpen,
  onClose,
  onInsertBody,
  onInsertSubject,
}) => {
  // Mode: Upload file vs Live Camera
  const [inputMode, setInputMode] = useState<'upload' | 'camera'>('upload');

  // Selected language
  const [language, setLanguage] = useState<OcrLanguage>('amh+eng');

  // Image source state
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  // Extracted text & stats
  const [extractedText, setExtractedText] = useState<string>('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Pre-processing options
  const [enhanceContrast, setEnhanceContrast] = useState(true);
  const [rotation, setRotation] = useState<number>(0);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // File input refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Clean up camera stream
  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  // Terminate worker on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (workerRef.current) {
        workerRef.current.terminate().catch(() => {});
        workerRef.current = null;
      }
    };
  }, [stopCamera]);

  // Start camera stream when entering camera mode
  useEffect(() => {
    if (isOpen && inputMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, inputMode]);

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported in this browser environment.');
        setHasCameraPermission(false);
        return;
      }

      // Try environment (rear) camera first for scanning documents, fallback to user camera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasCameraPermission(true);
    } catch (err: any) {
      console.warn('Unable to access camera:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings or upload an image.'
          : 'Could not access camera device. Please use image upload.'
      );
      setHasCameraPermission(false);
    }
  };

  // Capture frame from live camera
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setImageSrc(dataUrl);
    stopCamera();
    // Auto-run OCR on captured frame
    runOcr(dataUrl);
  };

  // Handle uploaded file
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImageSrc(dataUrl);
      setRotation(0);
      runOcr(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Contrast enhancement and binarization for Ge'ez / English readability
  const preprocessImage = async (src: string, degrees: number, enhance: boolean): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        const isRotated90or270 = degrees % 180 !== 0;
        canvas.width = isRotated90or270 ? img.height : img.width;
        canvas.height = isRotated90or270 ? img.width : img.height;

        // Apply rotation
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        if (enhance) {
          // Grayscale & contrast enhancement
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imageData.data;

          // Compute min & max luminance for contrast stretching
          let minLum = 255;
          let maxLum = 0;
          for (let i = 0; i < d.length; i += 4) {
            const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            if (lum < minLum) minLum = lum;
            if (lum > maxLum) maxLum = lum;
          }

          const range = maxLum - minLum || 1;
          for (let i = 0; i < d.length; i += 4) {
            const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // Linear contrast stretch
            let stretched = ((lum - minLum) / range) * 255;
            // Mild high-pass boost for crisp Amharic diacritics
            stretched = stretched < 128 ? stretched * 0.85 : Math.min(255, stretched * 1.15);

            d[i] = stretched;
            d[i + 1] = stretched;
            d[i + 2] = stretched;
          }
          ctx.putImageData(imageData, 0, 0);
        }

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  };

  // Perform Tesseract OCR recognition
  const runOcr = async (sourceUrl?: string) => {
    const rawImage = sourceUrl || imageSrc;
    if (!rawImage) return;

    setIsProcessing(true);
    setProgressPercent(5);
    setProgressStatus('Initializing OCR engine...');

    try {
      // Dynamic import to prevent SSR bundling issues
      const { createWorker } = await import('tesseract.js');

      setProgressStatus('Applying document contrast enhancement...');
      setProgressPercent(15);
      const processedImage = await preprocessImage(rawImage, rotation, enhanceContrast);

      setProgressStatus(`Loading trained models for ${language === 'amh+eng' ? 'Amharic + English' : language}...`);
      setProgressPercent(25);

      // Initialize worker with designated language
      const worker = await createWorker(language, 1, {
        logger: (m) => {
          if (m.status === 'loading tesseract core') {
            setProgressStatus('Loading Tesseract Core engine...');
          } else if (m.status.includes('loading language')) {
            setProgressStatus(`Downloading / loading language pack (${Math.round((m.progress || 0) * 100)}%)...`);
          } else if (m.status.includes('recogniz')) {
            const p = Math.round(30 + (m.progress || 0) * 65);
            setProgressPercent(p);
            setProgressStatus(`Recognizing Amharic & English characters (${Math.round((m.progress || 0) * 100)}%)...`);
          }
        },
      });

      workerRef.current = worker;

      setProgressStatus('Extracting text and structure...');
      setProgressPercent(85);

      const ret = await worker.recognize(processedImage);
      const recognized = ret.data.text.trim();
      const conf = Math.round(ret.data.confidence);

      setExtractedText(recognized);
      setConfidence(conf);
      setProgressPercent(100);
      setProgressStatus('Text extraction complete!');

      // Terminate worker to free memory
      await worker.terminate();
      workerRef.current = null;
    } catch (err: any) {
      console.error('Tesseract OCR error:', err);
      setProgressStatus(`Extraction error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertBody = (mode: 'append' | 'replace') => {
    if (!extractedText) return;
    onInsertBody(extractedText, mode);
    onClose();
  };

  const handleInsertSubject = () => {
    if (!extractedText || !onInsertSubject) return;
    // Extract first meaningful line (up to 120 chars) as subject
    const lines = extractedText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const candidate = lines.length > 0 ? lines[0] : extractedText;
    const cleanSubject = candidate.replace(/^[\s•\-\d.:]+/, '').slice(0, 150);
    onInsertSubject(cleanSubject);
  };

  const handleRotate = () => {
    const nextRotation = (rotation + 90) % 360;
    setRotation(nextRotation);
    if (imageSrc) {
      preprocessImage(imageSrc, nextRotation, enhanceContrast).then((updated) => {
        runOcr(updated);
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 border border-emerald-300 flex items-center justify-center text-emerald-700">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Document Text Extraction (OCR)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Client-side WASM
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Scan physical paper letters or upload images to extract Amharic & English text directly
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
              <Languages className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={language}
                onChange={(e) => {
                  const newLang = e.target.value as OcrLanguage;
                  setLanguage(newLang);
                  if (imageSrc) runOcr();
                }}
                className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="amh+eng">አማርኛ + English (Mixed)</option>
                <option value="amh">አማርኛ (Amharic only)</option>
                <option value="eng">English (Latin only)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Input Mode Selector Bar */}
        <div className="px-6 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Input Source:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                  inputMode === 'upload'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Image / Photo</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('camera')}
                className={`px-3 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                  inputMode === 'camera'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Camera Snap</span>
              </button>
            </div>
          </div>

          {/* Quick Preprocessing Toggles */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={enhanceContrast}
                onChange={(e) => {
                  setEnhanceContrast(e.target.checked);
                  if (imageSrc) runOcr();
                }}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Enhance Contrast for Fidel</span>
            </label>

            {imageSrc && (
              <button
                type="button"
                onClick={handleRotate}
                title="Rotate 90 degrees"
                className="px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center gap-1"
              >
                <RotateCw className="w-3 h-3" />
                <span>Rotate</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-y-auto divide-y md:divide-y-0 md:divide-x divide-slate-200">
          {/* ========================================================= */}
          {/* LEFT COLUMN: IMAGE SOURCE & CAMERA VIEWFINDER             */}
          {/* ========================================================= */}
          <div className="p-5 flex flex-col justify-between bg-slate-50/50 space-y-4">
            <div className="space-y-3 flex-1 flex flex-col">
              {inputMode === 'upload' ? (
                // Upload & Drag-and-drop Area
                <div className="flex-1 flex flex-col">
                  {imageSrc ? (
                    <div className="relative rounded-xl border border-slate-300 bg-white p-2 overflow-hidden flex-1 flex items-center justify-center min-h-[260px]">
                      <img
                        src={imageSrc}
                        alt="Scanned Letter Preview"
                        className="max-h-[340px] w-auto object-contain rounded-lg shadow-2xs"
                      />
                      <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5 backdrop-blur-xs"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Change Image</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-2xl p-8 text-center cursor-pointer transition flex-1 flex flex-col items-center justify-center min-h-[260px] bg-white"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-xs">
                        <Upload className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Upload Scanned Letter or Take Photo
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        Select a scanned paper document, mobile photo, or official dispatch (.jpg, .png, .webp)
                      </p>
                      <span className="mt-3 inline-block px-3 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                        Supports Amharic & English
                      </span>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </div>
              ) : (
                // Live Camera Viewfinder
                <div className="flex-1 flex flex-col">
                  {cameraError ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Camera Unavailable</p>
                        <p className="mt-0.5 text-amber-700">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => setInputMode('upload')}
                          className="mt-2 px-3 py-1 bg-amber-600 text-white rounded font-bold hover:bg-amber-700 transition"
                        >
                          Switch to File Upload
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex-1 flex items-center justify-center min-h-[300px]">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Alignment Target Frame Overlay */}
                      <div className="absolute inset-6 border-2 border-dashed border-white/70 rounded-xl pointer-events-none flex items-center justify-center">
                        <span className="px-3 py-1 rounded-full bg-slate-900/70 text-white text-[11px] font-bold tracking-wide backdrop-blur-xs">
                          Align letter inside frame
                        </span>
                      </div>

                      {/* Shutter Button */}
                      <div className="absolute bottom-4 inset-x-0 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={captureSnapshot}
                          className="w-14 h-14 rounded-full bg-white hover:bg-emerald-100 border-4 border-emerald-500 shadow-xl flex items-center justify-center transition active:scale-95"
                          title="Capture Snapshot"
                        >
                          <Camera className="w-6 h-6 text-emerald-700" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress & Processing Indicator */}
              {isProcessing && (
                <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                      <span>{progressStatus || 'Processing document...'}</span>
                    </span>
                    <span className="font-mono">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-emerald-200/60 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Helper Note */}
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Runs 100% in your browser. No documents are uploaded to external cloud OCR servers.</span>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: EXTRACTED TEXT & INSERT ACTIONS             */}
          {/* ========================================================= */}
          <div className="p-5 flex flex-col justify-between space-y-4 bg-white">
            <div className="space-y-2.5 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-800">
                    Extracted Letter Text
                  </span>
                  {confidence !== null && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        confidence >= 80
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : confidence >= 60
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {confidence}% Confidence
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    disabled={!extractedText}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 transition flex items-center gap-1 disabled:opacity-40"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {extractedText && (
                    <button
                      type="button"
                      onClick={() => setExtractedText('')}
                      className="px-2 py-1 text-xs font-semibold rounded-md text-slate-400 hover:text-red-600 transition"
                      title="Clear text"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Editable Text Preview Area */}
              <div className="flex-1 flex flex-col min-h-[260px]">
                <textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  placeholder={
                    isProcessing
                      ? 'Extracting text from document...'
                      : 'Extracted text will appear here. You can edit, format, or clean up any words before inserting it into your letter form...'
                  }
                  rows={12}
                  className="w-full flex-1 p-3.5 bg-slate-50/70 border border-slate-300 rounded-xl text-xs font-sans leading-relaxed text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none resize-none"
                />
              </div>

              {/* Stats Footer */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>
                  {extractedText ? `${extractedText.length} characters • ${extractedText.split(/\s+/).filter(Boolean).length} words` : 'Awaiting document capture'}
                </span>
                {imageSrc && !isProcessing && (
                  <button
                    type="button"
                    onClick={() => runOcr()}
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Re-run OCR</span>
                  </button>
                )}
              </div>
            </div>

            {/* Insertion Action Buttons */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!extractedText || isProcessing}
                  onClick={() => handleInsertBody('append')}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  <span>Insert into Letter Body</span>
                </button>

                <button
                  type="button"
                  disabled={!extractedText || isProcessing}
                  onClick={() => handleInsertBody('replace')}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Replace Entire Body</span>
                </button>
              </div>

              {onInsertSubject && (
                <button
                  type="button"
                  disabled={!extractedText || isProcessing}
                  onClick={handleInsertSubject}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                  title="Detect and use first line of scanned text as letter subject"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Extract Top Line as Subject</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0 text-xs">
          <span className="text-slate-500">
            Powered by Tesseract.js (Multilingual: Ge&apos;ez Amharic + Latin English)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
export default ImageToTextModal;
