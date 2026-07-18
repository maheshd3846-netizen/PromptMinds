document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const nickname = localStorage.getItem('promptmind_nickname');
    if (!nickname) {
        window.location.href = 'index.html';
        return;
    }

    // Set nickname
    const nickEl = document.getElementById('user-nickname');
    if (nickEl) nickEl.innerText = nickname;

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
            if (typeof playLocalSynthSound === 'function') playLocalSynthSound('click');
        });
    }

    initThreeJSBG();
    initAmbientDrone();
    initMatrixUI();
    initSounds();
});

/* =======================================
   THREE.JS BACKGROUND
   ======================================= */
function initThreeJSBG() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const particleCount = 150;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
        const r = 25 * Math.cbrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        velocities.push({
            x: (Math.random() - 0.5) * 0.03,
            y: (Math.random() - 0.5) * 0.03,
            z: (Math.random() - 0.5) * 0.03
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0x00f0ff,
        size: 0.5,
        transparent: true,
        opacity: 0.6
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    function animate() {
        requestAnimationFrame(animate);
        particles.rotation.y += 0.001;
        particles.rotation.x += 0.0005;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

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
        playLocalSynthSound('click');
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

/* =======================================
   SOUND EFFECTS SYNTHESIZER
   ======================================= */
let audioCtx = null;
let soundEnabled = true;

function initSounds() {
    const savedSound = localStorage.getItem('promptmind_sound');
    if (savedSound === 'false') {
        soundEnabled = false;
        const btn = document.getElementById('synth-sound-btn');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
            btn.classList.remove('active');
        }
    }

    const soundBtn = document.getElementById('synth-sound-btn');
    if (soundBtn) {
        soundBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            localStorage.setItem('promptmind_sound', soundEnabled);
            if (soundEnabled) {
                soundBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                soundBtn.classList.add('active');
                playLocalSynthSound('click');
            } else {
                soundBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
                soundBtn.classList.remove('active');
            }
        });
    }

    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('.cyber-btn, .matrix-select, .engine-spec-card');
        if (target && !target.dataset.soundBound) {
            target.dataset.soundBound = 'true';
            target.addEventListener('mouseenter', () => playLocalSynthSound('hover'));
            target.addEventListener('click', () => playLocalSynthSound('click'));
        }
    });
}

function playLocalSynthSound(type) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const now = audioCtx.currentTime;

        if (type === 'hover') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1100, now);
            gain.gain.setValueAtTime(0.015, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            osc.start(now);
            osc.stop(now + 0.04);
        } else if (type === 'click') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(700, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.06);
        } else if (type === 'complete') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); 
            osc.frequency.setValueAtTime(659.25, now + 0.12);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.35);
        }
    } catch (e) {
        console.warn("Matrix Audio synth failed:", e);
    }
}

/* =======================================
   MATRIX UI INTERACTIVE LOGIC
   ======================================= */
const modelDetails = {
    gemini_flash: { name: "Gemini Flash", colorClass: "badge-cyan", speed: "180ms", cost: "$0.00002", style: "rapid", themeColor: "#00f0ff" },
    gemini_pro: { name: "Gemini Pro", colorClass: "badge-blue", speed: "420ms", cost: "$0.00004", style: "structured", themeColor: "#4285f4" },
    gpt_4o: { name: "GPT-4o", colorClass: "badge-green", speed: "650ms", cost: "$0.00080", style: "conversational", themeColor: "#00ff66" },
    claude_sonnet: { name: "Claude Sonnet", colorClass: "badge-orange", speed: "850ms", cost: "$0.00120", style: "academic", themeColor: "#ffaa00" }
};

function initMatrixUI() {
    const simBtn = document.getElementById('sim-btn');
    const inputArea = document.getElementById('playground-input');

    // Initial sync of all headers in the 4-column splitscreen arena
    updatePaneHeader('flash', 'gemini_flash');
    updatePaneHeader('pro', 'gemini_pro');
    updatePaneHeader('gpt', 'gpt_4o');
    updatePaneHeader('claude', 'claude_sonnet');

    // Simulate click
    simBtn.addEventListener('click', async () => {
        const text = inputArea.value.trim();
        if (!text) return;

        showLoading(true);
        playLocalSynthSound('click');

        // Clear previous outputs & set scanning status in telemetries
        const paneKeys = [
            { pane: 'flash', key: 'gemini_flash' },
            { pane: 'pro', key: 'gemini_pro' },
            { pane: 'gpt', key: 'gpt_4o' },
            { pane: 'claude', key: 'claude_sonnet' }
        ];

        paneKeys.forEach(p => {
            const outEl = document.getElementById(`pane-${p.pane}-output`);
            if (outEl) outEl.innerHTML = '<p class="scanning-text"><i class="fa-solid fa-spinner fa-spin"></i> ENGAGING NEURAL DOWNLINK...</p>';
            
            const telemetry = document.getElementById(`pane-${p.pane}-telemetry`);
            if (telemetry) telemetry.innerText = "Speed: CALIBRATING... // Cost: CALIBRATING...";
        });

        try {
            // Fetch prompt analysis from backend to synthesize realistic replies
            const res = await fetch('/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
            });

            if (!res.ok) throw new Error("Simulation endpoint error.");
            const data = await res.json();
            
            // Execute parallel simulation outputs
            runSimulationOutputs(text, data);
        } catch (e) {
            console.error(e);
            alert("Comparative simulation failed. Check server logs.");
            paneKeys.forEach(p => {
                const outEl = document.getElementById(`pane-${p.pane}-output`);
                if (outEl) outEl.innerHTML = '<p class="error-text" style="color: #ff3366;"><i class="fa-solid fa-triangle-exclamation"></i> PIPELINE DISCONNECTED</p>';
            });
        } finally {
            showLoading(false);
        }
    });
}

