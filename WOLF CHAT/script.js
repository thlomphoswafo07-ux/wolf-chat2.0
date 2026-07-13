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
          currentUsername = localStorage.getItem("wolf_currentUser") || user.displayName || user.email.split('@')[0];
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
  }, 70); // 70ms * 100 steps = Exactly 7,000ms (7 seconds)
}

// Toggle layout between Log In and Sign Up modes
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

// Standard form email authentication handler
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

    auth.createUserWithEmailAndPassword(email, password)
      .then(() => {
        localStorage.setItem("wolf_currentUser", currentUsername);
        localStorage.setItem("wolf_chatColor", userChatColor);
        localStorage.setItem("wolf_userPfp", userPfp);
      })
      .catch((error) => alert("Sign up error: " + error.message));

  } else {
    auth.signInWithEmailAndPassword(email, password)
      .catch((error) => alert("Login failed: " + error.message));
  }
}

// --- GOOGLE SIGN IN ---
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

// --- FACEBOOK SIGN IN ---
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
  
  if ("Notification" in window) {
    Notification.requestPermission();
  }
  
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

// Sidebar toggle handler
function toggleSidebarMenu() {
  const sidebar = document.getElementById("chat-sidebar");
  sidebar.classList.toggle("sidebar-hidden");
  sidebar.classList.toggle("sidebar-visible");
}

// Media menu toggle handler
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

// Switch current chat room
function switchChannel(channelName) {
  currentRoomNode = channelName;
  document.getElementById("current-room-display").innerText = `Room: ${channelName}`;
  
  const items = document.querySelectorAll(".navigation-item");
  items.forEach(btn => btn.classList.remove("active-room"));
  event.target.classList.add("active-room");
  
  if (db) listenToLiveMessages(currentRoomNode);
  toggleSidebarMenu();
}

// Profile panel values config
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

// Live cloud message listener stream
function listenToLiveMessages(roomName) {
  if (unsubscribeMessagesListener) unsubscribeMessagesListener();
  const messagesBox = document.getElementById("messages");
  messagesBox.innerHTML = "";

  let initialLoadComplete = false;

  unsubscribeMessagesListener = db.collection("wolf_messages")
    .where("room", "==", roomName)
    .orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          // Message tracking logic continues inside snapshot context block...
        }
      });
    });
} 