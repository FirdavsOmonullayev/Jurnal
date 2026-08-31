const IS_VERCEL_ENV = window.location.hostname.endsWith('.vercel.app');

const API_BASE = window.location.protocol.startsWith('http') 
  ? '/api' 
  : 'http://localhost:5000/api';

// ---------------- LOCAL STORAGE DB ENGINE FOR VERCEL LIVE URL ----------------
const LOCAL_STORAGE_DB_KEY = 'jurnal_app_db_v3';

const INITIAL_DB = {
  admin: null,
  teachers: [],
  groups: [],
  students: [],
  assignments: [],
  submissions: []
};

function getClientDb() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          admin: parsed.admin || null,
          teachers: Array.isArray(parsed.teachers) ? parsed.teachers : [],
          groups: Array.isArray(parsed.groups) ? parsed.groups : [],
          students: Array.isArray(parsed.students) ? parsed.students : [],
          assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
          submissions: Array.isArray(parsed.submissions) ? parsed.submissions : []
        };
      }
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(INITIAL_DB));
}

function saveClientDb(db) {
  try {
    localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(db));
  } catch (e) {}
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function isUsernameTaken(db, username) {
  const low = (username || '').trim().toLowerCase();
  if (db.admin && (db.admin.username || '').toLowerCase() === low) return true;
  if (db.teachers.some(t => (t.username || '').toLowerCase() === low)) return true;
  if (db.students.some(s => (s.username || '').toLowerCase() === low)) return true;
  return false;
}

// ---------------- HTTP REQUEST ENGINE FOR LOCALHOST ----------------
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const text = await response.text();
    
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (parseErr) {
      throw new Error("Server xatosi: " + (text.slice(0, 100) || "Serverdan yaroqsiz javob keldi"));
    }

    if (!response.ok) {
      throw new Error(data.error || 'Serverda xatolik yuz berdi');
    }
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Fetch')) {
      throw new Error("Backend serverga ulanib bo'lmadi");
    }
    throw error;
  }
}

