import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

const ImageUploader = ({ onImageSelect }) => {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileError, setFileError] = useState('');

    const isSupportedFile = (file) => {
        if (!file) return false;

        const mime = (file.type || '').toLowerCase();
        if (ALLOWED_MIME_TYPES.includes(mime)) return true;

        const ext = file.name?.slice(file.name.lastIndexOf('.')).toLowerCase();
        return ALLOWED_EXTENSIONS.includes(ext);
    };

    const pickFile = (file) => {
        if (!file) return;

        if (!isSupportedFile(file)) {
            setFileError('Unsupported format. Please upload PNG, JPG/JPEG, or WEBP.');
            return;
        }

        setFileError('');
        onImageSelect(file);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        pickFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        pickFile(file);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="w-full max-w-2xl mx-auto"
        >
            <div
                className={`drop-zone-redesign p-8 sm:p-12 min-h-[300px] ${isDragging ? 'active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />

                <div className="upload-icon-redesign">
                    <UploadCloud size={48} className={isDragging ? 'animate-bounce' : ''} />
                </div>

                <div className="relative z-10 text-center">
                    <h3 className="drop-zone-title">
                        Click or drag image here
                    </h3>
                    <p className="drop-zone-subtext max-w-sm mx-auto">
                        Supports PNG, JPG/JPEG, and WEBP
                    </p>
                </div>

                {fileError && (
                    <p className="text-xs text-[var(--status-danger)] mt-4 max-w-sm mx-auto">{fileError}</p>
                )}

                <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-[var(--text-muted)] border border-[var(--border-subtle)] px-4 py-2 rounded-lg bg-[var(--bg-primary)] uppercase tracking-widest font-medium">
                    <ImageIcon size={14} className="text-[var(--accent-primary)]" />
                    <span>Maximum file size 10MB</span>
                </div>
            </div>
        </motion.div>
    );
};

export default ImageUploader;
