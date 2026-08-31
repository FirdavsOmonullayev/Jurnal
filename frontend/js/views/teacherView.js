import { api } from '../api.js';
import { state, setView } from '../state.js';
import { showToast, escapeHtml } from '../components/toast.js';

export async function renderTeacherView(refreshApp) {
  const container = document.getElementById('mainContent') || document.getElementById('app');

  if (state.view.screen === 'assignmentDetail' && state.view.assignmentId && state.view.groupId) {
    await renderTeacherAssignmentDetail(container, state.view.assignmentId, state.view.groupId, refreshApp);
    return;
  }

  try {
    const teacherId = state.session.id;
    const data = await api.teacher.getDashboard(teacherId);
    const { groups } = data;

    const html = `
      <h2 class="section-title">Mening guruhlarim</h2>
      <p class="section-sub">Topshiriqlar yaratish va o'quvchilar vazifalarini tekshirish</p>

      ${groups.length === 0 ? '<p class="empty-note">Sizga hali guruh biriktirilmagan. Admin bilan bog\'laning.</p>' : ''}

      ${groups.map(g => {
        return `
          <div class="card">
            <h3>${escapeHtml(g.name)} <span class="rmeta">(${g.studentsCount} o'quvchi)</span></h3>
            <div class="ledger">
              ${g.assignments.length === 0 ? '<p class="empty-note">Bu guruh uchun hali topshiriq yo\'q.</p>' :
                g.assignments.map(a => {
                  const badgeClass = a.total === 0 ? 'amber' : a.isDone ? 'green' : 'red';
                  const badgeText = a.total === 0 ? "O'quvchi yo'q" : a.isDone ? 'Yakunlangan' : 'Tekshirish kerak';

                  return `
                    <div class="row">
                      <div class="rmain clickable" data-assign-id="${a.id}" data-group-id="${g.id}">
                        <div class="rtitle">${escapeHtml(a.title)}</div>
                        <div class="rmeta">Muddat: ${escapeHtml(a.dueDate || '—')} · Topshirdi ${a.submitted}/${a.total} · Tekshirildi ${a.checked}/${a.total}</div>
                      </div>
                      <span class="badge ${badgeClass}"><span class="dot"></span>${badgeText}</span>
                      <button class="btn-ghost btn-small" style="color:var(--red);border-color:var(--red-soft);" data-del-assign="${a.id}">O'chirish</button>
                    </div>
                  `;
                }).join('')
              }
            </div>
            <details style="margin-top:14px;">
              <summary class="link-btn" style="cursor:pointer;">+ Yangi topshiriq yaratish</summary>
              <div class="form-grid" style="margin-top:12px;">
                <div class="full">
                  <label for="newAssignTitle-${g.id}">Sarlavha</label>
                  <input type="text" id="newAssignTitle-${g.id}" autocomplete="off">
                </div>
                <div class="full">
                  <label for="newAssignDesc-${g.id}">Tavsif</label>
                  <textarea id="newAssignDesc-${g.id}"></textarea>
                </div>
                <div>
                  <label for="newAssignDue-${g.id}">Muddat</label>
                  <input type="text" id="newAssignDue-${g.id}" autocomplete="off">
                </div>
              </div>
              <button class="btn-ghost btn-small" style="margin-top:10px;" data-create-assign="${g.id}">Yaratish</button>
            </details>
          </div>
        `;
      }).join('')}
    `;

    container.innerHTML = html;

    // Attach Event Handlers
    container.querySelectorAll('[data-assign-id]').forEach(el => {
      el.onclick = () => {
        setView('assignmentDetail', {
          assignmentId: el.dataset.assignId,
          groupId: el.dataset.groupId
        });
        refreshApp();
      };
    });

    // Delete Assignment Handler
    container.querySelectorAll('[data-del-assign]').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        if (!confirm("Bu topshiriqni o'chirishga ishonchingiz komilmi?")) return;
        try {
          await api.teacher.deleteAssignment(btn.dataset.delAssign);
          showToast("Topshiriq o'chirildi");
          refreshApp();
        } catch (err) {
          showToast(err.message);
        }
      };
    });

    container.querySelectorAll('[data-create-assign]').forEach(btn => {
      btn.onclick = async () => {
        const gid = btn.dataset.createAssign;
        const titleEl = document.getElementById(`newAssignTitle-${gid}`);
        const descEl = document.getElementById(`newAssignDesc-${gid}`);
        const dueEl = document.getElementById(`newAssignDue-${gid}`);

        const title = titleEl.value.trim();
        const desc = descEl.value.trim();
        const dueDate = dueEl.value.trim();

        if (!title || !desc || !dueDate) {
          showToast("Sarlavha, tavsif va muddatni to'liq kiriting");
          return;
        }

        try {
          await api.teacher.createAssignment({ groupId: gid, title, desc, dueDate });
          showToast('Topshiriq yaratildi');

          // Reset fields
          titleEl.value = '';
          descEl.value = '';
          dueEl.value = '';

          refreshApp();
        } catch (err) {
          showToast(err.message);
        }
      };
    });

  } catch (err) {
    showToast(err.message);
  }
}

