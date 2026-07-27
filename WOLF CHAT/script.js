// --- FIREBASE CONFIGURATION ---
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
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
  firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();
  var auth = firebase.auth();
}

// --- APP STATE ---
let currentUsername = "";
let userChatColor = "#39ff14";
let userPfp = "🐺";
let isSignUpMode = false; 

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let stagedImageUrl = null;
let stagedAudioUrl = null;
let currentRoomNode = "General-Alpha";
let unsubscribeMessagesListener = null;

const localUsers = [
  { username: "AlphaWolf", insignia: "👑" },
  { username: "ShadowPack", insignia: "🥷" }
];

window.onload = function() {
  runLoadingScreen();
};

// --- LOADING SCREEN (MODIFIED FOR EXACTLY 7 SECONDS) ---
function runLoadingScreen() {
  const progressBar = document.getElementById("progress-bar");
  let width = 0;
  
  const interval = setInterval(() => {
    if (width >= 100) {
      clearInterval(interval);
      document.getElementById("loading-screen").style.display = "none";
      
      // Track login state changes
      auth.onAuthStateChanged(user => {
        if (user) {
          let storedUsername = localStorage.getItem("wolf_currentUser");
          if (!storedUsername) {
            storedUsername = user.displayName || user.email.split('@')[0];
            localStorage.setItem("wolf_currentUser", storedUsername);
          }
          currentUsername = storedUsername;
          userChatColor = localStorage.getItem("wolf_chatColor") || "#39ff14";
          userPfp = localStorage.getItem("wolf_userPfp") || "🐺";
          bypassToChat();
        } else {
          document.getElementById("chat-container").style.display = "none";
          document.getElementById("auth-screen").style.display = "block";
        }
      });
    } else { 
      width += 1; 
      progressBar.style.width = width + "%"; 
    }
  }, 70);
}

function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  const title = document.getElementById("auth-title");
  const mainBtn = document.getElementById("auth-main-btn");
  const toggleLink = document.getElementById("auth-toggle-mode");
  const extraFields = document.getElementById("signup-extra-fields");

  if (isSignUpMode) {
    title.innerText = "Create Account";
    mainBtn.innerText = "Register Now";
    toggleLink.innerText = "Already have an account? Sign In";
    extraFields.style.display = "block";
  } else {
    title.innerText = "Welcome to Wolf Chat";
    mainBtn.innerText = "Sign In";
    toggleLink.innerText = "Don't have an account? Sign up here";
    extraFields.style.display = "none";
  }
}

function handleAuthSubmit() {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;

  if (!email || !password) {
    alert("Please fill in all login fields.");
    return;
  }

  if (isSignUpMode) {
    const usernameInput = document.getElementById("username").value.trim();
    if (!usernameInput) {
      alert("Please choose a username.");
      return;
    }
    
    currentUsername = usernameInput;
    userChatColor = document.getElementById("color-picker").value;
    userPfp = document.getElementById("auth-pfp-select").value;

    localStorage.setItem("wolf_currentUser", currentUsername);
    localStorage.setItem("wolf_chatColor", userChatColor);
    localStorage.setItem("wolf_userPfp", userPfp);

    auth.createUserWithEmailAndPassword(email, password)
      .catch((error) => alert("Sign up error: " + error.message));

  } else {
    auth.signInWithEmailAndPassword(email, password)
      .catch((error) => alert("Login failed: " + error.message));
  }
}

function handleGoogleSignIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      currentUsername = result.user.displayName || result.user.email.split('@')[0];
      userPfp = result.user.photoURL || "🐺";
      userChatColor = "#00ebff";
      localStorage.setItem("wolf_currentUser", currentUsername);
      localStorage.setItem("wolf_userPfp", userPfp);
      localStorage.setItem("wolf_chatColor", userChatColor);
    })
    .catch((error) => alert("Google login failed: " + error.message));
}

function handleFacebookSignIn() {
  const provider = new firebase.auth.FacebookAuthProvider();
  auth.signInWithPopup(provider)
    .then((result) => {
      currentUsername = result.user.displayName || result.user.email.split('@')[0];
      userPfp = result.user.photoURL ? result.user.photoURL + "?type=large" : "🐺";
      userChatColor = "#39ff14";
      localStorage.setItem("wolf_currentUser", currentUsername);
      localStorage.setItem("wolf_userPfp", userPfp);
      localStorage.setItem("wolf_chatColor", userChatColor);
    })
    .catch((error) => alert("Facebook login failed: " + error.message));
}

