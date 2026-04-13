// Course Planner Application

// Constants
const PLANNER_CONSTANTS = {
    STORAGE_KEYS: {
        FAVORITES: 'kitkurs_favorites',
        SEMESTER_PLAN: 'kitkurs_semester_plan',
        SEMESTER_COUNT: 'kitkurs_semester_count',
        CUSTOM_COURSES: 'kitkurs_custom_courses',
        FOS_SPECIALIZATION: 'kitkurs_fos_specialization'
    },
    DEFAULT_SEMESTERS: 4,
    TOTAL_REQUIRED_ECTS: 120
};

// Planner Class
class CoursePlanner {
    constructor() {
        this.courses = [];
        this.allCourses = [];
        this.customCourses = this.loadCustomCourses();
        this.favorites = this.loadFavorites();
        this.semesterPlan = this.loadSemesterPlan();
        this.semesterCount = this.loadSemesterCount();
        this.fosSpecialization = this.loadFosSpecialization();
        this.currentFilter = 'all';
        
        this.init();
    }

    async init() {
        try {
            await this.loadCourses();
            this.initializeFosSelection();
            this.renderSemesters();
            this.filterCourses('all');
            this.updateProgress();
            this.setupDragAndDrop();
        } catch (error) {
            console.error('Error initializing planner:', error);
            this.showError('Failed to load courses. Please refresh the page.');
        }
    }

    // Load courses from JSON
    async loadCourses() {
        try {
            const response = await fetch('./study_programs/mechatronics_master/courses.json');
            if (!response.ok) {
                throw new Error('Failed to fetch courses');
            }
            const fetchedCourses = await response.json();
            
            // Merge custom courses with fetched courses
            this.allCourses = [...fetchedCourses, ...this.customCourses];
            this.courses = [...this.allCourses];
            console.log(`Loaded ${fetchedCourses.length} courses + ${this.customCourses.length} custom courses`);
        } catch (error) {
            console.error('Error loading courses:', error);
            throw error;
        }
    }

    // LocalStorage: Load favorites
    loadFavorites() {
        try {
            const stored = localStorage.getItem(PLANNER_CONSTANTS.STORAGE_KEYS.FAVORITES);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading favorites:', error);
            return [];
        }
    }

    // LocalStorage: Load semester plan
    loadSemesterPlan() {
        try {
            const stored = localStorage.getItem(PLANNER_CONSTANTS.STORAGE_KEYS.SEMESTER_PLAN);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading semester plan:', error);
            return {};
        }
    }

    // LocalStorage: Load semester count
    loadSemesterCount() {
        try {
            const stored = localStorage.getItem(PLANNER_CONSTANTS.STORAGE_KEYS.SEMESTER_COUNT);
            return stored ? parseInt(stored) : PLANNER_CONSTANTS.DEFAULT_SEMESTERS;
        } catch (error) {
            console.error('Error loading semester count:', error);
            return PLANNER_CONSTANTS.DEFAULT_SEMESTERS;
        }
    }

    // LocalStorage: Load custom courses
    loadCustomCourses() {
        try {
            const stored = localStorage.getItem(PLANNER_CONSTANTS.STORAGE_KEYS.CUSTOM_COURSES);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading custom courses:', error);
            return [];
        }
    }

    // LocalStorage: Save custom courses
    saveCustomCourses() {
        try {
            localStorage.setItem(PLANNER_CONSTANTS.STORAGE_KEYS.CUSTOM_COURSES, JSON.stringify(this.customCourses));
        } catch (error) {
            console.error('Error saving custom courses:', error);
        }
    }

    // LocalStorage: Load FoS specialization
    loadFosSpecialization() {
        try {
            const stored = localStorage.getItem(PLANNER_CONSTANTS.STORAGE_KEYS.FOS_SPECIALIZATION);
            return stored || '';
        } catch (error) {
            console.error('Error loading FoS specialization:', error);
            return '';
        }
    }

    // LocalStorage: Save FoS specialization
    saveFosSpecialization() {
        try {
            localStorage.setItem(PLANNER_CONSTANTS.STORAGE_KEYS.FOS_SPECIALIZATION, this.fosSpecialization);
        } catch (error) {
            console.error('Error saving FoS specialization:', error);
        }
    }

