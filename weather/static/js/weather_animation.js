// Weather Animation with Three.js
document.addEventListener('DOMContentLoaded', function() {
    // Check if Three.js is available
    if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded, skipping weather animation');
        return;
    }

    // Initialize scene
    const canvas = document.getElementById('weather-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Create particles
    const particlesCount = 1000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    const sizes = new Float32Array(particlesCount);

    const color1 = new THREE.Color(0x8a2be2); // Purple
    const color2 = new THREE.Color(0x00e5ff); // Teal

    for (let i = 0; i < particlesCount; i++) {
        // Position
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

        // Color
        const mixedColor = color1.clone().lerp(color2, Math.random());
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;

        // Size
        sizes[i] = Math.random() * 5;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Create particle material
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.1,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    // Create particle system
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    // Position camera
    camera.position.z = 5;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Animation loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        // Rotate particle system
        particleSystem.rotation.x = elapsedTime * 0.05;
        particleSystem.rotation.y = elapsedTime * 0.03;

        // Update particle positions for wave effect
        const positions = particles.attributes.position.array;
        for (let i = 0; i < particlesCount; i++) {
            const i3 = i * 3;
            const x = positions[i3];
            const y = positions[i3 + 1];
            const z = positions[i3 + 2];

            // Apply wave effect
            positions[i3 + 1] = y + Math.sin(elapsedTime + x) * 0.01;
            positions[i3] = x + Math.cos(elapsedTime + z) * 0.01;
        }
        particles.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
    }

    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Add glowing orbs
    const glowContainer = document.querySelector('.animated-background');
    if (glowContainer) {
        const glows = [
            { class: 'glow glow-1', top: '20%', left: '10%' },
            { class: 'glow glow-2', top: '60%', right: '10%' },
            { class: 'glow glow-3', bottom: '10%', left: '30%' }
        ];

        glows.forEach(glow => {
            const glowElement = document.createElement('div');
            glowElement.className = glow.class;
            
            // Apply positioning
            Object.keys(glow).forEach(key => {
                if (key !== 'class') {
                    glowElement.style[key] = glow[key];
                }
            });
            
            glowContainer.appendChild(glowElement);
        });
    }
});