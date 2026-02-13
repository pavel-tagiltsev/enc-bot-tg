import { z } from 'zod';
import { components } from '../types/moyklass-api.js';
import { User } from './User.js';

type ManagerDTO = components['schemas']['Manager'];

const ManagerDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export class UserMapper {
  public static toDomain(dto: ManagerDTO): User {
    const validatedDTO = ManagerDTOSchema.parse(dto);
    return new User(
      validatedDTO.id,
      validatedDTO.name
    );
  }
}
