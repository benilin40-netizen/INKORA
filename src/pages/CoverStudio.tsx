import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Download, Save, Undo, Redo, RotateCcw, Image as ImageIcon, 
  Upload, Check, AlertCircle, Sparkles, Eye, EyeOff, Palette, Type, Sliders, 
  Layout, Layers, Move, Copy, Trash2, Lock, Unlock, ZoomIn, ZoomOut, 
  Maximize, Grid, BookOpen, ChevronRight, ChevronDown, AlignLeft, 
  AlignCenter, AlignRight, Plus, Square, Circle, Minus, Maximize2, 
  ExternalLink, Frame, RefreshCw, X, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, FileImage, Wand2, ShieldAlert
} from 'lucide-react';
import { Story, CoverConfig, CoverElement, CoverElementType, User } from '../types';
import { AIService } from '../services/ai';

interface CoverStudioProps {
  stories: Story[];
  initialStoryId?: string;
  currentUser?: User;
  onBack: () => void;
  onSaveCover: (storyId: string, cover: CoverConfig) => Promise<void> | void;
}

// Publishing Canvas Presets
interface CanvasPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  aspect: string;
  description: string;
}

const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'portrait-ebook', name: 'Portrait eBook (1600 × 2560)', width: 1600, height: 2560, aspect: '5/8', description: 'Amazon KDP, Apple Books & standard digital publishing' },
  { id: 'digital-std', name: 'Digital Standard (2:3)', width: 1600, height: 2400, aspect: '2/3', description: 'Standard 2:3 digital manuscript cover' },
  { id: 'compact-reader', name: 'Compact Reader (3:4)', width: 1200, height: 1600, aspect: '3/4', description: 'Tablets, e-readers and preview cards' },
  { id: 'print-6x9', name: 'Print Trade 6×9 (2:3)', width: 1800, height: 2700, aspect: '2/3', description: 'Standard paperback front cover' },
  { id: 'square', name: 'Audiobook & Square (1:1)', width: 1600, height: 1600, aspect: '1/1', description: 'Audiobook and square promotional editions' },
];

// Curated Google Fonts
const FONT_OPTIONS = [
  { id: 'Playfair Display', name: 'Playfair Display', category: 'Serif (Classic Literary)', font: "'Playfair Display', serif" },
  { id: 'Cinzel', name: 'Cinzel', category: 'Display (Epic Fantasy)', font: "'Cinzel', serif" },
  { id: 'Cinzel Decorative', name: 'Cinzel Decorative', category: 'Ornate (Mythic / Royal)', font: "'Cinzel Decorative', serif" },
  { id: 'Cormorant Garamond', name: 'Cormorant Garamond', category: 'Serif (Fine Poetry & Drama)', font: "'Cormorant Garamond', serif" },
  { id: 'EB Garamond', name: 'EB Garamond', category: 'Serif (Archival & Historic)', font: "'EB Garamond', serif" },
  { id: 'Merriweather', name: 'Merriweather', category: 'Serif (Editorial Fiction)', font: "'Merriweather', serif" },
  { id: 'Lora', name: 'Lora', category: 'Serif (Contemporary Romance)', font: "'Lora', serif" },
  { id: 'Montserrat', name: 'Montserrat', category: 'Sans-serif (Modern Sci-Fi)', font: "'Montserrat', sans-serif" },
  { id: 'Oswald', name: 'Oswald', category: 'Sans (Bold Thriller & Noir)', font: "'Oswald', sans-serif" },
  { id: 'Georgia', name: 'Georgia', category: 'Classic System Serif', font: 'Georgia, serif' },
  { id: 'Courier Prime', name: 'Courier Prime', category: 'Monospace (Manuscript)', font: "'Courier Prime', monospace" },
];

// Preset Gradients
const GRADIENT_PRESETS = [
  { name: 'Obsidian Velvet', value: 'linear-gradient(135deg, #09090b 0%, #1c1917 50%, #000000 100%)' },
  { name: 'Celestial Rose', value: 'linear-gradient(135deg, #1f1017 0%, #3f1222 50%, #09090b 100%)' },
  { name: 'Midnight Astral', value: 'linear-gradient(135deg, #07111c 0%, #132a40 50%, #05080f 100%)' },
  { name: 'Emerald Sanctuary', value: 'linear-gradient(135deg, #06170f 0%, #0e3022 50%, #040906 100%)' },
  { name: 'Amber Solitude', value: 'linear-gradient(135deg, #211306 0%, #45240c 50%, #0a0603 100%)' },
  { name: 'Gothic Amethyst', value: 'linear-gradient(135deg, #160820 0%, #331046 50%, #07030c 100%)' },
  { name: 'Crimson Abyss', value: 'linear-gradient(135deg, #26070a 0%, #4b1016 50%, #0c0203 100%)' },
  { name: 'Nordic Frost', value: 'linear-gradient(135deg, #121820 0%, #253340 50%, #0a0d12 100%)' },
  { name: 'Royal Parchment', value: 'linear-gradient(135deg, #2a221b 0%, #3f3328 50%, #15110d 100%)' },
  { name: 'Abyssal Deep', value: 'linear-gradient(135deg, #050b14 0%, #0c1b2f 50%, #020509 100%)' },
  { name: 'Blood Moon', value: 'linear-gradient(135deg, #300609 0%, #180305 60%, #0a0102 100%)' },
  { name: 'Sage Twilight', value: 'linear-gradient(135deg, #121f19 0%, #20352c 50%, #0a110e 100%)' },
];

