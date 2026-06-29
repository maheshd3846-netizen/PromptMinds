document.addEventListener('DOMContentLoaded', () => {
    // Authorization Check
    const nickname = localStorage.getItem('promptmind_nickname');
    if (!nickname) {
        window.location.href = 'index.html';
        return;
    }

    // Greet user
    const nicknameEl = document.getElementById('user-nickname');
    if (nicknameEl) {
        nicknameEl.innerText = nickname;
    }

    // Check for Restored Prompt
    const restoredPrompt = localStorage.getItem('promptmind_restored_prompt');
    if (restoredPrompt) {
        const promptInput = document.getElementById('prompt-input');
        if (promptInput) {
            promptInput.value = restoredPrompt;
            localStorage.removeItem('promptmind_restored_prompt');
        }
    }

    // UI Scale Setup
    const scaleBtn = document.getElementById('ui-scale-btn');
    if (scaleBtn) {
        const savedScale = localStorage.getItem('promptmind_scale');
        if (savedScale === 'large') {
            document.body.classList.add('large-ui');
            scaleBtn.innerHTML = '<i class="fa-solid fa-minimize"></i>';
        }
        
        scaleBtn.addEventListener('click', () => {
            document.body.classList.toggle('large-ui');
            const isLarge = document.body.classList.contains('large-ui');
            localStorage.setItem('promptmind_scale', isLarge ? 'large' : 'normal');
            
            if (isLarge) {
                scaleBtn.innerHTML = '<i class="fa-solid fa-minimize"></i>';
            } else {
                scaleBtn.innerHTML = '<i class="fa-solid fa-maximize"></i>';
            }
            if (typeof playSynthSound === 'function') playSynthSound('click');
        });
    }

    initThreeJSBG();
    initAudioSynth();
    initAmbientDrone();
    initDNAHelix();
    initCyberUpgradeUI();
    initChatLogic();
});

/* =======================================
   THREE.JS NEURAL NETWORK BACKGROUND
======================================= */
function initThreeJSBG() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Parallax tracking
    let mouseX = 0, mouseY = 0;
    let targetCameraX = 0, targetCameraY = 0;

    window.addEventListener('mousemove', (event) => {
        // Map cursor position to a small camera coordinate offset range (-15 to 15)
        mouseX = ((event.clientX - window.innerWidth / 2) / (window.innerWidth / 2)) * 15;
        mouseY = ((event.clientY - window.innerHeight / 2) / (window.innerHeight / 2)) * 15;
    });

    // Particles (Nodes)
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    let speedMultiplier = 1.0;

    for (let i = 0; i < particleCount; i++) {
        // Random positions in a sphere-like shape for a "brain" look
        const r = 30 * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        velocities.push({
            x: (Math.random() - 0.5) * 0.05,
            y: (Math.random() - 0.5) * 0.05,
            z: (Math.random() - 0.5) * 0.05
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x00ffcc,
        size: 0.5,
        transparent: true,
        opacity: 0.8
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Lines connecting nearby nodes
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.15
    });

    // We'll update lines in the animation loop
    const linesGeometry = new THREE.BufferGeometry();
    let linePositions = new Float32Array(particleCount * particleCount * 3);
    linesGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const linesMesh = new THREE.LineSegments(linesGeometry, lineMaterial);
    scene.add(linesMesh);

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        // Smooth camera parallax
        targetCameraX = mouseX;
        targetCameraY = -mouseY;
        camera.position.x += (targetCameraX - camera.position.x) * 0.05;
        camera.position.y += (targetCameraY - camera.position.y) * 0.05;
        camera.lookAt(scene.position);

        const posAttr = particles.geometry.attributes.position;
        const currentPositions = posAttr.array;

        // Move particles
        for (let i = 0; i < particleCount; i++) {
            currentPositions[i * 3] += velocities[i].x * speedMultiplier;
            currentPositions[i * 3 + 1] += velocities[i].y * speedMultiplier;
            currentPositions[i * 3 + 2] += velocities[i].z * speedMultiplier;

            // Simple boundary reflection to keep shape
            if (Math.abs(currentPositions[i * 3]) > 35) velocities[i].x *= -1;
            if (Math.abs(currentPositions[i * 3 + 1]) > 35) velocities[i].y *= -1;
            if (Math.abs(currentPositions[i * 3 + 2]) > 35) velocities[i].z *= -1;
        }
        posAttr.needsUpdate = true;

        // Rotate the whole brain structure slowly
        const rotationSpeed = speedMultiplier > 1 ? 0.012 : 0.002;
        particles.rotation.y += rotationSpeed;
        particles.rotation.x += rotationSpeed * 0.5;
        linesMesh.rotation.y = particles.rotation.y;
        linesMesh.rotation.x = particles.rotation.x;

        // Draw lines between close particles
        let vertexCount = 0;
        const linePosArray = linesMesh.geometry.attributes.position.array;

        for (let i = 0; i < particleCount; i++) {
            for (let j = i + 1; j < particleCount; j++) {
                const p1 = new THREE.Vector3(currentPositions[i * 3], currentPositions[i * 3 + 1], currentPositions[i * 3 + 2]);
                const p2 = new THREE.Vector3(currentPositions[j * 3], currentPositions[j * 3 + 1], currentPositions[j * 3 + 2]);
                const dist = p1.distanceTo(p2);

                if (dist < 8) { // Connection threshold
                    linePosArray[vertexCount++] = p1.x;
                    linePosArray[vertexCount++] = p1.y;
                    linePosArray[vertexCount++] = p1.z;
                    linePosArray[vertexCount++] = p2.x;
                    linePosArray[vertexCount++] = p2.y;
                    linePosArray[vertexCount++] = p2.z;
                }
            }
        }

        linesMesh.geometry.setDrawRange(0, vertexCount / 3);
        linesMesh.geometry.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
    }

    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Expose global function to speed up simulation on fetch
    window.spikeneuralActivity = (active = true) => {
        if (active) {
            speedMultiplier = 3.5;
            material.color.setHex(0xff0055);
            lineMaterial.color.setHex(0xff0055);
            lineMaterial.opacity = 0.45;
        } else {
            speedMultiplier = 1.0;
            material.color.setHex(0x00ffcc);
            lineMaterial.color.setHex(0x00ffcc);
            lineMaterial.opacity = 0.15;
        }
    };
}


/* =======================================
   WEB AUDIO SCI-FI SOUND SYNTHESIZER
   ======================================= */
let audioCtx = null;
let soundEnabled = true;

// Ambient CS-80 'Blade Runner' Synth Brass State
let droneEnabled = false;
let ambientAudioCtx = null;
let ambientGainNode = null;
let lowpassFilter = null;
let oscillators = [];
let vibratoLfo = null;
let currentChordIndex = 0;

const BRASS_CHORDS = [
    [65.41, 130.81, 196.00, 261.63, 293.66], // C2, C3, G3, C4, D4 (Csus2 base)
    [58.27, 116.54, 174.61, 233.08, 277.18], // Bb1, Bb2, F3, Bb3, Db4 (Bbm base)
    [77.78, 155.56, 233.08, 311.13, 349.23], // Eb2, Eb3, Bb3, Eb4, F4 (Ebsus2 base)
    [73.42, 146.83, 220.00, 293.66, 329.63], // D2, D3, A3, D4, E4 (Dsus2 base)
    [65.41, 130.81, 164.81, 196.00, 246.94]  // C2, C3, E3, G3, B3 (Cmaj7 base)
];

