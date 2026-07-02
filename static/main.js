/**
 * IntervAI - Main Chatbot Frontend Orchestrator
 * Integrates Web Speech API, 3D WebGL Avatar status indicators, and
 * dispatches interview inputs to the Python Flask backend endpoints.
 */

// Initialize lucide icons on load
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
});

// ==========================================
// SYSTEM STATE & DOM ELEMENTS
// ==========================================
const AppState = {
    // Session state
    sessionId: null,
    jobRole: 'software-engineer',
    interviewType: 'technical',
    difficulty: 'mid',
    totalQuestionsCount: 5,
    currentQuestionIndex: 0,

    // Voice configs (client-side SpeechSynthesis)
    voiceName: localStorage.getItem('voice_name') || 'default',
    voicePitch: parseFloat(localStorage.getItem('voice_pitch')) || 1.0,
    voiceRate: parseFloat(localStorage.getItem('voice_rate')) || 1.0,
    ttsEnabled: true,
    
    // Web Speech Recognition
    recognition: null,
    isListening: false,
    
    // 3D Scene instance
    scene3D: null
};

// DOM Cache
const dom = {
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    
    // Screens
    setupScreen: document.getElementById('setup-screen'),
    chatScreen: document.getElementById('chat-screen'),
    reportScreen: document.getElementById('report-screen'),
    
    // Setup Inputs
    jobRole: document.getElementById('job-role'),
    interviewType: document.getElementById('interview-type'),
    difficulty: document.getElementById('difficulty'),
    numQuestions: document.getElementById('num-questions'),
    startBtn: document.getElementById('start-interview-btn'),
    
    // Chat Controls
    chatBadgeRole: document.getElementById('chat-badge-role'),
    chatBadgeType: document.getElementById('chat-badge-type'),
    progressFraction: document.getElementById('progress-fraction'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    chatMessages: document.getElementById('chat-messages'),
    chatInput: document.getElementById('chat-input'),
    micBtn: document.getElementById('mic-btn'),
    sendBtn: document.getElementById('send-btn'),
    liveTranscript: document.getElementById('live-transcript'),
    liveTranscriptText: document.getElementById('live-transcript-text'),
    endEarlyBtn: document.getElementById('end-interview-early-btn'),
    
    // Report Elements
    reportMeta: document.getElementById('report-meta'),
    scoreNum: document.getElementById('report-score-num'),
    scoreCircle: document.getElementById('report-score-circle'),
    gradeText: document.getElementById('score-grade-text'),
    
    metricDepthVal: document.getElementById('metric-depth-val'),
    metricDepthFill: document.getElementById('metric-depth-fill'),
    metricCommVal: document.getElementById('metric-comm-val'),
    metricCommFill: document.getElementById('metric-comm-fill'),
    metricProblemVal: document.getElementById('metric-problem-val'),
    metricProblemFill: document.getElementById('metric-problem-fill'),
    
    strengthsList: document.getElementById('strengths-list'),
    improvementsList: document.getElementById('improvements-list'),
    qaAccordion: document.getElementById('qa-accordion'),
    backToSetupBtn: document.getElementById('back-to-setup-btn'),
    
    // 3D Canvas elements
    canvasContainer: document.getElementById('canvas-container'),
    speechBubble: document.getElementById('ai-speech-bubble'),
    speechBubbleText: document.getElementById('speech-bubble-text'),
    audioWaves: document.getElementById('audio-waves'),
    ttsToggle: document.getElementById('tts-toggle'),
    voiceTestBtn: document.getElementById('voice-test-btn'),
    
    // Settings Modal
    openSettingsBtn: document.getElementById('open-settings-btn'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    clearApiKeyBtn: document.getElementById('clear-api-key-btn'),
    apiKeyInput: document.getElementById('gemini-api-key'),
    toggleKeyVisBtn: document.getElementById('toggle-key-visibility'),
    voiceSelect: document.getElementById('voice-select'),
    pitchRange: document.getElementById('voice-pitch'),
    rateRange: document.getElementById('voice-rate'),
    pitchVal: document.getElementById('pitch-val'),
    rateVal: document.getElementById('rate-val')
};

// ==========================================
// VOICE SYNTHESIS (TTS) FUNCTIONALITY
// ==========================================
const Speech = {
    synth: window.speechSynthesis,
    voices: [],

    init() {
        if (!this.synth) return;
        
        const loadVoices = () => {
            this.voices = this.synth.getVoices();
            this.populateVoiceSelect();
        };

        loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = loadVoices;
        }

        // Apply sliders text display
        dom.pitchRange.addEventListener('input', (e) => {
            dom.pitchVal.innerText = parseFloat(e.target.value).toFixed(1);
        });
        dom.rateRange.addEventListener('input', (e) => {
            dom.rateVal.innerText = parseFloat(e.target.value).toFixed(1);
        });
    },

    populateVoiceSelect() {
        if (!dom.voiceSelect) return;
        dom.voiceSelect.innerHTML = '<option value="default">Default Web Accent (Auto-detect)</option>';
        
        const engVoices = this.voices.filter(v => v.lang.startsWith('en') || v.lang.includes('US') || v.lang.includes('GB'));
        
        engVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.innerText = `${voice.name} (${voice.lang})`;
            if (AppState.voiceName === voice.name) {
                option.selected = true;
            }
            dom.voiceSelect.appendChild(option);
        });
    },

    speak(text, onStartCallback, onEndCallback) {
        if (!AppState.ttsEnabled || !this.synth) {
            if (onStartCallback) onStartCallback();
            setTimeout(() => { if (onEndCallback) onEndCallback(); }, 2000);
            return;
        }

        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = AppState.voicePitch;
        utterance.rate = AppState.voiceRate;

        if (AppState.voiceName !== 'default') {
            const selectedVoice = this.voices.find(v => v.name === AppState.voiceName);
            if (selectedVoice) utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
            if (onStartCallback) onStartCallback();
        };

        utterance.onend = () => {
            if (onEndCallback) onEndCallback();
        };

        utterance.onerror = (e) => {
            console.error("SpeechSynthesis error:", e);
            if (onEndCallback) onEndCallback();
        };

        this.synth.speak(utterance);
    },

    testVoice() {
        const testText = "Hello! I am IntervAI, your python-powered mock interviewer. How does my speech configuration sound to you?";
        this.speak(testText, 
            () => {
                setSystemStatus('speaking');
                updateSpeechBubble(testText);
            },
            () => {
                setSystemStatus('idle');
            }
        );
    }
};

