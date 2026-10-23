export type UserRole = 'admin' | 'user' | 'pro_user';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  status: 'online' | 'offline';
  created_at: string;
}

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'ai_suggested';
  ai_score: number | null;
  status: 'pending' | 'in_progress' | 'completed';
  due_date: string | null;
  sort_order: number;
  created_at: string;
  rationale?: string;
}

export interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  category: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: number;
  user_id: number;
  title: string;
  canvas_data_json: string;
  created_at: string;
  updated_at?: string;
}

export interface CanvasObject {
  type: 'rect' | 'circle' | 'line' | 'text';
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

export interface ChatContact {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  status: string;
  role: string;
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
}

export interface Team {
  id: number;
  team_name: string;
  lead_user_id: number;
  performance_score: number;
  metrics_json: Record<string, number> | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
