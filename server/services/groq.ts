import Groq from 'groq-sdk';

/**
 * Groq AI Service for expense categorization
 */

const MODEL_NAME = 'llama-3.3-70b-versatile';

export type ExpenseCategory =
    | 'food'
    | 'transport'
    | 'education'
    | 'rent'
    | 'entertainment'
    | 'shopping'
    | 'utilities'
    | 'medical'
    | 'other';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || '',
});

/**
 * Categorize an expense description using Groq AI
 * @param description The expense description to categorize
 * @returns The suggested category
 */
export async function categorizeWithAI(
    description: string,
): Promise<ExpenseCategory> {
    const systemPrompt = `
You are an intelligent expense categorization assistant.

Your task is to read an expense description and determine the most appropriate expense category based purely on the meaning and context of the text.

Available categories:
food, transport, education, rent, entertainment, shopping, utilities, medical, other.

Do NOT rely on keyword matching or fixed rules.
Use general real-world understanding to infer the category.

If the description is unclear, ambiguous, or does not clearly fit any category, choose "other".

Respond with ONLY the category name.
No explanations.
No punctuation.
No extra text.
`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: `Expense description: "${description}"`,
                },
            ],
            model: MODEL_NAME,
            temperature: 0.1, // Very low temperature for consistent categorization
        });

        const category = completion.choices[0]?.message?.content?.trim().toLowerCase();

        // Validate the category
        const validCategories: ExpenseCategory[] = [
            'food',
            'transport',
            'education',
            'rent',
            'entertainment',
            'shopping',
            'utilities',
            'medical',
            'other',
        ];

        if (validCategories.includes(category as ExpenseCategory)) {
            return category as ExpenseCategory;
        }

        console.warn(`AI returned invalid category: ${category}, defaulting to 'other'`);
        return 'other';
    } catch (error) {
        console.error('Groq categorization error:', error);
        throw new Error(`Groq AI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Check if Groq is available
 * @returns true if Groq API key is present
 */
export async function isGroqAvailable(): Promise<boolean> {
    return !!process.env.GROQ_API_KEY;
}
