import { z } from 'zod';
import { components } from '../types/moyklass-api.js';
import { Student } from './Student.js';

type UserDTO = components['schemas']['User'];

const UserDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export class StudentMapper {
  public static toDomain(dto: UserDTO): Student {
    const validatedDTO = UserDTOSchema.parse(dto);
    return new Student(
      validatedDTO.id,
      validatedDTO.name
    );
  }
}
