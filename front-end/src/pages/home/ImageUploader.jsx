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
                className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-5 text-center min-h-[300px]
                    ${isDragging 
                        ? 'border-zinc-500 bg-zinc-900 shadow-lg scale-[1.01]' 
                        : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-zinc-600'
                    }`}
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
                
                <div className={`w-20 h-20 rounded-xl flex items-center justify-center mb-2 transition-all duration-300 border
                    ${isDragging ? 'bg-zinc-800 text-zinc-100 border-zinc-700 scale-110' : 'bg-zinc-950/50 text-zinc-400 border-zinc-800 group-hover:bg-zinc-900 group-hover:text-zinc-200'}`}>
                    <UploadCloud size={40} className={isDragging ? 'animate-bounce' : ''} />
                </div>
                
                <div className="relative z-10">
                    <h3 className="text-xl font-semibold text-zinc-100 mb-2">
                        Click or drag image here
                    </h3>
                    <p className="text-zinc-500 max-w-sm mx-auto text-sm">
                        Supports PNG, JPG/JPEG, and WEBP
                    </p>
                </div>

                {fileError && (
                    <p className="text-xs text-rose-400 max-w-sm mx-auto">{fileError}</p>
                )}
                
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500 bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-900">
                    <ImageIcon size={14} />
                    <span className="font-medium">Maximum file size 10MB</span>
                </div>
            </div>
        </motion.div>
    );
};

export default ImageUploader;
