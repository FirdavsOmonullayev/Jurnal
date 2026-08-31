import { state, saveSession, setRoleTab, setView } from './state.js';
import { renderLoginView } from './views/loginView.js';
import { renderAdminView } from './views/adminView.js';
import { renderTeacherView } from './views/teacherView.js';
import { renderStudentView } from './views/studentView.js';
import { escapeHtml } from './components/toast.js';

export function renderApp() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  if (!state.session) {
    renderLoginView(renderApp);
    return;
  }

  const role = state.session.role;
  const roleLabel = role === 'admin' ? 'CEO / Admin' : role === 'teacher' ? "O'qituvchi" : "O'quvchi";

  appContainer.innerHTML = `
    <div class="topbar">
      <div class="brand" style="cursor:pointer;" id="brandHomeBtn" title="Bosh sahifaga qaytish">
        <h1>Jurnal</h1>
        <span>uyga vazifalar nazorati</span>
      </div>
      <div class="who">
        <span>${roleLabel} — <b>${escapeHtml(state.session.name)}</b></span>
        <button class="btn-ghost btn-small" id="logoutBtn">Chiqish</button>
      </div>
    </div>
    <div class="main" id="mainContent"></div>
  `;

  document.getElementById('brandHomeBtn').onclick = () => {
    setView('home');
    renderApp();
  };

  document.getElementById('logoutBtn').onclick = () => {
    saveSession(null);
    setRoleTab('student');
    setView('home');
    renderApp();
  };

  if (role === 'admin') {
    renderAdminView(renderApp);
  } else if (role === 'teacher') {
    renderTeacherView(renderApp);
  } else if (role === 'student') {
    renderStudentView(renderApp);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
