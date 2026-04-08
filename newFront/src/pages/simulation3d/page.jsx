import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';

import BrainTwinScene from './BrainTwinScene';
import {
    TIMELINE_EVENTS,
    TREATMENTS,
    TUMOR_LOCATIONS,
    computeConfidence,
    getAllSimulations,
    rankTreatments,
    toPercent,
} from './simulationEngine';
import './simulation3d.css';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function parseSimulationSeed(searchParams) {
    const treatmentParam = searchParams.get('treatment');
    const tumorLocationParam = searchParams.get('tumorLocation');
    const intensityParam = Number(searchParams.get('intensity'));
    const confidenceParam = Number(searchParams.get('confidence'));
    const source = searchParams.get('source') || '';

    const treatment = Object.prototype.hasOwnProperty.call(TREATMENTS, treatmentParam)
        ? treatmentParam
        : 'surgery';
    const tumorLocation = TUMOR_LOCATIONS.includes(tumorLocationParam)
        ? tumorLocationParam
        : 'temporal';
    const intensity = Number.isFinite(intensityParam) ? clamp(Math.round(intensityParam), 20, 100) : 68;
    const confidence = Number.isFinite(confidenceParam) ? clamp(Math.round(confidenceParam), 0, 100) : null;

    return {
        source,
        treatment,
        tumorLocation,
        intensity,
        confidence,
    };
}

