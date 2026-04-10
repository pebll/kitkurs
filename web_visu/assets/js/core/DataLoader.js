// Data Loading Module
import { CONSTANTS } from '../utils/constants.js';
import { Helpers } from '../utils/helpers.js';

export class DataLoader {
    constructor() {
        this.courses = [];
        this.studyPrograms = new Map();
    }

    /**
     * Load study programs configuration
     * @returns {Promise<Map>} Map of study programs
     */
    async loadStudyPrograms() {
        try {
            // Only Mechatronics Master program
            this.studyPrograms.set(CONSTANTS.STUDY_PROGRAMS.MECHATRONICS_MASTER, {
                name: 'Mechatronics Master',
                path: './study_programs/mechatronics_master/',
                coursesFile: 'courses.json',
                pdfFile: 'mhb.pdf'
            });
            
            console.log('Loaded study programs:', Array.from(this.studyPrograms.keys()));
            return this.studyPrograms;
        } catch (error) {
            console.error('Error loading study programs:', error);
            // Fallback: create default study program
            this.studyPrograms.set(CONSTANTS.STUDY_PROGRAMS.MECHATRONICS_MASTER, {
                name: 'Mechatronics Master',
                path: './study_programs/mechatronics_master/',
                coursesFile: 'courses.json',
                pdfFile: 'mhb.pdf'
            });
            return this.studyPrograms;
        }
    }

    /**
     * Load courses from specified study program
     * @param {string} studyProgramId - ID of the study program
     * @returns {Promise<Array>} Array of courses
     */
    async loadCourses(studyProgramId = CONSTANTS.STUDY_PROGRAMS.MECHATRONICS_MASTER) {
        try {
            const studyProgram = this.studyPrograms.get(studyProgramId);
            if (!studyProgram) {
                throw new Error(`Study program ${studyProgramId} not found`);
            }

            const coursesPath = `${studyProgram.path}${studyProgram.coursesFile}`;
            const response = await fetch(coursesPath);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch courses from ${coursesPath}`);
            }
            
            this.courses = await response.json();
            console.log(`Loaded ${this.courses.length} courses from ${studyProgram.name}`);
            return this.courses;
        } catch (error) {
            console.error('Error loading courses:', error);
            throw error;
        }
    }

    /**
     * Get current courses
     * @returns {Array} Array of courses
     */
    getCourses() {
        return this.courses;
    }

    /**
     * Get study programs
     * @returns {Map} Map of study programs
     */
    getStudyPrograms() {
        return this.studyPrograms;
    }

    /**
     * Get study program by ID
     * @param {string} studyProgramId - ID of the study program
     * @returns {Object|null} Study program object or null
     */
    getStudyProgram(studyProgramId) {
        return this.studyPrograms.get(studyProgramId) || null;
    }
}