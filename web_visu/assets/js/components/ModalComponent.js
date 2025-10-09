// Modal Component Module
import { CONSTANTS } from '../utils/constants.js';
import { Helpers } from '../utils/helpers.js';

export class ModalComponent {
    constructor(courseCatalog) {
        this.courseCatalog = courseCatalog;
    }

    /**
     * Show PDF modal
     * @param {string} pdfLink - PDF link
     * @param {string} courseName - Course name
     */
    show(pdfLink, courseName) {
        const modal = document.querySelector(CONSTANTS.SELECTORS.PDF_MODAL);
        const pdfViewer = document.querySelector(CONSTANTS.SELECTORS.PDF_VIEWER);
        const pdfTitle = document.querySelector(CONSTANTS.SELECTORS.PDF_TITLE);
        
        if (!modal || !pdfViewer || !pdfTitle) return;

        pdfTitle.textContent = courseName;
        
        // Create URL with timestamp to force reload
        let url = `./study_programs/mechatronics_master/${pdfLink}`;
        url = Helpers.handleUrlWithAnchor(url);
        
        pdfViewer.src = url;
        modal.style.display = 'block';
    }

    /**
     * Hide PDF modal
     */
    hide() {
        const modal = document.querySelector(CONSTANTS.SELECTORS.PDF_MODAL);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Check if modal is visible
     * @returns {boolean} True if modal is visible
     */
    isVisible() {
        const modal = document.querySelector(CONSTANTS.SELECTORS.PDF_MODAL);
        return modal && modal.style.display === 'block';
    }
}