export type UserRole = 'admin' | 'user' | 'pro_user';
export type UserStatus = 'online' | 'offline';
/** Legacy string priorities used by current API */
export type TodoPriority = 'low' | 'medium' | 'high' | 'ai_suggested' | number;
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type PlanType = 'free' | 'pro' | 'team' | 'enterprise';
export type NoteTemplate = 'blank' | 'grid' | 'lined' | 'dotted' | 'music' | 'calendar';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  status: UserStatus;
  member_color?: string | null;
  sound_pref?: string | null;
  theme?: 'light' | 'dark' | 'system';
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  team_id?: number | null;
  assignee_id?: number | null;
  title: string;
  description: string | null;
  notes?: string | null;
  priority: TodoPriority;
  ai_score: number | null;
  status: TodoStatus;
  due_date?: string | null;
  due_at?: string | null;
  sort_order: number;
  completed_at?: string | null;
  created_at: string;
  updated_at?: string;
  rationale?: string;
  sub_todos?: SubTodo[];
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

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number | null;
  group_id: number | null;
  text: string;
  attachments_json: unknown;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

export interface Team {
  id: number;
  team_name: string;
  name?: string;
  description?: string | null;
  lead_user_id: number;
  owner_id?: number;
  performance_score: number;
  metrics_json: Record<string, number> | null;
  created_at: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_type: PlanType;
  status: string;
  current_period_end: string | null;
  post_limit?: number;
}

/** JWT auth payload — always use `userId`, never `id` */
export interface JwtPayload {
  userId: number;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
