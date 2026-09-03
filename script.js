// ==========================================
// WOLF CHAT 2.0 - FULL MONOLITHIC ENGINE
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
let isDirectMessage = false;
let messageUnsubscribe = null;
let userListUnsubscribe = null;
let typingUnsubscribe = null;
let isInitialLoad = true;
let selectedImageData = null;
let typingTimeout = null;

// Voice Recorder variables
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// Calling System Variables (PeerJS)
let peer = null;
let currentCall = null;
let localMediaStream = null;
let activeDmPartnerUid = null;

// 1. App Initialization & Auth State
window.addEventListener("DOMContentLoaded", () => {
  const loadingScreen = document.getElementById("loading-screen");
  const progressBar = document.getElementById("progress-bar");

  if (progressBar) progressBar.style.width = "100%";

  setTimeout(() => {
    if (loadingScreen) loadingScreen.style.display = "none";
  }, 2000);

  auth.onAuthStateChanged(async (user) => {
    const authScreen = document.getElementById("auth-screen");
    const chatContainer = document.getElementById("chat-container");

    if (user) {
      currentUser = user;
      await fetchUserProfile();
      await saveUserToDirectory();
      setupUserPresence();
      
      if (authScreen) authScreen.style.display = "none";
      if (chatContainer) chatContainer.style.display = "flex";
      
      updateUserHeader();
      listenForUsers();
      listenForMessages();
      listenForTyping();
      initPeerConnection();

      document.body.addEventListener('click', unlockAudio, { once: true });
    } else {
      currentUser = null;
      if (userListUnsubscribe) userListUnsubscribe();
      if (messageUnsubscribe) messageUnsubscribe();
      if (typingUnsubscribe) typingUnsubscribe();
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

async function saveUserToDirectory() {
  if (!currentUser) return;
  const username = userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0];
  const color = userProfileData.color || "#39ff14";
  const pfpIcon = userProfileData.pfpIcon || "🐺";

  await db.collection("users").doc(currentUser.uid).set({
    uid: currentUser.uid,
    username: username,
    color: color,
    pfpIcon: pfpIcon,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

function setupUserPresence() {
  if (!currentUser) return;
  const userStatusRef = db.collection("users").doc(currentUser.uid);

  userStatusRef.set({
    isOnline: true,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  window.addEventListener("beforeunload", () => {
    userStatusRef.set({
      isOnline: false,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
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

// 2. Typing Indicators
window.handleInputUpdate = function () {
  const input = document.getElementById("msg-input");
  const counter = document.getElementById("char-counter-node");
  if (input && counter) {
    counter.innerText = `${input.value.length} / 250`;
  }

  if (!currentUser || !currentChatId || !input) return;

  const typingRef = db.collection("typing_status").doc(`${currentChatId}_${currentUser.uid}`);

  if (input.value.trim().length > 0) {
    typingRef.set({
      username: userProfileData.username || currentUser.displayName || "Wolf",
      isTyping: true,
      chatId: currentChatId,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      typingRef.set({ isTyping: false }, { merge: true });
    }, 2500);
  } else {
    typingRef.set({ isTyping: false }, { merge: true });
  }
};

function listenForTyping() {
  if (typingUnsubscribe) typingUnsubscribe();

  const indicator = document.getElementById("typing-indicator-text");
  if (!indicator || !currentChatId) return;

  typingUnsubscribe = db.collection("typing_status")
    .where("chatId", "==", currentChatId)
    .where("isTyping", "==", true)
    .onSnapshot((snapshot) => {
      let typers = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.username && doc.id !== `${currentChatId}_${currentUser.uid}`) {
          typers.push(data.username);
        }
      });

      if (typers.length > 0) {
        indicator.innerText = `${typers.join(", ")} ${typers.length > 1 ? "are" : "is"} typing...`;
      } else {
        indicator.innerText = "";
      }
    });
}

// 3. PeerJS Audio & Video Calling Setup
function initPeerConnection() {
  if (!currentUser || peer || typeof Peer === "undefined") return;

  peer = new Peer(currentUser.uid);

  peer.on('call', async (incomingCall) => {
    const accept = confirm("Incoming Call! Do you want to answer?");
    if (accept) {
      try {
        localMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById("local-video").srcObject = localMediaStream;
        document.getElementById("call-screen-overlay").style.display = "flex";

        incomingCall.answer(localMediaStream);
        currentCall = incomingCall;

        incomingCall.on('stream', (remoteStream) => {
          document.getElementById("remote-video").srcObject = remoteStream;
        });

        incomingCall.on('close', () => endActiveCall());
      } catch (err) {
        alert("Camera and Microphone permissions are required to take calls.");
      }
    } else {
      incomingCall.close();
    }
  });
}

window.startCall = async function (isVideo = true) {
  if (!isDirectMessage || !activeDmPartnerUid) {
    alert("Select a user under Direct Messages to start a call!");
    return;
  }

  try {
    localMediaStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
    document.getElementById("local-video").srcObject = localMediaStream;
    document.getElementById("call-screen-overlay").style.display = "flex";
    document.getElementById("call-status-text").innerText = "Calling...";

    const outgoingCall = peer.call(activeDmPartnerUid, localMediaStream);
    currentCall = outgoingCall;

    outgoingCall.on('stream', (remoteStream) => {
      document.getElementById("call-status-text").innerText = "Connected";
      document.getElementById("remote-video").srcObject = remoteStream;
    });

    outgoingCall.on('close', () => endActiveCall());
  } catch (err) {
    alert("Camera or Microphone permission denied.");
  }
};

window.toggleMuteMic = function () {
  if (localMediaStream) {
    const audioTrack = localMediaStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      document.getElementById("toggle-mic-btn").style.background = audioTrack.enabled ? "#202c33" : "#ff0055";
    }
  }
};

window.toggleMuteCam = function () {
  if (localMediaStream) {
    const videoTrack = localMediaStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      document.getElementById("toggle-cam-btn").style.background = videoTrack.enabled ? "#202c33" : "#ff0055";
    }
  }
};

window.endActiveCall = function () {
  if (currentCall) currentCall.close();
  if (localMediaStream) {
    localMediaStream.getTracks().forEach(track => track.stop());
  }
  document.getElementById("call-screen-overlay").style.display = "none";
  currentCall = null;
  localMediaStream = null;
};

// 4. User Directory for DMs & Status
function listenForUsers() {
  const dmUsersList = document.getElementById("dm-users-list");
  if (!dmUsersList) return;

  userListUnsubscribe = db.collection("users").onSnapshot((snapshot) => {
    dmUsersList.innerHTML = "";

    snapshot.forEach((doc) => {
      const user = doc.data();
      if (currentUser && user.uid !== currentUser.uid) {
        const userBtn = document.createElement("button");
        userBtn.className = "navigation-item";
        
        const onlineDot = user.isOnline 
          ? `<span style="height: 8px; width: 8px; background-color: #39ff14; border-radius: 50%; display: inline-block; margin-right: 6px; box-shadow: 0 0 6px #39ff14;"></span>`
          : `<span style="height: 8px; width: 8px; background-color: #777; border-radius: 50%; display: inline-block; margin-right: 6px;"></span>`;

        userBtn.innerHTML = `${onlineDot} ${user.pfpIcon || '🐺'} <span style="color:${user.color || '#fff'}">${user.username || 'User'}</span>`;
        userBtn.onclick = () => openDirectMessage(user.uid, user.username);
        dmUsersList.appendChild(userBtn);
      }
    });
  });
}

// 5. Navigation & DM Routing
window.switchChannel = function (channelName) {
  isDirectMessage = false;
  activeDmPartnerUid = null;
  currentChatId = channelName;
  document.getElementById("active-chat-title").innerText = `Room: ${channelName}`;
  listenForMessages();
  listenForTyping();
  toggleSidebarMenu();
};

window.openDirectMessage = function (targetUid, targetUsername) {
  isDirectMessage = true;
  activeDmPartnerUid = targetUid;
  const dmRoomId = [currentUser.uid, targetUid].sort().join("_");
  currentChatId = dmRoomId;

  document.getElementById("active-chat-title").innerText = `DM: ${targetUsername}`;
  listenForMessages();
  listenForTyping();
  toggleSidebarMenu();
};

// 6. Message Engine
function listenForMessages() {
  if (messageUnsubscribe) messageUnsubscribe();

  const messagesContainer = document.getElementById("messages");
  const notifSound = document.getElementById("notif-sound");
  isInitialLoad = true;

  const collectionRef = isDirectMessage
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

// 7. Send Message
window.sendMessage = async function () {
  const input = document.getElementById("msg-input");
  const text = input ? input.value.trim() : "";

  if ((text === "" && !selectedImageData) || !currentUser) return;

  try {
    const collectionRef = isDirectMessage
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
    
    // Clear typing state in DB
    db.collection("typing_status").doc(`${currentChatId}_${currentUser.uid}`).set({ isTyping: false }, { merge: true });

    if (input) input.value = "";
    handleInputUpdate();
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

// 8. Voice Notes
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
          const collectionRef = isDirectMessage
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

// 9. Attachments & Drawers
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

// 10. Profile Settings
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

    await saveUserToDirectory();
    updateUserHeader();
    closeSettingsModal();
    alert("Profile saved successfully!");
  } catch (err) {
    alert("Save error: " + err.message);
  }
};

// 11. Auth Handlers
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
    toggleLink.innerText = "Don't have an account? Sign in here";
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
      await saveUserToDirectory();
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
    alert("Google error: " + err.message);
  }
};

window.handleFacebookSignIn = async function () {
  const provider = new firebase.auth.FacebookAuthProvider();
  try {
    await auth.signInWithPopup(provider);
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
