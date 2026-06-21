// ==========================================
// FIREBASE INITIALIZATION & CONFIGURATION
// ==========================================

// Firebase Configuration (from user instructions)
const firebaseConfig = {
  apiKey: "AIzaSyC5L1H9iDpTxMGacuJKxYgq0v2CCZU2H-0",
  authDomain: "coin-project-fe9bb.firebaseapp.com",
  projectId: "coin-project-fe9bb",
  storageBucket: "coin-project-fe9bb.firebasestorage.app",
  messagingSenderId: "174808774579",
  appId: "1:174808774579:web:93ee7e6d221521b280fdc6",
  measurementId: "G-0Z7DWTMT14"
};

// Initialize Firebase using compat SDK
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ImgBB API Key
const IMGBB_API_KEY = "8ARNMqo7uXgU5NTweEmWn46Hvewjcp1PtqfXTKDZTj29";

// ==========================================
// APPLICATION STATE
// ==========================================
let currentUserData = null;
let userUnsubscribe = null;
let txUnsubscribe = null;
let adminUsersUnsubscribe = null;
let adminTxsUnsubscribe = null;
let allUsersMap = {}; // Maps uids to user data (for easy lookups)

// ==========================================
// INITIAL SETUP & ROUTING
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Navigation Event Listeners
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // Auth screen toggle listeners
  document.getElementById("go-to-register").addEventListener("click", (e) => {
    e.preventDefault();
    toggleAuthForm("register");
  });
  document.getElementById("go-to-login").addEventListener("click", (e) => {
    e.preventDefault();
    toggleAuthForm("login");
  });

  // Auth Form Submissions
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("register-form").addEventListener("submit", handleRegister);
  document.getElementById("btn-logout").addEventListener("click", handleLogout);

  // Transfer Form Submission
  document.getElementById("transfer-form").addEventListener("submit", handleTransferSubmit);

  // Autocomplete suggestions listeners
  const recipientInput = document.getElementById("transfer-recipient");
  recipientInput.addEventListener("focus", showSuggestions);
  recipientInput.addEventListener("input", filterSuggestions);
  
  // Hide suggestions dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("username-suggestions");
    const container = document.querySelector(".select-recipient-group");
    if (container && !container.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });

  // Settings & Contacts Listeners
  document.getElementById("profile-settings-form").addEventListener("submit", handleProfileUpdate);
  document.getElementById("add-contact-form").addEventListener("submit", handleAddContact);
  document.getElementById("avatar-file-input").addEventListener("change", handleAvatarUpload);

  // Emoji Picker Listeners
  document.getElementById("btn-open-emoji-picker").addEventListener("click", openEmojiPicker);
  document.getElementById("emoji-picker-close").addEventListener("click", closeEmojiPicker);
  document.getElementById("emoji-search").addEventListener("input", filterEmojis);
  document.getElementById("emoji-picker-modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("emoji-picker-modal")) closeEmojiPicker();
  });
  
  // Custom Emoji Submit Listener
  document.getElementById("btn-submit-custom-emoji").addEventListener("click", handleCustomEmojiSubmit);

  // Mobile Menu Drawer Navigation
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  document.getElementById("mobile-menu-toggle").addEventListener("click", () => {
    sidebar.classList.add("open");
    overlay.classList.remove("hidden");
  });

  const closeMobileMenu = () => {
    sidebar.classList.remove("open");
    overlay.classList.add("hidden");
  };

  document.getElementById("mobile-menu-close").addEventListener("click", closeMobileMenu);
  overlay.addEventListener("click", closeMobileMenu);

  // Auto-close sidebar on mobile when nav items are clicked
  document.querySelectorAll(".sidebar .nav-item").forEach(button => {
    button.addEventListener("click", closeMobileMenu);
  });

  // Initialize Emoji Grid
  renderEmojiGrid(ALL_EMOJIS);

  // Initialize Lucide Icons
  lucide.createIcons();
});

// Tab Switching logic
window.switchTab = function(tabId) {
  // Hide all tab contents
  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.add("hidden");
  });

  // Remove active state from all nav items
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.remove("active");
  });

  // Show active tab content
  const activeTab = document.getElementById(`tab-${tabId}`);
  if (activeTab) {
    activeTab.classList.remove("hidden");
  }

  // Add active state to corresponding sidebar/mobile navigation item
  const activeNavItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (activeNavItem) {
    activeNavItem.classList.add("active");
  }

  // Update Page Title
  const titles = {
    "dashboard": { title: "Dashboard", subtitle: "Welcome back to your wallet." },
    "transfer": { title: "Transfer Coins", subtitle: "Instantly share APX with other registered users." },
    "contacts-settings": { title: "Contacts & Settings", subtitle: "Configure your profile and manage saved recipients." },
    "admin-panel": { title: "Admin Control Panel", subtitle: "System statistics, user accounts, and complete transaction history." }
  };

  if (titles[tabId]) {
    document.getElementById("current-page-title").textContent = titles[tabId].title;
    document.getElementById("current-page-subtitle").textContent = titles[tabId].subtitle;
  }
};

