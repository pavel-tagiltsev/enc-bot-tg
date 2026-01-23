import moyKlassAPI from '../Helpers/MoyKlassAPI.js';
import Time from '../Helpers/Time.js';

interface MoyKlassLessonRecord {
  visit: boolean;
  userId: number;
  // Add other properties if known
}

interface MoyKlassLesson {
  id: number;
  date: string;
  beginTime: string;
  classId: number;
  records: MoyKlassLessonRecord[];
  teacherIds: number[];
  comment?: string;
  status?: string; // Assuming status can be optional
  // Add other properties if known
}

interface MoyKlassManager {
  id: number;
  name: string;
  // Add other properties if known
}

interface MoyKlassClass {
  id: number;
  name: string;
  courseId: number; // Assuming 0 for individual
  // Add other properties if known
}

interface MoyKlassUser {
  id: number;
  name: string;
  // Add other properties if known
}

interface UnmarkedLessonsGetData {
  lessons: MoyKlassLesson[];
  managers: MoyKlassManager[];
  classes: MoyKlassClass[];
  users: MoyKlassUser[];
}

interface TemplateTeacherLesson {
  date: string;
  beginTime: string;
  classId: number;
  className: string;
  userId: number | null;
  userName: string | null;
}

interface TemplateTeacher {
  id: number;
  name: string;
  totalLessons: number;
  lessons: TemplateTeacherLesson[];
}

interface TemplateData {
  teachers: TemplateTeacher[];
  stats: {
    totalTeachers: number;
    totalLessons: number;
  };
}

export default class UnmarkedLessonsNotification {
  static execute = async (send: (data: TemplateData) => void): Promise<void> => {
    const { lessons, managers, classes, users }: UnmarkedLessonsGetData = await this.getData();

    const templateData: TemplateData = managers.reduce(
      (acc: TemplateData, manager: MoyKlassManager) => {
        const { teachers, stats } = acc;
        const { id, name } = manager;
        const teacherLessons: MoyKlassLesson[] = lessons.filter(({ teacherIds }) => teacherIds.includes(id));

        teachers.push({
          id,
          name,
          totalLessons: teacherLessons.length,
          lessons: teacherLessons.map((lesson: MoyKlassLesson) => {
            const { date, beginTime, classId, records } = lesson;
            const cls = classes.find(({ id: classIdInClasses }) => classIdInClasses === classId);
            if (!cls) {
                // Handle case where class is not found, maybe skip or throw error
                // For now, let's assume it always exists based on current logic
                throw new Error(`Class with ID ${classId} not found`);
            }
            const isIndividual = cls.courseId === 0;

            const userId = isIndividual && records[0] ? records[0].userId : null;
            const userName = userId ? users.find(({ id: userIdInUsers }) => userIdInUsers === userId)?.name || null : null;


            return {
              date,
              beginTime,
              classId: classId,
              className: cls.name,
              userId: userId,
              userName: userName,
            };
          }),
        });

        stats.totalTeachers += 1;
        stats.totalLessons += teacherLessons.length;

        return acc;
      },
      { teachers: [], stats: { totalTeachers: 0, totalLessons: 0 } }
    );

    send(templateData);
  };

  static getData = async (): Promise<UnmarkedLessonsGetData> => {
    const data: UnmarkedLessonsGetData = { // Initialize with empty arrays
      lessons: [],
      managers: [],
      classes: [],
      users: [],
    };

    await moyKlassAPI.setToken();
    const { lessons } = await moyKlassAPI.get('/lessons', {
      params: {
        date: ['2025-09-01', Time.formatYMD(new Date())],
        includeRecords: true,
        limit: 500,
        sort: 'date',
        sortDirection: 'desc',
      },
    });

    data.lessons = lessons.filter((lesson: MoyKlassLesson) => {
      const { records, comment, status } = lesson;
      const isHasStatus = status;
      const isNoVisits = records.every(({ visit }) => !visit);
      const isNoReasonComment = !comment || !comment.trim().startsWith('#');

      return isNoVisits && isNoReasonComment && isHasStatus;
    });

    const { users } = await moyKlassAPI.get('/users', {
      params: {
        userIds: [
          ...new Set(
            data.lessons.flatMap(({ records }) => records.flatMap(({ userId }) => userId))
          ),
        ],
        limit: 500,
      },
    });

    data.users = users;

    const { classes } = await moyKlassAPI.get('/classes', {
      params: {
        classId: [...new Set(data.lessons.map(({ classId }) => classId))],
      },
    });

    data.classes = classes;


    const unmarkedLessonsTeacherIds = data.lessons.flatMap(({ teacherIds }) => teacherIds);
    const uniqueUnmarkedLessonsTeacherIds = [...new Set(unmarkedLessonsTeacherIds)];

    const managers = await moyKlassAPI.get('/managers');

    data.managers = managers.filter(({ id }: MoyKlassManager) => uniqueUnmarkedLessonsTeacherIds.includes(id));
    await moyKlassAPI.revokeToken();

    return data;
  };
}
