// Filter Component Module
import { CONSTANTS } from '../utils/constants.js';
import { CategoryExtractor } from '../utils/categoryExtractor.js';

export class FilterComponent {
    constructor(courseCatalog) {
        this.courseCatalog = courseCatalog;
        this.categories = new Set();
        this.fosOptions = new Set();
        this.fosCategoriesOptions = new Set();
        this.generalOptions = new Set();
        this.semesters = new Set();
    }

    /**
     * Extract filter options from courses
     * @param {Array} courses - Array of courses
     */
    extractFilterOptions(courses) {
        const options = CategoryExtractor.extractFilterOptions(courses);
        
        this.categories.clear();
        this.fosOptions.clear();
        this.fosCategoriesOptions.clear();
        this.generalOptions.clear();
        this.semesters.clear();

        options.categories.forEach(cat => this.categories.add(cat));
        options.fosOptions.forEach(fos => this.fosOptions.add(fos));
        options.fosCategoriesOptions.forEach(fosCat => this.fosCategoriesOptions.add(fosCat));
        options.generalOptions.forEach(gen => this.generalOptions.add(gen));
        
        // Extract unique semesters from courses
        courses.forEach(course => {
            if (course.semester) {
                this.semesters.add(course.semester);
            }
        });
        
        console.log('FilterComponent: Extracted semesters:', Array.from(this.semesters));
    }

    /**
     * Populate all filters
     */
    populateFilters() {
        this.populateCategoryFilter();
        this.populateSemesterFilter();
        this.populateFosDropdown();
        this.populateCheckboxes(CONSTANTS.SELECTORS.FOS_CATEGORIES_CHECKBOXES, this.fosCategoriesOptions, CONSTANTS.FILTER_TYPES.FOS_CATEGORY);
        this.populateCheckboxes(CONSTANTS.SELECTORS.GENERAL_CHECKBOXES, this.generalOptions, CONSTANTS.FILTER_TYPES.GENERAL);
    }

