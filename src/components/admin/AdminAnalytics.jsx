import React from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';

export const AdminAnalytics = ({ analyticsData }) => {
    const cardStyle = {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '12px',
        padding: '1.25rem',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            <div style={{ ...cardStyle }}>
                <h3 style={{ fontSize: '1.1rem', color: '#f1f5f9', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📈</span> Request Volume (Last 7 Days)
                </h3>
                {analyticsData?.requestsByDay?.every(d => d.Requests === 0) ? (
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>No request data available for the last 7 days.</div>
                ) : (
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsData?.requestsByDay || []} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <RechartsTooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                                    itemStyle={{ color: '#60a5fa' }}
                                />
                                <Line type="monotone" dataKey="Requests" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6, fill: '#60a5fa' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div style={{ ...cardStyle }}>
                <h3 style={{ fontSize: '1.1rem', color: '#f1f5f9', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>💊</span> Top 5 Requested Medicines
                </h3>
                {analyticsData?.topMedicines?.length === 0 ? (
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>No specific medicine data available yet.</div>
                ) : (
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyticsData?.topMedicines || []} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.1)" />
                                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <YAxis dataKey="name" type="category" stroke="#e2e8f0" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <RechartsTooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                                    itemStyle={{ color: '#34d399' }}
                                />
                                <Bar dataKey="Count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

        </div>
    );
};
