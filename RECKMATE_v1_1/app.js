// Web Audio API Synthesized Sound Effects (No external audio file dependencies)
const soundFx = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },
  playTone(freq, type, duration, gainLevel = 0.15) {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainLevel, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  },
  move() { this.playTone(480, "sine", 0.08, 0.12); },
  capture() { this.playTone(320, "triangle", 0.12, 0.2); },
  check() { this.playTone(660, "sawtooth", 0.15, 0.15); },
  gameEnd() {
    this.playTone(520, "sine", 0.2, 0.2);
    setTimeout(() => this.playTone(680, "sine", 0.35, 0.2), 120);
  }
};
  loggedIn: false,
  user: null,
  sessionChecked: false,
  recoveryMode: false,
  recoveryTokens: null,
  forcePasswordChange: false,
  page: location.hash.slice(1) || "home",
  rating: 1000,
  games: 0,
  wins: 0,
  puzzlesSolved: 0,
  theme: localStorage.getItem("reck_theme") || "dark",
  game: new Chess(),
  selected: null,
  lastMove: null,
  gameEnded: false,
  orientation: "w",
  // Multiplayer state
  playMode: "multiplayer", // "multiplayer" or "local"
  mpRoom: null,
  mpColor: null,
  mpEventSource: null,
  mpClockTimer: null,
  mpOpenGames: [],
  puzzleIndex: 0,
  puzzleSelected: null
};

const puzzleData = [
  {
    fen: "6k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1",
    solution: {from:"d5", to:"f6"},
    moveText: "Nf6+"
  },
  {
    fen: "6k1/5ppp/8/8/8/2B5/5PPP/6K1 w - - 0 1",
    solution: {from:"c3", to:"g7"},
    moveText: "Bg7"
  },
  {
    fen: "r5k1/pp3ppp/2p5/8/8/2N5/PP3PPP/R5K1 w - - 0 1",
    solution: {from:"c3", to:"b5"},
    moveText: "Nb5"
  }
];

const symbols = {
  w:{p:"♙",n:"♘",b:"♗",r:"♖",q:"♕",k:"♔"},
  b:{p:"♟",n:"♞",b:"♝",r:"♜",q:"♛",k:"♚"}
};

const files = "abcdefgh";

document.documentElement.dataset.theme = state.theme;

function saveStats(){
  // Statistics will be stored in Supabase
  // when the real game and puzzle systems are implemented.
}

function nav(page){ location.hash = page; }

window.addEventListener("hashchange",()=>{
  state.page = location.hash.slice(1) || "home";
  state.selected = null;
  state.puzzleSelected = null;
  render();
});

function loginPage(){
  return `
    <section class="login-page">
      <div class="login-card">
        <div class="eyebrow">REC CHESS ARENA</div>

        <h1>RECK<span class="gold">MATE</span></h1>

        <p class="muted">
          Sign in to your college chess arena.
        </p>

        <form id="loginForm">

          <div class="input-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              placeholder="Enter your username"
              autocomplete="username"
              required
            >
          </div>

          <div class="input-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              required
            >
          </div>

          <button
            type="submit"
            class="btn primary login-button"
            id="loginButton"
          >
            Login
          </button>

          <p id="loginMessage" class="login-message"></p>
        </form>
        <button
           type="button"
           class="forgot-password-link"
           id="forgotPasswordButton"
           >
            Forgot Password?
          </button>
          <div class="modal-overlay"
           id="forgotPasswordModal"
            >
          <div class="modal-card">

           <div class="modal-header">
        <div>
          <div class="eyebrow">ACCOUNT RECOVERY</div>
          <h2>Forgot Password?</h2>
        </div>

      <button
        class="modal-close"
        id="closeForgotPassword"
        type="button"
      >
        ×
      </button>
    </div>

    <div class="modal-body">

      <p class="muted">
        Enter your RECKMATE username and we'll send
        a password recovery link to your registered email.
      </p>

      <label for="recoveryUsername">
        Username
      </label>

      <input
        id="recoveryUsername"
        type="text"
        placeholder="Enter your username"
        autocomplete="username"
      >

      <div
        id="recoveryMessage"
        class="form-message"
      ></div>

    </div>

    <div class="modal-actions">

      <button
        class="btn"
        id="cancelForgotPassword"
        type="button"
      >
        Cancel
      </button>

      <button
        class="btn primary"
        id="sendRecoveryButton"
        type="button"
      >
        Send Recovery Link
      </button>

    </div>

  </div>
</div>
      </div>
    </section>
  `;
}

function initLogin(){

  const form = document.getElementById("loginForm");
  const button = document.getElementById("loginButton");
  const message = document.getElementById("loginMessage");
  const forgotPasswordButton = document.getElementById("forgotPasswordButton");
  if (!form) return;

  if (forgotPasswordButton) {

  const recoveryModal =
    document.getElementById("forgotPasswordModal");

  const closeRecovery =
    document.getElementById("closeForgotPassword");

  const cancelRecovery =
    document.getElementById("cancelForgotPassword");
    const sendRecoveryButton =
  document.getElementById("sendRecoveryButton");

const recoveryUsername =
  document.getElementById("recoveryUsername");

const recoveryMessage =
  document.getElementById("recoveryMessage");

  forgotPasswordButton.onclick = () => {
    recoveryModal?.classList.add("active");
  };

  const closeModal = () => {
    recoveryModal?.classList.remove("active");
  };

  closeRecovery?.addEventListener(
    "click",
    closeModal
  );

  cancelRecovery?.addEventListener(
    "click",
    closeModal
  );

sendRecoveryButton?.addEventListener("click", async () => {

  const username = recoveryUsername?.value.trim();

  if (!username) {
    recoveryMessage.textContent =
      "Please enter your username.";
    return;
  }

  recoveryMessage.textContent = "";
  sendRecoveryButton.disabled = true;
  sendRecoveryButton.textContent = "Sending...";

  try {

    const response = await fetch("/api/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username
      })
    });

    const data = await response.json();

    if (!response.ok) {
      recoveryMessage.textContent =
        data.message ||
        "Unable to process password recovery.";

      return;
    }

    recoveryMessage.textContent =
      data.message ||
      "If an account exists with that username, a recovery link has been sent.";

  } catch (error) {

    console.error(
      "Password recovery error:",
      error
    );

    recoveryMessage.textContent =
      "Unable to connect to RECKMATE server.";

  } finally {

    sendRecoveryButton.disabled = false;
    sendRecoveryButton.textContent =
      "Send Recovery Link";
  }
});

  recoveryModal?.addEventListener(
    "click",
    (event) => {
      if (event.target === recoveryModal) {
        closeModal();
      }
    }
  );
}

  form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const username = document
      .getElementById("username")
      .value
      .trim();

    const password = document
      .getElementById("password")
      .value;

    message.textContent = "";
    button.disabled = true;
    button.textContent = "Logging in...";

    try {

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {

        message.textContent =
          data.message || "Invalid username or password.";

        button.disabled = false;
        button.textContent = "Login";

        return;
      }

      if (data.status === "success") {

  state.loggedIn = true;
  state.user = data.user;
  state.rating = data.user.rating;

  state.forcePasswordChange =
    data.user.must_change_password === true;

} else {

  state.loggedIn = false;
  state.user = null;
  state.forcePasswordChange = false;
}

      message.textContent = "Login successful!";

      render();

    } catch (error) {

      console.error("Login error:", error);

      message.textContent =
        "Unable to connect to RECKMATE server.";

      button.disabled = false;
      button.textContent = "Login";
    }
  });
}

function toast(message){
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),2200);
}

function initials(name){
  return name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
}

