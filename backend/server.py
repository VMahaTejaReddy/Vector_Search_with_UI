import json
import os
import re
import threading
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import faiss
import numpy as np
import pandas as pd
import torch
from sentence_transformers import SentenceTransformer
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

ROOT = Path(__file__).resolve().parent.parent
DATASET_PATH = ROOT / "Dataset-SA GCO cleaned.csv"
CACHE_DIR = ROOT / "cache"
MODELS_DIR = ROOT / "models"
EMBEDDING_MODEL_DIR = MODELS_DIR / "all-MiniLM-L6-v2"
LLM_MODEL_DIR = MODELS_DIR / "flan-t5-base"
FAISS_INDEX_PATH = CACHE_DIR / "reviewlens_faiss.index"
META_PATH = CACHE_DIR / "reviewlens_index_meta.json"
TEMP_INDEX_PATH = CACHE_DIR / "reviewlens_faiss.index.tmp"
HOST = "127.0.0.1"
PORT = 8000
DEFAULT_THRESHOLD = 0.65
DEFAULT_TOP_K = 5


def clean_text(text: Any) -> str:
    text = str(text or "").lower()
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


class ReviewLensService:
    def __init__(self) -> None:
        self.lock = threading.RLock()
        self.df: pd.DataFrame | None = None
        self.embedding_model: SentenceTransformer | None = None
        self.tokenizer: AutoTokenizer | None = None
        self.llm: AutoModelForSeq2SeqLM | None = None
        self.index: faiss.Index | None = None
        self.index_ready = False
        self.indexing = False
        self.index_progress = 0.0
        self.status_message = "Starting up"
        self.error_message: str | None = None
        self.embedding_backend = "SBERT all-MiniLM-L6-v2 + FAISS IndexFlatIP"
        self.llm_backend = "FLAN-T5-Base"
        self.dataset_size = 0
        self.searchable_size = 0
        self.started_at = datetime.now(timezone.utc).isoformat()
        torch.set_num_threads(max(1, (os.cpu_count() or 2) - 1))
        self._load_dataset()
        self._start_index_build_if_needed()

    def _load_dataset(self) -> None:
        if not DATASET_PATH.exists():
            raise FileNotFoundError(f"Dataset not found: {DATASET_PATH}")

        df = pd.read_csv(DATASET_PATH, low_memory=False)
        self.dataset_size = int(len(df))
        if "clean_text" not in df.columns:
            source_col = "Text" if "Text" in df.columns else "Review"
            df["clean_text"] = df[source_col].fillna("").map(clean_text)
        else:
            df["clean_text"] = df["clean_text"].fillna("").map(clean_text)

        if "Text" not in df.columns:
            if {"Summary", "Review"}.issubset(df.columns):
                df["Text"] = (
                    df["Summary"].fillna("").astype(str).str.strip()
                    + ". "
                    + df["Review"].fillna("").astype(str).str.strip()
                ).str.strip(". ")
            elif "Review" in df.columns:
                df["Text"] = df["Review"].fillna("").astype(str)
            else:
                df["Text"] = df["clean_text"]

        if "Sentiment" not in df.columns:
            df["Sentiment"] = "neutral"

        df["product_name"] = df.get("product_name", pd.Series(["Flipkart product"] * len(df))).fillna("Flipkart product")
        df["Text"] = df["Text"].fillna("").astype(str).str.strip()
        df["Sentiment"] = df["Sentiment"].fillna("neutral").astype(str).str.strip().str.title()

        df = df[df["clean_text"].astype(bool)].reset_index(drop=True)
        self.df = df
        self.searchable_size = int(len(df))
        self.status_message = "Dataset loaded"

    def _ensure_embedding_model(self) -> SentenceTransformer:
        if self.embedding_model is None:
            model_path = str(EMBEDDING_MODEL_DIR if EMBEDDING_MODEL_DIR.exists() else "all-MiniLM-L6-v2")
            self.embedding_model = SentenceTransformer(model_path, local_files_only=EMBEDDING_MODEL_DIR.exists())
        return self.embedding_model

    def _ensure_llm(self) -> tuple[AutoTokenizer, AutoModelForSeq2SeqLM]:
        if self.tokenizer is None or self.llm is None:
            model_path = str(LLM_MODEL_DIR if LLM_MODEL_DIR.exists() else "google/flan-t5-base")
            local_only = LLM_MODEL_DIR.exists()
            self.status_message = "Loading FLAN-T5 model"
            self.tokenizer = AutoTokenizer.from_pretrained(model_path, local_files_only=local_only)
            self.llm = AutoModelForSeq2SeqLM.from_pretrained(model_path, local_files_only=local_only)
            self.llm.eval()
            self.status_message = "FLAN-T5 ready"
        return self.tokenizer, self.llm

    def _dataset_signature(self) -> dict[str, Any]:
        stat = DATASET_PATH.stat()
        return {
            "dataset_path": str(DATASET_PATH),
            "dataset_size": self.dataset_size,
            "searchable_size": self.searchable_size,
            "dataset_mtime": stat.st_mtime,
            "embedding_model_dir": str(EMBEDDING_MODEL_DIR),
        }

    def _cache_is_valid(self) -> bool:
        if not FAISS_INDEX_PATH.exists() or not META_PATH.exists():
            return False
        try:
            meta = json.loads(META_PATH.read_text(encoding="utf-8"))
        except Exception:
            return False
        return meta == self._dataset_signature()

    def _load_cached_index(self) -> bool:
        if not self._cache_is_valid():
            return False
        self.status_message = "Loading cached FAISS index"
        self.index = faiss.read_index(str(FAISS_INDEX_PATH))
        self.index_ready = True
        self.indexing = False
        self.index_progress = 1.0
        self.status_message = "Retriever ready"
        return True

    def _start_index_build_if_needed(self) -> None:
        if self._load_cached_index():
            return

        self.indexing = True
        self.index_ready = False
        self.index_progress = 0.0
        self.status_message = "Building SBERT embeddings and FAISS index"
        threading.Thread(target=self._build_index, daemon=True).start()

    def _build_index(self) -> None:
        try:
            model = self._ensure_embedding_model()
            assert self.df is not None
            texts = self.df["clean_text"].tolist()
            total = len(texts)
            batch_size = 256
            index = None

            for start in range(0, total, batch_size):
                stop = min(start + batch_size, total)
                batch = texts[start:stop]
                embeddings = model.encode(
                    batch,
                    batch_size=min(64, len(batch)),
                    show_progress_bar=False,
                    convert_to_numpy=True,
                    normalize_embeddings=True,
                ).astype("float32")

                if index is None:
                    index = faiss.IndexFlatIP(int(embeddings.shape[1]))

                index.add(embeddings)
                with self.lock:
                    self.index_progress = stop / total
                    self.status_message = f"Indexed {stop:,} / {total:,} reviews"

            if index is None:
                raise RuntimeError("No embeddings were generated from the dataset.")

            faiss.write_index(index, str(TEMP_INDEX_PATH))
            os.replace(TEMP_INDEX_PATH, FAISS_INDEX_PATH)
            META_PATH.write_text(json.dumps(self._dataset_signature(), indent=2), encoding="utf-8")

            with self.lock:
                self.index = index
                self.indexing = False
                self.index_ready = True
                self.index_progress = 1.0
                self.status_message = "Retriever ready"
                self.error_message = None
        except Exception as exc:
            with self.lock:
                self.indexing = False
                self.index_ready = False
                self.error_message = str(exc)
                self.status_message = "Index build failed"

    def _encode_query(self, query: str) -> np.ndarray:
        model = self._ensure_embedding_model()
        vector = model.encode(
            [clean_text(query)],
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True,
        ).astype("float32")
        return vector

    def _serialize_row(self, idx: int, score: float) -> dict[str, Any]:
        assert self.df is not None
        row = self.df.iloc[idx]
        sentiment = str(row.get("Sentiment", "Neutral") or "Neutral").title()
        if sentiment not in {"Positive", "Negative", "Neutral"}:
            sentiment = "Neutral"
        return {
            "id": int(idx),
            "product": str(row.get("product_name", "Flipkart product") or "Flipkart product"),
            "aspect": str(row.get("Summary", "Retrieved review") or "Retrieved review"),
            "review": str(row.get("Text", "") or row.get("clean_text", "")),
            "clean_text": str(row.get("clean_text", "")),
            "sentiment": sentiment,
            "similarity": float(score),
            "rating": None if pd.isna(row.get("Rate")) else row.get("Rate"),
        }

    def semantic_search_unique(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        if not self.index_ready or self.index is None:
            raise RuntimeError("Retriever is not ready yet.")
        top_k = max(1, min(int(top_k), 20))
        query_vector = self._encode_query(query)
        scores, indices = self.index.search(query_vector, top_k * 3)

        seen: set[str] = set()
        results: list[dict[str, Any]] = []
        assert self.df is not None

        for rank, idx in enumerate(indices[0]):
            if idx < 0:
                continue
            text = self.df.iloc[int(idx)]["clean_text"]
            if text in seen:
                continue
            seen.add(text)
            results.append(self._serialize_row(int(idx), float(scores[0][rank])))
            if len(results) == top_k:
                break

        return results

    def semantic_search_threshold(self, query: str, top_k: int = 5, threshold: float = 0.5) -> list[dict[str, Any]]:
        if not self.index_ready or self.index is None:
            raise RuntimeError("Retriever is not ready yet.")
        top_k = max(1, min(int(top_k), 20))
        query_vector = self._encode_query(query)
        scores, indices = self.index.search(query_vector, top_k)
        results: list[dict[str, Any]] = []

        for rank, idx in enumerate(indices[0]):
            if idx < 0:
                continue
            score = float(scores[0][rank])
            if score >= threshold:
                results.append(self._serialize_row(int(idx), score))

        return results

    def build_context_safe(self, query: str, top_k: int = 5, threshold: float = DEFAULT_THRESHOLD) -> tuple[str | None, list[dict[str, Any]]]:
        results = self.semantic_search_threshold(query, top_k=top_k, threshold=threshold)
        if not results:
            return None, []
        context_parts = [f"Review {i + 1}:\n{item['clean_text']}" for i, item in enumerate(results)]
        return "\n\n".join(context_parts), results

    def generate_answer(self, query: str, context: str) -> str:
        tokenizer, llm = self._ensure_llm()
        prompt = f"""
You are a strict AI assistant.

Answer the question using ONLY the information in the context below.

Rules:
- If the context does not contain relevant information, say: \"Not found in reviews.\"
- Do NOT guess.
- Do NOT make up information.
- Do NOT output numbers unless explicitly mentioned in context.

Context:
{context}

Question:
{query}

Answer:
"""
        inputs = tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1024)
        with torch.no_grad():
            outputs = llm.generate(
                **inputs,
                max_new_tokens=150,
                temperature=0.1,
            )
        return tokenizer.decode(outputs[0], skip_special_tokens=True).strip()

    def health(self) -> dict[str, Any]:
        return {
            "dataset_size": self.dataset_size,
            "searchable_size": self.searchable_size,
            "embedding_model": "all-MiniLM-L6-v2",
            "index_type": "FAISS IndexFlatIP",
            "llm": "FLAN-T5-Base",
            "embedding_backend": self.embedding_backend,
            "llm_backend": self.llm_backend,
            "index_ready": self.index_ready,
            "indexing": self.indexing,
            "index_progress": self.index_progress,
            "status_message": self.status_message,
            "error": self.error_message,
            "started_at": self.started_at,
            "cache_exists": FAISS_INDEX_PATH.exists(),
        }


