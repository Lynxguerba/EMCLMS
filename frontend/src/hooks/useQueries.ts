import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Types for common data structures
// (Add more as needed or import from a central types file)

// --- Centralized Query Architecture ---

/**
 * Global Query Keys
 * Standardizing query keys ensures consistent cache management and invalidation.
 */
export const queryKeys = {
  // Auth & Session
  session: ['session'] as const,
  
  // Admin
  registrationRequests: ['admin', 'registration-requests'] as const,
  passwordResets: ['admin', 'password-resets'] as const,
  allUsers: ['admin', 'users'] as const,
  allCourses: ['admin', 'courses'] as const,
  adminCourseCount: ['admin', 'course-count'] as const,
  adminStudentCount: ['admin', 'student-count'] as const,
  adminInstructorCount: ['admin', 'instructor-count'] as const,
  adminProgramData: ['admin', 'program-data'] as const,
  adminCourseEnrollments: ['admin', 'course-enrollments'] as const,
  adminCourseCompletion: ['admin', 'course-completion'] as const,
  adminFacultyLogs: ['admin', 'faculty-logs'] as const,
  adminStudentLogs: ['admin', 'student-logs'] as const,
  
  // Librarian
  books: ['librarian', 'books'] as const,
  bookshelves: ['librarian', 'bookshelves'] as const,
  borrowRecords: ['librarian', 'borrow-records'] as const,
  bookRequests: ['librarian', 'book-requests'] as const,
  librarianTotalBooks: ['librarian', 'total-books'] as const,
  librarianBorrowedToday: ['librarian', 'borrowed-today'] as const,
  librarianOverdueBooks: ['librarian', 'overdue-books'] as const,
  librarianTotalSearch: ['librarian', 'total-search'] as const,
  librarianMostSearched: ['librarian', 'most-searched'] as const,
  librarianMostAccessed: ['librarian', 'most-accessed'] as const,
  librarianWeeklyActivity: ['librarian', 'weekly-activity'] as const,
  librarianRecentActivity: ['librarian', 'recent-activity'] as const,
  checkUser: (userId: string) => ['librarian', 'check-user', userId] as const,
  checkBook: (isbn: string) => ['librarian', 'check-book', isbn] as const,
  
  // Instructor
  instructorCourses: ['instructor', 'courses'] as const,
  instructorCourseCount: ['instructor', 'course-count'] as const,
  instructorStudentCount: ['instructor', 'student-count'] as const,
  instructorEnrollmentStats: ['instructor', 'enrollment-stats'] as const,
  instructorRecentActivity: ['instructor', 'recent-activity'] as const,
  instructorUpcomingDeadlines: ['instructor', 'deadlines'] as const,
  instructorWeeklyEngagement: ['instructor', 'weekly-engagement'] as const,
  instructorCoursesWithStudents: ['instructor', 'courses-with-students'] as const,
  instructorUnenrolledStudents: (courseId: number) => ['instructor', 'unenrolled-students', courseId] as const,
  instructorRecommendedBooks: (courseId: number) => ['instructor', 'recommended-books', courseId] as const,
  instructorContentGrades: (contentId: string) => ['instructor', 'content-grades', contentId] as const,
  instructorCourseGradesReport: (courseId: number) => ['instructor', 'course-grades-report', courseId] as const,
  
  // Student
  studentCourses: ['student', 'courses'] as const,
  studentCourseDetail: (courseId: string) => ['student', 'course', courseId] as const,
  studentCourseSections: (courseId: string) => ['student', 'course-sections', courseId] as const,
  studentCourseContents: (courseId: string) => ['student', 'course-contents', courseId] as const,
  studentSubmissionStatus: (contentId: number) => ['student', 'submission-status', contentId] as const,
  studentRecommendedBooks: (courseId: number) => ['student', 'recommended-books', courseId] as const,
  studentContents: ['student', 'contents'] as const,
  studentSections: ['student', 'sections'] as const,
  studentPerformance: ['student', 'performance'] as const,

  // Librarian
  librarianBorrowingReport: ['librarian', 'borrowing-report'] as const,

  // Admin
  adminEnrollmentReport: ['admin', 'enrollment-report'] as const,

  // User (Common for Student/Instructor/Librarian as users)
  userBookRequests: ['user', 'book-requests'] as const,
  userBorrowRecords: ['user', 'borrow-records'] as const,
  semanticBookSearch: (query: string) => ['books', 'search', query] as const,
  
  // General
  courseDetail: (courseId: number) => ['course', courseId] as const,
  courseSections: (courseId: number) => ['course-sections', courseId] as const,
  sectionContent: (sectionId: number) => ['section-content', sectionId] as const,
  schoolYears: ['school-years'] as const,
  notifications: ['notifications'] as const,
};

