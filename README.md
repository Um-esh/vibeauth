# Instant Persona & Communication Transformer

A complete, local, machine-learning-powered web application that rewrites text into communication appropriate for different target audiences (Executive, Supportive Peer, Legal / Compliance, Gen-Z Casual) while preserving facts, entities, numbers, dates, obligations, and intent.

**Strictly 100% Offline Local Machine Learning:** No OpenAI, no Claude, no Gemini, no Groq, no external inference APIs. All inference runs locally on your computer via PyTorch, Hugging Face Transformers, Sentence Transformers, and scikit-learn.

---

## 🌟 Project Uniqueness

> Unlike generic generative AI wrappers that send proprietary business communications to cloud APIs and risk hallucinations, **Instant Persona & Communication Transformer** is a 100% local, privacy-first NLP system with an independent fact-preservation guardrail engine. It doesn't just adapt tone across executive, peer, legal, and casual personas using on-device Sequence-to-Sequence models—it actively validates that every number, date, commitment, and named entity remains mathematically and semantically intact. Combined with real-time multi-language translation, vCard contact parsing, and zero-tab direct background dispatch via linked Gmail and WhatsApp, it bridges the gap between raw AI style transfer and secure, audit-ready enterprise communication.

📖 **Looking for the presentation script and defense?** See the full [Presentation Guide](presentation_guide.md).

---

## Architecture Overview

```
                                  [ User Input Text ]
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │ Stage 1: Input Processing             │
                      │ Tokenization, regex entity/date/      │
                      │ number extraction, readability stats  │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │ Stage 2: Intent & Style Analysis      │
                      │ Pretrained / Scikit-learn Classifiers │
                      │ (Intent, Formality, Confidence)       │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │ Stage 3: Persona-Aware Generation     │
                      │ Local PyTorch FLAN-T5 (Seq2Seq)       │
                      │ Conditioned on Persona + 6 Attributes │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │ Stage 4: Preservation Validation      │
                      │ Entity, numerical, date, negation,    │
                      │ obligation & MiniLM semantic checks   │
                      └───────────────────┬───────────────────┘
                                          │
                        Failed Constraints? ──► Yes ──► [ Stage 5: Corrective Regeneration ]
                                          │                           │
                                          No                          │
                                          ▼                           │
                      ┌───────────────────────────────────────┐       │
                      │ Stage 6: Textual Change Diff          │◄──────┘
                      │ difflib token opcodes, word counts,   │
                      │ lexical edit percentage formula       │
                      └───────────────────┬───────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │ Stage 7: Structured Output & History  │
                      │ SQLite Persistence, React Plain-CSS   │
                      │ Side-by-Side / Inline Diff UI         │
                      └───────────────────────────────────────┘
```

---

## Mandatory Technology Stack

- **Frontend**: React 18, JSX, plain CSS with custom CSS variables. Clean component hierarchy. Built and bundled via Vite.
- **Backend**: Python 3.12 (also compatible with 3.10 and 3.11), Flask 3.0 application factory with Blueprints, Flask-CORS, Pydantic v2 validation.
- **Machine Learning & NLP**:
  - **Generation**: `google/flan-t5-small` (~308 MB, Apache 2.0 license) via PyTorch and Hugging Face Transformers.
  - **Semantic Similarity**: `sentence-transformers/all-MiniLM-L6-v2` (~85 MB, Apache 2.0 license) with scikit-learn TF-IDF fallback.
  - **Intent & Formality**: Scikit-learn TF-IDF Logistic Regression pipeline with reproducible dataset and cross-validation reports.
  - **Diff Engine**: Python `difflib` token SequenceMatcher.
- **Database**: SQLite via SQLAlchemy (`HistoryItem`).
- **Tests**: `pytest` covering API routes, preservation checks, diff calculations, and ML inference.

---

## Windows 10/11 Setup and Execution Guide

This guide is written specifically for Windows users using **PowerShell**, VS Code, or PyCharm.