// ==========================================
// VOICE TRANSCRIBER (STT) FUNCTIONALITY
// ==========================================
const Transcriber = {
    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            dom.micBtn.style.display = 'none';
            console.warn("Speech Recognition not supported in this browser.");
            return;
        }

        AppState.recognition = new SpeechRecognition();
        AppState.recognition.continuous = true;
        AppState.recognition.interimResults = true;
        AppState.recognition.lang = 'en-US';

        AppState.recognition.onstart = () => {
            AppState.isListening = true;
            dom.micBtn.classList.add('active');
            dom.liveTranscript.style.display = 'flex';
            dom.liveTranscriptText.innerText = "Listening... Speak now.";
            setSystemStatus('listening');
        };

        AppState.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                dom.chatInput.value += (dom.chatInput.value ? ' ' : '') + finalTranscript;
            }

            dom.liveTranscriptText.innerText = interimTranscript || "Listening...";
        };

        AppState.recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            this.stop();
        };

        AppState.recognition.onend = () => {
            AppState.isListening = false;
            dom.micBtn.classList.remove('active');
            dom.liveTranscript.style.display = 'none';
            if (AppState.currentQuestionIndex < AppState.totalQuestionsCount && document.getElementById('chat-screen').classList.contains('active')) {
                setSystemStatus('idle');
            }
        };
    },

    toggle() {
        if (!AppState.recognition) {
            alert("Voice recognition is not supported in this browser. Please use Chrome or Safari.");
            return;
        }

        if (AppState.isListening) {
            this.stop();
        } else {
            try {
                AppState.recognition.start();
            } catch (err) {
                console.error("Failed to start recognition:", err);
            }
        }
    },

    stop() {
        if (AppState.recognition && AppState.isListening) {
            AppState.recognition.stop();
        }
    }
};

// ==========================================
// INTERVIEW FLOW & API INTEGRATION
// ==========================================

