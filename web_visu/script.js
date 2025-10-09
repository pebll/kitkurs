// Course Catalog Application
class CourseCatalog {
    constructor() {
        this.courses = [];
        this.filteredCourses = [];
        this.categories = new Set();
        this.fosOptions = new Set(); // FoS options
        this.fosCategoriesOptions = new Set(); // FoS categories options
        this.generalOptions = new Set(); // general categories options
        
        this.init();
    }

    async init() {
        try {
            await this.loadCourses();
            this.setupEventListeners();
            this.populateFilters();
            this.setDefaultFilters();
            this.renderCourses();
        } catch (error) {
            console.error('Error initializing course catalog:', error);
            this.showError('Failed to load courses. Please refresh the page.');
        }
    }

    async loadCourses() {
        try {
            // Try to load the new format first
            const response = await fetch('./courses_v2_with_categories.json');
            if (!response.ok) {
                throw new Error('Failed to fetch courses v2');
            }
            this.courses = await response.json();
            this.filteredCourses = [...this.courses];
            this.extractFilterOptions();
            console.log('Loaded courses_v2_with_categories.json');
        } catch (error) {
            console.error('Error loading courses v2:', error);
            // Fallback: try to load the original format
            try {
                const response = await fetch('./courses_v1.json');
                if (!response.ok) {
                    throw new Error('Failed to fetch courses v1');
                }
                this.courses = await response.json();
                this.filteredCourses = [...this.courses];
                this.extractFilterOptions();
                console.log('Loaded courses_v1.json as fallback');
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                throw error;
            }
        }
    }

    extractFilterOptions() {
        this.courses.forEach(course => {
            // Handle categories - use pre-computed categories if available, otherwise extract them
            if (course.categories && Array.isArray(course.categories)) {
                // New format: categories are already provided
                course.categories.forEach(cat => this.categories.add(cat));
            } else {
                // Old format: extract categories from course names
                const categories = this.extractCategories(course.Name);
                categories.forEach(cat => this.categories.add(cat));
            }
            
            
            // Extract availability options - handle both old and new formats
            if (Array.isArray(course['Available in'])) {
                // New format: Available in is an array of objects
                course['Available in'].forEach(avail => {
                    if (avail.FoS && !avail.FoS.includes('Elective Area')) {
                        this.fosOptions.add(avail.FoS);
                    }
                    if (avail.subtype && avail.subtype !== 'Elective Area in Mechatronics and Information Technology') {
                        this.fosCategoriesOptions.add(avail.subtype);
                    }
                });
            } else if (course['Available in'] && course['Available in'].trim()) {
                // Old format: Available in is a string - treat as general category
                const availability = course['Available in'].split(',').map(a => a.trim());
                availability.forEach(av => {
                    this.generalOptions.add(av);
                });
            }
        });
        
        // Add predefined general categories
        this.generalOptions.add('Master\'s Thesis (30 CP)');
        this.generalOptions.add('Interdisciplinary Qualifications (8 CP)');
        this.generalOptions.add('Elective Area (22 CP)');
    }

