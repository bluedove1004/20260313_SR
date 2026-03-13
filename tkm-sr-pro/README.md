# TKM-SR Pro (AI-based Systematic Review Platform for Traditional Korean Medicine) 🚀

This repository contains the monorepo for **TKM-SR Pro**, an AI-assisted end-to-end systematic literature review mapping tool tailored for Traditional Korean Medicine clinical trials.

## 🛠 Project Structure

- **`frontend/`**: React 18, TypeScript, Tailwind CSS, Zustand, React Router, Vite
- **`backend/`**: Django 4.2 API Server connecting to PostgreSQL and orchestrating the Pipeline
- **`backend/ai_engine/`**: FastAPI server hosting Mock/ML pipelines for RCT classification
- **`docker-compose.yml`**: Full deployment suite containing DB, Search Engine, and Microservices

## ⚡ Setup & Run (Docker)

To run the entire TKM-SR Pro project seamlessly using Docker:

1. Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running on your system (especially if you are on macOS).
2. In the root directory, run:
```bash
docker compose up --build -d
```
3. Docker will automatically launch 5 containers:
    - **PostgreSQL** (`db`): Port 5432
    - **Elasticsearch** (`es`): Port 9200
    - **Django Backend** (`backend`): Port 8000
    - **AI Engine (FastAPI)** (`ai_engine`): Port 8001
    - **React Frontend (Nginx)** (`frontend`): Port 80

4. Access the Platform:
    - Open your browser and navigate to `http://localhost:80` (or `http://localhost`)

## 🛠 Features Implemented (Phase 1)

1. **Integrated Search** (Module 1): Federated PubMed API calls and mock queries.
2. **Hybrid Deduplication** (Module 2): 3-Stage fuzzy-logic duplication remover focusing on PMID/DOI and multi-lingual titles.
3. **RCT Classification** (Module 3): Text heuristics and BERT skeleton to extract evidence and confidence scores for filtering Non-RCT papers.
4. **PDF Full-text Extraction** (Modules 4/5): PyMuPDF based IMRaD section chunking and PICO parameter extractions (n-sizes, p-values).
5. **Human-in-the-Loop Interactivity**: Every step allows explicit user confirmation or overrides.

## 📝 Developer Notes
The `backend/entrypoint.sh` will automatically wait for PostgreSQL & Elasticsearch to boot, execute Django's database migrations (`python manage.py migrate`), and launch Gunicorn.
