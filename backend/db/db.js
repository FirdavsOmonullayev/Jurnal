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
  const possiblePaths = [
    path.join(__dirname, '../data/db.json'),
    path.join(process.cwd(), 'backend/data/db.json'),
    path.join(process.cwd(), 'data/db.json'),
    '/tmp/db.json'
  ];

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          // Ensure all required top-level keys exist
          return {
            admin: parsed.admin || null,
            teachers: parsed.teachers || [],
            groups: parsed.groups || [],
            students: parsed.students || [],
            assignments: parsed.assignments || [],
            submissions: parsed.submissions || []
          };
        }
      }
    } catch (e) {}
  }

  return JSON.parse(JSON.stringify(INITIAL_DATA));
}

function getData() {
  if (!global._JURNAL_DB_CACHE) {
    global._JURNAL_DB_CACHE = loadInitialData();
  }
  return global._JURNAL_DB_CACHE;
}

function saveData(data) {
  global._JURNAL_DB_CACHE = data;

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
      fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      // Ignore read-only filesystem errors in serverless environments
    }
  }
  return true;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

module.exports = {
  getData,
  saveData,
  uid
};
