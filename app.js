/**
 * IntervAI - Main Chatbot & Interview Engine
 * Controls state machine, voice transcription (SpeechRecognition), voice synthesis (SpeechSynthesis),
 * API integration, offline database, and grading algorithms.
 */

// Initialize lucide icons on load
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
});

// ==========================================
// OFFLINE PRESET QUESTION DATABASE
// ==========================================
const INTERVIEW_QUESTION_DATABASE = {
    "software-engineer": {
        "technical": {
            "entry": [
                "Can you explain the difference between a stack and a queue? How do they differ in terms of search/manipulation times?",
                "What is a RESTful API, and what are the main HTTP methods used in REST architecture?",
                "What is the difference between synchronous and asynchronous programming, and how does JavaScript handle asynchrony?"
            ],
            "mid": [
                "Explain the difference between SQL and NoSQL databases. In what scenarios would you choose one over the other?",
                "What is dependency injection, and why is it useful in software architecture? How does it improve testability?",
                "Can you describe how concurrency is managed in databases? Explain locks, transactions, and isolation levels."
            ],
            "senior": [
                "Describe how you would design a highly scalable caching strategy for a microservice architecture. How do you handle cache invalidation?",
                "What are the trade-offs of microservices vs. monolithic architectures, and what mechanisms do you use to ensure data consistency across services?",
                "How do you approach database performance tuning, query optimization, and indexing strategies in production environments under high load?"
            ]
        },
        "behavioral": {
            "entry": [
                "Tell me about a time when you had to work on a team project and had a disagreement with a team member. How did you resolve it?",
                "Describe a situation where you had to learn a new technology quickly to solve a problem. What was your process?",
                "Tell me about a time you made a mistake on a coding project. How did you handle it, and what did you learn?"
            ],
            "mid": [
                "Describe a time when you were faced with a tight deadline and had to make trade-offs regarding code quality vs. delivery time. What did you do?",
                "Tell me about a time you had to explain a complex technical concept to a non-technical stakeholder. How did you structure your message?",
                "Describe a situation where you noticed an inefficiency in a team's workflow or system and took the initiative to improve it."
            ],
            "senior": [
                "Tell me about a time you led a critical project that faced major roadblocks. How did you keep the team motivated and steer the project to completion?",
                "Describe a time when you had to advocate for a technical architectural change that was met with resistance from management or team members. How did you handle it?",
                "Tell me about a time you mentored a junior engineer. How did you assess their needs, and what was the impact on their development?"
            ]
        },
        "system-design": {
            "entry": [
                "If you were to design a simple URL shortening service like Bitly, what are the primary database tables and endpoints you would need?",
                "How would you design a simple client-server messaging queue system for processing background reports?",
                "Explain the components of a basic load balancer and how it distributes incoming traffic to multiple web servers."
            ],
            "mid": [
                "Design a system like Twitter or Threads. Focus on how you would construct the user feed/timeline efficiently for both active and inactive users.",
                "How would you design a rate limiter to protect public API endpoints? What algorithms and storage mechanisms would you choose?",
                "Design a distributed file storage system like Dropbox. How do you handle file syncing, version control, and storage optimization?"
            ],
            "senior": [
                "Design a global video streaming platform like Netflix. Detail the CDN topology, video transcoding pipeline, storage tiers, and recommendations serving architecture.",
                "Design a real-time collaborative editing tool like Google Docs. Explain how you would manage concurrent edits using Operational Transformation (OT) or CRDTs.",
                "How would you design an ad-click tracking system processing 100k events/second with low latency, high availability, and zero data loss requirements?"
            ]
        }
    },
    "frontend-developer": {
        "technical": {
            "mid": [
                "What is the difference between Virtual DOM and Shadow DOM? How do React and Web Components utilize them?",
                "Explain performance optimization techniques for modern web apps. How would you improve cumulative layout shift (CLS) and largest contentful paint (LCP)?",
                "How does the CSS box model work, and what is the difference between flexbox and grid? When would you use one over the other?"
            ]
        },
        "behavioral": {
            "mid": [
                "Tell me about a design system you worked with. How did you collaborate with designers to maintain visual consistency across components?",
                "Describe a time you had to deal with a cross-browser compatibility issue. What was the root cause and how did you resolve it?"
            ]
        },
        "system-design": {
            "mid": [
                "Design a modular frontend architecture for a large e-commerce dashboard. How do you handle state management, routing, and bundle splitting?",
                "Design a high-fidelity image grid layout like Pinterest with infinite scroll. Focus on performance, image rendering optimization, and scroll lag prevention."
            ]
        }
    },
    "product-manager": {
        "technical": {
            "mid": [
                "How do you prioritize a product roadmap? What frameworks (RICE, MoSCoW, Kano) do you use and why?",
                "How do you define key performance indicators (KPIs) for a newly launched mobile app? Walk me through your metrics framework.",
                "Describe how you coordinate launch phases (Alpha, Beta, GA) and gather user feedback to iterate on feature development."
            ]
        },
        "behavioral": {
            "mid": [
                "Tell me about a product feature you championed that ended up failing. What did you learn and how did you pivot?",
                "Describe a situation where engineering, design, and business goals were in conflict. How did you align the stakeholders?"
            ]
        },
        "system-design": {
            "mid": [
                "Design a food delivery app for college students. What core features would you prioritize, and how would you design the MVP user flow?",
                "Design an onboarding flow for a SaaS project management tool to increase 7-day retention rates. What features do you build?"
            ]
        }
    },
    "data-scientist": {
        "technical": {
            "mid": [
                "Explain the bias-variance trade-off in machine learning. How do you detect and combat overfitting in random forests or neural networks?",
                "How do you evaluate the performance of a classification model? Compare precision, recall, F1-score, and ROC-AUC.",
                "What is the difference between supervised, unsupervised, and semi-supervised learning? Give real-world examples of each."
            ]
        },
        "behavioral": {
            "mid": [
                "Describe a time when your analysis refuted a business hypothesis held by leadership. How did you present your findings?",
                "Tell me about a time you had to clean a messy, incomplete dataset to build a predictive model. What choices did you make?"
            ]
        },
        "system-design": {
            "mid": [
                "Design an end-to-end real-time recommendation engine for a streaming platform. Detail the offline training, online scoring, and data ingestion pipes.",
                "Design a system to detect credit card fraud in real-time. Detail feature engineering, latency requirements, model updates, and safety thresholds."
            ]
        }
    },
    "ui-ux-designer": {
        "technical": {
            "mid": [
                "What is the difference between UI and UX design? How do you conduct user research to inform your design choices?",
                "Explain the principles of design system building. How do you organize spacing, components, typography scales, and variants?",
                "How do you address accessibility (WCAG compliance) in your designs, particularly with contrast ratios, screen readers, and interactive targets?"
            ]
        },
        "behavioral": {
            "mid": [
                "Tell me about a time when user testing results contradicted your initial design assumptions. How did you adapt the design?",
                "Describe a situation where a client or developer wanted to change a design element that you believed would degrade UX. How did you defend it?"
            ]
        },
        "system-design": {
            "mid": [
                "Design the check-out flow for a ride-sharing application. Detail wireframes, user personas, friction points, and visual micro-interactions.",
                "Design a dashboard for a smart-home control hub. Detail visual hierarchy, accessibility, and navigation structures across devices."
            ]
        }
    }
};

