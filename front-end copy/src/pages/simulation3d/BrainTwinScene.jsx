import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

import {
    TREATMENTS,
    computeSimulation,
    getActiveLobeKey,
    getTumorPosition,
} from './simulationEngine';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const LABEL_POINTS = [
    { key: 'left-frontal', label: 'L FRONTAL', position: [-1.34, 0.64, 0.84] },
    { key: 'right-frontal', label: 'R FRONTAL', position: [1.34, 0.64, 0.84] },
    { key: 'left-temporal', label: 'L TEMPORAL', position: [-1.42, -0.34, 0.84] },
    { key: 'right-temporal', label: 'R TEMPORAL', position: [1.42, -0.34, 0.84] },
    { key: 'left-occipital', label: 'L OCCIPITAL', position: [-1.46, 0.06, 0.8] },
    { key: 'right-occipital', label: 'R OCCIPITAL', position: [1.46, 0.06, 0.8] },
    { key: 'left-parietal', label: 'L PARIETAL', position: [-1.18, 0.3, 0.82] },
    { key: 'right-parietal', label: 'R PARIETAL', position: [1.18, 0.3, 0.82] },
    { key: 'deep-core', label: 'DEEP CORE', position: [0, 0.07, 0.68] },
];

const RING_RADII = [0.14, 0.21, 0.28, 0.35, 0.42];

const TUMOR_RESPONSE_PROFILES = {
    surgery: {
        startRadius: 0.36,
        minRadius: 0.08,
        shrinkCurve: 0.58,
        edemaStart: 0.56,
        edemaMin: 0.2,
        edemaWeight: 0.74,
    },
    radiation: {
        startRadius: 0.33,
        minRadius: 0.12,
        shrinkCurve: 0.96,
        edemaStart: 0.52,
        edemaMin: 0.23,
        edemaWeight: 0.64,
    },
    chemotherapy: {
        startRadius: 0.31,
        minRadius: 0.17,
        shrinkCurve: 1.32,
        edemaStart: 0.49,
        edemaMin: 0.27,
        edemaWeight: 0.52,
    },
};

function HemisphereShell({ xOffset, tint, clippingPlanes }) {
    return (
        <group position={[xOffset, 0.02, 0]}>
            <mesh scale={[1.02, 0.72, 0.86]}>
                <sphereGeometry args={[0.92, 64, 64]} />
                <meshPhysicalMaterial
                    color={tint}
                    roughness={0.18}
                    metalness={0.02}
                    transmission={0.26}
                    thickness={0.48}
                    ior={1.16}
                    clearcoat={0.55}
                    clearcoatRoughness={0.2}
                    transparent
                    opacity={0.4}
                    emissive="#93c5fd"
                    emissiveIntensity={0.14}
                    clippingPlanes={clippingPlanes}
                />
            </mesh>

            <mesh scale={[1.03, 0.73, 0.87]}>
                <sphereGeometry args={[0.92, 48, 48]} />
                <meshBasicMaterial
                    color="#7dd3fc"
                    wireframe
                    transparent
                    opacity={0.16}
                    clippingPlanes={clippingPlanes}
                />
            </mesh>

            <mesh position={[0, 0, 0.03]} scale={[0.96, 0.65, 0.72]}>
                <sphereGeometry args={[0.82, 48, 48]} />
                <meshBasicMaterial
                    color="#e2e8f0"
                    transparent
                    opacity={0.13}
                    side={THREE.BackSide}
                    clippingPlanes={clippingPlanes}
                />
            </mesh>

            <mesh position={[0, 0.01, 0.39]} scale={[1.08, 0.74, 1]}>
                <ringGeometry args={[0.62, 0.66, 120]} />
                <meshBasicMaterial
                    color="#c7d2fe"
                    transparent
                    opacity={0.22}
                    clippingPlanes={clippingPlanes}
                />
            </mesh>

            <mesh position={[0, -0.09, 0.32]} scale={[0.99, 0.66, 1]}>
                <ringGeometry args={[0.55, 0.58, 120]} />
                <meshBasicMaterial
                    color="#93c5fd"
                    transparent
                    opacity={0.15}
                    clippingPlanes={clippingPlanes}
                />
            </mesh>
        </group>
    );
}

