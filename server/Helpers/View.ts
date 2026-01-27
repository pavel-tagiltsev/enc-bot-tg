import Time from './Time.js';

interface Student {
  earliestPayUntil: string;
  id: number;
  name: string;
  totalDebt: number;
}

interface SubscriptionDebtData {
  students: Student[];
  stats: {
    totalStudents: number;
    totalDebt: number;
  };
}

interface Lesson {
  date: string;
  beginTime: string;
  groupId: number;
  groupName: string;
  studentId?: number;
  studentName?: string;
}

interface Teacher {
  lessons: Lesson[];
  name: string;
}

interface UnmarkedLessonsData {
  teachers: Teacher[];
  stats: {
    totalTeachers: number;
    totalLessons: number;
  };
}


export default class View {
  static #HTMLEntities = {
    NEW_LINE: '\n',
  };

  static #decorElements = {
    LINE: '--------------------',
  };

  static htmlTemplate(strings: TemplateStringsArray, ...values: any[]): string {
    const rawText = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
    const withoutIndent = rawText.replace(/^[ \t]+/gm, '');
    const multipleNewlinesPattern = `${View.#HTMLEntities.NEW_LINE}{2,}`;
    const multipleNewlinesRegex = new RegExp(multipleNewlinesPattern, 'g');
    return withoutIndent.replace(multipleNewlinesRegex, View.#HTMLEntities.NEW_LINE).trim();
  }

  static renderSubscriptionDebtNotificationTemplate(data: SubscriptionDebtData): string {
    const studentsByEarliestPayUntilDesc = data.students.sort((a, b) => {
      return new Date(a.earliestPayUntil).getTime() - new Date(b.earliestPayUntil).getTime();
    });

    return View.htmlTemplate`
      <b>Отчет по задолженностям</b>
      ${View.#HTMLEntities.NEW_LINE}
      <b>Всего учеников: ${data.stats.totalStudents}</b>
      ${View.#HTMLEntities.NEW_LINE}
      <b>Общая сумма: ${data.stats.totalDebt}</b>
      ${View.#HTMLEntities.NEW_LINE}
      ${studentsByEarliestPayUntilDesc
        .map((student) => {
          const fullDaysDiffConst = Time.fullDaysDiff(student.earliestPayUntil);
          const emoji =
            Math.abs(fullDaysDiffConst) > 14 ? '🔥' : Math.abs(fullDaysDiffConst) > 7 ? '⚠️' : '💰';
          const link = `https://app.moyklass.com/user/${student.id}/payments?view=invoices`;

          return `${emoji}<a href="${link}">${student.name}</a> с ${student.earliestPayUntil} на сумму ${student.totalDebt}`;
        })
        .join(View.#HTMLEntities.NEW_LINE)}
    `;
  }

  static renderUnmarkedLessonsNotificationTemplate(data: UnmarkedLessonsData): string {
    const { teachers, stats } = data;
    const teachersByNameDesc = teachers.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    return View.htmlTemplate`
      <b>Отчет по неотмеченным урокам</b>
      ${View.#HTMLEntities.NEW_LINE}
      <b>Всего учителей: ${stats.totalTeachers}</b>
      ${View.#HTMLEntities.NEW_LINE}
      <b>Всего занятий: ${stats.totalLessons}</b>
      ${View.#HTMLEntities.NEW_LINE}
      ${View.#decorElements.LINE}
      ${teachersByNameDesc
        .map((teacher, index) => {
          const { lessons, name } = teacher;
          const isLastTeacher = stats.totalTeachers === index + 1;

          const lessonsList = lessons.map((lesson, i) => {
            const { date, beginTime, groupId, groupName, studentId, studentName } = lesson;
            const diff = Math.abs(Time.fullDaysDiff(date));
            const link = studentId
              ? `https://app.moyklass.com/user/${studentId}/lessons`
              : `https://app.moyklass.com/class/${groupId}/lessons`;
            const limitation = diff ? `${diff} ${View.pluralize('days', diff)}` : 'сегодня';

            return `
            ${i + 1}. Просрочка: ${limitation}
            ${studentName ? 'Ученик' : 'Группа'}: <a href="${link}">${studentName ? studentName : groupName}</a>
            Время: ${new Date(date).toLocaleDateString('ru-RU')}, ${beginTime}
            ${View.#HTMLEntities.NEW_LINE}
          `;
          });

          return `
          ${name}:
          ${View.#HTMLEntities.NEW_LINE}
          ${lessonsList.join(View.#HTMLEntities.NEW_LINE)}
          ${isLastTeacher ? '' : View.#decorElements.LINE}
        `;
        })
        .join(View.#HTMLEntities.NEW_LINE)}
    `;
  }

  static pluralize = (word: string, num: number): string => {
    const forms: { [key: string]: string[] } = {
      days: ['день', 'дня', 'дней'],
    };

    if (!forms[word]) {
      return word;
    }

    const pr = new Intl.PluralRules('ru-RU');
    const pluralForm = pr.select(Math.abs(num));

    const formMap: { [key: string]: number } = {
      one: 0,
      few: 1,
      many: 2,
    };

    return forms[word][formMap[pluralForm]];
  };
}