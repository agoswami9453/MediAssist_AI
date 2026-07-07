"""
=========================================
MediAssist AI
Model Training
=========================================
"""

import os
import joblib
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC


# =========================================
# Load Dataset
# =========================================

print("Loading dataset...")

dataset = pd.read_csv("dataset/medical_dataset.csv")

print(f"Dataset Loaded Successfully: {len(dataset)} rows")


# =========================================
# Input and Output
# =========================================

X = dataset["user_input"]

y = dataset["category"]


# =========================================
# TF-IDF Vectorizer
# =========================================

print("Creating TF-IDF Vectorizer...")

vectorizer = TfidfVectorizer(
    lowercase=True,
    stop_words="english"
)

X_vector = vectorizer.fit_transform(X)


# =========================================
# Train Model
# =========================================

print("Training AI Model...")

model = LinearSVC()

model.fit(X_vector, y)

print("Training Completed.")


# =========================================
# Create Models Folder
# =========================================

os.makedirs("models", exist_ok=True)


# =========================================
# Save Model
# =========================================

joblib.dump(model, "models/chatbot_model.pkl")

joblib.dump(vectorizer, "models/vectorizer.pkl")

print("Model Saved Successfully!")

print("Training Finished.")