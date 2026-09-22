import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw, 
  Sliders, 
  Table2, 
  Image as ImageIcon, 
  Link2, 
  Share2, 
  ShieldCheck, 
  History, 
  Layers, 
  Compass, 
  ListChecks, 
  FlaskConical,
  ChevronDown,
  ChevronRight,
  Filter,
  Info
} from 'lucide-react';
import { NodeDetailPanel } from './NodeDetailPanel';
import { useApp } from '../../context/AppContext';

export function StandardKnowledgeMap({ standard, tables = [], figures = [], references = [], alliedStandards = [] }) {
  const { openSourcePage, openStandard } = useApp();
  
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Selected node for detail drawer
  const [selectedNode, setSelectedNode] = useState(null);

  // Active filter category
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Track expanded branch categories
  const [expandedCategories, setExpandedCategories] = useState({
    specifications: true,
    tables: false,
    figures: false,
    references: false,
    allied: false,
    testmethods: false,
    conformity: false
  });

  const toggleCategoryExpand = (catId, e) => {
    if (e) e.stopPropagation();
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // 1. Define Primary Categories with real backend links
  const categories = useMemo(() => [
    {
      id: 'scope',
      type: 'category-scope',
      label: 'Scope & Application',
      icon: Compass,
      nodeClass: 'node-scope',
      badge: 'Sec 1',
      description: standard.scope || 'Scope and field of application.',
      angle: -90, // Top
      distance: 210,
      hasChildren: false
    },
    {
      id: 'requirements',
      type: 'category-requirements',
      label: 'Clause Requirements',
      icon: ListChecks,
      nodeClass: 'node-requirements',
      badge: `${standard.sections?.length || 14} clauses`,
      description: 'Standard technical requirements and clause breakdown.',
      angle: -55,
      distance: 270,
      hasChildren: false
    },
    {
      id: 'specifications',
      type: 'category-specifications',
      label: 'Specifications',
      icon: Sliders,
      nodeClass: 'node-specification',
      badge: `${standard.specifications?.length || 10} specs`,
      description: 'Extracted parametric limits, tolerances, and operational conditions.',
      angle: -20,
      distance: 290,
      hasChildren: true,
      children: (standard.specifications || []).slice(0, 5).map((spec, idx) => ({
        id: `spec-${idx}`,
        type: 'specification',
        label: `${spec.property}: ${spec.value} ${spec.unit}`,
        data: spec,
        colorType: 'saffron'
      }))
    },
    {
      id: 'testmethods',
      type: 'category-testmethods',
      label: 'Test Methods',
      icon: FlaskConical,
      nodeClass: 'node-testmethod',
      badge: 'Apparatus',
      description: 'Standardized test procedures and apparatus qualification.',
      angle: 15,
      distance: 290,
      hasChildren: true,
      children: (standard.specifications || []).filter(s => s.category === 'Testing' || s.category === 'Performance').slice(0, 4).map((s, idx) => ({
        id: `test-${idx}`,
        type: 'specification',
        label: `${s.property}: ${s.value} ${s.unit}`,
        data: s,
        colorType: 'blue'
      }))
    },
    {
      id: 'tables',
      type: 'category-tables',
      label: 'Tables',
      icon: Table2,
      nodeClass: 'node-table',
      badge: `${tables.length || 2} tables`,
      description: 'Document tables containing tolerances and operating limits.',
      angle: 50,
      distance: 270,
      hasChildren: true,
      children: tables.slice(0, 3).map((tbl, idx) => ({
        id: `tbl-${idx}`,
        type: 'table',
        label: tbl.caption || `Table ${idx + 1}`,
        data: tbl,
        colorType: 'neutral'
      }))
    },
    {
      id: 'figures',
      type: 'category-figures',
      label: 'Figures',
      icon: ImageIcon,
      nodeClass: 'node-figure',
      badge: `${figures.length || 3} figures`,
      description: 'Confirmed technical apparatus drawings and schematics.',
      angle: 85,
      distance: 250,
      hasChildren: true,
      children: figures.slice(0, 3).map((fig, idx) => ({
        id: `fig-${idx}`,
        type: 'figure',
        label: `${fig.figure_number}: ${fig.caption ? fig.caption.slice(0, 24) + '...' : 'Figure'}`,
        data: fig,
        colorType: 'neutral'
      }))
    },
    {
      id: 'references',
      type: 'category-references',
      label: 'Normative References',
      icon: Link2,
      nodeClass: 'node-reference',
      badge: `${references.length || 4} refs`,
      description: 'Normative national and international reference standards.',
      angle: 130,
      distance: 280,
      hasChildren: true,
      children: references.slice(0, 4).map((ref, idx) => ({
        id: `ref-${idx}`,
        type: 'reference',
        label: ref.target,
        data: ref,
        colorType: 'blue'
      }))
    },
    {
      id: 'allied',
      type: 'category-allied',
      label: 'Allied Standards',
      icon: Share2,
      nodeClass: 'node-allied',
      badge: `${alliedStandards.length || 3} allied`,
      description: 'Related product, terminology, and testing standards.',
      angle: 165,
      distance: 290,
      hasChildren: true,
      children: alliedStandards.slice(0, 3).map((allied, idx) => ({
        id: `allied-${idx}`,
        type: 'reference',
        label: allied.is_number || allied.title,
        data: { target: allied.is_number, title: allied.title, is_indexed: true, type: allied.relationship },
        colorType: 'green'
      }))
    },
    {
      id: 'conformity',
      type: 'category-conformity',
      label: 'Conformity & QCO',
      icon: ShieldCheck,
      nodeClass: 'node-conformity',
      badge: 'Review Req.',
      description: 'Quality Control Orders, certification schemes, and compliance rules.',
      angle: -160,
      distance: 270,
      hasChildren: false
    },
    {
      id: 'amendments',
      type: 'category-amendments',
      label: 'Amendments & History',
      icon: History,
      nodeClass: 'node-amendments',
      badge: '2nd Rev',
      description: 'Revision timeline and Gazette amendment records.',
      angle: -125,
      distance: 250,
      hasChildren: false
    }
  ], [standard, tables, figures, references, alliedStandards]);

  // Center coordinates in canvas space
  const centerX = 640;
  const centerY = 360;

  // Root Node Position
  const rootNode = useMemo(() => ({
    id: 'root',
    type: 'root',
    label: standard.is_number,
    x: centerX,
    y: centerY,
    nodeClass: 'node-root'
  }), [standard.is_number]);

  // Calculate layout coordinates for categories & expanded children
  const { visibleCategories, visibleChildren, links } = useMemo(() => {
    const cats = [];
    const childNodes = [];
    const linkList = [];

    categories.forEach(cat => {
      // Check filter
      if (activeFilter !== 'ALL') {
        if (activeFilter === 'SPEC' && cat.id !== 'specifications' && cat.id !== 'testmethods') return;
        if (activeFilter === 'TABLES' && cat.id !== 'tables' && cat.id !== 'figures') return;
        if (activeFilter === 'REFS' && cat.id !== 'references' && cat.id !== 'allied') return;
        if (activeFilter === 'CONFORMITY' && cat.id !== 'conformity') return;
      }

      const rad = (cat.angle * Math.PI) / 180;
      const catX = centerX + cat.distance * Math.cos(rad);
      const catY = centerY + cat.distance * Math.sin(rad);

      const catNode = {
        ...cat,
        x: catX,
        y: catY
      };
      cats.push(catNode);

      // Root -> Category link
      linkList.push({
        id: `link-root-${cat.id}`,
        fromX: centerX,
        fromY: centerY,
        toX: catX,
        toY: catY,
        color: cat.nodeClass.includes('saffron') ? '#ea580c' : 
               cat.nodeClass.includes('allied') ? '#16a34a' : 
               cat.nodeClass.includes('reference') ? '#2563eb' : '#94a3b8'
      });

      // If expanded and has children, position children outward
      if (expandedCategories[cat.id] && cat.children && cat.children.length > 0) {
        const count = cat.children.length;
        const arcSpread = 32; // degrees
        const startAngle = cat.angle - (arcSpread * (count - 1)) / 2;

        cat.children.forEach((ch, idx) => {
          const chAngle = (startAngle + idx * arcSpread) * (Math.PI / 180);
          const chDistance = 140; // outward from category
          const chX = catX + chDistance * Math.cos(chAngle);
          const chY = catY + chDistance * Math.sin(chAngle);

          const childNode = {
            ...ch,
            parentId: cat.id,
            x: chX,
            y: chY
          };
          childNodes.push(childNode);

          // Category -> Child link
          linkList.push({
            id: `link-${cat.id}-${ch.id}`,
            fromX: catX,
            fromY: catY,
            toX: chX,
            toY: chY,
            color: ch.colorType === 'saffron' ? '#ea580c' : 
                   ch.colorType === 'green' ? '#16a34a' : '#cbd5e1'
          });
        });
      }
    });

    return { visibleCategories: cats, visibleChildren: childNodes, links: linkList };
  }, [categories, expandedCategories, activeFilter]);

  // Mouse drag handlers for canvas panning
  const handleMouseDown = (e) => {
    // Only pan if clicked on background viewport
    if (e.target.closest('.map-node') || e.target.closest('.mindmap-toolbar') || e.target.closest('.mindmap-filter-bar') || e.target.closest('.mindmap-side-panel')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom(prev => Math.min(2.2, Math.max(0.4, prev * zoomFactor)));
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(2.2, z + 0.15));
  const handleZoomOut = () => setZoom(z => Math.max(0.4, z - 0.15));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const handleFit = () => {
    setZoom(0.82);
    setPan({ x: 40, y: 20 });
  };

  // Node selection
  const handleNodeClick = (node, e) => {
    e.stopPropagation();
    setSelectedNode(node);
  };

  return (
    <div 
      ref={containerRef}
      className="mindmap-viewport"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      
      {/* 1. Category Filter Bar (Top) */}
      <div className="mindmap-filter-bar">
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: 4, paddingRight: 4 }}>
          <Filter size={11} /> MAP VIEW:
        </span>

        {[
          { id: 'ALL', label: 'All Branches' },
          { id: 'SPEC', label: 'Specifications & Testing' },
          { id: 'TABLES', label: 'Tables & Figures' },
          { id: 'REFS', label: 'References & Allied' },
          { id: 'CONFORMITY', label: 'Conformity & QCO' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`mindmap-filter-chip ${activeFilter === filter.id ? 'active' : ''}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* 2. Interactive SVG & HTML5 Canvas Space */}
      <div 
        className="mindmap-canvas"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '50% 50%',
          transition: isDragging ? 'none' : 'transform 0.08s ease-out'
        }}
      >
        {/* SVG Bezier Connecting Links */}
        <svg 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '2400px', 
            height: '1600px', 
            pointerEvents: 'none',
            overflow: 'visible'
          }}
        >
          {links.map(link => {
            // Cubic Bezier curve calculation
            const dx = link.toX - link.fromX;
            const dy = link.toY - link.fromY;
            const cx1 = link.fromX + dx * 0.45;
            const cy1 = link.fromY;
            const cx2 = link.toX - dx * 0.45;
            const cy2 = link.toY;
            const pathD = `M ${link.fromX} ${link.fromY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${link.toX} ${link.toY}`;

            return (
              <path
                key={link.id}
                d={pathD}
                fill="none"
                stroke={link.color}
                strokeWidth="1.6"
                strokeOpacity="0.45"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Center Root Node */}
        <div
          className={`map-node ${rootNode.nodeClass} ${selectedNode?.id === 'root' ? 'selected' : ''}`}
          style={{ left: `${rootNode.x}px`, top: `${rootNode.y}px` }}
          onClick={(e) => handleNodeClick(rootNode, e)}
        >
          <img 
            src="/logo.png" 
            alt="Standard" 
            style={{ width: 20, height: 20, borderRadius: 2, backgroundColor: '#ffffff', padding: 1 }} 
          />
          <span className="mono-val">{rootNode.label}</span>
        </div>

        {/* First-Tier Primary Category Nodes */}
        {visibleCategories.map(cat => {
          const Icon = cat.icon;
          const isSelected = selectedNode?.id === cat.id;
          const isExpanded = expandedCategories[cat.id];

          return (
            <div
              key={cat.id}
              className={`map-node node-category ${cat.nodeClass} ${isSelected ? 'selected' : ''}`}
              style={{ left: `${cat.x}px`, top: `${cat.y}px` }}
              onClick={(e) => handleNodeClick(cat, e)}
            >
              <Icon size={14} />
              <span>{cat.label}</span>
              
              {cat.badge && (
                <span style={{ 
                  fontSize: '10px', 
                  padding: '1px 5px', 
                  borderRadius: 8, 
                  backgroundColor: 'rgba(0,0,0,0.06)',
                  fontFamily: 'var(--font-mono)' 
                }}>
                  {cat.badge}
                </span>
              )}

              {cat.hasChildren && (
                <button
                  type="button"
                  onClick={(e) => toggleCategoryExpand(cat.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'inherit',
                    padding: '1px 2px',
                    marginLeft: '2px'
                  }}
                  title={isExpanded ? 'Collapse branch' : 'Expand branch'}
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
            </div>
          );
        })}

        {/* Second-Tier Child Leaf Nodes (Real entities from backend) */}
        {visibleChildren.map(ch => {
          const isSelected = selectedNode?.id === ch.id;
          let colorClass = 'node-leaf-saffron';
          if (ch.colorType === 'green') colorClass = 'node-leaf-green';
          if (ch.colorType === 'blue') colorClass = 'node-leaf-blue';

          return (
            <div
              key={ch.id}
              className={`map-node node-leaf ${colorClass} ${isSelected ? 'selected' : ''}`}
              style={{ left: `${ch.x}px`, top: `${ch.y}px` }}
              onClick={(e) => handleNodeClick(ch, e)}
            >
              <span className="mono-val" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ch.label}
              </span>
            </div>
          );
        })}

      </div>

      {/* 3. Floating Map Controls (Bottom Left) */}
      <div className="mindmap-toolbar">
        <button onClick={handleZoomIn} className="mindmap-tool-btn" title="Zoom In">
          <ZoomIn size={15} />
        </button>
        <button onClick={handleZoomOut} className="mindmap-tool-btn" title="Zoom Out">
          <ZoomOut size={15} />
        </button>
        <button onClick={handleFit} className="mindmap-tool-btn" title="Fit to Screen">
          <Maximize2 size={15} />
        </button>
        <button onClick={handleReset} className="mindmap-tool-btn" title="Reset View">
          <RotateCcw size={15} />
        </button>
      </div>

      {/* 4. Contextual Side Panel (Right Slide-Over) */}
      {selectedNode && (
        <NodeDetailPanel 
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          standard={standard}
          tables={tables}
          figures={figures}
          references={references}
        />
      )}

    </div>
  );
}