function bypassToChat() {
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("chat-container").style.display = "flex";
  const headerPfp = document.getElementById("header-pfp");
  if (userPfp.startsWith("data:image") || userPfp.startsWith("http")) {
    headerPfp.innerHTML = `<img src="${userPfp}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
  } else {
    headerPfp.innerText = userPfp;
  }
  document.getElementById("user-display").innerText = currentUsername;
  loadSimulatedUsers();
  setSessionActiveTimestamp();
  if ("Notification" in window) Notification.requestPermission();
  if (db) listenToLiveMessages(currentRoomNode);
}

function handleLogout() {
  auth.signOut().then(() => {
    localStorage.clear();
    closeSettingsModal();
  });
}

function setSessionActiveTimestamp() {
  const sessionNode = document.getElementById("session-login-time");
  if (sessionNode) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    sessionNode.innerText = `${hours}:${minutes}`;
  }
}

function toggleSidebarMenu() {
  const sidebar = document.getElementById("chat-sidebar");
  sidebar.classList.toggle("sidebar-hidden");
  sidebar.classList.toggle("sidebar-visible");
}

function toggleAttachmentMenu() {
  const drawer = document.getElementById("attachment-drawer-hud");
  const plusBtn = document.getElementById("plus-attach-btn");
  if (drawer.style.display === "none" || drawer.style.display === "") {
    drawer.style.display = "flex";
    plusBtn.classList.add("utility-active-rotate");
  } else {
    drawer.style.display = "none";
    plusBtn.classList.remove("utility-active-rotate");
  }
}

function switchChannel(channelName) {
  currentRoomNode = channelName;
  document.getElementById("current-room-display").innerText = `Room: ${channelName}`;
  const items = document.querySelectorAll(".navigation-item");
  items.forEach(btn => btn.classList.remove("active-room"));
  event.target.classList.add("active-room");
  if (db) listenToLiveMessages(currentRoomNode);
  toggleSidebarMenu();
}

function openSettingsModal() {
  document.getElementById("settings-gallery-input").value = "";
  document.getElementById("settings-username-input").value = currentUsername;
  document.getElementById("settings-color-select").value = userChatColor;
  const previewCircle = document.getElementById("settings-pfp-preview-circle");
  if (userPfp.startsWith("data:image") || userPfp.startsWith("blob:") || userPfp.startsWith("http")) {
    previewCircle.innerHTML = `<img src="${userPfp}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
  } else {
    previewCircle.innerText = userPfp || "🐺";
  }
  document.getElementById("settings-modal").style.display = "flex";
}

function closeSettingsModal() {
  document.getElementById("settings-modal").style.display = "none";
}

function handleSettingsImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    const previewCircle = document.getElementById("settings-pfp-preview-circle");
    previewCircle.innerHTML = `<img src="${evt.target.result}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
    previewCircle.dataset.stagedSrc = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function saveSystemSettings() {
  const inputUsername = document.getElementById("settings-username-input").value.trim();
  if (inputUsername === "") return;
  currentUsername = inputUsername;
  userChatColor = document.getElementById("settings-color-select").value;
  const stagedSrc = document.getElementById("settings-pfp-preview-circle").dataset.stagedSrc;
  if (stagedSrc) userPfp = stagedSrc;
  localStorage.setItem("wolf_currentUser", currentUsername);
  localStorage.setItem("wolf_chatColor", userChatColor);
  localStorage.setItem("wolf_userPfp", userPfp);
  const headerPfp = document.getElementById("header-pfp");
  if (userPfp.startsWith("data:image") || userPfp.startsWith("http")) {
    headerPfp.innerHTML = `<img src="${userPfp}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
  } else {
    headerPfp.innerText = userPfp;
  }
  document.getElementById("user-display").innerText = currentUsername;
  closeSettingsModal();
}

function loadSimulatedUsers() {
  const usersList = document.getElementById("active-users-list");
  usersList.innerHTML = "";
  document.getElementById("user-counter").innerText = localUsers.length;
  localUsers.forEach(user => {
    const userItem = document.createElement("div");
    userItem.className = "online-user";
    userItem.innerHTML = `<span>${user.insignia}</span><span>${user.username}</span>`;
    usersList.appendChild(userItem);
  });
}

function handleInputUpdate() {
  const input = document.getElementById("msg-input");
  const counter = document.getElementById("char-counter-node");
  const length = input.value.length;
  counter.innerText = `${length} / 250`;
}

function triggerImageUpload() {
  document.getElementById("hidden-file-input").click();
}

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    stagedImageUrl = evt.target.result;
    const previewTray = document.getElementById("media-preview-tray");
    const previewContent = document.getElementById("preview-content");
    previewContent.innerHTML = `<img src="${stagedImageUrl}" style="max-height: 60px; border-radius: 6px;" />`;
    previewTray.style.display = "flex";
    toggleAttachmentMenu();
  };
  reader.readAsDataURL(file);
}

