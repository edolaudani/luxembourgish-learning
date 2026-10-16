# Luxembourgish Learning

A static website for Luxembourgish vocabulary and grammar practice. Built with HTML, CSS and JavaScript, so it can be hosted on GitHub Pages.

## Project structure

- `index.html` — quiz selection page
- `grammar.html` — grammar quiz
- `vocabulary.html` — vocabulary quiz
- `css/styles.css` — shared styling
- `js/quiz.js` — shared quiz engine
- `data/grammar-questions.json` — grammar question bank
- `data/vocabulary-questions.json` — vocabulary question bank

## Question data format

Grammar questions use this format:

```json
[
  {
    "id": "grammar-001",
    "sentence": "Ech ___ zu Lëtzebuerg.",
    "translation": "I live in Luxembourg.",
    "options": ["wunnen", "wunnt", "wunns", "wunnt dir"],
    "correctAnswer": "wunnen",
    "rule": "Add the grammar explanation here."
  }
]
```

Vocabulary questions use this format:

```json
[
  {
    "id": "vocab-001",
    "word": "eidel",
    "translation": "empty",
    "options": ["empty", "full", "late", "quiet"],
    "correctAnswer": "empty",
    "example": "Optional example sentence."
  }
]
```

Each question must have a unique `id`, an `options` array and a `correctAnswer` matching one of those options.

## Publish with GitHub Pages

1. Open the repository **Settings**.
2. Select **Pages** in the left sidebar.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/(root)`, then save.
5. Wait for deployment. The site should be available at `https://edolaudani.github.io/luxembourgish-learning/`.

## Progress storage

Completed questions and scores are stored in the browser's `localStorage`. They are local to that browser and device; they do not sync across devices.

## Note about the example question

The grammar JSON contains a clearly marked example item to demonstrate the data format. Replace it with the actual questions from your Excel workbook before treating the grammar bank as complete. The vocabulary bank is empty until your vocabulary questions are added.
