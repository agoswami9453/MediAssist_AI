// =====================================
// MediAssist AI
// JavaScript
// =====================================

console.log("MediAssist AI Loaded Successfully");

document.addEventListener("DOMContentLoaded", () => {

    console.log("Website Ready");

    const input = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");
    const languageSelect = document.getElementById("language-select");
    const LANGUAGE_STORAGE_KEY = "mediassist_reply_language";
    
    languageSelect.value = localStorage.getItem(LANGUAGE_STORAGE_KEY) || "auto";
    
    languageSelect.addEventListener("change", () => {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, languageSelect.value);
    });
    const chatBox = document.getElementById("chat-box");

    const emojiBtn = document.getElementById("emoji-btn");
    const emojiPicker = document.getElementById("emoji-picker");
    const emojiGrid = document.getElementById("emoji-grid");

    const attachBtn = document.getElementById("attach-btn");
    const fileInput = document.getElementById("file-input");
    const filePreview = document.getElementById("file-preview");
    const filePreviewThumb = document.getElementById("file-preview-thumb");
    const filePreviewIcon = document.getElementById("file-preview-icon");
    const filePreviewName = document.getElementById("file-preview-name");
    const removeFileBtn = document.getElementById("remove-file-btn");

    // Holds the currently attached file (name + optional data URL
    // for image previews) until the message is actually sent.
    let pendingAttachment = null;

    // Speech recognition instance (created further down, if supported).
    // Declared here so Settings can safely reference/update it.
    let recognition = null;

    const symptom = document.getElementById("symptom");
    const severity = document.getElementById("severity");
    const confidence = document.getElementById("confidence");
    const firstAid = document.getElementById("first-aid");
    const newChatBtn = document.getElementById("new-chat-btn");
    const darkModeBtn = document.getElementById("dark-mode-btn");
    const voiceBtn = document.getElementById("voice-btn");

    const historyContainer = document.getElementById("history-container");

    // Chat History modal (shows ALL saved conversations,
    // unlike the sidebar which only shows the latest few)
    const chatHistoryBtn = document.getElementById("chat-history-btn");
    const historyModalOverlay = document.getElementById("history-modal-overlay");
    const closeHistoryModalBtn = document.getElementById("close-history-modal");
    const fullHistoryList = document.getElementById("full-history-list");
    const historySearchInput = document.getElementById("history-search");

    // Sidebar "Recent Chats" only ever shows this many entries.
    // The full list (unlimited) lives in the Chat History modal.
    const MAX_RECENT_ITEMS = 8;

    // =====================================
    // Settings
    // =====================================

    const settingsBtn = document.getElementById("settings-btn");
    const settingsModalOverlay = document.getElementById("settings-modal-overlay");
    const closeSettingsModalBtn = document.getElementById("close-settings-modal");
    const saveSettingsBtn = document.getElementById("save-settings-btn");
    const clearAllHistoryBtn = document.getElementById("clear-all-history-btn");

    const settingFields = {
        micEnabled: document.getElementById("setting-mic-enabled"),
        voiceLanguage: document.getElementById("setting-voice-language"),
        autoSendVoice: document.getElementById("setting-auto-send-voice"),
        soundOnReply: document.getElementById("setting-sound-on-reply"),
        desktopNotifications: document.getElementById("setting-desktop-notifications"),
        emergencyNumber: document.getElementById("setting-emergency-number"),
        alwaysEmergencyBanner: document.getElementById("setting-always-emergency-banner"),
        retentionDays: document.getElementById("setting-retention-days"),
        dontSaveChats: document.getElementById("setting-dont-save-chats"),
        profileName: document.getElementById("setting-profile-name"),
        profileAge: document.getElementById("setting-profile-age"),
        profileAllergies: document.getElementById("setting-profile-allergies")
    };

    const persistentBanner = document.getElementById("persistent-emergency-banner");
    const persistentBannerText = document.getElementById("persistent-emergency-text");

    const SETTINGS_STORAGE_KEY = "mediassist_settings";

    const DEFAULT_SETTINGS = {
        micEnabled: true,
        voiceLanguage: "en-US",
        autoSendVoice: true,
        soundOnReply: false,
        desktopNotifications: false,
        emergencyNumber: "",
        alwaysEmergencyBanner: false,
        retentionDays: 0,
        dontSaveChats: false,
        profileName: "",
        profileAge: "",
        profileAllergies: ""
    };

    let settings = { ...DEFAULT_SETTINGS };

    function loadSettings() {

        try {

            const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);

            settings = saved
                ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
                : { ...DEFAULT_SETTINGS };

        }
        catch (error) {

            console.error("Settings load error:", error);
            settings = { ...DEFAULT_SETTINGS };

        }

        populateSettingsForm();
        applySettings();

    }

    function populateSettingsForm() {

        settingFields.micEnabled.checked = settings.micEnabled;
        settingFields.voiceLanguage.value = settings.voiceLanguage;
        settingFields.autoSendVoice.checked = settings.autoSendVoice;
        settingFields.soundOnReply.checked = settings.soundOnReply;
        settingFields.desktopNotifications.checked = settings.desktopNotifications;
        settingFields.emergencyNumber.value = settings.emergencyNumber;
        settingFields.alwaysEmergencyBanner.checked = settings.alwaysEmergencyBanner;
        settingFields.retentionDays.value = String(settings.retentionDays);
        settingFields.dontSaveChats.checked = settings.dontSaveChats;
        settingFields.profileName.value = settings.profileName;
        settingFields.profileAge.value = settings.profileAge;
        settingFields.profileAllergies.value = settings.profileAllergies;

    }

    function readSettingsForm() {

        return {
            micEnabled: settingFields.micEnabled.checked,
            voiceLanguage: settingFields.voiceLanguage.value,
            autoSendVoice: settingFields.autoSendVoice.checked,
            soundOnReply: settingFields.soundOnReply.checked,
            desktopNotifications: settingFields.desktopNotifications.checked,
            emergencyNumber: settingFields.emergencyNumber.value.trim(),
            alwaysEmergencyBanner: settingFields.alwaysEmergencyBanner.checked,
            retentionDays: parseInt(settingFields.retentionDays.value, 10) || 0,
            dontSaveChats: settingFields.dontSaveChats.checked,
            profileName: settingFields.profileName.value.trim(),
            profileAge: settingFields.profileAge.value.trim(),
            profileAllergies: settingFields.profileAllergies.value.trim()
        };

    }

    function saveSettings() {

        settings = readSettingsForm();

        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

        applySettings();

        if (settings.retentionDays > 0) {

            fetch("/history/cleanup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ days: settings.retentionDays })
            }).catch(err => console.error("Cleanup error:", err));

        }

        // Small visual confirmation
        saveSettingsBtn.textContent = "Saved ✓";
        saveSettingsBtn.classList.add("saved");

        setTimeout(() => {

            saveSettingsBtn.textContent = "Save Settings";
            saveSettingsBtn.classList.remove("saved");

        }, 1500);

    }

    // Apply the current settings to the live page
    // (mic on/off, banner visibility, notification
    // permission, etc.) without needing a reload.
    function applySettings() {

        // Voice & Input
        voiceBtn.disabled = !settings.micEnabled;
        voiceBtn.style.opacity = settings.micEnabled ? "1" : ".4";
        voiceBtn.style.cursor = settings.micEnabled ? "pointer" : "not-allowed";

        if (recognition) {

            recognition.lang = settings.voiceLanguage;

        }

        // Notifications
        if (settings.desktopNotifications &&
            "Notification" in window &&
            Notification.permission === "default") {

            Notification.requestPermission();

        }

        // Emergency banner
        if (settings.alwaysEmergencyBanner) {

            persistentBannerText.textContent = settings.emergencyNumber
                ? `In an emergency, call your local emergency number or your saved contact: ${settings.emergencyNumber}`
                : "In an emergency, call your local emergency number immediately.";

            persistentBanner.style.display = "flex";

        } else {

            persistentBanner.style.display = "none";

        }

        // Personalize the greeting if a welcome message is
        // currently showing (first load, or after New Chat)
        const welcome = document.getElementById("welcome-message");

        if (welcome) {

            welcome.innerHTML = welcome.innerHTML.replace(
                /Hello[^<]*👋/,
                settings.profileName ? `Hello, ${settings.profileName} 👋` : "Hello 👋"
            );

        }

    }

    function openSettingsModal() {

        populateSettingsForm();
        settingsModalOverlay.classList.add("open");

    }

    function closeSettingsModal() {

        settingsModalOverlay.classList.remove("open");

    }

    function playReplySound() {

        if (!settings.soundOnReply) return;

        try {

            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(880, ctx.currentTime);

            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

            oscillator.connect(gain);
            gain.connect(ctx.destination);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.4);

        }
        catch (error) {

            console.error("Sound error:", error);

        }

    }

    function showReplyNotification(bodyText) {

        if (!settings.desktopNotifications) return;

        if (!("Notification" in window) || Notification.permission !== "granted") return;

        try {

            new Notification("MediAssist AI", {
                body: bodyText,
                icon: undefined
            });

        }
        catch (error) {

            console.error("Notification error:", error);

        }

    }

    // Returns the emergency alert HTML, using the user's
    // saved emergency contact number if they've set one.
    function buildEmergencyAlertHTML() {

        const callLine = settings.emergencyNumber
            ? `Call emergency services immediately (${settings.emergencyNumber}) or your local emergency number.`
            : "Call emergency services immediately.";

        return `
        <div style="
        background:#ffebee;
        border-left:6px solid red;
        padding:15px;
        border-radius:10px;
        margin-bottom:15px;
        ">

        <h4 style="color:red;margin:0;">
        🚨 EMERGENCY ALERT
        </h4>

        <p style="margin-top:10px;">
        Your symptoms may indicate a medical emergency.
        </p>

        <ul>
        <li>☎ ${callLine}</li>
        <li>👨‍⚕ Seek immediate medical attention.</li>
        <li>🚑 Do not delay treatment.</li>
        </ul>

        </div>
        `;

    }

    // Extra line appended to the bot's "Note" section if the
    // user has listed any allergies/conditions in their profile.
    function buildAllergyNoteHTML() {

        if (!settings.profileAllergies) return "";

        return `<br><br>⚠ <strong>Your noted allergy/condition:</strong><br>${settings.profileAllergies} — please mention this to any healthcare provider.`;

    }

    const emergencyKeywords = [
        "heart attack",
        "chest pain",
        "can't breathe",
        "cannot breathe",
        "stroke",
        "unconscious",
        "not breathing",
        "severe bleeding",
        "collapsed"
    ];

    loadHistory();
    loadSettings();

    // =====================================
    // Load saved history from the server
    // =====================================
    async function loadHistory() {

        try {

            const response = await fetch("/history");

            const chats = await response.json();

            // Clear old history
            historyContainer.innerHTML = "";

            // The backend already returns newest chat first
            // (ORDER BY id DESC), so just render them in that
            // order - do NOT reverse, or new messages added
            // later (via prepend) end up out of sequence.
            //
            // Sidebar only shows the most recent few — the
            // Chat History modal is where the full list lives.
            chats.slice(0, MAX_RECENT_ITEMS).forEach(chat => {

                const item = createHistoryItem(chat);

                historyContainer.appendChild(item);

            });

        }
        catch (error) {

            console.error("History Error:", error);

        }

    }

    // =====================================
    // Chat History modal — shows every
    // saved conversation, unlimited, with
    // a simple search filter.
    // =====================================
    async function openHistoryModal() {

        historyModalOverlay.classList.add("open");
        fullHistoryList.innerHTML = "<p class=\"modal-loading\">Loading...</p>";

        try {

            const response = await fetch("/history");
            const chats = await response.json();

            renderFullHistoryList(chats);

            historySearchInput.value = "";
            historySearchInput.oninput = () => {

                const query = historySearchInput.value.trim().toLowerCase();

                const filtered = query === ""
                    ? chats
                    : chats.filter(chat =>
                        (chat.user_message || "").toLowerCase().includes(query)
                    );

                renderFullHistoryList(filtered);

            };

        }
        catch (error) {

            console.error("History Error:", error);
            fullHistoryList.innerHTML = "<p class=\"modal-loading\">Couldn't load history.</p>";

        }

    }

    function renderFullHistoryList(chats) {

        fullHistoryList.innerHTML = "";

        if (chats.length === 0) {

            fullHistoryList.innerHTML = "<p class=\"modal-loading\">No conversations yet.</p>";
            return;

        }

        chats.forEach(chat => {

            const item = createHistoryItem(chat);

            // Loading a chat from the modal should also
            // close the modal so the user sees the result.
            item.addEventListener("click", () => {
                closeHistoryModal();
            });

            fullHistoryList.appendChild(item);

        });

    }

    function closeHistoryModal() {

        historyModalOverlay.classList.remove("open");

    }

    // =====================================
    // Build one clickable history entry
    // =====================================
    function createHistoryItem(chat) {

        const item = document.createElement("div");

        item.className = "history-item";
        item.textContent = "🩺 " + chat.user_message;

        // Store the data needed to replay this conversation
        item.dataset.userMessage = chat.user_message || "";
        item.dataset.botResponse = chat.bot_response || "";
        item.dataset.severity = chat.severity || "--";
        item.dataset.confidence = chat.confidence || "--";
        item.dataset.category = chat.category || "--";
        item.dataset.emergency = chat.emergency || "--";

        item.addEventListener("click", () => {
            loadConversation(item);
        });

        return item;

    }

    // =====================================
    // Add a brand-new entry to the top of
    // the sidebar history (called once the
    // bot's response has actually arrived,
    // so we have the full data to store)
    // =====================================
    function addHistory(chat) {

        const item = createHistoryItem(chat);

        historyContainer.prepend(item);

        // Keep the sidebar capped at MAX_RECENT_ITEMS —
        // older ones are still in the database and remain
        // visible in the full Chat History modal.
        while (historyContainer.children.length > MAX_RECENT_ITEMS) {

            historyContainer.removeChild(historyContainer.lastChild);

        }

    }

    // =====================================
    // Highlight + replay a past conversation
    // =====================================
    function loadConversation(item) {

        // Highlight the selected item
        document.querySelectorAll(".history-item.active")
            .forEach(el => el.classList.remove("active"));
        item.classList.add("active");

        const {
            userMessage,
            botResponse,
            severity: sev,
            confidence: conf,
            category,
            emergency
        } = item.dataset;

        chatBox.innerHTML = "";

        addMessage(`<strong>You:</strong><br>${userMessage}`, "user-message");

        const isEmergency = emergencyKeywords.some(keyword =>
            userMessage.toLowerCase().includes(keyword)
        );

        addMessage(
            `
            <strong>🤖 MediAssist AI</strong><br><br>

            ${isEmergency ? buildEmergencyAlertHTML() : ""}

            🩺 <strong>Detected Condition:</strong><br>
            ${category}<br><br>

            ⚠ <strong>Severity:</strong><br>
            ${sev}<br><br>

            💊 <strong>First Aid:</strong><br>
            ${botResponse}<br><br>

            🚨 <strong>Emergency:</strong><br>
            ${emergency}<br><br>

            📌 <strong>Note:</strong><br>
            This advice is for first aid only.
            If symptoms become severe or persist,
            please consult a qualified healthcare professional.
            ${buildAllergyNoteHTML()}
            `,
            "bot-message"
        );

        symptom.textContent = category;
        severity.textContent = sev;
        confidence.textContent = conf + (conf === "--" ? "" : "%");
        firstAid.textContent = botResponse;

    }

    function addMessage(message, className) {

        const div = document.createElement("div");

        div.className = className;

        const now = new Date();

        const time = now.toLocaleTimeString([], {

            hour: "2-digit",

            minute: "2-digit"

        });

        div.innerHTML = `
            ${message}
            <div class="message-time">🕒 ${time}</div>
        `;

        const welcome = document.getElementById("welcome-message");

        if (welcome) {

            welcome.remove();

        }

        chatBox.appendChild(div);

        chatBox.scrollTop = chatBox.scrollHeight;

    }

    // =====================================
    // Emoji Picker
    // =====================================

    const EMOJIS = [
        "🙂","😀","😄","😊","😢","😭","😷","🤒","🤕","🤢",
        "🤧","🥴","😵","😱","🥵","🥶","🩺","💊","🩹","🚑",
        "❤️","💔","🔥","🧊","💧","😴","👍","🙏","❓","⚠️"
    ];

    function buildEmojiPicker() {

        EMOJIS.forEach(emoji => {

            const btn = document.createElement("button");

            btn.type = "button";
            btn.className = "emoji-option";
            btn.textContent = emoji;

            btn.addEventListener("click", () => {

                insertAtCursor(input, emoji);
                input.focus();

            });

            emojiGrid.appendChild(btn);

        });

    }

    function insertAtCursor(field, text) {

        const start = field.selectionStart ?? field.value.length;
        const end = field.selectionEnd ?? field.value.length;

        field.value = field.value.slice(0, start) + text + field.value.slice(end);

        const cursorPos = start + text.length;
        field.setSelectionRange(cursorPos, cursorPos);

    }

    function toggleEmojiPicker() {

        emojiPicker.classList.toggle("open");

    }

    function closeEmojiPicker() {

        emojiPicker.classList.remove("open");

    }

    // =====================================
    // File Attachment
    // =====================================

    function handleFileSelected(event) {

        const file = event.target.files[0];

        if (!file) return;

        const isImage = file.type.startsWith("image/");

        pendingAttachment = {
            name: file.name,
            type: file.type,
            isImage: isImage,
            dataUrl: null
        };

        filePreviewName.textContent = file.name;
        filePreview.style.display = "flex";

        if (isImage) {

            const reader = new FileReader();

            reader.onload = (e) => {

                pendingAttachment.dataUrl = e.target.result;

                filePreviewThumb.src = e.target.result;
                filePreviewThumb.style.display = "block";
                filePreviewIcon.style.display = "none";

            };

            reader.readAsDataURL(file);

        } else {

            filePreviewThumb.style.display = "none";
            filePreviewIcon.style.display = "inline-block";

        }

    }

    function clearAttachment() {

        pendingAttachment = null;
        fileInput.value = "";
        filePreview.style.display = "none";
        filePreviewThumb.src = "";

    }

    // Builds the HTML shown in the chat bubble for an attachment
    function renderAttachmentHTML(attachment) {

        if (attachment.isImage && attachment.dataUrl) {

            return `<div class="chat-attachment">
                        <img src="${attachment.dataUrl}" alt="${attachment.name}">
                    </div>`;

        }

        return `<div class="chat-attachment chat-attachment-file">
                    <i class="fa-solid fa-file"></i>
                    <span>${attachment.name}</span>
                </div>`;

    }

    async function sendMessage() {

        const message = input.value.trim();
        const attachment = pendingAttachment;

        if (message === "" && !attachment) return;

        const attachmentHTML = attachment ? renderAttachmentHTML(attachment) : "";

        addMessage(
            `<strong>You:</strong>${message ? "<br>" + message : ""}${attachmentHTML}`,
            "user-message"
        );

        input.value = "";
        clearAttachment();

        // A file sent with no symptom text has nothing for the
        // AI to analyze - just show it in the chat and stop here.
        if (message === "") return;

        try {

            const response = await fetch("/predict", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    message: message,
                    save: !settings.dontSaveChats,
                    language: languageSelect.value
                })

            });

            const data = await response.json();

            // ===============================
            // Emergency Detection
            // ===============================

            const isEmergency = emergencyKeywords.some(keyword =>
                message.toLowerCase().includes(keyword)
            );
            const typing = document.createElement("div");

            typing.className = "bot-message";

            typing.id = "typing";

            typing.innerHTML = "🤖 <strong>MediAssist AI</strong><br><br>Typing...";

            chatBox.appendChild(typing);

            chatBox.scrollTop = chatBox.scrollHeight;

            await new Promise(resolve => setTimeout(resolve,1000));

            typing.remove();

            addMessage(
                `
                <strong>🤖 MediAssist AI</strong><br><br>

                ${isEmergency ? buildEmergencyAlertHTML() : ""}

                🩺 <strong>Detected Condition:</strong><br>
                ${data.category}<br><br>

                ⚠ <strong>Severity:</strong><br>
                ${data.severity}<br><br>

                💊 <strong>First Aid:</strong><br>
                ${data.first_aid}<br><br>

                🚨 <strong>Emergency:</strong><br>
                ${data.emergency}<br><br>

                📌 <strong>Note:</strong><br>
                ${data.note}
                ${buildAllergyNoteHTML()}
                `,
                "bot-message"
            );

            symptom.textContent = data.category;
            severity.textContent = data.severity;
            confidence.textContent = data.confidence + "%";
            firstAid.textContent = data.first_aid;

            playReplySound();
            showReplyNotification(`${data.category} — ${data.severity}`);

            // Skip adding to sidebar history if the user has
            // "Don't save chats" (private mode) turned on.
            if (!settings.dontSaveChats) {

                // Now that we have the full response, add it to the
                // sidebar history so it can be replayed correctly later.
                addHistory({
                    user_message: message,
                    bot_response: data.first_aid,
                    severity: data.severity,
                    confidence: data.confidence,
                    category: data.category,
                    emergency: data.emergency
                });

            }

        }
        catch (error) {

            console.error(error);

            addMessage(
                "Unable to connect to AI.",
                "bot-message"
            );

        }

    }

    function startNewChat() {

        // Clear all chat messages
        chatBox.innerHTML = "";

        // Show welcome message again
        chatBox.innerHTML = `
            <div class="bot-message" id="welcome-message">

                🤖 <strong>MediAssist AI</strong>

                <br><br>

                Hello 👋

                <br><br>

                I'm your AI First Aid Assistant.

                <br><br>

                I can help you with:

                <br><br>

                🩺 Fever<br>
                🤕 Headache<br>
                🤢 Vomiting<br>
                🩹 Cuts<br>
                🔥 Burns<br>
                🤧 Cold<br>
                💓 Chest Pain

                <br><br>

                ⚠ This assistant provides first-aid guidance only.

                <br><br>

                Type your symptoms below to begin.

            </div>
        `;

        // Clear input box
        input.value = "";

        // Reset Medical Analysis
        symptom.textContent = "--";
        severity.textContent = "--";
        confidence.textContent = "--";
        firstAid.textContent = "Waiting...";

        // Deselect any highlighted history item
        document.querySelectorAll(".history-item.active")
            .forEach(el => el.classList.remove("active"));

        // Re-personalize the fresh welcome message
        applySettings();

    }


    function toggleDarkMode() {

        document.body.classList.toggle("dark-mode");

    }

    newChatBtn.addEventListener("click", startNewChat);

    darkModeBtn.addEventListener("click", toggleDarkMode);

    chatHistoryBtn.addEventListener("click", openHistoryModal);

    closeHistoryModalBtn.addEventListener("click", closeHistoryModal);

    settingsBtn.addEventListener("click", openSettingsModal);

    closeSettingsModalBtn.addEventListener("click", closeSettingsModal);

    saveSettingsBtn.addEventListener("click", saveSettings);

    clearAllHistoryBtn.addEventListener("click", async () => {

        const confirmed = confirm(
            "This will permanently delete every saved conversation. Continue?"
        );

        if (!confirmed) return;

        try {

            await fetch("/history/clear", { method: "POST" });

            historyContainer.innerHTML = "";
            renderFullHistoryList([]);

        }
        catch (error) {

            console.error("Clear history error:", error);

        }

    });

    settingsModalOverlay.addEventListener("click", (event) => {

        if (event.target === settingsModalOverlay) {
            closeSettingsModal();
        }

    });

    // Clicking the dark overlay outside the modal box closes it
    historyModalOverlay.addEventListener("click", (event) => {

        if (event.target === historyModalOverlay) {
            closeHistoryModal();
        }

    });

    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {
            closeHistoryModal();
            closeEmojiPicker();
            closeSettingsModal();
        }

    });

    buildEmojiPicker();

    emojiBtn.addEventListener("click", (event) => {

        event.stopPropagation();
        toggleEmojiPicker();

    });

    // Close the emoji picker when clicking anywhere outside it
    document.addEventListener("click", (event) => {

        if (
            emojiPicker.classList.contains("open") &&
            !emojiPicker.contains(event.target) &&
            event.target !== emojiBtn
        ) {
            closeEmojiPicker();
        }

    });

    attachBtn.addEventListener("click", () => {

        fileInput.click();

    });

    fileInput.addEventListener("change", handleFileSelected);

    removeFileBtn.addEventListener("click", clearAttachment);

    sendBtn.addEventListener("click", sendMessage);

    input.addEventListener("keypress", function(event){

        if(event.key==="Enter"){

            sendMessage();

        }

    });


    // ===============================
    // Voice Input
    // ===============================

    const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {

        recognition = new SpeechRecognition();

        recognition.lang = settings.voiceLanguage;

        recognition.interimResults = false;

        recognition.maxAlternatives = 1;

        voiceBtn.addEventListener("click", () => {

            if (!settings.micEnabled) return;

            voiceBtn.style.background = "#dc3545";   // Red
            input.placeholder = "🎤 Listening...";

            recognition.start();

        });

        recognition.onresult = function(event) {

            const text = event.results[0][0].transcript;

            if (input.value.trim() === "") {

                input.value = text;

            } else {

                input.value += " " + text;

            }

            // Restore microphone button
            voiceBtn.style.background = "#0d6efd";

            // Restore placeholder
            input.placeholder = "Describe your symptoms...";

            if (settings.autoSendVoice) {

                setTimeout(() => {

                    sendMessage();

                }, 300);

            }

        };

        recognition.onerror = function(event) {

            voiceBtn.style.background = "#0d6efd";

            input.placeholder = "Describe your symptoms...";

            alert("Voice recognition error: " + event.error);

        };

    } else {

        voiceBtn.disabled = true;

        console.log("Speech Recognition not supported.");

    }

});
