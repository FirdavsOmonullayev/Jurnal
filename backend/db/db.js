const fs = require('fs');
const path = require('path');

const INITIAL_DATA = {
  admin: null,
  teachers: [],
  groups: [],
  students: [],
  assignments: [],
  submissions: []
};

// Global in-memory singleton for serverless persistence across warm invocations
if (!global._JURNAL_DB_CACHE) {
  global._JURNAL_DB_CACHE = null;
}

function loadInitialData() {
  try {
    const possiblePaths = [
      path.join(__dirname, '../data/db.json'),
      path.join(process.cwd(), 'backend/data/db.json'),
      path.join(process.cwd(), 'data/db.json'),
      '/tmp/db.json'
    ];

    for (const filePath of possiblePaths) {
      try {
        if (filePath && fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content) {
            const parsed = JSON.parse(content);
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
  } catch (err) {}

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

    const targetPaths = [
      '/tmp/db.json',
      path.join(__dirname, '../data/db.json'),
      path.join(process.cwd(), 'backend/data/db.json')
    ];

    for (const p of targetPaths) {
      try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(p, JSON.stringify(validData, null, 2), 'utf8');
      } catch (e) {}
    }
    return true;
  } catch (e) {
    return true;
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

module.exports = {
  getData,
  saveData,
  uid
};
