// ==========================================
// WolfChat 2.0 Engine - Complete Build
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
let userProfileData = {};
let currentChatId = "General-Alpha";
let isDM = false;
let messageUnsubscribe = null;
let isInitialLoad = true;
let selectedImageData = null;

// Voice Recorder
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// 1. Loading Timer & Lifecycle
window.addEventListener("DOMContentLoaded", () => {
  const loadingScreen = document.getElementById("loading-screen");
  const progressBar = document.getElementById("progress-bar");

  if (progressBar) progressBar.style.width = "100%";

  // Fixed 4-second delay
  setTimeout(() => {
    if (loadingScreen) loadingScreen.style.display = "none";
  }, 4000);

  auth.onAuthStateChanged(async (user) => {
    const authScreen = document.getElementById("auth-screen");
    const chatContainer = document.getElementById("chat-container");

    if (user) {
      currentUser = user;
      await fetchUserProfile();
      
      if (authScreen) authScreen.style.display = "none";
      if (chatContainer) chatContainer.style.display = "flex";
      
      updateUserHeader();
      updateUserOnlineStatus();
      loadHomeData();
      loadDMUsers();
      listenForMessages();

      document.body.addEventListener('click', unlockAudio, { once: true });
    } else {
      currentUser = null;
      if (authScreen) authScreen.style.display = "flex";
      if (chatContainer) chatContainer.style.display = "none";
    }
  });
});

async function fetchUserProfile() {
  if (!currentUser) return;
  const doc = await db.collection("users").doc(currentUser.uid).get();
  if (doc.exists) {
    userProfileData = doc.data();
  }
}

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
  const headerPfp = document.getElementById("header-pfp");

  const name = userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0];
  const color = userProfileData.color || "#39ff14";
  const icon = userProfileData.pfpIcon || "🐺";

  if (userDisplay) {
    userDisplay.innerText = name;
    userDisplay.style.color = color;
  }
  if (headerPfp) headerPfp.innerText = icon;
}

function updateUserOnlineStatus() {
  if (!currentUser) return;
  db.collection("users").doc(currentUser.uid).set({
    uid: currentUser.uid,
    username: userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0],
    email: currentUser.email,
    color: userProfileData.color || "#39ff14",
    pfpIcon: userProfileData.pfpIcon || "🐺",
    lastActive: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

// 2. Home Hub & Follower Engine
function showHomeTab() {
  document.getElementById("chat-view").style.display = "none";
  document.getElementById("home-view").style.display = "block";
  document.getElementById("active-chat-title").innerText = "🏠 Home Hub";
  document.getElementById("target-last-active").innerText = "";
  toggleSidebarMenu();
}

function loadHomeData() {
  if (!currentUser) return;

  // Follow Requests
  db.collection("users").doc(currentUser.uid).collection("requests").onSnapshot((snapshot) => {
    const reqContainer = document.getElementById("follow-requests-list");
    if (!reqContainer) return;
    reqContainer.innerHTML = "";

    if (snapshot.empty) {
      reqContainer.innerHTML = "<p style='font-size:12px; opacity:0.6;'>No pending requests.</p>";
    }

    snapshot.forEach((doc) => {
      const reqData = doc.data();
      const div = document.createElement("div");
      div.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px; margin-bottom:5px; border-radius:5px;";
      div.innerHTML = `
        <span>${reqData.fromUsername}</span>
        <button onclick="acceptFollowRequest('${reqData.fromUid}', '${reqData.fromUsername}')" style="background:#39ff14; color:#000; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">Accept</button>
      `;
      reqContainer.appendChild(div);
    });
  });

  // User Suggestions
  db.collection("users").onSnapshot((snapshot) => {
    const sugContainer = document.getElementById("suggested-users-list");
    if (!sugContainer) return;
    sugContainer.innerHTML = "";

    snapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.uid === currentUser.uid) return;

      const div = document.createElement("div");
      div.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px; margin-bottom:5px; border-radius:5px;";
      div.innerHTML = `
        <span style="color:${userData.color || '#fff'}">${userData.pfpIcon || '👤'} ${userData.username || 'User'}</span>
        <button onclick="sendFollowRequest('${userData.uid}')" style="background:#00ebff; color:#000; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">Follow</button>
      `;
      sugContainer.appendChild(div);
    });
  });
}