    extractCategories(courseName) {
        const categories = [];
        const name = courseName.toLowerCase();
        
        // Define category keywords
        const categoryKeywords = {
            'Artificial Intelligence': ['artificial intelligence', 'ai', 'machine learning', 'deep learning', 'neural networks', 'computational intelligence'],
            'Robotics': ['robotics', 'robot', 'humanoid', 'mobile robotics', 'automation'],
            'Energy': ['energy', 'power', 'solar', 'renewable', 'battery', 'fuel cell', 'nuclear', 'fusion'],
            'Automotive': ['automotive', 'vehicle', 'automobile', 'driving', 'powertrain', 'transmission'],
            'Electronics': ['electronics', 'circuit', 'digital', 'analog', 'hardware', 'microelectronics'],
            'Control Systems': ['control', 'automation', 'feedback', 'regulation'],
            'Materials': ['materials', 'materials', 'polymers', 'nanomaterials', 'lightweight'],
            'Manufacturing': ['manufacturing', 'production', 'logistics', 'supply chain'],
            'Optics': ['optics', 'optical', 'photonics', 'laser', 'lighting'],
            'Biomedical': ['biomedical', 'bio', 'medical', 'physiological', 'bionics'],
            'Communication': ['communication', 'signal processing', 'information', 'data'],
            'Mechanical': ['mechanical', 'dynamics', 'mechanics', 'machines', 'turbomachines'],
            'Software': ['software', 'programming', 'algorithms', 'data analytics'],
            'Microsystems': ['microsystem', 'micro', 'nano', 'mems', 'microtechnology']
        };

        // Check for category matches
        Object.entries(categoryKeywords).forEach(([category, keywords]) => {
            if (keywords.some(keyword => name.includes(keyword))) {
                categories.push(category);
            }
        });

        // If no specific category found, try to infer from common terms
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

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Filter dropdowns
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.handleFilter();
        });


        document.getElementById('fosFilter').addEventListener('change', (e) => {
            this.handleFilter();
        });

        // Checkbox event listeners - use event delegation
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.type) {
                this.updateToggleAllButton(e.target.dataset.type);
                this.handleFilter();
            }
        });


        // PDF modal
        const modal = document.getElementById('pdfModal');
        const closeBtn = document.getElementById('closePdfModal');
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    populateFilters() {
        // Populate category filter
        const categoryFilter = document.getElementById('categoryFilter');
        const sortedCategories = Array.from(this.categories).sort();
        sortedCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });

        // Populate FoS dropdown
        this.populateFosDropdown();
        
        // Populate FoS categories checkboxes
        this.populateCheckboxes('fosCategoriesCheckboxes', this.fosCategoriesOptions, 'fosCategory');
        
        // Populate general checkboxes
        this.populateCheckboxes('generalCheckboxes', this.generalOptions, 'general');
    }
    
    setDefaultFilters() {
        // Set Industrial Informatics as default FoS
        const fosFilter = document.getElementById('fosFilter');
        const industrialInformaticsOption = Array.from(fosFilter.options).find(option => 
            option.value.includes('Industrial Informatics and Systems Engineering')
        );
        if (industrialInformaticsOption) {
            fosFilter.value = industrialInformaticsOption.value;
        }
        
        // Select all FoS Course Types by default
        document.querySelectorAll('input[type="checkbox"][data-type="fosCategory"]').forEach(checkbox => {
            checkbox.checked = true;
        });
        
        // Select all Program Components by default
        document.querySelectorAll('input[type="checkbox"][data-type="general"]').forEach(checkbox => {
            checkbox.checked = true;
        });
        
        // Apply the default filters
        this.handleFilter();
        this.updateDynamicCounts();
    }
    
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
    
    populateFosDropdown() {
        const fosFilter = document.getElementById('fosFilter');
        
        // Sort FoS options by name
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
    
    populateCheckboxes(containerId, optionsSet, type) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        // Sort options by name
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

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.handleFilter();
    }

    handleFilter() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const fosFilter = document.getElementById('fosFilter').value;
        const selectedFosCategories = this.getSelectedCheckboxes('fosCategory');
        const selectedGeneral = this.getSelectedCheckboxes('general');

        this.filteredCourses = this.courses.filter(course => {
            // 1. Search filter
            if (this.searchTerm && !course.Name.toLowerCase().includes(this.searchTerm)) {
                return false;
            }

            // 2. Category filter
            if (categoryFilter) {
                let courseCategories;
                if (course.categories && Array.isArray(course.categories)) {
                    courseCategories = course.categories;
                } else {
                    courseCategories = this.extractCategories(course.Name);
                }
                if (!courseCategories.includes(categoryFilter)) {
                    return false;
                }
            }

            // 3. FoS filter (excludes Elective Area since it's independent)
            if (fosFilter) {
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
                            avail.FoS && avail.FoS === fosFilter && !avail.FoS.includes('Elective Area')
                        );
                    }
                    if (!matchesFos) {
                        return false;
                    }
                }
                // Elective Area courses always pass the FoS filter (they're independent)
            }

            // 4. Course type filters (FoS categories + Program components)
            // A course is shown if it matches AT LEAST ONE selected course type
            let matchesAnyCourseType = false;

            // Check FoS categories (only apply to courses that match the selected FoS)
            if (selectedFosCategories.length > 0) {
                if (Array.isArray(course['Available in'])) {
                    const matchesFosCategory = course['Available in'].some(avail => {
                        // Check if this availability entry matches the selected FoS (if any)
                        const fosMatches = !fosFilter || (avail.FoS && avail.FoS === fosFilter);
                        
                        // Check if this availability entry matches the selected course type
                        const categoryMatches = selectedFosCategories.some(category => 
                            avail.subtype && avail.subtype.includes(category)
                        );
                        
                        // Both FoS and category must match
                        return fosMatches && categoryMatches;
                    });
                    if (matchesFosCategory) {
                        matchesAnyCourseType = true;
                    }
                }
            }

            // Check Program components (these are independent of FoS)
            if (selectedGeneral.length > 0) {
                const matchesGeneral = selectedGeneral.some(general => {
                    if (general.includes('Master\'s Thesis') && course.Name === 'Master\'s Thesis') {
                        return true;
                    }
                    if (general.includes('Interdisciplinary Qualifications') && course.Name === 'Interdisciplinary Qualifications') {
                        return true;
                    }
                    if (general.includes('Elective Area') && Array.isArray(course['Available in'])) {
                        // Elective Area is independent of FoS - check if course is available in Elective Area
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
            // If course types are selected, only show courses that match at least one
            if (selectedFosCategories.length > 0 || selectedGeneral.length > 0) {
                return matchesAnyCourseType;
            }

            // No course types selected = show no courses
            return false;
        });

        this.renderCourses();
        this.updateDynamicCounts();
    }
    
    updateDynamicCounts() {
        // Update dropdown counts
        this.updateCategoryCounts();
        
        // Update checkbox counts
        this.updateFosCategoryCounts();
        this.updateGeneralCounts();
    }

    updateCategoryCounts() {
        const categoryFilter = document.getElementById('categoryFilter');
        
        // Temporarily disable change event
        const originalHandler = categoryFilter.onchange;
        categoryFilter.onchange = null;
        
        // Count each category from filtered courses
        const categoryCounts = {};
        this.filteredCourses.forEach(course => {
            let courseCategories;
            if (course.categories && Array.isArray(course.categories)) {
                courseCategories = course.categories;
            } else {
                courseCategories = this.extractCategories(course.Name);
            }
            
            courseCategories.forEach(category => {
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            });
        });
        
        // Update dropdown options
        Array.from(categoryFilter.options).forEach(option => {
            if (option.value && categoryCounts[option.value]) {
                option.textContent = `${option.value} (${categoryCounts[option.value]})`;
            } else if (option.value) {
                option.textContent = `${option.value} (0)`;
            }
        });
        
        // Restore change event
        categoryFilter.onchange = originalHandler;
    }


    updateFosCategoryCounts() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"][data-type="fosCategory"]');
        const fosFilter = document.getElementById('fosFilter').value;
        
        checkboxes.forEach(checkbox => {
            const category = checkbox.value;
            let count = 0;
            
            this.filteredCourses.forEach(course => {
                if (Array.isArray(course['Available in'])) {
                    const hasCategory = course['Available in'].some(avail => {
                        const fosMatches = !fosFilter || (avail.FoS && avail.FoS === fosFilter);
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
            
            // Update the count display
            const countElement = checkbox.parentElement.querySelector('.count');
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }
    
    
    
    
    courseMatchesCurrentFilters(course, excludeFosFilter = false) {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const fosFilter = document.getElementById('fosFilter').value;
        
        // Search filter
        if (this.searchTerm && !course.Name.toLowerCase().includes(this.searchTerm)) {
            return false;
        }
        
        // Category filter
        if (categoryFilter) {
            let courseCategories;
            if (course.categories && Array.isArray(course.categories)) {
                courseCategories = course.categories;
            } else {
                courseCategories = this.extractCategories(course.Name);
            }
            if (!courseCategories.includes(categoryFilter)) {
                return false;
            }
        }
        
        // FoS filter (only if not excluding it)
        // For Elective Area courses, ignore FoS filter since they're independent
        if (!excludeFosFilter && fosFilter) {
            let matchesFos = false;
            if (Array.isArray(course['Available in'])) {
                // Check if this is an Elective Area course
                const isElectiveAreaCourse = course['Available in'].some(avail => 
                    avail.FoS && avail.FoS.includes('Elective Area')
                );
                
                if (isElectiveAreaCourse) {
                    // Elective Area courses are independent of FoS selection
                    matchesFos = true;
                } else {
                    // Regular FoS courses must match the selected FoS
                    matchesFos = course['Available in'].some(avail => 
                        avail.FoS && avail.FoS === fosFilter && !avail.FoS.includes('Elective Area')
                    );
                }
            }
            if (!matchesFos) {
                return false;
            }
        }
        
        return true;
    }
    
    getSelectedCheckboxes(type) {
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-type="${type}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }


    renderCourses() {
        const coursesGrid = document.getElementById('coursesGrid');
        const resultsCount = document.getElementById('resultsCount');
        const noResults = document.getElementById('noResults');

        // Update results count
        resultsCount.textContent = `${this.filteredCourses.length} course${this.filteredCourses.length !== 1 ? 's' : ''} found`;

        // Show/hide no results message
        if (this.filteredCourses.length === 0) {
            coursesGrid.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }

        coursesGrid.style.display = 'grid';
        noResults.style.display = 'none';

        // Render course cards
        coursesGrid.innerHTML = this.filteredCourses.map(course => this.createCourseCard(course)).join('');
    }

    createCourseCard(course) {
        // Handle categories - use pre-computed or extract
        let categories;
        if (course.categories && Array.isArray(course.categories)) {
            categories = course.categories;
        } else {
            categories = this.extractCategories(course.Name);
        }
        
        // Handle availability - create a comprehensive list
        let availabilityList = [];
        
        if (Array.isArray(course['Available in'])) {
            // New format: organize by FoS and subtypes
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
            
            // Create organized availability list with clear subtype names
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
            
            // Add Elective Area as separate item if present
            if (hasElectiveArea) {
                availabilityList.push('<strong>Elective Area</strong>');
            }
        } else if (course['Available in'] && course['Available in'].trim()) {
            // Old format
            availabilityList = [course['Available in']];
        }
        
        // Create availability display - show first few items, then dropdown for more
        const maxVisible = 2;
        const visibleItems = availabilityList.slice(0, maxVisible);
        const hiddenItems = availabilityList.slice(maxVisible);
        
        let availabilityDisplay = visibleItems.join('<br>');
        if (hiddenItems.length > 0) {
            availabilityDisplay += `<br><em>(+${hiddenItems.length} more)</em>`;
        }
        
        return `
            <div class="course-card">
                <h3 class="course-title">${course.Name}</h3>
                
                <div class="course-details">
                    <div class="detail-item">
                        <i class="fas fa-certificate"></i>
                        <span class="detail-label">ECTS:</span>
                        <span class="detail-value">${course.ECTS}</span>
                    </div>
                    
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
                
                <button class="view-pdf-btn" onclick="courseCatalog.viewPDF('${course.pdf_link}', '${course.Name}')">
                    <i class="fas fa-file-pdf"></i>
                    View Course Details
                </button>
            </div>
        `;
    }

    toggleAvailability(button, availabilityList) {
        const container = button.parentElement;
        const textElement = container.querySelector('.availability-text');
        const icon = button.querySelector('i');
        
        if (textElement.dataset.expanded === 'true') {
            // Collapse - show only first 2 items
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
            // Expand - show all items
            textElement.innerHTML = availabilityList.join('<br>');
            textElement.dataset.expanded = 'true';
            icon.className = 'fas fa-chevron-up';
        }
    }

    viewPDF(pdfLink, courseName) {
        const modal = document.getElementById('pdfModal');
        const pdfViewer = document.getElementById('pdfViewer');
        const pdfTitle = document.getElementById('pdfTitle');
        
        pdfTitle.textContent = courseName;
        
        // Force iframe to reload by adding a timestamp parameter
        // But preserve the page anchor (#page=XX) by adding timestamp before the anchor
        const timestamp = new Date().getTime();
        let url = `./${pdfLink}`;
        
        if (url.includes('#')) {
            // If there's a page anchor, add timestamp before it
            const [baseUrl, anchor] = url.split('#');
            const separator = baseUrl.includes('?') ? '&' : '?';
            url = `${baseUrl}${separator}t=${timestamp}#${anchor}`;
        } else {
            // No anchor, add timestamp at the end
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}t=${timestamp}`;
        }
        
        pdfViewer.src = url;
        modal.style.display = 'block';
    }

    showError(message) {
        const coursesGrid = document.getElementById('coursesGrid');
        coursesGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.courseCatalog = new CourseCatalog();
});

// Add some utility functions for better user experience
document.addEventListener('keydown', (e) => {
    // Close modal with Escape key
    if (e.key === 'Escape') {
        const modal = document.getElementById('pdfModal');
        if (modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    }
});

// Add loading state management
function showLoading() {
    const coursesGrid = document.getElementById('coursesGrid');
    coursesGrid.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
        </div>
    `;
}

// Add smooth scrolling for better UX
function smoothScrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});