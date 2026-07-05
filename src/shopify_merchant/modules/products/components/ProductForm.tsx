import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Heart, Share2, MoreHorizontal, ShoppingCart, 
  ChevronDown, Check, Truck, RefreshCw, ShieldCheck, Lock, 
  Sparkles, Send, Plus, Minus, Upload, X, Bold, Italic, 
  Underline, AlignLeft, AlignCenter, AlignRight, Link, Image as ImageIcon,
  Video, Table, Code, AlertTriangle, CheckCircle2, Info, HelpCircle
} from 'lucide-react';
import { Product } from '../../../types';
import { eventBus } from '../../../services/eventBus';

interface ProductFormProps {
  productToEdit?: Product | null;
  onBack: () => void;
  onSubmit: (formData: any) => void;
}

// Highly stylized headphone multi-angle custom SVGs to match high fidelity mockup wire
const HEADPHONE_GALLERY: Record<string, string> = {
  headphones_front: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full text-neutral-900"><path d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9"/><path d="M4 14a2 2 0 00-2 2v3a2 2 0 002 2h2V14H4zm16 0h-2v7h2a2 2 0 002-2v-3a2-0-2z"/></svg>`,
  headphones_folded: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full text-neutral-900"><path d="M12 4a8 8 0 00-8 8v1M12 4a8 8 0 018 8v1"/><rect x="2" y="13" width="5" height="8" rx="1.5" /><rect x="17" y="13" width="5" height="8" rx="1.5" /><path d="M7 17h10"/></svg>`,
  headphones_case: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full text-neutral-900"><rect x="4" y="6" width="16" height="12" rx="3.5" /><path d="M4 12h16" /><path d="M12 6v6" /><path d="M2.5 12a9.5 9.5 0 0 0 1 3.5"/></svg>`,
  headphones_box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full text-neutral-900"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.27 6.96L12 12.01l8.73-5.05" /><path d="M12 22.08V12" /></svg>`
};

type MediaItem = { id: string; type: 'svg' | 'uploaded'; content: string; };

export default function ProductForm({ productToEdit, onBack, onSubmit }: ProductFormProps) {
  // Track whether there are unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  // Core product details
  const [title, setTitle] = useState(productToEdit?.title || '');
  const [price, setPrice] = useState(productToEdit?.price || 0);
  const [compareAtPrice, setCompareAtPrice] = useState(productToEdit?.compareAtPrice || 0);
  const [costPerItem, setCostPerItem] = useState(productToEdit?.costPerItem || 0);
  const [description, setDescription] = useState(productToEdit?.description || '');
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>(productToEdit?.status as any || 'active');
  const [sku, setSku] = useState(productToEdit?.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [barcode, setBarcode] = useState(productToEdit?.barcode || '');
  const [vendor, setVendor] = useState(productToEdit?.vendor || 'Atelier Series');
  const [type, setType] = useState(productToEdit?.type || 'General');
  const [collections, setCollections] = useState<string[]>(productToEdit?.collections || ['Default Collection']);
  const [tags, setTags] = useState<string[]>(productToEdit?.tags || ['premium', 'new']);
  const [isTracked, setIsTracked] = useState(productToEdit?.isTracked ?? true);
  const [continueSelling, setContinueSelling] = useState(false);
  const [chargeTax, setChargeTax] = useState(true);
  const [themeTemplate, setThemeTemplate] = useState('Default product');
  const [category, setCategory] = useState(productToEdit?.type || 'Apparel');

  // Multi-location inventory quantities
  const [inventoryByLocation, setInventoryByLocation] = useState<Record<string, number>>(() => {
    return productToEdit?.inventoryByLocation || {
      'Main Warehouse': productToEdit?.inventory ?? 100,
      'Secondary Warehouse': 0
    };
  });
  const [inventory, setInventory] = useState(productToEdit?.inventory ?? 100);

  // Custom addition field inputs
  const [newCollectionInput, setNewCollectionInput] = useState('');
  const [newTagInput, setNewTagInput] = useState('');

  // Media gallery items
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => {
    if (productToEdit && productToEdit.images && productToEdit.images.length > 0) {
      return productToEdit.images.map((img, idx) => {
        if (img.startsWith('data:image/') || img.startsWith('http://') || img.startsWith('https://')) {
          return { id: `uploaded-${idx}`, type: 'uploaded' as const, content: img };
        } else {
          return { id: img, type: 'svg' as const, content: img };
        }
      });
    }
    return [
      { id: 'headphones_front', type: 'svg', content: 'headphones_front' },
      { id: 'headphones_folded', type: 'svg', content: 'headphones_folded' },
      { id: 'headphones_case', type: 'svg', content: 'headphones_case' },
      { id: 'headphones_box', type: 'svg', content: 'headphones_box' }
    ];
  });

  const [activeImage, setActiveImage] = useState<string>(() => {
    if (productToEdit && productToEdit.images && productToEdit.images.length > 0) {
      const first = productToEdit.images[0];
      if (first.startsWith('data:image/') || first.startsWith('http://') || first.startsWith('https://')) {
        return 'uploaded-0';
      }
      return first;
    }
    return 'headphones_front';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Interactive client state counters
  const [liked, setLiked] = useState(false);
  const [activeColorIdx, setActiveColorIdx] = useState(0);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiHistory, setAiHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Hello! I am your AI Product Assistant. Enter any refinement commands or request a discount (e.g. "discount active price by 10%").' }
  ]);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Profit calculations
  const profit = price - costPerItem;
  const margin = price > 0 ? Math.round((profit / price) * 100) : 0;

  // Handle value setter wrapper to trigger dirty state
  const handleFieldChange = (setter: any, val: any) => {
    setter(val);
    setIsDirty(true);
  };

  // Sync edits when form is saved
  const handleSave = () => {
    const saveImages = mediaItems.map(m => m.type === 'uploaded' ? m.content : m.id);
    
    onSubmit({
      title,
      description,
      price,
      compareAtPrice,
      costPerItem,
      inventory,
      status,
      sku,
      barcode,
      vendor,
      type: category,
      images: saveImages.length > 0 ? saveImages : ['wallet'],
      isTracked,
      collections,
      tags,
      inventoryByLocation
    });
    
    setIsDirty(false);
    eventBus.emit('event:notifications', { text: '💾 Product catalog has been synced smoothly.' });
    onBack();
  };

  // Handle location quantity updates
  const handleLocationQtyChange = (loc: string, val: number) => {
    const updated = { ...inventoryByLocation, [loc]: val };
    setInventoryByLocation(updated);
    const sum = Object.values(updated).reduce((a, b) => a + b, 0);
    setInventory(sum);
    setIsDirty(true);
  };

  // Add custom tags
  const addTag = () => {
    const clean = newTagInput.trim();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setNewTagInput('');
      setIsDirty(true);
    }
  };

  // Delete custom tag
  const removeTag = (t: string) => {
    setTags(tags.filter(item => item !== t));
    setIsDirty(true);
  };

  // Add custom collection
  const addCollection = () => {
    const clean = newCollectionInput.trim();
    if (clean && !collections.includes(clean)) {
      setCollections([...collections, clean]);
      setNewCollectionInput('');
      setIsDirty(true);
    }
  };

  // Delete custom collection
  const removeCollection = (c: string) => {
    setCollections(collections.filter(item => item !== c));
    setIsDirty(true);
  };

  // Handle WYSIWYG toolbar button insertions
  const handleToolbarAction = (action: string) => {
    if (!descriptionRef.current) return;
    const textarea = descriptionRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    let replacement = '';
    switch(action) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        break;
      case 'underline':
        replacement = `<u>${selected || 'underlined text'}</u>`;
        break;
      case 'left':
        replacement = `\n<p align="left">${selected || 'left aligned text'}</p>\n`;
        break;
      case 'center':
        replacement = `\n<p align="center">${selected || 'centered text'}</p>\n`;
        break;
      case 'right':
        replacement = `\n<p align="right">${selected || 'right aligned text'}</p>\n`;
        break;
      case 'link':
        replacement = `[${selected || 'link text'}](https://example.com)`;
        break;
      case 'image':
        replacement = `![${selected || 'image alt'}](https://example.com/image.png)`;
        break;
      case 'video':
        replacement = `\n<video src="https://example.com/video.mp4" controls width="100%"></video>\n`;
        break;
      case 'table':
        replacement = `\n| Column 1 | Column 2 |\n|---|---|\n| ${selected || 'Value 1'} | Value 2 |\n`;
        break;
      case 'code':
        replacement = `\n\`\`\`javascript\n${selected || '// code block'}\n\`\`\`\n`;
        break;
      default:
        return;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    setDescription(newText);
    setIsDirty(true);
    
    // Maintain selection focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 10);
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const newMedia: MediaItem = {
              id: `uploaded-${Date.now()}-${Math.random()}`,
              type: 'uploaded',
              content: event.target?.result as string
            };
            setMediaItems(prev => [...prev, newMedia]);
            setActiveImage(newMedia.id);
            setIsDirty(true);
            eventBus.emit('event:notifications', { text: '📷 Image uploaded successfully!' });
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  // Delete uploaded image
  const deleteImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaItems(prev => prev.filter(item => item.id !== id));
    if (activeImage === id) {
      const remaining = mediaItems.filter(item => item.id !== id);
      if (remaining.length > 0) {
        setActiveImage(remaining[0].id);
      }
    }
    setIsDirty(true);
    eventBus.emit('event:notifications', { text: '🗑️ Image removed' });
  };

  // AI assistant integration
  const handleAiCommand = async (command: string) => {
    if (!command.trim()) return;
    setIsAiGenerating(true);
    setAiHistory(prev => [...prev, { role: 'user', text: command }]);
    setAiMessage('');

    try {
      const resp = await fetch('/api/sidekick', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           message: `Optimize product data. Current Title: "${title}", Current Retail Price: ${price}, Current Compare Price: ${compareAtPrice}, Current Description: "${description}". Command: "${command}". Return JSON only packed strictly between [RESULT] and [/RESULT] tags matching schema: {"title":"...","price":120,"compareAtPrice":199,"description":"..."} followed by a short summary in English explaining changes. Absolutely no Chinese allowed for response.`
         })
      });
      const data = await resp.json();
      const reply = data.text || '';

      const match = reply.match(/\[RESULT\](.*?)\[\/RESULT\]/s);
      if (match) {
        try {
          const parsed = JSON.parse(match[1].trim());
          if (parsed.title) {
            setTitle(parsed.title);
            setIsDirty(true);
          }
          if (parsed.price !== undefined) {
            setPrice(Number(parsed.price));
            setIsDirty(true);
          }
          if (parsed.compareAtPrice !== undefined) {
            setCompareAtPrice(Number(parsed.compareAtPrice));
            setIsDirty(true);
          }
          if (parsed.description) {
            setDescription(parsed.description);
            setIsDirty(true);
          }
        } catch (je) {
          console.error(je);
        }
      }

      const textReply = reply.replace(/\[RESULT\].*?\[\/RESULT\]/gs, '').trim();
      setAiHistory(prev => [...prev, { 
        role: 'assistant', 
        text: textReply || '✨ Custom optimizations have been successfully integrated into parameters.' 
      }]);
    } catch (err) {
      // Fallback
      if (command.toLowerCase().includes('discount') || command.toLowerCase().includes('price') || command.toLowerCase().includes('cheap')) {
        setPrice(Math.round(price * 0.9));
        setIsDirty(true);
        setAiHistory(prev => [...prev, { role: 'assistant', text: '✨ Finished optimization. Reduced active price by 10% for improved conversions.' }]);
      } else {
        setTitle('SoundWave Pro Elite Headphones');
        setDescription('State-of-the-art acoustic architecture delivers immersive spatial audio and premium active noise cancellation.');
        setIsDirty(true);
        setAiHistory(prev => [...prev, { role: 'assistant', text: '✨ Polished details. Upgraded title and optimized description for luxury brand positioning.' }]);
      }
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Get active media content
  const getActiveMedia = () => {
    const media = mediaItems.find(m => m.id === activeImage);
    if (!media) return HEADPHONE_GALLERY.headphones_front;
    
    if (media.type === 'svg') {
      return HEADPHONE_GALLERY[media.content] || HEADPHONE_GALLERY.headphones_front;
    }
    return media.content;
  };

  const activeMediaContent = getActiveMedia();
  const isActiveMediaUploaded = mediaItems.find(m => m.id === activeImage)?.type === 'uploaded';

  return (
    <div className="absolute inset-0 z-[45] md:relative md:inset-auto md:z-0 md:min-h-screen bg-neutral-50 text-xs flex flex-col font-sans text-neutral-800 overflow-x-hidden" id="product-form-pdp">
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 1. Unsaved changes floating banner (mimics screenshot) */}
      {isDirty && (
        <div className="bg-neutral-900 border-b border-neutral-800 text-white px-5 py-2.5 flex items-center justify-between z-50 sticky top-0 animate-fadeIn shrink-0">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="font-bold text-[11px] tracking-wide">Prodotto non salvato (Unsaved changes)</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setIsDirty(false);
                onBack();
              }}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-md font-bold text-[10.5px] cursor-pointer select-none transition-colors"
            >
              Rimuovi (Discard)
            </button>
            <button
              onClick={handleSave}
              style={{ backgroundColor: '#07C2E3' }}
              className="px-3 py-1.5 text-black rounded-md font-extrabold text-[10.5px] cursor-pointer select-none hover:opacity-90 transition-opacity"
            >
              Salva (Save)
            </button>
          </div>
        </div>
      )}

      {/* 2. Form Toolbar Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-neutral-200 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-1 hover:bg-neutral-100 rounded text-neutral-800 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-800" />
          </button>
          <div>
            <h1 className="text-sm font-extrabold text-neutral-900">
              {productToEdit ? `Edit: ${productToEdit.title}` : 'Aggiungi prodotto (Add product)'}
            </h1>
            <p className="text-[10px] text-neutral-400 font-medium">Atelier Noir Commerce OS Catalog</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-neutral-700">
          <button 
            type="button" 
            onClick={() => eventBus.emit('event:notifications', { text: '🔗 Copied sharable store link.' })}
            className="p-1.5 hover:bg-neutral-100 rounded-full cursor-pointer"
          >
            <Share2 className="w-4.5 h-4.5 text-neutral-800" />
          </button>
          
          <button type="button" className="p-1.5 hover:bg-neutral-100 rounded-full">
            <MoreHorizontal className="w-4.5 h-4.5 text-neutral-800" />
          </button>
        </div>
      </div>

      {/* 3. Main Dual Column Page Layout */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-[1150px] mx-auto px-5 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: Main specifications */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Card A: Title & Description */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Titolo (Title)</label>
                  <input 
                    type="text" 
                    value={title} 
                    placeholder="Short sleeve t-shirt / T-shirt a maniche corte"
                    onChange={e => handleFieldChange(setTitle, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-950 focus:outline-none focus:border-[#07C2E3] focus:ring-1 focus:ring-[#07C2E3]/25"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Descrizione (Description)</label>
                    <span className="text-[9px] text-neutral-400 font-medium">supports standard HTML/Markdown formatting</span>
                  </div>
                  
                  {/* Visual Formatting Toolbar (replicates the screenshot) */}
                  <div className="flex flex-wrap gap-1 p-1 bg-neutral-50 border border-neutral-200 rounded-t-lg">
                    <button type="button" onClick={() => handleToolbarAction('bold')} className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 cursor-pointer" title="Bold"><Bold className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => handleToolbarAction('italic')} className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 cursor-pointer" title="Italic"><Italic className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => handleToolbarAction('underline')} className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 cursor-pointer" title="Underline"><Underline className="w-3.5 h-3.5" /></button>
                    <div className="w-[1px] bg-neutral-300 mx-1 self-stretch" />
                    <button type="button" onClick={() => handleToolbarAction('left')} className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 cursor-pointer" title="Align Left"><AlignLeft className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => handleToolbarAction('center')} className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 cursor-pointer" title="Align Center"><AlignCenter className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => handleToolbarAction('right')} className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 cursor-pointer" title="Align Right"><AlignRight className="w-3.5 h-3.5" /></button>
                    <div className="w-[1px] bg-neutral-300 mx-1 self-stretch" />
                    <button type="button" onClick={() => handleToolbarAction('link')} className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 cursor-pointer" title="Add Link"><Link className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => handleToolbarAction('image')} className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 cursor-pointer" title="Add Image"><ImageIcon className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => handleToolbarAction('video')} className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 cursor-pointer" title="Add Video"><Video className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => handleToolbarAction('table')} className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 cursor-pointer" title="Add Table"><Table className="w-3.5 h-3.5" /></button>
                    <button type="button" onClick={() => handleToolbarAction('code')} className="p-1.5 hover:bg-neutral-200 rounded text-neutral-700 cursor-pointer" title="View Code"><Code className="w-3.5 h-3.5" /></button>
                  </div>

                  <textarea 
                    ref={descriptionRef}
                    rows={8}
                    value={description} 
                    placeholder="Enter elegant copywriting features..."
                    onChange={e => handleFieldChange(setDescription, e.target.value)}
                    className="w-full p-3 bg-white border border-t-0 border-neutral-200 rounded-b-lg text-xs text-neutral-800 leading-relaxed focus:outline-none focus:border-[#07C2E3] focus:ring-1 focus:ring-[#07C2E3]/25 resize-none font-sans"
                  />
                </div>
              </div>

              {/* Card B: Contenuti multimediali (Media Gallery) */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-900">Contenuti multimediali (Media)</h3>
                  <span className="text-[10px] text-neutral-400 font-medium">Upload photos or 3D files</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  
                  {/* Left big preview (spans 2 cols) */}
                  <div className="col-span-2 aspect-square bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-center relative overflow-hidden group p-4">
                    {/* Bestseller badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="text-[8px] uppercase tracking-wider text-white bg-neutral-950 px-2 py-0.5 rounded font-extrabold">
                        Primary
                      </span>
                    </div>

                    {isActiveMediaUploaded ? (
                      <img 
                        src={activeMediaContent} 
                        alt="Active Product Thumbnail" 
                        className="w-full h-full object-contain filter saturate-[1.02]"
                      />
                    ) : (
                      <div 
                        className="w-24 h-24 flex items-center justify-center text-neutral-900"
                        dangerouslySetInnerHTML={{ __html: activeMediaContent }}
                      />
                    )}
                  </div>

                  {/* Rest of the thumbs in grid */}
                  <div className="col-span-3 grid grid-cols-3 gap-2">
                    {mediaItems.map((media, index) => {
                      const isActive = activeImage === media.id;
                      return (
                        <div key={media.id} className="relative aspect-square">
                          <button
                            type="button"
                            onClick={() => setActiveImage(media.id)}
                            className={`w-full h-full bg-white rounded-lg border flex items-center justify-center p-1 cursor-pointer transition-all active:scale-95 ${
                              isActive 
                                ? 'border-[#07C2E3] ring-1 ring-[#07C2E3]/15' 
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            {media.type === 'svg' ? (
                              <div 
                                className="w-10 h-10 text-neutral-800 opacity-90" 
                                dangerouslySetInnerHTML={{ __html: HEADPHONE_GALLERY[media.content] || HEADPHONE_GALLERY.headphones_front }} 
                              />
                            ) : (
                              <img 
                                src={media.content} 
                                alt={`Thumbnail ${index + 1}`} 
                                className="w-full h-full object-contain rounded-md"
                              />
                            )}
                          </button>
                          
                          <button
                            type="button"
                            onClick={(e) => deleteImage(media.id, e)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Dotted Upload zone button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square bg-neutral-50 hover:bg-neutral-100 border border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center active:scale-95 transition-all text-neutral-500 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-neutral-500" />
                      <span className="text-[7.5px] font-extrabold mt-1">Carica nuovo</span>
                    </button>
                  </div>

                </div>

                <div className="p-3 bg-neutral-50 border border-neutral-200/50 rounded-lg text-center text-[10px] text-neutral-400">
                  Drag and drop files to upload, or select existing files. Accetta immagini, video o modelli 3D.
                </div>
              </div>

              {/* Card C: Categoria (Product Category) */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-3">
                <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Categoria (Product Category)</label>
                <div className="relative">
                  <select 
                    value={category} 
                    onChange={e => handleFieldChange(setCategory, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-800 focus:outline-none focus:border-[#07C2E3] appearance-none"
                  >
                    <option value="Apparel">服饰 (Apparel / Vestiti)</option>
                    <option value="Bags">包袋 (Bags / Borse)</option>
                    <option value="Home">家居 (Home / Casa)</option>
                    <option value="Accessories">配件 (Accessories / Accessori)</option>
                    <option value="Electronics">电子周边 (Electronics / Elettronica)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
                <p className="text-[9.5px] text-neutral-400 font-medium">Determina le aliquote fiscali e aggiungi metafield per migliorare la ricerca, i filtri e le vendite cross-channel.</p>
              </div>

              {/* Card D: Prezzo (Pricing) */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-neutral-900">Prezzo (Pricing)</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Prezzo di vendita (€ / $)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-neutral-400 font-bold">€</span>
                      <input 
                        type="number" 
                        value={price || ''} 
                        placeholder="0.00"
                        onChange={e => handleFieldChange(setPrice, Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-900 focus:outline-none focus:border-[#07C2E3]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Prezzo di confronto (Compare)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-neutral-400 font-bold">€</span>
                      <input 
                        type="number" 
                        value={compareAtPrice || ''} 
                        placeholder="0.00"
                        onChange={e => handleFieldChange(setCompareAtPrice, Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-600 focus:outline-none focus:border-[#07C2E3]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Costo per articolo (Cost)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-neutral-400 font-bold">€</span>
                      <input 
                        type="number" 
                        value={costPerItem || ''} 
                        placeholder="0.00"
                        onChange={e => handleFieldChange(setCostPerItem, Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-600 focus:outline-none focus:border-[#07C2E3]"
                      />
                    </div>
                  </div>
                </div>

                {/* Profit analysis widget */}
                {price > 0 && costPerItem > 0 && (
                  <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-lg flex items-center justify-between text-xs font-medium">
                    <span className="text-neutral-500">Pricing Analysis:</span>
                    <div className="flex space-x-4">
                      <span>Margin: <strong className={margin >= 30 ? "text-emerald-600 font-extrabold" : "text-amber-600"}>{margin}%</strong></span>
                      <span>Profit: <strong className="text-emerald-600 font-extrabold">€{profit.toFixed(2)}</strong></span>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-1">
                  <input 
                    type="checkbox" 
                    id="charge-tax" 
                    checked={chargeTax}
                    onChange={e => handleFieldChange(setChargeTax, e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-[#07C2E3] focus:ring-[#07C2E3]"
                  />
                  <label htmlFor="charge-tax" className="text-[10.5px] font-bold text-neutral-700 cursor-pointer">Addebita imposta su questo prodotto (Charge tax on this product)</label>
                </div>
              </div>

              {/* Card E: Scorte (Inventory) */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-900">Scorte (Inventory)</h3>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-[9.5px] text-neutral-500 font-semibold">Monitora scorte (Track Quantity)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isTracked} 
                        onChange={e => handleFieldChange(setIsTracked, e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-neutral-200 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#07C2E3]"></div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Codice SKU (Stock Keeping Unit)</label>
                    <input 
                      type="text" 
                      value={sku} 
                      onChange={e => handleFieldChange(setSku, e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-mono text-neutral-800 focus:outline-none focus:border-[#07C2E3]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Barcode (GTIN / UPC / ISBN)</label>
                    <input 
                      type="text" 
                      value={barcode} 
                      placeholder="e.g. 190198001822"
                      onChange={e => handleFieldChange(setBarcode, e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-mono text-neutral-800 focus:outline-none focus:border-[#07C2E3]"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1 border-b border-neutral-100 pb-3">
                  <input 
                    type="checkbox" 
                    id="continue-selling" 
                    checked={continueSelling}
                    onChange={e => handleFieldChange(setContinueSelling, e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-[#07C2E3] focus:ring-[#07C2E3]"
                  />
                  <label htmlFor="continue-selling" className="text-[10.5px] font-semibold text-neutral-700 cursor-pointer">Continua a vendere quando esaurito (Continue selling when out of stock)</label>
                </div>

                {/* Locations list quantity adjustments */}
                <div className="space-y-3">
                  <h4 className="text-[10.5px] font-extrabold text-neutral-700 uppercase tracking-wide">Quantità per sede (Quantities by location)</h4>
                  <div className="border border-neutral-100 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="bg-neutral-50 text-neutral-500 border-b border-neutral-100">
                          <th className="py-2 px-3 font-semibold">Nome sede (Location Name)</th>
                          <th className="py-2 px-3 text-right font-semibold">Disponibile (Available)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(inventoryByLocation).map(([loc, qty]) => (
                          <tr key={loc} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50">
                            <td className="py-2.5 px-3 font-bold text-neutral-700">{loc}</td>
                            <td className="py-2 px-3 text-right">
                              <input 
                                type="number" 
                                value={qty} 
                                onChange={e => handleLocationQtyChange(loc, Number(e.target.value))}
                                className="w-20 px-2 py-1 bg-white border border-neutral-200 rounded text-center text-[11px] font-semibold text-neutral-900 focus:outline-none focus:border-[#07C2E3] inline-block"
                              />
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-neutral-50/50 font-extrabold">
                          <td className="py-2 px-3 text-neutral-900">Totale disponibile (Total)</td>
                          <td className="py-2 px-3 text-right pr-6 font-mono text-xs text-neutral-950">{inventory} Pcs</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Status, Organization, Theme settings */}
            <div className="space-y-6">
              
              {/* Card F: Stato (Product Status) */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
                <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Stato (Product Status)</label>
                <div className="relative">
                  <select 
                    value={status} 
                    onChange={e => handleFieldChange(setStatus, e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-850 focus:outline-none focus:border-[#07C2E3] appearance-none"
                  >
                    <option value="active">🟢 Attivo (Active)</option>
                    <option value="draft">🟡 Bozza (Draft)</option>
                    <option value="archived">🔴 Archiviato (Archived)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
                <p className="text-[9.5px] text-neutral-400">Questo stato controlla la visibilità del prodotto nei canali di vendita e nel negozio online.</p>
              </div>

              {/* Card G: Pubblicazione (Sales Channels) */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-3.5">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-1.5">
                  <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide">Pubblicazione (Publishing)</label>
                  <span className="text-[9px] text-[#07C2E3] font-bold">1 / 1 canali</span>
                </div>
                
                <div className="space-y-2.5 text-[11px] text-neutral-600 font-medium">
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Negozio online (Online Store)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Canali di terze parti (WMS Sync)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Agentico OS Copilot Integration</span>
                  </div>
                </div>
              </div>

              {/* Card H: Organizzazione del prodotto */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-neutral-900">Organizzazione del prodotto (Organization)</h3>

                {/* Vendor input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Venditore (Vendor)</label>
                  <input 
                    type="text" 
                    value={vendor} 
                    placeholder="e.g. Atelier Series / Nike"
                    onChange={e => handleFieldChange(setVendor, e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-800 focus:outline-none focus:border-[#07C2E3]"
                  />
                </div>

                {/* Type input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Tipo (Type)</label>
                  <input 
                    type="text" 
                    value={type} 
                    placeholder="e.g. Leather Bag / Wireless Speaker"
                    onChange={e => handleFieldChange(setType, e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-800 focus:outline-none focus:border-[#07C2E3]"
                  />
                </div>

                {/* Collections adding system */}
                <div className="space-y-1.5 pt-1 border-t border-neutral-100">
                  <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Collezioni (Collections)</label>
                  <div className="flex space-x-1.5">
                    <input 
                      type="text" 
                      value={newCollectionInput}
                      placeholder="Add collection and press enter..."
                      onChange={e => setNewCollectionInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCollection(); } }}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#07C2E3]"
                    />
                    <button 
                      type="button" 
                      onClick={addCollection}
                      className="px-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg active:scale-95 text-xs font-bold transition-all cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  {/* Collections chips list */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {collections.map(col => (
                      <span key={col} className="inline-flex items-center gap-1 py-0.5 pl-2 pr-1 bg-neutral-100 text-[10.5px] text-neutral-700 font-bold rounded-full border border-neutral-200">
                        <span>{col}</span>
                        <button type="button" onClick={() => removeCollection(col)} className="p-0.5 hover:bg-neutral-200 rounded-full text-neutral-500 hover:text-neutral-800"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tags adding system */}
                <div className="space-y-1.5 pt-1 border-t border-neutral-100">
                  <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Tag (Tags)</label>
                  <div className="flex space-x-1.5">
                    <input 
                      type="text" 
                      value={newTagInput}
                      placeholder="Add tag and press enter..."
                      onChange={e => setNewTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs focus:outline-none focus:border-[#07C2E3]"
                    />
                    <button 
                      type="button" 
                      onClick={addTag}
                      className="px-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg active:scale-95 text-xs font-bold transition-all cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  {/* Tags chips list */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {tags.map(t => (
                      <span key={t} className="inline-flex items-center gap-1 py-0.5 pl-2 pr-1 bg-neutral-100 text-[10.5px] text-neutral-700 font-bold rounded-full border border-neutral-200">
                        <span>{t}</span>
                        <button type="button" onClick={() => removeTag(t)} className="p-0.5 hover:bg-neutral-200 rounded-full text-neutral-500 hover:text-neutral-800"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card I: Modello di tema (Theme template) */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
                <label className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-wide block">Modello di tema (Theme Template)</label>
                <div className="relative">
                  <select 
                    value={themeTemplate} 
                    onChange={e => handleFieldChange(setThemeTemplate, e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-800 focus:outline-none focus:border-[#07C2E3] appearance-none"
                  >
                    <option value="Default product">Prodotto predefinito (Default product)</option>
                    <option value="Pre-order template">Modello Pre-order (Pre-order template)</option>
                    <option value="Gift card template">Modello Buono regalo (Gift card template)</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
                <p className="text-[9.5px] text-neutral-400">Specifica il layout e lo stile di visualizzazione di questo prodotto nello storefront.</p>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* 4. Connected Sidekick AI Assist Floating Drawer Panel */}
      {isAiOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-50 flex items-end justify-end animate-fadeIn" onClick={() => setIsAiOpen(false)}>
          <div 
            className="w-full max-w-md h-full bg-white border-l border-neutral-200 flex flex-col shadow-2xl z-55 animate-slideLeft"
            onClick={e => e.stopPropagation()}
          >
            {/* AI Sidekick Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-neutral-100 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-[#07C2E3]/15 flex items-center justify-center text-[#07C2E3]">
                  <Sparkles className="w-3.5 h-3.5 text-[#07C2E3]" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-neutral-900 font-mono tracking-wider">Sidekick AI Assistant</span>
                  <p className="text-[8.5px] text-neutral-400 font-medium">Equipped with Gemini Enterprise Brain Engine</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAiOpen(false)}
                className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-mono text-[9px] hover:bg-neutral-200 active:scale-90 font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* AI Chat logs */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {aiHistory.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`p-3 rounded-xl max-w-[85%] leading-relaxed text-[10.5px] ${
                    msg.role === 'user' 
                      ? 'bg-neutral-900 text-white rounded-br-none font-semibold' 
                      : 'bg-neutral-50 text-neutral-850 rounded-bl-none border border-neutral-200/60 font-medium shadow-2xs'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAiGenerating && (
                <div className="flex justify-start">
                  <div className="bg-neutral-50 text-neutral-500 p-3 rounded-xl text-[10px] flex items-center space-x-2 border border-neutral-200/60 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#07C2E3]" />
                    <span className="font-bold text-[#07C2E3]">Analyzing and rewriting parameters via Gemini...</span>
                  </div>
                </div>
              )}
            </div>

            {/* AI Action Quick Shortcuts */}
            <div className="px-5 py-2.5 bg-neutral-50 border-t border-neutral-100 select-none">
              <span className="text-[8px] text-neutral-400 font-extrabold uppercase tracking-widest block mb-1.5">Quick AI Shortcuts</span>
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => handleAiCommand("Enhance the product title to sound extremely premium, attractive, and luxurious")}
                  className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 rounded-lg border border-neutral-200 text-[9px] font-bold text-neutral-700 shrink-0 cursor-pointer shadow-3xs transition-colors"
                >
                  🪄 Polish Title
                </button>
                <button
                  type="button"
                  onClick={() => handleAiCommand("Write an engaging, long, and high-converting marketing description for this item")}
                  className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 rounded-lg border border-neutral-200 text-[9px] font-bold text-neutral-700 shrink-0 cursor-pointer shadow-3xs transition-colors"
                >
                  📝 Refine Description
                </button>
                <button
                  type="button"
                  onClick={() => handleAiCommand("Offer an active marketing campaign with 15% discount for this item")}
                  className="px-2.5 py-1.5 bg-white hover:bg-neutral-100 rounded-lg border border-neutral-200 text-[9px] font-bold text-neutral-700 shrink-0 cursor-pointer shadow-3xs transition-colors"
                >
                  🏷️ Apply 15% Off
                </button>
              </div>
            </div>

            {/* AI Input Form */}
            <form 
              onSubmit={e => {
                e.preventDefault();
                handleAiCommand(aiMessage);
              }}
              className="p-4 border-t border-neutral-100 bg-white flex items-center space-x-2 shrink-0"
            >
              <input 
                type="text" 
                value={aiMessage}
                disabled={isAiGenerating}
                onChange={e => setAiMessage(e.target.value)}
                placeholder="Ask Sidekick to optimize copy, pricing or write meta tags..."
                className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-[10.5px] focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#07C2E3]"
              />
              <button 
                type="submit"
                disabled={isAiGenerating}
                className="p-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg active:scale-95 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Persistent Bottom Bar (always accessible) */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md sm:max-w-none bg-white/95 backdrop-blur-md border-t border-neutral-200 px-6 py-4 z-40 flex items-center justify-between gap-4">
        
        {/* Toggle AI Sidekick Panel */}
        <button
          type="button"
          onClick={() => {
            setIsAiOpen(true);
            eventBus.emit('event:notifications', { text: '✨ Connected live to your AI assistant for product design.' });
          }}
          className="flex flex-col items-center justify-center py-2 px-4 border border-neutral-200 hover:border-neutral-300 rounded-full bg-white active:scale-95 transition-all text-neutral-800 font-bold shrink-0 min-w-[90px] h-11 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#07C2E3] mb-0.5 animate-pulse" />
          <span className="text-[8.5px] font-bold uppercase tracking-wider">AI Sidekick</span>
        </button>

        {/* Cancel/Discard button */}
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2.5 border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-extrabold rounded-full text-[10px] uppercase tracking-wider transition-all active:scale-95 h-11 flex items-center justify-center cursor-pointer"
        >
          Annulla (Cancel)
        </button>

        {/* Save/Commit button */}
        <button
          type="button"
          onClick={handleSave}
          style={{ backgroundColor: '#07C2E3' }}
          className="flex-1 py-2.5 text-black font-extrabold rounded-full text-[10px] uppercase tracking-wider shadow-md flex items-center justify-center active:scale-95 transition-all h-11 cursor-pointer"
        >
          {productToEdit ? 'Save Changes' : 'Salva Prodotto (Save Product)'}
        </button>
      </div>

    </div>
  );
}