// ---------------- HYBRID API INTERFACE ----------------
export const api = {
  auth: {
    getStatus: async () => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        return { hasAdmin: !!db.admin };
      }
      return request('/auth/status');
    },
    setupAdmin: async (payload) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        if (db.admin) throw new Error('CEO / Admin profili allaqachon mavjud');
        const { name, username, password } = payload;
        if (!name || !username || !password) throw new Error('Ism, login va parolni kiriting');

        const trimmedUsername = username.trim();
        if (isUsernameTaken(db, trimmedUsername)) throw new Error('Bu login band, boshqasini tanlang');

        db.admin = { name: name.trim(), username: trimmedUsername, password };
        saveClientDb(db);
        return { success: true, user: { role: 'admin', id: 'admin', name: db.admin.name } };
      }
      return request('/auth/setup-admin', { method: 'POST', body: JSON.stringify(payload) });
    },
    login: async (payload) => {
      if (IS_VERCEL_ENV) {
        const { role, username, password } = payload;
        if (!role || !username || !password) throw new Error("Barcha maydonlarni to'ldiring");

        const db = getClientDb();
        const lowUser = username.trim().toLowerCase();

        if (role === 'student') {
          const student = db.students.find(s => (s.username || '').toLowerCase() === lowUser);
          if (!student || student.password !== password) throw new Error("Login yoki parol noto'g'ri");
          return { success: true, user: { role: 'student', id: student.id, name: student.name } };
        }

        if (role === 'teacher') {
          const teacher = db.teachers.find(t => (t.username || '').toLowerCase() === lowUser);
          if (!teacher || teacher.password !== password) throw new Error("Login yoki parol noto'g'ri");
          return { success: true, user: { role: 'teacher', id: teacher.id, name: teacher.name } };
        }

        if (role === 'admin') {
          if (!db.admin || (db.admin.username || '').toLowerCase() !== lowUser || db.admin.password !== password) {
            throw new Error("Login yoki parol noto'g'ri");
          }
          return { success: true, user: { role: 'admin', id: 'admin', name: db.admin.name } };
        }

        throw new Error("Yaroqsiz rol ko'rsatilgan");
      }
      return request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
    }
  },

  admin: {
    getDashboard: async () => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        const groupsDetail = db.groups.map(g => {
          const teacher = db.teachers.find(t => t.id === g.teacherId);
          const groupStudents = db.students.filter(s => s.groupId === g.id);
          const groupAssignments = db.assignments.filter(a => a.groupId === g.id);

          const hasPending = groupAssignments.some(a => {
            return groupStudents.some(s => {
              const sub = db.submissions.find(sub => sub.assignmentId === a.id && sub.studentId === s.id);
              return !sub || !sub.checked;
            });
          });

          return {
            id: g.id,
            name: g.name,
            teacherId: g.teacherId,
            teacherName: teacher ? teacher.name : '',
            studentsCount: groupStudents.length,
            assignmentsCount: groupAssignments.length,
            hasPending
          };
        });

        const redGroupsCount = groupsDetail.filter(g => g.hasPending && g.assignmentsCount > 0).length;

        return {
          stats: {
            teachers: db.teachers.length,
            groups: db.groups.length,
            students: db.students.length,
            redGroups: redGroupsCount
          },
          groups: groupsDetail,
          teachers: db.teachers.map(t => ({ id: t.id, name: t.name, username: t.username })),
          students: db.students.map(s => {
            const group = db.groups.find(g => g.id === s.groupId);
            return {
              id: s.id,
              name: s.name,
              username: s.username,
              groupId: s.groupId,
              groupName: group ? group.name : ''
            };
          })
        };
      }
      return request('/admin/dashboard');
    },

    addTeacher: async (payload) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        const { name, username, password } = payload;
        if (!name || !username || !password) throw new Error('Ism, login va parolni kiriting');

        const trimmedUsername = username.trim();
        if (isUsernameTaken(db, trimmedUsername)) throw new Error('Bu login band, boshqasini tanlang');

        const newTeacher = { id: uid(), name: name.trim(), username: trimmedUsername, password };
        db.teachers.push(newTeacher);
        saveClientDb(db);
        return { success: true, teacher: { id: newTeacher.id, name: newTeacher.name, username: newTeacher.username } };
      }
      return request('/admin/teachers', { method: 'POST', body: JSON.stringify(payload) });
    },

    deleteTeacher: async (teacherId) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        db.teachers = db.teachers.filter(t => t.id !== teacherId);
        db.groups.forEach(g => { if (g.teacherId === teacherId) g.teacherId = null; });
        saveClientDb(db);
        return { success: true };
      }
      return request(`/admin/teachers/${teacherId}`, { method: 'DELETE' });
    },

    addGroup: async (payload) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        const { name, teacherId } = payload;
        if (!name || !teacherId) throw new Error("Guruh nomi va o'qituvchini tanlang");

        const newGroup = { id: uid(), name: name.trim(), teacherId };
        db.groups.push(newGroup);
        saveClientDb(db);
        return { success: true, group: newGroup };
      }
      return request('/admin/groups', { method: 'POST', body: JSON.stringify(payload) });
    },

    deleteGroup: async (groupId) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        db.groups = db.groups.filter(g => g.id !== groupId);
        db.students = db.students.filter(s => s.groupId !== groupId);
        const assignIds = db.assignments.filter(a => a.groupId === groupId).map(a => a.id);
        db.assignments = db.assignments.filter(a => a.groupId !== groupId);
        db.submissions = db.submissions.filter(sub => !assignIds.includes(sub.assignmentId));
        saveClientDb(db);
        return { success: true };
      }
      return request(`/admin/groups/${groupId}`, { method: 'DELETE' });
    },

    addStudent: async (payload) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        const { name, groupId, username, password } = payload;
        if (!name || !groupId || !username || !password) throw new Error("Ism, guruh, login va parolni kiriting");

        const trimmedUsername = username.trim();
        if (isUsernameTaken(db, trimmedUsername)) throw new Error('Bu login band, boshqasini tanlang');

        const newStudent = { id: uid(), name: name.trim(), groupId, username: trimmedUsername, password };
        db.students.push(newStudent);
        saveClientDb(db);
        return { success: true, student: { id: newStudent.id, name: newStudent.name, username: newStudent.username, groupId: newStudent.groupId } };
      }
      return request('/admin/students', { method: 'POST', body: JSON.stringify(payload) });
    },

    deleteStudent: async (studentId) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        db.students = db.students.filter(s => s.id !== studentId);
        db.submissions = db.submissions.filter(sub => sub.studentId !== studentId);
        saveClientDb(db);
        return { success: true };
      }
      return request(`/admin/students/${studentId}`, { method: 'DELETE' });
    },

    getGroupDetail: async (groupId) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        const group = db.groups.find(g => g.id === groupId);
        if (!group) throw new Error('Guruh topilmadi');

        const teacher = db.teachers.find(t => t.id === group.teacherId);
        const groupStudents = db.students.filter(s => s.groupId === groupId);
        const assignments = db.assignments.filter(a => a.groupId === groupId);

        const resultAssignments = assignments.map(a => {
          const subs = db.submissions.filter(sub => sub.assignmentId === a.id);
          const submitted = subs.length;
          const checked = subs.filter(sub => sub.checked).length;
          const isDone = groupStudents.length > 0 && checked === groupStudents.length;

          return {
            id: a.id,
            title: a.title,
            dueDate: a.dueDate,
            total: groupStudents.length,
            submitted,
            checked,
            isDone
          };
        });

        return {
          group: { id: group.id, name: group.name, teacherName: teacher ? teacher.name : '', studentsCount: groupStudents.length },
          assignments: resultAssignments
        };
      }
      return request(`/admin/groups/${groupId}`);
    }
  },

  teacher: {
    getDashboard: async (teacherId) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        const myGroups = db.groups.filter(g => g.teacherId === teacherId);

        const result = myGroups.map(g => {
          const groupStudents = db.students.filter(s => s.groupId === g.id);
          const groupAssignments = db.assignments.filter(a => a.groupId === g.id);

          const assignList = groupAssignments.map(a => {
            const subs = db.submissions.filter(sub => sub.assignmentId === a.id);
            const submitted = subs.length;
            const checked = subs.filter(sub => sub.checked).length;
            const isDone = groupStudents.length > 0 && checked === groupStudents.length;

            return {
              id: a.id,
              title: a.title,
              dueDate: a.dueDate,
              total: groupStudents.length,
              submitted,
              checked,
              isDone
            };
          });

          return { id: g.id, name: g.name, studentsCount: groupStudents.length, assignments: assignList };
        });

        return { groups: result };
      }
      return request(`/teacher/dashboard?teacherId=${teacherId}`);
    },

    createAssignment: async (payload) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        const { groupId, title, desc, dueDate } = payload;
        if (!groupId || !title || !desc || !dueDate) throw new Error("Sarlavha, tavsif va muddatni to'liq kiriting");

        const newAssign = { id: uid(), groupId, title: title.trim(), desc: desc.trim(), dueDate: dueDate.trim() };
        db.assignments.push(newAssign);
        saveClientDb(db);
        return { success: true, assignment: newAssign };
      }
      return request('/teacher/assignments', { method: 'POST', body: JSON.stringify(payload) });
    },

    deleteAssignment: async (assignmentId) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        db.assignments = db.assignments.filter(a => a.id !== assignmentId);
        db.submissions = db.submissions.filter(sub => sub.assignmentId !== assignmentId);
        saveClientDb(db);
        return { success: true };
      }
      return request(`/teacher/assignments/${assignmentId}`, { method: 'DELETE' });
    },

    getAssignmentDetail: async (assignmentId, groupId) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        const assignment = db.assignments.find(a => a.id === assignmentId);
        const group = db.groups.find(g => g.id === groupId);

        if (!assignment || !group) throw new Error('Topshiriq yoki guruh topilmadi');

        const groupStudents = db.students.filter(s => s.groupId === groupId);

        const studentList = groupStudents.map(s => {
          const sub = db.submissions.find(sub => sub.assignmentId === assignmentId && sub.studentId === s.id);
          return {
            studentId: s.id,
            studentName: s.name,
            submission: sub ? {
              text: sub.text,
              media: sub.media || null,
              videoLink: sub.videoLink || '',
              checked: sub.checked,
              grade: sub.grade || '',
              feedback: sub.feedback || ''
            } : null
          };
        });

        return {
          assignment: { id: assignment.id, title: assignment.title, desc: assignment.desc, dueDate: assignment.dueDate },
          group: { id: group.id, name: group.name },
          students: studentList
        };
      }
      return request(`/teacher/assignments/${assignmentId}/group/${groupId}`);
    },

    gradeSubmission: async (payload) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        const { assignmentId, studentId, grade, feedback } = payload;
        if (!assignmentId || !studentId || !grade) throw new Error('Baho kiriting');

        let sub = db.submissions.find(s => s.assignmentId === assignmentId && s.studentId === studentId);
        if (!sub) {
          sub = { id: uid(), assignmentId, studentId, text: '', media: null, videoLink: '', checked: true, grade: grade.trim(), feedback: (feedback || '').trim() };
          db.submissions.push(sub);
        } else {
          sub.checked = true;
          sub.grade = grade.trim();
          sub.feedback = (feedback || '').trim();
        }

        saveClientDb(db);
        return { success: true, submission: sub };
      }
      return request('/teacher/grade', { method: 'POST', body: JSON.stringify(payload) });
    }
  },

  student: {
    getDashboard: async (studentId) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        const student = db.students.find(s => s.id === studentId);
        if (!student) throw new Error("O'quvchi topilmadi");

        const groupAssignments = db.assignments.filter(a => a.groupId === student.groupId);

        let pendingCount = 0;
        const assignList = groupAssignments.map(a => {
          const sub = db.submissions.find(s => s.assignmentId === a.id && s.studentId === studentId);
          if (!sub) pendingCount++;

          return {
            id: a.id,
            title: a.title,
            desc: a.desc,
            dueDate: a.dueDate,
            submission: sub ? {
              text: sub.text,
              media: sub.media || null,
              videoLink: sub.videoLink || '',
              checked: sub.checked,
              grade: sub.grade || '',
              feedback: sub.feedback || ''
            } : null
          };
        });

        return {
          student: { id: student.id, name: student.name, groupId: student.groupId },
          pendingCount,
          assignments: assignList
        };
      }
      return request(`/student/dashboard?studentId=${studentId}`);
    },

    submitAssignment: async (payload) => {
      if (IS_VERCEL_ENV) {
        const db = getClientDb();
        const { assignmentId, studentId, text, media, videoLink } = payload;

        if (!assignmentId || !studentId) throw new Error("Ma'lumot yetarli emas");
        if (!text && !media && !videoLink) throw new Error("Matn, rasm/video yoki havoladan birini kiriting");

        let sub = db.submissions.find(s => s.assignmentId === assignmentId && s.studentId === studentId);
        if (sub && sub.checked) {
          throw new Error("Bu vazifa allaqachon tekshirilgan va baholangan. O'zgartirib bo'lmaydi.");
        }

        if (sub) {
          sub.text = (text || '').trim();
          sub.media = media || sub.media || null;
          sub.videoLink = (videoLink || '').trim();
          sub.checked = false;
        } else {
          sub = {
            id: uid(),
            assignmentId,
            studentId,
            text: (text || '').trim(),
            media: media || null,
            videoLink: (videoLink || '').trim(),
            checked: false,
            grade: '',
            feedback: ''
          };
          db.submissions.push(sub);
        }

        saveClientDb(db);
        return { success: true, submission: sub };
      }
      return request('/student/submit', { method: 'POST', body: JSON.stringify(payload) });
    }
  }
};
