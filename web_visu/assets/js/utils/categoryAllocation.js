// Pure category allocation for the semester planner (no DOM access).

const CATEGORY_LIMITS = {
    thesis: 30,
    interdisciplinary: 8,
    methodical: 8,
    general: 16,
    electiveArea: 22
};
const FOS_POOL_SIZE = 60;

// Allocates planned courses (in plan order) to categories.
// classify(course) -> { isThesis, isInterdisciplinary, matchesFos,
//                       canMethodical, canGeneral, canAdditive, canElective }
// Soft limits: a course may be added while a category is still under its limit,
// even if the course pushes it over.
// Returns { assignments: [{ course, category, overflow }], totals, required }.
function allocateCategories(courses, classify) {
    const totals = {
        thesis: 0, interdisciplinary: 0, methodical: 0,
        general: 0, additive: 0, electiveArea: 0
    };
    const assignments = [];

    for (const course of courses) {
        const ects = parseInt(course.ECTS) || 0;
        const c = classify(course);
        let category = null;
        let overflow = false;

        if (c.isThesis) {
            category = 'thesis';
        } else if (c.isInterdisciplinary) {
            category = 'interdisciplinary';
        } else {
            const pool = totals.methodical + totals.general + totals.additive;
            if (c.matchesFos && pool < FOS_POOL_SIZE) {
                if (c.canMethodical && totals.methodical < CATEGORY_LIMITS.methodical) {
                    category = 'methodical';
                } else if (c.canGeneral && totals.general < CATEGORY_LIMITS.general) {
                    category = 'general';
                } else if (c.canAdditive) {
                    category = 'additive';
                } else if (c.canGeneral) {
                    category = 'general';
                    overflow = true;
                } else if (c.canMethodical) {
                    category = 'methodical';
                    overflow = true;
                }
            }
            if (!category && c.canElective && totals.electiveArea < CATEGORY_LIMITS.electiveArea) {
                category = 'electiveArea';
            }
        }

        if (category) totals[category] += ects;
        assignments.push({ course, category, overflow });
    }

    const required = {
        thesis: CATEGORY_LIMITS.thesis,
        interdisciplinary: CATEGORY_LIMITS.interdisciplinary,
        electiveArea: CATEGORY_LIMITS.electiveArea,
        methodical: CATEGORY_LIMITS.methodical,
        general: CATEGORY_LIMITS.general,
        additive: Math.max(0, FOS_POOL_SIZE
            - Math.max(totals.general, CATEGORY_LIMITS.general)
            - Math.max(totals.methodical, CATEGORY_LIMITS.methodical))
    };

    return { assignments, totals, required };
}

// Extracts the set of planned course names from the stored semester plan JSON
// ({ semesterN: [course, ...] }). Missing or invalid data yields an empty set.
function plannedCourseNames(planJson) {
    const names = new Set();
    let plan;
    try {
        plan = JSON.parse(planJson);
    } catch (e) {
        return names;
    }
    if (!plan || typeof plan !== 'object') return names;
    Object.values(plan).forEach(courses => {
        if (!Array.isArray(courses)) return;
        courses.forEach(c => {
            if (c && typeof c.Name === 'string') names.add(c.Name);
        });
    });
    return names;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { allocateCategories, plannedCourseNames, CATEGORY_LIMITS, FOS_POOL_SIZE };
}
