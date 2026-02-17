
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  fixedLine: string;
  mobile: string;
  note: string;
}

export interface AppSettings {
  employees: Employee[];
  templateBase64: string | null;
  templateName: string | null;
}

export interface ExtractionResult {
  extractedName: string;
  matchedEmployeeName: string;
  dateRange: string;
  startDate: string;
  weekOfYear: number;
}

export interface ProcessedFile {
  id: string;
  fileName: string;
  blob: Blob;
  result: ExtractionResult;
}
