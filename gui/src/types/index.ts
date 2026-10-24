export type UserRole = 'admin' | 'user' | 'pro_user';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  status: 'online' | 'offline';
  theme?: 'light' | 'dark' | 'system';
  member_color?: string | null;
  sound_pref?: string | null;
  created_at: string;
}

export interface UserProfile {
  user_id: number;
  display_name: string | null;
  headline: string | null;
  location: string | null;
  website: string | null;
  notification_json?: Record<string, unknown> | null;
  privacy_json?: Record<string, unknown> | null;
}

export interface Todo {
  id: number;
  user_id: number;
  team_id?: number | null;
  assignee_id?: number | null;
  title: string;
  description: string | null;
  notes?: string | null;
  /** 0.0 – 5.0 in 0.5 steps */
  priority: number;
  ai_score: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_at?: string | null;
  due_date?: string | null;
  sort_order: number;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string;
  rationale?: string;
  sub_todos?: SubTodo[];
  assignee_color?: string | null;
}

export interface SubTodo {
  id: number;
  todo_id: number;
  parent_id?: number | null;
  title: string;
  is_done: boolean;
  sort_order: number;
  assignee_id?: number | null;
  created_at: string;
}

export type NoteTemplate = 'blank' | 'grid' | 'lined' | 'dotted' | 'music' | 'calendar';

export interface Note {
  id: number;
  user_id: number;
  team_id?: number | null;
  title: string;
  content: string;
  template?: NoteTemplate;
  category: string;
  project_desc?: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: number;
  user_id: number;
  team_id?: number | null;
  title: string;
  canvas_data_json: string;
  viewport_json?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CanvasObject {
  type: 'rect' | 'circle' | 'line' | 'text' | 'arrow' | 'connector' | 'table' | 'chart';
  id?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  r?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  fill?: string;
  stroke?: string;
  text?: string;
  chartType?: 'line' | 'bar' | 'pie' | 'candlestick';
  data?: unknown;
  authorId?: number;
  authorColor?: string;
}

export interface CanvasData {
  version: number;
  objects: CanvasObject[];
}

export interface Post {
  id: number;
  user_id: number;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
  liked_by_me?: boolean;
}

export interface PostComment {
  id: number;
  post_id: number;
  user_id: number;
  parent_id?: number | null;
  text: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string | null;
  replies?: PostComment[];
}

export interface ChatContact {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  status: string;
  role: string;
  member_color?: string | null;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number | null;
  group_id: number | null;
  text: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  sender_color?: string | null;
}

export interface Team {
  id: number;
  /** Preferred display name */
  name?: string;
  /** Legacy / API alias used by TeamDashboard */
  team_name?: string;
  description?: string | null;
  owner_id?: number;
  lead_user_id?: number;
  performance_score?: number;
  metrics_json?: Record<string, number> | null;
  created_at: string;
}

export interface TeamMember {
  team_id: number;
  user_id: number;
  role: 'owner' | 'manager' | 'member';
  member_color: string;
  name?: string;
  email?: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  status: string;
  post_limit: number;
  current_period_end?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
