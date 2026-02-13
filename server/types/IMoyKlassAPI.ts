import { paths } from './moyklass-api.js';
import { Student } from '../Domain/Student.js';
import { Invoice } from '../Domain/Invoice.js';
import { Lesson } from '../Domain/Lesson.js';
import { Group } from '../Domain/Group.js';
import { User } from '../Domain/User.js';

type GetInvoicesParams = paths['/v1/company/invoices']['get']['parameters']['query'];
type GetUsersParams = paths['/v1/company/users']['get']['parameters']['query'];
type GetLessonsParams = paths['/v1/company/lessons']['get']['parameters']['query'];
type GetClassesParams = paths['/v1/company/classes']['get']['parameters']['query'];

export interface IMoyKlassAPI {
  getInvoices(params: GetInvoicesParams): Promise<Invoice[]>;
  getUsers(params: GetUsersParams): Promise<Student[]>;
  getLessons(params: GetLessonsParams): Promise<Lesson[]>;
  getClasses(params: GetClassesParams): Promise<Group[]>;
  getManagers(): Promise<User[]>;
}
