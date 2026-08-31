const API_BASE = window.location.protocol.startsWith('http') 
  ? '/api' 
  : 'http://localhost:5000/api';

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
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Serverda xatolik yuz berdi');
    }
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('Fetch')) {
      throw new Error("Backend serverga ulanib bo'lmadi (http://localhost:5000)");
    }
    throw error;
  }
}

export const api = {
  auth: {
    getStatus: () => request('/auth/status'),
    setupAdmin: (payload) => request('/auth/setup-admin', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) })
  },
  admin: {
    getDashboard: () => request('/admin/dashboard'),
    addTeacher: (payload) => request('/admin/teachers', { method: 'POST', body: JSON.stringify(payload) }),
    deleteTeacher: (teacherId) => request(`/admin/teachers/${teacherId}`, { method: 'DELETE' }),
    addGroup: (payload) => request('/admin/groups', { method: 'POST', body: JSON.stringify(payload) }),
    deleteGroup: (groupId) => request(`/admin/groups/${groupId}`, { method: 'DELETE' }),
    addStudent: (payload) => request('/admin/students', { method: 'POST', body: JSON.stringify(payload) }),
    deleteStudent: (studentId) => request(`/admin/students/${studentId}`, { method: 'DELETE' }),
    getGroupDetail: (groupId) => request(`/admin/groups/${groupId}`)
  },
  teacher: {
    getDashboard: (teacherId) => request(`/teacher/dashboard?teacherId=${teacherId}`),
    createAssignment: (payload) => request('/teacher/assignments', { method: 'POST', body: JSON.stringify(payload) }),
    deleteAssignment: (assignmentId) => request(`/teacher/assignments/${assignmentId}`, { method: 'DELETE' }),
    getAssignmentDetail: (assignmentId, groupId) => request(`/teacher/assignments/${assignmentId}/group/${groupId}`),
    gradeSubmission: (payload) => request('/teacher/grade', { method: 'POST', body: JSON.stringify(payload) })
  },
  student: {
    getDashboard: (studentId) => request(`/student/dashboard?studentId=${studentId}`),
    submitAssignment: (payload) => request('/student/submit', { method: 'POST', body: JSON.stringify(payload) })
  }
};
