import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  token: string;
  username: string;
  userId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  signup(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/signup`, { username, password });
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap(res => {
        if (res && res.token) {
          localStorage.setItem('auth_token', res.token);
          localStorage.setItem('auth_username', res.username);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getUsername(): string | null {
    return localStorage.getItem('auth_username');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
