import { getItemAsync } from './storage';
import { courseClient } from './http';

export interface CourseHistory {
  active_courses: Course[];
  ended_courses: Course[];
  active_pages: number;
  ended_pages: number;
}

export interface Course {
  course_id: string;
  course_name: string;
  description: string;
  date_init: string;
  date_end: string;
  quota: number;
  max_quota: number;
  academic_level: string;
  category: string | null;
  objetives: string;
  content: string;
  required_courses: any[];
  teacher: string;
  instructor_profile: string;
  modality: string;
  schedule: Schedule[];
  course_status: string;
  status: string;
  current_page: number;
  total_pages: number;
}

interface Schedule {
  day: string;
  time: string;
}

export async function fetchCourseHistory(activePage = 1, endedPage = 1, activeLimit = 3, endedLimit = 3): Promise<CourseHistory> {
  const token = await getItemAsync('authToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await courseClient.get(
    `/courses/history?active_limit=${activeLimit}&active_page=${activePage}&ended_limit=${endedLimit}&ended_page=${endedPage}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Failed to fetch course history: ${response.status}`);
  }

  return response.data.response;
}

export async function createModuleResource(
  moduleId: string,
  token: string,
  resourceData: {
    type: string;
    original_name: string;
    resource: File | any; // Para manejar diferentes tipos de archivos
  }
): Promise<any> {
  if (!token) {
    throw new Error('No authentication token provided');
  }

  // Crear FormData para enviar el archivo
  const formData = new FormData();
  formData.append('type', resourceData.type);
  formData.append('original_name', resourceData.original_name);
  formData.append('resource', resourceData.resource);

  const response = await courseClient.post(
    `/courses/${moduleId}/resources`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Failed to create resource: ${response.status}`);
  }

  return response.data;
}
