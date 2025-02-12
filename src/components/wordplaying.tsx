"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { CheckSquare, XSquare } from 'lucide-react';
import YAML from 'yaml';

interface Definition {
  partOfSpeech: string;
  text: string;
}

interface WordnikDefinition {
  partOfSpeech?: string;
  text?: string;
  relationshipType?: string;
  words?: string[];
}

interface CrypticDictionary {
  [key: string]: string[];
}

interface WordData {
  definitions: Definition[];
  synonyms: string[];
}

interface WordDataMap {
  [key: string]: WordData;
}

// TypeScript interfaces
interface SubNavItem {
  id: string;
  label: string;
}

interface SimpleNavConfig {
  label: string;
  simple: true;
}

interface ComplexNavConfig {
  label: string;
  simple?: false;
  subnav: SubNavItem[];
}

type NavConfig = {
  [key: string]: SimpleNavConfig | ComplexNavConfig;
}

interface IndicatorCategory {
  [key: string]: string[];
}

interface IndicatorLists {
  [key: string]: IndicatorCategory;
}

interface ViewContext {
  filter: string;
  subFilter?: string | null;
}

const navConfig: NavConfig = {
  definition: {
    label: 'Def',
    // Example of a simple nav item without subnav
    simple: true
  },
  synonyms: {
    label: 'Syn',
    simple: true
  },
  cryptic: {
    label: 'Abbr',
    subnav: [
      { id: 'standard', label: 'Standard' },
      { id: 'crossword', label: 'Crossword' },
      { id: 'specialist', label: 'Specialist' }
    ]
  },
  anagrams: {
    label: 'Anagram',
    subnav: [
      { id: 'wordlist', label: 'Wordlist' },
      { id: 'nutrimatic', label: 'Nutrimatic' }
    ]
  },
  starts: {
    label: 'Starts',
    subnav: [
      { id: 'wordlist', label: 'Wordlist' },
      { id: 'onelook', label: 'Onelook' },
      { id: 'nutrimatic', label: 'Nutrimatic' }
    ]
  },
  center: {
    label: 'Center',
    subnav: [
      { id: 'wordlist', label: 'Wordlist' },
      { id: 'onelook', label: 'Onelook' },
      { id: 'nutrimatic', label: 'Nutrimatic' }
    ]
  },
  ends: {
    label: 'Ends',
    subnav: [
      { id: 'wordlist', label: 'Wordlist' },
      { id: 'onelook', label: 'Onelook' },
      { id: 'nutrimatic', label: 'Nutrimatic' }
    ]
  },
  indicators: {
    label: 'Indicators',
    subnav: [
      { id: 'anagrams', label: 'Anagrams' },
      { id: 'hidden', label: 'Hidden' },
      { id: 'insertion', label: 'Insertion' },
      { id: 'deletion', label: 'Deletion' },
      { id: 'reversal', label: 'Reversal' },
      { id: 'first', label: 'First' },
      { id: 'last', label: 'Last' },
      { id: 'edge', label: 'Edge' }
    ]
  }
};

