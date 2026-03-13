


export interface AppNotification {
    id: number;
    title: string;      
    url: string;        
    timestamp: number;       
    isRead: boolean;     
    module: string;      
    courseId?: number;
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