function setSystemStatus(status) {
    dom.statusDot.className = `status-indicator ${status}`;
    
    let text = "IntervAI System: Ready";
    if (status === 'speaking') text = "IntervAI is speaking...";
    if (status === 'listening') text = "AI Interviewer is listening to your answer...";
    if (status === 'thinking') text = "IntervAI is processing response...";
    if (status === 'idle') text = "IntervAI System: Idle";
    
    dom.statusText.innerText = text;

    if (AppState.scene3D) {
        AppState.scene3D.setStatus(status);
        if (status === 'speaking') {
            dom.audioWaves.classList.add('active');
            this.waveInterval = setInterval(() => {
                if (AppState.scene3D) AppState.scene3D.setAudioIntensity(0.2 + Math.random() * 0.8);
            }, 100);
        } else {
            dom.audioWaves.classList.remove('active');
            clearInterval(this.waveInterval);
            if (AppState.scene3D) AppState.scene3D.setAudioIntensity(0);
        }
    }
}

function updateSpeechBubble(text, duration = 6000) {
    dom.speechBubbleText.innerText = text;
    dom.speechBubble.classList.add('visible');
    
    if (window.bubbleTimeout) clearTimeout(window.bubbleTimeout);
    window.bubbleTimeout = setTimeout(() => {
        dom.speechBubble.classList.remove('visible');
    }, duration);
}

function showScreen(screenId) {
    dom.setupScreen.classList.remove('active');
    dom.chatScreen.classList.remove('active');
    dom.reportScreen.classList.remove('active');

    const activeScreen = document.getElementById(screenId);
    activeScreen.classList.add('active');
}

/**
 * Initializes a new interview session via Flask Backend
 */
async function startInterview() {
    AppState.jobRole = dom.jobRole.value;
    AppState.interviewType = dom.interviewType.value;
    AppState.difficulty = dom.difficulty.value;
    AppState.totalQuestionsCount = parseInt(dom.numQuestions.value);
    AppState.currentQuestionIndex = 0;
    
    dom.chatMessages.innerHTML = '';
    dom.chatBadgeRole.innerText = dom.jobRole.options[dom.jobRole.selectedIndex].text.split('(')[0].trim();
    dom.chatBadgeType.innerText = dom.interviewType.options[dom.interviewType.selectedIndex].text.split('/')[0].trim();
    
    setSystemStatus('thinking');
    showScreen('chat-screen');
    updateSpeechBubble("Setting up your dynamic interview workspace...", 4000);
    
    try {
        const response = await fetch('/api/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jobRole: AppState.jobRole,
                interviewType: AppState.interviewType,
                difficulty: AppState.difficulty,
                totalQuestionsCount: AppState.totalQuestionsCount
            })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        AppState.sessionId = data.session_id;
        speakAndDisplayQuestion(data.question);
    } catch (err) {
        console.error("Failed to start interview:", err);
        alert("Failed to initialize session on the python backend. Make sure the server is running.");
        showScreen('setup-screen');
        setSystemStatus('idle');
    }
}

function speakAndDisplayQuestion(questionText) {
    const qNum = AppState.currentQuestionIndex + 1;
    dom.progressFraction.innerText = `Question ${qNum} of ${AppState.totalQuestionsCount}`;
    dom.progressBarFill.style.width = `${(qNum / AppState.totalQuestionsCount) * 100}%`;
    
    appendChatMessage('IntervAI', questionText, 'interviewer');
    
    Speech.speak(questionText,
        () => {
            setSystemStatus('speaking');
            updateSpeechBubble(questionText, 8000);
        },
        () => {
            setSystemStatus('idle');
        }
    );
}

function appendChatMessage(sender, text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerText = text;
    
    const timeSpan = document.createElement('div');
    timeSpan.className = 'msg-time';
    const now = new Date();
    timeSpan.innerText = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    msgDiv.appendChild(bubble);
    msgDiv.appendChild(timeSpan);
    
    dom.chatMessages.appendChild(msgDiv);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

/**
 * Submits user answer to the Python server
 */
async function submitAnswer() {
    const answerText = dom.chatInput.value.trim();
    if (!answerText) return;
    
    dom.chatInput.value = '';
    dom.chatInput.disabled = true;
    dom.sendBtn.disabled = true;
    Transcriber.stop();
    
    appendChatMessage('Candidate', answerText, 'user');
    setSystemStatus('thinking');
    
    try {
        const response = await fetch('/api/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: AppState.sessionId,
                answer: answerText
            })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        dom.chatInput.disabled = false;
        dom.sendBtn.disabled = false;
        
        if (data.finished) {
            AppState.currentQuestionIndex = AppState.totalQuestionsCount;
            gradeInterview();
        } else {
            AppState.currentQuestionIndex = data.progress - 1;
            speakAndDisplayQuestion(data.question);
        }
    } catch (err) {
        console.error("Failed to submit answer:", err);
        alert("Failed to connect to backend server to process response.");
        dom.chatInput.disabled = false;
        dom.sendBtn.disabled = false;
        setSystemStatus('idle');
    }
}