// --- Generic Fetcher Wrapper ---
const fetcher = async <T>(url: string): Promise<T> => {
  const { data } = await axios.get(`${API_BASE_URL}${url}`);
  return data;
};

// --- Centralized Mutation Policy ---
/**
 * Custom hook to handle common mutation logic like cache invalidation.
 * This ensures that when we create/update/delete data, the UI reflects it immediately.
 */
export const useGlobalMutation = <TData, TVariables, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  invalidateKeys?: Array<readonly unknown[]>,
  options?: any
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    ...options,
    onSuccess: (data: TData, variables: TVariables, context: TContext) => {
      // Automatically invalidate related queries if keys are provided
      if (invalidateKeys) {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      
      // Call custom onSuccess if provided
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
  });
};

// --- Core Query Hooks ---

// 1. Session & Auth
export const useSession = (options?: Partial<UseQueryOptions<any>>) => {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => fetcher<any>('/api/session/'),
    ...options,
  });
};

// 2. Admin Hooks
export const useRegistrationRequests = () => {
  return useQuery({
    queryKey: queryKeys.registrationRequests,
    queryFn: () => fetcher<any[]>('/api/admin/get/registration-requests/'),
  });
};

export const useAdminCourseCount = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.adminCourseCount, schoolYear],
    queryFn: () => fetcher<{ count: number }>(`/api/admin/course-count/${queryParam}`),
  });
};

export const useAdminStudentCount = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.adminStudentCount, schoolYear],
    queryFn: () => fetcher<{ count: number }>(`/api/admin/get/user-count/student/${queryParam}`),
  });
};

export const useAdminInstructorCount = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.adminInstructorCount, schoolYear],
    queryFn: () => fetcher<{ count: number }>(`/api/admin/get/user-count/instructor/${queryParam}`),
  });
};

export const useAdminProgramData = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.adminProgramData, schoolYear],
    queryFn: () => fetcher<{ programs: any[] }>(`/api/admin/get/user-count/program/${queryParam}`),
  });
};

export const useAdminCourseEnrollments = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.adminCourseEnrollments, schoolYear],
    queryFn: () => fetcher<any[]>(`/api/admin/course-enrollments/${queryParam}`),
  });
};

export const useAdminCourseCompletion = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.adminCourseCompletion, schoolYear],
    queryFn: () => fetcher<any[]>(`/api/admin/get/course-completion/${queryParam}`),
  });
};

export const useAdminAllUsers = () => {
  return useQuery({
    queryKey: queryKeys.allUsers,
    queryFn: () => fetcher<any[]>('/api/admin/get/all-rows/?table=user'),
  });
};

export const useAdminCoursesWithProgress = () => {
  return useQuery({
    queryKey: queryKeys.allCourses,
    queryFn: async () => {
      const [courses, sections] = await Promise.all([
        fetcher<any[]>('/api/admin/get-all-courses-with-instructor-fullnames/'),
        fetcher<any[]>('/api/admin/get/all-rows/?table=section'),
      ]);

      return courses.map((course) => {
        const courseSections = sections.filter(
          (s: any) => Number(s.course_id) === Number(course.course_id)
        );

        const hasNoSections = courseSections.length === 0;
        const completed = courseSections.filter(
          (s: any) => s.is_completed === true || s.is_completed === 1
        ).length;
        const progress = hasNoSections
          ? 0
          : Number(((completed / courseSections.length) * 100).toFixed(1));

        return { ...course, progress, hasNoSections };
      });
    },
  });
};

export const useAdminPasswordResets = () => {
  return useQuery({
    queryKey: queryKeys.passwordResets,
    queryFn: () => fetcher<any[]>('/api/admin/get-all-password-reset-of-users/'),
  });
};

export const useAdminFacultyLogs = () => {
  return useQuery({
    queryKey: queryKeys.adminFacultyLogs,
    queryFn: () => fetcher<any[]>('/api/admin/get/instructor-logs/'),
  });
};

export const useAdminStudentLogs = () => {
  return useQuery({
    queryKey: queryKeys.adminStudentLogs,
    queryFn: () => fetcher<any[]>('/api/admin/get/student-logs/'),
  });
};

