
document.addEventListener("DOMContentLoaded", async () => {
  const questionEl = document.getElementById("question");
  const optionsEl = document.getElementById("options");
  const feedbackEl = document.getElementById("feedback");
  const nextBtn = document.getElementById("next-btn");
  const scoreEl = document.getElementById("score");

  let vocabulary = [];
  let currentQuestion = null;
  let score = 0;
  let answered = false;

  const STORAGE_KEY = "lux-learning-vocabulary-v1";

  // Load saved progress
  let progress = {};
  try {
    progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    progress = {};
  }

  function shuffle(array) {
    return [...array].sort(() => Math.random() - 0.5);
  }

  function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  function updateScore() {
    if (scoreEl) {
      scoreEl.textContent = `Score: ${score}`;
    }
  }

  function showFeedback(message, isCorrect) {
    if (!feedbackEl) return;
    feedbackEl.textContent = message;
    feedbackEl.className = isCorrect ? "feedback correct" : "feedback incorrect";
  }

  function getNextQuestion() {
    // Prioritise words marked unknown, then words not yet answered.
    const available = vocabulary.filter(word =>
      (progress[word.id] || word.status || "unknown") !== "known"
    );

    if (available.length === 0) {
      questionEl.textContent = "Excellent! You have marked every word as known.";
      optionsEl.innerHTML = "";
      feedbackEl.textContent = "You can reset your progress to practise again.";
      nextBtn.disabled = true;
      return;
    }

    // Prefer words not answered correctly yet.
    const unanswered = available.filter(word => !progress[word.id]);
    const pool = unanswered.length ? unanswered : available;

    currentQuestion = pool[Math.floor(Math.random() * pool.length)];
    answered = false;
    nextBtn.disabled = true;

    questionEl.textContent = currentQuestion.luxembourgish;
    optionsEl.innerHTML = "";
    feedbackEl.textContent = "";

    const correctAnswer = currentQuestion.english;

    const distractors = shuffle(
      vocabulary
        .filter(word =>
          word.id !== currentQuestion.id &&
          word.english &&
          word.english.trim().toLowerCase() !== correctAnswer.trim().toLowerCase()
        )
        .map(word => word.english.trim())
        .filter((answer, index, array) =>
          array.indexOf(answer) === index
        )
    ).slice(0, 3);

    const answers = shuffle([
      correctAnswer,
      ...distractors
    ]);

    answers.forEach(answer => {
      const button = document.createElement("button");
      button.textContent = answer;
      button.className = "option-btn";

      button.addEventListener("click", () => {
        if (answered) return;
        answered = true;

        const isCorrect =
          answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

        if (isCorrect) {
          score++;
          progress[currentQuestion.id] = "known";
          saveProgress();
          showFeedback("Correct!", true);
          button.classList.add("correct");
        } else {
          progress[currentQuestion.id] = "unknown";
          saveProgress();
          showFeedback(`Not quite. The correct answer is: ${correctAnswer}`, false);
          button.classList.add("incorrect");

          [...optionsEl.children].forEach(option => {
            if (option.textContent === correctAnswer) {
              option.classList.add("correct");
            }
          });
        }

        [...optionsEl.children].forEach(option => {
          option.disabled = true;
        });

        updateScore();
        nextBtn.disabled = false;
      });

      optionsEl.appendChild(button);
    });
  }

  nextBtn.addEventListener("click", getNextQuestion);

  try {
    const response = await fetch("data/vocabulary-questions.json");

    if (!response.ok) {
      throw new Error(`Could not load vocabulary file (${response.status}).`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("The vocabulary JSON file is empty or has an invalid format.");
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
      throw new Error("No valid vocabulary entries were found in the JSON file.");
    }

    updateScore();
    getNextQuestion();
  } catch (error) {
    questionEl.textContent = "Could not load the vocabulary.";
    optionsEl.innerHTML = "";
    feedbackEl.textContent =
      `${error.message} Check that data/vocabulary-questions.json exists and contains valid JSON.`;
    console.error(error);
  }
});
