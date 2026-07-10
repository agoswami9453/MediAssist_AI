# 🏥 MediAssist AI – Intelligent First Aid & Symptom Checker

## 📌 Overview

MediAssist AI is an AI-powered web application that analyzes user symptoms and provides preliminary first-aid guidance. 
The application uses a Machine Learning model to predict possible health conditions, assess severity, detect emergencies,
and recommend appropriate first-aid measures. 
It is designed to assist users with initial health guidance and is **not a replacement for professional medical advice**.

Website Link: https://mediassist-ai-fbla.onrender.com
---

## 🚀 Features

* 🤖 AI-based symptom analysis
* 🩺 Disease prediction using Machine Learning
* ⚠️ Severity level detection (Mild, Moderate, Severe, Emergency)
* 💊 Personalized first-aid recommendations
* 🚑 Emergency symptom detection and alerts
* 📊 Confidence score for predictions
* 💬 Interactive chatbot interface
* 📝 Chat history stored using SQLite
* 📱 Responsive and user-friendly interface

---

## 🛠️ Tech Stack

### Frontend

* HTML5
* CSS3
* JavaScript
* Bootstrap 5

### Backend

* Python
* Flask
* Scikit-learn
* Pandas
* NumPy

### Database

* SQLite

### Tools

* Git
* GitHub
* VS Code / Cursor

---

## 📂 Project Structure

```text
MediAssist_AI/
│── app.py
│── train_model.py
│── predict.py
│── database.py
│── config.py
│── chatbot_model.pkl
│── vectorizer.pkl
│── medical_dataset.csv
│── requirements.txt
│── chat_history.db
│
├── templates/
│   └── index.html
│
├── static/
│   ├── css/
│   ├── js/
│   └── images/
│
└── README.md
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/MediAssist_AI.git
```

### 2. Open the project

```bash
cd MediAssist_AI
```

### 3. Create a virtual environment

```bash
python -m venv venv
```

### 4. Activate the virtual environment

**Windows**

```bash
venv\Scripts\activate
```

**Linux / macOS**

```bash
source venv/bin/activate
```

### 5. Install dependencies

```bash
pip install -r requirements.txt
```

### 6. Run the application

```bash
python app.py
```

### 7. Open your browser

```text
http://127.0.0.1:5000
```



## 📖 How It Works

1. User enters symptoms.
2. The Flask backend processes the input.
3. The trained Machine Learning model predicts the most likely condition.
4. The system evaluates symptom severity.
5. First-aid recommendations are generated.
6. Emergency cases trigger an alert.
7. Chat history is stored in SQLite.

---

## ⚠️ Disclaimer

This project is intended for educational and demonstration purposes only. It does not provide medical diagnosis and should not be used as a substitute for consultation with qualified healthcare professionals.

---

## 👨‍💻 Author

**Aditya Goswami**

* Final-Year B.Tech (Computer Science & Data Science)
* Interested in Artificial Intelligence, Machine Learning, and Full-Stack Development

---

## ⭐ Future Improvements

* Integration with medical APIs
* Voice-based interaction
* Multi-language support
* User authentication
* Doctor consultation integration
* Cloud deployment
* Advanced AI models for improved prediction accuracy

---

## 📜 License

This project is released under the MIT License.
