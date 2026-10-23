import OpenAI from 'openai';
const client = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;
/** Heuristic fallback when OpenAI is unavailable. */
function heuristicScore(title, description) {
    const text = `${title} ${description ?? ''}`.toLowerCase();
    let score = 50;
    const high = ['urgent', 'asap', 'critical', 'blocker', 'launch', 'deadline', 'acil', 'kritik'];
    const med = ['important', 'review', 'ship', 'önemli', 'teslim'];
    const low = ['optional', 'nice', 'later', 'someday', 'opsiyonel'];
    for (const w of high)
        if (text.includes(w))
            score += 18;
    for (const w of med)
        if (text.includes(w))
            score += 8;
    for (const w of low)
        if (text.includes(w))
            score -= 12;
    score = Math.max(5, Math.min(98, score));
    const priority = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low';
    return {
        score,
        priority: 'ai_suggested',
        rationale: `Heuristic score ${score} (${priority} urgency). Connect OPENAI_API_KEY for LLM analysis.`,
    };
}
export async function rateTodoWithAi(title, description) {
    if (!client) {
        return heuristicScore(title, description);
    }
    try {
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const completion = await client.chat.completions.create({
            model,
            temperature: 0.3,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You are a productivity analyst. Score task urgency/importance 0-100. Reply ONLY valid JSON: {"score":number,"priority":"low"|"medium"|"high","rationale":"short reason"}',
                },
                {
                    role: 'user',
                    content: `Title: ${title}\nDescription: ${description || '(none)'}`,
                },
            ],
        });
        const raw = completion.choices[0]?.message?.content ?? '{}';
        const parsed = JSON.parse(raw);
        const score = Math.max(0, Math.min(100, Number(parsed.score) || 50));
        return {
            score,
            priority: 'ai_suggested',
            rationale: parsed.rationale || 'AI scored this task.',
        };
    }
    catch (err) {
        console.error('[aiService]', err instanceof Error ? err.message : err);
        return heuristicScore(title, description);
    }
}
export async function summarizeNote(content) {
    if (!client) {
        return content.slice(0, 200) + (content.length > 200 ? '…' : '');
    }
    try {
        const completion = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            temperature: 0.2,
            messages: [
                {
                    role: 'system',
                    content: 'Summarize the note in 2-3 concise sentences. Plain text only.',
                },
                { role: 'user', content },
            ],
        });
        return completion.choices[0]?.message?.content?.trim() || content.slice(0, 200);
    }
    catch {
        return content.slice(0, 200) + (content.length > 200 ? '…' : '');
    }
}
