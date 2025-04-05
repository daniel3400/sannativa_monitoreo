import dynamic from 'next/dynamic';
import type { TooltipProps } from 'recharts';
type ValueType = string | number | undefined;
type NameType = string | undefined;

import { BarChart as RechartsBarChart, Bar as RechartsBar } from 'recharts';
import { XAxis as RechartsXAxis, YAxis as RechartsYAxis } from 'recharts';
import { CartesianGrid as RechartsCartesianGrid } from 'recharts';
import { Tooltip as RechartsTooltip, Legend as RechartsLegend } from 'recharts';

// Exportar los componentes directamente
export const BarChart = RechartsBarChart;
export const Bar = RechartsBar;
export const XAxis = RechartsXAxis;
export const YAxis = RechartsYAxis;
export const CartesianGrid = RechartsCartesianGrid;
export const Tooltip = RechartsTooltip;
export const Legend = RechartsLegend;

export const ResponsiveContainer = dynamic(
  async () => {
    const { ResponsiveContainer } = await import('recharts');
    return ResponsiveContainer as unknown as React.ComponentType;
  },
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-green-600">Cargando gráfico...</span>
      </div>
    )
  }
);