/**
 * Requests grading evaluation from backend
 */
async function gradeInterview() {
    setSystemStatus('thinking');
    updateSpeechBubble("Interview complete! Compiling your analysis report card...", 10000);
    
    dom.reportMeta.innerText = `${dom.difficulty.options[dom.difficulty.selectedIndex].text} • ${dom.jobRole.options[dom.jobRole.selectedIndex].text.split('(')[0].trim()} • ${dom.interviewType.options[dom.interviewType.selectedIndex].text.split('/')[0].trim()}`;
    
    try {
        const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: AppState.sessionId })
        });
        
        const report = await response.json();
        if (report.error) throw new Error(report.error);
        
        renderReportCard(report);
    } catch (err) {
        console.error("Evaluation request failed:", err);
        alert("Server failed to compile report evaluation.");
        setSystemStatus('idle');
    }
}

function renderReportCard(report) {
    showScreen('report-screen');
    setSystemStatus('idle');
    updateSpeechBubble(`Interview Complete! Overall Score: ${report.overallScore}%. Let's review the feedback together!`, 8000);
    
    dom.scoreNum.innerText = report.overallScore;
    dom.gradeText.innerText = report.gradeText;
    
    // Radial circular animation
    const offset = 251.2 - (251.2 * report.overallScore) / 100;
    gsap.to(dom.scoreCircle, { strokeDashoffset: offset, duration: 1.2, ease: "power2.out" });
    
    // Metrics bars
    dom.metricDepthVal.innerText = `${report.metrics.depth}%`;
    gsap.to(dom.metricDepthFill, { width: `${report.metrics.depth}%`, duration: 1.0 });
    
    dom.metricCommVal.innerText = `${report.metrics.communication}%`;
    gsap.to(dom.metricCommFill, { width: `${report.metrics.communication}%`, duration: 1.0, delay: 0.15 });
    
    dom.metricProblemVal.innerText = `${report.metrics.problemSolving}%`;
    gsap.to(dom.metricProblemFill, { width: `${report.metrics.problemSolving}%`, duration: 1.0, delay: 0.3 });
    
    // Lists
    dom.strengthsList.innerHTML = '';
    report.strengths.forEach(s => {
        const li = document.createElement('li');
        li.innerText = s;
        dom.strengthsList.appendChild(li);
    });
    
    dom.improvementsList.innerHTML = '';
    report.improvements.forEach(imp => {
        const li = document.createElement('li');
        li.innerText = imp;
        dom.improvementsList.appendChild(li);
    });
    
    // Q&A accordion list
    dom.qaAccordion.innerHTML = '';
    report.questionsReview.forEach((item, index) => {
        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';
        
        let scoreClass = 'low';
        if (item.score >= 80) scoreClass = 'high';
        else if (item.score >= 60) scoreClass = 'med';
        
        accordionItem.innerHTML = `
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="accordion-title">
                    <span class="score-badge ${scoreClass}">${item.score}%</span>
                    <span>Question ${index + 1}: ${item.question.substring(0, 50)}...</span>
                </div>
                <i data-lucide="chevron-down" class="accordion-icon"></i>
            </div>
            <div class="accordion-body">
                <div class="accordion-content">
                    <div class="qa-block question">
                        <h5>Question:</h5>
                        <p>${item.question}</p>
                    </div>
                    <div class="qa-block answer">
                        <h5>Your Answer:</h5>
                        <p>${item.answer || 'No answer provided.'}</p>
                    </div>
                    <div class="qa-block ideal">
                        <h5>Key Discussion Points Needed:</h5>
                        <p>${item.ideal}</p>
                    </div>
                    <div class="qa-block feedback">
                        <h5>AI Evaluator Feedback:</h5>
                        <p>${item.feedback}</p>
                    </div>
                </div>
            </div>
        `;
        
        dom.qaAccordion.appendChild(accordionItem);
    });
    
    lucide.createIcons();
}

