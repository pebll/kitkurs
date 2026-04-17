// Simple Modular Implementation
// This demonstrates the new structure while maintaining compatibility

// Utility functions
const Utils = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    showLoading(containerId = 'coursesGrid') {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                </div>
            `;
        }
    },

    showError(message, containerId = 'coursesGrid') {
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
};

// Constants
const CONSTANTS = {
    SELECTORS: {
        SEARCH_INPUT: '#searchInput',
        CATEGORY_FILTER: '#categoryFilter',
        SEMESTER_FILTER: '#semesterFilter',
        FOS_FILTER: '#fosFilter',
        COURSES_GRID: '#coursesGrid',
        RESULTS_COUNT: '#resultsCount',
        NO_RESULTS: '#noResults',
        PDF_MODAL: '#pdfModal',
        PDF_VIEWER: '#pdfViewer',
        PDF_TITLE: '#pdfTitle',
        CLOSE_PDF_MODAL: '#closePdfModal',
        SHOW_FAVORITES_ONLY: '#showFavoritesOnly',
        HIDE_NOT_INTERESTED: '#hideNotInterested'
    },
    STORAGE_KEYS: {
        FAVORITES: 'kitkurs_favorites',
        NOT_INTERESTED: 'kitkurs_not_interested',
        CUSTOM_COURSES: 'kitkurs_custom_courses'
    },
    // Course category helpers
    COURSE_CATEGORIES: {
        isThesis: (course) => {
            return course.Name === 'Master\'s Thesis' || 
                   (course.isCustom && course.customCategory === 'thesis');
        },
        isInterdisciplinary: (course) => {
            return course.Name === 'Interdisciplinary Qualifications' || 
                   (course.isCustom && course.customCategory === 'interdisciplinary');
        },
        isElectiveArea: (course) => {
            if (course.isCustom && course.customCategory === 'electiveArea') return true;
            return Array.isArray(course['Available in']) && 
                   course['Available in'].some(avail => 
                       avail.FoS && avail.FoS.includes('Elective Area')
                   );
        },
        isFosMethodical: (course, fosFilter = null) => {
            if (course.isCustom && course.customCategory === 'methodical') return true;
            if (!Array.isArray(course['Available in'])) return false;
            return course['Available in'].some(avail => {
                if (!avail.subtype || !avail.subtype.includes('Mandatory Electives - Methodical')) return false;
                if (fosFilter && avail.FoS) {
                    return avail.FoS === fosFilter || avail.FoS.includes('Custom');
                }
                return true;
            });
        },
        isFosGeneral: (course, fosFilter = null) => {
            if (course.isCustom && course.customCategory === 'general') return true;
            if (!Array.isArray(course['Available in'])) return false;
            return course['Available in'].some(avail => {
                if (!avail.subtype || !avail.subtype.includes('Mandatory Electives - General')) return false;
                if (fosFilter && avail.FoS) {
                    return avail.FoS === fosFilter || avail.FoS.includes('Custom');
                }
                return true;
            });
        },
        isFosAdditive: (course, fosFilter = null) => {
            if (course.isCustom && course.customCategory === 'additive') return true;
            if (!Array.isArray(course['Available in'])) return false;
            return course['Available in'].some(avail => {
                if (!avail.subtype || !avail.subtype.includes('Additive Electives')) return false;
                if (fosFilter && avail.FoS) {
                    return avail.FoS === fosFilter || avail.FoS.includes('Custom');
                }
                return true;
            });
        }
    }
};

// Favorites Manager Module
class FavoritesManager {
    constructor() {
        this.favorites = this.loadFavorites();
        this.notInterested = this.loadNotInterested();
    }

    loadFavorites() {
        try {
            const stored = localStorage.getItem(CONSTANTS.STORAGE_KEYS.FAVORITES);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading favorites:', error);
            return [];
        }
    }

    loadNotInterested() {
        try {
            const stored = localStorage.getItem(CONSTANTS.STORAGE_KEYS.NOT_INTERESTED);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading not interested:', error);
            return [];
        }
    }

    saveFavorites() {
        try {
            localStorage.setItem(CONSTANTS.STORAGE_KEYS.FAVORITES, JSON.stringify(this.favorites));
        } catch (error) {
            console.error('Error saving favorites:', error);
        }
    }

    saveNotInterested() {
        try {
            localStorage.setItem(CONSTANTS.STORAGE_KEYS.NOT_INTERESTED, JSON.stringify(this.notInterested));
        } catch (error) {
            console.error('Error saving not interested:', error);
        }
    }

    isFavorite(courseName) {
        return this.favorites.includes(courseName);
    }

    isNotInterested(courseName) {
        return this.notInterested.includes(courseName);
    }

    toggleFavorite(courseName) {
        const index = this.favorites.indexOf(courseName);
        if (index === -1) {
            this.favorites.push(courseName);
            // Remove from not interested if it was there
            const notIntIndex = this.notInterested.indexOf(courseName);
            if (notIntIndex !== -1) {
                this.notInterested.splice(notIntIndex, 1);
                this.saveNotInterested();
            }
        } else {
            this.favorites.splice(index, 1);
        }
        this.saveFavorites();
        return this.isFavorite(courseName);
    }

    toggleNotInterested(courseName) {
        const index = this.notInterested.indexOf(courseName);
        if (index === -1) {
            this.notInterested.push(courseName);
            // Remove from favorites if it was there
            const favIndex = this.favorites.indexOf(courseName);
            if (favIndex !== -1) {
                this.favorites.splice(favIndex, 1);
                this.saveFavorites();
            }
        } else {
            this.notInterested.splice(index, 1);
        }
        this.saveNotInterested();
        return this.isNotInterested(courseName);
    }

    getFavorites() {
        return [...this.favorites];
    }

    getNotInterested() {
        return [...this.notInterested];
    }
}

// Data Loader Module
class DataLoader {
    constructor() {
        this.courses = [];
        this.customCourses = this.loadCustomCourses();
    }

    loadCustomCourses() {
        try {
            const stored = localStorage.getItem(CONSTANTS.STORAGE_KEYS.CUSTOM_COURSES);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading custom courses:', error);
            return [];
        }
    }

    saveCustomCourses() {
        try {
            localStorage.setItem(CONSTANTS.STORAGE_KEYS.CUSTOM_COURSES, JSON.stringify(this.customCourses));
        } catch (error) {
            console.error('Error saving custom courses:', error);
        }
    }

    async loadCourses() {
        try {
            const response = await fetch('./study_programs/mechatronics_master/courses.json');
            if (!response.ok) {
                throw new Error('Failed to fetch courses');
            }
            const fetchedCourses = await response.json();
            this.courses = [...fetchedCourses, ...this.customCourses];
            console.log(`Loaded ${fetchedCourses.length} courses + ${this.customCourses.length} custom courses`);
            return this.courses;
        } catch (error) {
            console.error('Error loading courses:', error);
            throw error;
        }
    }

    getCourses() {
        return this.courses;
    }
}

// Search Component
class SearchComponent {
    constructor(courseCatalog) {
        this.courseCatalog = courseCatalog;
        this.searchTerm = '';
        this.debouncedSearch = Utils.debounce(this.handleSearch.bind(this), 300);
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.courseCatalog.handleFilter();
    }

    getSearchTerm() {
        return this.searchTerm;
    }

    clearSearch() {
        const searchInput = document.querySelector(CONSTANTS.SELECTORS.SEARCH_INPUT);
        if (searchInput) {
            searchInput.value = '';
            this.searchTerm = '';
        }
    }
}

// Filter Component
class FilterComponent {
    constructor(courseCatalog) {
        this.courseCatalog = courseCatalog;
        this.categories = new Set();
        this.fosOptions = new Set();
        this.fosCategoriesOptions = new Set();
        this.generalOptions = new Set();
        this.semesters = new Set();
    }

    extractFilterOptions(courses) {
        courses.forEach(course => {
            // Handle categories
            if (course.categories && Array.isArray(course.categories)) {
                course.categories.forEach(cat => this.categories.add(cat));
            } else {
                const categories = this.extractCategories(course.Name);
                categories.forEach(cat => this.categories.add(cat));
            }
            
            // Extract semesters
            if (course.semester) {
                this.semesters.add(course.semester);
            }
            
            // Extract availability options
            if (Array.isArray(course['Available in'])) {
                course['Available in'].forEach(avail => {
                    if (avail.FoS && !avail.FoS.includes('Elective Area')) {
                        this.fosOptions.add(avail.FoS);
                    }
                    if (avail.subtype && avail.subtype !== 'Elective Area in Mechatronics and Information Technology') {
                        this.fosCategoriesOptions.add(avail.subtype);
                    }
                });
            } else if (course['Available in'] && course['Available in'].trim()) {
                const availability = course['Available in'].split(',').map(a => a.trim());
                availability.forEach(av => {
                    this.generalOptions.add(av);
                });
            }
        });
        
        this.generalOptions.add('Master\'s Thesis (30 CP)');
        this.generalOptions.add('Interdisciplinary Qualifications (8 CP)');
        this.generalOptions.add('Elective Area (22 CP)');
        
        console.log('Extracted semesters:', Array.from(this.semesters));
    }

    extractCategories(courseName) {
        const categories = [];
        const name = courseName.toLowerCase();
        
        const categoryKeywords = {
            'Artificial Intelligence': ['artificial intelligence', 'ai', 'machine learning', 'deep learning', 'neural networks'],
            'Robotics': ['robotics', 'robot', 'humanoid', 'mobile robotics', 'automation'],
            'Energy': ['energy', 'power', 'solar', 'renewable', 'battery', 'fuel cell'],
            'Automotive': ['automotive', 'vehicle', 'automobile', 'driving', 'powertrain'],
            'Electronics': ['electronics', 'circuit', 'digital', 'analog', 'hardware'],
            'Control Systems': ['control', 'automation', 'feedback', 'regulation'],
            'Materials': ['materials', 'polymers', 'nanomaterials', 'lightweight'],
            'Manufacturing': ['manufacturing', 'production', 'logistics', 'supply chain'],
            'Optics': ['optics', 'optical', 'photonics', 'laser', 'lighting'],
            'Biomedical': ['biomedical', 'bio', 'medical', 'physiological', 'bionics'],
            'Communication': ['communication', 'signal processing', 'information', 'data'],
            'Mechanical': ['mechanical', 'dynamics', 'mechanics', 'machines'],
            'Software': ['software', 'programming', 'algorithms', 'data analytics'],
            'Microsystems': ['microsystem', 'micro', 'nano', 'mems', 'microtechnology']
        };

        Object.entries(categoryKeywords).forEach(([category, keywords]) => {
            if (keywords.some(keyword => name.includes(keyword))) {
                categories.push(category);
            }
        });

        if (categories.length === 0) {
            if (name.includes('laboratory') || name.includes('lab')) {
                categories.push('Laboratory');
            } else if (name.includes('seminar')) {
                categories.push('Seminar');
            } else if (name.includes('project')) {
                categories.push('Project');
            } else if (name.includes('practical')) {
                categories.push('Practical');
            } else {
                categories.push('General Engineering');
            }
        }

        return categories;
    }

    populateFilters() {
        this.populateCategoryFilter();
        this.populateSemesterFilter();
        this.populateFosDropdown();
        this.populateCheckboxes('fosCategoriesCheckboxes', this.fosCategoriesOptions, 'fosCategory');
        this.populateCheckboxes('generalCheckboxes', this.generalOptions, 'general');
    }

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

    populateFosDropdown() {
        const fosFilter = document.querySelector(CONSTANTS.SELECTORS.FOS_FILTER);
        if (!fosFilter) return;

        fosFilter.innerHTML = '<option value="">All Specializations</option>';
        const sortedFos = Array.from(this.fosOptions).sort();
        
        sortedFos.forEach(fos => {
            const option = document.createElement('option');
            option.value = fos;
            const shortName = fos.replace('Field of Specialization in Mechatronics and Information Technology / ', '');
            option.textContent = shortName;
            fosFilter.appendChild(option);
        });
    }

    populateSemesterFilter() {
        const semesterFilter = document.querySelector(CONSTANTS.SELECTORS.SEMESTER_FILTER);
        if (!semesterFilter) {
            console.error('Semester filter element not found!');
            return;
        }

        console.log('Populating semester filter with:', Array.from(this.semesters));

        semesterFilter.innerHTML = '<option value="">All Semesters</option>';
        
        const semesterOrder = ['WS', 'SS', 'WS/SS', 'Irregular'];
        const semesterLabels = {
            'WS': 'Winter Semester (WS)',
            'SS': 'Summer Semester (SS)',
            'WS/SS': 'Both Semesters (WS/SS)',
            'Irregular': 'Irregular'
        };
        
        const sortedSemesters = Array.from(this.semesters).sort((a, b) => {
            return semesterOrder.indexOf(a) - semesterOrder.indexOf(b);
        });
        
        console.log('Adding semester options:', sortedSemesters);
        
        sortedSemesters.forEach(semester => {
            const option = document.createElement('option');
            option.value = semester;
            option.textContent = semesterLabels[semester] || semester;
            semesterFilter.appendChild(option);
            console.log('Added semester option:', semester);
        });
    }

    populateCheckboxes(containerId, optionsSet, type) {
        const container = document.getElementById(containerId);
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

    setDefaultFilters() {
        const fosFilter = document.querySelector(CONSTANTS.SELECTORS.FOS_FILTER);
        const industrialInformaticsOption = Array.from(fosFilter.options).find(option => 
            option.value.includes('Industrial Informatics and Systems Engineering')
        );
        if (industrialInformaticsOption) {
            fosFilter.value = industrialInformaticsOption.value;
        }
        
        document.querySelectorAll('input[type="checkbox"][data-type="fosCategory"]').forEach(checkbox => {
            checkbox.checked = true;
        });
        
        document.querySelectorAll('input[type="checkbox"][data-type="general"]').forEach(checkbox => {
            checkbox.checked = true;
        });
    }

    getSelectedCheckboxes(type) {
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-type="${type}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    matchesFilters(course, searchTerm) {
        // Debug logging for custom courses
        const isCustom = course.isCustom;
        if (isCustom) {
            console.log(`[FILTER DEBUG] Checking custom course: "${course.Name}", category: ${course.customCategory}`);
        }

        // Search filter
        if (searchTerm && !course.Name.toLowerCase().includes(searchTerm)) {
            if (isCustom) console.log(`  → Filtered by SEARCH: "${searchTerm}"`);
            return false;
        }

        // Category filter
        const categoryFilter = document.querySelector(CONSTANTS.SELECTORS.CATEGORY_FILTER);
        if (categoryFilter && categoryFilter.value) {
            let courseCategories;
            if (course.categories && Array.isArray(course.categories)) {
                courseCategories = course.categories;
            } else {
                courseCategories = this.extractCategories(course.Name);
            }
            if (!courseCategories.includes(categoryFilter.value)) {
                if (isCustom) console.log(`  → Filtered by CATEGORY: needs "${categoryFilter.value}", has:`, courseCategories);
                return false;
            }
        }

        // Semester filter
        const semesterFilter = document.querySelector(CONSTANTS.SELECTORS.SEMESTER_FILTER);
        if (semesterFilter && semesterFilter.value) {
            const selectedSemester = semesterFilter.value;
            if (!course.semester) {
                if (isCustom) console.log(`  → Filtered by SEMESTER: no semester defined`);
                return false;
            }
            
            if (selectedSemester === 'WS') {
                if (course.semester !== 'WS' && course.semester !== 'WS/SS') {
                    if (isCustom) console.log(`  → Filtered by SEMESTER: needs WS, has ${course.semester}`);
                    return false;
                }
            } else if (selectedSemester === 'SS') {
                if (course.semester !== 'SS' && course.semester !== 'WS/SS') {
                    if (isCustom) console.log(`  → Filtered by SEMESTER: needs SS, has ${course.semester}`);
                    return false;
                }
            } else {
                if (course.semester !== selectedSemester) {
                    if (isCustom) console.log(`  → Filtered by SEMESTER: needs ${selectedSemester}, has ${course.semester}`);
                    return false;
                }
            }
        }

        // FoS filter
        const fosFilter = document.querySelector(CONSTANTS.SELECTORS.FOS_FILTER);
        if (fosFilter && fosFilter.value) {
            // Thesis, Interdisciplinary, and Elective Area courses are exempt from FoS filter
            // because they're not FoS-specific
            const isExemptFromFos = CONSTANTS.COURSE_CATEGORIES.isThesis(course) ||
                                    CONSTANTS.COURSE_CATEGORIES.isInterdisciplinary(course) ||
                                    CONSTANTS.COURSE_CATEGORIES.isElectiveArea(course);
            
            if (isExemptFromFos) {
                if (isCustom) console.log(`  → EXEMPT from FoS filter (thesis/interdisciplinary/elective)`);
            } else {
                const isElectiveAreaCourse = Array.isArray(course['Available in']) && 
                    course['Available in'].some(avail => 
                        avail.FoS && avail.FoS.includes('Elective Area')
                    );
                
                if (!isElectiveAreaCourse) {
                    let matchesFos = false;
                    if (Array.isArray(course['Available in'])) {
                        matchesFos = course['Available in'].some(avail => 
                            avail.FoS && avail.FoS === fosFilter.value && !avail.FoS.includes('Elective Area')
                        );
                    }
                    if (!matchesFos) {
                        if (isCustom) console.log(`  → Filtered by FOS: needs "${fosFilter.value}"`);
                        return false;
                    }
                }
            }
        }

        // Course type filters
        const selectedFosCategories = this.getSelectedCheckboxes('fosCategory');
        const selectedGeneral = this.getSelectedCheckboxes('general');

        if (isCustom) {
            console.log(`  → Course type filters:`, {
                selectedFosCategories,
                selectedGeneral
            });
        }

        // If no course type filters are selected, return true (show everything)
        if (selectedFosCategories.length === 0 && selectedGeneral.length === 0) {
            if (isCustom) console.log(`  → PASS: No course type filters selected`);
            return true;
        }

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
            
            // Also check custom FoS courses
            if (course.isCustom) {
                if (course.customCategory === 'methodical' && selectedFosCategories.includes('Mandatory Electives - Methodical')) {
                    if (isCustom) console.log(`  → MATCHED: FoS Methodical (custom)`);
                    matchesAnyCourseType = true;
                }
                if (course.customCategory === 'general' && selectedFosCategories.includes('Mandatory Electives - General')) {
                    if (isCustom) console.log(`  → MATCHED: FoS General (custom)`);
                    matchesAnyCourseType = true;
                }
                if (course.customCategory === 'additive' && selectedFosCategories.includes('Additive Electives')) {
                    if (isCustom) console.log(`  → MATCHED: FoS Additive (custom)`);
                    matchesAnyCourseType = true;
                }
            }
        }

        // Check Program components
        if (selectedGeneral.length > 0) {
            if (isCustom) console.log(`  → Checking general categories:`, selectedGeneral);
            
            const matchesGeneral = selectedGeneral.some(general => {
                if (general.includes('Master\'s Thesis')) {
                    const matches = CONSTANTS.COURSE_CATEGORIES.isThesis(course);
                    if (isCustom) console.log(`    - Thesis check: ${matches}`);
                    return matches;
                }
                if (general.includes('Interdisciplinary Qualifications')) {
                    const matches = CONSTANTS.COURSE_CATEGORIES.isInterdisciplinary(course);
                    if (isCustom) console.log(`    - Interdisciplinary check: ${matches} (category: ${course.customCategory})`);
                    return matches;
                }
                if (general.includes('Elective Area')) {
                    const matches = CONSTANTS.COURSE_CATEGORIES.isElectiveArea(course);
                    if (isCustom) console.log(`    - Elective Area check: ${matches}`);
                    return matches;
                }
                return false;
            });
            if (matchesGeneral) {
                if (isCustom) console.log(`  → MATCHED: General category`);
                matchesAnyCourseType = true;
            }
        }

        if (isCustom) {
            console.log(`  → Final result: ${matchesAnyCourseType ? 'PASS' : 'FAIL'}`);
        }

        return matchesAnyCourseType;
    }
}

// Course Grid Component
class CourseGrid {
    constructor(courseCatalog) {
        this.courseCatalog = courseCatalog;
    }

    render(courses) {
        const coursesGrid = document.querySelector(CONSTANTS.SELECTORS.COURSES_GRID);
        const resultsCount = document.querySelector(CONSTANTS.SELECTORS.RESULTS_COUNT);
        const noResults = document.querySelector(CONSTANTS.SELECTORS.NO_RESULTS);

        if (!coursesGrid || !resultsCount || !noResults) return;

        resultsCount.textContent = `${courses.length} course${courses.length !== 1 ? 's' : ''} found`;

        if (courses.length === 0) {
            coursesGrid.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }

        coursesGrid.style.display = 'grid';
        noResults.style.display = 'none';

        coursesGrid.innerHTML = courses.map(course => this.createCourseCard(course)).join('');
    }

    createCourseCard(course) {
        let categories;
        if (course.categories && Array.isArray(course.categories)) {
            categories = course.categories;
        } else {
            categories = this.extractCategories(course.Name);
        }
        
        let availabilityList = [];
        
        if (Array.isArray(course['Available in'])) {
            const fosMap = new Map();
            let hasElectiveArea = false;
            
            course['Available in'].forEach(avail => {
                if (avail.FoS && avail.subtype) {
                    if (avail.FoS.includes('Elective Area')) {
                        hasElectiveArea = true;
                    } else {
                        const shortFos = avail.FoS.replace('Field of Specialization in Mechatronics and Information Technology / ', '');
                        if (!fosMap.has(shortFos)) {
                            fosMap.set(shortFos, []);
                        }
                        fosMap.get(shortFos).push(avail.subtype);
                    }
                }
            });
            
            fosMap.forEach((subtypes, fos) => {
                const uniqueSubtypes = [...new Set(subtypes)];
                const clearSubtypes = uniqueSubtypes.map(subtype => {
                    switch(subtype) {
                        case 'Mandatory Electives - Methodical':
                            return 'Methodical';
                        case 'Mandatory Electives - General':
                            return 'General';
                        case 'Additive Electives':
                            return 'Additive';
                        case 'Elective Area in Mechatronics and Information Technology':
                            return 'Elective Area';
                        default:
                            return subtype;
                    }
                });
                availabilityList.push(`<strong>${fos}</strong>: ${clearSubtypes.join(', ')}`);
            });
            
            if (hasElectiveArea) {
                availabilityList.push('<strong>Elective Area</strong>');
            }
        } else if (course['Available in'] && course['Available in'].trim()) {
            availabilityList = [course['Available in']];
        }
        
        const maxVisible = 2;
        const visibleItems = availabilityList.slice(0, maxVisible);
        const hiddenItems = availabilityList.slice(maxVisible);
        
        let availabilityDisplay = visibleItems.join('<br>');
        if (hiddenItems.length > 0) {
            availabilityDisplay += `<br><em>(+${hiddenItems.length} more)</em>`;
        }
        
        const isFavorite = this.courseCatalog.favoritesManager.isFavorite(course.Name);
        const isNotInterested = this.courseCatalog.favoritesManager.isNotInterested(course.Name);
        const starClass = isFavorite ? 'starred' : '';
        const notInterestedClass = isNotInterested ? 'not-interested' : '';
        const isCustom = course.isCustom || false;
        
        return `
            <div class="course-card ${isNotInterested ? 'dimmed' : ''} ${isCustom ? 'custom-course' : ''}" data-course-name="${course.Name}">
                <div class="course-actions-top">
                    <button class="star-btn ${starClass}" onclick="courseCatalog.toggleFavorite('${course.Name.replace(/'/g, "\\'")}', this)" title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="not-interested-btn ${notInterestedClass}" onclick="courseCatalog.toggleNotInterested('${course.Name.replace(/'/g, "\\'")}', this)" title="${isNotInterested ? 'Mark as interested' : 'Not interested'}">
                        <i class="fas fa-eye-slash"></i>
                    </button>
                </div>
                ${isCustom ? '<span class="custom-badge-card">Custom</span>' : ''}
                <h3 class="course-title">${course.Name}</h3>
                
                <div class="course-details">
                    <div class="detail-item">
                        <i class="fas fa-certificate"></i>
                        <span class="detail-label">ECTS:</span>
                        <span class="detail-value">${course.ECTS}</span>
                    </div>
                    
                    ${course.semester ? `
                        <div class="detail-item">
                            <i class="fas fa-calendar-check"></i>
                            <span class="detail-label">Semester:</span>
                            <span class="detail-value semester-badge semester-${course.semester.toLowerCase().replace('/', '-')}">${course.semester}</span>
                        </div>
                    ` : ''}
                    
                    <div class="detail-item availability-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span class="detail-label">Available:</span>
                        <div class="availability-container">
                            <div class="detail-value availability-text">${availabilityDisplay || 'Not specified'}</div>
                            ${availabilityList.length > maxVisible ? `
                                <button class="show-more-btn" onclick="courseCatalog.toggleAvailability(this, ${JSON.stringify(availabilityList).replace(/"/g, '&quot;')})">
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="category-tags">
                    ${categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
                </div>
                
                ${isCustom ? `
                    <div class="custom-course-actions">
                        <button class="edit-custom-course-btn" onclick="courseCatalog.editCustomCourse('${course.Name.replace(/'/g, "\\'")}')">
                            <i class="fas fa-edit"></i>
                            Edit Course
                        </button>
                        <button class="delete-custom-course-btn" onclick="courseCatalog.deleteCustomCourse('${course.Name.replace(/'/g, "\\'")}')">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                    </div>
                ` : `
                    <button class="view-pdf-btn" onclick="courseCatalog.viewPDF('${course.pdf_link}', '${course.Name}')">
                        <i class="fas fa-file-pdf"></i>
                        View Course Details
                    </button>
                `}
            </div>
        `;
    }

    extractCategories(courseName) {
        const categories = [];
        const name = courseName.toLowerCase();
        
        const categoryKeywords = {
            'Artificial Intelligence': ['artificial intelligence', 'ai', 'machine learning', 'deep learning', 'neural networks'],
            'Robotics': ['robotics', 'robot', 'humanoid', 'mobile robotics', 'automation'],
            'Energy': ['energy', 'power', 'solar', 'renewable', 'battery', 'fuel cell'],
            'Automotive': ['automotive', 'vehicle', 'automobile', 'driving', 'powertrain'],
            'Electronics': ['electronics', 'circuit', 'digital', 'analog', 'hardware'],
            'Control Systems': ['control', 'automation', 'feedback', 'regulation'],
            'Materials': ['materials', 'polymers', 'nanomaterials', 'lightweight'],
            'Manufacturing': ['manufacturing', 'production', 'logistics', 'supply chain'],
            'Optics': ['optics', 'optical', 'photonics', 'laser', 'lighting'],
            'Biomedical': ['biomedical', 'bio', 'medical', 'physiological', 'bionics'],
            'Communication': ['communication', 'signal processing', 'information', 'data'],
            'Mechanical': ['mechanical', 'dynamics', 'mechanics', 'machines'],
            'Software': ['software', 'programming', 'algorithms', 'data analytics'],
            'Microsystems': ['microsystem', 'micro', 'nano', 'mems', 'microtechnology']
        };

        Object.entries(categoryKeywords).forEach(([category, keywords]) => {
            if (keywords.some(keyword => name.includes(keyword))) {
                categories.push(category);
            }
        });

        if (categories.length === 0) {
            if (name.includes('laboratory') || name.includes('lab')) {
                categories.push('Laboratory');
            } else if (name.includes('seminar')) {
                categories.push('Seminar');
            } else if (name.includes('project')) {
                categories.push('Project');
            } else if (name.includes('practical')) {
                categories.push('Practical');
            } else {
                categories.push('General Engineering');
            }
        }

        return categories;
    }

    toggleAvailability(button, availabilityList) {
        const container = button.parentElement;
        const textElement = container.querySelector('.availability-text');
        const icon = button.querySelector('i');
        
        if (textElement.dataset.expanded === 'true') {
            const maxVisible = 2;
            const visibleItems = availabilityList.slice(0, maxVisible);
            const hiddenItems = availabilityList.slice(maxVisible);
            
            let display = visibleItems.join('<br>');
            if (hiddenItems.length > 0) {
                display += `<br><em>(+${hiddenItems.length} more)</em>`;
            }
            
            textElement.innerHTML = display;
            textElement.dataset.expanded = 'false';
            icon.className = 'fas fa-chevron-down';
        } else {
            textElement.innerHTML = availabilityList.join('<br>');
            textElement.dataset.expanded = 'true';
            icon.className = 'fas fa-chevron-up';
        }
    }
}