function layout(content){
  const header = document.querySelector(".topbar");
  const footer = document.querySelector(".footer");

  if (header) {
    header.style.display = state.loggedIn ? "" : "none";
  }

  if (footer) {
    footer.style.display = state.loggedIn ? "" : "none";
  }

  document.getElementById("app").innerHTML = content;
  const mainNav = document.querySelector(".main-nav");

if (mainNav) {

  const existingAdminButton =
    document.getElementById("adminNavButton");

  if (state.user?.role === "admin") {

    if (!existingAdminButton) {

      const adminButton = document.createElement("button");

      adminButton.id = "adminNavButton";
      adminButton.dataset.page = "admin";
      adminButton.textContent = "Admin";

      mainNav.appendChild(adminButton);
    }

  } else {

    if (existingAdminButton) {
      existingAdminButton.remove();
    }
  }
}

  document.querySelectorAll("[data-page]").forEach(el => {
    el.addEventListener("click", () => nav(el.dataset.page));
  });
  

  document.querySelectorAll(".main-nav button").forEach(el => {
    el.classList.toggle("active", el.dataset.page === state.page);
  });

  const topRating = document.getElementById("topRating");

  if (topRating && state.user) {
    topRating.textContent = state.user.rating;
  }

  if (state.user) {
    const avatar = document.getElementById("topAvatar");

    if (avatar) {
      avatar.textContent =
        state.user.full_name
          ? state.user.full_name.charAt(0).toUpperCase()
          : "?";
    }

    const profileChip = document.getElementById("profileChip");

    if (profileChip) {
       profileChip.onclick = () => {
     location.hash = "#profile";
     };
    }
  }

  const themeButton = document.getElementById("themeBtn");

  if (themeButton) {
    themeButton.onclick = () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = state.theme;
      localStorage.setItem("reck_theme", state.theme);
    };
  }


   async function performLogout(button = null) {

    if (button) {
      button.disabled = true;
      button.textContent = "Logging out...";
    }

    try {

      const response = await fetch("/api/logout", {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Logout request failed.");
      }

    } catch (error) {

      console.error("Logout error:", error);

      if (button) {
        button.disabled = false;
        button.textContent = "Logout";
      }

      toast("Unable to log out. Please try again.");
      return;
    }

    state.loggedIn = false;
    state.user = null;
    state.sessionChecked = true;

    const mobileMenu =
      document.getElementById("mobileMenu");

    if (mobileMenu) {
      mobileMenu.classList.remove("open");
    }

    render();
  }


  // Desktop Logout
  const logoutButton =
    document.getElementById("logoutButton");

  if (logoutButton) {

    logoutButton.disabled = false;
    logoutButton.textContent = "Logout";

    logoutButton.onclick = () =>
      performLogout(logoutButton);
  }


  // Mobile Logout
  const mobileLogoutButton =
    document.getElementById("mobileLogoutButton");

  if (mobileLogoutButton) {

    mobileLogoutButton.disabled = false;
    mobileLogoutButton.textContent = "Logout";

    mobileLogoutButton.onclick = () =>
      performLogout(mobileLogoutButton);
  }

  const menuToggle = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");

  if (menuToggle && mobileMenu) {
    menuToggle.onclick = () => {
      mobileMenu.classList.toggle("open");
    };
  }

  document.querySelectorAll("#mobileMenu a").forEach(link => {
    link.onclick = () => {
      mobileMenu.classList.remove("open");
    };
  });
}

function adminDashboard(){

  return `
    <section class="admin-page">

      <div class="page-head">
        <div>
          <div class="eyebrow">RECKMATE ADMIN</div>

          <h1>Admin Dashboard</h1>

          <p class="muted">
            Manage the REC Chess Arena.
          </p>
        </div>
      </div>

      <div class="admin-welcome card">

        <div>
          <div class="eyebrow">WELCOME BACK</div>

          <h2>
            ${state.user?.full_name || "Administrator"}
          </h2>

          <p class="muted">
            You are signed in as an administrator.
          </p>
        </div>

      </div>

      <div class="admin-stats">

        <div class="card admin-stat">
          <div class="stat-label">STUDENTS</div>
          <div class="stat-value">—</div>
        </div>

        <div class="card admin-stat">
          <div class="stat-label">GAMES</div>
          <div class="stat-value">—</div>
        </div>

        <div class="card admin-stat">
          <div class="stat-label">TOURNAMENTS</div>
          <div class="stat-value">—</div>
        </div>

      </div>

      <div class="card admin-section">

        <div class="section-head">
          <div>
            <div class="eyebrow">ACCOUNT MANAGEMENT</div>
            <h2>Students</h2>
          </div>

          <button
            class="btn primary"
            id="createStudentButton"
          >
            + Create Student
          </button>
        </div>

        <p class="muted">
          Create and manage student accounts for RECKMATE.
        </p>

      </div>

    </section>
  `;
}

function createStudentModal() {

  return `
    <div class="admin-modal-overlay" id="createStudentModal">

      <div class="admin-modal">

        <div class="admin-modal-head">

          <div>
            <div class="eyebrow">ACCOUNT MANAGEMENT</div>
            <h2>Create Student</h2>
          </div>

          <button
            type="button"
            class="admin-modal-close"
            id="closeCreateStudent"
            aria-label="Close"
          >
            ×
          </button>

        </div>

        <form id="createStudentForm">

          <div class="input-group">
            <label for="studentFullName">
              Full Name
            </label>

            <input
              type="text"
              id="studentFullName"
              placeholder="Enter student's full name"
              autocomplete="name"
              required
            >
          </div>

          <div class="input-group">
            <label for="studentRegistration">
              Registration Number
            </label>

            <input
              type="text"
              id="studentRegistration"
              placeholder="e.g. 23ME001"
              required
            >
          </div>

          <div class="input-group">
            <label for="studentUsername">
              Username
            </label>

            <input
              type="text"
              id="studentUsername"
              placeholder="Choose a username"
              autocomplete="username"
              required
            >
          </div>

          <div class="input-group">
            <label for="studentPassword">
              Initial Password
            </label>

            <input
              type="password"
              id="studentPassword"
              placeholder="Minimum 8 characters"
              autocomplete="new-password"
              minlength="8"
              required
            >
          </div>

          
            <div class="input-group">
            <label for="studentRecoveryEmail">
              Recovery Email
            </label>

            <input
              type="email"
              id="studentRecoveryEmail"
              placeholder="Student's email address"
              autocomplete="email"
              required
            >
          </div>
          <p
            id="createStudentMessage"
            class="login-message"
          ></p>

          <div class="admin-modal-actions">

            <button
              type="button"
              class="btn"
              id="cancelCreateStudent"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="btn primary"
              id="submitCreateStudent"
            >
              Create Account
            </button>

          </div>

        </form>

      </div>

    </div>
  `;
}


function initAdminDashboard() {

  const createButton =
    document.getElementById("createStudentButton");

  if (!createButton) return;

  createButton.onclick = () => {

    const existingModal =
      document.getElementById("createStudentModal");

    if (existingModal) return;

    document.body.insertAdjacentHTML(
      "beforeend",
      createStudentModal()
    );

    initCreateStudentForm();
  };
}

function initCreateStudentForm() {

  const modal =
    document.getElementById("createStudentModal");

  const form =
    document.getElementById("createStudentForm");

  const closeButton =
    document.getElementById("closeCreateStudent");

  const cancelButton =
    document.getElementById("cancelCreateStudent");

  const submitButton =
    document.getElementById("submitCreateStudent");

  const message =
    document.getElementById("createStudentMessage");


  function closeModal() {

    modal?.remove();

  }


  closeButton?.addEventListener(
    "click",
    closeModal
  );

  cancelButton?.addEventListener(
    "click",
    closeModal
  );


  modal?.addEventListener("click", (event) => {

    if (event.target === modal) {
      closeModal();
    }

  });


  form?.addEventListener("submit", async (event) => {

    event.preventDefault();

    const fullName =
      document
        .getElementById("studentFullName")
        .value
        .trim();

    const registrationNo =
      document
        .getElementById("studentRegistration")
        .value
        .trim();

    const username =
      document
        .getElementById("studentUsername")
        .value
        .trim();
    const recoveryEmail =
     document
       .getElementById("studentRecoveryEmail")
       .value
       .trim()
       .toLowerCase();

    const password =
      document
        .getElementById("studentPassword")
        .value;


    message.textContent = "";
    submitButton.disabled = true;
    submitButton.textContent = "Creating...";


    try {

      const response = await fetch(
        "/api/admin/students",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            full_name: fullName,
            registration_no: registrationNo,
            username: username,
            password: password,
            recovery_email: recoveryEmail
          })
        }
      );


      const data =
        await response.json();


      if (!response.ok) {

        message.textContent =
          data.message ||
          "Unable to create student account.";

        submitButton.disabled = false;
        submitButton.textContent =
          "Create Account";

        return;
      }


      message.textContent =
        "Student account created successfully!";


      form.reset();

      submitButton.textContent =
        "Created ✓";


      setTimeout(() => {

        closeModal();

      }, 1200);


    } catch (error) {

      console.error(
        "Create student error:",
        error
      );

      message.textContent =
        "Unable to connect to RECKMATE server.";

      submitButton.disabled = false;
      submitButton.textContent =
        "Create Account";
    }

  });
}

