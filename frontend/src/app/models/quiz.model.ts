export interface Quiz {
  id: string;
  name: string;
  label_x: string;
  label_y: string;
  total_images: number;
  created_at: string;
}

// Response shape for the upload endpoint
export interface UploadResponse {
  success: boolean;
  quiz_id: string;
  message: string;
}