function toggleAuthForm(formType) {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const title = document.getElementById("auth-title");
  const subtitle = document.getElementById("auth-subtitle");

  if (formType === "register") {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    title.textContent = "Start Your Journey";
    subtitle.textContent = "Sign up now and receive 1000 complimentary APX coins.";
  } else {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    title.textContent = "Welcome to the Future of Currency";
    subtitle.textContent = "Create an account or sign in to start sharing coins.";
  }
}

// Show loading screen helper
function showLoading(text) {
  const screen = document.getElementById("loading-screen");
  screen.querySelector(".loading-text").textContent = text;
  screen.classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loading-screen").classList.add("hidden");
}

// Toast notification helper
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = "info";
  if (type === "success") icon = "check-circle";
  if (type === "error") icon = "alert-circle";

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <div class="toast-message">${message}</div>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();

  // Slide-in animation frame
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Auto remove toast
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// ==========================================
// AUTHENTICATION LOGIC (SIGN IN / SIGN UP)
// ==========================================

// Safety net: if Firebase takes too long, stop the loading screen after 8 seconds
// so users aren't stuck on a blank spinning screen
const authSafetyTimeout = setTimeout(() => {
  const loadingScreen = document.getElementById("loading-screen");
  if (loadingScreen && !loadingScreen.classList.contains("hidden")) {
    console.warn("ApexCoins: Auth state took too long. Falling back to login screen.");
    hideLoading();
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("app-screen").classList.add("hidden");
    toggleAuthForm("login");
  }
}, 8000);

// Track Auth State changes
auth.onAuthStateChanged(async (user) => {
  clearTimeout(authSafetyTimeout); // Cancel the safety timeout since auth resolved
  showLoading("Authenticating user session...");
  
  // Clean up any existing listeners to prevent leaks
  if (userUnsubscribe) userUnsubscribe();
  if (txUnsubscribe) txUnsubscribe();
  if (adminUsersUnsubscribe) adminUsersUnsubscribe();
  if (adminTxsUnsubscribe) adminTxsUnsubscribe();

  if (user) {
    // User is logged in
    try {
      // Setup real-time listener on user's database document
      userUnsubscribe = db.collection("users").doc(user.uid).onSnapshot(async (userDoc) => {
        if (userDoc.exists) {
          currentUserData = userDoc.data();
          updateUserInterface();
        } else {
          // Document does not exist. (Edge case where account creation was interrupted)
          showToast("User details not found. Logging out...", "error");
          await auth.signOut();
        }
        hideLoading();
      }, (err) => {
        console.error("User doc listener failed:", err);
        showToast("Error sync user profile.", "error");
        hideLoading();
      });

      // Setup real-time listener on transactions involving the user
      setupTransactionsListener(user.uid);

      // Transition layouts
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("app-screen").classList.remove("hidden");
      switchTab("dashboard");
    } catch (err) {
      console.error("Error setting up user session: ", err);
      showToast("Error retrieving profile data.", "error");
      hideLoading();
    }
  } else {
    // User is logged out
    currentUserData = null;
    document.getElementById("app-screen").classList.add("hidden");
    document.getElementById("auth-screen").classList.remove("hidden");
    toggleAuthForm("login");
    hideLoading();
  }
});

// User Registration Handler
async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  if (username.length < 3) {
    showToast("Username must be at least 3 characters long.", "error");
    return;
  }

  showLoading("Creating account, please wait...");

  try {
    // 1. Enforce unique usernames (case-insensitive)
    const usernameQuerySnap = await db.collection("users")
      .where("username_lowercase", "==", username.toLowerCase())
      .get();
    
    if (!usernameQuerySnap.empty) {
      hideLoading();
      showToast("Username is already taken. Try another.", "error");
      return;
    }

    // 2. Determine if this user should be Admin (first user in database)
    const usersCollectionSnap = await db.collection("users").limit(1).get();
    const isFirstUser = usersCollectionSnap.empty;

    // 3. Create auth user credentials
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    // 4. Create Firestore user document with 1000 initial coins
    await db.collection("users").doc(uid).set({
      uid: uid,
      username: username,
      username_lowercase: username.toLowerCase(),
      email: email,
      coins: 1000,
      profilePic: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80", // Premium default placeholder
      isAdmin: isFirstUser,
      savedContacts: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showToast("Registration successful! Welcome.", "success");
    document.getElementById("register-form").reset();
  } catch (err) {
    console.error(err);
    let errorMsg = "Registration failed. Please check inputs.";
    if (err.code === "auth/email-already-in-use") errorMsg = "Email address is already in use.";
    if (err.code === "auth/weak-password") errorMsg = "Password must be stronger.";
    showToast(errorMsg, "error");
  } finally {
    hideLoading();
  }
}

// User Login Handler
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  showLoading("Authenticating...");

  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast("Logged in successfully!", "success");
    document.getElementById("login-form").reset();
  } catch (err) {
    console.error(err);
    let errorMsg = "Login failed. Check email and password.";
    if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
      errorMsg = "Incorrect email or password.";
    }
    showToast(errorMsg, "error");
  } finally {
    hideLoading();
  }
}

