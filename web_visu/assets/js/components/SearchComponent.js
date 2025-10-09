// Search Component Module
import { CONSTANTS } from '../utils/constants.js';
import { Helpers } from '../utils/helpers.js';

export class SearchComponent {
    constructor(courseCatalog) {
        this.courseCatalog = courseCatalog;
        this.searchTerm = '';
    }

    /**
     * Handle search input
     * @param {string} searchTerm - Search term
     */
    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.courseCatalog.handleFilter();
    }

    /**
     * Get current search term
     * @returns {string} Current search term
     */
    getSearchTerm() {
        return this.searchTerm;
    }

    /**
     * Clear search input
     */
    clearSearch() {
        const searchInput = document.querySelector(CONSTANTS.SELECTORS.SEARCH_INPUT);
        if (searchInput) {
            searchInput.value = '';
            this.searchTerm = '';
        }
    }

    /**
     * Check if course matches search term
     * @param {Object} course - Course object
     * @returns {boolean} True if course matches search
     */
    matchesSearch(course) {
        if (!this.searchTerm) return true;
        return course.Name.toLowerCase().includes(this.searchTerm);
    }
}