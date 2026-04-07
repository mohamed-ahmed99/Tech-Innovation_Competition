import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import { Bloom, DepthOfField, EffectComposer, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

import {
    LOBE_LABELS_3D,
    TREATMENTS,
    computeSimulation,
    getActiveLobeKey,
    getTumorPosition,
} from './simulationEngine';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function useFoldedGeometry() {
    return useMemo(() => {
        const geometry = new THREE.IcosahedronGeometry(1, 7);
        const position = geometry.attributes.position;
        const v = new THREE.Vector3();

        for (let i = 0; i < position.count; i += 1) {
            v.fromBufferAttribute(position, i);
            const fold =
                0.055 * Math.sin(v.x * 11.5) * Math.cos(v.y * 13.2)
                + 0.028 * Math.sin(v.z * 17.2)
                + 0.012 * Math.sin((v.x + v.z) * 19.0);
            v.normalize().multiplyScalar(1 + fold);
            position.setXYZ(i, v.x, v.y, v.z);
        }

        position.needsUpdate = true;
        geometry.computeVertexNormals();
        return geometry;
    }, []);
}

function useMRITexture() {
    return useMemo(() => {
        if (typeof document === 'undefined') return null;

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = '#0b1325';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const gradient = ctx.createRadialGradient(256, 256, 18, 256, 256, 240);
        gradient.addColorStop(0, 'rgba(226,232,240,0.35)');
        gradient.addColorStop(0.5, 'rgba(148,163,184,0.14)');
        gradient.addColorStop(1, 'rgba(15,23,42,0.04)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(256, 256, 236, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(148,163,184,0.26)';
        for (let r = 38; r < 236; r += 15) {
            ctx.lineWidth = r % 30 === 0 ? 1.8 : 0.9;
            ctx.beginPath();
            ctx.arc(256, 256, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;
        return texture;
    }, []);
}

function RadiationWaves({ position, progress, active, color }) {
    const refs = useRef([]);

    useFrame(({ clock }) => {
        if (!active) {
            refs.current.forEach((mesh) => {
                if (!mesh) return;
                mesh.visible = false;
            });
            return;
        }

        refs.current.forEach((mesh, idx) => {
            if (!mesh) return;
            mesh.visible = true;
            const phase = ((clock.elapsedTime * 0.8 + idx * 0.35) % 1 + 1) % 1;
            const scale = 0.3 + phase * (1.4 + progress * 0.7);
            mesh.scale.setScalar(scale);
            mesh.material.opacity = clamp(0.42 - phase * 0.34, 0.05, 0.42);
        });
    });

    return (
        <group position={position}>
            {[0, 1, 2].map((idx) => (
                <mesh key={idx} ref={(el) => { refs.current[idx] = el; }}>
                    <sphereGeometry args={[0.2, 48, 48]} />
                    <meshBasicMaterial color={color} wireframe transparent opacity={0.3} />
                </mesh>
            ))}
        </group>
    );
}

function ChemoCloud({ position, progress, active, color }) {
    const groupRef = useRef(null);
    const particles = useMemo(
        () => Array.from({ length: 34 }).map((_, i) => {
            const theta = (i / 34) * Math.PI * 2;
            const phi = ((i * 7) % 34) / 34 * Math.PI;
            const radius = 0.35 + ((i * 13) % 10) * 0.03;
            return { theta, phi, radius };
        }),
        []
    );

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        groupRef.current.visible = active;
        groupRef.current.rotation.y = clock.elapsedTime * 0.55;
        groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.4) * 0.14;
    });

    return (
        <group ref={groupRef} position={position}>
            {particles.map((p, idx) => {
                const flow = 0.75 + progress * 0.9;
                const r = p.radius * flow;
                const x = Math.cos(p.theta) * Math.sin(p.phi) * r;
                const y = Math.cos(p.phi) * r;
                const z = Math.sin(p.theta) * Math.sin(p.phi) * r;
                return (
                    <mesh key={idx} position={[x, y, z]}>
                        <sphereGeometry args={[0.035, 16, 16]} />
                        <meshStandardMaterial
                            color={color}
                            emissive={color}
                            emissiveIntensity={0.9}
                            transparent
                            opacity={0.85}
                        />
                    </mesh>
                );
            })}
        </group>
    );
}

function CutPlane({ axis, offset }) {
    let position = [0, 0, offset];
    let rotation = [0, 0, 0];

    if (axis === 'axial') {
        position = [0, offset, 0];
        rotation = [Math.PI / 2, 0, 0];
    } else if (axis === 'sagittal') {
        position = [offset, 0, 0];
        rotation = [0, Math.PI / 2, 0];
    }

    return (
        <mesh position={position} rotation={rotation}>
            <planeGeometry args={[2.9, 2.9]} />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.14} side={THREE.DoubleSide} />
        </mesh>
    );
}

