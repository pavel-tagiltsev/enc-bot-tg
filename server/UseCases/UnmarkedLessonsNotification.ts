import { moyKlassAPI } from '../config.js';
import Time from '../Helpers/Time.js';
import { Lesson } from '../Domain/Lesson.js';
import { Manager } from '../Domain/Manager.js';
import { Class } from '../Domain/Class.js';
import { User } from '../Domain/User.js';

interface UnmarkedLessonsGetData {
  lessons: Lesson[];
  managers: Manager[];
  classes: Class[];
  users: User[];
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

export interface TemplateData {
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
      (acc: TemplateData, manager: Manager) => {
        const { teachers, stats } = acc;
        const { id, name } = manager;
        const teacherLessons = lessons.filter((lesson) => lesson.teacherIds.includes(id));

        teachers.push({
          id: id,
          name: name,
          totalLessons: teacherLessons.length,
          lessons: teacherLessons.map((lesson: Lesson) => {
            const { date, beginTime, classId, records } = lesson;
            const cls = classes.find((c) => c.id === classId);
            if (!cls) {
                throw new Error(`Class with ID ${classId} not found`);
            }
            const isIndividual = cls.courseId === 0;

            const userId = isIndividual && records[0] ? records[0].userId : null;
            const user = userId ? users.find((u) => u.id === userId) : null;

            return {
              date: Time.formatYMD(date),
              beginTime,
              classId,
              className: cls.name,
              userId: user ? user.id : null,
              userName: user ? user.name : null,
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
    const allLessons = await moyKlassAPI.getLessons({
      date: ['2025-09-01', Time.formatYMD(new Date())],
      includeRecords: true,
      limit: 500,
      sort: 'date',
      sortDirection: 'desc',
    });

    const unmarkedLessons = allLessons.filter(lesson => lesson.isUnmarked);

    if (unmarkedLessons.length === 0) {
      return { lessons: [], managers: [], classes: [], users: [] };
    }
    
    const userIds = [...new Set(unmarkedLessons.flatMap((lesson) => (lesson.records || []).flatMap((record) => record.userId)))].filter(Boolean) as number[];
    const classIds = [...new Set(unmarkedLessons.map((lesson) => lesson.classId))];
    const teacherIds = [...new Set(unmarkedLessons.flatMap((lesson) => lesson.teacherIds))];
    
    const [users, classes, allManagers] = await Promise.all([
      userIds.length > 0 ? moyKlassAPI.getUsers({ userIds }) : Promise.resolve([]),
      classIds.length > 0 ? moyKlassAPI.getClasses({ classId: classIds }) : Promise.resolve([]),
      moyKlassAPI.getManagers(),
    ]);

    const managers = allManagers.filter((manager) => teacherIds.includes(manager.id));

    return { lessons: unmarkedLessons, managers, classes, users };
  };
}
