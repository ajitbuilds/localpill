export const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (__DEV__) console.warn(`Attempt ${attempt} failed. Retrying in ${delayMs}ms...`, error);
            
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
                // Exponential backoff
                delayMs *= 2;
            }
        }
    }
    
    throw lastError;
};