// Curated Background Textures
const CURATED_TEXTURES = [
  { id: 'tex-parchment', name: 'Archival Parchment', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1200' },
  { id: 'tex-nebula', name: 'Celestial Nebula', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&q=80&w=1200' },
  { id: 'tex-mist', name: 'Forest in Mist', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=1200' },
  { id: 'tex-night', name: 'Starlit Mountain', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1200' },
  { id: 'tex-velvet', name: 'Shadow Texture', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200' },
  { id: 'tex-waves', name: 'Ocean Depths', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&q=80&w=1200' },
];

// Professional Starter Templates
interface TemplatePreset {
  id: string;
  name: string;
  genreTag: string;
  description: string;
  bgType: 'gradient' | 'color' | 'image';
  bgColor: string;
  bgGradient: string;
  bgImage?: string;
  overlayPattern: 'none' | 'dots' | 'grid' | 'vignette' | 'stars';
  overlayOpacity: number;
  elements: Omit<CoverElement, 'id'>[];
}

const TEMPLATES: TemplatePreset[] = [
  {
    id: 'minimalist-literary',
    name: 'Minimalist Literary Fiction',
    genreTag: 'Literary',
    description: 'Clean typographic hierarchy, generous whitespace, understated elegance.',
    bgType: 'gradient',
    bgColor: '#171412',
    bgGradient: 'linear-gradient(135deg, #1f1b17 0%, #12100e 100%)',
    overlayPattern: 'vignette',
    overlayOpacity: 0.3,
    elements: [
      {
        type: 'frame',
        name: 'Delicate Framing',
        x: 6,
        y: 6,
        width: 88,
        height: 88,
        strokeColor: '#fdf6e2',
        strokeWidth: 1,
        opacity: 0.25,
        locked: true,
      },
      {
        type: 'text',
        name: 'Genre Tag',
        textRole: 'badge',
        content: 'A NOVEL',
        x: 10,
        y: 18,
        width: 80,
        fontFamily: 'Montserrat',
        fontSize: 14,
        fontWeight: 600,
        textAlign: 'center',
        letterSpacing: 8,
        color: '#d4af37',
        textTransform: 'uppercase',
      },
      {
        type: 'text',
        name: 'Book Title',
        textRole: 'title',
        content: 'The Architecture of Silence',
        x: 10,
        y: 35,
        width: 80,
        fontFamily: 'Cormorant Garamond',
        fontSize: 46,
        fontWeight: 600,
        fontStyle: 'normal',
        textAlign: 'center',
        lineHeight: 1.15,
        letterSpacing: 1,
        color: '#fdf6e2',
      },
      {
        type: 'line',
        name: 'Divider Line',
        x: 35,
        y: 54,
        width: 30,
        height: 1,
        fillColor: '#d4af37',
        opacity: 0.6,
      },
      {
        type: 'text',
        name: 'Subtitle',
        textRole: 'subtitle',
        content: 'Memories etched in quiet stone',
        x: 12,
        y: 60,
        width: 76,
        fontFamily: 'Playfair Display',
        fontSize: 18,
        fontStyle: 'italic',
        textAlign: 'center',
        color: '#d6cfc7',
      },
      {
        type: 'text',
        name: 'Author Name',
        textRole: 'author',
        content: 'Elena Vance',
        x: 10,
        y: 84,
        width: 80,
        fontFamily: 'Cinzel',
        fontSize: 22,
        fontWeight: 600,
        textAlign: 'center',
        letterSpacing: 6,
        color: '#fdf6e2',
        textTransform: 'uppercase',
      }
    ]
  },
  {
    id: 'contemporary-romance',
    name: 'Contemporary Romance',
    genreTag: 'Romance',
    description: 'Blush velvet tones, romantic serif titles, and warm atmospheric glow.',
    bgType: 'gradient',
    bgColor: '#200b14',
    bgGradient: 'linear-gradient(135deg, #2b0b18 0%, #4a1329 50%, #15050c 100%)',
    overlayPattern: 'stars',
    overlayOpacity: 0.25,
    elements: [
      {
        type: 'text',
        name: 'Bestseller Badge',
        textRole: 'badge',
        content: '★ NEW YORK TIMES BESTSELLER ★',
        x: 10,
        y: 12,
        width: 80,
        fontFamily: 'Montserrat',
        fontSize: 12,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 4,
        color: '#fbcfe8',
      },
      {
        type: 'text',
        name: 'Book Title',
        textRole: 'title',
        content: 'Unwritten Letters to Autumn',
        x: 8,
        y: 36,
        width: 84,
        fontFamily: 'Playfair Display',
        fontSize: 52,
        fontWeight: 700,
        fontStyle: 'italic',
        textAlign: 'center',
        lineHeight: 1.1,
        color: '#f43f5e',
        textShadow: '0 4px 20px rgba(0,0,0,0.8)',
      },
      {
        type: 'text',
        name: 'Tagline',
        textRole: 'tagline',
        content: 'Some heartbeats cannot be rewritten.',
        x: 10,
        y: 58,
        width: 80,
        fontFamily: 'Lora',
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
        color: '#fed7aa',
      },
      {
        type: 'text',
        name: 'Author Name',
        textRole: 'author',
        content: 'Clara Sterling',
        x: 10,
        y: 84,
        width: 80,
        fontFamily: 'Montserrat',
        fontSize: 24,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 4,
        color: '#ffffff',
        textTransform: 'uppercase',
      }
    ]
  },
  {
    id: 'fantasy-magical',
    name: 'Fantasy & Magical Realism',
    genreTag: 'Fantasy',
    description: 'Ornate gold typography, celestial astral gradient, and imperial double border.',
    bgType: 'gradient',
    bgColor: '#08131e',
    bgGradient: 'linear-gradient(135deg, #071320 0%, #12283e 50%, #04080e 100%)',
    overlayPattern: 'stars',
    overlayOpacity: 0.35,
    elements: [
      {
        type: 'frame',
        name: 'Outer Gold Frame',
        x: 5,
        y: 5,
        width: 90,
        height: 90,
        strokeColor: '#fbbf24',
        strokeWidth: 2,
        opacity: 0.5,
        locked: true,
      },
      {
        type: 'frame',
        name: 'Inner Gold Frame',
        x: 7,
        y: 7,
        width: 86,
        height: 86,
        strokeColor: '#f59e0b',
        strokeWidth: 1,
        opacity: 0.3,
        locked: true,
      },
      {
        type: 'text',
        name: 'Chronicle Badge',
        textRole: 'badge',
        content: 'THE CHRONICLES OF ASTRALIS • BOOK I',
        x: 10,
        y: 14,
        width: 80,
        fontFamily: 'Cinzel',
        fontSize: 12,
        fontWeight: 600,
        textAlign: 'center',
        letterSpacing: 4,
        color: '#fef3c7',
      },
      {
        type: 'text',
        name: 'Book Title',
        textRole: 'title',
        content: 'CROWN OF ASTRAL EMBERS',
        x: 8,
        y: 38,
        width: 84,
        fontFamily: 'Cinzel',
        fontSize: 48,
        fontWeight: 900,
        textAlign: 'center',
        lineHeight: 1.15,
        letterSpacing: 2,
        color: '#fbbf24',
        textShadow: '0 4px 25px rgba(245, 158, 11, 0.4), 0 2px 10px rgba(0,0,0,0.9)',
      },
      {
        type: 'text',
        name: 'Subtitle',
        textRole: 'subtitle',
        content: 'When gods sleep, the stars ignite.',
        x: 10,
        y: 60,
        width: 80,
        fontFamily: 'Cormorant Garamond',
        fontSize: 18,
        fontStyle: 'italic',
        textAlign: 'center',
        color: '#bae6fd',
      },
      {
        type: 'text',
        name: 'Author Name',
        textRole: 'author',
        content: 'Valerius Thorne',
        x: 10,
        y: 84,
        width: 80,
        fontFamily: 'Cinzel',
        fontSize: 24,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 6,
        color: '#fef3c7',
        textTransform: 'uppercase',
      }
    ]
  },
  {
    id: 'mystery-thriller',
    name: 'Mystery & Psychological Thriller',
    genreTag: 'Thriller',
    description: 'High-contrast noir shadows, bold condensed titling, and heavy vignette.',
    bgType: 'gradient',
    bgColor: '#09090b',
    bgGradient: 'linear-gradient(135deg, #111113 0%, #18181b 50%, #050506 100%)',
    overlayPattern: 'vignette',
    overlayOpacity: 0.65,
    elements: [
      {
        type: 'text',
        name: 'Hook Line',
        textRole: 'tagline',
        content: 'EVERY LIE LEAVES A BODY.',
        x: 10,
        y: 12,
        width: 80,
        fontFamily: 'Oswald',
        fontSize: 14,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 5,
        color: '#ef4444',
      },
      {
        type: 'text',
        name: 'Book Title',
        textRole: 'title',
        content: 'THE LAST WHISPER IN BERLIN',
        x: 6,
        y: 35,
        width: 88,
        fontFamily: 'Oswald',
        fontSize: 58,
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.05,
        letterSpacing: 1,
        color: '#ffffff',
        textShadow: '0 4px 15px rgba(0,0,0,0.9)',
      },
      {
        type: 'line',
        name: 'Blood Red Divider',
        x: 20,
        y: 62,
        width: 60,
        height: 3,
        fillColor: '#dc2626',
        opacity: 0.9,
      },
      {
        type: 'text',
        name: 'Subtitle',
        textRole: 'subtitle',
        content: 'A Detective Marcus Cross Investigation',
        x: 10,
        y: 68,
        width: 80,
        fontFamily: 'Montserrat',
        fontSize: 14,
        fontWeight: 600,
        textAlign: 'center',
        letterSpacing: 2,
        color: '#a1a1aa',
      },
      {
        type: 'text',
        name: 'Author Name',
        textRole: 'author',
        content: 'H. G. KAUFMAN',
        x: 10,
        y: 85,
        width: 80,
        fontFamily: 'Oswald',
        fontSize: 26,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 4,
        color: '#ffffff',
      }
    ]
  },
  {
    id: 'gothic-horror',
    name: 'Gothic Horror & Dark Macabre',
    genreTag: 'Horror',
    description: 'Blood moon gradients, unsettling shadows, and dramatic gothic typography.',
    bgType: 'gradient',
    bgColor: '#160205',
    bgGradient: 'linear-gradient(135deg, #2b050a 0%, #110103 50%, #050001 100%)',
    overlayPattern: 'vignette',
    overlayOpacity: 0.75,
    elements: [
      {
        type: 'text',
        name: 'Warning Badge',
        textRole: 'badge',
        content: 'ENTER AT YOUR OWN PERIL',
        x: 10,
        y: 15,
        width: 80,
        fontFamily: 'Cinzel Decorative',
        fontSize: 13,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 4,
        color: '#f87171',
      },
      {
        type: 'text',
        name: 'Book Title',
        textRole: 'title',
        content: 'The Manor of Bleeding Shadows',
        x: 8,
        y: 38,
        width: 84,
        fontFamily: 'Cinzel Decorative',
        fontSize: 48,
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.15,
        color: '#fecaca',
        textShadow: '0 0 30px rgba(220, 38, 38, 0.6), 0 2px 10px #000000',
      },
      {
        type: 'text',
        name: 'Subtitle',
        textRole: 'subtitle',
        content: 'Some doors were never meant to be unlocked.',
        x: 10,
        y: 62,
        width: 80,
        fontFamily: 'Cormorant Garamond',
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
        color: '#d1d5db',
      },
      {
        type: 'text',
        name: 'Author Name',
        textRole: 'author',
        content: 'Silas Blackwood',
        x: 10,
        y: 84,
        width: 80,
        fontFamily: 'Cinzel',
        fontSize: 22,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 6,
        color: '#f87171',
        textTransform: 'uppercase',
      }
    ]
  },
  {
    id: 'sci-fi-cyber',
    name: 'Science Fiction & Cyberpunk',
    genreTag: 'Sci-Fi',
    description: 'Sleek geometric typography, dark grid lines, and cyan/emerald accents.',
    bgType: 'gradient',
    bgColor: '#06111a',
    bgGradient: 'linear-gradient(135deg, #05141e 0%, #0d2838 50%, #04090f 100%)',
    overlayPattern: 'grid',
    overlayOpacity: 0.35,
    elements: [
      {
        type: 'text',
        name: 'System Code',
        textRole: 'badge',
        content: 'NEURAL PROTOCOL // SEQUENCE 09',
        x: 10,
        y: 12,
        width: 80,
        fontFamily: 'Courier Prime',
        fontSize: 12,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 3,
        color: '#38bdf8',
      },
      {
        type: 'text',
        name: 'Book Title',
        textRole: 'title',
        content: 'GHOST IN THE SYNAPSE',
        x: 6,
        y: 38,
        width: 88,
        fontFamily: 'Montserrat',
        fontSize: 48,
        fontWeight: 900,
        textAlign: 'center',
        lineHeight: 1.1,
        letterSpacing: 3,
        color: '#38bdf8',
        textShadow: '0 0 20px rgba(56, 189, 248, 0.5), 0 2px 10px #000000',
      },
      {
        type: 'text',
        name: 'Tagline',
        textRole: 'tagline',
        content: 'Human consciousness is just code waiting to be overwritten.',
        x: 12,
        y: 60,
        width: 76,
        fontFamily: 'Montserrat',
        fontSize: 14,
        fontWeight: 400,
        textAlign: 'center',
        color: '#94a3b8',
      },
      {
        type: 'text',
        name: 'Author Name',
        textRole: 'author',
        content: 'KAI CHEN',
        x: 10,
        y: 84,
        width: 80,
        fontFamily: 'Montserrat',
        fontSize: 22,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 8,
        color: '#f8fafc',
      }
    ]
  },
  {
    id: 'fine-poetry',
    name: 'Fine Poetry & Verse',
    genreTag: 'Poetry',
    description: 'Archival parchment tones, delicate italic typography, and subtle framing.',
    bgType: 'gradient',
    bgColor: '#1c1713',
    bgGradient: 'linear-gradient(135deg, #261f18 0%, #3a2e23 50%, #15110d 100%)',
    overlayPattern: 'vignette',
    overlayOpacity: 0.35,
    elements: [
      {
        type: 'frame',
        name: 'Subtle Frame',
        x: 8,
        y: 8,
        width: 84,
        height: 84,
        strokeColor: '#d4af37',
        strokeWidth: 1,
        opacity: 0.3,
        locked: true,
      },
      {
        type: 'text',
        name: 'Book Title',
        textRole: 'title',
        content: 'Whispers in the Amber Hour',
        x: 8,
        y: 36,
        width: 84,
        fontFamily: 'Cormorant Garamond',
        fontSize: 44,
        fontWeight: 600,
        fontStyle: 'italic',
        textAlign: 'center',
        lineHeight: 1.2,
        color: '#fef3c7',
        textShadow: '0 2px 10px rgba(0,0,0,0.8)',
      },
      {
        type: 'text',
        name: 'Subtitle',
        textRole: 'subtitle',
        content: 'Collected Verses on Solitude & Light',
        x: 10,
        y: 60,
        width: 80,
        fontFamily: 'Playfair Display',
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
        color: '#d4af37',
      },
      {
        type: 'text',
        name: 'Author Name',
        textRole: 'author',
        content: 'Julian Vane',
        x: 10,
        y: 84,
        width: 80,
        fontFamily: 'Cormorant Garamond',
        fontSize: 20,
        fontStyle: 'italic',
        textAlign: 'center',
        letterSpacing: 4,
        color: '#fef3c7',
      }
    ]
  },
  {
    id: 'children-whimsical',
    name: "Children's Whimsical Tales",
    genreTag: "Children's",
    description: 'Playful vibrant typography, warm storytelling composition, and bright charm.',
    bgType: 'gradient',
    bgColor: '#0f172a',
    bgGradient: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #090d16 100%)',
    overlayPattern: 'stars',
    overlayOpacity: 0.2,
    elements: [
      {
        type: 'text',
        name: 'Magical Badge',
        textRole: 'badge',
        content: '✨ AN ENCHANTED ADVENTURE ✨',
        x: 10,
        y: 14,
        width: 80,
        fontFamily: 'Montserrat',
        fontSize: 14,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 2,
        color: '#fbbf24',
      },
      {
        type: 'text',
        name: 'Book Title',
        textRole: 'title',
        content: 'The Dragon Who Forgot How to Fly',
        x: 6,
        y: 35,
        width: 88,
        fontFamily: 'Playfair Display',
        fontSize: 48,
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.15,
        color: '#fdf6e2',
        textShadow: '0 4px 20px rgba(0,0,0,0.8)',
      },
      {
        type: 'text',
        name: 'Subtitle',
        textRole: 'subtitle',
        content: 'Illustrated by Maya Lin',
        x: 10,
        y: 62,
        width: 80,
        fontFamily: 'Lora',
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
        color: '#93c5fd',
      },
      {
        type: 'text',
        name: 'Author Name',
        textRole: 'author',
        content: 'Oliver P. Finch',
        x: 10,
        y: 84,
        width: 80,
        fontFamily: 'Montserrat',
        fontSize: 22,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 3,
        color: '#fbbf24',
        textTransform: 'uppercase',
      }
    ]
  },
  {
    id: 'non-fiction',
    name: 'Professional Non-Fiction & Business',
    genreTag: 'Non-Fiction',
    description: 'Structured clean layout, bold modern sans typography, authoritative tone.',
    bgType: 'gradient',
    bgColor: '#0f172a',
    bgGradient: 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #030712 100%)',
    overlayPattern: 'grid',
    overlayOpacity: 0.25,
    elements: [
      {
        type: 'text',
        name: 'Category Badge',
        textRole: 'badge',
        content: 'MASTERING STRATEGY & LEADERSHIP',
        x: 10,
        y: 12,
        width: 80,
        fontFamily: 'Montserrat',
        fontSize: 12,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 4,
        color: '#38bdf8',
        textTransform: 'uppercase',
      },
      {
        type: 'text',
        name: 'Book Title',
        textRole: 'title',
        content: 'THE DISCIPLINE OF FOCUS',
        x: 6,
        y: 36,
        width: 88,
        fontFamily: 'Montserrat',
        fontSize: 52,
        fontWeight: 900,
        textAlign: 'center',
        lineHeight: 1.1,
        letterSpacing: 2,
        color: '#ffffff',
        textShadow: '0 4px 15px rgba(0,0,0,0.9)',
      },
      {
        type: 'line',
        name: 'Accent Line',
        x: 30,
        y: 58,
        width: 40,
        height: 2,
        fillColor: '#38bdf8',
        opacity: 0.8,
      },
      {
        type: 'text',
        name: 'Subtitle',
        textRole: 'subtitle',
        content: 'How High Performers Outthink Distraction',
        x: 10,
        y: 64,
        width: 80,
        fontFamily: 'Montserrat',
        fontSize: 16,
        fontWeight: 500,
        textAlign: 'center',
        color: '#94a3b8',
      },
      {
        type: 'text',
        name: 'Author Name',
        textRole: 'author',
        content: 'ARTHUR V. PENDLETON',
        x: 10,
        y: 84,
        width: 80,
        fontFamily: 'Montserrat',
        fontSize: 20,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 6,
        color: '#ffffff',
      }
    ]
  },
  {
    id: 'timeless-classic',
    name: 'Timeless Classic',
    genreTag: 'Classic',
    description: 'Restrained colors, balanced spacing, and timeless archival typography.',
    bgType: 'gradient',
    bgColor: '#1c1917',
    bgGradient: 'linear-gradient(135deg, #292524 0%, #1c1917 50%, #0c0a09 100%)',
    overlayPattern: 'vignette',
    overlayOpacity: 0.3,
    elements: [
      {
        type: 'frame',
        name: 'Classic Frame',
        x: 6,
        y: 6,
        width: 88,
        height: 88,
        strokeColor: '#e7e5e4',
        strokeWidth: 1,
        opacity: 0.3,
        locked: true,
      },
      {
        type: 'text',
        name: 'Book Title',
        textRole: 'title',
        content: 'The Odyssey of Common Days',
        x: 8,
        y: 35,
        width: 84,
        fontFamily: 'EB Garamond',
        fontSize: 48,
        fontWeight: 700,
        textAlign: 'center',
        lineHeight: 1.15,
        color: '#f5f5f4',
      },
      {
        type: 'text',
        name: 'Subtitle',
        textRole: 'subtitle',
        content: 'An American Masterpiece',
        x: 10,
        y: 58,
        width: 80,
        fontFamily: 'Georgia',
        fontSize: 16,
        fontStyle: 'italic',
        textAlign: 'center',
        color: '#a8a29e',
      },
      {
        type: 'text',
        name: 'Author Name',
        textRole: 'author',
        content: 'Nathaniel Hawthorne',
        x: 10,
        y: 84,
        width: 80,
        fontFamily: 'Georgia',
        fontSize: 22,
        fontWeight: 600,
        textAlign: 'center',
        letterSpacing: 4,
        color: '#e7e5e4',
      }
    ]
  }
];

export const CoverStudio: React.FC<CoverStudioProps> = ({ 
  stories, 
  initialStoryId, 
  currentUser,
  onBack, 
  onSaveCover 
}) => {
  // 1. Story Selection & Association
  const selectedStory = stories.find(s => s.id === initialStoryId) || stories[0];
  const [activeStoryId, setActiveStoryId] = useState<string>(selectedStory?.id || stories[0]?.id || '');
  const currentStory = stories.find(s => s.id === activeStoryId) || selectedStory;

  const defaultAuthor = currentUser?.name || currentStory?.authorName || 'Author';

  // Helper to convert legacy CoverConfig into interactive elements
  const createElementsFromLegacy = (cfg: CoverConfig): CoverElement[] => {
    if (cfg.elements && cfg.elements.length > 0) {
      return cfg.elements;
    }

    const titleEl: CoverElement = {
      id: `el_title_${Date.now()}`,
      type: 'text',
      name: 'Book Title',
      textRole: 'title',
      content: cfg.title || 'Untitled Masterpiece',
      x: 10,
      y: cfg.titlePosition ? cfg.titlePosition.y : 35,
      width: 80,
      fontFamily: cfg.fontFamily === 'sans' ? 'Montserrat' : cfg.fontFamily === 'mono' ? 'Courier Prime' : 'Playfair Display',
      fontSize: (cfg.titleSize || 2.4) * 18,
      fontWeight: cfg.fontWeight || 'bold',
      fontStyle: cfg.fontStyle || 'normal',
      textAlign: cfg.textAlign || 'center',
      color: cfg.titleColor || '#f43f5e',
      lineHeight: 1.15,
      letterSpacing: 1,
    };

    const authorEl: CoverElement = {
      id: `el_author_${Date.now() + 1}`,
      type: 'text',
      name: 'Author Name',
      textRole: 'author',
      content: cfg.author || defaultAuthor,
      x: 10,
      y: cfg.authorPosition ? cfg.authorPosition.y : 85,
      width: 80,
      fontFamily: cfg.fontFamily === 'sans' ? 'Montserrat' : 'Cinzel',
      fontSize: 22,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: cfg.textAlign || 'center',
      color: cfg.authorColor || '#e4e4e7',
      letterSpacing: 5,
      textTransform: 'uppercase',
    };

    const list: CoverElement[] = [titleEl];

    if (cfg.subtitle) {
      list.push({
        id: `el_sub_${Date.now() + 2}`,
        type: 'text',
        name: 'Subtitle',
        textRole: 'subtitle',
        content: cfg.subtitle,
        x: 12,
        y: (cfg.titlePosition ? cfg.titlePosition.y : 35) + 16,
        width: 76,
        fontFamily: 'Lora',
        fontSize: (cfg.subtitleSize || 1.1) * 16,
        fontStyle: 'italic',
        textAlign: cfg.textAlign || 'center',
        color: cfg.subtitleColor || '#e4e4e7',
      });
    }

    if (cfg.tagline) {
      list.push({
        id: `el_tag_${Date.now() + 3}`,
        type: 'text',
        name: 'Tagline',
        textRole: 'tagline',
        content: cfg.tagline,
        x: 10,
        y: 65,
        width: 80,
        fontFamily: 'Lora',
        fontSize: 15,
        fontStyle: 'italic',
        textAlign: cfg.textAlign || 'center',
        color: '#fef3c7',
      });
    }

    if (cfg.badgeText) {
      list.push({
        id: `el_badge_${Date.now() + 4}`,
        type: 'text',
        name: 'Badge / Header',
        textRole: 'badge',
        content: cfg.badgeText,
        x: 10,
        y: 12,
        width: 80,
        fontFamily: 'Montserrat',
        fontSize: 12,
        fontWeight: 700,
        textAlign: 'center',
        letterSpacing: 3,
        color: '#fbcfe8',
      });
    }

    list.push(authorEl);
    return list;
  };

  // 2. Cover State
  const [cover, setCover] = useState<CoverConfig>(() => {
    if (currentStory?.cover) {
      return {
        ...currentStory.cover,
        width: currentStory.cover.width || 1600,
        height: currentStory.cover.height || 2400,
        elements: createElementsFromLegacy(currentStory.cover)
      };
    }
    // Default to Minimalist Literary
    const tpl = TEMPLATES[0];
    return {
      title: currentStory?.title || 'Untitled Masterpiece',
      author: defaultAuthor,
      subtitle: 'A Novel',
      tagline: 'When shadows speak, the cosmos listens.',
      genre: currentStory?.genre || 'Fiction',
      showGenre: true,
      bgColor: tpl.bgColor,
      bgGradient: tpl.bgGradient,
      bgType: tpl.bgType,
      bgImage: tpl.bgImage || '',
      overlayPattern: tpl.overlayPattern,
      overlayOpacity: tpl.overlayOpacity,
      overlayColor: '#000000',
      fontFamily: 'serif',
      fontStyle: 'normal',
      fontWeight: 'bold',
      textAlign: 'center',
      titleColor: '#fdf6e2',
      authorColor: '#fdf6e2',
      titleSize: 2.4,
      titlePosition: { x: 50, y: 35 },
      authorPosition: { x: 50, y: 84 },
      width: 1600,
      height: 2400,
      elements: tpl.elements.map((el, i) => ({ ...el, id: `el_${Date.now()}_${i}` }))
    };
  });

  // History stack for Undo / Redo
  const [history, setHistory] = useState<CoverConfig[]>([]);
  const [redoStack, setRedoStack] = useState<CoverConfig[]>([]);

  // Selection & UI Panels
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'templates' | 'elements' | 'artwork' | 'typography' | 'layers' | 'ai'>('templates');
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [showSafeMargins, setShowSafeMargins] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'none' | 'distraction-free' | '3d-mockup'>('none');
  
  // Save & Export Status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportScale, setExportScale] = useState<number>(1);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [customWidth, setCustomWidth] = useState<number>(cover.width || 1600);
  const [customHeight, setCustomHeight] = useState<number>(cover.height || 2560);
  const [recoverableDraft, setRecoverableDraft] = useState<{ cover: CoverConfig; savedAt: number } | null>(null);

  // AI Cover Suggestions
  const [aiSuggestions, setAiSuggestions] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Canvas Refs & Dragging
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasElementRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartPos = useRef<{ x: number; y: number; elX: number; elY: number }>({ x: 0, y: 0, elX: 0, elY: 0 });

  // Upload Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userUploadedImages, setUserUploadedImages] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('inokora_cover_uploads_v2');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const selectedElement = cover.elements?.find(e => e.id === selectedElementId);

  // Check for local recovery draft on story switch
  useEffect(() => {
    if (activeStoryId) {
      try {
        const raw = localStorage.getItem(`inokora_cover_draft_${activeStoryId}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.cover && parsed.savedAt > (currentStory?.updatedAt || 0) + 2000) {
            setRecoverableDraft(parsed);
          }
        }
      } catch {}
    }
  }, [activeStoryId]);

  // Sync when active story switches
  useEffect(() => {
    if (currentStory) {
      if (currentStory.cover) {
        setCover({
          ...currentStory.cover,
          width: currentStory.cover.width || 1600,
          height: currentStory.cover.height || 2560,
          elements: createElementsFromLegacy(currentStory.cover)
        });
        setCustomWidth(currentStory.cover.width || 1600);
        setCustomHeight(currentStory.cover.height || 2560);
      } else {
        const tpl = TEMPLATES[0];
        setCover({
          title: currentStory.title || 'Untitled Masterpiece',
          author: currentStory.authorName || defaultAuthor,
          bgColor: tpl.bgColor,
          bgGradient: tpl.bgGradient,
          bgType: tpl.bgType,
          bgImage: '',
          overlayPattern: tpl.overlayPattern,
          overlayOpacity: tpl.overlayOpacity,
          overlayColor: '#000000',
          fontFamily: 'serif',
          titleColor: '#fdf6e2',
          authorColor: '#fdf6e2',
          titleSize: 2.4,
          titlePosition: { x: 50, y: 35 },
          authorPosition: { x: 50, y: 84 },
          width: 1600,
          height: 2560,
          elements: tpl.elements.map((el, i) => ({ ...el, id: `el_${Date.now()}_${i}` }))
        });
        setCustomWidth(1600);
        setCustomHeight(2560);
      }
      setSelectedElementId(null);
      setHistory([]);
      setRedoStack([]);
      setSaveStatus('saved');
    }
  }, [activeStoryId]);

  // Autosave to local recovery draft when unsaved
  useEffect(() => {
    if (!activeStoryId || saveStatus !== 'unsaved') return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          `inokora_cover_draft_${activeStoryId}`,
          JSON.stringify({ cover, savedAt: Date.now() })
        );
      } catch {}
    }, 1200);
    return () => clearTimeout(timer);
  }, [cover, activeStoryId, saveStatus]);

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // State mutation with full Undo support
  const updateCover = useCallback((updater: (prev: CoverConfig) => CoverConfig, recordHistory = true) => {
    setCover(prev => {
      const next = updater(prev);
      if (recordHistory) {
        setHistory(h => [...h.slice(-25), prev]);
        setRedoStack([]);
      }
      setSaveStatus('unsaved');
      return next;
    });
  }, []);

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setRedoStack(r => [cover, ...r]);
    setCover(prev);
    setSaveStatus('unsaved');
    showToast('Undo previous action');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack(r => r.slice(1));
    setHistory(h => [...h, cover]);
    setCover(next);
    setSaveStatus('unsaved');
    showToast('Redo action');
  };

  // Keyboard Shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo), Ctrl+S (Save), Delete (Delete Element)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveCover();
      } else if (cmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedElementId) {
          handleDuplicateElement(selectedElementId);
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          handleDeleteElement(selectedElementId);
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedElementId) {
          e.preventDefault();
          const step = e.shiftKey ? 2 : 0.5;
          updateCover(prev => ({
            ...prev,
            elements: (prev.elements || []).map(el => {
              if (el.id !== selectedElementId || el.locked) return el;
              let dx = 0;
              let dy = 0;
              if (e.key === 'ArrowLeft') dx = -step;
              if (e.key === 'ArrowRight') dx = step;
              if (e.key === 'ArrowUp') dy = -step;
              if (e.key === 'ArrowDown') dy = step;
              return {
                ...el,
                x: Math.max(0, Math.min(100 - (el.width || 20), el.x + dx)),
                y: Math.max(0, Math.min(100, el.y + dy))
              };
            })
          }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, cover, history, redoStack]);

  // Reliable Template Selection & Application Function
  const handleApplyTemplate = (tpl: TemplatePreset) => {
    console.log('[CoverStudio] Template click received for ID:', tpl?.id, 'Name:', tpl?.name);
    
    // 1. Validate template object
    if (!tpl || !tpl.id || !Array.isArray(tpl.elements)) {
      console.error('[CoverStudio] Template validation failed: Invalid template object', tpl);
      showToast('Error: Selected template configuration is invalid.');
      return;
    }

    console.log('[CoverStudio] Template validation passed. Applying design configuration to active cover...');

    // 2. Update cover state with template configuration while preserving user content
    updateCover(prev => {
      const existingTitleEl = prev.elements?.find(e => e.textRole === 'title');
      const existingAuthorEl = prev.elements?.find(e => e.textRole === 'author');
      const existingSubEl = prev.elements?.find(e => e.textRole === 'subtitle');

      const updatedElements = tpl.elements.map((el, i) => {
        let content = el.content;
        if (el.textRole === 'title' && existingTitleEl?.content) {
          content = existingTitleEl.content;
        } else if (el.textRole === 'title' && currentStory?.title) {
          content = currentStory.title;
        }

        if (el.textRole === 'author' && existingAuthorEl?.content) {
          content = existingAuthorEl.content;
        } else if (el.textRole === 'author' && currentStory?.authorName) {
          content = currentStory.authorName;
        } else if (el.textRole === 'author' && defaultAuthor) {
          content = defaultAuthor;
        }

        if (el.textRole === 'subtitle' && existingSubEl?.content) {
          content = existingSubEl.content;
        }

        return {
          ...el,
          id: `el_${tpl.id}_${Date.now()}_${i}`,
          content
        };
      });

      console.log('[CoverStudio] Active design state successfully updated. New templateId:', tpl.id, 'Elements count:', updatedElements.length);

      return {
        ...prev,
        templateId: tpl.id,
        bgType: tpl.bgType,
        bgColor: tpl.bgColor,
        bgGradient: tpl.bgGradient,
        bgImage: tpl.bgImage || '',
        overlayPattern: tpl.overlayPattern,
        overlayOpacity: tpl.overlayOpacity,
        elements: updatedElements
      };
    });

    setSelectedElementId(null);
    showToast(`Applied "${tpl.name}" template successfully.`);
  };

  // Add a new element to canvas
  const handleAddElement = (type: CoverElementType, options?: Partial<CoverElement>) => {
    const newId = `el_${type}_${Date.now()}`;
    let newEl: CoverElement;

    if (type === 'text') {
      newEl = {
        id: newId,
        type: 'text',
        name: options?.name || 'Custom Text',
        textRole: options?.textRole || 'custom',
        content: options?.content || 'Your Text Here',
        x: 15,
        y: 50,
        width: 70,
        fontFamily: options?.fontFamily || 'Playfair Display',
        fontSize: options?.fontSize || 28,
        fontWeight: options?.fontWeight || 'bold',
        textAlign: 'center',
        color: '#fdf6e2',
        lineHeight: 1.2,
        ...options
      };
    } else if (type === 'frame') {
      newEl = {
        id: newId,
        type: 'frame',
        name: 'Border Frame',
        x: 8,
        y: 8,
        width: 84,
        height: 84,
        strokeColor: '#d4af37',
        strokeWidth: 2,
        opacity: 0.6,
        ...options
      };
    } else if (type === 'line') {
      newEl = {
        id: newId,
        type: 'line',
        name: 'Divider Line',
        x: 25,
        y: 52,
        width: 50,
        height: 2,
        fillColor: '#d4af37',
        opacity: 0.8,
        ...options
      };
    } else if (type === 'shape') {
      newEl = {
        id: newId,
        type: 'shape',
        name: options?.name || 'Banner Box',
        shapeType: options?.shapeType || 'rectangle',
        x: 20,
        y: 45,
        width: 60,
        height: 12,
        fillColor: '#1c1917',
        strokeColor: '#d4af37',
        strokeWidth: 1,
        borderRadius: 4,
        opacity: 0.9,
        ...options
      };
    } else {
      // image
      newEl = {
        id: newId,
        type: 'image',
        name: options?.name || 'Artwork Layer',
        src: options?.src || CURATED_TEXTURES[0].url,
        x: 20,
        y: 30,
        width: 60,
        height: 40,
        objectFit: 'cover',
        opacity: 1,
        ...options
      };
    }

    updateCover(prev => ({
      ...prev,
      elements: [...(prev.elements || []), newEl]
    }));
    setSelectedElementId(newId);
    showToast(`Added ${newEl.name}`);
  };

  const handleDeleteElement = (id: string) => {
    updateCover(prev => ({
      ...prev,
      elements: (prev.elements || []).filter(el => el.id !== id)
    }));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    showToast('Element deleted');
  };

  const handleDuplicateElement = (id: string) => {
    const el = cover.elements?.find(e => e.id === id);
    if (!el) return;
    const duplicated: CoverElement = {
      ...el,
      id: `el_${el.type}_${Date.now()}`,
      name: `${el.name} (Copy)`,
      x: Math.min(80, el.x + 3),
      y: Math.min(85, el.y + 3)
    };
    updateCover(prev => ({
      ...prev,
      elements: [...(prev.elements || []), duplicated]
    }));
    setSelectedElementId(duplicated.id);
    showToast(`Duplicated ${el.name}`);
  };

  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    const elements = [...(cover.elements || [])];
    const index = elements.findIndex(e => e.id === id);
    if (index === -1) return;

    if (direction === 'up' && index < elements.length - 1) {
      const temp = elements[index];
      elements[index] = elements[index + 1];
      elements[index + 1] = temp;
    } else if (direction === 'down' && index > 0) {
      const temp = elements[index];
      elements[index] = elements[index - 1];
      elements[index - 1] = temp;
    }

    updateCover(prev => ({ ...prev, elements }));
  };

  const handleToggleLock = (id: string) => {
    updateCover(prev => ({
      ...prev,
      elements: (prev.elements || []).map(el => el.id === id ? { ...el, locked: !el.locked } : el)
    }));
  };

  const handleToggleHide = (id: string) => {
    updateCover(prev => ({
      ...prev,
      elements: (prev.elements || []).map(el => el.id === id ? { ...el, hidden: !el.hidden } : el)
    }));
    showToast('Toggled element visibility');
  };

  const handleBringToFront = (id: string) => {
    const elements = [...(cover.elements || [])];
    const index = elements.findIndex(e => e.id === id);
    if (index === -1 || index === elements.length - 1) return;
    const [el] = elements.splice(index, 1);
    elements.push(el);
    updateCover(prev => ({ ...prev, elements }));
    showToast('Brought element to front');
  };

  const handleSendToBack = (id: string) => {
    const elements = [...(cover.elements || [])];
    const index = elements.findIndex(e => e.id === id);
    if (index === -1 || index === 0) return;
    const [el] = elements.splice(index, 1);
    elements.unshift(el);
    updateCover(prev => ({ ...prev, elements }));
    showToast('Sent element to back');
  };

  const handleGenerateAISuggestions = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const suggestions = await AIService.generateCoverSuggestions(
        currentStory?.title || cover.title || 'Untitled Book',
        currentStory?.genre || cover.genre || 'Fiction',
        currentStory?.synopsis || currentStory?.description || ''
      );
      setAiSuggestions(suggestions);
      showToast('Generated cover design suggestions!');
    } catch (err: any) {
      setAiError(err?.message || 'Failed to generate suggestions. You can design manually.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAISuggestion = (suggestion: any) => {
    updateCover(prev => ({
      ...prev,
      bgColor: suggestion.bgColor || prev.bgColor,
      bgGradient: suggestion.bgGradient || prev.bgGradient,
      bgType: suggestion.bgGradient ? 'gradient' : prev.bgType,
      elements: (prev.elements || []).map(el => {
        if (el.textRole === 'title') {
          return {
            ...el,
            color: suggestion.titleColor || el.color,
            fontFamily: suggestion.fontFamily || el.fontFamily
          };
        }
        if (el.textRole === 'author') {
          return {
            ...el,
            color: suggestion.authorColor || el.color,
            fontFamily: suggestion.fontFamily || el.fontFamily
          };
        }
        return el;
      })
    }));
    showToast(`Applied "${suggestion.paletteName}" styling to cover!`);
  };

  // Image Upload Handlers
  const handleUploadImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 8MB)
    if (file.size > 8 * 1024 * 1024) {
      alert('Image file is too large. Please select an image under 8MB.');
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      alert('Unsupported file format. Please upload PNG, JPG, or WebP images.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setUserUploadedImages(prev => {
          const updated = [dataUrl, ...prev.slice(0, 15)];
          try {
            localStorage.setItem('inokora_cover_uploads_v2', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        showToast('Artwork uploaded successfully');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // -------------------------------------------------------------
  // High-Resolution Native Canvas Exporter (PNG & JPEG)
  // -------------------------------------------------------------
  const generateExportDataUrl = async (format: 'png' | 'jpeg' = 'png', scale = 1): Promise<string> => {
    // Wait for fonts to finish loading
    if ('fonts' in document) {
      try {
        await (document as any).fonts.ready;
      } catch {}
    }

    const targetW = Math.round((cover.width || 1600) * scale);
    const targetH = Math.round((cover.height || 2560) * scale);

    const offscreen = document.createElement('canvas');
    offscreen.width = targetW;
    offscreen.height = targetH;
    const ctx = offscreen.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');

    // 1. Fill Background (JPEG requires solid non-transparent base)
    if (format === 'jpeg' || cover.bgType === 'color') {
      ctx.fillStyle = cover.bgColor || '#141210';
      ctx.fillRect(0, 0, targetW, targetH);
    }

    if (cover.bgType === 'gradient' || (!cover.bgImage && cover.bgType !== 'color')) {
      const grad = ctx.createLinearGradient(0, 0, targetW, targetH);
      if (cover.bgGradient?.includes('#09090b') || cover.bgGradient?.includes('#1c1917')) {
        grad.addColorStop(0, '#1c1917');
        grad.addColorStop(0.5, '#12100e');
        grad.addColorStop(1, '#09090b');
      } else if (cover.bgGradient?.includes('#2b0b18') || cover.bgGradient?.includes('#200b14')) {
        grad.addColorStop(0, '#2b0b18');
        grad.addColorStop(0.5, '#4a1329');
        grad.addColorStop(1, '#15050c');
      } else if (cover.bgGradient?.includes('#071320') || cover.bgGradient?.includes('#08131e')) {
        grad.addColorStop(0, '#071320');
        grad.addColorStop(0.5, '#12283e');
        grad.addColorStop(1, '#04080e');
      } else if (cover.bgGradient?.includes('#2b050a') || cover.bgGradient?.includes('#160205')) {
        grad.addColorStop(0, '#2b050a');
        grad.addColorStop(0.5, '#110103');
        grad.addColorStop(1, '#050001');
      } else if (cover.bgGradient?.includes('#1e293b') || cover.bgGradient?.includes('#0f172a')) {
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#090d16');
      } else {
        grad.addColorStop(0, '#261f18');
        grad.addColorStop(0.5, '#3a2e23');
        grad.addColorStop(1, '#15110d');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetW, targetH);
    }

    // Background Image
    if (cover.bgType === 'image' && cover.bgImage) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const imgAspect = img.width / img.height;
          const canvasAspect = targetW / targetH;
          let renderW = targetW;
          let renderH = targetH;
          let offsetX = 0;
          let offsetY = 0;
          if (imgAspect > canvasAspect) {
            renderW = targetH * imgAspect;
            offsetX = -(renderW - targetW) / 2;
          } else {
            renderH = targetW / imgAspect;
            offsetY = -(renderH - targetH) / 2;
          }
          ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = cover.bgImage!;
      });
    }

    // 2. Contrast Overlay
    if (cover.overlayOpacity && cover.overlayOpacity > 0) {
      ctx.fillStyle = cover.overlayColor || '#000000';
      ctx.globalAlpha = cover.overlayOpacity;
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.globalAlpha = 1.0;
    }

    // Vignette pattern
    if (cover.overlayPattern === 'vignette') {
      const radius = Math.max(targetW, targetH) * 0.75;
      const vignette = ctx.createRadialGradient(targetW / 2, targetH / 2, radius * 0.2, targetW / 2, targetH / 2, radius);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, targetW, targetH);
    }

    // 3. Render Each Non-Hidden Element by Layer Order
    const elements = cover.elements || [];
    for (const el of elements) {
      if (el.hidden) continue;

      const elX = (el.x / 100) * targetW;
      const elY = (el.y / 100) * targetH;
      const elW = (el.width / 100) * targetW;
      const elH = el.height ? (el.height / 100) * targetH : elW;

      ctx.save();
      if (el.opacity !== undefined) {
        ctx.globalAlpha = el.opacity;
      }

      if (el.rotation) {
        ctx.translate(elX + elW / 2, elY + elH / 2);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.translate(-(elX + elW / 2), -(elY + elH / 2));
      }

      if (el.type === 'frame') {
        ctx.strokeStyle = el.strokeColor || '#d4af37';
        ctx.lineWidth = Math.max(1, (el.strokeWidth || 2) * scale * 2);
        ctx.strokeRect(elX, elY, elW, elH);
      } else if (el.type === 'line') {
        ctx.fillStyle = el.fillColor || el.strokeColor || '#d4af37';
        ctx.fillRect(elX, elY, elW, Math.max(2, (el.height || 2) * scale * 2));
      } else if (el.type === 'shape') {
        if (el.shapeType === 'circle') {
          ctx.beginPath();
          ctx.arc(elX + elW / 2, elY + elH / 2, elW / 2, 0, Math.PI * 2);
          if (el.fillColor) {
            ctx.fillStyle = el.fillColor;
            ctx.fill();
          }
          if (el.strokeColor) {
            ctx.strokeStyle = el.strokeColor;
            ctx.lineWidth = Math.max(1, (el.strokeWidth || 1) * scale * 2);
            ctx.stroke();
          }
        } else {
          if (el.fillColor) {
            ctx.fillStyle = el.fillColor;
            ctx.fillRect(elX, elY, elW, elH);
          }
          if (el.strokeColor) {
            ctx.strokeStyle = el.strokeColor;
            ctx.lineWidth = Math.max(1, (el.strokeWidth || 1) * scale * 2);
            ctx.strokeRect(elX, elY, elW, elH);
          }
        }
      } else if (el.type === 'image' && el.src) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, elX, elY, elW, elH);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = el.src!;
        });
      } else if (el.type === 'text') {
        const rawText = el.content || '';
        const displayText = el.textTransform === 'uppercase'
          ? rawText.toUpperCase()
          : el.textTransform === 'lowercase'
          ? rawText.toLowerCase()
          : rawText;

        const scaledFontSize = Math.round((el.fontSize || 24) * scale * 2.2);
        const weight = el.fontWeight || 'normal';
        const style = el.fontStyle === 'italic' ? 'italic' : 'normal';
        const family = el.fontFamily || 'Playfair Display';

        ctx.font = `${style} ${weight} ${scaledFontSize}px ${family}, serif`;
        ctx.fillStyle = el.color || '#fdf6e2';
        ctx.textAlign = el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'right' : 'left';
        ctx.textBaseline = 'top';

        if (el.textShadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = 10 * scale;
          ctx.shadowOffsetY = 4 * scale;
        } else {
          ctx.shadowColor = 'transparent';
        }

        const renderX = el.textAlign === 'center' ? elX + elW / 2 : el.textAlign === 'right' ? elX + elW : elX;
        
        // Multi-line word wrap
        const words = displayText.split(' ');
        let line = '';
        let currentLineY = elY;
        const lineHeightPx = scaledFontSize * (el.lineHeight || 1.15);

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > elW && n > 0) {
            ctx.fillText(line.trim(), renderX, currentLineY);
            line = words[n] + ' ';
            currentLineY += lineHeightPx;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), renderX, currentLineY);
      }

      ctx.restore();
    }

    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return offscreen.toDataURL(mime, 0.95);
  };

  // Save to Story Draft with generated high-res preview thumbnail
  const handleSaveCover = async () => {
    if (!activeStoryId) return;
    setSaveStatus('saving');
    try {
      const exportSnapshot = await generateExportDataUrl('png', 0.5);

      const titleEl = cover.elements?.find(e => e.textRole === 'title');
      const authorEl = cover.elements?.find(e => e.textRole === 'author');
      const subEl = cover.elements?.find(e => e.textRole === 'subtitle');
      const seriesEl = cover.elements?.find(e => e.textRole === 'series');
      const pubEl = cover.elements?.find(e => e.textRole === 'publisher');

      const updatedCover: CoverConfig = {
        ...cover,
        schemaVersion: 2,
        title: titleEl?.content || cover.title || currentStory?.title || 'Untitled',
        author: authorEl?.content || cover.author || defaultAuthor,
        subtitle: subEl?.content || cover.subtitle,
        series: seriesEl?.content || cover.series,
        publisher: pubEl?.content || cover.publisher,
        exportedCoverDataUrl: exportSnapshot
      };

      await onSaveCover(activeStoryId, updatedCover);
      setCover(updatedCover);
      setSaveStatus('saved');
      localStorage.removeItem(`inokora_cover_draft_${activeStoryId}`);
      setRecoverableDraft(null);
      showToast('Cover saved to story manuscript successfully!');
    } catch (err: any) {
      console.error('[CoverStudio] Save error:', err);
      setSaveStatus('error');
      showToast(`Error saving cover: ${err?.message || 'Check storage'}`);
    }
  };

  // High-Resolution Export Trigger (PNG / JPEG)
  const handleExportFile = async (format: 'png' | 'jpeg', customScale?: number) => {
    setIsExporting(true);
    try {
      const scaleToUse = customScale || exportScale;
      const dataUrl = await generateExportDataUrl(format, scaleToUse);
      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('Canvas render failed to produce an image.');
      }
      const link = document.createElement('a');
      const sanitizedTitle = (cover.title || currentStory?.title || 'Book-Cover')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();
      const finalW = Math.round((cover.width || 1600) * scaleToUse);
      const finalH = Math.round((cover.height || 2560) * scaleToUse);
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      link.download = `${sanitizedTitle}_${finalW}x${finalH}_cover.${ext}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Cover exported at ${finalW}×${finalH}px (${format.toUpperCase()})!`);
    } catch (err: any) {
      alert(`Export error: ${err?.message || 'Failed to render high-resolution canvas'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // -------------------------------------------------------------
  // Pointer-based Interactive Dragging
  // -------------------------------------------------------------
  const handleCanvasPointerDown = (e: React.PointerEvent, elementId: string) => {
    e.stopPropagation();
    const el = cover.elements?.find(item => item.id === elementId);
    if (!el || el.locked) {
      setSelectedElementId(elementId);
      return;
    }

    setSelectedElementId(elementId);
    isDraggingRef.current = true;
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      elX: el.x,
      elY: el.y
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current || !canvasElementRef.current) return;
      const rect = canvasElementRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const deltaXPercent = ((moveEvent.clientX - dragStartPos.current.x) / rect.width) * 100;
      const deltaYPercent = ((moveEvent.clientY - dragStartPos.current.y) / rect.height) * 100;

      let newX = Math.round((dragStartPos.current.elX + deltaXPercent) * 10) / 10;
      let newY = Math.round((dragStartPos.current.elY + deltaYPercent) * 10) / 10;

      // Center snapping assistance
      if (showGuides && Math.abs(newX + (el.width / 2) - 50) < 1.5) {
        newX = 50 - (el.width / 2);
      }

      updateCover(prev => ({
        ...prev,
        elements: (prev.elements || []).map(item => item.id === elementId ? {
          ...item,
          x: Math.max(0, Math.min(100 - (item.width || 10), newX)),
          y: Math.max(0, Math.min(95, newY))
        } : item)
      }), false);
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      // Record history step on drag release
      setHistory(h => [...h.slice(-25), cover]);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Aspect ratio helper
  const aspectRatioClass = cover.height === cover.width
    ? 'aspect-square'
    : cover.height === 1600 && cover.width === 1200
    ? 'aspect-[3/4]'
    : 'aspect-[2/3]';

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f5f5f4] flex flex-col relative select-none font-sans overflow-hidden">
      
      {/* 1. Compact Pro Editorial Toolbar */}
      <header className="h-14 border-b border-[#292524] bg-[#0c0a09]/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 z-40">
        
        {/* Left: Exit, Panel Toggle & Story Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-stone-800"
            title="Exit Cover Studio"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          <button
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              isLeftPanelOpen ? 'bg-stone-800 border-stone-700 text-stone-200' : 'bg-stone-900 border-stone-800 text-stone-400'
            }`}
            title={isLeftPanelOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {isLeftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          <div className="h-4 w-px bg-stone-800 hidden sm:block" />

          {/* Story Selector */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400 hidden sm:block" />
            <select
              value={activeStoryId}
              onChange={(e) => setActiveStoryId(e.target.value)}
              className="bg-[#141210] border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-emerald-600 max-w-[130px] sm:max-w-[200px] truncate"
            >
              {stories.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title || 'Untitled Story'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: History, Zoom & Viewport Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center bg-[#141210] border border-stone-800 rounded-lg p-0.5">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-100 disabled:opacity-30 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-100 disabled:opacity-30 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-stone-800 hidden md:block" />

          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center bg-[#141210] border border-stone-800 rounded-lg p-0.5 text-xs text-stone-400">
            <button
              onClick={() => setZoomLevel(z => Math.max(30, z - 10))}
              className="p-1.5 rounded hover:bg-stone-800 hover:text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] text-stone-300 min-w-[42px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(z => Math.min(180, z + 10))}
              className="p-1.5 rounded hover:bg-stone-800 hover:text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="px-2 py-1 rounded text-[10px] font-mono hover:bg-stone-800 hover:text-white border-l border-stone-800"
              title="Reset Zoom to 100%"
            >
              Fit
            </button>
          </div>

          {/* Alignment Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
              showGrid ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-[#141210] border-stone-800 text-stone-400'
            }`}
            title="Toggle Alignment Grid"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Grid</span>
          </button>

          {/* Safe Margins Toggle */}
          <button
            onClick={() => setShowSafeMargins(!showSafeMargins)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
              showSafeMargins ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-[#141210] border-stone-800 text-stone-400'
            }`}
            title="Toggle Safe Text Margins"
          >
            <Frame className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Margins</span>
          </button>
        </div>

        {/* Right: Preview, Save & Export */}
        <div className="flex items-center gap-2">
          
          {/* 3D Mockup / Reader Preview */}
          <button
            onClick={() => setPreviewMode(p => p === '3d-mockup' ? 'none' : '3d-mockup')}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              previewMode === '3d-mockup'
                ? 'bg-amber-950/80 border-amber-700 text-amber-300 shadow'
                : 'bg-[#141210] border-stone-800 text-stone-300 hover:bg-stone-800'
            }`}
            title="3D Book Preview"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">3D Mockup</span>
          </button>

          {/* Save Status & Button */}
          <button
            onClick={handleSaveCover}
            disabled={saveStatus === 'saving'}
            className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md"
            title="Save cover to story manuscript"
          >
            {saveStatus === 'saving' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save Cover'}</span>
          </button>

          {/* Format (PNG/JPEG) & Resolution Scale Selector */}
          <div className="flex items-center rounded-lg border border-stone-800 bg-[#141210] p-0.5">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'png' | 'jpeg')}
              className="bg-transparent text-[11px] text-stone-300 px-1.5 py-1 focus:outline-none cursor-pointer border-r border-stone-800 font-mono uppercase"
              title="Export File Format"
            >
              <option value="png" className="bg-[#141210] text-stone-200">PNG</option>
              <option value="jpeg" className="bg-[#141210] text-stone-200">JPEG</option>
            </select>
            <select
              value={exportScale}
              onChange={(e) => setExportScale(Number(e.target.value))}
              className="bg-transparent text-[11px] text-stone-300 px-2 py-1 focus:outline-none cursor-pointer"
              title="Select export resolution scale"
            >
              <option value="1.875" className="bg-[#141210] text-stone-200">Print High-Res (3000×4800)</option>
              <option value="1.5" className="bg-[#141210] text-stone-200">Trade 6×9 (2400×3840)</option>
              <option value="1" className="bg-[#141210] text-stone-200">Digital Standard (1600×2560)</option>
              <option value="0.5" className="bg-[#141210] text-stone-200">Compact Preview (800×1280)</option>
            </select>
            <button
              onClick={() => handleExportFile(exportFormat, exportScale)}
              disabled={isExporting}
              className="px-3 py-1 rounded-md bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
              title={`Download high-resolution print-ready ${exportFormat.toUpperCase()}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            </button>
          </div>

          {/* Right Inspector Toggle */}
          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className={`p-1.5 rounded-lg border text-xs transition-colors hidden sm:block ${
              isRightPanelOpen ? 'bg-stone-800 border-stone-700 text-stone-200' : 'bg-stone-900 border-stone-800 text-stone-400'
            }`}
            title={isRightPanelOpen ? "Collapse Inspector" : "Expand Inspector"}
          >
            {isRightPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>

        </div>
      </header>

      {/* Recoverable Local Draft Banner */}
      {recoverableDraft && (
        <div className="bg-amber-950/80 border-b border-amber-600/50 px-4 py-2 flex items-center justify-between text-xs text-amber-200 z-30 animate-fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              Unsaved local recovery draft found ({new Date(recoverableDraft.savedAt).toLocaleTimeString()}). Would you like to restore it?
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCover(recoverableDraft.cover);
                setRecoverableDraft(null);
                setSaveStatus('unsaved');
                showToast('Restored draft from local storage');
              }}
              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-[11px] shadow transition-colors"
            >
              Restore Draft
            </button>
            <button
              onClick={() => {
                localStorage.removeItem(`inokora_cover_draft_${activeStoryId}`);
                setRecoverableDraft(null);
                showToast('Discarded local recovery draft');
              }}
              className="px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-400 text-[11px] transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#181614] border border-emerald-700/60 text-emerald-200 px-4 py-2 rounded-xl text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Main Studio Workspace: Left Sidebar, Canvas Center, Right Inspector */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left-Hand Panel: Templates, Elements, Artwork, Typography, Layers */}
        <aside className="w-80 border-r border-[#292524] bg-[#0c0a09]/90 backdrop-blur-md flex flex-col flex-shrink-0 z-20">
          
          {/* Navigation Tabs */}
          <div className="grid grid-cols-5 border-b border-[#292524] text-[11px] font-medium text-stone-400">
            <button
              onClick={() => setLeftTab('templates')}
              className={`py-3 flex flex-col items-center gap-1 border-b-2 transition-colors ${
                leftTab === 'templates' ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20' : 'border-transparent hover:text-stone-200'
              }`}
            >
              <Layout className="w-4 h-4" />
              <span>Templates</span>
            </button>
            <button
              onClick={() => setLeftTab('elements')}
              className={`py-3 flex flex-col items-center gap-1 border-b-2 transition-colors ${
                leftTab === 'elements' ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20' : 'border-transparent hover:text-stone-200'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Text</span>
            </button>
            <button
              onClick={() => setLeftTab('artwork')}
              className={`py-3 flex flex-col items-center gap-1 border-b-2 transition-colors ${
                leftTab === 'artwork' ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20' : 'border-transparent hover:text-stone-200'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Artwork</span>
            </button>
            <button
              onClick={() => setLeftTab('typography')}
              className={`py-3 flex flex-col items-center gap-1 border-b-2 transition-colors ${
                leftTab === 'typography' ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20' : 'border-transparent hover:text-stone-200'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Theme</span>
            </button>
            <button
              onClick={() => setLeftTab('layers')}
              className={`py-3 flex flex-col items-center gap-1 border-b-2 transition-colors ${
                leftTab === 'layers' ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20' : 'border-transparent hover:text-stone-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Layers</span>
            </button>
          </div>

          {/* Left Panel Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            
            {/* TAB 1: TEMPLATES */}
            {leftTab === 'templates' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs uppercase font-mono tracking-wider text-stone-400 mb-1">Publishing Layouts</h3>
                  <p className="text-[11px] text-stone-500">
                    Fully editable starting templates. Swap elements, fonts and colors freely.
                  </p>
                </div>

                <div className="space-y-3">
                  {TEMPLATES.map(tpl => {
                    const isSelected = cover.templateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleApplyTemplate(tpl)}
                        className={`p-3.5 rounded-xl border transition-all group shadow-md cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500 shadow-emerald-950/50'
                            : 'border-stone-800 hover:border-emerald-700/60 bg-[#141210] hover:bg-[#1a1715]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold transition-colors ${isSelected ? 'text-emerald-300' : 'text-stone-100 group-hover:text-emerald-300'}`}>
                            {tpl.name}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${isSelected ? 'bg-emerald-900/60 text-emerald-200' : 'bg-stone-800 text-stone-300'}`}>
                            {tpl.genreTag}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 leading-relaxed font-light">
                          {tpl.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: TEXT & ELEMENTS */}
            {leftTab === 'elements' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs uppercase font-mono tracking-wider text-stone-400 mb-1">Add Typography Elements</h3>
                  <p className="text-[11px] text-stone-500">
                    Click to place new text layers directly onto the interactive canvas.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={() => handleAddElement('text', { name: 'Book Title', textRole: 'title', content: currentStory?.title || 'Book Title', fontSize: 44, fontWeight: 700 })}
                    className="p-3 rounded-xl bg-[#141210] border border-stone-800 hover:border-emerald-600/60 flex items-center justify-between text-left group transition-all"
                  >
                    <div>
                      <div className="text-sm font-serif font-bold text-stone-100">Add Book Title</div>
                      <div className="text-[10px] text-stone-500">Prominent main title block</div>
                    </div>
                    <Plus className="w-4 h-4 text-stone-400 group-hover:text-emerald-400" />
                  </button>

                  <button
                    onClick={() => handleAddElement('text', { name: 'Author Name', textRole: 'author', content: currentStory?.authorName || defaultAuthor, fontSize: 20, fontWeight: 600, letterSpacing: 5, textTransform: 'uppercase' })}
                    className="p-3 rounded-xl bg-[#141210] border border-stone-800 hover:border-emerald-600/60 flex items-center justify-between text-left group transition-all"
                  >
                    <div>
                      <div className="text-xs font-mono font-bold tracking-wider text-stone-200">ADD AUTHOR NAME</div>
                      <div className="text-[10px] text-stone-500">Signature footer placement</div>
                    </div>
                    <Plus className="w-4 h-4 text-stone-400 group-hover:text-emerald-400" />
                  </button>

                  <button
                    onClick={() => handleAddElement('text', { name: 'Subtitle', textRole: 'subtitle', content: 'A Compelling Novel', fontSize: 16, fontStyle: 'italic' })}
                    className="p-3 rounded-xl bg-[#141210] border border-stone-800 hover:border-emerald-600/60 flex items-center justify-between text-left group transition-all"
                  >
                    <div>
                      <div className="text-xs font-serif italic text-stone-300">Add Subtitle / Volume</div>
                      <div className="text-[10px] text-stone-500">Descriptive subtitle or series info</div>
                    </div>
                    <Plus className="w-4 h-4 text-stone-400 group-hover:text-emerald-400" />
                  </button>

                  <button
                    onClick={() => handleAddElement('text', { name: 'Tagline', textRole: 'tagline', content: '“An unmissable literary tour de force.”', fontSize: 14, fontStyle: 'italic', color: '#fed7aa' })}
                    className="p-3 rounded-xl bg-[#141210] border border-stone-800 hover:border-emerald-600/60 flex items-center justify-between text-left group transition-all"
                  >
                    <div>
                      <div className="text-xs font-sans text-amber-200/90">Add Tagline or Review Quote</div>
                      <div className="text-[10px] text-stone-500">Hook sentence or praise</div>
                    </div>
                    <Plus className="w-4 h-4 text-stone-400 group-hover:text-emerald-400" />
                  </button>
                </div>

                <div>
                  <h3 className="text-xs uppercase font-mono tracking-wider text-stone-400 mb-2">Shapes & Decorative Lines</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAddElement('frame', { name: 'Gold Border Frame', strokeColor: '#d4af37', strokeWidth: 1.5, opacity: 0.5 })}
                      className="p-2.5 rounded-lg bg-[#141210] border border-stone-800 hover:border-emerald-600/60 text-xs text-stone-300 flex items-center gap-2"
                    >
                      <Frame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Border Frame</span>
                    </button>

                    <button
                      onClick={() => handleAddElement('line', { name: 'Divider Accent', fillColor: '#d4af37', height: 2, width: 40 })}
                      className="p-2.5 rounded-lg bg-[#141210] border border-stone-800 hover:border-emerald-600/60 text-xs text-stone-300 flex items-center gap-2"
                    >
                      <Minus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Divider Line</span>
                    </button>

                    <button
                      onClick={() => handleAddElement('shape', { name: 'Banner Box', shapeType: 'rectangle', fillColor: '#1c1917', strokeColor: '#d4af37', strokeWidth: 1 })}
                      className="p-2.5 rounded-lg bg-[#141210] border border-stone-800 hover:border-emerald-600/60 text-xs text-stone-300 flex items-center gap-2"
                    >
                      <Square className="w-3.5 h-3.5 text-amber-400" />
                      <span>Banner Box</span>
                    </button>

                    <button
                      onClick={() => handleAddElement('shape', { name: 'Seal Emblem', shapeType: 'circle', fillColor: '#2a1a0f', strokeColor: '#f59e0b', width: 24, height: 24 })}
                      className="p-2.5 rounded-lg bg-[#141210] border border-stone-800 hover:border-emerald-600/60 text-xs text-stone-300 flex items-center gap-2"
                    >
                      <Circle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Circle Seal</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ARTWORK & IMAGES */}
            {leftTab === 'artwork' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs uppercase font-mono tracking-wider text-stone-400 mb-1">Cover Artwork & Uploads</h3>
                  <p className="text-[11px] text-stone-500">
                    Upload your own illustrations or select high-resolution archival textures.
                  </p>
                </div>

                {/* Upload Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadImageFile}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3.5 px-4 rounded-xl border border-dashed border-emerald-700/60 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300 text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-inner group"
                >
                  <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                  <span>Upload Artwork from Device (PNG, JPG)</span>
                </button>

                {/* User's Uploaded Images */}
                {userUploadedImages.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-mono text-stone-400 uppercase tracking-wider">Your Uploaded Files</span>
                    <div className="grid grid-cols-3 gap-2">
                      {userUploadedImages.map((imgUrl, i) => (
                        <div
                          key={i}
                          className="relative aspect-[2/3] rounded-lg overflow-hidden border border-stone-800 hover:border-emerald-500 cursor-pointer group shadow"
                        >
                          <img src={imgUrl} alt="Uploaded" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1.5 transition-opacity p-1 text-[9px]">
                            <button
                              onClick={() => updateCover(p => ({ ...p, bgType: 'image', bgImage: imgUrl }))}
                              className="px-1.5 py-0.5 rounded bg-emerald-700 text-white w-full text-center"
                            >
                              Set Background
                            </button>
                            <button
                              onClick={() => handleAddElement('image', { name: 'Uploaded Artwork', src: imgUrl })}
                              className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-200 w-full text-center"
                            >
                              Add Layer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Curated Background Textures */}
                <div className="space-y-2">
                  <span className="text-xs font-mono text-stone-400 uppercase tracking-wider">Archival Textures</span>
                  <div className="grid grid-cols-2 gap-2">
                    {CURATED_TEXTURES.map(item => (
                      <div
                        key={item.id}
                        className="relative aspect-[4/3] rounded-lg overflow-hidden border border-stone-800 hover:border-emerald-500 cursor-pointer group shadow"
                      >
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity p-2 text-center">
                          <span className="text-[10px] font-medium text-white line-clamp-1">{item.name}</span>
                          <button
                            onClick={() => {
                              updateCover(p => ({ ...p, bgType: 'image', bgImage: item.url }));
                              showToast(`Set ${item.name} as background`);
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px]"
                          >
                            Apply BG
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Remove Background Image if applied */}
                {cover.bgImage && (
                  <button
                    onClick={() => updateCover(p => ({ ...p, bgType: 'gradient', bgImage: '' }))}
                    className="w-full py-2 rounded-lg bg-stone-900 border border-stone-800 hover:bg-stone-800 text-xs text-rose-300 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Background Image (Use Gradient)</span>
                  </button>
                )}
              </div>
            )}

            {/* TAB 4: THEME & COLOR PALETTES */}
            {leftTab === 'typography' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs uppercase font-mono tracking-wider text-stone-400 mb-1">Color Palette & Background</h3>
                  <p className="text-[11px] text-stone-500">
                    Fine-tune background gradients, solid tones and atmospheric overlays.
                  </p>
                </div>

                {/* Gradient Presets */}
                <div className="space-y-2">
                  <span className="text-xs font-mono text-stone-400 uppercase">Atmospheric Gradients</span>
                  <div className="grid grid-cols-3 gap-2">
                    {GRADIENT_PRESETS.map((g, idx) => (
                      <button
                        key={idx}
                        onClick={() => updateCover(p => ({ ...p, bgType: 'gradient', bgGradient: g.value }))}
                        className="h-12 rounded-lg border border-stone-800 hover:border-emerald-500 relative overflow-hidden transition-all group"
                        style={{ background: g.value }}
                        title={g.name}
                      >
                        <span className="absolute bottom-1 left-1 text-[9px] font-mono bg-black/60 px-1 rounded text-stone-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          {g.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overlay Patterns */}
                <div className="space-y-2">
                  <span className="text-xs font-mono text-stone-400 uppercase">Overlay Pattern</span>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    {(['none', 'vignette', 'stars', 'dots', 'grid'] as const).map(pat => (
                      <button
                        key={pat}
                        onClick={() => updateCover(p => ({ ...p, overlayPattern: pat }))}
                        className={`py-1.5 px-2 rounded-lg border capitalize transition-colors ${
                          cover.overlayPattern === pat ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200' : 'bg-[#141210] border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {pat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overlay Opacity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-stone-400">
                    <span>Darkness Overlay</span>
                    <span className="font-mono">{Math.round((cover.overlayOpacity || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.9}
                    step={0.05}
                    value={cover.overlayOpacity || 0}
                    onChange={(e) => updateCover(p => ({ ...p, overlayOpacity: parseFloat(e.target.value) }))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: LAYERS */}
            {leftTab === 'layers' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs uppercase font-mono tracking-wider text-stone-400 mb-1">Canvas Layers</h3>
                  <p className="text-[11px] text-stone-500">
                    Reorder layer stack, lock items or toggle visibility.
                  </p>
                </div>

                <div className="space-y-2">
                  {(cover.elements || []).slice().reverse().map((el) => {
                    const isSelected = el.id === selectedElementId;
                    return (
                      <div
                        key={el.id}
                        onClick={() => setSelectedElementId(el.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200 shadow'
                            : 'bg-[#141210] border-stone-800 hover:border-stone-700 text-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 max-w-[170px] truncate">
                          {el.type === 'text' && <Type className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />}
                          {el.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />}
                          {el.type === 'frame' && <Frame className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />}
                          {el.type === 'line' && <Minus className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />}
                          {el.type === 'shape' && <Square className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />}
                          <span className="text-xs font-medium truncate">{el.name || el.content || 'Element'}</span>
                        </div>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleLock(el.id)}
                            className={`p-1 rounded hover:bg-stone-800 ${el.locked ? 'text-amber-400' : 'text-stone-500'}`}
                            title={el.locked ? 'Unlock' : 'Lock element'}
                          >
                            {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => handleMoveLayer(el.id, 'up')}
                            className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200"
                            title="Bring forward"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => handleMoveLayer(el.id, 'down')}
                            className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200"
                            title="Send backward"
                          >
                            ▼
                          </button>
                          <button
                            onClick={() => handleDeleteElement(el.id)}
                            className="p-1 rounded hover:bg-stone-800 text-stone-500 hover:text-rose-400"
                            title="Delete layer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* ----------------------------------------------------------------- */}
        {/* Central Canvas Workspace */}
        {/* ----------------------------------------------------------------- */}
        <main
          ref={canvasContainerRef}
          onClick={() => setSelectedElementId(null)}
          className="flex-1 bg-[#12100e] relative flex items-center justify-center p-6 sm:p-10 overflow-auto"
        >
          {/* Canvas Wrapper scaled with zoom control */}
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
            className="transition-transform duration-150 ease-out"
          >
            {/* The Live Interactive Book Cover */}
            <div
              ref={canvasElementRef}
              onClick={(e) => e.stopPropagation()}
              className={`relative shadow-2xl rounded-sm overflow-hidden select-none border border-stone-800/80 ${aspectRatioClass}`}
              style={{
                width: '420px',
                height: cover.height === cover.width ? '420px' : cover.height === 1600 ? '560px' : '630px',
                backgroundColor: cover.bgColor || '#141210',
                backgroundImage: cover.bgType === 'image' && cover.bgImage ? `url(${cover.bgImage})` : cover.bgGradient || 'linear-gradient(135deg, #1c1917 0%, #09090b 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Overlay Layer */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity"
                style={{
                  backgroundColor: cover.overlayColor || '#000000',
                  opacity: cover.overlayOpacity || 0
                }}
              />

              {/* Decorative Patterns */}
              {cover.overlayPattern === 'vignette' && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.75)_100%)] pointer-events-none" />
              )}
              {cover.overlayPattern === 'stars' && (
                <div className="absolute inset-0 bg-[radial-gradient(#f43f5e_1px,transparent_1px)] [background-size:22px_22px] opacity-25 pointer-events-none" />
              )}
              {cover.overlayPattern === 'dots' && (
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />
              )}
              {cover.overlayPattern === 'grid' && (
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0d_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0d_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
              )}

              {/* Safe Text Margins Guide (5% border) */}
              {showSafeMargins && (
                <div className="absolute inset-[5%] border border-dashed border-emerald-500/30 rounded-sm pointer-events-none z-30">
                  <span className="absolute top-1 left-1.5 text-[8px] font-mono text-emerald-400/50 uppercase tracking-widest">
                    Safe Margin
                  </span>
                </div>
              )}

              {/* Center Alignment Guides */}
              {showGuides && (
                <>
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-emerald-500/20 pointer-events-none z-30" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-500/20 pointer-events-none z-30" />
                </>
              )}

              {/* Interactive Canvas Elements */}
              {(cover.elements || []).map((el) => {
                const isSelected = el.id === selectedElementId;

                return (
                  <div
                    key={el.id}
                    onPointerDown={(e) => handleCanvasPointerDown(e, el.id)}
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      width: `${el.width}%`,
                      height: el.height ? `${el.height}%` : undefined,
                      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                      opacity: el.opacity !== undefined ? el.opacity : 1,
                      cursor: el.locked ? 'default' : 'grab',
                    }}
                    className={`absolute transition-shadow ${
                      isSelected
                        ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-black/50 z-20'
                        : 'hover:ring-1 hover:ring-emerald-500/40 z-10'
                    }`}
                  >
                    {/* Render according to type */}
                    {el.type === 'text' && (
                      <div
                        style={{
                          fontFamily: el.fontFamily ? `'${el.fontFamily}', serif` : 'inherit',
                          fontSize: `${el.fontSize || 24}px`,
                          fontWeight: el.fontWeight || 'normal',
                          fontStyle: el.fontStyle || 'normal',
                          textAlign: el.textAlign || 'center',
                          color: el.color || '#fdf6e2',
                          lineHeight: el.lineHeight || 1.15,
                          letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
                          textTransform: el.textTransform || 'none',
                          textShadow: el.textShadow || '0 2px 10px rgba(0,0,0,0.85)',
                        }}
                        className="w-full break-words select-none leading-tight"
                      >
                        {el.content}
                      </div>
                    )}

                    {el.type === 'frame' && (
                      <div
                        style={{
                          borderColor: el.strokeColor || '#d4af37',
                          borderWidth: `${el.strokeWidth || 2}px`,
                        }}
                        className="w-full h-full border rounded-sm pointer-events-none"
                      />
                    )}

                    {el.type === 'line' && (
                      <div
                        style={{
                          backgroundColor: el.fillColor || el.strokeColor || '#d4af37',
                          height: `${el.height || 2}px`,
                        }}
                        className="w-full rounded-full pointer-events-none"
                      />
                    )}

                    {el.type === 'shape' && (
                      <div
                        style={{
                          backgroundColor: el.fillColor || 'transparent',
                          borderColor: el.strokeColor || 'transparent',
                          borderWidth: el.strokeWidth ? `${el.strokeWidth}px` : 0,
                          borderRadius: el.shapeType === 'circle' ? '9999px' : `${el.borderRadius || 4}px`,
                        }}
                        className="w-full h-full"
                      />
                    )}

                    {el.type === 'image' && el.src && (
                      <img
                        src={el.src}
                        alt={el.name}
                        className="w-full h-full object-cover rounded pointer-events-none"
                      />
                    )}

                    {/* Selection Controls overlay */}
                    {isSelected && !el.locked && (
                      <>
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-emerald-400 rounded-full border border-black" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full border border-black" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-emerald-400 rounded-full border border-black" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-emerald-400 rounded-full border border-black" />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* ----------------------------------------------------------------- */}
        {/* Right-Hand Properties Inspector Panel */}
        {/* ----------------------------------------------------------------- */}
        <aside className="w-80 border-l border-[#292524] bg-[#0c0a09]/95 backdrop-blur-md flex flex-col flex-shrink-0 z-20">
          
          <div className="p-4 border-b border-[#292524] flex items-center justify-between">
            <span className="text-xs uppercase font-mono tracking-wider text-stone-300 font-semibold">
              {selectedElement ? `${selectedElement.name} Properties` : 'Canvas Settings'}
            </span>
            {selectedElement && (
              <button
                onClick={() => setSelectedElementId(null)}
                className="text-stone-400 hover:text-stone-200 text-xs"
              >
                Done
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* ELEMENT PROPERTIES (When element is selected) */}
            {selectedElement ? (
              <div className="space-y-5">
                
                {/* Element Name & Action Row */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <input
                    type="text"
                    value={selectedElement.name}
                    onChange={(e) => updateCover(p => ({
                      ...p,
                      elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, name: e.target.value } : item)
                    }))}
                    className="bg-[#141210] border border-stone-800 rounded px-2 py-1 text-xs text-stone-100 font-medium focus:outline-none focus:border-emerald-600 max-w-[150px]"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleLock(selectedElement.id)}
                      className={`p-1.5 rounded bg-stone-900 border border-stone-800 ${selectedElement.locked ? 'text-amber-400' : 'text-stone-400'}`}
                      title={selectedElement.locked ? 'Unlock' : 'Lock element'}
                    >
                      {selectedElement.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDuplicateElement(selectedElement.id)}
                      className="p-1.5 rounded bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteElement(selectedElement.id)}
                      className="p-1.5 rounded bg-stone-900 border border-stone-800 text-stone-400 hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* TEXT ELEMENT CONTROLS */}
                {selectedElement.type === 'text' && (
                  <div className="space-y-4">
                    {/* Content textarea */}
                    <div>
                      <label className="block text-[11px] font-mono text-stone-400 uppercase mb-1">Text Content</label>
                      <textarea
                        rows={2}
                        value={selectedElement.content || ''}
                        onChange={(e) => updateCover(p => ({
                          ...p,
                          elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, content: e.target.value } : item)
                        }))}
                        className="w-full bg-[#141210] border border-stone-800 rounded-xl p-2.5 text-xs text-stone-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Font Selector */}
                    <div>
                      <label className="block text-[11px] font-mono text-stone-400 uppercase mb-1">Font Family</label>
                      <select
                        value={selectedElement.fontFamily || 'Playfair Display'}
                        onChange={(e) => updateCover(p => ({
                          ...p,
                          elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, fontFamily: e.target.value } : item)
                        }))}
                        className="w-full bg-[#141210] border border-stone-800 rounded-xl p-2 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
                      >
                        {FONT_OPTIONS.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.name} — {f.category}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Font Size & Weight */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                          <span>Size</span>
                          <span className="font-mono">{selectedElement.fontSize || 24}px</span>
                        </div>
                        <input
                          type="range"
                          min={12}
                          max={90}
                          value={selectedElement.fontSize || 24}
                          onChange={(e) => updateCover(p => ({
                            ...p,
                            elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, fontSize: parseInt(e.target.value) } : item)
                          }))}
                          className="w-full accent-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-stone-400 uppercase mb-1">Weight</label>
                        <select
                          value={selectedElement.fontWeight || 'bold'}
                          onChange={(e) => updateCover(p => ({
                            ...p,
                            elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, fontWeight: e.target.value } : item)
                          }))}
                          className="w-full bg-[#141210] border border-stone-800 rounded-lg p-1.5 text-xs text-stone-200 focus:outline-none"
                        >
                          <option value="300">Light (300)</option>
                          <option value="400">Regular (400)</option>
                          <option value="600">SemiBold (600)</option>
                          <option value="700">Bold (700)</option>
                          <option value="900">Black (900)</option>
                        </select>
                      </div>
                    </div>

                    {/* Alignment & Style Buttons */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center bg-[#141210] border border-stone-800 rounded-lg p-0.5">
                        <button
                          onClick={() => updateCover(p => ({
                            ...p,
                            elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, textAlign: 'left' } : item)
                          }))}
                          className={`p-1.5 rounded ${selectedElement.textAlign === 'left' ? 'bg-emerald-950 text-emerald-300' : 'text-stone-400'}`}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateCover(p => ({
                            ...p,
                            elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, textAlign: 'center' } : item)
                          }))}
                          className={`p-1.5 rounded ${selectedElement.textAlign === 'center' ? 'bg-emerald-950 text-emerald-300' : 'text-stone-400'}`}
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateCover(p => ({
                            ...p,
                            elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, textAlign: 'right' } : item)
                          }))}
                          className={`p-1.5 rounded ${selectedElement.textAlign === 'right' ? 'bg-emerald-950 text-emerald-300' : 'text-stone-400'}`}
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateCover(p => ({
                            ...p,
                            elements: (p.elements || []).map(item => item.id === selectedElement.id ? {
                              ...item,
                              fontStyle: item.fontStyle === 'italic' ? 'normal' : 'italic'
                            } : item)
                          }))}
                          className={`px-2.5 py-1 rounded text-xs italic font-serif border ${selectedElement.fontStyle === 'italic' ? 'bg-emerald-950 border-emerald-700 text-emerald-200' : 'bg-[#141210] border-stone-800 text-stone-400'}`}
                        >
                          Italic
                        </button>

                        <button
                          onClick={() => updateCover(p => ({
                            ...p,
                            elements: (p.elements || []).map(item => item.id === selectedElement.id ? {
                              ...item,
                              textTransform: item.textTransform === 'uppercase' ? 'none' : 'uppercase'
                            } : item)
                          }))}
                          className={`px-2.5 py-1 rounded text-xs font-mono uppercase border ${selectedElement.textTransform === 'uppercase' ? 'bg-emerald-950 border-emerald-700 text-emerald-200' : 'bg-[#141210] border-stone-800 text-stone-400'}`}
                        >
                          AA
                        </button>
                      </div>
                    </div>

                    {/* Text Color */}
                    <div>
                      <label className="block text-[11px] font-mono text-stone-400 uppercase mb-1">Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedElement.color || '#fdf6e2'}
                          onChange={(e) => updateCover(p => ({
                            ...p,
                            elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, color: e.target.value } : item)
                          }))}
                          className="w-8 h-8 rounded border border-stone-700 cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={selectedElement.color || '#fdf6e2'}
                          onChange={(e) => updateCover(p => ({
                            ...p,
                            elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, color: e.target.value } : item)
                          }))}
                          className="flex-1 bg-[#141210] border border-stone-800 rounded px-2 py-1 text-xs font-mono text-stone-200"
                        />
                      </div>
                    </div>

                    {/* Letter Spacing & Line Height */}
                    <div className="space-y-3 pt-2 border-t border-stone-800">
                      <div>
                        <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                          <span>Letter Spacing (Tracking)</span>
                          <span className="font-mono">{selectedElement.letterSpacing || 0}px</span>
                        </div>
                        <input
                          type="range"
                          min={-2}
                          max={16}
                          value={selectedElement.letterSpacing || 0}
                          onChange={(e) => updateCover(p => ({
                            ...p,
                            elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, letterSpacing: parseInt(e.target.value) } : item)
                          }))}
                          className="w-full accent-emerald-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                          <span>Width Span</span>
                          <span className="font-mono">{selectedElement.width}%</span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={100}
                          value={selectedElement.width || 80}
                          onChange={(e) => updateCover(p => ({
                            ...p,
                            elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, width: parseInt(e.target.value) } : item)
                          }))}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* SHAPE & FRAME CONTROLS */}
                {(selectedElement.type === 'shape' || selectedElement.type === 'frame' || selectedElement.type === 'line') && (
                  <div className="space-y-4">
                    {selectedElement.strokeColor !== undefined && (
                      <div>
                        <label className="block text-[11px] font-mono text-stone-400 uppercase mb-1">Border / Stroke Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={selectedElement.strokeColor || '#d4af37'}
                            onChange={(e) => updateCover(p => ({
                              ...p,
                              elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, strokeColor: e.target.value } : item)
                            }))}
                            className="w-8 h-8 rounded border border-stone-700 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={selectedElement.strokeColor || '#d4af37'}
                            onChange={(e) => updateCover(p => ({
                              ...p,
                              elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, strokeColor: e.target.value } : item)
                            }))}
                            className="flex-1 bg-[#141210] border border-stone-800 rounded px-2 py-1 text-xs font-mono text-stone-200"
                          />
                        </div>
                      </div>
                    )}

                    {selectedElement.strokeWidth !== undefined && (
                      <div>
                        <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                          <span>Stroke Width</span>
                          <span className="font-mono">{selectedElement.strokeWidth}px</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={12}
                          value={selectedElement.strokeWidth || 1}
                          onChange={(e) => updateCover(p => ({
                            ...p,
                            elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, strokeWidth: parseInt(e.target.value) } : item)
                          }))}
                          className="w-full accent-emerald-500"
                        />
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                        <span>Opacity</span>
                        <span className="font-mono">{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={selectedElement.opacity ?? 1}
                        onChange={(e) => updateCover(p => ({
                          ...p,
                          elements: (p.elements || []).map(item => item.id === selectedElement.id ? { ...item, opacity: parseFloat(e.target.value) } : item)
                        }))}
                        className="w-full accent-emerald-500"
                      />
                    </div>
                  </div>
                )}

              </div>
            ) : (
              /* CANVAS SETTINGS (When no individual element is selected) */
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs uppercase font-mono tracking-wider text-stone-400 mb-2">Publishing Dimensions</h4>
                  <div className="space-y-2">
                    {CANVAS_PRESETS.map(preset => {
                      const isActive = cover.width === preset.width && cover.height === preset.height;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => updateCover(p => ({ ...p, width: preset.width, height: preset.height }))}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isActive
                              ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                              : 'bg-[#141210] border-stone-800 text-stone-300 hover:border-stone-700'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-semibold mb-0.5">
                            <span>{preset.name}</span>
                            <span className="font-mono text-[10px] text-stone-400">{preset.width}×{preset.height}</span>
                          </div>
                          <p className="text-[10px] text-stone-500 leading-tight">
                            {preset.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Export Resolution Scale */}
                <div className="pt-3 border-t border-stone-800">
                  <h4 className="text-xs uppercase font-mono tracking-wider text-stone-400 mb-2">PNG Export Scale</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[1, 1.5, 2].map(scale => (
                      <button
                        key={scale}
                        onClick={() => setExportScale(scale)}
                        className={`py-2 rounded-lg border text-center transition-colors font-mono ${
                          exportScale === scale
                            ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                            : 'bg-[#141210] border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {scale}× ({Math.round(cover.width! * scale)}px)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Story Association Confirmation */}
                <div className="pt-3 border-t border-stone-800 p-3 bg-stone-900/60 rounded-xl border border-stone-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-stone-200">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Story Integration</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed font-light">
                    Saving writes directly to <strong className="text-stone-200">"{currentStory?.title}"</strong> without affecting other stories or drafts.
                  </p>
                </div>
              </div>
            )}

          </div>
        </aside>

      </div>

      {/* 3. Modal 3D Book Mockup & Reader Preview */}
      {previewMode !== 'none' && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="relative max-w-2xl w-full bg-[#141210] border border-stone-800 rounded-3xl p-8 flex flex-col items-center shadow-2xl">
            
            <button
              onClick={() => setPreviewMode('none')}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-serif font-bold text-stone-100 mb-2">
              Realistic Book Mockup Preview
            </h3>
            <p className="text-xs text-stone-400 mb-8 text-center max-w-md">
              A digital simulation of how your readers experience the volume in print and on digital bookshelves.
            </p>

            {/* 3D Realistic Book Cylinder & Spine Effect */}
            <div className="relative perspective-[1200px] mb-8">
              <div
                style={{
                  transform: 'rotateY(-24deg) rotateX(8deg)',
                  transformStyle: 'preserve-3d',
                }}
                className="w-64 h-96 relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9)] rounded-r-md transition-transform duration-300"
              >
                {/* 3D Spine Thickness */}
                <div
                  style={{
                    transform: 'rotateY(-90deg) translateZ(0px)',
                    transformOrigin: 'left center',
                    width: '32px',
                    height: '100%',
                    left: 0,
                    top: 0
                  }}
                  className="absolute bg-gradient-to-r from-stone-900 to-black border-l border-stone-700/60"
                />

                {/* 3D Page Block Thickness Edge */}
                <div
                  style={{
                    transform: 'rotateY(90deg) translateZ(32px)',
                    transformOrigin: 'right center',
                    width: '30px',
                    height: '98%',
                    right: 0,
                    top: '1%'
                  }}
                  className="absolute bg-[#e6dfd1] border-r border-stone-400/40 bg-[linear-gradient(to_bottom,#f4eedf_1px,transparent_1px)] bg-[size:100%_3px]"
                />

                {/* Front Cover Face */}
                <div
                  className="w-full h-full rounded-r-md overflow-hidden relative border-t border-r border-b border-white/20"
                  style={{
                    backgroundColor: cover.bgColor || '#141210',
                    backgroundImage: cover.bgType === 'image' && cover.bgImage ? `url(${cover.bgImage})` : cover.bgGradient || 'linear-gradient(135deg, #1c1917 0%, #09090b 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {/* Glossy lighting sheen on book surface */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
                  
                  {/* Spine Crease Shadow */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />

                  {/* Render Title & Author on Mockup */}
                  <div className="absolute inset-4 flex flex-col justify-between text-center select-none">
                    <span className="text-[9px] font-mono tracking-widest uppercase text-stone-300/80">
                      INOKORA FIRST EDITION
                    </span>

                    <div>
                      <h4
                        style={{ color: cover.titleColor || '#fdf6e2' }}
                        className="text-lg font-serif font-bold leading-tight"
                      >
                        {cover.title || currentStory?.title || 'Book Title'}
                      </h4>
                      {cover.subtitle && (
                        <p className="text-[11px] font-serif italic text-stone-300/90 mt-1">
                          {cover.subtitle}
                        </p>
                      )}
                    </div>

                    <p
                      style={{ color: cover.authorColor || '#fdf6e2' }}
                      className="text-[10px] font-mono tracking-widest uppercase"
                    >
                      {cover.author || defaultAuthor}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPreviewMode('none')}
                className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors"
              >
                Back to Editing
              </button>
              <button
                onClick={() => {
                  setPreviewMode('none');
                  handleSaveCover();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Apply to Story</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
