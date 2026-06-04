import { useNavigate } from 'react-router-dom';
import { TEMPLATES } from '../data/templates.js';
import {
  cn, Button, Card, CardHeader, CardTitle, CardDescription, CardContent,
} from '../components/ui.jsx';

export default function TemplatesPage({ t, lang }) {
  const navigate = useNavigate();

  function handleUseTemplate(tpl) {
    const text = lang === 'es' ? tpl.textEs : tpl.textEn;
    navigate('/', { state: { templateText: text } });
  }

  return (
    <main className="mx-auto max-w-[1320px] px-6 pb-24 pt-6">
      <section className="anim-rise">
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--fg)] sm:text-[28px]">
          {lang === 'es' ? 'Plantillas de CV' : 'CV Templates'}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-fg)] max-w-xl leading-relaxed">
          {lang === 'es'
            ? 'Scaffolds en blanco para distintos tipos de roles. Elige uno y dale a Adaptar.'
            : 'Blank scaffolds for different role types. Pick one and hit Tailor.'}
        </p>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tpl, i) => (
          <Card
            key={tpl.id}
            className={cn(
              "flex flex-col",
              i === 0 && "anim-rise",
              i === 1 && "anim-rise-1",
              i === 2 && "anim-rise-2",
            )}
          >
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <CardTitle>{lang === 'es' ? tpl.nameEs : tpl.nameEn}</CardTitle>
              </div>
              <CardDescription>
                {lang === 'es' ? tpl.descEs : tpl.descEn}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col gap-3 flex-1">
              <pre className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 p-3 text-[10.5px] font-mono text-[var(--muted-fg)] leading-relaxed whitespace-pre-wrap"
                style={{ maxHeight: "6.5rem" }}
              >
                {(lang === 'es' ? tpl.textEs : tpl.textEn).split('\n').slice(0, 7).join('\n')}
              </pre>
              <div className="mt-auto">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleUseTemplate(tpl)}
                >
                  {lang === 'es' ? 'Usar esta plantilla' : 'Use this template'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
