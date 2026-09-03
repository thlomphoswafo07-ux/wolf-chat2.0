// ==========================================
// WolfChat 2.0 Engine - DM & Live Sync Fixed
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
let currentChatId = "General-Alpha";
let isDM = false;
let messageUnsubscribe = null;
let isInitialLoad = true;

// 1. App Startup & Auth
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
      
      updateUserHeader();
      updateUserOnlineStatus();
      loadDMUsers();
      listenForMessages();

      // Enable Web Audio unlock on user interaction
      document.body.addEventListener('click', unlockAudio, { once: true });
    } else {
      currentUser = null;
      if (authScreen) authScreen.style.display = "flex";
      if (chatContainer) chatContainer.style.display = "none";
    }
  });
});

function unlockAudio() {
  const notifSound = document.getElementById("notif-sound");
  if (notifSound) {
    notifSound.play().then(() => {
      notifSound.pause();
      notifSound.currentTime = 0;
    }).catch(() => {});
  }
}

function updateUserHeader() {
  if (!currentUser) return;
  const userDisplay = document.getElementById("user-display");
  if (userDisplay) {
    userDisplay.innerText = currentUser.displayName || currentUser.email.split("@")[0];
  }
}

// 2. Track "Last Active" status for DMs
function updateUserOnlineStatus() {
  if (!currentUser) return;
  db.collection("users").doc(currentUser.uid).set({
    uid: currentUser.uid,
    username: currentUser.displayName || currentUser.email.split("@")[0],
    email: currentUser.email,
    lastActive: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

// 3. Render DM Users List
function loadDMUsers() {
  const dmContainer = document.getElementById("dm-users-list");
  if (!dmContainer) return;

  db.collection("users").onSnapshot((snapshot) => {
    dmContainer.innerHTML = "";
    snapshot.forEach((doc) => {
      const userData = doc.data();
      if (currentUser && userData.uid === currentUser.uid) return; // Skip showing yourself in DM list

      const userBtn = document.createElement("button");
      userBtn.classList.add("navigation-item");
      userBtn.style.display = "block";
      userBtn.style.width = "100%";
      userBtn.style.textAlign = "left";
      userBtn.style.margin = "5px 0";

      userBtn.innerText = `💬 ${userData.username || 'User'}`;
      userBtn.onclick = () => startDM(userData);

      dmContainer.appendChild(userBtn);
    });
  });
}

// 4. Calculate relative time ("45 minutes ago")
function formatLastActive(timestamp) {
  if (!timestamp) return "Offline";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.floor((now - date) / 60000);

  if (diffMinutes < 1) return "Active just now";
  if (diffMinutes < 60) return `Active ${diffMinutes} minutes ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Active ${diffHours} hours ago`;
  return `Active ${Math.floor(diffHours / 24)} days ago`;
}

// 5. Switch to a 1-on-1 Direct Message
function startDM(targetUser) {
  isDM = true;
  // Generate deterministic unique DM chat ID for two users
  const ids = [currentUser.uid, targetUser.uid].sort();
  currentChatId = `dm_${ids[0]}_${ids[1]}`;

  const titleNode = document.getElementById("active-chat-title");
  const statusNode = document.getElementById("target-last-active");

  if (titleNode) titleNode.innerText = `@ ${targetUser.username}`;
  if (statusNode) statusNode.innerText = formatLastActive(targetUser.lastActive);

  listenForMessages();
  toggleSidebarMenu();
}

// 6. Switch back to Global Room
window.switchChannel = function (channelName) {
  isDM = false;
  currentChatId = channelName;

  const titleNode = document.getElementById("active-chat-title");
  const statusNode = document.getElementById("target-last-active");

  if (titleNode) titleNode.innerText = `Room: ${channelName}`;
  if (statusNode) statusNode.innerText = "";

  listenForMessages();
  toggleSidebarMenu();
};

// 7. Real-Time Message Listener with Sound Alert
function listenForMessages() {
  if (messageUnsubscribe) messageUnsubscribe(); // Stop listening to previous chat room

  const messagesContainer = document.getElementById("messages");
  const notifSound = document.getElementById("notif-sound");
  isInitialLoad = true;

  const collectionRef = isDM 
    ? db.collection("direct_messages").doc(currentChatId).collection("messages")
    : db.collection("channels").doc(currentChatId).collection("messages");

  messageUnsubscribe = collectionRef.orderBy("timestamp", "asc").onSnapshot((snapshot) => {
    if (!messagesContainer) return;

    snapshot.docChanges().forEach((change) => {
      if (change.type === "added" && !isInitialLoad) {
        const msgData = change.doc.data();
        if (currentUser && msgData.senderId !== currentUser.uid) {
          if (notifSound) {
            notifSound.currentTime = 0;
            notifSound.play().catch(e => console.log("Audio play prevented:", e));
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

      msgElement.innerHTML = `
        <div class="message-meta">
          <span class="message-sender">${msg.sender || 'Anonymous'}</span>
        </div>
        <div class="message-body">${msg.text}</div>
      `;

      messagesContainer.appendChild(msgElement);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    isInitialLoad = false;
  });
}

// 8. Send Message
window.sendMessage = async function () {
  const input = document.getElementById("msg-input");
  if (!input) return;

  const text = input.value.trim();
  if (text === "" || !currentUser) return;

  try {
    const collectionRef = isDM 
      ? db.collection("direct_messages").doc(currentChatId).collection("messages")
      : db.collection("channels").doc(currentChatId).collection("messages");

    await collectionRef.add({
      text: text,
      sender: currentUser.displayName || currentUser.email.split("@")[0],
      senderId: currentUser.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    input.value = "";
    handleInputUpdate();
    updateUserOnlineStatus(); // Refresh active status when sending
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

// 9. Save System Settings (FIXED)
window.saveSystemSettings = async function () {
  const newUsername = document.getElementById("settings-username-input").value.trim();
  const newIcon = document.getElementById("settings-pfp-select")?.value;

  if (!currentUser) return;

  try {
    if (newUsername !== "") {
      await currentUser.updateProfile({ displayName: newUsername });
    }

    await db.collection("users").doc(currentUser.uid).set({
      username: newUsername || currentUser.displayName || currentUser.email.split("@")[0],
      pfpIcon: newIcon || "🐺"
    }, { merge: true });

    if (newIcon) {
      const headerPfp = document.getElementById("header-pfp");
      if (headerPfp) headerPfp.innerText = newIcon;
    }

    updateUserHeader();
    closeSettingsModal();
    alert("Profile updated successfully!");
  } catch (err) {
    alert("Error updating profile: " + err.message);
  }
};

// 10. Helper Functions
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
      updateUserOnlineStatus();
    } else {
      await auth.signInWithEmailAndPassword(email, password);
      updateUserOnlineStatus();
    }
  } catch (err) {
    alert("Auth error: " + err.message);
  }
};

window.handleGoogleSignIn = async function () {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    updateUserOnlineStatus();
  } catch (err) {
    alert("Google Sign-In Error: " + err.message);
  }
};

window.handleLogout = function () {
  auth.signOut();
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
