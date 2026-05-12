import { useState } from 'react';

export default function ResultDisplay({ result, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!result) {
    return (
      <div className="flex items-center justify-center h-64 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm">
        {language === 'en' ? 'Your tailored CV will appear here' : 'Tu CV adaptado aparecerá aquí'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">
          {language === 'en' ? 'Result' : 'Resultado'}
        </h2>
        <button
          onClick={handleCopy}
          className="px-4 py-1.5 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          {copied
            ? (language === 'en' ? 'Copied!' : '¡Copiado!')
            : (language === 'en' ? 'Copy' : 'Copiar')}
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-white border border-gray-200 rounded-2xl p-5 shadow-sm overflow-auto max-h-[70vh]">
        {result}
      </pre>
    </div>
  );
}
