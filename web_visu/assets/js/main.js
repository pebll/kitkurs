// Main Entry Point - Simplified version that works with existing code
// For now, we'll import the existing script.js functionality

// Import the existing CourseCatalog class from the backup
// This maintains compatibility while we transition to the modular structure

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Load the existing script.js functionality
    loadExistingScript();
});

async function loadExistingScript() {
    try {
        // Import the existing script.js as a module
        const script = document.createElement('script');
        script.type = 'module';
        script.textContent = await fetch('./script.js').then(r => r.text());
        document.head.appendChild(script);
    } catch (error) {
        console.error('Error loading existing script:', error);
        // Fallback: load as regular script
        const script = document.createElement('script');
        script.src = './script.js';
        document.head.appendChild(script);
    }
}

// Add some utility functions for better user experience
document.addEventListener('keydown', (e) => {
    // Close modal with Escape key
    if (e.key === 'Escape') {
        const modal = document.getElementById('pdfModal');
        if (modal && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    }
});

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
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.focus();
    }
});