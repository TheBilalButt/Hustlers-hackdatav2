# HackDataV2 — Synthetic Data Platform

> Synthetic data you don't have to take on faith.

A no-code platform that generates a coherent **synthetic world**: tabular data,
relational databases, and financial documents (invoices, bank statements) that
agree with each other. Every dataset ships with a **Trust Report** proving it
is correct, realistic, and safe.

## Quick start

### Backend
```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```

### Frontend
```bash
pnpm install
pnpm dev
```

### Tests
```bash
pytest -q                   # all tests
pytest tests/redteam -q     # red-team suite
```

## Architecture
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design.

## License
MIT
