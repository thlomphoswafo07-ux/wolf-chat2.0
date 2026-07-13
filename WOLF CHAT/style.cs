/* --- GLOBAL RESETS & STYLES --- */
* {
  box-sizing: border-box;
  margin: 0; padding: 0;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

body {
  background: #060a0d;
  height: 100dvh; width: 100vw;
  display: flex; justify-content: center; align-items: center;
  color: #f0f4f8; overflow: hidden;
}

#desktop-ambient-viewport { position: relative; width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; }
#app-wallpaper-shroud { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }

/* --- LOADING SCREEN --- */
#loading-screen {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: #070c10; display: flex; flex-direction: column;
  justify-content: center; align-items: center; z-index: 10000;
}
.wolf-logo { font-size: 5.5rem; filter: drop-shadow(0 0 15px rgba(57, 255, 20, 0.4)); animation: smoothPulse 2.5s infinite ease-in-out; }
#loading-screen h2 { color: #39ff14; font-size: 1.1rem; font-weight: 800; letter-spacing: 5px; margin: 25px 0; text-shadow: 0 0 10px rgba(57,255,20,0.3); }
.progress-container { width: 240px; height: 4px; background: rgba(255, 255, 255, 0.05); border-radius: 10px; overflow: hidden; }
#progress-bar { width: 0%; height: 100%; background: linear-gradient(90deg, #39ff14, #00ebff); box-shadow: 0 0 10px #39ff14; transition: width 0.08s linear; }

.developer-credit-node {
  margin-top: 20px;
  font-family: monospace;
  font-size: 0.65rem;
  color: #526676;
  letter-spacing: 2px;
  font-weight: 700;
}

/* --- MAIN LAYOUT CONTAINER --- */
#chat-container {
  position: relative; z-index: 10; display: flex;
  background: rgba(13, 22, 29, 0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  width: 92vw; max-width: 1200px; height: 85vh; border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 25px 50px rgba(0,0,0,0.7);
  overflow: hidden; 
}

/* --- AUTHENTICATION SCREEN --- */
#auth-screen { position: relative; z-index: 15; width: 100%; max-width: 440px; padding: 20px; display: none; }
.auth-box { background: rgba(20, 32, 43, 0.85); backdrop-filter: blur(15px); padding: 40px 35px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); text-align: center; }
.auth-brand-header { margin-bottom: 30px; }
.brand-glyph { font-size: 3rem; display: block; margin-bottom: 10px; }
.auth-box h2 { font-size: 1.5rem; font-weight: 700; color: #fff; }

.input-group { text-align: left; margin-bottom: 20px; }
.input-group label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #8fa0af; display: block; margin-bottom: 8px; }
.auth-box input, #color-picker, .modal-body input, .modal-body select { width: 100%; padding: 14px 16px; background: rgba(10, 17, 23, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); color: #fff; border-radius: 8px; outline: none; }
.prime-action-btn { width: 100%; padding: 15px; background: #39ff14; color: #060a0d; border: none; font-weight: 700; border-radius: 8px; cursor: pointer; box-shadow: 0 0 12px rgba(57,255,20,0.3); }

/* --- SIDEBAR CHANNELS & USERS --- */
#chat-sidebar {
  width: 280px; height: 100%; background: #090f14;
  border-right: 1px solid rgba(255, 255, 255, 0.06); display: flex; flex-direction: column;
  position: absolute; left: 0; top: 0; 
  z-index: 200; 
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 15px 0 35px rgba(0,0,0,0.6);
}
.sidebar-hidden { transform: translateX(-100%); }
.sidebar-visible { transform: translateX(0); }

#sidebar-main-view { display: flex; flex-direction: column; height: 100%; width: 100%; }
.sidebar-header { padding: 24px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); flex-shrink: 0; }
.panel-title { font-size: 0.8rem; font-weight: 800; letter-spacing: 1.5px; color: #8fa0af; }

.sidebar-scrollable-zone { flex: 1; overflow-y: auto; padding: 20px 10px; }
.sidebar-scrollable-zone::-webkit-scrollbar { width: 4px; }
.sidebar-scrollable-zone::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }

