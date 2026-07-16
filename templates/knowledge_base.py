"""
=========================================
MediAssist AI
Q&A Search Engines (disease/medicine info +
medicine recommendation)
=========================================

Handles general questions that are NOT a symptom report:
  - "what is diabetes"                  -> knowledge_base
  - "what medicine should I take for X"  -> medicine_advisor

Both use simple TF-IDF + cosine similarity search over a curated
question/answer dataset. No training step is required - new
topics can be added to the CSVs and they work immediately.
"""

import os
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class QAEngine:

    def __init__(self, dataset_path, threshold=0.30):
        self.dataset_path = dataset_path
        self.threshold = threshold
        self.data = None
        self.vectorizer = None
        self.question_vectors = None
        self.load()

    def load(self):
        """
        Loads the CSV and builds the TF-IDF matrix for all known
        questions. Safe to call again to reload after editing the CSV.
        """

        if not os.path.exists(self.dataset_path):
            print(f"[QAEngine] Warning: {self.dataset_path} not found. "
                  f"This dataset will be disabled.")
            return

        self.data = pd.read_csv(self.dataset_path)

        self.vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words="english"
        )

        self.question_vectors = self.vectorizer.fit_transform(
            self.data["question"].astype(str)
        )

    def search(self, message_en):
        """
        Finds the closest matching question in the dataset.

        Returns a dict with topic/type/answer/score if the best
        match is confident enough, otherwise returns None.
        """

        if self.data is None or self.vectorizer is None:
            return None

        if not message_en or not message_en.strip():
            return None

        query_vector = self.vectorizer.transform([message_en])
        scores = cosine_similarity(query_vector, self.question_vectors)[0]

        best_index = scores.argmax()
        best_score = float(scores[best_index])

        if best_score < self.threshold:
            return None

        row = self.data.iloc[best_index]

        return {
            "topic": str(row["topic"]),
            "type": str(row["type"]),
            "answer": str(row["answer"]),
            "score": round(best_score, 3)
        }


# Shared instances, loaded once when the app starts.
#
# medicine_advisor uses a higher threshold than knowledge_base:
# vague queries like "suggest some medicine" (naming no condition)
# still score ~0.7 against SOME topic just from words like
# "suggest"/"medicine" - genuine matches that actually name a
# condition score ~1.0, so 0.75 cleanly separates the two.
knowledge_base = QAEngine("dataset/knowledge_base.csv", threshold=0.30)
medicine_advisor = QAEngine("dataset/medicine_recommendation.csv", threshold=0.75)
