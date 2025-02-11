"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { CheckSquare, XSquare } from 'lucide-react';
import _ from 'lodash';

const WordAnalyzer = () => {
  // Get word from URL
  const word = new URLSearchParams(window.location.search).get('word')?.toLowerCase() || 'example';

  // State management
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [activeFilter, setActiveFilter] = useState('definition');
  const [filterResult, setFilterResult] = useState('');
  const [wordData, setWordData] = useState({});  // Changed to store multiple words
  const [wordlist, setWordlist] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch word data from Wordnik
  const fetchWordData = async (wordToFetch) => {
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

      // Process the data before updating state
      const newWordData = {
        definitions: definitions.map(def => ({
          partOfSpeech: def.partOfSpeech,
          text: def.text
        })),
        synonyms: relatedWords.find(rel => rel.relationshipType === 'synonym')?.words || []
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
      
      if (err.response?.status === 404) {
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
  };

  // Available filters
  const filters = [
    { id: 'definition', label: 'Definition' },
    { id: 'synonyms', label: 'Synonyms' },
    { id: 'cryptic', label: 'Abbreviations' },
    { id: 'anagrams', label: 'Anagrams' },
    { id: 'wordplay', label: 'Word Play' }
  ];

  // Select/deselect all letters
  const selectAll = () => {
    setSelectedLetters([...Array(word.length).keys()]);
  };

  const clearSelection = () => {
    setSelectedLetters([]);
  };

  // Toggle letter selection
  const toggleLetter = (index) => {
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
  const generateAnagrams = (str) => {
    if (str.length <= 1) return [str];
    const result = new Set();
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const remainingChars = str.slice(0, i) + str.slice(i + 1);
      const anagrams = generateAnagrams(remainingChars);
      
      for (const anagram of anagrams) {
        result.add(char + anagram);
      }
    }
    
    return Array.from(result);
  };

  // Load wordlist
  useEffect(() => {
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
  }, []);

  // State for cryptic dictionary
  const [crypticDict, setCrypticDict] = useState({});

  // Load cryptic dictionary
  useEffect(() => {
    const loadCrypticDict = async () => {
      try {
        const response = await fetch('/cryptic-dict.json');
        const dict = await response.json();
        console.log('Parsed dictionary:', Object.keys(dict).length, 'entries');
        setCrypticDict(dict);
      } catch (error) {
        console.error('Error loading cryptic dictionary:', error);
        setError('Failed to load cryptic dictionary');
      }
    };
    
    loadCrypticDict();
  }, []);

  // Fetch initial word data
  useEffect(() => {
    fetchWordData(word);
  }, [word]);

  // Display word data based on active filter
  const displayWordData = (wordToDisplay) => {
    const data = wordData[wordToDisplay];
    
    if (!data) return null;

    if (activeFilter === 'definition') {
      return data.definitions.map((def, i) => 
        `${i + 1}. (${def.partOfSpeech}) ${def.text}`
      ).join('\n');
    } else if (activeFilter === 'synonyms') {
      return data.synonyms.join(', ');
    }
  };

  // Update results when filter or selection changes
  useEffect(() => {
    const selected = getSelectedString();
    
    if (selected.length === 0) {
      setFilterResult('Select some letters to see results');
      return;
    }

    switch (activeFilter) {
      case 'definition':
      case 'synonyms':
        if (selected === word && wordData[word]) {
          setFilterResult(
            isLoading ? `Loading ${activeFilter}...` :
            error ? error :
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
                  Look up "{selected}"
                </button>
              </div>
            );
          }
        }
        break;
      case 'cryptic':
        const upperSelected = selected.toUpperCase();
        const crypticResult = crypticDict[upperSelected];
        setFilterResult(
          crypticResult 
            ? (
                <div className="flex flex-col gap-2">
                  {crypticResult.map((result, index) => (
                    <div key={index} className="text-gray-700">
                      {index + 1}. {result}
                    </div>
                  ))}
                </div>
              )
            : `No cryptic abbreviations found for "${selected}"`
        );
        break;
      case 'anagrams':
        if (!wordlist || wordlist.size === 0) {
          setFilterResult('Loading wordlist...');
          break;
        }
        
        const anagrams = generateAnagrams(selected)
          .filter(anagram => wordlist.has(anagram.toLowerCase()));
        
        setFilterResult(
          anagrams.length > 0 
            ? (
                <div className="flex flex-col gap-2">
                  {anagrams.map((anagram, index) => (
                    <div key={index} className="text-gray-700">
                      {index + 1}. {anagram}
                    </div>
                  ))}
                </div>
              )
            : `No valid anagrams found for "${selected}"`
        );
        break;
      case 'wordplay':
        setFilterResult(`Selected letters can be used in: ${selected.split('').join(' + ')}`);
        break;
      default:
        setFilterResult('Select a filter to see results');
    }
  }, [activeFilter, selectedLetters, wordData, word, isLoading, error]);

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

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium
                transition-colors duration-200
                ${activeFilter === filter.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Results display */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-gray-700 leading-relaxed">
            {filterResult}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default WordAnalyzer;