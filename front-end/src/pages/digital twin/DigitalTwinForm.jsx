import React, { useState, useEffect } from 'react';
import Input from '../../components/inputs/Input';
import Button from '../../components/btns/Button';
import List from '../../components/inputs/List';
import { X } from 'lucide-react';
import { validateDigitalTwinData } from './validation';
import { useNavigate } from 'react-router-dom';
import { useGlobalData } from '../../hooks/useGlobalData';

const DigitalTwinForm = () => {
    const navigate = useNavigate();
    const [, setGlobalData] = useGlobalData();



    const [formData, setFormData] = useState({
        age: '',
        gender: '',
        tumor_size_cm: '',
        tumor_location: '',
        tumor_grade: '',
        symptoms: [],
        previous_treatment: '',
        performance_status: ''
    });

    const [errors, setErrors] = useState({});
    const [currentSymptom, setCurrentSymptom] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitNotice, setSubmitNotice] = useState('');

    // Auto-clear errors after 5 seconds
    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            const timer = setTimeout(() => {
                setErrors({});
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [errors]);

    const handleChange = (e) => {

        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when field changes
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleAddSymptom = () => {
        if (currentSymptom.trim() && !formData.symptoms.includes(currentSymptom.trim())) {
            setFormData(prev => ({
                ...prev,
                symptoms: [...prev.symptoms, currentSymptom.trim()]
            }));
            setCurrentSymptom('');

            // Clear symptom error if any
            if (errors.symptoms) {
                setErrors(prev => ({
                    ...prev,
                    symptoms: ''
                }));
            }
        }
    };

    const handleRemoveSymptom = (symptomToRemove) => {
        setFormData(prev => ({
            ...prev,
            symptoms: prev.symptoms.filter(s => s !== symptomToRemove)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { isValid, errors: validationErrors } = validateDigitalTwinData(formData);

        if (!isValid) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        setSubmitNotice('');

        const normalizedFormData = {
            ...formData,
            age: Number(formData.age),
            tumor_size_cm: Number(formData.tumor_size_cm),
            performance_status: Number(formData.performance_status),
        };

        setGlobalData('digitalTwinProfile', normalizedFormData);
        localStorage.setItem('NeuroGuard_DigitalTwin', JSON.stringify(normalizedFormData));

        // Best-effort save to backend if endpoint is available.
        try {
            const token = localStorage.getItem('NeuroAi_Token');
            await fetch('https://neuro-gaurd-ai-backend.vercel.app/api/ai/digital-twin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(normalizedFormData),
            });
        } catch {
            setSubmitNotice('Digital Twin saved locally. Moving to MRI analysis.');
        }

        setIsSubmitting(false);
        navigate('/scan');
    };

    const genderOptions = [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' }
    ];

    const locationOptions = [
        { label: 'Temporal', value: 'temporal' },
        { label: 'Frontal', value: 'frontal' },
        { label: 'Parietal', value: 'parietal' },
        { label: 'Occipital', value: 'occipital' },
        { label: 'Brainstem', value: 'brainstem' },
        { label: 'Cerebellum', value: 'cerebellum' }
    ];

    const gradeOptions = [
        { label: 'Low Grade', value: 'low' },
        { label: 'High Grade', value: 'high' }
    ];

    const treatmentOptions = [
        { label: 'None', value: 'none' },
        { label: 'Surgery', value: 'surgery' },
        { label: 'Radiation', value: 'radiation' },
        { label: 'Chemotherapy', value: 'chemotherapy' },
        { label: 'Combined', value: 'combined' }
    ];

    const performanceOptions = [
        { label: '0 - Fully Active', value: 0 },
        { label: '1 - Restricted Strenuous Activity', value: 1 },
        { label: '2 - Capable of Self-care', value: 2 },
        { label: '3 - Limited Self-care', value: 3 },
        { label: '4 - Completely Disabled', value: 4 }
    ];

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4 sm:p-8 rounded-3xl bg-zinc-900/20 border border-zinc-800 backdrop-blur-sm shadow-2xl space-y-4 sm:space-y-6">
            <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">Digital Twin</h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-2">Enter patient data to generate digital twin analysis</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <Input
                    label="Age"
                    name="age"
                    type="text"
                    value={formData.age}
                    onChange={handleChange}
                    error={errors.age}
                    placeholder="Enter age"
                    required
                />

                <List
                    label="Gender"
                    name="gender"
                    options={genderOptions}
                    value={formData.gender}
                    onChange={handleChange}
                    error={errors.gender}
                    placeholder="Select gender"
                    required
                />

                <Input
                    label="Tumor Size (cm)"
                    name="tumor_size_cm"
                    type="text"
                    step="0.1"
                    value={formData.tumor_size_cm}
                    onChange={handleChange}
                    error={errors.tumor_size_cm}
                    placeholder="e.g. 2.7"
                    required
                />

                <List
                    label="Tumor Location"
                    name="tumor_location"
                    options={locationOptions}
                    value={formData.tumor_location}
                    onChange={handleChange}
                    error={errors.tumor_location}
                    placeholder="Select location"
                    required
                />

                <List
                    label="Tumor Grade"
                    name="tumor_grade"
                    options={gradeOptions}
                    value={formData.tumor_grade}
                    onChange={handleChange}
                    error={errors.tumor_grade}
                    placeholder="Select grade"
                    required
                />

                <List
                    label="Previous Treatment"
                    name="previous_treatment"
                    options={treatmentOptions}
                    value={formData.previous_treatment}
                    onChange={handleChange}
                    error={errors.previous_treatment}
                    placeholder="Select treatment"
                    required
                />

                <List
                    label="Performance Status (ECOG)"
                    name="performance_status"
                    options={performanceOptions}
                    value={formData.performance_status}
                    onChange={handleChange}
                    error={errors.performance_status}
                    placeholder="Select status"
                    required
                />

                <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-sm font-medium text-zinc-400 ml-1">Symptoms</label>
                    <div className="flex gap-2 items-start">
                        <Input
                            placeholder="Add symptom (headache..)"
                            value={currentSymptom}
                            onChange={(e) => setCurrentSymptom(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSymptom())}
                            error={errors.symptoms}
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            onClick={handleAddSymptom}
                            className="h-[50px] px-6 min-w-[80px]"
                        >
                            Add
                        </Button>
                    </div>
                </div>
            </div>

            {/* Symptoms Tags */}
            <div className="flex flex-wrap gap-2 mt-1 sm:mt-2">
                {formData.symptoms.map((symptom, index) => (
                    <span
                        key={index}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 text-zinc-200 rounded-full text-sm border border-zinc-700"
                    >
                        {symptom}
                        <button
                            type="button"
                            onClick={() => handleRemoveSymptom(symptom)}
                            className="hover:text-red-500 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
            </div>

            <div className="pt-2 sm:pt-4 mt-2 sm:mt-6 border-t border-zinc-800">
                {submitNotice && (
                    <p className="text-xs text-zinc-400 mb-3">{submitNotice}</p>
                )}
                <Button
                    type="submit"
                    variant="primary"
                    width="full"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                >
                    Continue to MRI Model
                </Button>
            </div>

        </form>

    );
};

export default DigitalTwinForm;