    /**
     * Populate category filter
     */
    populateCategoryFilter() {
        const categoryFilter = document.querySelector(CONSTANTS.SELECTORS.CATEGORY_FILTER);
        if (!categoryFilter) return;

        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        const sortedCategories = Array.from(this.categories).sort();
        
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    /**
     * Populate FoS dropdown
     */
    populateFosDropdown() {
        const fosFilter = document.querySelector(CONSTANTS.SELECTORS.FOS_FILTER);
        if (!fosFilter) return;

        fosFilter.innerHTML = '<option value="">All Specializations</option>';
        const sortedFos = Array.from(this.fosOptions).sort();
        
        sortedFos.forEach(fos => {
            const option = document.createElement('option');
            option.value = fos;
            // Shorten the FoS name to just the specialization part
            const shortName = fos.replace('Field of Specialization in Mechatronics and Information Technology / ', '');
            option.textContent = shortName;
            fosFilter.appendChild(option);
        });
    }

    /**
     * Populate semester filter
     */
    populateSemesterFilter() {
        const semesterFilter = document.querySelector(CONSTANTS.SELECTORS.SEMESTER_FILTER);
        if (!semesterFilter) {
            console.error('FilterComponent: Semester filter element not found!');
            return;
        }

        console.log('FilterComponent: Populating semester filter with:', Array.from(this.semesters));

        semesterFilter.innerHTML = '<option value="">All Semesters</option>';
        
        // Define semester order and labels
        const semesterOrder = ['WS', 'SS', 'WS/SS', 'Irregular'];
        const semesterLabels = {
            'WS': 'Winter Semester (WS)',
            'SS': 'Summer Semester (SS)',
            'WS/SS': 'Both Semesters (WS/SS)',
            'Irregular': 'Irregular'
        };
        
        // Sort semesters according to the defined order
        const sortedSemesters = Array.from(this.semesters).sort((a, b) => {
            return semesterOrder.indexOf(a) - semesterOrder.indexOf(b);
        });
        
        console.log('FilterComponent: Sorted semesters:', sortedSemesters);
        
        sortedSemesters.forEach(semester => {
            const option = document.createElement('option');
            option.value = semester;
            option.textContent = semesterLabels[semester] || semester;
            semesterFilter.appendChild(option);
            console.log('FilterComponent: Added option:', semester, '->', semesterLabels[semester]);
        });
        
        console.log('FilterComponent: Semester filter populated with', sortedSemesters.length, 'options');
    }

    /**
     * Populate checkboxes
     * @param {string} containerId - Container ID
     * @param {Set} optionsSet - Set of options
     * @param {string} type - Type of checkboxes
     */
    populateCheckboxes(containerId, optionsSet, type) {
        const container = document.querySelector(containerId);
        if (!container) return;

        container.innerHTML = '';
        const sortedOptions = Array.from(optionsSet).sort();
        
        sortedOptions.forEach(option => {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';
                
            const checkboxId = `${type}_${option.replace(/[^a-zA-Z0-9]/g, '_')}`;
            
            checkboxItem.innerHTML = `
                <input type="checkbox" id="${checkboxId}" value="${option}" data-type="${type}">
                <label for="${checkboxId}">${option}</label>
                <span class="count">0</span>
            `;
            
            container.appendChild(checkboxItem);
        });
    }

    /**
     * Set default filters
     */
    setDefaultFilters() {
        // Set Industrial Informatics as default FoS
        const fosFilter = document.querySelector(CONSTANTS.SELECTORS.FOS_FILTER);
        if (fosFilter) {
            const industrialInformaticsOption = Array.from(fosFilter.options).find(option => 
                option.value.includes('Industrial Informatics and Systems Engineering')
            );
            if (industrialInformaticsOption) {
                fosFilter.value = industrialInformaticsOption.value;
            }
        }
        
        // Select all FoS Course Types by default
        document.querySelectorAll(`input[type="checkbox"][data-type="${CONSTANTS.FILTER_TYPES.FOS_CATEGORY}"]`).forEach(checkbox => {
            checkbox.checked = true;
        });
        
        // Select all Program Components by default
        document.querySelectorAll(`input[type="checkbox"][data-type="${CONSTANTS.FILTER_TYPES.GENERAL}"]`).forEach(checkbox => {
            checkbox.checked = true;
        });
    }

    /**
     * Get selected checkboxes
     * @param {string} type - Type of checkboxes
     * @returns {Array} Array of selected values
     */
    getSelectedCheckboxes(type) {
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-type="${type}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    /**
     * Check if course matches current filters
     * @param {Object} course - Course object
     * @param {string} searchTerm - Search term
     * @returns {boolean} True if course matches filters
     */
    matchesFilters(course, searchTerm) {
        // Search filter
        if (searchTerm && !course.Name.toLowerCase().includes(searchTerm)) {
            return false;
        }

        // Category filter
        const categoryFilter = document.querySelector(CONSTANTS.SELECTORS.CATEGORY_FILTER);
        if (categoryFilter && categoryFilter.value) {
            let courseCategories;
            if (course.categories && Array.isArray(course.categories)) {
                courseCategories = course.categories;
            } else {
                courseCategories = CategoryExtractor.extractCategories(course.Name);
            }
            if (!courseCategories.includes(categoryFilter.value)) {
                return false;
            }
        }

        // Semester filter
        const semesterFilter = document.querySelector(CONSTANTS.SELECTORS.SEMESTER_FILTER);
        if (semesterFilter && semesterFilter.value) {
            const selectedSemester = semesterFilter.value;
            if (!course.semester) {
                return false;
            }
            
            // WS should include WS and WS/SS
            // SS should include SS and WS/SS
            // WS/SS only matches WS/SS
            // Irregular only matches Irregular
            if (selectedSemester === 'WS') {
                if (course.semester !== 'WS' && course.semester !== 'WS/SS') {
                    return false;
                }
            } else if (selectedSemester === 'SS') {
                if (course.semester !== 'SS' && course.semester !== 'WS/SS') {
                    return false;
                }
            } else {
                // Exact match for WS/SS and Irregular
                if (course.semester !== selectedSemester) {
                    return false;
                }
            }
        }

        // FoS filter
        const fosFilter = document.querySelector(CONSTANTS.SELECTORS.FOS_FILTER);
        if (fosFilter && fosFilter.value) {
            // Check if this is an Elective Area course
            const isElectiveAreaCourse = Array.isArray(course['Available in']) && 
                course['Available in'].some(avail => 
                    avail.FoS && avail.FoS.includes('Elective Area')
                );
            
            if (!isElectiveAreaCourse) {
                // Only apply FoS filter to non-Elective Area courses
                let matchesFos = false;
                if (Array.isArray(course['Available in'])) {
                    matchesFos = course['Available in'].some(avail => 
                        avail.FoS && avail.FoS === fosFilter.value && !avail.FoS.includes('Elective Area')
                    );
                }
                if (!matchesFos) {
                    return false;
                }
            }
        }

        // Course type filters
        const selectedFosCategories = this.getSelectedCheckboxes(CONSTANTS.FILTER_TYPES.FOS_CATEGORY);
        const selectedGeneral = this.getSelectedCheckboxes(CONSTANTS.FILTER_TYPES.GENERAL);

        // A course is shown if it matches AT LEAST ONE selected course type
        let matchesAnyCourseType = false;

        // Check FoS categories
        if (selectedFosCategories.length > 0) {
            if (Array.isArray(course['Available in'])) {
                const matchesFosCategory = course['Available in'].some(avail => {
                    const fosMatches = !fosFilter?.value || (avail.FoS && avail.FoS === fosFilter.value);
                    const categoryMatches = selectedFosCategories.some(category => 
                        avail.subtype && avail.subtype.includes(category)
                    );
                    return fosMatches && categoryMatches;
                });
                if (matchesFosCategory) {
                    matchesAnyCourseType = true;
                }
            }
        }

        // Check Program components
        if (selectedGeneral.length > 0) {
            const matchesGeneral = selectedGeneral.some(general => {
                if (general.includes('Master\'s Thesis') && course.Name === 'Master\'s Thesis') {
                    return true;
                }
                if (general.includes('Interdisciplinary Qualifications') && course.Name === 'Interdisciplinary Qualifications') {
                    return true;
                }
                if (general.includes('Elective Area') && Array.isArray(course['Available in'])) {
                    return course['Available in'].some(avail => 
                        avail.FoS && avail.FoS.includes('Elective Area')
                    );
                }
                return false;
            });
            if (matchesGeneral) {
                matchesAnyCourseType = true;
            }
        }

        // If no course types are selected, show no courses
        if (selectedFosCategories.length > 0 || selectedGeneral.length > 0) {
            return matchesAnyCourseType;
        }

        return false;
    }
}