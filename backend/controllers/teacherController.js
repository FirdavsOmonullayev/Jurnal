const { getData, saveData, uid } = require('../db/db');

exports.getDashboard = (req, res) => {
  const { teacherId } = req.query;
  if (!teacherId) {
    return res.status(400).json({ error: "O'qituvchi ID ko'rsatilmadi" });
  }

  const db = getData();
  const myGroups = db.groups.filter(g => g.teacherId === teacherId);

  const groupsData = myGroups.map(group => {
    const students = db.students.filter(s => s.groupId === group.id);
    const assignments = db.assignments
      .filter(a => a.groupId === group.id)
      .sort((a, b) => b.createdAt - a.createdAt);

    const assignmentsWithStats = assignments.map(assign => {
      const subs = db.submissions.filter(x => x.assignmentId === assign.id);
      const submitted = subs.length;
      const checked = subs.filter(x => x.checked).length;
      const total = students.length;
      const isDone = total > 0 && submitted === total && checked === total;

      return {
        id: assign.id,
        title: assign.title,
        desc: assign.desc,
        dueDate: assign.dueDate,
        createdAt: assign.createdAt,
        submitted,
        checked,
        total,
        isDone
      };
    });

    return {
      id: group.id,
      name: group.name,
      studentsCount: students.length,
      assignments: assignmentsWithStats
    };
  });

  return res.json({ groups: groupsData });
};

exports.createAssignment = (req, res) => {
  const { groupId, title, desc, dueDate } = req.body;
  if (!groupId || !title || !desc || !dueDate) {
    return res.status(400).json({ error: "Sarlavha, tavsif va muddatni to'liq kiriting" });
  }

  const db = getData();
  const group = db.groups.find(g => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Guruh topilmadi' });
  }

  const newAssignment = {
    id: uid(),
    groupId,
    title: title.trim(),
    desc: (desc || '').trim(),
    dueDate: (dueDate || '').trim(),
    createdAt: Date.now()
  };

  db.assignments.push(newAssignment);
  saveData(db);

  return res.json({ success: true, assignment: newAssignment });
};

exports.getAssignmentDetail = (req, res) => {
  const { assignmentId, groupId } = req.params;
  const db = getData();

  const assignment = db.assignments.find(a => a.id === assignmentId);
  const group = db.groups.find(g => g.id === groupId);

  if (!assignment || !group) {
    return res.status(404).json({ error: 'Topshiriq yoki guruh topilmadi' });
  }

  const students = db.students.filter(s => s.groupId === groupId);

  const studentSubmissions = students.map(s => {
    const sub = db.submissions.find(x => x.assignmentId === assignmentId && x.studentId === s.id);
    return {
      studentId: s.id,
      studentName: s.name,
      submission: sub ? {
        id: sub.id,
        text: sub.text,
        submittedAt: sub.submittedAt,
        checked: sub.checked,
        grade: sub.grade,
        feedback: sub.feedback,
        media: sub.media || null, // { type: 'image'|'video', dataUrl: string }
        videoLink: sub.videoLink || null
      } : null
    };
  });

  return res.json({
    assignment: {
      id: assignment.id,
      title: assignment.title,
      desc: assignment.desc,
      dueDate: assignment.dueDate
    },
    group: {
      id: group.id,
      name: group.name
    },
    students: studentSubmissions
  });
};

exports.deleteAssignment = (req, res) => {
  const { assignmentId } = req.params;
  const db = getData();

  db.assignments = db.assignments.filter(a => a.id !== assignmentId);
  db.submissions = db.submissions.filter(s => s.assignmentId !== assignmentId);

  saveData(db);
  return res.json({ success: true });
};

exports.gradeSubmission = (req, res) => {
  const { assignmentId, studentId, grade, feedback } = req.body;
  if (!assignmentId || !studentId || !grade) {
    return res.status(400).json({ error: "Topshiriq, o'quvchi va bahoni kiriting" });
  }

  const db = getData();
  let sub = db.submissions.find(x => x.assignmentId === assignmentId && x.studentId === studentId);

  if (!sub) {
    return res.status(404).json({ error: "Javob topilmadi" });
  }

  sub.checked = true;
  sub.grade = grade.trim();
  sub.feedback = (feedback || '').trim();
  sub.checkedAt = Date.now();

  saveData(db);

  return res.json({ success: true, submission: sub });
};
