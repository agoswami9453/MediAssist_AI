"""
=========================================
MediAssist AI Configuration
=========================================
"""


class Config:
    """
    Global configuration for the application.
    """

    SECRET_KEY = "mediassist_ai_secret_key"

    DATABASE_NAME = "database/chat_history.db"

    MODEL_PATH = "models/chatbot_model.pkl"

    VECTORIZER_PATH = "models/vectorizer.pkl"