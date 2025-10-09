// Course Category Extraction Logic
import { CONSTANTS } from './constants.js';

export class CategoryExtractor {
    /**
     * Extract categories from course name
     * @param {string} courseName - Name of the course
     * @returns {Array<string>} Array of categories
     */
    static extractCategories(courseName) {
        const categories = [];
        const name = courseName.toLowerCase();
        
        // Check for category matches
        Object.entries(CONSTANTS.CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
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

    /**
     * Extract filter options from courses
     * @param {Array} courses - Array of course objects
     * @returns {Object} Object containing different filter options
     */
    static extractFilterOptions(courses) {
        const categories = new Set();
        const fosOptions = new Set();
        const fosCategoriesOptions = new Set();
        const generalOptions = new Set();

        courses.forEach(course => {
            // Handle categories - use pre-computed categories if available, otherwise extract them
            if (course.categories && Array.isArray(course.categories)) {
                // New format: categories are already provided
                course.categories.forEach(cat => categories.add(cat));
            } else {
                // Old format: extract categories from course names
                const extractedCategories = this.extractCategories(course.Name);
                extractedCategories.forEach(cat => categories.add(cat));
            }
            
            // Extract availability options - handle both old and new formats
            if (Array.isArray(course['Available in'])) {
                // New format: Available in is an array of objects
                course['Available in'].forEach(avail => {
                    if (avail.FoS && !avail.FoS.includes('Elective Area')) {
                        fosOptions.add(avail.FoS);
                    }
                    if (avail.subtype && avail.subtype !== 'Elective Area in Mechatronics and Information Technology') {
                        fosCategoriesOptions.add(avail.subtype);
                    }
                });
            } else if (course['Available in'] && course['Available in'].trim()) {
                // Old format: Available in is a string - treat as general category
                const availability = course['Available in'].split(',').map(a => a.trim());
                availability.forEach(av => {
                    generalOptions.add(av);
                });
            }
        });
        
        // Add predefined general categories
        generalOptions.add('Master\'s Thesis (30 CP)');
        generalOptions.add('Interdisciplinary Qualifications (8 CP)');
        generalOptions.add('Elective Area (22 CP)');

        return {
            categories: Array.from(categories).sort(),
            fosOptions: Array.from(fosOptions).sort(),
            fosCategoriesOptions: Array.from(fosCategoriesOptions).sort(),
            generalOptions: Array.from(generalOptions).sort()
        };
    }
}