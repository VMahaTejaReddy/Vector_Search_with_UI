const scenarios = [
  {
    id: "battery draining fast",
    keywords: ["battery", "drain", "power", "backup", "fast"],
    band: "Similarity band 0.82",
    tag: "Strong Match",
    title: "Battery complaints cluster around endurance expectations.",
    body: "Retrieved reviews emphasize long battery life as a major purchase driver, so battery-drain issues are easy to surface with dense retrieval even when users phrase the problem differently.",
    results: [
      {
        title: "Battery life signal",
        score: "0.84",
        review: "Highly recommended. Worth buying, high bass, long battery life.",
        meta: ["positive", "battery", "retrieved context"]
      },
      {
        title: "Price-to-battery match",
        score: "0.81",
        review: "Very good at this price and battery backup awesome.",
        meta: ["positive", "value", "durability"]
      },
      {
        title: "Answer grounding",
        score: "0.79",
        review: "The retrieved context shows battery performance is repeatedly discussed, making support answers more reliable.",
        meta: ["rag", "grounded", "faiss"]
      }
    ]
  },
  {
    id: "good camera for this price",
    keywords: ["camera", "photo", "price", "dslr", "low light"],
    band: "Similarity band 0.80",
    tag: "High Confidence",
    title: "Camera praise is strongly tied to value perception.",
    body: "Camera-related retrieval leans toward buyers evaluating quality within a budget range, which makes these reviews useful for purchase recommendations and FAQ responses.",
    results: [
      {
        title: "Camera quality",
        score: "0.83",
        review: "Awesome DSLR camera!",
        meta: ["positive", "camera", "enthusiast"]
      },
      {
        title: "Budget alignment",
        score: "0.80",
        review: "Good camera for this price range.",
        meta: ["positive", "value", "purchase intent"]
      },
      {
        title: "Generated answer cue",
        score: "0.77",
        review: "The context block would likely answer that the camera is well-liked when buyers compare cost against output quality.",
        meta: ["rag", "budget", "context"]
      }
    ]
  },
  {
    id: "worst delivery experience",
    keywords: ["delivery", "late", "worst", "shipping", "delay"],
    band: "Similarity band 0.76",
    tag: "Needs Attention",
    title: "Delivery-related complaints are direct and easy to isolate.",
    body: "These results show a clean negative retrieval lane for logistics pain points, which can feed support triage or operational reporting.",
    results: [
      {
        title: "Severe delivery complaint",
        score: "0.79",
        review: "Worst delivery Flipkart.",
        meta: ["negative", "delivery", "support risk"]
      },
      {
        title: "Late arrival",
        score: "0.75",
        review: "Delivery was one day late.",
        meta: ["negative", "delay", "logistics"]
      },
      {
        title: "Actionable insight",
        score: "0.73",
        review: "A RAG answer here should focus on delivery delay rather than product quality because the retrieval context is operational, not product-centric.",
        meta: ["ops", "rag", "triage"]
      }
    ]
  },
  {
    id: "good quality product",
    keywords: ["quality", "build", "good", "sturdy", "product"],
    band: "Similarity band 0.78",
    tag: "Consistent Theme",
    title: "Quality language forms a broad but reliable positive cluster.",
    body: "Quality-focused searches return broad satisfaction language, which is useful for understanding recurring product-strength themes across the catalog.",
    results: [
      {
        title: "Direct satisfaction match",
        score: "0.80",
        review: "Good quality product.",
        meta: ["positive", "quality", "broad match"]
      },
      {
        title: "Repeated motif",
        score: "0.77",
        review: "Good quality product.",
        meta: ["positive", "repeat signal", "catalog trend"]
      },
      {
        title: "Narrative summary",
        score: "0.75",
        review: "This pattern helps product teams identify which benefits show up repeatedly in customer language.",
        meta: ["insight", "product", "semantic trend"]
      }
    ]
  }
];

const input = document.querySelector("#query-input");
const runButton = document.querySelector("#run-search");
const chips = Array.from(document.querySelectorAll(".chip"));
const resultsList = document.querySelector("#results-list");
const resultsQuery = document.querySelector("#results-query");
const resultsScore = document.querySelector("#results-score");
const answerTag = document.querySelector("#answer-tag");
const answerTitle = document.querySelector("#answer-title");
const answerBody = document.querySelector("#answer-body");

const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightbox-image");
const lightboxTitle = document.querySelector("#lightbox-title");
const lightboxCaption = document.querySelector("#lightbox-caption");
const lightboxClose = document.querySelector("#lightbox-close");
const galleryCards = Array.from(document.querySelectorAll(".gallery-card"));

function scoreScenario(query, scenario) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return scenario.keywords.reduce((total, keyword) => {
    return total + (terms.some((term) => keyword.includes(term) || term.includes(keyword)) ? 1 : 0);
  }, 0);
}

function pickScenario(query) {
  const normalized = query.trim().toLowerCase();
  const exact = scenarios.find((scenario) => scenario.id === normalized);
  if (exact) {
    return exact;
  }

  return scenarios
    .map((scenario) => ({ scenario, score: scoreScenario(normalized, scenario) }))
    .sort((a, b) => b.score - a.score)[0].scenario;
}

function renderResults(scenario) {
  resultsQuery.textContent = `Query: ${input.value.trim() || scenario.id}`;
  resultsScore.textContent = scenario.band;
  answerTag.textContent = scenario.tag;
  answerTitle.textContent = scenario.title;
  answerBody.textContent = scenario.body;

  resultsList.innerHTML = scenario.results.map((item) => `
    <article class="results-card">
      <div class="results-card-top">
        <strong>${item.title}</strong>
        <span class="score-pill">score ${item.score}</span>
      </div>
      <p class="review-text">${item.review}</p>
      <div class="results-meta">
        ${item.meta.map((tag) => `<span class="meta-pill">${tag}</span>`).join("")}
      </div>
    </article>
  `).join("");

  chips.forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.query === scenario.id);
  });
}

function runScenario(query) {
  renderResults(pickScenario(query));
}

runButton.addEventListener("click", () => runScenario(input.value));

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    runScenario(input.value);
  }
});

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    input.value = chip.dataset.query;
    renderResults(scenarios.find((scenario) => scenario.id === chip.dataset.query));
  });
});

galleryCards.forEach((card) => {
  card.tabIndex = 0;

  const openPreview = () => {
    const image = card.querySelector("img");
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxTitle.textContent = card.dataset.title;
    lightboxCaption.textContent = card.dataset.caption;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
  };

  card.addEventListener("click", openPreview);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPreview();
    }
  });
});

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImage.src = "";
  document.body.style.overflow = "";
}

lightboxClose.addEventListener("click", closeLightbox);

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !lightbox.hidden) {
    closeLightbox();
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, { threshold: 0.18 });

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

renderResults(scenarios[0]);
