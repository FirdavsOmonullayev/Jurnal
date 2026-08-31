const { getData, saveData, uid } = require('../db/db');

exports.getDashboard = (req, res) => {
  const { studentId } = req.query;
  if (!studentId) {
    return res.status(400).json({ error: "O'quvchi ID ko'rsatilmadi" });
  }

  const db = getData();
  const student = db.students.find(s => s.id === studentId);
  if (!student) {
    return res.status(404).json({ error: "O'quvchi topilmadi" });
  }

  const group = db.groups.find(g => g.id === student.groupId);
  const assignments = db.assignments
    .filter(a => a.groupId === student.groupId)
    .sort((a, b) => b.createdAt - a.createdAt);

  const assignmentsList = assignments.map(a => {
    const sub = db.submissions.find(x => x.assignmentId === a.id && x.studentId === studentId);
    return {
      id: a.id,
      title: a.title,
      desc: a.desc,
      dueDate: a.dueDate,
      createdAt: a.createdAt,
      submission: sub ? {
        id: sub.id,
        text: sub.text,
        submittedAt: sub.submittedAt,
        checked: sub.checked,
        grade: sub.grade,
        feedback: sub.feedback,
        media: sub.media || null,
        videoLink: sub.videoLink || null
      } : null
    };
  });

  const pendingCount = assignmentsList.filter(a => !a.submission).length;

  return res.json({
    student: {
      id: student.id,
      name: student.name,
      groupName: group ? group.name : ''
    },
    pendingCount,
    assignments: assignmentsList
  });
};

exports.submitAssignment = (req, res) => {
  const { assignmentId, studentId, text, media, videoLink } = req.body;
  if (!assignmentId || !studentId) {
    return res.status(400).json({ error: "Topshiriq va o'quvchi ko'rsatilmadi" });
  }

  if (!text && !media && !videoLink) {
    return res.status(400).json({ error: "Matn, fayl yoki havoladan birini kiriting" });
  }

  const db = getData();
  const existingSubIndex = db.submissions.findIndex(x => x.assignmentId === assignmentId && x.studentId === studentId);

  const newSub = {
    id: uid(),
    assignmentId,
    studentId,
    text: (text || '').trim(),
    media: media || null,
    videoLink: (videoLink || '').trim(),
    submittedAt: Date.now(),
    checked: false,
    grade: '',
    feedback: ''
  };

  if (existingSubIndex >= 0) {
    db.submissions[existingSubIndex] = newSub;
  } else {
    db.submissions.push(newSub);
  }

  saveData(db);

  return res.json({ success: true, submission: newSub });
};
