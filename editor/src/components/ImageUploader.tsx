import React, { useState, useRef } from 'react';

interface ImageUploaderProps {
  onImageLoad: (base64: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageLoad }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateImage = (file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      return { valid: false, error: 'Разрешены только PNG и JPEG файлы' };
    }

    // Check file size (10 MB = 10 * 1024 * 1024 bytes)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'Размер файла не должен превышать 10 МБ' };
    }

    return { valid: true };
  };

  const handleFile = (file: File) => {
    setError('');
    
    const validation = validateImage(file);
    if (!validation.valid) {
      setError(validation.error || 'Ошибка валидации');
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);
      onImageLoad(base64);
      setIsLoading(false);
    };
    reader.onerror = () => {
      setError('Ошибка чтения файла');
      setIsLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (preview) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <img 
            src={preview} 
            alt="Preview" 
            className="max-w-full max-h-96 mx-auto rounded-lg shadow-md"
          />
        </div>
        <button
          onClick={handleReset}
          className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
        >
          Загрузить другое изображение
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          ${error ? 'border-red-500' : ''}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        {isLoading ? (
          <div className="space-y-3">
            <div className="text-4xl">⏳</div>
            <p className="text-gray-600">Загрузка...</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-6xl">📸</div>
            <div>
              <p className="text-lg font-semibold text-gray-700 mb-1">
                Перетащите изображение сюда
              </p>
              <p className="text-gray-500 mb-2">или</p>
              <span className="inline-block px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
                Выбрать файл
              </span>
            </div>
            <p className="text-sm text-gray-400">
              PNG или JPEG, не более 10 МБ
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFileInput}
        className="hidden"
      />

      {error && (
        <p className="text-red-500 text-sm text-center">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
};
