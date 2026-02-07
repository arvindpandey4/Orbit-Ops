import { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<'div'> {
    children: ReactNode;
    hover?: boolean;
    glass?: boolean;
    className?: string;
}

export const Card = ({ children, hover = false, glass = true, className = '', ...props }: CardProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={hover ? { y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' } : undefined}
            transition={{ duration: 0.3 }}
            className={`
        rounded-2xl p-6 relative overflow-hidden
        ${glass ? 'bg-slate-800/40 backdrop-blur-xl border border-white/5 shadow-xl' : 'bg-slate-800'}
        ${className}
      `}
            {...props}
        >
            {/* Glossy overlay effect */}
            {glass && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            )}

            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};