### Step 1: Prerequisites

1. **Python**: Python 3.10, 3.11, or 3.12 (64-bit).
2. **Node.js**: Node.js v18 LTS or v20+ LTS with npm.
3. **Git**: Installed and available in PATH.
4. **Hardware Requirements**:
   - **RAM**: 8 GB minimum (16 GB recommended).
   - **Disk Space**: ~2 GB free disk space (models + dependencies).
   - **Processor**: Standard modern x64 CPU. (CUDA GPU is optional).

Verify installed tools in PowerShell:
```powershell
py --version        # or python --version
node --version      # should output v18.x or v20.x+
npm --version       # should output 9.x or 10.x+
git --version
```

---

### Step 2: Project Setup & Virtual Environment

Open PowerShell and navigate to the project directory:

```powershell
cd c:\Users\smyaj\PycharmProjects\vibeath
```

#### 1. Create and Activate Python Virtual Environment
```powershell
# Create venv
py -3.12 -m venv venv

# If PowerShell blocks script execution, temporarily allow it for the current process:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Activate venv
.\venv\Scripts\Activate.ps1
```

#### 2. Install Python Backend Dependencies
```powershell
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
```

#### 3. Install React Frontend Dependencies
```powershell
cd frontend
npm install
cd ..
```

#### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

---

### Step 3: Model Download & Offline Preparation

Download the required lightweight models directly to `backend/models_cache`:

```powershell
.\venv\Scripts\python.exe backend\scripts\download_models.py
```

**Download Breakdown:**
- **FLAN-T5-small**: ~308 MB (Seq2Seq text generation model)
- **all-MiniLM-L6-v2**: ~85 MB (Dense sentence similarity embeddings)
- **Total Download Size**: ~393 MB

Train the communicational intent and formality classifiers (uses included reproducible dataset):
```powershell
.\venv\Scripts\python.exe backend\scripts\train_classifier.py
```

#### Enable Strict Offline Mode:
Open `.env` in the root folder and verify:
```ini
OFFLINE_MODE=true
DEVICE=cpu
```
When `OFFLINE_MODE=true`, the backend sets `HF_HUB_OFFLINE=1` and `local_files_only=True`, completely blocking any external network attempts.

---

### Step 4: Start the Application

You will run the backend and frontend in **two separate PowerShell terminals**.

#### Terminal 1: Flask Backend
```powershell
cd c:\Users\smyaj\PycharmProjects\vibeath
.\venv\Scripts\Activate.ps1
$env:PYTHONPATH="."
python backend\run.py
```
Expected output:
```
=======================================================
 Instant Persona & Communication Transformer API
 Running at: http://127.0.0.1:5000/api/health
=======================================================
```

#### Terminal 2: React Frontend
```powershell
cd c:\Users\smyaj\PycharmProjects\vibeath\frontend
npm run dev
```
Expected output:
```
  VITE v5.4.21  ready in 200 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open your browser to: **`http://localhost:5173`**

---

### Step 5: Testing the Application

1. Open `http://localhost:5173`.
2. Look at the top bar: you will see a badge reading **`100% Offline (Local ML)`**.
3. Select an example message from the dropdown (e.g. *Project Delay & Budget Notice*).
4. Choose **Executive / C-Level** persona.
5. Set Conciseness to 5, Formality to 4.
6. Click **Transform Message**.
7. Observe:
   - Generated text appears with word count delta and inference latency.
   - Switch to **Comparison Diff** tab: inspect Side-by-Side or Inline Diff highlights (added in green, removed in red, replaced in yellow).
   - Switch to **Preservation Analysis** tab: check named-entity preservation, numerical & date checks, polarity preservation, and semantic similarity score.
   - Switch to **History** tab: view saved entries in SQLite; click **Restore in Editor** to reload past transformations.

---

### Step 6: Troubleshooting Guide