// ==========================================
// SYSTEM STATE & DOM ELEMENTS
// ==========================================
const AppState = {
    apiKey: localStorage.getItem('gemini_api_key') || (typeof GEMINI_API_KEY !== 'undefined' ? GEMINI_API_KEY : ''),
    voiceName: localStorage.getItem('voice_name') || 'default',
    voicePitch: parseFloat(localStorage.getItem('voice_pitch')) || 1.0,
    voiceRate: parseFloat(localStorage.getItem('voice_rate')) || 1.0,
    ttsEnabled: true,
    
    // Interview variables
    jobRole: 'software-engineer',
    interviewType: 'technical',
    difficulty: 'mid',
    totalQuestionsCount: 5,
    
    currentQuestionIndex: 0,
    questions: [],
    answers: [],
    transcriptHistory: [], // stores transcript formatted for Gemini
    
    // Speech Recognition
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
        
        // Wait for voices load event (some browsers load async)
        const loadVoices = () => {
            this.voices = this.synth.getVoices();
            this.populateVoiceSelect();
        };

        loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = loadVoices;
        }

        // Apply sliders live text display
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
        
        // Filter English voices or standard localization
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
            setTimeout(() => { if (onEndCallback) onEndCallback(); }, 2000); // Simulate speech end
            return;
        }

        // Cancel previous speeches
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Config settings
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
        const testText = "Hello! I am IntervAI, your holographic mock interviewer. How does my speech configuration sound to you?";
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
            if (AppState.currentQuestionIndex < AppState.questions.length && document.getElementById('chat-screen').classList.contains('active')) {
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
// GEMINI API UTILITIES
// ==========================================
const GeminiService = {
    async call(messages, responseFormatJson = false) {
        if (!AppState.apiKey) {
            throw new Error("No API key available");
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${AppState.apiKey}`;
        
        // Convert client format into Gemini API role formats
        const contents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const body = {
            contents: contents,
            generationConfig: {
                temperature: 0.6,
                topP: 0.95
            }
        };

        if (responseFormatJson) {
            body.generationConfig.responseMimeType = "application/json";
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "API call failed");
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
};

// ==========================================
// INTERVIEW CONTROLLER & STATE LOGIC
// ==========================================

function setSystemStatus(status) {
    // Modify indicator colors and status texts
    dom.statusDot.className = `status-indicator ${status}`;
    
    let text = "IntervAI System: Ready";
    if (status === 'speaking') text = "IntervAI is speaking...";
    if (status === 'listening') text = "AI Interviewer is listening to your answer...";
    if (status === 'thinking') text = "IntervAI is processing response...";
    if (status === 'idle') text = "IntervAI System: Idle";
    
    dom.statusText.innerText = text;

    // Send status to 3D Scene
    if (AppState.scene3D) {
        AppState.scene3D.setStatus(status);
        
        // Trigger simulated audio waves if speaking
        if (status === 'speaking') {
            dom.audioWaves.classList.add('active');
            // Animate morph variations in interval
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
    
    // Clear previous timer
    if (window.bubbleTimeout) clearTimeout(window.bubbleTimeout);
    window.bubbleTimeout = setTimeout(() => {
        dom.speechBubble.classList.remove('visible');
    }, duration);
}

function showScreen(screenId) {
    // Hide all
    dom.setupScreen.classList.remove('active');
    dom.chatScreen.classList.remove('active');
    dom.reportScreen.classList.remove('active');

    // Show selected
    const activeScreen = document.getElementById(screenId);
    activeScreen.classList.add('active');
}

/**
 * Initializes a new interview session
 */
async function startInterview() {
    // 1. Capture selections
    AppState.jobRole = dom.jobRole.value;
    AppState.interviewType = dom.interviewType.value;
    AppState.difficulty = dom.difficulty.value;
    AppState.totalQuestionsCount = parseInt(dom.numQuestions.value);
    
    AppState.currentQuestionIndex = 0;
    AppState.questions = [];
    AppState.answers = [];
    AppState.transcriptHistory = [];
    
    // Reset Chat panel
    dom.chatMessages.innerHTML = '';
    
    // Adjust header badges
    dom.chatBadgeRole.innerText = dom.jobRole.options[dom.jobRole.selectedIndex].text.split('(')[0].trim();
    dom.chatBadgeType.innerText = dom.interviewType.options[dom.interviewType.selectedIndex].text.split('/')[0].trim();
    
    setSystemStatus('thinking');
    showScreen('chat-screen');
    
    // 2. Fetch/Prepare questions
    if (AppState.apiKey) {
        // Dynamic AI Generation Mode
        try {
            updateSpeechBubble("Setting up your dynamic interview workspace...", 4000);
            
            const systemPrompt = `You are an elite, highly professional AI interviewer conducting a ${AppState.difficulty} level ${AppState.interviewType} mock interview for the position of ${AppState.jobRole}.
You will conduct an interview containing ${AppState.totalQuestionsCount} questions. 
I want you to ask the VERY FIRST question of the interview. Keep the question crisp, clear, and relevant. Do not include introductory conversational noise beyond a brief "Welcome to your mock interview! Let's get started."
Ask exactly ONE question and stop.`;
            
            AppState.transcriptHistory.push({ role: 'user', content: systemPrompt });
            
            const firstQuestion = await GeminiService.call(AppState.transcriptHistory);
            AppState.questions.push(firstQuestion);
            AppState.transcriptHistory.push({ role: 'assistant', content: firstQuestion });
            
            speakAndDisplayQuestion(firstQuestion);
        } catch (err) {
            console.error("Gemini failed to launch interview, falling back to local database:", err);
            alert("Failed to connect to Gemini API. Falling back to local offline mock interview mode.");
            loadOfflineQuestions();
        }
    } else {
        // Local Preset Database Mode
        loadOfflineQuestions();
    }
}

function loadOfflineQuestions() {
    const roleQuestions = INTERVIEW_QUESTION_DATABASE[AppState.jobRole] || INTERVIEW_QUESTION_DATABASE["software-engineer"];
    const typeQuestions = roleQuestions[AppState.interviewType] || roleQuestions["technical"];
    const pool = typeQuestions[AppState.difficulty] || typeQuestions["mid"];
    
    // Copy pool and shuffle slightly
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    AppState.questions = shuffled.slice(0, AppState.totalQuestionsCount);
    
    // In case pool is smaller, pad with software-engineer standard questions
    while (AppState.questions.length < AppState.totalQuestionsCount) {
        AppState.questions.push(`Can you share another key project or design decision relative to ${AppState.jobRole} and explain the trade-offs involved?`);
    }

    const firstQuestion = AppState.questions[0];
    speakAndDisplayQuestion(firstQuestion);
}

function speakAndDisplayQuestion(questionText) {
    // Update progress tracker
    const qNum = AppState.currentQuestionIndex + 1;
    dom.progressFraction.innerText = `Question ${qNum} of ${AppState.totalQuestionsCount}`;
    dom.progressBarFill.style.width = `${(qNum / AppState.totalQuestionsCount) * 100}%`;
    
    // Render to log
    appendChatMessage('IntervAI', questionText, 'interviewer');
    
    // Speak Question
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
 * Handles submission of user answer
 */
async function submitAnswer() {
    const answerText = dom.chatInput.value.trim();
    if (!answerText) return;
    
    // Disable inputs during processing
    dom.chatInput.value = '';
    dom.chatInput.disabled = true;
    dom.sendBtn.disabled = true;
    Transcriber.stop();
    
    // Append answer to screen
    appendChatMessage('Candidate', answerText, 'user');
    AppState.answers.push(answerText);
    
    AppState.currentQuestionIndex++;
    
    // Check if interview completed
    if (AppState.currentQuestionIndex >= AppState.totalQuestionsCount) {
        dom.chatInput.disabled = false;
        dom.sendBtn.disabled = false;
        gradeInterview();
        return;
    }
    
    setSystemStatus('thinking');
    
    // Generate/Fetch next question
    if (AppState.apiKey) {
        try {
            // Feed answer into Gemini context
            AppState.transcriptHistory.push({ role: 'user', content: `Candidate answer: ${answerText}\n\nPlease evaluate this response briefly in 1 encouraging sentence, and then ask Question ${AppState.currentQuestionIndex + 1} of ${AppState.totalQuestionsCount}. Keep the question challenging and relevant.` });
            
            const nextQuestion = await GeminiService.call(AppState.transcriptHistory);
            AppState.questions.push(nextQuestion);
            AppState.transcriptHistory.push({ role: 'assistant', content: nextQuestion });
            
            // Enable inputs
            dom.chatInput.disabled = false;
            dom.sendBtn.disabled = false;
            
            speakAndDisplayQuestion(nextQuestion);
        } catch (err) {
            console.error("Gemini failed to load next question, falling back to local:", err);
            // Fallback: local
            const nextQuestion = AppState.questions[AppState.currentQuestionIndex];
            dom.chatInput.disabled = false;
            dom.sendBtn.disabled = false;
            speakAndDisplayQuestion(nextQuestion);
        }
    } else {
        // Local mode: load next question from pre-fetched list
        setTimeout(() => {
            const nextQuestion = AppState.questions[AppState.currentQuestionIndex];
            dom.chatInput.disabled = false;
            dom.sendBtn.disabled = false;
            speakAndDisplayQuestion(nextQuestion);
        }, 1000);
    }
}

// ==========================================
// EVALUATION & REPORT CARD GENERATION
// ==========================================

async function gradeInterview() {
    setSystemStatus('thinking');
    updateSpeechBubble("Interview complete! Compiling your analysis report card...", 10000);
    
    // Build metadata
    dom.reportMeta.innerText = `${dom.difficulty.options[dom.difficulty.selectedIndex].text} • ${dom.jobRole.options[dom.jobRole.selectedIndex].text.split('(')[0].trim()} • ${dom.interviewType.options[dom.interviewType.selectedIndex].text.split('/')[0].trim()}`;
    
    if (AppState.apiKey) {
        try {
            // Ask Gemini for report evaluation JSON
            let transcriptText = "";
            for (let i = 0; i < AppState.answers.length; i++) {
                transcriptText += `Question ${i+1}: ${AppState.questions[i]}\nAnswer ${i+1}: ${AppState.answers[i]}\n\n`;
            }
            
            const evaluationPrompt = `You are the lead hiring panel. Evaluate the following interview session for a ${AppState.difficulty} level ${AppState.jobRole} role:
            
            ${transcriptText}
            
            You must return a raw JSON response. Do not surround the JSON in markdown code blocks or add text context. The JSON object structure MUST be exactly:
            {
              "overallScore": <integer 0 to 100>,
              "gradeText": "<string summarizing performance>",
              "metrics": {
                "depth": <integer 0 to 100>,
                "communication": <integer 0 to 100>,
                "problemSolving": <integer 0 to 100>
              },
              "strengths": ["strength 1", "strength 2", "strength 3"],
              "improvements": ["improvement 1", "improvement 2", "improvement 3"],
              "questionsReview": [
                {
                  "question": "<question text>",
                  "answer": "<user's answer>",
                  "ideal": "<a brief summary of what the ideal answer should have included>",
                  "feedback": "<detailed feedback on user's answer>",
                  "score": <integer 0 to 100>
                }
              ]
            }`;
            
            const resultRaw = await GeminiService.call([{ role: 'user', content: evaluationPrompt }], true);
            
            // Parse result
            const report = JSON.parse(resultRaw.trim());
            renderReportCard(report);
            
        } catch (err) {
            console.error("Gemini grading failed. Falling back to local heuristics:", err);
            generateLocalHeuristicsReport();
        }
    } else {
        // Local Heuristic Mode
        setTimeout(() => {
            generateLocalHeuristicsReport();
        }, 1500);
    }
}

/**
 * Fallback local evaluation grading using string/heuristic metrics
 */
function generateLocalHeuristicsReport() {
    let totalScore = 0;
    const questionsReview = [];
    
    const buzzwords = {
        "software-engineer": ["scalability", "complexity", "big o", "rest", "cache", "index", "concurrency", "trade-off", "performance", "testing", "abstraction", "modular"],
        "frontend-developer": ["dom", "lighthouse", "rendering", "paint", "reflow", "component", "state", "closure", "semantic", "responsive", "bundle", "webpack", "vite"],
        "product-manager": ["user-centric", "roadmap", "rice", "kpi", "mvp", "retention", "metrics", "alignment", "stakeholders", "monetization", "lifecycle"],
        "data-scientist": ["overfitting", "precision", "recall", "gradient", "hyperparameter", "regression", "neural", "classification", "variance", "imputation"],
        "ui-ux-designer": ["wireframe", "persona", "friction", "contrast", "wcag", "consistency", "accessibility", "prototype", "hierarchy", "typography"]
    };
    
    const roleBuzzwords = buzzwords[AppState.jobRole] || buzzwords["software-engineer"];
    
    // Evaluate question answers
    for (let i = 0; i < AppState.answers.length; i++) {
        const answer = AppState.answers[i];
        const question = AppState.questions[i];
        
        // Simple rating metric: word count & buzzword matching
        const wordsCount = answer.split(/\s+/).filter(w => w.length > 0).length;
        const matchingBuzzwords = roleBuzzwords.filter(bw => answer.toLowerCase().includes(bw));
        
        let qScore = 40; // baseline for attempt
        if (wordsCount > 20) qScore += 15;
        if (wordsCount > 50) qScore += 15;
        if (wordsCount > 100) qScore += 10;
        
        // Add buzzword bonuses
        qScore += Math.min(matchingBuzzwords.length * 5, 20);
        qScore = Math.min(qScore, 100);
        totalScore += qScore;
        
        // Construct mock ideal criteria
        let idealText = "A robust response should define the concepts clearly, mention structural trade-offs, address edge cases, and give practical architectural or implementation examples.";
        
        questionsReview.push({
            question: question,
            answer: answer,
            ideal: idealText,
            feedback: `Your response was about ${wordsCount} words long. You incorporated key terms such as: ${matchingBuzzwords.join(', ') || 'none'}. ${wordsCount < 30 ? 'To improve, try to provide more detailed, structural reasoning.' : 'Solid length. Continue focusing on specific design examples and trade-offs.'}`,
            score: qScore
        });
    }
    
    const avgScore = Math.round(totalScore / AppState.answers.length);
    
    // Heuristic Subscores
    const depth = Math.min(avgScore + Math.floor(Math.random() * 8) - 4, 100);
    const communication = Math.round(Math.min(50 + (AppState.answers.reduce((acc, curr) => acc + curr.length, 0) / 15), 100));
    const problemSolving = Math.min(avgScore + Math.floor(Math.random() * 12) - 6, 100);
    
    // Setup generic strengths/weaknesses
    let strengths = [
        "Good core attempt across all asked interview questions.",
        "Demonstrated familiarity with key domain terminology.",
        "Provided relevant, structural answers to theoretical questions."
    ];
    let improvements = [
        "Expand answers with more contextual and architectural examples.",
        "Ensure answers directly structure trade-offs (e.g. Pros vs Cons).",
        "Practice mock talking to elaborate answers without relying on brief sentences."
    ];
    
    let gradeText = "Keep practicing to raise your score!";
    if (avgScore >= 85) gradeText = "Excellent Performance! Strong hire recommendation.";
    else if (avgScore >= 70) gradeText = "Solid performance. A few target areas to grow.";
    
    const report = {
        overallScore: avgScore,
        gradeText: gradeText,
        metrics: {
            depth: depth,
            communication: communication,
            problemSolving: problemSolving
        },
        strengths: strengths,
        improvements: improvements,
        questionsReview: questionsReview
    };
    
    renderReportCard(report);
}

function renderReportCard(report) {
    showScreen('report-screen');
    setSystemStatus('idle');
    updateSpeechBubble(`Interview Complete! Overall Score: ${report.overallScore}%. Let's review the feedback together!`, 8000);
    
    // 1. Set values
    dom.scoreNum.innerText = report.overallScore;
    dom.gradeText.innerText = report.gradeText;
    
    // Animate circular SVG stroke
    // Circumference = 2 * PI * r = 2 * 3.14159 * 40 = 251.2
    const offset = 251.2 - (251.2 * report.overallScore) / 100;
    gsap.to(dom.scoreCircle, { strokeDashoffset: offset, duration: 1.2, ease: "power2.out" });
    
    // 2. Set bar metrics
    dom.metricDepthVal.innerText = `${report.metrics.depth}%`;
    gsap.to(dom.metricDepthFill, { width: `${report.metrics.depth}%`, duration: 1.0 });
    
    dom.metricCommVal.innerText = `${report.metrics.communication}%`;
    gsap.to(dom.metricCommFill, { width: `${report.metrics.communication}%`, duration: 1.0, delay: 0.15 });
    
    dom.metricProblemVal.innerText = `${report.metrics.problemSolving}%`;
    gsap.to(dom.metricProblemFill, { width: `${report.metrics.problemSolving}%`, duration: 1.0, delay: 0.3 });
    
    // 3. Populate lists
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
    
    // 4. Populate accordion
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
    
    // re-init icons for the new elements
    lucide.createIcons();
}

// Global accordion toggle helper
window.toggleAccordion = function(element) {
    const parent = element.parentElement;
    const isActive = parent.classList.contains('active');
    
    // Collapse all other items
    document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('active');
    });
    
    if (!isActive) {
        parent.classList.add('active');
    }
};

// ==========================================
// SYSTEM MODAL & SETTINGS
// ==========================================
const SettingsManager = {
    init() {
        // Fill inputs from State
        dom.apiKeyInput.value = AppState.apiKey;
        dom.pitchRange.value = AppState.voicePitch;
        dom.rateRange.value = AppState.voiceRate;
        dom.pitchVal.innerText = AppState.voicePitch.toFixed(1);
        dom.rateVal.innerText = AppState.voiceRate.toFixed(1);
        
        // Modal Event Listeners
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
        if (visible) {
            dom.settingsModal.classList.add('active');
        } else {
            dom.settingsModal.classList.remove('active');
        }
    },

    save() {
        AppState.apiKey = dom.apiKeyInput.value.trim();
        AppState.voicePitch = parseFloat(dom.pitchRange.value);
        AppState.voiceRate = parseFloat(dom.rateRange.value);
        
        if (dom.voiceSelect.value) {
            AppState.voiceName = dom.voiceSelect.value;
            localStorage.setItem('voice_name', AppState.voiceName);
        }

        localStorage.setItem('gemini_api_key', AppState.apiKey);
        localStorage.setItem('voice_pitch', AppState.voicePitch);
        localStorage.setItem('voice_rate', AppState.voiceRate);

        this.show(false);
        
        setSystemStatus('idle');
        updateSpeechBubble("System configurations saved successfully!", 4000);
    },

    clearKey() {
        dom.apiKeyInput.value = '';
        AppState.apiKey = '';
        localStorage.removeItem('gemini_api_key');
        alert("API Key cleared from local storage.");
    }
};

// ==========================================
// CORE INITIALIZATION
// ==========================================
function initApp() {
    // 1. Initialize 3D Engine
    AppState.scene3D = new AIInterviewer3D('canvas-container');

    // 2. Initialize Voice components
    Speech.init();
    Transcriber.init();

    // 3. Initialize Settings modal
    SettingsManager.init();

    // 4. Form/Action event binds
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

    // Say welcome
    setTimeout(() => {
        updateSpeechBubble("Welcome to IntervAI! Customize your interview parameters on the dashboard, and click Start when you're ready.", 8000);
    }, 1500);
}

// Start everything when scripts load
window.addEventListener('load', initApp);
