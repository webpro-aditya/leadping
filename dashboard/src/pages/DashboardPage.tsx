import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsApi } from '../services/api';
import type { Lead } from '../types';
import { StatsCards } from '../components/dashboard/StatsCards';
import { RecentLeads } from '../components/dashboard/RecentLeads';
import { ScoreDistribution } from '../components/dashboard/ScoreDistribution';
import { Button } from '../components/ui/Button';

export const DashboardPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const { data } = await leadsApi.list({ per_page: 50, sort_by: 'created_at', sort_dir: 'desc' });
        setLeads(data.data.data);
      } catch {
        /* ignore error */
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const stats = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;

    leads.forEach((l) => {
      if (l.icp_score >= 80) high++;
      else if (l.icp_score >= 50) medium++;
      else low++;
    });

    return {
      total: leads.length,
      high,
      medium,
      low,
    };
  }, [leads]);

  const recentLeads = useMemo(() => leads.slice(0, 5), [leads]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time sales intelligence & pipeline insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/usage')}>
            Check Usage Quotas
          </Button>
          <Button variant="primary" onClick={() => navigate('/leads')}>
            View All Leads ({stats.total})
          </Button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <StatsCards
        totalLeads={stats.total}
        highPotential={stats.high}
        mediumPotential={stats.medium}
        lowPotential={stats.low}
      />

      {/* Main Grid: Recent Leads & Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentLeads leads={recentLeads} isLoading={loading} />
        </div>
        <div>
          <ScoreDistribution
            highCount={stats.high}
            mediumCount={stats.medium}
            lowCount={stats.low}
            total={stats.total}
          />
        </div>
      </div>
    </div>
  );
};
