export type UserRole = 'admin' | 'user' | 'pro_user';
export type UserStatus = 'online' | 'offline';
export type TodoPriority = 'low' | 'medium' | 'high' | 'ai_suggested';
export type TodoStatus = 'pending' | 'in_progress' | 'completed';
export type PlanType = 'free' | 'pro' | 'enterprise';
export interface User {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    avatar_url: string | null;
    bio: string | null;
    status: UserStatus;
    created_at: string;
}
export interface Todo {
    id: number;
    user_id: number;
    title: string;
    description: string | null;
    priority: TodoPriority;
    ai_score: number | null;
    status: TodoStatus;
    due_date: string | null;
    sort_order: number;
    created_at: string;
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
    lead_user_id: number;
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
}
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
