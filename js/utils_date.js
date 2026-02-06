/**
 * Global Date Utilities (Local Time)
 * 
 * Prevents timezone issues where dates shift due to UTC conversion in new Date().toISOString().
 * Stricts everything to Browser Local Time "YYYY-MM-DD".
 */

// Get today's date in YYYY-MM-DD (Local Time)
const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Get current time in HH:mm (Local Time)
const getCurrentTimeString = () => {
    const d = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Check if a date string is "Today"
const isToday = (dateString) => {
    return dateString === getTodayDateString();
};

window.DateUtils = {
    getTodayDateString,
    getCurrentTimeString,
    isToday
};
