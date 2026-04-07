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
        <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
            <form onSubmit={handleSubmit} className="p-4 sm:p-8 rounded-3xl bg-zinc-900/20 border border-zinc-800 backdrop-blur-sm shadow-2xl space-y-4 sm:space-y-6">
                <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100">Digital Twin Recommendation</h2>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-2">
                        Enter patient profile details to generate a treatment recommendation and simulation metrics.
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

                <div className="pt-2 sm:pt-4 mt-2 sm:mt-6 border-t border-zinc-800 space-y-3">
                    <Button
                        type="submit"
                        variant="primary"
                        width="full"
                        isLoading={loading_p}
                    >
                        Generate Recommendation
                    </Button>

                    {status_p === 'fail' && (
                        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                            {message_p || 'Request failed. Please review your inputs and try again.'}
                        </p>
                    )}

                    {status_p === 'success' && (
                        <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
                            {message_p || 'Recommendation generated successfully.'}
                        </p>
                    )}
                </div>
            </form>

            <aside className="rounded-3xl bg-zinc-900/30 border border-zinc-800 p-5 sm:p-6 shadow-2xl space-y-5">
                <section className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                            <Sparkles size={18} className="text-cyan-300" />
                            Recommendation Output
                        </h3>
                        {recommendationData?.saved_run?.createdAt && (
                            <span className="text-[11px] text-zinc-400">
                                {new Date(recommendationData.saved_run.createdAt).toLocaleString()}
                            </span>
                        )}
                    </div>

                    {!recommendation && (
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            Submit the profile form to view the recommended treatment, confidence, explanation,
                            alternatives, and simulation metrics.
                        </p>
                    )}

                    {recommendation && (
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-zinc-700/70 bg-zinc-900/70 p-4">
                                <p className="text-xs uppercase tracking-wide text-zinc-400">Recommended Treatment</p>
                                <p className="text-xl font-semibold text-zinc-100 mt-1">{recommendationLabel}</p>
                                <div className="mt-3 flex items-center justify-between text-sm">
                                    <span className="text-zinc-300">Confidence</span>
                                    <span className="font-semibold text-cyan-300">{confidencePercent}%</span>
                                </div>
                                <div className="mt-1 flex items-center justify-between text-sm">
                                    <span className="text-zinc-300">Score Margin</span>
                                    <span className="font-semibold text-amber-300">
                                        {Number(recommendationData?.score_margin || 0).toFixed(3)}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-zinc-700/70 bg-zinc-900/60 p-4">
                                <p className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Clinical Explanation</p>
                                <p className="text-sm leading-relaxed text-zinc-200">
                                    {recommendation.explanation || 'No explanation was returned by the model.'}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-2">
                                <p className="text-xs uppercase tracking-wide text-zinc-400">Alternative Options</p>
                                {alternatives.length === 0 && (
                                    <p className="text-sm text-zinc-400">No alternatives were returned.</p>
                                )}
                                {alternatives.map((item) => (
                                    <div key={item.treatment} className="text-sm text-zinc-200 flex items-center justify-between gap-2">
                                        <span>{treatmentLabel(item.treatment)}</span>
                                        <span className="text-zinc-400">score {Number(item.score).toFixed(3)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-2xl border border-zinc-700/70 bg-zinc-900/60 p-4 space-y-2">
                                <p className="text-xs uppercase tracking-wide text-zinc-400">Simulation Metrics</p>
                                {Object.entries(simulations).map(([name, metrics]) => (
                                    <div key={name} className="rounded-xl bg-zinc-950/50 border border-zinc-800 p-3">
                                        <p className="font-medium text-zinc-100">{treatmentLabel(name)}</p>
                                        <div className="mt-2 text-xs text-zinc-300 grid grid-cols-3 gap-2">
                                            <span>Reduction {Number(metrics.tumor_reduction || 0).toFixed(2)}</span>
                                            <span>Risk {Number(metrics.risk || 0).toFixed(2)}</span>
                                            <span>Success {Number(metrics.success || 0).toFixed(2)}</span>
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
