


export interface AppNotification {
    id: number;
    title: string;      
    url: string;        
    timestamp: number;       
    isRead: boolean;     
    module: string;      
    courseId?: number;
}