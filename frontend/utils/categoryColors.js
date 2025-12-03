// Category color mapping for themed borders and effects
export const CATEGORY_COLORS = {
    'habits & routines': {
        border: 'border-green-500',
        glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]',
        gradient: 'from-green-500 to-emerald-600',
        bg: 'bg-green-500/10',
        text: 'text-green-400'
    },
    'productivity': {
        border: 'border-cyan-500',
        glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]',
        gradient: 'from-cyan-500 to-blue-600',
        bg: 'bg-cyan-500/10',
        text: 'text-cyan-400'
    },
    'work-life-balance': {
        border: 'border-purple-500',
        glow: 'shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]',
        gradient: 'from-purple-500 to-violet-600',
        bg: 'bg-purple-500/10',
        text: 'text-purple-400'
    },
    'health & fitness': {
        border: 'border-red-500',
        glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]',
        gradient: 'from-red-500 to-orange-600',
        bg: 'bg-red-500/10',
        text: 'text-red-400'
    },
    'mindfulness': {
        border: 'border-yellow-500',
        glow: 'shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)]',
        gradient: 'from-yellow-500 to-amber-600',
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400'
    },
    'relationships': {
        border: 'border-pink-500',
        glow: 'shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]',
        gradient: 'from-pink-500 to-rose-600',
        bg: 'bg-pink-500/10',
        text: 'text-pink-400'
    },
    'default': {
        border: 'border-white/20',
        glow: 'shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]',
        gradient: 'from-gray-500 to-slate-600',
        bg: 'bg-white/5',
        text: 'text-white/80'
    }
};

export function getCategoryColor(topic) {
    if (!topic) return CATEGORY_COLORS['default'];

    const normalized = topic.toLowerCase().trim();

    // Direct match
    if (CATEGORY_COLORS[normalized]) {
        return CATEGORY_COLORS[normalized];
    }

    // Partial matches
    if (normalized.includes('habit') || normalized.includes('routine')) {
        return CATEGORY_COLORS['habits & routines'];
    }
    if (normalized.includes('product') || normalized.includes('work')) {
        return CATEGORY_COLORS['productivity'];
    }
    if (normalized.includes('balance') || normalized.includes('life')) {
        return CATEGORY_COLORS['work-life-balance'];
    }
    if (normalized.includes('health') || normalized.includes('fitness') || normalized.includes('sport')) {
        return CATEGORY_COLORS['health & fitness'];
    }
    if (normalized.includes('mind') || normalized.includes('meditation') || normalized.includes('achtsamkeit')) {
        return CATEGORY_COLORS['mindfulness'];
    }
    if (normalized.includes('relation') || normalized.includes('freund') || normalized.includes('familie')) {
        return CATEGORY_COLORS['relationships'];
    }

    return CATEGORY_COLORS['default'];
}
