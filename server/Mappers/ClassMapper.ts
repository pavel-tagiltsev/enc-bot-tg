import { z } from 'zod';
import { components } from '../types/moyklass-api.js';
import { Class } from '../Domain/Class.js';

type ClassDTO = components['schemas']['Class'];

const ClassDTOSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  courseId: z.number(),
});

export class ClassMapper {
  public static toDomain(dto: ClassDTO): Class {
    const validatedDTO = ClassDTOSchema.parse(dto);
    return new Class(
      validatedDTO.id,
      validatedDTO.name || 'Unnamed Class',
      validatedDTO.courseId
    );
  }
}
