const scenarios = [
  {
    id: "battery",
    prompt: "battery draining fast",
    aliases: [
      "battery drain",
      "battery issue",
      "phone losing charge quickly",
      "battery backup bad"
    ],
    keywords: ["battery", "drain", "charge", "backup", "power", "heating"],
    answer:
      "The retrieved reviews suggest this query is strongly in-domain. Customers mainly complain about standby drain and weaker-than-expected battery backup after moderate use, while a smaller set still praise camera and display quality. For a grounded response, the safest summary is that battery performance is inconsistent and becomes a clear pain point for users expecting full-day endurance.",
    results: [
      {
        id: "battery-1",
        product: "Smartphone review",
        aspect: "Battery endurance drops faster than expected",
        similarity: 0.89,
        sentiment: "Negative",
        review:
          "Battery draining very fast. With normal browsing and WhatsApp usage the phone falls below 40 percent by evening. Camera is nice but backup is disappointing for daily use.",
        tags: ["battery", "daily usage", "smartphone"]
      },
      {
        id: "battery-2",
        product: "Smartphone review",
        aspect: "Heavy idle drain overnight",
        similarity: 0.82,
        sentiment: "Negative",
        review:
          "Phone looks premium but the battery percentage drops overnight even when mobile data is off. I bought it expecting solid battery life and that part feels below average.",
        tags: ["idle drain", "expectation gap", "overnight"]
      },
      {
        id: "battery-3",
        product: "Accessories review",
        aspect: "Backup okay at first, degrades with use",
        similarity: 0.73,
        sentiment: "Neutral",
        review:
          "Battery backup was okay for the first few days, then it started draining quickly while watching video. Performance and audio are decent, but power management needs improvement.",
        tags: ["video usage", "neutral tone", "power management"]
      },
      {
        id: "battery-4",
        product: "Smartphone review",
        aspect: "Mixed but still battery-related signal",
        similarity: 0.61,
        sentiment: "Positive",
        review:
          "Charging speed is fast and the phone is smooth, but battery backup depends a lot on brightness and network. Not terrible, just not as strong as the marketing claims.",
        tags: ["mixed feedback", "charging", "brightness"]
      }
    ]
  },
  {
    id: "camera",
    prompt: "excellent camera quality",
    aliases: [
      "good camera for this price",
      "camera is amazing",
      "great photo quality",
      "camera quality"
    ],
    keywords: ["camera", "photo", "portrait", "quality", "image", "night"],
    answer:
      "Camera-focused retrieval is consistently positive. The strongest review matches highlight sharp daylight images, strong portrait output for the price band, and buyers repeatedly framing the camera as a value-for-money differentiator. A grounded answer should say the camera is widely liked, especially in well-lit conditions, with only minor caveats around low-light consistency.",
    results: [
      {
        id: "camera-1",
        product: "Smartphone review",
        aspect: "Strong camera output for the price",
        similarity: 0.92,
        sentiment: "Positive",
        review:
          "Excellent camera quality for this price segment. Daylight shots come out sharp, colors look natural, and portrait mode is much better than I expected from a mid-range phone.",
        tags: ["camera", "value", "daylight"]
      },
      {
        id: "camera-2",
        product: "Smartphone review",
        aspect: "Buyers praise photo clarity",
        similarity: 0.87,
        sentiment: "Positive",
        review:
          "Images are crisp and social-media ready without much editing. Front camera is also very good for video calls and selfies, which makes the phone feel premium overall.",
        tags: ["clarity", "selfie", "premium feel"]
      },
      {
        id: "camera-3",
        product: "Smartphone review",
        aspect: "Minor low-light caveat",
        similarity: 0.76,
        sentiment: "Neutral",
        review:
          "Rear camera is excellent outdoors and good indoors, but night mode still adds a little softness. For the money it is still one of the best camera phones in this range.",
        tags: ["night mode", "balanced review", "outdoors"]
      },
      {
        id: "camera-4",
        product: "Electronics review",
        aspect: "Broad quality praise with less specificity",
        similarity: 0.59,
        sentiment: "Positive",
        review:
          "Really liked the picture quality and detail. It feels like a camera-first device and the overall user experience is satisfying.",
        tags: ["general praise", "photo-first", "user experience"]
      }
    ]
  },
  {
    id: "delivery",
    prompt: "delivery was very late",
    aliases: [
      "worst delivery experience",
      "late delivery",
      "shipping delay",
      "delay in delivery"
    ],
    keywords: ["delivery", "late", "shipping", "delay", "packaging", "courier"],
    answer:
      "This retrieval lane is clearly about logistics rather than product quality. The highest-scoring reviews talk about delayed arrival, missed delivery expectations, and frustration with service coordination. A grounded answer should focus on fulfillment issues, not the product itself.",
    results: [
      {
        id: "delivery-1",
        product: "Order experience",
        aspect: "Delay created the main complaint",
        similarity: 0.86,
        sentiment: "Negative",
        review:
          "Delivery was very late and the package arrived after the promised date with no useful update from the courier team. Product was okay but the overall experience felt poor.",
        tags: ["delivery", "late", "service issue"]
      },
      {
        id: "delivery-2",
        product: "Order experience",
        aspect: "Repeated shipping reschedule",
        similarity: 0.81,
        sentiment: "Negative",
        review:
          "Worst part was the shipment delay. Delivery date changed twice and customer support kept saying it would arrive tomorrow. That was frustrating.",
        tags: ["reschedule", "support", "frustration"]
      },
      {
        id: "delivery-3",
        product: "Order experience",
        aspect: "Packaging okay, arrival slow",
        similarity: 0.69,
        sentiment: "Neutral",
        review:
          "Packaging was fine and the item was genuine, but it reached me later than expected. Review is neutral only because the product quality itself was not a problem.",
        tags: ["packaging", "neutral", "logistics"]
      },
      {
        id: "delivery-4",
        product: "Order experience",
        aspect: "Weak but related logistics signal",
        similarity: 0.52,
        sentiment: "Negative",
        review:
          "Delivery communication was confusing and not very helpful, though the order did finally reach on the same day.",
        tags: ["communication", "weak match", "fulfillment"]
      }
    ]
  },
  {
    id: "sound",
    prompt: "sound quality is amazing",
    aliases: [
      "excellent audio quality",
      "bass is really good",
      "great sound quality",
      "audio is amazing"
    ],
    keywords: ["sound", "audio", "bass", "music", "clarity", "volume"],
    answer:
      "Audio-related matches are positive and specific. The most relevant reviews mention clean sound, strong bass, and a satisfying listening experience during music and calls. A grounded answer can confidently describe the sound quality as a standout strength in the retrieved review set.",
    results: [
      {
        id: "sound-1",
        product: "Audio accessory",
        aspect: "Bass and clarity stand out",
        similarity: 0.9,
        sentiment: "Positive",
        review:
          "Sound quality is amazing. Bass is deep without overpowering vocals, and overall clarity is excellent whether I use it for music or calls.",
        tags: ["audio", "bass", "clarity"]
      },
      {
        id: "sound-2",
        product: "Audio accessory",
        aspect: "Good for calls and streaming",
        similarity: 0.83,
        sentiment: "Positive",
        review:
          "Really happy with the sound tuning. Dialogue is clear in videos and songs feel lively even at moderate volume. Worth buying if audio matters to you.",
        tags: ["streaming", "calls", "worth buying"]
      },
      {
        id: "sound-3",
        product: "Audio accessory",
        aspect: "Mostly positive with minor comfort trade-off",
        similarity: 0.71,
        sentiment: "Neutral",
        review:
          "Audio quality is very good and volume is strong, though comfort after long sessions could be better. Sound performance is still the biggest plus.",
        tags: ["comfort", "volume", "balanced"]
      },
      {
        id: "sound-4",
        product: "Electronics review",
        aspect: "General satisfaction note",
        similarity: 0.58,
        sentiment: "Positive",
        review:
          "Amazing sound and overall quality. Product feels dependable and enjoyable to use every day.",
        tags: ["general praise", "daily use", "broad match"]
      }
    ]
  }
];

