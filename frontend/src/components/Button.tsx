import React from 'react';

interface ButtonProps {
    onClick?: () => void;
    children: React.ReactNode;
    className?: string;
    type?: 'button' | 'submit' | 'reset';
}

/**
 * Reusable Bootstrap-style button.
 * SRP: Only responsible for rendering a styled button.
 */
const Button: React.FC<ButtonProps> = ({ onClick, children, className = '', type = 'button' }) => {
    return (
        <button type={type} onClick={onClick} className={`btn ${className}`}>
            {children}
        </button>
    );
};

export default Button;
