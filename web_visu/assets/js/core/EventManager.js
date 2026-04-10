// Event Management Module
import { CONSTANTS } from '../utils/constants.js';
import { Helpers } from '../utils/helpers.js';

export class EventManager {
    constructor(courseCatalog) {
        this.courseCatalog = courseCatalog;
        this.debouncedSearch = Helpers.debounce(this.handleSearch.bind(this), CONSTANTS.DEFAULTS.SEARCH_DEBOUNCE_DELAY);
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        this.setupSearchListener();
        this.setupFilterListeners();
        this.setupModalListeners();
        this.setupKeyboardListeners();
    }

    /**
     * Setup search input listener
     */
    setupSearchListener() {
        const searchInput = document.querySelector(CONSTANTS.SELECTORS.SEARCH_INPUT);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.debouncedSearch(e.target.value);
            });
        }
    }

    /**
     * Setup filter listeners
     */
    setupFilterListeners() {
        // Category filter
        const categoryFilter = document.querySelector(CONSTANTS.SELECTORS.CATEGORY_FILTER);
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.courseCatalog.handleFilter();
            });
        }

        // Semester filter
        const semesterFilter = document.querySelector(CONSTANTS.SELECTORS.SEMESTER_FILTER);
        if (semesterFilter) {
            semesterFilter.addEventListener('change', () => {
                this.courseCatalog.handleFilter();
            });
        }

        // FoS filter
        const fosFilter = document.querySelector(CONSTANTS.SELECTORS.FOS_FILTER);
        if (fosFilter) {
            fosFilter.addEventListener('change', () => {
                this.courseCatalog.handleFilter();
            });
        }

        // Checkbox event listeners - use event delegation
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.type) {
                this.courseCatalog.updateToggleAllButton(e.target.dataset.type);
                this.courseCatalog.handleFilter();
            }
        });
    }

    /**
     * Setup modal listeners
     */
    setupModalListeners() {
        const modal = document.querySelector(CONSTANTS.SELECTORS.PDF_MODAL);
        const closeBtn = document.querySelector(CONSTANTS.SELECTORS.CLOSE_PDF_MODAL);
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (modal) modal.style.display = 'none';
            });
        }

        if (modal) {
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    }

    /**
     * Setup keyboard listeners
     */
    setupKeyboardListeners() {
        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.querySelector(CONSTANTS.SELECTORS.PDF_MODAL);
                if (modal && modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            }
        });

        // Focus search with Ctrl+F
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.querySelector(CONSTANTS.SELECTORS.SEARCH_INPUT);
                if (searchInput) searchInput.focus();
            }
        });
    }

    /**
     * Handle search input
     * @param {string} searchTerm - Search term
     */
    handleSearch(searchTerm) {
        this.courseCatalog.handleSearch(searchTerm);
    }

    /**
     * Remove all event listeners (cleanup)
     */
    removeEventListeners() {
        // Note: In a more complex app, you'd want to store references to specific listeners
        // and remove them individually. For this simple case, we'll rely on page unload.
        console.log('Event listeners will be cleaned up on page unload');
    }
}