"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeSlashIcon, TrashIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";

interface Artist {
  spotifyId: string;
  name: string;
  imageUrl: string;
  genres: { name: string }[];
  hidden: boolean;
}

interface SpotifyArtistsDisplayProps {
  artists?: Artist[];
  isConnected: boolean;
  onDisconnect?: () => void;
  isEditable?: boolean;
  onArtistsChange?: (artists: Artist[]) => void;
}

export const SpotifyArtistsDisplaySkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square relative">
              <Skeleton className="absolute inset-0 rounded-lg" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default function SpotifyArtistsDisplay({
  artists = [],
  isConnected,
  onDisconnect,
  isEditable = false,
  onArtistsChange,
}: SpotifyArtistsDisplayProps) {
  const [localArtists, setLocalArtists] = useState<Artist[]>(artists);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setLocalArtists(artists);
  }, [artists]);

  const refreshSpotifyToken = async () => {
    try {
      // First try to refresh the token
      const response = await fetch('/api/spotify/refresh-token', {
        method: 'POST',
      });

      if (response.status === 400) {
        // If no refresh token, initiate new connection
        await onConnect();
        return null;
      }

      if (!response.ok) throw new Error('Failed to refresh token');
      
      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      toast.error('Failed to refresh Spotify connection');
      throw error;
    }
  };

  const fetchSpotifyArtists = async (token: string) => {
    const response = await fetch('https://api.spotify.com/v1/me/top/artists?limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired during request, try to refresh and retry
        const newToken = await refreshSpotifyToken();
        if (!newToken) return null; // User needs to reconnect
        
        // Retry with new token
        return fetchSpotifyArtists(newToken);
      }
      throw new Error('Failed to fetch artists');
    }
    
    const data = await response.json();
    return data.items.map((artist: any) => ({
      spotifyId: artist.id,
      name: artist.name,
      imageUrl: artist.images[0]?.url || '',
      genres: artist.genres.map((genre: string) => ({ name: genre })),
      hidden: false
    }));
  };

  const refreshArtists = async () => {
    setIsRefreshing(true);
    try {
      const token = await refreshSpotifyToken();
      if (!token) {
        // User needs to reconnect, onConnect will handle the redirect
        return;
      }

      const newArtists = await fetchSpotifyArtists(token);
      if (!newArtists) return; // Handle case where fetch failed

      // Upload to database
      const response = await fetch('/api/profile/artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artists: newArtists }),
      });

      if (!response.ok) throw new Error('Failed to update artists in database');

      setLocalArtists(newArtists);
      onArtistsChange?.(newArtists);
      toast.success('Artists refreshed successfully');
    } catch (error) {
      console.error('Error refreshing artists:', error);
      toast.error('Failed to refresh artists');
    } finally {
      setIsRefreshing(false);
    }
  };

  const deleteArtist = async (spotifyId: string) => {
    try {
      const response = await fetch(`/api/profile/artists/${spotifyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete artist');

      const updatedArtists = localArtists.filter(artist => artist.spotifyId !== spotifyId);
      setLocalArtists(updatedArtists);
      onArtistsChange?.(updatedArtists);
      toast.success('Artist removed successfully');
    } catch (error) {
      console.error('Error deleting artist:', error);
      toast.error('Failed to remove artist');
    }
  };

  const toggleArtistVisibility = async (spotifyId: string) => {
    if (!isEditable) return;

    try {
      const updatedArtists = localArtists.map(artist =>
        artist.spotifyId === spotifyId 
          ? { ...artist, hidden: !artist.hidden }
          : artist
      );

      setLocalArtists(updatedArtists);
      onArtistsChange?.(updatedArtists);

      const response = await fetch(`/api/profile/artists/${spotifyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !localArtists.find(a => a.spotifyId === spotifyId)?.hidden })
      });

      if (!response.ok) throw new Error('Failed to update artist visibility');
    } catch (error) {
      console.error('Error toggling artist visibility:', error);
      toast.error('Failed to update artist visibility');
    }
  };

  const onConnect = async () => {
    try {
      const response = await fetch(`/api/spotify/authorize?isProfile=${isEditable}`);
      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error) {
      console.error('Error connecting to Spotify:', error);
      toast.error('Failed to connect to Spotify');
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <Button 
          onClick={onConnect}
          className="bg-[#1DB954] hover:bg-[#1ed760] text-white"
        >
          Connect to Spotify
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Your Top Artists</h3>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={refreshArtists}
            disabled={isRefreshing}
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Artists
          </Button>
          {/* {onDisconnect && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          )} */}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {localArtists.map((artist) => (
          <div 
            key={artist.spotifyId}
            className={`relative group ${artist.hidden ? 'opacity-50' : ''}`}
          >
            <div className="aspect-square relative rounded-lg overflow-hidden">
              <Image
                src={artist.imageUrl}
                alt={artist.name}
                fill
                className="object-cover"
              />
              {isEditable && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleArtistVisibility(artist.spotifyId)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    {artist.hidden ? (
                      <EyeIcon className="w-5 h-5 text-white" />
                    ) : (
                      <EyeSlashIcon className="w-5 h-5 text-white" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteArtist(artist.spotifyId)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5 text-white" />
                  </button>
                </div>
              )}
            </div>
            <h3 className="mt-2 font-semibold">{artist.name}</h3>
            <p className="text-sm text-gray-500">
              {artist.genres.map(g => g.name).join(', ')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
} 