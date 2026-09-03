// ==========================================
// WolfChat 2.0 Engine - Real-Time Compat
// ==========================================

// 1. Firebase Configuration
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
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();

// Global App State
let currentUser = null;
let currentChannel = "General-Alpha";

// Hide Loading Screen once Firebase is ready
window.addEventListener("DOMContentLoaded", () => {
  const loadingScreen = document.getElementById("loading-screen");
  const progressBar = document.getElementById("progress-bar");

  if (progressBar) progressBar.style.width = "100%";

  setTimeout(() => {
    if (loadingScreen) loadingScreen.style.display = "none";
  }, 800);

  // Monitor Authentication State
  auth.onAuthStateChanged((user) => {
    const authScreen = document.getElementById("auth-screen");
    const chatContainer = document.getElementById("chat-container");

    if (user) {
      currentUser = user;
      if (authScreen) authScreen.style.display = "none";
      if (chatContainer) chatContainer.style.display = "flex";
      
      const userDisplay = document.getElementById("user-display");
      if (userDisplay) userDisplay.innerText = user.displayName || user.email.split("@")[0];

      // Start listening to live chat messages
      listenForMessages();
    } else {
      currentUser = null;
      if (authScreen) authScreen.style.display = "flex";
      if (chatContainer) chatContainer.style.display = "none";
    }
  });
});

// 2. REAL-TIME MESSAGE LISTENER (Fixes Syncing across devices)
function listenForMessages() {
  const messagesContainer = document.getElementById("messages");

  db.collection("channels")
    .doc(currentChannel)
    .collection("messages")
    .orderBy("timestamp", "asc")
    .onSnapshot((snapshot) => {
      if (!messagesContainer) return;
      messagesContainer.innerHTML = ""; // Clear existing messages to re-render

      snapshot.forEach((doc) => {
        const msg = doc.data();
        const msgElement = document.createElement("div");
        msgElement.classList.add("message-node");

        const isMe = currentUser && msg.senderId === currentUser.uid;
        if (isMe) msgElement.classList.add("my-message");

        msgElement.innerHTML = `
          <div class="message-meta">
            <span class="message-sender">${msg.sender || 'Anonymous'}</span>
          </div>
          <div class="message-body">${msg.text}</div>
        `;

        messagesContainer.appendChild(msgElement);
      });

      // Auto-scroll to latest message
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, (error) => {
      console.error("Real-time listener error:", error);
    });
}

// 3. SEND MESSAGE FUNCTION
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

    input.value = ""; // Clear input box
    handleInputUpdate();
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

// 4. UI TOGGLES & HELPERS
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
};f
