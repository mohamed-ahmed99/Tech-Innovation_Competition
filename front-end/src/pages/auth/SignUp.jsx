import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Input from '../../components/inputs/Input';
import List from '../../components/inputs/List';
import Button from '../../components/btns/Button';
import { Link } from 'react-router-dom';
import { validateSignUp } from './authValidation';

function SignUp() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        address: '',
        gender: ''
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const errorTimeoutRef = useRef(null);

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

        setIsSubmitting(true);
        console.log("Form Data Validated & Submitted:", formData);

        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            // navigate to success or login
        }, 2000);
    };

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
            className="w-full max-w-3xl bg-zinc-900/50 border border-zinc-800 p-8 md:p-12 rounded-3xl shadow-2xl backdrop-blur-sm"
        >
            <div className="mb-10 text-center">
                <motion.h1 variants={itemVariants} className="text-3xl font-bold text-zinc-100 mb-2">Create an account</motion.h1>
                <motion.p variants={itemVariants} className="text-zinc-400">Join NeuroAi and start your journey today.</motion.p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div variants={itemVariants}>
                        <Input
                            label="Email Address" name="email" type="string" placeholder="name@example.com" required
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

                <motion.div variants={itemVariants}>
                    <Input
                        label="Address" name="address" placeholder="123 Street, City, Country" required
                        value={formData.address} onChange={handleChange}
                        error={errors.address}
                    />
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Button
                        type="submit" variant="primary" size="vmd" width="full" className="mt-4"
                        isLoading={isSubmitting}
                    >
                        Sign Up
                    </Button>
                </motion.div>

                <motion.p variants={itemVariants} className="text-center text-sm text-zinc-500 mt-6">
                    By signing up, you agree to our
                    <Link to="/terms" className="underline hover:text-zinc-300"> Terms of Service</Link> and
                    <Link to="/privacy" className="underline hover:text-zinc-300"> Privacy Policy</Link>.
                </motion.p>
            </form>
        </motion.div>
    );
}

export default SignUp;

