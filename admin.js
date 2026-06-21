// ==========================================
// FIREBASE INITIALIZATION & CONFIGURATION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyC5L1H9iDpTxMGacuJKxYgq0v2CCZU2H-0",
  authDomain: "coin-project-fe9bb.firebaseapp.com",
  projectId: "coin-project-fe9bb",
  storageBucket: "coin-project-fe9bb.firebasestorage.app",
  messagingSenderId: "174808774579",
  appId: "1:174808774579:web:93ee7e6d221521b280fdc6",
  measurementId: "G-0Z7DWTMT14"
};

// Initialize Firebase using compat SDK (Firestore only — no Auth required)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================================
// APPLICATION STATE
// ==========================================
let adminUsersUnsubscribe = null;
let adminTxsUnsubscribe = null;
let allUsersMap = {};

// ==========================================
// INITIAL SETUP & ROUTING
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Navigation Event Listeners
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab");
      if (tabId) switchTab(tabId);
    });
  });

  // Admin Search filters
  document.getElementById("admin-user-search").addEventListener("input", filterAdminUsersTable);
  document.getElementById("admin-log-search").addEventListener("input", filterAdminLogsTable);

  // Admin Edit Modal listeners
  document.getElementById("admin-edit-modal-close").addEventListener("click", closeAdminEditModal);
  document.getElementById("admin-edit-modal-cancel").addEventListener("click", closeAdminEditModal);
  document.getElementById("admin-edit-user-form").addEventListener("submit", handleAdminEditUserSubmit);

  // Password reset button inside Modal
  document.getElementById("btn-send-password-reset").addEventListener("click", handleSendPasswordReset);

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

  document.querySelectorAll(".sidebar .nav-item").forEach(btn => {
    btn.addEventListener("click", closeMobileMenu);
  });

  // Start the admin panel directly — no login needed
  setupAdminListeners();
  switchTab("admin-users");

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
    "admin-users": { title: "Users Database", subtitle: "Manage registered user accounts, balances, and security." },
    "admin-logs": { title: "Global Transaction History", subtitle: "Live feed of all coin transfers on the network." }
  };

  if (titles[tabId]) {
    document.getElementById("current-page-title").textContent = titles[tabId].title;
    document.getElementById("current-page-subtitle").textContent = titles[tabId].subtitle;
  }
};

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

  setTimeout(() => { toast.classList.add("show"); }, 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
// No-op stubs (loading screen removed in no-auth mode)
function showLoading() {}
function hideLoading() {}

function isEmojiAvatar(pic) {
  return typeof pic === "string" && pic.startsWith("emoji:");
}

// Extract the emoji character from the stored value
function getEmoji(pic) {
  return pic.replace("emoji:", "");
}

// Render correct avatar HTML
function getAvatarHTML(pic, sizeClass = "avatar") {
  if (isEmojiAvatar(pic)) {
    const emoji = getEmoji(pic);
    const cls = sizeClass === "avatar-large" ? "avatar-emoji-large" : "avatar-emoji";
    return `<div class="${cls}">${emoji}</div>`;
  } else {
    return `<img src="${pic}" alt="avatar" class="${sizeClass}">`;
  }
}


// ==========================================
// DATABASE SYNCHRONIZATION
// ==========================================
function setupAdminListeners() {
  if (adminUsersUnsubscribe && adminTxsUnsubscribe) return;

  console.log("Setting up Admin database synchronization...");

  // Real-time synchronization of all user accounts
  adminUsersUnsubscribe = db.collection("users").onSnapshot((snapshot) => {
    const users = [];
    let totalCoinsCirculating = 0;
    
    snapshot.forEach(docSnap => {
      const user = docSnap.data();
      users.push(user);
      allUsersMap[user.uid] = user;
      totalCoinsCirculating += user.coins || 0;
    });

    // Update analytics cards
    document.getElementById("admin-stat-total-coins").textContent = `${totalCoinsCirculating.toLocaleString()} APX`;
    document.getElementById("admin-stat-total-users").textContent = `${users.length.toLocaleString()} Users`;
    
    renderAdminUsersTable(users);
  }, (err) => {
    console.error("Admin Users listener error: ", err);
    showToast("Permission denied loading users.", "error");
  });

  // Real-time synchronization of all system-wide transfers
  adminTxsUnsubscribe = db.collection("transfers").onSnapshot((snapshot) => {
    const txs = [];
    snapshot.forEach(docSnap => {
      txs.push({ id: docSnap.id, ...docSnap.data() });
    });
    
    // Sort transactions by timestamp (descending) in memory
    txs.sort((a, b) => {
      const timeA = a.timestamp ? (a.timestamp.seconds || a.timestamp.toMillis() / 1000) : 0;
      const timeB = b.timestamp ? (b.timestamp.seconds || b.timestamp.toMillis() / 1000) : 0;
      return timeB - timeA;
    });

    document.getElementById("admin-stat-total-txs").textContent = `${txs.length.toLocaleString()} Tx`;
    renderAdminLogsTable(txs);
  }, (err) => {
    console.error("Admin Transfers listener error: ", err);
  });
}

// Render Admin Users Database Table
function renderAdminUsersTable(users) {
  const tableBody = document.getElementById("admin-users-table-body");
  
  if (users.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No users found.</td></tr>`;
    return;
  }

  let html = "";
  users.forEach(user => {
    const roleBadge = user.isAdmin 
      ? '<span class="badge badge-success">Admin</span>' 
      : '<span class="badge badge-info">User</span>';

    html += `
      <tr class="admin-user-row" data-username="${user.username}" data-email="${user.email}">
        <td>${getAvatarHTML(user.profilePic)}</td>
        <td class="font-bold">@${user.username}</td>
        <td>${user.email}</td>
        <td class="font-bold text-cyan">${(user.coins || 0).toLocaleString()} APX</td>
        <td>${roleBadge}</td>
        <td>
          <button class="btn btn-secondary btn-sm edit-user-btn" data-uid="${user.uid}">
            <i data-lucide="edit-3"></i> Edit
          </button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
  lucide.createIcons();

  // Attach modal action edit buttons
  tableBody.querySelectorAll(".edit-user-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const uid = btn.getAttribute("data-uid");
      openAdminEditModal(uid);
    });
  });
}

