import { Group } from '../Domain/Group.js';

export interface IGroupRepository {
  findById(id: number): Promise<Group | null>;
  findAll(): Promise<Group[]>;
  save(group: Group): Promise<void>;
}
