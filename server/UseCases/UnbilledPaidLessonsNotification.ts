import { Lesson } from '../Lesson/Lesson.js';
import { Student } from '../Student/Student.js';
import { ILessonRepository } from '../Lesson/ILessonRepository.js';
import { IStudentRepository } from '../Student/IStudentRepository.js';

interface TemplateStudent {
  id: number;
  name: string;
}

export interface TemplateData {
  students: TemplateStudent[];
  stats: {
    totalStudents: number;
  };
}

export default class UnbilledPaidLessonsNotification {
  constructor(
    private readonly lessonRepository: ILessonRepository,
    private readonly studentRepository: IStudentRepository
  ) {}

  public execute = async (send: (data: TemplateData) => void): Promise<void> => {
    const { lessons, students } = await this.getData();

    const templateData: TemplateData = {
      students: students.map((student: Student) => ({
        id: student.id,
        name: student.name,
      })),
      stats: {
        totalStudents: students.length,
      },
    };

    send(templateData);
  };

  private getData = async (): Promise<{ lessons: Lesson[]; students: Student[] }> => {
    const allLessons = await this.lessonRepository.findBetween(new Date('2025-09-01'), new Date());

    const lessonsWithUnbilledPaid = allLessons.filter(
      (lesson) => lesson.unbilledPaidRecords.length > 0
    );

    if (lessonsWithUnbilledPaid.length === 0) {
      return { lessons: [], students: [] };
    }

    const studentIds = [
      ...new Set(
        lessonsWithUnbilledPaid.flatMap((lesson) =>
          lesson.unbilledPaidRecords.flatMap((record) => record.studentId)
        )
      ),
    ].filter(Boolean) as number[];

    const students = await this.studentRepository.findByIds(studentIds);

    return { lessons: lessonsWithUnbilledPaid, students };
  };
}