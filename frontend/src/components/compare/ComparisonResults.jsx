/* eslint-disable-next-line no-unused-vars */
import { motion } from 'framer-motion';
import {
  BarChart3,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
} from 'recharts';

import ChartFrame from '../ChartFrame';
import RiskBadge from '../RiskBadge';
import {
  buildRadarData,
  CHART_COLORS,
  getRiskBadgeLevel,
  getRiskColor,
  STRIDE_CATEGORIES,
} from '../../pages/comparePageUtils';

export default function ComparisonResults({ comparison }) {
  const radarData = buildRadarData(comparison);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-dark p-5 text-center">
          <div className="text-3xl font-bold text-cyber-cyan mb-1">
            {comparison.analyses.length}
          </div>
          <div className="text-sm text-text-muted">Analyses Compared</div>
        </div>
        <div className="card-dark p-5 text-center">
          <div className="text-3xl font-bold text-purple-400 mb-1">
            {comparison.cross_analysis.common_threats.length}
          </div>
          <div className="text-sm text-text-muted">Common Threats</div>
        </div>
        <div className="card-dark p-5 text-center">
          <div className="text-3xl font-bold text-amber-400 mb-1">
            {comparison.cross_analysis.total_unique_components}
          </div>
          <div className="text-sm text-text-muted">Unique Components</div>
        </div>
      </div>

      <div className="card-dark overflow-hidden">
        <div className="p-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyber-cyan" />
            Risk Score Comparison
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-tertiary/50">
                <th className="text-left p-3 text-text-secondary font-medium">Metric</th>
                {comparison.analyses.map((a, idx) => (
                  <th key={a.id} className="text-center p-3 font-medium" style={{ color: CHART_COLORS[idx] }}>
                    {a.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border/50">
              <tr className="hover:bg-dark-tertiary/30 transition-colors">
                <td className="p-3 text-text-secondary">Total Risk Score</td>
                {comparison.analyses.map((a) => (
                  <td key={a.id} className="p-3 text-center">
                    <span className="text-lg font-bold text-text-primary">{a.total_risk_score.toFixed(1)}</span>
                    <div className="mt-1"><RiskBadge level={getRiskBadgeLevel(a.total_risk_score)} size="small" /></div>
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-dark-tertiary/30 transition-colors">
                <td className="p-3 text-text-secondary">Avg Risk Score</td>
                {comparison.analyses.map((a) => (
                  <td key={a.id} className="p-3 text-center font-medium text-text-primary">
                    {a.average_risk_score.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-dark-tertiary/30 transition-colors">
                <td className="p-3 text-text-secondary">Max Risk Score</td>
                {comparison.analyses.map((a) => (
                  <td key={a.id} className="p-3 text-center font-medium text-text-primary">
                    {a.max_risk_score.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr className="hover:bg-dark-tertiary/30 transition-colors">
                <td className="p-3 text-text-secondary">Total Threats</td>
                {comparison.analyses.map((a) => (
                  <td key={a.id} className="p-3 text-center font-medium text-text-primary">
                    {a.threat_count}
                  </td>
                ))}
              </tr>
              {['Critical', 'High', 'Medium', 'Low'].map((level) => (
                <tr key={level} className="hover:bg-dark-tertiary/30 transition-colors">
                  <td className={`p-3 ${getRiskColor(level)}`}>{level}</td>
                  {comparison.analyses.map((a) => (
                    <td key={a.id} className={`p-3 text-center font-medium ${getRiskColor(level)}`}>
                      {a.risk_distribution[level] || 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-dark p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyber-cyan" />
          STRIDE Distribution Overlay
        </h2>
        <ChartFrame height={320} minWidth={420}>
          {(width, height) => (
            <RadarChart width={width} height={height} data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#30363d" />
              <PolarAngleAxis dataKey="category" tick={{ fill: '#8b949e', fontSize: 12 }} />
              <PolarRadiusAxis tick={{ fill: '#484f58', fontSize: 10 }} />
              {comparison.analyses.map((a, idx) => (
                <Radar
                  key={a.id}
                  name={a.title}
                  dataKey={a.title}
                  stroke={CHART_COLORS[idx]}
                  fill={CHART_COLORS[idx]}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              ))}
              <Tooltip
                contentStyle={{
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  color: '#c9d1d9',
                }}
              />
              <Legend wrapperStyle={{ color: '#8b949e', fontSize: '12px' }} />
            </RadarChart>
          )}
        </ChartFrame>
      </div>

      {comparison.cross_analysis.risk_trend.length > 1 && (
        <div className="card-dark p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            Risk Trend Over Time
          </h2>
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {comparison.cross_analysis.risk_trend.map((point, idx) => {
              const prev = idx > 0 ? comparison.cross_analysis.risk_trend[idx - 1] : null;
              const delta = prev ? point.total_risk_score - prev.total_risk_score : 0;
              return (
                <motion.div
                  key={point.analysis_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex-shrink-0 card-dark p-4 min-w-[180px] border border-dark-border"
                >
                  <div className="text-xs text-text-muted mb-1">
                    {new Date(point.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm font-medium text-text-primary truncate mb-2">
                    {point.title}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-cyber-cyan">
                      {point.total_risk_score.toFixed(1)}
                    </span>
                    {idx > 0 && (
                      <span className={`flex items-center gap-0.5 text-xs font-medium ${
                        delta > 0 ? 'text-red-400' : delta < 0 ? 'text-green-400' : 'text-text-muted'
                      }`}>
                        {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {comparison.cross_analysis.common_threats.length > 0 && (
        <div className="card-dark p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Common Threats Across Analyses
          </h2>
          <div className="flex flex-wrap gap-2">
            {comparison.cross_analysis.common_threats.map((name) => (
              <span key={name} className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card-dark overflow-hidden">
        <div className="p-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-text-primary">
            Threats by STRIDE Category
          </h2>
        </div>
        {STRIDE_CATEGORIES.map((cat) => {
          const hasThreats = comparison.analyses.some(
            (a) => a.threats_by_stride[cat]?.length > 0,
          );
          if (!hasThreats) return null;

          return (
            <div key={cat} className="border-b border-dark-border/50 last:border-b-0">
              <div className="p-4 bg-dark-tertiary/30">
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
                  {cat}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <div className="flex divide-x divide-dark-border/50 min-w-max">
                  {comparison.analyses.map((a, idx) => (
                    <div key={a.id} className="flex-1 min-w-[280px] p-4">
                      <div className="text-xs font-medium mb-3" style={{ color: CHART_COLORS[idx] }}>
                        {a.title}
                      </div>
                      {a.threats_by_stride[cat]?.length === 0 ? (
                        <p className="text-xs text-text-muted italic">No threats</p>
                      ) : (
                        <div className="space-y-2">
                          {a.threats_by_stride[cat].map((threat) => (
                            <div key={threat.id} className="p-2.5 rounded-lg bg-dark-tertiary/50 border border-dark-border/30">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="text-sm font-medium text-text-primary">{threat.name}</span>
                                <RiskBadge level={threat.risk_level} size="small" showIcon={false} />
                              </div>
                              <p className="text-xs text-text-muted line-clamp-2">{threat.description}</p>
                              <div className="flex gap-3 mt-1.5 text-xs text-text-muted">
                                <span>L:{threat.likelihood} I:{threat.impact}</span>
                                <span>Score: {threat.risk_score.toFixed(1)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
