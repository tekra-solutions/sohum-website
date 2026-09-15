"use client";

export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-6 py-20" role="alert">
      <h1 className="text-2xl font-semibold text-ink-900">This page could not be loaded</h1>
      <p className="mt-3 text-graphite-600">Please try again. If you just submitted a form, check the record before submitting it again.</p>
      <button type="button" onClick={retry} className="mt-6 rounded bg-ink-900 px-5 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-4">Try again</button>
      {error.digest && <p className="mt-4 text-sm text-graphite-500">Support reference: {error.digest}</p>}
    </main>
  );
}
