export type Role = 
  | 'SDE'
  | 'Frontend Developer'
  | 'Backend Developer'
  | 'ML Engineer'
  | 'Data Analyst'
  | 'HR/Behavioral';

export type ExperienceLevel = 'fresher' | '0-2 yrs';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Category = 
  | 'technical'
  | 'dsa_concepts'
  | 'system_design_basics'
  | 'behavioral'
  | 'hr'
  | 'project_based';

export interface Profile {
  id: string;
  user_id: string;
  target_role: Role;
  experience_level: ExperienceLevel;
  tech_focus_areas: string[];
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  profile?: Profile;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  full_name: string;
  password: string;
  target_role: string;
  experience_level: string;
  tech_focus_areas: string[];
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface Question {
  id: string;
  question_text: string;
  category: Category;
  role_tag: Role;
  difficulty: Difficulty;
  expected_key_points: string[];
  common_mistakes: string[];
  time_suggestion_sec: number;
  content_hash: string;
  is_seed: boolean;
  created_at: string;
}

export interface QuestionListResponse {
  items: Question[];
  total: number;
  page: number;
  limit: number;
}

export interface QuestionGeneratePayload {
  role?: string;
  category?: string;
  difficulty?: string;
  use_adaptive_difficulty?: boolean;
}

// Speech Metrics
export interface SpeechMetrics {
  wpm: number;
  filler_word_count: number;
  filler_words: string[];
  long_pause_count: number;
  optimal_pace: boolean;
}

export interface TranscribeResponse {
  transcript: string;
  audio_duration_sec: number;
  speech_metrics: SpeechMetrics;
}

// Evaluation
export interface Evaluation {
  id: string;
  attempt_id: string;
  overall_score: number;
  clarity_score: number;
  relevance_score: number;
  technical_score: number;
  communication_score?: number | null;
  strengths: string[];
  weaknesses: string[];
  missed_key_points: string[];
  actionable_suggestions: string[];
  improved_model_answer: string;
  reasoning?: string | null;
  confidence: number;
  prompt_version: string;
  model_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  self_consistency_applied: boolean;
  created_at: string;
}

// Attempt
export interface Attempt {
  id: string;
  session_id?: string | null;
  question_id: string;
  user_id: string;
  attempt_number: number;
  answer_text: string;
  answer_mode: 'text' | 'voice';
  audio_file_path?: string | null;
  audio_duration_sec?: number | null;
  transcript?: string | null;
  speech_metrics: Record<string, any>;
  status: string;
  created_at: string;
  submitted_at?: string | null;
  question?: Question | null;
  evaluation?: Evaluation | null;
}

export interface AttemptCreatePayload {
  session_id?: string | null;
  question_id: string;
  answer_text: string;
  answer_mode: 'text' | 'voice';
  audio_duration_sec?: number | null;
  speech_metrics?: Record<string, any> | null;
}

// Session
export interface SessionAttemptSummary {
  id: string;
  question_id: string;
  answer_mode: string;
  status: string;
  created_at: string;
  question?: Question | null;
  evaluation?: Evaluation | null;
}

export interface Session {
  id: string;
  user_id: string;
  title: string;
  role: string;
  target_question_count: number;
  difficulty_mode: 'adaptive' | 'fixed';
  status: 'in_progress' | 'completed';
  started_at: string;
  completed_at?: string | null;
  total_duration_sec: number;
  overall_score?: number | null;
  summary_strengths: string[];
  summary_improvements: string[];
  recommended_focus?: string | null;
  attempts: SessionAttemptSummary[];
}

export interface SessionCreatePayload {
  title?: string;
  role?: string;
  target_question_count: number;
  difficulty_mode: 'adaptive' | 'fixed';
}

export interface SessionCompleteResponse {
  session_id: string;
  status: string;
  overall_score: number;
  total_questions_answered: number;
  summary_strengths: string[];
  summary_improvements: string[];
  recommended_focus: string;
}

// Analytics
export interface AnalyticsOverview {
  streak_days: number;
  total_sessions: number;
  total_questions: number;
  total_minutes: number;
  average_score: number;
  target_role: string;
}

export interface ScoreTrendPoint {
  date: string;
  overall_score: number;
  clarity_score: number;
  relevance_score: number;
  technical_score: number;
  attempt_count: number;
}

export interface CategoryPerformance {
  category: string;
  average_score: number;
  attempt_count: number;
  easy_avg?: number | null;
  medium_avg?: number | null;
  hard_avg?: number | null;
}

export interface SkillRadarAxis {
  skill: string;
  all_time: number;
  recent_30d: number;
}

export interface SpeechAnalytics {
  average_wpm: number;
  total_voice_attempts: number;
  optimal_pace_percentage: number;
  top_filler_words: Array<{ word: string; count: number }>;
  wpm_trend: Array<{ attempt_date: string; wpm: number }>;
}

export interface WeakSpot {
  category: string;
  role_tag: string;
  average_score: number;
  attempt_count: number;
  recommendation: string;
}