// Render Global Transaction Logs
function renderAdminLogsTable(txs) {
  const tableBody = document.getElementById("admin-logs-table-body");
  
  if (txs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No transactions have occurred yet.</td></tr>`;
    return;
  }

  let html = "";
  txs.forEach(tx => {
    const timestampStr = tx.timestamp ? new Date(tx.timestamp.seconds * 1000).toLocaleString() : "Processing...";
    
    html += `
      <tr class="admin-log-row" data-sender="${tx.senderUsername}" data-receiver="${tx.receiverUsername}">
        <td>${timestampStr}</td>
        <td class="font-bold">@${tx.senderUsername}</td>
        <td class="font-bold">@${tx.receiverUsername}</td>
        <td class="text-success font-bold">+${tx.amount.toLocaleString()} APX</td>
        <td class="text-muted text-sm">${tx.id}</td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
  lucide.createIcons();
}

// Search filtration functions
function filterAdminUsersTable(e) {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll(".admin-user-row").forEach(row => {
    const username = row.getAttribute("data-username").toLowerCase();
    const email = row.getAttribute("data-email").toLowerCase();
    if (username.includes(term) || email.includes(term)) {
      row.classList.remove("hidden");
    } else {
      row.classList.add("hidden");
    }
  });
}

function filterAdminLogsTable(e) {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll(".admin-log-row").forEach(row => {
    const sender = row.getAttribute("data-sender").toLowerCase();
    const receiver = row.getAttribute("data-receiver").toLowerCase();
    if (sender.includes(term) || receiver.includes(term)) {
      row.classList.remove("hidden");
    } else {
      row.classList.add("hidden");
    }
  });
}

// Admin Modal controls
function openAdminEditModal(uid) {
  const user = allUsersMap[uid];
  if (!user) return;

  document.getElementById("edit-user-id").value = uid;
  document.getElementById("edit-user-email").value = user.email;
  document.getElementById("edit-user-username").value = user.username;
  document.getElementById("edit-user-coins").value = user.coins || 0;
  document.getElementById("edit-user-is-admin").checked = user.isAdmin || false;

  document.getElementById("admin-edit-modal").classList.remove("hidden");
}

function closeAdminEditModal() {
  document.getElementById("admin-edit-modal").classList.add("hidden");
  document.getElementById("admin-edit-user-form").reset();
}

// Handle Admin edits submission (updating username, coin balance, admin state)
async function handleAdminEditUserSubmit(e) {
  e.preventDefault();
  const uid = document.getElementById("edit-user-id").value;
  const username = document.getElementById("edit-user-username").value.trim();
  const coins = parseInt(document.getElementById("edit-user-coins").value, 10);
  const isAdmin = document.getElementById("edit-user-is-admin").checked;

  if (!uid || !username || isNaN(coins) || coins < 0) {
    showToast("Invalid inputs.", "error");
    return;
  }

  const originalUser = allUsersMap[uid];
  if (!originalUser) return;

  showLoading("Saving administrative updates...");

  try {
    // 1. Check username availability if it changed
    if (username.toLowerCase() !== originalUser.username.toLowerCase()) {
      const snap = await db.collection("users")
        .where("username_lowercase", "==", username.toLowerCase())
        .get();
      if (!snap.empty) {
        hideLoading();
        showToast("Username is already in use by another user.", "error");
        return;
      }
    }

    // 2. Perform update in Firestore
    await db.collection("users").doc(uid).update({
      username: username,
      username_lowercase: username.toLowerCase(),
      coins: coins,
      isAdmin: isAdmin
    });

    showToast(`Successfully updated account @${username}!`, "success");
    closeAdminEditModal();
  } catch (err) {
    console.error(err);
    showToast("Failed to update user profile.", "error");
  } finally {
    hideLoading();
  }
}

// Password reset not available without authentication
function handleSendPasswordReset() {
  showToast("Password reset requires user to log in from the main platform.", "error");
}