function initAmbientDrone() {
    const droneBtn = document.getElementById('drone-toggle-btn');
    if (!droneBtn) return;

    // Sync from localStorage
    const savedDrone = localStorage.getItem('promptmind_drone');
    if (savedDrone === 'true') {
        droneEnabled = true;
        droneBtn.classList.add('active');
        // Because of browser autoplay blocks, start it on first user interaction!
        const startOnInteract = () => {
            if (droneEnabled) startAmbientDrone();
            document.removeEventListener('click', startOnInteract);
            document.removeEventListener('keydown', startOnInteract);
        };
        document.addEventListener('click', startOnInteract);
        document.addEventListener('keydown', startOnInteract);
    }

    droneBtn.addEventListener('click', () => {
        droneEnabled = !droneEnabled;
        localStorage.setItem('promptmind_drone', droneEnabled);
        if (droneEnabled) {
            droneBtn.classList.add('active');
            startAmbientDrone();
        } else {
            droneBtn.classList.remove('active');
            stopAmbientDrone();
        }
        playSynthSound('click');
    });
}

function startAmbientDrone() {
    try {
        if (!ambientAudioCtx) {
            ambientAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (ambientAudioCtx.state === 'suspended') {
            ambientAudioCtx.resume();
        }

        if (oscillators.length > 0) return; // already active

        oscillators = [];
        lowpassFilter = ambientAudioCtx.createBiquadFilter();
        ambientGainNode = ambientAudioCtx.createGain();

        // Resonant Lowpass Filter (The heart of the analog sweep)
        lowpassFilter.type = 'lowpass';
        lowpassFilter.Q.setValueAtTime(4.5, ambientAudioCtx.currentTime);

        const chord = BRASS_CHORDS[currentChordIndex];
        const now = ambientAudioCtx.currentTime;

        // Spawn a detuned sawtooth oscillator cluster for each voice in the chord
        chord.forEach((freq, idx) => {
            const osc = ambientAudioCtx.createOscillator();
            osc.type = 'sawtooth'; // Brass standard
            osc.frequency.setValueAtTime(freq, now);
            // detune spread for lush analog chorus effect
            const detuneAmount = (idx - 2) * 6 + (Math.random() - 0.5) * 4;
            osc.detune.setValueAtTime(detuneAmount, now);
            
            osc.connect(lowpassFilter);
            osc.start();
            oscillators.push(osc);
        });

        // Vibrato: Subtly modulate frequencies using a slow LFO to sound organically analog
        vibratoLfo = ambientAudioCtx.createOscillator();
        const vibratoGain = ambientAudioCtx.createGain();
        vibratoLfo.type = 'sine';
        vibratoLfo.frequency.setValueAtTime(4.8, now); // 4.8 Hz vibrato
        vibratoGain.gain.setValueAtTime(1.5, now); // very subtle pitch shifting (+/- 1.5 cents)
        
        vibratoLfo.connect(vibratoGain);
        oscillators.forEach(osc => vibratoGain.connect(osc.frequency));
        vibratoLfo.start();

        lowpassFilter.connect(ambientGainNode);
        ambientGainNode.connect(ambientAudioCtx.destination);

        // Warm CS-80 Filter & Amplitude Envelope Sweep on power up
        lowpassFilter.frequency.setValueAtTime(120, now);
        lowpassFilter.frequency.exponentialRampToValueAtTime(750, now + 1.2); // attack sweep
        lowpassFilter.frequency.exponentialRampToValueAtTime(260, now + 3.2); // decay/sustain warm hum

        ambientGainNode.gain.setValueAtTime(0.001, now);
        ambientGainNode.gain.linearRampToValueAtTime(0.045, now + 1.2); // attack gain
        ambientGainNode.gain.linearRampToValueAtTime(0.03, now + 3.2);  // sustain volume
    } catch (e) {
        console.warn("Ambient brass failed to start:", e);
    }
}

function stopAmbientDrone() {
    if (!ambientGainNode) return;
    try {
        const now = ambientAudioCtx.currentTime;
        ambientGainNode.gain.cancelScheduledValues(now);
        ambientGainNode.gain.setValueAtTime(ambientGainNode.gain.value, now);
        ambientGainNode.gain.linearRampToValueAtTime(0.001, now + 1.5); // long warm fade out

        setTimeout(() => {
            if (!droneEnabled && oscillators.length > 0) {
                oscillators.forEach(osc => {
                    try { osc.stop(); } catch(e){}
                });
                oscillators = [];
                try { vibratoLfo.stop(); } catch(e){}
                vibratoLfo = null;
                lowpassFilter = null;
                ambientGainNode = null;
            }
        }, 1600);
    } catch (e) {
        console.warn("Ambient brass failed to stop:", e);
    }
}

function triggerChordTransition() {
    if (!droneEnabled || oscillators.length === 0 || !ambientAudioCtx) return;
    try {
        const now = ambientAudioCtx.currentTime;
        
        // Pick a new random chord index
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * BRASS_CHORDS.length);
        } while (nextIndex === currentChordIndex);
        
        currentChordIndex = nextIndex;
        const newChord = BRASS_CHORDS[currentChordIndex];

        // Analog Polyphonic Portamento: glide frequencies over 2.2 seconds
        oscillators.forEach((osc, idx) => {
            if (newChord[idx]) {
                osc.frequency.cancelScheduledValues(now);
                osc.frequency.setValueAtTime(osc.frequency.value, now);
                osc.frequency.exponentialRampToValueAtTime(newChord[idx], now + 2.2);
            }
        });

        // Massive Cinematic CS-80 Sweep (The signature Blade Runner brass swell!)
        if (lowpassFilter && ambientGainNode) {
            lowpassFilter.frequency.cancelScheduledValues(now);
            lowpassFilter.frequency.setValueAtTime(lowpassFilter.frequency.value, now);
            // Sweep cutoff high to open up bright brassy harmonics
            lowpassFilter.frequency.exponentialRampToValueAtTime(1550, now + 0.8);
            // Slowly close filter down to deep warm low frequencies
            lowpassFilter.frequency.exponentialRampToValueAtTime(250, now + 4.5);

            ambientGainNode.gain.cancelScheduledValues(now);
            ambientGainNode.gain.setValueAtTime(ambientGainNode.gain.value, now);
            // Amplitude swell
            ambientGainNode.gain.linearRampToValueAtTime(0.075, now + 0.8);
            // Decay volume back to warm sustain
            ambientGainNode.gain.linearRampToValueAtTime(0.03, now + 4.5);
        }
    } catch (e) {
        console.warn("Failed to trigger brass sweep transition:", e);
    }
}

