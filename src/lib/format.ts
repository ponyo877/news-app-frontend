import dayjs from 'dayjs';

// 旧版: DateFormat("yyyy-MM-ddTHH:mm:ssZ")でUTCパース→toLocal→"yyyy-MM-dd HH:mm:ss"表示
export function formatDateTime(iso: string): string {
  if (!iso) {
    return '';
  }
  const d = dayjs(iso);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : '';
}
