// ==========================================
// WolfChat 2.0 - Real-Time Message Engine
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatBox = document.getElementById("chatBox");

// 1. REAL-TIME MESSAGE LISTENER (Fixes Syncing)
function listenForMessages() {
  const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));

  // onSnapshot updates the screen instantly whenever a new message is added anywhere
  onSnapshot(q, (snapshot) => {
    if (!chatBox) return;
    chatBox.innerHTML = ""; // Clear old view

    snapshot.forEach((doc) => {
      const msg = doc.data();
      const msgDiv = document.createElement("div");
      msgDiv.classList.add("message");
      
      // Render text and sender
      msgDiv.innerHTML = `<strong>${msg.sender || 'User'}:</strong> ${msg.text}`;
      chatBox.appendChild(msgDiv);
    });

    // Auto-scroll to the bottom for new messages
    chatBox.scrollTop = chatBox.scrollHeight;
  }, (error) => {
    console.error("Error listening for real-time messages:", error);
  });
}

// 2. SEND MESSAGE FUNCTION
async function sendMessage() {
  if (!messageInput) return;
  const text = messageInput.value.trim();

  if (text !== "") {
    try {
      await addDoc(collection(db, "messages"), {
        text: text,
        sender: "Me", // Replace with logged in user name later
        timestamp: serverTimestamp()
      });
      messageInput.value = ""; // Clear input after sending
    } catch (e) {
      console.error("Error sending message: ", e);
    }
  }
}

// Event Listeners
if (sendBtn) {
  sendBtn.addEventListener("click", sendMessage);
}

if (messageInput) {
  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}

// Start listening as soon as page loads
listenForMessages();
