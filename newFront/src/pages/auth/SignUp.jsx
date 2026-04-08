import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Input from '../../components/inputs/Input';
import List from '../../components/inputs/List';
import Button from '../../components/btns/Button';
import { Link } from 'react-router-dom';
import { validateSignUp } from './authValidation';
import { usePostMethod } from '../../hooks/usePostMethod';
import { useNavigate } from 'react-router-dom';
import Message from '../../components/Message';


// api base
const API_BASE_DEV = "http://localhost:5150";
const API_BASE_PROD = "https://neuro-gaurd-ai-backend.vercel.app";

function SignUp() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // navigate
    const navigate = useNavigate();
    const [showMsg, setShowMsg] = useState(false);
    const handleCloseMsg = useCallback(() => setShowMsg(false), []);

    // post data
    const { postData, status_p, message_p, data_p, loading_p } = usePostMethod();

    // form data
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        address: '',
        gender: ''
    });


    const [errors, setErrors] = useState({}); // errors
    const errorTimeoutRef = useRef(null); // error timeout

    // handle change
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

    // handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear any existing timer
        if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);

        const { isValid, errors: validationErrors } = validateSignUp(formData);

        if (!isValid) {
            setErrors(validationErrors);

            // Set timer to clear errors after 10 seconds
            errorTimeoutRef.current = setTimeout(() => {
                setErrors({});
            }, 10000);

            return;
        }

        // post data
        const API_BASE = window.location.hostname === 'localhost' ? API_BASE_DEV : API_BASE_PROD;
        await postData(`${API_BASE}/api/auth/signup`, {}, formData);
    };

    useEffect(() => {
        // Trigger message when request finishes
        if (status_p === "fail") setShowMsg(true);

        // Navigate to verify email if success, with a slight delay to show the message
        if (status_p === "success" && data_p?.email) {
            sessionStorage.setItem("NeuroAi_Email_For_Verification", data_p.email);
            navigate("/auth/verify-email");
        }
    }, [status_p, navigate, data_p]);

    // Cleanup effect for the timeout
    useEffect(() => {
        return () => {
            if (errorTimeoutRef.current) {
                clearTimeout(errorTimeoutRef.current);
            }
        };
    }, []);

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
            className="card-redesign w-full max-w-3xl !p-8 md:!p-12"
        >
            {/* title */}
            <div className="mb-10 text-center">
                <motion.h1 variants={itemVariants} className="text-3xl font-bold text-[var(--text-primary)] mb-2">Create an account</motion.h1>
                <motion.p variants={itemVariants} className="text-[var(--text-secondary)]">Join NeuroGaurd and start your journey today.</motion.p>
            </div>

            {/* form */}
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* first name and last name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div variants={itemVariants}>
                        <Input
                            label="First Name" name="firstName" placeholder="John" required
                            value={formData.firstName} onChange={handleChange}
                            error={errors.firstName}
                        />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <Input
                            label="Last Name" name="lastName" placeholder="Doe" required
                            value={formData.lastName} onChange={handleChange}
                            error={errors.lastName}
                        />
                    </motion.div>
                </div>

                {/* email and phone number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div variants={itemVariants}>
                        <Input
                            label="Email Address" name="email" type="email" placeholder="name@example.com" required
                            value={formData.email} onChange={handleChange}
                            error={errors.email}
                        />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <Input
                            label="Phone Number" name="phoneNumber" type="tel" placeholder="+20 123 456 7890" required
                            value={formData.phoneNumber} onChange={handleChange}
                            error={errors.phoneNumber}
                        />
                    </motion.div>
                </div>

                {/* password and gender */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div variants={itemVariants}>
                        <Input
                            label="Password" name="password" type="password" placeholder="••••••••" required
                            value={formData.password} onChange={handleChange}
                            error={errors.password}
                        />
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <List
                            label="Gender" name="gender" required
                            value={formData.gender} onChange={handleChange}
                            error={errors.gender}
                            options={[
                                { label: "Male", value: "male" },
                                { label: "Female", value: "female" },
                                { label: "Other", value: "other" }
                            ]}
                        />
                    </motion.div>
                </div>

                {/* address */}
                <motion.div variants={itemVariants}>
                    <Input
                        label="Address" name="address" placeholder="123 Street, City, Country" required
                        value={formData.address} onChange={handleChange}
                        error={errors.address}
                    />
                </motion.div>

                {/* sign up button */}
                <motion.div variants={itemVariants}>
                    <Button
                        type="submit" variant="primary" size="vmd" width="full" className="mt-4"
                        isLoading={loading_p}
                    >
                        Sign Up
                    </Button>
                </motion.div>

                {/* terms and privacy policy */}
                <motion.p variants={itemVariants} className="text-center text-sm text-[var(--text-muted)] mt-6">
                    By signing up, you agree to our
                    <Link to="/terms" className="underline text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"> Terms of Service</Link> and
                    <Link to="/privacy" className="underline text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"> Privacy Policy</Link>.
                </motion.p>
            </form>



            {/* show message from server response */}
            <Message
                isVisible={showMsg}
                message={message_p}
                type={status_p === 'success' ? 'success' : 'error'}
                title={status_p === 'success' ? 'Success' : 'Request Failed'}
                duration={5000} // disappear after 5 seconds
                onClose={handleCloseMsg}
            />
        </motion.div>
    );
}

export default SignUp;