// 3. Librarian Hooks
export const useBooks = () => {
  return useQuery({
    queryKey: queryKeys.books,
    queryFn: () => fetcher<any[]>('/api/librarian/get/all-rows/?table=book'),
  });
};

export const useBookshelves = () => {
  return useQuery({
    queryKey: queryKeys.bookshelves,
    queryFn: () => fetcher<any[]>('/api/librarian/get-post/bookshelves/'),
  });
};

export const useLibrarianTotalBooks = () => {
  return useQuery({
    queryKey: queryKeys.librarianTotalBooks,
    queryFn: () => fetcher<{ count: number }>('/api/librarian/get/book-count/total-book/'),
  });
};

export const useLibrarianBorrowedToday = () => {
  return useQuery({
    queryKey: queryKeys.librarianBorrowedToday,
    queryFn: () => fetcher<{ count: number }>('/api/librarian/get/book-count/borrowed-today/'),
  });
};

export const useLibrarianOverdueBooks = () => {
  return useQuery({
    queryKey: queryKeys.librarianOverdueBooks,
    queryFn: () => fetcher<{ count: number }>('/api/librarian/get/book-count/overdue-count/'),
  });
};

export const useLibrarianTotalSearch = () => {
  return useQuery({
    queryKey: queryKeys.librarianTotalSearch,
    queryFn: () => fetcher<{ count: number }>('/api/librarian/get/book-count/total-search/'),
  });
};

export const useLibrarianMostSearched = () => {
  return useQuery({
    queryKey: queryKeys.librarianMostSearched,
    queryFn: () => fetcher<{ books: any[] }>('/api/librarian/get/book-count/most-searched/'),
  });
};

export const useLibrarianMostAccessedBooks = () => {
  return useQuery({
    queryKey: queryKeys.librarianMostAccessed,
    queryFn: () => fetcher<any[]>('/api/librarian/get/most-accessed-books/'),
  });
};

export const useLibrarianWeeklyActivity = () => {
  return useQuery({
    queryKey: queryKeys.librarianWeeklyActivity,
    queryFn: () => fetcher<any[]>('/api/librarian/get/weekly-activity/'),
  });
};

export const useLibrarianRecentActivity = () => {
  return useQuery({
    queryKey: queryKeys.librarianRecentActivity,
    queryFn: () => fetcher<any[]>('/api/librarian/get/recent-activity/'),
  });
};

export const useLibrarianBookRequests = () => {
  return useQuery({
    queryKey: queryKeys.bookRequests,
    queryFn: () => fetcher<any[]>('/api/librarian/get/book-requests/'),
  });
};

export const useLibrarianBorrowRecords = () => {
  return useQuery({
    queryKey: queryKeys.borrowRecords,
    queryFn: () => fetcher<any[]>('/api/librarian/get/borrow-records/'),
  });
};

export const useCheckUser = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.checkUser(userId),
    queryFn: () => fetcher<any>(`/api/librarian/get/check-user/${userId}/`),
    enabled: !!userId,
  });
};

export const useCheckBook = (isbn: string) => {
  return useQuery({
    queryKey: queryKeys.checkBook(isbn),
    queryFn: () => fetcher<any>(`/api/librarian/get/check-book/${isbn}/`),
    enabled: !!isbn,
  });
};

// 4. Instructor Hooks
export const useInstructorCourses = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.instructorCourses, schoolYear],
    queryFn: () => fetcher<any[]>(`/api/instructor/get/instructor-courses/${queryParam}`),
  });
};

export const useInstructorCourseCount = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.instructorCourseCount, schoolYear],
    queryFn: () => fetcher<{ count: number }>(`/api/instructor/course-count/${queryParam}`),
  });
};

export const useInstructorStudentCount = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.instructorStudentCount, schoolYear],
    queryFn: () => fetcher<{ count: number }>(`/api/instructor/student-count/${queryParam}`),
  });
};

export const useInstructorEnrollmentStats = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.instructorEnrollmentStats, schoolYear],
    queryFn: () => fetcher<{ data: { code: string; count: number }[] }>(`/api/instructor/enrollment-stats/${queryParam}`),
  });
};

export const useInstructorRecentActivity = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.instructorRecentActivity, schoolYear],
    queryFn: () => fetcher<any[]>(`/api/instructor/recent-activity/${queryParam}`),
  });
};