.navigation-group { margin-bottom: 25px; }
.group-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #526676; padding-left: 10px; display: block; margin-bottom: 10px; }
.navigation-item { width: 100%; padding: 12px 14px; background: transparent; border: none; color: #b0c4d4; border-radius: 8px; text-align: left; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: background 0.15s; }
.navigation-item:hover { background: rgba(255,255,255,0.03); color: #fff; }
.active-room { background: rgba(255, 255, 255, 0.05); color: #fff; border-left: 3px solid #39ff14; }
.online-user { padding: 10px 14px; color: #e0eaf2; margin: 4px 0; background: rgba(255, 255, 255, 0.02); border-radius: 8px; display: flex; align-items: center; gap: 10px; font-size: 0.85rem; }

.sidebar-footer { padding: 18px 15px; border-top: 1px solid rgba(255, 255, 255, 0.06); background: #070b0e; flex-shrink: 0; }
.settings-trigger-btn { 
  width: 100%; padding: 12px; background: rgba(57, 255, 20, 0.05); 
  color: #39ff14; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 8px; 
  font-weight: 700; font-size: 0.88rem; cursor: pointer; text-align: center; transition: all 0.2s ease;
}
.settings-trigger-btn:hover { background: #39ff14; color: #060a0d; box-shadow: 0 0 10px rgba(57,255,20,0.4); }

/* --- CHAT VIEWPORT & HEADER --- */
#chat-main { flex: 1; display: flex; flex-direction: column; background: rgba(6, 11, 15, 0.3); overflow: hidden; position: relative; }
#chat-header { 
  height: 70px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; 
  background: #0c141b; border-bottom: 1px solid rgba(255, 255, 255, 0.05); z-index: 100; 
}
#hamburger-menu-btn { background: none; border: none; color: #39ff14; font-size: 1.4rem; cursor: pointer; padding: 4px; z-index: 60; transition: transform 0.2s; }
#hamburger-menu-btn:hover { transform: scale(1.1); }

.header-right-cluster { display: flex; align-items: center; gap: 20px; }

/* --- LOGIN TIME STATUS --- */
#session-status-display {
  font-family: monospace;
  color: #00ebff;
  font-size: 0.85rem;
  font-weight: 700;
  background: rgba(0, 235, 255, 0.04);
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(0, 235, 255, 0.12);
  display: flex;
  align-items: center;
  gap: 8px;
}

#current-room-display { font-weight: 700; color: #fff; font-size: 0.95rem; }
#user-display-container { display: flex; align-items: center; gap: 12px; }
#user-display { color: #8fa0af; font-size: 0.85rem; font-weight: 600; }
.user-pfp-small { width: 34px; height: 34px; border-radius: 50%; background: #0a1117; border: 2px solid #39ff14; display: flex; justify-content: center; align-items: center; font-size: 0.9rem; overflow: hidden; }

/* --- CHAT MESSAGES BLOCK --- */
#messages { flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
#messages::-webkit-scrollbar { width: 6px; }
#messages::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 20px; }

.msg { background: rgba(28, 44, 56, 0.45); border: 1px solid rgba(255, 255, 255, 0.03); padding: 12px 16px; border-radius: 12px; max-width: 75%; align-self: flex-start; word-wrap: break-word; }
.msg-header { display: flex; align-items: center; font-size: 0.78rem; margin-bottom: 6px; gap: 12px; justify-content: space-between; }
.msg-identity { display: flex; align-items: center; gap: 8px; }
.msg-time { color: #526676; }

#media-preview-tray { display: none; background: rgba(20, 32, 43, 0.95); padding: 12px 24px; border-top: 1px solid rgba(57, 255, 20, 0.2); align-items: center; justify-content: space-between; }
#preview-content img { max-height: 60px; border-radius: 6px; border: 1px solid #39ff14; }
.chat-img, .chat-sticker { max-width: 180px; max-height: 180px; border-radius: 8px; margin-top: 8px; display: block; }
.chat-sticker { font-size: 4rem; text-align: center; }

/* ==========================================================================
   --- EXTREME REAL WHATSAPP PILL ENGINE ENGINE ---
   ========================================================================== */
#input-area-wrapper { 
  background: transparent; 
  display: flex; flex-direction: column; position: relative; 
}

#input-area { 
  padding: 10px 14px; 
  display: flex; 
  gap: 10px; 
  align-items: center; 
  position: relative;
  background: transparent;
}

/* Rounded Box container containing the actual text bar and nested icons */
.whatsapp-input-pill-container {
  flex: 1;
  display: flex;
  align-items: center;
  background: #1f2c34; /* Real clean dark theme layout tint */
  border-radius: 25px;
  padding: 2px 14px;
  position: relative;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

/* Actual core Input text node hidden setup */
.whatsapp-input-pill-container input {
  flex: 1;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  color: #fff !important;
  font-size: 1rem;
  padding: 12px 0;
  width: 100%;
}

/* Attachment button sits cleanly inside the container box frame */
.utility-toggle-trigger {
  width: 32px; height: 32px; 
  background: transparent;
  border: none;
  color: #8596a0; font-size: 1.25rem; cursor: pointer;
  display: flex; justify-content: center; align-items: center; 
  flex-shrink: 0; transition: color 0.2s;
  margin-left: 6px;
}
.utility-toggle-trigger:hover { color: #fff; }
.utility-active-rotate { transform: rotate(45deg); color: #39ff14 !important; }

/* Character limit counter text hidden nicely inside */
#char-counter-node { 
  font-family: monospace; font-size: 0.72rem; color: #667781; 
  font-weight: 700; margin-left: 8px; pointer-events: none; 
}

/* Mic standalone layout circle toggle buttons */
.mic-standalone-btn {
  width: 46px; height: 46px; 
  background: #00a884; /* Beautiful native clean teal emerald color scheme */
  border: none; border-radius: 50%;
  font-size: 1.15rem; cursor: pointer; 
  display: flex; justify-content: center; align-items: center; 
  flex-shrink: 0; color: #fff; 
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  transition: transform 0.15s ease;
}
.mic-standalone-btn:hover { transform: scale(1.04); background: #00c49a; }

/* Transmit button sitting separately outside on the far right block */
.deck-transmit-btn { 
  width: 46px; height: 46px; 
  background: #00a884; /* Matches perfectly */
  color: #fff; border: none; font-size: 1.1rem; border-radius: 50%; 
  cursor: pointer; display: flex; justify-content: center; align-items: center; flex-shrink: 0;
  box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  transition: transform 0.15s ease;
}
.deck-transmit-btn:hover { transform: scale(1.04); background: #00c49a; }


#attachment-drawer-hud {
  position: absolute; bottom: 65px; left: 14px;
  background: rgba(35, 45, 54, 0.98); backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.05); padding: 16px;
  border-radius: 16px; width: 260px; box-shadow: 0 15px 30px rgba(0,0,0,0.5);
  display: none; flex-direction: column; gap: 8px; z-index: 100;
}
.drawer-action-node { width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; color: #fff; font-size: 0.88rem; font-weight: 600; text-align: left; cursor: pointer; }
.drawer-action-node:hover { background: rgba(255,255,255,0.06); border-color: #00ebff; }
.drawer-sticker-separator { text-align: center; margin: 8px 0 4px 0; }
.drawer-sticker-separator span { font-size: 0.65rem; color: #526676; font-weight: 800; letter-spacing: 1px; }
.sticker-grid-layout { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.sticker-item { background: none; border: 1px solid transparent; font-size: 1.4rem; padding: 6px; cursor: pointer; border-radius: 6px; }
.sticker-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(57,255,20,0.3); }

/* --- OVERLAY SETTINGS MODAL --- */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(3, 5, 8, 0.85); backdrop-filter: blur(8px); display: none; justify-content: center; align-items: center; z-index: 2000; }
.modal-box { background: rgba(20, 32, 43, 0.95); border: 1px solid rgba(255, 255, 255, 0.08); width: 90%; max-width: 420px; border-radius: 16px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; }
.modal-header h3 { color: #fff; font-size: 1.1rem; font-weight: 700; }
.close-modal-btn { background: none; border: none; color: #8fa0af; font-size: 1.1rem; cursor: pointer; }
.close-modal-btn:hover { color: #fff; }

/* --- SETTINGS ROW SPECIFICS --- */
.settings-pfp-uploader-row { display: flex; align-items: center; gap: 15px; margin-top: 8px; }
.save-profile-btn { width: 100%; padding: 12px; background: #39ff14; color: #060a0d; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; margin-top: 8px; transition: all 0.2s; }
.save-profile-btn:hover { background: #46ff24; box-shadow: 0 0 15px rgba(57, 255, 20, 0.6); }
.modal-divider { border: 0; height: 1px; background: rgba(255,255,255,0.05); margin: 20px 0; }
.logout-btn-modal { width: 100%; padding: 12px; background: rgba(255, 0, 127, 0.1); color: #ff007f; border: 1px solid rgba(255, 0, 127, 0.2); border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.logout-btn-modal:hover { background: rgba(255, 0, 127, 0.2); box-shadow: 0 0 12px rgba(255, 0, 127, 0.3); }

#typing-indicator { padding: 0 24px; font-size: 0.8rem; color: #39ff14; font-style: italic; height: 15px; }
.status-node { width: 8px; height: 8px; background: #39ff14; border-radius: 50%; display: inline-block; box-shadow: 0 0 8px #39ff14; }
.badge { background: rgba(57, 255, 20, 0.1); color: #39ff14; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; }

@keyframes smoothPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
.pulse { animation: statusPulse 2s infinite; }
@keyframes statusPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

/* ==========================================================================
   --- TABLET & MOBILE RESPONSIVE ENGINE ---
   ========================================================================== */

@media screen and (max-width: 1024px) {
  #chat-container {
    width: 96vw;
    height: 92vh;
  }
}

@media screen and (max-width: 768px) {
  html, body {
    height: 100dvh;
    width: 100vw;
    overflow: hidden;
  }

  #chat-container {
    position: absolute;
    top: 0; left: 0;
    width: 100vw;
    height: 100dvh;
    border-radius: 0px;
    border: none;
  }

  #chat-main { width: 100%; height: 100%; }
  #loading-screen h2 { font-size: 0.9rem; letter-spacing: 3px; }
  #auth-screen { max-width: 100%; padding: 15px; }
  .auth-box { padding: 30px 20px; }
  #chat-header { padding: 0 16px; height: 60px; }
  .header-right-cluster { gap: 10px; }
  #session-status-display { display: none; }
  .msg { max-width: 88%; padding: 10px 12px; }

  /* Precise mobile size tuning */
  #input-area {
    padding: 8px 10px;
    gap: 8px;
  }
  .whatsapp-input-pill-container {
    padding: 0px 12px;
  }
  .whatsapp-input-pill-container input {
    padding: 10px 0;
    font-size: 0.95rem;
  }
  .utility-toggle-trigger {
    width: 28px; height: 28px;
    font-size: 1.15rem;
  }
  .mic-standalone-btn, .deck-transmit-btn {
    width: 42px;
    height: 42px;
    font-size: 1.05rem;
  }
  #attachment-drawer-hud {
    width: calc(100% - 20px);
    left: 10px;
    bottom: 58px;
  }
}