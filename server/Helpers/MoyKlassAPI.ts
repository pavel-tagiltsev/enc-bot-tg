import axios, { AxiosInstance, isAxiosError } from 'axios';
import Bottleneck from 'bottleneck';
import { paths, components } from '../types/moyklass-api.js';
import {
  MoyKlassApiError,
  MoyKlassAuthError,
  MoyKlassBadRequestError,
  MoyKlassNotFoundError,
  MoyKlassRateLimitError,
  MoyKlassNetworkError,
} from './MoyKlassAPIErrors.js';
import { User } from '../Domain/User.js';
import { Invoice } from '../Domain/Invoice.js';
import { Lesson } from '../Domain/Lesson.js';
import { Class } from '../Domain/Class.js';
import { Manager } from '../Domain/Manager.js';
import { UserMapper } from '../Mappers/UserMapper.js';
import { InvoiceMapper } from '../Mappers/InvoiceMapper.js';
import { LessonMapper } from '../Mappers/LessonMapper.js';
import { ClassMapper } from '../Mappers/ClassMapper.js';
import { ManagerMapper } from '../Mappers/ManagerMapper.js';

// MoyKlass tokens are valid for 1 hour. We'll refresh a bit earlier.
const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // 55 minutes
const CACHE_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes

type GetInvoicesParams = paths['/v1/company/invoices']['get']['parameters']['query'];
type GetUsersParams = paths['/v1/company/users']['get']['parameters']['query'];
type GetLessonsParams = paths['/v1/company/lessons']['get']['parameters']['query'];
type GetClassesParams = paths['/v1/company/classes']['get']['parameters']['query'];

export default class MoyKlassAPI {
  private instance: AxiosInstance;
  private apiKey: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private limiter: Bottleneck;
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor({ apiKey }: { apiKey: string }) {
    this.apiKey = apiKey;
    this.instance = axios.create({
      baseURL: 'https://api.moyklass.com/v1/company',
      headers: {
        post: {
          'Content-Type': 'application/json',
        },
      },
    });

    // Rate limit: 5 requests per second (200ms between each)
    this.limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 200,
    });
  }

  private isTokenExpired(): boolean {
    return !this.tokenExpiresAt || this.tokenExpiresAt < new Date();
  }

  private async _authenticate(): Promise<void> {
    console.log('MoyKlassAPI: Authenticating...');
    try {
      const response = await this.instance.post<{ accessToken: string }>('/auth/getToken', {
        apiKey: this.apiKey,
      });
      this.accessToken = response.data.accessToken;
      this.instance.defaults.headers.common['x-access-token'] = this.accessToken;
      this.tokenExpiresAt = new Date(new Date().getTime() + TOKEN_LIFETIME_MS);
      console.log('MoyKlassAPI: New token received.');
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          throw new MoyKlassAuthError('Failed to authenticate with MoyKlass API. Invalid API Key.');
        }
        throw new MoyKlassApiError(`MoyKlass API error during authentication: ${error.response.status} - ${error.response.statusText}`, error.response.status);
      }
      throw new MoyKlassNetworkError('Network error or unexpected response during authentication.', error as Error);
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.isTokenExpired()) {
      await this.limiter.schedule(() => this._authenticate());
    }
  }

  private async get<T>(path: string, options: any = {}): Promise<T> {
    await this.ensureAuthenticated();

    const cacheKey = `${path}?${JSON.stringify(options)}`;
    const cachedItem = this.cache.get(cacheKey);

    if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_LIFETIME_MS)) {
      console.log(`MoyKlassAPI: Returning cached data for ${path}`);
      return cachedItem.data as T;
    }

    try {
      const result = await this.limiter.schedule(async () => {
        console.log(`MoyKlassAPI.get(${path})`);
        const res = await this.instance.get(path, options);
        return res.data;
      });
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result as T;
    } catch (error) {
      if (isAxiosError(error) && error.response) {
        switch (error.response.status) {
          case 400:
            throw new MoyKlassBadRequestError(`Bad request for ${path}: ${JSON.stringify(error.response.data)}`);
          case 401:
            throw new MoyKlassAuthError('Unauthorized access to MoyKlass API.');
          case 404:
            throw new MoyKlassNotFoundError(`Resource not found at ${path}.`);
          case 429:
            throw new MoyKlassRateLimitError('MoyKlass API rate limit exceeded.');
          default:
            throw new MoyKlassApiError(`MoyKlass API error for GET ${path}: ${error.response.status} - ${error.response.statusText}`, error.response.status);
        }
      }
      throw new MoyKlassNetworkError(`Network error or unexpected response for GET ${path}.`, error as Error);
    }
  }

  public async getInvoices(params: GetInvoicesParams): Promise<Invoice[]> {
    const response = await this.get<components['schemas']['UserInvoices']>('/invoices', { params });
    return (response.invoices || []).map((dto) => InvoiceMapper.toDomain(dto));
  }

  public async getUsers(params: GetUsersParams): Promise<User[]> {
    const response = await this.get<components['schemas']['Users']>('/users', { params });
    return (response.users || []).map((dto) => UserMapper.toDomain(dto));
  }

  public async getLessons(params: GetLessonsParams): Promise<Lesson[]> {
    const response = await this.get<components['schemas']['Lessons']>('/lessons', { params });
    return (response.lessons || []).map((dto) => LessonMapper.toDomain(dto));
  }

  public async getClasses(params: GetClassesParams): Promise<Class[]> {
    const response = await this.get<components['schemas']['Class'][]>('/classes', { params });
    return (response || []).map((dto) => ClassMapper.toDomain(dto));
  }

  public async getManagers(): Promise<Manager[]> {
    const response = await this.get<components['schemas']['Manager'][]>('/managers');
    return (response || []).map((dto) => ManagerMapper.toDomain(dto));
  }
}
