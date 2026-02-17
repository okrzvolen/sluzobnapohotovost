import ExcelJS from 'exceljs';
import { Employee, ExtractionResult } from '../types';

/**
 * Formátuje dátumový reťazec na tvar bez popredných núl (napr. 01.05.2026 -> 1.5.2026)
 */
const formatRawDate = (dateStr: string): string => {
  if (!dateStr || !dateStr.includes('.')) return dateStr;
  return dateStr
    .split('.')
    .map(part => {
      const parsed = parseInt(part, 10);
      return isNaN(parsed) ? part : parsed.toString();
    })
    .join('.');
};

export const generateExcelBlob = async (
  templateBase64: string,
  result: ExtractionResult,
  employee: Employee
): Promise<{ blob: Blob; fileName: string }> => {
  const base64Data = templateBase64.split(',')[1] || templateBase64;
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes.buffer);
  
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error("Šablóna neobsahuje žiadny hárok.");
  }

  worksheet.getCell('C5').value = formatRawDate(result.startDate);
  worksheet.getCell('B9').value = 'Zvolen';
  worksheet.getCell('C9').value = employee.firstName;
  worksheet.getCell('D9').value = employee.lastName;
  worksheet.getCell('E9').value = employee.fixedLine;
  worksheet.getCell('F9').value = employee.mobile;
  worksheet.getCell('G9').value = 'prítomný';
  worksheet.getCell('H9').value = employee.note;

  const fileName = `${result.weekOfYear}_oznamovanie pohotovosti_OU Zvolen_${result.dateRange}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  return { blob, fileName };
};