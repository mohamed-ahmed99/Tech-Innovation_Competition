import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGlobalData } from '../../context/GlobalContext';
import './treatment3d.css';

function normalizeTreatmentOptions(structured) {
    if (!structured) return [];

    const comparison =
        structured?.treatment_comparison ||
        structured?.treatmentComparison ||
        structured?.advice?.treatmentComparison ||
        [];

    if (Array.isArray(comparison) && comparison.length > 0) {
        return comparison.slice(0, 3).map((item, index) => ({
            rank: item?.rank || index + 1,
            name: item?.name || `Treatment ${index + 1}`,
            suitabilityScore: typeof item?.suitabilityScore === 'number' ? item.suitabilityScore : 80 - index * 10,
            rationale: item?.rationale || 'Derived from AI findings and Digital Twin context.',
        }));
    }

    const fallback =
        structured?.treatment_options ||
        structured?.treatmentOptions ||
        structured?.advice?.treatmentOptions ||
        [];

    return fallback.slice(0, 3).map((name, index) => ({
        rank: index + 1,
        name,
        suitabilityScore: 80 - index * 10,
        rationale: 'Baseline recommendation from AI treatment guidance.',
    }));
}

const Treatment3DPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [store] = useGlobalData();

    const initialBundle = location.state || store.lastAnalysisBundle || null;
    const [bundle] = useState(initialBundle);
    const [selectedTreatmentIndex, setSelectedTreatmentIndex] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [compareMode, setCompareMode] = useState(false);

    const structured = bundle?.structured || null;
    const digitalTwinProfile = bundle?.digitalTwinProfile || null;

    const treatmentOptions = useMemo(() => normalizeTreatmentOptions(structured), [structured]);
    const selectedTreatment = treatmentOptions[selectedTreatmentIndex] || null;

    useEffect(() => {
        if (!isRunning) return;

        const timer = setInterval(() => {
            setProgress((current) => {
                if (current >= 100) {
                    clearInterval(timer);
                    return 100;
                }
                return current + 5;
            });
        }, 350);

        return () => clearInterval(timer);
    }, [isRunning]);

    const handleStart = () => {
        setProgress(0);
        setIsRunning(true);
    };

    const handleReset = () => {
        setIsRunning(false);
        setProgress(0);
    };

    if (!structured) {
        return (
            <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-20 flex items-center justify-center">
                <div className="max-w-xl w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center">
                    <h1 className="text-2xl font-bold">No treatment result found</h1>
                    <p className="text-sm text-zinc-400 mt-3">
                        Run MRI analysis first, then return here to visualize treatment in 3D.
                    </p>
                    <Link
                        to="/scan"
                        className="inline-flex mt-6 px-6 py-3 rounded-xl bg-zinc-100 text-zinc-950 font-semibold hover:bg-white transition-colors"
                    >
                        Go to MRI Model
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 px-4 sm:px-6 lg:px-8 py-10">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-2">Step 3 of 3</p>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Treatment Visualization In 3D</h1>
                    <p className="text-sm text-zinc-400 mt-3 max-w-3xl leading-relaxed">
                        Select one treatment plan and press Start to simulate progression on a 3D brain twin. You can also compare all top 3 options.
                    </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-4 space-y-4">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-3">Top 3 Treatments</h2>
                            <div className="space-y-2">
                                {treatmentOptions.map((option, index) => (
                                    <button
                                        key={`treatment-option-${index}`}
                                        onClick={() => setSelectedTreatmentIndex(index)}
                                        className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                                            selectedTreatmentIndex === index
                                                ? 'border-zinc-100 bg-zinc-100 text-zinc-950'
                                                : 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500'
                                        }`}
                                    >
                                        <p className="text-xs uppercase tracking-widest opacity-70">Option {index + 1}</p>
                                        <p className="text-sm font-semibold mt-1">{option.name}</p>
                                        <p className="text-xs mt-1 opacity-80">Fit score: {option.suitabilityScore}%</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-2">Selected Plan</h3>
                            <p className="text-base font-semibold text-zinc-100">{selectedTreatment?.name || 'Unavailable'}</p>
                            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{selectedTreatment?.rationale || 'No rationale available.'}</p>
                            <div className="mt-4 h-2 rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                    className="h-full bg-zinc-100 transition-all duration-500"
                                    style={{ width: `${selectedTreatment?.suitabilityScore || 0}%` }}
                                />
                            </div>
                        </div>

                        {digitalTwinProfile && (
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-2">Digital Twin Context</h3>
                                <p className="text-xs text-zinc-300 leading-relaxed">
                                    Age {digitalTwinProfile.age}, grade {digitalTwinProfile.tumor_grade}, previous treatment {digitalTwinProfile.previous_treatment}, ECOG {digitalTwinProfile.performance_status}.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="xl:col-span-8">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6">
                            <div className="treatment-scene">
                                <div className="brain-core" />
                                <div className="brain-ring ring-a" />
                                <div className="brain-ring ring-b" />
                                <div className="brain-ring ring-c" />
                                <div className={`therapy-wave wave-${selectedTreatmentIndex + 1} ${isRunning ? 'active' : ''}`} />
                                <div className={`therapy-wave wave-secondary ${isRunning ? 'active' : ''}`} />

                                {[0, 1, 2, 3].map((particle) => (
                                    <div
                                        key={`particle-${particle}`}
                                        className={`treatment-particle ${isRunning ? 'active' : ''}`}
                                        style={{ animationDelay: `${particle * 0.4}s` }}
                                    />
                                ))}
                            </div>

                            <div className="mt-5">
                                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                                    <span>Treatment progress</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-zinc-500 to-zinc-100 transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">
                                <button
                                    onClick={handleStart}
                                    className="py-3 px-4 rounded-xl bg-zinc-100 text-zinc-950 font-semibold hover:bg-white transition-colors"
                                >
                                    Start Treatment
                                </button>
                                <button
                                    onClick={() => setCompareMode((value) => !value)}
                                    className="py-3 px-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-semibold hover:border-zinc-500 transition-colors"
                                >
                                    {compareMode ? 'Hide Comparison' : 'Compare 3 Treatments'}
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="py-3 px-4 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-semibold hover:border-zinc-500 transition-colors"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {compareMode && (
                            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400 mb-3">Treatment Comparison</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {treatmentOptions.map((option, index) => (
                                        <div key={`comparison-card-${index}`} className="rounded-xl border border-zinc-700 bg-zinc-900/70 p-3">
                                            <p className="text-xs uppercase tracking-widest text-zinc-500">Plan {index + 1}</p>
                                            <p className="text-sm text-zinc-100 font-semibold mt-1">{option.name}</p>
                                            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{option.rationale}</p>
                                            <div className="mt-3 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                                <div
                                                    className="h-full bg-zinc-100"
                                                    style={{ width: `${option.suitabilityScore}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex flex-wrap gap-2">
                            <button
                                onClick={() => navigate('/scan')}
                                className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-100 hover:border-zinc-500 transition-colors"
                            >
                                Back to MRI Model
                            </button>
                            <button
                                onClick={() => navigate('/digital-twin')}
                                className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-100 hover:border-zinc-500 transition-colors"
                            >
                                Edit Digital Twin
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Treatment3DPage;