export const useInstructorUpcomingDeadlines = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.instructorUpcomingDeadlines, schoolYear],
    queryFn: () => fetcher<any[]>(`/api/instructor/upcoming-deadlines/${queryParam}`),
  });
};

export const useInstructorWeeklyEngagement = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.instructorWeeklyEngagement, schoolYear],
    queryFn: () => fetcher<{ day: string; activities: number }[]>(`/api/instructor/weekly-engagement/${queryParam}`),
  });
};

export const useInstructorCoursesWithStudents = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.instructorCoursesWithStudents, schoolYear],
    queryFn: () => fetcher<any[]>(`/api/instructor/get/courses-with-students/${queryParam}`),
  });
};

export const useInstructorUnenrolledStudents = (courseId: number, options?: any) => {
  return useQuery({
    queryKey: queryKeys.instructorUnenrolledStudents(courseId),
    queryFn: () => fetcher<any[]>(`/api/instructor/get/all-unenrolled-students/${courseId}/`),
    ...options,
  });
};

export const useInstructorRecommendedBooks = (courseId: number) => {
  return useQuery({
    queryKey: queryKeys.instructorRecommendedBooks(courseId),
    queryFn: () => fetcher<any[]>(`/api/instructor/get/recommended-books/${courseId}/`),
  });
};

export const useInstructorContentGrades = (contentId: string) => {
  return useQuery({
    queryKey: queryKeys.instructorContentGrades(contentId),
    queryFn: () => fetcher<any>(`/api/instructor/get/content-grades/${contentId}/`),
    enabled: !!contentId,
  });
};

export const useInstructorCourseGradesReport = (courseId: number, options?: any) => {
  return useQuery({
    queryKey: queryKeys.instructorCourseGradesReport(courseId),
    queryFn: () => fetcher<any>(`/api/instructor/get/course-grades-report/?course_id=${courseId}`),
    enabled: !!courseId,
    ...options,
  });
};

// 5. Student Hooks
export const useStudentCourses = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.studentCourses, schoolYear],
    queryFn: () => fetcher<any[]>(`/api/student/courses/${queryParam}`),
  });
};

export const useStudentCourseDetail = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.studentCourseDetail(courseId),
    queryFn: () => fetcher<any>(`/api/student/courses/${courseId}/`),
  });
};

export const useStudentCourseSections = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.studentCourseSections(courseId),
    queryFn: () => fetcher<any[]>(`/api/student/courses/${courseId}/sections/`),
  });
};

export const useStudentCourseContents = (courseId: string) => {
  return useQuery({
    queryKey: queryKeys.studentCourseContents(courseId),
    queryFn: () => fetcher<any[]>(`/api/student/courses/${courseId}/contents/`),
  });
};

export const useStudentSubmissionStatus = (contentId: number) => {
  return useQuery({
    queryKey: queryKeys.studentSubmissionStatus(contentId),
    queryFn: () => fetcher<any>(`/api/student/content/${contentId}/submission/`),
  });
};

export const useStudentRecommendedBooks = (courseId: number) => {
  return useQuery({
    queryKey: queryKeys.studentRecommendedBooks(courseId),
    queryFn: () => fetcher<any[]>(`/api/student/get/recommended-books/${courseId}/`),
  });
};

export const useStudentContents = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.studentContents, schoolYear],
    queryFn: () => fetcher<any[]>(`/api/student/contents/${queryParam}`),
  });
};

export const useStudentSections = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.studentSections, schoolYear],
    queryFn: () => fetcher<any[]>(`/api/student/sections/${queryParam}`),
  });
};

export const useStudentPerformance = (schoolYear?: string) => {
  const queryParam = schoolYear ? `?school_year=${encodeURIComponent(schoolYear)}` : '';
  return useQuery({
    queryKey: [...queryKeys.studentPerformance, schoolYear],
    queryFn: () => fetcher<any>(`/api/student/get/performance/${queryParam}`),
  });
};

export const useStudentPerformanceForInstructor = (studentId: string | number) => {
  return useQuery({
    queryKey: ['instructor', 'student-performance', studentId],
    queryFn: () => fetcher<any>(`/api/instructor/get/student-performance/${studentId}/`),
    enabled: !!studentId,
  });
};

// 6. Librarian Hooks
export const useLibrarianBooksReport = () => {
  return useQuery({
    queryKey: queryKeys.librarianBorrowingReport, // Reuse key or use a more descriptive one if needed
    queryFn: () => fetcher<any[]>('/api/librarian/get/all-rows/?table=book'),
  });
};

