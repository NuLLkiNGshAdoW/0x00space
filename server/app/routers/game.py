"""Public endpoints for the browser-based space-runner leaderboard."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from redis.exceptions import RedisError
from sqlalchemy.orm import Session

from app import models, schemas
from app.config import get_settings
from app.database import get_db
from app.services.client_ip import get_client_ip
from app.services.monitoring import capture_exception
from app.services.rate_limit import create_rate_limiter

router = APIRouter(prefix="/game", tags=["game"])

_RATE_WINDOW_SECONDS = 3600
_RATE_LIMIT = 12
_settings = get_settings()
_submit_limiter = create_rate_limiter(
    _settings.RATE_LIMIT_REDIS_URL,
    _RATE_LIMIT,
    _RATE_WINDOW_SECONDS,
    "0x00space:rate-limit:game-scores",
)


def _check_submit_rate_limit(request: Request) -> None:
    try:
        retry_after = _submit_limiter.retry_after(get_client_ip(request))
    except RedisError as exc:
        capture_exception(exc, source="game_score_rate_limit")
        raise HTTPException(
            status_code=503,
            detail="Ограничитель отправки результатов временно недоступен.",
        ) from exc
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Слишком много отправок результата. Попробуйте позже.",
            headers={"Retry-After": str(retry_after)},
        )


@router.get("/leaderboard", response_model=list[schemas.GameScoreOut])
def get_leaderboard(
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Return the top personal bests. Only pseudonymous nicknames are public."""
    return (
        db.query(models.GameLeaderboardEntry)
        .order_by(models.GameLeaderboardEntry.score.desc(), models.GameLeaderboardEntry.updated_at.asc())
        .limit(limit)
        .all()
    )


@router.post("/leaderboard", response_model=schemas.GameScoreOut)
def submit_score(
    payload: schemas.GameScoreCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Keep one best score per anonymous browser profile."""
    _check_submit_rate_limit(request)
    player_id = str(payload.player_id)
    entry = db.get(models.GameLeaderboardEntry, player_id)
    if entry is None:
        entry = models.GameLeaderboardEntry(
            player_id=player_id,
            nickname=payload.nickname,
            score=payload.score,
            difficulty=payload.difficulty,
            ship=payload.ship,
        )
        db.add(entry)
    else:
        # A pilot may rename their profile, but a lower result cannot replace
        # their saved best or its associated run details.
        entry.nickname = payload.nickname
        if payload.score > entry.score:
            entry.score = payload.score
            entry.difficulty = payload.difficulty
            entry.ship = payload.ship
            entry.updated_at = models.utc_now_naive()

    db.commit()
    db.refresh(entry)
    return entry
