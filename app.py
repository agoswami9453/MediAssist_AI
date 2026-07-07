from flask import Flask, render_template, request, jsonify

from database import db

from predict import predictor

# ==================================================
# Create Flask Application
# ==================================================

app = Flask(__name__)

# Secret key for future sessions and security
app.config["SECRET_KEY"] = "mediassist_ai_secret_key"

# ==================================================
# Home Page
# ==================================================

@app.route("/")
def home():
    """
    Load the main MediAssist AI page.
    """
    return render_template("index.html")

# ==========================================
# AI Prediction API
# ==========================================

@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    user_message = data.get("message", "").strip()
    save_to_history = data.get("save", True)
    target_lang = data.get("language", "auto")

    if not user_message:
        return jsonify({
            "success": False,
            "message": "Please enter your symptoms."
        })

    result = predictor.predict(user_message, target_lang=target_lang)

    if save_to_history:
        db.save_chat(
            user_message=user_message,
            bot_response=result["first_aid"],
            severity=result["severity"],
            confidence=result["confidence"],
            category=result.get("category"),
            emergency=result.get("emergency")
        )

    return jsonify(result)



@app.route("/history")
def history():

    chats = db.get_all_chats()

    history_data = []

    for chat in chats:

        history_data.append({

            "id": chat[0],

            "user_message": chat[1],

            "bot_response": chat[2],

            "severity": chat[3],

            "confidence": chat[4],

            "category": chat[5],

            "emergency": chat[6]

        })

    return jsonify(history_data)


@app.route("/history/clear", methods=["POST"])
def clear_history():
    """
    Settings > Privacy > "Clear All History Now"
    """

    db.delete_all_chats()

    return jsonify({"success": True})


@app.route("/history/cleanup", methods=["POST"])
def cleanup_history():
    """
    Settings > Privacy > auto-delete history older than N days.
    Called once on page load if the user has this enabled.
    """

    data = request.get_json()

    days = data.get("days", 0)

    if days and int(days) > 0:

        db.delete_old_chats(days)

    return jsonify({"success": True})

# ==================================================
# Run Application
# ==================================================

if __name__ == "__main__":
    app.run(debug=True)