// User Logout Handler
async function handleLogout() {
  showLoading("Signing out...");
  try {
    await auth.signOut();
    showToast("Sign out successful.", "success");
  } catch (err) {
    console.error(err);
    showToast("Error signing out.", "error");
  } finally {
    hideLoading();
  }
}

// ==========================================
// UI UPDATE METHODS (REAL-TIME SYNC)
// ==========================================
// ==========================================
// AVATAR HELPER: renders img or emoji element
// ==========================================

// Returns true if the profilePic value is an emoji avatar
function isEmojiAvatar(pic) {
  return typeof pic === "string" && pic.startsWith("emoji:");
}

// Extract the emoji character from the stored value
function getEmoji(pic) {
  return pic.replace("emoji:", "");
}

// Render correct avatar in a container element:
// - If emoji, replace contents with an emoji div
// - If URL, set img.src
function renderAvatarInContainer(containerId, pic, sizeClass = "avatar") {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (isEmojiAvatar(pic)) {
    const emoji = getEmoji(pic);
    const largeCls = sizeClass === "avatar-large" ? "avatar-emoji-large" : "avatar-emoji";
    container.innerHTML = `<div class="${largeCls}">${emoji}</div>`;
  } else {
    container.innerHTML = `<img src="${pic}" alt="Avatar" class="${sizeClass}" id="${containerId}-img">`;
  }
}

// ==========================================
// UI UPDATE METHODS (REAL-TIME SYNC)
// ==========================================
function updateUserInterface() {
  if (!currentUserData) return;

  const pic = currentUserData.profilePic;

  // Sidebar: render emoji or image avatar
  const sidebarAvatarWrap = document.getElementById("sidebar-user-avatar");
  if (sidebarAvatarWrap) {
    if (isEmojiAvatar(pic)) {
      // Replace img with emoji div next to the img
      const emojiDiv = document.createElement("div");
      emojiDiv.className = "avatar-emoji";
      emojiDiv.textContent = getEmoji(pic);
      sidebarAvatarWrap.replaceWith(emojiDiv);
      emojiDiv.id = "sidebar-user-avatar";
    } else {
      sidebarAvatarWrap.src = pic;
    }
  }

  document.getElementById("sidebar-user-name").textContent = `@${currentUserData.username}`;
  document.getElementById("sidebar-user-role").textContent = currentUserData.isAdmin ? "Administrator" : "User";

  // Balance Header and Dashboard Updates
  document.getElementById("header-balance").textContent = currentUserData.coins.toLocaleString();
  document.getElementById("dash-balance").textContent = currentUserData.coins.toLocaleString();
  document.getElementById("dash-username").textContent = `@${currentUserData.username}`;
  document.getElementById("transfer-available-balance").textContent = currentUserData.coins.toLocaleString();

  // Settings tab: render avatar (emoji or image)
  renderAvatarInContainer("settings-avatar-display", pic, "avatar-large");
  document.getElementById("settings-username").value = currentUserData.username;
  document.getElementById("settings-email").value = currentUserData.email;

  // Render Saved Contacts List
  renderSavedContactsList();
}


