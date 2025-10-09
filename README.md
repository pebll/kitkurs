# Course Catalog Web Application

A modern, responsive web application for browsing and filtering engineering courses with PDF viewing capabilities.

## Features

- **Course Browsing**: View all available courses in a clean, card-based layout
- **Advanced Filtering**: Filter courses by:
  - Category (AI, Robotics, Energy, Automotive, etc.)
  - ECTS Credits
  - Availability (Programs)
- **Search Functionality**: Real-time search through course names
- **PDF Viewing**: Click any course to view detailed information in the PDF
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Beautiful gradient design with smooth animations

## File Structure

```
web_visu/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## How to Use

### Option 1: Simple HTTP Server (Recommended)

1. Navigate to the project directory:
   ```bash
   cd /path/to/your/project
   ```

2. Start a simple HTTP server:
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Or using Python 2
   python -m SimpleHTTPServer 8000
   
   # Or using Node.js (if you have http-server installed)
   npx http-server
   ```

3. Open your browser and go to:
   ```
   http://localhost:8000/web_visu/
   ```

### Option 2: Direct File Opening

You can also open `index.html` directly in your browser, but some features (like PDF viewing) might not work due to CORS restrictions.

## Usage Instructions

1. **Search Courses**: Use the search box to find courses by name
2. **Filter by Category**: Select a category from the dropdown to see related courses
3. **Filter by ECTS**: Choose specific ECTS credit values
4. **Filter by Availability**: Filter by program availability
5. **View Details**: Click "View Course Details" to open the PDF with course information
6. **Clear Filters**: Use the "Clear Filters" button to reset all filters

## Categories

The application automatically categorizes courses based on keywords in their names:

- **Artificial Intelligence**: AI, Machine Learning, Deep Learning, Neural Networks
- **Robotics**: Robotics, Automation, Mobile Robotics
- **Energy**: Power, Solar, Renewable, Battery, Nuclear
- **Automotive**: Vehicle, Driving, Powertrain, Transmission
- **Electronics**: Circuit, Digital, Analog, Hardware
- **Control Systems**: Control, Automation, Feedback
- **Materials**: Materials, Polymers, Nanomaterials
- **Manufacturing**: Production, Logistics, Supply Chain
- **Optics**: Optics, Photonics, Laser, Lighting
- **Biomedical**: Medical, Physiological, Bionics
- **Communication**: Signal Processing, Information, Data
- **Mechanical**: Dynamics, Mechanics, Machines
- **Software**: Programming, Algorithms, Data Analytics
- **Microsystems**: Micro, Nano, MEMS, Microtechnology

## Technical Details

- **Frontend**: Pure HTML5, CSS3, and JavaScript (ES6+)
- **Data Source**: JSON file with course information
- **PDF Integration**: Uses iframe for PDF viewing
- **Responsive**: Mobile-first design with CSS Grid and Flexbox
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)

## Customization

You can easily customize the application by:

1. **Adding New Categories**: Modify the `categoryKeywords` object in `script.js`
2. **Changing Colors**: Update the CSS variables and gradient colors in `styles.css`
3. **Adding New Filters**: Extend the filtering logic in the `handleFilter()` method
4. **Modifying Layout**: Adjust the CSS Grid settings in `styles.css`

## Troubleshooting

- **PDFs not loading**: Make sure you're running the application through an HTTP server
- **Courses not loading**: Check that `courses_v1.json` is in the parent directory
- **Styling issues**: Ensure all CSS files are properly linked
- **JavaScript errors**: Check the browser console for error messages

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

This project is open source and available under the MIT License.