function TumorBeacon({ position, color, active }) {
    const coreRef = useRef(null);
    const ringRefs = useRef([]);

    useFrame(({ clock }) => {
        const pulse = 1 + Math.sin(clock.elapsedTime * 3.2) * 0.06;
        if (coreRef.current) {
            coreRef.current.scale.setScalar(pulse);
            coreRef.current.material.emissiveIntensity = 0.95 + Math.sin(clock.elapsedTime * 3.2) * 0.18;
        }

        ringRefs.current.forEach((ring, idx) => {
            if (!ring) return;

            ring.visible = active;
            if (!active) return;

            const phase = ((clock.elapsedTime * 0.55 + idx * 0.28) % 1 + 1) % 1;
            const scale = 0.7 + phase * 1.15;
            ring.scale.set(scale, scale, scale);
            ring.material.opacity = clamp(0.32 - phase * 0.24, 0.04, 0.32);
        });
    });

    return (
        <group position={position}>
            <mesh ref={coreRef}>
                <sphereGeometry args={[0.14, 28, 28]} />
                <meshStandardMaterial
                    color="#fff7ed"
                    emissive={color}
                    emissiveIntensity={1}
                    roughness={0.2}
                    metalness={0.05}
                    transparent
                    opacity={0.96}
                />
            </mesh>

            {[0, 1, 2].map((idx) => (
                <mesh
                    key={idx}
                    ref={(el) => {
                        ringRefs.current[idx] = el;
                    }}
                    rotation={[Math.PI / 2, 0, 0]}
                >
                    <ringGeometry args={[0.2, 0.22, 64]} />
                    <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </group>
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
    const brainGeometry = useFoldedGeometry();
    const mriTexture = useMRITexture();

    const metrics = useMemo(() => computeSimulation(treatment, intensity), [treatment, intensity]);
    const tumorPosition = useMemo(() => getTumorPosition(tumorLocation, laterality), [tumorLocation, laterality]);
    const activeLobe = useMemo(() => getActiveLobeKey(tumorLocation, laterality), [tumorLocation, laterality]);
    const activeLobeLabel = useMemo(() => {
        if (activeLobe === 'deep-core') return 'Deep Core';
        return activeLobe
            .split('-')
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(' ');
    }, [activeLobe]);
    const visibleLabels = useMemo(() => {
        if (activeLobe === 'deep-core') {
            return LOBE_LABELS_3D.filter((label) => label.key === 'deep-core');
        }

        const [side, region] = activeLobe.split('-');
        const oppositeSide = side === 'left' ? 'right' : 'left';
        const oppositeKey = `${oppositeSide}-${region}`;

        return LOBE_LABELS_3D.filter(
            (label) => label.key === activeLobe || label.key === oppositeKey
        );
    }, [activeLobe]);

    const progressRatio = progress / 100;
    const doseStrength = clamp((intensity / 100) * (0.35 + progressRatio * 0.65), 0.15, 1);

    const uncertainty = clamp(1 - confidence, 0.03, 0.85);
    const tumorScale = clamp(0.45 - metrics.reduction * progressRatio * 0.25, 0.18, 0.45);
    const edemaScale = clamp(0.72 - metrics.reduction * progressRatio * 0.34, 0.28, 0.72);
    const corticalRingRadii = useMemo(() => [0.3, 0.38, 0.46, 0.54], []);

    const healthyExposure = clamp(metrics.risk * 0.72 + doseStrength * 0.25, 0, 1);
    const tissueColor = useMemo(() => {
        const base = new THREE.Color('#a8b5ce');
        const warn = new THREE.Color('#fb923c');
        return base.lerp(warn, healthyExposure * 0.58);
    }, [healthyExposure]);

    const treatmentColor = TREATMENTS[treatment].color;

    const clipPlane = useMemo(() => {
        if (!sliceEnabled) return null;

        if (sliceAxis === 'axial') return new THREE.Plane(new THREE.Vector3(0, 1, 0), sliceOffset);
        if (sliceAxis === 'sagittal') return new THREE.Plane(new THREE.Vector3(1, 0, 0), sliceOffset);
        return new THREE.Plane(new THREE.Vector3(0, 0, 1), sliceOffset);
    }, [sliceAxis, sliceEnabled, sliceOffset]);

    const clippingPlanes = clipPlane ? [clipPlane] : undefined;

    return (
        <>
            <fog attach="fog" args={['#030712', 4.6, 13.5]} />
            <ambientLight intensity={0.38} />
            <directionalLight
                position={[3.1, 4.2, 2.8]}
                intensity={1.1}
                color="#dbeafe"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            <pointLight position={[-2.8, -1.7, 2.0]} intensity={0.55} color="#7dd3fc" />
            <pointLight position={[2.5, 2.2, -2.5]} intensity={0.45} color="#bef264" />

            <group>
                <mesh
                    position={[-0.52, 0, 0]}
                    scale={[0.93, 1.05, 1]}
                    castShadow
                    receiveShadow
                >
                    <primitive object={brainGeometry} attach="geometry" />
                    <meshPhysicalMaterial
                        color={tissueColor}
                        roughness={0.32}
                        metalness={0.06}
                        transmission={0.42}
                        thickness={0.45}
                        ior={1.21}
                        clearcoat={0.58}
                        clearcoatRoughness={0.28}
                        emissive="#1e293b"
                        emissiveIntensity={0.22 + healthyExposure * 0.18}
                        transparent
                        opacity={0.62}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>

                <mesh
                    position={[0.52, 0, 0]}
                    scale={[0.93, 1.05, 1]}
                    castShadow
                    receiveShadow
                >
                    <primitive object={brainGeometry} attach="geometry" />
                    <meshPhysicalMaterial
                        color={tissueColor}
                        roughness={0.32}
                        metalness={0.06}
                        transmission={0.42}
                        thickness={0.45}
                        ior={1.21}
                        clearcoat={0.58}
                        clearcoatRoughness={0.28}
                        emissive="#1e293b"
                        emissiveIntensity={0.22 + healthyExposure * 0.18}
                        transparent
                        opacity={0.62}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>

                <mesh position={[-0.52, 0, 0]} scale={[0.95, 1.08, 1.03]}>
                    <primitive object={brainGeometry} attach="geometry" />
                    <meshBasicMaterial
                        color="#7dd3fc"
                        wireframe
                        transparent
                        opacity={0.1}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>

                <mesh position={[0.52, 0, 0]} scale={[0.95, 1.08, 1.03]}>
                    <primitive object={brainGeometry} attach="geometry" />
                    <meshBasicMaterial
                        color="#7dd3fc"
                        wireframe
                        transparent
                        opacity={0.1}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>

                {[-0.52, 0.52].map((xOffset, hemisphereIdx) => (
                    <group key={xOffset} position={[xOffset, 0.02, 0.04]}>
                        {corticalRingRadii.map((radius, idx) => (
                            <mesh
                                key={`${xOffset}-${radius}`}
                                position={[0, 0, -0.06 - idx * 0.04]}
                                rotation={[Math.PI / 2, 0, hemisphereIdx === 0 ? 0.22 : -0.22]}
                            >
                                <torusGeometry args={[radius, 0.008, 10, 96]} />
                                <meshBasicMaterial
                                    color={idx % 2 === 0 ? '#38bdf8' : '#60a5fa'}
                                    transparent
                                    opacity={0.2}
                                    clippingPlanes={clippingPlanes}
                                />
                            </mesh>
                        ))}
                    </group>
                ))}

                <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.08, 0.02, 24, 80]} />
                    <meshStandardMaterial color="#0f172a" emissive="#0f172a" clippingPlanes={clippingPlanes} />
                </mesh>

                <mesh position={[0, -0.95, -0.18]} rotation={[Math.PI / 2.35, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.14, 0.2, 0.66, 32]} />
                    <meshStandardMaterial
                        color="#94a3b8"
                        roughness={0.56}
                        metalness={0.04}
                        emissive="#1f2937"
                        emissiveIntensity={0.22}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>

                <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <circleGeometry args={[1.3, 64]} />
                    <meshBasicMaterial
                        map={mriTexture || null}
                        transparent
                        opacity={0.24}
                        color="#e2e8f0"
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>

                <mesh position={tumorPosition} scale={[edemaScale, edemaScale, edemaScale]}>
                    <sphereGeometry args={[0.5, 40, 40]} />
                    <meshStandardMaterial
                        color="#fb7185"
                        transparent
                        opacity={0.18}
                        emissive="#f97316"
                        emissiveIntensity={0.52 + doseStrength * 0.35}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>

                <mesh position={tumorPosition} scale={[tumorScale + 0.28, tumorScale + 0.28, tumorScale + 0.28]}>
                    <sphereGeometry args={[0.5, 32, 32]} />
                    <meshStandardMaterial
                        color="#fb923c"
                        transparent
                        opacity={0.28}
                        emissive="#fb923c"
                        emissiveIntensity={0.78 + doseStrength * 0.32}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>

                <mesh position={tumorPosition} scale={[tumorScale, tumorScale, tumorScale]} castShadow>
                    <sphereGeometry args={[0.5, 48, 48]} />
                    <meshStandardMaterial
                        color="#fff7ed"
                        emissive="#f97316"
                        emissiveIntensity={0.95 + doseStrength * 0.38}
                        roughness={0.22}
                        metalness={0.08}
                        clippingPlanes={clippingPlanes}
                    />
                </mesh>

                <mesh
                    position={tumorPosition}
                    scale={[tumorScale + uncertainty * 0.5, tumorScale + uncertainty * 0.5, tumorScale + uncertainty * 0.5]}
                >
                    <sphereGeometry args={[0.62, 36, 36]} />
                    <meshBasicMaterial
                        color="#f8fafc"
                        transparent
                        opacity={0.09 + uncertainty * 0.24}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>

                <TumorBeacon
                    position={tumorPosition}
                    color={treatmentColor}
                    active={progress > 0}
                />

                {treatment === 'surgery' && (
                    <mesh position={tumorPosition} scale={[0.12 + progressRatio * 0.45, 0.12 + progressRatio * 0.45, 0.12 + progressRatio * 0.45]}>
                        <sphereGeometry args={[0.52, 30, 30]} />
                        <meshStandardMaterial
                            color="#020617"
                            emissive="#020617"
                            emissiveIntensity={0.2}
                            transparent
                            opacity={0.16 + progressRatio * 0.28}
                            clippingPlanes={clippingPlanes}
                        />
                    </mesh>
                )}

                {treatment === 'radiation' && (
                    <RadiationWaves
                        position={tumorPosition}
                        progress={progressRatio}
                        active={progress > 0}
                        color={treatmentColor}
                    />
                )}

                {treatment === 'chemotherapy' && (
                    <ChemoCloud
                        position={tumorPosition}
                        progress={progressRatio}
                        active={progress > 0}
                        color={treatmentColor}
                    />
                )}

                {sliceEnabled && <CutPlane axis={sliceAxis} offset={sliceOffset} />}

                {visibleLabels.map((label) => (
                    <Html key={label.key} position={label.position} distanceFactor={compact ? 11 : 9} transform={false}>
                        <span className={`brain-lobe-tag ${activeLobe === label.key ? 'brain-lobe-tag--active' : 'brain-lobe-tag--muted'}`}>
                            {label.label}
                        </span>
                    </Html>
                ))}

                <Html position={[tumorPosition[0], tumorPosition[1] + 0.2, tumorPosition[2]]} center distanceFactor={compact ? 10 : 8}>
                    <div className={`brain-pin ${progress > 0 ? 'brain-pin--active' : ''}`}>
                        <span className="brain-pin__dot" />
                        <div className="brain-pin__meta">
                            <span className="brain-pin__label">{activeLobeLabel}</span>
                            <span className="brain-pin__stat">{Math.round(metrics.reduction * 100)}% est. response</span>
                        </div>
                    </div>
                </Html>
            </group>

            <ContactShadows
                position={[0, -1.45, 0]}
                opacity={0.33}
                width={6.2}
                height={6.2}
                blur={2.7}
                far={3.2}
                color="#020617"
            />

            <OrbitControls
                enablePan={false}
                minDistance={2.5}
                maxDistance={6.1}
                enableDamping
                dampingFactor={0.09}
                autoRotate={!compact}
                autoRotateSpeed={compact ? 0 : 0.16}
                maxPolarAngle={Math.PI * 0.68}
                minPolarAngle={Math.PI * 0.32}
            />

            <EffectComposer>
                <Bloom
                    luminanceThreshold={0.15}
                    luminanceSmoothing={0.35}
                    intensity={0.7 + doseStrength * 0.6}
                    mipmapBlur
                />
                <DepthOfField focusDistance={0.02} focalLength={0.03} bokehScale={1.35} />
                <Noise opacity={0.06} />
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
                camera={{ position: [0.3, 1.15, 3.45], fov: compact ? 48 : 42 }}
                gl={{ antialias: true, localClippingEnabled: true }}
            >
                <SceneCore {...props} compact={compact} />
            </Canvas>
        </div>
    );
}
