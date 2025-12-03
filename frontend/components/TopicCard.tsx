import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface TopicCardProps {
    topic: string;
    percent: number;
    count: number;
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, percent, count }) => {
    const data = [
        { name: 'Topic', value: percent },
        { name: 'Rest', value: 100 - percent },
    ];

    const COLORS = ['#06b6d4', '#333'];

    return (
        <div className="glass p-6 flex flex-col items-center justify-center relative overflow-hidden group">
            <h3 className="text-xl font-bold mb-2 text-center z-10 group-hover:text-cyan-400 transition-colors">{topic}</h3>
            <div className="w-32 h-32 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={55}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold">{percent}%</span>
                </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 z-10">{count} clips</p>

            {/* Glow effect */}
            <div className="absolute -inset-1 bg-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
    );
};

export default TopicCard;
