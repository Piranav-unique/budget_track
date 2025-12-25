import { RequestHandler } from 'express';
import { CategorizeRequest, CategorizeResponse } from '@shared/api';
import { categorizeWithAI, isGroqAvailable } from '../services/groq';

export const handleCategorizeExpense: RequestHandler = async (req, res) => {
    try {
        const { description } = req.body as CategorizeRequest;

        if (!description || typeof description !== 'string') {
            return res.status(400).json({
                error: 'Description is required and must be a string',
            });
        }

        // Try AI categorization
        try {
            const groqAvailable = await isGroqAvailable();

            if (groqAvailable) {
                const category = await categorizeWithAI(description);
                console.log(`[AI Categorization] "${description}" -> ${category}`);
                const response: CategorizeResponse = {
                    category,
                    method: 'ai',
                    confidence: 0.9,
                };
                return res.status(200).json(response);
            } else {
                throw new Error('Groq service unavailable');
            }
        } catch (error) {
            console.warn('AI categorization failed:', error);
            // Default to 'other' on failure
            const response: CategorizeResponse = {
                category: 'other',
                method: 'ai',
            };
            return res.status(200).json(response);
        }
    } catch (error) {
        console.error('Categorization error:', error);
        return res.status(500).json({
            error: 'Internal server error',
        });
    }
};
