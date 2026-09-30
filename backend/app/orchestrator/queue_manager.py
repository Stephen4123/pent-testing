import asyncio
from app.db.session import SessionLocal
from app.db.models import ScanSession, ScanStatus
from app.orchestrator.engine import run_scan_simulation
import logging

logger = logging.getLogger(__name__)

MAX_CONCURRENT_SCANS = 2
scan_semaphore = asyncio.Semaphore(MAX_CONCURRENT_SCANS)

async def _process_scan(scan_id: str):
    try:
        await asyncio.to_thread(run_scan_simulation, scan_id)
    except Exception as e:
        logger.error(f'Queue Manager error processing scan {scan_id}: {str(e)}')
    finally:
        scan_semaphore.release()

async def scan_queue_watcher():
    logger.info('Scan Queue Watcher started. Polling for pending tasks...')
    while True:
        try:
            if not scan_semaphore.locked():
                db = SessionLocal()
                try:
                    pending_scan = db.query(ScanSession).filter(ScanSession.status == ScanStatus.PENDING).order_by(ScanSession.created_at.asc()).first()
                    if pending_scan:
                        logger.info(f'Queue Manager picked up PENDING scan {pending_scan.id}')
                        pending_scan.status = ScanStatus.DISCOVERY
                        db.commit()
                        await scan_semaphore.acquire()
                        asyncio.create_task(_process_scan(pending_scan.id))
                except Exception as db_err:
                    logger.error(f'Queue Manager DB error: {str(db_err)}')
                finally:
                    db.close()
            await asyncio.sleep(5)
        except asyncio.CancelledError:
            logger.info('Scan Queue Watcher stopped.')
            break
        except Exception as loop_err:
            logger.error(f'Queue Manager loop error: {str(loop_err)}')
            await asyncio.sleep(5)