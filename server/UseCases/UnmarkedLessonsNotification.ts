import { moyKlassAPI } from '../config.js';
import Time from '../Helpers/Time.js';
import { Lesson } from '../Domain/Lesson.js';
import { User } from '../Domain/User.js';
import { Group } from '../Domain/Group.js';
import { Student } from '../Domain/Student.js';

interface UnmarkedLessonsGetData {
  lessons: Lesson[];
  users: User[];
  groups: Group[];
  students: Student[];
}

interface TemplateTeacherLesson {
  date: string;
  beginTime: string;
  groupId: number;
  groupName: string;
  studentId: number | null;
  studentName: string | null;
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
    const { lessons, users, groups, students }: UnmarkedLessonsGetData = await this.getData();

    const templateData: TemplateData = users.reduce(
      (acc: TemplateData, user: User) => {
        const { teachers, stats } = acc;
        const { id, name } = user;
        const teacherLessons = lessons.filter((lesson) => lesson.teacherIds.includes(id));

        teachers.push({
          id: id,
          name: name,
          totalLessons: teacherLessons.length,
          lessons: teacherLessons.map((lesson: Lesson) => {
            const { date, beginTime, groupId, records } = lesson;
            const group = groups.find(({ id }) => id === groupId);
            if (!group) {
                throw new Error(`Group with ID ${groupId} not found`);
            }
            const isIndividual = group.courseId === 0;

            const studentId = isIndividual && records[0] ? records[0].studentId : null;
            const student = studentId ? students.find((s) => s.id === studentId) : null;

            return {
              date: Time.formatYMD(date),
              beginTime,
              groupId,
              groupName: group.name,
              studentId: student ? student.id : null,
              studentName: student ? student.name : null,
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
      return { lessons: [], users: [], groups: [], students: [] };
    }

    const studentIds = [...new Set(unmarkedLessons.flatMap((lesson) => (lesson.records || []).flatMap((record) => record.studentId)))].filter(Boolean) as number[];
    const groupIds = [...new Set(unmarkedLessons.map((lesson) => lesson.groupId))];
    const teacherIds = [...new Set(unmarkedLessons.flatMap((lesson) => lesson.teacherIds))];

    const [students, groups, allManagers] = await Promise.all([
      studentIds.length > 0 ? moyKlassAPI.getUsers({ userIds: studentIds }) : Promise.resolve([]),
      groupIds.length > 0 ? moyKlassAPI.getClasses({ classId: groupIds }) : Promise.resolve([]),
      moyKlassAPI.getManagers(),
    ]);

    const users = allManagers.filter((manager) => teacherIds.includes(manager.id));

    return { lessons: unmarkedLessons, users, groups, students };
  };
}