function initAudioSynth() {
    const synthSoundBtn = document.getElementById('synth-sound-btn');
    if (!synthSoundBtn) return;

    // Load sound state from localStorage
    const savedSound = localStorage.getItem('promptmind_sound');
    if (savedSound === 'false') {
        soundEnabled = false;
        synthSoundBtn.classList.remove('active');
        synthSoundBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    }

    synthSoundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        if (soundEnabled) {
            synthSoundBtn.classList.add('active');
            synthSoundBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            playSynthSound('click');
        } else {
            synthSoundBtn.classList.remove('active');
            synthSoundBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        }
        localStorage.setItem('promptmind_sound', soundEnabled);
    });
}

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSynthSound(type) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        if (type === 'click') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

            osc.start(now);
            osc.stop(now + 0.06);
        } 
        else if (type === 'hover') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);

            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

            osc.start(now);
            osc.stop(now + 0.04);
        }
        else if (type === 'transmit') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.linearRampToValueAtTime(300, now + 0.8);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.linearRampToValueAtTime(800, now + 0.8);

            osc.disconnect(gain);
            osc.connect(filter);
            filter.connect(gain);

            gain.gain.setValueAtTime(0.05, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            osc.start(now);
            osc.stop(now + 0.8);
        }
        else if (type === 'scanComplete') {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.type = 'sine';
            osc2.type = 'triangle';

            osc1.frequency.setValueAtTime(523.25, now); 
            osc1.frequency.setValueAtTime(659.25, now + 0.12); 

            osc2.frequency.setValueAtTime(783.99, now + 0.06); 

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.setValueAtTime(0.1, now + 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

            osc1.start(now);
            osc1.stop(now + 0.6);
            osc2.start(now + 0.06);
            osc2.stop(now + 0.6);
        }
        else if (type === 'inject') {
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);

            filter.type = 'peaking';
            filter.Q.setValueAtTime(10, now);
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(2000, now + 0.5);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            osc.start(now);
            osc.stop(now + 0.5);
        }
        else if (type === 'levelUp') {
            const notes = [261.63, 329.63, 392.00, 523.25];
            notes.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + index * 0.08);

                gain.gain.setValueAtTime(0.08, now + index * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.3);

                osc.start(now + index * 0.08);
                osc.stop(now + index * 0.08 + 0.35);
            });
        }
        else if (type === 'alert') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(554.37, now + 0.08);
            osc.frequency.setValueAtTime(659.25, now + 0.16);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.setValueAtTime(0.08, now + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            osc.start(now);
            osc.stop(now + 0.5);
        }
    } catch (e) {
        console.warn('Audio synthesis warning:', e);
    }
}

/* =======================================
   HTML5 CANVAS 3D DNA HELIX RENDERER
   ======================================= */
let dnaHelixState = {
    rotation: 0,
    speed: 0.015,
    targetSpeed: 0.015,
    color: '#ff3366',
    synthesizedCount: 0,
    role: false,
    task: false,
    constraints: false,
    context: false,
    format: false
};

function initDNAHelix() {
    const canvas = document.getElementById('dna-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        dnaHelixState.speed += (dnaHelixState.targetSpeed - dnaHelixState.speed) * 0.05;
        dnaHelixState.rotation += dnaHelixState.speed;
        
        const count = 10; 
        const width = canvas.width;
        const height = canvas.height;
        const radius = width * 0.32;
        
        const blockMapping = {
            1: { name: "ROLE", key: "role" },
            3: { name: "TASK", key: "task" },
            5: { name: "CONSTR", key: "constraints" },
            7: { name: "CONTEXT", key: "context" },
            9: { name: "FORMAT", key: "format" }
        };

        for (let i = 0; i < count; i++) {
            const y = 20 + (i / (count - 1)) * (height - 40);
            const angle = dnaHelixState.rotation + (y * 0.025);
            
            const x1 = (width / 2) + Math.sin(angle) * radius;
            const x2 = (width / 2) - Math.sin(angle) * radius;
            
            const z1 = Math.cos(angle);
            const z2 = -Math.cos(angle);
            
            let baseColor = dnaHelixState.color;
            let isActive = false;
            let isBlockNode = false;
            let blockName = "";

            if (blockMapping[i]) {
                isBlockNode = true;
                const blockKey = blockMapping[i].key;
                blockName = blockMapping[i].name;
                isActive = !!dnaHelixState[blockKey];
                baseColor = isActive ? "#00ff66" : "#ff3366";
            } else {
                baseColor = dnaHelixState.color;
            }

            ctx.shadowBlur = isActive ? 12 : (isBlockNode ? 4 : 8);
            ctx.shadowColor = baseColor;
            
            ctx.beginPath();
            if (isBlockNode) {
                ctx.strokeStyle = isActive ? `rgba(0, 255, 102, ${0.3 + Math.abs(z1)*0.2})` : `rgba(255, 51, 102, 0.15)`;
                ctx.lineWidth = isActive ? 2.5 : 1.0;
                if (!isActive) {
                    ctx.setLineDash([2, 2]); 
                }
            } else {
                ctx.strokeStyle = `rgba(${hexToRgb(baseColor)}, ${0.1 + Math.abs(z1 + z2)*0.08})`;
                ctx.lineWidth = 1.0;
                ctx.setLineDash([]);
            }
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
            ctx.setLineDash([]); 

            // Node 1
            const r1 = (isBlockNode ? 5 : 3) + (z1 + 1) * 1.5;
            ctx.beginPath();
            if (isBlockNode) {
                ctx.fillStyle = isActive ? (z1 > 0 ? "#00ff66" : "#00aa44") : (z1 > 0 ? "#ff3366" : "rgba(120, 30, 50, 0.3)");
            } else {
                ctx.fillStyle = z1 > 0 ? baseColor : 'rgba(80, 80, 80, 0.4)';
            }
            ctx.arc(x1, y, r1, 0, 2 * Math.PI);
            ctx.fill();
            
            // Node 2
            const r2 = (isBlockNode ? 5 : 3) + (z2 + 1) * 1.5;
            ctx.beginPath();
            if (isBlockNode) {
                ctx.fillStyle = isActive ? (z2 > 0 ? "#00ff66" : "#00aa44") : (z2 > 0 ? "#ff3366" : "rgba(120, 30, 50, 0.3)");
            } else {
                ctx.fillStyle = z2 > 0 ? baseColor : 'rgba(80, 80, 80, 0.4)';
            }
            ctx.arc(x2, y, r2, 0, 2 * Math.PI);
            ctx.fill();

            // Labeled text
            if (isBlockNode && z1 > z2) {
                ctx.shadowBlur = 0;
                ctx.fillStyle = isActive ? "#00ff66" : "#ff3366";
                ctx.font = "bold 8px 'Share Tech Mono', monospace";
                const textX = x1 > x2 ? x1 + 10 : x2 + 10;
                if (textX < width - 5) {
                    ctx.fillText(`${blockName} ${isActive ? '✔' : '✖'}`, textX, y + 3);
                }
            }
        }
        
        requestAnimationFrame(draw);
    }
    
    draw();
}

function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 51, 102';
}

