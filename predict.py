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
from knowledge_base import knowledge_base, medicine_advisor


class MedicalPredictor:

    SUPPORTED_LANGUAGES = {"hi", "es", "fr", "ta", "bn", "mr", "gu", "pa", "ur"}

    # Phrases that signal "the user wants a medicine recommendation
    # for a condition" e.g. "what medicine for fever", "which tablet
    # should I take for a headache". Checked BEFORE the general info
    # patterns below, since it's the more specific intent - e.g.
    # "what medicine is used for fever" should go to the medicine
    # advisor, not the general knowledge base.
    MEDICINE_QUESTION_PATTERNS = [
        r"\bwhich (medicine|medication|tablet|pill)\b",
        r"\bwhat (medicine|medication|tablet|pill)\b",
        r"\bmedicine (for|to take)\b",
        r"\bmedication for\b",
        r"\btablet for\b",
        r"\bsuggest.*(medicine|medication|tablet)\b",
        r"\brecommend.*(medicine|medication|tablet)\b",
        r"\bwhat should i take for\b",
        r"\bwhat can i take for\b",
    ]

    # Phrases that signal "the user is asking a general question"
    # rather than reporting a symptom. e.g. "what is diabetes" vs
    # "I have a fever". Word similarity alone isn't reliable enough
    # to tell these apart (both can share words like "fever"), so we
    # gate the knowledge base behind an explicit intent check first.
    INFO_QUESTION_PATTERNS = [
        r"^\s*(what|which)\s+(is|are|causes|cause)\b",
        r"\btell me about\b",
        r"\bexplain\b",
        r"\bdefine\b",
        r"\bused for\b",
        r"\bside effects?\b",
        r"\bhow does\b",
        r"\bdosage\b",
        r"\bdifference between\b",
        r"\bwhat does .* do\b",
    ]

    # A knowledge-base match this confident is trusted as a genuine
    # new topic mention on its own, even if a context_topic is set.
    # Below this, a vague query (e.g. "what causes it", which can
    # spuriously match SOME topic just from a leftover word like
    # "causes") should defer to the context-boosted retry instead.
    STRONG_MATCH_THRESHOLD = 0.75

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

    def looks_like_medicine_question(self, message_en):
        """
        Returns True if the message is asking for a medicine
        recommendation for a condition, e.g. "what medicine for fever".
        """
        text = message_en.lower()
        return any(re.search(pattern, text) for pattern in self.MEDICINE_QUESTION_PATTERNS)

    def looks_like_info_question(self, message_en):
        """
        Returns True if the message reads like a general "what is X" /
        "tell me about X" question rather than a symptom report.
        """
        text = message_en.lower()
        return any(re.search(pattern, text) for pattern in self.INFO_QUESTION_PATTERNS)

    def translate(self, text, source, target):
        if source == target or not text:
            return text
        try:
            return GoogleTranslator(source=source, target=target).translate(text)
        except Exception as error:
            print("Translation error:", error)
            return text

    def predict(self, user_message, target_lang="auto", context_topic=None):
        """
        context_topic is the last known topic from THIS conversation
        (e.g. "Headache", passed in from app.py's session), used to
        resolve vague follow-ups like "what medicine can I take"
        (no disease named) into "what medicine can I take Headache" -
        which the search engines below can match normally, since they
        just look at word overlap and don't care about grammar.
        """

        if self.model is None:
            return {"success": False, "message": "Model not loaded."}

        if target_lang and target_lang != "auto":
            reply_lang = target_lang
        else:
            reply_lang = self.detect_language(user_message)

        message_en = self.translate(user_message, source="auto", target="en")

        # ------------------------------------------------------------
        # 1) Is this a request for a medicine recommendation? e.g.
        #    "what medicine should I take for a headache". Checked
        #    first since it's the most specific intent.
        # ------------------------------------------------------------
        if self.looks_like_medicine_question(message_en):
            medicine_match = medicine_advisor.search(message_en)

            # No condition named in THIS message - try again with the
            # remembered topic from earlier in the conversation.
            if not medicine_match and context_topic:
                medicine_match = medicine_advisor.search(
                    f"{message_en} {context_topic}"
                )

            if medicine_match:
                response = self._build_medicine_response(medicine_match, reply_lang)
                response["topic"] = medicine_match["topic"]
                return response

        # ------------------------------------------------------------
        # 2) Is this a general disease/medicine question rather than
        #    a symptom report? e.g. "what is diabetes", "what is
        #    ibuprofen used for". Only consult the knowledge base if
        #    the message actually reads like a question - this stops
        #    symptom reports like "I have a fever" from accidentally
        #    matching a knowledge base entry about "fever".
        # ------------------------------------------------------------
        if self.looks_like_info_question(message_en):
            kb_match = knowledge_base.search(message_en)

            # A weak/vague direct match shouldn't win over a
            # confident context-boosted one - e.g. "what causes it"
            # can spuriously match some unrelated topic just from
            # the leftover word "causes". Only trust the direct
            # match outright if it's a strong, specific hit.
            if context_topic and (
                not kb_match or kb_match["score"] < self.STRONG_MATCH_THRESHOLD
            ):
                context_match = knowledge_base.search(
                    f"{message_en} {context_topic}"
                )
                # Only trust the context-boosted match if it's ALSO
                # confident. Otherwise an uncovered topic (nothing in
                # the CSV matches it) can still weakly match some
                # unrelated entry just from generic leftover words -
                # e.g. "what is it Back Pain" incorrectly matching
                # "Arthritis" just because both mention "pain".
                if context_match and context_match["score"] >= self.STRONG_MATCH_THRESHOLD:
                    kb_match = context_match
                elif not kb_match:
                    kb_match = None

            if kb_match:
                response = self._build_info_response(kb_match, reply_lang)
                response["topic"] = kb_match["topic"]
                return response

        # ------------------------------------------------------------
        # 3) Otherwise, fall back to the original symptom checker.
        #    A confirmed symptom category also becomes the new
        #    remembered topic for future follow-ups.
        # ------------------------------------------------------------
        response = self._build_symptom_response(message_en, reply_lang)

        return response

    def _build_medicine_response(self, medicine_match, reply_lang):
        """
        Builds a response for a medicine recommendation question,
        answered from the medicine_advisor dataset.
        """

        topic = medicine_match["topic"]
        answer = medicine_match["answer"]

        note = ("This is general information about commonly used medicines, "
                "not a prescription. Always confirm the right medicine and "
                "dose with a doctor or pharmacist before taking anything, "
                "especially for children, pregnant/breastfeeding people, or "
                "those with existing health conditions.")

        if reply_lang != "en":
            topic = self.translate(topic, source="en", target=reply_lang)
            answer = self.translate(answer, source="en", target=reply_lang)
            note = self.translate(note, source="en", target=reply_lang)

        return {
            "success": True,
            "type": "medicine_advice",
            "category": topic,
            "severity": "N/A",
            "first_aid": answer,
            "emergency": "No",
            "confidence": round(medicine_match["score"] * 100, 2),
            "note": note
        }

    def _build_info_response(self, kb_match, reply_lang):
        """
        Builds a response for a general disease/medicine question
        answered from the knowledge base.
        """

        topic = kb_match["topic"]
        answer = kb_match["answer"]

        note = ("This is general medical information, not personal medical "
                "advice. Please consult a doctor or pharmacist before making "
                "any treatment decisions.")

        if reply_lang != "en":
            topic = self.translate(topic, source="en", target=reply_lang)
            answer = self.translate(answer, source="en", target=reply_lang)
            note = self.translate(note, source="en", target=reply_lang)

        return {
            "success": True,
            "type": "info",
            "category": topic,
            "severity": "N/A",
            "first_aid": answer,
            "emergency": "No",
            "confidence": round(kb_match["score"] * 100, 2),
            "note": note
        }

    def _build_symptom_response(self, message_en, reply_lang):
        """
        Builds a response using the original symptom classifier -
        unchanged behavior from before, except that we now check
        whether the message actually contains any words the model
        recognizes before forcing a prediction.

        LinearSVC always predicts SOME category, even for messages
        like "suggest some medicine" or "hi" that have nothing to
        do with any known symptom - it just picks whatever category
        happens to be geometrically closest, which is meaningless
        noise. Checking vector.nnz (how many of the message's words
        actually matched the trained vocabulary) catches this: real
        symptom descriptions match 2+ known words, unrelated
        messages match 0.
        """

        vector = self.vectorizer.transform([message_en])

        if vector.nnz == 0:
            return self._build_unclear_response(reply_lang)

        category = self.model.predict(vector)[0]

        # Keep the original English category as the canonical "topic"
        # for conversation memory - the version shown to the user
        # below may get translated, but what we remember for
        # follow-ups must stay in English to match the CSVs.
        topic = category

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
            "type": "symptom",
            "category": category,
            "topic": topic,
            "severity": severity,
            "first_aid": first_aid,
            "emergency": emergency,
            "confidence": confidence,
            "note": note
        }

    def _build_unclear_response(self, reply_lang):
        """
        Builds a response for messages that don't match any known
        symptom AND don't read as a knowledge-base question - e.g.
        "suggest some medicine", "help me", "hi". Rather than
        guessing, we ask the user to be more specific.
        """

        message = ("I couldn't match that to a specific symptom or topic. "
                   "Could you describe what you're feeling in more detail "
                   "(e.g. \"I have a headache\" or \"my throat hurts\")? "
                   "If you're looking for medicine or disease information, "
                   "try naming it directly, like \"what is paracetamol used for\" "
                   "or \"what is diabetes\".")

        if reply_lang != "en":
            message = self.translate(message, source="en", target=reply_lang)

        return {
            "success": True,
            "type": "unclear",
            "category": "Not sure",
            "severity": "N/A",
            "first_aid": message,
            "emergency": "No",
            "confidence": 0,
            "note": ""
        }


predictor = MedicalPredictor()
