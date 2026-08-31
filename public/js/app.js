import { state, saveSession, setRoleTab, setView } from './state.js';
import { renderLoginView } from './views/loginView.js';
import { renderAdminView } from './views/adminView.js';
import { renderTeacherView } from './views/teacherView.js';
import { renderStudentView } from './views/studentView.js';
import { escapeHtml } from './components/toast.js';

function getActiveSession() {
  if (typeof state !== 'undefined' && state && state.session) return state.session;
  if (typeof window !== 'undefined' && window.state && window.state.session) return window.state.session;
  try {
    const raw = localStorage.getItem('jurnal_session');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function renderApp() {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  const currentSession = getActiveSession();

  if (!currentSession) {
    const loginFn = typeof renderLoginView === 'function' ? renderLoginView : (window.renderLoginView || function(){});
    loginFn(renderApp);
    return;
  }

  const role = currentSession.role;
  const roleLabel = role === 'admin' ? 'CEO / Admin' : role === 'teacher' ? "O'qituvchi" : "O'quvchi";

  const safeEscape = typeof escapeHtml === 'function' ? escapeHtml : (window.escapeHtml || function(s){ return s || ''; });

  appContainer.innerHTML = `
    <div class="topbar">
      <div class="brand" style="cursor:pointer;" id="brandHomeBtn" title="Bosh sahifaga qaytish">
        <h1>Jurnal</h1>
        <span>uyga vazifalar nazorati</span>
      </div>
      <div class="who">
        <span>${roleLabel} — <b>${safeEscape(currentSession.name)}</b></span>
        <button class="btn-ghost btn-small" id="logoutBtn">Chiqish</button>
      </div>
    </div>
    <div class="main" id="mainContent"></div>
  `;

  document.getElementById('brandHomeBtn').onclick = () => {
    if (typeof setView === 'function') setView('home');
    else if (window.setView) window.setView('home');
    renderApp();
  };

  document.getElementById('logoutBtn').onclick = () => {
    if (typeof saveSession === 'function') saveSession(null);
    else if (window.saveSession) window.saveSession(null);

    if (typeof setRoleTab === 'function') setRoleTab('student');
    else if (window.setRoleTab) window.setRoleTab('student');

    if (typeof setView === 'function') setView('home');
    else if (window.setView) window.setView('home');

    renderApp();
  };

  if (role === 'admin') {
    const fn = typeof renderAdminView === 'function' ? renderAdminView : (window.renderAdminView || function(){});
    fn(renderApp);
  } else if (role === 'teacher') {
    const fn = typeof renderTeacherView === 'function' ? renderTeacherView : (window.renderTeacherView || function(){});
    fn(renderApp);
  } else if (role === 'student') {
    const fn = typeof renderStudentView === 'function' ? renderStudentView : (window.renderStudentView || function(){});
    fn(renderApp);
  }
}

// Boot application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}

if (typeof window !== 'undefined') {
  window.renderApp = renderApp;
}
