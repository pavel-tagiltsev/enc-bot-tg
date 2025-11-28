import Time from './Time.js';

export default class View {
  static #HTMLEntities = {
    NEW_LINE: '\n'
  }

  static #htmlTemplate(strings, ...values) {
    const rawText = strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
    const withoutIndent = rawText.replace(/^[ \t]+/gm, "");
    const multipleNewlinesPattern = `${this.#HTMLEntities.NEW_LINE}{2,}`;
    const multipleNewlinesRegex = new RegExp(multipleNewlinesPattern, "g");
    return withoutIndent.replace(multipleNewlinesRegex, this.#HTMLEntities.NEW_LINE).trim();
  }

  static renderSubscriptionDebtNotificationTemplate(data) {
    const usersByEarliestPayUntilDesc = data.users.sort((a, b) => {
      return new Date(a.earliestPayUntil) - new Date(b.earliestPayUntil);
    });

    return this.#htmlTemplate`
      <b>Отчет по задолженностям</b>
      ${this.#HTMLEntities.NEW_LINE}
      <b>Всего учеников: ${data.stats.totalUsers}</b>
      ${this.#HTMLEntities.NEW_LINE}
      <b>Общая сумма: ${data.stats.totalDebt}</b>
      ${this.#HTMLEntities.NEW_LINE}
      ${usersByEarliestPayUntilDesc.map((user) => {
        const fullDaysDiffConst = Time.fullDaysDiff(user.earliestPayUntil);
        const emoji = Math.abs(fullDaysDiffConst) > 14 ? '🔥' : Math.abs(fullDaysDiffConst) > 7  ? '⚠️' : '💰';
        const link = `https://app.moyklass.com/user/${user.id}/payments?view=invoices`;

        return `${emoji}<a href="${link}">${user.name}</a> с ${user.earliestPayUntil} на сумму ${user.totalDebt}`;
      }).join(this.#HTMLEntities.NEW_LINE)}
    `;
  }
}