const Wordplaying = (): React.ReactElement => {
  // Core state
  const [word, setWord] = useState('');
  const [selectedLetters, setSelectedLetters] = useState([...Array(word.length).keys()]);

  // Nav state
  const [activeFilter, setActiveFilter] = useState('definition');
  const [activeSubnav, setActiveSubnav] = useState<string | null>(null);
  const [filterResult, setFilterResult] = useState<string | React.ReactNode>('');

  // Other states
  const [wordData, setWordData] = useState<WordDataMap>({});
  const [wordlist, setWordlist] = useState<Set<string>>(new Set());
  const [crypticDict, setCrypticDict] = useState<CrypticDictionary>({});
  const [indicatorLists, setIndicatorLists] = useState<IndicatorLists>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get word from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const qsWord = window.location.search.slice(1).toLowerCase() || 'example';
      setWord(qsWord);
    }
  }, []);

  // Fetch word data from Wordnik
  const fetchWordData = useCallback(async (wordToFetch: string) => {
    if (wordToFetch === '') return; 

    if (wordData[wordToFetch]) {
      return true; // Already have this word's data
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const API_KEY = process.env.NEXT_PUBLIC_WORDNIK_API_KEY;
      const baseUrl = 'https://api.wordnik.com/v4/word.json';

      // Fetch both definitions and related words in parallel
      const [definitionResponse, relatedResponse] = await Promise.all([
        fetch(`${baseUrl}/${wordToFetch}/definitions?limit=5&api_key=${API_KEY}`),
        fetch(`${baseUrl}/${wordToFetch}/relatedWords?relationshipTypes=synonym&limitPerRelationshipType=10&api_key=${API_KEY}`)
      ]);

      const [definitions, relatedWords] = await Promise.all([
        definitionResponse.json(),
        relatedResponse.json()
      ]);

      // Initialize synonyms array - handle case where relatedWords is empty or malformed
      let synonyms = [];
      if (Array.isArray(relatedWords) && relatedWords.length > 0) {
        const synonymObj = relatedWords.find(rel => rel.relationshipType === 'synonym');
        synonyms = synonymObj?.words || [];
      }

      // Check if we got any data back
      if (!definitions || definitions.length === 0) {
        console.warn(`No definitions found for word: ${wordToFetch}`);
        setWordData(prevData => ({
          ...prevData,
          [wordToFetch]: { definitions: [], synonyms }
        }));
        setIsLoading(false);
        return false;
      }
      
      // strip XML tags
      const stripXMLTags = (text: string) => {
        return text ? text.replace(/<\/?xref>/g, '') : '';
      };

      // Process the data before updating state
      const newWordData = {
        definitions: definitions.map((def: WordnikDefinition) => ({
          partOfSpeech: def.partOfSpeech || 'unknown',
          text: stripXMLTags(def.text || 'No definition available')
        })),
        synonyms
      };

      // Update state in a single batch
      setWordData(prevData => ({
        ...prevData,
        [wordToFetch]: newWordData
      }));
      
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Error fetching word data:', err);
      
      if (err && typeof err === 'object' && 'response' in err && 
        err.response && typeof err.response === 'object' && 'status' in err.response
        && err.response?.status === 404) {
        setWordData(prevData => ({
          ...prevData,
          [wordToFetch]: { definitions: [], synonyms: [] }
        }));
        setIsLoading(false);
        return false;
      }
      
      setError('Failed to fetch word data. Please check your API key.');
      setIsLoading(false);
      return false;
    }
  }, [wordData]);

  // Fetch initial word data
  useEffect(() => {
    fetchWordData(word);
  }, [word, fetchWordData]);

  // Handle main nav click
  const handleFilterClick = (filterId: string) => {
    setActiveFilter(filterId);
    // Only set subnav for items that have it
    const config = navConfig[filterId];
    if (!config.simple && config.subnav) {
      setActiveSubnav(config.subnav[0].id);
    } else {
      setActiveSubnav(null);
    }
  };

  // Handle subnav click
  const handleSubnavClick = (subnavId: string) => {
    setActiveSubnav(subnavId);
  };

  // Select/deselect all letters
  const selectAll = () => {
    setSelectedLetters([...Array(word.length).keys()]);
  };

  const clearSelection = () => {
    setSelectedLetters([]);
  };

  // Toggle letter selection
  const toggleLetter = (index: number) => {
    if (selectedLetters.includes(index)) {
      setSelectedLetters(selectedLetters.filter(i => i !== index));
    } else {
      setSelectedLetters([...selectedLetters, index]);
    }
  };

  // Get selected letters as string
  const getSelectedString = () => {
    return selectedLetters
      .sort((a, b) => a - b)
      .map(index => word[index])
      .join('');
  };

  // Generate anagrams
  const generateAnagrams = React.useCallback((str: string): string[] => {

    if (str.length <= 1) return [str];
    const result = new Set<string>();
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const remainingChars = str.slice(0, i) + str.slice(i + 1);
      const anagrams = generateAnagrams(remainingChars);
      
      for (const anagram of anagrams) {
        result.add(char + anagram);
      }
    }
    
    return Array.from(result);
  }, []);

  useEffect(() => {
    // Load wordlist
    const loadWordlist = async () => {
      try {
        const response = await fetch('/wordlist.txt');
        const text = await response.text();
        const words = new Set(text.split('\n').map(word => word.trim().toLowerCase()));
        console.log('Loaded wordlist:', words.size, 'words');
        setWordlist(words);
      } catch (error) {
        console.error('Error loading wordlist:', error);
        setError('Failed to load wordlist');
      }
    };
    
    loadWordlist();

      // Load abbreviations
    const loadAbbreviations = async () => {
      try {
        const response = await fetch('/abbreviations.yaml');
        const text = await response.text();
        const dict = YAML.parse(text);
        console.log('Abbreviations:', Object.keys(dict).length, 'entries');
        setCrypticDict(dict);
      } catch (error) {
        console.error('Error loading cryptic dictionary:', error);
        setError('Failed to load cryptic dictionary');
      }
    };
    
    loadAbbreviations();
    
    // Load indicator lists
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
        setError('Failed to load indicator lists');
      }
    };

    loadIndicators();
  }, []);

  // Display word data based on active filter
  const displayWordData = (wordToDisplay: string) => {
    const data = wordData[wordToDisplay];
    
    if (!data) return null;

    if (activeFilter === 'definition') {
      return (
        <div className="flex flex-col gap-2">
        <ul>
        {data.definitions.map((def, index) => (
          <li key={index} className="text-gray-700 list-disc ml-4">
          ({def.partOfSpeech}) {def.text}
          </li>
        ))}
        </ul>
        </div>
      );
    } else if (activeFilter === 'synonyms') {
      return (
        <div className="flex flex-col gap-2">
          <ul>
          {data.synonyms.map((synonym, index) => (
            <li key={index} className="text-gray-700 list-disc ml-4">
              {synonym}
            </li>
          ))}
          </ul>
        </div>
      );
    }
  };

  // Update results when filter or selection changes
  useEffect(() => {
    const selected = getSelectedString();
    const context = getViewContext();

    switch (context.filter) {
      case 'definition':
      case 'synonyms':
        if (selected.length === 0 || selected === word && wordData[word]) {
          setFilterResult(
            isLoading ? `Loading ${activeFilter}...` :
            displayWordData(word) || `No ${activeFilter} found`
          );
        } else if (selected !== word) {
          const subwordData = wordData[selected];
          if (subwordData) {
            setFilterResult(displayWordData(selected) || `No ${activeFilter} found for "${selected}"`);
          } else {
            setFilterResult(
              <div className="flex flex-col items-center gap-4">
                <p>Selected letters form: <strong>{selected}</strong></p>
                <button
                  onClick={async () => {
                    await fetchWordData(selected);
                    // Force re-render after fetch
                    setActiveFilter(current => current);
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                >
                  Look up &apos;{selected}&apos;
                </button>
              </div>
            );
          }
        }
        break;
      case 'cryptic':
        const upperSelected = selected.toUpperCase();
        const crypticResult = crypticDict[selected.toLowerCase()];
        setFilterResult(
          crypticResult 
            ? (
                <div className="flex flex-col gap-2">
                  <ul>
                  {crypticResult.map((result, index) => (
                    <li key={index} className="text-gray-700 list-disc ml-4">
                      {result}
                    </li>
                  ))}
                  </ul>
                </div>
              )
            : `No cryptic abbreviations found for "${upperSelected}"`
        );
        break;
      case 'anagrams':
        if (!wordlist || wordlist.size === 0) {
          setFilterResult('Loading wordlist...');
          break;
        }
        
        const anagrams: string[] = generateAnagrams(selected)
          .filter(anagram => wordlist.has(anagram.toLowerCase()));
        
        setFilterResult(
          anagrams.length > 0 
            ? (
                <div className="flex flex-col gap-2">
                  <ul>
                  {anagrams.map((anagram, index) => (
                    <li key={index} className="text-gray-700 list-disc ml-4">
                      {anagram}
                    </li>
                  ))}
                  </ul>
                </div>
              )
            : `No valid anagrams found for "${selected}"`
        );
        break;

      case 'center':
        if (!wordlist || wordlist.size === 0) {
          setFilterResult('Loading wordlist...');
          break;
        }

        // Find words that contain the selected string in the middle
        const allContainingWords = Array.from(wordlist as Set<string>)
          .filter(word => {
            // The word must be longer than the selected string
            if (word.length <= selected.length) return false;

            if ((word.length - selected.length) % 2 == 1) return false;
            
            // The selected string can't be at the start or end
            const index = word.indexOf(selected);
            if (index <= 0) return false;
            if (index + selected.length >= word.length) return false;
            
            return true;
          })
          .sort((a: string, b: string) => {
            // First sort by length
            if (a.length !== b.length) {
              return a.length - b.length;
            }
            // If lengths are equal, sort alphabetically
            return a.localeCompare(b);
          });

        // Take only the first 200 results
        const containingWords = allContainingWords.slice(0, 200);
        const hasMoreResults = allContainingWords.length > 200;

        setFilterResult(
          containingWords.length > 0 
            ? (
                <div className="flex flex-col gap-2">
                  <p className="text-gray-600 mb-2">
                    Found {allContainingWords.length} words containing &apos;{selected}&apos; in the middle
                    {hasMoreResults ? ` (showing first 200)` : ''}:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {containingWords.map((word, index) => (
                      <div key={index} className="text-gray-700">
                        {index + 1}. {word} ({word.length})
                      </div>
                    ))}
                  </div>
                </div>
              )
            : `No words found containing "${selected}" in the middle`
        );
        break;

      case 'starts':
        switch (activeSubnav) {
          case 'wordlist':
            if (!wordlist || wordlist.size === 0) {
              setFilterResult('Loading wordlist...');
              break;
            }

            // Find words that contain the selected string at the start
            const allStartingWords = Array.from(wordlist as Set<string>)
              .filter(word => {
                // The word must be longer than the selected string
                if (word.length <= selected.length) return false;

                // The selected string must be at the beginning
                const pattern = new RegExp('^' + selected);
                return pattern.test(word);
                
                return true;
              })
              .sort((a: string, b: string) => {
                // First sort by length
                if (a.length !== b.length) {
                  return a.length - b.length;
                }
                // If lengths are equal, sort alphabetically
                return a.localeCompare(b);
              });

            // Take only the first 200 results
            const startingWords = allStartingWords.slice(0, 200);
            const hasMoreStartingWords = allStartingWords.length > 200;

            setFilterResult(
              startingWords.length > 0 
                ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-gray-600 mb-2">
                        Found {allStartingWords.length} words containing &apos;{selected}&apos; at the start
                        {hasMoreStartingWords ? ` (showing first 200)` : ''}:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {startingWords.map((word, index) => (
                          <div key={index} className="text-gray-700">
                            {index + 1}. {word} ({word.length})
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                : `No words found containing "${selected}" at the start.`
            );
            break;
          case 'nutrimatic':
            setFilterResult(
            );
            break;
          default:
            break;
          }
        break;

      case 'ends':
        if (!wordlist || wordlist.size === 0) {
          setFilterResult('Loading wordlist...');
          break;
        }

        // Find words that contain the selected string at the start
        const allEndingWords = Array.from(wordlist as Set<string>)
          .filter(word => {
            // The word must be longer than the selected string
            if (word.length <= selected.length) return false;

            // The selected string must be at the end
            const pattern = new RegExp(selected + '$');
            return pattern.test(word);
          })
          .sort((a: string, b: string) => {
            // First sort by length
            if (a.length !== b.length) {
              return a.length - b.length;
            }
            // If lengths are equal, sort alphabetically
            return a.localeCompare(b);
          });

        // Take only the first 200 results
        const endingWords = allEndingWords.slice(0, 200);
        const hasMoreEndingWords = allEndingWords.length > 200;

        setFilterResult(
          endingWords.length > 0 
            ? (
                <div className="flex flex-col gap-2">
                  <p className="text-gray-600 mb-2">
                    Found {allEndingWords.length} words containing &apos;{selected}&apos; at the start
                    {hasMoreEndingWords ? ` (showing first 200)` : ''}:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {endingWords.map((word, index) => (
                      <div key={index} className="text-gray-700">
                        {index + 1}. {word} ({word.length})
                      </div>
                    ))}
                  </div>
                </div>
              )
            : `No words found containing "${selected}" at the start.`
        );
        break;
      case 'indicators':
        const indicatorType = context.subFilter || 'anagrams';
        const indicatorCategories = indicatorLists[indicatorType] || [];
        
        setFilterResult(
          <div className="flex flex-col gap-4">
            {Object.entries(indicatorCategories).map(([category, words]) => (
              <div key={category} className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h3>
                <ul className="list-disc pl-6 space-y-1">
                  {Array.isArray(words) && words.map((word, index) => (
                    <li key={index} className="text-gray-700">{word}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
        break;
      default:
        setFilterResult('Select a filter to see results');
    }
  }, [activeFilter, activeSubnav, selectedLetters, wordData, word, indicatorLists, isLoading]);

  // Render main navigation
  const renderMainNav = () => (
    <div className="flex flex-wrap gap-2 mb-6 justify-center">
      {Object.entries(navConfig).map(([id, config]) => (
        <button
          key={id}
          onClick={() => handleFilterClick(id)}
          className={`
            px-3 py-1 rounded-lg text-sm font-medium
            transition-colors duration-200
            ${activeFilter === id
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}
          `}
        >
          {config.label}
        </button>
      ))}
    </div>
  );

  // Render secondary navigation
  const renderSubNav = () => {
    const currentFilter = navConfig[activeFilter];
    if (currentFilter.simple || !currentFilter?.subnav) return null;

    return (
      <div className="flex flex-wrap gap-1 mb-6 justify-center">
        {currentFilter.subnav.map(item => (
          <button
            key={item.id}
            onClick={() => handleSubnavClick(item.id)}
            className={`
              px-2 py-1 rounded-lg text-sm font-medium
              transition-colors duration-200
              ${activeSubnav === item.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}
            `}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  };

  // Helper function to get current view context
  const getViewContext = (): ViewContext => {
    const currentFilter = navConfig[activeFilter];
    if ('simple' in currentFilter) {
      return { filter: activeFilter };
    }
    return { filter: activeFilter, subFilter: activeSubnav };
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card className="p-6">
        {/* Word display with selectable letters */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={selectAll}
            className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
            title="Select all letters"
          >
            <CheckSquare size={24} />
          </button>

          <div className="flex flex-wrap justify-center">
            {word.split('').map((letter, index) => (
            <button
              key={index}
              onClick={() => toggleLetter(index)}
              className={`
                w-12 h-12 text-xl font-bold
                transition-colors duration-200
                flex items-center justify-center
                border-t border-b border-gray-300
                ${index === 0 ? 'border-l' : ''}
                ${index === word.length - 1 ? 'border-r' : ''}
                ${selectedLetters.includes(index)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}
              `}
            >
              {letter}
            </button>
            ))}
          </div>

          <button
            onClick={clearSelection}
            className="p-2 text-gray-600 hover:text-blue-500 transition-colors"
            title="Clear selection"
          >
            <XSquare size={24} />
          </button>
        </div>

        {/* Navigation */}
        {renderMainNav()}
        {renderSubNav()}

        {/* Results display */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-gray-700 leading-relaxed">
            {filterResult}
          </div>
        </div>
      </Card>
      {error}
    </div>
  );
};

export default Wordplaying;