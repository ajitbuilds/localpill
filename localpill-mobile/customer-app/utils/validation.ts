export const isValidString = (str: string | undefined | null): boolean => {
    return typeof str === 'string' && str.trim().length > 0;
};

export const isValidPhone = (phone: string | undefined | null): boolean => {
    if (!phone) return false;
    const cleaned = phone.replace(/[^0-9]/g, '');
    return cleaned.length === 10;
};

export const isValidAge = (age: string | number | undefined | null): boolean => {
    if (age === null || age === undefined || age === '') return false;
    const numAge = Number(age);
    return !isNaN(numAge) && numAge >= 1 && numAge <= 120;
};
