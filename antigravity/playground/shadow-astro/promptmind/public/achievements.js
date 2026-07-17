document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const nickname = localStorage.getItem('promptmind_nickname');
    if (!nickname) {
        window.location.href = 'index.html';
        return;
    }

    // Set nickname greeting
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
    initAchievementsVault();
    initRevisionsHistory();
    initLoreAccordions();
    initAmbientDrone();
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
        color: 0xff0055,
        size: 0.5,
        transparent: true,
        opacity: 0.5
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
        const target = e.target.closest('.cyber-btn, .lore-book-header, .trophy-card, .history-card');
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
            osc.frequency.setValueAtTime(1200, now);
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
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.06);
        } else if (type === 'slide') {
            const osc = audioCtx.createOscillator();
            const filter = audioCtx.createBiquadFilter();
            const gain = audioCtx.createGain();

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, now);
            filter.frequency.exponentialRampToValueAtTime(1000, now + 0.25);

            gain.gain.setValueAtTime(0.03, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch (e) {
        console.warn("Vault Audio synth failed:", e);
    }
}

/* =======================================
   ACHIEVEMENTS TROPHY WALL LOADER
   ======================================= */
function initAchievementsVault() {
    let unlocked = [];
    try {
        const saved = localStorage.getItem('promptmind_achievements');
        if (saved) unlocked = JSON.parse(saved);
    } catch (e) {
        console.error("Failed load achievements:", e);
    }

    const total = unlocked.length;
    const countEl = document.getElementById('trophy-count');
    if (countEl) countEl.innerText = `${total} / 4`;

    // Process classes oncards
    unlocked.forEach(id => {
        const card = document.getElementById(id);
        if (card) {
            card.classList.remove('locked');
            card.classList.add('unlocked');
            const statusBadge = card.querySelector('.trophy-badge-status');
            if (statusBadge) {
                statusBadge.innerText = 'UNLOCKED';
                statusBadge.style.color = '#00ff66';
                statusBadge.style.textShadow = '0 0 5px #00ff66';
            }
        }
    });

    // Check user rank dynamically using prompt history
    let masterRank = "NOVICE SCRIBE";
    let rankClass = "novice";
    try {
        const histSaved = localStorage.getItem('promptmind_history');
        if (histSaved) {
            const hist = JSON.parse(histSaved);
            if (hist.length > 0) {
                const topScore = Math.max(...hist.map(h => h.score || 0));
                
                if (topScore >= 90) {
                    masterRank = "PROMPT OVERLORD";
                    rankClass = "overlord";
                } else if (topScore >= 75) {
                    masterRank = "SEMANTIC ARCHITECT";
                    rankClass = "architect";
                } else if (topScore >= 60) {
                    masterRank = "COGNITIVE ENGINEER";
                    rankClass = "engineer";
                } else if (topScore >= 40) {
                    masterRank = "SYNTACTIC APPRENTICE";
                    rankClass = "apprentice";
                }
            }
        }
    } catch (e) {
        console.error(e);
    }

    const rankLabel = document.getElementById('profile-rank');
    if (rankLabel) {
        rankLabel.innerText = masterRank;
        rankLabel.className = `stat-value text-neon ${rankClass}`;
    }

    const badgeEl = document.getElementById('rank-badge');
    if (badgeEl) {
        badgeEl.innerText = masterRank;
        badgeEl.className = `rank-badge ${rankClass}`;
    }
}

/* =======================================
   REVISIONS HISTORY TIME MACHINE
   ======================================= */
function initRevisionsHistory() {
    const listEl = document.getElementById('vault-timeline');
    if (!listEl) return;

    let history = [];
    try {
        const saved = localStorage.getItem('promptmind_history');
        if (saved) history = JSON.parse(saved);
    } catch (e) {
        console.error(e);
    }

    if (history.length === 0) {
        listEl.innerHTML = `<p class="empty-history-text">No prompt scans found in your terminal history database.</p>`;
        return;
    }

    listEl.innerHTML = '';
    history.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.style.cursor = 'pointer';
        card.style.margin = '0.75rem 0';
        
        let scoreClass = 'low';
        if (item.score >= 75) scoreClass = 'high';
        else if (item.score >= 40) scoreClass = 'mid';

        card.innerHTML = `
            <div class="history-card-top" style="display:flex; justify-content:space-between; align-items:center;">
                <span class="history-time"><i class="fa-regular fa-clock"></i> ${item.time || 'SCAN'}</span>
                <span class="history-score-badge ${scoreClass}">${item.score || 0}/100</span>
            </div>
            <div class="history-prompt-preview" style="font-family:var(--font-mono); font-size:0.8rem; padding:0.5rem 0; color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
                ${escapeHtml(item.prompt)}
            </div>
            <div class="history-actions hidden" style="display:flex; gap:0.6rem; margin-top:0.4rem; justify-content:flex-end;">
                <button class="cyber-btn small-btn restore-timeline-btn"><i class="fa-solid fa-cloud-arrow-up"></i> RESTORE</button>
            </div>
        `;

        card.addEventListener('click', (e) => {
            playLocalSynthSound('click');
            const actions = card.querySelector('.history-actions');
            actions.classList.toggle('hidden');
        });

        const restoreBtn = card.querySelector('.restore-timeline-btn');
        restoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playLocalSynthSound('complete');
            localStorage.setItem('promptmind_restored_prompt', item.prompt);
            window.location.href = 'dashboard.html';
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
   LORE ACCORDIONS CODEX
   ====================================== */
function initLoreAccordions() {
    const books = document.querySelectorAll('.lore-book');
    books.forEach(book => {
        const header = book.querySelector('.lore-book-header');
        header.addEventListener('click', () => {
            const isActive = book.classList.contains('active');
            
            // Close all
            books.forEach(b => b.classList.remove('active'));

            if (!isActive) {
                book.classList.add('active');
                playLocalSynthSound('slide');
            } else {
                playLocalSynthSound('click');
            }
        });
    });
}

window.copySnippetText = async (containerId) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    const code = el.querySelector('code').innerText;
    try {
        await navigator.clipboard.writeText(code);
        const btn = el.querySelector('.copy-btn');
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check" style="color: #00ff66;"></i>';
        setTimeout(() => btn.innerHTML = originalIcon, 1500);
        playLocalSynthSound('complete');
    } catch (e) {
        console.error(e);
    }
};