function cancelMediaSelection() {
  stagedImageUrl = null;
  stagedAudioUrl = null;
  document.getElementById("media-preview-tray").style.display = "none";
  document.getElementById("hidden-file-input").value = "";
}

function injectSticker(emoji) {
  const input = document.getElementById("msg-input");
  input.value += emoji;
  handleInputUpdate();
  toggleAttachmentMenu();
}

function toggleRecording() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Microphone not supported on this device.");
    return false;
  }
  const micBtn = document.getElementById("mic-record-btn");
  if (!isRecording) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = (event) => { audioChunks.push(event.data); };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        stagedAudioUrl = URL.createObjectURL(audioBlob);
        const previewTray = document.getElementById("media-preview-tray");
        const previewContent = document.getElementById("preview-content");
        previewContent.innerHTML = `<audio controls style="max-width: 200px;"><source src="${stagedAudioUrl}" type="audio/wav"></audio>`;
        previewTray.style.display = "flex";
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      isRecording = true;
      micBtn.innerText = "⏹️";
      micBtn.style.background = "rgba(255, 0, 127, 0.2)";
    }).catch(err => alert("Microphone access denied: " + err.message));
    return false;
  } else {
    mediaRecorder.stop();
    isRecording = false;
    micBtn.innerText = "🎤";
    micBtn.style.background = "";
    return false;
  }
}

function sendMessage() {
  const input = document.getElementById("msg-input");
  const messageText = input.value.trim();
  if (!messageText && !stagedImageUrl && !stagedAudioUrl) return;
  
  const timestamp = new Date();
  const messageObj = {
    username: currentUsername,
    pfp: userPfp,
    nameColor: userChatColor,
    text: messageText || "",
    room: currentRoomNode,
    timestamp: firebase.firestore.Timestamp.fromDate(timestamp),
    imageUrl: stagedImageUrl || null,
    audioUrl: stagedAudioUrl || null
  };
  if (db) {
    db.collection("wolf_messages").add(messageObj).catch(err => console.error("Send error:", err));
  }
  input.value = "";
  handleInputUpdate();
  cancelMediaSelection();
}

function listenToLiveMessages(roomName) {
  if (unsubscribeMessagesListener) unsubscribeMessagesListener();
  const messagesBox = document.getElementById("messages");
  messagesBox.innerHTML = "";
  
  unsubscribeMessagesListener = db.collection("wolf_messages")
    .where("room", "==", roomName)
    .orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const msg = change.doc.data();
          const msgEl = document.createElement("div");
          msgEl.className = "msg";
          const headerEl = document.createElement("div");
          headerEl.className = "msg-header";
          const identityEl = document.createElement("div");
          identityEl.className = "msg-identity";
          const pfpEl = document.createElement("span");
          if (msg.pfp && (msg.pfp.startsWith("data:image") || msg.pfp.startsWith("http"))) {
            pfpEl.innerHTML = `<img src="${msg.pfp}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;" />`;
          } else {
            pfpEl.innerText = msg.pfp || "🐺";
            pfpEl.style.fontSize = "0.85rem";
          }
          const usernameEl = document.createElement("strong");
          usernameEl.innerText = msg.username || "Anonymous";
          usernameEl.style.color = msg.nameColor || "#39ff14";
          identityEl.appendChild(pfpEl);
          identityEl.appendChild(usernameEl);
          const timeEl = document.createElement("span");
          timeEl.className = "msg-time";
          const msgTime = msg.timestamp ? msg.timestamp.toDate() : new Date();
          const hours = String(msgTime.getHours()).padStart(2, '0');
          const minutes = String(msgTime.getMinutes()).padStart(2, '0');
          timeEl.innerText = `${hours}:${minutes}`;
          headerEl.appendChild(identityEl);
          headerEl.appendChild(timeEl);
          msgEl.appendChild(headerEl);
          if (msg.text) {
            const textEl = document.createElement("p");
            textEl.style.margin = "4px 0 0 0";
            textEl.innerText = msg.text;
            msgEl.appendChild(textEl);
          }
          if (msg.imageUrl) {
            const imgEl = document.createElement("img");
            imgEl.src = msg.imageUrl;
            imgEl.className = "chat-img";
            msgEl.appendChild(imgEl);
          }
          if (msg.audioUrl) {
            const audioEl = document.createElement("audio");
            audioEl.controls = true;
            audioEl.style.marginTop = "8px";
            audioEl.innerHTML = `<source src="${msg.audioUrl}" type="audio/wav">`;
            msgEl.appendChild(audioEl);
          }
          messagesBox.appendChild(msgEl);
          messagesBox.scrollTop = messagesBox.scrollHeight;
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`${msg.username}`, {
              body: msg.text || "(Sent a message with media)",
              icon: "🐺"
            });
          }
        }
      });
    }, err => console.error("Listener error:", err));
}