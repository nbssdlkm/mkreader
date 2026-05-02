import type { Components } from 'react-markdown';

export const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3 text-text">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-2 text-text">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-bold mt-4 mb-2 text-text/90">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-bold mt-3 mb-1 text-text/90">{children}</h4>,
  h5: ({ children }) => <h5 className="text-sm font-semibold mt-2 mb-1 text-text/70">{children}</h5>,
  h6: ({ children }) => <h6 className="text-xs font-semibold mt-2 mb-1 text-text/70">{children}</h6>,
  p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
  hr: () => <hr className="my-5 border-t border-black/10 dark:border-white/10" />,
  ul: ({ children }) => <ul className="mb-3 pl-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 pl-5 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-text">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-accent/40 pl-4 my-3 text-text/70 italic">{children}</blockquote>
  ),
  pre: ({ children }) => (
    <pre className="bg-black/5 dark:bg-white/5 rounded-lg p-3 my-3 overflow-x-auto text-xs">{children}</pre>
  ),
  code: ({ children, className }) => {
    if (className) return <code className={className}>{children}</code>;
    return <code className="bg-black/5 dark:bg-white/5 rounded px-1.5 py-0.5 text-xs font-mono">{children}</code>;
  },
  img: ({ src, alt }) => {
    let resolvedSrc = src || '';
    if (resolvedSrc && !resolvedSrc.startsWith('http') && !resolvedSrc.startsWith('data:') && !resolvedSrc.startsWith('/')) {
      resolvedSrc = `file:///${resolvedSrc}`;
    }
    return (
      <img
        src={resolvedSrc}
        alt={alt || ''}
        className="max-w-full h-auto rounded-md my-4"
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
          const placeholder = document.createElement('div');
          placeholder.className = 'flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-md my-4 p-8 text-text/30 text-xs';
          placeholder.textContent = alt ? `${alt}` : '[image load failed]';
          target.parentNode?.insertBefore(placeholder, target);
        }}
      />
    );
  },
  a: ({ href, children }) => {
    const isExternal = href?.startsWith('http') || href?.startsWith('//');
    return (
      <a
        href={href}
        className="text-accent underline underline-offset-2 hover:opacity-80"
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-2 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-black/10 dark:border-white/10 px-3 py-2">{children}</td>
  ),
};
