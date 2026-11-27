import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { integrationsApi, leadsApi } from '../services/api';
import type { Lead, LeadStatus } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { LeadStatusBadge } from '../components/leads/LeadStatusBadge';
import { safeExternalUrl } from '../utils/url';

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<LeadStatus>('new');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notesSavedAlert, setNotesSavedAlert] = useState(false);
  const [pushingWebhook, setPushingWebhook] = useState(false);
  const [webhookPushResult, setWebhookPushResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchLead = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data } = await leadsApi.get(Number(id));
        setLead(data.data);
        setStatus(data.data.status);
        setNotes(data.data.notes || '');
      } catch {
        navigate('/leads');
      } finally {
        setLoading(false);
      }
    };
    fetchLead();
  }, [id, navigate]);

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return;
    setStatus(newStatus);
    try {
      await leadsApi.update(lead.id, { status: newStatus });
      setLead((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch {
      alert('Failed to update status');
    }
  };

  const handleSaveNotes = async () => {
    if (!lead) return;
    setSavingNotes(true);
    try {
      await leadsApi.update(lead.id, { notes });
      setLead((prev) => (prev ? { ...prev, notes } : null));
      setNotesSavedAlert(true);
      setTimeout(() => setNotesSavedAlert(false), 2500);
    } catch {
      alert('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    setIsDeleting(true);
    try {
      await leadsApi.delete(lead.id);
      navigate('/leads');
    } catch {
      alert('Failed to delete lead');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePushWebhook = async () => {
    if (!lead) return;
    setPushingWebhook(true);
    setWebhookPushResult(null);
    try {
      const { data } = await integrationsApi.pushLeadToWebhook(lead.id);
      setWebhookPushResult({
        type: 'success',
        text: data.message || 'Lead pushed to CRM webhook.',
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'CRM webhook push failed. Verify your webhook settings.';
      setWebhookPushResult({ type: 'error', text: msg });
    } finally {
      setPushingWebhook(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex items-center space-x-2 text-indigo-600">
          <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-600 font-medium">Loading lead details...</span>
        </div>
      </div>
    );
  }

  if (!lead) return null;

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'replied', label: 'Replied' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'won', label: 'Won' },
    { value: 'lost', label: 'Lost' },
  ];

  const getConfidenceVariant = (conf: string): 'success' | 'warning' | 'default' => {
    if (conf === 'high') return 'success';
    if (conf === 'medium') return 'warning';
    return 'default';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Back button and quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/leads"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Leads
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-900 truncate max-w-xs">
            {lead.company?.name || 'Lead Details'}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="w-40">
            <Select
              options={statusOptions}
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            />
          </div>
          <Button variant="secondary" size="md" onClick={handlePushWebhook} isLoading={pushingWebhook}>
            Push to CRM
          </Button>
          <Button variant="danger" size="md" onClick={() => setDeleteModalOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      {webhookPushResult && (
        <div
          className={`rounded-lg px-4 py-2.5 text-xs font-medium border ${
            webhookPushResult.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {webhookPushResult.text}
        </div>
      )}

      {/* Hero Overview Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {lead.company?.name || 'Company Name'}
            </h1>
            <LeadStatusBadge status={lead.status} />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            {(lead.company?.website || lead.source_url || lead.url) && (() => {
              const displayUrl = lead.company?.website || lead.source_url || lead.url;
              const safeHref = safeExternalUrl(displayUrl);
              return safeHref ? (
                <a
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline flex items-center"
                >
                  {displayUrl}
                  <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <span>{displayUrl}</span>
              );
            })()}
            {lead.company?.industry && <span>Industry: {lead.company.industry}</span>}
            {(lead.company?.company_size || lead.company?.size) && (
              <span>Size: {lead.company.company_size || lead.company.size}</span>
            )}
            {lead.company?.location && <span>Location: {lead.company.location}</span>}
            <span>Added {new Date(lead.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Big ICP Score Box */}
        <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-xl border border-slate-200 self-start md:self-auto">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              ICP Fit Score
            </div>
            <div className="text-3xl font-extrabold text-slate-900">
              {lead.icp_score}
              <span className="text-lg font-medium text-slate-400">/100</span>
            </div>
          </div>
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${
              lead.icp_score >= 80
                ? 'bg-emerald-100 text-emerald-700'
                : lead.icp_score >= 50
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {lead.icp_score >= 80 ? 'A' : lead.icp_score >= 50 ? 'B' : 'C'}
          </div>
        </div>
      </div>

      {/* Grid: Overview & ICP Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Overview & AI Summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Company Overview">
            <p className="text-sm text-slate-700 leading-relaxed">
              {lead.company?.description || 'No overview provided.'}
            </p>

            {lead.company?.technologies && lead.company.technologies.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Detected Technologies & Stack
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lead.company.technologies.map((t, i) => (
                    <Badge key={i} size="sm">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* AI Summary Card */}
          {(lead.ai_summary || lead.summary) && (
            <Card title="AI Intelligence Summary">
              <div className="rounded-lg bg-indigo-50/50 p-4 border border-indigo-100 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {lead.ai_summary || lead.summary}
              </div>
            </Card>
          )}

          {/* Buying Signals */}
          {(() => {
            const signals = lead.signals || lead.buying_signals || [];
            return (
              <Card
                title="Buying Signals"
                subtitle={`${signals.length} signal(s) identified`}
              >
                {signals.length === 0 ? (
                  <p className="text-xs text-slate-400">No buying signals recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {signals.map((sig, i) => (
                      <div key={i} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-slate-900">
                            {sig.description || sig.signal}
                          </span>
                          <Badge variant={getConfidenceVariant(sig.confidence)} size="sm">
                            {sig.confidence} confidence
                          </Badge>
                        </div>
                        {(sig.source_url || sig.evidence) && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            <span className="font-semibold text-slate-700">Source:</span>{' '}
                            {sig.source_url || sig.evidence}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })()}

          {/* Pain Points */}
          <Card
            title="Pain Points"
            subtitle={`${lead.pain_points?.length || 0} potential pain points found`}
          >
            {(!lead.pain_points || lead.pain_points.length === 0) ? (
              <p className="text-xs text-slate-400">No pain points recorded.</p>
            ) : (
              <div className="space-y-3">
                {lead.pain_points.map((p, i) => {
                  const severity = p.severity || p.confidence || 'medium';
                  return (
                    <div key={i} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-slate-900">
                          {p.title || p.pain_point}
                        </span>
                        <Badge variant={severity === 'high' ? 'danger' : 'warning'} size="sm">
                          {severity}
                        </Badge>
                      </div>
                      {(p.explanation || p.description) && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {p.explanation || p.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Sales Opportunities */}
          <Card
            title="Sales Opportunities"
            subtitle={`${lead.opportunities?.length || 0} identified opportunities`}
          >
            {(!lead.opportunities || lead.opportunities.length === 0) ? (
              <p className="text-xs text-slate-400">No opportunities recorded.</p>
            ) : (
              <div className="space-y-3">
                {lead.opportunities.map((opp, i) => (
                  <div key={i} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-900">
                        {opp.title || opp.opportunity}
                      </span>
                      <Badge variant={opp.priority === 'high' ? 'purple' : 'info'} size="sm">
                        {opp.priority} priority
                      </Badge>
                    </div>
                    {(opp.potential_solution || opp.approach || opp.description) && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        <span className="font-semibold text-slate-700">Approach:</span>{' '}
                        {opp.potential_solution || opp.approach || opp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Outreach Messages (if generated) */}
          {lead.outreach_messages && lead.outreach_messages.length > 0 && (
            <Card title="Generated Outreach Messages">
              <div className="space-y-4">
                {lead.outreach_messages.map((msg, i) => (
                  <div key={i} className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                        {msg.channel || msg.type}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(msg.body)}
                        className="text-xs text-indigo-600"
                      >
                        Copy message
                      </Button>
                    </div>
                    {msg.subject && (
                      <div className="text-xs font-semibold text-slate-800 mb-2">
                        Subject: {msg.subject}
                      </div>
                    )}
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                      {msg.body}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar Column: Score breakdown & Notes */}
        <div className="space-y-6">
          {/* ICP Score Breakdown */}
          {lead.icp_breakdown && Object.keys(lead.icp_breakdown).length > 0 && (
            <Card title="Score Breakdown">
              <div className="space-y-3">
                {Object.entries(lead.icp_breakdown).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-600 capitalize">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-semibold text-slate-900">{val}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${val}%` }}
                        className="h-full rounded-full bg-indigo-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Internal Notes */}
          <Card title="Lead Notes" subtitle="Internal notes & meeting updates">
            <div className="space-y-3">
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write notes about your outreach, meeting details, next steps..."
                className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              {notesSavedAlert && (
                <div className="text-xs text-emerald-600 font-medium">Notes saved successfully!</div>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveNotes}
                isLoading={savingNotes}
                className="w-full"
              >
                Save Notes
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Lead Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Lead"
        confirmLabel="Delete Lead"
        confirmVariant="danger"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete lead <span className="font-semibold text-slate-900">{lead.company?.name || lead.source_url || lead.url}</span>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};
