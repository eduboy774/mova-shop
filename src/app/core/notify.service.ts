import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class NotifyService {
    private readonly isDark = () => document.body.classList.contains('dark');

    success(message: string) {
        this.toast(message, 'success');
    }

    error(message: string) {
        this.toast(message, 'error');
    }

    /** Uses Vristo's coloured toast styles (white text on a coloured background). */
    toast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            title: message,
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            customClass: { popup: `color-${type === 'error' ? 'danger' : type}` },
        });
    }

    async confirm(title: string, text = '', confirmText = 'Yes, continue', danger = true): Promise<boolean> {
        const result = await Swal.fire({
            title,
            text,
            icon: danger ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: 'Cancel',
            confirmButtonColor: danger ? '#e7515a' : '#7209b7',
            cancelButtonColor: '#888ea8',
            reverseButtons: true,
            focusCancel: danger,
            background: this.isDark() ? '#1b2e4b' : '#fff',
            color: this.isDark() ? '#e0e6ed' : '#0e1726',
        });
        return result.isConfirmed;
    }
}
