export type Category = 'all' | 'food' | 'outdoors' | 'events' | 'culture' | 'daytrip';
export type Mood = 'anything' | 'romantic' | 'fun' | 'chill' | 'adventurous' | 'family';
export interface Activity {
 id: string; title: string; category: Category; description: string; image?: string;
 moods: Mood[]; price?: number; duration?: string; distance?: number; source: string;
 url?: string; address?: string; date?: string; endDate?: string; lat?: number; lon?: number;
 dining?: ('sitdown' | 'takeout')[]; indoor?: boolean; accessible?: boolean; personal?: boolean;
 inspiration?: boolean; visited?: boolean; rating?: number; hours?: string; phone?: string; cuisine?: string;
}
export interface Filters { category: Category; mood: Mood; radius: number; budget: number; dining: string; date: string; newOnly: boolean; indoor: string; accessible: boolean; query: string }
export interface Location { zip: string; city: string; state: string; lat: number; lon: number }
