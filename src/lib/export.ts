export function exportToCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escapeCsv = (str: string | number | null | undefined) => {
    if (str === null || str === undefined) return '';
    const text = String(str).replace(/"/g, '""');
    return `"${text}"`;
  };

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(','))
  ].join('\n');

  // Add BOM for Excel UTF-8 compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
