import React, { useState, useEffect } from 'react';
import { Search, Loader2, TriangleAlert } from 'lucide-react';

interface OneLookResultsProps {
  pattern: string;
  type?: 'starts' | 'ends' | 'contains';
  maxResults?: number;
}

interface DatamuseResult {
  word: string;
  score: number;
  tags?: string[];
}

const OneLookResults: React.FC<OneLookResultsProps> = ({ pattern }) => {

  const [results, setResults] = useState<DatamuseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!pattern) return;
      
      setLoading(true);
      setError(null);

      console.log('pat:', pattern)

      try {
        const response = await fetch(
          `https://api.datamuse.com/words?sp=${pattern}&max=200&scwo=1&ssbp=1`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch results');
        }

        const data: DatamuseResult[] = await response.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [pattern]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 text-center">
        Error: {error}
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="text-gray-500 p-4 text-center flex items-center justify-center gap-2">
        <Search className="w-5 h-5" />
        No results found for &apos;{pattern}&apos;
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-2">
        Found {results.length} matches for 
        <code className="bg-gray-100 px-2 py-1 rounded">{pattern}</code>
        at <a href={`https://www.onelook.com/?w=${pattern}&scwo=1&ssbp=1`} target="_blank" className="text-blue-600 hover:text-blue-800 hover:underline" rel="noopener noreferrer">OneLook</a>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <ul>
        {results.map((result) => (
          <li key={result.word} className="text-gray-700 list-disc ml-4">
            {result.word} ({result.word.length})
          </li>
        ))}
        </ul>
      </div>
    </div>
  );
};

export default OneLookResults;