import moyKlassAPI from '../Helpers/MoyKlassAPI.js';
import Time from '../Helpers/Time.js';
import type { components } from '../types/moyklass-api.js';

type MoyKlassLessonRecord = components['schemas']['LessonRecord'];

type MoyKlassLesson = components['schemas']['Lesson'];

type MoyKlassManager = components['schemas']['Manager'];

type MoyKlassClass = components['schemas']['Class'];

type MoyKlassUser = components['schemas']['User'];

type UnmarkedLessonsGetData = {
  lessons: MoyKlassLesson[];
  managers: MoyKlassManager[];
  classes: MoyKlassClass[];
  users: MoyKlassUser[];
};

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
      (acc: TemplateData, manager: MoyKlassManager) => {
        const { teachers, stats } = acc;
        const { id, name } = manager;
        const teacherLessons: MoyKlassLesson[] = lessons.filter(({ teacherIds }) => teacherIds && teacherIds.includes(id!));

        teachers.push({
          id: id!,
          name,
          totalLessons: teacherLessons.length,
          lessons: teacherLessons.map((lesson: MoyKlassLesson) => {
            const { date, beginTime, classId, records } = lesson;
            const cls = classes.find(({ id: classIdInClasses }) => classIdInClasses === classId);
            if (!cls) {
                throw new Error(`Class with ID ${classId} not found`);
            }
            const isIndividual = cls.courseId === 0;

            const userId = isIndividual && records?.[0] ? records[0].userId : null;
            const userName = userId ? users.find(({ id: userIdInUsers }) => userIdInUsers === userId)?.name || null : null;


            return {
              date,
              beginTime,
              classId: classId,
              className: cls.name ?? 'N/A',
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
    const data: UnmarkedLessonsGetData = {
      lessons: [],
      managers: [],
      classes: [],
      users: [],
    };

    const { lessons } = await moyKlassAPI.getLessons({
      date: ['2025-09-01', Time.formatYMD(new Date())],
      includeRecords: true,
      limit: 500,
      sort: 'date',
      sortDirection: 'desc',
    });

    data.lessons = (lessons || []).filter((lesson: MoyKlassLesson) => {
      const { records, comment, status } = lesson;
      const isHasStatus = status;
      const isNoVisits = (records || []).every((record: MoyKlassLessonRecord) => !record.visit);
      const isNoReasonComment = !comment || !comment.trim().startsWith('#');

      return isNoVisits && isNoReasonComment && isHasStatus;
    });

    const { users } = await moyKlassAPI.getUsers({
      userIds: [
        ...new Set(
          data.lessons.flatMap((lesson) => (lesson.records || []).flatMap((record: MoyKlassLessonRecord) => record.userId))
        ),
      ],
      limit: 500,
    });

    data.users = users || [];

    data.classes = await moyKlassAPI.getClasses({
      classId: [...new Set(data.lessons.map(({ classId }) => classId))],
    });

    const unmarkedLessonsTeacherIds = data.lessons.flatMap(({ teacherIds }) => teacherIds);
    const uniqueUnmarkedLessonsTeacherIds = [...new Set(unmarkedLessonsTeacherIds)];

    const managers = await moyKlassAPI.getManagers();

    data.managers = managers.filter(({ id }: MoyKlassManager) => uniqueUnmarkedLessonsTeacherIds.includes(id));

    return data;
  };
}
