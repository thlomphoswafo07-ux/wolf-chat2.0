// ==========================================
// WOLF CHAT 2.0 - FULL ENGINE WITH REACTIONS
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

if (typeof firebase !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = typeof firebase !== "undefined" ? firebase.firestore() : null;
const auth = typeof firebase !== "undefined" ? firebase.auth() : null;

let currentUser = null;
let userProfileData = {};
let currentChatId = "General-Alpha";
let isDirectMessage = false;
let messageUnsubscribe = null;
let userListUnsubscribe = null;
let typingUnsubscribe = null;
let isInitialLoad = true;
let selectedImageData = null;
let customPfpData = null;
let typingTimeout = null;

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

let peer = null;
let currentCall = null;
let localMediaStream = null;
let activeDmPartnerUid = null;

// Failsafe Loading Screen Hide
function hideLoadingScreen() {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen) {
    loadingScreen.style.opacity = "0";
    loadingScreen.style.transition = "opacity 0.5s ease";
    setTimeout(() => { loadingScreen.style.display = "none"; }, 500);
  }
}
setTimeout(hideLoadingScreen, 1500);

// App Initialization
window.addEventListener("DOMContentLoaded", () => {
  if (!auth) return;

  auth.onAuthStateChanged(async (user) => {
    const authScreen = document.getElementById("auth-screen");
    const chatContainer = document.getElementById("chat-container");

    hideLoadingScreen();

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
  if (!currentUser || !db) return;
  try {
    const doc = await db.collection("users").doc(currentUser.uid).get();
    if (doc.exists) {
      userProfileData = doc.data();
    }
  } catch (e) {
    console.error("Profile fetch error:", e);
  }
}

async function saveUserToDirectory() {
  if (!currentUser || !db) return;
  const username = userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0];
  const color = userProfileData.color || "#39ff14";
  const pfpIcon = userProfileData.pfpIcon || "🐺";
  const pfpImage = userProfileData.pfpImage || null;
  const isSleepMode = userProfileData.isSleepMode || false;

  try {
    await db.collection("users").doc(currentUser.uid).set({
      uid: currentUser.uid,
      username: username,
      color: color,
      pfpIcon: pfpIcon,
      pfpImage: pfpImage,
      isSleepMode: isSleepMode,
      isOnline: !isSleepMode,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error("Directory save error:", e);
  }
}

function setupUserPresence() {
  if (!currentUser || !db) return;
  const userStatusRef = db.collection("users").doc(currentUser.uid);

  if (!userProfileData.isSleepMode) {
    userStatusRef.set({
      isOnline: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }

  window.addEventListener("beforeunload", () => {
    userStatusRef.set({
      isOnline: false,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

function updateUserHeader() {
  if (!currentUser) return;
  const userDisplay = document.getElementById("user-display");
  const headerPfp = document.getElementById("header-pfp");

  const name = userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0];
  const color = userProfileData.color || "#39ff14";

  if (userDisplay) {
    userDisplay.innerText = name;
    userDisplay.style.color = color;
  }
  
  if (headerPfp) {
    if (userProfileData.pfpImage) {
      headerPfp.innerHTML = `<img src="${userProfileData.pfpImage}" style="width:28px; height:28px; border-radius:50%; object-fit:cover;">`;
    } else {
      headerPfp.innerText = userProfileData.pfpIcon || "🐺";
    }
  }
}

// Typing Indicators
window.handleInputUpdate = function () {
  const input = document.getElementById("msg-input");
  const counter = document.getElementById("char-counter-node");
  if (input && counter) counter.innerText = `${input.value.length} / 250`;

  if (!currentUser || !currentChatId || !input || !db) return;

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
  if (!indicator || !currentChatId || !db) return;

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

// Users Directory
function listenForUsers() {
  const dmUsersList = document.getElementById("dm-users-list");
  if (!dmUsersList || !db) return;

  userListUnsubscribe = db.collection("users").onSnapshot((snapshot) => {
    dmUsersList.innerHTML = "";

    snapshot.forEach((doc) => {
      const user = doc.data();
      if (currentUser && user.uid !== currentUser.uid) {
        const userBtn = document.createElement("button");
        userBtn.className = "navigation-item";

        let statusDot = `<span style="height: 8px; width: 8px; background-color: #777; border-radius: 50%; display: inline-block; margin-right: 6px;"></span>`;
        let statusText = "Offline";

        if (user.isSleepMode) {
          statusDot = `<span style="height: 8px; width: 8px; background-color: #ffaa00; border-radius: 50%; display: inline-block; margin-right: 6px;"></span>`;
          statusText = "Sleeping 🌙";
        } else if (user.isOnline) {
          statusDot = `<span style="height: 8px; width: 8px; background-color: #39ff14; border-radius: 50%; display: inline-block; margin-right: 6px; box-shadow: 0 0 6px #39ff14;"></span>`;
          statusText = "Online";
        }

        const avatar = user.pfpImage 
          ? `<img src="${user.pfpImage}" style="width:20px; height:20px; border-radius:50%; vertical-align:middle; margin-right:5px;">`
          : `${user.pfpIcon || '🐺'} `;

        userBtn.innerHTML = `${statusDot} ${avatar} <span style="color:${user.color || '#fff'}">${user.username || 'User'}</span> <small style="font-size:9px; color:#aaa; margin-left: auto;">${statusText}</small>`;
        userBtn.onclick = () => openDirectMessage(user.uid, user.username, user);
        dmUsersList.appendChild(userBtn);
      }
    });
  });
}

// Channel Routing
window.switchChannel = function (channelName) {
  isDirectMessage = false;
  activeDmPartnerUid = null;
  currentChatId = channelName;
  document.getElementById("active-chat-title").innerText = `Room: ${channelName}`;
  listenForMessages();
  listenForTyping();
  toggleSidebarMenu();
};

window.openDirectMessage = function (targetUid, targetUsername, targetUserData = null) {
  isDirectMessage = true;
  activeDmPartnerUid = targetUid;
  const dmRoomId = [currentUser.uid, targetUid].sort().join("_");
  currentChatId = dmRoomId;

  let headerStatus = "@" + targetUsername;
  if (targetUserData) {
    if (targetUserData.isSleepMode) headerStatus += " (Sleeping 🌙)";
    else if (targetUserData.isOnline) headerStatus += " (Online)";
    else headerStatus += " (Offline)";
  }

  document.getElementById("active-chat-title").innerText = headerStatus;
  listenForMessages();
  listenForTyping();
  toggleSidebarMenu();
};

// Message Reactions Engine
window.toggleReaction = async function (docId, emoji) {
  if (!currentUser || !db) return;

  const collectionRef = isDirectMessage
    ? db.collection("direct_messages").doc(currentChatId).collection("messages").doc(docId)
    : db.collection("channels").doc(currentChatId).collection("messages").doc(docId);

  try {
    const doc = await collectionRef.get();
    if (!doc.exists) return;

    let reactions = doc.data().reactions || {};

    if (!reactions[emoji]) reactions[emoji] = [];

    const userIndex = reactions[emoji].indexOf(currentUser.uid);
    if (userIndex > -1) {
      reactions[emoji].splice(userIndex, 1);
      if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
      reactions[emoji].push(currentUser.uid);
    }

    await collectionRef.update({ reactions: reactions });
  } catch (err) {
    console.error("Reaction update error:", err);
  }
};

// Messages Listener
function listenForMessages() {
  if (messageUnsubscribe) messageUnsubscribe();

  const messagesContainer = document.getElementById("messages");
  if (!db) return;

  isInitialLoad = true;

  const collectionRef = isDirectMessage
    ? db.collection("direct_messages").doc(currentChatId).collection("messages")
    : db.collection("channels").doc(currentChatId).collection("messages");

  messageUnsubscribe = collectionRef.orderBy("timestamp", "asc").onSnapshot((snapshot) => {
    if (!messagesContainer) return;

    messagesContainer.innerHTML = "";

    snapshot.forEach((doc) => {
      const msg = doc.data();
      const msgId = doc.id;

      if (currentUser && msg.senderId !== currentUser.uid && !msg.seen) {
        collectionRef.doc(msgId).update({ seen: true });
      }

      const msgElement = document.createElement("div");
      msgElement.classList.add("message-node");
      msgElement.style.position = "relative";

      const isMe = currentUser && msg.senderId === currentUser.uid;
      if (isMe) msgElement.classList.add("my-message");

      let seenBadge = "";
      if (isMe) {
        seenBadge = msg.seen 
          ? `<span style="font-size:10px; color:#00ebff; margin-left:6px;">✓✓ Seen</span>`
          : `<span style="font-size:10px; color:#888; margin-left:6px;">✓ Sent</span>`;
      }

      // Reactions UI
      let reactionsListHtml = "";
      if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        reactionsListHtml = `<div class="reactions-display-tray" style="display:flex; gap:4px; margin-top:4px; flex-wrap:wrap;">`;
        for (const [emoji, uids] of Object.entries(msg.reactions)) {
          if (uids.length > 0) {
            const hasReacted = currentUser && uids.includes(currentUser.uid);
            reactionsListHtml += `
              <span onclick="toggleReaction('${msgId}', '${emoji}')" style="background:${hasReacted ? '#00ebff33' : '#202c33'}; border:1px solid ${hasReacted ? '#00ebff' : '#334155'}; padding:2px 6px; border-radius:12px; font-size:11px; cursor:pointer;">
                ${emoji} ${uids.length}
              </span>`;
          }
        }
        reactionsListHtml += `</div>`;
      }

      // Quick Reaction Picker Bar
      const reactionPickerHtml = `
        <div class="reaction-picker-hud" style="display:flex; gap:6px; background:#111b21; border:1px solid #222d34; padding:4px 8px; border-radius:20px; margin-top:4px; width:fit-content;">
          <span onclick="toggleReaction('${msgId}', '👍')" style="cursor:pointer; font-size:14px;">👍</span>
          <span onclick="toggleReaction('${msgId}', '❤️')" style="cursor:pointer; font-size:14px;">❤️</span>
          <span onclick="toggleReaction('${msgId}', '🔥')" style="cursor:pointer; font-size:14px;">🔥</span>
          <span onclick="toggleReaction('${msgId}', '😂')" style="cursor:pointer; font-size:14px;">😂</span>
          <span onclick="toggleReaction('${msgId}', '😮')" style="cursor:pointer; font-size:14px;">😮</span>
        </div>`;

      let content = `<div class="message-meta"><span class="message-sender" style="color:${msg.color || '#39ff14'}">${msg.sender || 'Anonymous'}</span></div>`;

      if (msg.audioUrl) {
        content += `<div class="message-body"><audio controls src="${msg.audioUrl}"></audio>${seenBadge}</div>`;
      } else if (msg.imageUrl) {
        content += `<div class="message-body"><img src="${msg.imageUrl}" style="max-width:200px; border-radius:8px;">${seenBadge}</div>`;
      } else {
        content += `<div class="message-body">${msg.text}${seenBadge}</div>`;
      }

      content += reactionsListHtml + reactionPickerHtml;

      msgElement.innerHTML = content;
      messagesContainer.appendChild(msgElement);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    isInitialLoad = false;
  });
}

// Send Message
window.sendMessage = async function () {
  const input = document.getElementById("msg-input");
  const text = input ? input.value.trim() : "";

  if ((text === "" && !selectedImageData) || !currentUser || !db) return;

  try {
    const collectionRef = isDirectMessage
      ? db.collection("direct_messages").doc(currentChatId).collection("messages")
      : db.collection("channels").doc(currentChatId).collection("messages");

    const payload = {
      sender: userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0],
      senderId: currentUser.uid,
      color: userProfileData.color || "#39ff14",
      seen: false,
      reactions: {},
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (selectedImageData) {
      payload.imageUrl = selectedImageData;
      cancelMediaSelection();
    } else {
      payload.text = text;
    }

    await collectionRef.add(payload);
    db.collection("typing_status").doc(`${currentChatId}_${currentUser.uid}`).set({ isTyping: false }, { merge: true });

    if (input) input.value = "";
    handleInputUpdate();
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

// Profile & Media Handlers
window.handleCustomPfpSelect = function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      customPfpData = e.target.result;
      const preview = document.getElementById("settings-pfp-preview");
      if (preview) preview.src = customPfpData;
    };
    reader.readAsDataURL(file);
  }
};

window.saveSystemSettings = async function () {
  const newUsername = document.getElementById("settings-username-input").value.trim();
  const newIcon = document.getElementById("settings-pfp-select")?.value;
  const newColor = document.getElementById("settings-color-picker")?.value;
  const sleepToggle = document.getElementById("settings-sleep-toggle")?.checked;

  if (!currentUser) return;

  try {
    const updatedName = newUsername || userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0];

    if (newUsername !== "") {
      await currentUser.updateProfile({ displayName: newUsername });
    }

    userProfileData = {
      username: updatedName,
      pfpIcon: newIcon || "🐺",
      pfpImage: customPfpData || userProfileData.pfpImage || null,
      color: newColor || "#39ff14",
      isSleepMode: sleepToggle || false
    };

    await saveUserToDirectory();
    updateUserHeader();
    closeSettingsModal();
    alert("Settings updated!");
  } catch (err) {
    alert("Save error: " + err.message);
  }
};

// PeerJS Calls
function initPeerConnection() {
  if (!currentUser || peer || typeof Peer === "undefined") return;

  try {
    peer = new Peer(currentUser.uid);

    peer.on('call', async (incomingCall) => {
      const accept = confirm("Incoming Call! Answer?");
      if (accept) {
        localMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById("local-video").srcObject = localMediaStream;
        document.getElementById("call-screen-overlay").style.display = "flex";

        incomingCall.answer(localMediaStream);
        currentCall = incomingCall;

        incomingCall.on('stream', (remoteStream) => {
          document.getElementById("remote-video").srcObject = remoteStream;
        });

        incomingCall.on('close', () => endActiveCall());
      } else {
        incomingCall.close();
      }
    });
  } catch (e) {
    console.error("PeerJS initialization failed:", e);
  }
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

window.endActiveCall = function () {
  if (currentCall) currentCall.close();
  if (localMediaStream) {
    localMediaStream.getTracks().forEach(track => track.stop());
  }
  document.getElementById("call-screen-overlay").style.display = "none";
  currentCall = null;
  localMediaStream = null;
};

// Voice Recording & Drawers
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
          if (!db) return;

          const collectionRef = isDirectMessage
            ? db.collection("direct_messages").doc(currentChatId).collection("messages")
            : db.collection("channels").doc(currentChatId).collection("messages");

          await collectionRef.add({
            audioUrl: base64Audio,
            sender: userProfileData.username || currentUser.displayName || currentUser.email.split("@")[0],
            senderId: currentUser.uid,
            color: userProfileData.color || "#39ff14",
            seen: false,
            reactions: {},
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          });
        };
      };

      mediaRecorder.start();
      isRecording = true;
      if (micBtn) {
        micBtn.style.background = "#ff0055";
        micBtn.innerText = "🛑";
      }
    } catch (err) {
      alert("Microphone permission denied.");
    }
  } else {
    if (mediaRecorder) mediaRecorder.stop();
    isRecording = false;
    if (micBtn) {
      micBtn.style.background = "";
      micBtn.innerText = "🎤";
    }
  }
};

window.toggleAttachmentMenu = function () {
  const drawer = document.getElementById("attachment-drawer-hud");
  if (drawer) drawer.style.display = drawer.style.display === "none" ? "block" : "none";
};

window.triggerImageUpload = function () {
  const hiddenInput = document.getElementById("hidden-file-input");
  if (hiddenInput) hiddenInput.click();
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

  if (!auth) return;

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

window.handleLogout = function () {
  if (auth) auth.signOut();
};

window.toggleSidebarMenu = function () {
  const sidebar = document.getElementById("chat-sidebar");
  if (sidebar) sidebar.classList.toggle("sidebar-hidden");
};

window.openSettingsModal = function () {
  const modal = document.getElementById("settings-modal");
  if (modal) {
    modal.style.display = "flex";
    if (document.getElementById("settings-sleep-toggle")) {
      document.getElementById("settings-sleep-toggle").checked = userProfileData.isSleepMode || false;
    }
  }
};

window.closeSettingsModal = function () {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.style.display = "none";
};
