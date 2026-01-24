import axios, { AxiosInstance, AxiosResponse } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class MoyKlassAPI {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: 'https://api.moyklass.com/v1/company',
      headers: {
        post: {
          'Content-Type': 'application/json',
        },
      },
    });
  }

  async setToken(): Promise<void> {
    const response: AxiosResponse<{ accessToken: string }> = await this.instance.post('/auth/getToken', {
      apiKey: process.env.MOY_KLASS_API_KEY,
    });
    this.instance.defaults.headers.common['x-access-token'] = response.data.accessToken;
    console.log('MoyKlassAPI.post(/auth/getToken)');
  }

  async revokeToken(): Promise<void> {
    await this.instance.post('/auth/revokeToken');
    console.log('MoyKlassAPI.post(/auth/revokeToken)');
  }

  async post(path: string, body: any = {}): Promise<any> {
    console.log(`MoyKlassAPI.post(${path})`);
    const res = await this.instance.post(path, body);
    return res.data;
  }

  async get(path: string, options: any = {}): Promise<any> {
    console.log(`MoyKlassAPI.get(${path})`);
    const res = await this.instance.get(path, options);
    return res.data;
  }
}

const moyKlassAPI = new MoyKlassAPI();
export default moyKlassAPI;