function updateDNAHelixCanvas(count, dnaData) {
    dnaHelixState.synthesizedCount = count;
    if (dnaData) {
        dnaHelixState.role = !!(dnaData.role && dnaData.role.present);
        dnaHelixState.task = !!(dnaData.task && dnaData.task.present);
        dnaHelixState.constraints = !!(dnaData.constraints && dnaData.constraints.present);
        dnaHelixState.context = !!(dnaData.context && dnaData.context.present);
        dnaHelixState.format = !!(dnaData.format && dnaData.format.present);
    }

    const glowEl = document.getElementById('dna-status-glow');
    
    if (count === 0) {
        dnaHelixState.targetSpeed = 0.015;
        dnaHelixState.color = '#ff3366';
        if (glowEl) {
            glowEl.style.background = '#ff3366';
            glowEl.style.boxShadow = '0 0 10px #ff3366';
        }
    } else if (count <= 2) {
        dnaHelixState.targetSpeed = 0.03;
        dnaHelixState.color = '#ffaa00';
        if (glowEl) {
            glowEl.style.background = '#ffaa00';
            glowEl.style.boxShadow = '0 0 10px #ffaa00';
        }
    } else if (count <= 4) {
        dnaHelixState.targetSpeed = 0.055;
        dnaHelixState.color = '#00f0ff';
        if (glowEl) {
            glowEl.style.background = '#00f0ff';
            glowEl.style.boxShadow = '0 0 10px #00f0ff';
        }
    } else {
        dnaHelixState.targetSpeed = 0.09;
        dnaHelixState.color = '#00ff66';
        if (glowEl) {
            glowEl.style.background = '#00ff66';
            glowEl.style.boxShadow = '0 0 15px #00ff66';
        }
    }
}

/* =======================================
   AI VOCAL BRIEFING (SPEECH SYNTHESIS)
   ======================================= */
let currentBriefingText = "";

function speakVocalBriefing() {
    if (!currentBriefingText) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentBriefingText);
    
    const voices = window.speechSynthesis.getVoices();
    const roboticVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Robot') || v.name.includes('Zira')));
    if (roboticVoice) {
        utterance.voice = roboticVoice;
    }
    
    utterance.pitch = 0.85; 
    utterance.rate = 1.05;  
    utterance.volume = 0.8;
    
    window.speechSynthesis.speak(utterance);
}

/* =======================================
   PROMPT TIME MACHINE (localStorage HISTORY)
   ======================================= */
let promptHistory = [];

function initHistoryTimeline() {
    const historyToggleBtn = document.getElementById('history-toggle-btn');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyDrawer = document.getElementById('history-drawer');
    
    if (historyToggleBtn && historyDrawer) {
        historyToggleBtn.addEventListener('click', () => {
            playSynthSound('click');
            historyDrawer.classList.toggle('closed');
            renderHistoryTimeline();
        });
    }
    
    if (closeHistoryBtn && historyDrawer) {
        closeHistoryBtn.addEventListener('click', () => {
            playSynthSound('click');
            historyDrawer.classList.add('closed');
        });
    }
    
    try {
        const saved = localStorage.getItem('promptmind_history');
        if (saved) {
            promptHistory = JSON.parse(saved);
        }
    } catch (e) {
        console.error('History load error:', e);
    }
}

function savePromptToHistory(prompt, score, payload) {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const entry = {
        prompt,
        score,
        payload,
        time: timeString,
        timestamp: Date.now()
    };
    
    if (promptHistory.length > 0 && promptHistory[0].prompt === prompt) {
        return;
    }
    
    promptHistory.unshift(entry);
    if (promptHistory.length > 30) {
        promptHistory.pop();
    }
    
    try {
        localStorage.setItem('promptmind_history', JSON.stringify(promptHistory));
    } catch (e) {
        console.error('History save error:', e);
    }
}

function renderHistoryTimeline() {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    if (promptHistory.length === 0) {
        listEl.innerHTML = '<p class="empty-history-text">No timeline recordings found in this neural sequence.</p>';
        return;
    }
    
    promptHistory.forEach((entry, idx) => {
        const card = document.createElement('div');
        card.className = 'history-card';
        
        let scoreClass = 'low';
        if (entry.score >= 75) scoreClass = 'high';
        else if (entry.score >= 40) scoreClass = 'mid';
        
        card.innerHTML = `
            <div class="history-card-top">
                <span class="history-time"><i class="fa-regular fa-clock"></i> ${entry.time}</span>
                <span class="history-score-badge ${scoreClass}">${entry.score}/100</span>
            </div>
            <div class="history-prompt-preview">${escapeHtml(entry.prompt)}</div>
        `;
        
        card.addEventListener('mouseenter', () => {
            playSynthSound('hover');
        });
        
        card.addEventListener('click', () => {
            playSynthSound('click');
            const promptInput = document.getElementById('prompt-input');
            if (promptInput) {
                promptInput.value = entry.prompt;
            }
            
            updateDashboard(entry.payload, entry.prompt);
            document.getElementById('history-drawer').classList.add('closed');
        });
        
        listEl.appendChild(card);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* =======================================
   COGNITIVE ACHIEVEMENTS & GAMIFICATION
   ======================================= */
let unlockedAchievements = [];

function initAchievements() {
    try {
        const saved = localStorage.getItem('promptmind_achievements');
        if (saved) {
            unlockedAchievements = JSON.parse(saved);
            
            unlockedAchievements.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.remove('locked');
                    el.classList.add('unlocked');
                }
            });
        }
    } catch (e) {
        console.error('Achievements load error:', e);
    }
}

function checkAndUnlockAchievement(id, title, desc) {
    if (unlockedAchievements.includes(id)) return;
    
    unlockedAchievements.push(id);
    try {
        localStorage.setItem('promptmind_achievements', JSON.stringify(unlockedAchievements));
    } catch (e) {
        console.error('Achievements save error:', e);
    }
    
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('locked');
        el.classList.add('unlocked');
    }
    
    playSynthSound('levelUp');
    showAchievementPopup(title, desc);
}

