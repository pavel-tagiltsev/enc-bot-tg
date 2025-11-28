export default class Time {
  static formatYMD(date) {
    return date.toISOString().split('T')[0];
  }

  static fullDaysDiff(date) {
    const today = new Date();
    const d = new Date(date);

    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const utcDate = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

    return Math.floor((utcDate - utcToday) / (1000 * 60 * 60 * 24));
  }
}
