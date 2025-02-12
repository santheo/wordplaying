import React, { useMemo } from 'react';

interface NutrimaticResultsProps {
  pattern: string;
}

const NutrimaticResults: React.FC<NutrimaticResultsProps> = ({ pattern }) => {
  // Generate the Nutrimatic URL based on the pattern
  const nutrimarticUrl = useMemo(() => 
    `https://nutrimatic.org/2024/?q=${encodeURIComponent(pattern)}`,
    [pattern]
  );
  
  return (
    <div className="w-full flex flex-col gap-4">
      <div className="text-sm text-gray-600">
        Nutrimatic query: <code className="bg-gray-100 px-2 py-1 rounded">{pattern}</code>
      </div>
      
      <iframe 
        src={nutrimarticUrl}
        className="w-full h-96 border border-gray-200 rounded-lg bg-white shadow-sm"
        title="Nutrimatic Results"
      />      
    </div>
  );
};

export default NutrimaticResults;