function updatePaneHeader(pane, modelKey, benchmarkData = null, promptLength = 0, responseLength = 0) {
    const spec = modelDetails[modelKey];
    const telemetry = document.getElementById(`pane-${pane}-telemetry`);
    if (!telemetry) return;

    let costText = spec.cost;
    if (promptLength > 0 && responseLength > 0) {
        let calculatedCost = 0;
        if (modelKey === 'gemini_flash') {
            calculatedCost = promptLength * 0.00000005 + responseLength * 0.00000015;
            costText = `$${calculatedCost.toFixed(6)}`;
        } else if (modelKey === 'gemini_pro') {
            calculatedCost = promptLength * 0.00000015 + responseLength * 0.00000060;
            costText = `$${calculatedCost.toFixed(6)}`;
        } else if (modelKey === 'gpt_4o') {
            calculatedCost = promptLength * 0.0000025 + responseLength * 0.0000075;
            costText = `$${calculatedCost.toFixed(5)}`;
        } else if (modelKey === 'claude_sonnet') {
            calculatedCost = promptLength * 0.0000030 + responseLength * 0.000015;
            costText = `$${calculatedCost.toFixed(5)}`;
        }
    }

    let matchText = "";
    if (benchmarkData && benchmarkData[modelKey]) {
        const bm = benchmarkData[modelKey];
        matchText = ` // MATCH: ${bm.score}% - ${bm.suitability}`;
    }

    telemetry.innerText = `Speed: ${spec.speed} // Cost: ${costText}${matchText}`;
}

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    const btn = document.getElementById('sim-btn');
    if (show) {
        overlay.classList.remove('hidden');
        btn.disabled = true;
    } else {
        overlay.classList.add('hidden');
        btn.disabled = false;
    }
}

function runSimulationOutputs(prompt, data) {
    triggerChordTransition();
    const baseReply = data.chatbot_response || "Scan sequence compiled.";

    const models = [
        { pane: 'flash', key: 'gemini_flash', interval: 4, startDelay: 100 },
        { pane: 'pro', key: 'gemini_pro', interval: 7, startDelay: 300 },
        { pane: 'gpt', key: 'gpt_4o', interval: 10, startDelay: 600 },
        { pane: 'claude', key: 'claude_sonnet', interval: 12, startDelay: 850 }
    ];

    models.forEach(m => {
        updatePaneHeader(m.pane, m.key, data.benchmark, prompt.length, baseReply.length);
        renderTypewriterOutput(m.pane, formatModelText(m.key, baseReply), modelDetails[m.key], m.interval, m.startDelay);
    });
}

function formatModelText(modelKey, baseReply) {
    const spec = modelDetails[modelKey];
    // Remove markdown symbols for typewriter compatibility
    let cleanReply = baseReply.replace(/[*`#_\-]/g, '');

    if (spec.style === 'rapid') {
        return `[EXECUTION PIPELINE: ACTIVE]\n> Response parsed in near zero latency:\n\n${cleanReply.substring(0, 200)}... [TRUNCATED FOR SPEED]`;
    } 
    else if (spec.style === 'structured') {
        return `[REASONING ENGINE: GEMINI-PRO-2.5]\n# THOUGHT MATRIX INTEGRATED:\n\n${cleanReply}`;
    }
    else if (spec.style === 'conversational') {
        return `Hello! I would be glad to assist you with this prompt sequence. Here is a curated response compiled to optimize your parameters:\n\n${cleanReply}\n\nHope this provides deep creative value!`;
    }
    else if (spec.style === 'academic') {
        return `[AUTOREGRESSIVE DENSE AUDIT: CLAUDE]\n# STRUCTURAL REPORT:\n\n${cleanReply}\n\n[BOUNDARIES COMPLIED // OPERATIONS CONCLUDED]`;
    }
    return cleanReply;
}

function renderTypewriterOutput(pane, text, spec, intervalSpeed = 8, startDelay = 0) {
    const outputEl = document.getElementById(`pane-${pane}-output`);
    if (!outputEl) return;

    outputEl.innerHTML = '';
    const p = document.createElement('pre');
    p.className = 'sim-render-code';
    p.style.fontFamily = 'var(--font-mono)';
    p.style.fontSize = '0.82rem';
    p.style.lineHeight = '1.5';
    p.style.color = spec.themeColor;
    p.style.whiteSpace = 'pre-wrap';
    p.style.wordBreak = 'break-word';
    p.classList.add('typing');

    outputEl.appendChild(p);

    setTimeout(() => {
        let i = 0;
        function type() {
            if (i < text.length) {
                p.innerText += text.charAt(i);
                i++;
                outputEl.scrollTop = outputEl.scrollHeight;
                setTimeout(type, intervalSpeed);
            } else {
                p.classList.remove('typing');
                playLocalSynthSound('complete');
            }
        }
        type();
    }, startDelay);
}

