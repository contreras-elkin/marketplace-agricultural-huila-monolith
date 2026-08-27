import { apiGet, apiPost, apiPut } from '../api/client';
import type { Role } from './types';

export interface TokenResponse {
  token: string;
  expiresAt: string;
  userId: string;
  name: string;
  role: Role;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return apiPost<TokenResponse>('/api/auth/login', { email, password });
}

export function register(name: string, email: string, password: string, role: Role): Promise<UserResponse> {
  return apiPost<UserResponse>('/api/auth/register', { name, email, password, role });
}

export interface FarmProfile {
  department: string;
  municipality: string;
  village: string;
  farmName: string;
  updatedAt: string;
}

export type FarmProfileInput = Omit<FarmProfile, 'updatedAt'>;

export function getFarmProfile(token: string): Promise<FarmProfile> {
  return apiGet<FarmProfile>('/api/auth/farm-profile', token);
}

export function saveFarmProfile(token: string, input: FarmProfileInput): Promise<FarmProfile> {
  return apiPut<FarmProfile>('/api/auth/farm-profile', input, token);
}
