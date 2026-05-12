import { useState } from 'react';
import TailorForm from './components/TailorForm';
import ResultDisplay from './components/ResultDisplay';

export default function App() {
  const [result, setResult] = useState('');
  const [language, setLanguage] = useState('en');

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-100 shadow-sm px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-indigo-600 tracking-tight">CV Tailor</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {language === 'en' ? 'AI-powered CV & cover letter tailoring' : 'Adaptación de CV y carta de presentación con IA'}
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TailorForm onResult={setResult} onLanguageChange={setLanguage} />
        <ResultDisplay result={result} language={language} />
      </main>
    </div>
  );
}
