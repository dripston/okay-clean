// 3D Earth Animation with Three.js
document.addEventListener('DOMContentLoaded', function() {
    // Check if Three.js is available and properly loaded
    if (typeof THREE === 'undefined') {
        console.error('Three.js not loaded. Please check your script includes.');
        
        // Create a fallback element to show something instead of the 3D animation
        const container = document.querySelector('.animated-background') || document.body;
        const fallbackElement = document.createElement('div');
        fallbackElement.style.cssText = 'width: 100%; height: 300px; background: linear-gradient(135deg, #8a2be2, #00e5ff); border-radius: 10px; display: flex; align-items: center; justify-content: center;';
        fallbackElement.innerHTML = '<h3 style="color: white; text-align: center;">Weather Visualization</h3>';
        container.appendChild(fallbackElement);
        return;
    }

    // Initialize scene
    const canvas = document.getElementById('weather-canvas');
    if (!canvas) {
        console.error('Canvas element not found. Creating one.');
        const container = document.querySelector('.animated-background') || document.body;
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'weather-canvas';
        newCanvas.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0; left: 0;';
        container.appendChild(newCanvas);
        canvas = newCanvas;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Earth parameters
    const earthRadius = 2;
    const earthSegments = 32;
    
    // Create Earth geometry
    const earthGeometry = new THREE.SphereGeometry(earthRadius, earthSegments, earthSegments);
    
    // Load Earth texture
    const textureLoader = new THREE.TextureLoader();
    
    // Create Earth material with custom shader for gradient effect
    const earthMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            baseColor1: { value: new THREE.Color(0x8a2be2) }, // Purple
            baseColor2: { value: new THREE.Color(0x00e5ff) }  // Teal
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vNormal;
            
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 baseColor1;
            uniform vec3 baseColor2;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            
            void main() {
                // Create a gradient based on the y-coordinate of the normal
                float gradient = 0.5 + 0.5 * sin(vUv.y * 5.0 + time * 0.5);
                
                // Mix the two colors based on the gradient
                vec3 color = mix(baseColor1, baseColor2, gradient);
                
                // Add atmosphere effect at the edges
                float atmosphere = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
                color = mix(color, vec3(0.6, 0.8, 1.0), atmosphere * 0.5);
                
                // Add some noise for texture
                float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233)) * 43758.5453));
                color += noise * 0.05;
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        transparent: true
    });

    // Create Earth mesh
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);
    
    // Create atmosphere glow
    const glowGeometry = new THREE.SphereGeometry(earthRadius * 1.2, earthSegments, earthSegments);
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            glowColor: { value: new THREE.Color(0x00e5ff) }
        },
        vertexShader: `
            varying vec3 vNormal;
            
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            varying vec3 vNormal;
            
            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
                gl_FragColor = vec4(glowColor, intensity);
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);
    
    // Add cloud layer
    const cloudGeometry = new THREE.SphereGeometry(earthRadius * 1.02, earthSegments, earthSegments);
    const cloudMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec2 vUv;
            
            // Simple noise function
            float noise(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }
            
            void main() {
                // Create moving cloud patterns
                vec2 uv = vUv;
                uv.x += time * 0.01;
                
                float n = noise(uv * 10.0);
                float cloud = smoothstep(0.4, 0.6, n);
                
                // Only show some areas as clouds
                float threshold = 0.7;
                float alpha = cloud > threshold ? cloud - threshold : 0.0;
                
                gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * 0.3);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(clouds);
    
    // Create a ring around the earth
    const ringGeometry = new THREE.RingGeometry(earthRadius * 1.5, earthRadius * 1.8, 64);
    const ringMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color1: { value: new THREE.Color(0x8a2be2) }, // Purple
            color2: { value: new THREE.Color(0x00e5ff) }  // Teal
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color1;
            uniform vec3 color2;
            varying vec2 vUv;
            
            void main() {
                float angle = atan(vUv.y, vUv.x);
                float normAngle = (angle + 3.14159) / 6.28318;
                
                // Create a moving gradient
                float gradient = fract(normAngle + time * 0.1);
                
                // Mix colors based on the gradient
                vec3 color = mix(color1, color2, gradient);
                
                // Add some variation
                float intensity = 0.5 + 0.5 * sin(time * 2.0 + normAngle * 20.0);
                
                gl_FragColor = vec4(color, intensity * 0.5);
            }
        `,
        side: THREE.DoubleSide,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // Position camera
    camera.position.z = 7;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Animation loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();
        
        // Update shader uniforms
        earthMaterial.uniforms.time.value = elapsedTime;
        cloudMaterial.uniforms.time.value = elapsedTime;
        ringMaterial.uniforms.time.value = elapsedTime;

        // Rotate Earth
        earth.rotation.y = elapsedTime * 0.1;
        clouds.rotation.y = elapsedTime * 0.12;
        
        // Rotate ring
        ring.rotation.z = elapsedTime * 0.05;
        
        // Slightly move the Earth for a floating effect
        earth.position.y = Math.sin(elapsedTime * 0.3) * 0.1;
        clouds.position.y = earth.position.y;
        glow.position.y = earth.position.y;
        ring.position.y = earth.position.y;

        renderer.render(scene, camera);
    }

    animate();

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Add subtle glowing orbs in the background
    const glowContainer = document.querySelector('.animated-background');
    if (glowContainer) {
        // Reduced number of glows for better performance
        const glows = [
            { class: 'glow glow-1', top: '20%', left: '10%', scale: '0.7' },
            { class: 'glow glow-2', top: '60%', right: '10%', scale: '0.9' }
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