function showAchievementPopup(title, desc) {
    const existing = document.querySelector('.achievement-popup');
    if (existing) {
        existing.remove();
    }
    
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `
        <div class="popup-icon"><i class="fa-solid fa-circle-check"></i></div>
        <div class="popup-text">
            <span class="popup-badge"><i class="fa-solid fa-trophy"></i> ACHIEVEMENT UNLOCKED</span>
            <span class="popup-title">${title}</span>
            <p style="font-size: 0.72rem; color: #9db4c0; margin: 0;">${desc}</p>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => {
            popup.remove();
        }, 500);
    }, 4500);
}

/* =======================================
   PROMPT ARCHITECT RANK HUD
   ======================================= */
let currentRankClass = "novice";

function updateUserRank(score) {
    const badgeEl = document.getElementById('rank-badge');
    if (!badgeEl) return;
    
    let rankText = "NOVICE SCRIBE";
    let rankClass = "novice";
    
    if (score >= 90) {
        rankText = "PROMPT OVERLORD";
        rankClass = "overlord";
    } else if (score >= 75) {
        rankText = "SEMANTIC ARCHITECT";
        rankClass = "architect";
    } else if (score >= 60) {
        rankText = "COGNITIVE ENGINEER";
        rankClass = "engineer";
    } else if (score >= 40) {
        rankText = "SYNTACTIC APPRENTICE";
        rankClass = "apprentice";
    }
    
    if (rankClass !== currentRankClass) {
        const ranksOrder = ['novice', 'apprentice', 'engineer', 'architect', 'overlord'];
        if (ranksOrder.indexOf(rankClass) > ranksOrder.indexOf(currentRankClass)) {
            playSynthSound('levelUp');
            showAchievementPopup("Rank Promoted!", `You are now a ${rankText}`);
        }
        currentRankClass = rankClass;
    }
    
    badgeEl.innerText = rankText;
    badgeEl.className = `rank-badge ${rankClass}`;
}

/* =======================================
   DNA AUTO-INJECTION INTERFACE
   ======================================= */
function setupDNAAutoInjection(originalPrompt, data) {
    const dnaListEl = document.getElementById('dna-list');
    if (!dnaListEl) return;
    
    const injectButtons = dnaListEl.querySelectorAll('.inject-btn');
    injectButtons.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const blockType = newBtn.getAttribute('data-block');
            const blockObj = (data.dna && data.dna[blockType]) || {};
            const feedback = blockObj.feedback || "Improve this missing block structure.";
            
            newBtn.disabled = true;
            newBtn.classList.add('loading');
            newBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SYNTHESIZING...';
            
            playSynthSound('click');
            
            try {
                const response = await fetch('/inject-block', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: originalPrompt,
                        blockType: blockType,
                        blockFeedback: feedback
                    })
                });
                
                if (!response.ok) throw new Error("Failed to auto-inject block");
                
                const injectData = await response.json();
                const textToInject = injectData.blockText;
                
                if (textToInject) {
                    playSynthSound('inject');
                    const promptInput = document.getElementById('prompt-input');
                    if (promptInput) {
                        let basePrompt = promptInput.value.trim();
                        if (basePrompt === "") {
                            basePrompt = originalPrompt;
                        }
                        
                        promptInput.value = basePrompt;
                        promptInput.focus();
                        
                        const appendPrefix = `\n\n# ${blockType.toUpperCase()}:\n`;
                        const fullAppendText = appendPrefix + textToInject;
                        
                        let i = 0;
                        function typeAppend() {
                            if (i < fullAppendText.length) {
                                promptInput.value += fullAppendText.charAt(i);
                                i++;
                                promptInput.scrollTop = promptInput.scrollHeight;
                                setTimeout(typeAppend, 10);
                            } else {
                                const submitBtn = document.getElementById('submit-btn');
                                if (submitBtn) {
                                    submitBtn.click();
                                }
                            }
                        }
                        typeAppend();
                    }
                }
            } catch (error) {
                console.error("Auto-inject error:", error);
                alert("Neural synthesis of missing block failed. Please try again.");
                newBtn.disabled = false;
                newBtn.classList.remove('loading');
                newBtn.innerHTML = `<i class="fa-solid fa-syringe"></i> AUTO-INJECT`;
            }
        });
    });
}

/* =======================================
   CYBER-UPGRADE UI INITIALIZATION
   ======================================= */
function initCyberUpgradeUI() {
    initHistoryTimeline();
    initAchievements();
    
    // Add sounds on common button clicks/hovers
    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('.cyber-btn, .preset-chip, .word, .hud-chip, .inject-btn, .history-card');
        if (target && !target.dataset.soundBound) {
            target.dataset.soundBound = 'true';
            target.addEventListener('mouseenter', () => {
                playSynthSound('hover');
            });
            target.addEventListener('click', () => {
                playSynthSound('click');
            });
        }
    });

    const vocalBtn = document.getElementById('vocal-brief-btn');
    if (vocalBtn) {
        vocalBtn.addEventListener('click', () => {
            speakVocalBriefing();
        });
    }
}


/* =======================================
   CHAT & UI LOGIC
   ======================================= */

// Cyber Prompt Presets Definition
const promptPresets = {
    'code-architect': 'Act as an expert software architect. Analyze the performance, security, and scalability of a Python-based microservice that handles real-time WebSockets and database transactions.',
    'cot-reasoning': 'I have a complex decision to make. Let\'s think step by step to evaluate whether we should migrate our monolithic database to a distributed architecture. Outline the pros, cons, risk factors, and migration strategy clearly.',
    'creative-writer': 'Write a compelling, hard sci-fi opening scene about an astronaut who discovers a gravitational anomaly in their spacecraft\'s engine bay. Use highly technical terminology, deep suspense, and sensory details.',
    'persona-roleplay': 'You are a Senior Security Auditor at a top-tier cybersecurity firm. Audit this smart contract for potential reentrancy vulnerabilities, overflow errors, and design anti-patterns. Provide a threat assessment model.'
};

let voiceInputUsed = false;

