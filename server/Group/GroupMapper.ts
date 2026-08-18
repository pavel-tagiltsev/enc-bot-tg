import { z } from 'zod';
import { components } from '../types/moyklass-api.js';
import { Group } from './Group.js';

type ClassDTO = components['schemas']['Class'];

const ClassDTOSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  courseId: z.number(),
});

export class GroupMapper {
  public static toDomain(dto: ClassDTO): Group {
    const validatedDTO = ClassDTOSchema.parse(dto);
    return new Group(
      validatedDTO.id,
      validatedDTO.name || 'Unnamed Group',
      validatedDTO.courseId
    );
  }
}
