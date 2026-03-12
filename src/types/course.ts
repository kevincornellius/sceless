export interface Course {
    id: number;
    title: string;      
    code: string;       
    url: string;        
    progress: number;
    isPinned: boolean;  
    image?: string;
}