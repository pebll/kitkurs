// Application Constants
export const CONSTANTS = {
    // API Endpoints
    ENDPOINTS: {
        MECHATRONICS_COURSES: './study_programs/mechatronics_master/courses.json',
        INFORMATIK_COURSES: './study_programs/informatik_master/courses.json',
        MECHATRONICS_PDF: './study_programs/mechatronics_master/mhb.pdf',
        INFORMATIK_PDF: './study_programs/informatik_master/mhb.pdf'
    },
    
    // Study Programs
    STUDY_PROGRAMS: {
        MECHATRONICS_MASTER: 'mechatronics_master',
        INFORMATIK_MASTER: 'informatik_master'
    },
    
    // Filter Types
    FILTER_TYPES: {
        FOS_CATEGORY: 'fosCategory',
        GENERAL: 'general'
    },
    
    // Course Categories
    CATEGORY_KEYWORDS: {
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
    },
    
    // UI Elements
    SELECTORS: {
        SEARCH_INPUT: '#searchInput',
        CATEGORY_FILTER: '#categoryFilter',
        FOS_FILTER: '#fosFilter',
        COURSES_GRID: '#coursesGrid',
        RESULTS_COUNT: '#resultsCount',
        NO_RESULTS: '#noResults',
        PDF_MODAL: '#pdfModal',
        PDF_VIEWER: '#pdfViewer',
        PDF_TITLE: '#pdfTitle',
        CLOSE_PDF_MODAL: '#closePdfModal',
        FOS_CATEGORIES_CHECKBOXES: '#fosCategoriesCheckboxes',
        GENERAL_CHECKBOXES: '#generalCheckboxes'
    },
    
    // Default Values
    DEFAULTS: {
        MAX_VISIBLE_AVAILABILITY: 2,
        PDF_VIEWER_HEIGHT: '600px',
        SEARCH_DEBOUNCE_DELAY: 300
    }
};