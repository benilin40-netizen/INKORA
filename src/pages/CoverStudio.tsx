import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Download, Save, Undo, RotateCcw, Image as ImageIcon, 
  Upload, Check, AlertCircle, Sparkles, Eye, Palette, Type, Sliders, Layout, Layers
} from 'lucide-react';
import { Story, CoverConfig, User } from '../types';

interface CoverStudioProps {
  stories: Story[];
  initialStoryId?: string;
  currentUser?: User;
  onBack: () => void;
  onSaveCover: (storyId: string, cover: CoverConfig) => Promise<void> | void;
}

const GRADIENT_PRESETS = [
  { name: 'Obsidian Velvet', value: 'linear-gradient(135deg, #09090b 0%, #1c1917 50%, #000000 100%)' },
  { name: 'Celestial Rose', value: 'linear-gradient(135deg, #1f1017 0%, #3f1222 50%, #09090b 100%)' },
  { name: 'Midnight Astral', value: 'linear-gradient(135deg, #09131e 0%, #14283c 50%, #06090f 100%)' },
  { name: 'Emerald Sanctuary', value: 'linear-gradient(135deg, #091a13 0%, #103225 50%, #070d0a 100%)' },
  { name: 'Amber Solitude', value: 'linear-gradient(135deg, #231508 0%, #45260f 50%, #0c0804 100%)' },
  { name: 'Gothic Amethyst', value: 'linear-gradient(135deg, #180922 0%, #321045 50%, #08030d 100%)' },
  { name: 'Crimson Abyss', value: 'linear-gradient(135deg, #2b0b0e 0%, #4c1117 50%, #0d0203 100%)' },
  { name: 'Frost & Bone', value: 'linear-gradient(135deg, #171c22 0%, #2a343e 50%, #0e1115 100%)' },
];

const COLOR_PALETTES = [
  { name: 'Rose Gold', title: '#f43f5e', subtitle: '#fecdd3', author: '#fed7aa' },
  { name: 'Gilded Amber', title: '#f59e0b', subtitle: '#fef3c7', author: '#fde68a' },
  { name: 'Celestial Pearl', title: '#f5f5f4', subtitle: '#d6d3d1', author: '#a8a29e' },
  { name: 'Emerald Fire', title: '#10b981', subtitle: '#d1fae5', author: '#6ee7b7' },
  { name: 'Violet Dusk', title: '#c084fc', subtitle: '#f3e8ff', author: '#e9d5ff' },
  { name: 'Electric Cyan', title: '#38bdf8', subtitle: '#e0f2fe', author: '#bae6fd' },
];

