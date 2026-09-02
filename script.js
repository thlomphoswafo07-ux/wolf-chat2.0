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

// Your Actual Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBzIGdwodKyZ09EWxaJeWir0tJ2ECJ1RtM",
  authDomain: "wolf-chat-b0153.firebaseapp.com",
  databaseURL: "https://wolf-chat-b0153-default-rtdb.firebaseio.com",
  projectId: "wolf-chat-b0153",
  storageBucket: "wolf-chat-b0153.firebasestorage.app",
  messagingSenderId: "810966020901",
  appId: "1:810966020901:web:4e5cfefca32b00cc45a0cc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatBox = document.getElementById("chatBox");

// 1. REAL-TIME MESSAGE LISTENER
function listenForMessages() {
  const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));

  onSnapshot(q, (snapshot) => {
    if (!chatBox) return;
    chatBox.innerHTML = ""; // Clear old view

    snapshot.forEach((doc) => {
      const msg = doc.data();
      const msgDiv = document.createElement("div");
      msgDiv.classList.add("message");
      
      msgDiv.innerHTML = `<strong>${msg.sender || 'User'}:</strong> ${msg.text}`;
      chatBox.appendChild(msgDiv);
    });

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
        sender: "Me",
        timestamp: serverTimestamp()
      });
      messageInput.value = "";
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

// Start listening when page loads
listenForMessages();
