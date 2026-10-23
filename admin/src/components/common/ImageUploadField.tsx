import React, { useState, useRef } from 'react';
import { Upload, Link2, X, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { resolveImageUrl } from '../../utils/imageUrlResolver';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspectRatio?: '16/9' | '16/7' | '1/1' | 'auto';
  placeholder?: string;
  storageFolder?: string;
  helpText?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  aspectRatio = '16/9',
  placeholder = 'Paste image link (Google Photos, Google Drive, direct URL) or upload',
  storageFolder = 'uploads',
  helpText,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When user pastes/types a URL, automatically normalize it
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const resolved = resolveImageUrl(raw);
    onChange(resolved);
    setError(null);
  };

  // Compress image on client side using canvas
  const compressImage = (file: File, maxWidth = 1280, quality = 0.85): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else resolve(file);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image file.'));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  };

  // Convert blob to base64 fallback
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Handle direct file upload from phone or computer
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      // 1. Client-side compression
      const compressedBlob = await compressImage(file);
      setUploadProgress(40);

      // 2. Try Firebase Storage upload
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `${storageFolder}/${Date.now()}_${safeName}`;
        const storageReference = ref(storage, storagePath);

        const uploadTask = uploadBytesResumable(storageReference, compressedBlob, {
          contentType: 'image/jpeg',
        });

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.max(40, Math.round(progress)));
          },
          async (storageErr) => {
            console.warn('Storage upload error, using direct base64 fallback:', storageErr);
            // Fallback to base64 data URI if storage rules block
            const base64 = await blobToBase64(compressedBlob);
            onChange(base64);
            setUploading(false);
          },
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            onChange(downloadUrl);
            setUploading(false);
          }
        );
      } catch (storageInitErr) {
        // Fallback to direct base64 if storage is not configured
        console.warn('Firebase Storage not configured, using direct base64 fallback:', storageInitErr);
        const base64 = await blobToBase64(compressedBlob);
        onChange(base64);
        setUploading(false);
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err.message || 'Failed to process image');
      setUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    onChange('');
    setError(null);
  };

  const resolvedValue = resolveImageUrl(value);

  const getAspectClass = () => {
    switch (aspectRatio) {
      case '16/7':
        return 'aspect-[16/7]';
      case '1/1':
        return 'aspect-square';
      case '16/9':
      default:
        return 'aspect-video';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
          {label}
        </label>
        {resolvedValue && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Remove
          </button>
        )}
      </div>

      {/* Main input & buttons row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={value}
            onChange={handleUrlChange}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="px-3.5 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-600 dark:text-brand-400 font-semibold text-xs flex items-center gap-1.5 border border-brand-200 dark:border-brand-800 transition-colors whitespace-nowrap disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{uploadProgress}%</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Upload Photo</span>
            </>
          )}
        </button>
      </div>

      {helpText && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {helpText}
        </p>
      )}

      {error && (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </p>
      )}

      {/* Live Preview Card */}
      {resolvedValue ? (
        <div className={`relative w-full ${getAspectClass()} rounded-xl overflow-hidden border border-light-border dark:border-dark-border bg-slate-100 dark:bg-slate-900 shadow-sm group`}>
          <img
            src={resolvedValue}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={() => setError('Image preview failed. Please check the URL or try uploading directly.')}
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-white font-medium flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-400" />
            <span>Ready</span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`w-full ${getAspectClass()} rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 dark:hover:border-brand-600 transition-colors`}
        >
          <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-1" />
          <span className="text-xs text-slate-500 font-medium">
            Click to upload from gallery or paste a link above
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">
            Supports Google Drive, Google Photos, PNG, JPG, WebP
          </span>
        </div>
      )}
    </div>
  );
};
