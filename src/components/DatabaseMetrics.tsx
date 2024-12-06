import React, { useEffect, useState } from 'react';

interface QueryMetric {
    query: string;
    duration: number;
    timestamp: Date;
}

interface MetricsStats {
    metrics: QueryMetric[];
    totalQueries: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
}

export const DatabaseMetrics: React.FC = () => {
    const [stats, setStats] = useState<MetricsStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/metrics');
            if (!response.ok) {
                throw new Error('Failed to fetch metrics');
            }
            const data = await response.json();
            setStats(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        // Refresh metrics every 5 seconds
        const interval = setInterval(fetchMetrics, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <div className="p-4">Loading metrics...</div>;
    }

    if (error) {
        return <div className="p-4 text-red-600">Error: {error}</div>;
    }

    if (!stats) {
        return <div className="p-4">No metrics available</div>;
    }

    return (
        <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Database Metrics</h2>
            
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded shadow">
                    <h3 className="text-lg font-semibold">Total Queries</h3>
                    <p className="text-2xl">{stats.totalQueries}</p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                    <h3 className="text-lg font-semibold">Average Duration</h3>
                    <p className="text-2xl">{stats.averageDuration.toFixed(2)} ms</p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                    <h3 className="text-lg font-semibold">Max Duration</h3>
                    <p className="text-2xl">{stats.maxDuration} ms</p>
                </div>
                <div className="bg-white p-4 rounded shadow">
                    <h3 className="text-lg font-semibold">Min Duration</h3>
                    <p className="text-2xl">{stats.minDuration} ms</p>
                </div>
            </div>

            {/* Recent Queries Table */}
            <div className="bg-white rounded shadow overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Query</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration (ms)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {stats.metrics.map((metric, index) => (
                            <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{metric.query}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{metric.duration}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(metric.timestamp).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
