


export interface AppNotification {
    id: number;
    title: string;      
    url: string;        
    timestamp: number;       
    isRead: boolean;     
    module: string;      
    courseId?: number;
}

export interface AnnouncementAttachment {
    filename: string;
    fileurl: string;
    filesize: number;
    mimetype?: string;
}

export interface Announcement {
    id: number;
    discussion: number;
    name: string;
    message: string;
    userid: number;
    userfullname: string;
    userpictureurl?: string;
    timecreated: number;
    timemodified: number;
    url: string;
    attachments: AnnouncementAttachment[];
}

export interface Deadline {
    id: number;
    title: string;          
    courseCode: string;     
    courseId: number;
    dueTimestamp: number;   
    url: string;          
    module: string;        
}