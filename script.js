// ==========================================
// WOLF CHAT 2.0 - MAIN SCRIPT
// ==========================================

// --- FIREBASE & GLOBAL STATE ---
let currentUser = null;
let currentChatId = "general";
let activeDmPartnerUid = null;
let isDirectMessage = false;

let localStream = null;
let currentCall = null;
let peer = null;

let typingTimeout = null;
let typingUnsubscribe = null;

// DOM Elements
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");
const messagesContainer = document.getElementById("messages-container");
const chatTitle = document.getElementById("active-chat-title");
const typingIndicator = document.getElementById("typing-indicator-text");

// --- INITIALIZATION ---
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    setupUserPresence();
    initPeerJS();
    switchChannel("general", "General Room");
  } else {
    window.location.href = "login.html";
  }
});

// --- PRESENCE (ONLINE / OFFLINE) ---
function setupUserPresence() {
  if (!currentUser) return;
  const userRef = db.collection("users").doc(currentUser.uid);

  userRef.set({
    isOnline: true,
    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  window.addEventListener("beforeunload", () => {
    userRef.set({
      isOnline: false,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

// --- TYPING INDICATORS ---
if (msgInput) {
  msgInput.addEventListener("input", () => {
    if (!currentUser || !currentChatId) return;

    const typingRef = db.collection("typing_status").doc(`${currentChatId}_${currentUser.uid}`);

    if (msgInput.value.trim().length > 0) {
      typingRef.set({
        username: currentUser.displayName || currentUser.email.split("@")[0] || "Wolf",
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
  });
}

function listenForTyping() {
  if (typingUnsubscribe) typingUnsubscribe();
  if (!typingIndicator || !currentChatId) return;

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
        typingIndicator.innerText = `${typers.join(", ")} ${typers.length > 1 ? "are" : "is"} typing...`;
      } else {
        typingIndicator.innerText = "";
      }
    });
}

// --- CHANNEL & DM NAVIGATION ---
function switchChannel(channelId, channelName) {
  currentChatId = channelId;
  isDirectMessage = false;
  activeDmPartnerUid = null;

  if (chatTitle) chatTitle.innerText = channelName;
  listenForMessages();
  listenForTyping();
}

function openDirectMessage(partnerUid, partnerName) {
  activeDmPartnerUid = partnerUid;
  isDirectMessage = true;

  // Create unique DM Chat ID
  const ids = [currentUser.uid, partnerUid].sort();
  currentChatId = `dm_${ids[0]}_${ids[1]}`;

  if (chatTitle) chatTitle.innerText = `@ ${partnerName}`;
  listenForMessages();
  listenForTyping();
}

// --- MESSAGING SYSTEM ---
function listenForMessages() {
  if (!messagesContainer || !currentChatId) return;

  db.collection("messages")
    .where("chatId", "==", currentChatId)
    .orderBy("timestamp", "asc")
    .onSnapshot((snapshot) => {
      messagesContainer.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        renderMessage(data);
      });
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

function sendMessage() {
  if (!msgInput || msgInput.value.trim() === "") return;

  const text = msgInput.value.trim();
  msgInput.value = "";

  // Reset typing state
  db.collection("typing_status").doc(`${currentChatId}_${currentUser.uid}`).set({ isTyping: false }, { merge: true });

  db.collection("messages").add({
    text: text,
    senderUid: currentUser.uid,
    senderName: currentUser.displayName || currentUser.email.split("@")[0] || "Wolf",
    chatId: currentChatId,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

if (sendBtn) sendBtn.addEventListener("click", sendMessage);
if (msgInput) {
  msgInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
}

function renderMessage(data) {
  const isMe = data.senderUid === currentUser.uid;
  const msgDiv = document.createElement("div");
  msgDiv.style.margin = "8px 0";
  msgDiv.style.textAlign = isMe ? "right" : "left";

  msgDiv.innerHTML = `
    <div style="display: inline-block; background: ${isMe ? '#2e7d32' : '#333'}; color: #fff; padding: 8px 12px; border-radius: 8px; max-width: 70%;">
      <small style="display: block; font-size: 10px; opacity: 0.7;">${data.senderName}</small>
      <span>${data.text}</span>
    </div>
  `;
  messagesContainer.appendChild(msgDiv);
}

// --- PEERJS CALLING LOGIC ---
function initPeerJS() {
  peer = new Peer(currentUser.uid);

  peer.on("call", (incomingCall) => {
    const accept = confirm("Incoming Call! Do you want to answer?");
    if (accept) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
        localStream = stream;
        showCallModal();
        setLocalStream(stream);

        incomingCall.answer(stream);
        incomingCall.on("stream", (remoteStream) => {
          setRemoteStream(remoteStream);
        });
        currentCall = incomingCall;
      });
    }
  });
}

function startCall(isVideo) {
  if (!isDirectMessage || !activeDmPartnerUid) {
    alert("Select a user under Direct Messages to start a call!");
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true }).then((stream) => {
    localStream = stream;
    showCallModal();
    setLocalStream(stream);

    const call = peer.call(activeDmPartnerUid, stream);
    call.on("stream", (remoteStream) => {
      setRemoteStream(remoteStream);
    });
    currentCall = call;
  }).catch((err) => {
    alert("Could not access camera/microphone: " + err.message);
  });
}

function endCall() {
  if (currentCall) currentCall.close();
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
  }
  hideCallModal();
}

function showCallModal() {
  const modal = document.getElementById("call-modal");
  if (modal) modal.style.display = "flex";
}

function hideCallModal() {
  const modal = document.getElementById("call-modal");
  if (modal) modal.style.display = "none";
}

function setLocalStream(stream) {
  const localVid = document.getElementById("local-video");
  if (localVid) localVid.srcObject = stream;
}

function setRemoteStream(stream) {
  const remoteVid = document.getElementById("remote-video");
  if (remoteVid) remoteVid.srcObject = stream;
}
