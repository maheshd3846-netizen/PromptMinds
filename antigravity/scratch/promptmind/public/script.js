document.addEventListener('DOMContentLoaded', () => {
    initThreeJSBG();
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

    // Particles (Nodes)
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

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

        const posAttr = particles.geometry.attributes.position;
        const currentPositions = posAttr.array;

        // Move particles
        for (let i = 0; i < particleCount; i++) {
            currentPositions[i * 3] += velocities[i].x;
            currentPositions[i * 3 + 1] += velocities[i].y;
            currentPositions[i * 3 + 2] += velocities[i].z;

            // Simple boundary reflection to keep shape
            if (Math.abs(currentPositions[i * 3]) > 35) velocities[i].x *= -1;
            if (Math.abs(currentPositions[i * 3 + 1]) > 35) velocities[i].y *= -1;
            if (Math.abs(currentPositions[i * 3 + 2]) > 35) velocities[i].z *= -1;
        }
        posAttr.needsUpdate = true;

        // Rotate the whole brain structure slowly
        particles.rotation.y += 0.002;
        particles.rotation.x += 0.001;
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
    window.spikeneuralActivity = () => {
        // Temporary color/speed boost
        material.color.setHex(0xff0055);
        lineMaterial.color.setHex(0xff0055);
        lineMaterial.opacity = 0.4;

        setTimeout(() => {
            material.color.setHex(0x00ffcc);
            lineMaterial.color.setHex(0x00ffcc);
            lineMaterial.opacity = 0.15;
        }, 2000);
    };
}


/* =======================================
   CHAT & UI LOGIC
======================================= */
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

        // 1. Display User Message
        appendMessage('user', text);
        promptInput.value = '';

        // 2. Display loading state
        showLoading(true);
        if (window.spikeneuralActivity) window.spikeneuralActivity();

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
            p.classList.add('typing');
            contentDiv.appendChild(p);
            msgDiv.appendChild(avatarDiv);
            msgDiv.appendChild(contentDiv);
            chatHistory.appendChild(msgDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;

            // Typing animation logic
            let i = 0;
            const speed = 25; // ms per char
            function typeWriter() {
                if (i < text.length) {
                    p.innerHTML += text.charAt(i);
                    i++;
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                    setTimeout(typeWriter, speed);
                } else {
                    p.classList.remove('typing'); // stop cursor
                }
            }
            typeWriter();

        } else {
            p.textContent = text;
            contentDiv.appendChild(p);
            msgDiv.appendChild(avatarDiv);
            msgDiv.appendChild(contentDiv);
            chatHistory.appendChild(msgDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }
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
        }
    }
}

/* =======================================
   DASHBOARD UPDATES (Score, Heatmap, Evo)
======================================= */
function updateDashboard(data, originalPrompt) {
    // 1. Update Score
    const scoreFill = document.getElementById('score-fill');
    const scoreText = document.getElementById('score-text');
    const scoreFeedback = document.getElementById('score-feedback');

    // Animate score number
    let currentScore = parseInt(scoreText.innerText) || 0;
    const targetScore = data.score || 0;

    // Width animation (CSS handles the transition)
    scoreFill.style.width = `${targetScore}%`;

    // Threshold colors
    if (targetScore < 40) scoreFill.style.background = '#ff3366';
    else if (targetScore < 75) scoreFill.style.background = '#ffaa00';
    else scoreFill.style.background = '#00ff66';

    const scoreInterval = setInterval(() => {
        if (currentScore < targetScore) currentScore++;
        else if (currentScore > targetScore) currentScore--;
        else clearInterval(scoreInterval);
        scoreText.innerText = currentScore;
    }, 20);

    // Feedback summary (using clarity analysis)
    scoreFeedback.innerText = data.analysis.clarity || "Scan complete.";
    scoreFeedback.classList.remove('muted');

    // 2. Update Heatmap
    const heatmapContainer = document.getElementById('heatmap-container');
    heatmapContainer.innerHTML = ''; // clear
    if (data.heatmap && Array.isArray(data.heatmap)) {
        data.heatmap.forEach(item => {
            const span = document.createElement('span');
            span.textContent = item.word;
            span.className = `word ${item.type || 'neutral'}`;
            // Let's add tooltip for analysis context based on type if we want
            if (item.type === 'weak') span.title = "Vague or lacks context";
            if (item.type === 'strong') span.title = "Clear constraint or instruction";
            heatmapContainer.appendChild(span);
        });
    } else {
        heatmapContainer.innerText = "No heatmap data available.";
    }

    // 3. Update Evolution
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
}