function renderMediaHtml(media) {
  if (!media || !media.dataUrl) return '';
  if (media.type === 'image') {
    return `<img src="${media.dataUrl}" alt="Media" class="media-preview">`;
  }
  if (media.type === 'video') {
    return `<video src="${media.dataUrl}" controls class="media-preview"></video>`;
  }
  return '';
}

async function renderTeacherAssignmentDetail(container, assignmentId, groupId, refreshApp) {
  try {
    const data = await api.teacher.getAssignmentDetail(assignmentId, groupId);
    const { assignment, group, students } = data;

    const html = `
      <span class="back-link" id="backToTeacherHome">← Guruhlarim</span>
      <h2 class="section-title" style="margin-top:10px;">${escapeHtml(assignment.title)}</h2>
      <p class="section-sub">${escapeHtml(group.name)} · Muddat: ${escapeHtml(assignment.dueDate || '—')}</p>
      <p style="font-size:14px;color:var(--ink-soft);margin-bottom:20px;">${escapeHtml(assignment.desc || '')}</p>

      ${students.length === 0 ? '<p class="empty-note">Bu guruhda o\'quvchi yo\'q.</p>' :
        students.map(s => {
          const sub = s.submission;
          const badgeClass = !sub ? 'red' : !sub.checked ? 'amber' : 'green';
          const badgeText = !sub ? 'Topshirmagan' : !sub.checked ? 'Tekshirilmoqda' : 'Baholandi';

          return `
            <div class="assignment-item">
              <div class="top-row">
                <h3 style="font-size:15px;">${escapeHtml(s.studentName)}</h3>
                <span class="badge ${badgeClass}"><span class="dot"></span>${badgeText}</span>
              </div>
              ${sub ? `
                <p class="desc" style="background:var(--bg);padding:10px 12px;border-radius:4px;">${escapeHtml(sub.text || '(Matn kiritilmagan)')}</p>
                ${renderMediaHtml(sub.media)}
                ${sub.videoLink ? `<p class="rmeta" style="margin-top:6px;">Video havolasi: <a href="${escapeHtml(sub.videoLink)}" target="_blank" rel="noopener">${escapeHtml(sub.videoLink)}</a></p>` : ''}
                ${sub.checked ? `
                  <div class="feedback-box"><span class="g">Baho: ${escapeHtml(sub.grade)}</span>${sub.feedback ? ' — ' + escapeHtml(sub.feedback) : ''}</div>
                ` : `
                  <div class="grade-input">
                    <input type="text" placeholder="Baho" id="grade-${s.studentId}">
                    <input type="text" placeholder="Izoh (ixtiyoriy)" id="feedback-${s.studentId}" style="width:auto;flex:1;">
                    <button class="btn-ghost btn-small" data-check="${s.studentId}">Tekshirildi deb belgilash</button>
                  </div>
                `}
              ` : `<p class="empty-note">O'quvchi hali vazifa topshirmagan.</p>`}
            </div>
          `;
        }).join('')
      }
    `;

    container.innerHTML = html;

    const backLink = document.getElementById('backToTeacherHome');
    if (backLink) {
      backLink.onclick = () => {
        setView('home');
        refreshApp();
      };
    }

    container.querySelectorAll('[data-check]').forEach(btn => {
      btn.onclick = async () => {
        const studentId = btn.dataset.check;
        const grade = document.getElementById(`grade-${studentId}`).value.trim();
        const feedback = document.getElementById(`feedback-${studentId}`).value.trim();

        if (!grade) {
          showToast('Baho kiriting');
          return;
        }

        try {
          await api.teacher.gradeSubmission({
            assignmentId,
            studentId,
            grade,
            feedback
          });
          showToast('Baholandi');
          refreshApp();
        } catch (err) {
          showToast(err.message);
        }
      };
    });

  } catch (err) {
    showToast(err.message);
    setView('home');
    refreshApp();
  }
}
