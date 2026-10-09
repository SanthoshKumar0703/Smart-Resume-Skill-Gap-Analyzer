"""Local semantic embeddings (Sentence Transformers) with graceful fallback.

The model is downloaded once and cached - subsequent loads are instant.
If the model is unavailable, a lightweight TF-IDF / char n-gram cosine
similarity fallback is used so the analyzer keeps working.
"""
import logging
import math
import os
import re
from difflib import SequenceMatcher

from app.config import settings

logger = logging.getLogger("careermirror.embeddings")

_model = None
_loaded = False


def _cache_dir() -> str:
    if settings.MODEL_CACHE_DIR:
        os.makedirs(settings.MODEL_CACHE_DIR, exist_ok=True)
        return settings.MODEL_CACHE_DIR
    return None


def load_model():
    """Load the embedding model once (lazy, cached)."""
    global _model, _loaded
    if _loaded:
        return _model
    _loaded = True
    try:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading embedding model %s ...", settings.EMBEDDING_MODEL)
        _model = SentenceTransformer(settings.EMBEDDING_MODEL, cache_folder=_cache_dir())
        logger.info("Embedding model ready.")
    except Exception as exc:
        logger.warning("Sentence Transformers unavailable (%s). Using fuzzy fallback matcher.", exc)
        _model = None
    return _model


def model_available() -> bool:
    return load_model() is not None


def embed(texts: list[str]):
    model = load_model()
    if model is None:
        return None
    try:
        return model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    except Exception as exc:
        logger.warning("Embedding failed (%s) - using fallback.", exc)
        return None


# ------------------------------------------------------------------
# Fallback similarity (works with zero ML dependencies)
# ------------------------------------------------------------------
_TOKEN_RE = re.compile(r"[a-z0-9+#.]+")


def _char_ngrams(token: str, n=3) -> set:
    token = token.lower()
    if len(token) <= n:
        return {token}
    return {token[i:i + n] for i in range(len(token) - n + 1)}


def _token_overlap(a: str, b: str) -> float:
    ta = set(_TOKEN_RE.findall(a.lower()))
    tb = set(_TOKEN_RE.findall(b.lower()))
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / math.sqrt(len(ta) * len(tb))


def _ngram_cosine(a: str, b: str) -> float:
    ga, gb = _char_ngrams(a), _char_ngrams(b)
    if not ga or not gb:
        return 0.0
    return len(ga & gb) / math.sqrt(len(ga) * len(gb))


def similarity(a: str, b: str) -> float:
    """Semantic similarity in [0, 1]. Prefers embeddings when available."""
    if a == b:
        return 1.0
    vectors = embed([a, b])
    if vectors is not None:
        import numpy as np
        v1, v2 = vectors
        return float(np.dot(v1, v2))
    ratio = SequenceMatcher(None, a.lower(), b.lower()).ratio()
    overlap = _token_overlap(a, b)
    ngram = _ngram_cosine(a, b)
    return max(ratio, overlap, ngram)


def semantic_sims(query: str, texts: list[str]) -> list[float] | None:
    """Cosine similarity of `query` against every text in `texts`, computed
    with a single batched encode call. Returns None when unavailable."""
    if not texts:
        return []
    vectors = embed([query, *texts])
    if vectors is None:
        return None
    import numpy as np
    q = vectors[0]
    rest = vectors[1:]
    return [float(v) for v in (rest @ q)]
