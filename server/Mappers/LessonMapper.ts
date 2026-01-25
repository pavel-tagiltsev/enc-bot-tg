import { z } from 'zod';
import { components } from '../types/moyklass-api.js';
import { Lesson, LessonStatus } from '../Domain/Lesson.js';

type LessonDTO = components['schemas']['Lesson'];

const LessonDTOSchema = z.object({
  id: z.number(),
  date: z.string(),
  beginTime: z.string(),
  classId: z.number(),
  records: z.array(z.object({ visit: z.boolean().optional(), userId: z.number().optional() })).optional().default([]),
  teacherIds: z.array(z.number()).optional().default([]),
  comment: z.string().nullable().optional(),
  status: z.number().optional(),
});

export class LessonMapper {
  private static mapStatus(status: number | undefined): LessonStatus | undefined {
    if (status === 1) return 'completed';
    if (status === 0) return 'scheduled';
    return undefined;
  }

  public static toDomain(dto: LessonDTO): Lesson {
    const validatedDTO = LessonDTOSchema.parse(dto);
    return new Lesson(
      validatedDTO.id,
      new Date(validatedDTO.date),
      validatedDTO.beginTime,
      validatedDTO.classId,
      validatedDTO.records,
      validatedDTO.teacherIds,
      validatedDTO.comment ?? undefined,
      this.mapStatus(validatedDTO.status)
    );
  }
}
