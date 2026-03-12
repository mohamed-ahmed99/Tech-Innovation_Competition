import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../../components/inputs/Input';
import Button from '../../components/btns/Button';
import Message from '../../components/Message';
import { usePostMethod } from '../../hooks/usePostMethod';
import { useGlobalData } from '../../hooks/useGlobalData';
import { validateLogin } from './authValidation';

function LogIn() {
    const navigate = useNavigate();
    const [showMsg, setShowMsg] = useState(false);
    const handleCloseMsg = useCallback(() => setShowMsg(false), []);

    // post data hook
    const { postData, status_p, message_p, data_p, loading_p } = usePostMethod();
    const [store, setGlobalData] = useGlobalData();

    // form data state
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState({});
    const errorTimeoutRef = useRef(null);

    // handle input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear specific error immediately when typing
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    // handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear any existing timer
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);

        const { isValid, errors: validationErrors } = validateLogin(formData);

        if (!isValid) {
            setErrors(validationErrors);

            // Set timer to clear errors after 10 seconds
            errorTimeoutRef.current = setTimeout(() => {
                setErrors({});
            }, 10000);

            return;
        }

        // post data using the hook
        // http://localhost:5150/api/auth/signin
        // https://neuro-gaurd-ai-backend.vercel.app/api/auth/signin
        const result = await postData("https://neuro-gaurd-ai-backend.vercel.app/api/auth/signin", {}, formData);

        // Handle redirection for unverified users based on backend "order"
        if (result && result.order === "verifyEmail") {
            sessionStorage.setItem("NeuroAi_Email_For_Verification", formData.email);
            setTimeout(() => navigate("/auth/verify-email"), 1500);
        }
    };

    useEffect(() => {
        // Trigger message when request finishes
        if (status_p === "fail" || status_p === "success") {
            setShowMsg(true);
        }

        // Handle success: store token and user info, then navigate
        if (status_p === "success" && data_p) {
            localStorage.setItem("NeuroAi_Token", data_p.token)
            setGlobalData("user", data_p.user);

            // Redirect to home after showing the message
            const timer = setTimeout(() => {
                navigate("/");
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [status_p, data_p, navigate]);

    // Animations matching SignUp
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, x: -10 },
        visible: { opacity: 1, x: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-lg bg-[#111] border border-zinc-800 p-8 md:p-12 rounded-3xl shadow-2xl backdrop-blur-sm"
        >
            {/* title */}
            <div className="mb-10 text-center">
                <motion.h1 variants={itemVariants} className="text-3xl font-bold text-zinc-100 mb-2">Welcome back</motion.h1>
                <motion.p variants={itemVariants} className="text-zinc-400">Please enter your details to sign in.</motion.p>
            </div>

            {/* form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div variants={itemVariants}>
                    <Input
                        label="Email"
                        name="email"
                        type="string"
                        placeholder="name@example.com"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        error={errors.email}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        error={errors.password}
                    />
                </motion.div>

                {/* Log In button */}
                <motion.div variants={itemVariants}>
                    <Button
                        type="submit"
                        variant="primary"
                        size="vmd"
                        width="full"
                        className="mt-2"
                        isLoading={loading_p}
                    >
                        Sign In
                    </Button>
                </motion.div>

                {/* sign up link */}
                <motion.p variants={itemVariants} className="text-center text-sm text-zinc-500 mt-6">
                    Don't have an account?
                    <Link to="/auth/sign-up" className="text-zinc-100 font-medium hover:underline ml-1">
                        Create an account
                    </Link>
                </motion.p>
            </form>

            {/* show message from server response */}
            <Message
                isVisible={showMsg}
                message={message_p}
                type={status_p === 'success' ? 'success' : 'error'}
                title={status_p === 'success' ? 'Success' : 'Login Failed'}
                duration={5000}
                onClose={handleCloseMsg}
            />
        </motion.div>
    );
}

export default LogIn;
