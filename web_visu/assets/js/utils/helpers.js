// Utility Helper Functions
export class Helpers {
    /**
     * Debounce function to limit the rate of function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Delay in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Show loading state
     * @param {string} containerId - ID of container to show loading in
     */
    static showLoading(containerId = 'coursesGrid') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                </div>
            `;
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message to display
     * @param {string} containerId - ID of container to show error in
     */
    static showError(message, containerId = 'coursesGrid') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    /**
     * Format ECTS value
     * @param {string|number} ects - ECTS value to format
     * @returns {string} Formatted ECTS string
     */
    static formatEcts(ects) {
        if (typeof ects === 'number') {
            return `${ects} CP`;
        }
        return ects || 'N/A';
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    static truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    static generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    /**
     * Check if element exists in DOM
     * @param {string} selector - CSS selector
     * @returns {boolean} True if element exists
     */
    static elementExists(selector) {
        return document.querySelector(selector) !== null;
    }

    /**
     * Smooth scroll to top
     */
    static scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    /**
     * Add timestamp to URL to force reload
     * @param {string} url - Original URL
     * @returns {string} URL with timestamp
     */
    static addTimestamp(url) {
        const timestamp = new Date().getTime();
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}t=${timestamp}`;
    }

    /**
     * Handle URL with page anchor
     * @param {string} url - URL with potential anchor
     * @returns {string} URL with timestamp before anchor
     */
    static handleUrlWithAnchor(url) {
        const timestamp = new Date().getTime();
        
        if (url.includes('#')) {
            const [baseUrl, anchor] = url.split('#');
            const separator = baseUrl.includes('?') ? '&' : '?';
            return `${baseUrl}${separator}t=${timestamp}#${anchor}`;
        } else {
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}t=${timestamp}`;
        }
    }
}