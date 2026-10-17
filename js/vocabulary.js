
/* Vocabulary quiz. Uses data/vocabulary-questions.json. */
document.addEventListener("DOMContentLoaded", async () => {
  const content = document.getElementById("quiz-content");
  const progress = document.getElementById("progress");
  const scoreEl = document.getElementById("score");
  const fill = document.getElementById("progress-fill");
  const nextBtn = document.getElementById("next-btn");
  const resetBtn = document.getElementById("reset-btn");

  // Versioned key prevents old quiz state from being restored.
  const STORAGE_KEY = "lux-learning-vocabulary-v2";

  let bank = [];
  let available = [];
  let current = null;
  let score = 0;
  let answered = false;

  function shuffle(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function make(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
  }

  function saveProgress() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          available,
          score
        })
      );
    } catch (error) {
      console.warn("Could not save quiz progress.", error);
    }
  }

  function restoreProgress() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "null"
      );

      if (
        saved &&
        Array.isArray(saved.available) &&
        Number.isFinite(saved.score)
      ) {
        const validIds = new Set(bank.map(question => question.id));
        const savedIds = new Set(saved.available);

        // Restore only valid, unique IDs from the current question bank.
        available = bank
          .map(question => question.id)
          .filter(id => savedIds.has(id) && validIds.has(id));

        score = Math.max(0, saved.score);
        return;
      }
    } catch (error) {
      console.warn("Could not restore quiz progress.", error);
    }

    available = bank.map(question => question.id);
    score = 0;
  }

  function updateMeta() {
    const completed = bank.length - available.length;

    progress.textContent = bank.length
      ? `${completed} of ${bank.length} words completed`
      : "No questions";

    scoreEl.textContent = `Score: ${score}`;

    fill.style.width = bank.length
      ? `${(completed / bank.length) * 100}%`
      : "0%";
  }

  function showMessage(message, title) {
    content.replaceChildren();

    const box = make("div", "empty-state");
    box.append(
      make("h2", "", title),
      make("p", "", message)
    );

    content.append(box);
    nextBtn.disabled = true;
  }

  function getOptions(question) {
    const correct = question.english.trim();

    // Exclude duplicate English answers, ignoring case and whitespace.
    const seen = new Set([correct.toLowerCase()]);

    const distractors = [];

    for (const candidate of shuffle(bank)) {
      if (candidate.id === question.id) continue;

      const answer = candidate.english.trim();
      const normalized = answer.toLowerCase();

      if (!answer || seen.has(normalized)) continue;

      seen.add(normalized);
      distractors.push(answer);

      if (distractors.length === 3) break;
    }

    // Never invent or duplicate answers to fill missing choices.
    return shuffle([correct, ...distractors]);
  }

  function loadQuestion() {
    answered = false;
    current = null;
    nextBtn.disabled = true;
    nextBtn.textContent = "Next question →";

    updateMeta();

    if (!available.length) {
      showMessage(
        bank.length
          ? "You have completed every question. Reset progress to practise again."
          : "No valid vocabulary entries were found in the question bank.",
        bank.length ? "All done for now!" : "No questions available"
      );
      return;
    }

    const id = available[
      Math.floor(Math.random() * available.length)
    ];

    current = bank.find(question => question.id === id);

    if (!current) {
      available = bank.map(question => question.id);
      return loadQuestion();
    }

    content.replaceChildren();

    content.append(
      make("p", "question-label", "What does this mean?"),
      make("h2", "question", current.luxembourgish)
    );

    const answers = make("div", "answers");
    const options = getOptions(current);

    options.forEach((option, index) => {
      const button = make("button", "answer-option");
      button.type = "button";

      button.append(
        make(
          "span",
          "answer-letter",
          String.fromCharCode(65 + index)
        ),
        make("span", "", option)
      );

      button.addEventListener("click", () => {
        chooseAnswer(button, option, answers);
      });

      answers.append(button);
    });

    content.append(answers);

    if (options.length < 4) {
      const note = make(
        "p",
        "loading",
        `Only ${options.length} distinct answer choices are available for this question.`
      );
      content.append(note);
    }
  }

  function chooseAnswer(button, chosen, answers) {
    if (answered || !current) return;

    answered = true;

    const correct = current.english.trim();
    const isCorrect = chosen.toLowerCase() === correct.toLowerCase();

    [...answers.querySelectorAll(".answer-option")].forEach(option => {
      option.disabled = true;

      const label = option.lastElementChild.textContent;

      if (label.toLowerCase() === correct.toLowerCase()) {
        option.classList.add("correct");
      }
    });

    const feedback = make(
      "div",
      `feedback ${isCorrect ? "success" : "error"}`
    );

    feedback.append(
      make("strong", "", isCorrect ? "Correct!" : "Not quite.")
    );

    if (!isCorrect) {
      feedback.append(
        make("p", "", `Correct answer: ${correct}`)
      );
    }

    content.append(feedback);

    if (isCorrect) {
      score++;
      available = available.filter(id => id !== current.id);
    } else {
      button.classList.add("incorrect");
    }

    nextBtn.disabled = false;
    nextBtn.textContent = available.length
      ? "Next question →"
      : "Finish quiz →";

    updateMeta();
    saveProgress();
  }

  nextBtn.addEventListener("click", () => {
    if (!answered) return;
    loadQuestion();
  });

  resetBtn.addEventListener("click", () => {
    if (!window.confirm(
      "Reset your progress and make all questions available again?"
    )) {
      return;
    }

    available = bank.map(question => question.id);
    score = 0;
    current = null;
    answered = false;

    saveProgress();
    loadQuestion();
  });

  try {
    const response = await fetch("data/vocabulary-questions.json");

    if (!response.ok) {
      throw new Error(`Could not load vocabulary file (HTTP ${response.status}).`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("The vocabulary file must contain a JSON array.");
    }

    // Preserve separate source rows, including repeated Luxembourgish words.
    bank = data.filter(question =>
      question &&
      typeof question.id === "string" &&
      question.id.trim() &&
      typeof question.luxembourgish === "string" &&
      question.luxembourgish.trim() &&
      typeof question.english === "string" &&
      question.english.trim()
    );

    // Duplicate IDs would make progress tracking ambiguous.
    const ids = bank.map(question => question.id);
    if (new Set(ids).size !== ids.length) {
      throw new Error(
        "Some vocabulary entries have duplicate IDs. Each row needs a unique ID."
      );
    }

    if (!bank.length) {
      throw new Error(
        "No valid vocabulary entries were found. Check the JSON field names."
      );
    }

    restoreProgress();
    loadQuestion();
  } catch (error) {
    console.error("Vocabulary quiz error:", error);

    showMessage(
      error.message || "An unexpected error occurred.",
      "Could not load questions"
    );

    progress.textContent = "Unable to load questions";
  }
});