export default function Simulation3DPage() {
    const [searchParams] = useSearchParams();
    const simulationSeed = useMemo(() => parseSimulationSeed(searchParams), [searchParams]);

    const [treatment, setTreatment] = useState(simulationSeed.treatment);
    const [intensity, setIntensity] = useState(simulationSeed.intensity);
    const [tumorLocation, setTumorLocation] = useState(simulationSeed.tumorLocation);
    const [laterality, setLaterality] = useState('right');
    const [progress, setProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [compareMode, setCompareMode] = useState(false);

    const [sliceEnabled, setSliceEnabled] = useState(false);
    const [sliceAxis, setSliceAxis] = useState('axial');
    const [sliceSlider, setSliceSlider] = useState(0);

    const simulations = useMemo(() => getAllSimulations(intensity), [intensity]);
    const ranked = useMemo(() => rankTreatments(simulations), [simulations]);
    const confidence = useMemo(() => computeConfidence(simulations), [simulations]);
    const seededFromDigitalTwin = simulationSeed.source === 'digital-twin';

    const recommended = ranked[0]?.key || 'surgery';
    const selectedMetrics = simulations[treatment] || simulations.surgery;
    const sliceOffset = useMemo(() => clamp((sliceSlider / 100) * 1.15, -1.15, 1.15), [sliceSlider]);

    useEffect(() => {
        if (!isPlaying) return undefined;

        const timer = setInterval(() => {
            setProgress((prev) => {
                const next = prev + 1;
                if (next >= 100) {
                    setIsPlaying(false);
                    return 100;
                }
                return next;
            });
        }, 75);

        return () => clearInterval(timer);
    }, [isPlaying]);

    useEffect(() => {
        if (tumorLocation === 'deep') {
            setLaterality('right');
        }
    }, [tumorLocation]);

    const handleReset = () => {
        setIsPlaying(false);
        setProgress(0);
    };

    return (
        <div className="simulation-page">
            <div className="simulation-page__bg" />

            <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="simulation-page__container"
            >
                <header className="simulation-header">
                    <p className="simulation-header__eyebrow">NeuroGaurd Digital Twin Lab · Interactive Clinical Preview</p>
                    <h1 className="simulation-header__title">NeuroGaurd 3D Tumor Twin</h1>
                    <p className="simulation-header__intro">
                        Explore estimated tumor response in a real-time 3D brain scene with treatment effects,
                        cut planes, uncertainty halo, and dose visualization.
                    </p>
                    {seededFromDigitalTwin && (
                        <p className="simulation-header__intro" style={{ marginTop: 6 }}>
                            Seeded from Digital Twin recommendation{simulationSeed.confidence !== null ? ` (${simulationSeed.confidence}% model confidence)` : ''}.
                        </p>
                    )}
                </header>

                <div className="simulation-layout">
                    <aside className="control-card">
                        <div className="control-card__top">
                            <h2>Simulation Controls</h2>
                            <p>Adjust parameters to update expected treatment response instantly.</p>
                        </div>

                        <div className="control-group">
                            <label className="control-label">Treatment</label>
                            <div className="pill-grid">
                                {Object.entries(TREATMENTS).map(([key, config]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setTreatment(key)}
                                        className={`pill ${treatment === key ? 'is-active' : ''}`}
                                    >
                                        {config.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="control-group">
                            <div className="control-row">
                                <label className="control-label">Dose Intensity</label>
                                <span className="value-tag">{intensity}%</span>
                            </div>
                            <input
                                type="range"
                                min="20"
                                max="100"
                                value={intensity}
                                onChange={(e) => setIntensity(Number(e.target.value))}
                                className="range"
                            />
                        </div>

                        <div className="control-grid-2">
                            <div className="control-group control-group--tight">
                                <label className="control-label">Tumor Region</label>
                                <select
                                    value={tumorLocation}
                                    onChange={(e) => setTumorLocation(e.target.value)}
                                    className="field"
                                >
                                    {TUMOR_LOCATIONS.map((location) => (
                                        <option key={location} value={location}>
                                            {location.charAt(0).toUpperCase() + location.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="control-group control-group--tight">
                                <label className="control-label">Side</label>
                                <div className="side-grid">
                                    {['left', 'right'].map((side) => (
                                        <button
                                            key={side}
                                            type="button"
                                            onClick={() => setLaterality(side)}
                                            disabled={tumorLocation === 'deep'}
                                            className={`side-btn ${laterality === side ? 'is-active' : ''}`}
                                        >
                                            {side.charAt(0).toUpperCase() + side.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="control-group control-group--tight">
                            <div className="control-row">
                                <label className="control-label">Cut Plane</label>
                                <button
                                    type="button"
                                    onClick={() => setSliceEnabled((v) => !v)}
                                    className={`toggle ${sliceEnabled ? 'is-on' : ''}`}
                                >
                                    {sliceEnabled ? 'ON' : 'OFF'}
                                </button>
                            </div>

                            <div className="control-row">
                                <select
                                    value={sliceAxis}
                                    onChange={(e) => setSliceAxis(e.target.value)}
                                    className="field"
                                >
                                    <option value="axial">Axial</option>
                                    <option value="coronal">Coronal</option>
                                    <option value="sagittal">Sagittal</option>
                                </select>
                                <span className="value-tag">{sliceSlider}</span>
                            </div>

                            <input
                                type="range"
                                min="-100"
                                max="100"
                                value={sliceSlider}
                                onChange={(e) => setSliceSlider(Number(e.target.value))}
                                className="range"
                                disabled={!sliceEnabled}
                            />
                        </div>

                        <div className="control-row control-row--buttons">
                            <button
                                type="button"
                                onClick={() => setIsPlaying((p) => !p)}
                                className="cta cta--primary"
                            >
                                {isPlaying ? 'Pause' : 'Play'}
                            </button>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="cta"
                            >
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={() => setCompareMode((v) => !v)}
                                className={`cta ${compareMode ? 'is-highlight' : ''}`}
                            >
                                {compareMode ? 'Single View' : 'Compare 3'}
                            </button>
                        </div>

                        <div className="timeline-card">
                            <div className="control-row">
                                <label className="control-label">Timeline Scrubber</label>
                                <span className="value-tag">{progress}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={progress}
                                onChange={(e) => {
                                    setIsPlaying(false);
                                    setProgress(Number(e.target.value));
                                }}
                                className="range"
                            />
                            <div className="timeline-markers">
                                {TIMELINE_EVENTS.map((event) => (
                                    <button
                                        key={event.title}
                                        type="button"
                                        className="timeline-marker"
                                        style={{ left: `${event.at}%` }}
                                        onClick={() => {
                                            setIsPlaying(false);
                                            setProgress(event.at);
                                        }}
                                        title={event.title}
                                    >
                                        <span>{event.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="metrics-card">
                            <p className="metrics-card__title">Decision Snapshot</p>
                            <p>Recommended Plan: <strong>{TREATMENTS[recommended].label}</strong></p>
                            <p>Model Confidence: <strong>{Math.round(confidence * 100)}%</strong></p>
                            <p>Estimated Reduction: <strong>{toPercent(selectedMetrics.reduction)}</strong></p>
                            <p>Estimated Risk: <strong>{selectedMetrics.risk.toFixed(2)}</strong></p>
                            <p>Estimated Success: <strong>{selectedMetrics.success.toFixed(2)}</strong></p>
                        </div>
                    </aside>

                    <section className="viewer-card">
                        <div className="viewer-card__head">
                            <div>
                                <h2>Stylized Anatomical Twin</h2>
                                <p>
                                    Treatment particles and energy fields in a stylized anatomical model.
                                </p>
                            </div>
                            <span className="badge">{compareMode ? 'Comparison Mode' : TREATMENTS[treatment].label}</span>
                        </div>

                        {!compareMode && (
                            <BrainTwinScene
                                treatment={treatment}
                                intensity={intensity}
                                progress={progress}
                                tumorLocation={tumorLocation}
                                laterality={laterality}
                                confidence={confidence}
                                sliceEnabled={sliceEnabled}
                                sliceAxis={sliceAxis}
                                sliceOffset={sliceOffset}
                            />
                        )}

                        {compareMode && (
                            <div className="compare-grid">
                                {Object.keys(TREATMENTS).map((key) => (
                                    <article
                                        key={key}
                                        className={`mini-card ${recommended === key ? 'mini-card--recommended' : ''}`}
                                    >
                                        <header className="mini-card__head">
                                            <h3>{TREATMENTS[key].label}</h3>
                                            <span>{simulations[key].score.toFixed(3)}</span>
                                        </header>
                                        <BrainTwinScene
                                            compact
                                            treatment={key}
                                            intensity={intensity}
                                            progress={progress}
                                            tumorLocation={tumorLocation}
                                            laterality={laterality}
                                            confidence={confidence}
                                            sliceEnabled={sliceEnabled}
                                            sliceAxis={sliceAxis}
                                            sliceOffset={sliceOffset}
                                        />
                                        <div className="mini-card__metrics">
                                            <span>Reduction {toPercent(simulations[key].reduction)}</span>
                                            <span>Risk {simulations[key].risk.toFixed(2)}</span>
                                            <span>Success {simulations[key].success.toFixed(2)}</span>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </motion.div>
        </div>
    );
}