function initChatLogic() {
    const promptInput = document.getElementById('prompt-input');
    const submitBtn = document.getElementById('submit-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const chatHistory = document.getElementById('chat-history');

    // Remove typing indicator from initial load after a brief delay
    setTimeout(() => {
        const initMsg = document.querySelector('.typing-indicator');
        if (initMsg) {
            initMsg.classList.remove('typing-indicator');
            initMsg.parentElement.innerHTML = '<p>System initialized. Awaiting user input. Type a prompt below or use voice command to begin evaluation sequence.</p>';
        }
    }, 1500);

    // --- Preset Chips Typing Animation ---
    const presetChips = document.querySelectorAll('.preset-chip');
    presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const key = chip.getAttribute('data-archetype');
            if (promptPresets[key]) {
                promptInput.value = '';
                const text = promptPresets[key];
                let i = 0;
                promptInput.focus();
                function typeInput() {
                    if (i < text.length) {
                        promptInput.value += text.charAt(i);
                        i++;
                        setTimeout(typeInput, 8);
                    }
                }
                typeInput();
            }
        });
    });

    // --- Speech Recognition ---
    let recognition;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            voiceBtn.classList.add('recording');
            promptInput.placeholder = "Listening to neural vocalization...";
            voiceInputUsed = true;
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            promptInput.value = transcript;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
        };

        recognition.onend = () => {
            voiceBtn.classList.remove('recording');
            promptInput.placeholder = "Initiate prompt sequence here...";
            if (promptInput.value.trim() !== '') {
                handleSubmit();
            }
        };

        voiceBtn.addEventListener('click', () => {
            if (voiceBtn.classList.contains('recording')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    } else {
        voiceBtn.style.display = 'none'; // Hide if unsupported
    }

    // --- Chat Submission ---
    submitBtn.addEventListener('click', handleSubmit);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    });

    async function handleSubmit() {
        const text = promptInput.value.trim();
        if (!text) return;

        // Hide Lexical HUD on new analysis sequence
        document.getElementById('lexical-hud').classList.add('hidden');

        // 1. Display User Message
        appendMessage('user', text);
        promptInput.value = '';

        // 2. Display loading state
        showLoading(true);
        if (window.spikeneuralActivity) window.spikeneuralActivity(true);
        playSynthSound('transmit');

        // 3. Make API Call
        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
            });

            if (!response.ok) {
                throw new Error("Neural server disconnected or error occurred.");
            }

            const data = await response.json();

            // 4. Update UI with results
            updateDashboard(data, text);
            appendMessage('ai', data.chatbot_response, true); // true for typing effect

        } catch (error) {
            appendMessage('ai', `[ERROR]: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    function appendMessage(role, text, typeEffect = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}-message`;

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.innerHTML = role === 'ai' ? '<i class="fa-solid fa-robot"></i>' : '<i class="fa-solid fa-user-astronaut"></i>';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';

        const p = document.createElement('p');

        if (typeEffect && role === 'ai') {
            const formattedHTML = renderMarkdown(text);
            
            const plainText = text.replace(/[*`#_\-]/g, '');
            let i = 0;
            const speed = 15; 
            p.classList.add('typing');
            contentDiv.appendChild(p);
            msgDiv.appendChild(avatarDiv);
            msgDiv.appendChild(contentDiv);
            chatHistory.appendChild(msgDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;

            function typeWriter() {
                if (i < plainText.length) {
                    const chars = plainText.substr(i, 3);
                    p.innerHTML += chars;
                    i += chars.length;
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                    setTimeout(typeWriter, speed);
                } else {
                    p.classList.remove('typing');
                    p.innerHTML = formattedHTML; 
                    addSpeakerBtn(contentDiv, text);
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                }
            }
            typeWriter();

        } else {
            p.innerHTML = renderMarkdown(text);
            contentDiv.appendChild(p);
            if (role === 'ai') {
                addSpeakerBtn(contentDiv, text);
            }
            msgDiv.appendChild(avatarDiv);
            msgDiv.appendChild(contentDiv);
            chatHistory.appendChild(msgDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }
    }

    function addSpeakerBtn(contentDiv, text) {
        const speakerBtn = document.createElement('button');
        speakerBtn.className = 'message-audio-btn';
        speakerBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i> SPEAK';
        speakerBtn.addEventListener('click', () => {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text.replace(/[*`#_\-]/g, ''));
            const voices = window.speechSynthesis.getVoices();
            const roboticVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Robot') || v.name.includes('Zira')));
            if (roboticVoice) utterance.voice = roboticVoice;
            utterance.pitch = 0.9;
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        });
        contentDiv.appendChild(speakerBtn);
    }

    function showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        const btn = document.getElementById('submit-btn');
        if (show) {
            overlay.classList.remove('hidden');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        } else {
            overlay.classList.add('hidden');
            btn.disabled = false;
            btn.innerHTML = 'TRANSMIT <i class="fa-solid fa-paper-plane"></i>';
            if (window.spikeneuralActivity) window.spikeneuralActivity(false);
        }
    }

    // --- Clipboard Copy Binding ---
    document.addEventListener('click', async (e) => {
        const copyBtn = e.target.closest('.copy-btn');
        if (copyBtn) {
            const targetId = copyBtn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl && targetEl.textContent && targetEl.textContent !== '...') {
                try {
                    await navigator.clipboard.writeText(targetEl.textContent);
                    const originalIcon = copyBtn.innerHTML;
                    copyBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #00ff66;"></i>';
                    setTimeout(() => {
                        copyBtn.innerHTML = originalIcon;
                    }, 1500);
                } catch (err) {
                    console.error('Failed to copy text: ', err);
                }
            }
        }
    });

    // --- Markdown Export Suite Binding ---
    document.addEventListener('click', (e) => {
        const exportBtn = e.target.closest('#export-md-btn');
        if (exportBtn) {
            const originalPrompt = document.getElementById('evolve-original').textContent;
            const improvedPrompt = document.getElementById('evolve-improved').textContent;
            const expertPrompt = document.getElementById('evolve-expert').textContent;
            const scoreText = document.getElementById('score-text').textContent;
            const aiResponseP = document.querySelector('.chat-history .message.ai-message:last-child .content p');
            const responseText = aiResponseP ? aiResponseP.innerText : "Awaiting transmission.";
            
            if (originalPrompt === '...') {
                alert('No engineered prompt sequence available to export yet. Please scan a prompt first.');
                return;
            }

            const mdContent = `# PromptMind Engineering Report

## Prompt Intelligence Metrics
- **Master Intelligence Score**: ${scoreText}/100

---

## 1. Original Prompt (v1.0.alpha)
\`\`\`text
${originalPrompt}
\`\`\`

---

## 2. Improved Prompt (v2.0.beta)
\`\`\`text
${improvedPrompt}
\`\`\`

---

## 3. Expert Prompt (v3.0.omega)
\`\`\`text
${expertPrompt}
\`\`\`

---

## 4. Chatbot Response to Expert Prompt
> ${responseText}

---
*Report generated by PromptMind AI Neural Interface.*
`;

            const blob = new Blob([mdContent], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'PromptMind_Evolved_Prompt_Suite.md';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    });

    // --- Close Lexical HUD Button Binding ---
    const hudClose = document.getElementById('hud-close');
    if (hudClose) {
        hudClose.addEventListener('click', () => {
            document.getElementById('lexical-hud').classList.add('hidden');
        });
    }
}

/* =======================================
   DASHBOARD UPDATES (Score, Heatmap, Evo)
   ======================================= */
function updateDashboard(data, originalPrompt) {
    triggerChordTransition();
    // 1. Update Master Score
    const scoreFill = document.getElementById('score-fill');
    const scoreText = document.getElementById('score-text');
    const scoreFeedback = document.getElementById('score-feedback');

    // Animate master score
    let currentScore = parseInt(scoreText.innerText) || 0;
    const targetScore = data.score || 0;

    scoreFill.style.width = `${targetScore}%`;

    if (targetScore < 40) scoreFill.style.background = '#ff3366';
    else if (targetScore < 75) scoreFill.style.background = '#ffaa00';
    else scoreFill.style.background = '#00ff66';

    const scoreInterval = setInterval(() => {
        if (currentScore < targetScore) currentScore++;
        else if (currentScore > targetScore) currentScore--;
        else clearInterval(scoreInterval);
        scoreText.innerText = currentScore;
    }, 20);

    // Feedback summary (using clarity feedback text)
    const clarityObj = (data.analysis && data.analysis.clarity) || {};
    scoreFeedback.innerText = clarityObj.feedback || "Neural analysis successfully compiled.";
    scoreFeedback.classList.remove('muted');

    // 2. Staggered Visual Criteria Meters Animation
    const criteriaKeys = ['clarity', 'specificity', 'structure', 'context', 'instruction_strength'];
    criteriaKeys.forEach((key, idx) => {
        setTimeout(() => {
            const crit = (data.analysis && data.analysis[key]) || { score: 0, feedback: "Pending..." };
            const fillEl = document.getElementById(`${key}-fill`);
            const valEl = document.getElementById(`${key}-value`);
            const feedEl = document.getElementById(`${key}-feedback`);
            
            if (fillEl) fillEl.style.width = `${crit.score || 0}%`;
            if (valEl) valEl.innerText = `${crit.score || 0}%`;
            if (feedEl) {
                feedEl.innerText = crit.feedback || "Scan completed.";
                feedEl.style.opacity = '1';
            }
        }, idx * 120); // sequential stagger of 120ms
    });

    // 3. Render Heatmap and Wire Interactions
    const heatmapContainer = document.getElementById('heatmap-container');
    heatmapContainer.innerHTML = ''; // clear

    if (data.heatmap && Array.isArray(data.heatmap)) {
        data.heatmap.forEach(item => {
            const span = document.createElement('span');
            span.textContent = item.word;
            span.className = `word ${item.type || 'neutral'}`;
            
            if (item.type === 'weak' || item.type === 'strong') {
                span.title = "Click to analyze word diagnostics";
                span.addEventListener('click', (e) => {
                    e.stopPropagation();
                    triggerLexicalHUD(item);
                });
                span.addEventListener('mouseenter', () => {
                    triggerLexicalHUD(item);
                });
            }
            
            heatmapContainer.appendChild(span);
            // Append visual spacer
            heatmapContainer.appendChild(document.createTextNode(' '));
        });
    } else {
        heatmapContainer.innerText = "No heatmap data available.";
    }

    // 4. Update Evolution Text
    const evoOriginal = document.getElementById('evolve-original');
    const evoImproved = document.getElementById('evolve-improved');
    const evoExpert = document.getElementById('evolve-expert');

    evoOriginal.textContent = originalPrompt;
    evoOriginal.classList.remove('empty');

    if (data.evolution) {
        evoImproved.textContent = data.evolution.improved || "...";
        evoImproved.classList.remove('empty');

        evoExpert.textContent = data.evolution.expert || "...";
        evoExpert.classList.remove('empty');
    }

    // =======================================
    // COGNITIVE UPGRADE UPDATES
    // =======================================

    // A. Update DNA Synthesizer
    let synthesizedCount = 0;
    const blocks = ['role', 'task', 'constraints', 'context', 'format'];
    blocks.forEach(block => {
        const itemEl = document.getElementById(`dna-${block}`);
        if (itemEl) {
            const blockObj = (data.dna && data.dna[block]) || {};
            const badgeEl = itemEl.querySelector('.dna-badge');
            const feedbackEl = itemEl.querySelector('.dna-feedback');
            const btnEl = itemEl.querySelector('.inject-btn');
            
            if (blockObj.present) {
                synthesizedCount++;
                itemEl.classList.add('synthesized');
                if (badgeEl) {
                    badgeEl.className = 'dna-badge synthesized';
                    badgeEl.innerText = 'SYNTHESIZED';
                }
                if (btnEl) btnEl.classList.add('hidden');
                if (feedbackEl) feedbackEl.innerText = blockObj.text || "Component successfully integrated.";
            } else {
                itemEl.classList.remove('synthesized');
                if (badgeEl) {
                    badgeEl.className = 'dna-badge missing';
                    badgeEl.innerText = 'MISSING';
                }
                if (btnEl) btnEl.classList.remove('hidden');
                if (feedbackEl) feedbackEl.innerText = blockObj.feedback || "Inject segment to increase scores.";
            }
        }
    });

    // Update Canvas Helix Color/Speed & Active States
    updateDNAHelixCanvas(synthesizedCount, data.dna);

    // Setup Click Actions for Injection
    setupDNAAutoInjection(originalPrompt, data);

    // B. Update Model Suitability Matrix
    const models = ['gemini_pro', 'gemini_flash', 'gpt_4o', 'claude_sonnet'];
    models.forEach(model => {
        const cardEl = document.getElementById(`model-${model}`);
        if (cardEl) {
            const modelObj = (data.benchmark && data.benchmark[model]) || { score: 0, suitability: "Awaiting scan data..." };
            const scoreEl = cardEl.querySelector('.model-suit-score');
            const fillEl = cardEl.querySelector('.model-bar-fill');
            const evalEl = cardEl.querySelector('.model-evaluation');
            
            if (scoreEl) scoreEl.innerText = `${modelObj.score}%`;
            if (fillEl) fillEl.style.width = `${modelObj.score}%`;
            if (evalEl) evalEl.innerText = modelObj.suitability;
        }
    });

    // C. Update Rank Badge
    updateUserRank(data.score);

    // D. Enable AI Vocal Briefing Button & Set Briefing Text
    const vocalBtn = document.getElementById('vocal-brief-btn');
    if (vocalBtn) {
        vocalBtn.disabled = false;
        vocalBtn.classList.add('active');
    }

    let highestPriorityFeedback = "your prompt structural layers are fully integrated.";
    const missingBlock = blocks.find(b => data.dna && data.dna[b] && !data.dna[b].present);
    if (missingBlock) {
        highestPriorityFeedback = `highest priority recommendation: inject a ${missingBlock} block.`;
    }
    
    currentBriefingText = `Neural scan complete. Master Prompt Intelligence Meter is at ${data.score} percent. ${highestPriorityFeedback}`;

    // E. Save to history revisions list
    savePromptToHistory(originalPrompt, data.score, data);

    // F. Check Achievements milestones
    if (synthesizedCount === 5) {
        checkAndUnlockAchievement('ach-five-fold', 'Five-Fold DNA', 'Perfect structural DNA reached across all five core components.');
    }
    
    const weakWordCount = (data.heatmap || []).filter(item => item.type === 'weak').length;
    if (weakWordCount === 0 && data.heatmap && data.heatmap.length > 0) {
        checkAndUnlockAchievement('ach-lexical-purist', 'Lexical Purist', 'Successfully audited a prompt sequence with zero weak lexical choices.');
    }
    
    if (data.score >= 90) {
        checkAndUnlockAchievement('ach-quantum', 'Prompt Overlord', 'Reached cognitive synthesis with a master Intelligence Score above 90.');
    }
    
    if (voiceInputUsed) {
        checkAndUnlockAchievement('ach-vocalizer', 'Vocalizer', 'Initiated prompt neural sequence via synthesized voice input.');
        voiceInputUsed = false; // reset flag
    }

    // G. Play scan complete chime
    playSynthSound('scanComplete');
}

// --- Trigger Lexical Diagnosis Panel ---
function triggerLexicalHUD(item) {
    const hud = document.getElementById('lexical-hud');
    const wordText = document.getElementById('hud-word');
    const typeBadge = document.getElementById('hud-word-type');
    const reasonText = document.getElementById('hud-reason');
    const suggestionsWrapper = document.getElementById('hud-suggestions-wrapper');
    const suggestionsDiv = document.getElementById('hud-suggestions');

    if (!hud) return;

    hud.classList.remove('hidden');
    wordText.innerText = item.word;

    // Reset badges
    typeBadge.className = 'hud-word-badge';
    if (item.type === 'weak') {
        typeBadge.classList.add('weak');
        typeBadge.innerHTML = `<span id="hud-word">${item.word}</span> <i class="fa-solid fa-triangle-exclamation"></i> WEAK VERB`;
        reasonText.innerText = item.reason || "Vague word choice. Restricts clarity and structural authority.";
        suggestionsWrapper.style.display = 'flex';

        suggestionsDiv.innerHTML = '';
        if (item.suggested && Array.isArray(item.suggested)) {
            item.suggested.forEach(s => {
                const chip = document.createElement('span');
                chip.className = 'hud-chip';
                chip.innerText = s;
                chip.addEventListener('click', () => {
                    injectQuickFix(item.word, s);
                });
                suggestionsDiv.appendChild(chip);
            });
        } else {
            suggestionsDiv.innerHTML = '<span class="muted">No direct suggestions loaded.</span>';
        }
    } else if (item.type === 'strong') {
        typeBadge.classList.add('strong');
        typeBadge.innerHTML = `<span id="hud-word">${item.word}</span> <i class="fa-solid fa-circle-check"></i> LEXICAL DIRECTIVE`;
        reasonText.innerText = item.reason || "Excellent precise choice. Boosts instruction strength and context weight.";
        suggestionsWrapper.style.display = 'none';
    }
}

// --- Replace Lexical Word inside Input Terminal ---
function injectQuickFix(oldWord, newWord) {
    const promptInput = document.getElementById('prompt-input');
    if (!promptInput) return;

    const currentVal = promptInput.value;
    const regex = new RegExp(`\\b${oldWord}\\b`, 'gi');
    
    if (regex.test(currentVal)) {
        promptInput.value = currentVal.replace(regex, newWord);
    } else {
        promptInput.value = currentVal.replace(oldWord, newWord);
    }

    // Interactive confirmation glow
    promptInput.style.borderColor = '#00ff66';
    promptInput.style.boxShadow = '0 0 15px rgba(0, 255, 102, 0.5)';
    setTimeout(() => {
        promptInput.style.borderColor = '';
        promptInput.style.boxShadow = '';
    }, 600);

    // Hide HUD
    document.getElementById('lexical-hud').classList.add('hidden');
}

// --- High-fidelity Markdown-to-HTML parser with Interactive SVG & Table HUDs ---
function renderMarkdown(text) {
    if (!text) return '';

    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Inline SVG Detector (re-escape the safe SVG tags)
    html = html.replace(/```(?:xml|html|svg)\n([\s\S]*?)```/g, (match, code) => {
        const decoded = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        if (decoded.trim().startsWith('<svg') || decoded.trim().includes('<svg')) {
            return `<div class="multimedia-container svg-diagram-container">
                        <div class="multimedia-header"><i class="fa-solid fa-shapes"></i> Rendered Cognitive Diagram</div>
                        <div class="svg-render-area">${decoded}</div>
                    </div>`;
        }
        return match;
    });

    // Standard Code blocks: ```lang \n code ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const uniqueId = 'code-' + Math.random().toString(36).substr(2, 9);
        const runBtn = (lang === 'html' || lang === 'js' || lang === 'javascript') ? 
            `<button class="sandbox-run-btn" onclick="runSandboxPlayground('${uniqueId}')"><i class="fa-solid fa-play"></i> RUN SANDBOX</button>` : '';
            
        return `<pre class="code-block-container" id="${uniqueId}">
                    <div class="code-block-header">
                        <span>${lang || 'code'}</span>
                        <div class="code-actions">
                            ${runBtn}
                            <button class="action-btn copy-btn" onclick="copyCodeSnippet('${uniqueId}')" title="Copy Code"><i class="fa-regular fa-copy"></i></button>
                        </div>
                    </div>
                    <code class="code-block">${code.trim()}</code>
                </pre>`;
    });

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Bold text: **bold**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic text: *italic*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Parse Markdown Tables
    let tableRegex = /\|(.+)\|[\s\S]+?\|[ -:|]+?\|([\s\S]+?)(?=\n\n|\n*$)/g;
    html = html.replace(tableRegex, (match) => {
        const lines = match.trim().split('\n');
        let tableHTML = `<div class="multimedia-container table-container">
                            <div class="multimedia-header">
                                <span><i class="fa-solid fa-table"></i> Synthesized Data Matrix Matrix</span>
                                <button class="action-btn csv-btn" onclick="exportTableToCSV(this)" title="Export Data to CSV"><i class="fa-solid fa-file-csv"></i> CSV</button>
                            </div>
                            <div class="table-scroll-area">
                                <table>`;
        
        lines.forEach((line, index) => {
            if (line.includes('---')) return; 
            const cells = line.split('|').map(c => c.trim()).filter((c, i, a) => i > 0 && i < a.length - 1);
            if (cells.length === 0) return;
            
            tableHTML += '<tr>';
            cells.forEach(cell => {
                const tag = index === 0 ? 'th' : 'td';
                tableHTML += `<${tag}>${cell}</${tag}>`;
            });
            tableHTML += '</tr>';
        });
        
        tableHTML += `</table></div></div>`;
        return tableHTML;
    });

    // Lists and paragraphs split processing
    const lines = html.split('\n');
    let inList = false;
    const processedLines = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.substring(2);
            if (!inList) {
                inList = true;
                return `<ul><li>${content}</li>`;
            }
            return `<li>${content}</li>`;
        } else {
            if (inList) {
                inList = false;
                return `</ul><p>${line}</p>`;
            }
            return `<p>${line}</p>`;
        }
    });

    if (inList) {
        processedLines.push('</ul>');
    }

    return processedLines.join('\n').replace(/<p><\/p>/g, '');
}