    // Initialize FoS selection dropdown
    initializeFosSelection() {
        const fosSelect = document.getElementById('fosSpecialization');
        if (fosSelect && this.fosSpecialization) {
            fosSelect.value = this.fosSpecialization;
        }
    }

    // Set FoS specialization
    setFosSpecialization(fos) {
        this.fosSpecialization = fos;
        this.saveFosSpecialization();
        this.updateProgress();
        
        // Show message if FoS selected
        if (fos) {
            console.log(`Selected FoS: ${fos}`);
        }
    }

    // LocalStorage: Save semester plan
    saveSemesterPlan() {
        try {
            localStorage.setItem(PLANNER_CONSTANTS.STORAGE_KEYS.SEMESTER_PLAN, JSON.stringify(this.semesterPlan));
        } catch (error) {
            console.error('Error saving semester plan:', error);
        }
    }

    // LocalStorage: Save semester count
    saveSemesterCount() {
        try {
            localStorage.setItem(PLANNER_CONSTANTS.STORAGE_KEYS.SEMESTER_COUNT, this.semesterCount.toString());
        } catch (error) {
            console.error('Error saving semester count:', error);
        }
    }

    // Filter courses in sidebar
    filterCourses(filterType) {
        if (filterType) {
            this.currentFilter = filterType;
            
            // Update active button
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.filter === filterType) {
                    btn.classList.add('active');
                }
            });
        }

        const searchTerm = document.getElementById('sidebarSearch')?.value.toLowerCase() || '';
        const semesterFilter = document.getElementById('sidebarSemesterFilter')?.value || '';

        // Get all courses currently in semesters
        const plannedCourses = new Set();
        Object.values(this.semesterPlan).forEach(semester => {
            semester.forEach(course => plannedCourses.add(course.Name));
        });

        this.courses = this.allCourses.filter(course => {
            // Skip courses already in semesters
            if (plannedCourses.has(course.Name)) {
                return false;
            }

            // Filter by favorites
            if (this.currentFilter === 'favorites') {
                if (!this.favorites.includes(course.Name)) {
                    return false;
                }
            }

            // Filter by search term
            if (searchTerm && !course.Name.toLowerCase().includes(searchTerm)) {
                return false;
            }

            // Filter by semester
            if (semesterFilter) {
                if (semesterFilter === 'WS' && course.semester !== 'WS' && course.semester !== 'WS/SS') {
                    return false;
                }
                if (semesterFilter === 'SS' && course.semester !== 'SS' && course.semester !== 'WS/SS') {
                    return false;
                }
                if ((semesterFilter === 'WS/SS' || semesterFilter === 'Irregular') && course.semester !== semesterFilter) {
                    return false;
                }
            }

            return true;
        });

        this.renderCourseList();
    }

    // Render course list in sidebar
    renderCourseList() {
        const courseList = document.getElementById('courseList');
        if (!courseList) return;

        if (this.courses.length === 0) {
            courseList.innerHTML = `
                <div class="info-text" style="padding: var(--spacing-xl); text-align: center;">
                    <i class="fas fa-info-circle"></i><br>
                    No courses available
                </div>
            `;
            return;
        }

        courseList.innerHTML = this.courses.map(course => {
            const isFavorite = this.favorites.includes(course.Name);
            const isCustom = course.isCustom || false;
            return `
                <div class="course-item ${isCustom ? 'custom-course' : ''}" draggable="true" data-course-name="${course.Name}">
                    <div class="course-item-header">
                        <div class="course-item-title">
                            ${isFavorite ? '<i class="fas fa-star" style="color: #FFD700; margin-right: 4px;"></i>' : ''}
                            ${isCustom ? '<span class="custom-badge">Custom</span>' : ''}
                            ${course.Name}
                        </div>
                        <div class="course-item-ects">${course.ECTS}</div>
                    </div>
                    <div class="course-item-semester">
                        <i class="fas fa-calendar-alt"></i> ${course.semester || 'N/A'}
                    </div>
                </div>
            `;
        }).join('');

        // Re-attach drag listeners to new elements
        this.attachSidebarDragListeners();
    }

    // Render semester columns
    renderSemesters() {
        const container = document.getElementById('semestersContainer');
        if (!container) return;

        container.innerHTML = '';

        for (let i = 1; i <= this.semesterCount; i++) {
            const semesterId = `semester${i}`;
            const semesterCourses = this.semesterPlan[semesterId] || [];
            const totalEcts = this.calculateSemesterEcts(semesterCourses);

            const semesterColumn = document.createElement('div');
            semesterColumn.className = 'semester-column';
            semesterColumn.innerHTML = `
                <div class="semester-header">
                    <div style="display: flex; align-items: center; gap: var(--spacing-md);">
                        <div class="semester-title">Semester ${i}</div>
                        <div class="semester-ects">${totalEcts} CP</div>
                    </div>
                    <div class="semester-actions">
                        <button class="semester-action-btn" onclick="planner.removeSemester(${i})" title="Remove semester">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="semester-courses ${semesterCourses.length === 0 ? 'empty' : ''}" 
                     data-semester-id="${semesterId}" 
                     id="${semesterId}">
                    ${semesterCourses.length === 0 ? 
                        '<span class="empty-message"><i class="fas fa-hand-pointer"></i><br>Drag courses here</span>' : 
                        this.renderSemesterCourses(semesterCourses)
                    }
                </div>
            `;

            container.appendChild(semesterColumn);
        }

        // Re-attach drag listeners
        this.attachSemesterDragListeners();
    }

    // Render courses in a semester
    renderSemesterCourses(courses) {
        return courses.map(course => {
            const escapedName = course.Name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const isCustom = course.isCustom || false;
            return `
                <div class="semester-course-card ${isCustom ? 'custom-course' : ''}" draggable="true" data-course-name="${course.Name}">
                    <div class="course-item-header">
                        <div class="course-item-title">
                            ${isCustom ? '<span class="custom-badge">Custom</span>' : ''}
                            ${course.Name}
                        </div>
                        <div class="course-item-ects">${course.ECTS}</div>
                    </div>
                    <div class="course-item-semester">
                        <i class="fas fa-calendar-alt"></i> ${course.semester || 'N/A'}
                    </div>
                    <button class="remove-course-btn" onclick="planner.removeCourseFromSemester('${escapedName}')" title="Remove course">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
    }

    // Calculate total ECTS for a semester
    calculateSemesterEcts(courses) {
        return courses.reduce((total, course) => {
            const ects = parseInt(course.ECTS) || 0;
            return total + ects;
        }, 0);
    }

    // Calculate total ECTS across all semesters
    calculateTotalEcts() {
        let total = 0;
        Object.values(this.semesterPlan).forEach(semester => {
            total += this.calculateSemesterEcts(semester);
        });
        return total;
    }

    // Update progress display
    updateProgress() {
        const totalEcts = this.calculateTotalEcts();
        const requiredEcts = PLANNER_CONSTANTS.TOTAL_REQUIRED_ECTS;
        const percentage = Math.min((totalEcts / requiredEcts) * 100, 100);

        const totalEctsElement = document.getElementById('totalEcts');
        const totalProgressElement = document.getElementById('totalProgress');

        if (totalEctsElement) {
            totalEctsElement.textContent = totalEcts;
        }

        if (totalProgressElement) {
            totalProgressElement.style.width = `${percentage}%`;
            
            // Color based on progress
            if (percentage < 33) {
                totalProgressElement.style.background = 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)';
            } else if (percentage < 66) {
                totalProgressElement.style.background = 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)';
            } else {
                totalProgressElement.style.background = 'var(--secondary-gradient)';
            }
        }

        this.updateCategoryProgress();
    }

    // Calculate category progress
    updateCategoryProgress() {
        const categories = this.calculateCategoryEcts();
        const categoryProgressElement = document.getElementById('categoryProgress');
        
        if (!categoryProgressElement) return;

        const requirements = {
            'thesis': { label: 'Master\'s Thesis', required: 30, icon: 'fa-graduation-cap' },
            'electiveArea': { label: 'Elective Area', required: 22, icon: 'fa-tasks' },
            'general': { label: 'FoS - General', required: 18, icon: 'fa-book' },
            'additive': { label: 'FoS - Additive', required: 24, icon: 'fa-plus-circle' },
            'methodical': { label: 'FoS - Methodical', required: 18, icon: 'fa-cogs' },
            'interdisciplinary': { label: 'Interdisciplinary', required: 8, icon: 'fa-puzzle-piece' }
        };

        let html = '<h3>Category Requirements</h3>';

        // Show warning if no FoS selected
        if (!this.fosSpecialization) {
            html += `
                <div class="fos-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>Please select your Field of Specialization above to accurately track FoS category progress.</span>
                </div>
            `;
        }

        // Calculate overall completion
        let totalRequired = 0;
        let totalCurrent = 0;
        let completedCount = 0;
        const totalCategories = Object.keys(requirements).length;

        for (const [key, req] of Object.entries(requirements)) {
            const current = categories[key] || 0;
            totalRequired += req.required;
            totalCurrent += Math.min(current, req.required);
            if (current >= req.required) completedCount++;
        }

        // Add summary
        html += `
            <div class="category-summary">
                <div class="summary-item">
                    <i class="fas fa-check-circle"></i>
                    <span>${completedCount}/${totalCategories} categories complete</span>
                </div>
            </div>
        `;

        for (const [key, req] of Object.entries(requirements)) {
            const current = categories[key] || 0;
            const percentage = Math.min((current / req.required) * 100, 100);
            const isComplete = current >= req.required;
            const statusClass = isComplete ? 'complete' : (percentage > 0 ? 'in-progress' : 'not-started');
            
            // Color based on percentage
            let barColor;
            if (percentage === 0) {
                barColor = 'rgba(255, 255, 255, 0.1)';
            } else if (percentage < 50) {
                barColor = 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)';
            } else if (percentage < 100) {
                barColor = 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)';
            } else {
                barColor = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            }

            // Status icon
            let statusIcon = '';
            if (isComplete) {
                statusIcon = '<i class="fas fa-check-circle status-icon complete-icon"></i>';
            } else if (percentage > 0) {
                statusIcon = '<i class="fas fa-clock status-icon progress-icon"></i>';
            } else {
                statusIcon = '<i class="fas fa-circle status-icon not-started-icon"></i>';
            }

            html += `
                <div class="category-item ${statusClass}">
                    <div class="category-header">
                        <div class="category-label">
                            <i class="fas ${req.icon}"></i>
                            <span>${req.label}</span>
                        </div>
                        <div class="category-values">
                            ${statusIcon}
                            <span class="current-value">${current}</span>
                            <span class="separator">/</span>
                            <span class="required-value">${req.required}</span>
                            <span class="unit">CP</span>
                        </div>
                    </div>
                    <div class="category-progress-bar">
                        <div class="category-progress-fill" style="width: ${percentage}%; background: ${barColor};"></div>
                    </div>
                    ${current > req.required ? `
                        <div class="category-note">
                            <i class="fas fa-info-circle"></i>
                            +${current - req.required} CP extra
                        </div>
                    ` : current < req.required && current > 0 ? `
                        <div class="category-note">
                            <i class="fas fa-exclamation-circle"></i>
                            ${req.required - current} CP remaining
                        </div>
                    ` : ''}
                </div>
            `;
        }

        categoryProgressElement.innerHTML = html;
    }

    // Calculate ECTS by category
    calculateCategoryEcts() {
        const categories = {
            thesis: 0,
            interdisciplinary: 0,
            electiveArea: 0,
            methodical: 0,
            general: 0,
            additive: 0
        };

        // Get all courses from all semesters
        const allPlannedCourses = [];
        Object.values(this.semesterPlan).forEach(semester => {
            allPlannedCourses.push(...semester);
        });

        // Build the full FoS string for matching
        const selectedFosFullName = this.fosSpecialization ? 
            `Field of Specialization in Mechatronics and Information Technology / ${this.fosSpecialization}` : 
            '';

        allPlannedCourses.forEach(course => {
            const ects = parseInt(course.ECTS) || 0;

            // Check by category using centralized logic
            // Priority 1: Master's Thesis
            if (this.isThesisCourse(course)) {
                categories.thesis += ects;
                return;
            }

            // Priority 2: Interdisciplinary
            if (this.isInterdisciplinaryCourse(course)) {
                categories.interdisciplinary += ects;
                return;
            }

            // Priority 3-5: FoS categories (only if matches selected FoS)
            // Only count toward FoS categories if the course matches the selected FoS
            const matchesFos = !this.fosSpecialization || 
                               (course.isCustom && ['methodical', 'general', 'additive'].includes(course.customCategory)) ||
                               (Array.isArray(course['Available in']) && course['Available in'].some(avail => 
                                   avail.FoS && avail.FoS === selectedFosFullName
                               ));

            if (matchesFos) {
                let categorized = false;

                // Priority 3: FoS - Methodical (most restrictive)
                if (!categorized && this.isFosMethodicalCourse(course, selectedFosFullName)) {
                    categories.methodical += ects;
                    categorized = true;
                }

                // Priority 4: FoS - General
                if (!categorized && this.isFosGeneralCourse(course, selectedFosFullName)) {
                    categories.general += ects;
                    categorized = true;
                }

                // Priority 5: FoS - Additive
                if (!categorized && this.isFosAdditiveCourse(course, selectedFosFullName)) {
                    categories.additive += ects;
                    categorized = true;
                }

                if (categorized) return;
            }

            // Priority 6: Elective Area (least restrictive, most flexible)
            // Counts regardless of FoS match
            if (this.isElectiveAreaCourse(course)) {
                categories.electiveArea += ects;
            }
        });

        return categories;
    }

    // Helper functions for course categorization
    isThesisCourse(course) {
        return course.Name === 'Master\'s Thesis' || 
               (course.isCustom && course.customCategory === 'thesis');
    }

    isInterdisciplinaryCourse(course) {
        return course.Name === 'Interdisciplinary Qualifications' || 
               (course.isCustom && course.customCategory === 'interdisciplinary');
    }

    isElectiveAreaCourse(course) {
        if (course.isCustom && course.customCategory === 'electiveArea') return true;
        return Array.isArray(course['Available in']) && 
               course['Available in'].some(avail => 
                   avail.FoS && avail.FoS.includes('Elective Area')
               );
    }

    isFosMethodicalCourse(course, fosFullName) {
        if (course.isCustom && course.customCategory === 'methodical') return true;
        if (!Array.isArray(course['Available in'])) return false;
        return course['Available in'].some(avail => {
            if (!avail.subtype || !avail.subtype.includes('Mandatory Electives - Methodical')) return false;
            if (fosFullName && avail.FoS) {
                return avail.FoS === fosFullName || avail.FoS.includes('Custom');
            }
            return true;
        });
    }

    isFosGeneralCourse(course, fosFullName) {
        if (course.isCustom && course.customCategory === 'general') return true;
        if (!Array.isArray(course['Available in'])) return false;
        return course['Available in'].some(avail => {
            if (!avail.subtype || !avail.subtype.includes('Mandatory Electives - General')) return false;
            if (fosFullName && avail.FoS) {
                return avail.FoS === fosFullName || avail.FoS.includes('Custom');
            }
            return true;
        });
    }

    isFosAdditiveCourse(course, fosFullName) {
        if (course.isCustom && course.customCategory === 'additive') return true;
        if (!Array.isArray(course['Available in'])) return false;
        return course['Available in'].some(avail => {
            if (!avail.subtype || !avail.subtype.includes('Additive Electives')) return false;
            if (fosFullName && avail.FoS) {
                return avail.FoS === fosFullName || avail.FoS.includes('Custom');
            }
            return true;
        });
    }

    // Add a new semester
    addSemester() {
        this.semesterCount++;
        this.saveSemesterCount();
        this.renderSemesters();
    }

    // Remove a semester
    removeSemester(semesterNum) {
        const semesterId = `semester${semesterNum}`;
        
        // Return courses to available list
        if (this.semesterPlan[semesterId]) {
            delete this.semesterPlan[semesterId];
        }

        // Reorganize semesters
        const newPlan = {};
        let newNum = 1;
        for (let i = 1; i <= this.semesterCount; i++) {
            const oldId = `semester${i}`;
            if (oldId !== semesterId && this.semesterPlan[oldId]) {
                newPlan[`semester${newNum}`] = this.semesterPlan[oldId];
                newNum++;
            } else if (oldId !== semesterId) {
                newNum++;
            }
        }

        this.semesterCount--;
        this.semesterPlan = newPlan;
        
        this.saveSemesterPlan();
        this.saveSemesterCount();
        this.renderSemesters();
        this.filterCourses();
        this.updateProgress();
    }

    // Clear all semesters
    clearAllSemesters() {
        if (!confirm('Are you sure you want to clear all semesters? This cannot be undone.')) {
            return;
        }

        this.semesterPlan = {};
        this.saveSemesterPlan();
        this.renderSemesters();
        this.filterCourses();
        this.updateProgress();
    }

    // Export plan as JSON
    exportPlan() {
        const planData = {
            semesterPlan: this.semesterPlan,
            semesterCount: this.semesterCount,
            fosSpecialization: this.fosSpecialization,
            customCourses: this.customCourses,
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(planData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `course-plan-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Import plan from JSON
    importPlan() {
        const input = document.getElementById('importFileInput');
        if (!input) return;

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const planData = JSON.parse(event.target.result);
                    
                    if (planData.semesterPlan && planData.semesterCount) {
                        this.semesterPlan = planData.semesterPlan;
                        this.semesterCount = planData.semesterCount;
                        
                        // Import FoS specialization if present
                        if (planData.fosSpecialization) {
                            this.fosSpecialization = planData.fosSpecialization;
                            this.saveFosSpecialization();
                            this.initializeFosSelection();
                        }
                        
                        // Import custom courses if present
                        if (planData.customCourses && Array.isArray(planData.customCourses)) {
                            this.customCourses = planData.customCourses;
                            this.saveCustomCourses();
                            
                            // Reload courses to include custom ones
                            this.allCourses = this.allCourses.filter(c => !c.isCustom);
                            this.allCourses.push(...this.customCourses);
                        }
                        
                        this.saveSemesterPlan();
                        this.saveSemesterCount();
                        
                        this.renderSemesters();
                        this.filterCourses();
                        this.updateProgress();
                        
                        alert('Plan imported successfully!');
                    } else {
                        alert('Invalid plan file format.');
                    }
                } catch (error) {
                    console.error('Error importing plan:', error);
                    alert('Failed to import plan. Please check the file format.');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    // Show error message
    showError(message) {
        const courseList = document.getElementById('courseList');
        if (courseList) {
            courseList.innerHTML = `
                <div class="info-text" style="padding: var(--spacing-xl); text-align: center; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i><br>
                    ${message}
                </div>
            `;
        }
    }

    // Open custom course modal
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

    // Close custom course modal
    closeCustomCourseModal() {
        const modal = document.getElementById('customCourseModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Save custom course
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
            const index = this.customCourses.findIndex(c => c.Name === editingCourse);
            if (index !== -1) {
                this.customCourses[index] = {
                    Name: name,
                    ECTS: `${ects} CP`,
                    semester: semester,
                    customCategory: category,
                    isCustom: true,
                    'Available in': this.getCategoryAvailability(category)
                };
                
                // Update in allCourses
                const allIndex = this.allCourses.findIndex(c => c.Name === editingCourse);
                if (allIndex !== -1) {
                    this.allCourses[allIndex] = this.customCourses[index];
                }
                
                // Update in semester plan if exists
                Object.keys(this.semesterPlan).forEach(semesterId => {
                    const courseIndex = this.semesterPlan[semesterId].findIndex(c => c.Name === editingCourse);
                    if (courseIndex !== -1) {
                        this.semesterPlan[semesterId][courseIndex] = this.customCourses[index];
                    }
                });
                
                this.saveSemesterPlan();
            }
        } else {
            // Check for duplicate name
            if (this.allCourses.some(c => c.Name === name)) {
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
                'Available in': this.getCategoryAvailability(category)
            };

            this.customCourses.push(newCourse);
            this.allCourses.push(newCourse);
        }

        this.saveCustomCourses();
        this.filterCourses();
        this.renderSemesters();
        this.updateProgress();
        this.closeCustomCourseModal();
    }

    // Get category availability structure
    getCategoryAvailability(category) {
        const categoryMap = {
            'thesis': [],
            'interdisciplinary': [],
            'electiveArea': [{ FoS: 'Elective Area in Mechatronics and Information Technology', subtype: 'Elective Area in Mechatronics and Information Technology' }],
            'methodical': [{ FoS: 'Field of Specialization in Mechatronics and Information Technology / Custom', subtype: 'Mandatory Electives - Methodical' }],
            'general': [{ FoS: 'Field of Specialization in Mechatronics and Information Technology / Custom', subtype: 'Mandatory Electives - General' }],
            'additive': [{ FoS: 'Field of Specialization in Mechatronics and Information Technology / Custom', subtype: 'Additive Electives' }]
        };

        return categoryMap[category] || [];
    }

    // Edit custom course
    editCustomCourse(courseName) {
        const course = this.customCourses.find(c => c.Name === courseName);
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
        this.customCourses = this.customCourses.filter(c => c.Name !== courseName);
        this.allCourses = this.allCourses.filter(c => c.Name !== courseName);

        // Remove from semester plan if exists
        Object.keys(this.semesterPlan).forEach(semesterId => {
            this.semesterPlan[semesterId] = this.semesterPlan[semesterId].filter(c => c.Name !== courseName);
        });

        this.saveCustomCourses();
        this.saveSemesterPlan();
        this.filterCourses();
        this.renderSemesters();
        this.updateProgress();
    }

    // Setup Drag and Drop
    setupDragAndDrop() {
        this.attachSidebarDragListeners();
        this.attachSemesterDragListeners();
    }

    // Attach drag listeners to sidebar course items
    attachSidebarDragListeners() {
        const courseItems = document.querySelectorAll('.course-list .course-item');
        
        courseItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', e.target.dataset.courseName);
                e.dataTransfer.setData('source', 'sidebar');
                e.target.classList.add('dragging');
            });

            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });
        });
    }

    // Attach drag listeners to semester columns and course cards
    attachSemesterDragListeners() {
        // Attach to semester drop zones
        const semesterZones = document.querySelectorAll('.semester-courses');
        
        semesterZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', (e) => {
                if (e.target === zone) {
                    zone.classList.remove('drag-over');
                }
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');
                
                const courseName = e.dataTransfer.getData('text/plain');
                const source = e.dataTransfer.getData('source');
                const targetSemesterId = zone.dataset.semesterId;
                
                if (source === 'sidebar') {
                    this.addCourseToSemester(courseName, targetSemesterId);
                } else {
                    const sourceSemesterId = e.dataTransfer.getData('sourceSemester');
                    this.moveCourse(courseName, sourceSemesterId, targetSemesterId);
                }
            });
        });

        // Attach to semester course cards
        const semesterCourses = document.querySelectorAll('.semester-course-card');
        
        semesterCourses.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', e.target.dataset.courseName);
                e.dataTransfer.setData('source', 'semester');
                
                // Find which semester this course is in
                const semesterZone = e.target.closest('.semester-courses');
                e.dataTransfer.setData('sourceSemester', semesterZone.dataset.semesterId);
                
                e.target.classList.add('dragging');
            });

            card.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });
        });
    }

    // Add course to semester
    addCourseToSemester(courseName, semesterId) {
        // Find the course in allCourses
        const course = this.allCourses.find(c => c.Name === courseName);
        if (!course) return;

        // Initialize semester if doesn't exist
        if (!this.semesterPlan[semesterId]) {
            this.semesterPlan[semesterId] = [];
        }

        // Check if course already exists in this semester
        if (this.semesterPlan[semesterId].some(c => c.Name === courseName)) {
            return;
        }

        // Add course to semester
        this.semesterPlan[semesterId].push(course);
        
        // Save and re-render
        this.saveSemesterPlan();
        this.renderSemesters();
        this.filterCourses(); // Refresh sidebar (removes added course)
        this.updateProgress();
    }

    // Move course between semesters
    moveCourse(courseName, sourceSemesterId, targetSemesterId) {
        // Don't do anything if dropping in the same semester
        if (sourceSemesterId === targetSemesterId) return;

        // Find and remove from source
        const sourceIndex = this.semesterPlan[sourceSemesterId]?.findIndex(c => c.Name === courseName);
        if (sourceIndex === -1 || sourceIndex === undefined) return;

        const course = this.semesterPlan[sourceSemesterId][sourceIndex];
        this.semesterPlan[sourceSemesterId].splice(sourceIndex, 1);

        // Add to target
        if (!this.semesterPlan[targetSemesterId]) {
            this.semesterPlan[targetSemesterId] = [];
        }
        this.semesterPlan[targetSemesterId].push(course);

        // Save and re-render
        this.saveSemesterPlan();
        this.renderSemesters();
        this.updateProgress();
    }

    // Remove course from semester (via button)
    removeCourseFromSemester(courseName) {
        // Find which semester contains this course
        for (const [semesterId, courses] of Object.entries(this.semesterPlan)) {
            const index = courses.findIndex(c => c.Name === courseName);
            if (index !== -1) {
                courses.splice(index, 1);
                break;
            }
        }

        // Save and re-render
        this.saveSemesterPlan();
        this.renderSemesters();
        this.filterCourses(); // Refresh sidebar (adds removed course back)
        this.updateProgress();
    }
}

// Initialize the planner when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.planner = new CoursePlanner();

    // Setup search input listener
    const searchInput = document.getElementById('sidebarSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            planner.filterCourses();
        });
    }
});
