import { RequestHandler } from 'express';
import { CategorizeRequest, CategorizeResponse } from '../../shared/api';
import { categorizeWithAI, isGroqAvailable } from '../services/groq';

export const handleCategorizeExpense: RequestHandler = async (req, res) => {
    try {
        // Safely extract description from request body
        let description: string;
        try {
            const body = req.body || {};
            description = body.description;
        } catch (parseError) {
            console.error('Error parsing request body:', parseError);
            return res.status(400).json({
                error: 'Invalid request body',
                details: 'Could not parse request body'
            });
        }

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
                // Groq not available, return default category
                console.warn('Groq service unavailable, using default category');
                const response: CategorizeResponse = {
                    category: 'other',
                    method: 'fallback',
                };
                return res.status(200).json(response);
            }
        } catch (aiError) {
            // AI categorization failed, but we'll return a successful response with default category
            console.warn('AI categorization failed:', aiError instanceof Error ? aiError.message : 'Unknown error');
            const response: CategorizeResponse = {
                category: 'other',
                method: 'fallback',
            };
            return res.status(200).json(response);
        }
    } catch (error) {
        // This should rarely happen, but if it does, we still return a default category
        console.error('Unexpected categorization error:', {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            body: req.body
        });
        // Even on unexpected errors, return a default category instead of 500
        const response: CategorizeResponse = {
            category: 'other',
            method: 'fallback',
        };
        return res.status(200).json(response);
    }
};
