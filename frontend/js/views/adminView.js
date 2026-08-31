import { api } from '../api.js';
import { state, setView } from '../state.js';
import { showToast, escapeHtml } from '../components/toast.js';

export async function renderAdminView(refreshApp) {
  const container = document.getElementById('mainContent') || document.getElementById('app');

  if (state.view.screen === 'groupDetail' && state.view.groupId) {
    await renderAdminGroupDetail(container, state.view.groupId, refreshApp);
    return;
  }

  try {
    const data = await api.admin.getDashboard();
    const { stats, groups, teachers, students } = data;

    const html = `
      <h2 class="section-title">Umumiy nazorat</h2>
      <p class="section-sub">Guruhlar bo'yicha uy vazifalarining bajarilish holati</p>

      <div class="stat-row">
        <div class="stat"><div class="num">${stats.teachers}</div><div class="lbl">O'qituvchilar</div></div>
        <div class="stat"><div class="num">${stats.groups}</div><div class="lbl">Guruhlar</div></div>
        <div class="stat"><div class="num">${stats.students}</div><div class="lbl">O'quvchilar</div></div>
        <div class="stat"><div class="num" style="color:${stats.redGroups > 0 ? 'var(--red)' : 'var(--green)'}">${stats.redGroups}</div><div class="lbl">Diqqat talab guruhlar</div></div>
      </div>

      <div class="card">
        <h3>Guruhlar holati</h3>
        <div class="ledger">
          ${groups.length === 0 ? '<p class="empty-note">Hali guruh qo\'shilmagan.</p>' :
            groups.map(g => {
              const badgeClass = g.assignmentsCount === 0 ? 'amber' : g.hasPending ? 'red' : 'green';
              const badgeText = g.assignmentsCount === 0 ? "Topshiriq yo'q" : g.hasPending ? 'Tekshirilmagan' : 'Hammasi tekshirilgan';

              return `
                <div class="row">
                  <div class="rmain clickable" data-group-id="${g.id}">
                    <div class="rtitle">${escapeHtml(g.name)}</div>
                    <div class="rmeta">O'qituvchi: ${escapeHtml(g.teacherName || '—')} · ${g.studentsCount} o'quvchi · ${g.assignmentsCount} topshiriq</div>
                  </div>
                  <span class="badge ${badgeClass}"><span class="dot"></span>${badgeText}</span>
                  <button class="btn-ghost btn-small" style="color:var(--red);border-color:var(--red-soft);" data-del-group="${g.id}">O'chirish</button>
                </div>
              `;
            }).join('')
          }
        </div>
      </div>

      <div class="card">
        <h3>Yangi o'qituvchi qo'shish</h3>
        <div class="form-grid">
          <div class="full">
            <label for="newTeacherName">O'qituvchi ismi</label>
            <input type="text" id="newTeacherName" autocomplete="off">
          </div>
          <div class="full">
            <label for="newTeacherUsername">Login (kirish uchun foydalanuvchi nomi)</label>
            <input type="text" id="newTeacherUsername" autocomplete="off">
          </div>
          <div class="full">
            <label for="newTeacherPassword">Parol o'rnating</label>
            <input type="password" id="newTeacherPassword" autocomplete="new-password">
          </div>
        </div>
        <button class="btn-ghost btn-small" style="margin-top:12px;" id="addTeacherBtn">Qo'shish</button>

        ${teachers.length > 0 ? `
          <h4 style="margin:20px 0 10px;font-size:14px;color:var(--ink-soft);">Mavjud o'qituvchilar:</h4>
          <div class="ledger">
            ${teachers.map(t => `
              <div class="row" style="padding:8px 0;">
                <div class="rmain">
                  <div class="rtitle" style="font-size:14px;">${escapeHtml(t.name)}</div>
                  <div class="rmeta">Login: @${escapeHtml(t.username)}</div>
                </div>
                <button class="btn-ghost btn-small" style="color:var(--red);border-color:var(--red-soft);" data-del-teacher="${t.id}">O'chirish</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="card">
        <h3>Yangi guruh qo'shish</h3>
        <div class="form-grid">
          <div class="full">
            <label for="newGroupName">Guruh nomi</label>
            <input type="text" id="newGroupName" autocomplete="off">
          </div>
          <div class="full">
            <label for="newGroupTeacher">Mas'ul o'qituvchi</label>
            <select id="newGroupTeacher">
              <option value="">Tanlang</option>
              ${teachers.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <button class="btn-ghost btn-small" style="margin-top:12px;" id="addGroupBtn">Qo'shish</button>
      </div>

      <div class="card">
        <h3>Yangi o'quvchi qo'shish</h3>
        <div class="form-grid">
          <div class="full">
            <label for="newStudentName">O'quvchi ismi</label>
            <input type="text" id="newStudentName" autocomplete="off">
          </div>
          <div class="full">
            <label for="newStudentGroup">Guruh</label>
            <select id="newStudentGroup">
              <option value="">Tanlang</option>
              ${groups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('')}
            </select>
          </div>
          <div class="full">
            <label for="newStudentUsername">Login (kirish uchun foydalanuvchi nomi)</label>
            <input type="text" id="newStudentUsername" autocomplete="off">
          </div>
          <div class="full">
            <label for="newStudentPassword">Parol o'rnating</label>
            <input type="password" id="newStudentPassword" autocomplete="new-password">
          </div>
        </div>
        <button class="btn-ghost btn-small" style="margin-top:12px;" id="addStudentBtn">Qo'shish</button>

        ${students.length > 0 ? `
          <h4 style="margin:20px 0 10px;font-size:14px;color:var(--ink-soft);">Mavjud o'quvchilar:</h4>
          <div class="ledger">
            ${students.map(s => `
              <div class="row" style="padding:8px 0;">
                <div class="rmain">
                  <div class="rtitle" style="font-size:14px;">${escapeHtml(s.name)}</div>
                  <div class="rmeta">Guruh: ${escapeHtml(s.groupName || '—')} · Login: @${escapeHtml(s.username)}</div>
                </div>
                <button class="btn-ghost btn-small" style="color:var(--red);border-color:var(--red-soft);" data-del-student="${s.id}">O'chirish</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = html;

    // Attach Event Handlers
    container.querySelectorAll('[data-group-id]').forEach(el => {
      el.onclick = () => {
        setView('groupDetail', { groupId: el.dataset.groupId });
        refreshApp();
      };
    });

    // Delete Group Handler
    container.querySelectorAll('[data-del-group]').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm("Bu guruhni o'chirishga ishonchingiz komilmi?")) return;
        try {
          await api.admin.deleteGroup(btn.dataset.delGroup);
          showToast("Guruh o'chirildi");
          refreshApp();
        } catch (err) {
          showToast(err.message);
        }
      };
    });

    // Delete Teacher Handler
    container.querySelectorAll('[data-del-teacher]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Bu o'qituvchini o'chirishga ishonchingiz komilmi?")) return;
        try {
          await api.admin.deleteTeacher(btn.dataset.delTeacher);
          showToast("O'qituvchi o'chirildi");
          refreshApp();
        } catch (err) {
          showToast(err.message);
        }
      };
    });

    // Delete Student Handler
    container.querySelectorAll('[data-del-student]').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm("Bu o'quvchini o'chirishga ishonchingiz komilmi?")) return;
        try {
          await api.admin.deleteStudent(btn.dataset.delStudent);
          showToast("O'quvchi o'chirildi");
          refreshApp();
        } catch (err) {
          showToast(err.message);
        }
      };
    });

    // Add Teacher Handler
    const addTeacherBtn = document.getElementById('addTeacherBtn');
    if (addTeacherBtn) {
      addTeacherBtn.onclick = async () => {
        const nameEl = document.getElementById('newTeacherName');
        const userEl = document.getElementById('newTeacherUsername');
        const passEl = document.getElementById('newTeacherPassword');

        const name = nameEl.value.trim();
        const username = userEl.value.trim();
        const password = passEl.value;

        if (!name || !username || !password) {
          showToast('Ism, login va parolni kiriting');
          return;
        }

        try {
          await api.admin.addTeacher({ name, username, password });
          showToast("O'qituvchi qo'shildi");

          // Reset fields
          nameEl.value = '';
          userEl.value = '';
          passEl.value = '';

          refreshApp();
        } catch (err) {
          showToast(err.message);
        }
      };
    }

    // Add Group Handler
    const addGroupBtn = document.getElementById('addGroupBtn');
    if (addGroupBtn) {
      addGroupBtn.onclick = async () => {
        const nameEl = document.getElementById('newGroupName');
        const teacherEl = document.getElementById('newGroupTeacher');

        const name = nameEl.value.trim();
        const teacherId = teacherEl.value;

        if (!name || !teacherId) {
          showToast("Guruh nomi va o'qituvchini tanlang");
          return;
        }

        try {
          await api.admin.addGroup({ name, teacherId });
          showToast("Guruh qo'shildi");

          // Reset fields
          nameEl.value = '';
          teacherEl.value = '';

          refreshApp();
        } catch (err) {
          showToast(err.message);
        }
      };
    }

    // Add Student Handler
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) {
      addStudentBtn.onclick = async () => {
        const nameEl = document.getElementById('newStudentName');
        const groupEl = document.getElementById('newStudentGroup');
        const userEl = document.getElementById('newStudentUsername');
        const passEl = document.getElementById('newStudentPassword');

        const name = nameEl.value.trim();
        const groupId = groupEl.value;
        const username = userEl.value.trim();
        const password = passEl.value;

        if (!name || !groupId || !username || !password) {
          showToast("Ism, guruh, login va parolni kiriting");
          return;
        }

        try {
          await api.admin.addStudent({ name, groupId, username, password });
          showToast("O'quvchi qo'shildi");

          // Reset fields
          nameEl.value = '';
          groupEl.value = '';
          userEl.value = '';
          passEl.value = '';

          refreshApp();
        } catch (err) {
          showToast(err.message);
        }
      };
    }

  } catch (err) {
    showToast(err.message);
  }
}

async function renderAdminGroupDetail(container, groupId, refreshApp) {
  try {
    const data = await api.admin.getGroupDetail(groupId);
    const { group, assignments } = data;

    const html = `
      <span class="back-link" id="backToAdminHome">← Barcha guruhlar</span>
      <h2 class="section-title" style="margin-top:10px;">${escapeHtml(group.name)}</h2>
      <p class="section-sub" style="margin-bottom:20px;">O'qituvchi: ${escapeHtml(group.teacherName || '—')} · ${group.studentsCount} o'quvchi</p>

      ${assignments.length === 0 ? '<p class="empty-note">Bu guruhda hali topshiriq yaratilmagan.</p>' :
        assignments.map(a => {
          const badgeClass = a.total === 0 ? 'amber' : a.isDone ? 'green' : 'red';
          const badgeText = a.total === 0 ? "O'quvchi yo'q" : a.isDone ? 'Yakunlangan' : 'Tekshirilmagan';

          return `
            <div class="assignment-item">
              <div class="top-row">
                <div>
                  <h3>${escapeHtml(a.title)}</h3>
                  <div class="rmeta">Muddat: ${escapeHtml(a.dueDate || '—')}</div>
                </div>
                <span class="badge ${badgeClass}"><span class="dot"></span>${badgeText}</span>
              </div>
              <div class="rmeta">Topshirdi: ${a.submitted}/${a.total} o'quvchi</div>
              <div class="rmeta" style="margin-top:2px;">Tekshirildi: ${a.checked}/${a.total} o'quvchi</div>
            </div>
          `;
        }).join('')
      }
    `;

    container.innerHTML = html;

    const backLink = document.getElementById('backToAdminHome');
    if (backLink) {
      backLink.onclick = () => {
        setView('home');
        refreshApp();
      };
    }

  } catch (err) {
    showToast(err.message);
    setView('home');
    refreshApp();
  }
}

if (typeof window !== 'undefined') {
  window.renderAdminView = renderAdminView;
}
