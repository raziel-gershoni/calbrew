'use client';

import { useState } from 'react';
import { ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

interface CodeBlockProps {
  data: unknown;
  maxHeight?: string;
}

export default function CodeBlock({
  data,
  maxHeight = 'max-h-96',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className='relative group'>
      <button
        onClick={handleCopy}
        className='absolute top-2 right-2 p-1.5 rounded-md bg-gray-200 dark:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
        title='Copy to clipboard'
      >
        {copied ? (
          <CheckIcon className='w-4 h-4 text-green-500' />
        ) : (
          <ClipboardDocumentIcon className='w-4 h-4' />
        )}
      </button>
      <pre
        className={`${maxHeight} overflow-auto p-4 rounded-md bg-gray-50 dark:bg-gray-900 text-sm font-mono text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700`}
      >
        {text}
      </pre>
    </div>
  );
}
