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
    isToday,

    // Formatter Wrappers (Aliases to global or new impl)
    formatDateLong: (date, time) => window.formatDateLong ? window.formatDateLong(date, time) : date,

    formatDate: (date) => {
        if (!date) return '-';
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;
        return d.toLocaleDateString('id-ID'); // DD/MM/YYYY
    },

    formatTime: (time) => {
        if (!time) return '-';
        // If it's full ISO string
        if (time.includes('T')) {
            const d = new Date(time);
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            return `${h}:${m}`;
        }
        // If HH:mm:ss
        const parts = time.split(':');
        if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
        return time;
    },

    formatDateFriendly: (date) => {
        if (!date) return '-';
        const dStr = getTodayDateString();
        // Simple check
        if (date.startsWith(dStr)) return 'Hari ini';
        // Return normal short date
        const d = new Date(date);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    }
};