function home(){
return `<section class="hero">
  <div class="hero-card">
    <div class="eyebrow">REC CHESS ARENA</div>
    <h1>PLAY.<br>COMPETE.<br><span class="gold">RECKMATE.</span></h1>
    <p class="lead">A dedicated chess arena for the REC community — rated games, puzzles, bots, leaderboards and tournaments in one place.</p>
    <div class="actions">
      <button class="btn primary" data-page="play">Play Chess</button>
      <button class="btn" data-page="puzzles">Solve a Puzzle</button>
      <button class="btn ghost" data-page="leaderboard">View Leaderboard</button>
    </div>
  </div>
  <div class="hero-card">
    <div class="eyebrow">YOUR CLUB CARD</div>
    <div class="profile-main" style="margin-top:22px">
  <div class="big-avatar">
    ${(state.user?.full_name || "Player").charAt(0).toUpperCase()}
  </div>

  <div>
    <h2>${state.user?.full_name || "Player"}</h2>
    <div class="muted">REC Chess Community member</div>
  </div>
</div>
    <div class="stats" style="grid-template-columns:1fr 1fr;margin-top:25px">
      <div class="stat"><b>${state.rating}</b><span>Rating</span></div>
      <div class="stat"><b>${state.games}</b><span>Games</span></div>
      <div class="stat"><b>${state.wins}</b><span>Wins</span></div>
      <div class="stat"><b>${state.puzzlesSolved}</b><span>Puzzles</span></div>
    </div>
  </div>
</section>
<section class="stats">
  <div class="stat"><b>6+</b><span>Club members</span></div>
  <div class="stat"><b>♟</b><span>Online chess</span></div>
  <div class="stat"><b>∞</b><span>Practice puzzles</span></div>
  <div class="stat"><b>🏆</b><span>Club tournaments</span></div>
</section>
<section class="section">
  <div class="grid">
    <div class="card feature"><div class="feature-icon">⚔️</div><div><h3>Rated Chess</h3><p class="muted">Challenge club members and climb the internal leaderboard.</p></div></div>
    <div class="card feature"><div class="feature-icon">🧩</div><div><h3>Puzzles</h3><p class="muted">Build tactical pattern recognition and your puzzle streak.</p></div></div>
    <div class="card feature"><div class="feature-icon">🤖</div><div><h3>Play Bots</h3><p class="muted">Practice whenever no club opponent is online.</p></div></div>
  </div>
</section>`;
}

function leaderboard(){
  return `<div class="page-title">
    <div class="eyebrow">COMPETE</div>
    <h1>Leaderboard</h1>
    <p>Live rankings from the college arena. Play online matches to climb the board.</p>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Rating</th>
          <th>Role</th>
        </tr>
      </thead>
      <tbody id="leaderboardTbody">
        <tr><td colspan="4" class="muted" style="text-align:center; padding:24px;">Loading leaderboard...</td></tr>
      </tbody>
    </table>
  </div>`;
}