window.sendFollowRequest = async function(targetUid) {
  try {
    await db.collection("users").doc(targetUid).collection("requests").doc(currentUser.uid).set({
      fromUid: currentUser.uid,
      fromUsername: userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0],
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Follow request sent!");
  } catch(e) {
    alert("Error: " + e.message);
  }
};

window.acceptFollowRequest = async function(fromUid, fromUsername) {
  try {
    await db.collection("users").doc(currentUser.uid).collection("following").doc(fromUid).set({
      uid: fromUid,
      username: fromUsername
    });
    await db.collection("users").doc(fromUid).collection("following").doc(currentUser.uid).set({
      uid: currentUser.uid,
      username: userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0]
    });

    await db.collection("users").doc(currentUser.uid).collection("requests").doc(fromUid).delete();
    alert("Follow request accepted!");
  } catch(e) {
    alert("Error: " + e.message);
  }
};

// 3. DM Navigation
function loadDMUsers() {
  const dmContainer = document.getElementById("dm-users-list");
  if (!dmContainer) return;

  db.collection("users").doc(currentUser.uid).collection("following").onSnapshot((snapshot) => {
    dmContainer.innerHTML = "";
    snapshot.forEach((doc) => {
      const userData = doc.data();
      const userBtn = document.createElement("button");
      userBtn.classList.add("navigation-item");
      userBtn.style.cssText = "display:block; width:100%; text-align:left; margin:5px 0;";
      userBtn.innerText = `💬 ${userData.username}`;
      userBtn.onclick = () => startDM(userData);
      dmContainer.appendChild(userBtn);
    });
  });
}

function startDM(targetUser) {
  document.getElementById("home-view").style.display = "none";
  document.getElementById("chat-view").style.display = "flex";
  
  isDM = true;
  const ids = [currentUser.uid, targetUser.uid].sort();
  currentChatId = `dm_${ids[0]}_${ids[1]}`;

  document.getElementById("active-chat-title").innerText = `@ ${targetUser.username}`;
  listenForMessages();
  toggleSidebarMenu();
}

window.switchChannel = function (channelName) {
  document.getElementById("home-view").style.display = "none";
  document.getElementById("chat-view").style.display = "flex";

  isDM = false;
  currentChatId = channelName;
  document.getElementById("active-chat-title").innerText = `Room: ${channelName}`;
  listenForMessages();
  toggleSidebarMenu();
};

// 4. Message Stream & Audio Alerts
function listenForMessages() {
  if (messageUnsubscribe) messageUnsubscribe();

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
            notifSound.play().catch(e => console.log("Audio play error:", e));
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

      let content = `<div class="message-meta"><span class="message-sender" style="color:${msg.color || '#39ff14'}">${msg.sender || 'Anonymous'}</span></div>`;

      if (msg.audioUrl) {
        content += `<div class="message-body"><audio controls src="${msg.audioUrl}"></audio></div>`;
      } else if (msg.imageUrl) {
        content += `<div class="message-body"><img src="${msg.imageUrl}" style="max-width:200px; border-radius:8px;"></div>`;
      } else {
        content += `<div class="message-body">${msg.text}</div>`;
      }

      msgElement.innerHTML = content;
      messagesContainer.appendChild(msgElement);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    isInitialLoad = false;
  });
}

