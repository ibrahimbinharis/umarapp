/**
 * Quran Utilities
 * Helper functions for Quran page/juz conversions
 */

(function () {
    'use strict';

    // Juz boundaries (starting page of each Juz)
    const JUZ_BOUNDARIES = [
        1,   // Juz 1
        22,  // Juz 2
        42,  // Juz 3
        62,  // Juz 4
        82,  // Juz 5
        102, // Juz 6
        121, // Juz 7
        142, // Juz 8
        162, // Juz 9
        182, // Juz 10
        201, // Juz 11
        222, // Juz 12
        242, // Juz 13
        262, // Juz 14
        282, // Juz 15
        302, // Juz 16
        322, // Juz 17
        342, // Juz 18
        362, // Juz 19
        382, // Juz 20
        402, // Juz 21
        422, // Juz 22
        442, // Juz 23
        462, // Juz 24
        482, // Juz 25
        502, // Juz 26
        522, // Juz 27
        542, // Juz 28
        562, // Juz 29
        582  // Juz 30
    ];

    /**
     * Get Juz number from page number
     * @param {number} page - Page number (1-604)
     * @returns {number} - Juz number (1-30)
     */
    function getJuzFromPage(page) {
        const pageNum = parseInt(page) || 1;

        for (let i = JUZ_BOUNDARIES.length - 1; i >= 0; i--) {
            if (pageNum >= JUZ_BOUNDARIES[i]) {
                return i + 1;
            }
        }

        return 1;
    }

    // Expose to window for global access
    window.QuranUtils = {
        getJuzFromPage: getJuzFromPage,
        JUZ_BOUNDARIES: JUZ_BOUNDARIES
    };
})();
