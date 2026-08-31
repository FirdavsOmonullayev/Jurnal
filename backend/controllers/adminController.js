const { getData, saveData, uid } = require('../db/db');

function isUsernameTaken(db, username) {
  const low = (username || '').trim().toLowerCase();
  if (db.admin && (db.admin.username || '').toLowerCase() === low) return true;
  if (db.teachers.some(t => (t.username || '').toLowerCase() === low)) return true;
  if (db.students.some(s => (s.username || '').toLowerCase() === low)) return true;
  return false;
}

function getGroupStats(db, groupId) {
  const groupStudents = db.students.filter(s => s.groupId === groupId);
  const groupAssignments = db.assignments.filter(a => a.groupId === groupId);

  if (groupAssignments.length === 0) return { hasPending: false, assignmentsCount: 0 };

  let hasPending = false;

  const assignmentsStats = groupAssignments.map(assign => {
    const subs = db.submissions.filter(x => x.assignmentId === assign.id);
    const submitted = subs.length;
    const checked = subs.filter(x => x.checked).length;
    const total = groupStudents.length;
    const isDone = total > 0 && submitted === total && checked === total;

    if (!isDone) hasPending = true;

    return {
      id: assign.id,
      title: assign.title,
      dueDate: assign.dueDate,
      submitted,
      checked,
      total,
      isDone
    };
  });

  return {
    hasPending,
    assignmentsCount: groupAssignments.length,
    assignmentsStats
  };
}

exports.getDashboard = (req, res) => {
  const db = getData();

  const totalTeachers = db.teachers.length;
  const totalGroups = db.groups.length;
  const totalStudents = db.students.length;

  let redGroupsCount = 0;

  const groupsList = db.groups.map(g => {
    const teacher = db.teachers.find(t => t.id === g.teacherId);
    const studentsCount = db.students.filter(s => s.groupId === g.id).length;
    const stats = getGroupStats(db, g.id);

    if (stats.hasPending) redGroupsCount++;

    return {
      id: g.id,
      name: g.name,
      teacherId: g.teacherId,
      teacherName: teacher ? teacher.name : null,
      studentsCount,
      assignmentsCount: stats.assignmentsCount,
      hasPending: stats.hasPending
    };
  });

  return res.json({
    stats: {
      teachers: totalTeachers,
      groups: totalGroups,
      students: totalStudents,
      redGroups: redGroupsCount
    },
    groups: groupsList,
    teachers: db.teachers.map(t => ({ id: t.id, name: t.name, username: t.username })),
    students: db.students.map(s => {
      const g = db.groups.find(x => x.id === s.groupId);
      return { id: s.id, name: s.name, username: s.username, groupName: g ? g.name : '' };
    })
  });
};

exports.addTeacher = (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Ism, login va parolni kiriting' });
  }

  const db = getData();
  const trimmedUser = username.trim();
  if (isUsernameTaken(db, trimmedUser)) {
    return res.status(400).json({ error: 'Bu login band, boshqasini tanlang' });
  }

  const newTeacher = {
    id: uid(),
    name: name.trim(),
    username: trimmedUser,
    password
  };

  db.teachers.push(newTeacher);
  saveData(db);

  return res.json({ success: true, teacher: { id: newTeacher.id, name: newTeacher.name } });
};

exports.deleteTeacher = (req, res) => {
  const { teacherId } = req.params;
  const db = getData();

  db.teachers = db.teachers.filter(t => t.id !== teacherId);
  // Unassign from groups
  db.groups.forEach(g => {
    if (g.teacherId === teacherId) g.teacherId = null;
  });

  saveData(db);
  return res.json({ success: true });
};

exports.addGroup = (req, res) => {
  const { name, teacherId } = req.body;
  if (!name || !teacherId) {
    return res.status(400).json({ error: "Guruh nomi va o'qituvchini tanlang" });
  }

  const db = getData();
  const newGroup = {
    id: uid(),
    name: name.trim(),
    teacherId
  };

  db.groups.push(newGroup);
  saveData(db);

  return res.json({ success: true, group: newGroup });
};

exports.deleteGroup = (req, res) => {
  const { groupId } = req.params;
  const db = getData();

  db.groups = db.groups.filter(g => g.id !== groupId);
  db.students = db.students.filter(s => s.groupId !== groupId);
  const assigns = db.assignments.filter(a => a.groupId === groupId);
  const assignIds = assigns.map(a => a.id);
  db.assignments = db.assignments.filter(a => a.groupId !== groupId);
  db.submissions = db.submissions.filter(x => !assignIds.includes(x.assignmentId));

  saveData(db);
  return res.json({ success: true });
};

exports.addStudent = (req, res) => {
  const { name, groupId, username, password } = req.body;
  if (!name || !groupId || !username || !password) {
    return res.status(400).json({ error: "Ism, guruh, login va parolni kiriting" });
  }

  const db = getData();
  const trimmedUser = username.trim();
  if (isUsernameTaken(db, trimmedUser)) {
    return res.status(400).json({ error: 'Bu login band, boshqasini tanlang' });
  }

  const newStudent = {
    id: uid(),
    name: name.trim(),
    groupId,
    username: trimmedUser,
    password
  };

  db.students.push(newStudent);
  saveData(db);

  return res.json({ success: true, student: { id: newStudent.id, name: newStudent.name } });
};

exports.deleteStudent = (req, res) => {
  const { studentId } = req.params;
  const db = getData();

  db.students = db.students.filter(s => s.id !== studentId);
  db.submissions = db.submissions.filter(x => x.studentId !== studentId);

  saveData(db);
  return res.json({ success: true });
};

exports.getGroupDetail = (req, res) => {
  const { groupId } = req.params;
  const db = getData();

  const group = db.groups.find(g => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Guruh topilmadi' });
  }

  const teacher = db.teachers.find(t => t.id === group.teacherId);
  const students = db.students.filter(s => s.groupId === groupId);
  const stats = getGroupStats(db, groupId);

  return res.json({
    group: {
      id: group.id,
      name: group.name,
      teacherName: teacher ? teacher.name : null,
      studentsCount: students.length
    },
    assignments: stats.assignmentsStats || []
  });
};
