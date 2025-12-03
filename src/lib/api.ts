// API Client for self-hosted backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

const apiRequest = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, body?: any) => apiRequest<T>(endpoint, { method: 'POST', body }),
  put: <T>(endpoint: string, body?: any) => apiRequest<T>(endpoint, { method: 'PUT', body }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
  
  // Auth
  auth: {
    login: (data: { email: string; password: string; cpf?: string; cnpj?: string; userType?: string }) =>
      apiRequest<{ user?: any; token?: string; requiresMfa?: boolean; mfaToken?: string }>('/auth/login', { method: 'POST', body: data }),
    register: (data: any) =>
      apiRequest<{ user: any; token: string }>('/auth/register', { method: 'POST', body: data }),
    me: () => apiRequest<any>('/auth/me'),
    mfaVerify: (data: { mfaToken: string; code: string }) =>
      apiRequest<{ user: any; token: string }>('/auth/mfa/verify', { method: 'POST', body: data }),
    mfaSetup: () => apiRequest<{ secret: string; qrCode: string }>('/auth/mfa/setup', { method: 'POST' }),
    mfaEnable: (code: string) => apiRequest<{ success: boolean }>('/auth/mfa/enable', { method: 'POST', body: { code } }),
    mfaDisable: () => apiRequest<{ success: boolean }>('/auth/mfa/disable', { method: 'POST' }),
    mfaStatus: () => apiRequest<{ mfaEnabled: boolean }>('/auth/mfa/status'),
    forgotPassword: (email: string) => apiRequest<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (token: string, newPassword: string) => apiRequest<{ message: string }>('/auth/reset-password', { method: 'POST', body: { token, newPassword } }),
    updatePassword: (newPassword: string) => apiRequest<{ message: string }>('/auth/update-password', { method: 'POST', body: { newPassword } }),
  },

  // Profiles
  profiles: {
    me: () => apiRequest<any>('/profiles/me'),
    update: (data: any) => apiRequest<any>('/profiles/me', { method: 'PUT', body: data }),
    getAll: () => apiRequest<any[]>('/profiles'),
    getById: (id: string) => apiRequest<any>(`/profiles/${id}`),
  },

  // Courses
  courses: {
    getAll: () => apiRequest<any[]>('/courses'),
    getById: (id: string) => apiRequest<any>(`/courses/${id}`),
    create: (data: any) => apiRequest<any>('/courses', { method: 'POST', body: data }),
    update: (id: string, data: any) => apiRequest<any>(`/courses/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => apiRequest<void>(`/courses/${id}`, { method: 'DELETE' }),
  },

  // Modules
  modules: {
    getByCourse: (courseId: string) => apiRequest<any[]>(`/modules/course/${courseId}`),
    getById: (id: string) => apiRequest<any>(`/modules/${id}`),
  },

  // Lessons
  lessons: {
    getByModule: (moduleId: string) => apiRequest<any[]>(`/lessons/module/${moduleId}`),
    getByCourse: (courseId: string) => apiRequest<any[]>(`/lessons/course/${courseId}`),
    getById: (id: string) => apiRequest<any>(`/lessons/${id}`),
  },

  // Quizzes
  quizzes: {
    getById: (id: string) => apiRequest<any>(`/quizzes/${id}`),
    getByModule: (moduleId: string) => apiRequest<any>(`/quizzes/module/${moduleId}`),
    getFinalExam: (courseId: string) => apiRequest<any>(`/quizzes/course/${courseId}/final`),
    submit: (id: string, responses: any[]) => apiRequest<any>(`/quizzes/${id}/submit`, { method: 'POST', body: { responses } }),
    getAttempts: (id: string) => apiRequest<any[]>(`/quizzes/${id}/attempts`),
  },

  // Enrollments
  enrollments: {
    me: () => apiRequest<any[]>('/enrollments/me'),
    enroll: (courseId: string) => apiRequest<any>('/enrollments', { method: 'POST', body: { courseId } }),
  },

  // Progress
  progress: {
    me: () => apiRequest<any[]>('/progress/me'),
    byCourse: (courseId: string) => apiRequest<any>(`/progress/course/${courseId}`),
    complete: (lessonId: string) => apiRequest<any>('/progress/complete', { method: 'POST', body: { lessonId } }),
    resetModule: (moduleId: string) => apiRequest<void>(`/progress/module/${moduleId}`, { method: 'DELETE' }),
  },

  // Certificates
  certificates: {
    me: () => apiRequest<any[]>('/certificates/me'),
    getById: (id: string) => apiRequest<any>(`/certificates/${id}`),
    checkAndIssue: (courseId: string) => apiRequest<any>('/certificates/check-and-issue', { method: 'POST', body: { courseId } }),
    verify: (certificateNumber: string) => apiRequest<any>(`/certificates/verify/${certificateNumber}`),
  },

  // Groups
  groups: {
    me: () => apiRequest<any>('/groups/me'),
    led: () => apiRequest<any>('/groups/led'),
    getAll: () => apiRequest<any[]>('/groups'),
    getById: (id: string) => apiRequest<any>(`/groups/${id}`),
    getProgress: (id: string) => apiRequest<any[]>(`/groups/${id}/progress`),
  },

  // FAQs
  faqs: {
    getAll: (targetAudience?: string) => apiRequest<any[]>(`/faqs${targetAudience ? `?targetAudience=${targetAudience}` : ''}`),
    getById: (id: string) => apiRequest<any>(`/faqs/${id}`),
  },

  // Settings
  settings: {
    getAll: () => apiRequest<Record<string, any>>('/settings'),
    get: (key: string) => apiRequest<any>(`/settings/${key}`),
    getTopicCards: () => apiRequest<any[]>('/settings/topic-cards/all'),
    getRoles: () => apiRequest<any[]>('/settings/roles/all'),
  },
};

export default api;
