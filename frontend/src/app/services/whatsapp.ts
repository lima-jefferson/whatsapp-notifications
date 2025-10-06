import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Batch {
  id: number;
  filename: string;
  total_records: number;
  total_messages: number;
  sent: number;
  failed: number;
  pending: number;
  respostas_recebidas?: number;
  respostas_pendentes?: number;
  created_at: string;
}

export interface Message {
  id: number;
  batch_id: number;
  nome: string;
  telefone: string;
  tipo: string;
  data_agendamento: string;
  hora_agendamento: string;
  local: string;
  medico: string;
  observacao: string;
  status: string;
  message_id?: string;
  error_message?: string;
  sent_at?: string;
  status_confirmacao?: string;
  data_confirmacao?: string;
  created_at: string;
}

export interface DashboardData {
  statistics: Array<{ status: string; count: number }>;
  messages: Message[];
}

export interface UploadResponse {
  success: boolean;
  batchId: number;
  totalRecords: number;
}

export interface SendResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappService {
  private apiUrl = 'https://notifica-backend.negocios-digitais-br.online';

  constructor(private http: HttpClient) {}

  uploadBatch(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadResponse>(`${this.apiUrl}/upload`, formData);
  }

  getBatches(): Observable<Batch[]> {
    return this.http.get<Batch[]>(`${this.apiUrl}/batches`);
  }

  getDashboard(batchId: number): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.apiUrl}/dashboard/${batchId}`);
  }

  sendBatch(batchId: number): Observable<SendResponse> {
    return this.http.post<SendResponse>(`${this.apiUrl}/batch/${batchId}/send`, {});
  }

  exportBatch(batchId: number): string {
    return `${this.apiUrl}/batch/${batchId}/export`;
  }
}
