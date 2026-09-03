// ==========================================
// WolfChat 2.0 Engine - Real-Time Compat
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyBzIGdwodKyZ09EWxaJeWir0tJ2ECJ1RtM",
  authDomain: "wolf-chat-b0153.firebaseapp.com",
  databaseURL: "https://wolf-chat-b0153-default-rtdb.firebaseio.com",
  projectId: "wolf-chat-b0153",
  storageBucket: "wolf-chat-b0153.firebasestorage.app",
  messagingSenderId: "810966020901",
  appId: "1:810966020901:web:4e5cfefca32b00cc45a0cc"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let currentChannel = "General-Alpha";
let isInitialLoad = true; // Tracks initial fetch to prevent sound on existing messages

window.addEventListener("DOMContentLoaded", () => {
  const loadingScreen = document.getElementById("loading-screen");
  const progressBar = document.getElementById("progress-bar");

  if (progressBar) progressBar.style.width = "100%";

  setTimeout(() => {
    if (loadingScreen) loadingScreen.style.display = "none";
  }, 800);

  auth.onAuthStateChanged((user) => {
    const authScreen = document.getElementById("auth-screen");
    const chatContainer = document.getElementById("chat-container");

    if (user) {
      currentUser = user;
      if (authScreen) authScreen.style.display = "none";
      if (chatContainer) chatContainer.style.display = "flex";
      
      const userDisplay = document.getElementById("user-display");
      if (userDisplay) userDisplay.innerText = user.displayName || user.email.split("@")[0];

      listenForMessages();
    } else {
      currentUser = null;
      if (authScreen) authScreen.style.display = "flex";
      if (chatContainer) chatContainer.style.display = "none";
    }
  });
});

// Helper function to format timestamp into WhatsApp-style time (e.g. 14:30)
function formatTime(timestamp) {
  if (!timestamp) return "Just now";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// REAL-TIME LISTENER WITH TIMESTAMPS AND SOUND
function listenForMessages() {
  const messagesContainer = document.getElementById("messages");
  const notifSound = document.getElementById("notif-sound");

  isInitialLoad = true;

  db.collection("channels")
    .doc(currentChannel)
    .collection("messages")
    .orderBy("timestamp", "asc")
    .onSnapshot((snapshot) => {
      if (!messagesContainer) return;

      // Detect new incoming message for audio alert
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoad) {
          const msgData = change.doc.data();
          // Only play notification sound if the message was sent by someone else
          if (currentUser && msgData.senderId !== currentUser.uid) {
            if (notifSound) {
              notifSound.currentTime = 0;
              notifSound.play().catch(e => console.log("Audio play blocked by browser:", e));
            }
          }
        }
      });

      messagesContainer.innerHTML = "";

      snapshot.forEach((doc) => {
        const msg = doc.data();
        const msgElement = document.createElement("div");
        msgElement.classList.add("message-node");

        const isMe = currentUser && msg.senderId === currentUser.uid;
        if (isMe) msgElement.classList.add("my-message");

        const timeString = formatTime(msg.timestamp);

        msgElement.innerHTML = `
          <div class="message-meta">
            <span class="message-sender">${msg.sender || 'Anonymous'}</span>
          </div>
          <div class="message-body">${msg.text}</div>
          <div class="message-time" style="font-size: 10px; opacity: 0.7; text-align: right; margin-top: 3px;">${timeString}</div>
        `;

        messagesContainer.appendChild(msgElement);
      });

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      isInitialLoad = false;
    }, (error) => {
      console.error("Real-time listener error:", error);
    });
}

// SEND MESSAGE FUNCTION
window.sendMessage = async function () {
  const input = document.getElementById("msg-input");
  if (!input) return;

  const text = input.value.trim();
  if (text === "" || !currentUser) return;

  try {
    await db.collection("channels")
      .doc(currentChannel)
      .collection("messages")
      .add({
        text: text,
        sender: currentUser.displayName || currentUser.email.split("@")[0],
        senderId: currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

    input.value = "";
    handleInputUpdate();
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

window.toggleAuthMode = function () {
  const extraFields = document.getElementById("signup-extra-fields");
  const mainBtn = document.getElementById("auth-main-btn");
  const toggleLink = document.getElementById("auth-toggle-mode");

  if (extraFields.style.display === "none") {
    extraFields.style.display = "block";
    mainBtn.innerText = "Sign Up";
    toggleLink.innerText = "Already have an account? Sign in here";
  } else {
    extraFields.style.display = "none";
    mainBtn.innerText = "Sign In";
    toggleLink.innerText = "Don't have an account? Sign up here";
  }
};

window.handleAuthSubmit = async function () {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value.trim();
  const username = document.getElementById("username")?.value.trim();
  const isSignUp = document.getElementById("signup-extra-fields").style.display !== "none";

  try {
    if (isSignUp) {
      const userCred = await auth.createUserWithEmailAndPassword(email, password);
      if (username) {
        await userCred.user.updateProfile({ displayName: username });
      }
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (err) {
    alert("Auth error: " + err.message);
  }
};

window.handleGoogleSignIn = async function () {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (err) {
    alert("Google Sign-In Error: " + err.message);
  }
};

window.handleLogout = function () {
  auth.signOut();
};

window.switchChannel = function (channelName) {
  currentChannel = channelName;
  const roomDisplay = document.getElementById("current-room-display");
  if (roomDisplay) roomDisplay.innerText = `Room: ${channelName}`;
  listenForMessages();
};

window.toggleSidebarMenu = function () {
  const sidebar = document.getElementById("chat-sidebar");
  if (sidebar) sidebar.classList.toggle("sidebar-hidden");
};

window.openSettingsModal = function () {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.style.display = "flex";
};

window.closeSettingsModal = function () {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.style.display = "none";
};

window.handleInputUpdate = function () {
  const input = document.getElementById("msg-input");
  const counter = document.getElementById("char-counter-node");
  if (input && counter) {
    counter.innerText = `${input.value.length} / 250`;
  }
};
