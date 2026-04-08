import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, RefreshCcw } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { usePostMethod } from '../../hooks/usePostMethod';
import { useGlobalData } from '../../hooks/useGlobalData';
import Button from '../../components/btns/Button';
import Message from '../../components/Message';

export default function VerifyEmail() {

    useEffect(() => window.scrollTo(0, 0), []);

    const navigate = useNavigate();
    const { postData, status_p, message_p, loading_p, data_p } = usePostMethod();
    const [store, setGlobalData] = useGlobalData();

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [showMsg, setShowMsg] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const inputRefs = useRef([]);

    useEffect(() => {
        // Checking both storage types just in case
        const storedEmail = sessionStorage.getItem("NeuroAi_Email_For_Verification");
        if (!storedEmail) {
            navigate('/auth/login');
        } else {
            setEmail(storedEmail);
        }
    }, [navigate]);

    // Timer logic
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleCloseMsg = useCallback(() => setShowMsg(false), []);

    const handleChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        const data = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d+$/.test(data)) {
            const newOtp = [...otp];
            data.split('').forEach((char, i) => {
                if (i < 6) newOtp[i] = char;
            });
            setOtp(newOtp);
            const nextFocus = data.length < 6 ? data.length : 5;
            inputRefs.current[nextFocus].focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading_p) return;

        setShowMsg(false); // Clear any old messages
        const code = otp.join('');

        if (code.length < 6) {
            setShowMsg(true);
            return;
        }

        // post data
        const API_BASE_DEV = "http://localhost:5150";
        const API_BASE_PROD = "https://neuro-gaurd-ai-backend.vercel.app";
        await postData(`${API_BASE_PROD}/api/auth/verify-email`, {}, {
            email,
            code
        });
    };

    // Handle API Response
    useEffect(() => {
        if (status_p === "fail") setShowMsg(true);

        if (status_p === "success") {
            setShowMsg(true);
            localStorage.setItem("NeuroAi_Token", data_p?.token);
            setGlobalData("user", data_p?.user);
            navigate("/");
        }
    }, [status_p, navigate, data_p]);


    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 }
    };


    // Helper to get logic message
    const getMessageContent = () => {
        if (otp.join('').length < 6) return "Please enter the full 6-digit code.";
        if (status_p === "fail") return message_p;
        if (status_p === "success") return message_p || "Email verified successfully!";
        return "";
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="card-redesign w-full max-w-xl !p-8 md:!px-10"
        >
            {/* Header */}
            <div className="text-center mb-10">
                <motion.div
                    variants={itemVariants}
                    className="w-16 h-16 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
                >
                    <Mail className="w-8 h-8 text-[var(--accent-primary)]" />
                </motion.div>

                <motion.h1 variants={itemVariants} className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                    Verify Email
                </motion.h1>
                <motion.p variants={itemVariants} className="text-[var(--text-secondary)]">
                    We've sent a 6-digit code to <span className="text-[var(--text-primary)] font-medium">{email}</span>.
                </motion.p>
                <motion.p variants={itemVariants} className="text-[var(--text-muted)] text-sm mt-2">
                    (You might find the code in your spam folder)
                </motion.p>
            </div>

            {/* OTP Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
                <motion.div variants={itemVariants} className="flex justify-between gap-2">
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={el => inputRefs.current[index] = el}
                            type="text"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={handlePaste}
                            className="w-10 h-10 md:w-16 md:h-16 text-center text-lg font-bold bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all outline-none"
                        />
                    ))}
                </motion.div>


                {/* Submit Button */}
                <motion.div variants={itemVariants}>
                    <Button
                        type="submit"
                        variant="primary"
                        size="vmd"
                        width="full"
                        isLoading={loading_p}
                        className="mt-4"
                    >
                        Verify Account
                    </Button>
                </motion.div>

                {/* Resend Code */}
                <motion.div variants={itemVariants} className="text-center">
                    <button
                        type="button"
                        disabled={countdown > 0 || loading_p}
                        onClick={() => setCountdown(60)}
                        className={`inline-flex items-center cursor-pointer gap-2 text-sm transition-colors ${countdown > 0 || loading_p ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)] hover:text-[var(--accent-primary)]'}`}
                    >
                        <RefreshCcw className="w-4 h-4" />
                        {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend verification code'}
                    </button>
                </motion.div>
            </form>

            {/* Back to Registration */}
            <motion.div variants={itemVariants} className="mt-5 border-t border-[var(--border-subtle)] pt-5 flex justify-center">
                <Link to="/auth/sign-up" className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to registration
                </Link>
            </motion.div>

            {/* Status Message */}
            <Message
                isVisible={showMsg}
                message={getMessageContent()}
                type={status_p === "success" ? "success" : "error"}
                title={status_p === "success" ? "Success" : (otp.join('').length < 6 ? "Validation Error" : "Request Failed")}
                duration={5000}
                onClose={handleCloseMsg}
            />
        </motion.div>
    );
}