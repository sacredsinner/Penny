/**
 * Exports transactions to RFC-4180 compliant CSV and triggers browser download
 */
export function exportTransactionsToCsv(transactions = []) {
  if (!transactions || transactions.length === 0) {
    alert('No transactions to export.');
    return;
  }

  const headers = [
    'Date',
    'Merchant / Payee',
    'Category',
    'Type',
    'Currency',
    'Amount',
    'Status',
    'Reference Number',
    'Source',
    'Notes'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = transactions.map(t => [
    escapeCsv(t.date),
    escapeCsv(t.merchant),
    escapeCsv(t.category),
    escapeCsv(t.type),
    escapeCsv(t.currency),
    escapeCsv(t.amount),
    escapeCsv(t.status),
    escapeCsv(t.referenceNumber || ''),
    escapeCsv(t.source || 'manual'),
    escapeCsv(t.notes || '')
  ]);

  const csvContent = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `penny-transactions-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
