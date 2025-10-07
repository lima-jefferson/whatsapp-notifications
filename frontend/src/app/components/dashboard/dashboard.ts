import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { CONFIG } from '../../config';

interface Batch {
  id: number;
  filename: string;
  total_records: number;
  total_messages: number;
  sent: number;
  failed: number;
  pending: number;
  respostas_recebidas: number;
  respostas_pendentes: number;
  created_at: string;
}

interface Message {
  id: number;
  nome: string;
  telefone: string;
  tipo: string;
  status: string;
  sent_at: string;
  error_message?: string;
  status_confirmacao?: string;
  data_confirmacao?: string;
}

interface DashboardData {
  statistics: { status: string; count: number }[];
  messages: Message[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private apiUrl = CONFIG.apiUrl;

  batches: Batch[] = [];
  selectedBatchId: number | null = null;
  dashboardData: DashboardData | null = null;

  uploadProgress = 0;
  isUploading = false;
  sendingBatchId: number | null = null;

  private refreshSubscription?: Subscription;
  private batchesRefreshSubscription?: Subscription;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadBatches();
    
    // Atualiza a lista de lotes a cada 3 segundos
    this.batchesRefreshSubscription = interval(3000).subscribe(() => {
      // Verifica se ainda está autenticado
      if (!this.authService.checkAuthenticated()) {
        alert('Sessão expirada. Faça login novamente.');
        this.logout();
        return;
      }
      this.loadBatches();
    });
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    if (this.batchesRefreshSubscription) {
      this.batchesRefreshSubscription.unsubscribe();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getUsername(): string {
    return this.authService.getUsername() || 'Usuário';
  }

  loadBatches(): void {
    this.http.get<Batch[]>(`${this.apiUrl}/batches`).subscribe({
      next: (data) => {
        this.batches = data;
        
        // Se houver um lote selecionado, atualiza o dashboard também
        if (this.selectedBatchId) {
          this.loadDashboard(this.selectedBatchId);
        }
      },
      error: (err) => {
        console.error('Erro ao carregar lotes:', err);
        // Não mostra alert em atualizações automáticas para não incomodar o usuário
        if (this.batches.length === 0) {
          alert('Erro ao carregar lotes');
        }
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    this.isUploading = true;

    this.http.post<{ success: boolean; batchId: number; totalRecords: number }>(
      `${this.apiUrl}/upload`,
      formData
    ).subscribe({
      next: (response) => {
        this.isUploading = false;
        alert(`Arquivo importado com sucesso! ${response.totalRecords} registros carregados.`);
        this.loadBatches();
        this.selectBatch(response.batchId);
      },
      error: (err) => {
        this.isUploading = false;
        console.error('Erro no upload:', err);
        alert('Erro ao fazer upload do arquivo');
      }
    });
  }

  selectBatch(batchId: number): void {
    this.selectedBatchId = batchId;
    this.loadDashboard(batchId);

    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }

    // Atualização independente do dashboard não é mais necessária
    // pois será atualizado junto com loadBatches()
  }

  loadDashboard(batchId: number): void {
    this.http.get<DashboardData>(`${this.apiUrl}/dashboard/${batchId}`).subscribe({
      next: (data) => {
        this.dashboardData = data;
      },
      error: (err) => {
        console.error('Erro ao carregar dashboard:', err);
      }
    });
  }

  sendBatch(batchId: number): void {
    if (!confirm('Deseja iniciar o envio das mensagens?')) return;

    this.sendingBatchId = batchId;

    this.http.post(`${this.apiUrl}/batch/${batchId}/send`, {}).subscribe({
      next: () => {
        alert('Envio iniciado! As mensagens estão sendo processadas.');

        setTimeout(() => {
          this.loadBatches();
          this.sendingBatchId = null;
        }, 2000);
      },
      error: (err) => {
        this.sendingBatchId = null;
        console.error('Erro ao enviar:', err);
        alert('Erro ao iniciar envio');
      }
    });
  }

  exportBatch(batchId: number): void {
    this.http.get(`${this.apiUrl}/batch/${batchId}/export`, {
      responseType: 'text',
      observe: 'response'
    }).subscribe({
      next: (response) => {
        const blob = new Blob([response.body || ''], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `retorno_lote_${batchId}.txt`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Erro ao exportar:', err);
        alert('Erro ao exportar arquivo');
      }
    });
  }

  getStatistic(status: string): number {
    if (!this.dashboardData) return 0;
    const stat = this.dashboardData.statistics.find(s => s.status === status);
    return stat ? Number(stat.count) : 0;
  }

  getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  getTotalMessages(): number {
    if (!this.dashboardData) return 0;
    return this.dashboardData.statistics.reduce((sum, stat) => sum + Number(stat.count), 0);
  }

  formatDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR');
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'PENDENTE': 'bg-yellow-100 text-yellow-800',
      'ENVIADO': 'bg-green-100 text-green-800',
      'FALHA': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getConfirmationCount(type: string): number {
    if (!this.dashboardData) return 0;
    return this.dashboardData.messages.filter(m =>
      m.status_confirmacao && m.status_confirmacao.toUpperCase().includes(type.toUpperCase())
    ).length;
  }

  getSemResposta(): number {
    if (!this.dashboardData) return 0;
    return this.dashboardData.messages.filter(m =>
      m.status === 'ENVIADO' && !m.status_confirmacao
    ).length;
  }

  getConfirmationLabel(status: string): string {
    if (!status) return '-';
    const statusUpper = status.toUpperCase();
    if (statusUpper.includes('CONFIRMAR')) return 'Confirmou';
    if (statusUpper.includes('CANCELAR')) return 'Cancelou';
    if (statusUpper.includes('REAGENDAR')) return 'Reagendar';
    return status;
  }
}