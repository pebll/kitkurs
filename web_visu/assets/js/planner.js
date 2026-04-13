// Course Planner Application

// Constants
const PLANNER_CONSTANTS = {
    STORAGE_KEYS: {
        FAVORITES: 'kitkurs_favorites',
        SEMESTER_PLAN: 'kitkurs_semester_plan',
        SEMESTER_COUNT: 'kitkurs_semester_count'
    },
    DEFAULT_SEMESTERS: 4,
    TOTAL_REQUIRED_ECTS: 120
};

// Planner Class
class CoursePlanner {
    constructor() {
        this.courses = [];
        this.allCourses = [];
        this.favorites = this.loadFavorites();
        this.semesterPlan = this.loadSemesterPlan();
        this.semesterCount = this.loadSemesterCount();
        this.currentFilter = 'all';
        
        this.init();
    }

    async init() {
        try {
            await this.loadCourses();
            this.renderSemesters();
            this.filterCourses('all');
            this.updateProgress();
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
            this.allCourses = await response.json();
            this.courses = [...this.allCourses];
            console.log(`Loaded ${this.courses.length} courses`);
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
            return `
                <div class="course-item" draggable="true" data-course-name="${course.Name}">
                    <div class="course-item-header">
                        <div class="course-item-title">
                            ${isFavorite ? '<i class="fas fa-star" style="color: #FFD700; margin-right: 4px;"></i>' : ''}
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
                        '<span>Drag courses here</span>' : 
                        this.renderSemesterCourses(semesterCourses)
                    }
                </div>
            `;

            container.appendChild(semesterColumn);
        }
    }

    // Render courses in a semester
    renderSemesterCourses(courses) {
        return courses.map(course => `
            <div class="semester-course-card" draggable="true" data-course-name="${course.Name}">
                <div class="course-item-header">
                    <div class="course-item-title">${course.Name}</div>
                    <div class="course-item-ects">${course.ECTS}</div>
                </div>
                <div class="course-item-semester">
                    <i class="fas fa-calendar-alt"></i> ${course.semester || 'N/A'}
                </div>
            </div>
        `).join('');
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
        }
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
