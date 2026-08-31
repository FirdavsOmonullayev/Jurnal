const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initial DB Structure
const INITIAL_DATA = {
  admin: null,
  teachers: [],
  groups: [],
  students: [],
  assignments: [],
  submissions: []
};

// Global in-memory persistence across warm invocations
if (!global._JURNAL_DB_CACHE) {
  global._JURNAL_DB_CACHE = null;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadInitialData() {
  try {
    const candidatePaths = [
      '/tmp/db.json',
      path.join(process.cwd(), 'backend', 'data', 'db.json'),
      path.join(process.cwd(), 'db.json')
    ];

    for (const p of candidatePaths) {
      try {
        if (p && fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
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
        }
      } catch (e) {}
    }
  } catch (e) {}

  return JSON.parse(JSON.stringify(INITIAL_DATA));
}

function getData() {
  try {
    if (!global._JURNAL_DB_CACHE) {
      global._JURNAL_DB_CACHE = loadInitialData();
    }
    return global._JURNAL_DB_CACHE || JSON.parse(JSON.stringify(INITIAL_DATA));
  } catch (e) {
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }
}

function saveData(data) {
  try {
    const validData = data || JSON.parse(JSON.stringify(INITIAL_DATA));
    global._JURNAL_DB_CACHE = validData;

    try {
      fs.writeFileSync('/tmp/db.json', JSON.stringify(validData, null, 2), 'utf8');
    } catch (e) {}

    return true;
  } catch (e) {
    return true;
  }
}

function isUsernameTaken(db, username) {
  const low = (username || '').trim().toLowerCase();
  if (db.admin && (db.admin.username || '').toLowerCase() === low) return true;
  if (db.teachers.some(t => (t.username || '').toLowerCase() === low)) return true;
  if (db.students.some(s => (s.username || '').toLowerCase() === low)) return true;
  return false;
}

// ----------------- AUTH ROUTES -----------------
app.get('/api/auth/status', (req, res) => {
  try {
    const db = getData();
    return res.json({ hasAdmin: !!db.admin });
  } catch (e) {
    return res.json({ hasAdmin: false });
  }
});

app.post('/api/auth/setup-admin', (req, res) => {
  try {
    const db = getData();
    if (db.admin) {
      return res.status(400).json({ error: 'CEO / Admin profili allaqachon mavjud' });
    }

    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Ism, login va parolni kiriting' });
    }

    const trimmedUsername = username.trim();
    if (isUsernameTaken(db, trimmedUsername)) {
      return res.status(400).json({ error: 'Bu login band, boshqasini tanlang' });
    }

    db.admin = {
      name: name.trim(),
      username: trimmedUsername,
      password: password
    };

    saveData(db);

    return res.json({
      success: true,
      user: { role: 'admin', id: 'admin', name: db.admin.name }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { role, username, password } = req.body;
    if (!role || !username || !password) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
    }

    const db = getData();
    const lowUser = username.trim().toLowerCase();

    if (role === 'student') {
      const student = db.students.find(s => (s.username || '').toLowerCase() === lowUser);
      if (!student || student.password !== password) {
        return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
      }
      return res.json({
        success: true,
        user: { role: 'student', id: student.id, name: student.name }
      });
    }

    if (role === 'teacher') {
      const teacher = db.teachers.find(t => (t.username || '').toLowerCase() === lowUser);
      if (!teacher || teacher.password !== password) {
        return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
      }
      return res.json({
        success: true,
        user: { role: 'teacher', id: teacher.id, name: teacher.name }
      });
    }

    if (role === 'admin') {
      if (!db.admin || (db.admin.username || '').toLowerCase() !== lowUser || db.admin.password !== password) {
        return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
      }
      return res.json({
        success: true,
        user: { role: 'admin', id: 'admin', name: db.admin.name }
      });
    }

    return res.status(400).json({ error: "Yaroqsiz rol ko'rsatilgan" });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

// ----------------- ADMIN ROUTES -----------------
app.get('/api/admin/dashboard', (req, res) => {
  try {
    const db = getData();

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

    return res.json({
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
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.post('/api/admin/teachers', (req, res) => {
  try {
    const db = getData();
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Ism, login va parolni kiriting' });
    }

    const trimmedUsername = username.trim();
    if (isUsernameTaken(db, trimmedUsername)) {
      return res.status(400).json({ error: 'Bu login band, boshqasini tanlang' });
    }

    const newTeacher = {
      id: uid(),
      name: name.trim(),
      username: trimmedUsername,
      password: password
    };

    db.teachers.push(newTeacher);
    saveData(db);

    return res.json({ success: true, teacher: { id: newTeacher.id, name: newTeacher.name, username: newTeacher.username } });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.delete('/api/admin/teachers/:id', (req, res) => {
  try {
    const db = getData();
    const id = req.params.id;

    db.teachers = db.teachers.filter(t => t.id !== id);
    db.groups.forEach(g => {
      if (g.teacherId === id) g.teacherId = null;
    });

    saveData(db);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.post('/api/admin/groups', (req, res) => {
  try {
    const db = getData();
    const { name, teacherId } = req.body;
    if (!name || !teacherId) {
      return res.status(400).json({ error: "Guruh nomi va o'qituvchini tanlang" });
    }

    const newGroup = {
      id: uid(),
      name: name.trim(),
      teacherId
    };

    db.groups.push(newGroup);
    saveData(db);

    return res.json({ success: true, group: newGroup });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.delete('/api/admin/groups/:id', (req, res) => {
  try {
    const db = getData();
    const id = req.params.id;

    db.groups = db.groups.filter(g => g.id !== id);
    db.students = db.students.filter(s => s.groupId !== id);
    const assignIds = db.assignments.filter(a => a.groupId === id).map(a => a.id);
    db.assignments = db.assignments.filter(a => a.groupId !== id);
    db.submissions = db.submissions.filter(sub => !assignIds.includes(sub.assignmentId));

    saveData(db);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.post('/api/admin/students', (req, res) => {
  try {
    const db = getData();
    const { name, groupId, username, password } = req.body;
    if (!name || !groupId || !username || !password) {
      return res.status(400).json({ error: "Ism, guruh, login va parolni kiriting" });
    }

    const trimmedUsername = username.trim();
    if (isUsernameTaken(db, trimmedUsername)) {
      return res.status(400).json({ error: 'Bu login band, boshqasini tanlang' });
    }

    const newStudent = {
      id: uid(),
      name: name.trim(),
      groupId,
      username: trimmedUsername,
      password: password
    };

    db.students.push(newStudent);
    saveData(db);

    return res.json({ success: true, student: { id: newStudent.id, name: newStudent.name, username: newStudent.username, groupId: newStudent.groupId } });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.delete('/api/admin/students/:id', (req, res) => {
  try {
    const db = getData();
    const id = req.params.id;

    db.students = db.students.filter(s => s.id !== id);
    db.submissions = db.submissions.filter(sub => sub.studentId !== id);

    saveData(db);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.get('/api/admin/groups/:id', (req, res) => {
  try {
    const db = getData();
    const groupId = req.params.id;
    const group = db.groups.find(g => g.id === groupId);
    if (!group) return res.status(404).json({ error: 'Guruh topilmadi' });

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

    return res.json({
      group: {
        id: group.id,
        name: group.name,
        teacherName: teacher ? teacher.name : '',
        studentsCount: groupStudents.length
      },
      assignments: resultAssignments
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

// ----------------- TEACHER ROUTES -----------------
app.get('/api/teacher/dashboard', (req, res) => {
  try {
    const teacherId = req.query.teacherId;
    if (!teacherId) return res.status(400).json({ error: 'Teacher ID required' });

    const db = getData();
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

      return {
        id: g.id,
        name: g.name,
        studentsCount: groupStudents.length,
        assignments: assignList
      };
    });

    return res.json({ groups: result });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.post('/api/teacher/assignments', (req, res) => {
  try {
    const db = getData();
    const { groupId, title, desc, dueDate } = req.body;
    if (!groupId || !title || !desc || !dueDate) {
      return res.status(400).json({ error: "Sarlavha, tavsif va muddatni to'liq kiriting" });
    }

    const newAssign = {
      id: uid(),
      groupId,
      title: title.trim(),
      desc: desc.trim(),
      dueDate: dueDate.trim()
    };

    db.assignments.push(newAssign);
    saveData(db);

    return res.json({ success: true, assignment: newAssign });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.delete('/api/teacher/assignments/:id', (req, res) => {
  try {
    const db = getData();
    const id = req.params.id;

    db.assignments = db.assignments.filter(a => a.id !== id);
    db.submissions = db.submissions.filter(sub => sub.assignmentId !== id);

    saveData(db);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.get('/api/teacher/assignments/:assignmentId/group/:groupId', (req, res) => {
  try {
    const db = getData();
    const { assignmentId, groupId } = req.params;

    const assignment = db.assignments.find(a => a.id === assignmentId);
    const group = db.groups.find(g => g.id === groupId);

    if (!assignment || !group) return res.status(404).json({ error: 'Topshiriq yoki guruh topilmadi' });

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

    return res.json({
      assignment: { id: assignment.id, title: assignment.title, desc: assignment.desc, dueDate: assignment.dueDate },
      group: { id: group.id, name: group.name },
      students: studentList
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.post('/api/teacher/grade', (req, res) => {
  try {
    const db = getData();
    const { assignmentId, studentId, grade, feedback } = req.body;
    if (!assignmentId || !studentId || !grade) {
      return res.status(400).json({ error: 'Baho kiriting' });
    }

    let sub = db.submissions.find(s => s.assignmentId === assignmentId && s.studentId === studentId);
    if (!sub) {
      sub = {
        id: uid(),
        assignmentId,
        studentId,
        text: '',
        media: null,
        videoLink: '',
        checked: true,
        grade: grade.trim(),
        feedback: (feedback || '').trim()
      };
      db.submissions.push(sub);
    } else {
      sub.checked = true;
      sub.grade = grade.trim();
      sub.feedback = (feedback || '').trim();
    }

    saveData(db);
    return res.json({ success: true, submission: sub });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

// ----------------- STUDENT ROUTES -----------------
app.get('/api/student/dashboard', (req, res) => {
  try {
    const studentId = req.query.studentId;
    if (!studentId) return res.status(400).json({ error: 'Student ID required' });

    const db = getData();
    const student = db.students.find(s => s.id === studentId);
    if (!student) return res.status(404).json({ error: "O'quvchi topilmadi" });

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

    return res.json({
      student: { id: student.id, name: student.name, groupId: student.groupId },
      pendingCount,
      assignments: assignList
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.post('/api/student/submit', (req, res) => {
  try {
    const db = getData();
    const { assignmentId, studentId, text, media, videoLink } = req.body;

    if (!assignmentId || !studentId) {
      return res.status(400).json({ error: "Ma'lumot yetarli emas" });
    }
    if (!text && !media && !videoLink) {
      return res.status(400).json({ error: "Matn, rasm/video yoki havoladan birini kiriting" });
    }

    let sub = db.submissions.find(s => s.assignmentId === assignmentId && s.studentId === studentId);
    if (sub && sub.checked) {
      return res.status(400).json({ error: "Bu vazifa allaqachon tekshirilgan va baholangan. O'zgartirib bo'lmaydi." });
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

    saveData(db);
    return res.json({ success: true, submission: sub });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Serverda xatolik yuz berdi' });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({ error: err.message || 'Serverda ichki xatolik yuz berdi' });
});

app.all('*', (req, res) => {
  res.status(404).json({ error: 'API endpoint topilmadi' });
});

module.exports = app;
