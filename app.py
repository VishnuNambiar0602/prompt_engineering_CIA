import os
import json
import uuid
import random
import requests
from flask import Flask, render_template, request, jsonify

app = Flask(__name__, template_folder='templates', static_folder='static')

# In-memory session store (resets on server restart)
sessions = {}

# Load Gemini API Key from local config.json if present
API_KEY = ""
config_path = os.path.join(os.path.dirname(__file__), 'config.json')
if os.path.exists(config_path):
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
            API_KEY = config.get("gemini_api_key", "")
    except Exception as e:
        print(f"Error loading config.json: {e}")

# ==========================================
# OFFLINE PRESET QUESTION DATABASE
# ==========================================
INTERVIEW_QUESTION_DATABASE = {
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
}

# ==========================================
# GEMINI CLIENT SERVICE
# ==========================================
def call_gemini(messages, api_key, response_format_json=False):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    contents = []
    for msg in messages:
        contents.append({
            "role": "model" if msg["role"] == "assistant" else "user",
            "parts": [{"text": msg["content"]}]
        })
    body = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.6,
            "topP": 0.95
        }
    }
    if response_format_json:
        body["generationConfig"]["responseMimeType"] = "application/json"
    
    headers = {"Content-Type": "application/json"}
    resp = requests.post(url, json=body, headers=headers, timeout=30)
    if resp.status_code != 200:
        raise Exception(f"Gemini API Error: {resp.text}")
    data = resp.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


# ==========================================
# FLASK ROUTING
# ==========================================
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    global API_KEY
    if request.method == 'GET':
        return jsonify({"has_api_key": bool(API_KEY)})
    else:
        data = request.json or {}
        new_key = data.get("gemini_api_key", "").strip()
        
        # Update config.json file
        try:
            with open(config_path, 'w') as f:
                json.dump({"gemini_api_key": new_key}, f)
            API_KEY = new_key
            return jsonify({"status": "success", "has_api_key": bool(API_KEY)})
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/start', methods=['POST'])
def start_interview():
    data = request.json or {}
    role = data.get('jobRole', 'software-engineer')
    itype = data.get('interviewType', 'technical')
    difficulty = data.get('difficulty', 'mid')
    total_questions = int(data.get('totalQuestionsCount', 5))
    
    session_id = str(uuid.uuid4())
    
    # Initialize session state
    sessions[session_id] = {
        "jobRole": role,
        "interviewType": itype,
        "difficulty": difficulty,
        "totalQuestionsCount": total_questions,
        "questions": [],
        "answers": [],
        "history": []
    }
    
    # 1st Question Decision
    first_question = ""
    if API_KEY:
        try:
            system_prompt = (
                f"You are an elite, highly professional AI interviewer conducting a {difficulty} level "
                f"{itype} mock interview for the position of {role}.\n"
                f"You will conduct an interview containing {total_questions} questions.\n"
                f"I want you to ask the VERY FIRST question of the interview. Keep the question crisp, clear, "
                f"and relevant. Do not include introductory conversational noise beyond a brief 'Welcome to your "
                f"mock interview! Let's get started.'\n"
                f"Ask exactly ONE question and stop."
            )
            sessions[session_id]["history"].append({"role": "user", "content": system_prompt})
            first_question = call_gemini(sessions[session_id]["history"], API_KEY)
        except Exception as e:
            print(f"Gemini start failed, using preset: {e}")
            first_question = get_preset_question(role, itype, difficulty, 0)
    else:
        first_question = get_preset_question(role, itype, difficulty, 0)
        
    sessions[session_id]["questions"].append(first_question)
    sessions[session_id]["history"].append({"role": "assistant", "content": first_question})
    
    return jsonify({
        "session_id": session_id,
        "question": first_question,
        "total_questions": total_questions
    })


