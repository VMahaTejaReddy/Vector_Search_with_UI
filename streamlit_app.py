import streamlit as st
import requests
import json
import time

API_URL = "http://127.0.0.1:8000"

st.set_page_config(
    page_title="ReviewLens Search",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling (Dark theme accents matching previous UI)
st.markdown("""
<style>
.stApp {
    background-color: #0B1120;
    color: #F1F5F9;
}
.st-emotion-cache-1y4p8pa, .st-emotion-cache-16txtl3 {
    padding-top: 2rem;
}
.stTabs [data-baseweb="tab-list"] {
    gap: 2rem;
}
.stTabs [data-baseweb="tab"] {
    background-color: transparent !important;
}
.stat-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
}
.review-card {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 16px;
}
.tag-good {
    background: rgba(52, 211, 153, 0.15);
    color: #A7F3D0;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: bold;
}
.tag-bad {
    background: rgba(248, 113, 113, 0.15);
    color: #FECACA;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: bold;
}
.tag-neutral {
    background: rgba(148, 163, 184, 0.15);
    color: #E2E8F0;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: bold;
}
.tag-score {
    background: rgba(96, 165, 250, 0.15);
    color: #BFDBFE;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: bold;
}
</style>
""", unsafe_allow_html=True)

SAMPLES = [
    "battery draining fast",
    "excellent camera quality",
    "delivery was very late",
    "sound quality is amazing"
]

@st.cache_data(ttl=5)
def get_health():
    try:
        response = requests.get(f"{API_URL}/api/health", timeout=3)
        if response.ok:
            return response.json().get("data", {})
    except requests.exceptions.RequestException:
        pass
    return None

def fetch_search(query, top_k):
    try:
        response = requests.post(f"{API_URL}/api/search", json={"query": query, "top_k": top_k}, timeout=30)
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"ok": False, "error": str(e)}

def fetch_rag(query, top_k, threshold):
    try:
        response = requests.post(f"{API_URL}/api/rag", json={"query": query, "top_k": top_k, "threshold": threshold}, timeout=60)
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"ok": False, "error": str(e)}

st.title("🔍 ReviewLens")
st.markdown("Semantic search over 200K+ Flipkart reviews - powered by vector embeddings + RAG")

# Sidebar configurations
st.sidebar.header("Settings")
top_k = st.sidebar.slider("Top-K Results", min_value=1, max_value=20, value=5, step=1)
threshold = st.sidebar.slider("Similarity Threshold (RAG)", min_value=0.45, max_value=0.95, value=0.65, step=0.01)

health_status = get_health()

if health_status:
    st.sidebar.markdown("---")
    st.sidebar.subheader("Live Retrieval State")
    is_ready = health_status.get("index_ready", False)
    st.sidebar.markdown(f"**Backend**: {'🟢 Ready' if is_ready else '🟡 Indexing'}")
    st.sidebar.markdown(f"**Dataset**: {health_status.get('dataset_size', 0):,} reviews")
    st.sidebar.markdown(f"**Model**: {health_status.get('embedding_model', '')}")
else:
    st.sidebar.error("Backend Offline")

st.markdown("### Search your actual Flipkart review corpus")

# Search Inputs
col1, col2 = st.columns([4, 1])
query = col1.text_input("Query", placeholder="Try: battery draining fast...", label_visibility="collapsed")
submit = col2.button("Run query", use_container_width=True)

# Sample query chips
st.markdown("Or try a sample:")
cols = st.columns(len(SAMPLES))
selected_sample = None
for i, sample in enumerate(SAMPLES):
    if cols[i].button(sample, key=f"sample_{i}"):
        selected_sample = sample

# Determine final query
final_query = selected_sample if selected_sample else query

tab1, tab2 = st.tabs(["Semantic Search", "Ask AI (RAG)"])

def display_review(item):
    sentiment = item.get("sentiment", "Neutral")
    tag_class = "tag-good" if sentiment == "Positive" else "tag-bad" if sentiment == "Negative" else "tag-neutral"
    
    st.markdown(f"""
    <div class="review-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div>
                <span style="font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94A3B8;">
                    {item.get('product', 'Flipkart Product')}
                </span>
                <h4 style="margin: 4px 0;">{item.get('aspect', 'Retrieved review')}</h4>
            </div>
            <span class="tag-score">{item.get('similarity', 0):.2f} similarity</span>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <span class="{tag_class}">{sentiment}</span>
            {f'<span class="tag-neutral">Rating: {item["rating"]}</span>' if item.get('rating') else ''}
        </div>
        <p style="color: #CBD5E1; font-size: 0.9rem; line-height: 1.6;">
            {item.get('review', '')}
        </p>
    </div>
    """, unsafe_allow_html=True)

if final_query or submit:
    if not health_status or not health_status.get("index_ready", False):
        st.warning("Backend is warming up or building index. Please wait...")
        if health_status:
            progress = health_status.get('index_progress', 0)
            st.progress(progress, text=f"{health_status.get('status_message', 'Indexing')} ({int(progress * 100)}%)")
            time.sleep(2)
            st.rerun()
    else:
        with tab1:
            st.markdown("### Top-K Semantic Search Results")
            with st.spinner("Searching over corpus..."):
                res = fetch_search(final_query, top_k)
                if res.get("ok"):
                    data = res.get("data", {})
                    results = data.get("results", [])
                    st.success(f"Found {len(results)} matches with avg similarity: {data.get('average_similarity', 0):.2f}")
                    for item in results:
                        display_review(item)
                else:
                    st.error(f"Search failed: {res.get('error')}")
        
        with tab2:
            st.markdown("### RAG Answer and Sources")
            with st.spinner("Retrieving contexts & generating answer using FLAN-T5..."):
                res = fetch_rag(final_query, top_k, threshold)
                if res.get("ok"):
                    data = res.get("data", {})
                    if data.get("out_of_domain"):
                        st.error("Query is out of domain. The threshold filter removed all retrieved reviews, so the app refused to invent an answer.")
                    else:
                        st.info(f"**AI Response:** {data.get('answer', '')}")
                        
                        st.markdown("#### Source Reviews")
                        sources = data.get("sources", [])
                        for item in sources:
                            display_review(item)
                else:
                    st.error(f"RAG failed: {res.get('error')}")