export const CoverStudio: React.FC<CoverStudioProps> = ({ 
  stories, 
  initialStoryId, 
  currentUser,
  onBack, 
  onSaveCover 
}) => {
  const selectedStory = stories.find(s => s.id === initialStoryId) || stories[0];
  const [activeStoryId, setActiveStoryId] = useState<string>(selectedStory?.id || stories[0]?.id || '');
  const currentStory = stories.find(s => s.id === activeStoryId) || selectedStory;

  const defaultAuthor = currentUser?.name || currentStory?.authorName || 'Author';

  const createInitialCover = (story?: Story): CoverConfig => {
    if (story?.cover) {
      return {
        ...story.cover,
        author: story.cover.author || defaultAuthor,
        bgType: story.cover.bgType || (story.cover.bgImage ? 'image' : 'gradient'),
        overlayOpacity: typeof story.cover.overlayOpacity === 'number' ? story.cover.overlayOpacity : 0.35,
        overlayColor: story.cover.overlayColor || '#000000',
        fontStyle: story.cover.fontStyle || 'normal',
        fontWeight: story.cover.fontWeight || 'bold',
        textAlign: story.cover.textAlign || 'center',
        titleSize: story.cover.titleSize || 2.4,
        subtitleSize: story.cover.subtitleSize || 1.1,
      };
    }
    return {
      title: story?.title || 'Untitled Masterpiece',
      author: defaultAuthor,
      subtitle: 'A Novel',
      tagline: 'When shadows speak, the cosmos listens.',
      genre: story?.genre || 'Fantasy',
      showGenre: true,
      bgColor: '#18181b',
      bgGradient: GRADIENT_PRESETS[0].value,
      bgType: 'gradient',
      bgImage: '',
      overlayPattern: 'stars',
      overlayOpacity: 0.35,
      overlayColor: '#000000',
      fontFamily: 'serif',
      fontStyle: 'normal',
      fontWeight: 'bold',
      textAlign: 'center',
      titleColor: '#f43f5e',
      subtitleColor: '#e4e4e7',
      authorColor: '#e4e4e7',
      titleSize: 2.4,
      subtitleSize: 1.1,
      titlePosition: { x: 50, y: 38 },
      authorPosition: { x: 50, y: 88 },
      badgeText: 'First Edition',
      artworkStyle: 'Atmospheric Celestial Canvas'
    };
  };

  const [cover, setCover] = useState<CoverConfig>(() => createInitialCover(currentStory));
  
  // History stack for Undo
  const [history, setHistory] = useState<CoverConfig[]>([]);
  const [activeTab, setActiveTab] = useState<'typography' | 'background' | 'overlay' | 'details'>('typography');
  const [previewMode, setPreviewMode] = useState(false);
  const [notice, setNotice] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Artwork URL validation state
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [urlStatus, setUrlStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [urlMessage, setUrlMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // When selected story changes
  useEffect(() => {
    if (currentStory) {
      setCover(createInitialCover(currentStory));
      setHistory([]);
    }
  }, [activeStoryId]);

  const updateCoverWithHistory = (updater: (prev: CoverConfig) => CoverConfig) => {
    setCover(prev => {
      const next = updater(prev);
      setHistory(h => [...h.slice(-15), prev]);
      return next;
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setCover(prev);
    showNotice('Reverted to previous state');
  };

  const handleReset = () => {
    if (confirm('Reset cover to original story defaults?')) {
      const resetConfig = createInitialCover(currentStory);
      updateCoverWithHistory(() => resetConfig);
      showNotice('Reset to original book defaults');
    }
  };

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  const handleSaveDraft = async () => {
    if (!activeStoryId) return;
    try {
      await onSaveCover(activeStoryId, cover);
      showNotice('Cover saved to story draft successfully!');
    } catch (err: any) {
      showNotice('Error saving cover: ' + (err?.message || 'Check connection'));
    }
  };

  // Device File Upload Handler
  const handleDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('Image file is too large. Please select an image under 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        updateCoverWithHistory(c => ({
          ...c,
          bgType: 'image',
          bgImage: result
        }));
        showNotice('Cover artwork loaded from device');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Validate and apply external Artwork URL
  const handleValidateAndApplyUrl = () => {
    if (!customUrlInput.trim()) {
      setUrlStatus('invalid');
      setUrlMessage('Please enter an image URL.');
      return;
    }

    setUrlStatus('validating');
    setUrlMessage('Testing image connection...');

    const img = new Image();
    img.onload = () => {
      setUrlStatus('valid');
      setUrlMessage('Image successfully verified.');
      updateCoverWithHistory(c => ({
        ...c,
        bgType: 'image',
        bgImage: customUrlInput.trim()
      }));
      showNotice('Artwork URL applied to cover');
    };
    img.onerror = () => {
      setUrlStatus('invalid');
      setUrlMessage('Could not load image from this URL. Please verify the link or upload a file directly.');
    };
    img.src = customUrlInput.trim();
  };

  // High-Resolution 1600 × 2400 PNG Export
  const handleExportPNG = async () => {
    setIsExporting(true);
    showNotice('Rendering high-resolution 1600 × 2400 PNG...');

    try {
      const width = 1600;
      const height = 2400;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2D Canvas unavailable');

      // 1. Draw Background
      if (cover.bgType === 'image' && cover.bgImage) {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            // Draw image maintaining cover aspect ratio
            const imgAspect = img.width / img.height;
            const canvasAspect = width / height;
            let drawW = width;
            let drawH = height;
            let offsetX = 0;
            let offsetY = 0;

            if (imgAspect > canvasAspect) {
              drawW = height * imgAspect;
              offsetX = -(drawW - width) / 2;
            } else {
              drawH = width / imgAspect;
              offsetY = -(drawH - height) / 2;
            }

            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
            resolve();
          };
          img.onerror = () => {
            // Fallback gradient if image failed to load with CORS
            const grad = ctx.createLinearGradient(0, 0, width, height);
            grad.addColorStop(0, '#1c1917');
            grad.addColorStop(0.5, '#292524');
            grad.addColorStop(1, '#09090b');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);
            resolve();
          };
          img.src = cover.bgImage!;
        });
      } else {
        // Render rich gradient background
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, cover.bgColor || '#18181b');
        grad.addColorStop(0.5, '#292524');
        grad.addColorStop(1, '#09090b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Contrast Overlay Layer
      const overlayOpacity = typeof cover.overlayOpacity === 'number' ? cover.overlayOpacity : 0.35;
      if (overlayOpacity > 0) {
        ctx.save();
        ctx.fillStyle = cover.overlayColor || '#000000';
        ctx.globalAlpha = overlayOpacity;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // 3. Starlight / Pattern Texture
      if (cover.overlayPattern === 'stars') {
        ctx.save();
        ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
        for (let x = 60; x < width; x += 70) {
          for (let y = 60; y < height; y += 70) {
            ctx.beginPath();
            const radius = (x * 13 + y * 7) % 3 === 0 ? 3 : 1.8;
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      } else if (cover.overlayPattern === 'dots') {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        for (let x = 40; x < width; x += 50) {
          for (let y = 40; y < height; y += 50) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }

      // 4. Double Ornate Framing Borders
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 6;
      ctx.strokeRect(60, 60, width - 120, height - 120);

      ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(80, 80, width - 160, height - 160);
      ctx.restore();

      // 5. Badge & Genre Pills
      const badgeY = 180;
      if (cover.badgeText) {
        ctx.save();
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        const badgeStr = cover.badgeText.toUpperCase();
        const metrics = ctx.measureText(badgeStr);
        const pillW = metrics.width + 70;
        const pillH = 70;
        const pillX = (width - pillW) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(pillX, badgeY - 50, pillW, pillH, 35);
        } else {
          ctx.rect(pillX, badgeY - 50, pillW, pillH);
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#f5f5f4';
        ctx.fillText(badgeStr, width / 2, badgeY);
        ctx.restore();
      }

      if (cover.showGenre !== false && cover.genre) {
        ctx.save();
        ctx.font = '600 32px sans-serif';
        ctx.textAlign = 'center';
        const genreStr = cover.genre.toUpperCase();
        const metrics = ctx.measureText(genreStr);
        const pillW = metrics.width + 60;
        const pillH = 60;
        const pillX = (width - pillW) / 2;
        const genreY = badgeY + 90;

        ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(pillX, genreY - 42, pillW, pillH, 30);
        } else {
          ctx.rect(pillX, genreY - 42, pillW, pillH);
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fda4af';
        ctx.fillText(genreStr, width / 2, genreY);
        ctx.restore();
      }

      // 6. Book Title (Wrapped and Centered or Aligned)
      ctx.save();
      const fontFam = cover.fontFamily === 'serif' ? 'serif' :
                      cover.fontFamily === 'mono' ? 'monospace' : 'sans-serif';
      const fontSty = cover.fontStyle === 'italic' ? 'italic' : 'normal';
      const fontWt = cover.fontWeight === 'normal' ? '400' :
                     cover.fontWeight === 'medium' ? '500' : 'bold';

      const scaledTitleSize = Math.round((cover.titleSize || 2.4) * 44);
      ctx.font = `${fontSty} ${fontWt} ${scaledTitleSize}px ${fontFam}`;
      ctx.fillStyle = cover.titleColor || '#f43f5e';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 6;

      const titleAlign = cover.textAlign || 'center';
      ctx.textAlign = titleAlign as CanvasTextAlign;
      const textX = titleAlign === 'left' ? 140 :
                    titleAlign === 'right' ? width - 140 : width / 2;

      // Word wrapping for title
      const words = (cover.title || 'Untitled Masterpiece').split(' ');
      let currentLine = '';
      const lines: string[] = [];
      const maxLineWidth = width - 280;

      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
        const testMetrics = ctx.measureText(testLine);
        if (testMetrics.width > maxLineWidth && i > 0) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      const titleCenterY = Math.round((height * (cover.titlePosition?.y || 40)) / 100);
      const lineHeight = scaledTitleSize * 1.25;
      const totalBlockHeight = lines.length * lineHeight;
      const startY = titleCenterY - totalBlockHeight / 2 + scaledTitleSize * 0.8;

      lines.forEach((line, index) => {
        ctx.fillText(line, textX, startY + index * lineHeight);
      });
      ctx.restore();

      // 7. Subtitle
      let subY = startY + lines.length * lineHeight + 40;
      if (cover.subtitle) {
        ctx.save();
        const scaledSubSize = Math.round((cover.subtitleSize || 1.1) * 36);
        ctx.font = `500 ${scaledSubSize}px sans-serif`;
        ctx.fillStyle = cover.subtitleColor || '#e4e4e7';
        ctx.textAlign = (cover.textAlign || 'center') as CanvasTextAlign;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 20;
        ctx.fillText(cover.subtitle, textX, subY);
        ctx.restore();
        subY += scaledSubSize + 30;
      }

      // 8. Tagline
      if (cover.tagline) {
        ctx.save();
        ctx.font = 'italic 400 36px serif';
        ctx.fillStyle = '#fde68a';
        ctx.textAlign = (cover.textAlign || 'center') as CanvasTextAlign;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 15;
        ctx.fillText(`“${cover.tagline}”`, textX, subY + 20);
        ctx.restore();
      }

      // 9. Author Signature Footer
      ctx.save();
      const authorY = Math.round((height * (cover.authorPosition?.y || 88)) / 100);
      ctx.font = 'bold 50px sans-serif';
      ctx.fillStyle = cover.authorColor || '#e4e4e7';
      ctx.textAlign = (cover.textAlign || 'center') as CanvasTextAlign;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 25;
      ctx.fillText((cover.author || 'Author').toUpperCase(), textX, authorY);
      ctx.restore();

      // 10. Generate and trigger download
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const safeTitle = (cover.title || 'novel').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      link.download = `${safeTitle}_cover_1600x2400.png`;
      link.href = dataUrl;
      link.click();

      // Also persist high-res preview URL to the cover draft
      onSaveCover(activeStoryId, { ...cover, exportedCoverDataUrl: dataUrl });
      showNotice('1600 × 2400 high-res PNG exported successfully!');
    } catch (err: any) {
      console.error('[CoverStudio] Export failed:', err);
      showNotice('Export failed: ' + (err?.message || 'Check browser canvas memory'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#f5f5f4] flex flex-col relative z-10">
      
      {/* Studio Header Bar */}
      <header className="h-16 border-b border-[#292524] bg-[#0c0a09]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-serif font-bold text-stone-100 flex items-center gap-2">
              <span>Book Cover Designer</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                1600×2400
              </span>
            </h1>
            <p className="text-[11px] text-stone-400 hidden sm:block">Design bespoke cover artwork for your publication</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Target Story Selector */}
          <select
            value={activeStoryId}
            onChange={(e) => setActiveStoryId(e.target.value)}
            className="bg-[#1c1917] border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none max-w-[130px] sm:max-w-[200px] truncate"
          >
            {stories.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>

          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-40 transition-colors"
            title="Undo recent change"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
            title="Reset to story default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Preview Button */}
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ${
              previewMode ? 'bg-amber-500/20 border border-amber-500 text-amber-300' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{previewMode ? 'Edit Mode' : 'Preview'}</span>
          </button>

          {/* Save Draft Button */}
          <button
            onClick={handleSaveDraft}
            className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 border border-stone-700 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Apply Cover</span>
          </button>

          {/* Export 1600x2400 PNG Button */}
          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export 1600×2400'}</span>
          </button>
        </div>
      </header>

      {/* Notice Banner */}
      {notice && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/80 text-emerald-200 text-xs py-2 px-6 text-center font-medium transition-all animate-fade-in flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Main Studio Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Controls & Customization Panel (Hidden in pure preview mode) */}
        {!previewMode && (
          <aside className="w-full lg:w-[420px] bg-[#0c0a09]/90 backdrop-blur-md border-r border-[#292524] flex flex-col h-[400px] lg:h-auto overflow-hidden">
            
            {/* Category Navigation Tabs */}
            <div className="flex border-b border-[#292524] bg-[#141210]/60 p-1.5 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('typography')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-colors ${
                  activeTab === 'typography' ? 'bg-rose-950/80 text-rose-200 border border-rose-800/60' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text</span>
              </button>

              <button
                onClick={() => setActiveTab('background')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-colors ${
                  activeTab === 'background' ? 'bg-rose-950/80 text-rose-200 border border-rose-800/60' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Artwork</span>
              </button>

              <button
                onClick={() => setActiveTab('overlay')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-colors ${
                  activeTab === 'overlay' ? 'bg-rose-950/80 text-rose-200 border border-rose-800/60' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Contrast</span>
              </button>

              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-colors ${
                  activeTab === 'details' ? 'bg-rose-950/80 text-rose-200 border border-rose-800/60' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Details</span>
              </button>
            </div>

            {/* Scrollable Control Panes */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* --- TAB 1: TYPOGRAPHY --- */}
              {activeTab === 'typography' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                      Book Title
                    </label>
                    <input
                      type="text"
                      value={cover.title}
                      onChange={(e) => updateCoverWithHistory(c => ({ ...c, title: e.target.value }))}
                      className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                      Subtitle (Optional)
                    </label>
                    <input
                      type="text"
                      value={cover.subtitle || ''}
                      placeholder="e.g. A Chronicle of the Lost Realm"
                      onChange={(e) => updateCoverWithHistory(c => ({ ...c, subtitle: e.target.value }))}
                      className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                      Author Name (Defaults to Author Profile)
                    </label>
                    <input
                      type="text"
                      value={cover.author}
                      onChange={(e) => updateCoverWithHistory(c => ({ ...c, author: e.target.value }))}
                      className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Font Family Selection */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                      Font Family
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'serif', label: 'Serif' },
                        { id: 'sans', label: 'Sans' },
                        { id: 'mono', label: 'Mono' },
                        { id: 'display', label: 'Display' }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => updateCoverWithHistory(c => ({ ...c, fontFamily: f.id as any }))}
                          className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                            cover.fontFamily === f.id
                              ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                              : 'bg-[#1c1917] border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alignment & Style */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                        Alignment
                      </label>
                      <div className="flex rounded-xl bg-[#1c1917] border border-stone-800 p-1">
                        {(['left', 'center', 'right'] as const).map(align => (
                          <button
                            key={align}
                            onClick={() => updateCoverWithHistory(c => ({ ...c, textAlign: align }))}
                            className={`flex-1 py-1 rounded-lg text-xs capitalize transition-colors ${
                              (cover.textAlign || 'center') === align
                                ? 'bg-stone-800 text-stone-100 font-medium'
                                : 'text-stone-400 hover:text-stone-200'
                            }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                        Style & Weight
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateCoverWithHistory(c => ({ 
                            ...c, 
                            fontStyle: c.fontStyle === 'italic' ? 'normal' : 'italic' 
                          }))}
                          className={`flex-1 py-1.5 rounded-xl border text-xs font-serif italic transition-colors ${
                            cover.fontStyle === 'italic' ? 'bg-rose-950/80 border-rose-700 text-rose-200' : 'bg-[#1c1917] border-stone-800 text-stone-400'
                          }`}
                        >
                          Italic
                        </button>
                        <button
                          onClick={() => updateCoverWithHistory(c => ({ 
                            ...c, 
                            fontWeight: c.fontWeight === 'bold' ? 'normal' : 'bold' 
                          }))}
                          className={`flex-1 py-1.5 rounded-xl border text-xs font-sans font-bold transition-colors ${
                            cover.fontWeight === 'bold' ? 'bg-rose-950/80 border-rose-700 text-rose-200' : 'bg-[#1c1917] border-stone-800 text-stone-400'
                          }`}
                        >
                          Bold
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Font Size Sliders */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>Title Size</span>
                        <span className="font-mono">{cover.titleSize.toFixed(1)}rem</span>
                      </div>
                      <input
                        type="range"
                        min="1.4"
                        max="4.0"
                        step="0.1"
                        value={cover.titleSize}
                        onChange={(e) => updateCoverWithHistory(c => ({ ...c, titleSize: parseFloat(e.target.value) }))}
                        className="w-full accent-rose-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>Subtitle Size</span>
                        <span className="font-mono">{(cover.subtitleSize || 1.1).toFixed(1)}rem</span>
                      </div>
                      <input
                        type="range"
                        min="0.8"
                        max="2.0"
                        step="0.1"
                        value={cover.subtitleSize || 1.1}
                        onChange={(e) => updateCoverWithHistory(c => ({ ...c, subtitleSize: parseFloat(e.target.value) }))}
                        className="w-full accent-rose-500"
                      />
                    </div>
                  </div>

                  {/* Color Palettes */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                      Color Schemes
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {COLOR_PALETTES.map((pal, idx) => (
                        <button
                          key={idx}
                          onClick={() => updateCoverWithHistory(c => ({
                            ...c,
                            titleColor: pal.title,
                            subtitleColor: pal.subtitle,
                            authorColor: pal.author
                          }))}
                          className="p-2 rounded-xl bg-[#1c1917] border border-stone-800 hover:border-stone-700 flex flex-col items-center gap-1 text-[11px] text-stone-300"
                        >
                          <div className="flex gap-1">
                            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: pal.title }} />
                            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: pal.subtitle }} />
                            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: pal.author }} />
                          </div>
                          <span>{pal.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* --- TAB 2: BACKGROUND & ARTWORK --- */}
              {activeTab === 'background' && (
                <div className="space-y-6">
                  
                  {/* Background Mode Switch */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                      Artwork Source
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['gradient', 'image', 'color'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => updateCoverWithHistory(c => ({ ...c, bgType: mode }))}
                          className={`py-2 rounded-xl text-xs font-medium border capitalize transition-colors ${
                            cover.bgType === mode ? 'bg-rose-950/80 border-rose-700 text-rose-200' : 'bg-[#1c1917] border-stone-800 text-stone-400'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Device File Upload & Image URL */}
                  {cover.bgType === 'image' && (
                    <div className="space-y-4 p-4 rounded-2xl bg-[#1c1917] border border-stone-800">
                      <div>
                        <span className="block text-xs font-medium text-stone-200 mb-2">Upload Device Artwork</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleDeviceUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-3 rounded-xl border border-dashed border-stone-700 hover:border-rose-500 bg-stone-900/60 text-stone-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <Upload className="w-4 h-4 text-rose-400" />
                          <span>Choose Image from Device</span>
                        </button>
                        <p className="text-[10px] text-stone-500 mt-1.5 text-center">Supports PNG, JPG, WebP up to 8MB</p>
                      </div>

                      <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-stone-800"></div>
                        <span className="flex-shrink mx-3 text-stone-500 text-[10px] uppercase font-mono">or link artwork URL</span>
                        <div className="flex-grow border-t border-stone-800"></div>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="url"
                          placeholder="https://example.com/cover-artwork.jpg"
                          value={customUrlInput}
                          onChange={(e) => {
                            setCustomUrlInput(e.target.value);
                            setUrlStatus('idle');
                          }}
                          className="w-full bg-[#141210] border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                        />
                        
                        <button
                          type="button"
                          onClick={handleValidateAndApplyUrl}
                          disabled={urlStatus === 'validating'}
                          className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-medium transition-colors"
                        >
                          {urlStatus === 'validating' ? 'Verifying...' : 'Validate & Apply URL'}
                        </button>

                        {urlStatus === 'valid' && (
                          <div className="p-2 bg-emerald-950/70 border border-emerald-800 rounded-lg text-emerald-300 text-[11px] flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{urlMessage}</span>
                          </div>
                        )}

                        {urlStatus === 'invalid' && (
                          <div className="p-2 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-300 text-[11px] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{urlMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Gradient Presets */}
                  {cover.bgType === 'gradient' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                        Atmospheric Gradients
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {GRADIENT_PRESETS.map((grad, idx) => (
                          <button
                            key={idx}
                            onClick={() => updateCoverWithHistory(c => ({
                              ...c,
                              bgGradient: grad.value
                            }))}
                            className="p-3 rounded-xl border border-stone-800 hover:border-rose-800/60 flex items-center gap-2.5 text-left transition-all"
                            style={{ background: grad.value }}
                          >
                            <span className="w-3 h-3 rounded-full border border-white/40 flex-shrink-0" />
                            <span className="text-xs font-medium text-stone-200 drop-shadow">{grad.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Solid Color Picker */}
                  {cover.bgType === 'color' && (
                    <div className="space-y-3">
                      <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                        Solid Background Tone
                      </label>
                      <div className="flex items-center gap-3 bg-[#1c1917] border border-stone-800 rounded-xl p-3">
                        <input
                          type="color"
                          value={cover.bgColor}
                          onChange={(e) => updateCoverWithHistory(c => ({ ...c, bgColor: e.target.value }))}
                          className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent"
                        />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={cover.bgColor}
                            onChange={(e) => updateCoverWithHistory(c => ({ ...c, bgColor: e.target.value }))}
                            className="bg-[#141210] border border-stone-800 rounded-lg px-3 py-1.5 text-xs font-mono text-stone-200 w-full"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* --- TAB 3: CONTRAST & OVERLAY --- */}
              {activeTab === 'overlay' && (
                <div className="space-y-6">
                  
                  {/* Pattern Overlay */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                      Texture Overlay
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'stars', label: 'Star Particles' },
                        { id: 'vignette', label: 'Vignette' },
                        { id: 'dots', label: 'Micro Dots' },
                        { id: 'grid', label: 'Fine Grid' },
                        { id: 'none', label: 'Clean' }
                      ].map(pat => (
                        <button
                          key={pat.id}
                          onClick={() => updateCoverWithHistory(c => ({ ...c, overlayPattern: pat.id as any }))}
                          className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                            cover.overlayPattern === pat.id ? 'bg-rose-950/80 border-rose-700 text-rose-200' : 'bg-[#1c1917] border-stone-800 text-stone-400'
                          }`}
                        >
                          {pat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Overlay Opacity Slider */}
                  <div>
                    <div className="flex justify-between text-xs text-stone-400 mb-1.5">
                      <span>Contrast Tint Darkness</span>
                      <span className="font-mono">{Math.round((cover.overlayOpacity || 0.35) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.85"
                      step="0.05"
                      value={cover.overlayOpacity ?? 0.35}
                      onChange={(e) => updateCoverWithHistory(c => ({ ...c, overlayOpacity: parseFloat(e.target.value) }))}
                      className="w-full accent-rose-500"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      Increases readability against vibrant or photographic backgrounds.
                    </p>
                  </div>

                  {/* Overlay Tint Color */}
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                      Overlay Tint Color
                    </label>
                    <div className="flex gap-2">
                      {[
                        { name: 'Dark Void', color: '#000000' },
                        { name: 'Night Plum', color: '#1a0b16' },
                        { name: 'Deep Navy', color: '#09131e' },
                        { name: 'Warm Charcoal', color: '#171614' },
                      ].map((tint, i) => (
                        <button
                          key={i}
                          onClick={() => updateCoverWithHistory(c => ({ ...c, overlayColor: tint.color }))}
                          className={`flex-1 p-2 rounded-xl border text-[11px] flex items-center justify-center gap-1.5 ${
                            cover.overlayColor === tint.color ? 'bg-stone-800 border-rose-600 text-white' : 'bg-[#1c1917] border-stone-800 text-stone-400'
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full border border-white/20" style={{ backgroundColor: tint.color }} />
                          <span>{tint.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* --- TAB 4: DETAILS & BADGES --- */}
              {activeTab === 'details' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                      Header Badge Text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bestseller Edition, Collector's Volume"
                      value={cover.badgeText || ''}
                      onChange={(e) => updateCoverWithHistory(c => ({ ...c, badgeText: e.target.value }))}
                      className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                      Tagline / Poetic Motto
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. When stars fall, gods awaken."
                      value={cover.tagline || ''}
                      onChange={(e) => updateCoverWithHistory(c => ({ ...c, tagline: e.target.value }))}
                      className="w-full bg-[#1c1917] border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="block text-xs font-medium text-stone-200">Display Genre Pill</span>
                      <span className="text-[11px] text-stone-500">Show {cover.genre || 'genre'} on cover header</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={cover.showGenre !== false}
                      onChange={(e) => updateCoverWithHistory(c => ({ ...c, showGenre: e.target.checked }))}
                      className="w-4 h-4 rounded bg-[#1c1917] border-stone-800 text-rose-600 focus:ring-0"
                    />
                  </div>

                  {/* Vertical positioning sliders */}
                  <div className="space-y-3 pt-3 border-t border-stone-800/80">
                    <div>
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>Title Vertical Position</span>
                        <span className="font-mono">{cover.titlePosition?.y || 38}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="65"
                        value={cover.titlePosition?.y || 38}
                        onChange={(e) => updateCoverWithHistory(c => ({
                          ...c,
                          titlePosition: { ...c.titlePosition, y: parseInt(e.target.value) }
                        }))}
                        className="w-full accent-rose-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-stone-400 mb-1">
                        <span>Author Vertical Position</span>
                        <span className="font-mono">{cover.authorPosition?.y || 88}%</span>
                      </div>
                      <input
                        type="range"
                        min="70"
                        max="95"
                        value={cover.authorPosition?.y || 88}
                        onChange={(e) => updateCoverWithHistory(c => ({
                          ...c,
                          authorPosition: { ...c.authorPosition, y: parseInt(e.target.value) }
                        }))}
                        className="w-full accent-rose-500"
                      />
                    </div>
                  </div>

                </div>
              )}

            </div>
          </aside>
        )}

        {/* Right Side: Live Interactive Book Preview Stage */}
        <main className="flex-1 bg-[#141210]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
          
          <div className="relative group select-none">
            
            {/* Book Spine 3D illusion shadow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-rose-950/20 via-black/40 to-transparent blur-xl pointer-events-none" />

            {/* Live Book Cover Surface */}
            <div
              style={{
                backgroundColor: cover.bgColor || '#18181b',
                backgroundImage: cover.bgType === 'image' && cover.bgImage 
                  ? `url(${cover.bgImage})` 
                  : cover.bgType === 'gradient' ? cover.bgGradient : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              className="w-[320px] sm:w-[380px] h-[480px] sm:h-[570px] rounded-2xl shadow-2xl relative overflow-hidden border-2 border-stone-700/60 flex flex-col justify-between p-7 transition-all duration-300"
            >
              {/* Contrast Tint Layer */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundColor: cover.overlayColor || '#000000',
                  opacity: typeof cover.overlayOpacity === 'number' ? cover.overlayOpacity : 0.35
                }}
              />

              {/* Texture Overlays */}
              {cover.overlayPattern === 'stars' && (
                <div className="absolute inset-0 bg-[radial-gradient(#f43f5e_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
              )}
              {cover.overlayPattern === 'dots' && (
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:18px_18px] opacity-15 pointer-events-none" />
              )}
              {cover.overlayPattern === 'grid' && (
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0d_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0d_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
              )}
              {cover.overlayPattern === 'vignette' && (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.65)_100%)] pointer-events-none" />
              )}

              {/* Literary Framed Border */}
              <div className="absolute inset-3 border border-white/10 rounded-xl pointer-events-none" />
              <div className="absolute inset-4 border border-rose-500/20 rounded-lg pointer-events-none" />

              {/* Top Header: Badge & Genre */}
              <div className="relative z-10 flex items-center justify-between w-full">
                {cover.badgeText ? (
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-stone-200 text-[10px] uppercase tracking-widest font-mono">
                    {cover.badgeText}
                  </span>
                ) : <span />}

                {cover.showGenre !== false && cover.genre && (
                  <span className="px-3 py-1 rounded-full bg-rose-950/70 backdrop-blur-md border border-rose-800/60 text-rose-300 text-[10px] uppercase tracking-wider font-sans font-medium">
                    {cover.genre}
                  </span>
                )}
              </div>

              {/* Center Body: Title & Subtitle & Tagline */}
              <div 
                className={`relative z-10 my-auto flex flex-col w-full ${
                  cover.textAlign === 'left' ? 'text-left items-start' :
                  cover.textAlign === 'right' ? 'text-right items-end' : 'text-center items-center'
                }`}
                style={{
                  transform: `translateY(${(cover.titlePosition?.y || 38) - 38}px)`
                }}
              >
                <h2
                  style={{
                    color: cover.titleColor,
                    fontSize: `${cover.titleSize}rem`,
                    fontFamily: cover.fontFamily === 'serif' ? 'Georgia, serif' :
                                cover.fontFamily === 'mono' ? 'monospace' : 'sans-serif',
                    fontStyle: cover.fontStyle === 'italic' ? 'italic' : 'normal',
                    fontWeight: cover.fontWeight === 'bold' ? 'bold' : 'normal',
                    textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 25px rgba(0,0,0,0.6)',
                  }}
                  className="leading-tight line-clamp-3 select-none"
                >
                  {cover.title}
                </h2>

                {cover.subtitle && (
                  <p
                    style={{
                      color: cover.subtitleColor || '#e4e4e7',
                      fontSize: `${cover.subtitleSize || 1.1}rem`,
                      textShadow: '0 1px 8px rgba(0,0,0,0.9)'
                    }}
                    className="font-sans mt-2 opacity-90 line-clamp-2"
                  >
                    {cover.subtitle}
                  </p>
                )}

                {cover.tagline && (
                  <p
                    style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
                    className="text-xs font-serif italic text-amber-200/90 mt-2.5 line-clamp-2"
                  >
                    “{cover.tagline}”
                  </p>
                )}
              </div>

              {/* Bottom Footer: Author Signature */}
              <div 
                className={`relative z-10 w-full pt-3 border-t border-white/10 ${
                  cover.textAlign === 'left' ? 'text-left' :
                  cover.textAlign === 'right' ? 'text-right' : 'text-center'
                }`}
              >
                <p
                  style={{
                    color: cover.authorColor,
                    textShadow: '0 1px 8px rgba(0,0,0,0.9)'
                  }}
                  className="text-xs sm:text-sm uppercase tracking-widest font-mono font-medium truncate"
                >
                  {cover.author}
                </p>
              </div>

            </div>

            {/* Book Spine highlight */}
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/40 via-white/5 to-transparent rounded-l-2xl pointer-events-none" />
          </div>

          <div className="mt-6 text-center text-xs text-stone-500 font-mono">
            <span>Standard 2:3 Literary Portrait • Live Studio Renderer</span>
          </div>

        </main>

      </div>

    </div>
  );
};
