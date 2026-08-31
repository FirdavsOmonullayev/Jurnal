const SESSION_KEY = 'jurnal_session';

export const state = {
  session: loadSession(),
  view: {
    roleTab: 'student', // 'student' | 'teacher' | 'admin'
    screen: 'home',     // 'home' | 'groupDetail' | 'assignmentDetail'
    groupId: null,
    assignmentId: null
  }
};

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveSession(userObj) {
  state.session = userObj;
  try {
    if (userObj) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {}
}

export function setRoleTab(tab) {
  state.view.roleTab = tab;
}

export function setView(screen, params = {}) {
  state.view.screen = screen;
  state.view.groupId = params.groupId || null;
  state.view.assignmentId = params.assignmentId || null;
}

// Bind to window for universal browser module compatibility
if (typeof window !== 'undefined') {
  window.state = state;
  window.saveSession = saveSession;
  window.setRoleTab = setRoleTab;
  window.setView = setView;
}