@app.route('/api/answer', methods=['POST'])
def submit_answer():
    data = request.json or {}
    session_id = data.get('session_id')
    answer = data.get('answer', '').strip()
    
    if not session_id or session_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400
        
    session = sessions[session_id]
    session["answers"].append(answer)
    current_q_idx = len(session["answers"])
    
    # Is interview completed?
    if current_q_idx >= session["totalQuestionsCount"]:
        return jsonify({
            "finished": True,
            "progress": current_q_idx,
            "total": session["totalQuestionsCount"]
        })
        
    # Generate Next Question
    next_question = ""
    if API_KEY:
        try:
            prompt = (
                f"Candidate answer: {answer}\n\n"
                f"Please evaluate this response briefly in 1 encouraging sentence, and then ask Question "
                f"{current_q_idx + 1} of {session['totalQuestionsCount']}. Keep the question challenging "
                f"and relevant. Ask exactly ONE question and stop."
            )
            session["history"].append({"role": "user", "content": prompt})
            next_question = call_gemini(session["history"], API_KEY)
        except Exception as e:
            print(f"Gemini next question failed, using preset: {e}")
            next_question = get_preset_question(session["jobRole"], session["interviewType"], session["difficulty"], current_q_idx)
    else:
        next_question = get_preset_question(session["jobRole"], session["interviewType"], session["difficulty"], current_q_idx)
        
    session["questions"].append(next_question)
    session["history"].append({"role": "assistant", "content": next_question})
    
    return jsonify({
        "finished": False,
        "question": next_question,
        "progress": current_q_idx + 1,
        "total": session["totalQuestionsCount"]
    })


@app.route('/api/evaluate', methods=['POST'])
def evaluate_interview():
    data = request.json or {}
    session_id = data.get('session_id')
    
    if not session_id or session_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400
        
    session = sessions[session_id]
    
    # Fallback to local grader if no key or key fails
    if API_KEY:
        try:
            transcript_text = ""
            for i in range(len(session["answers"])):
                q = session["questions"][i] if i < len(session["questions"]) else ""
                ans = session["answers"][i]
                transcript_text += f"Question {i+1}: {q}\nAnswer {i+1}: {ans}\n\n"
                
            evaluation_prompt = (
                f"You are the lead hiring panel. Evaluate the following mock interview session for a "
                f"{session['difficulty']} level {session['jobRole']} role:\n\n"
                f"{transcript_text}\n"
                f"You must return a raw JSON response. Do not surround the JSON in markdown code blocks or add text context. "
                f"The JSON object structure MUST be exactly:\n"
                f"{{\n"
                f"  \"overallScore\": <integer 0 to 100>,\n"
                f"  \"gradeText\": \"<string summarizing performance>\",\n"
                f"  \"metrics\": {{\n"
                f"    \"depth\": <integer 0 to 100>,\n"
                f"    \"communication\": <integer 0 to 100>,\n"
                f"    \"problemSolving\": <integer 0 to 100>\n"
                f"  }},\n"
                f"  \"strengths\": [\"strength 1\", \"strength 2\", \"strength 3\"],\n"
                f"  \"improvements\": [\"improvement 1\", \"improvement 2\", \"improvement 3\"],\n"
                f"  \"questionsReview\": [\n"
                f"    {{\n"
                f"      \"question\": \"<question text>\",\n"
                f"      \"answer\": \"<user's answer>\",\n"
                f"      \"ideal\": \"<a brief summary of what the ideal answer should have included>\",\n"
                f"      \"feedback\": \"<detailed feedback on user's answer>\",\n"
                f"      \"score\": <integer 0 to 100>\n"
                f"    }}\n"
                f"  ]]\n"
                f"}}\n"
            )
            # Correct double bracket format typo
            evaluation_prompt = evaluation_prompt.replace("]]", "]")
            
            result_raw = call_gemini([{"role": "user", "content": evaluation_prompt}], API_KEY, response_format_json=True)
            report = json.loads(result_raw.strip())
            return jsonify(report)
        except Exception as e:
            print(f"Gemini evaluation failed, falling back to heuristics: {e}")
            report = generate_local_evaluation(session)
            return jsonify(report)
    else:
        report = generate_local_evaluation(session)
        return jsonify(report)


