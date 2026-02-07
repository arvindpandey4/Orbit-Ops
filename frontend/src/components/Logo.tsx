

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo = ({ className = '', size = 'md' }: LogoProps) => {
    const sizeClasses = {
        sm: 'text-2xl',
        md: 'text-3xl',
        lg: 'text-5xl',
        xl: 'text-6xl'
    };

    return (
        <div className={`font-black text-indigo-500 flex items-center justify-center ${sizeClasses[size]} ${className}`} style={{ lineHeight: 1 }}>
            ⌘
        </div>
    );
};
