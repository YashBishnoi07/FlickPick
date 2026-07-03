import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useTMDB = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchMovies = useCallback(async (filters, overridePage) => {
    setLoading(true);
    try {
      const targetPage = overridePage || pageRef.current;
      const { services, genres, decade, runtime, actor, searchQuery } = filters;
      
      const response = await axios.get(`${API_URL}/api/movies`, {
        params: { services, genres, decade, runtime, actor, searchQuery, page: targetPage }
      });
      
      const newMovies = response.data.results || [];
      if (newMovies.length === 0) {
        setHasMore(false);
      } else {
        setMovies(prev => overridePage === 1 ? newMovies : [...prev, ...newMovies]);
        pageRef.current = targetPage + 1;
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { movies, loading, fetchMovies, hasMore };
};