/* =======================================
   INTERACTIVE MULTIMEDIA CONTROLLERS
   ======================================= */
window.copyCodeSnippet = async (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const code = el.querySelector('code').innerText;
    try {
        await navigator.clipboard.writeText(code);
        const btn = el.querySelector('.copy-btn');
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check" style="color: #00ff66;"></i>';
        setTimeout(() => btn.innerHTML = originalIcon, 1500);
    } catch (e) {
        console.error(e);
    }
};

window.exportTableToCSV = (btn) => {
    const container = btn.closest('.table-container');
    const table = container.querySelector('table');
    let csv = [];
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
        const cols = row.querySelectorAll('td, th');
        let rowData = [];
        cols.forEach(col => {
            rowData.push('"' + col.innerText.replace(/"/g, '""') + '"');
        });
        csv.push(rowData.join(','));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csv.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "promptmind_matrix_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.runSandboxPlayground = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const code = el.querySelector('code').innerText;
    const lang = el.querySelector('.code-block-header span').innerText.toLowerCase();
    
    const modal = document.createElement('div');
    modal.className = 'sandbox-modal';
    
    let previewContent = '';
    if (lang === 'html' || lang === 'xml') {
        previewContent = `<iframe id="sandbox-iframe" style="width:100%; height:100%; border:none; background:#fff;"></iframe>`;
    } else {
        previewContent = `<pre class="sandbox-console" style="color:#00ffcc; font-family:var(--font-mono); font-size:0.85rem; padding:1rem; overflow-y:auto; height:100%; margin:0;"></pre>`;
    }
    
    modal.innerHTML = `
        <div class="sandbox-modal-content">
            <div class="sandbox-modal-header">
                <h3><i class="fa-solid fa-play" style="color:#00ff66;"></i> Sandbox Playground</h3>
                <button class="cyber-btn icon-btn small-btn" onclick="this.closest('.sandbox-modal').remove()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="sandbox-modal-body" style="flex:1; height:calc(100% - 50px); background:#050505;">
                ${previewContent}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    if (lang === 'html' || lang === 'xml') {
        const iframe = document.getElementById('sandbox-iframe');
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(code);
        doc.close();
    } else {
        const consoleEl = modal.querySelector('.sandbox-console');
        consoleEl.innerText = `> Running compiler pipeline...\n`;
        setTimeout(() => {
            if (lang === 'js' || lang === 'javascript') {
                try {
                    let output = '';
                    const customConsole = {
                        log: (...args) => { output += args.join(' ') + '\n'; },
                        error: (...args) => { output += '[ERROR] ' + args.join(' ') + '\n'; },
                        warn: (...args) => { output += '[WARN] ' + args.join(' ') + '\n'; }
                    };
                    const runner = new Function('console', code);
                    runner(customConsole);
                    consoleEl.innerText += output || `\nScript executed successfully.`;
                } catch (e) {
                    consoleEl.innerText += `\n[EXCEPTION]: ${e.message}`;
                }
            } else {
                consoleEl.innerText += `\nMocking Python virtual execution space...\n`;
                consoleEl.innerText += `[SUCCESS] Output matches expected schema constraints. Process completed.`;
            }
        }, 500);
    }
};

