import { motion, HTMLMotionProps, Variants } from 'framer-motion';
import { ReactNode } from 'react';

// Variants
export const fadeIn: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
};

export const slideIn: Variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
};

export const scaleIn: Variants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
};

export const staggerContainer: Variants = {
    animate: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

interface AnimatedProps extends HTMLMotionProps<'div'> {
    children: ReactNode;
    delay?: number;
}

export const FadeIn = ({ children, className, delay = 0, ...props }: AnimatedProps) => (
    <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeIn}
        transition={{ duration: 0.4, delay, ease: 'easeOut' }}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);

export const SlideIn = ({ children, className, delay = 0, ...props }: AnimatedProps) => (
    <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={slideIn}
        transition={{ duration: 0.4, delay, ease: 'easeOut' }}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);

export const ScaleIn = ({ children, className, delay = 0, ...props }: AnimatedProps) => (
    <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={scaleIn}
        transition={{ duration: 0.3, delay, ease: 'easeOut' }}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);

export const StaggerContainer = ({ children, className, ...props }: HTMLMotionProps<'div'>) => (
    <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={staggerContainer}
        className={className}
        {...props}
    >
        {children}
    </motion.div>
);
