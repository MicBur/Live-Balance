"use client";

export default function SkeletonLoader({ count = 3, type = 'clip' }) {
    if (type === 'clip') {
        return (
            <div className="space-y-4">
                {[...Array(count)].map((_, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 animate-slide-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <div className="skeleton h-6 w-3/4 mb-2"></div>
                                <div className="skeleton h-4 w-1/2"></div>
                            </div>
                            <div className="skeleton h-8 w-8 rounded-full"></div>
                        </div>

                        {/* Content */}
                        <div className="space-y-2 mb-4">
                            <div className="skeleton h-4 w-full"></div>
                            <div className="skeleton h-4 w-11/12"></div>
                            <div className="skeleton h-4 w-4/5"></div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-2">
                            <div className="skeleton h-10 w-24 rounded-full"></div>
                            <div className="skeleton h-10 w-24 rounded-full"></div>
                            <div className="skeleton h-10 w-24 rounded-full"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (type === 'suggestion') {
        return (
            <div className="space-y-4">
                {[...Array(count)].map((_, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                        <div className="skeleton h-6 w-2/3 mb-3"></div>
                        <div className="skeleton h-4 w-full mb-2"></div>
                        <div className="skeleton h-4 w-5/6"></div>
                    </div>
                ))}
            </div>
        );
    }

    // Default card skeleton
    return (
        <div className="skeleton h-32 w-full"></div>
    );
}
