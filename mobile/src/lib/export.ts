import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { db } from './db';
import { today } from './i18n';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
const cell = (v: unknown) => (typeof v === 'number' ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>` : `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`);

function sheet(name: string, header: string[], rows: unknown[][]) {
  return `<Worksheet ss:Name="${esc(name)}"><Table>
<Row ss:StyleID="h">${header.map(cell).join('')}</Row>
${rows.map((r) => `<Row>${r.map(cell).join('')}</Row>`).join('\n')}
</Table></Worksheet>`;
}

/** Export everything as one Excel workbook (SpreadsheetML — opens in Excel / Google Sheets, keeps Bengali text). */
export async function exportExcel() {
  const patients = db.getAllSync<any>(`SELECT code,name,phone,age,sex,address,diseases,visit_count,last_visit,next_visit,due FROM patients WHERE deleted=0 ORDER BY code`);
  const visits = db.getAllSync<any>(
    `SELECT v.date,p.code,p.name,v.status,v.complaint,v.meds,v.next_visit,v.fee,v.med_cost,v.discount,v.total,v.paid,v.method,v.trx_id
     FROM visits v JOIN patients p ON p.id=v.patient_id WHERE v.deleted=0 ORDER BY v.date DESC`,
  );
  const payments = db.getAllSync<any>(`SELECT pm.date,p.name,pm.amount,pm.method,pm.trx_id FROM payments pm JOIN patients p ON p.id=pm.patient_id WHERE pm.deleted=0 ORDER BY pm.date DESC`);
  const expenses = db.getAllSync<any>(`SELECT date,note,amount FROM expenses WHERE deleted=0 ORDER BY date DESC`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>
${sheet('রোগী', ['ID', 'নাম', 'মোবাইল', 'বয়স', 'লিঙ্গ', 'ঠিকানা', 'রোগ', 'ভিজিট', 'শেষ ভিজিট', 'পরের তারিখ', 'বাকি'],
  patients.map((p) => [p.code, p.name, p.phone, p.age ?? '', p.sex, p.address, JSON.parse(p.diseases).join(', '), p.visit_count, p.last_visit ?? '', p.next_visit ?? '', p.due]))}
${sheet('ভিজিট', ['তারিখ', 'ID', 'নাম', 'অবস্থা', 'সমস্যা', 'ওষুধ', 'পরের তারিখ', 'ফি', 'ওষুধের দাম', 'ছাড়', 'মোট', 'দিয়েছেন', 'মাধ্যম', 'TrxID'],
  visits.map((v) => [v.date, v.code, v.name, v.status, v.complaint, JSON.parse(v.meds).map((m: any) => `${m.name} ${m.potency}`.trim()).join(', '), v.next_visit ?? '', v.fee, v.med_cost, v.discount, v.total, v.paid, v.method, v.trx_id]))}
${sheet('বাকি জমা', ['তারিখ', 'নাম', 'টাকা', 'মাধ্যম', 'TrxID'], payments.map((p) => [p.date, p.name, p.amount, p.method, p.trx_id]))}
${sheet('খরচ', ['তারিখ', 'বিবরণ', 'টাকা'], expenses.map((e) => [e.date, e.note, e.amount]))}
</Workbook>`;

  const file = new File(Paths.cache, `chamber-${today()}.xls`);
  if (file.exists) file.delete();
  file.write(xml);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/vnd.ms-excel', dialogTitle: 'Excel', UTI: 'com.microsoft.excel.xls' });
}