// Modal Component
class ModalComponent {
    constructor(courseCatalog) {
        this.courseCatalog = courseCatalog;
    }

    show(pdfLink, courseName) {
        const modal = document.querySelector(CONSTANTS.SELECTORS.PDF_MODAL);
        const pdfViewer = document.querySelector(CONSTANTS.SELECTORS.PDF_VIEWER);
        const pdfTitle = document.querySelector(CONSTANTS.SELECTORS.PDF_TITLE);
        
        if (!modal || !pdfViewer || !pdfTitle) return;

        pdfTitle.textContent = courseName;
        
        const timestamp = new Date().getTime();
        let url = `./study_programs/mechatronics_master/${pdfLink}`;
        
        if (url.includes('#')) {
            const [baseUrl, anchor] = url.split('#');
            const separator = baseUrl.includes('?') ? '&' : '?';
            url = `${baseUrl}${separator}t=${timestamp}#${anchor}`;
        } else {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}t=${timestamp}`;
        }
        
        pdfViewer.src = url;
        modal.style.display = 'block';
    }
}

// Main Course Catalog Class
class CourseCatalog {
    constructor() {
        this.courses = [];
        this.filteredCourses = [];
        
        // Initialize components
        this.dataLoader = new DataLoader();
        this.favoritesManager = new FavoritesManager();
        this.searchComponent = new SearchComponent(this);
        this.filterComponent = new FilterComponent(this);
        this.courseGrid = new CourseGrid(this);
        this.modalComponent = new ModalComponent(this);
        
        this.init();
    }

    async init() {
        try {
            await this.loadCourses();
            this.setupEventListeners();
            this.filterComponent.populateFilters();
            this.filterComponent.setDefaultFilters();
            this.handleFilter(); // Apply filters after setting defaults
        } catch (error) {
            console.error('Error initializing course catalog:', error);
            Utils.showError('Failed to load courses. Please refresh the page.');
        }
    }

    async loadCourses() {
        try {
            this.courses = await this.dataLoader.loadCourses();
            this.filteredCourses = [...this.courses];
            this.filterComponent.extractFilterOptions(this.courses);
            console.log(`CourseCatalog: Total courses loaded: ${this.courses.length}`);
            
            // Debug: log custom courses
            const customCourses = this.courses.filter(c => c.isCustom);
            if (customCourses.length > 0) {
                console.log('CourseCatalog: Custom courses found:', customCourses.map(c => ({
                    name: c.Name,
                    category: c.customCategory,
                    isCustom: c.isCustom,
                    availableIn: c['Available in']
                })));
            }
        } catch (error) {
            console.error('Error loading courses:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.querySelector(CONSTANTS.SELECTORS.SEARCH_INPUT);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchComponent.debouncedSearch(e.target.value);
            });
        }

        // Filter dropdowns
        const categoryFilter = document.querySelector(CONSTANTS.SELECTORS.CATEGORY_FILTER);
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.handleFilter();
            });
        }

        const semesterFilter = document.querySelector(CONSTANTS.SELECTORS.SEMESTER_FILTER);
        if (semesterFilter) {
            semesterFilter.addEventListener('change', () => {
                this.handleFilter();
            });
        }

        const fosFilter = document.querySelector(CONSTANTS.SELECTORS.FOS_FILTER);
        if (fosFilter) {
            fosFilter.addEventListener('change', () => {
                this.handleFilter();
            });
        }

        // Favorites toggle
        const showFavoritesOnly = document.querySelector(CONSTANTS.SELECTORS.SHOW_FAVORITES_ONLY);
        if (showFavoritesOnly) {
            showFavoritesOnly.addEventListener('change', () => {
                this.handleFilter();
            });
        }

        // Hide not interested toggle
        const hideNotInterested = document.querySelector(CONSTANTS.SELECTORS.HIDE_NOT_INTERESTED);
        if (hideNotInterested) {
            hideNotInterested.addEventListener('change', () => {
                this.handleFilter();
            });
        }

        // Checkbox event listeners
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.type) {
                this.updateToggleAllButton(e.target.dataset.type);
                this.handleFilter();
            }
        });

        // PDF modal
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

    handleFilter() {
        const searchTerm = this.searchComponent.getSearchTerm();
        const showFavoritesOnly = document.querySelector(CONSTANTS.SELECTORS.SHOW_FAVORITES_ONLY);
        const hideNotInterested = document.querySelector(CONSTANTS.SELECTORS.HIDE_NOT_INTERESTED);
        
        console.log('handleFilter: Starting filter with', this.courses.length, 'total courses');
        
        this.filteredCourses = this.courses.filter(course => {
            // Check favorites filter first
            if (showFavoritesOnly && showFavoritesOnly.checked) {
                if (!this.favoritesManager.isFavorite(course.Name)) {
                    return false;
                }
            }
            
            // Check hide not interested filter
            if (hideNotInterested && hideNotInterested.checked) {
                if (this.favoritesManager.isNotInterested(course.Name)) {
                    return false;
                }
            }
            
            const matches = this.filterComponent.matchesFilters(course, searchTerm);
            
            // Debug custom courses
            if (course.isCustom && !matches) {
                console.log('Custom course filtered out:', course.Name, 'Category:', course.customCategory);
            }
            
            return matches;
        });

        console.log('handleFilter: Filtered to', this.filteredCourses.length, 'courses');
        
        this.renderCourses();
        this.updateDynamicCounts();
    }

    renderCourses() {
        this.courseGrid.render(this.filteredCourses);
    }

    updateDynamicCounts() {
        this.updateCategoryCounts();
        this.updateFosCategoryCounts();
        this.updateGeneralCounts();
    }

    updateCategoryCounts() {
        const categoryFilter = document.querySelector(CONSTANTS.SELECTORS.CATEGORY_FILTER);
        if (!categoryFilter) return;

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
        
        const currentValue = categoryFilter.value;
        const allOption = categoryFilter.querySelector('option[value=""]');
        categoryFilter.innerHTML = '';
        if (allOption) {
            categoryFilter.appendChild(allOption);
        }
        
        const sortedCategories = Object.entries(categoryCounts)
            .sort((a, b) => {
                if (b[1] !== a[1]) return b[1] - a[1];
                return a[0].localeCompare(b[0]);
            });
        
        sortedCategories.forEach(([category, count]) => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = `${category} (${count})`;
            categoryFilter.appendChild(option);
        });
        
        categoryFilter.value = currentValue;
    }

    updateFosCategoryCounts() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"][data-type="fosCategory"]');
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
            
            const countElement = checkbox.parentElement.querySelector('.count');
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }

    updateGeneralCounts() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"][data-type="general"]');
        
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
            
            const countElement = checkbox.parentElement.querySelector('.count');
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }

    toggleAll(type) {
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-type="${type}"]`);
        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = !allChecked;
        });
        
        const button = event.target.closest('.toggle-all-btn');
        const icon = button.querySelector('i');
        if (allChecked) {
            icon.className = 'fas fa-square';
        } else {
            icon.className = 'fas fa-check-square';
        }
        
        this.handleFilter();
    }

    updateToggleAllButton(type) {
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-type="${type}"]`);
        const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
        const noneChecked = Array.from(checkboxes).every(checkbox => !checkbox.checked);
        
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

    viewPDF(pdfLink, courseName) {
        this.modalComponent.show(pdfLink, courseName);
    }

    toggleAvailability(button, availabilityList) {
        this.courseGrid.toggleAvailability(button, availabilityList);
    }

    toggleFavorite(courseName, button) {
        const isFavorite = this.favoritesManager.toggleFavorite(courseName);
        
        if (isFavorite) {
            button.classList.add('starred');
            button.title = 'Remove from favorites';
        } else {
            button.classList.remove('starred');
            button.title = 'Add to favorites';
        }
        
        const showFavoritesOnly = document.querySelector(CONSTANTS.SELECTORS.SHOW_FAVORITES_ONLY);
        if (showFavoritesOnly && showFavoritesOnly.checked) {
            this.handleFilter();
        }
        
        // Update not interested button if it exists
        const card = button.closest('.course-card');
        const notIntBtn = card.querySelector('.not-interested-btn');
        if (notIntBtn && notIntBtn.classList.contains('not-interested')) {
            notIntBtn.classList.remove('not-interested');
            notIntBtn.title = 'Not interested';
            card.classList.remove('dimmed');
        }
    }

    toggleNotInterested(courseName, button) {
        const isNotInterested = this.favoritesManager.toggleNotInterested(courseName);
        
        const card = button.closest('.course-card');
        
        if (isNotInterested) {
            button.classList.add('not-interested');
            button.title = 'Mark as interested';
            card.classList.add('dimmed');
        } else {
            button.classList.remove('not-interested');
            button.title = 'Not interested';
            card.classList.remove('dimmed');
        }
        
        // Update star button if it exists
        const starBtn = card.querySelector('.star-btn');
        if (starBtn && starBtn.classList.contains('starred')) {
            starBtn.classList.remove('starred');
            starBtn.title = 'Add to favorites';
        }
    }

    // Custom course methods
    openCustomCourseModal(editCourse = null) {
        const modal = document.getElementById('customCourseModal');
        const form = document.getElementById('customCourseForm');
        const modalTitle = document.getElementById('customCourseModalTitle');
        
        if (!modal || !form) return;

        if (editCourse) {
            modalTitle.textContent = 'Edit Custom Course';
            document.getElementById('courseName').value = editCourse.Name;
            document.getElementById('courseEcts').value = parseInt(editCourse.ECTS);
            document.getElementById('courseSemester').value = editCourse.semester || '';
            document.getElementById('courseCategory').value = editCourse.customCategory || '';
            form.dataset.editCourse = editCourse.Name;
        } else {
            modalTitle.textContent = 'Add Custom Course';
            form.reset();
            delete form.dataset.editCourse;
        }

        modal.style.display = 'flex';
    }

    closeCustomCourseModal() {
        const modal = document.getElementById('customCourseModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    saveCustomCourse() {
        const form = document.getElementById('customCourseForm');
        const name = document.getElementById('courseName').value.trim();
        const ects = document.getElementById('courseEcts').value.trim();
        const semester = document.getElementById('courseSemester').value;
        const category = document.getElementById('courseCategory').value;

        if (!name || !ects || !semester || !category) {
            alert('Please fill in all fields');
            return;
        }

        const editingCourse = form.dataset.editCourse;
        
        if (editingCourse) {
            // Edit existing custom course
            const index = this.dataLoader.customCourses.findIndex(c => c.Name === editingCourse);
            if (index !== -1) {
                this.dataLoader.customCourses[index] = {
                    Name: name,
                    ECTS: `${ects} CP`,
                    semester: semester,
                    customCategory: category,
                    isCustom: true,
                    'Available in': this.getCategoryAvailability(category),
                    categories: this.getCategoryTags(category)
                };
                
                // Update in courses list
                const courseIndex = this.courses.findIndex(c => c.Name === editingCourse);
                if (courseIndex !== -1) {
                    this.courses[courseIndex] = this.dataLoader.customCourses[index];
                }
            }
        } else {
            // Check for duplicate name
            if (this.courses.some(c => c.Name === name)) {
                alert('A course with this name already exists');
                return;
            }

            // Add new custom course
            const newCourse = {
                Name: name,
                ECTS: `${ects} CP`,
                semester: semester,
                customCategory: category,
                isCustom: true,
                'Available in': this.getCategoryAvailability(category),
                categories: this.getCategoryTags(category)
            };

            console.log('Creating new custom course:', newCourse);

            this.dataLoader.customCourses.push(newCourse);
            this.courses.push(newCourse);
        }

        this.dataLoader.saveCustomCourses();
        this.handleFilter();
        this.closeCustomCourseModal();
    }

    getCategoryAvailability(category) {
        const categoryMap = {
            'thesis': [{ 
                custom: true,
                categoryType: 'thesis'
            }],
            'interdisciplinary': [{ 
                custom: true,
                categoryType: 'interdisciplinary'
            }],
            'electiveArea': [{ FoS: 'Elective Area in Mechatronics and Information Technology', subtype: 'Elective Area in Mechatronics and Information Technology' }],
            'methodical': [{ FoS: 'Field of Specialization in Mechatronics and Information Technology / Custom', subtype: 'Mandatory Electives - Methodical' }],
            'general': [{ FoS: 'Field of Specialization in Mechatronics and Information Technology / Custom', subtype: 'Mandatory Electives - General' }],
            'additive': [{ FoS: 'Field of Specialization in Mechatronics and Information Technology / Custom', subtype: 'Additive Electives' }]
        };

        return categoryMap[category] || [];
    }

    getCategoryTags(category) {
        const categoryTagMap = {
            'thesis': ['Project'],
            'interdisciplinary': ['General Engineering'],
            'electiveArea': ['General Engineering'],
            'methodical': ['Software'],
            'general': ['General Engineering'],
            'additive': ['General Engineering']
        };

        return categoryTagMap[category] || ['General Engineering'];
    }

    // Edit custom course
    editCustomCourse(courseName) {
        const course = this.dataLoader.customCourses.find(c => c.Name === courseName);
        if (course) {
            this.openCustomCourseModal(course);
        }
    }

    // Delete custom course
    deleteCustomCourse(courseName) {
        if (!confirm(`Are you sure you want to delete "${courseName}"?`)) {
            return;
        }

        // Remove from custom courses
        this.dataLoader.customCourses = this.dataLoader.customCourses.filter(c => c.Name !== courseName);
        this.courses = this.courses.filter(c => c.Name !== courseName);

        this.dataLoader.saveCustomCourses();
        this.handleFilter();
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.courseCatalog = new CourseCatalog();
});