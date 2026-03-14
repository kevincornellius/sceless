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
    contents?: ModuleContent[];
    contentsinfo?: {
        filescount: number;
        filessize: number;
        lastmodified: number;
        mimemimetype: string;
        repositorytype?: string;
    };
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