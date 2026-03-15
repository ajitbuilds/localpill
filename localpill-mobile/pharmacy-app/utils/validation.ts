export const isValidString = (str: string | undefined | null): boolean => {
    return typeof str === 'string' && str.trim().length > 0;
};

export const isValidPhone = (phone: string | undefined | null): boolean => {
    if (!phone) return false;
    const cleaned = phone.replace(/[^0-9]/g, '');
    return cleaned.length === 10;
};
