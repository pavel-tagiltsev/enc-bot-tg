import { z } from 'zod';
import { components } from '../types/moyklass-api.js';
import { User } from '../Domain/User.js';

type UserDTO = components['schemas']['User'];

const UserDTOSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
});

export class UserMapper {
  public static toDomain(dto: UserDTO): User {
    const validatedDTO = UserDTOSchema.parse(dto);
    return new User(
      validatedDTO.id,
      validatedDTO.name || 'Unknown'
    );
  }
}
