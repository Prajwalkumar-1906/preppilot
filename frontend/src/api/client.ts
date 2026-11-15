import { 
  AuthResponse, 
  LoginPayload, 
  RegisterPayload, 
  User, 
  Profile, 
  Question, 
  QuestionListResponse, 
  QuestionGeneratePayload,
  Session,
  SessionCreatePayload,
  SessionCompleteResponse,
  Attempt,
  AttemptCreatePayload,
  TranscribeResponse,
  Evaluation,
  AnalyticsOverview,
  ScoreTrendPoint,
  CategoryPerformance,
  SkillRadarAxis,
  SpeechAnalytics,
  WeakSpot
} from '../types';

const API_BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const getAccessToken = (): string | null => {
  return localStorage.getItem('access_token');
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_cache');
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && getRefreshToken() && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
    // Attempt token refresh
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: getRefreshToken() }),
      });
      if (refreshRes.ok) {
        const { access_token } = await refreshRes.json();
        localStorage.setItem('access_token', access_token);
        headers.set('Authorization', `Bearer ${access_token}`);
        const retryRes = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers,
        });
        if (!retryRes.ok) {
          throw new Error('Request failed after refresh');
        }
        return retryRes.json();
      }
    } catch {
      clearTokens();
      window.location.href = '/login';
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    let data;
    try {
      data = await response.json();
      errorDetail = data.detail || errorDetail;
    } catch {
      errorDetail = await response.text();
    }
    throw new ApiError(response.status, errorDetail, data);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Auth API Endpoints
export const authApi = {
  register: (payload: RegisterPayload) =>
    apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => apiRequest<User>('/auth/me'),

  updateProfile: (payload: Partial<Profile>) =>
    apiRequest<Profile>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

// Question API Endpoints
export const questionApi = {
  generate: (payload: QuestionGeneratePayload) =>
    apiRequest<Question>('/questions/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  list: (params?: { role?: string; category?: string; difficulty?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.set('role', params.role);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.difficulty) searchParams.set('difficulty', params.difficulty);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const queryStr = searchParams.toString();
    return apiRequest<QuestionListResponse>(`/questions${queryStr ? `?${queryStr}` : ''}`);
  },

  getById: (id: string) => apiRequest<Question>(`/questions/${id}`),
};

// Session API Endpoints
export const sessionApi = {
  create: (payload: SessionCreatePayload) =>
    apiRequest<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getById: (id: string) => apiRequest<Session>(`/sessions/${id}`),

  complete: (id: string) =>
    apiRequest<SessionCompleteResponse>(`/sessions/${id}/complete`, {
      method: 'POST',
    }),

  list: () => apiRequest<Session[]>('/sessions'),
};

// Attempt API Endpoints
export const attemptApi = {
  transcribe: async (audioBlob: Blob): Promise<TranscribeResponse> => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'answer.webm');
    return apiRequest<TranscribeResponse>('/attempts/transcribe', {
      method: 'POST',
      body: formData,
    });
  },

  submit: (payload: AttemptCreatePayload) =>
    apiRequest<Attempt>('/attempts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getById: (id: string) => apiRequest<Attempt>(`/attempts/${id}`),

  evaluate: (attemptId: string) =>
    apiRequest<Evaluation>(`/attempts/${attemptId}/evaluate`, {
      method: 'POST',
    }),
};

// Analytics API Endpoints
export const analyticsApi = {
  getOverview: () => apiRequest<AnalyticsOverview>('/analytics/overview'),

  getTrends: (days = 30) => apiRequest<ScoreTrendPoint[]>(`/analytics/trends?days=${days}`),

  getCategories: () => apiRequest<CategoryPerformance[]>('/analytics/categories'),

  getRadar: () => apiRequest<SkillRadarAxis[]>('/analytics/radar'),

  getSpeech: () => apiRequest<SpeechAnalytics>('/analytics/speech'),

  getWeakSpots: () => apiRequest<WeakSpot[]>('/analytics/weak-spots'),
};
