import { Lesson } from './Lesson.js';
import { ILessonRepository } from './ILessonRepository.js';
import { IMoyKlassAPI } from '../types/IMoyKlassAPI.js';
import Time from '../Helpers/Time.js';

export class LessonRepository implements ILessonRepository {
  constructor(private readonly moyKlassAPI: IMoyKlassAPI) {}

  async findBetween(startDate: Date, endDate: Date): Promise<Lesson[]> {
    return this.moyKlassAPI.getLessons({
      date: [Time.formatYMD(startDate), Time.formatYMD(endDate)],
      includeRecords: true,
      limit: 500,
      sort: 'date',
      sortDirection: 'desc',
    });
  }
}
