const fs = require('fs');
const path = require('path');

const LOCAL_DB_DIR = path.join(__dirname, '../data');
const LOCAL_DB_FILE = path.join(LOCAL_DB_DIR, 'db.json');

const IS_VERCEL = !!process.env.VERCEL;
const VERCEL_TMP_FILE = '/tmp/db.json';

const INITIAL_DATA = {
  admin: null,
  teachers: [],
  groups: [],
  students: [],
  assignments: [],
  submissions: []
};

function getDbFilePath() {
  if (IS_VERCEL) {
    return VERCEL_TMP_FILE;
  }
  return LOCAL_DB_FILE;
}

function initDb() {
  const targetFile = getDbFilePath();

  if (IS_VERCEL) {
    if (!fs.existsSync(targetFile)) {
      if (fs.existsSync(LOCAL_DB_FILE)) {
        try {
          const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
          fs.writeFileSync(targetFile, raw, 'utf8');
          return;
        } catch (e) {}
      }
      fs.writeFileSync(targetFile, JSON.stringify(INITIAL_DATA, null, 2), 'utf8');
    }
    return;
  }

  if (!fs.existsSync(LOCAL_DB_DIR)) {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf8');
  }
}

function getData() {
  initDb();
  const targetFile = getDbFilePath();
  try {
    const raw = fs.readFileSync(targetFile, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading db file:', error);
    return { ...INITIAL_DATA };
  }
}

function saveData(data) {
  initDb();
  const targetFile = getDbFilePath();
  try {
    fs.writeFileSync(targetFile, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving db file:', error);
    return false;
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
