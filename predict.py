"""
=========================================
MediAssist AI
Prediction Engine (local model + translation)
=========================================
"""

import os
import re
import joblib
import pandas as pd

from langdetect import detect_langs, LangDetectException
from deep_translator import GoogleTranslator

from config import Config


class MedicalPredictor:

    SUPPORTED_LANGUAGES = {"hi", "es", "fr", "ta", "bn", "mr", "gu", "pa", "ur"}

    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.dataset = None
        self.load_everything()

    def load_everything(self):
        if os.path.exists(Config.MODEL_PATH):
            self.model = joblib.load(Config.MODEL_PATH)
        if os.path.exists(Config.VECTORIZER_PATH):
            self.vectorizer = joblib.load(Config.VECTORIZER_PATH)
        if os.path.exists("dataset/medical_dataset.csv"):
            self.dataset = pd.read_csv("dataset/medical_dataset.csv")

    def detect_language(self, text):
        if re.fullmatch(r"[\x00-\x7F]*", text):
            return "en"
        try:
            candidates = detect_langs(text)
            best = candidates[0]
            if best.lang in self.SUPPORTED_LANGUAGES and best.prob >= 0.70:
                return best.lang
        except LangDetectException:
            pass
        return "en"

    def translate(self, text, source, target):
        if source == target or not text:
            return text
        try:
            return GoogleTranslator(source=source, target=target).translate(text)
        except Exception as error:
            print("Translation error:", error)
            return text

    def predict(self, user_message, target_lang="auto"):

        if self.model is None:
            return {"success": False, "message": "Model not loaded."}

        if target_lang and target_lang != "auto":
            reply_lang = target_lang
        else:
            reply_lang = self.detect_language(user_message)

        message_en = self.translate(user_message, source="auto", target="en")

        vector = self.vectorizer.transform([message_en])
        category = self.model.predict(vector)[0]

        scores = self.model.decision_function(vector)
        confidence = round(abs(scores).max() * 10, 2)
        if confidence > 100:
            confidence = 100

        row = self.dataset[self.dataset["category"] == category].iloc[0]

        severity = str(row["severity"])
        first_aid = str(row["first_aid"])
        emergency = str(row["emergency"])

        note = ("This advice is for first aid only. If symptoms become "
                "severe or persist, please consult a qualified healthcare professional.")

        if reply_lang != "en":
            category = self.translate(category, source="en", target=reply_lang)
            severity = self.translate(severity, source="en", target=reply_lang)
            first_aid = self.translate(first_aid, source="en", target=reply_lang)
            emergency = self.translate(emergency, source="en", target=reply_lang)
            note = self.translate(note, source="en", target=reply_lang)

        return {
            "success": True,
            "category": category,
            "severity": severity,
            "first_aid": first_aid,
            "emergency": emergency,
            "confidence": confidence,
            "note": note
        }


predictor = MedicalPredictor()
