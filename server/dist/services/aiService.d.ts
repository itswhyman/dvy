export interface AiScoreResult {
    score: number;
    priority: 'low' | 'medium' | 'high' | 'ai_suggested';
    rationale: string;
}
export declare function rateTodoWithAi(title: string, description?: string | null): Promise<AiScoreResult>;
export declare function summarizeNote(content: string): Promise<string>;