# ==========================================
# BACKEND UTILITY FUNCTIONS
# ==========================================
def get_preset_question(role, itype, difficulty, index):
    role_db = INTERVIEW_QUESTION_DATABASE.get(role) or INTERVIEW_QUESTION_DATABASE.get("software-engineer")
    type_db = role_db.get(itype) or role_db.get("technical")
    pool = type_db.get(difficulty) or type_db.get("mid")
    
    if index < len(pool):
        return pool[index]
    
    # Fallback to random if index out of bounds
    return random.choice(pool) if pool else f"Can you share another key architecture decision relative to {role}?"


def generate_local_evaluation(session):
    total_score = 0
    questions_review = []
    
    buzzwords = {
        "software-engineer": ["scalability", "complexity", "big o", "rest", "cache", "index", "concurrency", "trade-off", "performance", "testing", "abstraction", "modular"],
        "frontend-developer": ["dom", "lighthouse", "rendering", "paint", "reflow", "component", "state", "closure", "semantic", "responsive", "bundle", "webpack", "vite"],
        "product-manager": ["user-centric", "roadmap", "rice", "kpi", "mvp", "retention", "metrics", "alignment", "stakeholders", "monetization", "lifecycle"],
        "data-scientist": ["overfitting", "precision", "recall", "gradient", "hyperparameter", "regression", "neural", "classification", "variance", "imputation"],
        "ui-ux-designer": ["wireframe", "persona", "friction", "contrast", "wcag", "consistency", "accessibility", "prototype", "hierarchy", "typography"]
    }
    
    role_buzzwords = buzzwords.get(session["jobRole"]) or buzzwords["software-engineer"]
    answers = session["answers"]
    questions = session["questions"]
    
    for i in range(len(answers)):
        answer = answers[i]
        question = questions[i] if i < len(questions) else ""
        
        words_count = len(answer.split())
        matching = [bw for bw in role_buzzwords if bw in answer.lower()]
        
        q_score = 40 # Baseline for attempt
        if words_count > 20: q_score += 15
        if words_count > 50: q_score += 15
        if words_count > 100: q_score += 10
        
        q_score += min(len(matching) * 5, 20)
        q_score = min(q_score, 100)
        total_score += q_score
        
        ideal_text = "A robust response should define the concepts clearly, mention structural trade-offs, address edge cases, and give practical architectural or implementation examples."
        
        questions_review.append({
            "question": question,
            "answer": answer,
            "ideal": ideal_text,
            "feedback": (
                f"Your response was {words_count} words long. You incorporated key terms such as: "
                f"{', '.join(matching) if matching else 'none'}. "
                f"{'To improve, try to provide more detailed, structural reasoning.' if words_count < 30 else 'Solid length. Continue focusing on specific design examples and trade-offs.'}"
            ),
            "score": q_score
        })
        
    avg_score = round(total_score / len(answers)) if answers else 0
    depth = min(avg_score + random.randint(-4, 4), 100)
    
    total_length = sum(len(a) for a in answers)
    communication = round(min(50 + (total_length / 15), 100))
    problem_solving = min(avg_score + random.randint(-6, 6), 100)
    
    strengths = [
        "Good core attempt across all asked interview questions.",
        "Demonstrated familiarity with key domain terminology.",
        "Provided relevant, structural answers to theoretical questions."
    ]
    improvements = [
        "Expand answers with more contextual and architectural examples.",
        "Ensure answers directly structure trade-offs (e.g. Pros vs Cons).",
        "Practice mock talking to elaborate answers without relying on brief sentences."
    ]
    
    grade_text = "Keep practicing to raise your score!"
    if avg_score >= 85:
        grade_text = "Excellent Performance! Strong hire recommendation."
    elif avg_score >= 70:
        grade_text = "Solid performance. A few target areas to grow."
        
    return {
        "overallScore": avg_score,
        "gradeText": grade_text,
        "metrics": {
            "depth": depth,
            "communication": communication,
            "problemSolving": problem_solving
        },
        "strengths": strengths,
        "improvements": improvements,
        "questionsReview": questions_review
    }


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
