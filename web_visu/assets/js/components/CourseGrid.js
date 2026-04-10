// Course Grid Component Module
import { CONSTANTS } from '../utils/constants.js';
import { Helpers } from '../utils/helpers.js';
import { CategoryExtractor } from '../utils/categoryExtractor.js';

export class CourseGrid {
    constructor(courseCatalog) {
        this.courseCatalog = courseCatalog;
    }

    /**
     * Render courses to the grid
     * @param {Array} courses - Array of courses to render
     */
    render(courses) {
        const coursesGrid = document.querySelector(CONSTANTS.SELECTORS.COURSES_GRID);
        const resultsCount = document.querySelector(CONSTANTS.SELECTORS.RESULTS_COUNT);
        const noResults = document.querySelector(CONSTANTS.SELECTORS.NO_RESULTS);

        if (!coursesGrid || !resultsCount || !noResults) return;

        // Update results count
        resultsCount.textContent = `${courses.length} course${courses.length !== 1 ? 's' : ''} found`;

        // Show/hide no results message
        if (courses.length === 0) {
            coursesGrid.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }

        coursesGrid.style.display = 'grid';
        noResults.style.display = 'none';

        // Render course cards
        coursesGrid.innerHTML = courses.map(course => this.createCourseCard(course)).join('');
    }

    /**
     * Create a course card HTML element
     * @param {Object} course - Course object
     * @returns {string} HTML string for course card
     */
    createCourseCard(course) {
        // Handle categories - use pre-computed or extract
        let categories;
        if (course.categories && Array.isArray(course.categories)) {
            categories = course.categories;
        } else {
            categories = CategoryExtractor.extractCategories(course.Name);
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
        const maxVisible = CONSTANTS.DEFAULTS.MAX_VISIBLE_AVAILABILITY;
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
                        <span class="detail-value">${Helpers.formatEcts(course.ECTS)}</span>
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
                
                <button class="view-pdf-btn" onclick="courseCatalog.viewPDF('${course.pdf_link}', '${course.Name}')">
                    <i class="fas fa-file-pdf"></i>
                    View Course Details
                </button>
            </div>
        `;
    }

    /**
     * Toggle availability display
     * @param {HTMLElement} button - Toggle button
     * @param {Array} availabilityList - List of availability items
     */
    toggleAvailability(button, availabilityList) {
        const container = button.parentElement;
        const textElement = container.querySelector('.availability-text');
        const icon = button.querySelector('i');
        
        if (textElement.dataset.expanded === 'true') {
            // Collapse - show only first 2 items
            const maxVisible = CONSTANTS.DEFAULTS.MAX_VISIBLE_AVAILABILITY;
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
}