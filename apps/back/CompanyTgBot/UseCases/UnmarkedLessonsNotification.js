import moyKlassAPI from '../Helpers/MoyKlassAPI.js';
import Time from '../Helpers/Time.js';

export default class UnmarkedLessonsNotification {
  static execute = async (send) => {
    const { lessons, managers, classes, users } = await this.getData();

    const templateData = managers.reduce(
      (acc, manager) => {
        const { teachers, stats } = acc;
        const { id, name } = manager;
        const teacherLessons = lessons.filter(({ teacherIds }) => teacherIds.includes(id));

        teachers.push({
          id,
          name,
          totalLessons: teacherLessons.length,
          lessons: teacherLessons.map((lesson) => {
            const { date, beginTime, classId, records } = lesson;
            const cls = classes.find(({ id }) => id === classId);
            const isIndividual = cls.courseId === 0;

            return {
              date,
              beginTime,
              classId: classId,
              className: cls.name,
              userId: isIndividual ? records[0].userId : null,
              userName: isIndividual ? users.find(({ id }) => id === records[0].userId).name : null,
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

  static getData = async () => {
    let data = {};

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

    data.lessons = lessons.filter((lesson) => {
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

    data.classes = await moyKlassAPI.get('/classes', {
      params: {
        classId: [...new Set(data.lessons.map(({ classId }) => classId))],
      },
    });

    const unmarkedLessonsTeacherIds = data.lessons.flatMap(({ teacherIds }) => teacherIds);
    const uniqueUnmarkedLessonsTeacherIds = [...new Set(unmarkedLessonsTeacherIds)];

    const managers = await moyKlassAPI.get('/managers');

    data.managers = managers.filter(({ id }) => uniqueUnmarkedLessonsTeacherIds.includes(id));
    await moyKlassAPI.revokeToken();

    return data;
  };
}
