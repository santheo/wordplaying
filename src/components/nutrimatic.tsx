import React, { useMemo } from 'react';

interface NutrimaticResultsProps {
  pattern: string;
}

const NutrimaticResults: React.FC<NutrimaticResultsProps> = ({ pattern }) => {
  // Generate the Nutrimatic URL based on the pattern
  const nutrimaticUrl = useMemo(() => 
    `https://nutrimatic.org/2024/?q=${encodeURIComponent(pattern)}`,
    [pattern]
  );

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="text-sm text-gray-600">
        <a href={nutrimaticUrl} target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline" rel="noopener noreferrer">Nutrimatic query</a>
        <code className="bg-gray-100 px-2 py-1 rounded">{pattern}</code>
      </div>
      
      <iframe 
        src={nutrimaticUrl}
        className="w-full h-96 border border-gray-200 rounded-lg bg-white shadow-sm"
        title="Nutrimatic Results"
      />      
    </div>
  );
};

export default NutrimaticResults;