window.toggleAccordion = function(element) {
    const parent = element.parentElement;
    const isActive = parent.classList.contains('active');
    
    document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (!isActive) {
        parent.classList.add('active');
    }
};

// ==========================================
// SYSTEM MODAL & SETTINGS MANAGER
// ==========================================
const SettingsManager = {
    async init() {
        // Fetch current API Key configuration status from Flask
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            if (data.has_api_key) {
                dom.apiKeyInput.value = "••••••••••••••••••••••••";
            }
        } catch (err) {
            console.error("Failed to fetch backend configuration:", err);
        }
        
        dom.pitchRange.value = AppState.voicePitch;
        dom.rateRange.value = AppState.voiceRate;
        dom.pitchVal.innerText = AppState.voicePitch.toFixed(1);
        dom.rateVal.innerText = AppState.voiceRate.toFixed(1);
        
        dom.openSettingsBtn.addEventListener('click', () => this.show(true));
        dom.closeSettingsBtn.addEventListener('click', () => this.show(false));
        dom.settingsModal.addEventListener('click', (e) => {
            if (e.target === dom.settingsModal) this.show(false);
        });

        dom.saveSettingsBtn.addEventListener('click', () => this.save());
        dom.clearApiKeyBtn.addEventListener('click', () => this.clearKey());

        dom.toggleKeyVisBtn.addEventListener('click', () => {
            const isPassword = dom.apiKeyInput.type === 'password';
            dom.apiKeyInput.type = isPassword ? 'text' : 'password';
            const icon = dom.toggleKeyVisBtn.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
                lucide.createIcons();
            }
        });
    },

    show(visible) {
        if (visible) dom.settingsModal.classList.add('active');
        else dom.settingsModal.classList.remove('active');
    },

    async save() {
        const inputKey = dom.apiKeyInput.value.trim();
        AppState.voicePitch = parseFloat(dom.pitchRange.value);
        AppState.voiceRate = parseFloat(dom.rateRange.value);
        
        if (dom.voiceSelect.value) {
            AppState.voiceName = dom.voiceSelect.value;
            localStorage.setItem('voice_name', AppState.voiceName);
        }

        localStorage.setItem('voice_pitch', AppState.voicePitch);
        localStorage.setItem('voice_rate', AppState.voiceRate);

        // If the key is modified (not the mask), save it to python backend
        if (inputKey && inputKey !== "••••••••••••••••••••••••") {
            try {
                const response = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gemini_api_key: inputKey })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    dom.apiKeyInput.value = "••••••••••••••••••••••••";
                }
            } catch (err) {
                console.error("Failed to save credentials to backend:", err);
                alert("Failed to store API Key on the server.");
            }
        }

        this.show(false);
        setSystemStatus('idle');
        updateSpeechBubble("System configurations saved successfully!", 4000);
    },

    async clearKey() {
        try {
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gemini_api_key: "" })
            });
            const result = await response.json();
            if (result.status === 'success') {
                dom.apiKeyInput.value = '';
                alert("API Key cleared from server configurations.");
            }
        } catch (err) {
            console.error("Failed to clear credentials on backend:", err);
        }
    }
};

// ==========================================
// CORE INITIALIZATION
// ==========================================
function initApp() {
    AppState.scene3D = new AIInterviewer3D('canvas-container');

    Speech.init();
    Transcriber.init();
    SettingsManager.init();

    dom.startBtn.addEventListener('click', startInterview);
    
    dom.sendBtn.addEventListener('click', submitAnswer);
    dom.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submitAnswer();
        }
    });

    dom.micBtn.addEventListener('click', () => Transcriber.toggle());

    dom.ttsToggle.addEventListener('change', (e) => {
        AppState.ttsEnabled = e.target.checked;
    });

    dom.voiceTestBtn.addEventListener('click', () => Speech.testVoice());
    
    dom.endEarlyBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to end the interview early? We will grade you based on the answers you have submitted so far.")) {
            gradeInterview();
        }
    });

    dom.backToSetupBtn.addEventListener('click', () => {
        showScreen('setup-screen');
        updateSpeechBubble("Configure your interview, and let's begin!", 5000);
    });

    setTimeout(() => {
        updateSpeechBubble("Welcome to IntervAI! Customize your interview parameters on the dashboard, and click Start when you're ready.", 8000);
    }, 1500);
}

window.addEventListener('load', initApp);
