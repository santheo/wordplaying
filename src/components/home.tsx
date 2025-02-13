"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import Wordplaying from './wordplaying';
import YAML from 'yaml';

interface IndicatorCategory {
  [key: string]: string[];
}
interface IndicatorLists {
  [key: string]: IndicatorCategory;
}

const TabInterface = () => {
  const [activeTab, setActiveTab] = useState('construction');
  const [indicatorType, setIndicatorType] = useState('anagrams');
  const [indicatorLists, setIndicatorLists] = useState<IndicatorLists>({});
  const [selectedList, setSelectedList] = useState<string | React.ReactNode>('');

  // Load indicator lists on mount
  useEffect(() => {
    const loadIndicators = async () => {
      try {
        const loadIndicatorList = async (type: string) => {
          const response = await fetch(`/indicators/${type}.yaml`);
          const text = await response.text();
          return YAML.parse(text);
        };
        
        const [anagrams, hidden, insertion, deletion, reversal, first, last, edge] = await Promise.all([
          loadIndicatorList('anagrams'),
          loadIndicatorList('hidden'),
          loadIndicatorList('insertion'),
          loadIndicatorList('deletion'),
          loadIndicatorList('reversal'),
          loadIndicatorList('first'),
          loadIndicatorList('last'),
          loadIndicatorList('edge'),
        ]);
        setIndicatorLists({ anagrams, hidden, insertion, deletion, reversal, first, last, edge });

      } catch (error) {
        console.error('Error loading indicator lists:', error);
      }
    };

    loadIndicators();
  }, []);

  useEffect(() => {
    const selectedCategory = indicatorType || 'anagrams';
    const selectedLists = indicatorLists[selectedCategory] || [];

    setSelectedList(
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        {Object.entries(selectedLists).map(([category, words]) => (
          <div key={category} className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            <ul className="grid grid-cols-2 gap-2">
              {Array.isArray(words) && words.map((word, index) => (
                <li key={index} className="text-gray-700">{word}</li>
              ))}
            </ul>
          </div>
        ))}
        </div>
    );
  }, [indicatorType, indicatorLists]);

  const renderIndicatorContent = () => (
    <div className="p-4">
      <div className="flex flex-wrap gap-1 mb-6 justify-center">
        {['anagrams', 'hidden', 'insertion', 'deletion', 'reversal', 'first', 'last', 'edge'].map(type => (
          <button
            key={type}
            onClick={() => setIndicatorType(type)}
            className={`
              px-2 py-1 rounded-lg text-sm font-medium
              transition-colors duration-200
              ${indicatorType === type
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}
            `}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {selectedList}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="grid grid-cols-2">
        <button
          onClick={() => setActiveTab('construction')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg -mb-px
            ${activeTab === 'construction'
              ? 'bg-white border-t border-l border-r border-b-white text-blue-600'
              : 'text-gray-600 hover:text-gray-800 bg-gray-50'
            }`}
        >
          Construction
        </button>
        <button
          onClick={() => setActiveTab('indicators')}
          className={`px-4 py-2 font-medium text-sm rounded-t-lg -mb-px
            ${activeTab === 'indicators'
              ? 'bg-white border-t border-l border-r border-b-white text-blue-600'
              : 'text-gray-600 hover:text-gray-800 bg-gray-50'
            }`}
        >
          Indicators
        </button>
      </div>

      <Card className="p-6 rounded-none rounded-b-lg">
        {activeTab === 'construction' ? (
          <Wordplaying />
        ) : (
          renderIndicatorContent()
        )}
      </Card>
    </div>
  );
};

export default TabInterface;