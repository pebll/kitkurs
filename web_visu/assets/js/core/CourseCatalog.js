// Main Course Catalog Application
import { DataLoader } from './DataLoader.js';
import { EventManager } from './EventManager.js';
import { SearchComponent } from '../components/SearchComponent.js';
import { FilterComponent } from '../components/FilterComponent.js';
import { CourseGrid } from '../components/CourseGrid.js';
import { ModalComponent } from '../components/ModalComponent.js';
import { Helpers } from '../utils/helpers.js';
import { CONSTANTS } from '../utils/constants.js';

export class CourseCatalog {
    constructor() {
        this.courses = [];
        this.filteredCourses = [];
        
        // Initialize components
        this.dataLoader = new DataLoader();
        this.searchComponent = new SearchComponent(this);
        this.filterComponent = new FilterComponent(this);
        this.courseGrid = new CourseGrid(this);
        this.modalComponent = new ModalComponent(this);
        this.eventManager = new EventManager(this);
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            await this.dataLoader.loadStudyPrograms();
            this.eventManager.setupEventListeners();
            await this.loadCourses();
            this.filterComponent.populateFilters();
            this.filterComponent.setDefaultFilters();
            this.renderCourses();
        } catch (error) {
            console.error('Error initializing course catalog:', error);
            Helpers.showError('Failed to load courses. Please refresh the page.');
        }
    }

    /**
     * Load courses from data loader
     */
    async loadCourses() {
        try {
            this.courses = await this.dataLoader.loadCourses();
            this.filteredCourses = [...this.courses];
            this.filterComponent.extractFilterOptions(this.courses);
            console.log(`Loaded ${this.courses.length} courses`);
        } catch (error) {
            console.error('Error loading courses:', error);
            throw error;
        }
    }

    /**
     * Handle search input
     * @param {string} searchTerm - Search term
     */
    handleSearch(searchTerm) {
        this.searchComponent.handleSearch(searchTerm);
    }

    /**
     * Handle filter changes
     */
    handleFilter() {
        const searchTerm = this.searchComponent.getSearchTerm();
        
        this.filteredCourses = this.courses.filter(course => {
            return this.filterComponent.matchesFilters(course, searchTerm);
        });

        this.renderCourses();
        this.updateDynamicCounts();
    }

    /**
     * Render courses to the grid
     */
    renderCourses() {
        this.courseGrid.render(this.filteredCourses);
    }

    /**
     * Update dynamic counts in filters
     */
    updateDynamicCounts() {
        this.updateCategoryCounts();
        this.updateFosCategoryCounts();
        this.updateGeneralCounts();
    }

    /**
     * Update category counts
     */
    updateCategoryCounts() {
        const categoryFilter = document.querySelector(CONSTANTS.SELECTORS.CATEGORY_FILTER);
        if (!categoryFilter) return;

        // Count each category from filtered courses
        const categoryCounts = {};
        this.filteredCourses.forEach(course => {
            let courseCategories;
            if (course.categories && Array.isArray(course.categories)) {
                courseCategories = course.categories;
            } else {
                courseCategories = this.filterComponent.extractCategories(course.Name);
            }
            
            courseCategories.forEach(category => {
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            });
        });
        
        // Get current selection to preserve it
        const currentValue = categoryFilter.value;
        
        // Clear all options except "All Categories"
        const allOption = categoryFilter.querySelector('option[value=""]');
        categoryFilter.innerHTML = '';
        if (allOption) {
            categoryFilter.appendChild(allOption);
        }
        
        // Sort categories by count (descending) then by name
        const sortedCategories = Object.entries(categoryCounts)
            .sort((a, b) => {
                if (b[1] !== a[1]) return b[1] - a[1];
                return a[0].localeCompare(b[0]);
            });
        
        // Add sorted options
        sortedCategories.forEach(([category, count]) => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = `${category} (${count})`;
            categoryFilter.appendChild(option);
        });
        
        // Restore selection
        categoryFilter.value = currentValue;
    }

    /**
     * Update FoS category counts
     */
    updateFosCategoryCounts() {
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-type="${CONSTANTS.FILTER_TYPES.FOS_CATEGORY}"]`);
        const fosFilter = document.querySelector(CONSTANTS.SELECTORS.FOS_FILTER);
        
        checkboxes.forEach(checkbox => {
            const category = checkbox.value;
            let count = 0;
            
            this.filteredCourses.forEach(course => {
                if (Array.isArray(course['Available in'])) {
                    const hasCategory = course['Available in'].some(avail => {
                        const fosMatches = !fosFilter?.value || (avail.FoS && avail.FoS === fosFilter.value);
                        const categoryMatches = avail.subtype && avail.subtype.includes(category);
                        return fosMatches && categoryMatches;
                    });
                    
                    if (hasCategory) {
                        count++;
                    }
                }
            });
            
            // Update the count display
            const countElement = checkbox.parentElement.querySelector('.count');
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }

    /**
     * Update general category counts
     */
    updateGeneralCounts() {
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-type="${CONSTANTS.FILTER_TYPES.GENERAL}"]`);
        
        checkboxes.forEach(checkbox => {
            const category = checkbox.value;
            let count = 0;
            
            this.filteredCourses.forEach(course => {
                let matches = false;
                
                if (category.includes('Master\'s Thesis') && course.Name === 'Master\'s Thesis') {
                    matches = true;
                } else if (category.includes('Interdisciplinary Qualifications') && course.Name === 'Interdisciplinary Qualifications') {
                    matches = true;
                } else if (category.includes('Elective Area') && Array.isArray(course['Available in'])) {
                    matches = course['Available in'].some(avail => 
                        avail.FoS && avail.FoS.includes('Elective Area')
                    );
                }
                
                if (matches) {
                    count++;
                }
            });
            
            // Update the count display
            const countElement = checkbox.parentElement.querySelector('.count');
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }

    /**
     * Toggle all checkboxes of a specific type
     * @param {string} type - Type of checkboxes to toggle
     */
    toggleAll(type) {
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-type="${type}"]`);
        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        
        // Toggle all checkboxes
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        // Update the toggle button icon
        const button = event.target.closest('.toggle-all-btn');
        const icon = button.querySelector('i');
        if (allChecked) {
            icon.className = 'fas fa-square';
        } else {
            icon.className = 'fas fa-check-square';
        }
        
        // Apply the filter
        this.handleFilter();
    }

    /**
     * Update toggle all button state
     * @param {string} type - Type of checkboxes
     */
    updateToggleAllButton(type) {
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-type="${type}"]`);
        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        const noneChecked = Array.from(checkboxes).every(checkbox => !checkbox.checked);
        
        // Find the toggle button for this type
        const toggleButton = document.querySelector(`button[onclick*="toggleAll('${type}')"]`);
        if (toggleButton) {
            const icon = toggleButton.querySelector('i');
            if (allChecked) {
                icon.className = 'fas fa-check-square';
            } else if (noneChecked) {
                icon.className = 'fas fa-square';
            } else {
                icon.className = 'fas fa-minus-square';
            }
        }
    }

    /**
     * View PDF for a course
     * @param {string} pdfLink - PDF link
     * @param {string} courseName - Course name
     */
    viewPDF(pdfLink, courseName) {
        this.modalComponent.show(pdfLink, courseName);
    }

    /**
     * Toggle availability display
     * @param {HTMLElement} button - Toggle button
     * @param {Array} availabilityList - List of availability items
     */
    toggleAvailability(button, availabilityList) {
        this.courseGrid.toggleAvailability(button, availabilityList);
    }
}