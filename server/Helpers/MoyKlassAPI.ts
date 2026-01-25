import axios, { AxiosInstance, isAxiosError } from 'axios';
import dotenv from 'dotenv';
import Bottleneck from 'bottleneck';
import { paths, components } from '../types/moyklass-api.js';
import {
  MoyKlassApiError,
  MoyKlassAuthError,
  MoyKlassBadRequestError,
  MoyKlassNotFoundError,
  MoyKlassRateLimitError,
  MoyKlassNetworkError,
} from './MoyKlassAPIErrors.js'; // Note the .js extension

dotenv.config();

// MoyKlass tokens are valid for 1 hour. We'll refresh a bit earlier.
const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // 55 minutes
const CACHE_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes

type GetInvoicesParams = paths['/v1/company/invoices']['get']['parameters']['query'];
type GetUsersParams = paths['/v1/company/users']['get']['parameters']['query'];
type GetLessonsParams = paths['/v1/company/lessons']['get']['parameters']['query'];
type GetClassesParams = paths['/v1/company/classes']['get']['parameters']['query'];

class MoyKlassAPI {
  private instance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private limiter: Bottleneck;
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor() {
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
        apiKey: process.env.MOY_KLASS_API_KEY,
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

  private async post(path: string, body: any = {}): Promise<any> {
    await this.ensureAuthenticated();
    try {
      const result = await this.limiter.schedule(async () => {
        console.log(`MoyKlassAPI.post(${path})`);
        const res = await this.instance.post(path, body);
        return res.data;
      });
      // Invalidate cache on any POST request as a simple strategy
      this.cache.clear();
      console.log('MoyKlassAPI: Cache cleared due to POST request.');
      return result;
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
            throw new MoyKlassApiError(`MoyKlass API error for POST ${path}: ${error.response.status} - ${error.response.statusText}`, error.response.status);
        }
      }
      throw new MoyKlassNetworkError(`Network error or unexpected response for POST ${path}.`, error as Error);
    }
  }

  private async get(path: string, options: any = {}): Promise<any> {
    await this.ensureAuthenticated();

    const cacheKey = `${path}?${JSON.stringify(options)}`;
    const cachedItem = this.cache.get(cacheKey);

    if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_LIFETIME_MS)) {
      console.log(`MoyKlassAPI: Returning cached data for ${path}`);
      return cachedItem.data;
    }

    try {
      const result = await this.limiter.schedule(async () => {
        console.log(`MoyKlassAPI.get(${path})`);
        const res = await this.instance.get(path, options);
        return res.data;
      });
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
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

  public async getInvoices(params: GetInvoicesParams): Promise<components['schemas']['UserInvoices']> {
    return this.get('/invoices', { params });
  }

  public async getUsers(params: GetUsersParams): Promise<components['schemas']['Users']> {
    return this.get('/users', { params });
  }

  public async getLessons(params: GetLessonsParams): Promise<components['schemas']['Lessons']> {
    return this.get('/lessons', { params });
  }

  public async getClasses(params: GetClassesParams): Promise<components['schemas']['Class'][]> {
    return this.get('/classes', { params });
  }

  public async getManagers(): Promise<components['schemas']['Manager'][]> {
    return this.get('/managers');
  }
}

const moyKlassAPI = new MoyKlassAPI();
export default moyKlassAPI;