// ==========================================
// TRANSACTION AND HISTORY ENGINE
// ==========================================
function setupTransactionsListener(uid) {
  // Query transfers involving user without orderBy to avoid needing composite index configurations
  const txQuery = db.collection("transfers").where("participants", "array-contains", uid);

  txUnsubscribe = txQuery.onSnapshot((snapshot) => {
    const txs = [];
    snapshot.forEach(doc => {
      txs.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort transactions by timestamp (descending) in JavaScript memory
    txs.sort((a, b) => {
      const timeA = a.timestamp ? (a.timestamp.seconds || a.timestamp.toMillis() / 1000) : 0;
      const timeB = b.timestamp ? (b.timestamp.seconds || b.timestamp.toMillis() / 1000) : 0;
      return timeB - timeA;
    });

    renderTransactions(txs);
    calculateUserStats(txs, uid);
  }, (err) => {
    console.error("Transfers listener failed: ", err);
  });
}

function renderTransactions(txs) {
  const dashTableBody = document.getElementById("dashboard-tx-table");
  const logsTableBody = document.getElementById("user-tx-logs-table");

  if (txs.length === 0) {
    const emptyRow = `<tr><td colspan="5" class="text-center text-muted">No transactions found. Make your first transfer!</td></tr>`;
    dashTableBody.innerHTML = emptyRow;
    logsTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No transactions logged yet.</td></tr>`;
    return;
  }

  let dashHtml = "";
  let logsHtml = "";

  // Render Dashboard Table (capped at 5 recent)
  const dashboardTxs = txs.slice(0, 5);
  dashboardTxs.forEach(tx => {
    const isSender = tx.senderUid === auth.currentUser.uid;
    const typeBadge = isSender 
      ? '<span class="badge badge-danger"><i data-lucide="arrow-up-right"></i> Sent</span>' 
      : '<span class="badge badge-success"><i data-lucide="arrow-down-left"></i> Received</span>';
    
    const counterparty = isSender ? `@${tx.receiverUsername}` : `@${tx.senderUsername}`;
    const amountClass = isSender ? "text-danger" : "text-success";
    const amountPrefix = isSender ? "-" : "+";
    const timestampStr = tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleString() : "Processing...";

    dashHtml += `
      <tr>
        <td>${typeBadge}</td>
        <td class="font-bold">${counterparty}</td>
        <td class="${amountClass} font-bold">${amountPrefix}${tx.amount.toLocaleString()} APX</td>
        <td>${timestampStr}</td>
        <td><span class="badge badge-info">Completed</span></td>
      </tr>
    `;
  });

  // Render Full Logs Table in Transfer Tab
  txs.forEach(tx => {
    const isSender = tx.senderUid === auth.currentUser.uid;
    const typeText = isSender ? "Sent To" : "Received From";
    const counterparty = isSender ? `@${tx.receiverUsername}` : `@${tx.senderUsername}`;
    const amountClass = isSender ? "text-danger font-bold" : "text-success font-bold";
    const amountPrefix = isSender ? "-" : "+";
    const timestampStr = tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleString() : "Processing...";

    logsHtml += `
      <tr>
        <td>${typeText}</td>
        <td class="font-bold">${counterparty}</td>
        <td class="${amountClass}">${amountPrefix}${tx.amount.toLocaleString()} APX</td>
        <td>${timestampStr}</td>
      </tr>
    `;
  });

  dashTableBody.innerHTML = dashHtml;
  logsTableBody.innerHTML = logsHtml;
  lucide.createIcons();
}

function calculateUserStats(txs, uid) {
  let totalSent = 0;
  let totalReceived = 0;

  txs.forEach(tx => {
    if (tx.senderUid === uid) {
      totalSent += tx.amount;
    } else if (tx.receiverUid === uid) {
      totalReceived += tx.amount;
    }
  });

  document.getElementById("stat-total-sent").textContent = `${totalSent.toLocaleString()} APX`;
  document.getElementById("stat-total-received").textContent = `${totalReceived.toLocaleString()} APX`;
}

// ==========================================
// TRANSFER COINS CONTROLLER
// ==========================================
async function handleTransferSubmit(e) {
  e.preventDefault();
  const recipientUsernameInput = document.getElementById("transfer-recipient").value.trim();
  const amountInput = document.getElementById("transfer-amount").value;
  const amount = parseInt(amountInput, 10);

  if (!recipientUsernameInput) {
    showToast("Please enter a recipient username.", "error");
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast("Please enter a valid amount greater than 0.", "error");
    return;
  }

  if (amount > currentUserData.coins) {
    showToast("Insufficient balance for this transaction.", "error");
    return;
  }

  if (recipientUsernameInput.toLowerCase() === currentUserData.username.toLowerCase()) {
    showToast("You cannot transfer coins to yourself.", "error");
    return;
  }

  showLoading("Processing transfer. Please wait...");

  try {
    // 1. Fetch recipient user doc to get their UID and correct username
    const recipientSnap = await db.collection("users")
      .where("username_lowercase", "==", recipientUsernameInput.toLowerCase())
      .get();

    if (recipientSnap.empty) {
      hideLoading();
      showToast(`User @${recipientUsernameInput} does not exist.`, "error");
      return;
    }

    const receiverDoc = recipientSnap.docs[0];
    const receiverData = receiverDoc.data();
    const receiverUid = receiverDoc.id;

    // 2. Perform transaction atomically in Firestore
    await db.runTransaction(async (transaction) => {
      const senderDocRef = db.collection("users").doc(currentUserData.uid);
      const receiverDocRef = db.collection("users").doc(receiverUid);

      const senderSnap = await transaction.get(senderDocRef);
      const receiverSnap = await transaction.get(receiverDocRef);

      if (!senderSnap.exists) throw new Error("Sender account not found.");
      if (!receiverSnap.exists) throw new Error("Receiver account not found.");

      const senderCoins = senderSnap.data().coins;
      if (senderCoins < amount) {
        throw new Error("Insufficient balance inside transaction.");
      }

      // Update balances
      transaction.update(senderDocRef, { coins: senderCoins - amount });
      transaction.update(receiverDocRef, { coins: receiverSnap.data().coins + amount });

      // Save transaction document
      const transferDocRef = db.collection("transfers").doc();
      transaction.set(transferDocRef, {
        senderUid: currentUserData.uid,
        senderUsername: currentUserData.username,
        receiverUid: receiverUid,
        receiverUsername: receiverData.username,
        amount: amount,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        participants: [currentUserData.uid, receiverUid]
      });
    });

    // 3. Success handling: automatically add recipient to saved contacts list if not already present
    let savedContacts = currentUserData.savedContacts || [];
    const lowercasedContacts = savedContacts.map(c => c.toLowerCase());
    
    if (!lowercasedContacts.includes(receiverData.username.toLowerCase())) {
      await db.collection("users").doc(currentUserData.uid).update({
        savedContacts: firebase.firestore.FieldValue.arrayUnion(receiverData.username)
      });
    }

    showToast(`Transferred ${amount.toLocaleString()} APX to @${receiverData.username}!`, "success");
    document.getElementById("transfer-form").reset();
    document.getElementById("username-suggestions").classList.add("hidden");
  } catch (err) {
    console.error("Transfer failed: ", err);
    showToast(err.message || "Transfer failed. Please try again.", "error");
  } finally {
    hideLoading();
  }
}

// ==========================================
// RECIPIENTS AUTOCOMPLETE SYSTEM
// ==========================================
function showSuggestions() {
  const dropdown = document.getElementById("username-suggestions");
  renderSuggestionsList(currentUserData.savedContacts || []);
  dropdown.classList.remove("hidden");
}

// Auto save contact button update on input
document.getElementById("transfer-recipient").addEventListener("input", (e) => {
  const val = e.target.value.trim();
  const saveBtn = document.getElementById("btn-save-recipient-shortcut");
  if (!saveBtn) return;
  
  if (val && currentUserData) {
    const isSaved = (currentUserData.savedContacts || [])
      .map(c => c.toLowerCase())
      .includes(val.toLowerCase());
    const isSelf = val.toLowerCase() === currentUserData.username.toLowerCase();
    
    if (!isSaved && !isSelf) {
      saveBtn.style.display = "inline-flex";
    } else {
      saveBtn.style.display = "none";
    }
  } else {
    saveBtn.style.display = "none";
  }
});

// Shortcut button listener
const shortcutBtn = document.getElementById("btn-save-recipient-shortcut");
if (shortcutBtn) {
  shortcutBtn.addEventListener("click", async () => {
    const contactUsername = document.getElementById("transfer-recipient").value.trim();
    if (!contactUsername) return;
    
    showLoading(`Saving @${contactUsername} to contacts...`);
    try {
      const userQuery = await db.collection("users")
        .where("username_lowercase", "==", contactUsername.toLowerCase())
        .get();

      if (userQuery.empty) {
        showToast(`User @${contactUsername} does not exist in our database.`, "error");
        return;
      }

      const actualUsername = userQuery.docs[0].data().username;
      await db.collection("users").doc(currentUserData.uid).update({
        savedContacts: firebase.firestore.FieldValue.arrayUnion(actualUsername)
      });

      showToast(`Added @${actualUsername} to contacts!`, "success");
      shortcutBtn.style.display = "none";
    } catch (err) {
      console.error(err);
      showToast("Error adding contact.", "error");
    } finally {
      hideLoading();
    }
  });
}

function filterSuggestions(e) {
  const val = e.target.value.toLowerCase();
  const savedContacts = currentUserData.savedContacts || [];
  
  if (!val) {
    renderSuggestionsList(savedContacts);
    return;
  }

  const filtered = savedContacts.filter(username => 
    username.toLowerCase().includes(val)
  );
  
  renderSuggestionsList(filtered);
}

function renderSuggestionsList(contacts) {
  const listContainer = document.getElementById("suggestions-list");
  
  if (contacts.length === 0) {
    listContainer.innerHTML = `<div class="suggestion-item text-muted text-sm">No matches found</div>`;
    return;
  }

  let html = "";
  contacts.forEach(contact => {
    html += `
      <div class="suggestion-item" data-username="${contact}">
        <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80" alt="avatar" class="avatar-suggestion">
        <span class="suggestion-username">@${contact}</span>
      </div>
    `;
  });

  listContainer.innerHTML = html;

  // Add click listeners to items
  listContainer.querySelectorAll(".suggestion-item").forEach(item => {
    item.addEventListener("click", () => {
      const username = item.getAttribute("data-username");
      document.getElementById("transfer-recipient").value = username;
      document.getElementById("username-suggestions").classList.add("hidden");
      const saveBtn = document.getElementById("btn-save-recipient-shortcut");
      if (saveBtn) saveBtn.style.display = "none";
    });
  });
}

// ==========================================
// PROFILE AND CONTACTS SETTINGS LOGIC
// ==========================================
async function handleProfileUpdate(e) {
  e.preventDefault();
  const newUsername = document.getElementById("settings-username").value.trim();

  if (!newUsername) return;
  if (newUsername.length < 3) {
    showToast("Username must be at least 3 characters.", "error");
    return;
  }

  if (newUsername.toLowerCase() === currentUserData.username.toLowerCase()) {
    showToast("Profile updated (no username changes).", "success");
    return;
  }

  showLoading("Checking username availability...");

  try {
    // Check uniqueness
    const snap = await db.collection("users")
      .where("username_lowercase", "==", newUsername.toLowerCase())
      .get();
    
    if (!snap.empty) {
      hideLoading();
      showToast("Username is already taken.", "error");
      return;
    }

    // Save changes
    await db.collection("users").doc(currentUserData.uid).update({
      username: newUsername,
      username_lowercase: newUsername.toLowerCase()
    });

    showToast("Username updated successfully!", "success");
  } catch (err) {
    console.error(err);
    showToast("Error updating profile username.", "error");
  } finally {
    hideLoading();
  }
}

// ImgBB Profile Picture Uploader
async function handleAvatarUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate image file type
  if (!file.type.startsWith("image/")) {
    showToast("Only image files are allowed.", "error");
    return;
  }

  const uploadStatus = document.getElementById("avatar-upload-status");
  uploadStatus.textContent = "Uploading to ImgBB...";
  showLoading("Uploading new profile picture...");

  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error("ImgBB API upload failure");
    }

    const resData = await response.json();
    const uploadedUrl = resData.data.url;

    // Update user doc in Firestore
    await db.collection("users").doc(currentUserData.uid).update({
      profilePic: uploadedUrl
    });

    showToast("Profile picture updated successfully!", "success");
    uploadStatus.textContent = "Profile picture updated.";
  } catch (err) {
    console.error("ImgBB upload failed: ", err);
    showToast("Upload failed. Check connection or api limits.", "error");
    uploadStatus.textContent = "Upload failed. Try again.";
  } finally {
    hideLoading();
  }
}

// Add Contact to Quick list
async function handleAddContact(e) {
  e.preventDefault();
  const contactUsername = document.getElementById("new-contact-username").value.trim();

  if (!contactUsername) return;

  if (contactUsername.toLowerCase() === currentUserData.username.toLowerCase()) {
    showToast("You cannot add yourself to contacts list.", "error");
    return;
  }

  // Check if already in saved list
  const existingContacts = currentUserData.savedContacts || [];
  if (existingContacts.map(c => c.toLowerCase()).includes(contactUsername.toLowerCase())) {
    showToast("Contact already in your saved contacts list.", "error");
    return;
  }

  showLoading("Looking up username...");

  try {
    // Verify user exists in database
    const snap = await db.collection("users")
      .where("username_lowercase", "==", contactUsername.toLowerCase())
      .get();

    if (snap.empty) {
      hideLoading();
      showToast(`User @${contactUsername} does not exist in our database.`, "error");
      return;
    }

    const actualUsername = snap.docs[0].data().username;

    // Add to Firestore array
    await db.collection("users").doc(currentUserData.uid).update({
      savedContacts: firebase.firestore.FieldValue.arrayUnion(actualUsername)
    });

    showToast(`Added @${actualUsername} to contacts!`, "success");
    document.getElementById("add-contact-form").reset();
  } catch (err) {
    console.error(err);
    showToast("Error adding contact.", "error");
  } finally {
    hideLoading();
  }
}

// Remove contact from Quick list
async function removeContact(username) {
  showLoading(`Removing @${username}...`);
  try {
    await db.collection("users").doc(currentUserData.uid).update({
      savedContacts: firebase.firestore.FieldValue.arrayRemove(username)
    });
    showToast(`Removed @${username} from contacts list.`, "success");
  } catch (err) {
    console.error(err);
    showToast("Error removing contact.", "error");
  } finally {
    hideLoading();
  }
}

// Render Saved Contacts List UI
function renderSavedContactsList() {
  const ul = document.getElementById("saved-contacts-ul");
  const contacts = currentUserData.savedContacts || [];

  if (contacts.length === 0) {
    ul.innerHTML = `<li class="empty-list-item text-muted">No saved contacts yet.</li>`;
    return;
  }

  let html = "";
  contacts.forEach(contact => {
    html += `
      <li class="contact-item">
        <div class="contact-info" onclick="quickFillRecipient('${contact}')">
          <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80" alt="avatar">
          <span>@${contact}</span>
        </div>
        <button class="btn-remove-contact" data-contact="${contact}" title="Delete contact">
          <i data-lucide="trash-2"></i>
        </button>
      </li>
    `;
  });

  ul.innerHTML = html;
  lucide.createIcons();

  // Attach remove buttons action
  ul.querySelectorAll(".btn-remove-contact").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const username = btn.getAttribute("data-contact");
      removeContact(username);
    });
  });
}

// Quick fill input helper on contact click
window.quickFillRecipient = function(username) {
  document.getElementById("transfer-recipient").value = username;
  switchTab("transfer");
  document.getElementById("transfer-amount").focus();
};
// All administration features migrated to admin.js

// ==========================================
// EMOJI PICKER SYSTEM
// ==========================================

// Full emoji list with labels (for search)
const ALL_EMOJIS = [
  // Faces & People
  { e: "😀", n: "grinning" }, { e: "😃", n: "smiley" }, { e: "😄", n: "smile" },
  { e: "😁", n: "beaming" }, { e: "😆", n: "laughing" }, { e: "😅", n: "sweat smile" },
  { e: "🤣", n: "rofl" }, { e: "😂", n: "joy" }, { e: "🙂", n: "slightly smiling" },
  { e: "😊", n: "blush" }, { e: "😇", n: "innocent" }, { e: "🥰", n: "love" },
  { e: "😍", n: "heart eyes" }, { e: "🤩", n: "star struck" }, { e: "😘", n: "kiss" },
  { e: "😎", n: "cool sunglasses" }, { e: "🤓", n: "nerd" }, { e: "🧐", n: "monocle" },
  { e: "😏", n: "smirk" }, { e: "😒", n: "unamused" }, { e: "😞", n: "disappointed" },
  { e: "😔", n: "pensive" }, { e: "😟", n: "worried" }, { e: "😕", n: "confused" },
  { e: "🙁", n: "frowning" }, { e: "😣", n: "persevere" }, { e: "😖", n: "confounded" },
  { e: "😫", n: "tired" }, { e: "😩", n: "weary" }, { e: "🥺", n: "pleading" },
  { e: "😢", n: "cry" }, { e: "😭", n: "sob" }, { e: "😤", n: "triumph" },
  { e: "😠", n: "angry" }, { e: "😡", n: "rage" }, { e: "🤬", n: "cursing" },
  { e: "🤯", n: "exploding head" }, { e: "😳", n: "flushed" }, { e: "🥵", n: "hot" },
  { e: "🥶", n: "cold" }, { e: "😱", n: "scream" }, { e: "😨", n: "fearful" },
  { e: "😰", n: "anxious" }, { e: "😓", n: "sweat" }, { e: "🤗", n: "hugs" },
  { e: "🤔", n: "thinking" }, { e: "🤭", n: "hand over mouth" }, { e: "🤫", n: "shush" },
  { e: "🤥", n: "lying" }, { e: "😶", n: "no mouth" }, { e: "😐", n: "neutral" },
  { e: "🫠", n: "melting" }, { e: "🥴", n: "woozy" }, { e: "😵", n: "dizzy" },
  { e: "🤑", n: "money mouth" }, { e: "🤒", n: "sick" }, { e: "🤢", n: "nauseated" },
  { e: "🤮", n: "vomit" }, { e: "🤧", n: "sneeze" }, { e: "🥱", n: "yawn" },
  { e: "😴", n: "sleep" }, { e: "🫥", n: "dotted" }, { e: "👻", n: "ghost" },
  { e: "💀", n: "skull" }, { e: "🤡", n: "clown" }, { e: "👽", n: "alien" },
  { e: "🤖", n: "robot" }, { e: "🎃", n: "halloween" }, { e: "😺", n: "cat smile" },
  { e: "😸", n: "cat grin" }, { e: "😹", n: "cat joy" }, { e: "😻", n: "cat love" },
  // Hand gestures & body
  { e: "👍", n: "thumbs up" }, { e: "👎", n: "thumbs down" }, { e: "👊", n: "fist" },
  { e: "✌️", n: "peace" }, { e: "🤞", n: "fingers crossed" }, { e: "🤙", n: "call me" },
  { e: "👋", n: "wave" }, { e: "🤚", n: "raised back hand" }, { e: "✋", n: "raised hand" },
  { e: "👏", n: "clap" }, { e: "🙌", n: "raising hands" }, { e: "🫶", n: "heart hands" },
  { e: "💪", n: "muscle" }, { e: "🦾", n: "mechanical arm" }, { e: "🖐️", n: "hand" },
  { e: "☝️", n: "index up" }, { e: "🤜", n: "right fist" }, { e: "🤝", n: "handshake" },
  // Animals
  { e: "🐶", n: "dog" }, { e: "🐱", n: "cat" }, { e: "🐭", n: "mouse" },
  { e: "🐹", n: "hamster" }, { e: "🐰", n: "rabbit" }, { e: "🦊", n: "fox" },
  { e: "🐻", n: "bear" }, { e: "🐼", n: "panda" }, { e: "🐨", n: "koala" },
  { e: "🐯", n: "tiger" }, { e: "🦁", n: "lion" }, { e: "🐮", n: "cow" },
  { e: "🐸", n: "frog" }, { e: "🐵", n: "monkey" }, { e: "🐔", n: "chicken" },
  { e: "🦅", n: "eagle" }, { e: "🦆", n: "duck" }, { e: "🦉", n: "owl" },
  { e: "🦄", n: "unicorn" }, { e: "🐝", n: "bee" }, { e: "🐙", n: "octopus" },
  { e: "🦈", n: "shark" }, { e: "🐬", n: "dolphin" }, { e: "🐳", n: "whale" },
  { e: "🦋", n: "butterfly" }, { e: "🐲", n: "dragon" }, { e: "🦖", n: "dinosaur" },
  // Food & Drink
  { e: "🍕", n: "pizza" }, { e: "🍔", n: "burger" }, { e: "🌮", n: "taco" },
  { e: "🍣", n: "sushi" }, { e: "🍜", n: "noodles" }, { e: "🍩", n: "donut" },
  { e: "🍦", n: "ice cream" }, { e: "🎂", n: "cake" }, { e: "🍎", n: "apple" },
  { e: "🍓", n: "strawberry" }, { e: "🍇", n: "grapes" }, { e: "🥑", n: "avocado" },
  { e: "🌶️", n: "chili" }, { e: "☕", n: "coffee" }, { e: "🧋", n: "bubble tea" },
  { e: "🥤", n: "drink" }, { e: "🍺", n: "beer" }, { e: "🥂", n: "champagne" },
  // Sports & Activities
  { e: "⚽", n: "soccer" }, { e: "🏀", n: "basketball" }, { e: "🏈", n: "football" },
  { e: "⚾", n: "baseball" }, { e: "🎾", n: "tennis" }, { e: "🏐", n: "volleyball" },
  { e: "🎯", n: "dart target" }, { e: "🎮", n: "gaming" }, { e: "🕹️", n: "joystick" },
  { e: "🏆", n: "trophy" }, { e: "🥇", n: "gold medal" }, { e: "🎲", n: "dice" },
  { e: "🎸", n: "guitar" }, { e: "🎧", n: "headphones" }, { e: "🎤", n: "mic" },
  { e: "🎬", n: "movie" }, { e: "📸", n: "camera" }, { e: "🚀", n: "rocket" },
  // Nature
  { e: "🌍", n: "earth" }, { e: "🌙", n: "moon" }, { e: "⭐", n: "star" },
  { e: "🌈", n: "rainbow" }, { e: "❄️", n: "snowflake" }, { e: "🌊", n: "wave" },
  { e: "🌸", n: "cherry blossom" }, { e: "🌺", n: "flower" }, { e: "🌻", n: "sunflower" },
  { e: "🍀", n: "clover" }, { e: "🌴", n: "palm tree" }, { e: "🔥", n: "fire" },
  { e: "💧", n: "water" }, { e: "⚡", n: "lightning" }, { e: "🌊", n: "ocean" },
  // Objects & Symbols
  { e: "💎", n: "diamond" }, { e: "👑", n: "crown" }, { e: "💰", n: "money bag" },
  { e: "💳", n: "credit card" }, { e: "🔑", n: "key" }, { e: "🛡️", n: "shield" },
  { e: "⚔️", n: "swords" }, { e: "🧲", n: "magnet" }, { e: "💡", n: "lightbulb" },
  { e: "📱", n: "phone" }, { e: "💻", n: "laptop" }, { e: "🖥️", n: "desktop" },
  { e: "🔮", n: "crystal ball" }, { e: "🎩", n: "top hat" }, { e: "🕶️", n: "sunglasses" },
  { e: "❤️", n: "heart red" }, { e: "🧡", n: "heart orange" }, { e: "💛", n: "heart yellow" },
  { e: "💚", n: "heart green" }, { e: "💙", n: "heart blue" }, { e: "💜", n: "heart purple" },
  { e: "🖤", n: "heart black" }, { e: "🤍", n: "heart white" }, { e: "💯", n: "100" },
  { e: "✨", n: "sparkles" }, { e: "🌟", n: "glowing star" }, { e: "🎉", n: "party" },
  { e: "🎊", n: "confetti" }, { e: "🎁", n: "gift" }, { e: "🌠", n: "shooting star" },
];

function openEmojiPicker() {
  document.getElementById("emoji-picker-modal").classList.remove("hidden");
  document.getElementById("emoji-search").value = "";
  renderEmojiGrid(ALL_EMOJIS);
  setTimeout(() => document.getElementById("emoji-search").focus(), 100);
}

function closeEmojiPicker() {
  document.getElementById("emoji-picker-modal").classList.add("hidden");
}

function filterEmojis(e) {
  const term = e.target.value.toLowerCase().trim();
  if (!term) {
    renderEmojiGrid(ALL_EMOJIS);
    return;
  }
  const filtered = ALL_EMOJIS.filter(item => item.n.includes(term) || item.e.includes(term));
  renderEmojiGrid(filtered);
}

function renderEmojiGrid(emojiList) {
  const grid = document.getElementById("emoji-grid");
  if (!grid) return;

  if (emojiList.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color: var(--text-muted); padding: 20px;">No emojis found</div>`;
    return;
  }

  let html = "";
  emojiList.forEach(item => {
    html += `<button class="emoji-btn" data-emoji="${item.e}" title="${item.n}">${item.e}</button>`;
  });
  grid.innerHTML = html;

  grid.querySelectorAll(".emoji-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      handleEmojiSelect(btn.getAttribute("data-emoji"));
    });
  });
}

async function handleEmojiSelect(emoji) {
  closeEmojiPicker();
  showLoading("Saving emoji avatar...");

  try {
    const emojiValue = `emoji:${emoji}`;
    await db.collection("users").doc(currentUserData.uid).update({
      profilePic: emojiValue
    });
    showToast(`Avatar set to ${emoji}!`, "success");
    document.getElementById("avatar-upload-status").textContent = `Emoji avatar active: ${emoji}`;
  } catch (err) {
    console.error("Emoji save failed:", err);
    showToast("Failed to save emoji avatar.", "error");
  } finally {
    hideLoading();
  }
}

async function handleCustomEmojiSubmit() {
  const inputEl = document.getElementById("custom-emoji-input");
  const value = inputEl.value.trim();
  if (!value) {
    showToast("Please enter or paste an emoji first.", "error");
    return;
  }
  inputEl.value = ""; // Clear input
  await handleEmojiSelect(value);
}
