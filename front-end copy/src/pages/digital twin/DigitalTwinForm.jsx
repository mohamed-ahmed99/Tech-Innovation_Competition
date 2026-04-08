import React, { useEffect, useMemo, useState } from 'react';
import Input from '../../components/inputs/Input';
import Button from '../../components/btns/Button';
import List from '../../components/inputs/List';
import { ArrowRight, History, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { validateDigitalTwinData } from './validation';
import { usePostMethod } from '../../hooks/usePostMethod';
import {
    DIGITAL_TWIN_GENDERS,
    DIGITAL_TWIN_GRADES,
    DIGITAL_TWIN_LOCATIONS,
    DIGITAL_TWIN_PREVIOUS_TREATMENTS,
    DIGITAL_TWIN_SYMPTOMS,
    recommendationToSimulationQuery,
    treatmentLabel,
    toTitleCase,
} from './contract';

const DigitalTwinForm = () => {

    const API_BASE_DEV = "http://localhost:5150";
    const API_BASE_PROD = "https://neuro-gaurd-ai-backend.vercel.app";

    const navigate = useNavigate();
    const { postData, status_p, message_p, loading_p } = usePostMethod();

    const digitalTwinApiBase = useMemo(() => {
        const envBase = String(import.meta.env.VITE_API_BASE || '').trim().replace(/\/+$/, '');
        if (envBase) {
            return envBase;
        }
        return '';
    }, []);

    const buildApiUrl = (path) => `${digitalTwinApiBase}${path}`;

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
    const [recommendationData, setRecommendationData] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');

    const isAuthenticated = useMemo(() => Boolean(localStorage.getItem('NeuroAi_Token')), []);

    const fetchHistory = async () => {
        const token = localStorage.getItem('NeuroAi_Token');
        if (!token) {
            setHistory([]);
            return;
        }

        setHistoryLoading(true);
        setHistoryError('');

        try {
            const response = await fetch(buildApiUrl(`${API_BASE_PROD}/api/ai/digital-twin/history`), {
                headers: {
                    authorization: `Bearer ${token}`,
                },
            });

            const body = await response.json();
            if (!response.ok) {
                setHistoryError(body?.message || 'Could not load history.');
                return;
            }

            setHistory(body?.data?.history || []);
        } catch (error) {
            setHistoryError(error.message || 'Could not load history.');
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchHistory();
        }
    }, [isAuthenticated]);

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
                    symptoms: '',
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

    const mapRunToForm = (run) => {
        const profile = run?.input_profile || {};
        setFormData({
            age: String(profile.age || ''),
            gender: profile.gender || '',
            tumor_size_cm: String(profile.tumor_size_cm || ''),
            tumor_location: profile.tumor_location || '',
            tumor_grade: profile.tumor_grade || '',
            symptoms: Array.isArray(profile.symptoms) ? profile.symptoms : [],
            previous_treatment: profile.previous_treatment || '',
            performance_status: String(profile.performance_status ?? ''),
        });
        setRecommendationData(run);
        setErrors({});
    };

    const openSimulationFromRecommendation = () => {
        if (!recommendationData) {
            return;
        }

        const query = recommendationToSimulationQuery(recommendationData, formData.tumor_location);
        const search = new URLSearchParams(query).toString();
        navigate(`/simulation-3d?${search}`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { isValid, errors: validationErrors } = validateDigitalTwinData(formData);

        if (!isValid) {
            setErrors(validationErrors);
            return;
        }

        const payload = {
            ...formData,
            age: Number.parseInt(formData.age, 10),
            tumor_size_cm: Number.parseFloat(formData.tumor_size_cm),
            performance_status: Number.parseInt(formData.performance_status, 10),
        };

        const response = await postData(buildApiUrl(`${API_BASE_PROD}/api/ai/digital-twin/recommend`), {}, payload);
        const responseStatus = String(response?.status || '').toLowerCase();

        if (responseStatus === 'success') {
            setRecommendationData(response.data);
            if (isAuthenticated) {
                fetchHistory();
            }
        }

        if (response?.data?.errors) {
            setErrors(response.data.errors);
        }
    };

    const genderOptions = DIGITAL_TWIN_GENDERS.map((value) => ({ label: toTitleCase(value), value }));
    const locationOptions = DIGITAL_TWIN_LOCATIONS.map((value) => ({ label: toTitleCase(value), value }));
    const gradeOptions = DIGITAL_TWIN_GRADES.map((value) => ({ label: toTitleCase(value), value }));
    const treatmentOptions = DIGITAL_TWIN_PREVIOUS_TREATMENTS.map((value) => ({
        label: treatmentLabel(value),
        value,
    }));
    const symptomOptions = DIGITAL_TWIN_SYMPTOMS.map((value) => ({ label: toTitleCase(value), value }));

    const performanceOptions = [
        { label: '0 - Fully Active', value: '0' },
        { label: '1 - Restricted Strenuous Activity', value: '1' },
        { label: '2 - Capable of Self-care', value: '2' },
        { label: '3 - Limited Self-care', value: '3' },
        { label: '4 - Completely Disabled', value: '4' },
    ];

    const recommendation = recommendationData?.recommendation;
    const alternatives = recommendationData?.alternatives || [];
    const simulations = recommendation?.simulations || {};
    const confidencePercent = Math.round((Number(recommendation?.confidence || 0)) * 100);

    const recommendationLabel = recommendation?.recommended_treatment
        ? treatmentLabel(recommendation.recommended_treatment)
        : 'Awaiting recommendation';

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-8">
            <form onSubmit={handleSubmit} className="card-redesign p-8 sm:p-12 space-y-10">
                <div className="text-left mb-10">
                    <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">Digital Twin Recommendation</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-3 max-w-xl">
                        Enter patient profile details to generate a treatment recommendation and simulation metrics using our virtuell health modeling engine.
                    </p>
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
                        <List
                            label="Symptoms"
                            name="currentSymptom"
                            options={symptomOptions}
                            value={currentSymptom}
                            onChange={(e) => setCurrentSymptom(e.target.value)}
                            error={errors.symptoms}
                            placeholder="Select symptom to add"
                        />
                        <Button
                            type="button"
                            variant="secondary"
                            size="vmd"
                            onClick={handleAddSymptom}
                            className="w-full md:w-auto"
                        >
                            Add Selected Symptom
                        </Button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-1 sm:mt-2">
                    {formData.symptoms.map((symptom, index) => (
                        <span
                            key={index}
                            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 text-zinc-200 rounded-full text-sm border border-zinc-700"
                        >
                            {toTitleCase(symptom)}
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

                <div className="pt-8 mt-10 border-t border-[var(--border-subtle)] space-y-4">
                    <Button
                        type="submit"
                        variant="primary"
                        width="full"
                        isLoading={loading_p}
                    >
                        Generate Recommendation
                    </Button>

                    {status_p === 'fail' && (
                        <p className="status-message status-fail">
                            {message_p || 'Request failed. Please review your inputs and try again.'}
                        </p>
                    )}

                    {status_p === 'success' && (
                        <p className="status-message status-success">
                            {message_p || 'Recommendation generated successfully.'}
                        </p>
                    )}
                </div>
            </form>

            <aside className="card-redesign p-6 sm:p-8 space-y-8">
                <section className="space-y-6">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <Sparkles size={18} className="text-[var(--accent-primary)]" />
                            Recommendation Output
                        </h3>
                        {recommendationData?.saved_run?.createdAt && (
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                {new Date(recommendationData.saved_run.createdAt).toLocaleString()}
                            </span>
                        )}
                    </div>

                    {!recommendation && (
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                            Submit the profile form to view the recommended treatment, confidence, explanation,
                            alternatives, and simulation metrics.
                        </p>
                    )}

                    {recommendation && (
                        <div className="space-y-6">
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
                                <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-2 font-semibold">Recommended Treatment</p>
                                <p className="text-2xl font-bold text-[var(--accent-primary)] tracking-tight">{recommendationLabel}</p>
                                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Confidence</span>
                                    <span className="font-bold text-[var(--accent-primary)]">{confidencePercent}%</span>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm">
                                    <span className="text-[var(--text-secondary)]">Score Margin</span>
                                    <span className="font-bold text-amber-500">
                                        {Number(recommendationData?.score_margin || 0).toFixed(3)}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
                                <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-3 font-semibold">Clinical Explanation</p>
                                <p className="text-sm leading-relaxed text-[var(--text-primary)] font-light">
                                    {recommendation.explanation || 'No explanation was returned by the model.'}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 space-y-3">
                                <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold">Alternative Options</p>
                                {alternatives.length === 0 && (
                                    <p className="text-sm text-[var(--text-muted)]">No alternatives were returned.</p>
                                )}
                                {alternatives.map((item) => (
                                    <div key={item.treatment} className="text-sm flex items-center justify-between gap-2">
                                        <span className="text-[var(--text-primary)]">{treatmentLabel(item.treatment)}</span>
                                        <span className="text-[var(--text-muted)] font-mono">score {Number(item.score).toFixed(3)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 space-y-4">
                                <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)] font-semibold">Simulation Metrics</p>
                                {Object.entries(simulations).map(([name, metrics]) => (
                                    <div key={name} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-4">
                                        <p className="font-bold text-[var(--text-primary)] mb-2">{treatmentLabel(name)}</p>
                                        <div className="text-[10px] text-[var(--text-secondary)] grid grid-cols-3 gap-2 font-mono uppercase tracking-wider">
                                            <div className="flex flex-col">
                                                <span>Reduction</span>
                                                <span className="text-[var(--accent-primary)] font-bold text-[12px]">{Number(metrics.tumor_reduction || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span>Risk</span>
                                                <span className="text-red-400 font-bold text-[12px]">{Number(metrics.risk || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span>Success</span>
                                                <span className="text-emerald-400 font-bold text-[12px]">{Number(metrics.success || 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-zinc-400 leading-relaxed">
                                {recommendationData?.disclaimer}
                            </p>

                            <Button
                                type="button"
                                variant="primary"
                                width="full"
                                onClick={openSimulationFromRecommendation}
                            >
                                Open In 3D Lab
                                <ArrowRight size={16} className="ml-2" />
                            </Button>
                        </div>
                    )}
                </section>

                <section className="space-y-3 border-t border-zinc-800 pt-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                            <History size={16} />
                            Recent Runs
                        </h4>
                        {isAuthenticated && (
                            <button
                                type="button"
                                onClick={fetchHistory}
                                className="text-xs text-zinc-400 hover:text-zinc-200"
                            >
                                Refresh
                            </button>
                        )}
                    </div>

                    {!isAuthenticated && (
                        <p className="text-xs text-zinc-500">Login to save and compare your Digital Twin runs.</p>
                    )}

                    {historyError && (
                        <p className="text-xs text-red-400">{historyError}</p>
                    )}

                    {historyLoading && (
                        <p className="text-xs text-zinc-500">Loading history...</p>
                    )}

                    {!historyLoading && isAuthenticated && history.length === 0 && (
                        <p className="text-xs text-zinc-500">No saved runs yet.</p>
                    )}

                    <div className="space-y-2 max-h-52 overflow-auto pr-1">
                        {history.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => mapRunToForm(item)}
                                className="w-full text-left rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/50 transition-colors px-3 py-2"
                            >
                                <p className="text-sm font-medium text-zinc-200">
                                    {treatmentLabel(item?.recommendation?.recommended_treatment || 'unknown')}
                                </p>
                                <p className="text-xs text-zinc-400">
                                    {new Date(item.createdAt).toLocaleString()} · score margin {Number(item.score_margin || 0).toFixed(3)}
                                </p>
                            </button>
                        ))}
                    </div>
                </section>
            </aside>
        </div>

    );
};

export default DigitalTwinForm;
