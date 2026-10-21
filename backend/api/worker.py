"""Worker de processamento: pega as tarefas da tabela jobs, uma por vez, e gera o LRC.

Uso (dentro de backend/):
    python -m api.worker          # fica rodando e verificando a fila
    python -m api.worker --once   # processa o que estiver na fila e sai

Pensado para um único worker: ao iniciar, tarefas que ficaram "running" são marcadas como falhas.
"""

import argparse
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from api.config import get_settings
from api.database import SessionLocal, check_tables
from api.models import Job, JobStatus, SongStatus
from api.models.base import utcnow
from api.services.pipeline import process_job


def claim_next_job(db: Session) -> Job | None:
    stmt = (
        select(Job)
        .where(Job.status == JobStatus.QUEUED)
        .order_by(Job.created_at)
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    job = db.scalars(stmt).first()
    if job is not None:
        job.status = JobStatus.RUNNING
        job.started_at = utcnow()
        db.commit()
    return job


def recover_interrupted_jobs(db: Session) -> None:
    for job in db.scalars(select(Job).where(Job.status == JobStatus.RUNNING)):
        job.status = JobStatus.FAILED
        job.error = "O worker foi interrompido durante o processamento. Reprocesse a música."
        job.finished_at = utcnow()
        job.song.status = SongStatus.FAILED
    db.commit()


def run(once: bool = False) -> None:
    check_tables()
    with SessionLocal() as db:
        recover_interrupted_jobs(db)
    print("Worker iniciado. Aguardando tarefas...")
    while True:
        with SessionLocal() as db:
            job = claim_next_job(db)
            if job is not None:
                print(f"Processando a tarefa {job.id} ({job.song.artist} - {job.song.title}, método {job.method})")
                process_job(db, job)
                print(f"Tarefa {job.id}: {job.status}")
        if job is None:
            if once:
                return
            time.sleep(get_settings().worker_poll_seconds)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Worker de processamento da curadoria.")
    parser.add_argument("--once", action="store_true", help="processa a fila atual e sai")
    run(once=parser.parse_args().once)
