/**
 * Shared app-level constants
 */

export const POPULAR_SEARCHES = ['Dolo 650', 'Pan D', 'Azithromycin 500mg', 'Crocin Advance', 'Cetirizine 10mg'];

/**
 * Simplify a raw geocoded address — strips plus codes and limits to 4 parts
 */
export const simplifyAddress = (address: string | undefined | null): string => {
    if (!address) return '';
    const parts = address.split(',').map(p => p.trim());
    const cleanedParts = parts.filter(p => !/^[A-Z0-9]{4}\+[A-Z0-9]{2,3}$/.test(p));
    if (cleanedParts.length >= 4) {
        return `${cleanedParts[0]}, ${cleanedParts[1]}, ${cleanedParts[2]}, ${cleanedParts[3]}`;
    }
    return cleanedParts.join(', ');
};
