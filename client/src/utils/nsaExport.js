// Builds the NSA workbook in the company template: blue header row, light-blue banded rows,
// one row per employee per date worked. Loaded on demand so exceljs stays out of the main bundle.
const HEADERS = [
  'Emp No.', 'Email ID', 'Name', 'Business', 'Offering Portfolio', 'Service Offering', 'Project Name',
  'Project/ Client WBS', 'Type of Allowance', 'Total Amount (INR)', 'Date Worked(MM/DD/YYYY)', 'Remarks (Optional)',
];
const WIDTHS = [14.5, 28.1, 26, 20, 18, 20, 18, 26, 40, 18, 22, 18];

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' }, bgColor: { argb: 'FF4472C4' } };
const BAND_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' }, bgColor: { argb: 'FFD9E1F2' } };

// "04/03/2026" -> a real date cell value (UTC midnight, so the day never shifts).
function toDate(mmddyyyy) {
  const [m, d, y] = mmddyyyy.split('/').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export async function downloadNsaWorkbook(nsaRows, filename) {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');

  ws.addRow(HEADERS);
  ws.columns.forEach((col, i) => { col.width = WIDTHS[i]; });
  const header = ws.getRow(1);
  header.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  });

  let n = 0;
  for (const r of nsaRows) {
    const dates = r.date_worked ? r.date_worked.split(', ') : [];
    const perDay = dates.length ? r.total_amount / dates.length : 0;
    const code = r.employee_code ?? '';
    for (const date of dates) {
      const row = ws.addRow([
        /^\d+$/.test(code) ? Number(code) : code,
        r.email_id, r.name, r.business, r.offering_portfolio, r.service_offering,
        r.project_name, r.project_wbs, r.type_of_allowance, perDay, toDate(date), null,
      ]);
      const banded = n % 2 === 0; // first data row is shaded, then every other row
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Calibri', size: 11 };
        if (banded) cell.fill = BAND_FILL;
      });
      row.getCell(1).alignment = { horizontal: 'left' };
      row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(11).numFmt = 'mm-dd-yy';
      n++;
    }
  }

  ws.autoFilter = { from: 'A1', to: 'L1' };

  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
