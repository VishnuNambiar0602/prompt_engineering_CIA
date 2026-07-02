/**
 * IntervAI - 3D Interactive AI Interviewer Scene (Three.js)
 * Manages the interactive 3D avatar that responds to mouse input and app state changes.
 */

class AIInterviewer3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        // Scene variables
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // 3D Objects
        this.coreMesh = null;
        this.wireMesh = null;
        this.particleSystem = null;
        this.orbitRing1 = null;
        this.orbitRing2 = null;
        this.pointLightFollow = null;

        // original vertices for morphing
        this.coreGeometry = null;
        this.originalPositions = null;

        // Mouse tracking
        this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
        this.isHovering = false;

        // Animation States
        this.status = 'idle'; // idle, thinking, speaking, listening
        this.statusColors = {
            idle: { core: 0x00f0ff, glow: 0x9d4edd, light: 0x00f0ff },
            thinking: { core: 0xffaa00, glow: 0xff007f, light: 0xffaa00 },
            speaking: { core: 0x39ff14, glow: 0x00f0ff, light: 0x39ff14 },
            listening: { core: 0xff3333, glow: 0x9d4edd, light: 0xff3333 }
        };

        // Sound intensity for speech morphing
        this.audioIntensity = 0;
        this.targetAudioIntensity = 0;

        // Bind events
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.container.addEventListener('mouseenter', () => this.isHovering = true);
        this.container.addEventListener('mouseleave', () => {
            this.isHovering = false;
            this.mouse.targetX = 0;
            this.mouse.targetY = 0;
        });

        // Initialize
        this.init();
    }

    init() {
        // 1. Create Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x070615, 0.015);

        // 2. Setup Camera
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
        this.camera.position.z = 8;

        // 3. Setup Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // 4. Setup Lighting
        const ambientLight = new THREE.AmbientLight(0x0c0b24, 1.5);
        this.scene.add(ambientLight);

        // Cyan light from left
        const directionalLightL = new THREE.DirectionalLight(0x00f0ff, 2.5);
        directionalLightL.position.set(-5, 3, 2);
        this.scene.add(directionalLightL);

        // Purple light from right
        const directionalLightR = new THREE.DirectionalLight(0x9d4edd, 2.5);
        directionalLightR.position.set(5, -3, 2);
        this.scene.add(directionalLightR);

        // Follow light (reacts to mouse)
        this.pointLightFollow = new THREE.PointLight(0x00f0ff, 4, 15);
        this.scene.add(this.pointLightFollow);

        // 5. Create Holographic Core (Icosahedron)
        this.coreGeometry = new THREE.IcosahedronGeometry(1.6, 3);
        
        // Save original vertices for noise displacement
        const positionAttr = this.coreGeometry.attributes.position;
        this.originalPositions = new Float32Array(positionAttr.array);

        // Core Materials
        // Inner Glass Mesh
        const coreMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x0a0c27,
            emissive: 0x0e1342,
            roughness: 0.1,
            metalness: 0.1,
            transmission: 0.9,
            ior: 1.5,
            thickness: 1.2,
            transparent: true,
            opacity: 0.85,
            wireframe: false,
            flatShading: true
        });

        this.coreMesh = new THREE.Mesh(this.coreGeometry, coreMaterial);
        this.scene.add(this.coreMesh);

        // Outer Wireframe Glow
        const wireMaterial = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            wireframe: true,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending
        });
        this.wireMesh = new THREE.Mesh(this.coreGeometry, wireMaterial);
        this.wireMesh.scale.setScalar(1.02);
        this.coreMesh.add(this.wireMesh);

        // 6. Orbiting Interactive Rings
        const ringMaterial1 = new THREE.MeshStandardMaterial({
            color: 0x9d4edd,
            roughness: 0.2,
            metalness: 0.8,
            wireframe: true
        });
        
        // Ring 1
        const torusGeometry1 = new THREE.TorusGeometry(2.4, 0.03, 8, 64);
        this.orbitRing1 = new THREE.Mesh(torusGeometry1, ringMaterial1);
        this.orbitRing1.rotation.x = Math.PI / 3;
        this.orbitRing1.rotation.y = Math.PI / 6;
        this.scene.add(this.orbitRing1);

        // Ring 2
        const torusGeometry2 = new THREE.TorusGeometry(2.8, 0.02, 6, 64);
        const ringMaterial2 = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            roughness: 0.2,
            metalness: 0.8,
            wireframe: true
        });
        this.orbitRing2 = new THREE.Mesh(torusGeometry2, ringMaterial2);
        this.orbitRing2.rotation.x = -Math.PI / 4;
        this.orbitRing2.rotation.y = -Math.PI / 3;
        this.scene.add(this.orbitRing2);

        // 7. Particle System (Surrounding Starfield)
        const particleCount = 200;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            // spherical distribution
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = 3 + Math.random() * 4; // between radius 3 and 7

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            // Mix cyan and purple colors
            const isCyan = Math.random() > 0.5;
            colors[i * 3] = isCyan ? 0.0 : 0.6;
            colors[i * 3 + 1] = isCyan ? 0.94 : 0.3;
            colors[i * 3 + 2] = 1.0;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Create texture for glow particles
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 16);
        const pTexture = new THREE.CanvasTexture(canvas);

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.12,
            map: pTexture,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.particleSystem);

        // Start Animation Loop
        this.animate();
    }

    onMouseMove(event) {
        const rect = this.container.getBoundingClientRect();
        // Normalized coordinates [-1, 1]
        this.mouse.targetX = ((event.clientX - rect.left) / this.width) * 2 - 1;
        this.mouse.targetY = -((event.clientY - rect.top) / this.height) * 2 + 1;
    }

    onWindowResize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
    }

    setStatus(status) {
        if (this.status === status || !this.statusColors[status]) return;
        this.status = status;

        const newColors = this.statusColors[status];
        
        // GSAP animate materials and point lights color transition
        gsap.to(this.wireMesh.material.color, {
            r: ((newColors.core >> 16) & 255) / 255,
            g: ((newColors.core >> 8) & 255) / 255,
            b: (newColors.core & 255) / 255,
            duration: 0.8
        });

        gsap.to(this.pointLightFollow.color, {
            r: ((newColors.light >> 16) & 255) / 255,
            g: ((newColors.light >> 8) & 255) / 255,
            b: (newColors.light & 255) / 255,
            duration: 0.8
        });

        // Set animation speeds and styles
        if (status === 'thinking') {
            this.targetAudioIntensity = 0;
            gsap.to(this.coreMesh.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.4, ease: "power2.out" });
        } else if (status === 'listening') {
            this.targetAudioIntensity = 0;
            gsap.to(this.coreMesh.scale, { x: 0.95, y: 0.95, z: 0.95, duration: 0.5, ease: "elastic.out(1, 0.5)" });
        } else if (status === 'speaking') {
            gsap.to(this.coreMesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.4 });
        } else { // idle
            this.targetAudioIntensity = 0;
            gsap.to(this.coreMesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.8, ease: "power1.inOut" });
        }
    }

    setAudioIntensity(val) {
        this.targetAudioIntensity = val;
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const time = this.clock.getElapsedTime();

        // 1. Mouse Lerping (Interpolation) for smooth responsive movements
        this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
        this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

        // 2. Parallax camera tilt based on mouse position
        this.camera.position.x = this.mouse.x * 1.8;
        this.camera.position.y = this.mouse.y * 1.8;
        this.camera.lookAt(0, 0, 0);

        // 3. Move point light to track mouse
        this.pointLightFollow.position.set(this.mouse.x * 4, this.mouse.y * 4, 3);

        // 4. Base Rotations
        // Core rotates gently
        let coreRotSpeed = 0.15;
        if (this.status === 'thinking') coreRotSpeed = 1.2;
        if (this.status === 'listening') coreRotSpeed = 0.05;

        this.coreMesh.rotation.y = time * coreRotSpeed;
        this.coreMesh.rotation.x = Math.sin(time * 0.2) * 0.2;

        // Rings rotate in opposite directions
        let ringSpeed1 = 0.3;
        let ringSpeed2 = -0.5;
        if (this.status === 'thinking') { ringSpeed1 = 1.5; ringSpeed2 = -2.2; }
        if (this.status === 'listening') { ringSpeed1 = 0.1; ringSpeed2 = -0.1; }

        this.orbitRing1.rotation.z = time * ringSpeed1;
        this.orbitRing2.rotation.z = time * ringSpeed2;

        // Mouse hover interaction speeds up rings slightly
        if (this.isHovering && this.status === 'idle') {
            this.orbitRing1.rotation.z += 0.02;
            this.orbitRing2.rotation.z -= 0.03;
        }

        // Particle system slow spin
        this.particleSystem.rotation.y = time * 0.03;
        this.particleSystem.rotation.z = time * 0.01;

        // Lerp audio intensity
        this.audioIntensity += (this.targetAudioIntensity - this.audioIntensity) * 0.2;

        // 5. Morph core vertices procedurally using noise formula
        const positionAttr = this.coreGeometry.attributes.position;
        const positions = positionAttr.array;

        let morphSpeed = 1.5;
        let morphAmp = 0.08;

        if (this.status === 'thinking') {
            morphSpeed = 8.0;
            morphAmp = 0.18;
        } else if (this.status === 'listening') {
            morphSpeed = 0.5;
            morphAmp = 0.04;
        } else if (this.status === 'speaking') {
            morphSpeed = 4.0;
            morphAmp = 0.08 + this.audioIntensity * 0.4;
        }

        for (let i = 0; i < positions.length; i += 3) {
            // Get original positions
            const ox = this.originalPositions[i];
            const oy = this.originalPositions[i + 1];
            const oz = this.originalPositions[i + 2];

            // Normalize vector to get direction
            const vx = ox;
            const vy = oy;
            const vz = oz;
            const length = Math.sqrt(vx * vx + vy * vy + vz * vz);
            const nx = vx / length;
            const ny = vy / length;
            const nz = vz / length;

            // Generate noise projection
            // Using a combination of sine/cosine frequencies based on coordinate positions
            const noise = Math.sin(nx * 5.0 + time * morphSpeed) * 
                          Math.cos(ny * 5.0 + time * morphSpeed) * 
                          Math.sin(nz * 5.0 + time * morphSpeed);

            // Apply noise to original position along normal
            positions[i] = ox + nx * noise * morphAmp;
            positions[i + 1] = oy + ny * noise * morphAmp;
            positions[i + 2] = oz + nz * noise * morphAmp;
        }

        // Tell Three.js vertices were updated
        positionAttr.needsUpdate = true;

        this.renderer.render(this.scene, this.camera);
    }
}
