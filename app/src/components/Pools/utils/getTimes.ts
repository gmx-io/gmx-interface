
export const getTimes = () => {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    const isoStrings = [];
    for (let i = 0; i < 180; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        isoStrings.push(date.toISOString());
    }
    return isoStrings;
};
