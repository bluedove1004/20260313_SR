import { useState, useRef } from 'react';
import { Database, UploadCloud, FileText, Activity } from 'lucide-react';
import { apiClient } from '../../api/client';

export default function ExtractionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/extraction/parse-pdf/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      alert('PDF 파싱 및 추출 중 오류가 발생했습니다. PyMuPDF가 설치되어 있는지 확인하세요.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          <Database className="text-tkm-main" size={32} />
          Full-text Extraction & Analysis
        </h1>
        <p className="mt-2 text-gray-500 text-lg">
          PDF 원문을 업로드하여 IMRaD 섹션을 자동 구조화하고 PICO 핵심 정보를 추출합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-4 h-64 border-dashed border-2">
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
            <div className="p-4 bg-tkm-light text-tkm-main rounded-full">
              <UploadCloud size={40} />
            </div>
            <div>
              <p className="font-bold text-gray-900">{file ? file.name : 'Upload PDF File'}</p>
              <p className="text-sm text-gray-500 mt-1">Click below to select a file</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
            >
              Browse Files
            </button>
          </div>
          
          <button 
            disabled={!file || isUploading}
            onClick={handleUpload}
            className="w-full py-4 bg-tkm-main text-white font-bold rounded-xl hover:bg-tkm-dark disabled:opacity-50 transition-colors flex justify-center items-center"
          >
            {isUploading ? <><Activity className="animate-pulse mr-2" /> Processing PDF...</> : 'Extract Information'}
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <div className="space-y-6">
              {/* PICO Extracted Data */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="text-green-600" size={24} />
                  Extracted PICO & Statistics
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                     <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Sample Size (N)</span>
                     <span className="text-2xl font-black text-tkm-main">
                        {result.extracted_pico?.population?.sample_size || 'N/A'}
                     </span>
                     <span className="block text-xs text-gray-400 mt-2">
                        Source: {result.extracted_pico?.population?.extracted_from}
                     </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                     <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">p-values found</span>
                     <div className="flex flex-wrap gap-2 mt-2">
                        {result.extracted_pico?.statistical_data?.p_values?.length > 0 ? 
                          result.extracted_pico.statistical_data.p_values.map((p: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-sm font-bold rounded">
                              {p}
                            </span>
                          ))
                        : <span className="text-gray-400">None detected</span>}
                     </div>
                  </div>
                </div>
              </div>

              {/* Parsed Sections */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="text-blue-600" size={24} />
                  Structured IMRaD Sections
                </h2>
                <div className="space-y-4">
                  {['abstract', 'introduction', 'methods', 'results', 'discussion'].map((sec) => (
                    <div key={sec} className="border border-gray-200 rounded-xl overflow-hidden">
                       <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-bold text-gray-700 capitalize">
                         {sec}
                       </div>
                       <div className="p-4 text-sm text-gray-600 leading-relaxed max-h-48 overflow-y-auto">
                         {result.sections[sec] ? result.sections[sec] : <span className="text-gray-400 italic">No content</span>}
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center flex-col text-gray-400 p-12 text-center">
              <FileText size={64} className="mb-4 opacity-50" />
              <p className="font-medium text-lg">No Results Yet</p>
              <p className="text-sm mt-2">Upload a PDF document to see automated extraction results.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
