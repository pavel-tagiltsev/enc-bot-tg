import Time from './Time.js';

export default class View {
  static #HTMLEntities = {
    NEW_LINE: '\n',
  };

  static #decorElements = {
    LINE: '--------------------',
  };

  static htmlTemplate(strings, ...values) {
    const rawText = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
    const withoutIndent = rawText.replace(/^[ \t]+/gm, '');
    const multipleNewlinesPattern = `${View.#HTMLEntities.NEW_LINE}{2,}`;
    const multipleNewlinesRegex = new RegExp(multipleNewlinesPattern, 'g');
    return withoutIndent.replace(multipleNewlinesRegex, View.#HTMLEntities.NEW_LINE).trim();
  }

  static renderSubscriptionDebtNotificationTemplate(data) {
    const usersByEarliestPayUntilDesc = data.users.sort((a, b) => {
      return new Date(a.earliestPayUntil) - new Date(b.earliestPayUntil);
    });

    return View.htmlTemplate`
      <b>Отчет по задолженностям</b>
      ${View.#HTMLEntities.NEW_LINE}
      <b>Всего учеников: ${data.stats.totalUsers}</b>
      ${View.#HTMLEntities.NEW_LINE}
      <b>Общая сумма: ${data.stats.totalDebt}</b>
      ${View.#HTMLEntities.NEW_LINE}
      ${usersByEarliestPayUntilDesc
        .map((user) => {
          const fullDaysDiffConst = Time.fullDaysDiff(user.earliestPayUntil);
          const emoji =
            Math.abs(fullDaysDiffConst) > 14 ? '🔥' : Math.abs(fullDaysDiffConst) > 7 ? '⚠️' : '💰';
          const link = `https://app.moyklass.com/user/${user.id}/payments?view=invoices`;

          return `${emoji}<a href="${link}">${user.name}</a> с ${user.earliestPayUntil} на сумму ${user.totalDebt}`;
        })
        .join(View.#HTMLEntities.NEW_LINE)}
    `;
  }

  static renderUnmarkedLessonsNotificationTemplate(data) {
    const { teachers, stats } = data;
    const teachersByNameDesc = teachers.sort((a, b) => a.name - b.name);

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
            const { date, beginTime, classId, className, userId, userName } = lesson;
            const diff = Math.abs(Time.fullDaysDiff(date));
            const link = userId
              ? `https://app.moyklass.com/user/${userId}/lessons`
              : `https://app.moyklass.com/class/${classId}/lessons`;
            const limitation = diff ? `${diff} ${View.pluralize('days', diff)}` : 'сегодня';

            return `
            ${i + 1}. Просрочка: ${limitation}
            ${userName ? 'Ученик' : 'Группа'}: <a href="${link}">${userName ? userName : className}</a>
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

  static pluralize = (word, num) => {
    const forms = {
      days: ['день', 'дня', 'дней'],
    };

    if (!forms[word]) {
      return word;
    }

    const pr = new Intl.PluralRules('ru-RU');
    const pluralForm = pr.select(Math.abs(num));

    const formMap = {
      one: 0,
      few: 1,
      many: 2,
    };

    return forms[word][formMap[pluralForm]];
  };
}
