document.addEventListener('DOMContentLoaded', () => {
    initDiagnosticsLog();
    initThreeJSWarp();
    initGateControls();
});

/* =======================================
   DIAGNOSTICS TERMINAL BOOT SEQUENCE
   ======================================= */
function initDiagnosticsLog() {
    const consoleEl = document.getElementById('diag-console');
    if (!consoleEl) return;

    const logs = [
        { text: "[BOOT] INITIALIZING NEURAL DECRYPTOR...", delay: 100 },
        { text: "[OK] ESTABLISHED SECURE NODE CONNECTIONS ON PORT 3000", delay: 600 },
        { text: "[SCAN] VERIFYING USER LOCALHOST AGENT DIAGNOSTICS...", delay: 1100 },
        { text: "[INFO] HARDWARE ACCELERATED WEBGL CHANNELS COMPILED", delay: 1500 },
        { text: "[WARN] ENCRYPTED COGNITIVE INTELLECT VAULT IS RESTRICTED", delay: 2000 },
        { text: "[GATE] INJECT USER SIGNATURE TO INITIATE TERMINAL HANDSHAKE...", delay: 2500 }
    ];

    logs.forEach(item => {
        setTimeout(() => {
            const p = document.createElement('p');
            p.className = item.text.includes('[OK]') ? 'ok-log' : (item.text.includes('[WARN]') ? 'warn-log' : '');
            p.innerHTML = `<span class="prompt-char">></span> ` + item.text;
            consoleEl.appendChild(p);
            consoleEl.scrollTop = consoleEl.scrollHeight;
            playLocalSynthSound('hover');
        }, item.delay);
    });
}

/* =======================================
   THREE.JS 3D SPACE WARP SIMULATOR
   ======================================= */
let warpSpeedMode = false;
let warpSpeedMultiplier = 1.0;

function initThreeJSWarp() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 80;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Particle field
    const particleCount = 600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleSpeeds = [];

    for (let i = 0; i < particleCount; i++) {
        // Position particles in a deep cylinder tunnel
        positions[i * 3] = (Math.random() - 0.5) * 120;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
        positions[i * 3 + 2] = Math.random() * -300; // start deep inside screen

        // Velocity along Z-axis
        particleSpeeds.push(1.5 + Math.random() * 2.0);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x00ffcc,
        size: 0.8,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
    });

    const starfield = new THREE.Points(geometry, material);
    scene.add(starfield);

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        const posAttr = starfield.geometry.attributes.position;
        const currentPositions = posAttr.array;

        if (warpSpeedMode) {
            // Accelerate multipliers
            warpSpeedMultiplier += (45.0 - warpSpeedMultiplier) * 0.03;
            material.color.setHex(0xff0055); // turn laser red/pink
            starfield.rotation.z += 0.015;  // roll camera
        } else {
            starfield.rotation.z += 0.001;
        }

        for (let i = 0; i < particleCount; i++) {
            // Move forward (increasing Z coordinate toward positive side)
            currentPositions[i * 3 + 2] += particleSpeeds[i] * warpSpeedMultiplier;

            // If a particle flies past the camera, reset it deep inside
            if (currentPositions[i * 3 + 2] > 80) {
                currentPositions[i * 3 + 2] = -300;
                currentPositions[i * 3] = (Math.random() - 0.5) * 120;
                currentPositions[i * 3 + 1] = (Math.random() - 0.5) * 120;
            }
        }
        
        posAttr.needsUpdate = true;
        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

/* =======================================
   WEB AUDIO GATE CONTEXT SYNTHESIZER
   ======================================= */
let soundCtx = null;
let soundOn = true;

function initGateControls() {
    const soundBtn = document.getElementById('gate-sound-btn');
    const uplinkBtn = document.getElementById('uplink-btn');
    const aliasInput = document.getElementById('gate-alias');

    // Default username focus
    aliasInput.focus();

    // Toggle sound
    soundBtn.addEventListener('click', () => {
        soundOn = !soundOn;
        if (soundOn) {
            soundBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> SOUND: ON';
            soundBtn.classList.remove('off');
            playLocalSynthSound('click');
        } else {
            soundBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> SOUND: OFF';
            soundBtn.classList.add('off');
        }
    });

    // Hover sounds for buttons
    soundBtn.addEventListener('mouseenter', () => playLocalSynthSound('hover'));
    uplinkBtn.addEventListener('mouseenter', () => playLocalSynthSound('hover'));

    // Trigger uplink sequence
    uplinkBtn.addEventListener('click', executeUplink);
    aliasInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            executeUplink();
        }
    });

    function executeUplink() {
        let nickname = aliasInput.value.trim().toUpperCase();
        if (!nickname) {
            nickname = "OPERATOR";
        }

        // Save Nickname
        localStorage.setItem('promptmind_nickname', nickname);
        
        // Start Uplink Cinematic!
        uplinkBtn.disabled = true;
        aliasInput.disabled = true;
        warpSpeedMode = true;
        
        playLocalSynthSound('riser');

        // Add warp console logging
        const consoleEl = document.getElementById('diag-console');
        const warpLogs = [
            { text: `[HANDSHAKE] OPERATOR SIGNATURE ${nickname} RECORDED`, delay: 100 },
            { text: "[DECUPLE] RE-STRUCTURING NEURAL WAVEFORMS...", delay: 400 },
            { text: "[WARP] SYNAPSE TRANSMISSION BUFFER OVERFLOW...", delay: 800 },
            { text: "[GATE] PORTAL OPENING... COGNITIVE INTEGRATION COMPLETE.", delay: 1300 }
        ];

        warpLogs.forEach(w => {
            setTimeout(() => {
                const p = document.createElement('p');
                p.style.color = '#ff0055';
                p.innerHTML = `<span class="prompt-char" style="color:#ff0055">></span> ` + w.text;
                consoleEl.appendChild(p);
                consoleEl.scrollTop = consoleEl.scrollHeight;
            }, w.delay);
        });

        // Trigger Glitch UI effect
        const gateModal = document.querySelector('.gate-modal');
        gateModal.classList.add('glitch-out');

        // Cinematic Redirect
        setTimeout(() => {
            // Animate mechanical shutter door closed
            document.querySelector('.entry-shutter-left').classList.add('close-shutter');
            document.querySelector('.entry-shutter-right').classList.add('close-shutter');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 550);
        }, 1800);
    }
}

function getAudioContext() {
    if (!soundCtx) {
        soundCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (soundCtx.state === 'suspended') {
        soundCtx.resume();
    }
    return soundCtx;
}

function playLocalSynthSound(type) {
    if (!soundOn) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;

        if (type === 'hover') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, now);
            gain.gain.setValueAtTime(0.015, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            
            osc.start(now);
            osc.stop(now + 0.04);
        }
        else if (type === 'click') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            osc.start(now);
            osc.stop(now + 0.07);
        }
        else if (type === 'riser') {
            // Deep rising laser sweep + sub bass explosion
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            // Riser osc
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(50, now);
            osc1.frequency.exponentialRampToValueAtTime(1600, now + 1.7);

            // Sub wobble osc
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(45, now);
            osc2.frequency.linearRampToValueAtTime(90, now + 1.7);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(120, now);
            filter.frequency.exponentialRampToValueAtTime(2500, now + 1.7);
            filter.Q.setValueAtTime(6, now);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 1.2);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

            osc1.start(now);
            osc1.stop(now + 1.8);
            osc2.start(now);
            osc2.stop(now + 1.8);
        }
    } catch (e) {
        console.warn("Gate Audio synthesis issue:", e);
    }
}
