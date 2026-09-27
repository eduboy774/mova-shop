export function uid(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Round to 2 decimals to avoid floating point drift in money math. */
export function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function padNumber(value: number, length = 5): string {
    return String(value).padStart(length, '0');
}

export function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

export function addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

/** yyyy-mm-dd in local time, used for <input type="date"> and day buckets. */
export function toDateKey(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromDateKey(key: string): Date {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
}

export function inRange(iso: string, from: Date, to: Date): boolean {
    const t = new Date(iso).getTime();
    return t >= from.getTime() && t <= to.getTime();
}

export function downloadFile(filename: string, content: string, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function toCsv(rows: (string | number)[][]): string {
    return rows
        .map((row) =>
            row
                .map((cell) => {
                    const s = String(cell ?? '');
                    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                })
                .join(','),
        )
        .join('\n');
}

/** Resize an uploaded image to a small JPEG data URL so it fits comfortably in localStorage. */
export function resizeImage(file: File, maxSize = 320): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('Invalid image'));
            img.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
}
