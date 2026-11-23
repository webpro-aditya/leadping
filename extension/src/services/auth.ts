// ============================================================
// Auth service — login / register / logout with token storage
// ============================================================

import { loginUser, registerUser, logoutUser, fetchUser } from './api';
import {
  setAuthToken,
  removeAuthToken,
  getAuthToken,
  setStoredUser,
  removeStoredUser,
} from './storage';
import type { User } from '../types';

export async function login(
  email: string,
  password: string
): Promise<User> {
  const response = await loginUser(email, password);
  await setAuthToken(response.data.token);
  await setStoredUser(response.data.user);
  return response.data.user;
}

export async function register(
  name: string,
  email: string,
  password: string,
  password_confirmation: string
): Promise<User> {
  const response = await registerUser(name, email, password, password_confirmation);
  await setAuthToken(response.data.token);
  await setStoredUser(response.data.user);
  return response.data.user;
}

export async function logout(): Promise<void> {
  try {
    await logoutUser();
  } catch {
    // Even if the API call fails, clear local storage
  }
  await removeAuthToken();
  await removeStoredUser();
}

export async function getCurrentUser(): Promise<User | null> {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const response = await fetchUser();
    await setStoredUser(response.data);
    return response.data;
  } catch {
    // Token might be expired
    await removeAuthToken();
    await removeStoredUser();
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}
