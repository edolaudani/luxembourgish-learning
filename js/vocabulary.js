document.addEventListener("DOMContentLoaded", async () => {
  const content = document.getElementById("quiz-content");
  const progress = document.getElementById("progress");
  const progressFill = document.getElementById("progress-fill");
  const scoreDisplay = document.getElementById("score");
  const nextBtn = document.getElementById("next-btn");
  const resetBtn = document.getElementById("reset-btn");

  const STORAGE_KEY = "lux-learning-vocabulary-flashcards-v1";

  let vocabulary = [];
  let statusById = {};
  let deck = [];
  let currentWord = null;
  let answerShown = false;
  let score = 0;

  function shuffle(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function saveProgress() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        statusById,
        deck,
        score
      })
    );
  }

  function updateStats() {
    const knownCount = vocabulary.filter(
      word => statusById[word.id] === "known"
    ).length;

    const remaining = vocabulary.length - knownCount;

    progress.textContent =
      `${knownCount} of ${vocabulary.length} words known · ${remaining} remaining`;

    scoreDisplay.textContent = `Score: ${score}`;

    const percentage = vocabulary.length
      ? (knownCount / vocabulary.length) * 100
      : 0;

    progressFill.style.width = `${percentage}%`;
  }

  function makeButton(label, className, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  function showFinished() {
    currentWord = null;
    content.replaceChildren();

    const heading = document.createElement("h2");
    heading.className = "question";
    heading.textContent = "All words known!";

    const message = document.createElement("p");
    message.textContent =
      "You have marked every vocabulary item as known. Reset your progress to practise them all again.";

    content.append(heading, message);
    nextBtn.disabled = true;
    updateStats();
  }

  function loadNextWord() {
    answerShown = false;
    currentWord = null;

    // Keep only words that are still unknown.
    deck = deck.filter(
      id => statusById[id] !== "known"
    );

    // Add any unknown words missing from the deck.
    const inDeck = new Set(deck);

    vocabulary.forEach(word => {
      if (
        statusById[word.id] !== "known" &&
        !inDeck.has(word.id)
      ) {
        deck.push(word.id);
      }
    });

    if (deck.length === 0) {
      showFinished();
      saveProgress();
      return;
    }

    // Take the next card from the front of the deck.
    const nextId = deck.shift();

    currentWord = vocabulary.find(
      word => word.id === nextId
    );

    if (!currentWord) {
      loadNextWord();
      return;
    }

    content.replaceChildren();

    const label = document.createElement("p");
    label.className = "question-label";
    label.textContent = "ENGLISH";

    const english = document.createElement("h2");
    english.className = "question";
    english.textContent = currentWord.english;

    const revealBtn = makeButton(
      "Show Luxembourgish",
      "button button-primary",
      showAnswer
    );

    content.append(label, english, revealBtn);

    nextBtn.disabled = true;
    updateStats();
    saveProgress();
  }

  function showAnswer() {
    if (!currentWord || answerShown) return;

    answerShown = true;

    const label = document.createElement("p");
    label.className = "question-label";
    label.textContent = "LUXEMBOURGISH";

    const translation = document.createElement("h2");
    translation.className = "question";
    translation.textContent = currentWord.luxembourgish;

    const actions = document.createElement("div");
    actions.className = "flashcard-actions";

    const knownBtn = makeButton(
      "I know it",
      "button button-primary",
      markKnown
    );

    const unknownBtn = makeButton(
      "I do not know it",
      "button button-quiet",
      markUnknown
    );

    actions.append(knownBtn, unknownBtn);
    content.append(label, translation, actions);
  }

  function markKnown() {
    if (!currentWord || !answerShown) return;

    statusById[currentWord.id] = "known";
    score++;

    saveProgress();
    loadNextWord();
  }

  function markUnknown() {
    if (!currentWord || !answerShown) return;

    // Keep the word unknown and put it at the end of the deck.
    statusById[currentWord.id] = "unknown";
    deck.push(currentWord.id);

    saveProgress();
    loadNextWord();
  }

  nextBtn.addEventListener("click", loadNextWord);

  resetBtn.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Reset all vocabulary progress? Every word will become unknown again."
    );

    if (!confirmed) return;

    statusById = Object.fromEntries(
      vocabulary.map(word => [word.id, "unknown"])
    );

    deck = shuffle(vocabulary.map(word => word.id));
    score = 0;

    saveProgress();
    loadNextWord();
  });

  try {
    const response = await fetch("data/vocabulary-questions.json");

    if (!response.ok) {
      throw new Error(
        `Could not load vocabulary data (HTTP ${response.status}).`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("The vocabulary JSON must contain an array.");
    }

    vocabulary = data.filter(word =>
      word &&
      typeof word.id === "string" &&
      word.id.trim() &&
      typeof word.english === "string" &&
      word.english.trim() &&
      typeof word.luxembourgish === "string" &&
      word.luxembourgish.trim()
    );

    if (vocabulary.length === 0) {
      throw new Error("No valid vocabulary entries were found.");
    }

    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "{}"
    );

    const validIds = new Set(
      vocabulary.map(word => word.id)
    );

    if (
      saved.statusById &&
      typeof saved.statusById === "object" &&
      !Array.isArray(saved.statusById)
    ) {
      statusById = Object.fromEntries(
        Object.entries(saved.statusById).filter(
          ([id, status]) =>
            validIds.has(id) &&
            (status === "known" || status === "unknown")
        )
      );
    }

    // Use the JSON status for words not yet saved in this browser.
    vocabulary.forEach(word => {
      if (!statusById[word.id]) {
        statusById[word.id] =
          word.status === "known" ? "known" : "unknown";
      }
    });

    score = Number.isFinite(saved.score)
      ? Math.max(0, saved.score)
      : 0;

    const savedDeck = Array.isArray(saved.deck)
      ? saved.deck.filter(
          id => validIds.has(id) && statusById[id] !== "known"
        )
      : [];

    deck = [...new Set(savedDeck)];

    const deckIds = new Set(deck);

    vocabulary.forEach(word => {
      if (
        statusById[word.id] !== "known" &&
        !deckIds.has(word.id)
      ) {
        deck.push(word.id);
      }
    });

    if (!saved.deck) {
      deck = shuffle(deck);
    }

    updateStats();
    loadNextWord();
  } catch (error) {
    content.replaceChildren();

    const message = document.createElement("p");
    message.className = "loading";
    message.textContent = `Error: ${error.message}`;

    content.appendChild(message);
    progress.textContent = "Unable to load vocabulary";
    nextBtn.disabled = true;

    console.error(error);
  }
});