function EnergyBands({ xOffset, color, intensity, clippingPlanes }) {
    const bars = useMemo(
        () => Array.from({ length: 18 }).map((_, idx) => {
            const t = idx / 17;
            return {
                x: (t - 0.5) * 1.02,
                height: 0.18 + Math.sin(t * Math.PI) * 0.28,
                phase: idx * 0.27,
            };
        }),
        []
    );

    const barRefs = useRef([]);

    useFrame(({ clock }) => {
        barRefs.current.forEach((bar, idx) => {
            if (!bar) return;
            const wave = 0.56 + Math.sin(clock.elapsedTime * 1.7 + bars[idx].phase) * 0.44;
            // `bar` is the material instance itself, so update opacity directly.
            bar.opacity = clamp(0.06 + wave * (0.08 + intensity * 0.14), 0.06, 0.3);
        });
    });

    return (
        <group position={[xOffset, 0.28, 0.2]}>
            {bars.map((bar, idx) => (
                <mesh key={`${xOffset}-${idx}`} position={[bar.x, 0, 0.04 - Math.abs(bar.x) * 0.1]}>
                    <boxGeometry args={[0.028, bar.height, 0.018]} />
                    <meshBasicMaterial
                        ref={(el) => {
                            barRefs.current[idx] = el;
                        }}
                        color={color}
                        transparent
                        opacity={0.1}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>
            ))}
        </group>
    );
}

function CorticalWaves({ xOffset, color, active, clippingPlanes }) {
    const ringRefs = useRef([]);

    useFrame(({ clock }) => {
        ringRefs.current.forEach((ring, idx) => {
            if (!ring) return;
            const pulse = 1 + Math.sin(clock.elapsedTime * 1.55 + idx * 0.7) * 0.03;
            ring.scale.setScalar(pulse);
            ring.material.opacity = clamp(
                0.09 + (active ? 0.04 : 0) + Math.sin(clock.elapsedTime * 1.4 + idx) * 0.02,
                0.05,
                0.18
            );
        });
    });

    return (
        <group position={[xOffset + Math.sign(xOffset) * 0.08, -0.08, 0.31]}>
            {RING_RADII.map((radius, idx) => (
                <mesh
                    key={`${xOffset}-${radius}`}
                    ref={(el) => {
                        ringRefs.current[idx] = el;
                    }}
                >
                    <torusGeometry args={[radius, 0.0065, 8, 100]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.11}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>
            ))}
        </group>
    );
}

function TumorPulse({ position, color, progress, radius, clippingPlanes }) {
    const coreRef = useRef(null);
    const ringRefs = useRef([]);
    const pulseScale = clamp(radius / 0.24, 0.46, 1.75);

    useFrame(({ clock }) => {
        const pulse = 1 + Math.sin(clock.elapsedTime * 2.8) * 0.08;
        if (coreRef.current) {
            coreRef.current.scale.setScalar(pulse);
            coreRef.current.material.emissiveIntensity = 0.9 + Math.sin(clock.elapsedTime * 2.8) * 0.22;
        }

        ringRefs.current.forEach((ring, idx) => {
            if (!ring) return;
            const phase = ((clock.elapsedTime * 0.64 + idx * 0.32) % 1 + 1) % 1;
            const scale = 0.72 + phase * (1.05 + progress * 0.25);
            ring.scale.set(scale, scale, scale);
            ring.material.opacity = clamp(0.28 - phase * 0.23, 0.04, 0.28);
        });
    });

    return (
        <group position={position} scale={[pulseScale, pulseScale, pulseScale]}>
            <mesh ref={coreRef}>
                <sphereGeometry args={[0.09, 26, 26]} />
                <meshStandardMaterial
                    color="#f8fafc"
                    emissive={color}
                    emissiveIntensity={1}
                    roughness={0.18}
                    metalness={0.06}
                    clippingPlanes={clippingPlanes}
                />
            </mesh>

            {[0, 1, 2].map((idx) => (
                <mesh
                    key={idx}
                    ref={(el) => {
                        ringRefs.current[idx] = el;
                    }}
                >
                    <ringGeometry args={[0.15, 0.165, 80]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.16}
                        side={THREE.DoubleSide}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>
            ))}
        </group>
    );
}

function RadiationRipples({ position, progress, active, color, clippingPlanes }) {
    const refs = useRef([]);

    useFrame(({ clock }) => {
        refs.current.forEach((ring, idx) => {
            if (!ring) return;
            ring.visible = active;
            if (!active) return;

            const phase = ((clock.elapsedTime * 0.78 + idx * 0.3) % 1 + 1) % 1;
            const scale = 0.65 + phase * (1.25 + progress * 0.3);
            ring.scale.set(scale, scale, scale);
            ring.material.opacity = clamp(0.22 - phase * 0.19, 0.03, 0.22);
        });
    });

    return (
        <group position={position}>
            {[0, 1, 2].map((idx) => (
                <mesh
                    key={idx}
                    ref={(el) => {
                        refs.current[idx] = el;
                    }}
                >
                    <ringGeometry args={[0.1, 0.118, 96]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.15}
                        side={THREE.DoubleSide}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>
            ))}
        </group>
    );
}