// 5. Send Text, Media & Audio Voice
window.sendMessage = async function () {
  const input = document.getElementById("msg-input");
  const text = input ? input.value.trim() : "";

  if ((text === "" && !selectedImageData) || !currentUser) return;

  try {
    const collectionRef = isDM 
      ? db.collection("direct_messages").doc(currentChatId).collection("messages")
      : db.collection("channels").doc(currentChatId).collection("messages");

    const payload = {
      sender: userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0],
      senderId: currentUser.uid,
      color: userProfileData.color || "#39ff14",
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (selectedImageData) {
      payload.imageUrl = selectedImageData;
      cancelMediaSelection();
    } else {
      payload.text = text;
    }

    await collectionRef.add(payload);
    if (input) input.value = "";
    handleInputUpdate();
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

window.toggleVoiceRecording = async function () {
  const micBtn = document.getElementById("mic-record-btn");

  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          const collectionRef = isDM 
            ? db.collection("direct_messages").doc(currentChatId).collection("messages")
            : db.collection("channels").doc(currentChatId).collection("messages");

          await collectionRef.add({
            audioUrl: base64Audio,
            sender: userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0],
            senderId: currentUser.uid,
            color: userProfileData.color || "#39ff14",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        };
      };

      mediaRecorder.start();
      isRecording = true;
      micBtn.style.background = "#ff0055";
      micBtn.innerText = "🛑";
    } catch (err) {
      alert("Microphone permission denied.");
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    micBtn.style.background = "";
    micBtn.innerText = "🎤";
  }
};

window.toggleAttachmentMenu = function () {
  const drawer = document.getElementById("attachment-drawer-hud");
  if (drawer) drawer.style.display = drawer.style.display === "none" ? "block" : "none";
};

window.triggerImageUpload = function () {
  document.getElementById("hidden-file-input").click();
};

window.handleImageSelect = function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      selectedImageData = e.target.result;
      document.getElementById("preview-content").innerHTML = `<img src="${selectedImageData}" style="max-height:100px;">`;
      document.getElementById("media-preview-tray").style.display = "flex";
      toggleAttachmentMenu();
    };
    reader.readAsDataURL(file);
  }
};

window.cancelMediaSelection = function () {
  selectedImageData = null;
  document.getElementById("media-preview-tray").style.display = "none";
};

window.injectSticker = function (stickerEmoji) {
  const input = document.getElementById("msg-input");
  if (input) input.value += stickerEmoji;
  toggleAttachmentMenu();
};

// 6. Settings & Profile Changes
window.saveSystemSettings = async function () {
  const newUsername = document.getElementById("settings-username-input").value.trim();
  const newIcon = document.getElementById("settings-pfp-select")?.value;
  const newColor = document.getElementById("settings-color-picker")?.value;

  if (!currentUser) return;

  try {
    const updatedName = newUsername || userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0];

    if (newUsername !== "") {
      await currentUser.updateProfile({ displayName: newUsername });
    }

    userProfileData = {
      username: updatedName,
      pfpIcon: newIcon || "🐺",
      color: newColor || "#39ff14"
    };

    await db.collection("users").doc(currentUser.uid).set({
      uid: currentUser.uid,
      username: updatedName,
      pfpIcon: userProfileData.pfpIcon,
      color: userProfileData.color
    }, { merge: true });

    updateUserHeader();
    closeSettingsModal();
    alert("Profile saved successfully!");
  } catch (err) {
    alert("Save error: " + err.message);
  }
};

// 7. Auth Handlers
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
  const color = document.getElementById("color-picker")?.value;
  const icon = document.getElementById("auth-pfp-select")?.value;
  const isSignUp = document.getElementById("signup-extra-fields").style.display !== "none";

  try {
    if (isSignUp) {
      const userCred = await auth.createUserWithEmailAndPassword(email, password);
      if (username) {
        await userCred.user.updateProfile({ displayName: username });
      }
      userProfileData = { username: username || email.split("@")[0], color: color || "#39ff14", pfpIcon: icon || "🐺" };
      updateUserOnlineStatus();
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
    updateUserOnlineStatus();
  } catch (err) {
    alert("Google error: " + err.message);
  }
};

window.handleFacebookSignIn = async function () {
  const provider = new firebase.auth.FacebookAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    updateUserOnlineStatus();
  } catch (err) {
    alert("Facebook error: " + err.message);
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
