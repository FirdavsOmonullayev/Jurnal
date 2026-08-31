import { api } from '../api.js';
import { state } from '../state.js';
import { showToast, escapeHtml } from '../components/toast.js';

export async function renderStudentView(refreshApp) {
  const container = document.getElementById('mainContent') || document.getElementById('app');

  try {
    const studentId = state.session.id;
    const data = await api.student.getDashboard(studentId);
    const { student, pendingCount, assignments } = data;

    const html = `
      <h2 class="section-title">Mening vazifalarim</h2>
      <p class="section-sub">${pendingCount > 0 ? `Sizda ${pendingCount} ta topshirilmagan vazifa bor` : 'Barcha vazifalar topshirilgan'}</p>

      ${assignments.length === 0 ? '<p class="empty-note">Hozircha topshiriq yo\'q.</p>' :
        assignments.map(a => {
          const sub = a.submission;
          const badgeClass = !sub ? 'red' : !sub.checked ? 'amber' : 'green';
          const badgeText = !sub ? 'Topshirilmagan' : !sub.checked ? 'Tekshirilmoqda' : 'Baholandi';

          return `
            <div class="assignment-item">
              <div class="top-row">
                <div>
                  <h3>${escapeHtml(a.title)}</h3>
                  <div class="rmeta">Muddat: ${escapeHtml(a.dueDate || '—')}</div>
                </div>
                <span class="badge ${badgeClass}"><span class="dot"></span>${badgeText}</span>
              </div>
              <p class="desc">${escapeHtml(a.desc || '')}</p>
              
              ${!sub ? `
                <!-- Form for first submission -->
                <div class="submit-box">
                  <textarea id="submitText-${a.id}" autocomplete="off"></textarea>
                  <label for="submitFile-${a.id}" style="margin-top:10px;">Rasm yoki video biriktirish (ixtiyoriy)</label>
                  <input type="file" id="submitFile-${a.id}" accept="image/*,video/*">
                  <p class="empty-note" style="margin-top:4px;">Rasmlar avtomatik siqiladi. Video hajmi kichik bo'lishi kerak (3 MB gacha) — katta video uchun pastdagi havola maydonidan foydalaning.</p>
                  <label for="submitVideoLink-${a.id}">Video havolasi (agar fayl katta bo'lsa — masalan, Google Drive yoki YouTube havolasi)</label>
                  <input type="text" id="submitVideoLink-${a.id}" autocomplete="off">
                  <button class="btn-ghost btn-small" style="margin-top:12px;background:var(--accent);color:#fff;" data-submit="${a.id}">Topshirish</button>
                </div>
              ` : !sub.checked ? `
                <!-- Unchecked Submission View + Edit Mode -->
                <div style="background:var(--bg);padding:12px 14px;border-radius:4px;margin-bottom:10px;">
                  <p class="desc" style="margin:0;">${escapeHtml(sub.text || '(Matn kiritilmagan)')}</p>
                  ${renderMediaHtml(sub.media)}
                  ${sub.videoLink ? `<p class="rmeta" style="margin-top:6px;">Video havolasi: <a href="${escapeHtml(sub.videoLink)}" target="_blank" rel="noopener">${escapeHtml(sub.videoLink)}</a></p>` : ''}
                </div>
                <p class="empty-note" style="margin-bottom:8px;">Topshirdingiz. O'qituvchi tekshirguncha yechimingizni o'zgartirishingiz mumkin.</p>
                
                <details style="margin-top:8px;">
                  <summary class="btn-ghost btn-small" style="display:inline-block;cursor:pointer;">✏️ Yechimni o'zgartirish</summary>
                  <div class="submit-box" style="margin-top:12px;padding:12px;border:1px solid var(--border);border-radius:4px;">
                    <label>Vazifa yechimi matni</label>
                    <textarea id="submitText-${a.id}" autocomplete="off">${escapeHtml(sub.text || '')}</textarea>

                    <label style="margin-top:10px;">Yangi rasm yoki video biriktirish (ixtiyoriy)</label>
                    <input type="file" id="submitFile-${a.id}" accept="image/*,video/*">

                    <label style="margin-top:10px;">Video havolasi</label>
                    <input type="text" id="submitVideoLink-${a.id}" value="${escapeHtml(sub.videoLink || '')}" autocomplete="off">

                    <button class="btn-ghost btn-small" style="margin-top:12px;background:var(--accent);color:#fff;" data-submit="${a.id}">O'zgarishlarni saqlash</button>
                  </div>
                </details>
              ` : `
                <!-- Final Checked Submission -->
                <div style="background:var(--bg);padding:12px 14px;border-radius:4px;">
                  <p class="desc" style="margin:0;">${escapeHtml(sub.text || '(Matn kiritilmagan)')}</p>
                  ${renderMediaHtml(sub.media)}
                  ${sub.videoLink ? `<p class="rmeta" style="margin-top:6px;">Video havolasi: <a href="${escapeHtml(sub.videoLink)}" target="_blank" rel="noopener">${escapeHtml(sub.videoLink)}</a></p>` : ''}
                </div>
                <div class="feedback-box"><span class="g">Baho: ${escapeHtml(sub.grade)}</span>${sub.feedback ? ' — ' + escapeHtml(sub.feedback) : ''}</div>
              `}
            </div>
          `;
        }).join('')
      }
    `;

    container.innerHTML = html;

    // Attach Event Listeners for submission and editing
    container.querySelectorAll('[data-submit]').forEach(btn => {
      btn.onclick = async () => {
        const aid = btn.dataset.submit;
        const textEl = document.getElementById(`submitText-${aid}`);
        const fileInput = document.getElementById(`submitFile-${aid}`);
        const videoLinkEl = document.getElementById(`submitVideoLink-${aid}`);

        const text = textEl ? textEl.value.trim() : '';
        const videoLink = videoLinkEl ? videoLinkEl.value.trim() : '';
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;

        if (!text && !file && !videoLink) {
          showToast("Matn, rasm/video yoki havoladan birini kiriting");
          return;
        }

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = 'Yuborilmoqda...';

        let mediaPayload = null;
        if (file) {
          try {
            if (file.type.startsWith('image/')) {
              const dataUrl = await compressImage(file);
              mediaPayload = { type: 'image', dataUrl };
            } else if (file.type.startsWith('video/')) {
              if (file.size > 3.5 * 1024 * 1024) {
                btn.disabled = false;
                btn.textContent = originalText;
                showToast("Video juda katta (3.5 MB dan oshmasin). Video havolasi maydonidan foydalaning.");
                return;
              }
              const dataUrl = await readFileAsDataUrl(file);
              mediaPayload = { type: 'video', dataUrl };
            } else {
              btn.disabled = false;
              btn.textContent = originalText;
              showToast('Faqat rasm yoki video fayl qabul qilinadi');
              return;
            }
          } catch (e) {
            console.error('Fayl tayyorlashda xatolik:', e);
            showToast('Faylni o\'qishda xatolik yuz berdi');
          }
        }

        try {
          await api.student.submitAssignment({
            assignmentId: aid,
            studentId,
            text,
            media: mediaPayload,
            videoLink
          });
          showToast('Vazifa saqlandi va yangilandi');
          refreshApp();
        } catch (err) {
          btn.disabled = false;
          btn.textContent = originalText;
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

function compressImage(file, maxDim = 900, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        let q = quality;
        let dataUrl = canvas.toDataURL('image/jpeg', q);
        let tries = 0;
        while (dataUrl.length > 1.6 * 1024 * 1024 && tries < 5) {
          q = Math.max(0.35, q - 0.15);
          dataUrl = canvas.toDataURL('image/jpeg', q);
          tries++;
        }
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

if (typeof window !== 'undefined') {
  window.renderStudentView = renderStudentView;
}
