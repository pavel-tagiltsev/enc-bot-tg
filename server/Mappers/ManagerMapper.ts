import { z } from 'zod';
import { components } from '../types/moyklass-api.js';
import { Manager } from '../Domain/Manager.js';

type ManagerDTO = components['schemas']['Manager'];

const ManagerDTOSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export class ManagerMapper {
  public static toDomain(dto: ManagerDTO): Manager {
    const validatedDTO = ManagerDTOSchema.parse(dto);
    return new Manager(
      validatedDTO.id,
      validatedDTO.name
    );
  }
}
