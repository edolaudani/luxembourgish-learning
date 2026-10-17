document.addEventListener("DOMContentLoaded", async () => {
  const contentEl = document.getElementById("quiz-content");
  const progressEl = document.getElementById("progress");
  const progressFillEl = document.getElementById("progress-fill");
  const scoreEl = document.getElementById("score");
  const nextBtn = document.getElementById("next-btn");
  const resetBtn = document.getElementById("reset-btn");

  const STORAGE_KEY = "lux-learning-vocabulary-v1";

  let vocabulary = [];
  let currentQuestion = null;
  let score = 0;
  let answered = false;
  let completed = new Set();

  function shuffle(array) {
    const result = [...array];

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
        completed: [...completed],
        score
      })
    );
  }

  function updateStats() {
    scoreEl.textContent = `Score: ${score}`;
    progressEl.textContent =
      `${completed.size} of ${vocabulary.length} words completed`;

    const percentage = vocabulary.length
      ? (completed.size / vocabulary.length) * 100
      : 0;

    progressFillEl.style.width = `${percentage}%`;
  }

  function showMessage(message) {
    contentEl.innerHTML = "";
    const paragraph = document.createElement("p");
    paragraph.className = "loading";
    paragraph.textContent = message;
    contentEl.appendChild(paragraph);
  }

  function finishQuiz() {
    currentQuestion = null;
    showMessage("Great work! You have completed all the vocabulary questions.");

    const summary = document.createElement("p");
    summary.textContent = `Final score: ${score}`;
    contentEl.appendChild(summary);

    nextBtn.disabled = true;
    updateStats();
  }

  function nextQuestion() {
    answered = false;
    nextBtn.disabled = true;

    // Prioritise words not yet answered correctly.
    let available = vocabulary.filter(word => !completed.has(word.id));

    // Once all words have been completed, finish the quiz.
    if (available.length === 0) {
      finishQuiz();
      return;
    }

    currentQuestion =
      available[Math.floor(Math.random() * available.length)];

    contentEl.innerHTML = "";

    const prompt = document.createElement("h2");
    prompt.className = "question-text";
    prompt.textContent = currentQuestion.luxembourgish;
    contentEl.appendChild(prompt);

    const optionsContainer = document.createElement("div");
    optionsContainer.className = "answer-options";
    optionsContainer.setAttribute("role", "group");
    optionsContainer.setAttribute(
      "aria-label",
      "Choose the English translation"
    );

    const correctAnswer = currentQuestion.english.trim();

    const distractors = shuffle(
      vocabulary
        .filter(word =>
          word.id !== currentQuestion.id &&
          word.english.trim().toLowerCase() !==
            correctAnswer.toLowerCase()
        )
        .map(word => word.english.trim())
        .filter((answer, index, array) =>
          array.findIndex(item =>
            item.toLowerCase() === answer.toLowerCase()
          ) === index
        )
    ).slice(0, 3);

    const answers = shuffle([correctAnswer, ...distractors]);

    answers.forEach(answer => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-btn";
      button.textContent = answer;

      button.addEventListener("click", () => {
        if (answered) return;
        answered = true;

        const isCorrect =
          answer.toLowerCase() === correctAnswer.toLowerCase();

        if (isCorrect) {
          score++;
          completed.add(currentQuestion.id);
          showFeedback("Correct!", true);
          button.classList.add("correct");
        } else {
          showFeedback(
            `Not quite. The correct answer is: ${correctAnswer}`,
            false
          );
          button.classList.add("incorrect");
        }

        [...optionsContainer.children].forEach(option => {
          option.disabled = true;

          if (
            option.textContent.toLowerCase() ===
            correctAnswer.toLowerCase()
          ) {
            option.classList.add("correct");
          }
        });

        saveProgress();
        updateStats();
        nextBtn.disabled = false;
      });

      optionsContainer.appendChild(button);
    });

    contentEl.appendChild(optionsContainer);

    const feedback = document.createElement("p");
    feedback.id = "answer-feedback";
    feedback.className = "feedback";
    contentEl.appendChild(feedback);

    updateStats();
  }

  function showFeedback(message, isCorrect) {
    const feedback = document.getElementById("answer-feedback");
    if (!feedback) return;

    feedback.textContent = message;
    feedback.classList.add(isCorrect ? "correct" : "incorrect");
  }

  nextBtn.addEventListener("click", nextQuestion);

  resetBtn.addEventListener("click", () => {
    const confirmed = window.confirm(
      "Reset your vocabulary progress and score?"
    );

    if (!confirmed) return;

    completed = new Set();
    score = 0;
    saveProgress();
    nextQuestion();
  });

  try {
    const response = await fetch("data/vocabulary-questions.json");

    if (!response.ok) {
      throw new Error(
        `Could not load vocabulary file (HTTP ${response.status}).`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("The vocabulary file must contain a JSON array.");
    }

    vocabulary = data.filter(word =>
      word &&
      word.id &&
      typeof word.luxembourgish === "string" &&
      word.luxembourgish.trim() &&
      typeof word.english === "string" &&
      word.english.trim()
    );

    if (vocabulary.length === 0) {
      throw new Error(
        "No valid vocabulary entries found. Check the JSON field names."
      );
    }

    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );

      completed = new Set(
        Array.isArray(saved.completed) ? saved.completed : []
      );

      score = Number.isFinite(saved.score) ? saved.score : 0;
    } catch {
      completed = new Set();
      score = 0;
    }

    updateStats();
    nextQuestion();
  } catch (error) {
    showMessage(`Error: ${error.message}`);
    progressEl.textContent = "Unable to load questions";
    console.error(error);
  }
});