async function loadLeaderboardData() {
  const tbody = document.getElementById("leaderboardTbody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/leaderboard");
    const data = await res.json();
    if (!res.ok || data.status !== "success" || !data.players.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="muted" style="text-align:center; padding:20px;">No players ranked yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.players.map((p, idx) => `
      <tr>
        <td class="rank">${idx + 1}</td>
        <td>
          <div class="player">
            <span class="mini-avatar">${initials(p.full_name || p.username)}</span>
            <strong>${p.username}</strong>
            ${p.role === 'admin' ? '<span class="tag" style="margin-left:6px; font-size:11px; padding:2px 6px;">ADMIN</span>' : ''}
          </div>
        </td>
        <td><strong style="color:var(--accent); font-size:15px;">${p.rating || 1000}</strong></td>
        <td style="text-transform:capitalize; color:var(--muted);">${p.role}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="muted" style="text-align:center; padding:20px;">Unable to load leaderboard.</td></tr>`;
  }
}

async function loadMatchHistory() {
  const container = document.getElementById("profileMatchHistory");
  if (!container) return;

  try {
    const res = await fetch("/api/matches");
    const data = await res.json();
    if (!res.ok || data.status !== "success" || !data.games || !data.games.length) {
      container.innerHTML = `<div class="muted">No online matches recorded yet. Play a game in the arena to see your history!</div>`;
      return;
    }

    const currentUsername = state.user?.username;
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${data.games.map(g => {
          const isWhite = g.white_username === currentUsername;
          const won = (g.winner === 'white' && isWhite) || (g.winner === 'black' && !isWhite);
          const draw = g.winner === 'draw';
          const opponent = isWhite ? g.black_username : g.white_username;
          const resultBadge = draw ? '<span class="tag" style="background:#555; color:#fff;">DRAW</span>'
                            : won ? '<span class="tag" style="background:#2e7d32; color:#fff;">VICTORY</span>'
                            : '<span class="tag" style="background:#c62828; color:#fff;">DEFEAT</span>';

          const dateStr = g.ended_at ? new Date(g.ended_at).toLocaleDateString() : '';

          return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:var(--panel2); border:1px solid var(--border); border-radius:10px;">
              <div>
                ${resultBadge}
                <span style="margin-left:10px; font-weight:600;">vs ${opponent || 'Opponent'}</span>
                <span class="muted" style="font-size:12px; margin-left:8px;">(${g.time_control || '10+0'})</span>
              </div>
              <div class="muted" style="font-size:13px;">${dateStr}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="muted">Unable to load match history.</div>`;
  }
}

function createBoard(game, options={}){
  const {
    puzzle=false,
    orientation=state.orientation,
    onSquare=null
  } = options;

  const board = document.createElement("div");
  board.className = puzzle ? "board puzzle-board" : "board";

  const rankOrder = orientation==="w" ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8];
  const fileOrder = orientation==="w" ? [...files] : [...files].reverse();

  for(const rank of rankOrder){
    for(const file of fileOrder){
      const square = file + rank;
      const el = document.createElement("button");
      el.type = "button";
      el.className = `square ${((files.indexOf(file)+rank)%2===0) ? "light" : "dark"}`;
      el.dataset.square = square;
      el.setAttribute("aria-label",square);

      const piece = game.get(square);
      if(piece){
        const span = document.createElement("span");
        span.className = `piece ${piece.color==="w" ? "white" : "black"}`;
        span.textContent = symbols[piece.color][piece.type];
        el.appendChild(span);
      }

      if(!puzzle){
        if(state.selected===square) el.classList.add("selected");
        if(state.lastMove && (state.lastMove.from===square || state.lastMove.to===square)) el.classList.add("last");

        if(state.selected){
          const legal = game.moves({square:state.selected,verbose:true});
          const target = legal.find(m=>m.to===square);
          if(target) el.classList.add(piece ? "capture" : "legal");
        }
      }

      el.addEventListener("click",()=>onSquare && onSquare(square));
      board.appendChild(el);
    }
  }
  return board;
}

function play(){
  return `
    <div class="page-title">
      <div class="eyebrow">CHESS ARENA</div>
      <h1>Play Chess</h1>
      <p>Challenge other college students in real-time or practice on the local board.</p>
    </div>

    <div class="play-mode-switch" style="display:flex; gap:10px; margin-bottom: 24px;">
      <button class="btn ${state.playMode==='multiplayer'?'primary':''}" id="btnModeMultiplayer">⚔️ Online Multiplayer</button>
      <button class="btn ${state.playMode==='local'?'primary':''}" id="btnModeLocal">♟️ Local Practice</button>
    </div>

    ${state.playMode === "multiplayer" ? multiplayerView() : localPlayView()}
  `;
}

function localPlayView() {
  return `
    <div class="play-layout">
      <div class="board-shell">
        <div id="boardMount"></div>
        <div id="boardStatus" class="board-status">White to move · Select a white piece.</div>
        <div class="actions">
          <button class="btn primary" id="newGame">New Game</button>
          <button class="btn" id="undo">Undo</button>
          <button class="btn" id="flip">Flip Board</button>
        </div>
      </div>
      <div class="chess-side">
        <div class="clock">
          <div><span class="muted">Black</span><b id="blackClock">10:00</b></div>
          <div><span class="muted">White</span><b id="whiteClock">10:00</b></div>
        </div>
        <div class="card">
          <span class="turn-badge" id="turnBadge">White to move</span>
          <h3 style="margin-top:14px">Game</h3>
          <div class="actions">
            <button class="btn" id="resign">Resign</button>
            <button class="btn" id="draw">Offer Draw</button>
          </div>
        </div>
        <div class="card"><h3>Moves</h3><div class="moves" id="moves"></div></div>
      </div>
    </div>
  `;
}

function multiplayerView() {
  if (!state.mpRoom) {
    return `
      <div class="mp-lobby" style="display:grid; grid-template-columns: minmax(300px, 1fr) minmax(300px, 1.2fr); gap: 24px;">
        <div class="card" style="padding: 24px;">
          <div class="eyebrow">CREATE A MATCH</div>
          <h2 style="margin: 8px 0 16px;">Create Game</h2>
          
          <label style="display:block; margin: 12px 0 6px; font-weight:600; font-size:14px;">Time Control</label>
          <select id="mpTimeControl" style="width:100%; padding:10px 12px; background:var(--panel2); color:var(--text); border:1px solid var(--border); border-radius:8px;">
            <option value="10+0">10 min · Rapid</option>
            <option value="5+3">5+3 · Blitz</option>
            <option value="3+2">3+2 · Blitz</option>
            <option value="15+10">15+10 · Classical</option>
          </select>

          <label style="display:block; margin: 14px 0 6px; font-weight:600; font-size:14px;">Play As</label>
          <select id="mpPreferredColor" style="width:100%; padding:10px 12px; background:var(--panel2); color:var(--text); border:1px solid var(--border); border-radius:8px;">
            <option value="random">🎲 Random Color</option>
            <option value="white">⚪ White</option>
            <option value="black">⚫ Black</option>
          </select>

          <div style="margin: 18px 0;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="mpIsPrivate">
              <span>Private Match (Invite with Code)</span>
            </label>
          </div>

          <button class="btn primary full-width" id="btnCreateGame" style="margin-top:10px;">Create Game</button>

          <hr style="border:0; border-top:1px solid var(--border); margin: 24px 0;">

          <div class="eyebrow">DIRECT INVITE</div>
          <h3 style="margin: 6px 0 12px;">Join with Code</h3>
          <div style="display:flex; gap:8px;">
            <input type="text" id="mpRoomCodeInput" placeholder="Enter 6-letter code" style="flex:1; padding:10px 12px; text-transform:uppercase; background:var(--panel2); color:var(--text); border:1px solid var(--border); border-radius:8px;">
            <button class="btn" id="btnJoinGameCode">Join</button>
          </div>
        </div>

        <div class="card" style="padding: 24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <div>
              <div class="eyebrow">ARENA LOBBY</div>
              <h2 style="margin: 4px 0 0;">Open Challenges</h2>
            </div>
            <button class="btn" id="btnRefreshLobby" style="padding: 6px 12px; font-size:13px;">🔄 Refresh</button>
          </div>

          <div id="mpOpenChallenges" style="display:flex; flex-direction:column; gap:10px;">
            <div class="muted" style="padding:16px; text-align:center;">Loading open challenges...</div>
          </div>
        </div>
      </div>
    `;
  }

  // Active or waiting multiplayer match view
  const room = state.mpRoom;
  const isWhite = state.mpColor === "white";
  const isBlack = state.mpColor === "black";
  const whiteName = room.white ? room.white.username : "Waiting for player...";
  const blackName = room.black ? room.black.username : "Waiting for player...";

  return `
    <div class="play-layout">
      <div class="board-shell">
        <div id="boardMount"></div>
        <div id="boardStatus" class="board-status">
          ${room.status === 'waiting' ? `Waiting for an opponent to join. Share room code: <b style="color:var(--accent); font-size:17px; letter-spacing:1px;">${room.code}</b>` : 'Game in progress.'}
        </div>
        <div class="actions">
          <button class="btn" id="btnLeaveGame">Leave Match</button>
          <button class="btn" id="flip">Flip Board</button>
        </div>
      </div>

      <div class="chess-side">
        <div class="card" style="margin-bottom:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div><span class="muted">Room Code:</span> <b style="color:var(--accent);">${room.code}</b></div>
            <span class="tag" style="background:var(--panel2); padding:4px 8px; border-radius:6px; font-size:12px;">${room.timeControl}</span>
          </div>
        </div>

        <div class="clock">
          <div style="${room.turn==='b' && room.status==='active' ? 'border:1px solid var(--accent);' : ''}">
            <span class="muted">⚫ ${blackName}</span>
            <b id="blackClock">${formatClock(room.blackTime)}</b>
          </div>
          <div style="${room.turn==='w' && room.status==='active' ? 'border:1px solid var(--accent);' : ''}">
            <span class="muted">⚪ ${whiteName}</span>
            <b id="whiteClock">${formatClock(room.whiteTime)}</b>
          </div>
        </div>

        <div class="card">
          <span class="turn-badge" id="turnBadge">${room.status === 'waiting' ? 'Waiting for opponent' : (room.turn === 'w' ? 'White to move' : 'Black to move')}</span>
          <div style="margin: 12px 0 6px; font-size:14px;">
            You are playing as: <b style="color:var(--accent); text-transform:capitalize;">${state.mpColor || 'Spectator'}</b>
          </div>

          ${room.drawOfferedBy && room.drawOfferedBy !== state.mpColor ? `
            <div style="background:rgba(212,175,55,0.15); border:1px solid var(--accent); padding:10px; border-radius:8px; margin: 10px 0;">
              <div>Opponent offered a draw.</div>
              <div style="display:flex; gap:8px; margin-top:8px;">
                <button class="btn primary" id="btnAcceptDraw" style="padding:4px 10px; font-size:12px;">Accept</button>
                <button class="btn" id="btnDeclineDraw" style="padding:4px 10px; font-size:12px;">Decline</button>
              </div>
            </div>
          ` : ''}

          <div class="actions" style="margin-top:14px;">
            <button class="btn" id="btnMpResign" ${room.status!=='active'?'disabled':''}>Resign</button>
            <button class="btn" id="btnMpDraw" ${room.status!=='active' || room.drawOfferedBy?'disabled':''}>Offer Draw</button>
          </div>
        </div>

        <div class="card">
          <h3>Moves</h3>
          <div class="moves" id="moves"></div>
        </div>
      </div>
    </div>
  `;
}

function formatClock(seconds) {
  if (typeof seconds !== "number" || isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function initGame(){
  state.game = new Chess();
  state.selected = null;
  state.lastMove = null;
   state.gameEnded = false;
  renderPlayBoard();
}

function renderPlayBoard(){
  const mount=document.getElementById("boardMount");
  if(!mount) return;

  mount.innerHTML="";
  mount.appendChild(createBoard(state.game,{
    onSquare: state.playMode === "multiplayer" ? handleMpSquare : handlePlaySquare
  }));

  const history=state.game.history();
  document.getElementById("moves").innerHTML = history.length
  ? Array.from({length: Math.ceil(history.length / 2)}, (_, i) => {
      const white = history[i * 2] || "";
      const black = history[i * 2 + 1] || "";

      return `<div class="move-row">
        <b>${i + 1}.</b>
        <span>${white}</span>
        <span>${black}</span>
      </div>`;
    }).join("")
  : `<div class="muted" style="padding:12px">No moves yet.</div>`;

  if (state.playMode === "multiplayer" && state.mpRoom) {
    const room = state.mpRoom;
    let statusText = "";
    if (room.status === "waiting") {
      statusText = `Waiting for opponent to join. Share room code: ${room.code}`;
    } else if (room.status === "completed") {
      statusText = `Game Over: ${room.winner ? room.winner.toUpperCase() + ' won by ' + room.termination : 'Draw'}`;
    } else {
      const myTurn = (room.turn === 'w' && state.mpColor === 'white') || (room.turn === 'b' && state.mpColor === 'black');
      statusText = myTurn ? "Your turn! Select a piece to move." : "Opponent is thinking...";
    }
    const statusEl = document.getElementById("boardStatus");
    if (statusEl) statusEl.textContent = statusText;
    const badgeEl = document.getElementById("turnBadge");
    if (badgeEl) badgeEl.textContent = room.status === 'waiting' ? 'Waiting' : (room.turn === 'w' ? 'White to move' : 'Black to move');
    return;
  }

  const turn = state.game.turn()==="w" ? "White" : "Black";
  const status = state.game.game_over()
    ? (state.game.in_checkmate() ? "Checkmate!" : "Game over.")
    : state.selected
      ? `Selected ${state.selected} · Choose a highlighted square.`
      : `${turn} to move · Select a ${turn.toLowerCase()} piece.`;

  document.getElementById("boardStatus").textContent=status;
  document.getElementById("turnBadge").textContent=turn+" to move";
}

async function handleMpSquare(square) {
  if (!state.mpRoom || state.mpRoom.status !== "active") return;

  const myColor = state.mpColor;
  if (!myColor || myColor === "spectator") return;

  const myTurn = (state.mpRoom.turn === "w" && myColor === "white") || (state.mpRoom.turn === "b" && myColor === "black");
  if (!myTurn) {
    toast("It is your opponent's turn.");
    return;
  }

  const piece = state.game.get(square);
  const myPieceColor = myColor === "white" ? "w" : "b";

  if (!state.selected) {
    if (piece && piece.color === myPieceColor) {
      state.selected = square;
      renderPlayBoard();
    }
    return;
  }

  if (piece && piece.color === myPieceColor) {
    state.selected = square;
    renderPlayBoard();
    return;
  }

  // Attempt move
  const fromSquare = state.selected;
  const toSquare = square;
  state.selected = null;
  renderPlayBoard();

  try {
    const res = await fetch(`/api/multiplayer/game/${state.mpRoom.id}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromSquare, to: toSquare, promotion: "q" })
    });
    const data = await res.json();
    if (!res.ok || data.status !== "success") {
      toast(data.message || "Illegal move.");
    }
  } catch (err) {
    console.error("Move submit error:", err);
    toast("Failed to transmit move.");
  }
}

