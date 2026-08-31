import { api } from '../api.js';
import { state, saveSession, setRoleTab, setView } from '../state.js';
import { showToast, escapeHtml } from '../components/toast.js';

let cachedHasAdmin = null;

export async function renderLoginView(onSuccess) {
  const container = document.getElementById('app');
  if (!container) return;

  const tab = state.view.roleTab;

  // Render initial login view immediately
  function drawView(hasAdmin) {
    let formHtml = '';
    if (tab === 'student' || tab === 'teacher') {
      formHtml = `
        <label for="loginUsername">Login</label>
        <input type="text" id="loginUsername" placeholder="Login (foydalanuvchi nomi)" autocomplete="username">
        <label for="loginPassword">Parol</label>
        <input type="password" id="loginPassword" placeholder="Parolingiz" autocomplete="current-password">
        <button class="btn-primary" id="loginBtn">Kirish</button>
      `;
    } else {
      if (hasAdmin === false) {
        formHtml = `
          <p class="empty-note" style="margin-top:0;">Bu tizimda hali CEO/admin profili yo'q. Birinchi bo'lib o'zingizni ro'yxatdan o'tkazing.</p>
          <label for="adminName">Ism</label>
          <input type="text" id="adminName" placeholder="Ismingiz">
          <label for="adminUsername">Login o'rnating</label>
          <input type="text" id="adminUsername" placeholder="Login (foydalanuvchi nomi)" autocomplete="username">
          <label for="adminPassword">Parol o'rnating</label>
          <input type="password" id="adminPassword" placeholder="Parol" autocomplete="new-password">
          <button class="btn-primary" id="setupAdminBtn">Admin profilini yaratish</button>
        `;
      } else {
        formHtml = `
          <label for="loginUsername">Login</label>
          <input type="text" id="loginUsername" placeholder="Login (foydalanuvchi nomi)" autocomplete="username">
          <label for="loginPassword">Parol</label>
          <input type="password" id="loginPassword" placeholder="Parolingiz" autocomplete="current-password">
          <button class="btn-primary" id="loginBtn">Kirish</button>
        `;
      }
    }

    container.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <h1>Jurnal</h1>
          <p class="sub">Uyga vazifalar nazorat tizimi</p>
          <div class="role-tabs">
            <button class="role-tab ${tab === 'student' ? 'active' : ''}" data-tab="student">O'quvchi</button>
            <button class="role-tab ${tab === 'teacher' ? 'active' : ''}" data-tab="teacher">O'qituvchi</button>
            <button class="role-tab ${tab === 'admin' ? 'active' : ''}" data-tab="admin">CEO / Admin</button>
          </div>
          ${formHtml}
        </div>
      </div>
    `;

    // Event Listeners
    container.querySelectorAll('.role-tab').forEach(b => {
      b.onclick = () => {
        setRoleTab(b.dataset.tab);
        renderLoginView(onSuccess);
      };
    });

    const setupBtn = document.getElementById('setupAdminBtn');
    if (setupBtn) {
      setupBtn.onclick = async () => {
        const name = document.getElementById('adminName').value.trim();
        const username = document.getElementById('adminUsername').value.trim();
        const password = document.getElementById('adminPassword').value;

        if (!name || !username || !password) {
          showToast('Ism, login va parolni kiriting');
          return;
        }

        try {
          const res = await api.auth.setupAdmin({ name, username, password });
          saveSession(res.user);
          setView('home');
          showToast('Admin profili yaratildi');
          onSuccess();
        } catch (err) {
          showToast(err.message);
        }
      };
    }

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
      loginBtn.onclick = async () => {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
          showToast('Login va parolni kiriting');
          return;
        }

        try {
          const res = await api.auth.login({
            role: tab,
            username,
            password
          });
          saveSession(res.user);
          setView('home');
          showToast('Xush kelibsiz!');
          onSuccess();
        } catch (err) {
          showToast(err.message);
        }
      };
    }
  }

  // Render immediately with cached status or default
  drawView(cachedHasAdmin);

  // Asynchronously check admin status if on admin tab or unknown
  if (cachedHasAdmin === null || tab === 'admin') {
    try {
      const status = await api.auth.getStatus();
      if (status && typeof status.hasAdmin === 'boolean') {
        if (cachedHasAdmin !== status.hasAdmin) {
          cachedHasAdmin = status.hasAdmin;
          drawView(cachedHasAdmin);
        }
      }
    } catch (e) {
      console.warn('Status fetch skipped/failed:', e);
    }
  }
}
