export interface Book { 
  no: number; 
  title: string; 
  author: string; 
  publisher: string | null; 
  copyright: string | number | null; 
  isbn: string | null; 
  copy: string | number | null; 
  search_count: number; 
  bookshelf__name: string;
  file_path: string | null;
  recommendation_count?: number;
} 


// for AdminAddBookModal.tsx
export type NewBook = Omit<Book, "no">; 