function startMpEventSource(gameId) {
  if (state.mpEventSource) {
    state.mpEventSource.close();
    state.mpEventSource = null;
  }

  const es = new EventSource(`/api/multiplayer/game/${gameId}/stream`);
  state.mpEventSource = es;

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "sync" || data.type === "game_started" || data.type === "move_made") {
        state.mpRoom = data.state;
        state.game.load(data.state.fen);
        if (data.move) {
          state.lastMove = { from: data.move.from, to: data.move.to };
          if (data.state.inCheck) soundFx.check();
          else if (data.move.captured) soundFx.capture();
          else soundFx.move();
        }
        renderPlayBoard();
        updateClocks(data.state.whiteTime, data.state.blackTime);
      } else if (data.type === "game_over") {
        state.mpRoom = data.state;
        state.game.load(data.state.fen);
        soundFx.gameEnd();
        renderPlayBoard();
        const msg = data.winner ? `${data.winner.toUpperCase()} won by ${data.termination}!` : `Game ended in a draw!`;
        toast(msg);
      } else if (data.type === "draw_offered") {
        if (data.by !== state.mpColor) {
          toast("Opponent offered a draw.");
          if (state.page === "play") render();
        }
      } else if (data.type === "draw_declined") {
        if (data.by !== state.mpColor) {
          toast("Opponent declined draw offer.");
          if (state.page === "play") render();
        }
      }
    } catch (err) {
      console.error("SSE parse error:", err);
    }
  };

  es.onerror = () => {
    console.warn("Multiplayer SSE connection interrupted. Attempting reconnect...");
  };
}

function updateClocks(wTime, bTime) {
  const wEl = document.getElementById("whiteClock");
  const bEl = document.getElementById("blackClock");
  if (wEl) wEl.textContent = formatClock(wTime);
  if (bEl) bEl.textContent = formatClock(bTime);
}

function initMultiplayerControls() {
  if (!state.mpRoom) {
    // Lobby event listeners
    const btnCreate = document.getElementById("btnCreateGame");
    if (btnCreate) {
      btnCreate.onclick = async () => {
        const timeControl = document.getElementById("mpTimeControl")?.value || "10+0";
        const preferredColor = document.getElementById("mpPreferredColor")?.value || "random";
        const isPrivate = document.getElementById("mpIsPrivate")?.checked || false;

        btnCreate.disabled = true;
        btnCreate.textContent = "Creating...";

        try {
          const res = await fetch("/api/multiplayer/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              time_control: timeControl,
              preferred_color: preferredColor,
              is_private: isPrivate
            })
          });

          const data = await res.json();
          if (!res.ok || data.status !== "success") {
            toast(data.message || "Failed to create game.");
            btnCreate.disabled = false;
            btnCreate.textContent = "Create Game";
            return;
          }

          state.mpRoom = data.room;
          state.mpColor = data.assignedColor;
          state.orientation = data.assignedColor === "black" ? "b" : "w";
          state.game = new Chess();
          startMpEventSource(data.room.id);
          render();
        } catch (err) {
          console.error("Create game error:", err);
          toast("Server error creating match.");
          btnCreate.disabled = false;
          btnCreate.textContent = "Create Game";
        }
      };
    }

    const btnJoinCode = document.getElementById("btnJoinGameCode");
    const codeInput = document.getElementById("mpRoomCodeInput");
    if (btnJoinCode && codeInput) {
      btnJoinCode.onclick = async () => {
        const code = codeInput.value.trim().toUpperCase();
        if (!code) {
          toast("Please enter a room code.");
          return;
        }

        btnJoinCode.disabled = true;
        btnJoinCode.textContent = "Joining...";

        try {
          const res = await fetch("/api/multiplayer/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room_id_or_code: code })
          });

          const data = await res.json();
          if (!res.ok || data.status !== "success") {
            toast(data.message || "Could not join game.");
            btnJoinCode.disabled = false;
            btnJoinCode.textContent = "Join";
            return;
          }

          state.mpRoom = data.room;
          state.mpColor = data.assignedColor;
          state.orientation = data.assignedColor === "black" ? "b" : "w";
          state.game = new Chess(data.room.fen);
          startMpEventSource(data.room.id);
          render();
        } catch (err) {
          console.error("Join game error:", err);
          toast("Server error joining match.");
          btnJoinCode.disabled = false;
          btnJoinCode.textContent = "Join";
        }
      };
    }

    const btnRefresh = document.getElementById("btnRefreshLobby");
    if (btnRefresh) {
      btnRefresh.onclick = loadOpenChallenges;
    }

    loadOpenChallenges();
    return;
  }

  // Active match event listeners
  renderPlayBoard();

  const flipBtn = document.getElementById("flip");
  if (flipBtn) {
    flipBtn.onclick = () => {
      state.orientation = state.orientation === "w" ? "b" : "w";
      renderPlayBoard();
    };
  }

  const btnLeave = document.getElementById("btnLeaveGame");
  if (btnLeave) {
    btnLeave.onclick = () => {
      if (state.mpRoom.status === "active" && !confirm("Leave active game? You can return if the game is still active.")) {
        return;
      }
      if (state.mpEventSource) {
        state.mpEventSource.close();
        state.mpEventSource = null;
      }
      state.mpRoom = null;
      state.mpColor = null;
      render();
    };
  }

  const btnResign = document.getElementById("btnMpResign");
  if (btnResign) {
    btnResign.onclick = async () => {
      if (!confirm("Are you sure you want to resign this match?")) return;
      try {
        await fetch(`/api/multiplayer/game/${state.mpRoom.id}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resign" })
        });
      } catch (e) {
        toast("Failed to transmit resignation.");
      }
    };
  }

  const btnDraw = document.getElementById("btnMpDraw");
  if (btnDraw) {
    btnDraw.onclick = async () => {
      try {
        const res = await fetch(`/api/multiplayer/game/${state.mpRoom.id}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "offer_draw" })
        });
        if (res.ok) toast("Draw offer transmitted to opponent.");
      } catch (e) {
        toast("Failed to transmit draw offer.");
      }
    };
  }

  const btnAcceptDraw = document.getElementById("btnAcceptDraw");
  if (btnAcceptDraw) {
    btnAcceptDraw.onclick = async () => {
      try {
        await fetch(`/api/multiplayer/game/${state.mpRoom.id}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept_draw" })
        });
      } catch (e) {
        toast("Failed to accept draw.");
      }
    };
  }

  const btnDeclineDraw = document.getElementById("btnDeclineDraw");
  if (btnDeclineDraw) {
    btnDeclineDraw.onclick = async () => {
      try {
        await fetch(`/api/multiplayer/game/${state.mpRoom.id}/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "decline_draw" })
        });
        render();
      } catch (e) {
        toast("Failed to decline draw.");
      }
    };
  }
}

