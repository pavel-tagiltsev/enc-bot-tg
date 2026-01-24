import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';
import Bottleneck from 'bottleneck';

dotenv.config();

// MoyKlass tokens are valid for 1 hour. We'll refresh a bit earlier.
const TOKEN_LIFETIME_MS = 55 * 60 * 1000; // 55 minutes

class MoyKlassAPI {
  private instance: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private limiter: Bottleneck;

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
    const response = await this.instance.post<{ accessToken: string }>('/auth/getToken', {
      apiKey: process.env.MOY_KLASS_API_KEY,
    });
    this.accessToken = response.data.accessToken;
    this.instance.defaults.headers.common['x-access-token'] = this.accessToken;
    this.tokenExpiresAt = new Date(new Date().getTime() + TOKEN_LIFETIME_MS);
    console.log('MoyKlassAPI: New token received.');
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.isTokenExpired()) {
      await this.limiter.schedule(() => this._authenticate());
    }
  }

  async post(path: string, body: any = {}): Promise<any> {
    await this.ensureAuthenticated();
    return this.limiter.schedule(async () => {
      console.log(`MoyKlassAPI.post(${path})`);
      const res = await this.instance.post(path, body);
      return res.data;
    });
  }

  async get(path: string, options: any = {}): Promise<any> {
    await this.ensureAuthenticated();
    return this.limiter.schedule(async () => {
      console.log(`MoyKlassAPI.get(${path})`);
      const res = await this.instance.get(path, options);
      return res.data;
    });
  }
}

const moyKlassAPI = new MoyKlassAPI();
export default moyKlassAPI;