service = ReviewLensService()


class ReviewLensHandler(BaseHTTPRequestHandler):
    server_version = "ReviewLensHTTP/1.0"

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _set_headers(self, status: int = HTTPStatus.OK, content_type: str = "application/json") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _write_json(self, payload: dict[str, Any], status: int = HTTPStatus.OK) -> None:
        self._set_headers(status=status)
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def _read_json(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length) if content_length else b"{}"
        return json.loads(raw.decode("utf-8"))

    def do_OPTIONS(self) -> None:
        self._set_headers(status=HTTPStatus.NO_CONTENT)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            self._write_json({"ok": True, "data": service.health()})
            return
        self._write_json({"ok": False, "error": "Not found"}, status=HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            payload = self._read_json()
            if path == "/api/search":
                if not service.index_ready:
                    self._write_json(
                        {"ok": False, "error": "Retriever is still preparing.", "data": service.health()},
                        status=HTTPStatus.SERVICE_UNAVAILABLE,
                    )
                    return
                query = str(payload.get("query", "")).strip()
                top_k = int(payload.get("top_k", DEFAULT_TOP_K))
                if not query:
                    self._write_json({"ok": False, "error": "Query is required."}, status=HTTPStatus.BAD_REQUEST)
                    return
                results = service.semantic_search_unique(query, top_k=top_k)
                avg_similarity = float(np.mean([item["similarity"] for item in results])) if results else None
                self._write_json(
                    {
                        "ok": True,
                        "data": {
                            "query": query,
                            "results": results,
                            "average_similarity": avg_similarity,
                            "stats": service.health(),
                        },
                    }
                )
                return

            if path == "/api/rag":
                if not service.index_ready:
                    self._write_json(
                        {"ok": False, "error": "Retriever is still preparing.", "data": service.health()},
                        status=HTTPStatus.SERVICE_UNAVAILABLE,
                    )
                    return
                query = str(payload.get("query", "")).strip()
                top_k = int(payload.get("top_k", DEFAULT_TOP_K))
                threshold = float(payload.get("threshold", DEFAULT_THRESHOLD))
                if not query:
                    self._write_json({"ok": False, "error": "Query is required."}, status=HTTPStatus.BAD_REQUEST)
                    return
                context, sources = service.build_context_safe(query, top_k=top_k, threshold=threshold)
                if context is None:
                    self._write_json(
                        {
                            "ok": True,
                            "data": {
                                "query": query,
                                "answer": "",
                                "sources": [],
                                "out_of_domain": True,
                                "stats": service.health(),
                            },
                        }
                    )
                    return
                answer = service.generate_answer(query, context)
                self._write_json(
                    {
                        "ok": True,
                        "data": {
                            "query": query,
                            "answer": answer,
                            "sources": sources,
                            "out_of_domain": False,
                            "stats": service.health(),
                        },
                    }
                )
                return

            self._write_json({"ok": False, "error": "Not found"}, status=HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self._write_json({"ok": False, "error": str(exc), "data": service.health()}, status=HTTPStatus.INTERNAL_SERVER_ERROR)


def run_server() -> None:
    server = ThreadingHTTPServer((HOST, PORT), ReviewLensHandler)
    print(f"ReviewLens backend running on http://{HOST}:{PORT}")
    print("Dataset:", DATASET_PATH)
    print("Index cache:", FAISS_INDEX_PATH)
    server.serve_forever()


if __name__ == "__main__":
    run_server()



