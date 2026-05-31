/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { AlertTriangle, Shield } from 'lucide-react';

import ChartFrame from '../ChartFrame';

export default function AnalysisCharts({ riskDistribution, strideDistribution }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid md:grid-cols-2 gap-6 mb-6"
    >
      <div className="card-dark p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-cyber-cyan" />
          Risk Distribution
        </h3>
        <ChartFrame height={192} minWidth={320}>
          {(width, height) => (
            <PieChart width={width} height={height}>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#121826',
                  border: '1px solid #2a3441',
                  borderRadius: '8px',
                  color: '#E6EAF2',
                }}
              />
            </PieChart>
          )}
        </ChartFrame>
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {riskDistribution.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-text-secondary">{item.name}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-dark p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyber-cyan" />
          STRIDE Categories
        </h3>
        <ChartFrame height={192} minWidth={420}>
          {(width, height) => (
            <BarChart width={width} height={height} data={strideDistribution} layout="vertical">
              <XAxis type="number" tick={{ fill: '#9AA4B2' }} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#9AA4B2', fontSize: 12 }}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#121826',
                  border: '1px solid #2a3441',
                  borderRadius: '8px',
                  color: '#E6EAF2',
                }}
              />
              <Bar dataKey="count" fill="#00F5FF" radius={[0, 4, 4, 0]} />
            </BarChart>
          )}
        </ChartFrame>
      </div>
    </motion.div>
  );
}
