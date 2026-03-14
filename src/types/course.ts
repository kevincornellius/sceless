export interface Course {
    id: number;
    title: string;      
    code: string;       
    url: string;        
    progress: number;
    isPinned: boolean;  
    image?: string;
}

// Moodle core_course_get_contents response types
export interface CourseSection {
    id: number;
    name: string;
    visible: number;
    summary: string;
    summaryformat: number;
    section: number;
    modules: CourseModule[];
}

export interface CourseModule {
    id: number;
    name: string;
    instance: number;
    description?: string;
    visible: number;
    modname: string;
    modplural: string;
    availability?: string;
    customdata?: string;
    contents?: ModuleContent[];
    contentsinfo?: {
        filescount: number;
        filessize: number;
        lastmodified: number;
        mimemimetype: string;
        repositorytype?: string;
    };
}

// Parse customdata to extract due date
export function getModuleDueDate(module: CourseModule): Date | null {
    if (!module.customdata) return null;
    
    try {
        const data = JSON.parse(module.customdata);
        if (data.duedate) {
            return new Date(data.duedate * 1000); // Convert Unix timestamp to Date
        }
    } catch (e) {
        // Ignore parse errors
    }
    return null;
}

// Format due date for display
export function formatDueDate(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) {
        return "Overdue";
    } else if (days === 0) {
        return "Due today";
    } else if (days === 1) {
        return "Due tomorrow";
    } else if (days < 7) {
        return `Due in ${days} days`;
    } else {
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
}

export interface ModuleContent {
    type: string;
    filename: string;
    filepath: string;
    filesize: number;
    fileurl: string;
    timecreated: number;
    timemodified: number;
    sortorder: number;
    mimetype?: string;
    isexternalfile?: number;
    repositorytype?: string;
}