'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Board, CanvasData, CanvasObject } from '@/types';
import styles from './BoardCanvas.module.css';

const COLORS = ['#8b6cff', '#36e8d0', '#ff6bcb', '#ffc14a', '#3dd68c'];

type Tool = 'select' | 'rect' | 'circle' | 'line' | 'arrow' | 'text';
const TOOLS: Tool[] = ['select', 'rect', 'circle', 'line', 'arrow', 'text'];

export default function BoardCanvas() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [active, setActive] = useState<Board | null>(null);
  const [tool, setTool] = useState<Tool>('rect');
  const [zoom, setZoom] = useState(1);
  const [color, setColor] = useState(COLORS[0]);
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ startX: number; startY: number } | null>(null);

  const load = useCallback(async () => {
    const res = await api<Board[]>('/boards');
    const list = res.data ?? [];
    setBoards(list);
    if (list[0] && !active) selectBoard(list[0]);
  }, [active]);

  useEffect(() => {
    void load();
  }, []);

  function selectBoard(b: Board) {
    setActive(b);
    try {
      const data = JSON.parse(b.canvas_data_json) as CanvasData;
      setObjects(data.objects || []);
    } catch {
      setObjects([]);
    }
  }

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0a0b14';
    ctx.fillRect(0, 0, rect.width, rect.height);

    for (const o of objects) {
      ctx.strokeStyle = o.stroke || o.fill || '#fff';
      ctx.fillStyle = o.fill || 'transparent';
      ctx.lineWidth = 2;
      if (o.type === 'rect' && o.x != null && o.y != null && o.w != null && o.h != null) {
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeRect(o.x, o.y, o.w, o.h);
        if (o.text) {
          ctx.fillStyle = '#fff';
          ctx.font = '14px sans-serif';
          ctx.fillText(o.text, o.x + 12, o.y + 28);
        }
      } else if (o.type === 'circle' && o.x != null && o.y != null && o.r != null) {
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if ((o.type === 'line' || o.type === 'arrow') && o.x1 != null) {
        ctx.beginPath();
        ctx.moveTo(o.x1, o.y1!);
        ctx.lineTo(o.x2!, o.y2!);
        ctx.stroke();
        if (o.type === 'arrow') {
          const angle = Math.atan2((o.y2! - o.y1!), (o.x2! - o.x1!));
          const len = 10;
          ctx.beginPath();
          ctx.moveTo(o.x2!, o.y2!);
          ctx.lineTo(o.x2! - len * Math.cos(angle - 0.4), o.y2! - len * Math.sin(angle - 0.4));
          ctx.lineTo(o.x2! - len * Math.cos(angle + 0.4), o.y2! - len * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fillStyle = o.stroke || o.fill || '#fff';
          ctx.fill();
        }
      } else if (o.type === 'text' && o.x != null && o.text) {
        ctx.fillStyle = o.fill || '#fff';
        ctx.font = '16px sans-serif';
        ctx.fillText(o.text, o.x, o.y!);
      }
    }
  }, [objects]);

  function pos(e: React.MouseEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e: React.MouseEvent) {
    if (tool === 'select') return;
    const p = pos(e);
    drawing.current = { startX: p.x, startY: p.y };
  }

  function onUp(e: React.MouseEvent) {
    if (!drawing.current || tool === 'select') return;
    const p = pos(e);
    const { startX, startY } = drawing.current;
    drawing.current = null;
    let obj: CanvasObject | null = null;

    if (tool === 'rect') {
      obj = {
        type: 'rect',
        x: Math.min(startX, p.x),
        y: Math.min(startY, p.y),
        w: Math.abs(p.x - startX) || 80,
        h: Math.abs(p.y - startY) || 50,
        fill: color,
        text: 'Node',
      };
    } else if (tool === 'circle') {
      const r = Math.max(20, Math.hypot(p.x - startX, p.y - startY));
      obj = { type: 'circle', x: startX, y: startY, r, fill: color };
    } else if (tool === 'line' || tool === 'arrow') {
      obj = { type: tool, x1: startX, y1: startY, x2: p.x, y2: p.y, stroke: color };
    } else if (tool === 'text') {
      const text = window.prompt('Text label', 'Label');
      if (text) obj = { type: 'text', x: startX, y: startY, text, fill: color };
    }

    if (obj) setObjects((prev) => [...prev, obj!]);
  }

  async function save() {
    if (!active) return;
    const json = JSON.stringify({ version: 1, objects });
    const res = await api<Board>(`/boards/${active.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ canvas_data_json: json }),
    });
    if (res.data) {
      setActive(res.data);
      setBoards((prev) => prev.map((b) => (b.id === res.data!.id ? res.data! : b)));
    }
  }

  async function createBoard() {
    const title = window.prompt('Board title', 'Untitled board');
    if (!title) return;
    const res = await api<Board>('/boards', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    if (res.data) {
      setBoards((prev) => [res.data!, ...prev]);
      selectBoard(res.data);
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Yazım Tahtası</h1>
          <p className={styles.sub}>Şekil · ok · metin · kaydet</p>
        </div>
        <button type="button" className={styles.newBtn} onClick={createBoard}>
          + Yeni tahta
        </button>
      </header>

      <div className={styles.layout}>
        <aside className={styles.side}>
          {boards.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`${styles.boardItem} ${active?.id === b.id ? styles.on : ''}`}
              onClick={() => selectBoard(b)}
            >
              {b.title}
            </button>
          ))}
        </aside>

        <div className={styles.stage}>
          <div className={styles.toolbar}>
            {TOOLS.map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.tool} ${tool === t ? styles.toolOn : ''}`}
                onClick={() => setTool(t)}
              >
                {t}
              </button>
            ))}
            <div className={styles.colors}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.swatch} ${color === c ? styles.swatchOn : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
            <button type="button" className={styles.saveBtn} onClick={save}>
              Save
            </button>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => setObjects([])}
            >
              Clear
            </button>
          </div>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            onMouseDown={onDown}
            onMouseUp={onUp}
          />
        </div>
      </div>
    </div>
  );
}