async function loadOpenChallenges() {
  const container = document.getElementById("mpOpenChallenges");
  if (!container) return;

  try {
    const res = await fetch("/api/multiplayer/open");
    const data = await res.json();
    if (!res.ok || data.status !== "success") return;

    const list = data.games || [];
    if (!list.length) {
      container.innerHTML = `<div class="muted" style="padding:16px; text-align:center;">No open challenges right now. Create one to play!</div>`;
      return;
    }

    container.innerHTML = list.map(g => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:var(--panel2); border-radius:10px; border:1px solid var(--border);">
        <div>
          <b>${g.host}</b> <span class="muted" style="font-size:12px;">· ${g.timeControl}</span>
        </div>
        <button class="btn primary" onclick="joinOpenGame('${g.id}')" style="padding:6px 14px; font-size:13px;">Play</button>
      </div>
    `).join("");
  } catch (err) {
    console.error("Open challenges error:", err);
  }
}

window.joinOpenGame = async function(gameId) {
  try {
    const res = await fetch("/api/multiplayer/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_id_or_code: gameId })
    });

    const data = await res.json();
    if (!res.ok || data.status !== "success") {
      toast(data.message || "Failed to join game.");
      return;
    }

    state.mpRoom = data.room;
    state.mpColor = data.assignedColor;
    state.orientation = data.assignedColor === "black" ? "b" : "w";
    state.game = new Chess(data.room.fen);
    startMpEventSource(data.room.id);
    render();
  } catch (err) {
    toast("Error joining game.");
  }
};

function handlePlaySquare(square){
  if(state.game.game_over()|| state.gameEnded) return;

  const piece=state.game.get(square);
  const turn=state.game.turn();

  if(!state.selected){
    if(piece && piece.color===turn){
      state.selected=square;
      renderPlayBoard();
    }else{
      toast(`It's ${turn}'s turn.`);
    }
    return;
  }

  if(piece && piece.color===turn){
    state.selected=square;
    renderPlayBoard();
    return;
  }

  try{
    const move=state.game.move({
      from:state.selected,
      to:square,
      promotion:"q"
    });

    if(!move){
      toast("Illegal move.");
      return;
    }

    state.lastMove={from:move.from,to:move.to};
    state.selected=null;
    renderPlayBoard();

    if(state.game.in_checkmate()) toast("Checkmate! 🎉");
    else if(state.game.in_check()) toast("Check!");
  }catch(error){
    toast("That move is not legal.");
  }
}

function puzzlesPage(){
  const puzzle=puzzleData[state.puzzleIndex % puzzleData.length];
  return `<div class="page-title">
    <div class="eyebrow">TRAINING</div>
    <h1>Puzzles</h1>
    <p>Train the pattern-recognition skill that makes strong moves arrive faster.</p>
  </div>
  <div class="puzzle-layout">
    <div class="puzzle-board-shell"><div id="puzzleMount"></div></div>
    <div class="card">
      <div class="eyebrow">TACTICAL PUZZLE</div>
      <h2>Find the best move</h2>
      <p class="muted">Puzzle ${state.puzzleIndex+1} · Click the piece, then click its destination.</p>
      <div class="puzzle-hint" id="puzzleResult">Your move.</div>
      <div class="stats" style="grid-template-columns:1fr 1fr">
        <div class="stat"><b>${state.puzzlesSolved}</b><span>Solved</span></div>
        <div class="stat"><b>7</b><span>Current streak</span></div>
      </div>
      <div class="actions"><button class="btn" id="nextPuzzle">Next puzzle</button></div>
    </div>
  </div>`;
}

function initPuzzle(){
  const puzzle=puzzleData[state.puzzleIndex % puzzleData.length];
  const game=new Chess(puzzle.fen);
  state.puzzleSelected=null;

  const mount=document.getElementById("puzzleMount");
  mount.innerHTML="";
  mount.appendChild(createBoard(game,{
    puzzle:true,
    onSquare:(square)=>handlePuzzleSquare(square,game,puzzle)
  }));
}

function handlePuzzleSquare(square,game,puzzle){
  const result=document.getElementById("puzzleResult");
  const piece=game.get(square);

  if(!state.puzzleSelected){
    if(piece && piece.color===game.turn()){
      state.puzzleSelected=square;
      toast(`Selected ${square}`);
    }
    return initPuzzleVisual(game,puzzle);
  }

  if(piece && piece.color===game.turn()){
    state.puzzleSelected=square;
    return initPuzzleVisual(game,puzzle);
  }

  const correct = state.puzzleSelected===puzzle.solution.from && square===puzzle.solution.to;

  if(correct){
    result.innerHTML=`<span class="good"><strong>Correct!</strong></span> ${puzzle.moveText} is the solution.`;
    toast("Puzzle solved! 🧩");
  }else{
    result.innerHTML=`<span class="bad"><strong>Not quite.</strong></span> Try again and look for the forcing move.`;
  }

  state.puzzleSelected=null;
  initPuzzleVisual(game,puzzle);
}

function initPuzzleVisual(game,puzzle){
  const mount=document.getElementById("puzzleMount");
  mount.innerHTML="";
  const board=createBoard(game,{
    puzzle:true,
    onSquare:(square)=>handlePuzzleSquare(square,game,puzzle)
  });
  if(state.puzzleSelected){
    const selected=board.querySelector(`[data-square="${state.puzzleSelected}"]`);
    selected?.classList.add("selected");
  }
  mount.appendChild(board);
}

function bots(){
return `<div class="page-title"><div class="eyebrow">PRACTICE</div><h1>Play a Bot</h1><p>Practice without affecting your club rating. Stockfish integration is the next engineering milestone.</p></div>
<div class="grid">
  <div class="card feature"><div class="feature-icon">🌱</div><h3>Beginner</h3><p class="muted">Learn the basics without pressure.</p><button class="btn primary" data-page="play">Start</button></div>
  <div class="card feature"><div class="feature-icon">⚔️</div><h3>Intermediate</h3><p class="muted">A practical training opponent.</p><button class="btn primary" data-page="play">Start</button></div>
  <div class="card feature"><div class="feature-icon">👑</div><h3>Expert</h3><p class="muted">Stockfish-powered bot integration planned.</p><button class="btn" id="botExpert">Coming next</button></div>
</div>`;
}

function club(){
return `<div class="page-title"><div class="eyebrow">THE COMMUNITY</div><h1>REC Chess Club</h1><p>A place for students and teachers to play, learn and compete.</p></div>
<div class="grid">
  <div class="card feature"><div class="feature-icon">👥</div><h3>Members</h3><h2>6+</h2><p class="muted">Growing community.</p></div>
  <div class="card feature"><div class="feature-icon">🎓</div><h3>Teachers</h3><p class="muted">Faculty can join games and learn chess alongside students.</p></div>
  <div class="card feature"><div class="feature-icon">🏆</div><h3>Next Goal</h3><p class="muted">Establish the official club and run the first internal tournament.</p></div>
</div>`;
}

function profile(){

  const user = state.user;

  return `
    <div class="page-title">
      <div class="eyebrow">PLAYER</div>
      <h1>Profile</h1>
    </div>

    <div class="profile">

      <div class="card">

        <div class="profile-main">

          <div class="big-avatar">
            ${(user?.full_name || "Player")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <h2>${user?.full_name || "Player"}</h2>
            <div class="muted">
              @${user?.username || "player"}
            </div>
          </div>

        </div>

        <hr
          style="
            border:0;
            border-top:1px solid var(--border);
            margin:24px 0;
          "
        >

        <div class="stat">
          <b>${state.rating}</b>
          <span>Current rating</span>
        </div>

        <div class="actions" style="margin-top:20px">

          <button
            class="btn primary"
            id="editProfileButton"
          >
            Edit Profile
          </button>

        </div>

      </div>


      <div
        class="grid"
        style="grid-template-columns:1fr 1fr"
      >

        <div class="card">

          <h3>Performance</h3>

          <p class="muted">Games played</p>
          <h2>${state.games}</h2>

          <p class="muted">Wins</p>
          <h2>${state.wins}</h2>

        </div>


        <div class="card">

          <h3>Training</h3>

          <p class="muted">Puzzle rating</p>
          <h2>1000</h2>

          <p class="muted">Solved</p>
          <h2>${state.puzzlesSolved}</h2>

        </div>

      </div>

      <div class="card" style="margin-top: 24px; padding: 24px;">
        <div class="eyebrow">RECENT ACTIVITY</div>
        <h3 style="margin: 6px 0 16px;">Multiplayer Match History</h3>
        <div id="profileMatchHistory">
          <div class="muted">Loading match history...</div>
        </div>
      </div>

     ${editProfileModal()}
    </div>
  `;
}

function editProfileModal() {
  const user = state.user;

  return `
    <div class="modal-overlay" id="editProfileModal">

      <div class="modal-card">

        <div class="modal-header">
          <div>
            <div class="eyebrow" id="editProfileEyebrow">
              ACCOUNT
            </div>

            <h2 id="editProfileTitle">
              Edit Profile
            </h2>
          </div>

          <button
            class="modal-close"
            id="closeEditProfile"
            type="button"
          >
            ×
          </button>
        </div>

        <div class="modal-body">

          <label>Full Name</label>

          <input
            type="text"
            value="${user?.full_name || ""}"
            disabled
          >

          <label>Username</label>

          <input
            type="text"
            value="${user?.username || ""}"
            disabled
          >

          <label>Registration Number</label>

          <input
            type="text"
            value="${user?.registration_no || "Hidden"}"
            disabled
          >

          <div class="locked-note">
            Full name, username, registration number and rating
            cannot be changed by students.
          </div>

          <hr>

          <label for="currentPassword">
            Current Password
          </label>

          <input
            id="currentPassword"
            type="password"
            placeholder="Enter current password"
            autocomplete="current-password"
          >

          <label for="newPassword">
            New Password
          </label>

          <input
            id="newPassword"
            type="password"
            placeholder="Enter new password"
            autocomplete="new-password"
          >

          <label for="confirmPassword">
            Confirm New Password
          </label>

          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            autocomplete="new-password"
          >

          <div
            id="editProfileMessage"
            class="form-message"
          ></div>

        </div>

        <div class="modal-actions">

          <button
            class="btn"
            id="cancelEditProfile"
            type="button"
          >
            Cancel
          </button>

          <button
            class="btn primary"
            id="saveEditProfile"
            type="button"
          >
            Save Changes
          </button>

        </div>

      </div>

    </div>
  `;
}

function setupEditProfile(forcePasswordChange = false) {

  const editButton =
    document.getElementById("editProfileButton");

  const modal =
    document.getElementById("editProfileModal");

  const closeButton =
    document.getElementById("closeEditProfile");

  const cancelButton =
    document.getElementById("cancelEditProfile");

  const saveButton =
    document.getElementById("saveEditProfile");

  if (!modal || !saveButton) {
    return;
  }

  const closeModal = () => {

    // A forced password change cannot be cancelled.
    if (forcePasswordChange) {
      return;
    }

    modal.classList.remove("active");
  };


  // --------------------------------------------------
  // NORMAL EDIT PROFILE MODE
  // --------------------------------------------------

  if (editButton) {

    editButton.onclick = () => {
      modal.classList.add("active");
    };

  }


  // --------------------------------------------------
  // NORMAL CLOSE/CANCEL BUTTONS
  // --------------------------------------------------

  if (closeButton) {
    closeButton.onclick = closeModal;
  }

  if (cancelButton) {
    cancelButton.onclick = closeModal;
  }


  modal.addEventListener("click", (event) => {

    if (
      event.target === modal &&
      !forcePasswordChange
    ) {
      closeModal();
    }

  });


  // --------------------------------------------------
  // FORCED PASSWORD CHANGE MODE
  // --------------------------------------------------

  if (forcePasswordChange) {

    modal.classList.add("active");

    if (closeButton) {
      closeButton.style.display = "none";
    }

    if (cancelButton) {
      cancelButton.style.display = "none";
    }

    const title =
      document.getElementById("editProfileTitle");

    const eyebrow =
      document.getElementById("editProfileEyebrow");

    const message =
      document.getElementById("editProfileMessage");

    if (eyebrow) {
      eyebrow.textContent = "SECURITY";
    }

    if (title) {
      title.textContent = "Password Change Required";
    }

    if (message) {
      message.textContent =
        "Your account was created with an initial password. Please change it before continuing.";
    }
  }


  // --------------------------------------------------
  // SAVE PASSWORD
  // --------------------------------------------------

  saveButton.onclick = async () => {

    const currentPassword =
      document.getElementById("currentPassword").value;

    const newPassword =
      document.getElementById("newPassword").value;

    const confirmPassword =
      document.getElementById("confirmPassword").value;

    const message =
      document.getElementById("editProfileMessage");

    message.textContent = "";


    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {

      message.textContent =
        "Please fill in all password fields.";

      return;
    }


    if (newPassword !== confirmPassword) {

      message.textContent =
        "New passwords do not match.";

      return;
    }


    if (newPassword.length < 8) {

      message.textContent =
        "New password must be at least 8 characters.";

      return;
    }


    saveButton.disabled = true;
    saveButton.textContent = "Saving...";


    try {

      const response = await fetch(
        "/api/profile/password",
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword
          })
        }
      );


      const data =
        await response.json();


      if (!response.ok) {

        message.textContent =
          data.message ||
          "Unable to change password.";

        return;
      }


      message.textContent =
        "Password changed successfully!";


      document.getElementById(
        "currentPassword"
      ).value = "";

      document.getElementById(
        "newPassword"
      ).value = "";

      document.getElementById(
        "confirmPassword"
      ).value = "";


      // ------------------------------------------------
      // FORCED PASSWORD CHANGE COMPLETED
      // ------------------------------------------------

      if (forcePasswordChange) {

        state.forcePasswordChange = false;

        if (state.user) {
          state.user.must_change_password = false;
        }

        setTimeout(() => {

          modal.classList.remove("active");

          render();

        }, 1200);

      }

      // ------------------------------------------------
      // NORMAL PROFILE PASSWORD CHANGE
      // ------------------------------------------------

      else {

        setTimeout(() => {

          modal.classList.remove("active");

        }, 1200);

      }

    }

    catch (error) {

      console.error(
        "Profile update error:",
        error
      );

      message.textContent =
        "Unable to connect to the server.";

    }

    finally {

      saveButton.disabled = false;
      saveButton.textContent = "Save Changes";

    }

  };
}

function detectRecoveryFlow() {
  const hash = window.location.hash;
  const search = window.location.search;

  let params = null;
  if (hash && hash.includes("=")) {
    // Could be #reset-password&access_token=... or #access_token=...
    const cleanHash = hash.startsWith("#") ? hash.substring(1) : hash;
    const queryPart = cleanHash.includes("?") ? cleanHash.split("?")[1] : cleanHash;
    params = new URLSearchParams(queryPart);
  } else if (search) {
    params = new URLSearchParams(search);
  }

  if (!params) {
    return false;
  }

  const type = params.get("type");
  const accessToken = params.get("access_token");
  const token = params.get("token") || params.get("token_hash");

  if (type === "recovery" || accessToken || (token && hash.includes("reset-password"))) {
    state.recoveryMode = true;
    state.recoveryTokens = {
      access_token: accessToken,
      token: token,
      type: type || "recovery"
    };
    return true;
  }

  return false;
}

function resetPasswordPage() {
  return `
    <section class="login-page">
      <div class="login-card">
        <div class="eyebrow">ACCOUNT RECOVERY</div>
        <h1>RECK<span class="gold">MATE</span></h1>
        <p class="muted">Set a new password for your account.</p>

        <form id="resetPasswordForm" onsubmit="return false;">
          <div class="input-group">
            <label for="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              placeholder="Minimum 8 characters"
              autocomplete="new-password"
              required
            >
          </div>

          <div class="input-group">
            <label for="confirmNewPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmNewPassword"
              placeholder="Re-enter your new password"
              autocomplete="new-password"
              required
            >
          </div>

          <div id="resetPasswordMessage" class="form-message"></div>

          <button
            type="submit"
            id="resetPasswordSubmitBtn"
            class="btn primary full-width"
            style="margin-top: 18px;"
          >
            Update Password
          </button>
        </form>

        <p class="muted" style="margin-top: 20px; font-size: 13px; text-align: center;">
          Remembered your password? <a href="#home" id="backToLoginLink" style="color: var(--accent); text-decoration: underline;">Back to Login</a>
        </p>
      </div>
    </section>
  `;
}

function initResetPassword() {
  const form = document.getElementById("resetPasswordForm");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmInput = document.getElementById("confirmNewPassword");
  const message = document.getElementById("resetPasswordMessage");
  const submitBtn = document.getElementById("resetPasswordSubmitBtn");
  const backToLoginLink = document.getElementById("backToLoginLink");

  if (backToLoginLink) {
    backToLoginLink.onclick = (e) => {
      e.preventDefault();
      state.recoveryMode = false;
      state.recoveryTokens = null;
      window.location.hash = "home";
      render();
      checkSession();
    };
  }

  if (!form || !submitBtn) return;

  form.onsubmit = async (e) => {
    e.preventDefault();

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmInput.value;

    if (!newPassword || !confirmPassword) {
      message.className = "form-message error";
      message.textContent = "Please fill in all fields.";
      return;
    }

    if (newPassword.length < 8) {
      message.className = "form-message error";
      message.textContent = "Password must be at least 8 characters long.";
      return;
    }

    if (newPassword !== confirmPassword) {
      message.className = "form-message error";
      message.textContent = "Passwords do not match.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";
    message.className = "form-message";
    message.textContent = "";

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_password: newPassword,
          access_token: state.recoveryTokens?.access_token || null,
          token_hash: state.recoveryTokens?.token || null
        })
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        message.className = "form-message error";
        message.textContent = data.message || "Unable to reset password. Please try requesting a new recovery link.";
        submitBtn.disabled = false;
        submitBtn.textContent = "Update Password";
        return;
      }

      message.className = "form-message success";
      message.textContent = "Password updated successfully! Redirecting to login...";

      // Clear tokens and URL hash
      state.recoveryMode = false;
      state.recoveryTokens = null;
      history.replaceState(null, "", window.location.pathname);

      setTimeout(() => {
        state.loggedIn = false;
        state.user = null;
        state.sessionChecked = true;
        render();
      }, 1500);

    } catch (err) {
      console.error("Reset password request error:", err);
      message.className = "form-message error";
      message.textContent = "Unable to connect to the server. Please try again.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Update Password";
    }
  };
}

async function checkSession() {
  try {
    const response = await fetch("/api/session");

    if (!response.ok) {
      state.loggedIn = false;
      state.user = null;
      state.forcePasswordChange = false;
      state.sessionChecked = true;
      render();
      return;
    }

    const data = await response.json();

    if (data.status === "success") {
      state.loggedIn = true;
      state.user = data.user;
      state.rating = data.user.rating;
      state.forcePasswordChange =
      data.user.must_change_password === true;
    } else {
      state.loggedIn = false;
      state.user = null;
      state.forcePasswordChange = false;
    }

  } catch (error) {
    console.error("Session check failed:", error);
    state.loggedIn = false;
    state.user = null;
    state.forcePasswordChange = false;
  }

  state.sessionChecked = true;
  render();
}

function render(){

  // Password Recovery mode takes precedence
  if (state.recoveryMode) {
    layout(resetPasswordPage());
    initResetPassword();
    return;
  }

  // Still checking whether the user has a valid session
  if (!state.sessionChecked) {
    layout(`
      <section class="login-page">
        <div class="login-card">
          <div class="eyebrow">REC CHESS ARENA</div>
          <h1>RECK<span class="gold">MATE</span></h1>
          <p class="muted">Checking your session...</p>
        </div>
      </section>
    `);

    return;
  }

  // User is not logged in
  if (!state.loggedIn) {
    layout(loginPage());
    initLogin();
    return;
  }

  // --------------------------------------------------
  // ADMIN ACCESS CHECK
  // --------------------------------------------------

  if (state.page === "admin" && state.user?.role !== "admin") {

    // Redirect unauthorized users back to home
    state.page = "home";
    location.hash = "home";

    toast("Access denied.");

    return;
  }

  // --------------------------------------------------
  // NORMAL PAGE ROUTING
  // --------------------------------------------------

  const html =
    state.page === "admin" ? adminDashboard()
    : state.page === "leaderboard" ? leaderboard()
    : state.page === "play" ? play()
    : state.page === "puzzles" ? puzzlesPage()
    : state.page === "bots" ? bots()
    : state.page === "club" ? club()
    : state.page === "profile" ? profile()
    : home();

  let pageHtml = html;

if (
  state.forcePasswordChange &&
  state.page !== "profile"
) {
  pageHtml += editProfileModal();
}

layout(pageHtml);
  if (state.page === "admin") {
  initAdminDashboard();
}
if (
  state.page === "profile" ||
  state.forcePasswordChange
) {
  setupEditProfile(state.forcePasswordChange);
  if (state.page === "profile") {
    loadMatchHistory();
  }
}

if (state.page === "leaderboard") {
  loadLeaderboardData();
}

  // --------------------------------------------------
  // PLAY PAGE
  // --------------------------------------------------

  if (state.page === "play") {
    // Mode switcher buttons
    const btnMultiplayer = document.getElementById("btnModeMultiplayer");
    const btnLocal = document.getElementById("btnModeLocal");

    if (btnMultiplayer) {
      btnMultiplayer.onclick = () => {
        state.playMode = "multiplayer";
        render();
      };
    }

    if (btnLocal) {
      btnLocal.onclick = () => {
        state.playMode = "local";
        if (state.mpEventSource) {
          state.mpEventSource.close();
          state.mpEventSource = null;
        }
        state.mpRoom = null;
        render();
      };
    }

    if (state.playMode === "local") {
      initGame();
      const newGameBtn = document.getElementById("newGame");
      if (newGameBtn) newGameBtn.onclick = initGame;

      const undoBtn = document.getElementById("undo");
      if (undoBtn) {
        undoBtn.onclick = () => {
          if (state.game.history().length) {
            state.game.undo();
            state.selected = null;
            state.lastMove = null;
            renderPlayBoard();
          }
        };
      }

      const flipBtn = document.getElementById("flip");
      if (flipBtn) {
        flipBtn.onclick = () => {
          state.orientation = state.orientation === "w" ? "b" : "w";
          renderPlayBoard();
        };
      }

      const resignBtn = document.getElementById("resign");
      if (resignBtn) {
        resignBtn.onclick = () => {
          state.gameEnded = true;
          state.selected = null;
          renderPlayBoard();
          toast("Game resigned.");
        };
      }

      const drawBtn = document.getElementById("draw");
      if (drawBtn) {
        drawBtn.onclick = () => toast("Draw offer sent (local prototype).");
      }
    } else {
      // Multiplayer mode initialization
      initMultiplayerControls();
    }
  }

  // --------------------------------------------------
  // PUZZLES PAGE
  // --------------------------------------------------

  if (state.page === "puzzles") {

    initPuzzle();

    document.getElementById("nextPuzzle").onclick = () => {

      state.puzzleIndex++;

      render();

    };
  }

  // --------------------------------------------------
  // BOTS PAGE
  // --------------------------------------------------

  if (state.page === "bots") {

    document
      .getElementById("botExpert")
      ?.addEventListener(
        "click",
        () => toast(
          "Stockfish integration is planned for the next build."
        )
      );
  }

  // --------------------------------------------------
  // MOBILE MENU
  // --------------------------------------------------

  const menuToggle = document.getElementById("menuToggle");
  const mobileMenu = document.getElementById("mobileMenu");

  if (menuToggle && mobileMenu) {

    menuToggle.onclick = () => {
      mobileMenu.classList.toggle("open");
    };

  }

  document.querySelectorAll("#mobileMenu a").forEach(link => {

    link.onclick = () => {
      mobileMenu.classList.remove("open");
    };

  });

}

if (detectRecoveryFlow()) {
  console.log("RECKMATE: Password recovery flow detected.");
  render();
} else {
  render();
  checkSession();
}