import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Target, RefreshCw, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Optimization() {
  const { data: surfaceData, isLoading, refetch } = trpc.optimization.surface.useQuery();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 30, y: 45 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  // Process surface data for visualization
  const processedData = surfaceData?.reduce((acc, point) => {
    const key = `${point.tpTicks}-${point.slTicks}`;
    acc[key] = {
      tp: point.tpTicks,
      sl: point.slTicks,
      value: parseFloat(point.expectedValue),
      winRate: parseFloat(point.winRate || "0"),
      profitFactor: parseFloat(point.profitFactor || "0"),
    };
    return acc;
  }, {} as Record<string, { tp: number; sl: number; value: number; winRate: number; profitFactor: number }>) || {};

  // Find optimal point
  const optimalPoint = surfaceData?.reduce((best, current) => {
    if (!best || parseFloat(current.expectedValue) > parseFloat(best.expectedValue)) {
      return current;
    }
    return best;
  }, null as typeof surfaceData[0] | null);

  // 3D rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !surfaceData || surfaceData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear canvas
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, width, height);

    // Get unique TP and SL values
    const tpValues = Array.from(new Set(surfaceData.map(d => d.tpTicks))).sort((a, b) => a - b);
    const slValues = Array.from(new Set(surfaceData.map(d => d.slTicks))).sort((a, b) => a - b);

    // Find min/max for normalization
    const values = surfaceData.map(d => parseFloat(d.expectedValue));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    // 3D projection function
    const project = (x: number, y: number, z: number) => {
      const scale = 150 * zoom;
      const radX = (rotation.x * Math.PI) / 180;
      const radY = (rotation.y * Math.PI) / 180;

      // Rotate around Y axis
      const x1 = x * Math.cos(radY) - z * Math.sin(radY);
      const z1 = x * Math.sin(radY) + z * Math.cos(radY);

      // Rotate around X axis
      const y1 = y * Math.cos(radX) - z1 * Math.sin(radX);
      const z2 = y * Math.sin(radX) + z1 * Math.cos(radX);

      // Project to 2D
      const perspective = 500 / (500 + z2);
      return {
        x: centerX + x1 * scale * perspective,
        y: centerY - y1 * scale * perspective,
        z: z2,
      };
    };

    // Color function based on value
    const getColor = (value: number) => {
      const normalized = (value - minValue) / valueRange;
      if (normalized < 0.33) {
        // Red to Yellow
        const t = normalized / 0.33;
        return `rgb(${Math.round(239)}, ${Math.round(68 + (187 * t))}, ${Math.round(68)})`;
      } else if (normalized < 0.66) {
        // Yellow to Green
        const t = (normalized - 0.33) / 0.33;
        return `rgb(${Math.round(255 - (221 * t))}, ${Math.round(255 - (56 * t))}, ${Math.round(68 - (68 * t) + (85 * t))})`;
      } else {
        // Green
        return `rgb(34, 197, 94)`;
      }
    };

    // Draw grid lines
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.5;

    // Draw surface
    const points: { x: number; y: number; z: number; value: number; tp: number; sl: number }[] = [];

    for (let i = 0; i < tpValues.length; i++) {
      for (let j = 0; j < slValues.length; j++) {
        const tp = tpValues[i];
        const sl = slValues[j];
        const key = `${tp}-${sl}`;
        const data = processedData[key];
        
        if (data) {
          const x = (i / (tpValues.length - 1) - 0.5) * 2;
          const z = (j / (slValues.length - 1) - 0.5) * 2;
          const y = ((data.value - minValue) / valueRange - 0.5) * 1.5;
          
          const projected = project(x, y, z);
          points.push({ ...projected, value: data.value, tp, sl });
        }
      }
    }

    // Sort by z for proper rendering
    points.sort((a, b) => b.z - a.z);

    // Draw points as circles
    points.forEach(point => {
      const size = Math.max(4, 8 * zoom);
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fillStyle = getColor(point.value);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw optimal point highlight
    if (optimalPoint) {
      const optIdx = tpValues.indexOf(optimalPoint.tpTicks);
      const optJdx = slValues.indexOf(optimalPoint.slTicks);
      if (optIdx !== -1 && optJdx !== -1) {
        const x = (optIdx / (tpValues.length - 1) - 0.5) * 2;
        const z = (optJdx / (slValues.length - 1) - 0.5) * 2;
        const y = ((parseFloat(optimalPoint.expectedValue) - minValue) / valueRange - 0.5) * 1.5;
        const projected = project(x, y, z);
        
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, 15 * zoom, 0, Math.PI * 2);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, 18 * zoom, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draw axes labels
    ctx.fillStyle = "#888";
    ctx.font = "12px sans-serif";
    
    const axisEnd = project(1.2, 0, 0);
    ctx.fillText("TP →", axisEnd.x, axisEnd.y);
    
    const axisEndZ = project(0, 0, 1.2);
    ctx.fillText("SL →", axisEndZ.x, axisEndZ.y);
    
    const axisEndY = project(0, 1.2, 0);
    ctx.fillText("EV ↑", axisEndY.x, axisEndY.y);

  }, [surfaceData, rotation, zoom, processedData, optimalPoint]);

  // Mouse handlers for rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    setRotation(prev => ({
      x: Math.max(-90, Math.min(90, prev.x + dy * 0.5)),
      y: prev.y + dx * 0.5,
    }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Ottimizzazione 3D
          </h1>
          <p className="text-muted-foreground">Superficie di ottimizzazione TP/SL interattiva</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      {/* Optimal Point Card */}
      {optimalPoint && (
        <Card className="bg-card/50 border-primary/50">
          <CardHeader>
            <CardTitle className="text-primary">Punto Ottimale</CardTitle>
            <CardDescription>Combinazione TP/SL con il miglior Expected Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Take Profit</p>
                <p className="text-2xl font-bold text-profit tabular-nums">{optimalPoint.tpTicks} ticks</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stop Loss</p>
                <p className="text-2xl font-bold text-loss tabular-nums">{optimalPoint.slTicks} ticks</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected Value</p>
                <p className="text-2xl font-bold tabular-nums">{parseFloat(optimalPoint.expectedValue).toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold tabular-nums">{(parseFloat(optimalPoint.winRate || "0") * 100).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3D Surface */}
      <Card className="bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Superficie di Ottimizzazione</CardTitle>
              <CardDescription>Trascina per ruotare, usa i controlli per lo zoom</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.2))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => { setRotation({ x: 30, y: 45 }); setZoom(1); }}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-96 animate-pulse bg-muted rounded" />
          ) : surfaceData && surfaceData.length > 0 ? (
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="w-full rounded-lg cursor-grab active:cursor-grabbing"
                style={{ background: "#0a0a0f" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              {/* Color Legend */}
              <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg p-3 border border-border">
                <p className="text-xs text-muted-foreground mb-2">Expected Value</p>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-3 rounded" style={{
                    background: "linear-gradient(to right, #ef4444, #fbbf24, #22c55e)"
                  }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Basso</span>
                  <span>Alto</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessun dato di ottimizzazione disponibile</p>
                <p className="text-sm">Genera dati demo dalla sezione Settings</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Heatmap */}
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Heatmap TP/SL</CardTitle>
          <CardDescription>Visualizzazione 2D della superficie di ottimizzazione</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 animate-pulse bg-muted rounded" />
          ) : surfaceData && surfaceData.length > 0 ? (
            <div className="overflow-x-auto">
              <HeatmapGrid data={surfaceData} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Nessun dato disponibile
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Heatmap Grid Component
function HeatmapGrid({ data }: { data: any[] }) {
  const tpValues = Array.from(new Set(data.map(d => d.tpTicks))).sort((a: number, b: number) => a - b);
  const slValues = Array.from(new Set(data.map(d => d.slTicks))).sort((a: number, b: number) => a - b);
  
  const values = data.map(d => parseFloat(d.expectedValue));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  const getColor = (value: number) => {
    const normalized = (value - minValue) / valueRange;
    if (normalized < 0.33) {
      return `rgba(239, 68, 68, ${0.3 + normalized * 2})`;
    } else if (normalized < 0.66) {
      return `rgba(251, 191, 36, ${0.3 + (normalized - 0.33) * 2})`;
    } else {
      return `rgba(34, 197, 94, ${0.3 + (normalized - 0.66) * 2})`;
    }
  };

  const dataMap = data.reduce((acc, d) => {
    acc[`${d.tpTicks}-${d.slTicks}`] = d;
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="inline-block">
      <div className="flex">
        <div className="w-12" />
        {tpValues.map(tp => (
          <div key={tp} className="w-12 text-center text-xs text-muted-foreground pb-2">
            {tp}
          </div>
        ))}
      </div>
      {slValues.map(sl => (
        <div key={sl} className="flex">
          <div className="w-12 text-xs text-muted-foreground flex items-center justify-end pr-2">
            {sl}
          </div>
          {tpValues.map(tp => {
            const d = dataMap[`${tp}-${sl}`];
            return (
              <div
                key={`${tp}-${sl}`}
                className="w-12 h-10 border border-border/30 flex items-center justify-center text-xs font-mono"
                style={{ backgroundColor: d ? getColor(parseFloat(d.expectedValue)) : "transparent" }}
                title={d ? `TP: ${tp}, SL: ${sl}, EV: ${parseFloat(d.expectedValue).toFixed(3)}` : ""}
              >
                {d ? parseFloat(d.expectedValue).toFixed(2) : "-"}
              </div>
            );
          })}
        </div>
      ))}
      <div className="flex mt-2">
        <div className="w-12" />
        <div className="text-xs text-muted-foreground">← SL / TP →</div>
      </div>
    </div>
  );
}
