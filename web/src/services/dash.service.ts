import { api, request } from './api';
import type { ApiResponse, DashDados } from './types';

export const dashService = {
  async obter(): Promise<ApiResponse<DashDados>> {
    return request(api.get<ApiResponse<DashDados>>('/dash'));
  },
};
