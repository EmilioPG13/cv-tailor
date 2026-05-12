import { useState } from 'react';
import axios from 'axios';

export default function TailorForm({ onResult, onLanguageChange }) {
  const [cv, setCv] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleLanguage = () => {
    const next = language === 'en' ? 'es' : 'en';
    setLanguage(next);
    onLanguageChange?.(next);
  };

  const handleSubmit = async () => {
    if (!cv.trim() || !jobDescription.trim()) {
      setError(language === 'en' ? 'Both fields are required.' : 'Ambos campos son obligatorios.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/tailor`,
        { cv, jobDescription, language }
      );
      onResult(data.result);
    } catch (err) {
      setError(language === 'en' ? 'Something went wrong. Try again.' : 'Algo salió mal. Inténtalo de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const labels = language === 'en'
    ? { cv: 'Your CV', job: 'Job Description', submit: 'Tailor my CV', loading: 'Tailoring...', toggle: '🇲🇽 Español' }
    : { cv: 'Tu CV', job: 'Descripción del trabajo', submit: 'Adaptar mi CV', loading: 'Adaptando...', toggle: '🇺🇸 English' };

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={toggleLanguage}
        className="self-start px-4 py-1.5 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-100 transition-colors"
      >
        {labels.toggle}
      </button>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">{labels.cv}</label>
        <textarea
          value={cv}
          onChange={e => setCv(e.target.value)}
          placeholder={language === 'en' ? 'Paste your CV here...' : 'Pega tu CV aquí...'}
          rows={10}
          className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-700">{labels.job}</label>
        <textarea
          value={jobDescription}
          onChange={e => setJobDescription(e.target.value)}
          placeholder={language === 'en' ? 'Paste the job description here...' : 'Pega la descripción del trabajo aquí...'}
          rows={8}
          className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow"
      >
        {loading ? labels.loading : labels.submit}
      </button>
    </div>
  );
}
