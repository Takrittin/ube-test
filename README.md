# UBE Smart Inspection Demo

A small, local interview demo of the core workflow for a Smart Mobile AI
Inspection & Traceability Platform.

The project intentionally contains only the demonstration workflow:

1. Find a sample production lot.
2. Upload and preview a product image.
3. Receive a filename-based mock AI recommendation.
4. Record the inspector's final Pass or Fail decision.
5. Save the inspection in SQLite.
6. Search and review inspection history.

## Project structure

```text
ube-inspection-demo/
├── frontend/   # Next.js, TypeScript and Tailwind CSS
├── backend/    # FastAPI, SQLAlchemy and SQLite
└── README.md
```

The two applications run separately:

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:8000>
- Swagger API documentation: <http://localhost:8000/docs>

## Requirements

- Node.js 20.9 or newer
- npm
- Python 3.11 or newer

## 1. Start the backend

From the `backend` folder, create and activate a virtual environment, install
the packages, and start FastAPI:

```bash
cd ube-inspection-demo/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python -m uvicorn app.main:app --reload --port 8000
```

The parent folder in this workspace contains a colon (`:`). Some macOS Python
installations do not allow a virtual environment at such a path. If that
happens, create the environment outside the project:

```bash
python3 -m venv ~/.venvs/ube-inspection-demo
source ~/.venvs/ube-inspection-demo/bin/activate
python -m pip install -r requirements-dev.txt
python -m uvicorn app.main:app --reload --port 8000
```

SQLite creates `backend/inspection.db` automatically. Uploaded demo images are
stored in `backend/uploads/`.

## 2. Start the frontend

Open a second terminal:

```bash
cd ube-inspection-demo/frontend
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

## Run with Docker

Install and start Docker Desktop, then run this command from the project root:

```bash
cd ube-inspection-demo
docker compose up --build
```

Open <http://localhost:3000>. The API documentation is available at
<http://localhost:8000/docs>.

To stop the containers, press `Ctrl+C`. To start them again in the background:

```bash
docker compose up -d
```

Inspection records and uploaded images are retained in the `inspection_data`
Docker volume. To remove all Docker data and start with an empty history:

```bash
docker compose down -v
```

## Demo data

Use any of these lot numbers:

- `PB-2026-001`
- `PB-2026-002`
- `PB-2026-003`

The selected image filename determines the mock result:

| Filename contains | Recommendation | Confidence | Possible defect |
| --- | --- | ---: | --- |
| `pass` | Pass | 94% | None |
| `torn` | Fail | 92% | Torn or Damaged Bag |
| `stain` | Fail | 90% | Stain or Contamination |
| `print` | Fail | 91% | Printing Defect |
| Anything else | Manual Review | 65% | None |

For example, rename a JPEG to `sample-pass.jpg` to demonstrate a Pass result
or `sample-torn.jpg` to demonstrate a Fail result.

## Validation

Run the backend tests:

```bash
cd ube-inspection-demo/backend
source .venv/bin/activate
pytest -q
```

If the virtual environment was created outside the project, activate that path
instead.

Run the frontend production build:

```bash
cd ube-inspection-demo/frontend
npm run build
```

## Demo boundaries

This project does not include authentication, user management, a real AI model,
cloud storage, PostgreSQL, ERP/MES integration, or production security
hardening. AI output is only a recommendation; the inspector remains
responsible for the final Pass or Fail decision. “Manual Review” is an AI
recommendation only and cannot be saved as the final disposition.
