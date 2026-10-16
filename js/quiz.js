/* Shared quiz engine. Question banks are kept in the data/ folder. */
(() => {
  const path = window.location.pathname;
  const type = path.endsWith("grammar.html") ? "grammar" : "vocabulary";
  const config = type === "grammar"
    ? { file: "data/grammar-questions.json", key: "lux-learning-grammar-v1", title: "Complete the sentence", prompt: q => q.sentence, correct: q => q.correctAnswer, options: q => q.options, translation: q => q.translation, explanation: q => q.rule }
    : { file: "data/vocabulary-questions.json", key: "lux-learning-vocabulary-v1", title: "What does this mean?", prompt: q => q.word, correct: q => q.correctAnswer, options: q => q.options, translation: q => q.translation, explanation: q => q.example || "" };

  const $ = id => document.getElementById(id);
  const content = $("quiz-content");
  const progress = $("progress");
  const scoreEl = $("score");
  const fill = $("progress-fill");
  const nextBtn = $("next-btn");
  const resetBtn = $("reset-btn");

  let bank = [];
  let available = [];
  let current = null;
  let score = 0;
  let answeredCount = 0;
  let answered = false;

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function save() {
    try { localStorage.setItem(config.key, JSON.stringify({ available, score, answeredCount })); } catch (_) {}
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(config.key) || "null");
      if (saved && Array.isArray(saved.available)) {
        const valid = new Set(bank.map(q => q.id));
        available = saved.available.filter(id => valid.has(id));
        score = Number(saved.score) || 0;
        answeredCount = Number(saved.answeredCount) || 0;
        return;
      }
    } catch (_) {}
    available = bank.map(q => q.id);
  }
  function updateMeta() {
    const done = bank.length - available.length;
    progress.textContent = bank.length ? `${done} of ${bank.length} completed` : "No questions";
    scoreEl.textContent = `Score: ${score}`;
    fill.style.width = bank.length ? `${(done / bank.length) * 100}%` : "0%";
  }
  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function showEmpty(message, title = "Question bank not ready yet") {
    content.replaceChildren();
    const wrap = make("div", "empty-state");
    wrap.append(make("h2", "", title), make("p", "", message));
    content.append(wrap);
    nextBtn.disabled = true;
  }
  function loadQuestion() {
    answered = false;
    nextBtn.disabled = true;
    updateMeta();
    if (!available.length) {
      current = null;
      showEmpty(bank.length ? "You have completed every question. Reset progress to practise again." : "Add your questions to the JSON file in the data folder, or upload your Excel workbook so the question bank can be converted.", bank.length ? "All done for now!" : "Your questions will appear here");
      return;
    }
    const id = available[Math.floor(Math.random() * available.length)];
    current = bank.find(q => q.id === id);
    if (!current) { available = bank.map(q => q.id); return loadQuestion(); }

    content.replaceChildren();
    content.append(make("p", "question-label", config.title));
    content.append(make("h2", "question", config.prompt(current)));
    const answers = make("div", "answers");
    const options = shuffle(config.options(current));
    options.forEach((option, i) => {
      const button = make("button", "answer-option");
      button.type = "button";
      button.append(make("span", "answer-letter", String.fromCharCode(65 + i)), make("span", "", option));
      button.addEventListener("click", () => chooseAnswer(button, option, options));
      answers.append(button);
    });
    content.append(answers);
  }
  function chooseAnswer(button, chosen, options) {
    if (answered || !current) return;
    answered = true;
    const correct = config.correct(current);
    const buttons = [...content.querySelectorAll(".answer-option")];
    buttons.forEach(b => {
      b.disabled = true;
      const label = b.lastElementChild.textContent;
      if (label === correct) b.classList.add("correct");
    });
    const isCorrect = chosen === correct;
    if (isCorrect) {
      score++;
      answeredCount++;
      available = available.filter(id => id !== current.id);
    } else {
      button.classList.add("incorrect");
    }
    const feedback = make("div", `feedback ${isCorrect ? "success" : "error"}`);
    feedback.append(make("strong", "", isCorrect ? "Correct!" : "Not quite."));
    if (!isCorrect) feedback.append(make("p", "", `Correct answer: ${correct}`));
    const translation = config.translation(current);
    if (translation) feedback.append(make("p", "", `Translation: ${translation}`));
    const explanation = config.explanation(current);
    if (explanation) feedback.append(make("p", "", `Grammar note: ${explanation}`));
    content.append(feedback);
    nextBtn.disabled = false;
    nextBtn.textContent = available.length ? "Next question →" : "Finish quiz";
    updateMeta();
    save();
  }
  nextBtn.addEventListener("click", () => {
    if (!answered) return;
    loadQuestion();
    nextBtn.textContent = "Next question →";
  });
  resetBtn.addEventListener("click", () => {
    if (!window.confirm("Reset your progress and make all questions available again?")) return;
    available = bank.map(q => q.id);
    score = 0;
    answeredCount = 0;
    current = null;
    save();
    loadQuestion();
    nextBtn.textContent = "Next question →";
  });

  fetch(config.file)
    .then(response => {
      if (!response.ok) throw new Error("Could not load question file");
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data)) throw new Error("Question bank must be a JSON array");
      bank = data.filter(q => q && q.id && config.options(q).length >= 2 && config.correct(q));
      restore();
      loadQuestion();
    })
    .catch(() => showEmpty("The question file could not be loaded. Make sure the site is opened through GitHub Pages or a local web server, and check that the JSON file exists.", "Could not load questions"));
})();
