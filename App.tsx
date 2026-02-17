import React, { useState, useEffect, useCallback } from 'react';
import { Settings, FileText, User, Save, Trash2, Upload, Download, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, DownloadCloud, UserPlus, X, FileUp, Info } from 'lucide-react';
import { AppSettings, Employee, ExtractionResult, ProcessedFile } from './types';
import { INITIAL_EMPLOYEES, STORAGE_KEYS } from './constants';
import { parseDocument } from './services/geminiService';
import { generateExcelBlob } from './services/excelService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'settings'>('generate');
  const [settings, setSettings] = useState<AppSettings>({
    employees: INITIAL_EMPLOYEES,
    templateBase64: null,
    templateName: null,
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }
  }, []);

  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
  };

  const handleEmployeeUpdate = (index: number, field: keyof Employee, value: string) => {
    const updatedEmployees = [...settings.employees];
    updatedEmployees[index] = { ...updatedEmployees[index], [field]: value };
    saveSettings({ ...settings, employees: updatedEmployees });
  };

  const addEmployee = () => {
    const newEmployee: Employee = {
      id: Math.random().toString(36).substr(2, 9),
      firstName: '',
      lastName: '',
      fixedLine: '',
      mobile: '',
      note: ''
    };
    saveSettings({ ...settings, employees: [...settings.employees, newEmployee] });
  };

  const removeEmployee = (id: string) => {
    if (window.confirm('Naozaj chcete vymazať tohto zamestnanca?')) {
      const updatedEmployees = settings.employees.filter(e => e.id !== id);
      saveSettings({ ...settings, employees: updatedEmployees });
    }
  };

  const handleFile = useCallback((file: File, type: 'input' | 'template') => {
    setError(null);
    setUploadSuccess(false);

    if (type === 'template') {
      if (!file.name.endsWith('.xlsx')) {
        setError("Chyba: Šablóna musí byť výhradne vo formáte .xlsx (Excel).");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        saveSettings({
          ...settings,
          templateBase64: reader.result as string,
          templateName: file.name
        });
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      };
      reader.onerror = () => setError("Chyba pri čítaní súboru šablóny. Skúste to znova.");
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(file);
      setProcessedFiles([]);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    }
  }, [settings]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent, type: 'input' | 'template') => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file, type);
    }
  };

  const clearTemplate = () => {
    if (window.confirm('Naozaj chcete vymazať uloženú šablónu? Budete musieť nahrať novú.')) {
      saveSettings({ ...settings, templateBase64: null, templateName: null });
    }
  };

  const processFile = async () => {
    if (!selectedFile) return;
    if (!settings.templateBase64) {
      setError("Akcia zamietnutá: Chýba šablóna Excel v nastaveniach! Prosím nahrajte súbor v záložke Nastavenia.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessedFiles([]);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const results: ExtractionResult[] = await parseDocument(base64, selectedFile.type, settings.employees);
          const newProcessedFiles: ProcessedFile[] = [];

          for (const result of results) {
            const matchedEmployee = settings.employees.find(e => 
              `${e.firstName} ${e.lastName}`.toLowerCase().includes(result.matchedEmployeeName?.toLowerCase() || result.extractedName.toLowerCase())
            ) || settings.employees[0];

            const { blob, fileName } = await generateExcelBlob(settings.templateBase64!, result, matchedEmployee);
            
            newProcessedFiles.push({
              id: Math.random().toString(36).substr(2, 9),
              fileName,
              blob,
              result
            });
          }

          setProcessedFiles(newProcessedFiles);
        } catch (err: any) {
          setError(`Chyba AI analýzy: ${err.message}. Skúste nahrať čitateľnejší dokument.`);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setError(`Kritická chyba: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const downloadFile = (file: ProcessedFile) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    processedFiles.forEach((file, index) => {
      setTimeout(() => downloadFile(file), index * 600);
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-green-600 p-2.5 rounded-xl text-white shadow-lg shadow-green-100">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 leading-tight">Služobná pohotovosť</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Automation v2.0</p>
          </div>
        </div>
        <nav className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'generate' ? 'bg-white text-green-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Generovanie
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-green-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Nastavenia
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6">
        {activeTab === 'generate' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-12 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600 opacity-20"></div>
              
              <div className="max-w-xl mx-auto">
                <h2 className="text-3xl font-black text-slate-900 mb-3">Spracovanie rozpisu</h2>
                <p className="text-slate-500 mb-10 font-medium">Nahrajte pôvodný rozpis (PDF, JPG) a my automaticky vygenerujeme Excel súbory pre každého zamestnanca.</p>
                
                <div className="relative group">
                  <label 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, 'input')}
                    className={`block border-4 border-dashed rounded-[2.5rem] p-16 cursor-pointer transition-all duration-300 relative ${
                      isDragging 
                        ? 'border-green-500 bg-green-50 scale-105 shadow-2xl shadow-green-100' 
                        : selectedFile 
                          ? 'border-green-200 bg-green-50/20 hover:border-green-400' 
                          : 'border-slate-200 bg-slate-50 hover:border-green-400 hover:bg-white'
                    }`}
                  >
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], 'input')}
                    />
                    
                    {selectedFile ? (
                      <div className="flex flex-col items-center justify-center gap-4 animate-in zoom-in-95 duration-500">
                        <div className="relative">
                           <div className="bg-green-600 p-6 rounded-full shadow-xl shadow-green-200">
                            <FileText className="w-12 h-12 text-white" />
                          </div>
                          <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md">
                            <CheckCircle2 className="w-8 h-8 text-green-500 fill-white" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="font-black text-xl text-slate-800 block truncate max-w-xs">{selectedFile.name}</span>
                          <span className="text-sm font-bold text-green-600 uppercase tracking-tighter">Súbor pripravený na spracovanie</span>
                        </div>
                        {uploadSuccess && (
                          <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold animate-bounce shadow-sm flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Nahrané!
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-6">
                        <div className={`p-8 rounded-[2rem] transition-all duration-500 ${isDragging ? 'bg-green-600 text-white rotate-12' : 'bg-white text-slate-400 shadow-lg shadow-slate-200'}`}>
                          {isDragging ? <FileUp className="w-16 h-16 animate-pulse" /> : <Upload className="w-16 h-16" />}
                        </div>
                        <div className="space-y-2">
                          <span className="text-slate-800 font-black text-xl block">
                            {isDragging ? 'Pustite súbor tu' : 'Kliknite alebo presuňte rozpis'}
                          </span>
                          <span className="text-slate-400 font-bold text-sm block">PDF, JPG, PNG alebo DOCX</span>
                        </div>
                      </div>
                    )}
                  </label>
                </div>

                <div className="mt-10">
                  <button
                    onClick={processFile}
                    disabled={!selectedFile || isProcessing}
                    className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl shadow-slate-200 hover:bg-black disabled:opacity-30 disabled:shadow-none transition-all flex items-center justify-center gap-4 text-xl active:scale-95 group"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-7 h-7 animate-spin" />
                        <span className="animate-pulse">Prebieha generovanie...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                        Spracovať a vytvoriť súbory
                      </>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="mt-8 p-5 bg-red-50 border-2 border-red-100 rounded-[1.5rem] flex items-start gap-4 text-red-700 text-left animate-in slide-in-from-top-4 duration-500 shadow-sm">
                    <div className="bg-red-500 p-2 rounded-xl text-white flex-shrink-0 shadow-lg shadow-red-100">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-black text-lg text-red-900 leading-none mb-1">Pozor, nastala chyba</p>
                      <p className="font-bold text-sm opacity-80 leading-snug">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {processedFiles.length > 0 && (
              <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-8 duration-700">
                <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-500 p-2 rounded-xl text-white shadow-lg shadow-green-100">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-black text-slate-800 text-xl">
                      Vygenerované týždenné oznamy ({processedFiles.length})
                    </h3>
                  </div>
                  <button 
                    onClick={downloadAll}
                    className="flex items-center gap-3 px-6 py-3 bg-green-600 text-white rounded-2xl text-sm font-black hover:bg-green-700 transition-all shadow-xl shadow-green-100 hover:scale-[1.03] active:scale-95"
                  >
                    <DownloadCloud className="w-5 h-5" /> Stiahnuť všetko
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {processedFiles.map((file) => (
                    <div key={file.id} className="p-6 flex items-center justify-between hover:bg-slate-50/80 transition-all group">
                      <div className="flex items-center gap-6">
                        <div className="bg-white p-4 rounded-2xl text-green-600 shadow-sm border border-slate-100 group-hover:border-green-200 group-hover:bg-green-50 transition-all">
                          <FileSpreadsheet className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 mb-1 text-lg leading-none">{file.fileName}</p>
                          <div className="flex gap-4 items-center">
                            <span className="text-xs font-black text-slate-500 flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-tighter">
                              <User className="w-3.5 h-3.5 text-blue-500" /> {file.result.matchedEmployeeName}
                            </span>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">
                              Týždeň: <span className="text-green-600">{file.result.weekOfYear}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => downloadFile(file)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-xs font-black hover:border-green-500 hover:text-green-600 transition-all shadow-sm active:scale-95"
                      >
                        <Download className="w-4 h-4" /> Stiahnuť
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Template Section */}
            <section className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              <div className="px-8 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg">
                  <FileText className="w-5 h-5 text-green-600" /> Excel Šablóna (.xlsx)
                </h3>
                {settings.templateName && (
                  <button onClick={clearTemplate} className="text-red-400 hover:text-red-600 transition-all p-2.5 hover:bg-red-50 rounded-xl" title="Vymazať šablónu">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="p-10">
                {settings.templateName ? (
                  <div className="flex items-center justify-between p-6 bg-green-50/50 border-2 border-green-100 rounded-[1.5rem] relative group">
                    <div className="flex items-center gap-5">
                      <div className="bg-green-600 p-4 rounded-2xl text-white shadow-xl shadow-green-200">
                        <FileSpreadsheet className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="font-black text-green-900 text-lg leading-tight">{settings.templateName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          <p className="text-xs text-green-600 font-black uppercase tracking-widest">Trvalo uložené v pamäti</p>
                        </div>
                      </div>
                    </div>
                    <label className="cursor-pointer bg-white px-6 py-3 border-2 border-green-200 rounded-2xl text-xs font-black text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all shadow-sm active:scale-95">
                      Zmeniť šablónu
                      <input type="file" className="hidden" accept=".xlsx" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], 'template')} />
                    </label>
                  </div>
                ) : (
                  <label 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, 'template')}
                    className={`flex flex-col items-center justify-center border-4 border-dashed rounded-[2.5rem] p-16 cursor-pointer transition-all text-center ${isDragging ? 'border-green-500 bg-green-50 scale-102' : 'border-slate-200 bg-slate-50/50 hover:border-green-400 hover:bg-white shadow-inner'}`}
                  >
                    <div className={`p-6 rounded-[1.5rem] mb-6 shadow-xl transition-all duration-500 ${isDragging ? 'bg-green-600 text-white' : 'bg-white text-green-500 shadow-slate-200'}`}>
                      <Upload className={`w-10 h-10 ${isDragging ? 'animate-bounce' : ''}`} />
                    </div>
                    <span className="font-black text-slate-800 block text-2xl mb-2">Nahrajte Excel šablónu</span>
                    <span className="text-sm text-slate-400 max-w-sm leading-relaxed font-bold">
                      Presuňte súbor .xlsx sem. Šablóna definuje formátovanie všetkých budúcich vygenerovaných výstupov.
                    </span>
                    <input type="file" className="hidden" accept=".xlsx" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], 'template')} />
                  </label>
                )}
              </div>
            </section>

            {/* Employees Section */}
            <section className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              <div className="px-8 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg">
                  <User className="w-5 h-5 text-green-600" /> Databáza zamestnancov
                </h3>
                <button 
                  onClick={addEmployee}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-2xl text-sm font-black hover:bg-green-700 transition-all shadow-xl shadow-green-100 active:scale-95"
                >
                  <UserPlus className="w-4 h-4" /> Pridať nového
                </button>
              </div>
              <div className="p-10 space-y-8">
                {settings.employees.map((emp, index) => (
                  <div key={emp.id} className="p-8 rounded-[2rem] border-2 border-slate-100 bg-white space-y-6 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <button 
                      onClick={() => removeEmployee(emp.id)}
                      className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-all p-2.5 hover:bg-red-50 rounded-xl group/del"
                      title="Vymazať zamestnanca"
                    >
                      <Trash2 className="w-5 h-5 group-hover/del:scale-110 transition-transform" />
                    </button>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-slate-200">
                        {index + 1}
                      </div>
                      <h4 className="font-black text-slate-900 text-xl">
                        {emp.firstName || emp.lastName ? `${emp.firstName} ${emp.lastName}` : 'Nový zamestnanec'}
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-900 uppercase px-1 tracking-widest opacity-60">Meno</label>
                        <input 
                          type="text" 
                          value={emp.firstName}
                          onChange={(e) => handleEmployeeUpdate(index, 'firstName', e.target.value)}
                          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-green-500 focus:ring-0 outline-none transition-all text-sm font-black text-slate-900 bg-slate-50/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-900 uppercase px-1 tracking-widest opacity-60">Priezvisko</label>
                        <input 
                          type="text" 
                          value={emp.lastName}
                          onChange={(e) => handleEmployeeUpdate(index, 'lastName', e.target.value)}
                          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-green-500 focus:ring-0 outline-none transition-all text-sm font-black text-slate-900 bg-slate-50/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-900 uppercase px-1 tracking-widest opacity-60">Pevná linka</label>
                        <input 
                          type="text" 
                          placeholder="Napr. 0961..."
                          value={emp.fixedLine}
                          onChange={(e) => handleEmployeeUpdate(index, 'fixedLine', e.target.value)}
                          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-green-500 focus:ring-0 outline-none transition-all text-sm font-black text-slate-900 bg-slate-50/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-900 uppercase px-1 tracking-widest opacity-60">Mobil</label>
                        <input 
                          type="text" 
                          placeholder="Napr. 0903..."
                          value={emp.mobile}
                          onChange={(e) => handleEmployeeUpdate(index, 'mobile', e.target.value)}
                          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-green-500 focus:ring-0 outline-none transition-all text-sm font-black text-slate-900 bg-slate-50/50"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[11px] font-black text-slate-900 uppercase px-1 tracking-widest opacity-60 flex items-center gap-1.5">
                          Poznámka <Info className="w-3 h-3 text-slate-400" />
                        </label>
                        <input 
                          type="text" 
                          placeholder="Zadajte poznámku (súkromné / služobné číslo)..."
                          value={emp.note}
                          onChange={(e) => handleEmployeeUpdate(index, 'note', e.target.value)}
                          className="w-full px-5 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-green-500 focus:ring-0 outline-none transition-all text-sm font-black text-slate-900 bg-slate-50/50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 p-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
        &copy; {new Date().getFullYear()} OU ZVOLEN &bull; Automatizovaný systém pohotovostí &bull; V2.0.5
      </footer>
    </div>
  );
};

export default App;