// 7. Admin Hooks
export const useAdminSchoolYears = () => {
  return useQuery({
    queryKey: queryKeys.schoolYears,
    queryFn: () => fetcher<any[]>('/api/admin/get-post/course-school-years/'),
  });
};

export const useAdminAllInstructors = () => {
  return useQuery({
    queryKey: ['admin', 'all-instructors'],
    queryFn: () => fetcher<any[]>('/api/admin/get-all-instructors/'),
  });
};

// Add a generic data fetcher for admin tables
export const useAdminTableData = (table: string, options?: any) => {
  return useQuery({
    queryKey: ['admin', 'table', table],
    queryFn: () => fetcher<any[]>(`/api/admin/get/all-rows/?table=${table}`),
    ...options
  });
};

// 6. User (Common)
export const useUserBookRequests = (options?: any) => {
  return useQuery<any[]>({
    queryKey: queryKeys.userBookRequests,
    queryFn: () => fetcher<any[]>('/api/user/get/book-requests/'),
    ...options,
  });
};

export const useUserBorrowRecords = (options?: any) => {
  return useQuery<any[]>({
    queryKey: queryKeys.userBorrowRecords,
    queryFn: () => fetcher<any[]>('/api/user/get/borrow-records/'),
    ...options,
  });
};

export const useSemanticBookSearch = (query: string, options?: any) => {
  return useQuery<{ results: any[] }>({
    queryKey: queryKeys.semanticBookSearch(query),
    queryFn: () => axios.post(`${API_BASE_URL}/api/users/semantic-book-search/`, { query }).then(res => res.data as { results: any[] }),
    enabled: !!query,
    ...options,
  });
};

// 7. General
export const useCourseDetail = (courseId: number) => {
  return useQuery({
    queryKey: queryKeys.courseDetail(courseId),
    queryFn: () => fetcher<any>(`/api/courses/${courseId}/`),
  });
};

export const useCourseSections = (courseId: number) => {
  return useQuery({
    queryKey: queryKeys.courseSections(courseId),
    queryFn: () => fetcher<any[]>(`/api/courses/${courseId}/sections/`),
  });
};

export const useSchoolYears = () => {
  return useQuery({
    queryKey: queryKeys.schoolYears,
    queryFn: () => fetcher<any[]>('/api/get/course-school-years/'),
  });
};

export const useInstructorCourseSectionsWithContent = (courseId: number) => {
  return useQuery({
    queryKey: ['instructor', 'course-sections-with-content', courseId],
    queryFn: async () => {
      const sections = await fetcher<any[]>(`/api/courses/${courseId}/sections/`);
      const sectionsWithContents = await Promise.all(
        sections.map(async (section) => {
          try {
            const contents = await fetcher<any[]>(`/api/sections/${section.section_id}/content/`);
            return { ...section, contents };
          } catch {
            return { ...section, contents: [] };
          }
        })
      );
      return sectionsWithContents;
    },
    enabled: !!courseId,
  });
};

export const useSectionContent = (sectionId: number) => {
  return useQuery({
    queryKey: queryKeys.sectionContent(sectionId),
    queryFn: () => fetcher<any[]>(`/api/sections/${sectionId}/content/`),
  });
};

export const useNotifications = () => {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => fetcher<any[]>('/api/user/get/notifications/'),
  });
};

// --- Mutations ---

export const useAcceptRegistration = () => {
  return useGlobalMutation(
    (payload: any) => axios.post(`${API_BASE_URL}/api/admin/create-user/`, payload, { withCredentials: true }).then(res => res.data),
    [queryKeys.registrationRequests, queryKeys.allUsers]
  );
};

export const useRejectRegistration = () => {
  return useGlobalMutation(
    (requestId: number) => axios.delete(`${API_BASE_URL}/api/admin/delete/registration-request/${requestId}/`, { withCredentials: true }),
    [queryKeys.registrationRequests]
  );
};

export const useResetUserPassword = () => {
  return useGlobalMutation(
    (payload: any) => axios.post(`${API_BASE_URL}/api/admin/post/reset-user-password/`, payload, { withCredentials: true }),
    [queryKeys.passwordResets]
  );
};

export const useBulkCreateUser = () => {
  return useGlobalMutation(
    (payload: { users: any[] }) =>
      axios.post(`${API_BASE_URL}/api/admin/bulk-create-user/`, payload, { withCredentials: true }).then(res => res.data),
    [queryKeys.allUsers]
  );
};

