import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CONFIG } from '../config';

interface LoginResponse {
  token: string;
  username: string;
  expiresIn: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'auth_token';
  private usernameKey = 'username';
  private expirationKey = 'token_expiration';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${CONFIG.apiUrl}/login`, { username, password })
      .pipe(
        tap(response => {
          const expirationTime = Date.now() + (8 * 60 * 60 * 1000); // 8 horas em ms
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem(this.usernameKey, response.username);
          localStorage.setItem(this.expirationKey, expirationTime.toString());
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.usernameKey);
    localStorage.removeItem(this.expirationKey);
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    if (!this.isTokenValid()) {
      this.logout();
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }

  getUsername(): string | null {
    return localStorage.getItem(this.usernameKey);
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  checkAuthenticated(): boolean {
    return this.hasValidToken();
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  private isTokenValid(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    const expiration = localStorage.getItem(this.expirationKey);
    
    if (!token || !expiration) {
      return false;
    }

    const expirationTime = parseInt(expiration, 10);
    const now = Date.now();

    return now < expirationTime;
  }

  private hasValidToken(): boolean {
    return this.hasToken() && this.isTokenValid();
  }
}