const samplePrompts = scenarios.map((scenario) => scenario.prompt);

function normalize(text) {
  return text.toLowerCase().trim();
}

function findScenario(query) {
  const normalizedQuery = normalize(query);

  const exactScenario = scenarios.find(
    (scenario) =>
      normalizedQuery === normalize(scenario.prompt) ||
      scenario.aliases.some((alias) => normalize(alias) === normalizedQuery)
  );

  if (exactScenario) {
    return exactScenario;
  }

  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const rankedMatch = scenarios
    .map((scenario) => {
      const overlap = scenario.keywords.reduce((score, keyword) => {
        const matched = queryTerms.some(
          (term) => keyword.includes(term) || term.includes(keyword)
        );
        return score + (matched ? 1 : 0);
      }, 0);

      return { overlap, scenario };
    })
    .sort((left, right) => right.overlap - left.overlap)[0];

  if (!rankedMatch || rankedMatch.overlap < 2) {
    return null;
  }

  return rankedMatch.scenario;
}

export function runSemanticSearch(query, topK) {
  const matchedScenario = findScenario(query);

  if (!matchedScenario) {
    return {
      query,
      scenario: null,
      results: [],
      averageSimilarity: null
    };
  }

  const results = matchedScenario.results.slice(0, topK);
  const averageSimilarity =
    results.reduce((sum, item) => sum + item.similarity, 0) / results.length;

  return {
    query,
    scenario: matchedScenario.id,
    results,
    averageSimilarity
  };
}

export function runRagSearch(query, topK, threshold) {
  const matchedScenario = findScenario(query);

  if (!matchedScenario) {
    return {
      query,
      scenario: null,
      answer: "",
      sources: [],
      outOfDomain: true
    };
  }

  const sources = matchedScenario.results
    .filter((item) => item.similarity >= threshold)
    .slice(0, topK);

  if (!sources.length) {
    return {
      query,
      scenario: matchedScenario.id,
      answer: "",
      sources: [],
      outOfDomain: true
    };
  }

  return {
    query,
    scenario: matchedScenario.id,
    answer: matchedScenario.answer,
    sources,
    outOfDomain: false
  };
}

export { samplePrompts };
