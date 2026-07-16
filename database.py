"""
=========================================
MediAssist AI
Database Module
=========================================
"""

import sqlite3
import os

from config import Config


class Database:
    """
    Handles all database operations.
    """

    def __init__(self):
        """
        Create database connection.
        """

        # Create database folder if it doesn't exist
        os.makedirs("database", exist_ok=True)

        # Connect to SQLite database
        self.connection = sqlite3.connect(
            Config.DATABASE_NAME,
            check_same_thread=False
        )

        # Cursor is used to execute SQL commands
        self.cursor = self.connection.cursor()

        # Create tables automatically
        self.create_tables()

        # Add any columns missing from an older version of the DB
        self.migrate()

    def create_tables(self):
        """
        Create all required tables.
        """

        # ===========================
        # Chat History Table
        # ===========================

        self.cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat_history(

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_message TEXT NOT NULL,

            bot_response TEXT NOT NULL,

            severity TEXT,

            confidence REAL,

            category TEXT,

            emergency TEXT,

            note TEXT,

            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

        )
        """)

        # Save changes
        self.connection.commit()

    def migrate(self):
        """
        Add 'category' / 'emergency' columns if this database was
        created before those columns existed, so existing installs
        don't need to delete their database.db file.
        """

        self.cursor.execute("PRAGMA table_info(chat_history)")
        existing_columns = [row[1] for row in self.cursor.fetchall()]

        if "category" not in existing_columns:
            self.cursor.execute(
                "ALTER TABLE chat_history ADD COLUMN category TEXT"
            )

        if "emergency" not in existing_columns:
            self.cursor.execute(
                "ALTER TABLE chat_history ADD COLUMN emergency TEXT"
            )

        if "emergency" not in existing_columns:
            self.cursor.execute(
                "ALTER TABLE chat_history ADD COLUMN emergency TEXT"
            )

        if "type" not in existing_columns:
            self.cursor.execute(
                "ALTER TABLE chat_history ADD COLUMN type TEXT"
            )

        self.connection.commit()

    def save_chat(self, user_message, bot_response, severity,
                  confidence, category=None, emergency=None, type=None):
        """
        Save a conversation to the database.

        'type' is 'symptom' for the first-aid checker, 'info' for
        disease/medicine facts, or 'medicine_advice' for medicine
        recommendations.
        """

        self.cursor.execute("""
        INSERT INTO chat_history
        (user_message, bot_response, severity, confidence, category, emergency, type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            user_message,
            bot_response,
            severity,
            confidence,
            category,
            emergency,
            type
        ))

        self.connection.commit()

    def get_all_chats(self):
        self.cursor.execute("""
        SELECT id, user_message, bot_response, severity,
               confidence, category, emergency, type
        FROM chat_history
        ORDER BY id DESC
        """)
        return self.cursor.fetchall()

    def delete_all_chats(self):
        """
        Wipe every saved conversation. Used by the
        Settings > Privacy "Clear All History Now" action.
        """

        self.cursor.execute("DELETE FROM chat_history")
        self.connection.commit()

    def delete_old_chats(self, days):
        """
        Delete conversations older than `days` days.
        Used by the Settings > Privacy auto-delete option.
        """

        self.cursor.execute("""
        DELETE FROM chat_history
        WHERE created_at < datetime('now', ? || ' days')
        """, (f"-{int(days)}",))

        self.connection.commit()

# Create one global database object
db = Database()