function ChemoParticles({ position, progress, active, color, clippingPlanes }) {
    const seeds = useMemo(
        () => Array.from({ length: 24 }).map((_, idx) => ({
            angle: (idx / 24) * Math.PI * 2,
            lane: 0.14 + (idx % 6) * 0.025,
            speed: 0.7 + (idx % 5) * 0.15,
            y: ((idx % 7) - 3) * 0.03,
        })),
        []
    );

    const refs = useRef([]);

    useFrame(({ clock }) => {
        refs.current.forEach((dot, idx) => {
            if (!dot) return;
            dot.visible = active;
            if (!active) return;

            const seed = seeds[idx];
            const orbit = seed.angle + clock.elapsedTime * seed.speed;
            const radius = seed.lane * (0.92 + progress * 0.35);
            dot.position.set(
                Math.cos(orbit) * radius,
                seed.y + Math.sin(orbit * 1.4) * 0.04,
                Math.sin(orbit) * radius * 0.55
            );
        });
    });

    return (
        <group position={position}>
            {seeds.map((_, idx) => (
                <mesh
                    key={idx}
                    ref={(el) => {
                        refs.current[idx] = el;
                    }}
                >
                    <sphereGeometry args={[0.017, 12, 12]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={0.9}
                        transparent
                        opacity={0.86}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>
            ))}
        </group>
    );
}

function CutPlane({ axis, offset }) {
    let position = [0, 0, offset * 0.8];
    let rotation = [0, 0, 0];

    if (axis === 'axial') {
        position = [0, offset * 0.8, 0.25];
        rotation = [Math.PI / 2, 0, 0];
    } else if (axis === 'sagittal') {
        position = [offset * 0.8, 0, 0.25];
        rotation = [0, Math.PI / 2, 0];
    }

    return (
        <mesh position={position} rotation={rotation}>
            <planeGeometry args={[2.4, 1.7]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.1} side={THREE.DoubleSide} />
        </mesh>
    );
}

function SceneCore({
    treatment,
    intensity,
    progress,
    tumorLocation,
    laterality,
    confidence,
    sliceEnabled,
    sliceAxis,
    sliceOffset,
    compact,
}) {
    const metrics = useMemo(() => computeSimulation(treatment, intensity), [treatment, intensity]);
    const activeLobe = useMemo(() => getActiveLobeKey(tumorLocation, laterality), [tumorLocation, laterality]);
    const tumorRawPosition = useMemo(() => getTumorPosition(tumorLocation, laterality), [tumorLocation, laterality]);

    const tumorPosition = useMemo(
        () => [
            tumorRawPosition[0] * 1.02,
            tumorRawPosition[1] * 0.86 + 0.01,
            0.28 + tumorRawPosition[2] * 0.24,
        ],
        [tumorRawPosition]
    );

    const progressRatio = clamp(progress / 100, 0, 1);
    const doseStrength = clamp((intensity / 100) * (0.38 + progressRatio * 0.62), 0.16, 1);
    const uncertainty = clamp(1 - confidence, 0.04, 0.78);

    const responseProfile = TUMOR_RESPONSE_PROFILES[treatment] || TUMOR_RESPONSE_PROFILES.surgery;
    const progressDrivenResponse = Math.pow(progressRatio, responseProfile.shrinkCurve);
    const biologicalResponse = clamp(metrics.reduction * (0.72 + doseStrength * 0.44), 0.12, 0.95);
    const shrinkAmount = clamp(progressDrivenResponse * biologicalResponse, 0, 0.95);

    const tumorRadius = clamp(
        responseProfile.startRadius * (1 - shrinkAmount),
        responseProfile.minRadius,
        responseProfile.startRadius
    );

    const edemaStart = responseProfile.edemaStart + uncertainty * 0.09;
    const edemaRadius = clamp(
        edemaStart * (1 - shrinkAmount * responseProfile.edemaWeight),
        responseProfile.edemaMin + uncertainty * 0.06,
        edemaStart
    );

    const treatmentColor = TREATMENTS[treatment].color;
    const focusColor = useMemo(() => {
        const base = new THREE.Color(treatmentColor);
        return `#${base.clone().lerp(new THREE.Color('#bef264'), 0.16).getHexString()}`;
    }, [treatmentColor]);

    const focusX = tumorLocation === 'deep' ? 0 : laterality === 'left' ? -0.56 : 0.56;

    const visibleLabelKeys = useMemo(() => {
        const keys = laterality === 'right'
            ? ['left-frontal', 'right-frontal', 'left-occipital', 'left-temporal', 'right-temporal']
            : ['left-frontal', 'right-frontal', 'right-occipital', 'right-temporal', 'left-temporal'];

        if (activeLobe === 'deep-core') {
            keys.push('left-temporal', 'right-temporal');
        } else {
            keys.push(activeLobe);
        }

        return Array.from(new Set(keys));
    }, [activeLobe, laterality]);

    const visibleLabels = useMemo(
        () => LABEL_POINTS.filter((label) => visibleLabelKeys.includes(label.key)),
        [visibleLabelKeys]
    );

    const clipPlane = useMemo(() => {
        if (!sliceEnabled) return null;

        if (sliceAxis === 'axial') return new THREE.Plane(new THREE.Vector3(0, 1, 0), sliceOffset);
        if (sliceAxis === 'sagittal') return new THREE.Plane(new THREE.Vector3(1, 0, 0), sliceOffset);
        return new THREE.Plane(new THREE.Vector3(0, 0, 1), sliceOffset);
    }, [sliceAxis, sliceEnabled, sliceOffset]);

    const clippingPlanes = clipPlane ? [clipPlane] : undefined;

    return (
        <>
            <fog attach="fog" args={['#020817', 3.4, 10.5]} />
            <ambientLight intensity={0.34} />
            <directionalLight position={[1.8, 2.8, 3.2]} intensity={0.9} color="#dbeafe" />
            <pointLight position={[-2.4, 1.4, 1.6]} intensity={0.35} color="#38bdf8" />
            <pointLight position={[2.35, 1.15, 1.5]} intensity={0.5} color={focusColor} />

            <mesh position={[-0.95, 0.15, -0.58]} scale={[1.38, 1.0, 1]}>
                <circleGeometry args={[0.75, 80]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.045} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh position={[0.98, 0.02, -0.56]} scale={[1.44, 1.05, 1]}>
                <circleGeometry args={[0.8, 80]} />
                <meshBasicMaterial color={focusColor} transparent opacity={0.09} blending={THREE.AdditiveBlending} />
            </mesh>

            <group position={[0, 0.03, 0.06]}>
                <HemisphereShell xOffset={-0.6} tint="#00C8FF" clippingPlanes={clippingPlanes} />
                <HemisphereShell xOffset={0.6} tint="#00FFC8" clippingPlanes={clippingPlanes} />

                <mesh position={[0, 0.01, 0.25]}>
                    <capsuleGeometry args={[0.03, 0.76, 4, 10]} />
                    <meshBasicMaterial color="#93c5fd" transparent opacity={0.14} clippingPlanes={clippingPlanes} />
                </mesh>

                <mesh position={[0, -0.16, 0.24]}>
                    <boxGeometry args={[2.25, 0.025, 0.03]} />
                    <meshBasicMaterial color="#7dd3fc" transparent opacity={0.08} clippingPlanes={clippingPlanes} />
                </mesh>

                <mesh position={[0, -0.03, 0.18]} scale={[2.18, 1.08, 1]}>
                    <circleGeometry args={[0.66, 120]} />
                    <meshBasicMaterial color="#93c5fd" transparent opacity={0.08} blending={THREE.AdditiveBlending} />
                </mesh>

                <mesh position={[0, 0.02, 0.39]} scale={[1.92, 0.78, 1]}>
                    <ringGeometry args={[0.63, 0.66, 140]} />
                    <meshBasicMaterial color="#bfdbfe" transparent opacity={0.16} clippingPlanes={clippingPlanes} />
                </mesh>

                <EnergyBands xOffset={-0.6} color="#67e8f9" intensity={doseStrength} clippingPlanes={clippingPlanes} />
                <EnergyBands xOffset={0.6} color={focusColor} intensity={doseStrength} clippingPlanes={clippingPlanes} />

                <CorticalWaves xOffset={-0.63} color="#93c5fd" active={progress > 0} clippingPlanes={clippingPlanes} />
                <CorticalWaves xOffset={0.63} color={focusColor} active={progress > 0} clippingPlanes={clippingPlanes} />

                <mesh position={[focusX * 0.7, -0.03, 0.2]} scale={[1 + doseStrength * 0.2, 0.82 + doseStrength * 0.14, 1]}>
                    <circleGeometry args={[0.55, 90]} />
                    <meshBasicMaterial
                        color={focusColor}
                        transparent
                        opacity={0.17 + doseStrength * 0.12}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>

                <mesh position={tumorPosition} scale={[edemaRadius, edemaRadius, edemaRadius]}>
                    <sphereGeometry args={[0.48, 40, 40]} />
                    <meshStandardMaterial
                        color="#fb7185"
                        transparent
                        opacity={0.16 + uncertainty * 0.08}
                        emissive="#fb923c"
                        emissiveIntensity={0.46 + doseStrength * 0.25}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>

                <mesh position={tumorPosition} scale={[tumorRadius + 0.08, tumorRadius + 0.08, tumorRadius + 0.08]}>
                    <sphereGeometry args={[0.5, 32, 32]} />
                    <meshStandardMaterial
                        color={focusColor}
                        transparent
                        opacity={0.24}
                        emissive={focusColor}
                        emissiveIntensity={0.76}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>

                <TumorPulse
                    position={tumorPosition}
                    color={focusColor}
                    progress={progressRatio}
                    radius={tumorRadius}
                    clippingPlanes={clippingPlanes}
                />

                {treatment === 'radiation' && (
                    <RadiationRipples
                        position={tumorPosition}
                        progress={progressRatio}
                        active={progress > 0}
                        color={focusColor}
                        clippingPlanes={clippingPlanes}
                    />
                )}

                {treatment === 'chemotherapy' && (
                    <ChemoParticles
                        position={tumorPosition}
                        progress={progressRatio}
                        active={progress > 0}
                        color={focusColor}
                        clippingPlanes={clippingPlanes}
                    />
                )}

                {treatment === 'surgery' && (
                    <mesh
                        position={tumorPosition}
                        scale={[0.12 + progressRatio * 0.18, 0.12 + progressRatio * 0.18, 0.12 + progressRatio * 0.18]}
                    >
                        <sphereGeometry args={[0.54, 28, 28]} />
                        <meshStandardMaterial
                            color="#030712"
                            emissive="#020617"
                            emissiveIntensity={0.14}
                            transparent
                            opacity={0.22 + progressRatio * 0.22}
                            clippingPlanes={clippingPlanes}
                        />
                    </mesh>
                )}

                {sliceEnabled && <CutPlane axis={sliceAxis} offset={sliceOffset} />}

                {!compact && visibleLabels.map((label) => (
                    <Html key={label.key} position={label.position} transform={false} center>
                        <span className={`brain-lobe-tag ${label.key === activeLobe ? 'brain-lobe-tag--active' : 'brain-lobe-tag--muted'}`}>
                            {label.label}
                        </span>
                    </Html>
                ))}

                {!compact && (
                    <>
                        <Html
                            position={[tumorPosition[0] + 0.01, tumorPosition[1], tumorPosition[2] + 0.28]}
                            transform={false}
                            center
                        >
                            <div className={`brain-pin ${progress > 0 ? 'brain-pin--active' : ''}`}>
                                <span className="brain-pin__dot" />
                                <span className="brain-pin__line" />
                            </div>
                        </Html>
                    </>
                )}
            </group>

            <ContactShadows
                position={[0, -1.36, 0]}
                opacity={0.25}
                width={5.8}
                height={4.3}
                blur={2.6}
                far={2.8}
                color="#020617"
            />

            <OrbitControls
                enablePan={false}
                enableRotate={!compact}
                enableZoom={!compact}
                minDistance={2.7}
                maxDistance={4.5}
                enableDamping
                dampingFactor={0.08}
                autoRotate={false}
                maxAzimuthAngle={0.24}
                minAzimuthAngle={-0.24}
                maxPolarAngle={Math.PI * 0.58}
                minPolarAngle={Math.PI * 0.44}
            />

            <EffectComposer>
                <Bloom
                    luminanceThreshold={0.12}
                    luminanceSmoothing={0.38}
                    intensity={0.52 + doseStrength * 0.45}
                    mipmapBlur
                />
                <Noise opacity={0.04} />
            </EffectComposer>
        </>
    );
}

export default function BrainTwinScene(props) {
    const {
        compact = false,
    } = props;

    return (
        <div className={`brain-canvas-shell ${compact ? 'brain-canvas-shell--compact' : ''}`}>
            <Canvas
                shadows
                camera={{ position: [0, 0.32, 3.35], fov: compact ? 44 : 38 }}
                gl={{ antialias: true, localClippingEnabled: true }}
            >
                <SceneCore {...props} compact={compact} />
            </Canvas>
        </div>
    );
}
