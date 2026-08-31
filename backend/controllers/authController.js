const { getData, saveData } = require('../db/db');

function isUsernameTaken(db, username) {
  const low = (username || '').trim().toLowerCase();
  if (db.admin && (db.admin.username || '').toLowerCase() === low) return true;
  if (db.teachers.some(t => (t.username || '').toLowerCase() === low)) return true;
  if (db.students.some(s => (s.username || '').toLowerCase() === low)) return true;
  return false;
}

exports.getStatus = (req, res) => {
  const db = getData();
  return res.json({
    hasAdmin: !!db.admin
  });
};

exports.setupAdmin = (req, res) => {
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
    user: {
      role: 'admin',
      id: 'admin',
      name: db.admin.name
    }
  });
};

exports.login = (req, res) => {
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
};