// User/Student Mutations
export const useCancelBookRequest = () => {
  return useGlobalMutation(
    (requestId: string | number) => {
      const numericId = typeof requestId === 'string' ? requestId.replace("REQ-", "") : requestId;
      return axios.delete(`${API_BASE_URL}/api/user/delete/cancel-book-request/${numericId}/`, { withCredentials: true });
    },
    [queryKeys.userBookRequests]
  );
};

export const useSubmitBorrowRequest = () => {
  return useGlobalMutation(
    (payload: { book_id: number; reason: string }) => 
      axios.post(`${API_BASE_URL}/api/user/post/submit-borrow-request/`, payload, { withCredentials: true }).then(res => res.data),
    [queryKeys.userBookRequests]
  );
};

// Librarian Mutations
export const useCreateBookshelf = () => {
  return useGlobalMutation(
    (payload: { name: string }) => 
      axios.post(`${API_BASE_URL}/api/librarian/get-post/bookshelves/`, payload, { withCredentials: true }).then(res => res.data),
    [queryKeys.bookshelves]
  );
};

export const useUpdateBookshelf = () => {
  return useGlobalMutation(
    ({ id, name }: { id: number; name: string }) => 
      axios.put(`${API_BASE_URL}/api/librarian/put/update-bookshelf/${id}/`, { name }, { withCredentials: true }).then(res => res.data),
    [queryKeys.bookshelves, queryKeys.books] // Also invalidate books as they might have bookshelf names
  );
};

export const useDeleteBookshelf = () => {
  return useGlobalMutation(
    (id: number) => axios.delete(`${API_BASE_URL}/api/librarian/delete/bookshelves/${id}/`, { withCredentials: true }),
    [queryKeys.bookshelves]
  );
};

export const useUpdateBookRequestStatus = () => {
  return useGlobalMutation(
    ({ requestId, status }: { requestId: number; status: string }) => 
      axios.post(`${API_BASE_URL}/api/librarian/post/update-request-status/${requestId}/`, { status }, { withCredentials: true }),
    [queryKeys.bookRequests, queryKeys.userBookRequests]
  );
};

export const useRejectBookRequest = () => {
  return useGlobalMutation(
    (requestId: number) => axios.delete(`${API_BASE_URL}/api/librarian/delete/reject-book-request/${requestId}/`, { withCredentials: true }),
    [queryKeys.bookRequests, queryKeys.userBookRequests]
  );
};

export const useConfirmBookPickup = () => {
  return useGlobalMutation(
    ({ requestId, days }: { requestId: number; days: number }) =>
      axios.post(`${API_BASE_URL}/api/librarian/post/confirm-book-pickup/${requestId}/`, { days }, { withCredentials: true }),
    [queryKeys.bookRequests, queryKeys.borrowRecords, queryKeys.userBookRequests, queryKeys.userBorrowRecords]
  );
};

export const useBorrowBook = () => {
  return useGlobalMutation(
    (payload: { user_id: string; book_isbn: string; days: number }) =>
      axios.post(`${API_BASE_URL}/api/librarian/post/borrow-book/`, payload, { withCredentials: true }),
    [queryKeys.borrowRecords, queryKeys.userBorrowRecords]
  );
};

export const useReturnBook = () => {
  return useGlobalMutation(
    ({ recordId, condition, notes }: { recordId: number; condition: string; notes: string }) =>
      axios.put(`${API_BASE_URL}/api/librarian/put/return-book/${recordId}/`, { condition, notes }, { withCredentials: true }),
    [queryKeys.borrowRecords, queryKeys.userBorrowRecords]
  );
};

export const useUpdateGrade = (contentId: string) => {
  return useGlobalMutation(
    ({ studentId, score, feedback }: { studentId: number; score: number | null; feedback: string }) =>
      axios.patch(`${API_BASE_URL}/api/instructor/patch/update-grade/${studentId}/`, { score, feedback }, { withCredentials: true }),
    [queryKeys.instructorContentGrades(contentId)]
  );
};

export const useUpdateCourse = (courseId: number) => {
  return useGlobalMutation(
    (payload: { course_code: string; course_title: string; course_description: string; schedules?: any[] }) =>
      axios.patch(`${API_BASE_URL}/api/courses/${courseId}/update/`, payload, { withCredentials: true }).then(res => res.data),
    [queryKeys.courseDetail(courseId), queryKeys.allCourses]
  );
};
