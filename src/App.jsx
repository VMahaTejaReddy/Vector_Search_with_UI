import React, { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";
const samples = [
  "battery draining fast",
  "excellent camera quality",
  "delivery was very late",
  "sound quality is amazing"
];
const topKOptions = [3, 5, 10];

const badgeClass = (score) =>
  score > 0.75
    ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-200"
    : score >= 0.6
      ? "border-amber-300/30 bg-amber-300/12 text-amber-100"
      : score >= 0.45
        ? "border-orange-400/30 bg-orange-400/12 text-orange-100"
        : "border-rose-400/30 bg-rose-400/12 text-rose-100";

const sentimentClass = (sentiment) =>
  sentiment === "Positive"
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
    : sentiment === "Negative"
      ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
      : "border-slate-300/20 bg-slate-200/10 text-slate-200";

async function api(path, body, method = "POST") {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body || {})
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    const error = new Error(payload.error || "Request failed");
    error.payload = payload;
    throw error;
  }
  return payload.data;
}

export default function App() {
  const [tab, setTab] = useState("semantic");
  const [query, setQuery] = useState(samples[0]);
  const [submitted, setSubmitted] = useState(samples[0]);
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.65);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [diagramOpen, setDiagramOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [searchData, setSearchData] = useState({ results: [], average_similarity: null });
  const [ragData, setRagData] = useState({ answer: "", sources: [], out_of_domain: false });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await api("/api/health", null, "GET");
        if (alive) {
          setStatus(data);
          setError("");
        }
      } catch (err) {
        if (alive) setError(err.message);
      }
    };
    load();
    const id = window.setInterval(load, 4000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!status?.index_ready || !submitted) return;
    if (tab === "semantic") runSearch(submitted);
    else runRag(submitted);
  }, [tab, topK, threshold, status?.index_ready]);

  const runSearch = async (nextQuery) => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/search", { query: nextQuery, top_k: topK });
      setSearchData(data);
      setStatus(data.stats);
    } catch (err) {
      setError(err.message);
      if (err.payload?.data) setStatus(err.payload.data);
      setSearchData({ results: [], average_similarity: null });
    } finally {
      setLoading(false);
    }
  };

  const runRag = async (nextQuery) => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/rag", { query: nextQuery, top_k: topK, threshold });
      setRagData(data);
      setStatus(data.stats);
      setSourcesOpen(true);
    } catch (err) {
      setError(err.message);
      if (err.payload?.data) setStatus(err.payload.data);
      setRagData({ answer: "", sources: [], out_of_domain: true });
    } finally {
      setLoading(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    const nextQuery = query.trim();
    if (!nextQuery) return;
    setSubmitted(nextQuery);
    if (!status?.index_ready) return;
    if (tab === "semantic") runSearch(nextQuery);
    else runRag(nextQuery);
  };

  const results = tab === "semantic" ? searchData.results : ragData.sources;
  const avg = tab === "semantic"
    ? searchData.average_similarity
    : results.length
      ? results.reduce((sum, item) => sum + item.similarity, 0) / results.length
      : null;

  const stats = [
    ["Dataset size", `${new Intl.NumberFormat("en-US").format(status?.dataset_size || 205053)} reviews`],
    ["Embedding model", status?.embedding_model || "all-MiniLM-L6-v2"],
    ["Index type", status?.index_type || "FAISS IndexFlatIP"],
    ["LLM", status?.llm || "FLAN-T5-Base"]
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-midnight text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8rem] top-[-7rem] h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-[8rem] h-80 w-80 rounded-full bg-electric/20 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="grid-overlay absolute inset-0 opacity-40" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <section className="glass-panel rounded-[32px] border border-white/10 px-5 py-6 shadow-glow sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-electric/30 bg-electric/15 shadow-glow"><Logo /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-electric/80">ReviewLens</p>
                <p className="mt-1 text-sm text-slate-300">Semantic search over 200K+ Flipkart reviews - powered by vector embeddings + RAG</p>
              </div>
            </div>
            <button onClick={() => setDiagramOpen((v) => !v)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-electric/40 hover:bg-electric/10">
              {diagramOpen ? "Hide system diagram" : "View system diagram"}
            </button>
          </div>

          <div className="mx-auto max-w-4xl py-10 text-center sm:py-14">
            <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-200/80">Real notebook-backed retrieval</p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">Search your actual Flipkart review corpus with a live local pipeline.</h1>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">The UI now targets a Python backend that loads your cleaned CSV, builds a cached FAISS index with SBERT, and uses FLAN-T5 for grounded answers.</p>

            <form onSubmit={submit} className="mx-auto mt-10 max-w-4xl rounded-[28px] border border-white/10 bg-slate-950/50 p-3 shadow-glow backdrop-blur-2xl">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try: battery draining fast, excellent camera quality..." className="h-16 w-full rounded-2xl border border-white/10 bg-white/5 pl-14 pr-5 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-electric/40 focus:bg-white/10" />
                </div>
                <button disabled={loading} className="h-16 rounded-2xl bg-gradient-to-r from-accent via-electric to-cyan-400 px-6 text-sm font-semibold text-white shadow-glow disabled:opacity-70">{loading ? "Working..." : "Run query"}</button>
              </div>

              <div className="mt-3 rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex rounded-full border border-white/10 bg-slate-950/70 p-1">
                    <Tab active={tab === "semantic"} onClick={() => setTab("semantic")}>Semantic Search</Tab>
                    <Tab active={tab === "rag"} onClick={() => setTab("rag")}>Ask AI (RAG)</Tab>
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Top-K</span>
                      <div className="inline-flex rounded-full border border-white/10 bg-slate-950/70 p-1">
                        {topKOptions.map((option) => <button key={option} type="button" onClick={() => setTopK(option)} className={`rounded-full px-3 py-1.5 text-sm ${topK === option ? "bg-electric text-white" : "text-slate-300 hover:bg-white/5"}`}>{option}</button>)}
                      </div>
                    </div>
                    {tab === "rag" ? <div className="sm:min-w-[270px]"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Similarity threshold</span><span className="text-sm font-semibold text-cyan-200">{threshold.toFixed(2)}</span></div><input type="range" min="0.45" max="0.95" step="0.01" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="range-slider w-full" style={{ background: `linear-gradient(90deg,#6366F1 0%,#3B82F6 ${((threshold - 0.45) / 0.5) * 100}%,rgba(148,163,184,0.28) ${((threshold - 0.45) / 0.5) * 100}%,rgba(148,163,184,0.28) 100%)` }} /></div> : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">{samples.map((sample) => <button key={sample} type="button" onClick={() => { setQuery(sample); setSubmitted(sample); if (status?.index_ready) { tab === "semantic" ? runSearch(sample) : runRag(sample); } }} className={`rounded-full border px-3 py-2 text-sm ${query === sample ? "border-electric/40 bg-electric/15 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.06]"}`}>{sample}</button>)}</div>
              </div>
            </form>
          </div>
        </section>

        <StatusBanner status={status} error={error} />

        <section className="sticky top-4 z-30 mt-6 grid gap-3 rounded-[28px] border border-white/10 px-4 py-4 shadow-glass glass-panel sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{label}</p><p className="mt-3 text-sm font-semibold text-white sm:text-base">{value}</p></div>)}
        </section>

        {diagramOpen ? <section className="mt-6 rounded-[28px] border border-white/10 px-5 py-5 shadow-glass glass-panel"><p className="text-xs font-semibold uppercase tracking-[0.35em] text-electric/80">System architecture</p><div className="mt-4 flex flex-wrap items-center gap-3">{["User Query", "SBERT Embedding", "FAISS Search", "Threshold Filter", "Context", "FLAN-T5", "Answer"].map((node, index) => <div key={node} className="flex items-center gap-3"><div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-center shadow-glass"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{String(index + 1).padStart(2, "0")}</p><p className="mt-3 text-sm font-semibold text-white">{node}</p></div>{index < 6 ? <Arrow /> : null}</div>)}</div></section> : null}

        <main className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[32px] border border-white/10 px-5 py-5 shadow-glass glass-panel sm:px-6 sm:py-6">
            <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/80">{tab === "semantic" ? "Semantic retrieval" : "Grounded answer"}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{tab === "semantic" ? "Top-K semantic search results" : "RAG answer and source reviews"}</h2></div><div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300">Query: <span className="font-medium text-white">{submitted}</span></div></div>
            {!status?.index_ready ? <Indexing status={status} /> : tab === "semantic" ? <Semantic loading={loading} results={searchData.results} avg={searchData.average_similarity} /> : <Rag loading={loading} data={ragData} sourcesOpen={sourcesOpen} setSourcesOpen={setSourcesOpen} />}
          </section>
          <aside className="space-y-6">
            <SideCard title="Live retrieval state" items={[ ["Backend", status?.index_ready ? "Ready" : status?.indexing ? "Indexing" : "Offline"], ["Active mode", tab === "semantic" ? "Semantic Search" : "Ask AI (RAG)"], ["Top-K", String(topK)], ["Threshold", tab === "rag" ? threshold.toFixed(2) : "Not applied"], ["Matched reviews", String(results.length)], ["Average similarity", avg ? avg.toFixed(2) : "--"] ]} />
            <div className="rounded-[28px] border border-white/10 px-5 py-5 shadow-glass glass-panel"><p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/80">What this now does</p><ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300"><li className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">Loads your real cleaned CSV and uses the notebook cleaner logic.</li><li className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">Builds and caches a FAISS index from SBERT embeddings for fast repeated searches.</li><li className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">Generates thresholded RAG answers using local FLAN-T5 instead of mock copy.</li></ul></div>
          </aside>
        </main>
      </div>
    </div>
  );
}

function StatusBanner({ status, error }) {
  if (error) return <section className="mt-6 rounded-[26px] border border-rose-400/20 bg-rose-400/10 px-5 py-4 text-sm text-rose-50 shadow-glass">{error}</section>;
  if (!status) return <section className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300 shadow-glass">Waiting for backend health check...</section>;
  return <section className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300 shadow-glass"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-white">{status.status_message}</p><p className="mt-1 text-slate-400">{status.index_ready ? "Retriever is ready and queries are now using the live dataset." : "The first startup builds embeddings and a FAISS cache. Later restarts are much faster."}</p></div><div className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-200/80">{status.index_ready ? "Ready" : status.indexing ? "Indexing" : "Offline"}</div></div>{status.indexing ? <div className="mt-4"><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-accent to-cyan-400" style={{ width: `${Math.max(4, (status.index_progress || 0) * 100)}%` }} /></div></div> : null}</section>;
}

function Indexing({ status }) {
  return <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-glass"><p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/80">Preparing real search index</p><h3 className="mt-3 text-2xl font-semibold text-white">Your notebook pipeline is building the local retriever.</h3><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">This first run loads the real 205k-review dataset, creates SBERT embeddings, and saves a FAISS cache for future instant searches.</p><div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-accent via-electric to-cyan-400" style={{ width: `${Math.max(6, (status?.index_progress || 0) * 100)}%` }} /></div><div className="mt-3 flex items-center justify-between text-sm text-slate-400"><span>{status?.status_message || "Starting backend work..."}</span><span>{Math.round((status?.index_progress || 0) * 100)}%</span></div></div>;
}

function Semantic({ loading, results, avg }) {
  if (loading) return <Loading />;
  if (!results?.length) return <Empty message="No strong matches found. Try a different query." />;
  return <div className="mt-6"><div className="mb-5 flex flex-col gap-3 rounded-[24px] border border-electric/20 bg-electric/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">Retrieval summary</p><p className="mt-2 text-sm leading-7 text-slate-200">These cards come from live dense retrieval over your full review dataset.</p></div><div className="rounded-full border border-electric/30 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Avg. similarity {avg ? avg.toFixed(2) : "--"}</div></div><div className="space-y-4">{results.map((item, index) => <Card key={`${item.id}-${index}`} item={item} index={index} />)}</div></div>;
}

function Rag({ loading, data, sourcesOpen, setSourcesOpen }) {
  if (loading) return <Loading />;
  if (data.out_of_domain) return <div className="mt-6 rounded-[26px] border border-rose-400/20 bg-rose-400/10 px-5 py-5 text-rose-50"><p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/80">Out-of-domain safeguard</p><h3 className="mt-2 text-xl font-semibold text-white">Query is out of domain. No relevant reviews found.</h3><p className="mt-3 max-w-2xl text-sm leading-7 text-rose-50/80">The threshold filter removed all retrieved reviews, so the app refused to invent an answer.</p></div>;
  return <div className="mt-6 space-y-4"><div className="relative overflow-hidden rounded-[28px] border border-electric/25 bg-gradient-to-br from-electric/20 via-accent/12 to-slate-900 px-5 py-6 shadow-glow"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10"><Spark /></div><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">AI response bubble</p><p className="mt-1 text-sm text-slate-300">Generated from thresholded source reviews using local FLAN-T5</p></div></div><p className="mt-5 max-w-3xl text-base leading-8 text-slate-100 sm:text-lg">{data.answer}</p></div><div className="rounded-[28px] border border-white/10 bg-white/[0.03]"><button type="button" onClick={() => setSourcesOpen((v) => !v)} className="flex w-full items-center justify-between px-5 py-5 text-left"><div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Source reviews used</p><p className="mt-2 text-sm text-slate-300">Retrieved context cards used to ground the answer</p></div><span className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white">{sourcesOpen ? "Collapse" : "Expand"}</span></button>{sourcesOpen ? <div className="space-y-4 border-t border-white/10 px-5 py-5">{data.sources.map((item, index) => <Card key={`${item.id}-${index}`} item={item} index={index} />)}</div> : null}</div></div>;
}

function Loading() {
  return <div className="mt-6 space-y-4"><div className="shimmer rounded-[24px] border border-white/10 bg-white/[0.04] p-5"><div className="h-4 w-40 rounded-full bg-white/10" /><div className="mt-4 h-5 w-5/6 rounded-full bg-white/10" /><div className="mt-3 h-5 w-2/3 rounded-full bg-white/10" /></div>{[1,2,3].map((n) => <div key={n} className="shimmer rounded-[26px] border border-white/10 bg-white/[0.04] p-5"><div className="h-3 w-24 rounded-full bg-white/10" /><div className="mt-4 h-6 w-3/4 rounded-full bg-white/10" /><div className="mt-4 h-4 w-full rounded-full bg-white/10" /><div className="mt-3 h-4 w-11/12 rounded-full bg-white/10" /></div>)}</div>;
}

function Empty({ message }) { return <div className="mt-6 rounded-[28px] border border-dashed border-white/15 bg-white/[0.02] px-5 py-10 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><SearchIcon className="h-6 w-6 text-slate-400" /></div><h3 className="mt-5 text-xl font-semibold text-white">No retrieval context</h3><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-300">{message}</p></div>; }

function Card({ item, index }) {
  const [open, setOpen] = useState(false);
  return <article className="result-card rounded-[26px] border border-white/10 bg-white/[0.04] p-5 shadow-glass" style={{ animationDelay: `${index * 80}ms` }}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{item.product}</p><h3 className="mt-2 text-lg font-semibold text-white">{item.aspect || "Retrieved review"}</h3></div><span className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${badgeClass(item.similarity)}`}>{item.similarity.toFixed(2)} similarity</span></div><div className="mt-4 flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-medium ${sentimentClass(item.sentiment)}`}>{item.sentiment}</span>{item.rating ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">Rating {item.rating}</span> : null}</div><p className={`mt-4 text-sm leading-7 text-slate-300 ${open ? "" : "line-clamp-3"}`}>{item.review}</p><button type="button" onClick={() => setOpen((v) => !v)} className="mt-4 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-200 transition hover:border-electric/40 hover:bg-electric/10">{open ? "Show less" : "Expand review"}</button></article>;
}

function SideCard({ title, items }) { return <div className="rounded-[28px] border border-white/10 px-5 py-5 shadow-glass glass-panel"><p className="text-xs font-semibold uppercase tracking-[0.35em] text-electric/80">{title}</p><div className="mt-5 space-y-3">{items.map(([label, value]) => <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"><span className="text-sm text-slate-300">{label}</span><span className="text-sm font-semibold text-white">{value}</span></div>)}</div></div>; }
function Tab({ active, onClick, children }) { return <button type="button" onClick={onClick} className={`rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-electric text-white shadow-[0_10px_28px_rgba(59,130,246,0.28)]" : "text-slate-300 hover:bg-white/5"}`}>{children}</button>; }
function Logo() { return <svg viewBox="0 0 32 32" className="h-6 w-6 text-white" fill="none"><path d="M8 8.5 16 4l8 4.5v9L16 22l-8-4.5v-9Z" stroke="currentColor" strokeWidth="1.5" /><path d="M16 11c2.761 0 5 2.015 5 4.5S18.761 20 16 20s-5-2.015-5-4.5S13.239 11 16 11Z" fill="currentColor" opacity="0.8" /></svg>; }
function SearchIcon({ className = "h-5 w-5" }) { return <svg viewBox="0 0 24 24" className={className} fill="none"><path d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function Spark() { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan-100" fill="none"><path d="M12 3 13.8 8.2 19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" fill="currentColor" /></svg>; }
function Arrow() { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-electric/80" fill="none"><path d="M5 12h14m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