| Issue | Root Cause | Solution |
|---|---|---|
| `python : The term 'python' is not recognized` | Python not in system PATH | Use `py -3.12` or explicitly call `C:\Users\<user>\AppData\Local\Programs\Python\Python312\python.exe`. |
| `Activate.ps1 cannot be loaded because running scripts is disabled` | Windows PowerShell ExecutionPolicy | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in the current terminal, then activate. |
| `ModuleNotFoundError: No module named 'backend'` | `PYTHONPATH` not pointing to project root | Run `$env:PYTHONPATH="."` in PowerShell before launching scripts or tests. |
| `Offline model loading error / FileNotFoundError` | Models not yet downloaded to local folder | Run `python backend\scripts\download_models.py` while connected to the internet once. |
| `Port 5000 or 5173 already in use` | Another service is using the port | In `.env`, change `PORT=5001`, or stop conflicting processes with `Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess`. |
| `Slow CPU generation` | Model executing without AVX2 or high token length | Keep `MAX_GENERATION_TOKENS=256` (default). Typical CPU latency for FLAN-T5-small is 1.5 - 3.5 seconds. |

---

### Step 7: Run Automated Tests & Benchmarks

Run the complete pytest test suite (22 unit, integration, and preservation tests):
```powershell
$env:PYTHONPATH="."
.\venv\Scripts\pytest.exe backend\tests -v
```

Run the ML benchmark evaluation script:
```powershell
$env:PYTHONPATH="."
.\venv\Scripts\python.exe backend\scripts\benchmark_ml.py
```
This generates `backend/data/ml_benchmark_report.json` with latency, memory usage, semantic similarity, and preservation rates across all 4 personas.

Test building the React frontend for production:
```powershell
cd frontend
npm run build
cd ..
```

---

### Step 8: Verifying Offline Operation (No Internet)

To verify that the application has zero cloud or external API dependencies:
1. Disconnect your Windows computer from Wi-Fi and unplug Ethernet.
2. In `.env`, ensure `OFFLINE_MODE=true`.
3. In PowerShell, run:
   ```powershell
   $env:OFFLINE_MODE="true"
   $env:HF_HUB_OFFLINE="1"
   $env:PYTHONPATH="."
   .\venv\Scripts\pytest.exe backend\tests -v
   ```
4. Start `python backend\run.py` and `npm --prefix frontend run dev`.
5. Enter a new message and click **Transform Message**.
6. The entire ML pipeline executes offline without sending any outbound network packets.

---

### Step 9: Licenses & Attributions

- **FLAN-T5**: Apache License 2.0 (Google Research).
- **Sentence Transformers (all-MiniLM-L6-v2)**: Apache License 2.0.
- **Scikit-Learn**: BSD 3-Clause License.
- **PyTorch**: Modified BSD License.
- **Flask**: BSD 3-Clause License.
- **React**: MIT License.

---

### Final Verification Checklist

- [x] Flask backend running locally without cloud dependencies.
- [x] React frontend written with reusable components and plain CSS (no Tailwind/Bootstrap/MUI).
- [x] Local sequence-to-sequence FLAN-T5 model performing genuine ML inference.
- [x] 4 Primary Personas (Executive, Peer, Legal, Casual) + 6 adjustable sliders.
- [x] Stage 1 & 2 Text Analyzer with scikit-learn intent & formality classifiers.
- [x] Stage 4 Preservation checks: Named entities, numbers, dates, contacts, negation polarity.
- [x] Stage 5 Controlled corrective regeneration mechanism.
- [x] Stage 6 Lexical diff with word-change formula, side-by-side and inline visual highlights.
- [x] Stage 7 SQLite persistence with full history CRUD (get, restore, delete, clear).
- [x] Offline mode tested with `OFFLINE_MODE=true` and `HF_HUB_OFFLINE=1`.
- [x] 22 pytest automated tests passing.
- [x] ML benchmark script measuring latency, memory, similarity, and accuracy.
